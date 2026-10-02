function n(v){const s=String(v??"").trim();return s&&s!=="—"?s:null}
export function analyzeProcurement(data={}){
 const suppliers=data.suppliers||[],offers=data.offers||[],products=data.products||[],facts=data.intelligence_facts||[],dd=data.due_diligence||[],docs=data.documents||[],flags=data.red_flags||[];
 const supplier= suppliers[0]||null;
 const supplierId=supplier?.id;
 const ownOffers=offers.filter(x=>!supplierId||x.supplier_id===supplierId);
 const ownProducts=products.filter(x=>!supplierId||x.supplier_id===supplierId);
 const ownFacts=facts.filter(x=>!supplierId||x.entity_id===supplierId);
 const ownDd=dd.filter(x=>!supplierId||x.supplier_id===supplierId);
 const ownDocs=docs.filter(x=>!supplierId||x.supplier_id===supplierId);
 const ownFlags=flags.filter(x=>!supplierId||x.supplier_id===supplierId);
 const evidence={claimed:0,documented:0,independent:0,physical:0};
 for(const f of ownFacts){const s=String(f.verification_status||"").toLowerCase();if(s.includes("physical"))evidence.physical++;else if(s.includes("independent"))evidence.independent++;else if(s.includes("document"))evidence.documented++;else if(s.includes("claim"))evidence.claimed++;}
 const gaps=[];
 if(!supplier?.tax_id)gaps.push("identidad legal/CNPJ no documentada");
 if(!supplier?.facility)gaps.push("facility/operación no documentada");
 if(!supplier?.theoretical_capacity)gaps.push("capacidad teórica no registrada");
 if(!supplier?.real_production)gaps.push("producción real no registrada");
 if(!supplier?.available_volume)gaps.push("volumen disponible no registrado");
 if(!ownProducts.length)gaps.push("producto/feedstock no registrado");
 if(!ownOffers.length)gaps.push("oferta comercial no registrada");
 if(!ownDd.length)gaps.push("DD pendiente");
 if(!ownDocs.length)gaps.push("evidencia documental pendiente");
 const activeFlags=ownFlags.filter(x=>String(x.status||"").toLowerCase()!="resolved");
 return {supplier:supplier?{id:supplier.id,name:supplier.legal_name||supplier.trading_name,lifecycle:supplier.lifecycle,operation_status:supplier.operation_status}:null,commercial:{offers:ownOffers.length,products:ownProducts.length,available_volume:n(supplier?.available_volume),trial_volume:n(supplier?.trial_volume),recurring_volume:n(supplier?.recurring_volume)},evidence,dd:{items:ownDd.length,documents:ownDocs.length,active_red_flags:activeFlags.length},gaps,red_flags:activeFlags.map(x=>({type:x.flag_type,description:x.description,evidence:x.evidence,status:x.status})),decision_state:activeFlags.length?"RED_FLAGS_PRESENT":gaps.length?"INCOMPLETE_EVIDENCE":"READY_FOR_NEXT_DD_STEP",principle:"No convierte CLAIMED en VERIFIED y no confunde capacidad teórica con volumen disponible, trial o recurring."};}
