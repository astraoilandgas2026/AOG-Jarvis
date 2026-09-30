# AOG Jarvis — 10-point build plan

Status: implementation started.

1. AI brain — Edge Function `jarvis-chat`, OpenAI Responses API, provider key kept server-side.
2. Astra OS — read-only supplier search remains the first production tool.
3. Tool layer — central registry with explicit read/write permissions.
4. Security — Edge Functions require authenticated Supabase JWT; no service-role key in frontend.
5. Memory — conversation history contract established; persistent memory comes after the first live AI/tool test.
6. Voice — browser STT + TTS wired; AI response is the next live path.
7. Actions — write tools remain disabled until confirmation and audit design are validated.
8. UI — current orb/PWA design preserved.
9. Cloud — GitHub Pages + Supabase Edge Functions; no desktop dependency.
10. Mobile/Windows — install/native integration only after cloud core passes acceptance.

Acceptance gate:
VOICE -> AI -> TOOL -> REAL ASTRA DATA -> SPOKEN RESPONSE.

Do not claim completion until a real authenticated browser test passes.
