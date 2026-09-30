const PROVIDERS = Object.freeze({
  cloud_openai: { id: "cloud_openai", label: "OpenAI", mode: "cloud" },
  cloud_gemini: { id: "cloud_gemini", label: "Gemini", mode: "cloud" },
  local: { id: "local", label: "Local model", mode: "local" }
});

export function getProviders() {
  return PROVIDERS;
}

export function selectProvider({ task = "conversation", preferred = null } = {}) {
  if (preferred && PROVIDERS[preferred]) return PROVIDERS[preferred];
  if (task === "private" || task === "offline") return PROVIDERS.local;
  return PROVIDERS.local;
}
