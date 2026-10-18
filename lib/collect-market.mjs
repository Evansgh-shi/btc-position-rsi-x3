import { buildMarketData } from "./market-model.mjs";
const endpoints = ["https://data-api.binance.vision", "https://api.binance.com"];
const cmcBase = "https://pro-api.coinmarketcap.com/public-api/v3/fear-and-greed";
export async function fetchMarketJson(url, { fetcher = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
    let retryDelay = null;
    try {
      const response = await fetcher(url, { signal: controller.signal, headers: { "User-Agent": "btc-position-dashboard/3", "Accept": "application/json" } });
      if (response.status === 429 && attempt < 3) {
        const retryAfter = response.headers.get("retry-after");
        const requested = retryAfter === null ? 0 : /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now());
        await response.body?.cancel();
        if (requested > 20000) throw new Error(`HTTP 429 at ${new URL(url).host}; server requested a longer retry delay`);
        retryDelay = Math.max(Number.isFinite(requested) ? requested : 0, 2000 * 2 ** attempt);
      } else {
        if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status} at ${new URL(url).host}`); }
        return await response.json();
      }
    } finally { clearTimeout(timer); }
    await pause(retryDelay);
  }
}
export function parseCmcLatest(body) {
  const value = body?.data?.value, time = Date.parse(body?.data?.update_time);
  if (!body?.status || Number(body.status.error_code) !== 0 || !Number.isFinite(value) || value < 0 || value > 100 || !Number.isFinite(time)) throw new Error("CMC 当前恐贪数据无效");
  return { value, timestamp: time / 1000 };
}

export function parseCmcHistory(body) {
  if (!body?.status || Number(body.status.error_code) !== 0 || !Array.isArray(body.data)) throw new Error("CMC 历史恐贪响应无效");
  return body.data.map(item => {
    const timestamp = Number(item.timestamp), value = item.value;
    if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp % 86400 !== 0 || !Number.isFinite(value) || value < 0 || value > 100) throw new Error("CMC 历史恐贪数据无效");
    return { timestamp, value };
  });
}

export async function collectCmcFear() {
  const fearLatest = parseCmcLatest(await fetchMarketJson(`${cmcBase}/latest`));
  const fearItems = [];
  let complete = false;
  for (let start = 1; start <= 10001; start += 500) {
    const page = parseCmcHistory(await fetchMarketJson(`${cmcBase}/historical?start=${start}&limit=500`));
    if (page.some((item, index) => (index ? page[index - 1].timestamp : fearItems.at(-1)?.timestamp ?? Infinity) <= item.timestamp)) throw new Error("CMC 历史分页时间顺序无效");
    fearItems.push(...page);
    if (page.length < 500) { complete = true; break; }
  }
  if (!complete || fearItems.length < 300) throw new Error("CMC 历史恐贪数据不足或分页未完成");
  return { fearItems, fearLatest };
}

async function marketFrom(endpoint, sentiment) {
  const daily = [];
  let start = Date.UTC(2017, 7, 17);
  for (let page = 0; page < 10; page++) {
    const part = await fetchMarketJson(`${endpoint}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1000&startTime=${start}`);
    if (!Array.isArray(part) || !part.length) break;
    daily.push(...part);
    start = Number(part.at(-1)[0]) + 86400000;
    if (part.length < 1000) break;
  }
  const ticker = await fetchMarketJson(`${endpoint}/api/v3/ticker/24hr?symbol=BTCUSDT`);
  return buildMarketData({ daily, ticker, ...sentiment, endpoint, fetchedAt: Date.now() });
}
export async function collectMarketData() {
  // Never silently replace CMC with a differently defined sentiment index.
  const sentiment = await collectCmcFear();
  const errors = [];
  for (const endpoint of endpoints) {
    try { return await marketFrom(endpoint, sentiment); }
    catch (error) { errors.push(`${endpoint}: ${error.message}`); }
  }
  throw new Error(`行情采集失败；未覆盖已有快照。${errors.join("; ")}`);
}
