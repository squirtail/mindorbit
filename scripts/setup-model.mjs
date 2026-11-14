import {startLocalOllama} from './ollama-runtime.mjs';
import {MODEL,OLLAMA_ORIGIN} from '../server/companion.mjs';
const runtime=await startLocalOllama();
if(runtime.state==='not installed'){
  console.error('Install Ollama from https://ollama.com/download, then run npm run setup:model again.');process.exitCode=1;
}else{
  let ready=false;
  for(let i=0;i<30;i++){try{const r=await fetch(OLLAMA_ORIGIN+'/api/version');if(r.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
  if(!ready)throw new Error('Ollama did not start. Start it, then try again.');
  console.log('Downloading '+MODEL+' to this computer. This is a one-time download of several GB.');
  const r=await fetch(OLLAMA_ORIGIN+'/api/pull',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,stream:true})});
  if(!r.ok)throw new Error('Model download could not start.');
  let buffer='',lastProgress='';const decoder=new TextDecoder();
  for await(const chunk of r.body){buffer+=decoder.decode(chunk,{stream:true});let newline;
    while((newline=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);if(!line.trim())continue;const item=JSON.parse(line);if(item.error)throw new Error(item.error);const progress=item.total?`${item.status}: ${Math.floor((item.completed||0)/item.total*10)*10}%`:item.status;if(progress&&progress!==lastProgress){console.log(progress);lastProgress=progress;}}
  }
  const check=await fetch(OLLAMA_ORIGIN+'/api/tags').then(r=>r.json());
  if(!check.models?.some(m=>m.name===MODEL||m.model===MODEL))throw new Error('Model download did not complete.');
  console.log('Gemma 3 4B is installed. Open MindOrbit and choose Companion.');
}
