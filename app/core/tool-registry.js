export const TOOL_REGISTRY=Object.freeze({
  "conversation.chat":{id:"conversation.chat",label:"Conversación IA",module:"conversation",permission:"read",functionName:"jarvis-chat",description:"Núcleo conversacional server-side."},
  "astra.search_supplier":{id:"astra.search_supplier",label:"Buscar proveedor",module:"astra",permission:"read",functionName:"jarvis-search-supplier",description:"Consulta proveedores reales del Procurement OS sin escribir datos."},
  "astra.dd":{id:"astra.dd",label:"Due diligence",module:"astra",permission:"read",functionName:null,description:"Reservado para consulta de DD."},
  "astra.offers":{id:"astra.offers",label:"Ofertas comerciales",module:"astra",permission:"read",functionName:null,description:"Reservado para comparación de ofertas."},
  "astra.documents":{id:"astra.documents",label:"Documentos",module:"astra",permission:"read",functionName:null,description:"Reservado para evidencia documental."},
  "astra.write":{id:"astra.write",label:"Escritura Astra",module:"astra",permission:"write",functionName:null,description:"Deshabilitado hasta confirmar permisos y audit trail."}
});
export function getTool(id){return TOOL_REGISTRY[id]||null}
export function listTools({module=null,permission=null}={}){return Object.values(TOOL_REGISTRY).filter(t=>(!module||t.module===module)&&(!permission||t.permission===permission))}
