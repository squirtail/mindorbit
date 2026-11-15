import {METRICS,dayKey,shiftDay,normalizeMeasurements,metricDaily,average,rounded} from './engine.js';

export const INTERVENTIONS={
  sleep:{title:'Make room for rest',description:'Try a wind-down reflection and review your next rest opportunity.',metrics:['sleep'],followupDays:2},
  workload:{title:'Review the load',description:'Prepare a workload or rest-opportunity discussion with the appropriate crew member. Mission changes require their approval.',metrics:['sleep','heart','hrv','cognitive'],followupDays:3},
  breathe:{title:'A comfortable breathing pause',description:'Take a short pause at a pace that feels comfortable; stop if uncomfortable.',metrics:[],followupDays:1},
  ground:{title:'Come back to the present',description:'Use a short sensory grounding reflection.',metrics:[],followupDays:1},
  connect:{title:'Make space for connection',description:'Plan voluntary contact with a crewmate or someone at home.',metrics:[],followupDays:2},
  reflect:{title:'A private moment to reflect',description:'Record what helped, what was difficult, and one manageable next step.',metrics:[],followupDays:2},
  support:{title:'Prepare confidential support',description:'Choose and preview a local demonstration support packet. No medical appointment or alert is sent.',metrics:[],followupDays:1}
};
export function recommendInterventions({analysis,checkin={},context='',message=''}={}){
  const reasons=new Map([['reflect','A private reflection is always available.'],['ground','A brief present-moment exercise is available if you want one.'],['support','Human support can be requested at any monitoring stage.']]);
  const text=(context+' '+message).toLowerCase();
  if(analysis?.concerns.includes('sleep')||analysis?.concerns.includes('recovery')||/\b(sleep|rest|tired|fatigue)\b/.test(text))reasons.set('sleep','Sleep changes or your stated need for rest make this relevant.');
  if(checkin.workload==='High'||analysis?.concerns.includes('recovery')||analysis?.concerns.includes('cognitive')||/\b(workload|schedule|overwhelm)\b/.test(text))reasons.set('workload','Workload or recovery context makes a review worth considering.');
  if(checkin.stress==='High'||/\b(stress|anxious|overwhelm|breath|calm)\b/.test(text))reasons.set('breathe','You reported stress or asked for a quiet pause.');
  if(/\b(lonely|alone|home|family|isolat\w*|miss|connection|crew)\b/.test(text))reasons.set('connect','Your stated context makes voluntary human connection relevant.');
  if(analysis?.concerns.includes('blood-pressure'))reasons.set('support','Verify the blood-pressure measurement, check symptoms, and consider a confidential medical assessment.');
  return [...reasons].map(([id,reason])=>({id,...INTERVENTIONS[id],reason}));
}
function metricWindow(rows,key,start,end){const daily=metricDaily(rows.filter(r=>r.at>=start&&r.at<=end),key);return {mean:rounded(average([...daily.values()])),days:daily.size};}
export function startIntervention(resourceId,{id,startedAt=new Date().toISOString(),datasetId='personal',readings=[]}={}){
  const item=INTERVENTIONS[resourceId];if(!item)throw new Error('Unknown support option.');
  const rows=normalizeMeasurements(readings),startDay=dayKey(startedAt),beforeStart=shiftDay(startDay,-2)+'T00:00:00.000Z';
  const baseline=Object.fromEntries(item.metrics.map(key=>[key,metricWindow(rows,key,beforeStart,startedAt)]));
  const baselineRecords=rows.filter(r=>r.at>=beforeStart&&r.at<=startedAt);
  return {id:id||globalThis.crypto.randomUUID(),resourceId,datasetId,startedAt,followupAt:shiftDay(startDay,item.followupDays),status:'active',baseline,baselineRecords,followups:[],activities:[]};
}
export function interventionOutcome(plan,readings,{asOf=new Date()}={}){
  const item=INTERVENTIONS[plan.resourceId];if(!item)throw new Error('Unknown support option.');
  const end=dayKey(asOf),afterStart=shiftDay(plan.startedAt,1)+'T00:00:00.000Z',afterEnd=end+'T23:59:59.999Z';
  const rows=normalizeMeasurements(readings),changes=item.metrics.map(key=>{
    const before=plan.baseline?.[key]||{mean:null,days:0},after=metricWindow(rows,key,afterStart,afterEnd),enough=before.days>=2&&after.days>=2;
    return {key,label:METRICS[key].label,unit:METRICS[key].unit,before,after,delta:enough?rounded(after.mean-before.mean):null,enough};
  });
  const last=plan.followups?.at(-1)||null;
  return {resourceId:plan.resourceId,startedAt:plan.startedAt,asOf:end,changes,followupDue:plan.status==='active'&&end>=(plan.nextFollowupAt||plan.followupAt),lastFeedback:last?{adherence:last.adherence,helpfulness:last.helpfulness,symptoms:last.symptoms,otherFactors:last.otherFactors}:null,interpretation:changes.some(c=>c.enough)?'Changes followed this support activity; they do not establish that the activity caused them.':changes.length?'More checked measurements on separate days are needed before comparing outcomes.':'Use your own feedback to review this activity. No physiological improvement is inferred.',causalityEstablished:false};
}
export function addInterventionFeedback(plan,feedback,{at=new Date().toISOString()}={}){
  if(!['not-yet','once','some-days','daily'].includes(feedback.adherence)||!['helped','unchanged','not-helpful','unsure'].includes(feedback.helpfulness)||!['none','new-or-persistent'].includes(feedback.symptoms))throw new Error('Choose adherence, helpfulness, and symptom feedback.');
  const allowed=['Workload changed','Rest opportunity changed','Recent exercise','Cabin environment','Possible illness','Social connection'];
  const otherFactors=Array.isArray(feedback.otherFactors)?feedback.otherFactors:[];
  if(otherFactors.some(f=>!allowed.includes(f)))throw new Error('Unknown contributing factor.');
  return {...plan,followups:[...(plan.followups||[]),{at,adherence:feedback.adherence,helpfulness:feedback.helpfulness,symptoms:feedback.symptoms,otherFactors,note:String(feedback.note||'').slice(0,2000)}],nextFollowupAt:shiftDay(at,2)};
}
export function safeOutcomeSummary(outcome){
  return {resourceId:outcome.resourceId,startedAt:outcome.startedAt,asOf:outcome.asOf,changes:outcome.changes.map(c=>({...c})),feedback:outcome.lastFeedback,causalityEstablished:false,interpretation:outcome.interpretation};
}
