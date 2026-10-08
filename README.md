# AOG-Jarvis

Emma / AOG assistant layer for Astra Oil & Gas.

## Source of truth

AOG-Jarvis operates on the existing Astra Procurement Intelligence OS. It does not duplicate supplier intelligence.

Flow:

USER → EMMA → SECURE TOOL LAYER → SUPABASE / LOCAL BRIDGE / PROVIDERS

The separate Astra Procurement OS repository is not modified by this project.

## Current capabilities

- Conversational core with provider routing and persistent Emma context.
- Astra supplier intelligence, DD, offers, products, contacts, documents, timeline and follow-ups.
- Evidence-aware research through the local browser bridge.
- Local browser, screenshot/file/app bridge and persistent-session capability through Emma Local Bridge.
- Voice input through browser speech recognition.
- ElevenLabs TTS as primary voice path with browser speech fallback.
- Hostinger Mail for Astra mailbox read/search/send.
- GitHub authenticated read and controlled code-change workflow.
- Samsung/Android mobile bridge with heartbeat, task queue, notifications and device-token relay.
- Scheduled Emma automations and cloud runtime worker.
- Money Lab for opportunity ranking, persistence and outcomes.
- Trading Lab with deterministic market scanning, paper mode and kill-switch/risk gates.
- Offline snapshot fallback for core context.
- PWA/service-worker installation support.

## Security model

- Supabase publishable key only in the browser.
- No service-role key in the client repository.
- All 43 public tables have RLS enabled.
- All public tables have a restrictive Emma authorization gate.
- Client authorization resolves through app_security.emma_is_authorized().
- Internal scheduler/worker functions require service-role/internal credentials.
- Storage access is authorization-gated.
- Live trading is disabled; trading defaults to paper mode with a kill switch.
- Mail sending requires explicit confirmation in the UI.

## Runtime

Supabase project: dhswxxathvzzlybxukat

Local bridge:
- 127.0.0.1:43177
- Browser / web-analysis / screenshot / persistent-session capabilities.

Samsung:
- Android/Termux relay
- device-token authenticated mobile queue

## Verification rule

Never declare a feature complete from code presence alone. Verify database state, function deployment, runtime state and available end-to-end evidence before marking PASS.

## Repository rules

- Keep changes inside AOG-Jarvis.
- Do not modify the separate Astra Procurement OS repository.
- Prefer existing functions/modules over duplicate architecture.
- Never commit secrets, service-role credentials, API tokens or device tokens.
- Keep claimed, documented, independently_verified and physically_verified evidence levels distinct.
