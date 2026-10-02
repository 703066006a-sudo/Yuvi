import {test} from 'node:test';
import assert from 'node:assert/strict';
import {historyRows} from '../lib/market-request.ts';
const row=['1','10','12','8','11','1','1','1','1'];
test('network failure switches official endpoints and keeps request parameters',async()=>{
 const seen:string[]=[];const rows=await historyRows({instId:'BTC-USDT',bar:'1m',after:'123'},{pause:async()=>{},fetcher:(async(url)=>{seen.push(String(url));if(seen.length===1)throw new Error('network');return Response.json({code:'0',data:[row]});}) as typeof fetch});
 assert.deepEqual(rows,[row]);assert.equal(new URL(seen[1]).hostname,'www.okx.com');assert.equal(new URL(seen[1]).searchParams.get('after'),'123');
});
test('rate limits and malformed responses retry with a finite request budget',async()=>{
 let calls=0;await assert.rejects(historyRows({instId:'BTC-USDT'},{pause:async()=>{},fetcher:(async()=>{calls++;return calls%2?new Response('',{status:429}):Response.json({code:'0',data:[[]]});}) as typeof fetch}));assert.equal(calls,4);
});
test('request timeout aborts stalled connections and eventually exits',async()=>{
 let calls=0;await assert.rejects(historyRows({instId:'BTC-USDT'},{timeoutMs:5,pause:async()=>{},fetcher:((_,options)=>new Promise((_,reject)=>{calls++;options?.signal?.addEventListener('abort',()=>reject(new Error('timeout')),{once:true});})) as typeof fetch}));assert.equal(calls,4);
});
