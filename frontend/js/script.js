// Conteúdo movido de frontend/script.js
// Configuration
const BARBER_NUMBERS = {
    Ricardo: "553788553375",
    Marcos: "553788415303",
    André: "553791695396"
};
const WHATSAPP_DEFAULT = "553788553375";

// State management
let currentDate = new Date();
let selectedDate = null;
let selectedTime = null;


function toLocalDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Elements
const calendarGrid = document.getElementById('calendarGrid');
const monthYearDisplay = document.getElementById('currentMonthYear');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const timeSlotsContainer = document.getElementById('timeSlots');
const confirmBtn = document.getElementById('confirmBooking');
const userNameInput = document.getElementById('userName');
const userPhoneInput = document.getElementById('userPhone');
const menuToggle = document.getElementById('menuToggle');
const mobileNav = document.getElementById('mobileNav');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-links a');
const successModal = document.getElementById('successModal');
const successModalDetails = document.getElementById('successModalDetails');
const successModalWhatsApp = document.getElementById('successModalWhatsApp');
const mobileCtaBtn = document.getElementById('mobileCtaBtn');
const bookingForm = document.getElementById('bookingForm');

// API base via frontend/js/config.js
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

// Buscar horários ocupados no banco (por data e barbeiro)
async function carregarHorarios(date, barber) {
    try {
        const res = await fetch(
            `${agendamentosUrl("/ocupados")}?data=${date}&barbeiro=${encodeURIComponent(barber)}`
        );

        if (!res.ok) {
            console.error("Erro ao buscar horários:", await res.text());
            return [];
        }

        const dados = await res.json();

        // backend retorna [{ hora: "HH:MM:SS" }]
        return dados.map(h => h.hora.slice(0, 5));
    } catch (err) {
        console.error("Erro ao buscar horários:", err);
        return [];
    }
}

// Estado de edição de agendamento
let editingId = null;

function setupEventListeners() {
    // Mobile Menu Toggle
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        mobileNav.classList.toggle('active');
        const open = mobileNav.classList.contains('active');
        document.body.style.overflow = open ? 'hidden' : 'auto';
        document.body.classList.toggle('mobile-menu-open', open);
    });

    // Close mobile menu when clicking a link
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            mobileNav.classList.remove('active');
            document.body.style.overflow = 'auto';
            document.body.classList.remove('mobile-menu-open');
        });
    });

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    userNameInput.addEventListener('input', validateBooking);
    const paymentMethodSelect = document.getElementById('paymentMethod');
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', validateBooking);
    }
    userPhoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);

        if (value.length > 10) {
            value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
        } else if (value.length > 6) {
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
        } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
        } else if (value.length > 0) {
            value = value.replace(/^(\d*)/, "($1");
        }

        e.target.value = value;
        validateBooking();
    });

    // Listen for service changes (permite múltiplos serviços)
    document.querySelectorAll('input[name="service"]').forEach(input => {
        input.addEventListener('change', validateBooking);
    });

    // Listen for barber changes
    document.querySelectorAll('input[name="barber"]').forEach(radio => {
        radio.addEventListener('change', () => {
            selectedTime = null;
            if (selectedDate) {
                renderTimeSlots();
            }
            validateBooking();
        });
    });

    document.querySelectorAll('[data-close-modal]').forEach(el => {
        el.addEventListener('click', closeSuccessModal);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && successModal && !successModal.hidden) {
            closeSuccessModal();
        }
    });

    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!confirmBtn.disabled) {
                submitBooking();
            } else {
                scrollToNextBookingStep();
            }
        });
    }

    if (mobileCtaBtn) {
        mobileCtaBtn.addEventListener('click', () => {
            if (!confirmBtn.disabled) {
                submitBooking();
            } else {
                scrollToNextBookingStep();
            }
        });
    }

    confirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!confirmBtn.disabled) {
            submitBooking();
        }
    });
}

