import type {Drawing} from './session-schema';
export const FIB_LEVELS=[0,.236,.382,.5,.618,.786,1];
// Interpolate between actual bars across gaps; extrapolate beyond loaded bars.
// Mapping only: never write a mapped timestamp back to a saved anchor.
export function timeToLogical(bars:readonly {time:number}[],time:number,period:number){
 if(!bars.length)return 0;
 if(time<=bars[0].time)return (time-bars[0].time)/(period*60);
 const last=bars.length-1;if(time>=bars[last].time)return last+(time-bars[last].time)/(period*60);
 let lo=0,hi=last;while(hi-lo>1){const mid=(lo+hi)>>1;if(bars[mid].time<=time)lo=mid;else hi=mid;}
 return lo+(time-bars[lo].time)/(bars[hi].time-bars[lo].time);
}
export function logicalToTime(bars:readonly {time:number}[],logical:number,period:number){
 if(!bars.length)return 0;const last=bars.length-1;
 if(logical<=0)return bars[0].time+logical*period*60;
 if(logical>=last)return bars[last].time+(logical-last)*period*60;
 const i=Math.floor(logical);return bars[i].time+(logical-i)*(bars[i+1].time-bars[i].time);
}
export function translateDrawing(d:Drawing,dt:number,dp:number):Drawing{
 const safePrice=Math.max(dp,1e-8-Math.min(...d.points.map(p=>p.price)));
 const safeTime=Math.max(dt,-Math.min(...d.points.map(p=>p.time)));
 return {...d,points:d.points.map(p=>({time:p.time+safeTime,price:p.price+safePrice}))};
}
