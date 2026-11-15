import {METRICS,normalizeMeasurement,dayKey,shiftDay} from './engine.js';
import {INTERVENTIONS,startIntervention,addInterventionFeedback,interventionOutcome,safeOutcomeSummary} from './interventions.js';
import {extractJournalFeatures,analyzeJournalPatterns,journalSummaryForAI} from './journal-analysis.js';
import {htmlEscape as e,conditionLabel} from './feature-views.js';

export function createFeatureController({getState,analysis,readingsFor,asOfFor,currentDataset,effectiveNow,icon,openModal,closeModal,persist,shell,navigate,toast,log,sendMessage,isBusy=()=>false}){
  const state=()=>getState();
  let selectedExplanation=null;
  function syncJournalAnalysis(){
    if(!state().journalAnalysis.enabled)return;
    state().journalAnalysis.features=state().journal.filter(j=>dayKey(j.date)).map(extractJournalFeatures);
  }
  function save(message){persist();closeModal();shell();if(message)toast(message);}
  function error(form,message){form.querySelector('[role="alert"]').textContent=message;}
  function measurementModal(importing=false){
    if(importing){openModal('Import dated measurements.',`<p class="modal-intro">Paste a JSON array of dated readings. Records are validated together before saving. No sensor connection or medical verification is implied.</p><details class="import-example"><summary>Show an example</summary><pre>${e(JSON.stringify([{at:'2026-11-01T08:00:00Z',metrics:{sleep:7.2,heart:68,hrv:48},quality:'verified',condition:'rest',workload:'Balanced'}],null,2))}</pre><p>Allowed metrics: sleep, heart, hrv, cognitive, systolic, diastolic. Quality: verified or questionable. Context: rest, post-exercise, schedule-change, unwell, unknown. Dates are UTC; “verified” means checked by you.</p></details><form id="import-measurements-form"><label class="field-label" for="measurement-json">Dated readings · maximum 1,000 per import</label><textarea id="measurement-json" name="records" rows="10" maxlength="500000" required spellcheck="false"></textarea><p class="form-error" role="alert"></p><button class="button primary full">Validate & save on this device ${icon('lock')}</button></form>`,true);return;}
    openModal('Log a dated reading.',`<p class="modal-intro">Enter only what you measured. Leave unavailable fields blank. All dates and times below use UTC.</p><form id="measurement-form"><label class="field-label">Date & time (UTC)<input type="datetime-local" name="at" value="${new Date().toISOString().slice(0,16)}" max="${new Date().toISOString().slice(0,16)}" required/></label><div class="measurement-fields">${Object.entries(METRICS).map(([key,m])=>`<label>${m.label} (${m.unit})<input type="number" name="${key}" step="${key==='sleep'?'.1':'1'}" min="${m.min}" max="${m.max}" placeholder="Not measured"/></label>`).join('')}</div><div class="form-row"><label>Measurement quality<select name="quality"><option value="verified">Checked by me</option><option value="questionable">Needs rechecking</option></select></label><label>Conditions<select name="condition">${['rest','post-exercise','schedule-change','unwell','unknown'].map(c=>`<option value="${c}">${conditionLabel(c)}</option>`).join('')}</select></label></div><label class="field-label">Workload<select name="workload"><option>Balanced</option><option>Moderate</option><option>High</option></select></label><p class="form-error" role="alert"></p><div class="modal-bottom"><span class="tiny-muted">No sensor is connected.</span><button class="button primary">Save reading ${icon('check')}</button></div></form>`,true);
  }
  function feedbackModal(id){
    const p=state().interventions.find(p=>p.id===id);if(!p)return;
    openModal('How did that step go?',`<p class="modal-intro">${INTERVENTIONS[p.resourceId].title}. Your experience belongs alongside the measurements.</p><form id="plan-feedback-form" data-plan-id="${p.id}"><label class="field-label">How often did you try it?<select name="adherence" required><option value="not-yet">Not yet</option><option value="once">Once</option><option value="some-days">Some days</option><option value="daily">Daily</option></select></label><div class="form-row"><label>How did it feel?<select name="helpfulness"><option value="unsure">Unsure</option><option value="helped">Helpful</option><option value="unchanged">No change</option><option value="not-helpful">Not helpful</option></select></label><label>Any symptoms?<select name="symptoms"><option value="none">None to report</option><option value="new-or-persistent">New or persistent symptoms</option></select></label></div><fieldset class="factor-options"><legend>What else changed? Select any that apply.</legend>${['Workload changed','Rest opportunity changed','Recent exercise','Cabin environment','Possible illness','Social connection'].map(v=>`<label><input type="checkbox" name="otherFactors" value="${v}"/> ${v}</label>`).join('')}</fieldset><label class="field-label">Private note <span>Optional · excluded from AI summaries</span><textarea name="note" rows="3" maxlength="2000"></textarea></label><p class="modal-note">New or persistent symptoms deserve human medical review. Use Immediate support for an urgent concern. Saving this form sends no alert.</p><p class="form-error" role="alert"></p><button class="button primary full">Save follow-up ${icon('check')}</button></form>`);
  }
  function previewExplanation(kind,id){
    let payload,summary;
    if(kind==='journal'){
      const patterns=analyzeJournalPatterns(state().journalAnalysis.features,{asOf:asOfFor()});
      if(!patterns.enough){toast('Add entries on at least two days in each comparison week.');return;}
      summary=journalSummaryForAI(patterns);payload={journalSummary:summary};
    }else{
      const p=state().interventions.find(p=>p.id===id);if(!p)return;
      if(p.datasetId!==currentDataset()){toast('Switch to this plan’s data source first.');return;}
      summary=safeOutcomeSummary(interventionOutcome(p,readingsFor(p.datasetId),{asOf:asOfFor(p.datasetId)}));
      payload={forceHealth:true,interventionContext:{resourceId:p.resourceId,startedAt:p.startedAt,...(p.baselineRecords?{baselineReadings:p.baselineRecords.map(({at,metrics,quality,condition,source})=>({at,metrics,quality,condition,source}))}:{}),...(summary.feedback?{feedback:summary.feedback}:{})}};
    }
    selectedExplanation={kind,payload};
    openModal(kind==='journal'?'Preview writing summary for Orbit.':'Preview progress summary for Orbit.',`<p class="modal-intro">${kind==='journal'?'Only these descriptive statistics will be added to one local AI request. Raw entries and titles stay out.':'This calculated summary and the current measurement context will be included in one local AI request. Private feedback notes stay out.'}</p><div class="packet-preview"><pre>${e(JSON.stringify(summary,null,2))}</pre></div><p class="modal-note">Gemma runs on this computer. The request also includes recent conversation history${kind==='journal'?' and any health context you have enabled':''}. Its response is saved in your chat and may be included in later conversation turns. No summary is sent to Earth.</p><div class="modal-bottom"><button class="button soft" data-action="close-modal">Keep local only</button><button class="button primary" data-action="confirm-derived-explanation">Use this summary once ${icon('spark')}</button></div>`,true);
  }
  function addDemoJournals(){
    const examples=[[-12,'A small routine','Today I made time to enjoy a familiar song after our work period. I noticed how a simple routine can make the cabin feel more familiar.'],[-10,'A crew moment','We traded stories over a meal and laughed about the tiny things that happen during the day. I want to remember this ordinary moment of connection.'],[-9,'Looking out','The view held my attention for a while today. I wrote down the colors and thought about how I might describe them to someone at home.'],[-7,'A quiet break','I used a short break to pause and sort through tomorrow’s tasks. Having a little time to write gave me room to put the day into perspective.'],[-5,'Today','Busy day. Finished my tasks and had dinner with the crew.'],[-3,'A pause','Listened to music. Took a quiet break after work.'],[-2,'Small win','Finished a difficult task. I enjoyed a quick conversation.'],[0,'Brief note','A short entry today. Looking forward to rest.']];
    if(state().journal.some(j=>j.fictionalSample)){toast('Fictional sample entries are already saved.');return;}
    state().journal.unshift(...examples.map(([offset,title,text])=>({id:crypto.randomUUID(),date:shiftDay(asOfFor(),offset)+'T12:00:00.000Z',title:'[Fictional sample] '+title,text,fictionalSample:true})));
    syncJournalAnalysis();log('Fictional sample journal entries added locally');save('Eight clearly labeled fictional entries were added.');
  }
  function recordActivity(resourceId){
    for(const p of state().interventions.filter(p=>p.resourceId===resourceId&&p.status==='active'&&p.datasetId===currentDataset()))p.activities.push({at:effectiveNow(p.datasetId)});
  }
  function click(target){
    const start=target.closest('[data-start-plan]');if(start){const resourceId=start.dataset.startPlan;if(!INTERVENTIONS[resourceId]||state().interventions.some(p=>p.datasetId===currentDataset()&&p.status==='active'&&p.resourceId===resourceId))return true;state().interventions.unshift(startIntervention(resourceId,{datasetId:currentDataset(),startedAt:effectiveNow(),readings:readingsFor()}));log('Private care-plan activity started: '+INTERVENTIONS[resourceId].title);persist();navigate('plan');toast('Added to your care plan with a dated follow-up.');return true;}
    const feedback=target.closest('[data-plan-feedback]');if(feedback){feedbackModal(feedback.dataset.planFeedback);return true;}
    const finish=target.closest('[data-finish-plan]');if(finish){const p=state().interventions.find(p=>p.id===finish.dataset.finishPlan);if(p){p.status='completed';p.finishedAt=effectiveNow(p.datasetId);log('Care-plan activity finished');save('Activity retained with its follow-up history.');}return true;}
    const explain=target.closest('[data-explain-plan]');if(explain){previewExplanation('plan',explain.dataset.explainPlan);return true;}
    const action=target.closest('[data-action]')?.dataset.action;
    switch(action){
      case 'log-measurement':measurementModal();break;
      case 'import-measurements':measurementModal(true);break;
      case 'advance-demo':state().demoOffsets[state().scenario]=Math.min(14,(state().demoOffsets[state().scenario]||0)+1);save('A fictional sample day was added.');break;
      case 'enable-journal-analysis':openModal('Choose local writing analysis.',`<p class="modal-intro">MindOrbit will read your saved journal entries on this device to calculate word counts, unique-word proportions, and average sentence length. New entries will be included while this setting is enabled.</p><p>It stores numeric features with entry IDs and dates in your encrypted vault when available. These are descriptive patterns, not a mood score or mental health assessment. Topic, language, and entry length affect the results.</p><p class="modal-note">No journal text or features go to Gemma automatically. You can separately preview a numeric summary and choose to discuss it. Turning analysis off removes stored features and keeps your journals.</p><button class="button primary full" data-action="confirm-journal-analysis">Enable local analysis ${icon('lock')}</button>`);break;
      case 'confirm-journal-analysis':state().journalAnalysis.enabled=true;syncJournalAnalysis();log('Consent granted for local descriptive journal analysis');save('Local writing analysis enabled. Nothing was sent to Gemma.');break;
      case 'disable-journal-analysis':state().journalAnalysis={enabled:false,features:[]};log('Journal analysis disabled; derived feature records removed');save('Derived features removed. Your journal entries remain saved.');break;
      case 'demo-journal-patterns':addDemoJournals();break;
      case 'explain-journal-patterns':previewExplanation('journal');break;
      case 'confirm-derived-explanation':{const selected=selectedExplanation;if(!selected)return true;if(isBusy()){toast('Wait for the current reply, or stop it in Companion, before discussing this summary.');return true;}selectedExplanation=null;log('Selected '+(selected.kind==='journal'?'derived writing':'care-plan outcome')+' summary approved for one local AI request');closeModal();navigate('companion');sendMessage(selected.kind==='journal'?'Explain the writing patterns in the summary I selected. What can and cannot be concluded?':'Help me review this selected care-plan outcome and my feedback. What changed, and what remains uncertain?',selected.payload);break;}
      default:return false;
    }
    return true;
  }
  function submit(form,f){
    try{
      if(form.id==='baseline-form'){state().baselineDays=Number(f.get('baselineDays'));state().baselineEnd=String(f.get('baselineEnd')||'');save('Personal reference period updated.');return true;}
      if(form.id==='measurement-form'||form.id==='import-measurements-form'){
        let rows;
        if(form.id==='measurement-form'){
          const metrics={};for(const key of Object.keys(METRICS)){const value=f.get(key);if(value!=='')metrics[key]=Number(value);}
          rows=[normalizeMeasurement({at:new Date(f.get('at')+'Z').toISOString(),metrics,quality:f.get('quality'),condition:f.get('condition'),workload:f.get('workload'),source:'manual'})];
        }else{
          const input=JSON.parse(String(f.get('records')));if(!Array.isArray(input)||!input.length||input.length>1000)throw new Error('Use an array of 1 to 1,000 records.');
          rows=input.map(row=>normalizeMeasurement({...row,source:'imported'}));
        }
        if(rows.some(r=>r.at>new Date().toISOString()))throw new Error('Measurements cannot be dated in the future.');
        const known=new Set(state().measurements.map(r=>JSON.stringify([r.at,r.metrics])));
        const unique=rows.filter(r=>{const key=JSON.stringify([r.at,r.metrics]);if(known.has(key))return false;known.add(key);return true;}).map(r=>({...r,id:crypto.randomUUID()}));
        state().measurements.push(...unique);state().measurements.sort((a,b)=>a.at.localeCompare(b.at));state().dataMode='personal';log(unique.length+' personal measurement records saved locally');save(unique.length+' dated readings saved.');return true;
      }
      if(form.id==='plan-feedback-form'){
        const index=state().interventions.findIndex(p=>p.id===form.dataset.planId);if(index<0)return true;
        const p=state().interventions[index];state().interventions[index]=addInterventionFeedback(p,{adherence:f.get('adherence'),helpfulness:f.get('helpfulness'),symptoms:f.get('symptoms'),otherFactors:f.getAll('otherFactors'),note:f.get('note')},{at:effectiveNow(p.datasetId)});log('Private care-plan follow-up saved');save('Follow-up saved. No alert or message was sent.');return true;
      }
    }catch(err){error(form,err.message||'Please check the entered values.');return true;}
    return false;
  }
  function change(target){if(!target.matches('[data-data-mode]'))return false;state().dataMode=target.value==='personal'?'personal':'demo';state().baselineEnd='';save('Showing '+(state().dataMode==='personal'?'your personal measurements.':'the simulated mission timeline.'));return true;}
  return {click,submit,change,syncJournalAnalysis,recordActivity};
}
