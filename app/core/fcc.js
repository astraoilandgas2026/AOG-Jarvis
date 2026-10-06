// Free Claude Code (FCC) capability map for EMMA.
// FCC is an external agent/model gateway + launcher, not a model itself.
// Keep integration capability-oriented so EMMA can use the harnesses without
// embedding the entire upstream project into AOG-Jarvis.
export const FCC_CAPABILITIES=Object.freeze({
  project:"Alishahryar1/free-claude-code",
  license:"MIT",
  gatewayCommand:"fcc-server",
  agents:["claude-code","codex","pi","opencode","cline","hermes","deepseek-harness","grok-build","muse-code","aider","vscode-chat"],
  strengths:["multi-model-catalog","provider-failover","coding-agent-launchers","browser-native-code-sessions","voice-input","agent-workers"],
  role:"agent-harness"
});
export function getFccCapabilities(){return{...FCC_CAPABILITIES,agents:[...FCC_CAPABILITIES.agents],strengths:[...FCC_CAPABILITIES.strengths]}}
export function fccCanHandle(task="code"){
 const t=String(task).toLowerCase();
 if(/code|coding|repo|github|refactor|debug|build|test|agent/.test(t))return true;
 if(/chat|reasoning|research/.test(t))return true;
 return false;
}
export function buildFccLaunchPlan({task="code",preferredAgent=null}={}){
 const agent=preferredAgent||(/code|repo|github|refactor|debug/.test(String(task).toLowerCase())?"codex":"claude-code");
 return{gateway:"fcc-server",agent,task,requiresLocalInstallation:true,liveTrading:false};
}
