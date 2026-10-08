import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.0";
import { CONFIG } from "./config.js";
import { createOrb } from "./modules/orb.js";
import { chooseOrb } from "./modules/orb-personality.js";
import { getEmmaPersonality } from "./modules/emma-personality.js";
import { discoverLocalBridge, bridgeCommand } from "./modules/local-bridge.js";
import { registerAdapter, listAdapters } from "./modules/adapter-registry.js";
import { autonomyPolicy } from "./modules/evidence-policy.js";
import { createVoice, detectLanguage, normalizeVoiceText } from "./modules/voice.js";
import { getTool, TOOL_REGISTRY } from "./core/tool-registry.js?v=27";
import { buildEmmaRuntime } from "./core/emma-runtime.js?v=1";
import { normalizeSupplierQuery } from "./core/query-normalizer.js";
import { formatSupplierIntelligence } from "./modules/supplier-intelligence.js";
import { analyzeDocuments } from "./modules/document-intelligence.js";
import { analyzeProcurement } from "./modules/procurement-intelligence.js";
import { buildExecutionPlan } from "./core/execution-plan.js";
import { planExecution, executionResult } from "./core/execution-orchestrator.js";
import { automationPlan } from "./core/automation-engine.js";
import { rankTools, PERFORMANCE_RULE } from "./core/performance-engine.js";
import { saveSnapshot, loadSnapshot, isOffline } from "./core/offline-core.js";
import { runResearchAgent } from "./modules/research-agent.js?v=1";
import { TRADING_AGENTS } from "./modules/trading-lab.js";
import { createMobileBridge } from "./modules/mobile-bridge.js";
const supabase=createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey);
const $=s=>document.querySelector(s);
const command=$("#command"),messages=$("#messages"),chat=$("#chat"),home=$("#home");
const logout=$("#logout"),install=$("#install"),result=$("#result")||document.createElement("pre");
let voice=null;
let audioContext=null;
function primeAudio(){try{if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});return true}catch{return false}}
const emmaPersonality=getEmmaPersonality();
const orbChoice=chooseOrb(emmaPersonality.visual.orb+" strategic analytical procurement oracle");
const orb=createOrb({root:$("#orb"),status:$("#orb-status"),onActivate:()=>voice?.start()});
orb.setAppearance?.(orbChoice);
document.documentElement.dataset.emmaOrb=orbChoice.id;
let localBridge=null;
let mobileBridge=null;
async function refreshLocalBridge(){try{const b=await discoverLocalBridge();localBridge=b;orb.setConnection?.(Boolean(b));registerAdapter({id:"local-computer",name:"Emma Local Computer",kind:"desktop",status:b?"connected":"offline",capabilities:["browser","files","apps","screen"],connect:async()=>b});return b}catch{return null}}
refreshLocalBridge();
setInterval(()=>{if(!localBridge)refreshLocalBridge()},5000);
voice=createVoice({orb,onTranscript:t=>{const normalized=normalizeVoiceText(t);command.value=normalized;execute(normalized)},onError:e=>setStatus(e)});
let deferredInstall=null,history=[];
function setStatus(text){$("#orb-status").textContent=text}
async function speak(text){if(new URLSearchParams(location.search).has("e2e"))return;if(!text)return;const language=detectLanguage(text);orb.setState("speaking");try{primeAudio();const session=(await supabase.auth.getSession()).data.session;if(!session?.access_token)throw new Error("AUTH_SESSION");const response=await fetch(`${CONFIG.supabaseUrl}/functions/v1/jarvis-voice`,{method:"POST",headers:{"Authorization":`Bearer ${session.access_token}`,"apikey":CONFIG.supabasePublishableKey,"Content-Type":"application/json"},body:JSON.stringify({text,language_code:language==="en"?"en":"es",model_id:"eleven_flash_v2_5"})});if(!response.ok)throw new Error("ELEVENLABS_TTS: "+(await response.text()).slice(0,500));const bytes=await response.arrayBuffer();if(audioContext?.state==="suspended")await audioContext.resume();if(!audioContext)throw new Error("AUDIO_CONTEXT_UNAVAILABLE");const buffer=await audioContext.decodeAudioData(bytes.slice(0));const source=audioContext.createBufferSource();source.buffer=buffer;source.connect(audioContext.destination);source.onended=()=>orb.setState("idle");source.start(0)}catch(e){orb.setState("idle");setStatus((e?.message||"ELEVENLABS_ERROR").slice(0,120));console.error("Emma voice:",e)}}
function addMessage(role,text){const el=document.createElement("div");el.className="message "+role;el.textContent=text;messages.appendChild(el);messages.scrollTop=messages.scrollHeight}
async function addArtifactMessage(artifact){const {renderArtifact}=await import("./modules/documents.js");const el=document.createElement("div");el.className="message assistant artifact-message";const card=document.createElement("div");renderArtifact(card,artifact);el.appendChild(card);messages.appendChild(el);messages.scrollTop=messages.scrollHeight}
function renderModules(){modulesNav.innerHTML="";Object.entries(modules).forEach(([key,m])=>{const b=document.createElement("button");b.textContent=m.label;b.dataset.module=key;b.className=key===activeModule?"active":"";b.onclick=()=>selectModule(key);modulesNav.appendChild(b)})}
function selectModule(key){activeModule=modules[key]?key:"conversation";moduleTitle.textContent=modules[activeModule].label;moduleContent.innerHTML="<p class='module-description'>"+modules[activeModule].description+"</p>";modulesNav.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.module===activeModule))}
function renderSession(session){const signed=Boolean(session?.user);home.classList.remove("hidden");chat.classList.remove("hidden");logout.classList.toggle("hidden",!signed);home.classList.toggle("compact",!signed);if(signed)setStatus("EMMA LISTA");else setStatus("EMMA LISTA · MODO BÁSICO")}
async function withTimeout(promise,ms,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label)),ms)})])}finally{clearTimeout(timer)}}
async function ensureAuth(){
 setStatus("CONECTANDO EMMA");
 try{
  const current=await withTimeout(supabase.auth.getSession(),8000,"AUTH_SESSION_TIMEOUT");
  if(current.data?.session){renderSession(current.data.session);return current.data.session}
  const anon=await withTimeout(supabase.auth.signInAnonymously(),10000,"AUTH_ANON_TIMEOUT");
  if(anon.error||!anon.data?.session)throw new Error(anon.error?.message||"AUTH_ANON_FAILED");
  renderSession(anon.data.session);
  return anon.data.session;
 }catch(error){
  console.error("Emma auth:",error);
  setStatus("ERROR DE CONEXIÓN");
  throw new Error("AUTH: "+(error?.message||"No se pudo autenticar Emma."));
 }
}
async function invoke(name,body){await ensureAuth();const {data,error}=await supabase.functions.invoke(name,{body});if(!error)return data;let detail="";try{if(error.context){const response=error.context instanceof Response?error.context:null;if(response){const clone=response.clone();try{const payload=await clone.json();detail=payload?.error||payload?.message||JSON.stringify(payload)}catch{detail=await response.text()}}}}catch{}throw new Error((detail||error.message||"Edge Function error").slice(0,800))}
async function invokeContext(q){if(isOffline()){const snap=await loadSnapshot();if(snap?.data)return{data:snap.data,offline:true,saved_at:snap.saved_at};throw new Error("OFFLINE_NO_SNAPSHOT")}const data=await invokeTool("emma.core",{q,limit:8});await saveSnapshot(data?.data||data);return data}
async function getGlobalContext(q){try{return await invokeContext(q)}catch{return null}}

