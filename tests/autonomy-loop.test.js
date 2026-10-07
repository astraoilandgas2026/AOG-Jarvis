import assert from "node:assert/strict";
import {createAutonomyRun,startRun,recordExecution,verifyStep,recordMemoryEvent,summarizeRun,canContinue} from "../app/core/autonomy-loop.js";

let run=createAutonomyRun({query:"verifica proveedor",steps:[{id:"research",tool:"ai.research"},{id:"dd",tool:"astra.dd"}]});
assert.equal(run.status,"planned");
run=startRun(run); assert.equal(run.status,"running"); assert.equal(canContinue(run),true);
run=recordExecution(run,"research",{ok:true,data:{sources:3}});
run=verifyStep(run,"research",{passed:true,evidence:{source:"web",count:3}});
assert.equal(run.steps[0].status,"verified");
assert.equal(run.evidence.length,1);
run=recordExecution(run,"dd",{ok:true,data:{status:"documented"}});
run=verifyStep(run,"dd",{passed:false,error:"DOCUMENT_MISSING"});
assert.equal(run.status,"failed");
run=recordMemoryEvent(run,{type:"research_result",key:"supplier_x"});
assert.equal(run.memory_events.length,1);
const summary=summarizeRun(run);
assert.deepEqual(summary,{status:"failed",query:"verifica proveedor",total_steps:2,verified:1,failed:1,evidence_count:1,memory_events:1,finished_at:run.finished_at});
console.log("AUTONOMY LOOP TEST PASS");
