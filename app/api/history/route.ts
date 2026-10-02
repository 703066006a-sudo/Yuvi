import {historyRows} from '@/lib/market-request';
import {database} from '@/lib/database';
import {INSTRUMENTS,normalize,type Candle} from '@/lib/replay';

const EARLIEST_SUPPORTED=Date.parse('2017-01-01T00:00:00Z')/1000;

export async function GET(request:Request){try{
 const instrument=new URL(request.url).searchParams.get('instrument')||'BTC-USDT';
 if(!INSTRUMENTS.includes(instrument))return Response.json({error:'无效交易品种'},{status:400});
 const db=database(),key=`history:${instrument}:all:1Dutc`,stored=await db.prepare('SELECT payload,fetched_at FROM candle_days WHERE key = ?').bind(key).first<{payload:string;fetched_at:number}>();
 if(stored&&Date.now()-stored.fetched_at<86400000)return Response.json({...JSON.parse(stored.payload),cached:true},{headers:{'Cache-Control':'private, max-age=86400'}});
 const end=Math.floor(Date.now()/86400000)*86400,start=EARLIEST_SUPPORTED,raw:string[][]=[];let after=end*1000;
 for(let page=0;page<20;page++){
  let rows:string[][];try{rows=await historyRows({instId:instrument,bar:'1Dutc',limit:'300',after:String(after)});}catch(error){if(stored)return Response.json({...JSON.parse(stored.payload),cached:true,stale:true});throw error;}if(!rows.length)break;raw.push(...rows);const oldest=Math.min(...rows.map(row=>Number(row[0])));if(oldest<=start*1000)break;if(oldest>=after)throw new Error('日线分页未推进');after=oldest;await new Promise(resolve=>setTimeout(resolve,100));
 }
 const candles:Candle[]=normalize(raw,start,end);if(!candles.length)return Response.json({error:'没有可用长期历史数据'},{status:503});
 const payload={source:'OKX',instrument,bar:'1Dutc',scope:'all',candles,firstDay:new Date(candles[0].time*1000).toISOString().slice(0,10),lastDay:new Date(candles.at(-1)!.time*1000).toISOString().slice(0,10),fetchedAt:new Date().toISOString()};
 await db.prepare('INSERT INTO candle_days (key,payload,fetched_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at').bind(key,JSON.stringify(payload),Date.now()).run();
 return Response.json(payload,{headers:{'Cache-Control':'private, max-age=86400'}});
}catch(error){console.error('long history',error);return Response.json({error:'完整日线历史读取失败'},{status:503});}}
