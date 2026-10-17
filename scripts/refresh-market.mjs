import { mkdirSync, writeFileSync, renameSync } from "node:fs";
import { collectMarketData } from "../lib/collect-market.mjs";
const snapshot = await collectMarketData();
mkdirSync("public/data", { recursive: true });
writeFileSync("public/data/market.json.tmp", JSON.stringify(snapshot));
renameSync("public/data/market.json.tmp", "public/data/market.json");
console.log(JSON.stringify({ updatedAt: snapshot.meta.updatedAt, price: snapshot.current.price,
  position: snapshot.current.position, rsi: snapshot.current.rsi, history: snapshot.history.length, endpoint: snapshot.meta.endpoint }));
