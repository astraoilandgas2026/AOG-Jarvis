function n(v){const s=String(v??"").trim();return s&&s!=="—"?s:null}
function evidenceLevel(v){const s=String(v||"").toLowerCase();if(s.includes("physical"))return"physical";if(s.includes("independent"))return"independent";if(s.includes("document"))return"documented";if(s.includes("claim"))return"claimed";return null}
export function analyzeProcurement(data={}){
 const suppliers=data.suppliers||[],offers=data.offers||[],products=data.products||[],facts=data.intelligence_facts||[],dd=data.due_diligence||[],docs=data.documents||[],flags=data.red_flags||[];
 const supplier=suppliers[0]||null,supplierId=supplier?.id;
 const own=(rows,key="supplier_id")=>rows.filter(x=>!supplierId||x[key]===supplierId);
 const ownOffers=own(offers),ownProducts=own(products),ownFacts=facts.filter(x=>!supplierId||x.entity_id===supplierId),ownDd=own(dd),ownDocs=own(docs),ownFlags=own(flags);
 const evidence={claimed:0,documented:0,independent:0,physical:0};
 for(const rows of [ownFacts,ownProducts,ownOffers,ownDocs,ownDd])for(const item of rows){const l=evidenceLevel(item.verification_status||item.status);if(l)evidence[l]++}
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
 const activeFlags=ownFlags.filter(x=>String(x.status||"").toLowerCase()!=="resolved"&&String(x.status||"").toLowerCase()!=="dismissed");
 const decision_state=activeFlags.length?"RED_FLAGS_PRESENT":gaps.length?"INCOMPLETE_EVIDENCE":"READY_FOR_NEXT_DD_STEP";
 const next_action=activeFlags.length?"Investigar y resolver red flags antes de avanzar":gaps.length?"Cerrar el siguiente gap: "+gaps[0]:"Avanzar al siguiente paso de DD/validación independiente";
 return {supplier:supplier?{id:supplier.id,name:supplier.legal_name||supplier.trading_name,lifecycle:supplier.lifecycle,operation_status:supplier.operation_status}:null,commercial:{offers:ownOffers.length,products:ownProducts.length,available_volume:n(supplier?.available_volume),trial_volume:n(supplier?.trial_volume),recurring_volume:n(supplier?.recurring_volume)},evidence,dd:{items:ownDd.length,documents:ownDocs.length,active_red_flags:activeFlags.length},gaps,red_flags:activeFlags.map(x=>({type:x.flag_type,description:x.description,evidence:x.evidence,status:x.status})),decision_state,next_action,principle:"No convierte CLAIMED en VERIFIED y no confunde capacidad teórica con volumen disponible, trial o recurring."};
}
