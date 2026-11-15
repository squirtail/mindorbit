const DB = 'mindorbit-vault-v1';
let db, key;
export function migrateState(saved={}){
  return {...saved,schemaVersion:2,dataMode:saved.dataMode==='personal'?'personal':'demo',measurements:Array.isArray(saved.measurements)?saved.measurements:[],interventions:Array.isArray(saved.interventions)?saved.interventions:[],baselineDays:[7,14,28].includes(saved.baselineDays)?saved.baselineDays:14,baselineEnd:typeof saved.baselineEnd==='string'?saved.baselineEnd:'',demoOffsets:{recovery:0,exercise:0,routine:0,...saved.demoOffsets},journalAnalysis:{enabled:saved.journalAnalysis?.enabled===true,features:Array.isArray(saved.journalAnalysis?.features)&&saved.journalAnalysis?.enabled===true?saved.journalAnalysis.features:[]}};
}
export async function openVault() {
  if (!globalThis.crypto?.subtle || !globalThis.indexedDB) throw new Error('Secure storage unavailable');
  db = await new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore('vault');
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
  key=await get('key');
  if(!key) { key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']); await put('key',key); }
  const saved=await get('state');
  if(!saved) return null;
  const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:saved.iv},key,saved.data);
  return migrateState(JSON.parse(new TextDecoder().decode(decrypted)));
}
function get(id) { return new Promise((resolve,reject)=>{ const r=db.transaction('vault').objectStore('vault').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error); }); }
function put(id,value) { return new Promise((resolve,reject)=>{const tx=db.transaction('vault','readwrite');tx.objectStore('vault').put(value,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);}); }
let saving=Promise.resolve();
export function saveVault(state) {
  const snapshot=JSON.stringify(state);
  saving=saving.catch(()=>{}).then(async()=>{
    if(!key) throw new Error('Vault not ready');
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(snapshot));
    await put('state',{iv,data});
  });
  return saving;
}
export async function clearVault() {
  await saving.catch(()=>{});
  if(db) { await new Promise((resolve,reject)=>{const tx=db.transaction('vault','readwrite');tx.objectStore('vault').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close(); }
  key=null;db=null;
}
