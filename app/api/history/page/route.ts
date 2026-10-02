import {historyRows} from '@/lib/market-request';
import {database} from '@/lib/database';
import {INSTRUMENTS,normalize} from '@/lib/replay';
const intervals:Record<number,string>={1:'1m',5:'5m',15:'15m',30:'30m',60:'1H',240:'4H',1440:'1Dutc'};
export async function GET(request:Request){try{
 const p=new URL(request.url).searchParams,instrument=p.get('instrument')||'',period=Number(p.get('period')),before=Number(p.get('before'));
 if(!INSTRUMENTS.includes(instrument)||!intervals[period]||!Number.isSafeInteger(before)||before<=0||before>Date.now()/1000+period*60*301)return Response.json({error:'无效历史范围'},{status:400});
 const boundary=Math.floor(before/(period*60))*period*60,key=`page:v1:${instrument}:${period}:${boundary}`,db=database();
 const stored=await db.prepare('SELECT payload,fetched_at FROM candle_days WHERE key = ?').bind(key).first<{payload:string;fetched_at:number}>();
 if(stored&&Date.now()-stored.fetched_at<86400000)return Response.json({...JSON.parse(stored.payload),cached:true});
 let rows:string[][];try{rows=await historyRows({instId:instrument,bar:intervals[period],after:String(boundary*1000),limit:'300'});}catch(error){if(stored)return Response.json({...JSON.parse(stored.payload),cached:true,stale:true});throw error;}
 const candles=normalize(rows,0,boundary),oldest=rows.length?Math.min(...rows.map(row=>Number(row[0])/1000)):null;
 if(oldest!==null&&(!Number.isFinite(oldest)||oldest>=boundary))throw new Error('历史分页未推进');
 const payload={candles,nextBefore:oldest,exhausted:rows.length===0,source:'OKX',period};
 await db.prepare('INSERT INTO candle_days (key,payload,fetched_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at').bind(key,JSON.stringify(payload),Date.now()).run();
 return Response.json(payload);
 }catch{return Response.json({error:'历史行情暂时无法读取，请稍后重试'},{status:503});}}
