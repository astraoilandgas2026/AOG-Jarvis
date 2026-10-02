import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const origins=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://localhost:5500","http://127.0.0.1:5500"]);
const cors=(req:Request)=>{const o=req.headers.get("Origin")??"";return {"Access-Control-Allow-Origin":origins.has(o)?o:"null","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}};
const json=(body:unknown,status:number,h:Record<string,string>)=>new Response(JSON.stringify(body),{status,headers:{...h,"Content-Type":"application/json"}});

const supplierColumns="id,legal_name,trading_name,country,city,tax_id,cnae,administrator,legal_status,facility,operation_status,theoretical_capacity,real_production,available_volume,volume_to_astra,trial_volume,recurring_volume,infrastructure,lifecycle,created_at,updated_at";
const allowed={
  dd:"id,supplier_id,category,status,findings,evidence_ref,reviewer,review_date,created_at,updated_at",
  offers:"id,supplier_id,product_id,price,currency,price_basis,incoterm,loading_point,port,destination,payment_terms,offered_volume,trial_quantity,recurring_quantity,certification_premium,commercial_validity,verification_status,price_unit,price_date,source,created_at,updated_at",
  documents:"id,supplier_id,product_id,dd_item_id,doc_type,title,description,file_name,file_url,uploaded_by,verification_status,created_at",
  contacts:"id,supplier_id,name,title,email,phone,whatsapp,is_primary,notes,created_at",
  products:"id,supplier_id,name,feedstock_type,origin,composition,available_volume,unit,verification_status,created_at,updated_at,commodity_category",
  timeline:"id,supplier_id,event_type,title,description,actor,event_date,created_at",
  followups:"id,supplier_id,title,description,responsible_person,due_date,priority,status,created_at,updated_at"
} as const;

function searchPattern(q:string){
  const stop=new Set(["que","como","para","con","los","las","del","una","por","qué","tenemos","pendiente"]);
  const tokens=[...new Set((q.toLowerCase().match(/[a-záéíóúñ0-9]{3,}/gi)||[]).filter(x=>!stop.has(x)))].slice(0,6);
  return tokens.length?tokens:["astra"];
}
function memoryTokens(q:string){
  return [...new Set((q.toLowerCase().match(/[a-záéíóúñ0-9]{3,}/gi)||[]))].filter(x=>!new Set(["que","como","para","con","los","las","del","una","por","qué","quiero","tengo","este","esta","esto","desde","ahora"]).has(x)).slice(0,12);
}
async function memorySearch(db:any,userId:string,q:string,limit:number){
  const {data,error}=await db.from("jarvis_memory").select("id,domain,memory_type,content,importance,source,evidence_level,active,created_at,updated_at").eq("user_id",userId).eq("active",true).order("importance",{ascending:false}).order("updated_at",{ascending:false}).limit(Math.max(limit*8,40));
  if(error)throw error;
  const tokens=memoryTokens(q);
  const scored=(data||[]).map((m:any)=>{
    const hay=(m.domain+" "+m.memory_type+" "+m.content).toLowerCase();
    const matches=tokens.reduce((n,t)=>n+(hay.includes(t)?1:0),0);
    return {...m,_score:matches*10+(Number(m.importance)||0)};
  }).filter((m:any)=>m._score>0).sort((a:any,b:any)=>b._score-a._score||String(b.updated_at).localeCompare(String(a.updated_at))).slice(0,limit);
  return scored.map(({_score,...m}:any)=>m);
}

async function unifiedContext(db:any,q:string,limit:number){
  const tokens=searchPattern(q);
  const patterns=tokens.map(t=>"%"+t.replace(/[%_]/g,"\\$&")+"%");
  const supplierOr=patterns.map(p=>`legal_name.ilike.${p},trading_name.ilike.${p},tax_id.ilike.${p}`).join(",");
  const domainOr=patterns.map(p=>`name.ilike.${p},code.ilike.${p},description.ilike.${p}`).join(",");
  const [{data:suppliers=[]},{data:domains=[]}]=await Promise.all([
    db.from("suppliers").select(supplierColumns).or(supplierOr).order("updated_at",{ascending:false}).limit(Math.min(limit,8)),
    db.from("procurement_domains").select("id,code,name,description,active,created_at,updated_at").or(domainOr).eq("active",true).order("updated_at",{ascending:false}).limit(8)
  ]);
  const supplierIds=(suppliers as any[]).map(x=>x.id);
  const related=(table:string,columns:string,order:string,cap:number)=>supplierIds.length?db.from(table).select(columns).in("supplier_id",supplierIds).order(order,{ascending:false}).limit(cap):Promise.resolve({data:[]});
  const [contacts,products,offers,docs,dd,timeline,followups,facts,redFlags]=await Promise.all([
    related("contacts",allowed.contacts,"created_at",20),related("products",allowed.products,"updated_at",20),related("commercial_offers",allowed.offers,"updated_at",20),related("documents",allowed.documents,"created_at",30),related("due_diligence",allowed.dd,"updated_at",30),related("timeline_events",allowed.timeline,"created_at",30),related("follow_ups",allowed.followups,"created_at",20),
    supplierIds.length?db.from("intelligence_facts").select("id,domain_id,entity_type,entity_id,field_name,value_text,unit,fact_date,source_type,source_ref,verification_status,is_contradiction,contradiction_key,notes,created_at,updated_at").or(supplierIds.map(id=>`entity_id.eq.${id}`).join(",")).order("updated_at",{ascending:false}).limit(50):Promise.resolve({data:[]}),
    supplierIds.length?db.from("red_flags").select("*").in("supplier_id",supplierIds).order("created_at",{ascending:false}).limit(20):Promise.resolve({data:[]})
  ]);
  return {query:q,tokens,suppliers:suppliers||[],domains:domains||[],contacts:contacts.data||[],products:products.data||[],offers:offers.data||[],documents:docs.data||[],due_diligence:dd.data||[],timeline:timeline.data||[],follow_ups:followups.data||[],intelligence_facts:facts.data||[],red_flags:redFlags.data||[]};
}

Deno.serve(async(req:Request)=>{
 const h=cors(req);
 if(req.method==="OPTIONS")return new Response("ok",{headers:h});
 if(req.method!=="POST")return json({error:"Method not allowed"},405,h);
 const auth=req.headers.get("Authorization");
 if(!auth?.startsWith("Bearer "))return json({error:"Authentication required"},401,h);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
 const {data:userData,error:authError}=await db.auth.getUser();
 if(authError||!userData.user)return json({error:"Invalid authentication"},401,h);
 let body:any;try{body=await req.json()}catch{return json({error:"Invalid JSON body"},400,h)}
 const tool=typeof body.tool==="string"?body.tool:"";
 const q=typeof body.q==="string"?body.q.trim():"";
 const supplierId=typeof body.supplier_id==="string"?body.supplier_id:"";
 const memoryId=typeof body.memory_id==="string"?body.memory_id:"";
 const limit=Math.min(Math.max(Number(body.limit)||10,1),20);
 if(!tool)return json({error:"Tool required"},400,h);

 if(tool==="astra.context"){
   if(q.length<2)return json({error:"Context query must contain at least 2 characters"},400,h);
   const data=await unifiedContext(db,q,limit);
   return json({ok:true,user_id:userData.user.id,tool,count:data.suppliers.length+data.domains.length,data},200,h);
 }

 if(tool==="memory.write"){
   if(q.length<2)return json({error:"Memory text required"},400,h);
   const memory={user_id:userData.user.id,domain:body.domain||"personal",memory_type:body.memory_type||"note",content:q.slice(0,1200),importance:Math.min(Math.max(Number(body.importance)||4,1),5),source:body.source||"conversation",evidence_level:body.evidence_level||"user_stated",active:true};
   const {data,error}=await db.from("jarvis_memory").insert(memory).select("id,domain,memory_type,content,importance,source,evidence_level,active,created_at,updated_at").single();
   if(error)return json({error:"Memory write failed",detail:error.message},500,h);
   return json({ok:true,tool,data},200,h);
 }

 if(tool==="memory.read"){
   const memories=await memorySearch(db,userData.user.id,q,limit);
   return json({ok:true,user_id:userData.user.id,tool,count:memories.length,data:memories},200,h);
 }

 if(tool==="memory.update"){
   if(!memoryId)return json({error:"memory_id required"},400,h);
   const patch:any={};
   if(typeof body.domain==="string")patch.domain=body.domain;
   if(typeof body.memory_type==="string")patch.memory_type=body.memory_type;
   if(typeof q==="string"&&q.length>=2)patch.content=q.slice(0,1200);
   if(body.importance!==undefined)patch.importance=Math.min(Math.max(Number(body.importance)||4,1),5);
   if(typeof body.source==="string")patch.source=body.source;
   if(typeof body.evidence_level==="string")patch.evidence_level=body.evidence_level;
   if(body.active!==undefined)patch.active=Boolean(body.active);
   if(!Object.keys(patch).length)return json({error:"No memory fields to update"},400,h);
   const {data,error}=await db.from("jarvis_memory").update(patch).eq("id",memoryId).eq("user_id",userData.user.id).select("id,domain,memory_type,content,importance,source,evidence_level,active,created_at,updated_at").single();
   if(error)return json({error:"Memory update failed",detail:error.message},500,h);
   return json({ok:true,tool,data},200,h);
 }

 if(tool==="memory.deactivate"){
   if(!memoryId)return json({error:"memory_id required"},400,h);
   const {data,error}=await db.from("jarvis_memory").update({active:false}).eq("id",memoryId).eq("user_id",userData.user.id).select("id,domain,memory_type,content,importance,source,evidence_level,active,created_at,updated_at").single();
   if(error)return json({error:"Memory deactivate failed",detail:error.message},500,h);
   return json({ok:true,tool,data},200,h);
 }

 if(tool==="personal.task.create"){
   if(q.length<2)return json({error:"Task title required"},400,h);
   const task={user_id:userData.user.id,title:q.slice(0,300),details:typeof body.details==="string"?body.details:null,due_at:body.due_at||null,priority:body.priority||"normal",status:"open",source:body.source||"emma"};
   const {error}=await db.from("jarvis_tasks").insert(task);
   if(error)return json({error:"Task create failed",detail:error.message},500,h);
   return json({ok:true,tool,data:{title:task.title,due_at:task.due_at,priority:task.priority,status:task.status}},200,h);
 }
 if(tool==="personal.task.list"){
   const {data,error}=await db.from("jarvis_tasks").select("id,title,details,due_at,priority,status,created_at,updated_at").eq("user_id",userData.user.id).neq("status","done").order("due_at",{ascending:true,nullsFirst:false}).order("created_at",{ascending:false}).limit(limit);
   if(error)return json({error:"Task list failed",detail:error.message},500,h);
   return json({ok:true,tool,count:data?.length||0,data:data||[]},200,h);
 }

 let query:any;
 if(tool==="astra.search_supplier"){
   if(q.length<2)return json({error:"Search term must contain at least 2 characters"},400,h);
   const p="%"+q.replace(/[%_]/g,"\\$&")+"%";
   query=db.from("suppliers").select(supplierColumns).or("legal_name.ilike."+p+",trading_name.ilike."+p+",tax_id.ilike."+p).order("updated_at",{ascending:false}).limit(limit);
 }else{
   const tableMap:any={"astra.dd":"due_diligence","astra.offers":"commercial_offers","astra.documents":"documents","astra.contacts":"contacts","astra.products":"products","astra.timeline":"timeline_events","astra.followups":"follow_ups"};
   const table=tableMap[tool];
   const columns=(allowed as any)[tool.replace("astra.","")];
   if(!table||!columns)return json({error:"Tool not available"},404,h);
   query=db.from(table).select(columns).order("created_at",{ascending:false}).limit(limit);
   if(supplierId)query=query.eq("supplier_id",supplierId);
 }
 const {data,error}=await query;
 if(error)return json({error:"Tool query failed",detail:error.message},500,h);
 return json({ok:true,user_id:userData.user.id,tool,count:data?.length??0,data:data??[]},200,h);
});