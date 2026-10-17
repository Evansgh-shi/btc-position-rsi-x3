import { readFileSync } from "node:fs";
import { join } from "node:path";
import Dashboard from "../components/dashboard";
import { isMarketData } from "../lib/market-model.mjs";

export default function Home() {
  const initialData: unknown = JSON.parse(readFileSync(join(process.cwd(), "public/data/market.json"), "utf8"));
  if (!isMarketData(initialData)) throw new Error("发布需要经过校验的真实行情快照");
  return <Dashboard initialData={initialData} />;
}
