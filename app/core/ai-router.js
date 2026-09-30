const PROVIDERS=Object.freeze({
 groq:{id:"groq",label:"Groq",mode:"cloud",status:"active",model:"llama-3.3-70b-versatile"},
 gemini:{id:"gemini",label:"Gemini",mode:"cloud",status:"active",model:"gemini-3.8-flash"},
 openai:{id:"openai",label:"OpenAI",mode:"cloud",status:"planned"},
 anthropic:{id:"anthropic",label:"Anthropic",mode:"cloud",status:"planned"},
 local:{id:"local",label:"Local model",mode:"local",status:"planned"}
});
const FAILOVER_ORDER=["groq","gemini","openai","anthropic","local"];
export function getProviders(){return PROVIDERS}
export function getFailoverOrder(){return FAILOVER_ORDER.slice()}
export function selectProvider({preferred=null,available=[]}={}){
  const pool=available.length?available:FAILOVER_ORDER;
  if(preferred&&pool.includes(preferred))return PROVIDERS[preferred];
  return pool.map(id=>PROVIDERS[id]).filter(Boolean)[0]||PROVIDERS.groq;
}
