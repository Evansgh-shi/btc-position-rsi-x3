// The build embeds static assets and the shared market collector above this module.
let latest = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(ASSETS["/data/market.json"].body), c => c.charCodeAt(0))));
let refreshing = null;
let checkedAt = 0;
async function upstreamSnapshot() {
  // GitHub's scheduled collector can reach Binance from regions where Workers cannot.
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`https://evansgh-shi.github.io/btc-position-rsi-x3/data/market.json?t=${Math.floor(Date.now()/60000)}`, { signal:controller.signal, cache:"no-store" });
    if (!response.ok) throw new Error("Shared snapshot unavailable");
    const value = await response.json();
    if (!isMarketData(value)) throw new Error("Invalid shared snapshot");
    if (Date.parse(value.meta.updatedAt) > Date.parse(latest.meta.updatedAt)) latest = value;
    if (Date.now() - Date.parse(latest.meta.updatedAt) > 2 * 3600000) throw new Error("Shared snapshot is stale");
    return latest;
  } finally { clearTimeout(timer); }
}
async function realSnapshot() {
  if (Date.now() - Date.parse(latest.meta.updatedAt) < 5 * 60000 || Date.now() - checkedAt < 5 * 60000) return latest;
  if (!refreshing) {
    refreshing = upstreamSnapshot().catch(() => collectMarketData()).then(value => { latest = value; return value; })
      .catch(error => { console.error("Market refresh failed", error.message); return latest; })
      .finally(() => { checkedAt = Date.now(); refreshing = null; });
  }
  return refreshing;
}
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/data/market.json") {
      return Response.json(await realSnapshot(), { headers: {
        "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store",
      } });
    }
    const asset = ASSETS[url.pathname === "/" ? "/index.html" : url.pathname];
    if (!asset) return new Response("Not found", {status:404});
    const bytes = Uint8Array.from(atob(asset.body), c => c.charCodeAt(0));
    return new Response(request.method === "HEAD" ? null : bytes, {headers:{
      "Content-Type": asset.type,
      "Cache-Control": url.pathname.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "no-cache",
    }});
  },
};