async function submitBooking() {
        const selectedServices = Array
            .from(document.querySelectorAll('input[name="service"]:checked'))
            .map(input => input.value);

        const selectedBarber =
            document.querySelector('input[name="barber"]:checked').value;

        const payload = {
            nome: userNameInput.value,
            telefone: userPhoneInput.value,
            data: toLocalDateISO(selectedDate),
            hora: selectedTime + ":00",
            servicos: selectedServices.join(", "),
            barbeiro: selectedBarber,
            forma_pagamento: document.getElementById('paymentMethod')?.value || ""
        };

        try {
            confirmBtn.disabled = true;
            confirmBtn.textContent = "Salvando...";

            const url = editingId
                ? agendamentosUrl(`/${editingId}`)
                : agendamentosUrl();

            const method = editingId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                const msg =
                    result.mensagem ||
                    (response.status === 400
                        ? "Verifique data, horário e barbeiro selecionados."
                        : response.status === 404
                          ? "Rota da API não encontrada. Recarregue com Ctrl+F5."
                          : response.status === 500
                            ? "Serviço temporariamente indisponível. Tente de novo em alguns minutos."
                            : `Não foi possível salvar (${response.status}).`);
                showToast(msg, "error");
                return;
            }

            showSuccessModal({
                nome: userNameInput.value,
                telefone: userPhoneInput.value,
                data: selectedDate,
                hora: selectedTime,
                servicos: selectedServices.join(", "),
                barbeiro: selectedBarber,
                forma_pagamento: document.getElementById('paymentMethod')?.value || ""
            });

            // reset estado de edição
            editingId = null;
            confirmBtn.textContent = "Confirmar reserva";
            userNameInput.value = "";
            userPhoneInput.value = "";
            const paymentSelect = document.getElementById('paymentMethod');
            if (paymentSelect) paymentSelect.value = "";
            selectedTime = null;
            validateBooking();

            await carregarAgendamentosLista();
            if (selectedDate) {
                await renderTimeSlots();
            }
        } catch (error) {
            showToast("Não foi possível concluir a reserva. Verifique sua conexão ou tente novamente em instantes.", "error");
            console.error(error);
        } finally {
            validateBooking();
        }
}

// Carrega horários disponíveis a partir do backend
async function renderTimeSlots() {
    timeSlotsContainer.innerHTML = '';

    if (!selectedDate) return;

    const selectedBarber =
        document.querySelector('input[name="barber"]:checked').value;

    const dateISO = toLocalDateISO(selectedDate);

    const horariosOcupados =
        await carregarHorarios(dateISO, selectedBarber);

    const now = new Date();
    const isToday =
        selectedDate.getFullYear() === now.getFullYear() &&
        selectedDate.getMonth() === now.getMonth() &&
        selectedDate.getDate() === now.getDate();

    for (let hour = 6; hour <= 20; hour++) {

        const time = `${hour.toString().padStart(2, '0')}:00`;

        const slot = document.createElement('div');
        slot.classList.add('time-slot');
        slot.textContent = time;

        const slotDate = new Date(selectedDate);
        slotDate.setHours(hour, 0, 0, 0);
        const isPast = isToday && slotDate <= now;

        if (horariosOcupados.includes(time)) {
            slot.classList.add('disabled');
            slot.title = "Horário já reservado";
        } else if (isPast) {
            slot.classList.add('disabled');
            slot.title = "Horário já passou";
        } else {
            slot.addEventListener('click', () => {
                document.querySelectorAll('.time-slot')
                    .forEach(s => s.classList.remove('selected'));

                slot.classList.add('selected');
                selectedTime = time;
                validateBooking();
            });
        }

        timeSlotsContainer.appendChild(slot);
    }

    if (timeSlotsContainer.querySelectorAll('.time-slot:not(.disabled)').length === 0) {
        const hint = document.createElement('p');
        hint.className = 'time-slots-empty';
        hint.textContent = isToday
            ? "Não há mais horários hoje. Escolha outra data no calendário."
            : "Nenhum horário disponível para esta data.";
        timeSlotsContainer.appendChild(hint);
    }
}

function renderCalendar() {
    calendarGrid.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const firstDayWeekDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    // Espaços vazios antes do primeiro dia
    for (let i = 0; i < firstDayWeekDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('calendar-day', 'empty');
        calendarGrid.appendChild(emptyCell);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);

        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.textContent = day;

        const isPast = date < today;
        if (isPast) {
            dayElement.classList.add('disabled');
        }

        if (selectedDate &&
            date.toDateString() === selectedDate.toDateString()) {
            dayElement.classList.add('selected');
        }

        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        dayElement.addEventListener('click', () => {
            if (isPast) return;

            selectedDate = date;
            document.querySelectorAll('.calendar-day')
                .forEach(d => d.classList.remove('selected'));
            dayElement.classList.add('selected');

            selectedTime = null;
            renderTimeSlots();
            validateBooking();
        });

        calendarGrid.appendChild(dayElement);
    }
}

function getBookingState() {
    return {
        isNameOk: userNameInput.value.trim().length > 0,
        isPhoneOk: userPhoneInput.value.trim().length > 0,
        isDateOk: selectedDate !== null,
        isTimeOk: selectedTime !== null,
        isBarberOk: document.querySelector('input[name="barber"]:checked') !== null,
        isServiceOk: document.querySelectorAll('input[name="service"]:checked').length > 0,
        isPaymentOk: Boolean(document.getElementById('paymentMethod')?.value),
    };
}

