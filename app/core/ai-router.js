const PROVIDERS=Object.freeze({
 groq:{id:"groq",label:"Groq",mode:"cloud",status:"active",model:"openai/gpt-oss-20b",capabilities:["chat","reasoning","code","research"]},
 gemini:{id:"gemini",label:"Gemini",mode:"cloud",status:"active",model:"gemini-3.8-flash",capabilities:["chat","reasoning","code","vision","document-analysis","research"]},
 openai:{id:"openai",label:"OpenAI",mode:"cloud",status:"planned",capabilities:["chat","reasoning","code","vision","image","audio","video","document-generation"]},
 anthropic:{id:"anthropic",label:"Anthropic",mode:"cloud",status:"planned",capabilities:["chat","reasoning","code","vision","document-analysis"]},
 local:{id:"local",label:"Local model",mode:"local",status:"planned",capabilities:["chat","reasoning","code","vision","image","audio","video","document-generation"]},
 omniroute:{id:"omniroute",label:"OmniRoute",mode:"gateway",status:"configured",model:"dynamic",endpoint:"http://127.0.0.1:20128/v1",capabilities:["chat","reasoning","code","vision","audio","image","research","agent-routing","mcp","a2a"]}
});
const FAILOVER_ORDER=["omniroute","groq","gemini","openai","anthropic","local"];
export function getProviders(){return PROVIDERS}
export function getFailoverOrder(){return FAILOVER_ORDER.slice()}
export function providersForTask(task,{available=[]}={}){const pool=available.length?available:FAILOVER_ORDER;return pool.map(id=>PROVIDERS[id]).filter(Boolean).filter(provider=>(provider.status==="active"||provider.status==="available")&&provider.capabilities.includes(task))}
export function selectProvider({preferred=null,task="chat",available=[]}={}){const candidates=providersForTask(task,{available});if(preferred){const preferredProvider=candidates.find(p=>p.id===preferred);if(preferredProvider)return preferredProvider}return candidates[0]||null}
export function explainCapability(task,{available=[]}={}){const providers=providersForTask(task,{available});return{task,available:providers.map(p=>({id:p.id,label:p.label,model:p.model})),supported:providers.length>0}}