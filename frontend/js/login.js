const TOKEN_KEY = "chatubas_token";
const BARBER_KEY = "chatubas_barbeiro";

function apiBase() {
  const base = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || "";
  return String(base).replace(/\/$/, "");
}

function authUrl(path = "") {
  return `${apiBase()}/auth${path}`;
}

const portWarning = document.getElementById("portWarning");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");
const senhaInput = document.getElementById("senha");
const toggleSenhaBtn = document.getElementById("toggleSenha");

toggleSenhaBtn?.addEventListener("click", () => {
  const isHidden = senhaInput.type === "password";
  senhaInput.type = isHidden ? "text" : "password";

  const icon = toggleSenhaBtn.querySelector("i");
  if (icon) {
    icon.classList.toggle("fa-eye", !isHidden);
    icon.classList.toggle("fa-eye-slash", isHidden);
  }

  toggleSenhaBtn.setAttribute("aria-label", isHidden ? "Ocultar senha" : "Mostrar senha");
  toggleSenhaBtn.setAttribute("aria-pressed", String(isHidden));
});

if ((window.location.port === "5500" || window.location.port === "5173") && portWarning) {
  portWarning.style.display = "block";
}

(function applyHostLinks() {
  const cfg = window.APP_CONFIG || {};
  const back = document.getElementById("loginBackLink");
  if (back && cfg.SITE_URL) back.href = cfg.SITE_URL;
})();

if (localStorage.getItem(TOKEN_KEY)) {
  window.location.replace("painel.html");
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const usuario = document.getElementById("usuario")?.value.trim();
  const senha = document.getElementById("senha")?.value;

  if (!usuario || !senha) return;

  loginError.hidden = true;
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

  try {
    const response = await fetch(authUrl("/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, senha }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      loginError.textContent = data.mensagem || "Usuário ou senha incorretos.";
      loginError.hidden = false;
      return;
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(BARBER_KEY, data.barbeiro);
    window.location.replace("painel.html");
  } catch {
    loginError.textContent = "Erro de conexão. Verifique a API (APP_CONFIG.API_BASE_URL).";
    loginError.hidden = false;
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
  }
});
