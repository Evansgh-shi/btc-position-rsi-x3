// The build embeds static assets and the shared market collector above this module.
let latest = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(ASSETS["/data/market.json"].body), c => c.charCodeAt(0))));
let refreshing = null;
async function realSnapshot() {
  if (Date.now() - Date.parse(latest.meta.updatedAt) < 5 * 60000) return latest;
  if (!refreshing) {
    refreshing = collectMarketData().then(value => { latest = value; return value; })
      .catch(error => { console.error("Market refresh failed", error.message); return latest; })
      .finally(() => { refreshing = null; });
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
