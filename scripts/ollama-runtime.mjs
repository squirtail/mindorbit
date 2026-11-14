import {access,mkdir,open} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
export async function findOllama(){
  const local=process.env.LOCALAPPDATA;
  const candidates=[local&&path.join(local,'Programs','Ollama','ollama.exe'),local&&path.join(local,'MindOrbit','ollama','ollama.exe')];
  for(const candidate of candidates.filter(Boolean)){try{await access(candidate);return candidate;}catch{}}
  for(const dir of (process.env.PATH||'').split(path.delimiter)){
    const candidate=path.join(dir,process.platform==='win32'?'ollama.exe':'ollama');
    try{await access(candidate);return candidate;}catch{}
  }
  return null;
}
export async function startLocalOllama(){
  try{const r=await fetch('http://127.0.0.1:11434/api/version',{signal:AbortSignal.timeout(1500)});if(r.ok)return {started:false,state:'already running'};}catch{}
  const executable=await findOllama();
  if(!executable)return {started:false,state:'not installed'};
  const managed=executable.includes(path.join('MindOrbit','ollama'));
  const runtimeRoot=process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,'MindOrbit'):path.join(os.homedir(),'.mindorbit');
  await mkdir(runtimeRoot,{recursive:true});
  const out=await open(path.join(runtimeRoot,'ollama-output.log'),'a');
  const err=await open(path.join(runtimeRoot,'ollama-errors.log'),'a');
  try{
    const child=spawn(executable,['serve'],{windowsHide:true,detached:true,stdio:['ignore',out.fd,err.fd],env:{...process.env,OLLAMA_HOST:'127.0.0.1:11434',OLLAMA_NO_CLOUD:'1',OLLAMA_NUM_PARALLEL:'1',...(managed?{OLLAMA_MODELS:path.join(runtimeRoot,'models')}: {})}});
    await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
    return {started:true,state:'starting'};
  }finally{await out.close();await err.close();}
}
