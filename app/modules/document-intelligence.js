function clean(v){return v===null||v===undefined||v===""?"—":String(v)}
function level(v){const s=String(v||"").toLowerCase();if(s.includes("physical"))return"PHYSICALLY VERIFIED";if(s.includes("independent"))return"INDEPENDENTLY VERIFIED";if(s.includes("document"))return"DOCUMENTED";if(s.includes("claim"))return"CLAIMED";return clean(v)}
export function analyzeDocuments(data={}){
 const docs=data.documents||[], facts=data.intelligence_facts||[], dd=data.due_diligence||[];
 const expected=["COA","SDS/FDS","ISCC","ficha técnica","legal/CNPJ","DD"];
 const text=docs.map(d=>((d.doc_type||"")+" "+(d.title||"")+" "+(d.file_name||"")).toLowerCase()).join(" | ");
 const coverage=expected.map(x=>({item:x,present:text.includes(x.toLowerCase())}));
 const verified=docs.filter(d=>/verified|document/i.test(String(d.verification_status||""))).length;
 const contradictions=facts.filter(f=>f.is_contradiction).length;
 return {document_count:docs.length,verified_document_count:verified,coverage,missing_documents:coverage.filter(x=>!x.present).map(x=>x.item),contradictions,dd_items:dd.length,evidence_rule:"CLAIMED → DOCUMENTED → INDEPENDENTLY VERIFIED → PHYSICALLY VERIFIED",documents:docs.slice(0,20).map(d=>({id:d.id,type:clean(d.doc_type),title:clean(d.title),file_name:clean(d.file_name),verification:level(d.verification_status),source:clean(d.uploaded_by)}))};
}
