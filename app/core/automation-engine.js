const CADENCES={daily:/\bcada\s+d[ií]a\b|\bdiario\b/i,weekly:/\bcada\s+semana\b|\bsemanal\b/i,monthly:/\bcada\s+mes\b|\bmensual\b/i};
const CRON={daily:"0 8 * * *",weekly:"0 8 * * 1",monthly:"0 8 1 * *"};
export function parseAutomation(text=""){
 const q=text.trim();let cadence=null;
 for(const [name,re] of Object.entries(CADENCES))if(re.test(q)){cadence=name;break}
 if(!cadence)return{supported:false,reason:"Solo se admiten recurrencias diarias, semanales o mensuales."};
 const prompt=q.replace(/\b(cada\s+d[ií]a|diario|cada\s+semana|semanal|cada\s+mes|mensual)\b/gi,"").replace(/\s+/g," ").trim();
 return{supported:true,cadence,prompt,cron:CRON[cadence],requires_persistence:true,zero_cost:true};
}
export function automationPlan(text=""){
 const p=parseAutomation(text);
 return{...p,execution:p.supported?"persistir → programar → ejecutar en recurrencia":"no_programar",scheduler:"supabase-pg-cron"};
}
