# AI Provider Failover

Jarvis uses a provider abstraction so the assistant does not depend on one AI vendor.

Order:
1. Groq — primary.
2. Gemini — automatic fallback.
3. OpenAI — reserved for future paid/authorized use.
4. Anthropic — reserved.
5. Local model — reserved.

A provider is considered failed on missing configuration, HTTP 429, timeout/network failure, or other non-success responses. Jarvis attempts the next configured provider in the same request.

No provider is literally unlimited. The objective is continuous service through independent quotas.

Current Gemini model: gemini-3.8-flash.
Secret required in Supabase Edge Functions: GEMINI_API_KEY.
Never put provider keys in the frontend.

Telemetry is stored in public.jarvis_provider_events with provider, model, status, error code and latency.

Gemini free-tier availability and quotas can change; verify current limits before changing provider order.
