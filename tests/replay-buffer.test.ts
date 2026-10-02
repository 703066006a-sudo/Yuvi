import assert from 'node:assert/strict';
import {test} from 'node:test';
import {prefetchLeadSeconds,contiguousDays} from '../lib/replay-buffer.ts';
test('分钟和小时线至少提前七天，日线提前三十天',()=>{assert.equal(prefetchLeadSeconds(1),7*86400);assert.equal(prefetchLeadSeconds(60),7*86400);assert.equal(prefetchLeadSeconds(1440),30*86400);});
test('并发返回的后续日期必须按顺序接入',()=>{assert.deepEqual(contiguousDays(['a','b','c'],new Map([['c',3],['a',1],['b',2]])),['a','b','c']);});
test('下载失败不跳过缺失日，重试成功后才接入',()=>{const results=new Map([['a',1],['c',3]]);assert.deepEqual(contiguousDays(['a','b','c'],results),['a']);results.set('b',2);assert.deepEqual(contiguousDays(['a','b','c'],results),['a','b','c']);assert.deepEqual(contiguousDays(['a'],new Map()),[]);});
