const LEVELS=Object.freeze(["CLAIMED","DOCUMENTED","INDEPENDENTLY VERIFIED","PHYSICALLY VERIFIED"]);

export function normalizeEvidenceLevel(value){
  const raw=String(value??"").trim().toUpperCase().replace(/_/g," ");
  return LEVELS.includes(raw) ? raw : "CLAIMED";
}
export function evidenceRank(value){return LEVELS.indexOf(normalizeEvidenceLevel(value));}
export function hasMinimumEvidence(value,minimum="DOCUMENTED"){return evidenceRank(value)>=evidenceRank(minimum);}
export function summarizeEvidence(items=[]){
  const rows=Array.isArray(items)?items:[];
  const counts=Object.fromEntries(LEVELS.map(level=>[level,0]));
  for(const item of rows)counts[normalizeEvidenceLevel(item?.evidence_level||item?.verification_status)]++;
  return {levels:counts,strongest:LEVELS[Math.max(0,...rows.map(x=>evidenceRank(x?.evidence_level||x?.verification_status)))],total:rows.length};
}
