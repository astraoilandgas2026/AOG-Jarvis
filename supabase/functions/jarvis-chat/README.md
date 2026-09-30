# jarvis-chat

Authenticated, server-side AI conversation endpoint.

Provider:
- Groq Free Plan
- Endpoint: https://api.groq.com/openai/v1/chat/completions
- Model: llama-3.3-70b-versatile

Required Supabase secret:
- GROQ_API_KEY

The key must never be placed in `app/` or committed to GitHub.

AI providers remain behind the Jarvis server-side provider layer so another provider can be added later without changing the frontend.