import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/lib/database';
import {decryptCredentials,normalizeFill,okxPrivateGet,type TradeFill} from '@/lib/okx';
import {INSTRUMENTS} from '@/lib/replay';

export async function GET(request:Request){try{
  const user=await getChatGPTUser();if(!user)return Response.json({error:'请登录后读取交割单'},{status:401});
  const params=new URL(request.url).searchParams,instrument=params.get('instrument')||'',begin=Number(params.get('begin')),end=Number(params.get('end'));
  if(!INSTRUMENTS.includes(instrument)||![begin,end].every(Number.isFinite)||begin<=0||end<=begin||end-begin>31*86400000)return Response.json({error:'无效的品种或时间区间'},{status:400});
  const row=await database().prepare('SELECT encrypted FROM exchange_connections WHERE key = ?').bind(`${user.userId}:okx`).first<{encrypted:string}>();
  if(!row)return Response.json({error:'请先连接 OKX 只读 API'},{status:409});
  const ninetyDaysAgo=Date.now()-90*86400000;
  if(end<ninetyDaysAgo)return Response.json({fills:[],limited:true,message:'OKX 交割明细接口只提供最近 3 个月记录。'});
  const credentials=await decryptCredentials(row.encrypted),instType=instrument.endsWith('-SWAP')?'SWAP':'SPOT',fills:TradeFill[]=[],seen=new Set<string>();let after='';
  for(let page=0;page<50;page++){
    const query=new URLSearchParams({instType,instId:instrument,begin:String(Math.max(begin,ninetyDaysAgo)),end:String(Math.min(end,Date.now())),limit:'100'});if(after)query.set('after',after);
    const rows=await okxPrivateGet<Array<Record<string,string>>>(credentials,`/api/v5/trade/fills-history?${query.toString()}`);
    if(!rows.length)break;
    for(const item of rows){const fill=normalizeFill(item);if(fill&&!seen.has(fill.id)){seen.add(fill.id);fills.push(fill);}}
    const next=rows.at(-1)?.billId;if(rows.length<100||!next||next===after)break;after=next;await new Promise(resolve=>setTimeout(resolve,220));
  }
  fills.sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));
  return Response.json({fills,limited:begin<ninetyDaysAgo,syncedAt:Date.now()});
}catch(error){console.error('okx fills',error);const message=error instanceof Error?error.message:'交割单同步失败';return Response.json({error:message.includes('decrypt')?'OKX 连接已失效，请重新连接。':message},{status:503});}}
