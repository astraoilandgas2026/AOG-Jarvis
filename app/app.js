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
function selectModule(key){activeModule=modules[key]?key:"conversation";moduleTitle.textContent=modules[activeModule].label;moduleContent.innerHTML="<p class='module-description'>"+modules[activeModule].description+"</p>";modulesNav.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.module===activeModule))}
function renderSession(session){const signed=Boolean(session?.user);home.classList.toggle("hidden",!signed);chat.classList.toggle("hidden",!signed);workspace.classList.toggle("hidden",!signed);logout.classList.toggle("hidden",!signed);if(signed){home.classList.remove("compact");setStatus("EMMA LISTA")}}
async function invokeChat(q){const tool=getTool("conversation.chat");const{data,error}=await supabase.functions.invoke(tool.functionName,{body:{message:q,history}});if(error)throw error;const answer=data?.text?.trim()||"No recibí una respuesta del núcleo.";history.push({role:"user",content:q},{role:"assistant",content:answer});history=history.slice(-10);return answer}
async function invokeGitHub(q){const tool=getTool("github.read");const match=q.match(/(?:archivo|file|ruta|path)\s+([\w./-]+)$/i);const path=match?.[1]||"README.md";const{data,error}=await supabase.functions.invoke(tool.functionName,{body:{repository:"astraoilandgas2026/AOG-Jarvis",path}});if(error)throw error;return data}
async function invokeTool(toolId,body={}){const tool=getTool(toolId);if(!tool?.functionName)throw new Error("Conector no configurado: "+toolId);const{data,error}=await supabase.functions.invoke(tool.functionName,{body:{tool:toolId,...body}});if(error)throw error;return data}
async function invokeGoogle(action,body={}){const res=await fetch(CONFIG.googleBridgeUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...body})});const data=await res.json();if(!data?.ok)throw new Error(data?.error||"Google Bridge rechazó la solicitud.");return data}
async function invokeMail(action,body={}){const tool=getTool(action==="send"?"mail.send":"mail.read");if(!tool?.functionName)throw new Error("Conector de correo no configurado");const{data,error}=await supabase.functions.invoke(tool.functionName,{body:{action,...body}});if(error)throw error;return data}
function parseSendEmail(q){const match=q.match(/(?:envía|envia|manda|mandar)\s+(?:un\s+)?(?:correo|email|mail)\s+(?:a|para)\s+([^\s]+)\s+(?:con\s+)?(?:asunto|subject)\s*[:=-]\s*(.+?)\s+(?:cuerpo|body|mensaje)\s*[:=-]\s*([\s\S]+)$/i);if(!match)return null;return{to:[match[1]],subject:match[2].trim(),text:match[3].trim()}}
function formatMail(data){const rows=data?.data||[];if(!rows.length)return data?.mailbox?"No hay correos que coincidan en "+data.mailbox+".":"No encontré correos.";return rows.slice(0,10).map((m,i)=>`${i+1}. ${m.subject||"(sin asunto)"} — ${m.from?.address||"remitente desconocido"} — ${m.date?new Date(m.date).toLocaleString("es-CL"): ""} [UID ${m.uid}]`).join("\n")}
async function execute(text){const q=text.trim();if(!q)return;command.value="";addMessage("user",q);orb.setState("thinking");const intent=classifyIntent(q);const target=intent.module||detectModule(q);selectModule(target);try{
if(intent.tool==="gmail.read"){const data=await invokeGoogle("gmail.list",{query:q.match(/(?:busca|buscar|encuentra)\s+(.+)/i)?.[1]||"in:inbox",max:10});result.textContent=JSON.stringify(data,null,2);const reply=data?.count?`Encontré ${data.count} correos en Gmail.`:"No encontré correos en Gmail.";addMessage("assistant",reply);speak(reply);return}
if(intent.type==="action"&&intent.tool==="gmail.send"){const m=q.match(/(?:gmail.*?)(?:a|para)\s+([^\s]+).*?(?:asunto|subject)\s*[:=-]\s*(.+?)\s+(?:cuerpo|body|mensaje)\s*[:=-]\s*([\s\S]+)$/i);if(!m)throw new Error("Formato: Gmail a EMAIL asunto: ASUNTO cuerpo: MENSAJE");if(!window.confirm(`Enviar Gmail a ${m[1]}?\\n\\nAsunto: ${m[2]}`)){addMessage("assistant","Envío cancelado.");return}const data=await invokeGoogle("gmail.send",{to:m[1],subject:m[2].trim(),text:m[3].trim()});result.textContent=JSON.stringify(data,null,2);addMessage("assistant",data?.sent?"Gmail enviado.":"No se confirmó el envío.");speak(data?.sent?"Gmail enviado.":"No se confirmó el envío.");return}
if(intent.tool==="calendar.read"){const data=await invokeGoogle("calendar.list",{});result.textContent=JSON.stringify(data,null,2);const reply=data?.count?`Encontré ${data.count} eventos en tu calendario.`:"No hay eventos en el período consultado.";addMessage("assistant",reply);speak(reply);return}
if(intent.type==="action"&&intent.tool==="calendar.create"){throw new Error("La creación de eventos se habilitará después de validar el formato de fecha/hora.");}
if(intent.type==="action" && intent.task==="generate_document"){ const format=/pptx|powerpoint/i.test(q)?"pptx":/word|docx/i.test(q)?"docx":"pdf"; const body=q.replace(/^(emma[,:]?\s*)?(crea|genera|hazme|prepara)\s*/i,""); const artifact=await generateDocument({format,title:"Documento Emma",body}); renderArtifact(result,artifact); addArtifactMessage(artifact); addMessage("assistant","Listo. Generé el documento y lo dejé aquí mismo."); speak("Listo. Generé el documento."); return; }
if(intent.type==="action" && intent.tool==="mail.send"){const email=parseSendEmail(q);if(!email)throw new Error("Formato: envía un correo a EMAIL asunto: ASUNTO cuerpo: MENSAJE");if(!window.confirm(`Enviar desde Astra a ${email.to[0]}?\\n\\nAsunto: ${email.subject}`)){addMessage("assistant","Envío cancelado.");return}const data=await invokeMail("send",email);result.textContent=JSON.stringify(data,null,2);const reply=data?.sent?"Correo enviado desde "+data.mailbox+".":"No se confirmó el envío.";addMessage("assistant",reply);speak(reply);return}
if(intent.type==="tool" && intent.tool==="mail.read"){const data=await invokeMail(q.match(/(?:busca|buscar|encuentra)\s+(.+)/i)?.[1]?"search":"list",{q:q.match(/(?:busca|buscar|encuentra)\s+(.+)/i)?.[1]||""});result.textContent=JSON.stringify(data,null,2);const reply=formatMail(data);addMessage("assistant",reply);speak(data?.count?(`Encontré ${data.count} correos.`):reply);return}
if(intent.type==="tool"&&intent.tool){const data=intent.tool==="github.read"?await invokeGitHub(q):await invokeTool(intent.tool,intent.tool==="astra.search_supplier"?{q:normalizeSupplierQuery(q),limit:10}:{q,limit:10});const output=JSON.stringify(data,null,2);result.textContent=output;let reply;if(intent.tool==="github.read"&&data?.ok&&data?.content){reply="Leí "+(data.path||"el archivo")+" del repositorio. El contenido quedó visible en el panel de resultados."}else{reply=data?.count?"Encontré "+data.count+" resultado"+(data.count===1?"":"s")+".":"No encontré resultados."}addMessage("assistant",reply);speak(reply);return}
const answer=await invokeChat(q);addMessage("assistant",answer);result.textContent=answer;speak(answer)
}catch(e){result.textContent="Error: "+e.message;addMessage("assistant","No pude completar la solicitud: "+e.message);speak("No pude completar la solicitud.")}finally{if(orb.getState()==="thinking")orb.setState("idle")}}
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
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js?v=11").catch(()=>{});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;install.classList.remove("hidden")});install.onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;install.classList.add("hidden")};