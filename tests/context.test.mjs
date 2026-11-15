import test from 'node:test';
import assert from 'node:assert/strict';
import {validateInput,buildMessages,createCompanion,validateExplanation} from '../server/companion.mjs';
import {prepareContext,compactContext} from '../server/context.mjs';
import {createDemoMeasurements,analyzeMeasurements} from '../src/engine.js';
import {startIntervention} from '../src/interventions.js';
const base={messages:[{role:'user',content:'Help me review my progress.'}],scenario:'recovery',context:'',monitoringOptions:{asOf:'2026-11-17',demoOffset:3}};
const frozen=startIntervention('workload',{id:'test',startedAt:'2026-11-14T12:00:00.000Z',readings:createDemoMeasurements()});
const selected={...base,interventionContext:{resourceId:'workload',startedAt:frozen.startedAt,baselineReadings:frozen.baselineRecords,feedback:{adherence:'some-days',helpfulness:'helped',symptoms:'none',otherFactors:['Workload changed']}}};
const success=(text,suggestion='none')=>new Response(JSON.stringify({done:true,done_reason:'stop',message:{content:JSON.stringify({text,suggestion})}}));
test('server recalculates selected outcomes from dated records, retaining frozen before-readings',()=>{
  const clean=validateInput(selected),prepared=prepareContext(clean),o=prepared.outcome;
  assert.equal(o.changes[0].before.mean,5.6);assert.equal(o.changes[0].after.mean,6.4);assert.equal(o.causalityEstablished,false);
  assert.equal(o.feedback.adherence,'some-days');
  const personal=createDemoMeasurements('recovery',3).map(r=>({...r,source:'manual'}));
  personal.push({...personal.find(r=>r.at==='2026-11-14T08:00:00.000Z'),metrics:{sleep:12},at:'2026-11-14T09:00:00.000Z'});
  const updated=prepareContext(validateInput({...selected,scenario:null,measurements:personal}));
  assert.equal(updated.outcome.changes[0].before.mean,5.6);
  assert.doesNotMatch(JSON.stringify(compactContext(prepared,clean)),/baselineRecords|demo-recovery-base/);
});
test('raw notes and computed outcomes cannot be smuggled into any new AI context field',()=>{
  const bad=[{interventionContext:{...selected.interventionContext,note:'secret'}},{interventionContext:{...selected.interventionContext,changes:[]}},{interventionContext:{...selected.interventionContext,feedback:{...selected.interventionContext.feedback,note:'secret'}}},{interventionContext:{...selected.interventionContext,baselineReadings:[{at:'2026-11-14',metrics:{sleep:7},text:'secret'}]}},{checkinSummary:{mood:3,note:'secret'}},{journalSummary:{previous:{text:'secret'},recent:{}}},{measurements:[{at:'2026-11-01',metrics:{sleep:7},notes:'secret'}],scenario:null}];
  for(const extra of bad)assert.throws(()=>validateInput({...base,...extra}));
});
test('derived journal summary is permitted independently of health context and contains only descriptive aggregates',()=>{
  const period=(start,end)=>({start,end,entries:3,days:3,meanWords:25,meanLexicalDiversity:.8,meanSentenceWords:8});
  const payload=validateInput({messages:base.messages,scenario:null,journalSummary:{previous:period('2026-11-01','2026-11-07'),recent:period('2026-11-08','2026-11-14')}});
  const prompt=JSON.stringify(buildMessages(payload));assert.match(prompt,/meanLexicalDiversity/);assert.match(prompt,/No health summary supplied/);
  for(const extra of [{entryIds:['a']},{raw:'secret'},{meanWords:'25'}])assert.throws(()=>validateInput({...payload,journalSummary:{...payload.journalSummary,recent:{...payload.journalSummary.recent,...extra}}}));
});
test('a known resource ID is rejected when independent rules do not permit it',async()=>{
  let enumValues;
  const c=createCompanion({fetchImpl:async(url,options)=>{enumValues=JSON.parse(options.body).format.properties.suggestion.enum;return success('Try a sleep exercise.','sleep');}});
  const r=await c.reply({messages:[{role:'user',content:'Hello there.'}],scenario:null});
  assert.ok(!enumValues.includes('sleep'));assert.equal(r.source,'guided');assert.equal(r.reason,'invalid');
});
test('causal intervention wording is rejected even when accompanied by a caveat',async()=>{
  const claim='The workload activity had a noticeable impact on your metrics. Causality has not been established.';
  assert.throws(()=>validateExplanation(claim,{outcome:{}}));
  assert.doesNotThrow(()=>validateExplanation('Sleep increased after the activity. This does not establish that the activity caused it.',{outcome:{}}));
  const r=await createCompanion({fetchImpl:async()=>success(claim)}).reply(selected);
  assert.equal(r.source,'guided');assert.match(r.text,/5\.6 to 6\.4/);assert.match(r.text,/do not establish/);
});
test('missing recent data cannot produce a routine or normal monitoring conclusion',()=>{
  const a=analyzeMeasurements(createDemoMeasurements().slice(0,14),{asOf:'2026-11-14'});
  assert.equal(a.level,0);assert.equal(a.label,'Recent measurements needed');assert.match(a.evidence,/no usable recent/);
});
test('writing explanation rejects a reversed direction while retaining accurate comparisons',()=>{
  const prepared={journalSummary:{previous:{meanWords:26.3,meanLexicalDiversity:.915,meanSentenceWords:13.1},recent:{meanWords:9.3,meanLexicalDiversity:.972,meanSentenceWords:4.6}}};
  assert.throws(()=>validateExplanation('A lower mean lexical diversity of 0.972 compared with 0.915.',prepared));
  assert.throws(()=>validateExplanation('This suggests a potentially more detailed or thoughtful approach.',prepared));
  assert.throws(()=>validateExplanation('Over the past four days, word count decreased.',prepared));
  assert.doesNotThrow(()=>validateExplanation('Word count decreased and lexical diversity increased. Shorter entries can affect unique-word proportions.',prepared));
});
