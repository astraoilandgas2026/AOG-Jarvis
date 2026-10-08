import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
test("mobile bridge client contains lifecycle",()=>{const src=fs.readFileSync("app/modules/mobile-bridge.js","utf8");assert.match(src,/localStorage\.getItem/);for(const x of ["emma-mobile-bridge","heartbeat","poll","complete"])assert.ok(src.includes(x))});
test("mobile bridge server scopes operations",()=>{const src=fs.readFileSync("supabase/functions/emma-mobile-bridge/index.ts","utf8");for(const x of ["heartbeat","poll","complete","status","AUTH_REQUIRED","userId"])assert.ok(src.includes(x));assert.ok(src.includes('eq("user_id",userId)'))});
