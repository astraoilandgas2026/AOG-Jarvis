const LANG={es:"es-ES",en:"en-US"};
function detectLanguage(text=""){const s=text.toLowerCase();const en=/\b(the|and|with|from|please|what|how|why|today|tomorrow|email|supplier|price|offer|hello|hey)\b/i;const es=/\b(el|la|los|las|con|para|qué|como|por|hoy|mañana|correo|proveedor|precio|oferta|hola)\b/i;return en.test(s)&&!es.test(s)?"en":"es"}
function chooseVoice(lang){
 const voices=window.speechSynthesis?.getVoices?.()||[];
 const prefix=lang==="en"?"en":"es";
 const female=/female|woman|zira|samantha|aria|jenny|sara|sofia|lucia|monica|paulina|helena|google español/i;
 return voices.find(v=>v.lang?.toLowerCase().startsWith(prefix)&&female.test(v.name))||voices.find(v=>v.lang?.toLowerCase().startsWith(prefix))||voices[0]||null;
}
export function createVoice({orb,onTranscript,onError}){
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition)return{supported:false,start(){onError?.("Reconocimiento de voz no disponible en este navegador.")}};
 let language="es";
 const recognition=new Recognition();
 recognition.lang=LANG.es;recognition.interimResults=false;recognition.continuous=false;
 recognition.onstart=()=>orb.setState("listening");
 recognition.onend=()=>{if(orb.getState()==="listening")orb.setState("idle")};
 recognition.onerror=event=>{orb.setState("idle");onError?.(event.error||"voice-error")};
 recognition.onresult=event=>{const transcript=event.results?.[0]?.[0]?.transcript?.trim();if(transcript){language=detectLanguage(transcript);recognition.lang=LANG[language];onTranscript?.(transcript,language)}};
 return{supported:true,start(){try{recognition.lang=LANG[language];recognition.start()}catch{onError?.("voice-busy")}},getLanguage:()=>language};
}
export function speakEmma(text,{language=null,rate=1.0}={}){
 if(!("speechSynthesis"in window))return false;
 const lang=language||detectLanguage(text);
 const u=new SpeechSynthesisUtterance(text);u.lang=LANG[lang];u.rate=rate;u.pitch=1.02;u.volume=1;
 const v=chooseVoice(lang);if(v)u.voice=v;
 window.speechSynthesis.cancel();window.speechSynthesis.speak(u);return true;
}
export function getVoiceProfile(){return{mode:"browser-native",recognition:"bilingual adaptive",languages:["es-ES","en-US"],personality:"warm, sharp, playful, confident, concise, dry humor when appropriate",target_style:"energetic adult female sci-fi assistant; expressive, quick, witty; inspired by the traits the user likes, not an imitation of a named actor or character",externalProvider:false}}
