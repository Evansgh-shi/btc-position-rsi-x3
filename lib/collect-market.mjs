import { buildMarketData } from "./market-model.mjs";
const endpoints = ["https://data-api.binance.vision", "https://api.binance.com"];
async function json(url) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "btc-position-dashboard/2" } });
    if (!response.ok) throw new Error(`HTTP ${response.status} at ${new URL(url).host}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}
async function marketFrom(endpoint) {
  const daily = [];
  let start = Date.UTC(2017, 7, 17);
  for (let page = 0; page < 10; page++) {
    const part = await json(`${endpoint}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1000&startTime=${start}`);
    if (!Array.isArray(part) || !part.length) break;
    daily.push(...part);
    start = Number(part.at(-1)[0]) + 86400000;
    if (part.length < 1000) break;
  }
  const [ticker, fear] = await Promise.all([
    json(`${endpoint}/api/v3/ticker/24hr?symbol=BTCUSDT`),
    json("https://api.alternative.me/fng/?limit=400&format=json"),
  ]);
  if (!Array.isArray(fear.data)) throw new Error("恐贪 API 数据无效");
  return buildMarketData({ daily, ticker, fearItems: fear.data, endpoint, fetchedAt: Date.now() });
}
export async function collectMarketData() {
  const errors = [];
  for (const endpoint of endpoints) {
    try { return await marketFrom(endpoint); }
    catch (error) { errors.push(`${endpoint}: ${error.message}`); }
  }
  throw new Error(`行情采集失败；未覆盖已有快照。${errors.join("; ")}`);
}