function executionRegistry(){return Object.fromEntries(Object.entries(TOOL_REGISTRY).map(([id,t])=>[id,t]))}
async function orchestrateQuery(q){
 const lower=q.toLowerCase();
 const kind=/correo|email|gmail/.test(lower)?"email":/calendario|reunión|reunion|agenda/.test(lower)?"calendar":/github|código|codigo|repo/.test(lower)?"project":/documento|coa|sds|iscc|ficha/.test(lower)?"documents":"supplier";
 const intentMap={supplier:["astra.intelligence","document.intelligence","procurement.intelligence"],email:["gmail.read"],calendar:["calendar.read"],project:["github.read"],documents:["astra.documents","document.intelligence","procurement.intelligence"]};
 const planned=rankTools(intentMap[kind].map(id=>getTool(id)).filter(Boolean));
 const runtime=buildEmmaRuntime(q,{externalData:true,parallelizable:true});
 const ctx=planExecution({query:q,tools:planned.map(t=>t.id),registry:executionRegistry(),route:runtime.route,budget:runtime.budget});
 const settled=await Promise.allSettled(planned.map(async t=>{
   if(t.id==="github.read")return{id:t.id,data:await invokeGitHub(q)};
   return{id:t.id,data:await invokeTool(t.id,{q,limit:10})};
 }));
 const steps=settled.map((r,i)=>r.status==="fulfilled"
   ?executionResult(ctx,{id:planned[i].id,status:"ok",data:r.value.data,source:getTool(planned[i].id)?.functionName||"local"}).steps.find(s=>s.id===planned[i].id)
   :executionResult(ctx,{id:planned[i].id,status:"error",error:r.reason?.message||"Tool failed",source:getTool(planned[i].id)?.functionName||"local"}).steps.find(s=>s.id===planned[i].id));
 return{status:steps.some(s=>s.status==="error")?"partial":"completed",kind,performance_rule:PERFORMANCE_RULE,steps,results:settled.map((r,i)=>({tool:planned[i].id,status:r.status,data:r.status==="fulfilled"?r.value.data:undefined,error:r.status==="rejected"?(r.reason?.message||"Tool failed"):undefined}))};
}
function parseDueAt(q){const rel=q.match(/en\s+(\d+)\s*(minutos?|horas?)/i);if(!rel)return null;const d=new Date();d.setMinutes(d.getMinutes()+Number(rel[1])*(rel[2].toLowerCase().startsWith("hora")?60:1));return d.toISOString()}
function parseTaskTitle(q){return q.replace(/^(?:emma[,\s]*)?(?:pon|crea|agrega|añade|anota|apunta|programa|recuérdame|recuerdame|alarma|recordatorio)\s*/i,"").trim()||q}
async function invokeChat(q,context=null){
  await ensureAuth();
  const session=(await supabase.auth.getSession()).data.session;
  if(!session?.access_token)throw new Error("AUTH_SESSION");
  const response=await fetch(`${CONFIG.supabaseUrl}/functions/v1/jarvis-chat`,{
    method:"POST",
    headers:{"Authorization":`Bearer ${session.access_token}`,"apikey":CONFIG.supabasePublishableKey,"Content-Type":"application/json"},
    body:JSON.stringify({message:q,history,context,client_date:new Date().toLocaleDateString("en-CA")}),cache:"no-store"
  });
  if(!response.ok)throw new Error((await response.text()).slice(0,800));
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/event-stream")){
    const data=await response.json();
    const answer=data?.text?.trim()||"No recibí una respuesta del núcleo.";
    history.push({role:"user",content:q},{role:"assistant",content:answer});
    history=history.slice(-10);
    return answer;
  }
  let answer="",buffer="";
  const reader=response.body.getReader(),decoder=new TextDecoder();
  const bubble=document.createElement("div");
  bubble.className="message assistant";
  messages.appendChild(bubble);
  for(;;){
    const x=await reader.read();
    if(x.done)break;
    buffer+=decoder.decode(x.value,{stream:true});
    const lines=buffer.split("\n");buffer=lines.pop()||"";
    for(const line of lines){
      if(!line.startsWith("data:"))continue;
      const p=line.slice(5).trim();
      if(!p||p==="[DONE]")continue;
      const chunk=JSON.parse(p);
      if(chunk.type==="delta"){
        answer+=chunk.text||"";
        bubble.textContent=answer;
        messages.scrollTop=messages.scrollHeight;
      }
      if(chunk.type==="error")throw new Error(chunk.message||"STREAM_ERROR");
    }
  }
  history.push({role:"user",content:q},{role:"assistant",content:answer});
  history=history.slice(-10);
  return answer;
}
async function invokeGitHub(q){const tool=getTool("github.read");const match=q.match(/(?:archivo|file|ruta|path)\s+([\w./-]+)$/i);const path=match?.[1]||"README.md";return await invoke(tool.functionName,{repository:"astraoilandgas2026/AOG-Jarvis",path})}
async function invokeTool(toolId,body={}){const tool=getTool(toolId);if(!tool?.functionName)throw new Error("TOOL_CONFIG: "+toolId);return await invoke(tool.functionName,{tool:toolId,...body})}
async function invokeGoogle(action,body={}){const res=await fetch(CONFIG.googleBridgeUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...body})});const data=await res.json();if(!data?.ok)throw new Error("GOOGLE_BRIDGE: "+(data?.error||"solicitud rechazada"));return data}
async function invokeMail(action,body={}){const tool=getTool(action==="send"?"mail.send":"mail.read");if(!tool?.functionName)throw new Error("TOOL_CONFIG: correo no configurado");return await invoke(tool.functionName,{action,...body})}
function parseSendEmail(q){const match=q.match(/(?:envía|envia|manda|mandar)\s+(?:un\s+)?(?:correo|email|mail)\s+(?:a|para)\s+([^\s]+)\s+(?:con\s+)?(?:asunto|subject)\s*[:=-]\s*(.+?)\s+(?:cuerpo|body|mensaje)\s*[:=-]\s*([\s\S]+)$/i);if(!match)return null;return{to:[match[1]],subject:match[2].trim(),text:match[3].trim()}}
function formatMail(data){const rows=data?.data||[];if(!rows.length)return data?.mailbox?"No hay correos que coincidan en "+data.mailbox+".":"No encontré correos.";return rows.slice(0,10).map((m,i)=>`${i+1}. ${m.subject||"(sin asunto)"} — ${m.from?.address||"remitente desconocido"} — ${m.date?new Date(m.date).toLocaleString("es-CL"): ""} [UID ${m.uid}]`).join("\n")}
async function handleOperationalCommand(q){
 const l=q.toLowerCase();
 if(l.includes("personalidad emma")||l.includes("quién eres")||l.includes("quien eres")){const p=getEmmaPersonality();addMessage("assistant","Soy Emma: "+p.role+". Perfil: "+p.traits.join(", ")+". Trabajo con evidencia y separo lo reclamado de lo verificado.");return true}
 if(l.includes("estado backup")||l.includes("estado del backup")||l.includes("estado del respaldo")){if(!localBridge)throw new Error("LOCAL_BRIDGE_OFFLINE");const data=await bridgeCommand(localBridge,"backup/status",{});result.textContent=JSON.stringify(data,null,2);addMessage("assistant",data.status==="current"?"Backup local al día.":"Backup local: "+data.status+".");return true}
 if(l.includes("backup")||l.includes("respaldo")){if(!localBridge)throw new Error("LOCAL_BRIDGE_OFFLINE");const data=await bridgeCommand(localBridge,"backup/create",{});result.textContent=JSON.stringify(data,null,2);addMessage("assistant",data.ok?"Respaldo local creado en la computadora. "+data.files+" archivos.":"Respaldo local parcial. "+data.files+" archivos, "+data.errors+" errores.");return true}

 if(l.includes("estado emma")||l.includes("status emma")){
  const data={adapters:listAdapters(),local_bridge:Boolean(localBridge),tools:Object.keys(TOOL_REGISTRY).length};
  result.textContent=JSON.stringify(data,null,2);addMessage("assistant",localBridge?"Emma operativa. Browser local conectado.":"Emma operativa. Browser local offline.");return true;
 }
 if(l.includes("mis automatizaciones")||l.includes("automatizaciones activas")){
  const data=await invokeTool("automation.list",{limit:10});result.textContent=JSON.stringify(data,null,2);addMessage("assistant",data?.count?"Tienes "+data.count+" automatizaciones activas.":"No tienes automatizaciones activas.");return true;
 }
 if(l.startsWith("qué recuerdas")||l.startsWith("que recuerdas")||l.includes("busca en tu memoria")){
  const data=await invokeTool("memory.read",{q:q,limit:8});result.textContent=JSON.stringify(data,null,2);const answer=data?.count?data.data.map((m,i)=>(i+1)+". "+m.content).join("\n"):"No tengo memorias relevantes registradas.";addMessage("assistant",answer);return true;
 }
 return false;
}

