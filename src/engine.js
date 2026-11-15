// Demonstration workflow rules, not validated clinical thresholds.
export const BASELINE = { heart: 68, sleep: 7.2, hrv: 48, cognitive: 94, bp: '118/76' };
export const SCENARIOS = {
  recovery: {
    name: 'Recovery pattern', day: 67, workload: 'High', exertion: false,
    heart: [69, 70, 72, 76, 79, 83, 86], sleep: [7.1, 7.0, 6.5, 6.3, 5.9, 5.5, 5.3],
    hrv: [47, 45, 43, 40, 36, 33, 31], cognitive: [94, 94, 93, 91, 88, 87, 85], bp: '122/80',
    summary: 'A little more room to recover.',
    description: 'Your sleep and recovery signals have shifted over the past few days. Let’s make a little space to check in.'
  },
  exercise: {
    name: 'After exercise', day: 67, workload: 'Moderate', exertion: true,
    heart: [68, 69, 68, 70, 68, 69, 86], sleep: [7.3, 7.1, 7.4, 7.2, 7.0, 7.2, 7.3],
    hrv: [49, 48, 47, 49, 48, 47, 43], cognitive: [94, 95, 94, 93, 95, 94, 94], bp: '120/78',
    summary: 'Context makes a difference.',
    description: 'A recent workout may help explain today’s heart-rate change. Your other signals are close to your usual pattern.'
  },
  routine: {
    name: 'Steady orbit', day: 67, workload: 'Balanced', exertion: false,
    heart: [68, 67, 69, 68, 70, 68, 69], sleep: [7.2, 7.4, 7.1, 7.5, 7.2, 7.3, 7.4],
    hrv: [48, 49, 47, 50, 48, 49, 49], cognitive: [94, 94, 95, 94, 93, 95, 94], bp: '118/76',
    summary: 'Finding your steady orbit.',
    description: 'Your signals are close to your personal baseline. Keep making time for the small things that help you feel grounded.'
  }
};
export const latest = values => values.at(-1);
export function analyze(data, context = '') {
  const sustainedSleep = data.sleep.slice(-3).every(n => n < BASELINE.sleep - 1);
  const sustainedHeart = data.heart.slice(-3).every(n => n > BASELINE.heart + 8);
  const sustainedHrv = data.hrv.slice(-3).every(n => n < BASELINE.hrv - 8);
  const exercise = data.exertion || context === 'Recent exercise';
  const changes = [
    { key: 'sleep', label: 'Sleep duration', value: latest(data.sleep), baseline: BASELINE.sleep, unit: 'h', sustained: sustainedSleep },
    { key: 'heart', label: 'Resting heart rate', value: latest(data.heart), baseline: BASELINE.heart, unit: 'bpm', sustained: sustainedHeart },
    { key: 'hrv', label: 'Heart rate variability', value: latest(data.hrv), baseline: BASELINE.hrv, unit: 'ms', sustained: sustainedHrv }
  ];
  const level = sustainedSleep && (sustainedHeart || sustainedHrv) ? 2 : 1;
  return {
    level, label: level === 2 ? 'Private check-in suggested' : 'Routine monitoring', changes, exercise,
    evidence: level === 2
      ? `Sleep has been more than 1 hour below your ${BASELINE.sleep} h baseline for 3 days. Resting heart rate and HRV have also shifted over the same period.`
      : exercise ? 'Heart rate increased today after a recorded workout. Sleep and cognitive performance remain close to baseline; a sustained multi-signal pattern is not present.'
      : 'The last 3 days of sleep, resting heart rate, and HRV are close to your recorded personal baseline.',
    uncertainty: exercise
      ? 'Recent exercise may be relevant, but it does not establish the cause. Verify the reading after recovery and check for symptoms.'
      : 'Recovery, workload, recent exertion, hydration, illness, or stress may contribute. These signals alone cannot establish a cause or diagnosis.',
    action: level === 2 ? 'Review rest opportunities, verify unusual readings, and share any symptoms. Consider a confidential assessment if changes persist.' : 'Continue your usual check-ins. If you feel unwell, seek support even when measurements look typical.'
  };
}
export function needsUrgentSupport(text) {
  const t = text.toLowerCase().replace(/[’]/g, "'");
  // Strip explicit denials, not the whole message: other urgent concerns still matter.
  const withoutDenials=t.replace(/\b(i am not suicidal|i'm not suicidal|i do not want to (?:hurt|harm|kill) myself|i don't want to (?:hurt|harm|kill) myself)\b/g,'');
  return /\b(i (?:am going to|will|plan to|want to) (?:kill|hurt|harm) myself|i (?:am|feel) unsafe|i (?:cannot|can't) stay safe|i have (?:severe )?chest pain|i (?:can't|cannot) breathe|i (?:have )?overdosed|immediate danger|suicidal)\b/.test(withoutDenials);
}
export function companionReply(message, data, context = '') {
  const t = message.toLowerCase();
  if (needsUrgentSupport(message)) return { urgent: true, text: 'What you’ve shared may need immediate human help. Contact the onboard crew medical officer or a nearby crewmate now and follow your mission’s emergency procedure. If possible, stay with someone. This prototype cannot contact responders or monitor your safety. Use the “Immediate support” panel for the demo pathway.' };
  if (/\b(not safe|emergency|chest pain|breathless|faint|hurt myself|harm myself|kill myself)\b/.test(t)) return { urgent: true, text: 'Are you in immediate danger, or experiencing an urgent physical symptom? Contact your onboard medical officer or a nearby crewmate now if so. This prototype cannot assess urgency reliably or contact anyone. Open Immediate support to review the simulated pathway.' };
  if (/\b(exercise|workout|treadmill|sarcas|sarcastic)\b/.test(t)) return { text: 'Thanks for adding that context. Recent exertion may explain a temporary heart-rate change, and a sarcastic journal entry is not evidence of a disorder. I’ll keep that as context, not a diagnosis. Have you had any new symptoms, or does the reading remain unusual after recovery?', context: 'Recent exercise' };
  if (/\b(sleep|tired|fatigue|exhaust|rest)\b/.test(t)) return { text: `Let’s look at your rest. Your latest simulated sleep reading is ${latest(data.sleep)} hours, compared with your ${BASELINE.sleep}-hour baseline. How has rest felt to you lately? If something is making it harder, we can reflect on the schedule, cabin environment, or thoughts on your mind. A short wind-down exercise is here if you want one.`, suggestion: 'sleep' };
  if (/\b(stress|overwhelm|anxious|worr|pressure|workload)\b/.test(t)) return { text: 'Thank you for telling me. You don’t have to put a label on it to make room for support. What feels most demanding right now? We can take a short breathing pause, think through one manageable next step, or prepare a confidential support request.', suggestion: 'breathe' };
  if (/\b(lonely|alone|home|family|isolat|miss)\b/.test(t)) return { text: 'Being far from familiar people can feel heavy. Would it help to write a message for someone at home, plan a voluntary moment with a crewmate, or simply talk about what you miss? A draft can stay in your private journal until you decide what to do with it.', suggestion: 'connect' };
  if (/\b(share|privacy|private|journal|control)\b/.test(t)) return { text: 'AI chat goes through the local MindOrbit server to Gemma on this computer. Your journal and check-in notes are not automatically included. When local saving is available, private entries are encrypted in this browser. A routine support preview includes only the fields you select. The demo never sends a packet to Earth. You can review or erase saved data in Privacy & sharing.' };
  if (/\b(doctor|professional|counsel|support request|assessment|medical)\b/.test(t)) return { text: 'You can ask for professional support at any point. Open “Confidential support” to choose the measurements or notes you want to include, inspect the exact packet, and save a local demo request. Nothing is sent to a clinician from this prototype.', suggestion: 'support' };
  if (/\b(why|signal|trend|data|reading|explain)\b/.test(t)) { const a=analyze(data,context); return { text: `${a.evidence} ${a.uncertainty} ${a.action}` }; }
  if (/\b(good|great|better|calm|happy|well)\b/.test(t)) return { text: 'I’m glad there’s a little ease in your day. What helped you feel that way? You can capture it in a private check-in, so it’s easier to come back to what works for you.' };
  return { text: 'I’m here to help you reflect. What has stood out today, and how has it affected you? You could tell me about your sleep, workload, a moment with the crew, or something you’re looking forward to. This demo uses local guided responses and doesn’t make diagnoses.' };
}
export function sharingPacket({ data, selected, journal = [], note = '', context = '', createdAt = new Date().toISOString() }) {
  const packet = { type: 'MindOrbit simulated confidential support request', recipient: 'Designated crew medical professional (demo)', createdAt, transmission: 'NOT SENT — local demonstration only', requestedLevel: 3 };
  if(selected.includes('sleep')) packet.sleep = { days: [61,62,63,64,65,66,67], hours: data.sleep, baselineHours: BASELINE.sleep };
  if(selected.includes('heart')) packet.heart = { restingBpm: data.heart, baselineBpm: BASELINE.heart, hrvMs: data.hrv, baselineHrvMs: BASELINE.hrv };
  if(selected.includes('workload')) packet.context = { reportedWorkload: data.workload, astronautClarification: context || 'None supplied' };
  if(selected.includes('journal')) packet.journal = journal.map(({text,date})=>({text,date}));
  if(selected.includes('note') && note.trim()) packet.note = note.trim();
  return packet;
}

