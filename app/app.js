import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.0";
import { CONFIG } from "./config.js";
import { createOrb } from "./modules/orb.js";
import { createVoice } from "./modules/voice.js";
import { detectModule, getModules } from "./modules/router.js";
import { getTool } from "./core/tool-registry.js";
import { classifyIntent } from "./core/intent-router.js";
import { normalizeSupplierQuery } from "./core/query-normalizer.js";
const supabase=createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey);
const $=s=>document.querySelector(s);
const workspace=$( "#workspace"),logout=$( "#logout"),install=$( "#install"),command=$( "#command"),result=$( "#result"),transcript=$( "#transcript"),moduleTitle=$( "#module-title"),moduleContent=$( "#module-content"),modulesNav=$( "#modules");
const modules=getModules();let activeModule="astra",deferredInstall=null,history=[];
function speak(text){if(!("speechSynthesis"in window))return;window.speechSynthesis.cancel();orb.setState("speaking");const u=new SpeechSynthesisUtterance(text);u.lang="es-ES";u.rate=1;u.onend=()=>orb.setState("idle");window.speechSynthesis.speak(u)}
function renderModules(){modulesNav.innerHTML="";Object.entries(modules).forEach(([key,m])=>{const b=document.createElement("button");b.textContent=m.label;b.dataset.module=key;b.className=key===activeModule?"active":"";b.onclick=()=>selectModule(key);modulesNav.appendChild(b)})}
function selectModule(key){activeModule=key;moduleTitle.textContent=modules[key].label;moduleContent.innerHTML="<p class=\"module-description\">"+modules[key].description+"</p>";modulesNav.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.module===key))}
function renderSession(session){const signed=Boolean(session?.user);workspace.classList.toggle("hidden",!signed);logout.classList.toggle("hidden",!signed)}
async function invokeChat(q){const tool=getTool("conversation.chat");const{data,error}=await supabase.functions.invoke(tool.functionName,{body:{message:q,history}});if(error)throw error;const answer=data?.text?.trim()||"No recibí una respuesta del núcleo.";history.push({role:"user",content:q},{role:"assistant",content:answer});history=history.slice(-10);return answer}
async function invokeTool(toolId,body={}){const tool=getTool(toolId);if(!tool?.functionName)throw new Error("Conector no configurado: "+toolId);const{data,error}=await supabase.functions.invoke(tool.functionName,{body:{tool:toolId,...body}});if(error)throw error;return data}
async function execute(text){const q=text.trim();if(!q)return;transcript.textContent="› "+q;speak("Te escuché. Procesando.");const intent=classifyIntent(q);const target=intent.module||detectModule(q);selectModule(target);
if(intent.type==="tool"&&intent.tool){orb.setState("thinking");try{const body={q:normalizeSupplierQuery(q),limit:10};const data=await invokeTool(intent.tool,body);result.textContent=JSON.stringify(data,null,2);speak(data?.count?("Encontré "+data.count+" resultado"+(data.count===1?"":"s")+" en "+intent.tool+"."):"No encontré resultados.")}catch(e){result.textContent="Error: "+e.message;speak("No pude consultar la herramienta.");orb.setState("idle")}return}
if(target!=="astra"){if(intent.type==="conversation"){try{orb.setState("thinking");const answer=await invokeChat(q);result.textContent=answer;speak(answer)}catch(e){result.textContent="Error: "+e.message;speak("El núcleo de IA todavía no está configurado.");orb.setState("idle")}}else result.textContent="Módulo detectado: "+modules[target].label+"\\n\\nArquitectura preparada.";return}}
const voice=createVoice({orb,onTranscript:t=>{command.value=t;execute(t)},onError:e=>{result.textContent="Voz: "+e}});logout.onclick=()=>supabase.auth.signOut();$( "#execute").onclick=()=>execute(command.value);supabase.auth.onAuthStateChange((_event,session)=>renderSession(session));const{data:{session}}=await supabase.auth.getSession();renderModules();selectModule(activeModule);renderSession(session);if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js?v=7").catch(()=>{});window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;install.classList.remove("hidden")});install.onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;install.classList.add("hidden")};
