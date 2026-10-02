import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const origins=new Set(["https://astraoilandgas2026.github.io","http://localhost:5500","http://127.0.0.1:5500"]);
const cors=(req:Request)=>{const o=req.headers.get("Origin")??"";return{"Access-Control-Allow-Origin":origins.has(o)?o:"null","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"}};
const json=(body:unknown,status:number,h:any)=>new Response(JSON.stringify(body),{status,headers:{...h,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 const h=cors(req);if(req.method==="OPTIONS")return new Response("ok",{headers:h});if(req.method!=="POST")return json({error:"Method not allowed"},405,h);
 const auth=req.headers.get("Authorization");if(!auth?.startsWith("Bearer "))return json({error:"Authentication required"},401,h);
 const key=Deno.env.get("ELEVENLABS_API_KEY");if(!key)return json({error:"ELEVENLABS_NOT_CONFIGURED"},503,h);
 let body:any;try{body=await req.json()}catch{return json({error:"Invalid JSON"},400,h)}
 const text=String(body.text||"").trim();const voiceId=String(body.voice_id||Deno.env.get("EMMA_ELEVENLABS_VOICE_ID")||"").trim();const modelId=String(body.model_id||"eleven_v4");
 if(body.setup_voice)return json({ok:true,configured:Boolean(voiceId),provider:"elevenlabs"},200,h); if(text.length<1||text.length>5000||!voiceId)return json({error:voiceId?"text required":"EMMA_ELEVENLABS_VOICE_ID not configured"},400,h);
 const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_22050_32`,{method:"POST",headers:{"xi-api-key":key,"Content-Type":"application/json","Accept":"audio/mpeg"},body:JSON.stringify({text,model_id:modelId,voice_settings:{stability:0.48,similarity_boost:0.82,style:0.55,use_speaker_boost:true}})});
 if(!r.ok)return json({error:"ELEVENLABS_TTS_FAILED",detail:(await r.text()).slice(0,500)},r.status,h);
 const bytes=new Uint8Array(await r.arrayBuffer());
 let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
 return new Response(bytes,{status:200,headers:{...h,"Content-Type":"audio/mpeg","Cache-Control":"no-store"}});
});