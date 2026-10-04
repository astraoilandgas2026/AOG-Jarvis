export const EVIDENCE_LEVELS=Object.freeze(["CLAIMED","DOCUMENTED","INDEPENDENTLY VERIFIED","PHYSICALLY VERIFIED"]);
export const ACTION_LEVELS=Object.freeze(["OBSERVE","ANALYZE","PROPOSE","EXECUTE"]);
export function evidenceRank(v){return EVIDENCE_LEVELS.indexOf(String(v||"CLAIMED").toUpperCase())}
export function actionAllowed(requested,authorized){
  return ACTION_LEVELS.indexOf(requested)<=ACTION_LEVELS.indexOf(authorized);
}
export function autonomyPolicy({financial=false,externalSideEffect=false,requested="OBSERVE",authorized="PROPOSE"}={}){
  if(financial||externalSideEffect) return actionAllowed(requested,"PROPOSE") ? requested==="PROPOSE" : "OBSERVE";
  return actionAllowed(requested,authorized)?requested:"OBSERVE";
}
