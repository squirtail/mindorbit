import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze,SCENARIOS,companionReply,sharingPacket,needsUrgentSupport} from '../src/engine.js';

test('persistent multi-signal changes prompt a private check-in',()=>{
  const result=analyze(SCENARIOS.recovery);
  assert.equal(result.level,2);
  assert.equal(result.changes.filter(c=>c.sustained).length,3);
  assert.match(result.uncertainty,/cannot establish/);
});
test('exercise context avoids classifying an isolated heart-rate rise as a sustained pattern',()=>{
  const result=analyze(SCENARIOS.exercise);
  assert.equal(result.level,1);
  assert.equal(result.exercise,true);
  assert.match(result.uncertainty,/check for symptoms/);
});
test('context cannot override sustained monitoring findings',()=>{
  assert.equal(analyze(SCENARIOS.recovery,'Recent exercise').level,2);
});
test('stable signals stay at routine monitoring',()=>assert.equal(analyze(SCENARIOS.routine).level,1));
test('support packet excludes journal, conversation, and unselected measurements',()=>{
  const p=sharingPacket({data:SCENARIOS.recovery,selected:['sleep'],journal:[{text:'Secret reflection',date:'2026-01-01'}],note:'Private note'});
  assert.ok(p.sleep);
  assert.equal(p.journal,undefined);assert.equal(p.heart,undefined);assert.equal(p.note,undefined);assert.equal(p.context,undefined);
  assert.doesNotMatch(JSON.stringify(p),/Secret reflection/);
  assert.match(p.transmission,/NOT SENT/);
});
test('journal is included only after explicit selection',()=>{
  const p=sharingPacket({data:SCENARIOS.recovery,selected:['journal'],journal:[{text:'Chosen reflection',date:'2026-01-01',id:'private-id',mood:3}]});
  assert.deepEqual(p.journal,[{text:'Chosen reflection',date:'2026-01-01'}]);
});
test('packet retains the exact timestamp shown during consent preview',()=>{
  const opts={data:SCENARIOS.recovery,selected:['sleep'],createdAt:'2026-11-14T01:00:00.000Z'};
  assert.deepEqual(sharingPacket(opts),sharingPacket(opts));
  assert.equal(sharingPacket(opts).createdAt,opts.createdAt);
});
test('urgent physical or safety concerns take priority over ordinary chat topics',()=>{
  for(const text of ['I cannot breathe after exercise','I want to hurt myself because I am exhausted','I have chest pain and I feel stressed']) {
    const r=companionReply(text,SCENARIOS.routine);
    assert.equal(r.urgent,true,text);assert.match(r.text,/cannot contact|contact anyone/i);
  }
});
test('sarcasm and workout context do not invent a psychiatric diagnosis',()=>{
  const r=companionReply('That sarcastic complaint was after my workout.',SCENARIOS.exercise);
  assert.equal(r.urgent,undefined);assert.equal(r.context,'Recent exercise');assert.match(r.text,/not evidence of a disorder/);
});
test('an explicit denial alone does not trigger the high-urgency classifier',()=>{
  assert.equal(needsUrgentSupport('I am not suicidal'),false);
});
test('separate physical emergency is retained alongside a denied psychological concern',()=>{
  assert.equal(needsUrgentSupport('I am not suicidal but I cannot breathe'),true);
});
