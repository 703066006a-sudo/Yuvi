import {database} from '@/lib/database';
import {normalize,gaps,INSTRUMENTS} from '@/lib/replay';
export async function GET(request:Request){try{
 const p=new URL(request.url).searchParams, instrument=p.get('instrument')||'BTC-USDT',day=p.get('day')||'';
 const start=Date.parse(day+'T00:00:00Z')/1000,end=start+86400;
 if(!INSTRUMENTS.includes(instrument)||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(start)||new Date(start*1000).toISOString().slice(0,10)!==day||start<1577836800||end>Date.now()/1000) return Response.json({error:'请选择 2020 年以后、今天以前的完整 UTC 日期。'},{status:400});
 const key=instrument+':'+day,db=database();const stored=await db.prepare('SELECT payload FROM candle_days WHERE key = ?').bind(key).first<{payload:string}>();
 if(stored){const data=JSON.parse(stored.payload);return Response.json({...data,cached:true},{headers:{'Cache-Control':'private, max-age=31536000, immutable'}});}
 let after=end*1000;const raw:string[][]=[];
 for(let page=0;page<6;page++){
  let body:{code:string;msg?:string;data:string[][]}|undefined;
  for(let attempt=0;attempt<3;attempt++){
   try{const url=new URL('https://www.okx.com/api/v5/market/history-candles');url.search=new URLSearchParams({instId:instrument,bar:'1m',limit:'300',after:String(after)}).toString();const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('行情源暂时不可用');body=await response.json();if(body?.code==='0')break;throw new Error(body?.msg||'行情请求受限');}catch(error){if(attempt===2)throw error;await new Promise(r=>setTimeout(r,500*(attempt+1)));}
  }
  const rows=body?.data||[];if(!rows.length)break;raw.push(...rows);const oldest=Math.min(...rows.map(r=>Number(r[0])));if(oldest<=start*1000)break;if(oldest>=after)throw new Error('行情分页未推进');after=oldest;await new Promise(r=>setTimeout(r,120));
 }
 const candles=normalize(raw,start,end),missing=gaps(candles,start,end);if(!candles.length)return Response.json({error:'这一天没有可用行情，请更换日期。'},{status:404});
 const data={source:'OKX',instrument,bar:'1m',day,candles,missing,fetchedAt:new Date().toISOString(),cached:false};
 await db.prepare('INSERT INTO candle_days (key,payload,fetched_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at').bind(key,JSON.stringify(data),Date.now()).run();
 return Response.json(data,{headers:{'Cache-Control':'private, max-age=31536000, immutable'}});
 }catch(e){console.error('candles',e);return Response.json({error:'历史行情读取失败，请重试。不会使用模拟数据替代。'},{status:503});}}
