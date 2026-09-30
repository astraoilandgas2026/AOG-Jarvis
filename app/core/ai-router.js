const PROVIDERS=Object.freeze({
 groq:{id:"groq",label:"Groq",mode:"cloud",status:"active",model:"llama-3.3-70b-versatile"},
 gemini:{id:"gemini",label:"Gemini",mode:"cloud",status:"planned"},
 openai:{id:"openai",label:"OpenAI",mode:"cloud",status:"planned"},
 anthropic:{id:"anthropic",label:"Anthropic",mode:"cloud",status:"planned"},
 local:{id:"local",label:"Local model",mode:"local",status:"planned"}
});
export function getProviders(){return PROVIDERS}
export function selectProvider({task="conversation",preferred=null}={}){if(preferred&&PROVIDERS[preferred])return PROVIDERS[preferred];return PROVIDERS.groq}
