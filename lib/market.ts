import { isMarketData, type MarketData } from "./market-model.mjs";
export type { Point, MarketData } from "./market-model.mjs";
const CACHE_KEY = "btc-position-real-market-v3-cmc";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const SHARED_SNAPSHOT = "https://evansgh-shi.github.io/btc-position-rsi-x3/data/market.json";

export async function fetchMarketData(): Promise<MarketData> {
  const candidates: MarketData[] = [];
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (isMarketData(cached)) candidates.push(cached);
  } catch { /* Storage is optional. */ }
  const urls = [`${BASE_PATH}/data/market.json`, SHARED_SNAPSHOT];
  if (BASE_PATH) urls.push("https://btc-position-rsi-x3.hakimi666.chatgpt.site/data/market.json");
  const results = await Promise.allSettled([...new Set(urls)].map(async (url) => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error("读取行情快照超时")); }, 8000);
    });
    try {
      return await Promise.race([(async () => {
        const response = await fetch(`${url}?t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`行情快照 HTTP ${response.status}`);
        const value: unknown = await response.json();
        if (!isMarketData(value)) throw new Error("行情快照格式无效");
        return value;
      })(), deadline]);
    } finally { clearTimeout(timer!); }
  }));
  for (const result of results) if (result.status === "fulfilled") candidates.push(result.value);
  candidates.sort((a, b) => Date.parse(b.meta.updatedAt) - Date.parse(a.meta.updatedAt));
  const best = candidates[0];
  if (!best) throw new Error("暂时无法读取行情，请稍后重试。");
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(best)); } catch { /* Storage is optional. */ }
  return best;
}
