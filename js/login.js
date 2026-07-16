const TOKEN_KEY = "chatubas_token";
const BARBER_KEY = "chatubas_barbeiro";

function apiBase() {
  const isExternal =
    window.location.protocol === "file:" ||
    window.location.port === "5500" ||
    !window.location.hostname;
  return isExternal ? "http://localhost:3000" : "";
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

if (window.location.port === "5500" && portWarning) {
  portWarning.style.display = "block";
}

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
    loginError.textContent = "Erro de conexão. Verifique se o servidor está rodando (npm start).";
    loginError.hidden = false;
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
  }
});
