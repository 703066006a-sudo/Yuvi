export type FibLevel={value:number;enabled:boolean;color?:string};
export const DEFAULT_FIB_VALUES=[0,.236,.382,.5,.618,.786,1,-.236,-.382,-.618,-1,1.272,1.414,1.618,2,2.272,2.414,2.618,3,3.618,4.236,4.618,5,6.854];
export function fibLevels(levels?:FibLevel[]):FibLevel[]{return levels??DEFAULT_FIB_VALUES.map((value,i)=>({value,enabled:i<7}));}
export function fibPrice(start:number,end:number,ratio:number){return start+(end-start)*ratio;}
