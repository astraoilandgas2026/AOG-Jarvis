# ECC integration for Emma

## Purpose
ECC is used as an engineering operating layer for AOG-Jarvis, not as a replacement for the application runtime.

Official ECC sources:
- https://ecc.tools
- https://github.com/affaan-m/ECC
- https://github.com/affaan-m/agentshield

## Selected capabilities
- Verification loop: build, type-check, lint, tests, security review and diff review.
- Terminal/repository operations: evidence-first inspection and narrow changes.
- Security review: AgentShield for agent configuration, MCP, permissions and secret surfaces.
- Skill generation/continuous learning: only when a pattern is proven useful and should become durable project guidance.

## Emma architecture boundary
ECC operates around the coding/agent harness. Emma's runtime remains:
USER → EMMA → TOOL REGISTRY → AUTHORIZED SERVICE → SUPABASE / SOURCE OF TRUTH → RESPONSE

The existing AOG-Jarvis tool registry remains canonical for application tools.

## Initial adoption
Do not install the entire ECC catalog. Start with a minimal, reviewed set. This avoids unnecessary context/tool overhead and reduces configuration risk.

Initial project-local contract:
- AGENTS.md
- .agents/skills/verification-loop/
- .agents/skills/terminal-ops/
- optional AgentShield in CI after baseline verification

## Verification contract
For any meaningful change:
1. Inspect.
2. Modify minimally.
3. Build/test.
4. Security-check changed agent/tool configuration.
5. Review diff.
6. Commit.
7. Report exact evidence.

A PASS is only reported when the corresponding check actually ran successfully.
