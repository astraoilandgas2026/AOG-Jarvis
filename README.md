# AOG-Jarvis

Internal assistant layer for Astra Oil & Gas.

Jarvis queries and operates on the existing Astra Procurement Intelligence OS without duplicating supplier intelligence.

Flow: USER → JARVIS → SECURE TOOL LAYER → SUPABASE → PROCUREMENT OS

Principles:
- Procurement OS remains the source of truth.
- Jarvis starts READ-ONLY.
- No production writes in milestone 1.
- No service-role secrets in client code.
- Every tool has an explicit permission boundary.
- Supplier intelligence is never copied into a second database.
- Claimed / documented / independently_verified / physically_verified remain distinct.

First milestone: repository foundation, secure Edge Function, authenticated read-only supplier search, real supplier verification, frontend shell.

Supabase project: dhswxxathvzzlybxukat

AOG-Procurement-os is a separate repository and must not be modified by this project.