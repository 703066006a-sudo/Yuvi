import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/lib/database';
import {INSTRUMENTS} from '@/lib/replay';

export async function GET(request:Request){try{
 const user=await getChatGPTUser();if(!user)return Response.json({error:'请登录后查看缓存库'},{status:401});
 const instrument=new URL(request.url).searchParams.get('instrument')||'BTC-USDT';if(!INSTRUMENTS.includes(instrument))return Response.json({error:'无效交易品种'},{status:400});
 const row=await database().prepare("SELECT COUNT(*) AS days, COALESCE(SUM(json_array_length(json_extract(payload,'$.candles'))),0) AS candles, MIN(substr(key,length(?)+2)) AS first_day, MAX(substr(key,length(?)+2)) AS last_day FROM candle_days WHERE key GLOB ?").bind(instrument,instrument,`${instrument}:????-??-??`).first<{days:number;candles:number;first_day:string|null;last_day:string|null}>();
 const overview=await database().prepare('SELECT fetched_at FROM candle_days WHERE key = ?').bind(`history:${instrument}:all:1Dutc`).first<{fetched_at:number}>();
 return Response.json({instrument,days:Number(row?.days||0),candles:Number(row?.candles||0),firstDay:row?.first_day||null,lastDay:row?.last_day||null,allDailyCached:Boolean(overview),updatedAt:overview?.fetched_at||null});
}catch(error){console.error('cache status',error);return Response.json({error:'缓存库状态读取失败'},{status:503});}}
