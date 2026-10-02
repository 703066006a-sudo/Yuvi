"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import type {Candle} from '@/lib/replay';
type Page={candles:Candle[];nextBefore:number|null;exhausted:boolean};
export function useHistorySeries(instrument:string,period:number,cursor:number,enabled:boolean){
 const [series,setSeries]=useState<{key:string;candles:Candle[]}>({key:'',candles:[]});
 const key=instrument+':'+period,epoch=useRef(0),oldest=useRef<number|null>(null),busy=useRef(false),complete=useRef(false),abort=useRef<AbortController|null>(null),retry=useRef(0);
 const request=useCallback(async(before:number,older:boolean)=>{
  if(!enabled||busy.current||Date.now()<retry.current||(older&&complete.current))return;
  const version=epoch.current,signal=abort.current?.signal;if(!signal||signal.aborted)return;busy.current=true;
  try{const response=await fetch(`/api/history/page?instrument=${encodeURIComponent(instrument)}&period=${period}&before=${Math.floor(before)}`,{signal});const page=await response.json() as Page;if(!response.ok)throw new Error();if(version!==epoch.current||signal.aborted)return;
   setSeries(current=>{const list=current.key===key?current.candles:[];return {key,candles:[...new Map([...list,...page.candles].map(c=>[c.time,c])).values()].sort((a,b)=>a.time-b.time)};});
   if(older){oldest.current=page.nextBefore;complete.current=page.exhausted;}else if(oldest.current===null){oldest.current=page.nextBefore;complete.current=page.exhausted;}
  }catch{if(!signal.aborted)retry.current=Date.now()+5000;}finally{if(version===epoch.current)busy.current=false;}
 },[enabled,instrument,period,key]);
 useEffect(()=>{epoch.current++;abort.current?.abort();abort.current=new AbortController();oldest.current=null;busy.current=false;complete.current=false;retry.current=0;setSeries({key,candles:[]});return()=>abort.current?.abort();},[key,enabled]);
 const candles=series.key===key?series.candles:[];
 useEffect(()=>{if(!enabled||!cursor)return;const tick=()=>{if(candles.length&&cursor<(candles[0].time+period*60*80)&&oldest.current!==null){void request(oldest.current,true);return;}const end=candles.at(-1)?.time??0;if(!candles.length||cursor>=end-period*60*60)void request(Math.min(Math.floor(Date.now()/1000),cursor+period*60*150),false);};tick();const timer=setInterval(tick,5000);return()=>clearInterval(timer);},[enabled,cursor,period,candles,request]);
 const loadOlder=useCallback(()=>{if(oldest.current!==null)void request(oldest.current,true);},[request]);
 return {candles,loadOlder};
}
