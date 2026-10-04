export function createOrb({ root, status, onActivate }) {
  let state = "idle";
  const setState = (next) => {
    state = next;
    root.dataset.state = next;
    status.textContent = next === "listening" ? "ESCUCHANDO" :
      next === "thinking" ? "PROCESANDO" :
      next === "speaking" ? "RESPONDIENDO" : "";
  };
  root.addEventListener("click", () => onActivate?.());
  const setAppearance = (appearance) => {
    if (!appearance) return;
    root.dataset.orb = appearance.id || "aurora";
    root.setAttribute("aria-label", `Hablar con Emma · ${appearance.name || "Emma"}`);
  };
  return { setState, getState: () => state, setAppearance };
}