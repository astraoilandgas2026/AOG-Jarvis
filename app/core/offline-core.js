const DB_NAME="emma-core";const STORE="snapshot";const KEY="global";
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function saveSnapshot(data){try{const db=await openDB();await new Promise((resolve,reject)=>{const t=db.transaction(STORE,"readwrite");t.objectStore(STORE).put({saved_at:new Date().toISOString(),data},KEY);t.oncomplete=resolve;t.onerror=()=>reject(t.error)});return true}catch{return false}}
export async function loadSnapshot(){try{const db=await openDB();return await new Promise((resolve,reject)=>{const t=db.transaction(STORE,"readonly");const r=t.objectStore(STORE).get(KEY);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}catch{return null}}
export function isOffline(){return !navigator.onLine}
