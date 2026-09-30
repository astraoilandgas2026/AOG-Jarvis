export function classifyIntent(text=""){
 const q=text.trim().toLowerCase();
 if(!q)return{type:"empty",module:"conversation"};
 if(/dd|due diligence|diligencia|riesgo/.test(q))return{type:"tool",module:"astra",tool:"astra.dd"};
 if(/oferta|precio|commercial|incoterm|fob|cif|cfr/.test(q))return{type:"tool",module:"astra",tool:"astra.offers"};
 if(/documento|documentos|coa|sgs|iscc|tds|sds|ficha/.test(q))return{type:"tool",module:"astra",tool:"astra.documents"};
 if(/contacto|contactos|email|correo|whatsapp|teléfono|telefono/.test(q))return{type:"tool",module:"astra",tool:"astra.contacts"};
 if(/producto|productos|feedstock|uco|av[uú]/.test(q))return{type:"tool",module:"astra",tool:"astra.products"};
 if(/timeline|historial|último contacto|ultimo contacto/.test(q))return{type:"tool",module:"astra",tool:"astra.timeline"};
 if(/follow.?up|seguimiento|pendiente|próxima acción|proxima accion/.test(q))return{type:"tool",module:"astra",tool:"astra.followups"};
 if(/busca|buscar|encuentra|proveedor|olam|renovar|óleos|oleos|cnpj/.test(q))return{type:"tool",module:"astra",tool:"astra.search_supplier"};
 if(/resume|resumen|resúmeme|analiza|explica/.test(q))return{type:"conversation",module:"conversation",task:"summarize"};
 if(/investiga|internet|web|fuentes/.test(q))return{type:"research",module:"research"};
 if(/agrega|añade|crea|actualiza|modifica|elimina|envía|manda/.test(q))return{type:"action",module:"automation",requiresConfirmation:true};
 return{type:"conversation",module:"conversation"};
}
