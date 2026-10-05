import { bridgeCommand } from "./local-bridge.js";
const BLOCKED_HOSTS=/^(?:google\\.|www\\.google\\.|youtube\\.com|www\\.youtube\\.com|facebook\\.com|www\\.facebook\\.com|instagram\\.com|www\\.instagram\\.com|x\\.com|www\\.x\\.com)$/i;
const normalizeUrl=u=>{try{return new URL(u).toString()}catch{return null}};
const cleanText=t=>String(t||"").replace(/\\s+/g," ").trim();
function scoreSource(source){const text=cleanText(source.text);return Math.min(100,(source.title?15:0)+(text.length>=300?30:0)+(/company|empresa|about|contact|products?|servicios?|producto/i.test(text)?20:0)+(/certificate|certificado|specification|especificación|capacity|capacidad|facility|planta|address|dirección/i.test(text)?35:0));}
function dedupe(candidates){const seen=new Set();return candidates.filter(c=>{const u=normalizeUrl(c.url);if(!u)return false;const url=new URL(u);const key=url.hostname.replace(/^www\\./i,"")+url.pathname.replace(/\\/$/,"");if(seen.has(key)||BLOCKED_HOSTS.test(url.hostname))return false;seen.add(key);return true});}
export async function runResearchAgent({bridge,query,invokeTool,limit=8}){
 const searchUrl="https://www.google.com/search?q="+encodeURIComponent(query);
 const search=await bridgeCommand(bridge,"browser/open",{url:searchUrl});
 const searchData=await bridgeCommand(bridge,"browser/analyze",{});
 const linkData=await bridgeCommand(bridge,"browser/links",{});
 const candidates=dedupe((linkData.links||[]).filter(x=>/^https?:/i.test(x.url)).slice(0,40)).slice(0,limit);
 const results=await Promise.allSettled(candidates.map(async candidate=>{const opened=await bridgeCommand(bridge,"browser/new-tab",{url:candidate.url});const data=await bridgeCommand(bridge,"browser/analyze",{});return{title:data.title||opened.title||candidate.title||candidate.text||"",url:data.url||opened.url||candidate.url,text:(data.text||"").slice(0,12000),score:0};}));
 const sources=results.map((r,i)=>r.status==="fulfilled"?{...r.value,score:scoreSource(r.value)}:{title:candidates[i]?.title||candidates[i]?.text||"",url:candidates[i]?.url||"",text:"SOURCE_ERROR: "+(r.reason?.message||"unknown"),score:0}).filter(x=>x.url).sort((a,b)=>b.score-a.score).slice(0,limit);
 const evidenceLevel=sources.length>=3&&sources.filter(s=>s.score>=50).length>=2?"DOCUMENTED":"CLAIMED";
 const bundle={query,search_title:searchData.title||search.title,search_url:searchData.url||search.url,evidence_level:evidenceLevel,retrieved_at:new Date().toISOString(),source_count:sources.length,sources};
 try{await invokeTool("emma.research.save",{q:JSON.stringify(bundle).slice(0,50000),source_type:"web_research",source_ref:bundle.search_url,source_url:bundle.search_url,title:"Emma Research · "+query.slice(0,180),content_excerpt:sources.map((s,i)=>(i+1)+". "+s.title+"\\n"+s.text).join("\\n\\n").slice(0,30000),evidence_level:evidenceLevel.toLowerCase(),retrieved_at:bundle.retrieved_at,metadata:{query,source_count:sources.length,sources:sources.map(s=>({title:s.title,url:s.url,score:s.score}))}})}catch(error){bundle.persistence_error=String(error?.message||error)}
 return bundle;
}
