const adapters=new Map();

export function registerAdapter(adapter){
  if(!adapter?.id||typeof adapter.connect!=="function") throw new Error("Invalid adapter");
  adapters.set(adapter.id,Object.freeze({...adapter}));
  return adapters.get(adapter.id);
}
export function listAdapters(){return [...adapters.values()].map(({id,name,kind,status,capabilities})=>({id,name,kind,status:status||"available",capabilities:capabilities||[]}))}
export function getAdapter(id){return adapters.get(id)||null}
export async function connectAdapter(id,context={}){
  const adapter=getAdapter(id); if(!adapter) throw new Error(`Adapter not found: ${id}`);
  return adapter.connect(context);
}
