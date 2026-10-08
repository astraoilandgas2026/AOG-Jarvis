import { CONFIG } from "../config.js";
const DEVICE_STORAGE="emma_mobile_device_key",HEARTBEAT_MS=15000,POLL_MS=8000;
function deviceKey(){try{let key=localStorage.getItem(DEVICE_STORAGE);if(!key){key=crypto.randomUUID();localStorage.setItem(DEVICE_STORAGE,key)}return key}catch{return "emma-mobile-device-fallback"}}
function isMobile(){return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||matchMedia("(display-mode: standalone)").matches}
async function call(supabase,op,body={}){const {data,error}=await supabase.functions.invoke("emma-mobile-bridge",{body:Object.assign({op},body)});if(error)throw error;return data}
export function createMobileBridge({supabase,onStatus=()=>{},onTask=()=>{}}){
if(!isMobile())return{enabled:false,stop:()=>{}}; const key=deviceKey(); let stopped=false,heartbeatTimer=null,pollTimer=null;
const caps=["heartbeat","task_queue","notifications","browser_pwa"];
async function heartbeat(){if(stopped)return;try{const data=await call(supabase,"heartbeat",{device_key:key,device_name:"Emma Mobile",platform:"android",app_version:"web-pwa-v1",capabilities:caps});onStatus({connected:true,device:data?.device||null})}catch(error){onStatus({connected:false,error:error?.message||String(error)})}}
async function poll(){if(stopped)return;try{const data=await call(supabase,"poll",{device_key:key,limit:5});for(const task of data?.tasks||[]){try{const value=await onTask(task);await call(supabase,"complete",{task_id:task.id,status:"completed",result:value||{ok:true}})}catch(error){await call(supabase,"complete",{task_id:task.id,status:"failed",error:error?.message||String(error)})}}}catch(error){onStatus({connected:false,error:error?.message||String(error)})}}
heartbeat();poll();heartbeatTimer=setInterval(heartbeat,HEARTBEAT_MS);pollTimer=setInterval(poll,POLL_MS);
const visibility=()=>{if(document.visibilityState==="visible"){heartbeat();poll()}};document.addEventListener("visibilitychange",visibility);
return{enabled:true,deviceKey:key,stop(){stopped=true;clearInterval(heartbeatTimer);clearInterval(pollTimer);document.removeEventListener("visibilitychange",visibility)}}
}
