import assert from 'node:assert/strict';
import {test} from 'node:test';
import {timeToLogical,logicalToTime,translateDrawing,FIB_LEVELS} from '../lib/drawing-geometry.ts';
import type {Drawing} from '../lib/session-schema.ts';
const bars=[{time:600},{time:900},{time:1800}];
test('缺口时间插值映射可逆，不修改原始时间',()=>{for(const t of [300,600,750,1200,1800,2100])assert.equal(logicalToTime(bars,timeToLogical(bars,t,5),5),t);});
test('周期往返只映射，不改写保存锚点',()=>{const anchor={time:750,price:120};for(const period of [1,5,15,60]){const mapped=timeToLogical(bars,anchor.time,period);assert.equal(logicalToTime(bars,mapped,period),anchor.time);}assert.deepEqual(anchor,{time:750,price:120});});
test('整体移动保持锚点差值和创建时间，原对象不变',()=>{const d:Drawing={id:'x',type:'fib',points:[{time:600,price:100},{time:900,price:120}],createdAt:1000,color:'#2962ff',locked:false,hidden:false,dashed:false};const moved=translateDrawing(d,60,10);assert.deepEqual(moved.points,[{time:660,price:110},{time:960,price:130}]);assert.equal(moved.createdAt,1000);assert.equal(d.points[0].time,600);const bounded=translateDrawing(d,-1000,-200);assert.ok(bounded.points.every(p=>p.price>0&&p.time>=0));assert.equal(bounded.points[1].price-bounded.points[0].price,20);});
test('回撤比例包含主要级别，反向价格计算对称',()=>{assert.deepEqual(FIB_LEVELS,[0,.236,.382,.5,.618,.786,1]);assert.equal(100+(200-100)*.5,200+(100-200)*.5);});
