# Emma Smart Router

Isolated routing layer for Emma/Jarvis.

Purpose: choose the smallest execution path that can safely satisfy a request.

- fast: deterministic source-of-truth lookup; avoid LLM/tool fan-out.
- standard: bounded tool/model execution.
- deep: evidence, multi-step procurement/DD, or parallel research.

This module is intentionally not imported by the application yet. It has no side effects,
no network calls, no secrets, and no Supabase writes.

Integration comes only after deterministic tests and an E2E benchmark against the existing Emma core.

Procurement rule: evidence requirements cannot be downgraded to the fast path.
