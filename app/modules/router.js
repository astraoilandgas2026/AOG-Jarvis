const MODULES = {
  astra: { label:"ASTRA", description:"Procurement Intelligence" },
  personal: { label:"PERSONAL", description:"Agenda, tareas y vida diaria" },
  conversation: { label:"CONVERSACIÓN", description:"Espacio privado de conversación" },
  research: { label:"RESEARCH", description:"Investigación y síntesis" },
  memory: { label:"MEMORIA", description:"Contexto y recuerdos autorizados" },
  automation: { label:"AUTOMATION", description:"Acciones y rutinas controladas" }
};

export function getModules() { return MODULES; }

export function detectModule(text) {
  const q = text.toLowerCase();
  if (/supplier|proveedor|olam|renovar|óleos|oleos|cnpj|uco|av(u|é)|feedstock|dd|due diligence/.test(q)) return "astra";
  if (/agenda|calendario|tarea|recordatorio|mañana|hoy|correo|email/.test(q)) return "personal";
  if (/investiga|research|busca en internet|qué sabes/.test(q)) return "research";
  return "conversation";
}