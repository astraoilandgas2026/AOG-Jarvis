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
  return { setState, getState: () => state };
}