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
