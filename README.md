# AOG-Jarvis

Internal assistant layer for Astra Oil & Gas.

## Working rule
- Responses to Leo must be short, direct, and actionable.
- Do not explain blockers unless necessary.
- When something breaks, investigate and execute the fix; report the result, not a long diagnosis.
- Do not ask for approval when the next action is clear and safe.
- Verify changes with evidence before declaring PASS.

## Architecture
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

E2E browser verification is executed by GitHub Actions with Playwright.


<!-- final 30x verification v15 -->
