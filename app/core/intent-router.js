export function classifyIntent(text = "") {
  const q = text.trim().toLowerCase();
  if (!q) return { type: "empty", module: "conversation" };
  if (/busca|buscar|encuentra|proveedor|olam|renovar|óleos|oleos|cnpj|uco|feedstock/.test(q)) {
    return { type: "tool", module: "astra", tool: "astra.search_supplier" };
  }
  if (/resume|resumen|resúmeme|analiza|explica/.test(q)) {
    return { type: "conversation", module: "conversation", task: "summarize" };
  }
  if (/investiga|internet|web|fuentes/.test(q)) {
    return { type: "research", module: "research" };
  }
  if (/agrega|añade|crea|actualiza|modifica|elimina|envía|manda/.test(q)) {
    return { type: "action", module: "automation", requiresConfirmation: true };
  }
  return { type: "conversation", module: "conversation" };
}
