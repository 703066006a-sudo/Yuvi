import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fibLevels,fibPrice} from '../lib/fibonacci.ts';
test('旧记录默认24个水平，只显示原来的7级',()=>{assert.equal(fibLevels().length,24);assert.equal(fibLevels().filter(l=>l.enabled).length,7);assert.deepEqual(fibLevels().filter(l=>l.enabled).map(l=>l.value),[0,.236,.382,.5,.618,.786,1]);});
test('内部、外部和负扩展比例，双向锚点公式一致',()=>{assert.equal(fibPrice(100,200,0),100);assert.equal(fibPrice(100,200,1),200);assert.equal(fibPrice(100,200,.5),150);assert.equal(fibPrice(100,200,1.618),261.8);assert.equal(fibPrice(100,200,-.5),50);assert.equal(fibPrice(200,100,-.5),250);});
test('自定义比例与显隐可保存恢复，不改变锚点',()=>{const levels=fibLevels();levels[7]={value:-.75,enabled:true,color:'#000000'};levels[1].enabled=false;assert.deepEqual(fibLevels(JSON.parse(JSON.stringify(levels))),levels);});
