export function createOrb({ root, status, onActivate }) {
  let state = "idle";
  const setState = (next) => {
    state = next;
    root.dataset.state = next;
    root.dataset.activity = next;
    status.textContent = next === "listening" ? "ESCUCHANDO" :
      next === "thinking" ? "PROCESANDO" :
      next === "speaking" ? "RESPONDIENDO" : "EMMA LISTA";
  };
  root.addEventListener("click", () => onActivate?.());
  const setAppearance = (appearance) => {
    if (!appearance) return;
    root.dataset.orb = appearance.id || "aurora";
    root.setAttribute("aria-label", `Hablar con Emma · ${appearance.name || "Emma"}`);
  };
  const setConnection = (connected) => { root.dataset.connection = connected ? "connected" : "offline"; };
  return { setState, getState: () => state, setAppearance, setConnection };
}