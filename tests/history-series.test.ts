import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeHistory,prependedBars} from '../lib/history-series.ts';
const bar=(time:number,close=10)=>({time,open:10,high:12,low:8,close,volume:20});
test('completed native history wins over incomplete local aggregation without future leakage',()=>{
 assert.deepEqual(mergeHistory([bar(0,11),bar(300,12)],[bar(0,9),bar(300,9)],5,360),[bar(0,11),bar(300,9)]);
});
test('native future candles are excluded and history sorted and deduplicated',()=>{
 assert.deepEqual(mergeHistory([bar(300),bar(0),bar(0),bar(600)],[],5,600),[bar(0),bar(300)]);
});
test('prepend shift preserves displayed timestamps; rewinds do not shift viewport',()=>{
 assert.equal(prependedBars([bar(300),bar(600)],[bar(0),bar(300),bar(600)]),1);
 assert.equal(prependedBars([bar(0),bar(300)],[bar(0)]),0);
});
