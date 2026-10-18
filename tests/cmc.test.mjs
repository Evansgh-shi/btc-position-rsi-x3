import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCmcLatest,parseCmcHistory,fetchMarketJson} from '../lib/collect-market.mjs';

const status={error_code:'0'};
test('CMC live values retain the actual publication timestamp, not the daily timestamp',()=>{
  const body={status,data:{value:49,update_time:'2026-10-18T02:23:10.019Z',value_classification:'Neutral'}};
  assert.deepEqual(parseCmcLatest(body),{value:49,timestamp:Date.parse(body.data.update_time)/1000});
  for(const data of [{value:null,update_time:body.data.update_time},{value:101,update_time:body.data.update_time},{value:49,update_time:'bad'}]) assert.throws(()=>parseCmcLatest({status,data}),/CMC/);
  assert.throws(()=>parseCmcLatest({...body,status:{error_code:1008}}),/CMC/);
});
test('CMC historical records accept documented midnight Unix timestamps only',()=>{
  const row={timestamp:String(Date.UTC(2023,5,29)/1000),value:59};
  assert.deepEqual(parseCmcHistory({status,data:[row]}),[{timestamp:Number(row.timestamp),value:59}]);
  assert.deepEqual(parseCmcHistory({status,data:[]}),[]);
  for(const bad of [{...row,value:-1},{...row,value:'59'},{...row,timestamp:'bad'},{...row,timestamp:Number(row.timestamp)+3600}]) assert.throws(()=>parseCmcHistory({status,data:[bad]}),/CMC/);
  assert.throws(()=>parseCmcHistory({status:{error_code:1008},data:[row]}),/CMC/);
});

test('rate limits honor Retry-After and retry without switching data providers',async()=>{
  const calls=[],waits=[];
  const result=await fetchMarketJson('https://pro-api.coinmarketcap.com/public-api/test',{
    fetcher:async url=>{calls.push(url);return calls.length===1?new Response('',{status:429,headers:{'retry-after':'3'}}):Response.json({ok:true});},
    pause:async ms=>{waits.push(ms);}
  });
  assert.deepEqual(result,{ok:true});assert.deepEqual(waits,[3000]);assert.equal(calls.length,2);assert.equal(calls[0],calls[1]);
});
test('rate-limit retries are bounded and long Retry-After is not bypassed',async()=>{
  let calls=0;
  await assert.rejects(()=>fetchMarketJson('https://example.com/',{fetcher:async()=>{calls++;return new Response('',{status:429});},pause:async()=>{}}),/429/);
  assert.equal(calls,4);
  calls=0;
  await assert.rejects(()=>fetchMarketJson('https://example.com/',{fetcher:async()=>{calls++;return new Response('',{status:429,headers:{'retry-after':'60'}});},pause:async()=>assert.fail('must not retry early')}),/longer retry/);
  assert.equal(calls,1);
});
