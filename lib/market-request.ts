// Public market data only: never send account credentials to fallback hosts.
const defaultOrigins=['https://openapi.okx.com','https://www.okx.com'];
export type MarketRequestOptions={fetcher?:typeof fetch;origins?:string[];timeoutMs?:number;pause?:(ms:number)=>Promise<void>};
export async function historyRows(params:Record<string,string>,options:MarketRequestOptions={}){
 const fetcher=options.fetcher??fetch,origins=options.origins??defaultOrigins,pause=options.pause??(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
 let last='行情连接失败';
 for(let round=0;round<2;round++)for(const origin of origins){
  const url=new URL('/api/v5/market/history-candles',origin);url.search=new URLSearchParams(params).toString();
  try{const response=await fetcher(url,{signal:AbortSignal.timeout(options.timeoutMs??4000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const body=await response.json() as {code:string;msg?:string;data:unknown};
   if(body.code!=='0'||!Array.isArray(body.data)||body.data.some(row=>!Array.isArray(row)||row.length<9))throw new Error(`OKX ${body.code||'invalid_response'}`);
   return body.data as string[][];
  }catch(error){last=error instanceof Error?error.name+': '+error.message:'行情连接失败';if(round===0)await pause(250);}
 }
 console.error('market history unavailable',last);throw new Error('行情接口暂时无法连接，请重试或检查部署环境的网络。');
}
