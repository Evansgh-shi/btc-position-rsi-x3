import test from "node:test";
import assert from "node:assert/strict";
import { rsi, normalCdf, buildMarketData, isMarketData } from "../lib/market-model.mjs";

test("Wilder RSI matches a reference series", () => {
  const series = [44.34,44.09,44.15,43.61,44.33,44.83,45.10,45.42,45.84,46.08,45.89,46.03,45.61,46.28,46.28,46.00];
  assert.ok(Math.abs(rsi(series.slice(0, 15)) - 70.464135) < .00001);
  assert.ok(Math.abs(rsi(series) - 66.249619) < .00001);
  assert.equal(rsi([1,2,3]), null);
  assert.equal(rsi(Array(20).fill(5)), 50);
});

test("normal CDF maps Z correctly and is symmetric", () => {
  assert.ok(Math.abs(normalCdf(0) - .5) < 1e-6);
  assert.ok(Math.abs(normalCdf(1.96) - .975002) < 1e-6);
  assert.ok(Math.abs(normalCdf(-1.96) + normalCdf(1.96) - 1) < 1e-6);
});

function fixture() {
  const day = 86400000, start = Date.UTC(2023, 0, 1), count = 1000;
  const now = start + (count - 1) * day + 3600000;
  const daily = Array.from({length:count}, (_, i) => [start+i*day,0,0,0,String(40000+i*10+3000*Math.sin(i/30))]);
  const fearItems = Array.from({length:400}, (_, i) => ({timestamp:String((start+(count-1-i)*day)/1000),value:String(30+i%40)}));
  const ticker = {lastPrice:daily.at(-1)[4],priceChangePercent:'1.2',highPrice:'60000',lowPrice:'40000',closeTime:now};
  const fearLatest={timestamp:now/1000,value:30};
  return { daily, fearItems, fearLatest, ticker, fetchedAt:now, endpoint:'test' };
}

test("historical positions do not use future prices or fear values", () => {
  const f = fixture(), a = buildMarketData(f);
  f.daily.at(-1)[4] = '99999'; f.ticker.lastPrice = '99999'; f.fearItems[0].value = '99'; f.fearLatest.value = 99;
  const b = buildMarketData(f);
  assert.deepEqual(a.history.slice(0,-1), b.history.slice(0,-1));
  assert.notEqual(a.current.position, b.current.position);
  assert.ok(isMarketData(a));
  assert.ok(a.history.length > 366, "history must no longer be capped at one year");
});

test("invalid, stale or missing data cannot become a valid position", () => {
  const f=fixture();
  assert.throws(() => buildMarketData({...f,fearItems:[]}), /恐贪/);
  assert.throws(() => buildMarketData({...f,ticker:{...f.ticker,closeTime:0}}), /过期/);
  assert.throws(() => buildMarketData({...f,daily:f.daily.slice(0,300)}), /不足/);
  assert.equal(isMarketData({meta:{degraded:true}}), false);
  assert.throws(() => buildMarketData({...f,fearLatest:{...f.fearLatest,timestamp:f.fearLatest.timestamp-7201}}), /当前恐贪/);
  assert.throws(() => buildMarketData({...f,fearLatest:{...f.fearLatest,timestamp:f.fearLatest.timestamp+1}}), /当前恐贪/);
});

test('pre-CMC dates retain price but never contain fabricated allocation', () => {
  const f=fixture(), data=buildMarketData(f), first=data.meta.fearHistoryStart;
  const early=data.history.filter(p=>p.date<first);
  assert.ok(early.length>0);
  for(const p of early){assert.ok(p.price>0);assert.equal(p.position,null);assert.equal(p.fear,null);assert.equal(p.z,null);}
  assert.ok(data.history.filter(p=>p.date>=first).every(p=>p.position!==null));
  const invalid=structuredClone(data);invalid.history[0].position=50;
  assert.equal(isMarketData(invalid),false);
});

test('current allocation uses live CMC value without rewriting completed daily history', () => {
  const f=fixture(), a=buildMarketData(f);
  f.fearLatest.value=49;
  const b=buildMarketData(f);
  assert.deepEqual(a.history.slice(0,-1),b.history.slice(0,-1));
  assert.equal(b.current.fear,49);
  assert.ok(Math.abs(b.current.position-normalCdf((100-b.current.rsi-49)*.03)*100)<1e-10);
  assert.equal(b.meta.fearUpdatedAt,new Date(f.fearLatest.timestamp*1000).toISOString());
  assert.equal(isMarketData({...b,meta:{...b.meta,schemaVersion:2}}),false);
  assert.equal(isMarketData({...b,meta:{...b.meta,fearSourceId:'alternative'}}),false);
});
