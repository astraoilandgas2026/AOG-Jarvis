const PLANS={
 supplier:{tools:["astra.intelligence","document.intelligence","procurement.intelligence","astra.followups"],goal:"contexto → evidencia → estado comercial → próxima acción"},
 email:{tools:["astra.context","mail.read","mail.send"],goal:"contexto → revisar correo → preparar/enviar con confirmación"},
 calendar:{tools:["astra.context","astra.followups","calendar.read","calendar.create"],goal:"contexto → pendientes → agenda → crear evento con confirmación"},
 project:{tools:["github.read","astra.context"],goal:"código → contexto Astra"},
 documents:{tools:["astra.documents","document.intelligence","procurement.intelligence"],goal:"documentos → evidencia → gaps → estado"}
};
export function buildExecutionPlan(kind="supplier",registry={}){const p=PLANS[kind]||PLANS.supplier;return {kind,goal:p.goal,steps:p.tools.map(id=>{const t=registry[id];return{id,label:t?.label||id,available:Boolean(t?.functionName)||id==="calendar.read"||id==="calendar.create"||id==="gmail.read"||id==="gmail.send",permission:t?.permission||"read",confirmation:["mail.send","gmail.send","calendar.create"].includes(id)}}),zero_cost_rule:"Priorizar datos existentes, cache y herramientas conectadas antes de LLM; no ejecutar escrituras sin confirmación."};}
