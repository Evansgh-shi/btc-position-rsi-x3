export type Point = {
  date: string; price: number; position: number | null; rsi: number; fear: number | null; ma200: number;
  trend: "up" | "down"; z: number | null;
};
export type MarketData = {
  current: Point & { position: number; fear: number; z: number; change24h: number; high24h: number; low24h: number; rsiFrame: string };
  history: Point[];
  meta: {
    schemaVersion: number; priceSource: string; fearSource: string; updatedAt: string;
    priceUpdatedAt: string; fearUpdatedAt: string; formula: string; endpoint: string;
    degraded: false; rsiMethod: string; fearSourceId: "cmc"; fearSourceUrl: string; fearHistoryStart: string;
  };
};
export function isMarketData(value: unknown): value is MarketData;
export function rsi(values: number[], period?: number): number | null;
export function normalCdf(value: number): number;
export function buildMarketData(input: unknown): MarketData;
