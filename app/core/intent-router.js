export function classifyIntent(text=""){
 const q=text.trim().toLowerCase();
 if(!q)return{type:"empty",module:"conversation"};
 if(/(?:recuerda|acuérdate|acuerdate|anota|apunta|guarda|memoriza|no olvides)/.test(q))return{type:"memory_write",module:"memory"};
 if(/(?:astra|belincar|fl óleos|fl oleos|sosa|issc)/.test(q))return{type:"tool",module:"astra",tool:"astra.context"};
 if(/(?:mis tareas|tareas pendientes|mis pendientes|qué tengo pendiente|que tengo pendiente|recordatorios pendientes)/.test(q))return{type:"task_list",module:"automation"};
 if(/(?:recuérdame|recuerdame|recordatorio|alarma|pon una alarma|agrega una tarea|añade una tarea|anota como pendiente|apunta como pendiente)/.test(q))return{type:"task_create",module:"automation"};
 if(/dd|due diligence|diligencia|riesgo/.test(q))return{type:"tool",module:"astra",tool:"astra.dd"};
 if(/oferta|precio|commercial|incoterm|fob|cif|cfr/.test(q))return{type:"tool",module:"astra",tool:"astra.offers"};
 if(/^(?:emma[,:]?\s*)?(?:crea|genera|hazme|prepara)\b.*\b(documento|documentos|word|docx|pdf|powerpoint|pptx|company profile)\b/i.test(text))return{type:"action",module:"documents",task:"generate_document"};
 if(/(?:calendario|calendar|agenda|evento|reunión|reunion|cita)/.test(q))return{type:"tool",module:"calendar",tool:q.includes("crea")||q.includes("agrega")||q.includes("programa")?"calendar.create":"calendar.read"};
 if(/gmail/.test(q)&&/(?:envía|envia|manda|mandar)/.test(q))return{type:"action",module:"gmail",tool:"gmail.send",requiresConfirmation:true};
 if(/gmail/.test(q)||/(?:correo|email)/.test(q)&&/(?:google|gmail)/.test(q))return{type:"tool",module:"gmail",tool:"gmail.read"};
 if(/(?:revisa|revisar|lee|leer|mis correos|bandeja|inbox|últimos correos|ultimos correos|correo recibido|hostinger)/.test(q))return{type:"tool",module:"personal",tool:"mail.read"};
 if(/(?:envía|envia|manda|mandar)\s+(?:un\s+)?(?:correo|email|mail)/.test(q))return{type:"action",module:"personal",tool:"mail.send",requiresConfirmation:true};
 if(/documento|documentos|coa|sgs|iscc|tds|sds|ficha/.test(q))return{type:"tool",module:"astra",tool:"astra.documents"};
 if(/contacto|contactos|whatsapp|teléfono|telefono/.test(q))return{type:"tool",module:"astra",tool:"astra.contacts"};
 if(/producto|productos|feedstock|uco|av[uú]/.test(q))return{type:"tool",module:"astra",tool:"astra.products"};
 if(/timeline|historial|último contacto|ultimo contacto/.test(q))return{type:"tool",module:"astra",tool:"astra.timeline"};
 if(/follow.?up|seguimiento|pendiente|próxima acción|proxima accion/.test(q))return{type:"tool",module:"astra",tool:"astra.followups"};
 if(/busca|buscar|encuentra|proveedor|olam|renovar|óleos|oleos|cnpj/.test(q))return{type:"tool",module:"astra",tool:"astra.search_supplier"};
 if(/resume|resumen|resúmeme|analiza|explica/.test(q))return{type:"conversation",module:"conversation",task:"summarize"};
 if(/github|repositorio|repo|archivo del proyecto|código del proyecto/.test(q))return{type:"tool",module:"github",tool:"github.read"};
 if(/investiga|internet|web|fuentes/.test(q))return{type:"research",module:"research"};
 if(/agrega|añade|crea|actualiza|modifica|elimina|envía|manda/.test(q))return{type:"action",module:"automation",requiresConfirmation:true};
 return{type:"conversation",module:"conversation"};
}