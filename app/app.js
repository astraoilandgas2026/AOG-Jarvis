import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { CONFIG } from "./config.js";

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabasePublishableKey);

const authPanel = document.querySelector("#auth-panel");
const jarvisPanel = document.querySelector("#jarvis-panel");
const logoutButton = document.querySelector("#logout");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const authStatus = document.querySelector("#auth-status");
const sessionUser = document.querySelector("#session-user");
const result = document.querySelector("#result");
const input = document.querySelector("#query");
const searchButton = document.querySelector("#search");

function setAuthStatus(message = "") {
  authStatus.textContent = message;
}

function renderSession(session) {
  const user = session?.user ?? null;
  const signedIn = Boolean(user);

  authPanel.classList.toggle("hidden", signedIn);
  jarvisPanel.classList.toggle("hidden", !signedIn);
  logoutButton.classList.toggle("hidden", !signedIn);

  if (signedIn) {
    sessionUser.textContent = user.email ?? user.id;
    result.textContent = "Sesión activa. Escribe un proveedor para comenzar.";
  }
}

async function login() {
  setAuthStatus("Autenticando...");
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInput.value.trim(),
    password: passwordInput.value
  });

  if (error) {
    setAuthStatus(error.message);
    return;
  }

  setAuthStatus("");
}

async function signup() {
  setAuthStatus("Creando cuenta...");
  const { error } = await supabase.auth.signUp({
    email: emailInput.value.trim(),
    password: passwordInput.value
  });

  if (error) {
    setAuthStatus(error.message);
    return;
  }

  setAuthStatus("Cuenta creada. Si Supabase exige confirmación de email, revisa tu correo antes de entrar.");
}

async function searchSupplier() {
  const q = input.value.trim();
  if (q.length < 2) {
    result.textContent = "Escribe al menos 2 caracteres.";
    return;
  }

  searchButton.disabled = true;
  result.textContent = "Consultando tool layer...";

  const { data, error } = await supabase.functions.invoke(CONFIG.functionName, {
    body: { q, limit: 10 }
  });

  searchButton.disabled = false;

  if (error) {
    result.textContent = `Error: ${error.message}`;
    return;
  }

  result.textContent = JSON.stringify(data, null, 2);
}

document.querySelector("#login").addEventListener("click", login);
document.querySelector("#signup").addEventListener("click", signup);
logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
});
searchButton.addEventListener("click", searchSupplier);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") searchSupplier();
});

supabase.auth.onAuthStateChange((_event, session) => {
  renderSession(session);
});

const { data: { session } } = await supabase.auth.getSession();
renderSession(session);
