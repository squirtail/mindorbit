import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoMeasurements,analyzeMeasurements} from '../src/engine.js';
import {recommendInterventions,startIntervention,interventionOutcome,addInterventionFeedback,safeOutcomeSummary} from '../src/interventions.js';

test('recommendations depend on independently calculated concerns and self-reported context',()=>{
  const a=analyzeMeasurements(createDemoMeasurements('recovery'));
  const ids=recommendInterventions({analysis:a}).map(r=>r.id);assert.ok(ids.includes('sleep'));assert.ok(ids.includes('workload'));assert.ok(ids.includes('support'));assert.ok(!ids.includes('connect'));
  assert.ok(recommendInterventions({analysis:a,message:'I miss home'}).some(r=>r.id==='connect'));
});
test('support can be requested without enough data or an abnormal measurement',()=>{
  assert.ok(recommendInterventions({analysis:analyzeMeasurements([])}).some(r=>r.id==='support'));
});
test('outcome baseline is frozen when a plan starts and comparison never claims causality',()=>{
  const rows=createDemoMeasurements('recovery'),plan=startIntervention('workload',{id:'p',datasetId:'demo:recovery',startedAt:'2026-11-14T12:00:00Z',readings:rows});
  assert.equal(plan.baseline.sleep.mean,5.6);
  const outcome=interventionOutcome(plan,createDemoMeasurements('recovery',3),{asOf:'2026-11-17'});
  const sleep=outcome.changes.find(c=>c.key==='sleep');assert.equal(sleep.before.mean,5.6);assert.equal(sleep.after.mean,6.4);assert.equal(sleep.delta,.8);assert.equal(outcome.causalityEstablished,false);
  assert.match(outcome.interpretation,/do not establish/);assert.equal(outcome.followupDue,true);
});
test('one after-day or missing baseline does not establish an outcome trend',()=>{
  const p=startIntervention('sleep',{id:'p',startedAt:'2026-11-14T12:00:00Z',readings:createDemoMeasurements()});
  assert.equal(interventionOutcome(p,createDemoMeasurements('recovery',1),{asOf:'2026-11-15'}).changes[0].enough,false);
  const empty=startIntervention('sleep',{id:'e',readings:[],startedAt:'2026-11-14'});assert.equal(empty.baseline.sleep.mean,null);
});
test('qualitative activities rely on feedback rather than inferred physiological benefits',()=>{
  const p=startIntervention('connect',{id:'p',startedAt:'2026-11-14'});const result=interventionOutcome(p,[],{asOf:'2026-11-16'});assert.deepEqual(result.changes,[]);assert.match(result.interpretation,/No physiological improvement/);
});
test('feedback includes adherence and confounders while its private note is excluded from explanation summaries',()=>{
  const p=startIntervention('sleep',{id:'p',readings:createDemoMeasurements(),startedAt:'2026-11-14T12:00:00Z'});
  const updated=addInterventionFeedback(p,{adherence:'some-days',helpfulness:'helped',symptoms:'none',otherFactors:['Workload changed'],note:'Private detail'},{at:'2026-11-17T12:00:00Z'});
  const summary=safeOutcomeSummary(interventionOutcome(updated,createDemoMeasurements('recovery',3),{asOf:'2026-11-17'}));
  assert.equal(updated.followups[0].note,'Private detail');assert.doesNotMatch(JSON.stringify(summary),/Private detail/);assert.equal(summary.feedback.adherence,'some-days');
  assert.throws(()=>addInterventionFeedback(p,{adherence:'unbounded',helpfulness:'helped',symptoms:'none'}));
});
