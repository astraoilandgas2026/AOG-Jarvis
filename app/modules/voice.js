export function createVoice({ orb, onTranscript, onError }) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return { supported:false, start(){ onError?.("Reconocimiento de voz no disponible en este navegador."); } };

  const recognition = new Recognition();
  recognition.lang = "es-ES";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => orb.setState("listening");
  recognition.onend = () => orb.setState("idle");
  recognition.onerror = (event) => { orb.setState("idle"); onError?.(event.error || "voice-error"); };
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim();
    if (transcript) onTranscript?.(transcript);
  };

  return { supported:true, start(){ recognition.start(); } };
}