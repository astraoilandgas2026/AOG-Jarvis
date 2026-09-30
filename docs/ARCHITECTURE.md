# AOG-Jarvis Architecture

AOG-Jarvis is the assistant layer; it does not own supplier master data. The Astra Procurement OS remains the source of truth.

## Target product
Jarvis evolves from a web command center into a resident desktop assistant:

Wake word → Voice → Jarvis Core → Intent Router → Tool Layer → authorized service → source of truth → response

The web app is the current control surface. A future desktop shell can keep a compact orb visible, start with the OS, capture wake-word/audio locally, and open the full command center on demand.

## Domains
- ASTRA: procurement, suppliers, products, offers, technical intelligence, DD, documents, logistics, timeline.
- PERSONAL: calendar, tasks, reminders, email and personal workflows.
- CONVERSATION: private conversational support; no automatic medical diagnosis or high-stakes decisions.
- RESEARCH: web research and synthesis.
- MEMORY: explicit user-authorized context.
- AUTOMATION: controlled actions with confirmation and auditability.

## Security
Client → authenticated session → Jarvis tool endpoint → Supabase Auth → least-privilege data access.

Never expose a service-role key in the browser. Never create a generic unrestricted SQL tool. Read/write/delete tools must be separate and permissioned.

## Current milestone
READ-ONLY supplier search through jarvis-search-supplier.

The frontend does not query procurement tables directly.

## Evolution
1. resident-ready PWA/control surface
2. voice input and orb states
3. tool registry
4. supplier/DD/offer/document tools
5. conversation and memory
6. controlled write actions
7. desktop shell + wake word
8. automation and background jobs
9. audit, backup and recovery

No production supplier records are seeded by Jarvis.