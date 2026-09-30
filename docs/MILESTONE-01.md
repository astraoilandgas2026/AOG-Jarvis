# Milestone 01 — Foundation

Status: IMPLEMENTED — pending first real browser acceptance test.

Verified:
1. Isolated GitHub repository exists and uses main.
2. Architecture is documented.
3. Client command-center shell exists.
4. Authenticated read-only supplier search Edge Function is deployed.
5. Browser calls the tool layer instead of querying supplier tables directly.
6. Service-role access is not exposed in the browser.
7. Supplier query uses an allowlisted column set and max 20 results.
8. No production supplier data is written by Jarvis.
9. Tool Registry is now the single frontend entry point for available tools.

Acceptance gate still open:
- Login with a real authorized account.
- Search a real supplier such as Olam.
- Confirm returned data matches Astra Procurement OS.
- Verify GitHub Pages deployment of the latest frontend commit.

Next: Milestone 02 — Jarvis Core / Intent / AI Router abstraction.
