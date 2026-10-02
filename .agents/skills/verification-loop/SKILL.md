---
name: verification-loop
description: Evidence-based verification after a feature, refactor, or configuration change.
---

# Verification Loop

Use after meaningful changes to Emma or its integrations.

## Phases

### 1. Build
Run the repository's actual build command. If it fails, stop and fix before claiming readiness.

### 2. Static checks
Run the repository's configured lint/type checks where applicable. Do not invent a check that the repository does not support.

### 3. Tests
Run the relevant automated tests. Prefer the existing Emma E2E suite for behavior that crosses the browser, Supabase and tool layer.

### 4. Security
Inspect changed agent/tool configuration for:
- hardcoded secrets
- overly broad permissions
- unsafe executable hooks
- untrusted MCP inputs
- prompt-injection exposure
- accidental service-role credentials

### 5. Diff review
Review only changed files and confirm:
- no unrelated modifications
- error handling is preserved
- permissions remain explicit
- source-of-truth boundaries remain intact

### 6. Evidence report
Report:
- checks executed
- PASS/FAIL for each
- exact failures if any
- changed files
- remaining limitations

Never report PASS based only on static inspection.
