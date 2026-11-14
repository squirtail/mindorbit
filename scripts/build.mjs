import {mkdir,cp} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','src','assets','manifest.webmanifest','sw.js']) await cp(file,'dist/'+file,{recursive:true});
console.log('Built offline-ready static app in dist/. Gemma chat requires the Node server and local Ollama; static hosting provides guided fallback only.');
