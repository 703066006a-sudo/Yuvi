import type {Candle} from './replay';
export function mergeHistory(history:Candle[],local:Candle[],period:number,cursor:number){
 const map=new Map(history.filter(c=>c.time+period*60<=cursor).map(c=>[c.time,c]));
 // Local minute aggregation can include an unfinished bar; preserve a complete native bar.
 for(const c of local)if(!map.has(c.time))map.set(c.time,c);
 return [...map.values()].sort((a,b)=>a.time-b.time);
}
export function prependedBars(previous:Candle[],next:Candle[]){return previous.length?next.findIndex(c=>c.time===previous[0].time):0;}
