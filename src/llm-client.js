export const MODEL_NAME='Gemma 3 4B';
export function conversationMessages(history,conversationId){
  return history.filter(m=>m.conversationId===conversationId&&!m.urgent&&m.source!=='notice'&&['user','assistant'].includes(m.role)).slice(-21).map(m=>({role:m.role,content:m.text}));
}
export async function getModelStatus(){
  try{const r=await fetch('/api/model',{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!r.ok)throw new Error();const result=await r.json();if(result.model!=='gemma3:4b'||!['ready','missing','offline'].includes(result.state))throw new Error();return result;}
  catch{return {model:'gemma3:4b',state:'offline',local:true};}
}
export async function requestReply({messages,scenario,context,signal}){
  const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({messages,scenario,context})});
  if(!r.ok)throw new Error('Local model request failed');
  const result=await r.json();const suggestions=new Set(['breathe','sleep','connect','ground','workload','reflect','support']);
  if(typeof result.text!=='string'||!result.text.trim()||result.text.length>2500||!['gemma','guided','safety'].includes(result.source)||(result.suggestion&&!suggestions.has(result.suggestion)))throw new Error('Invalid local response');
  return result;
}
