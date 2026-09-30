export const TOOL_REGISTRY = Object.freeze({
  "astra.search_supplier": {
    id: "astra.search_supplier",
    label: "Buscar proveedor",
    module: "astra",
    permission: "read",
    functionName: "jarvis-search-supplier",
    description: "Consulta proveedores reales del Procurement OS sin escribir datos."
  },
  "astra.dd": {
    id: "astra.dd",
    label: "Due diligence",
    module: "astra",
    permission: "read",
    functionName: null,
    description: "Reservado para consulta de DD; backend aún no expuesto."
  },
  "astra.offers": {
    id: "astra.offers",
    label: "Ofertas comerciales",
    module: "astra",
    permission: "read",
    functionName: null,
    description: "Reservado para comparación de ofertas; backend aún no expuesto."
  },
  "astra.documents": {
    id: "astra.documents",
    label: "Documentos",
    module: "astra",
    permission: "read",
    functionName: null,
    description: "Reservado para evidencia documental; backend aún no expuesto."
  }
});

export function getTool(id) {
  return TOOL_REGISTRY[id] || null;
}

export function listTools({ module = null, permission = null } = {}) {
  return Object.values(TOOL_REGISTRY).filter(tool =>
    (!module || tool.module === module) &&
    (!permission || tool.permission === permission)
  );
}
