import {normalizeMeasurement,createDemoMeasurements,analyzeMeasurements,dayKey,shiftDay} from '../src/engine.js';
import {recommendInterventions,startIntervention,interventionOutcome,safeOutcomeSummary,INTERVENTIONS} from '../src/interventions.js';

function objectOnly(value,keys,label){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw new Error(`Invalid ${label}; private notes and extra fields are not accepted.`);}
function dateOnly(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||dayKey(value)!==value)throw new Error('Invalid summary date.');return value;}
export function validateContextFields(input){
  const result={};
  if(Object.hasOwn(input,'measurements')){
    if(input.scenario!=null)throw new Error('Choose personal measurements or a demo scenario, not both.');
    if(!Array.isArray(input.measurements)||input.measurements.length>1000)throw new Error('At most 1,000 measurement records may be used in a local AI request.');
    result.measurements=input.measurements.map(row=>{const clean=normalizeMeasurement(row);delete clean.id;return clean;});
  }
  if(input.monitoringOptions!==undefined){
    objectOnly(input.monitoringOptions,['baselineDays','baselineEnd','asOf','demoOffset','demoAnchor'],'monitoring options');
    const o=input.monitoringOptions;if(o.baselineDays!=null&&![7,14,28].includes(o.baselineDays))throw new Error('Unknown baseline window.');
    if(o.demoOffset!=null&&(!Number.isInteger(o.demoOffset)||o.demoOffset<0||o.demoOffset>14))throw new Error('Unknown demo day.');
    result.monitoringOptions={baselineDays:o.baselineDays||14,baselineEnd:o.baselineEnd?dateOnly(o.baselineEnd):'',...(o.asOf?{asOf:dateOnly(o.asOf)}:{}),...(o.demoAnchor?{demoAnchor:dateOnly(o.demoAnchor)}:{}),demoOffset:o.demoOffset||0};
    if(input.scenario==null&&!Object.hasOwn(input,'measurements'))throw new Error('Health context was not enabled.');
  }
  if(input.checkinSummary!==undefined){
    const c=input.checkinSummary;objectOnly(c,['mood','stress','workload'],'check-in summary');
    if(c.mood!=null&&(!Number.isInteger(c.mood)||c.mood<1||c.mood>5))throw new Error('Unknown check-in mood.');
    if(c.stress!=null&&!['Low','Moderate','High'].includes(c.stress))throw new Error('Unknown stress response.');
    if(c.workload!=null&&!['Balanced','Moderate','High'].includes(c.workload))throw new Error('Unknown workload response.');
    if(input.scenario==null&&!Object.hasOwn(input,'measurements'))throw new Error('Health context was not enabled.');
    result.checkinSummary={...c};
  }
  if(input.journalSummary!==undefined){
    objectOnly(input.journalSummary,['previous','recent'],'derived journal summary');
    const period=p=>{
      objectOnly(p,['start','end','entries','days','meanWords','meanLexicalDiversity','meanSentenceWords'],'journal period');
      dateOnly(p.start);dateOnly(p.end);if(shiftDay(p.start,6)!==p.end)throw new Error('Journal periods must each cover seven days.');
      if(!Number.isInteger(p.entries)||p.entries<2||p.entries>2000||!Number.isInteger(p.days)||p.days<2||p.days>7||p.days>p.entries)throw new Error('Insufficient journal comparison coverage.');
      for(const k of ['meanWords','meanSentenceWords'])if(!Number.isFinite(p[k])||p[k]<0||p[k]>12000)throw new Error('Invalid writing feature.');
      if(!Number.isFinite(p.meanLexicalDiversity)||p.meanLexicalDiversity<0||p.meanLexicalDiversity>1)throw new Error('Invalid lexical diversity.');
      return {...p};
    };
    const previous=period(input.journalSummary.previous),recent=period(input.journalSummary.recent);
    if(shiftDay(previous.end,1)!==recent.start)throw new Error('Journal comparison periods must be adjacent.');
    result.journalSummary={previous,recent};
  }
  if(input.interventionContext!==undefined){
    const p=input.interventionContext;objectOnly(p,['resourceId','startedAt','baselineReadings','feedback'],'intervention context');
    if(!Object.hasOwn(INTERVENTIONS,p.resourceId)||!dayKey(p.startedAt))throw new Error('Unknown intervention context.');
    result.interventionContext={resourceId:p.resourceId,startedAt:new Date(p.startedAt).toISOString()};
    if(p.baselineReadings!==undefined){
      if(!Array.isArray(p.baselineReadings)||p.baselineReadings.length>1000)throw new Error('Invalid frozen baseline readings.');
      const start=shiftDay(p.startedAt,-2)+'T00:00:00.000Z',end=new Date(p.startedAt).toISOString();
      result.interventionContext.baselineReadings=p.baselineReadings.map(row=>{const r=normalizeMeasurement(row);if(r.at<start||r.at>end)throw new Error('Frozen readings must be in the three-day pre-activity window.');delete r.id;return r;});
    }
    if(p.feedback){
      objectOnly(p.feedback,['adherence','helpfulness','symptoms','otherFactors'],'intervention feedback');
      if(!['not-yet','once','some-days','daily'].includes(p.feedback.adherence)||!['helped','unchanged','not-helpful','unsure'].includes(p.feedback.helpfulness)||!['none','new-or-persistent'].includes(p.feedback.symptoms)||!Array.isArray(p.feedback.otherFactors)||p.feedback.otherFactors.some(v=>!['Workload changed','Rest opportunity changed','Recent exercise','Cabin environment','Possible illness','Social connection'].includes(v)))throw new Error('Invalid intervention feedback.');
      result.interventionContext.feedback={...p.feedback};
    }
    if(input.scenario==null&&!Object.hasOwn(input,'measurements'))throw new Error('Enable measurement context before discussing measured outcomes.');
  }
  return result;
}
export function prepareContext(input){
  const options=input.monitoringOptions||{};
  const readings=input.measurements??(input.scenario?createDemoMeasurements(input.scenario,options.demoOffset||0,options.demoAnchor||'2026-11-14'):null);
  const monitoring=readings?analyzeMeasurements(readings,{...options,context:input.context}):null;
  const recommendations=recommendInterventions({analysis:monitoring,checkin:input.checkinSummary,context:input.context,message:input.messages.at(-1).content});
  let outcome=null;
  if(input.interventionContext&&readings){
    const p=input.interventionContext;
    if(dayKey(p.startedAt)>monitoring.asOf)throw new Error('An activity cannot start after the monitoring date.');
    const plan=startIntervention(p.resourceId,{id:'selected',startedAt:p.startedAt,readings:p.baselineReadings??readings});
    if(p.feedback)plan.followups=[{...p.feedback}];
    outcome=safeOutcomeSummary(interventionOutcome(plan,readings,{asOf:monitoring.asOf}));
  }
  return {monitoring,readings,recommendations,outcome,journalSummary:input.journalSummary||null};
}
export function compactContext(prepared,input){
  const a=prepared.monitoring;
  const writing=prepared.journalSummary;
  const directions=writing?Object.fromEntries(['meanWords','meanLexicalDiversity','meanSentenceWords'].map(key=>[key,writing.recent[key]>writing.previous[key]?'increased':writing.recent[key]<writing.previous[key]?'decreased':'unchanged'])):null;
  return {provenance:a?(input.measurements?'App-calculated personal measurements, entered/imported by the astronaut; data quality is self-reported.':'App-calculated, simulated mission data. Not validated clinical findings.'):'No health summary supplied. Do not quote health readings.',monitoring:a?{asOf:a.asOf,referencePeriod:{start:a.referenceStart,end:a.referenceEnd,method:'Median of daily medians; at least five comparable days per measurement'},level:a.level,observation:a.evidence,uncertainty:a.uncertainty,suggestedAction:a.action,evidence:a.findings.map(f=>({metric:f.label,unit:f.unit,baseline:f.baseline.value,baselineSampleDays:f.baseline.sampleDays,latest:f.observed.value,latestAt:f.observed.at,delta:f.observed.delta,consecutiveDays:f.durationDays,usableDays:f.quality.usableDays,expectedDays:7,excludedSamples:f.quality.excludedSamples,comparable:f.quality.latestComparable}))}:null,checkin:input.checkinSummary||null,astronautClarification:input.context||null,permittedResources:prepared.recommendations.map(({id,title,description,reason})=>({id,title,description,reason})),selectedOutcome:prepared.outcome,selectedJournalPatterns:writing,calculatedWritingDirections:directions};
}