function scrollToElement(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function scrollToNextBookingStep() {
    const state = getBookingState();

    if (!state.isBarberOk) {
        scrollToElement('#step-barber');
        showToast('Escolha o profissional.', 'info');
        return;
    }
    if (!state.isServiceOk) {
        scrollToElement('#step-services');
        showToast('Selecione ao menos um serviço.', 'info');
        return;
    }
    if (!state.isDateOk) {
        scrollToElement('#step-date');
        showToast('Escolha a data no calendário.', 'info');
        return;
    }
    if (!state.isTimeOk) {
        scrollToElement('#step-times');
        showToast('Escolha um horário disponível.', 'info');
        return;
    }
    if (!state.isNameOk) {
        scrollToElement('#userName');
        userNameInput.focus();
        showToast('Informe seu nome completo.', 'info');
        return;
    }
    if (!state.isPhoneOk) {
        scrollToElement('#userPhone');
        userPhoneInput.focus();
        showToast('Informe seu WhatsApp.', 'info');
        return;
    }
    if (!state.isPaymentOk) {
        scrollToElement('#paymentMethod');
        document.getElementById('paymentMethod')?.focus();
        showToast('Escolha a forma de pagamento.', 'info');
        return;
    }

    scrollToElement('#confirmBooking');
}

function validateBooking() {
    const state = getBookingState();
    const { isNameOk, isPhoneOk, isDateOk, isTimeOk, isBarberOk, isServiceOk, isPaymentOk } = state;
    const isComplete = isNameOk && isPhoneOk && isDateOk && isTimeOk && isBarberOk && isServiceOk && isPaymentOk;

    if (isComplete) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirmar reserva";
        if (mobileCtaBtn) {
            mobileCtaBtn.textContent = "Confirmar reserva";
            mobileCtaBtn.classList.add('ready');
        }
    } else {
        confirmBtn.disabled = true;
        if (mobileCtaBtn) {
            mobileCtaBtn.textContent = "Continuar reserva";
            mobileCtaBtn.classList.remove('ready');
        }

        if (!isBarberOk) confirmBtn.textContent = "Escolha um profissional";
        else if (!isServiceOk) confirmBtn.textContent = "Selecione ao menos um serviço";
        else if (!isDateOk) confirmBtn.textContent = "Escolha a data";
        else if (!isTimeOk) confirmBtn.textContent = "Escolha o horário";
        else if (!isNameOk) confirmBtn.textContent = "Informe seu nome";
        else if (!isPhoneOk) confirmBtn.textContent = "Informe o WhatsApp";
        else if (!isPaymentOk) confirmBtn.textContent = "Escolha o pagamento";
    }
}

// Carrega a lista de agendamentos (para versões que possuem essa funcionalidade)
async function carregarAgendamentosLista() {
    try {
        const response = await fetch(agendamentosUrl());
        if (response.ok) {
            const agendamentos = await response.json();
            console.log("Agendamentos carregados:", agendamentos.length);
            // Aqui você pode adicionar lógica para renderizar uma lista em algum lugar da página se desejar
        }
    } catch (error) {
        console.error("Erro ao carregar lista de agendamentos:", error);
    }
}

function formatDateBR(date) {
    return date.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function buildWhatsAppLink(barber, { nome, data, hora, servicos }) {
    const number = BARBER_NUMBERS[barber] || WHATSAPP_DEFAULT;
    const dataFmt = formatDateBR(data);
    const text = encodeURIComponent(
        `Olá! Acabei de reservar um horário pelo site.\n\nNome: ${nome}\nProfissional: ${barber}\nData: ${dataFmt}\nHorário: ${hora}\nServiços: ${servicos}`
    );
    return `https://wa.me/${number}?text=${text}`;
}

function showSuccessModal(booking) {
    if (!successModal || !successModalDetails) return;

    successModalDetails.innerHTML = `
        <div><dt>Profissional</dt><dd>${booking.barbeiro}</dd></div>
        <div><dt>Data</dt><dd>${formatDateBR(booking.data)}</dd></div>
        <div><dt>Horário</dt><dd>${booking.hora}</dd></div>
        <div><dt>Serviços</dt><dd>${booking.servicos}</dd></div>
        ${booking.forma_pagamento ? `<div><dt>Pagamento</dt><dd>${booking.forma_pagamento}</dd></div>` : ""}
    `;

    if (successModalWhatsApp) {
        successModalWhatsApp.href = buildWhatsAppLink(booking.barbeiro, booking);
    }

    successModal.hidden = false;
    document.body.style.overflow = "hidden";
}

function closeSuccessModal() {
    if (!successModal) return;
    successModal.hidden = true;
    document.body.style.overflow = "";
}

function showToast(message, type = "info") {
    let toast = document.getElementById("siteToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "siteToast";
        toast.className = "site-toast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add("visible");

    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
        toast.classList.remove("visible");
    }, 4500);
}

function init() {
    const painelLink = document.getElementById("linkAreaProfissional");
    if (painelLink && window.APP_CONFIG && window.APP_CONFIG.PAINEL_URL) {
        painelLink.href = window.APP_CONFIG.PAINEL_URL;
    }
    setupEventListeners();
    renderCalendar();
    validateBooking();
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

