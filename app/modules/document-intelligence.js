function clean(v){return v===null||v===undefined||v===""?"—":String(v)}
function level(v){const s=String(v||"").toLowerCase();if(s.includes("physical"))return"PHYSICALLY VERIFIED";if(s.includes("independent"))return"INDEPENDENTLY VERIFIED";if(s.includes("document"))return"DOCUMENTED";if(s.includes("claim"))return"CLAIMED";return clean(v)}
function docKey(d){return((d.doc_type||"")+" "+(d.title||"")+" "+(d.file_name||"")).toLowerCase()}
export function analyzeDocuments(data={}){
 const docs=data.documents||[],facts=data.intelligence_facts||[],dd=data.due_diligence||[];
 const expected=["COA","SDS/FDS","ISCC","ficha técnica","legal/CNPJ","DD"];
 const text=docs.map(docKey).join(" | ");
 const coverage=expected.map(item=>({item,present:text.includes(item.toLowerCase()),evidence:docs.filter(d=>docKey(d).includes(item.toLowerCase())).length}));
 const verified=docs.filter(d=>/verified|independent|physical/i.test(String(d.verification_status||""))).length;
 const byEvidence={claimed:0,documented:0,independent:0,physical:0};
 for(const d of docs){const l=level(d.verification_status);if(l==="CLAIMED")byEvidence.claimed++;else if(l==="DOCUMENTED")byEvidence.documented++;else if(l==="INDEPENDENTLY VERIFIED")byEvidence.independent++;else if(l==="PHYSICALLY VERIFIED")byEvidence.physical++}
 const contradictions=facts.filter(f=>f.is_contradiction||/contradict/i.test(String(f.status||""))).map(f=>({id:f.id,description:f.description||f.fact||"Contradicción documental",evidence_level:level(f.verification_status)}));
 const gaps=coverage.filter(x=>!x.present).map(x=>x.item);
 if(!dd.length)gaps.push("DD");
 return {document_count:docs.length,verified_document_count:verified,evidence_counts:byEvidence,coverage,missing_documents:[...new Set(gaps)],contradictions,dd_items:dd.length,readiness:contradictions.length?"CONTRADICTIONS_FOUND":gaps.length?"INCOMPLETE_DOCUMENTATION":"DOCUMENTATION_COVERAGE_OK",documents:docs.slice(0,20).map(d=>({id:d.id,type:clean(d.doc_type),title:clean(d.title),file_name:clean(d.file_name),verification:level(d.verification_status),source:clean(d.uploaded_by)})),evidence_rule:"CLAIMED → DOCUMENTED → INDEPENDENTLY VERIFIED → PHYSICALLY VERIFIED"};
}
