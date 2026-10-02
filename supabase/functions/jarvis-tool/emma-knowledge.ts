import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const STOP=new Set(["que","como","para","con","los","las","del","una","por","qué","quiero","tengo","este","esta","esto","desde","ahora","pero","tambien","también","sobre","cuando","donde","dónde"]);
export function normalizeEntity(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");}
export function tokenize(text:string){return [...new Set((text.toLowerCase().match(/[a-záéíóúñ0-9]{3,}/gi)||[]).filter(x=>!STOP.has(x)))].slice(0,16);}
export function classifyKnowledge(text:string){
  if(/\b(recuérd|recuerda|acuérdate|acuerdate|de ahora en adelante|siempre|nunca|prefiero|quiero que|no vuelvas)\b/i.test(text))return "memory";
  if(/\b(decid|acord|confirm|quedamos|cerramos|aprob|rechaz|vamos a)\b/i.test(text))return "decision";
  if(/\b(reunión|reunion|llamada|follow.?up|fecha|mañana|lunes|martes|miércoles|miercoles|jueves|viernes|cita)\b/i.test(text))return "commitment";
  if(/\b(investig|busca|averigua|verifica|comprueba|fuente|internet)\b/i.test(text))return "research";
  if(/\b(no es|es con|correg|incorrecto|está mal|esta mal|cambia|corrección|correccion)\b/i.test(text))return "correction";
  if(/\b(es|son|tiene|tenemos|hay|precio|volumen|capacidad|producto|proveedor|empresa|contacto|fecha|plazo)\b/i.test(text))return "fact";
  return "raw";
}
function pad(n:number){return String(n).padStart(2,"0")}
function parseDateToken(value:string,base=new Date()){
  const y=base.getUTCFullYear(),m=base.getUTCMonth(),d=base.getUTCDate();
  const low=value.toLowerCase();
  if(low==="hoy")return `${y}-${pad(m+1)}-${pad(d)}`;
  if(low==="mañana"||low==="manana"){const x=new Date(Date.UTC(y,m,d+1));return `${x.getUTCFullYear()}-${pad(x.getUTCMonth()+1)}-${pad(x.getUTCDate())}`}
  const weekdays=["domingo","lunes","martes","miércoles","miercoles","jueves","viernes","sábado","sabado"];
  const idx=weekdays.indexOf(low); if(idx>=0){const cur=base.getUTCDay();let delta=(idx-cur+7)%7;if(delta===0)delta=7;const x=new Date(Date.UTC(y,m,d+delta));return `${x.getUTCFullYear()}-${pad(x.getUTCMonth()+1)}-${pad(x.getUTCDate())}`}
  const iso=value.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/); if(iso)return `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;
  const lat=value.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/); if(lat)return `${lat[3]}-${pad(Number(lat[2]))}-${pad(Number(lat[1]))}`;
  return null;
}
export function extractDates(text:string){
  const out=new Set<string>();
  for(const m of text.matchAll(/\b(?:hoy|mañana|manana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/gi)){const d=parseDateToken(m[0]);if(d)out.add(d)}
  for(const m of text.matchAll(/\b(?:20\d{2}[-\/](?:0?[1-9]|1[0-2])[-\/](?:0?[1-9]|[12]\d|3[01])|(?:0?[1-9]|[12]\d|3[01])[\/.-](?:0?[1-9]|1[0-2])[\/.-]20\d{2})\b/g)){const d=parseDateToken(m[0]);if(d)out.add(d)}
  return [...out];
}
export async function resolveEntities(db:any,userId:string,text:string){
  const normalized=normalizeEntity(text),tokens=tokenize(text);
  if(!normalized||!tokens.length)return [];
  const {data,error}=await db.from("emma_entity_aliases").select("canonical_node_key,entity_type,alias,normalized_alias,confidence").eq("active",true).or(`user_id.is.null,user_id.eq.${userId}`).limit(3000);
  if(error)throw error;
  const scored=(data||[]).map((e:any)=>{
    const alias=String(e.normalized_alias||"");if(!alias)return null;
    const aliasTokens=alias.split(" ").filter(Boolean);
    const overlap=aliasTokens.filter((t:string)=>tokens.includes(t)).length;
    const exact=normalized===alias?1:0;
    const contained=normalized.includes(alias)?1:0;
    const coverage=aliasTokens.length?overlap/aliasTokens.length:0;
    const canonicalBoost=/^(supplier|product|project|contact|document|offer|dd|certification|logistics):/.test(String(e.canonical_node_key||""))?12:0;
    const recordPenalty=String(e.entity_type||"").startsWith("record:")?-12:0;
    const score=exact*120+contained*35+coverage*30+(Number(e.confidence)||0)*10+canonicalBoost+recordPenalty;
    return score>0?{...e,_score:score}:null;
  }).filter(Boolean).sort((a:any,b:any)=>b._score-a._score);
  const seen=new Set<string>(),out:any[]=[];
  for(const e of scored){
    const key=`${e.canonical_node_key}|${e.entity_type}`;
    if(seen.has(key))continue;
    seen.add(key);out.push({canonical_node_key:e.canonical_node_key,entity_type:e.entity_type,alias:e.alias,normalized_alias:e.normalized_alias,confidence:Number(e.confidence)||0});
    if(out.length>=12)break;
  }
  return out;
}
export async function ensureEntityAliases(db:any,userId:string){
  const {data:nodes,error}=await db.from("emma_graph_nodes").select("node_key,entity_type,label").eq("active",true).not("label","is",null).limit(2000);
  if(error)throw error;
  let inserted=0;
  for(const n of nodes||[]){
    const alias=String(n.label||"").trim(); const normalized=normalizeEntity(alias);
    if(normalized.length<2)continue;
    const {data:existing}=await db.from("emma_entity_aliases").select("id").is("user_id",null).eq("normalized_alias",normalized).eq("entity_type",n.entity_type).maybeSingle();
    if(existing){
      await db.from("emma_entity_aliases").update({canonical_node_key:n.node_key,alias,confidence:1,active:true,updated_at:new Date().toISOString()}).eq("id",existing.id);
    }else{
      const {error:e}=await db.from("emma_entity_aliases").insert({user_id:null,canonical_node_key:n.node_key,entity_type:n.entity_type,alias,normalized_alias:normalized,confidence:1,source:"graph_seed",active:true});
      if(!e)inserted++;
    }
  }
  return inserted;
}
export async function recordInteractionKnowledge(db:any,userId:string,interactionId:string,text:string,sourceRef:string){
  const persistence=classifyKnowledge(text);
  const dates=extractDates(text);
  const entities=await resolveEntities(db,userId,text);
  const subject=entities[0]?.canonical_node_key||null;
  const facts:any[]=[];
  if(dates.length){
    for(const date of dates)facts.push({user_id:userId,interaction_id:interactionId,subject_node_key:subject,predicate:"mentioned_date",object_text:date,fact_date:date,evidence_level:"user_stated",source_type:"conversation",source_ref:sourceRef,confidence:0.98,metadata:{persistence_class:persistence,entities}});
  }
  if(entities.length){
    facts.push({user_id:userId,interaction_id:interactionId,subject_node_key:subject,predicate:"mentioned_entity",object_text:entities.map((x:any)=>x.alias).join(", "),object_node_key:subject,evidence_level:"user_stated",source_type:"conversation",source_ref:sourceRef,confidence:0.96,metadata:{persistence_class:persistence,entities}});
  }
  if(["memory","decision","commitment","correction","fact","research"].includes(persistence)){
    facts.push({user_id:userId,interaction_id:interactionId,subject_node_key:subject,predicate:`conversation_${persistence}`,object_text:text.slice(0,2000),evidence_level:"user_stated",source_type:"conversation",source_ref:sourceRef,confidence:0.90,metadata:{dates,entities}});
  }
  if(facts.length)await db.from("emma_knowledge_facts").insert(facts);
  return {persistence,dates,entities,factsCreated:facts.length};
}
export async function saveResearchSource(db:any,userId:string,input:any){
  const text=String(input.content_excerpt||"").slice(0,12000);
  const bytes=new TextEncoder().encode(text);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
  const row={user_id:userId,source_type:String(input.source_type||"web"),source_ref:String(input.source_ref||input.source_url||"unknown").slice(0,1000),source_url:input.source_url?String(input.source_url).slice(0,2000):null,title:input.title?String(input.title).slice(0,500):null,content_excerpt:text,retrieved_at:input.retrieved_at||new Date().toISOString(),evidence_level:input.evidence_level||"documented",content_hash:hash,related_entities:input.related_entities||[],metadata:input.metadata||{}};
  const {data:existing}=await db.from("emma_research_sources").select("id").eq("user_id",userId).eq("content_hash",hash).maybeSingle();
  if(existing)return {id:existing.id,deduplicated:true};
  const {data,error}=await db.from("emma_research_sources").insert(row).select("id,source_type,source_ref,title,retrieved_at,evidence_level").single();
  if(error)throw error;
  const entities=await resolveEntities(db,userId,[row.title,row.content_excerpt].filter(Boolean).join(" "));
  const facts=[];
  for(const e of entities.slice(0,12))facts.push({user_id:userId,subject_node_key:e.canonical_node_key,predicate:"research_source",object_text:row.title||row.source_ref,evidence_level:row.evidence_level,source_type:row.source_type,source_ref:row.source_ref,confidence:Number(e.confidence)||0.9,metadata:{research_source_id:data.id}});
  if(facts.length)await db.from("emma_knowledge_facts").insert(facts);
  return {id:data.id,deduplicated:false,entities,factsCreated:facts.length};
}
