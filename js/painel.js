// Painel do Barbeiro - Lógica de Gestão
// Usamos a mesma origem da página para evitar problemas de porta/CORS
const API_URL = window.location.origin.includes('5500') ? "http://localhost:3000" : window.location.origin;
const AGENDAMENTOS_URL = `${API_URL}/agendamentos`;

console.log("=== SISTEMA INICIADO NO PAINEL ===");
console.log("Página carregada em:", window.location.href);
console.log("Conectando na API em:", AGENDAMENTOS_URL);

// Adicionar indicador visual de conexão no console
window.addEventListener('load', () => {
    console.log("%c Servidor está respondendo! Se vir erro de conexão, use a porta 3000.", "color: #00f2ff; font-weight: bold; font-size: 14px;");
});

// Elements
const portWarning = document.getElementById('portWarning');
const barberFilter = document.getElementById('barberFilter');

// Verificar se está na porta errada (5500 do Live Server)
if (window.location.port === '5500') {
    if (portWarning) portWarning.style.display = 'block';
    console.warn("AVISO: Você está usando a porta 5500. Use a porta 3000 para que o sistema funcione corretamente.");
}
const dateFilter = document.getElementById('dateFilter');
const prevDayBtn = document.getElementById('prevDay');
const nextDayBtn = document.getElementById('nextDay');
const todayBtn = document.getElementById('todayBtn');
const appointmentList = document.getElementById('appointmentList');
const totalCount = document.getElementById('totalCount');
const loadingIndicator = document.getElementById('loading');

// Default to today
function setInitialDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (dateFilter) {
        dateFilter.value = todayStr;
        console.log("Data inicial definida para:", todayStr);
    }
}

setInitialDate();