function fastReply(q){
  const exact=q.match(/^responde solamente:\s*(.+)$/i);if(exact)return exact[1].trim();
  if(/^(hola|holi|hey|hello|buenas)([!.?,¿¡\s]*(emma)?[!.?,¿¡\s]*)?(cómo|como) (estás|estas)[?!.\s]*$/i.test(q))return "Bien, Leíto. Aquí contigo. ¿Qué hacemos?";
  if(/^(hola|holi|hey|hello|buenas)[!.?,\s]*$/i.test(q))return "Hola, Leíto. Aquí estoy.";
  return null;
}
async function execute(text){primeAudio();const q=text.trim();if(!q)return;command.value="";addMessage("user",q);if(await handleOperationalCommand(q)){speak("Listo.");return}const quick=fastReply(q);if(quick){addMessage("assistant",quick);speak(quick);return}orb.setState("thinking");try{const explicitMemory=/(?:recuerda|acuérdate|acuerdate|anota|apunta|guarda|memoriza|no olvides)/i.test(q);const explicitTask=/(?:recuérdame|recuerdame|recordatorio|alarma|pon una alarma|anota como pendiente|apunta como pendiente|agrega una tarea|añade una tarea)/i.test(q);const explicitTaskList=/(?:mis tareas|tareas pendientes|mis pendientes|qué tengo pendiente|que tengo pendiente|recordatorios pendientes)/i.test(q);const runtime=buildEmmaRuntime(q,{requiresEvidence:/verifica|evidencia|fuente|dd|due diligence|riesgo|iscc|ffa|acidez|capacidad|exportación|exportacion/i.test(q),externalData:/investiga|internet|web|fuentes/i.test(q),parallelizable:/\b(5|varios|varias|múltiples|multiples|compara|cruza)\b/i.test(q)});
const intent=explicitMemory?{type:"memory_write",module:"memory"}:explicitTask?{type:"task_create",module:"automation"}:explicitTaskList?{type:"task_list",module:"automation"}:runtime.intent;
if(intent.type==="memory_write"){
 const memoryText=q.replace(/^(?:emma[,\\s]*)?(?:recuerda|acuérdate|acuerdate|anota|apunta|guarda|memoriza|no olvides)\\s*(?::|-)?\\s*/i,"").trim()||q;
 const data=await invokeTool("memory.write",{q:memoryText,domain:"personal",memory_type:"note",importance:5,source:"emma"});
 const answer=data?.ok?"Memoria anotada y guardada.":"No se pudo guardar la memoria.";
 addMessage("assistant",answer);speak(answer);return;
}
if(intent.type==="task_create"){
 const title=parseTaskTitle(q);
 const dueAt=parseDueAt(q);
 const priority=/prioridad|urgente|máxima|máximo/i.test(q)?"high":"normal";
 const data=await invokeTool("personal.task.create",{q:title,due_at:dueAt,priority,source:"emma"});
 const answer=data?.ok?"Pendiente programado: "+(data.data?.title||title)+".":"No se pudo programar el pendiente.";
 addMessage("assistant",answer);speak(answer);return;
}
if(intent.type==="task_list"){
 const data=await invokeTool("personal.task.list",{limit:10});
 let answer="No tienes pendientes.";
 if(data?.count){
   const rows=data.data.map((t,i)=>{const due=t.due_at?" — "+new Date(t.due_at).toLocaleString("es-CL"):"";return (i+1)+". "+t.title+due;});
   answer="Tienes "+data.count+" pendientes.\\n"+rows.join("\\n");
 }
 addMessage("assistant",answer);speak(answer);return;
}
if(intent.tool==="execution.plan"){const kind=/correo|email|gmail/.test(q)?"email":/calendario|reunión|reunion|agenda/.test(q)?"calendar":/github|código|codigo|repo/.test(q)?"project":/documento|coa|sds|iscc|ficha/.test(q)?"documents":"supplier";const data=buildExecutionPlan(kind,executionRegistry());result.textContent=JSON.stringify(data,null,2);addMessage("assistant",`Plan ${kind} listo: ${data.steps.length} pasos, priorizando herramientas existentes y cero LLM innecesario.`);return}
if(intent.tool==="execution.orchestrator"){const data=await orchestrateQuery(q);result.textContent=JSON.stringify(data,null,2);const ok=data.status==="completed";const answer=ok?"Orquestación ejecutada: "+data.steps.length+" pasos reales, sin LLM innecesario.":"Orquestación parcial: "+data.steps.length+" pasos, revisa los errores en resultados.";addMessage("assistant",answer);speak(answer);return}
if(intent.tool==="automation.plan"){const data=automationPlan(q);result.textContent=JSON.stringify(data,null,2);const answer=data.supported?"Recurrencia detectada: "+data.cadence+". Plan listo para persistir/programar.":"No puedo programar esa recurrencia todavía: "+data.reason;addMessage("assistant",answer);speak(answer);return}
if(intent.tool==="binance.paper-order"){
 if(!localBridge)throw new Error("LOCAL_BRIDGE_OFFLINE: inicia Emma Local Bridge para Binance.");
 const symbolMatch=q.match(/\b(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|AVAX|LINK)USDT\b/i);
 const side=/\b(sell|vende|vender)\b/i.test(q)?"SELL":"BUY";
 const qtyMatch=q.match(/(?:cantidad|qty|quantity)\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
 const quantity=qtyMatch?.[1]||"0.00001";
 if(window.confirm("Enviar orden de prueba a Binance Spot Testnet?\n\n"+side+" "+(symbolMatch?.[0]||"BTCUSDT")+" qty "+quantity)===false){addMessage("assistant","Orden de prueba cancelada.");return}
 const data=await bridgeCommand(localBridge,"binance/paper-order",{symbol:(symbolMatch?.[0]||"BTCUSDT").toUpperCase(),side,quantity,type:"MARKET"});
 result.textContent=JSON.stringify(data,null,2);
 const answer=data?.data?.ok?"Orden de prueba aceptada por Binance Testnet.":"Binance Testnet: "+(data?.data?.error||"sin confirmación");
 addMessage("assistant",answer);speak(answer);return;
}
if(intent.tool==="freqtrade.status"){
 if(!localBridge)throw new Error("LOCAL_BRIDGE_OFFLINE: inicia Emma Local Bridge para Freqtrade.");
 const data=await bridgeCommand(localBridge,"freqtrade/status",{});
 result.textContent=JSON.stringify(data,null,2);
 const d=data?.data||data;
 const answer="Freqtrade: "+(d?.configured?"configurado":"NO configurado")+" | motor: "+(d?.ping?.ok?"OK":"OFFLINE")+" | autenticación: "+(d?.authenticated?"OK":"pendiente")+".";
 addMessage("assistant",answer);speak(answer);return;
}
if(intent.tool==="binance.status"||intent.tool==="binance.balance"){
 if(!localBridge)throw new Error("LOCAL_BRIDGE_OFFLINE: inicia Emma Local Bridge para Binance.");
 const route=intent.tool==="binance.balance"?"binance/balance":"binance/status";
 const data=await bridgeCommand(localBridge,route,{});
 result.textContent=JSON.stringify(data,null,2);
 const d=data?.data||data;
 const answer=route==="binance/status"
   ?("Binance: "+(d?.environment||"desconocido")+" | API: "+(d?.credentials_configured?"configurada":"NO configurada")+" | conexión: "+(d?.ping?.ok?"OK":"ERROR")+".")
   :(d?.ok?"Balance Binance consultado.":"No se pudo consultar el balance: "+(d?.error||"error"));
 addMessage("assistant",answer);speak(answer);return;
}
if(intent.tool==="trading.status"){
 if(!localBridge)throw new Error("LOCAL_BRIDGE_OFFLINE: inicia Emma Local Bridge para Trading Lab.");
 const data=await bridgeCommand(localBridge,"trading/status",{});
 result.textContent=JSON.stringify(data,null,2);
 const answer=data?.ok?"Trading Lab: "+data.status.mode+". Kill switch: "+(data.kill_switch?"ACTIVO":"INACTIVO")+". Apalancamiento: "+data.status.leverage+".":"No se pudo consultar Trading Lab.";
 addMessage("assistant",answer);speak(answer);return;
}
if(intent.tool==="trading.kill"){
 if(!localBridge)throw new Error("LOCAL_BRIDGE_OFFLINE: inicia Emma Local Bridge para Trading Lab.");
 const data=await bridgeCommand(localBridge,"trading/kill",{active:true,reason:"Emma command"});
 result.textContent=JSON.stringify(data,null,2);
 addMessage("assistant","Kill switch de trading ACTIVADO. No se permiten ejecuciones.");speak("Kill switch activado.");return;
}
if(intent.tool==="trading.market"||intent.tool==="trading.scan"){
 if(!localBridge)throw new Error("LOCAL_BRIDGE_OFFLINE: inicia Emma Local Bridge para Trading Lab.");
 const symbolMatch=q.match(/\b(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|AVAX|LINK)(?:USDT|USD)?\b/i);
 const symbol=(symbolMatch?.[1]||"BTC")+"USDT";
 const intervalMatch=q.match(/\b(1m|3m|5m|15m|30m|1h|2h|4h)\b/i);
 const interval=intervalMatch?.[1]||"1m";
 const commandName=intent.tool==="trading.scan"?"trading/scan":"trading/market";
 const data=await bridgeCommand(localBridge,commandName,{symbol,interval,limit:120});
 result.textContent=JSON.stringify(data,null,2);
 const d=data?.data;
 const answer=intent.tool==="trading.scan"
   ?(d?.status==="ok"?("Setup "+symbol+" "+interval+": "+d.direction+" | score "+d.score+" | "+d.action+". Datos de mercado, no ejecución."):("Scanner: "+(d?.reason||"sin datos suficientes")+"." ))
   :("Market data "+symbol+" "+interval+" cargada.");
 addMessage("assistant",answer);speak(answer);return;
}
if(intent.tool==="trading.research"){
 const rows=Object.values(TRADING_AGENTS);
 const answer=rows.map(a=>a.name+" — "+a.role+" ["+a.status+"]").join("\n");
 result.textContent=JSON.stringify({agents:TRADING_AGENTS},null,2);
 addMessage("assistant",answer);speak("Registro de agentes de trading cargado.");return;
}
if(intent.tool==="trading.backtest"||intent.tool==="trading.paper"){
 if(!localBridge)throw new Error("LOCAL_BRIDGE_OFFLINE: inicia Emma Local Bridge para Trading Lab.");
 const providerMatch=q.match(/\b(jesse|freqtrade|octobot)\b/i);
 const provider=(providerMatch?.[1]||"jesse").toLowerCase();
 if(intent.tool==="trading.paper"&&!/paper|simulad|demo|sin dinero/i.test(q))throw new Error("PAPER_MODE_REQUIRED");
 if(intent.tool==="trading.paper"&&window.confirm("Enviar esta estrategia al adaptador PAPER de "+provider+"?")===false){addMessage("assistant","Paper trading cancelado.");return}
 const data=await bridgeCommand(localBridge,"trading/adapter",{action:intent.tool==="trading.backtest"?"backtest":"paper",provider,query:q});
 result.textContent=JSON.stringify(data,null,2);
 const answer=data?.ok?"Trading "+(intent.tool==="trading.backtest"?"backtest":"paper")+" enviado a "+provider+".":"Adaptador "+provider+": "+(data?.error||"sin confirmación");
 addMessage("assistant",answer);speak(answer);return;
}
if(intent.tool==="gmail.read"){const data=await invokeGoogle("gmail.list",{query:q.match(/(?:busca|buscar|encuentra)\s+(.+)/i)?.[1]||"in:inbox",max:10});result.textContent=JSON.stringify(data,null,2);const reply=data?.count?`Encontré ${data.count} correos en Gmail.`:"No encontré correos en Gmail.";addMessage("assistant",reply);speak(reply);return}
if(intent.type==="action"&&intent.tool==="gmail.send"){const m=q.match(/(?:gmail.*?)(?:a|para)\s+([^\s]+).*?(?:asunto|subject)\s*[:=-]\s*(.+?)\s+(?:cuerpo|body|mensaje)\s*[:=-]\s*([\s\S]+)$/i);if(!m)throw new Error("Formato: Gmail a EMAIL asunto: ASUNTO cuerpo: MENSAJE");if(!window.confirm(`Enviar Gmail a ${m[1]}?\n\nAsunto: ${m[2]}`)){addMessage("assistant","Envío cancelado.");return}const data=await invokeGoogle("gmail.send",{to:m[1],subject:m[2].trim(),text:m[3].trim()});result.textContent=JSON.stringify(data,null,2);addMessage("assistant",data?.sent?"Gmail enviado.":"No se confirmó el envío.");speak(data?.sent?"Gmail enviado.":"No se confirmó el envío.");return}
if(intent.tool==="calendar.read"){const data=await invokeGoogle("calendar.list",{});result.textContent=JSON.stringify(data,null,2);const reply=data?.count?`Encontré ${data.count} eventos en tu calendario.`:"No hay eventos en el período consultado.";addMessage("assistant",reply);speak(reply);return}
if(intent.type==="action"&&intent.tool==="calendar.create"){
 const m=q.match(/(?:calendario|calendar).*?(?:el|para)?\s*(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](20\d{2}))?.*?(?:a las|a la|at)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
 if(!m)throw new Error("Formato: calendario DD/MM/YYYY a las HH:MM");
 const day=Number(m[1]),month=Number(m[2])-1,year=Number(m[3]||new Date().getFullYear()),hourRaw=Number(m[4]),minute=Number(m[5]||0),ampm=(m[6]||"").toLowerCase();
 let hour=hourRaw;if(ampm==="pm"&&hour<12)hour+=12;if(ampm==="am"&&hour===12)hour=0;
 const start=new Date(year,month,day,hour,minute);if(Number.isNaN(start.getTime()))throw new Error("Fecha/hora inválida.");
 const end=new Date(start.getTime()+60*60*1000);
 if(!window.confirm("Crear evento en Google Calendar?\n\n"+start.toLocaleString("es-CL")+"\n"+q)){addMessage("assistant","Creación cancelada.");return}
 const data=await invokeGoogle("calendar.create",{summary:q.replace(/^.*?(?:calendario|calendar)\s*/i,"").slice(0,160)||"Emma",start:start.toISOString(),end:end.toISOString()});
 result.textContent=JSON.stringify(data,null,2);const reply=data?.created?"Evento creado en Google Calendar.":"No se confirmó la creación del evento.";addMessage("assistant",reply);speak(reply);return;
}
if(intent.type==="action"&&intent.task==="generate_document"){const {generateDocument,renderArtifact}=await import("./modules/documents.js");const format=/pptx|powerpoint/i.test(q)?"pptx":/word|docx/i.test(q)?"docx":"pdf";const body=q.replace(/^(emma[,\s]?\s*)?(crea|genera|hazme|prepara)\s*/i,"");const artifact=await generateDocument({format,title:"Documento Emma",body});renderArtifact(result,artifact);await addArtifactMessage(artifact);addMessage("assistant","Listo. Generé el documento y lo dejé aquí mismo.");speak("Listo. Generé el documento.");return}
if(intent.type==="action"&&intent.tool==="mail.send"){const email=parseSendEmail(q);if(!email)throw new Error("Formato: envía un correo a EMAIL asunto: ASUNTO cuerpo: MENSAJE");if(!window.confirm(`Enviar desde Astra a ${email.to[0]}?\n\nAsunto: ${email.subject}`)){addMessage("assistant","Envío cancelado.");return}const data=await invokeMail("send",email);result.textContent=JSON.stringify(data,null,2);const reply=data?.sent?"Correo enviado desde "+data.mailbox+".":"No se confirmó el envío.";addMessage("assistant",reply);speak(reply);return}
if(intent.type==="tool"&&intent.tool==="mail.read"){const data=await invokeMail(q.match(/(?:busca|buscar|encuentra)\s+(.+)/i)?.[1]?"search":"list",{q:q.match(/(?:busca|buscar|encuentra)\s+(.+)/i)?.[1]||""});result.textContent=JSON.stringify(data,null,2);const reply=formatMail(data);addMessage("assistant",reply);speak(data?.count?(`Encontré ${data.count} correos.`):reply);return}
if(intent.type==="tool"&&intent.tool&&intent.tool.startsWith("astra.")){const body=intent.tool==="astra.search_supplier"?{q:normalizeSupplierQuery(q),limit:10}:{q,limit:10};const data=await invokeTool(intent.tool,body);result.textContent=JSON.stringify(data,null,2);const answer=intent.tool==="document.intelligence"?JSON.stringify(analyzeDocuments(data?.data||data),null,2):intent.tool==="procurement.intelligence"?JSON.stringify(analyzeProcurement(data?.data||data),null,2):(intent.tool==="astra.context"||intent.tool==="astra.intelligence")?formatSupplierIntelligence(data?.data||data):"Contexto Astra consultado y disponible en resultados para: "+q;addMessage("assistant",answer);speak(answer);return}
if(intent.type==="research"){
 if(!localBridge)throw new Error("LOCAL_BRIDGE_OFFLINE: inicia Emma Local Bridge para investigar en la web.");
 const researchQuery=q.replace(/^(?:emma[,\\s]*)?(?:investiga|investigar|busca|buscar|averigua|verifica|comprueba)\\s*/i,"").trim()||q;
 const bundle=await runResearchAgent({bridge:localBridge,query:researchQuery,invokeTool,limit:8});
 result.textContent=JSON.stringify(bundle,null,2);
 const answer="Investigación web ejecutada. "+bundle.sources.length+" fuentes analizadas. Estado: "+bundle.evidence_level+".";
 addMessage("assistant",answer);speak(answer);return;
}if(intent.type==="tool"&&intent.tool==="local.browser"){
 const match=q.match(/https?:\/\/[^\s]+/i);
 if(!localBridge)throw new Error("LOCAL_BRIDGE_OFFLINE: instala/inicia Emma Local Bridge en este equipo.");
 if(!match)throw new Error("LOCAL_BROWSER_URL_REQUIRED: indica una URL http(s).");
 const opened=await bridgeCommand(localBridge,"browser/open",{url:match[0]});
 const data=await bridgeCommand(localBridge,"browser/analyze",{});
 result.textContent=JSON.stringify(data,null,2);
 const answer="Navegador local conectado.\n"+(data.title||opened.title||"Página sin título")+"\n"+(data.url||opened.url);
 addMessage("assistant",answer);speak(answer);return;
}
if(intent.type==="tool"&&intent.tool){const data=intent.tool==="github.read"?await invokeGitHub(q):await invokeTool(intent.tool,intent.tool==="astra.search_supplier"?{q:normalizeSupplierQuery(q),limit:10}:{q,limit:10});const output=JSON.stringify(data,null,2);result.textContent=output;let reply;if(intent.tool==="github.read"&&data?.ok&&data?.content)reply="Leí "+(data.path||"el archivo")+" del repositorio. El contenido quedó visible en el panel de resultados.";else reply=data?.count?"Encontré "+data.count+" resultado"+(data.count===1?"":"s")+".":"No encontré resultados.";addMessage("assistant",reply);speak(reply);return}
const context=await getGlobalContext(q);const answer=await invokeChat(q,{source_context:context?.data||context,execution_route:runtime.route,execution_budget:runtime.budget});addMessage("assistant",answer);result.textContent=answer;speak(answer)
}catch(e){const msg=e?.message||String(e);result.textContent="Error: "+msg;addMessage("assistant","Error real: "+msg);speak("Encontré un error. Revisa el panel de resultados.")}finally{if(orb.getState()==="thinking")orb.setState("idle")}}
logout.onclick=()=>supabase.auth.signOut();$("#execute").onclick=()=>{primeAudio();execute(command.value)};$("#voice").onclick=()=>{primeAudio();voice?.start()};command.addEventListener("keydown",e=>{if(e.key==="Enter")execute(command.value)});
supabase.auth.onAuthStateChange((_event,session)=>renderSession(session));
const {data:{session}}=await supabase.auth.getSession();
if(session)renderSession(session);else{setStatus("CONECTANDO EMMA");try{await ensureAuth()}catch(error){setStatus("CONFIGURACIÓN DE ACCESO PENDIENTE");console.error("Anonymous auth unavailable",error)}}
try{ mobileBridge=createMobileBridge({supabase,onStatus:state=>{ if(state.connected) setStatus("EMMA LISTA · SAMSUNG CONECTADO"); },onTask:async task=>({ok:true,received:true,task_type:task.task_type})}); }catch(error){ console.warn("Emma Mobile Bridge:",error); }
setTimeout(()=>{invoke("jarvis-voice",{setup_voice:true}).catch(()=>{})},0);
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js?v=27",{updateViaCache:"none"}).catch(()=>{});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;install.classList.remove("hidden")});install.onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;install.classList.add("hidden")};