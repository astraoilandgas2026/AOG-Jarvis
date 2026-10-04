import { buildEmmaRuntime } from "./emma-runtime.js";
import { hasMinimumEvidence, normalizeEvidenceLevel } from "./evidence-engine.js";

const r1=buildEmmaRuntime("¿Cuál es el precio de Renovar?");
if(r1.route.tier!=="fast") throw new Error("price lookup must be fast");
const r2=buildEmmaRuntime("Verifica capacidad, exportación, ISCC, FFA y riesgo de Renovar");
if(r2.route.tier!=="deep" || r2.route.verification!=="required") throw new Error("procurement DD must be deep");
const r3=buildEmmaRuntime("Investiga y compara 5 proveedores brasileños",{externalData:true,parallelizable:true});
if(r3.route.tier!=="deep" || !r3.route.parallel) throw new Error("research fan-out must be deep/parallel");
if(r1.budget.deadlineMs>=r2.budget.deadlineMs) throw new Error("fast budget must be cheaper than deep");
if(normalizeEvidenceLevel("independently_verified")!=="INDEPENDENTLY VERIFIED") throw new Error("evidence normalization failed");
if(!hasMinimumEvidence("PHYSICALLY VERIFIED","DOCUMENTED")) throw new Error("evidence ranking failed");
console.log("Emma runtime tests: PASS");
