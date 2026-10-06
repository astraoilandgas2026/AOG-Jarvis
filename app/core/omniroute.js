// OmniRoute is a local OpenAI-compatible gateway used as EMMA's model router.
// It stays local by default; EMMA must never assume the gateway is reachable.
export const OMNIROUTE_CONFIG=Object.freeze({
  endpoint: process?.env?.OMNIROUTE_BASE_URL || "http://127.0.0.1:20128/v1",
  healthUrl: process?.env?.OMNIROUTE_HEALTH_URL || "http://127.0.0.1:20128/health",
  enabled: String(process?.env?.OMNIROUTE_ENABLED ?? "true").toLowerCase()==="true",
  model: process?.env?.OMNIROUTE_MODEL || null,
  role: "gateway"
});

export function omnirouteConfig(){return {...OMNIROUTE_CONFIG}}
export function omnirouteEndpoints(){return{endpoint:OMNIROUTE_CONFIG.endpoint,healthUrl:OMNIROUTE_CONFIG.healthUrl}}
export function buildOmniRouteRequest({messages=[],model=null,stream=false,temperature=0.2}={}){
  return {messages,model:model||OMNIROUTE_CONFIG.model||undefined,stream,temperature};
}
export function isOmniRouteEnabled(){return OMNIROUTE_CONFIG.enabled===true}
