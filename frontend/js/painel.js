const TOKEN_KEY = "chatubas_token";
const BARBER_KEY = "chatubas_barbeiro";

function apiBase() {
  const base = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || "";
  return String(base).replace(/\/$/, "");
}

function agendamentosUrl(path = "") {
  const base = `${apiBase()}/agendamentos`;
  if (!path) return base;
  if (path.startsWith("?")) return `${base}${path}`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function financeiroUrl(query = "") {
  return `${apiBase()}/financeiro/resumo${query}`;
}

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
}

function requireAuth() {
  if (!localStorage.getItem(TOKEN_KEY)) {
    window.location.replace("login.html");
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(BARBER_KEY);
  window.location.replace("login.html");
}

if (!requireAuth()) {
  // redirect to login
} else {

const portWarning = document.getElementById("portWarning");
const dateFilter = document.getElementById("dateFilter");
const dateFilterDisplay = document.getElementById("dateFilterDisplay");
const dateHeading = document.getElementById("dateHeading");
const barberNameEl = document.getElementById("barberName");
const prevDayBtn = document.getElementById("prevDay");
const nextDayBtn = document.getElementById("nextDay");
const todayBtn = document.getElementById("todayBtn");
const logoutBtn = document.getElementById("logoutBtn");
const appointmentList = document.getElementById("appointmentList");
const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const doneCount = document.getElementById("doneCount");
const loadingIndicator = document.getElementById("loading");
const financeTotal = document.getElementById("financeTotal");
const financeCount = document.getElementById("financeCount");
const financeByPayment = document.getElementById("financeByPayment");
const financeHistory = document.getElementById("financeHistory");
const financeTabs = document.querySelectorAll(".finance-tab");

let financePeriod = "dia";
const loggedBarber = localStorage.getItem(BARBER_KEY) || "";

if ((window.location.port === "5500" || window.location.port === "5173") && portWarning) {
  portWarning.style.display = "block";
}

if (barberNameEl && loggedBarber) {
  barberNameEl.innerHTML = `<i class="fas fa-user-tie"></i> ${loggedBarber}`;
}

logoutBtn?.addEventListener("click", logout);

function formatIsoToBR(isoDate) {
  if (!isoDate) return "";
  const part = String(isoDate).slice(0, 10);
  const [year, month, day] = part.split("-");
  if (!year || !month || !day) return part;
  return `${day}/${month}/${year}`;
}

function formatDateBR(isoDate) {
  const date = new Date(isoDate + "T12:00:00");
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function updateDateDisplay(isoDate) {
  if (dateFilterDisplay) {
    dateFilterDisplay.textContent = formatIsoToBR(isoDate || dateFilter?.value);
  }
}

function capitalizeName(name) {
  return (name || "")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function updateDateHeading(isoDate) {
  if (!dateHeading || !isoDate) return;
  dateHeading.textContent = `${formatDateBR(isoDate)} · ${loggedBarber}`;
}

function setInitialDate() {
  const now = new Date();
  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  if (dateFilter) dateFilter.value = todayStr;
  updateDateDisplay(todayStr);
  updateDateHeading(todayStr);
}

setInitialDate();

async function verifySession() {
  try {
    const response = await authFetch(`${apiBase()}/auth/me`);
    if (!response.ok) {
      logout();
      return false;
    }
    const data = await response.json();
    if (data.barbeiro) {
      localStorage.setItem(BARBER_KEY, data.barbeiro);
      if (barberNameEl) {
        barberNameEl.innerHTML = `<i class="fas fa-user-tie"></i> ${data.barbeiro}`;
      }
    }
    return true;
  } catch {
    return true;
  }
}

async function fetchAppointments() {
  if (!dateFilter) return;

  const date = dateFilter.value;
  if (!date) return;

  updateDateHeading(date);
  updateDateDisplay(date);
  showLoading(true);
  appointmentList.innerHTML = "";

  try {
    const params = new URLSearchParams({ data: date });
    const response = await authFetch(`${agendamentosUrl()}?${params}`);

    if (response.status === 401) {
      logout();
      return;
    }

    if (!response.ok) {
      throw new Error(`Erro no servidor: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("Recarregue com Ctrl+F5 em http://localhost:3000/painel.html");
    }

    const data = await response.json();
    renderAppointments(data, date);
    updateStats(data);
    await fetchFinanceiro();
  } catch (error) {
    appointmentList.innerHTML = `
      <div class="empty-state">
        <p style="color: #c45c5c; font-weight: bold;">Erro de conexão</p>
        <p>Verifique se o servidor está rodando (<code>npm start</code>).</p>
        <p style="font-size: 0.8rem; opacity: 0.7;">${error.message}</p>
        <button type="button" onclick="fetchAppointments()" class="btn-outline" style="margin-top: 1rem;">Tentar novamente</button>
      </div>
    `;
  } finally {
    showLoading(false);
  }
}

async function fetchFinanceiro() {
  if (!dateFilter?.value) return;

  const date = dateFilter.value;
  const mes = date.slice(0, 7);
  const query =
    financePeriod === "mes"
      ? `?mes=${encodeURIComponent(mes)}`
      : `?data=${encodeURIComponent(date)}`;

  try {
    const response = await authFetch(financeiroUrl(query));

    if (response.status === 401) {
      logout();
      return;
    }

    if (!response.ok) return;

    const data = await response.json();
    renderFinanceiro(data);
  } catch (error) {
    console.error("Erro financeiro:", error);
  }
}

function renderFinanceiro(data) {
  if (financeTotal) financeTotal.textContent = data.total_formatado || formatMoney(data.total);
  if (financeCount) financeCount.textContent = String(data.atendimentos || 0);

  if (financeByPayment) {
    const entries = Object.entries(data.por_pagamento || {});
    if (entries.length === 0) {
      financeByPayment.innerHTML = `<p class="finance-empty">Nenhum corte finalizado neste período.</p>`;
    } else {
      financeByPayment.innerHTML = entries
        .map(
          ([forma, valor]) =>
            `<div class="finance-pay-chip"><span>${forma}</span><strong>${formatMoney(valor)}</strong></div>`
        )
        .join("");
    }
  }

  if (financeHistory) {
    const historico = data.historico || [];
    if (historico.length === 0) {
      financeHistory.innerHTML = "";
    } else {
      financeHistory.innerHTML = `
        <h3 class="finance-history-title">Cortes finalizados</h3>
        <ul class="finance-history-list">
          ${historico
            .map(
              (item) => `
            <li class="finance-history-item">
              <div>
                <strong>${capitalizeName(item.nome)}</strong>
                <span>${formatIsoToBR(item.data)} · ${item.hora} · ${item.servicos}</span>
              </div>
              <div class="finance-history-right">
                <span class="finance-pay-badge">${item.forma_pagamento || "—"}</span>
                <strong>${item.valor_formatado || formatMoney(item.valor_total)}</strong>
              </div>
            </li>`
            )
            .join("")}
        </ul>`;
    }
  }
}

function buildWhatsAppLink(app, dateLabel) {
  let cleanPhone = (app.telefone || "").replace(/\D/g, "");
  if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
    cleanPhone = `55${cleanPhone}`;
  }
  const hora = (app.hora || "").slice(0, 5);
  const pagamento = app.forma_pagamento ? `\n💳 ${app.forma_pagamento}` : "";
  const text = encodeURIComponent(
    `Olá ${capitalizeName(app.nome)}! Passando para confirmar seu horário na Chatubas Cortes:\n\n` +
      `📅 ${dateLabel}\n🕐 ${hora}\n✂️ ${app.servicos}\n💈 ${app.barbeiro}${pagamento}\n\n` +
      `Te esperamos! Se precisar remarcar, responda esta mensagem.`
  );
  return `https://wa.me/${cleanPhone}?text=${text}`;
}

function renderAppointments(appointments, selectedDate) {
  if (appointments.length === 0) {
    const formattedDate = formatDateBR(selectedDate);
    appointmentList.innerHTML = `
      <div class="empty-state">
        <p>Nenhum agendamento para <strong>${formattedDate}</strong>.</p>
        <button type="button" onclick="changeDay(1)" class="btn-outline">Ver dia seguinte →</button>
      </div>
    `;
    return;
  }

  const dateLabel = formatDateBR(selectedDate);

  appointments.forEach((app) => {
    const isConcluido = app.status === "concluido";
    const lembreteEnviado = Boolean(app.lembrete_enviado_em);
    const valor = app.valor_total ? formatMoney(app.valor_total) : "";
    const item = document.createElement("article");
    item.className = `appointment-item${isConcluido ? " concluido" : ""}`;

    item.innerHTML = `
      <div class="appointment-item__head">
        <span class="time-badge">${(app.hora || "").slice(0, 5)}</span>
        <div class="appointment-badges">
          <span class="status-badge ${isConcluido ? "status-badge--done" : "status-badge--pending"}">
            <i class="fas fa-${isConcluido ? "check-circle" : "clock"}"></i>
            ${isConcluido ? "Atendido" : "Pendente"}
          </span>
          ${lembreteEnviado ? `
            <span class="status-badge status-badge--reminder" title="Lembrete WhatsApp já enviado">
              <i class="fab fa-whatsapp"></i>
              Lembrete enviado
            </span>
          ` : ""}
        </div>
      </div>
      <div class="appointment-item__body">
        <h3 class="client-name">${capitalizeName(app.nome)}</h3>
        <div class="client-meta">
          <div class="meta-item"><i class="fas fa-scissors"></i><span>${app.servicos}</span></div>
          <div class="meta-item"><i class="fas fa-phone-alt"></i><span>${app.telefone || "Sem telefone"}</span></div>
          ${app.forma_pagamento ? `<div class="meta-item"><i class="fas fa-credit-card"></i><span>${app.forma_pagamento}${valor ? ` · ${valor}` : ""}</span></div>` : ""}
        </div>
      </div>
      <div class="appointment-item__actions">
        <a href="${buildWhatsAppLink(app, dateLabel)}" target="_blank" rel="noopener noreferrer" class="btn-action btn-wa" title="Abrir WhatsApp com lembrete pronto">
          <i class="fab fa-whatsapp"></i>
          <span>Lembrete</span>
        </a>
        ${!isConcluido ? `
          <button type="button" onclick="confirmAppointment(${app.id})" class="btn-action btn-check">
            <i class="fas fa-check"></i>
            <span>Atendido</span>
          </button>
        ` : `
          <button type="button" class="btn-action btn-check" disabled style="opacity:0.45;cursor:default;">
            <i class="fas fa-check"></i>
            <span>Feito</span>
          </button>
        `}
        <button type="button" onclick="deleteAppointment(${app.id})" class="btn-action btn-del">
          <i class="fas fa-trash-alt"></i>
          <span>Cancelar</span>
        </button>
      </div>
    `;

    appointmentList.appendChild(item);
  });
}

async function confirmAppointment(id) {
  try {
    const response = await authFetch(agendamentosUrl(`/${id}/confirmar`), { method: "PATCH" });
    if (response.status === 401) {
      logout();
      return;
    }
    if (response.ok) fetchAppointments();
    else alert("Erro ao confirmar agendamento.");
  } catch (error) {
    console.error(error);
  }
}

function changeDay(delta) {
  const currentVal = dateFilter?.value;
  if (!currentVal) return;

  const date = new Date(currentVal + "T12:00:00");
  date.setDate(date.getDate() + delta);

  const newDateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  dateFilter.value = newDateStr;
  updateDateDisplay(newDateStr);
  fetchAppointments();
}

async function deleteAppointment(id) {
  if (!confirm("Cancelar este agendamento?")) return;

  try {
    const response = await authFetch(agendamentosUrl(`/${id}`), { method: "DELETE" });
    if (response.status === 401) {
      logout();
      return;
    }
    if (response.ok) fetchAppointments();
    else alert("Erro ao excluir agendamento.");
  } catch (error) {
    console.error(error);
  }
}

function updateStats(data) {
  const pending = data.filter((a) => a.status !== "concluido").length;
  const done = data.length - pending;

  if (totalCount) totalCount.textContent = data.length;
  if (pendingCount) pendingCount.textContent = pending;
  if (doneCount) doneCount.textContent = done;
}

function showLoading(isLoading) {
  if (loadingIndicator) loadingIndicator.hidden = !isLoading;
  if (appointmentList) appointmentList.style.display = isLoading ? "none" : "grid";
}

financeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    financeTabs.forEach((t) => t.classList.remove("finance-tab--active"));
    tab.classList.add("finance-tab--active");
    financePeriod = tab.dataset.period || "dia";
    fetchFinanceiro();
  });
});

if (dateFilter) {
  ["change", "input"].forEach((evt) => {
    dateFilter.addEventListener(evt, () => {
      updateDateDisplay();
      fetchAppointments();
    });
  });
}

if (prevDayBtn) prevDayBtn.addEventListener("click", (e) => { e.preventDefault(); changeDay(-1); });
if (nextDayBtn) nextDayBtn.addEventListener("click", (e) => { e.preventDefault(); changeDay(1); });
if (todayBtn) todayBtn.addEventListener("click", (e) => { e.preventDefault(); setInitialDate(); fetchAppointments(); });

verifySession().then(() => fetchAppointments());

} // requireAuth
