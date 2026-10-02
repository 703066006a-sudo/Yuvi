// Prefetch at least seven days ahead, or 120 bars for larger periods (up to 30 days).
export function prefetchLeadSeconds(period:number){return Math.max(7*86400,Math.min(30*86400,period*60*120));}
export function contiguousDays<T>(dates:readonly string[],results:ReadonlyMap<string,T>){const ready:string[]=[];for(const day of dates){if(!results.has(day))break;ready.push(day);}return ready;}
