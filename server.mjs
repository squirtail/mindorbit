import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCompanion,InputError} from './server/companion.mjs';
import {startLocalOllama} from './scripts/ollama-runtime.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.json':'application/json'};
const SECURITY={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
function json(res,status,body){res.writeHead(status,{...SECURITY,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
async function readJson(req){
  if(req.headers['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json')throw new InputError('Use application/json.');
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>65536)throw new InputError('Chat request is too large.');chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new InputError('Invalid JSON.');}
}
export function createAppServer({companion=createCompanion()}={}){return http.createServer(async(req,res)=>{
  let hostname;
  try{hostname=new URL('http://'+req.headers.host).hostname;}catch{json(res,400,{error:'Invalid host.'});return;}
  if(!['localhost','127.0.0.1'].includes(hostname)){json(res,403,{error:'This companion is available only on this computer.'});return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname.startsWith('/api/')){
      if((req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)||req.headers['sec-fetch-site']==='cross-site'){json(res,403,{error:'Cross-origin requests are not allowed.'});return;}
      if(pathname==='/api/model'&&req.method==='GET'){json(res,200,await companion.status());return;}
      if(pathname==='/api/chat'&&req.method==='POST'){
        const input=await readJson(req),controller=new AbortController();
        res.once('close',()=>{if(!res.writableEnded)controller.abort(new Error('Client disconnected'));});
        const result=await companion.reply(input,{signal:controller.signal});
        if(!res.destroyed)json(res,200,result);return;
      }
      json(res,404,{error:'Unknown local API route.'});return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    if(!/^\/(?:$|index\.html$|sw\.js$|manifest\.webmanifest$|(?:src|assets)\/[a-zA-Z0-9_./-]+$)/.test(pathname)) {res.writeHead(404);res.end('Not found');return;}
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
    if(!(await stat(file)).isFile()) throw new Error();
    res.writeHead(200,{...SECURITY,'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:await readFile(file));
  }catch(error){if(res.destroyed)return;if(error instanceof InputError){json(res,400,{error:error.message});return;}json(res,req.url.startsWith('/api/')?500:404,{error:req.url.startsWith('/api/')?'The local request could not be completed.':'Not found'});}
});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=createAppServer();server.requestTimeout=200000;
  server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>{
    console.log('MindOrbit ready at http://localhost:'+(Number(process.env.PORT)||4173));
    startLocalOllama().then(result=>console.log(result.started?'Local Ollama started.':'Ollama: '+result.state)).catch(()=>console.log('Ollama is unavailable; guided support remains available.'));
  });
}
