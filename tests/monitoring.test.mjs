import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeMeasurements,createDemoMeasurements,normalizeMeasurement,shiftDay,dailySeries} from '../src/engine.js';

test('personal baselines are calculated from a separate dated reference window',()=>{
  const rows=createDemoMeasurements('recovery'),a=analyzeMeasurements(rows);
  assert.equal(a.baselines.sleep.value,7.2);assert.equal(a.baselines.sleep.sampleDays,14);assert.equal(a.level,2);
  assert.equal(a.findings.find(f=>f.key==='sleep').durationDays,3);assert.equal(a.referenceEnd,'2026-11-07');
  const altered=rows.map(r=>({...r,metrics:{...r.metrics,sleep:8}}));
  assert.equal(analyzeMeasurements(altered).baselines.sleep.value,8);
});
test('a missing calendar day breaks a consecutive trend and remains a chart gap',()=>{
  const rows=createDemoMeasurements('recovery').filter(r=>!r.at.startsWith('2026-11-13'));
  const a=analyzeMeasurements(rows);assert.equal(a.level,1);assert.equal(a.findings.find(f=>f.key==='sleep').durationDays,1);
  assert.equal(dailySeries(rows,'sleep',7).at(-2).value,null);
});
test('questionable readings and exercise samples do not create resting physiological alerts',()=>{
  const exercise=analyzeMeasurements(createDemoMeasurements('exercise'));
  assert.equal(exercise.level,1);assert.equal(exercise.findings.find(f=>f.key==='heart').quality.latestComparable,false);
  const rows=createDemoMeasurements('recovery').map(r=>r.at.startsWith('2026-11-13')?{...r,quality:'questionable'}:r);
  assert.equal(analyzeMeasurements(rows).level,1);
});
test('duplicate readings on one day cannot substitute for five reference days',()=>{
  const row=createDemoMeasurements()[0],rows=Array.from({length:20},(_,i)=>({...row,at:row.at.replace('08:00',`08:${String(i).padStart(2,'0')}`)}));
  const a=analyzeMeasurements(rows,{asOf:'2026-11-01'});
  assert.equal(a.level,0);assert.equal(a.baselines.heart.value,null);
});
test('insufficient data never falls back to a fixed demo baseline',()=>{
  const a=analyzeMeasurements([{at:'2026-11-14T08:00:00Z',metrics:{sleep:5},quality:'verified',condition:'rest',source:'manual'}]);
  assert.equal(a.level,0);assert.equal(a.baselines.sleep.value,null);assert.match(a.evidence,/not yet five/);
});
test('measurement validation rejects hidden notes, invalid values, and reversed blood pressure',()=>{
  const row=createDemoMeasurements()[0];
  assert.throws(()=>normalizeMeasurement({...row,note:'Secret note'}));
  assert.throws(()=>normalizeMeasurement({...row,metrics:{heart:999}}));
  assert.throws(()=>normalizeMeasurement({...row,metrics:{systolic:80,diastolic:90}}));
  assert.equal(normalizeMeasurement({...row,metrics:{sleep:0}}).metrics.sleep,0);
});
test('unusual checked blood pressure leads to a review workflow, not a diagnosis',()=>{
  for(const value of [140,95]){const rows=createDemoMeasurements('routine');rows.at(-1).metrics.systolic=value;
  const a=analyzeMeasurements(rows);assert.equal(a.level,2);assert.ok(a.concerns.includes('blood-pressure'));assert.match(a.uncertainty,/do not establish/);}
});
test('future readings are excluded when an analysis date is supplied',()=>{
  const rows=createDemoMeasurements('recovery',4);const a=analyzeMeasurements(rows,{asOf:'2026-11-14'});
  assert.equal(a.findings.find(f=>f.key==='sleep').observed.value,5.3);
  assert.equal(shiftDay('2026-12-31',1),'2027-01-01');
});
