---
name: terminal-ops
description: Evidence-first repository inspection and narrow implementation workflow.
---

# Terminal / Repository Operations

Use when Emma work requires repository changes.

## Workflow
1. Read the current repository state.
2. Locate the smallest relevant surface.
3. Prefer a feature branch.
4. Make the smallest reversible change.
5. Execute the narrowest useful verification.
6. Review the resulting diff.
7. Commit only after evidence supports the change.

## Guardrails
- Do not rewrite working architecture to fit a tool.
- Do not replace Supabase source-of-truth behavior.
- Do not add secrets to browser code.
- Do not claim a connector/tool is live merely because configuration references it.
- Distinguish configured, authenticated, verified, stale/broken and missing.
- On failure, capture the exact error before changing strategy.
