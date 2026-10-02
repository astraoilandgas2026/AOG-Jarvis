const DB_NAME="emma-core";
const STORE="snapshot";
const KEY="global";
const VERSION=2;
const MAX_AGE_MS=7*24*60*60*1000;
function openDB(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,VERSION);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error);
  });
}
export async function saveSnapshot(data){
  try{
    const db=await openDB();
    const saved_at=new Date().toISOString();
    const payload={version:VERSION,saved_at,expires_at:new Date(Date.now()+MAX_AGE_MS).toISOString(),data};
    await new Promise((resolve,reject)=>{
      const t=db.transaction(STORE,"readwrite");
      t.objectStore(STORE).put(payload,KEY);
      t.oncomplete=resolve;
      t.onerror=()=>reject(t.error);
    });
    return true;
  }catch{return false}
}
export async function loadSnapshot(){
  try{
    const db=await openDB();
    return await new Promise((resolve,reject)=>{
      const t=db.transaction(STORE,"readonly");
      const r=t.objectStore(STORE).get(KEY);
      r.onsuccess=()=>{
        const value=r.result||null;
        if(!value)return resolve(null);
        if(value.expires_at&&Date.now()>new Date(value.expires_at).getTime())return resolve(null);
        resolve(value);
      };
      r.onerror=()=>reject(r.error);
    });
  }catch{return null}
}
export function isOffline(){return !navigator.onLine}
