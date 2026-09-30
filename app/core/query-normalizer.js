const STOP_WORDS=/\b(jarvis|busca|buscar|encuentra|muéstrame|muestrame|dime|qué|que|cuál|cual|quién|quien|proveedor|proveedores|sobre|de|del|la|el|los|las|una|un)\b/gi;

export function normalizeSupplierQuery(text=""){
  const cleaned=text
    .replace(STOP_WORDS," ")
    .replace(/[¿?¡!,.;:]/g," ")
    .replace(/\s+/g," ")
    .trim();
  return cleaned.length>=2?cleaned:text.trim();
}
