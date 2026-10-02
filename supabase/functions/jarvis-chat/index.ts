import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const allowedOrigins=new Set(["https://astraoilandgas2026.github.io","http://localhost:3000","http://localhost:5500"]);
function cors(req:Request){const origin=req.headers.get("Origin")??"";return {"Access-Control-Allow-Origin":allowedOrigins.has(origin)?origin:"null","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};}
type Message={role:"user"|"assistant"|"system";content:string};

const PROVIDERS=[
  {id:"groq",model:"openai/gpt-oss-20b",key:"GROQ_API_KEY"},
  {id:"gemini",model:"gemini-3.8-flash",key:"GEMINI_API_KEY"}
];

function providerError(status:number,message:string){const e=new Error(message);(e as any).status=status;return e;}

async function callGroq(apiKey:string,messages:Message[],onChunk?:(text:string)=>void){
  const started=Date.now();
  const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:"openai/gpt-oss-20b",messages,temperature:0.2,max_tokens:256,stream:Boolean(onChunk)})});
  if(!response.ok){const data=await response.json().catch(()=>({}));throw providerError(response.status,data?.error?.message??"Groq request failed")}
  if(!onChunk){const data=await response.json();return {text:data?.choices?.[0]?.message?.content??"",latency:Date.now()-started}}
  const reader=response.body?.getReader();if(!reader)throw providerError(502,"Groq stream unavailable");
  const decoder=new TextDecoder();let buffer="",text="";
  for(;;){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()||"";for(const line of lines){if(!line.startsWith("data:"))continue;const payload=line.slice(5).trim();if(!payload||payload==="[DONE]")continue;try{const json=JSON.parse(payload);const delta=json?.choices?.[0]?.delta?.content||"";if(delta){text+=delta;onChunk(delta)}}catch{}}}
  return {text,latency:Date.now()-started};
}

async function callGemini(apiKey:string,messages:Message[]){
  const started=Date.now();
  const system=messages.find(m=>m.role==="system")?.content??"";
  const contents=messages.filter(m=>m.role!=="system").map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",{method:"POST",headers:{"x-goog-api-key":apiKey,"Content-Type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{temperature:0.2,maxOutputTokens:700}})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw providerError(response.status,data?.error?.message??"Gemini request failed");
  const text=data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text??"").join("")??"";
  return {text,latency:Date.now()-started};
}

async function saveMemory(db:any,userId:string,message:string){const remember=/\b(recuerda|acuérdate|acuerdate|de ahora en adelante|siempre|nunca|no vuelvas|prefiero|quiero que|me gusta|llámame|llamame)\b/i.test(message);if(!remember)return;await db.from("jarvis_memory").insert({user_id:userId,domain:"personal",memory_type:"preference",content:message.slice(0,1200),importance:5,source:"conversation",evidence_level:"user_stated",active:true})}
async function logProvider(db:any,userId:string,provider:string,model:string,status:string,errorCode:string|null,latency:number|null){
  await db.from("jarvis_provider_events").insert({user_id:userId,provider,model,status,error_code:errorCode,latency_ms:latency});
}

