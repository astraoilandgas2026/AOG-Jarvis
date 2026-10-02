function clean(value){return value===null||value===undefined||value===""?"—":String(value)}
function rows(items,fields){return (items||[]).slice(0,8).map(item=>fields.map(f=>clean(item[f])).join(" | "));}
function evidenceLabel(status){const s=String(status||"").toLowerCase();if(s.includes("physical"))return"PHYSICALLY VERIFIED";if(s.includes("independent"))return"INDEPENDENTLY VERIFIED";if(s.includes("document"))return"DOCUMENTED";if(s.includes("claim"))return"CLAIMED";return clean(status)}
export function formatSupplierIntelligence(data={}){
 const suppliers=data.suppliers||[];
 const facts=data.intelligence_facts||[];
 const flags=data.red_flags||[];
 const offers=data.offers||[];
 const products=data.products||[];
 const docs=data.documents||[];
 const dd=data.due_diligence||[];
 const contacts=data.contacts||[];
 const followups=data.follow_ups||[];
 if(!suppliers.length&&!products.length&&!offers.length&&!facts.length)return "No encontré un contexto de proveedor suficiente para esta consulta.";
 const out=[];
 out.push("SUPPLIER INTELLIGENCE");
 out.push("Consulta: "+clean(data.query));
 out.push("");
 for(const s of suppliers){
  out.push("PROVEEDOR: "+clean(s.legal_name||s.trading_name));
  if(s.trading_name&&s.trading_name!==s.legal_name)out.push("Trading: "+s.trading_name);
  out.push("Ubicación: "+clean([s.city,s.country].filter(Boolean).join(", ")));
  out.push("Legal/CNPJ: "+clean(s.tax_id)+" | CNAE: "+clean(s.cnae));
  out.push("Operación: "+clean(s.operation_status)+" | Facility: "+clean(s.facility));
  out.push("Capacidad teórica: "+clean(s.theoretical_capacity)+" | Producción real: "+clean(s.real_production)+" | Disponible: "+clean(s.available_volume));
  out.push("Astra: "+clean(s.volume_to_astra)+" | Trial: "+clean(s.trial_volume)+" | Recurring: "+clean(s.recurring_volume));
  out.push("Lifecycle: "+clean(s.lifecycle));
 }
 if(products.length){out.push("", "PRODUCTOS / FEEDSTOCK");for(const r of rows(products,["name","feedstock_type","origin","composition","available_volume","unit","verification_status"]))out.push(r);}
 if(offers.length){out.push("", "OFERTAS");for(const r of rows(offers,["price","currency","price_basis","incoterm","loading_point","port","destination","payment_terms","offered_volume","verification_status","price_date"]))out.push(r);}
 if(facts.length){out.push("", "EVIDENCIA / INTELLIGENCE FACTS");for(const f of facts.slice(0,12))out.push([clean(f.field_name),clean(f.value_text),clean(f.unit),evidenceLabel(f.verification_status),clean(f.source_type),f.is_contradiction?"CONTRADICCIÓN":""].filter(Boolean).join(" | "));}
 if(dd.length){out.push("", "DUE DILIGENCE");for(const r of rows(dd,["category","status","findings","evidence_ref","review_date"]))out.push(r);}
 if(docs.length){out.push("", "DOCUMENTOS");for(const r of rows(docs,["doc_type","title","verification_status","file_name","created_at"]))out.push(r);}
 if(contacts.length){out.push("", "CONTACTOS");for(const r of rows(contacts,["name","title","email","phone","whatsapp","is_primary"]))out.push(r);}
 if(flags.length){out.push("", "RED FLAGS");for(const f of flags.slice(0,12))out.push([clean(f.type||f.flag_type),clean(f.title||f.name||f.description),clean(f.status),evidenceLabel(f.verification_status)].join(" | "));}
 if(followups.length){out.push("", "PRÓXIMAS ACCIONES");for(const r of rows(followups,["title","responsible_person","due_date","priority","status"]))out.push(r);}
 out.push("", "ESTADO DE EVIDENCIA: no se eleva un dato a verificado sin evidencia correspondiente.");
 return out.join("\\n");
}
