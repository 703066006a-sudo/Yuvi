import {z} from 'zod';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/lib/database';
import {encryptCredentials,okxPrivateGet,type OkxCredentials} from '@/lib/okx';

const schema=z.object({apiKey:z.string().trim().min(8).max(200),secretKey:z.string().trim().min(8).max(300),passphrase:z.string().min(1).max(200),demo:z.boolean().default(false)});
const key=(userId:string)=>`${userId}:okx`;

export async function GET(){try{
  const user=await getChatGPTUser();if(!user)return Response.json({error:'请登录后连接 OKX'},{status:401});
  const row=await database().prepare('SELECT key_hint,label,updated_at FROM exchange_connections WHERE key = ?').bind(key(user.userId)).first<{key_hint:string;label:string;updated_at:number}>();
  return Response.json(row?{connected:true,keyHint:row.key_hint,label:row.label,updatedAt:row.updated_at}:{connected:false});
}catch(error){console.error('okx connection status',error);return Response.json({error:'连接状态读取失败'},{status:503});}}

export async function POST(request:Request){try{
  if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'无效请求来源'},{status:403});
  const user=await getChatGPTUser();if(!user)return Response.json({error:'请登录后连接 OKX'},{status:401});
  const raw=await request.text();if(raw.length>2000)return Response.json({error:'输入内容过大'},{status:413});
  const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return Response.json({error:'请完整填写 API Key、Secret Key 和 Passphrase'},{status:400});
  const credentials:OkxCredentials={apiKey:parsed.data.apiKey,secretKey:parsed.data.secretKey,passphrase:parsed.data.passphrase,demo:parsed.data.demo};
  const config=await okxPrivateGet<Array<{label?:string;perm?:string}>>(credentials,'/api/v5/account/config',parsed.data.demo);
  const account=config[0];if(!account)throw new Error('OKX 未返回账户配置');
  const permissions=(account.perm||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(permissions.some(permission=>permission==='trade'||permission==='withdraw'))return Response.json({error:'这个 API Key 含交易或提现权限。请在 OKX 新建仅“读取”权限的密钥后再连接。'},{status:400});
  if(!permissions.includes('read_only'))return Response.json({error:'无法确认该密钥为只读权限，请在 OKX 检查权限设置。'},{status:400});
  const now=Date.now(),encrypted=await encryptCredentials(credentials),hint=`${credentials.apiKey.slice(0,4)}…${credentials.apiKey.slice(-4)}`;
  await database().prepare('INSERT INTO exchange_connections (key,encrypted,key_hint,label,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET encrypted=excluded.encrypted,key_hint=excluded.key_hint,label=excluded.label,updated_at=excluded.updated_at').bind(key(user.userId),encrypted,hint,account.label||'OKX 只读账户',now,now).run();
  return Response.json({connected:true,keyHint:hint,label:account.label||'OKX 只读账户',updatedAt:now});
}catch(error){console.error('okx connect',error);const message=error instanceof Error?error.message:'连接失败';return Response.json({error:message.includes('Invalid')||message.includes('API')?'OKX 验证失败，请检查密钥、口令和账户类型。':message},{status:400});}}

export async function DELETE(request:Request){try{
  if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'无效请求来源'},{status:403});
  const user=await getChatGPTUser();if(!user)return Response.json({error:'请登录'},{status:401});
  await database().prepare('DELETE FROM exchange_connections WHERE key = ?').bind(key(user.userId)).run();
  return Response.json({connected:false});
}catch(error){console.error('okx disconnect',error);return Response.json({error:'断开连接失败'},{status:503});}}
