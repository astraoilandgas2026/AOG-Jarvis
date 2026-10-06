import assert from "node:assert/strict";
import { freqtradeStatus, freqtradeRequest } from "../app/modules/freqtrade-adapter.js";
assert.equal((await freqtradeStatus({})).configured,false);
assert.equal((await freqtradeRequest("status",{},{})).ok,false);
assert.equal((await freqtradeRequest("status",{},{})).error,"FREQTRADE_NOT_CONFIGURED");
console.log("freqtrade adapter tests passed");
