import { env } from 'cloudflare:workers';

export type OkxCredentials={apiKey:string;secretKey:string;passphrase:string;demo?:boolean};
export type TradeFill={
  id:string;tradeId:string;orderId:string;instrument:string;side:'buy'|'sell';
  positionSide:string;price:number;size:number;fee:number;feeCurrency:string;
  pnl:number;liquidity:'maker'|'taker'|'';time:number;
};

const encoder=new TextEncoder();
const decoder=new TextDecoder();
const bytesToBase64=(bytes:Uint8Array)=>{
  let value='';for(const byte of bytes)value+=String.fromCharCode(byte);return btoa(value);
};
const base64ToBytes=(value:string)=>{
  const raw=atob(value);return Uint8Array.from(raw,char=>char.charCodeAt(0));
};

async function encryptionKey(){
  const value=(env as unknown as Record<string,string|undefined>).CREDENTIAL_ENCRYPTION_KEY;
  if(!value)throw new Error('API 密钥加密服务尚未配置');
  const bytes=base64ToBytes(value);
  if(bytes.length!==32)throw new Error('API 密钥加密服务配置无效');
  return crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['encrypt','decrypt']);
}

export async function encryptCredentials(credentials:OkxCredentials){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await encryptionKey(),encoder.encode(JSON.stringify(credentials)));
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

export async function decryptCredentials(value:string):Promise<OkxCredentials>{
  const [ivText,payload]=value.split('.');
  if(!ivText||!payload)throw new Error('保存的 API 连接格式无效');
  const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:base64ToBytes(ivText)},await encryptionKey(),base64ToBytes(payload));
  return JSON.parse(decoder.decode(decrypted)) as OkxCredentials;
}

export async function okxSignature(secret:string,timestamp:string,method:string,requestPath:string,body=''){
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,encoder.encode(timestamp+method.toUpperCase()+requestPath+body));
  return bytesToBase64(new Uint8Array(signature));
}

export async function okxPrivateGet<T>(credentials:OkxCredentials,requestPath:string,demo=credentials.demo??false):Promise<T>{
  const timestamp=new Date().toISOString();
  const response=await fetch(`https://www.okx.com${requestPath}`,{headers:{
    'OK-ACCESS-KEY':credentials.apiKey,
    'OK-ACCESS-SIGN':await okxSignature(credentials.secretKey,timestamp,'GET',requestPath),
    'OK-ACCESS-TIMESTAMP':timestamp,
    'OK-ACCESS-PASSPHRASE':credentials.passphrase,
    ...(demo?{'x-simulated-trading':'1'}:{}),
  },signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`OKX 请求失败（${response.status}）`);
  const result=await response.json() as {code:string;msg:string;data:T};
  if(result.code!=='0')throw new Error(result.msg||`OKX 返回错误 ${result.code}`);
  return result.data;
}

export function normalizeFill(row:Record<string,string>):TradeFill|null{
  const price=Number(row.fillPx),size=Number(row.fillSz),time=Number(row.fillTime||row.ts)/1000;
  if(!row.billId||!row.instId||!['buy','sell'].includes(row.side)||![price,size,time].every(Number.isFinite)||price<=0||size<=0)return null;
  return {id:row.billId,tradeId:row.tradeId||'',orderId:row.ordId||'',instrument:row.instId,side:row.side as 'buy'|'sell',positionSide:row.posSide||'net',price,size,fee:Number(row.fee)||0,feeCurrency:row.feeCcy||'',pnl:Number(row.fillPnl)||0,liquidity:row.execType==='M'?'maker':row.execType==='T'?'taker':'',time};
}
