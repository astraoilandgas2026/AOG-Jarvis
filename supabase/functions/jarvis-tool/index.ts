import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const origins=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://localhost:5500"]);
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

Deno.serve(async(req:Request)=>{
 const h=cors(req);
 if(req.method==="OPTIONS")return new Response("ok",{headers:h});
 if(req.method!=="POST")return json({error:"Method not allowed"},405,h);
 const auth=req.headers.get("Authorization");
 if(!auth?.startsWith("Bearer "))return json({error:"Authentication required"},401,h);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
 const {data:userData,error:authError}=await db.auth.getUser();
 if(authError||!userData.user)return json({error:"Invalid authentication"},401,h);
 let body:any; try{body=await req.json()}catch{return json({error:"Invalid JSON body"},400,h)}
 const tool=typeof body.tool==="string"?body.tool:"";
 const q=typeof body.q==="string"?body.q.trim():"";
 const supplierId=typeof body.supplier_id==="string"?body.supplier_id:"";
 const limit=Math.min(Math.max(Number(body.limit)||10,1),20);
 if(!tool)return json({error:"Tool required"},400,h);

 let query:any;
 if(tool==="astra.search_supplier"){
   if(q.length<2)return json({error:"Search term must contain at least 2 characters"},400,h);
   const p="%"+q.replace(/[%_]/g,"\\$&")+"%";
   query=db.from("suppliers").select(supplierColumns).or("legal_name.ilike."+p+",trading_name.ilike."+p+",tax_id.ilike."+p).order("updated_at",{ascending:false}).limit(limit);
 } else {
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