Deno.serve(async(req:Request)=>{
  const headers=cors(req);
  if(req.method==="OPTIONS")return new Response("ok",{headers});
  if(req.method!=="POST")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{...headers,"Content-Type":"application/json"}});
  const authorization=req.headers.get("Authorization");
  if(!authorization?.startsWith("Bearer "))return new Response(JSON.stringify({error:"Authentication required"}),{status:401,headers:{...headers,"Content-Type":"application/json"}});
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:authorization}}});
  // Supabase gateway already validates the JWT (verify_jwt=true). Read the verified subject locally to avoid a second Auth round-trip.
  let userId="";
  try{
    const token=authorization.slice(7);
    const payload=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0))));
    userId=typeof payload?.sub==="string"?payload.sub:"";
  }catch{}
  if(!userId)return new Response(JSON.stringify({error:"Invalid authentication"}),{status:401,headers:{...headers,"Content-Type":"application/json"}});
  let body:{message?:string;history?:Array<{role:"user"|"assistant";content:string}>;context?:unknown};
  try{body=await req.json()}catch{return new Response(JSON.stringify({error:"Invalid JSON body"}),{status:400,headers:{...headers,"Content-Type":"application/json"}})}
  const message=typeof body.message==="string"?body.message.trim():"";
  const suppliedContext=body.context?JSON.stringify(body.context).slice(0,12000):"";
  const suppliedContext=body.context?JSON.stringify(body.context).slice(0,12000):"";
  if(!message)return new Response(JSON.stringify({error:"Message required"}),{status:400,headers:{...headers,"Content-Type":"application/json"}});
  const history=(Array.isArray(body.history)?body.history:[]).filter(x=>x&&typeof x.content==="string"&&(x.role==="user"||x.role==="assistant")).slice(-6);
  let memories="";
  const needsMemory=!/^(hola|holi|buenas|buenos días|buenas tardes|buenas noches|hey|hello|gracias|ok|okay|perfecto|listo)[!.?,\s]*$/i.test(message);
  const {data:memoryRows}=needsMemory
    ?await db.from("jarvis_memory").select("domain,memory_type,content,importance,evidence_level,created_at,updated_at").eq("user_id",userId).eq("active",true).order("updated_at",{ascending:false}).limit(40)
    :{data:null};
  if(memoryRows?.length){
    const tokens=[...new Set((message.toLowerCase().match(/[a-záéíóúñ0-9]{3,}/gi)||[]))].filter(x=>!["que","como","para","con","los","las","del","una","por","qué","quiero","tengo","este","esta","esto","desde","ahora"].includes(x));
    const now=Date.now();
    const ranked=memoryRows.map((m:any)=>{
      const hay=(m.domain+" "+m.memory_type+" "+m.content).toLowerCase();
      const matches=tokens.reduce((n,t)=>n+(hay.includes(t)?1:0),0);
      const ageDays=Math.max(0,(now-new Date(m.updated_at||m.created_at).getTime())/86400000);
      const decay=1/(1+ageDays/30);
      return {...m,_score:matches*12+(Number(m.importance)||0)*decay};
    }).sort((a:any,b:any)=>b._score-a._score).slice(0,6);
    memories=ranked.map(({_score,...m}:any)=>`[${m.domain}/${m.memory_type}/${m.evidence_level??"unclassified"}] ${m.content}`).join("\n");
  }
  const system=`Eres Emma/Jarvis de Astra Oil & Gas. Responde normalmente en español, directo, preciso y accionable. Tu personalidad es cálida, segura, inteligente y ligeramente juguetona; usa humor seco o un comentario simpático solo cuando encaje, nunca cuando reduzca claridad. No hagas discursos ni repitas lo obvio.

Velocidad y costo son requisitos de arquitectura: usa primero contexto disponible, memoria, caché y herramientas deterministas; evita llamadas de IA innecesarias. El objetivo operativo es máximo rendimiento a 0 pesos y mínima latencia. Cuando una respuesta pueda resolverse sin modelo, hazlo.

No inventes datos. Procurement OS es la fuente de verdad para proveedores y operaciones Astra. Si una pregunta requiere datos del Procurement OS, usa una herramienta de Astra o indica que falta acceso; nunca rellenes con suposiciones. Mantén separados CLAIMED, DOCUMENTED, INDEPENDENTLY VERIFIED y PHYSICALLY VERIFIED.

Core de Leonardo: convertir información en inteligencia verificada, estructura ejecutable y resultados recurrentes. Prioriza impacto, urgencia, riesgo, oportunidad, esfuerzo, costo y reversibilidad. Puedes desafiar supuestos débiles y señalar riesgos sin dramatizar.

Memoria relevante disponible:
${memories||"(sin memoria dinámica registrada)"}
`;

  const messages:Message[]=[{role:"system",content:system},...history,{role:"user",content:message}];
  const failures:any[]=[];
  for(const provider of PROVIDERS){
    const apiKey=Deno.env.get(provider.key);
    if(!apiKey){failures.push({provider:provider.id,reason:"not_configured"});continue;}
    try{
      if(provider.id==="groq"){
        const encoder=new TextEncoder();
        const stream=new ReadableStream({
          async start(controller){
            try{
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:"start"})}\n\n`));
              const result=await callGroq(apiKey,messages,(chunk)=>controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:"delta",text:chunk})}\n\n`)));
              if(!result.text)throw providerError(502,"Empty provider response");
              if(needsMemory)await saveMemory(db,userId,message);
              await logProvider(db,userId,provider.id,provider.model,"success",null,result.latency);
              controller.enqueue(encoder.encode("data: [DONE]\\n\\n"));controller.close();
            }catch(error){
              const status=(error as any)?.status??502;
              await logProvider(db,userId,provider.id,provider.model,"failed",String(status),null,null);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:"error",message:error instanceof Error?error.message:"Provider error"})}\n\n`));controller.close();
            }
          }
        });
        return new Response(stream,{status:200,headers:{...headers,"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no"}});
      }
      const result=await callGemini(apiKey,messages);
      if(!result.text)throw providerError(502,"Empty provider response");
      await saveMemory(db,userId,message);
      await logProvider(db,userId,provider.id,provider.model,"success",null,result.latency);
      return new Response(JSON.stringify({ok:true,user_id:userId,provider:provider.id,model:provider.model,failover:failures.length>0,text:result.text}),{status:200,headers:{...headers,"Content-Type":"application/json"}});    }catch(error){
      const status=(error as any)?.status??502;
      failures.push({provider:provider.id,status,reason:error instanceof Error?error.message:"Unknown provider error"});
      await logProvider(db,userId,provider.id,provider.model,"failed",String(status),null);
    }
  }
  return new Response(JSON.stringify({error:"All AI providers unavailable",failures}),{status:503,headers:{...headers,"Content-Type":"application/json"}});
});