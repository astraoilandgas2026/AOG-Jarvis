const LANG={es:"es-CL",en:"en-US"};
export function detectLanguage(text=""){const s=text.toLowerCase();const en=/\b(the|and|with|from|please|what|how|why|today|tomorrow|email|supplier|price|offer|hello|hey|check|show|tell|do|have|about)\b/i;const es=/\b(el|la|los|las|con|para|qué|como|por|hoy|mañana|correo|proveedor|precio|oferta|hola|dime|muéstrame|tenemos|sobre)\b/i;return en.test(s)&&!es.test(s)?"en":"es"}
export function normalizeVoiceText(text=""){return text.trim().replace(/\bastra\s+(?:oil|oiling|oiling|oilin)\s+(?:and|&|en|in)\s+gas\b/gi,"Astra Oil & Gas").replace(/\bastra\s+oil\s+andgas\b/gi,"Astra Oil & Gas").replace(/\bastraoil(?:andgas|\.com)\b/gi,"AstraOilAndGas.com").replace(/\bastraoilandgas\.com\b/gi,"AstraOilAndGas.com").replace(/\b(?:olam|holam)\b/gi,"Olam")}
export function createVoice({orb,onTranscript,onError}){
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition)return{supported:false,start(){onError?.("Reconocimiento de voz no disponible en este navegador.")}};
 let language="es",busy=false;
 const recognition=new Recognition();
 recognition.lang=LANG.es;recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=3;
 recognition.onstart=()=>{busy=true;orb.setState("listening")};
 recognition.onend=()=>{busy=false;if(orb.getState()==="listening")orb.setState("idle")};
 recognition.onerror=event=>{busy=false;orb.setState("idle");onError?.(event.error||"voice-error")};
 recognition.onresult=event=>{const result=event.results?.[0];const transcript=result?.[0]?.transcript?.trim();if(transcript){language=detectLanguage(transcript);recognition.lang=LANG[language];onTranscript?.(transcript,language)}};
 return{supported:true,start(){if(busy){onError?.("voice-busy");return}try{recognition.lang=LANG[language];recognition.start()}catch{onError?.("voice-busy")}},getLanguage:()=>language};
}
export function getVoiceProfile(){return{mode:"elevenlabs",recognition:"browser speech recognition, Spanish-Chile + English-US adaptive",languages:["es-CL","en-US"],personality:"warm, sharp, playful, confident, concise, dry humor when appropriate",target_style:"energetic adult female sci-fi assistant; expressive, quick, witty; original voice identity",externalProvider:true}}