async function fetchAppointments() {
    if (!barberFilter || !dateFilter) {
        console.error("Filtros não encontrados no DOM!");
        return;
    }

    const barber = barberFilter.value;
    const date = dateFilter.value;

    console.log(`Solicitando dados: Barbeiro="${barber}", Data="${date}"`);

    if (!barber || !date) {
        console.warn("Barbeiro ou Data ausentes no filtro.");
        return;
    }

    showLoading(true);
    appointmentList.innerHTML = '';

    try {
        const url = `${AGENDAMENTOS_URL}?barbeiro=${encodeURIComponent(barber)}&data=${date}`;
        console.log("Chamando URL:", url);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro no servidor: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Resposta recebida! Itens encontrados: ${data.length}`);

        if (data.length > 0) {
            console.table(data); // Ajuda a ver os dados no F12
        }

        renderAppointments(data, date);
        updateStats(data);
    } catch (error) {
        console.error("ERRO AO CARREGAR:", error);
        appointmentList.innerHTML = `
            <div class="empty-state">
                <p style="color: #ff3e3e; font-weight: bold;">Erro de Conexão!</p>
                <p>O servidor em ${API_URL} não respondeu.</p>
                <p style="font-size: 0.8rem; opacity: 0.7;">Motivo: ${error.message}</p>
                <button onclick="fetchAppointments()" class="btn-outline" style="margin-top: 1rem;">Tentar Novamente</button>
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

function renderAppointments(appointments, selectedDate) {
    if (appointments.length === 0) {
        const parts = selectedDate.split('-');
        const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        appointmentList.innerHTML = `
            <div class="empty-state">
                <p>Nenhum agendamento para o dia ${formattedDate}.</p>
                <p style="font-size: 0.8rem; opacity: 0.6;">Tente mudar o dia ou o barbeiro.</p>
            </div>
        `;
        return;
    }

    appointments.forEach(app => {
        const isConcluido = app.status === 'concluido';
        const item = document.createElement('div');
        item.className = `appointment-item ${isConcluido ? 'concluido' : ''}`;

        // Formatar telefone para link do WhatsApp
        const cleanPhone = (app.telefone || "").replace(/\D/g, "");
        const waLink = `https://wa.me/55${cleanPhone}`;

        item.innerHTML = `
            <div class="time-badge">${(app.hora || "").slice(0, 5)}</div>
            <div class="client-info">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <h4>${app.nome}</h4>
                    ${isConcluido ? '<span class="status-badge"><i class="fas fa-check-circle" style="margin-right: 4px;"></i>Concluído</span>' : ''}
                </div>
                <div class="client-meta">
                    <div class="meta-item">
                        <i class="fas fa-scissors"></i>
                        <span>${app.servicos}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-phone-alt"></i>
                        <span>${app.telefone || "Não informado"}</span>
                    </div>
                </div>
            </div>
            <div class="action-btns">
                <a href="${waLink}" target="_blank" class="btn-action btn-wa" title="WhatsApp">
                    <i class="fab fa-whatsapp"></i>
                </a>
                
                ${!isConcluido ? `
                    <button onclick="confirmAppointment(${app.id})" class="btn-action btn-check" title="Confirmar">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}

                <button onclick="deleteAppointment(${app.id})" class="btn-action btn-del" title="Excluir">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        appointmentList.appendChild(item);
    });
}

async function confirmAppointment(id) {
    try {
        const response = await fetch(`${AGENDAMENTOS_URL}/${id}/confirmar`, {
            method: 'PATCH'
        });

        if (response.ok) {
            console.log("Agendamento confirmado com sucesso:", id);
            fetchAppointments();
        } else {
            alert("Erro ao confirmar agendamento.");
        }
    } catch (error) {
        console.error("Erro ao confirmar:", error);
    }
}

function changeDay(delta) {
    console.log("Botão de seta clicado. Delta:", delta);
    const currentVal = dateFilter.value;
    if (!currentVal) {
        console.warn("Input de data vazio!");
        return;
    }

    try {
        // Criar objeto Date tratando fuso horário de forma segura (T12:00 para evitar mudanças de dia involuntárias)
        const date = new Date(currentVal + 'T12:00:00');
        if (isNaN(date.getTime())) throw new Error("Data inválida");

        date.setDate(date.getDate() + delta);

        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');

        const newDateStr = `${y}-${m}-${d}`;
        dateFilter.value = newDateStr;

        console.log("Nova data definida no input:", newDateStr);
        fetchAppointments();
    } catch (e) {
        console.error("Erro ao processar mudança de dia:", e);
    }
}

async function deleteAppointment(id) {
    if (!confirm("Deseja realmente cancelar este agendamento?")) return;

    try {
        const response = await fetch(`${AGENDAMENTOS_URL}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            console.log("Cancelado com sucesso:", id);
            fetchAppointments();
        } else {
            alert("Erro ao excluir agendamento.");
        }
    } catch (error) {
        console.error("Erro ao deletar:", error);
    }
}

function updateStats(data) {
    if (totalCount) totalCount.textContent = data.length;
}

function showLoading(isLoading) {
    if (loadingIndicator) loadingIndicator.style.display = isLoading ? 'block' : 'none';
    if (appointmentList) appointmentList.style.display = isLoading ? 'none' : 'block';
}

// Event Listeners
if (barberFilter) barberFilter.addEventListener('change', () => {
    console.log("Barbeiro trocado no menu.");
    fetchAppointments();
});

if (dateFilter) {
    // Escuta tanto 'change' quanto 'input' para garantir funcionamento em todos os browsers
    ['change', 'input'].forEach(evt => {
        dateFilter.addEventListener(evt, () => {
            console.log(`Evento "${evt}" detectado na data.`);
            fetchAppointments();
        });
    });
}

if (prevDayBtn) prevDayBtn.addEventListener('click', (e) => {
    e.preventDefault();
    changeDay(-1);
});
if (nextDayBtn) nextDayBtn.addEventListener('click', (e) => {
    e.preventDefault();
    changeDay(1);
});
if (todayBtn) todayBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log("Voltando hoje...");
    setInitialDate();
    fetchAppointments();
});

// Initial Load
fetchAppointments();
