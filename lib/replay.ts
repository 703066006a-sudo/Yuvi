export type Candle = { time:number; open:number; high:number; low:number; close:number; volume:number };
export const PERIODS = [{label:'1分钟',value:1},{label:'5分钟',value:5},{label:'15分钟',value:15},{label:'30分钟',value:30},{label:'1小时',value:60},{label:'4小时',value:240},{label:'日线',value:1440}];
export const INSTRUMENTS=['BTC-USDT','ETH-USDT','SOL-USDT','BTC-USDT-SWAP','ETH-USDT-SWAP'];
export function aggregate(candles:Candle[],minutes:number,cutoff:number):Candle[]{
 const buckets=new Map<number,Candle>();
 for(const c of candles){if(c.time+60>cutoff)continue;const time=Math.floor(c.time/(minutes*60))*minutes*60;const b=buckets.get(time);if(b){b.high=Math.max(b.high,c.high);b.low=Math.min(b.low,c.low);b.close=c.close;b.volume+=c.volume;}else buckets.set(time,{...c,time});}
 return [...buckets.values()];
}
export function average(candles:Candle[],period:number,exponential=false){let sum=0,ema=0;return candles.flatMap((c,i)=>{sum+=c.close;if(i>=period)sum-=candles[i-period].close;if(i<period-1)return [];ema=i===period-1?sum/period:exponential?c.close*(2/(period+1))+ema*(1-2/(period+1)):sum/period;return [{time:c.time,value:ema}];});}
export function gaps(candles:Candle[],start:number,end:number){let count=0,t=start;for(const c of candles){if(c.time<t||c.time>=end)continue;count+=Math.max(0,Math.round((c.time-t)/60));t=c.time+60;}return count+Math.max(0,Math.round((end-t)/60));}
export function normalize(rows:string[][],start:number,end:number):Candle[]{const map=new Map<number,Candle>();for(const r of rows){const [ms,o,h,l,c,v]=r.map(Number);const time=ms/1000;if(r[8]!=='1'||time<start||time>=end)continue;if(![ms,o,h,l,c,v].every(Number.isFinite)||ms%60000!==0||Math.min(o,h,l,c)<=0||v<0||h<Math.max(o,l,c)||l>Math.min(o,h,c))throw new Error('行情数据校验失败');map.set(time,{time,open:o,high:h,low:l,close:c,volume:v});}return [...map.values()].sort((a,b)=>a.time-b.time);}
export function fmtTime(t:number){return new Date(t*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}