// Longitudinal monitoring. Values below are demonstration workflow rules, not clinical cut-offs.
export const METRICS = {
  sleep:{label:'Sleep duration',unit:'h',min:0,max:24,delta:1,direction:-1},
  heart:{label:'Resting heart rate',unit:'bpm',min:20,max:250,delta:8,direction:1},
  hrv:{label:'Heart rate variability',unit:'ms',min:1,max:300,delta:8,direction:-1},
  cognitive:{label:'Cognitive task performance',unit:'%',min:0,max:100,delta:5,direction:-1},
  systolic:{label:'Systolic blood pressure',unit:'mmHg',min:50,max:260,delta:15,direction:1},
  diastolic:{label:'Diastolic blood pressure',unit:'mmHg',min:30,max:180,delta:10,direction:1}
};
export const CONDITIONS=['rest','post-exercise','schedule-change','unwell','unknown'];
export const dayKey=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):null;};
export function shiftDay(value,days){const d=new Date(dayKey(value)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
export function median(values){if(!values.length)return null;const v=[...values].sort((a,b)=>a-b),n=v.length;return n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2;}
export const rounded=(value,digits=1)=>Number.isFinite(value)?Number(value.toFixed(digits)):null;
export function normalizeMeasurement(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['id','at','metrics','quality','condition','source','workload'].includes(k)))throw new Error('A measurement may contain only dated readings and their quality/context.');
  const at=new Date(raw.at);if(!Number.isFinite(at.getTime()))throw new Error('Choose a valid measurement date and time.');
  if(!raw.metrics||typeof raw.metrics!=='object'||Array.isArray(raw.metrics)||Object.keys(raw.metrics).some(k=>!Object.hasOwn(METRICS,k)))throw new Error('Unknown measurement field.');
  const metrics={};
  for(const [key,value] of Object.entries(raw.metrics)){
    if(value===null||value==='')continue;
    const rule=METRICS[key];if(typeof value!=='number'||!Number.isFinite(value)||value<rule.min||value>rule.max)throw new Error(`${rule.label} is outside the supported input range.`);
    metrics[key]=value;
  }
  if(!Object.keys(metrics).length)throw new Error('Enter at least one measurement.');
  if(metrics.systolic!=null&&metrics.diastolic!=null&&metrics.systolic<=metrics.diastolic)throw new Error('Systolic pressure must be higher than diastolic pressure.');
  const quality=raw.quality||'verified',condition=raw.condition||'unknown',source=raw.source||'manual';
  if(!['verified','questionable'].includes(quality)||!CONDITIONS.includes(condition)||!['simulated','manual','imported'].includes(source))throw new Error('Unknown measurement quality, context, or source.');
  if(raw.workload&&!['Balanced','Moderate','High'].includes(raw.workload))throw new Error('Unknown workload.');
  return {at:at.toISOString(),metrics,quality,condition,source,...(raw.id?{id:String(raw.id).slice(0,100)}:{}),...(raw.workload?{workload:raw.workload}:{})};
}
export function usableForMetric(row,key,baseline=false){
  if(row.quality!=='verified'||!Number.isFinite(row.metrics[key]))return false;
  if(baseline&&['unwell','schedule-change','post-exercise'].includes(row.condition))return false;
  return !(['heart','hrv'].includes(key)&&row.condition==='post-exercise');
}
export function normalizeMeasurements(rows){
  if(!Array.isArray(rows))return [];
  return rows.flatMap(row=>{try{return [normalizeMeasurement(row)];}catch{return [];}}).sort((a,b)=>a.at.localeCompare(b.at));
}
export function metricDaily(rows,key,{baseline=false}={}){
  const groups=new Map();
  for(const row of rows){if(!usableForMetric(row,key,baseline))continue;const day=dayKey(row.at);if(!groups.has(day))groups.set(day,[]);groups.get(day).push(row.metrics[key]);}
  return new Map([...groups].map(([day,values])=>[day,median(values)]));
}
export function dailySeries(rows,key,count=7,asOf){
  const clean=normalizeMeasurements(rows),end=dayKey(asOf||clean.at(-1)?.at||new Date()),daily=metricDaily(clean,key);
  return Array.from({length:count},(_,i)=>{const date=shiftDay(end,i-count+1);return {date,value:daily.get(date)??null};});
}
export function createDemoMeasurements(scenario='recovery',offset=0,anchor='2026-11-14'){
  const d=SCENARIOS[scenario]||SCENARIOS.recovery,rows=[];
  const variations=[-.2,.1,0,.2,-.1,0,.1,-.1,.2,0,-.2,.1,0,0];
  for(let i=0;i<14;i++)rows.push({id:`demo-${scenario}-base-${i}`,at:shiftDay(anchor,i-20)+'T08:00:00.000Z',metrics:{sleep:rounded(7.2+variations[i]),heart:68+Math.round(variations[i]*5),hrv:48+Math.round(variations[i]*5),cognitive:94+Math.round(variations[i]*3),systolic:118+Math.round(variations[i]*5),diastolic:76+Math.round(variations[i]*3)},quality:'verified',condition:'rest',source:'simulated',workload:'Balanced'});
  for(let i=0;i<7;i++){const bp=d.bp.split('/').map(Number);rows.push({id:`demo-${scenario}-${61+i}`,at:shiftDay(anchor,i-6)+'T08:00:00.000Z',metrics:{sleep:d.sleep[i],heart:d.heart[i],hrv:d.hrv[i],cognitive:d.cognitive[i],systolic:bp[0],diastolic:bp[1]},quality:'verified',condition:scenario==='exercise'&&i===6?'post-exercise':'rest',source:'simulated',workload:d.workload});}
  const recovery={sleep:[5.8,6.4,6.9,7.1,7.0,7.3,7.2],heart:[82,79,75,72,70,69,68],hrv:[34,37,41,45,47,48,49],cognitive:[86,88,90,92,93,94,94]};
  for(let i=0;i<Math.max(0,Math.min(14,offset));i++){const n=Math.min(i,6);rows.push({id:`demo-${scenario}-${68+i}`,at:shiftDay(anchor,i+1)+'T08:00:00.000Z',metrics:{sleep:scenario==='recovery'?recovery.sleep[n]:7.2,heart:scenario==='recovery'?recovery.heart[n]:68,hrv:scenario==='recovery'?recovery.hrv[n]:48,cognitive:scenario==='recovery'?recovery.cognitive[n]:94,systolic:118,diastolic:76},quality:'verified',condition:'rest',source:'simulated',workload:i<2?'Moderate':'Balanced'});}
  return rows;
}
export function analyzeMeasurements(input,{baselineDays=14,baselineEnd='',asOf,context=''}={}){
  const all=normalizeMeasurements(input),end=dayKey(asOf||all.at(-1)?.at||new Date());
  const rows=all.filter(r=>dayKey(r.at)<=end),recentStart=shiftDay(end,-6),cutoff=shiftDay(end,-7);
  const referenceEnd=baselineEnd&&dayKey(baselineEnd)?(dayKey(baselineEnd)<cutoff?dayKey(baselineEnd):cutoff):cutoff;
  const referenceStart=shiftDay(referenceEnd,-([7,14,28].includes(baselineDays)?baselineDays:14)+1);
  const reference=rows.filter(r=>dayKey(r.at)>=referenceStart&&dayKey(r.at)<=referenceEnd);
  const recent=rows.filter(r=>dayKey(r.at)>=recentStart),baselines={},findings=[];
  for(const [key,rule] of Object.entries(METRICS)){
    const base=metricDaily(reference,key,{baseline:true}),daily=metricDaily(recent,key),count=base.size;
    const baseline=count>=5?rounded(median([...base.values()])):null;
    baselines[key]={value:baseline,sampleDays:count,minimumDays:5,start:referenceStart,end:referenceEnd,method:'Median of daily medians from checked, comparable samples'};
    const samples=rows.filter(r=>r.quality==='verified'&&Number.isFinite(r.metrics[key])),last=samples.at(-1);
    const current=last?last.metrics[key]:null,currentAt=last?.at||null;
    let duration=0;
    if(baseline!=null)for(let i=0;i<7;i++){const v=daily.get(shiftDay(end,-i));if(v==null||(v-baseline)*rule.direction<=rule.delta)break;duration++;}
    const excluded=recent.filter(r=>Number.isFinite(r.metrics[key])&&!usableForMetric(r,key)).length;
    findings.push({key,label:rule.label,unit:rule.unit,baseline:baselines[key],observed:{value:current,at:currentAt,delta:current!=null&&baseline!=null?rounded(current-baseline):null},durationDays:duration,sustained:duration>=3,quality:{usableDays:daily.size,expectedDays:7,missingDays:7-daily.size,excludedSamples:excluded,latestComparable:!!last&&usableForMetric(last,key),status:baseline==null?'baseline-building':daily.size<4?'limited':'available'},alternativeExplanations:key==='sleep'?['Rest opportunities','Cabin environment','Schedule changes','Stress or illness']:['Recent exertion','Recovery','Hydration','Illness','Workload or stress']});
  }
  const get=key=>findings.find(f=>f.key===key),core=['sleep','heart','hrv'],ready=core.filter(k=>baselines[k].value!=null).length;
  const recovery=get('sleep').sustained&&(get('heart').sustained||get('hrv').sustained);
  const bp=['systolic','diastolic'].some(k=>{const f=get(k);return f.quality.latestComparable&&dayKey(f.observed.at)===end&&f.observed.delta!=null&&Math.abs(f.observed.delta)>METRICS[k].delta;});
  const exercise=recent.some(r=>dayKey(r.at)===end&&r.condition==='post-exercise')||context==='Recent exercise';
  const noRecent=core.every(k=>get(k).quality.usableDays===0);
  const level=recovery||bp?2:ready===0||noRecent?0:1;
  const concerns=[...(get('sleep').sustained?['sleep']:[]),...(recovery?['recovery']:[]),...(get('cognitive').sustained?['cognitive']:[]),...(bp?['blood-pressure']:[])];
  const evidence=recovery?`Sleep has been below your individual baseline for ${get('sleep').durationDays} consecutive days, alongside sustained ${get('heart').sustained?'heart-rate':'HRV'} changes.`:bp?'A checked blood-pressure reading differs from your personal reference period. Verify the measurement and review any symptoms.':ready===0?'There are not yet five comparable reference days for a personal baseline. Missing or questionable data is not treated as a normal reading.':noRecent?'There are no usable recent core measurements. Previous reference values do not establish your current condition.':exercise?'A post-exercise reading is marked as context-dependent and excluded from resting heart-rate and HRV trend checks.':findings.some(f=>f.quality.missingDays>0)?'Available readings are shown with their coverage. Gaps prevent a claim of a continuous pattern.':'Recent usable readings do not show the multi-signal demonstration pattern.';
  return {level,label:level===2?'Private check-in suggested':level===0?(noRecent&&ready?'Recent measurements needed':'Building your personal baseline'):'Routine monitoring',asOf:end,recentStart,referenceStart,referenceEnd,baselineDays,baselines,findings,concerns,exercise,evidence,uncertainty:'Workload, rest opportunities, environment, exertion, hydration, illness, or stress may contribute. Timing and measurements do not establish a cause or diagnosis.',action:level===2?'Check symptoms and unusual measurements. Review recovery opportunities and consider confidential professional support if concerns persist.':level===0?'Add checked, dated measurements or choose a stable reference period. You can request support at any time.':'Keep your usual check-ins. Report symptoms even when measurements look typical.',changes:core.map(k=>({key:k,label:METRICS[k].label,value:get(k).observed.value,baseline:baselines[k].value,unit:METRICS[k].unit,sustained:get(k).sustained}))};
}
