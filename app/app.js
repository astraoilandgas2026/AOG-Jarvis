import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.0";
import { CONFIG } from "./config.js";
import { createOrb } from "./modules/orb.js";
import { createVoice } from "./modules/voice.js";
import { detectModule, getModules } from "./modules/router.js";
import { getTool } from "./core/tool-registry.js";
import { classifyIntent } from "./core/intent-router.js";
import { normalizeSupplierQuery } from "./core/query-normalizer.js";
import { generateDocument, renderArtifact } from "./modules/documents.js";
const supabase=createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey);
const $=s=>document.querySelector(s);
const command=$("#command"),messages=$("#messages"),chat=$("#chat"),home=$("#home");
const workspace=$("#workspace"),logout=$("#logout"),install=$("#install"),result=$("#result"),moduleTitle=$("#module-title"),moduleContent=$("#module-content"),modulesNav=$("#modules");
let voice=null;
const orb=createOrb({root:$("#orb"),status:$("#orb-status"),onActivate:()=>voice?.start()});
voice=createVoice({orb,onTranscript:t=>{command.value=t;execute(t)},onError:e=>setStatus(e)});
const modules=getModules();let activeModule="astra",deferredInstall=null,history=[];
function setStatus(text){$("#orb-status").textContent=text}
function speak(text){if(!("speechSynthesis"in window))return;window.speechSynthesis.cancel();orb.setState("speaking");const u=new SpeechSynthesisUtterance(text);u.lang="es-ES";u.rate=.98;u.onend=()=>orb.setState("idle");window.speechSynthesis.speak(u)}
function addMessage(role,text){const el=document.createElement("div");el.className="message "+role;el.textContent=text;messages.appendChild(el);messages.scrollTop=messages.scrollHeight}
function addArtifactMessage(artifact){const el=document.createElement("div");el.className="message assistant artifact-message";const card=document.createElement("div");renderArtifact(card,artifact);el.appendChild(card);messages.appendChild(el);messages.scrollTop=messages.scrollHeight}
function renderModules(){modulesNav.innerHTML="";Object.entries(modules).forEach(([key,m])=>{const b=document.createElement("button");b.textContent=m.label;b.dataset.module=key;b.className=key===activeModule?"active":"";b.onclick=()=>selectModule(key);modulesNav.appendChild(b)})}
function selectModule(key){activeModule=key;moduleTitle.textContent=modules[key].label;moduleContent.innerHTML="<p class='module-description'>"+modules[key].description+"</p>";modulesNav.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.module===key))}
function renderSession(session){const signed=Boolean(session?.user);home.classList.toggle("hidden",!signed);chat.classList.toggle("hidden",!signed);workspace.classList.toggle("hidden",!signed);logout.classList.toggle("hidden",!signed);if(signed){home.classList.remove("compact");setStatus("EMMA LISTA")}}
async function invokeChat(q){const tool=getTool("conversation.chat");const{data,error}=await supabase.functions.invoke(tool.functionName,{body:{message:q,history}});if(error)throw error;const answer=data?.text?.trim()||"No recibí una respuesta del núcleo.";history.push({role:"user",content:q},{role:"assistant",content:answer});history=history.slice(-10);return answer}
async function invokeGitHub(q){const tool=getTool("github.read");const match=q.match(/(?:archivo|file|ruta|path)\s+([\w./-]+)$/i);const path=match?.[1]||"README.md";const{data,error}=await supabase.functions.invoke(tool.functionName,{body:{repository:"astraoilandgas2026/AOG-Jarvis",path}});if(error)throw error;return data}
async function invokeTool(toolId,body={}){const tool=getTool(toolId);if(!tool?.functionName)throw new Error("Conector no configurado: "+toolId);const{data,error}=await supabase.functions.invoke(tool.functionName,{body:{tool:toolId,...body}});if(error)throw error;return data}
async function execute(text){const q=text.trim();if(!q)return;command.value="";addMessage("user",q);orb.setState("thinking");const intent=classifyIntent(q);const target=intent.module||detectModule(q);selectModule(target);try{if(intent.type==="action" && /document|documento|word|pdf|powerpoint|pptx|company profile/i.test(q)){ const format=/pptx|powerpoint/i.test(q)?"pptx":/word|docx/i.test(q)?"docx":"pdf"; const body=q.replace(/^(emma[,:]?\\s*)?(crea|genera|hazme|prepara)\\s*/i,""); const artifact=await generateDocument({format,title:"Documento Emma",body}); renderArtifact(result,artifact); addArtifactMessage(artifact); addMessage("assistant","Listo. Generé el documento y lo dejé aquí mismo."); speak("Listo. Generé el documento."); return; }\nif(intent.type==="tool"&&intent.tool){const data=intent.tool==="github.read"?await invokeGitHub(q):await invokeTool(intent.tool,intent.tool==="astra.search_supplier"?{q:normalizeSupplierQuery(q),limit:10}:{q,limit:10});const output=JSON.stringify(data,null,2);result.textContent=output;const reply=data?.count?"Encontré "+data.count+" resultado"+(data.count===1?"":"s")+".":"No encontré resultados.";addMessage("assistant",reply);speak(reply);return}const answer=await invokeChat(q);addMessage("assistant",answer);result.textContent=answer;speak(answer)}catch(e){result.textContent="Error: "+e.message;addMessage("assistant","No pude completar la solicitud: "+e.message);speak("No pude completar la solicitud.")}finally{if(orb.getState()==="thinking")orb.setState("idle")}}
logout.onclick=()=>supabase.auth.signOut();$("#execute").onclick=()=>execute(command.value);$("#voice").onclick=()=>voice?.start();command.addEventListener("keydown",e=>{if(e.key==="Enter")execute(command.value)});
supabase.auth.onAuthStateChange((_event,session)=>renderSession(session));
const {data:{session}}=await supabase.auth.getSession();
renderModules();selectModule(activeModule);
if(session){renderSession(session);}else{
  setStatus("CONECTANDO EMMA");
  const {data,error}=await supabase.auth.signInAnonymously();
  if(error){setStatus("CONFIGURACIÓN DE ACCESO PENDIENTE");console.error("Anonymous auth unavailable",error);}
  else renderSession(data.session);
}
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js?v=8").catch(()=>{});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;install.classList.remove("hidden")});install.onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;install.classList.add("hidden")};