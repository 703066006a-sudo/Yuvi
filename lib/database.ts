import {env} from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('保存服务暂时不可用，请稍后重试');return env.DB;}
