// Shared by the collector, build-time rendering, and browser validation.
export function rsi(values, period = 14) {
  if (values.length <= period) return null;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    gain += Math.max(change, 0) / period;
    loss += Math.max(-change, 0) / period;
  }
  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(change, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-change, 0)) / period;
  }
  if (gain === 0 && loss === 0) return 50;
  return loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
}

export function normalCdf(value) {
  const sign = value < 0 ? -1 : 1, z = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * z);
  const erf = sign * (1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-z * z));
  return (1 + erf) / 2;
}

function periodCloses(rows, mode) {
  const groups = new Map();
  for (const row of rows) {
    const date = new Date(row.time);
    if (mode === "month") groups.set(`${date.getUTCFullYear()}-${date.getUTCMonth()}`, row.price);
    else {
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
      groups.set(date.toISOString().slice(0, 10), row.price);
    }
  }
  return [...groups.values()];
}

function pointAt(rows, index, fear) {
  if (index < 200) throw new Error("200 日均线历史不足");
  const row = rows[index];
  // Previous 200 completed UTC daily candles, excluding the forming daily candle.
  const ma200 = rows.slice(index - 200, index).reduce((sum, item) => sum + item.price, 0) / 200;
  const trend = row.price >= ma200 ? "up" : "down";
  // Use only information known at this date, including its forming week/month.
  const activeRsi = rsi(periodCloses(rows.slice(0, index + 1), trend === "up" ? "month" : "week"));
  if (activeRsi === null) throw new Error("RSI(14) 历史不足");
  const z = (100 - activeRsi - fear) * 0.03;
  return { date: new Date(row.time).toISOString().slice(0, 10), price: row.price,
    position: normalCdf(z) * 100, rsi: activeRsi, fear, ma200, trend, z };
}

export function buildMarketData({ daily, ticker, fearItems, fetchedAt = Date.now(), endpoint }) {
  if (!Array.isArray(daily) || daily.length < 900) throw new Error("日线历史不足");
  const rows = daily.map(k => ({ time: Number(k[0]), price: Number(k[4]) }));
  if (rows.some((r, i) => !Number.isFinite(r.time) || !Number.isFinite(r.price) || r.price <= 0 || (i > 0 && r.time - rows[i - 1].time !== 86400000))) throw new Error("日线缺失或无效");
  const fears = fearItems.map(f => ({ time: Number(f.timestamp) * 1000, value: Number(f.value) }))
    .filter(f => Number.isFinite(f.time) && Number.isFinite(f.value) && f.value >= 0 && f.value <= 100)
    .sort((a, b) => a.time - b.time);
  const now = Number(fetchedAt), today = Math.floor(now / 86400000) * 86400000;
  if (!fears.length || now - fears.at(-1).time > 2 * 86400000 || fears.at(-1).time > now) throw new Error("恐贪指数缺失或过期");
  if (rows.at(-1).time !== today) throw new Error("日线未更新至今日");
  if (![ticker.lastPrice, ticker.priceChangePercent, ticker.highPrice, ticker.lowPrice, ticker.closeTime].every(x => Number.isFinite(Number(x)))) throw new Error("价格响应无效");
  if (Number(ticker.lastPrice) <= 0 || Math.abs(now - Number(ticker.closeTime)) > 30 * 60000) throw new Error("价格时间已过期");
  rows.at(-1).price = Number(ticker.lastPrice);
  const history = [];
  for (let index = Math.max(200, rows.length - 366); index < rows.length; index++) {
    const time = rows[index].time;
    const fear = fears.findLast(f => f.time <= time);
    if (!fear || time - fear.time > 2 * 86400000) continue;
    history.push(pointAt(rows, index, fear.value));
  }
  const current = history.at(-1);
  if (!current || current.date !== new Date(now).toISOString().slice(0, 10) || history.length < 300) throw new Error("可用历史仓位不足");
  const result = {
    current: { ...current, change24h: Number(ticker.priceChangePercent), high24h: Number(ticker.highPrice), low24h: Number(ticker.lowPrice),
      rsiFrame: current.trend === "up" ? "月线 RSI(14)" : "周线 RSI(14)" },
    history,
    meta: { schemaVersion: 2, priceSource: "Binance BTC/USDT", fearSource: "Alternative.me Crypto Fear & Greed",
      updatedAt: new Date(now).toISOString(), priceUpdatedAt: new Date(Number(ticker.closeTime)).toISOString(),
      fearUpdatedAt: new Date(fears.at(-1).time).toISOString(), formula: "Φ((100 − RSI − 恐贪指数) × 0.03)",
      endpoint, degraded: false, rsiMethod: "Wilder RMA(14), UTC, forming period" },
  };
  if (!isMarketData(result)) throw new Error("计算结果校验失败");
  return result;
}

export function isMarketData(value) {
  const pointValid = p => p && [p.price, p.position, p.rsi, p.fear, p.ma200, p.z].every(Number.isFinite)
    && p.price > 0 && p.ma200 > 0 && p.position >= 0 && p.position <= 100 && p.rsi >= 0 && p.rsi <= 100
    && p.fear >= 0 && p.fear <= 100 && ["up", "down"].includes(p.trend) && /^\d{4}-\d{2}-\d{2}$/.test(p.date);
  return !!value && value.meta?.schemaVersion === 2 && value.meta.degraded === false
    && Number.isFinite(Date.parse(value.meta.updatedAt)) && Number.isFinite(Date.parse(value.meta.fearUpdatedAt))
    && Number.isFinite(Date.parse(value.meta.priceUpdatedAt)) && pointValid(value.current)
    && [value.current.change24h, value.current.high24h, value.current.low24h].every(Number.isFinite)
    && Array.isArray(value.history) && value.history.length >= 2 && value.history.every(pointValid);
}
