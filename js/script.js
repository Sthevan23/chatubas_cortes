// Conteúdo movido de frontend/script.js
// Configuration
const BARBER_NUMBERS = {
    "Pablo": "553788553375",
    "Vinicios": "553788415303", // Mantendo o mesmo número conforme instrução (número do pablo)
    "Zoio": "553791695396"      // Mantendo o mesmo número conforme instrução
};
const DEFAULT_NUMBER = "553788553375";

// State management
let currentDate = new Date();
let selectedDate = null;
let selectedTime = null;


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

// API URL: usa a mesma origem em produção (ex.: mesmo servidor) ou localhost em dev
const API_URL = typeof window !== "undefined" && window.location.origin
  ? window.location.origin
  : "http://localhost:3000";
const AGENDAMENTOS_URL = `${API_URL}/agendamentos`;

// Buscar horários ocupados no banco (por data e barbeiro)
async function carregarHorarios(date, barber) {
    try {
        const res = await fetch(
            `${AGENDAMENTOS_URL}/ocupados?data=${date}&barbeiro=${encodeURIComponent(barber)}`
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
        document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : 'auto';
    });

    // Close mobile menu when clicking a link
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            mobileNav.classList.remove('active');
            document.body.style.overflow = 'auto';
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
        radio.addEventListener('change', validateBooking);
    });

    confirmBtn.addEventListener('click', async () => {
        const selectedServices = Array
            .from(document.querySelectorAll('input[name="service"]:checked'))
            .map(input => input.value);

        const selectedBarber =
            document.querySelector('input[name="barber"]:checked').value;

        const payload = {
            nome: userNameInput.value,
            telefone: userPhoneInput.value,
            data: selectedDate.toISOString().split("T")[0],
            hora: selectedTime + ":00",
            servicos: selectedServices.join(", "),
            barbeiro: selectedBarber
        };

        try {
            const url = editingId
                ? `${AGENDAMENTOS_URL}/${editingId}`
                : AGENDAMENTOS_URL;

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
                const msg = result.mensagem || (response.status === 500 ? "Erro no servidor. Tente de novo." : "Erro ao salvar agendamento.");
                alert(msg);
                return;
            }

            alert(editingId ? "✅ Agendamento atualizado!" : "✅ Agendamento confirmado!");

            // reset estado de edição
            editingId = null;
            confirmBtn.textContent = "Confirmar Agendamento";
            userNameInput.value = "";
            userPhoneInput.value = "";
            selectedTime = null;
            validateBooking();

            await carregarAgendamentosLista();
            if (selectedDate) {
                await renderTimeSlots();
            }
        } catch (error) {
            alert("Não foi possível conectar ao servidor. Verifique se o servidor está rodando e tente novamente.");
            console.error(error);
        }
    });
}

// Carrega horários disponíveis a partir do backend
async function renderTimeSlots() {
    timeSlotsContainer.innerHTML = '';

    if (!selectedDate) return;

    const selectedBarber =
        document.querySelector('input[name="barber"]:checked').value;

    const dateISO = selectedDate.toISOString().split("T")[0];

    const horariosOcupados =
        await carregarHorarios(dateISO, selectedBarber);

    for (let hour = 6; hour <= 20; hour++) {

        const time = `${hour.toString().padStart(2, '0')}:00`;

        const slot = document.createElement('div');
        slot.classList.add('time-slot');
        slot.textContent = time;

        if (horariosOcupados.includes(time)) {
            slot.classList.add('disabled');
            slot.title = "Horário já reservado";
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

function validateBooking() {
    const isNameOk = userNameInput.value.trim().length > 0;
    const isPhoneOk = userPhoneInput.value.trim().length > 0;
    const isDateOk = selectedDate !== null;
    const isTimeOk = selectedTime !== null;
    const isBarberOk = document.querySelector('input[name="barber"]:checked') !== null;
    const isServiceOk = document.querySelectorAll('input[name="service"]:checked').length > 0;

    if (isNameOk && isPhoneOk && isDateOk && isTimeOk && isBarberOk && isServiceOk) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirmar Agendamento";
    } else {
        confirmBtn.disabled = true;

        if (!isBarberOk) confirmBtn.textContent = "Selecione um Barbeiro";
        else if (!isServiceOk) confirmBtn.textContent = "Selecione ao menos 1 Serviço";
        else if (!isDateOk) confirmBtn.textContent = "Selecione uma Data";
        else if (!isTimeOk) confirmBtn.textContent = "Selecione um Horário";
        else if (!isNameOk) confirmBtn.textContent = "Digite seu Nome";
        else if (!isPhoneOk) confirmBtn.textContent = "Digite seu Telefone";
    }
}

// Carrega a lista de agendamentos (para versões que possuem essa funcionalidade)
async function carregarAgendamentosLista() {
    try {
        const response = await fetch(AGENDAMENTOS_URL);
        if (response.ok) {
            const agendamentos = await response.json();
            console.log("Agendamentos carregados:", agendamentos.length);
            // Aqui você pode adicionar lógica para renderizar uma lista em algum lugar da página se desejar
        }
    } catch (error) {
        console.error("Erro ao carregar lista de agendamentos:", error);
    }
}

function init() {
    setupEventListeners();
    renderCalendar();
    // carregarAgendamentosLista(); // Opcional, dependendo se você quer carregar algo ao iniciar
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

