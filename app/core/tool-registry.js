export const TOOL_REGISTRY=Object.freeze({
 "conversation.chat":{id:"conversation.chat",label:"Conversación IA",module:"conversation",permission:"read",functionName:"jarvis-chat",description:"Núcleo conversacional server-side."},
 "astra.search_supplier":{id:"astra.search_supplier",label:"Buscar proveedor",module:"astra",permission:"read",functionName:"jarvis-tool",description:"Busca proveedores reales."},
 "astra.dd":{id:"astra.dd",label:"Due diligence",module:"astra",permission:"read",functionName:"jarvis-tool",description:"Consulta DD real."},
 "astra.offers":{id:"astra.offers",label:"Ofertas comerciales",module:"astra",permission:"read",functionName:"jarvis-tool",description:"Consulta ofertas reales."},
 "astra.documents":{id:"astra.documents",label:"Documentos",module:"astra",permission:"read",functionName:"jarvis-tool",description:"Consulta evidencia documental."},
 "astra.contacts":{id:"astra.contacts",label:"Contactos",module:"astra",permission:"read",functionName:"jarvis-tool",description:"Consulta contactos."},
 "astra.products":{id:"astra.products",label:"Productos",module:"astra",permission:"read",functionName:"jarvis-tool",description:"Consulta productos."},
 "astra.timeline":{id:"astra.timeline",label:"Timeline",module:"astra",permission:"read",functionName:"jarvis-tool",description:"Consulta historial."},
 "astra.followups":{id:"astra.followups",label:"Follow-ups",module:"astra",permission:"read",functionName:"jarvis-tool",description:"Consulta próximas acciones."},
 "astra.write":{id:"astra.write",label:"Escritura Astra",module:"astra",permission:"write",functionName:null,description:"Deshabilitado hasta confirmar permisos y audit trail."},
 "github.read":{id:"github.read",label:"GitHub",module:"github",permission:"read",functionName:null,description:"Conector preparado; autenticación pendiente."},
 "gmail.read":{id:"gmail.read",label:"Gmail",module:"gmail",permission:"read",functionName:null,description:"Conector preparado; OAuth pendiente."},
 "files.read":{id:"files.read",label:"Archivos",module:"files",permission:"read",functionName:null,description:"Conector preparado."}
});
export function getTool(id){return TOOL_REGISTRY[id]||null}
export function listTools({module=null,permission=null}={}){return Object.values(TOOL_REGISTRY).filter(t=>(!module||t.module===module)&&(!permission||t.permission===permission))}
