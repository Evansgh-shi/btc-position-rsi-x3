export type Point = {
  date: string;
  price: number;
  position: number;
  rsi: number;
  fear: number;
  ma200: number | null;
  trend: "up" | "down";
};

export type MarketData = {
  current: Point & {
    change24h: number;
    high24h: number;
    low24h: number;
    rsiFrame: string;
    z: number;
  };
  history: Point[];
  meta: {
    priceSource: string;
    fearSource: string;
    updatedAt: string;
    formula: string;
    degraded: boolean;
  };
};

type Kline = [number, string, string, string, string, ...unknown[]];

function rsi(values: number[], period = 14): number | null {
  if (values.length <= period) return null;
  let gain = 0;
  let loss = 0;
  const start = values.length - period;
  for (let i = start; i < values.length; i++) {
    const delta = values[i] - values[i - 1];
    if (delta >= 0) gain += delta;
    else loss -= delta;
  }
  if (loss === 0) return 100;
  return 100 - 100 / (1 + gain / loss);
}

function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * z);
  const erf = sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z));
  return 0.5 * (1 + erf);
}

function avg(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function periodCloses(rows: { time: number; price: number }[], end: number, mode: "week" | "month") {
  const groups = new Map<string, number>();
  for (const row of rows) {
    if (row.time > end) break;
    const date = new Date(row.time);
    let key: string;
    if (mode === "month") {
      key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    } else {
      const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const day = monday.getUTCDay() || 7;
      monday.setUTCDate(monday.getUTCDate() - day + 1);
      key = monday.toISOString().slice(0, 10);
    }
    groups.set(key, row.price);
  }
  return [...groups.values()];
}

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function calculateHistory(rows: { time: number; price: number }[], fearItems: { timestamp: string; value: string }[]) {
  const fearByDay = new Map<string, number>(
    fearItems.map((item) => [
      new Date(Number(item.timestamp) * 1000).toISOString().slice(0, 10),
      Number(item.value),
    ]),
  );
  let lastFear = 50;
  return rows.slice(-366).map((row, visibleIndex) => {
    const absoluteIndex = rows.length - 366 + visibleIndex;
    const date = new Date(row.time).toISOString().slice(0, 10);
    const exactFear = fearByDay.get(date);
    if (exactFear !== undefined) lastFear = exactFear;
    const prior = rows.slice(0, absoluteIndex + 1);
    const ma200 = absoluteIndex >= 199
      ? avg(rows.slice(absoluteIndex - 199, absoluteIndex + 1).map((d) => d.price))
      : null;
    const trend: "up" | "down" = ma200 !== null && row.price >= ma200 ? "up" : "down";
    const closes = periodCloses(prior, row.time, trend === "up" ? "month" : "week");
    const activeRsi = rsi(closes) ?? 50;
    const z = (100 - activeRsi - lastFear) * .03;
    return {
      date,
      price: Math.round(row.price * 100) / 100,
      position: Math.round(normalCdf(z) * 10000) / 100,
      rsi: Math.round(activeRsi * 10) / 10,
      fear: lastFear,
      ma200: ma200 ? Math.round(ma200 * 100) / 100 : null,
      trend,
    };
  });
}

function demoPayload(): MarketData {
  const count = 566;
  const now = new Date();
  const rows = Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (count - 1 - i)));
    return { time: date.getTime(), price: Math.max(18000, 47500 + i * 15 + Math.sin(i / 19) * 5200 + Math.sin(i / 53) * 8300) };
  });
  const history = rows.slice(-366).map((row, visibleIndex) => {
    const absoluteIndex = rows.length - 366 + visibleIndex;
    const prior = rows.slice(0, absoluteIndex + 1);
    const ma200 = avg(rows.slice(absoluteIndex - 199, absoluteIndex + 1).map((d) => d.price));
    const trend: "up" | "down" = row.price >= ma200 ? "up" : "down";
    const activeRsi = rsi(periodCloses(prior, row.time, trend === "up" ? "month" : "week")) ?? 50;
    const fear = Math.round(Math.max(8, Math.min(92, 50 + Math.sin(absoluteIndex / 13) * 27 - (activeRsi - 50) * .25)));
    const z = (100 - activeRsi - fear) * .03;
    return {
      date: new Date(row.time).toISOString().slice(0, 10),
      price: Math.round(row.price * 100) / 100,
      position: Math.round(normalCdf(z) * 10000) / 100,
      rsi: Math.round(activeRsi * 10) / 10,
      fear,
      ma200: Math.round(ma200 * 100) / 100,
      trend,
    };
  });
  const current = history.at(-1)!;
  return {
    current: {
      ...current,
      change24h: .8,
      high24h: current.price * 1.018,
      low24h: current.price * .982,
      rsiFrame: current.trend === "up" ? "月线 RSI(14)" : "周线 RSI(14)",
      z: Math.round((100 - current.rsi - current.fear) * .03 * 1000) / 1000,
    },
    history,
    meta: {
      priceSource: "离线演示数据",
      fearSource: "离线演示数据",
      updatedAt: new Date().toISOString(),
      formula: "Φ((100 − RSI − 恐贪指数) × 0.03)",
      degraded: true,
    },
  };
}

export async function fetchMarketData(): Promise<MarketData> {
  try {
    const [dailyRaw, priceRaw, fearRaw] = await Promise.all([
      fetchJson("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=900"),
      fetchJson("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"),
      fetchJson("https://api.alternative.me/fng/?limit=366&format=json"),
    ]);
    const rows = (dailyRaw as Kline[]).map((k) => ({ time: Number(k[0]), price: Number(k[4]) }));
    const history = calculateHistory(rows, Array.isArray(fearRaw?.data) ? fearRaw.data : []);
    const current = history.at(-1)!;
    return {
      current: {
        ...current,
        price: Number(priceRaw.lastPrice),
        change24h: Number(priceRaw.priceChangePercent),
        high24h: Number(priceRaw.highPrice),
        low24h: Number(priceRaw.lowPrice),
        rsiFrame: current.trend === "up" ? "月线 RSI(14)" : "周线 RSI(14)",
        z: Math.round((100 - current.rsi - current.fear) * .03 * 1000) / 1000,
      },
      history,
      meta: {
        priceSource: "Binance BTC/USDT",
        fearSource: "Alternative.me Crypto Fear & Greed",
        updatedAt: new Date().toISOString(),
        formula: "Φ((100 − RSI − 恐贪指数) × 0.03)",
        degraded: false,
      },
    };
  } catch {
    return demoPayload();
  }
}
