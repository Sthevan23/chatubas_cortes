// Configuration
const WHATSAPP_NUMBER = "553788553375"; // Número configurado: +55 37 8855-3375

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

// Initialize
function init() {
    renderCalendar();
    renderTimeSlots();
    setupEventListeners();
}

function setupEventListeners() {
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    userNameInput.addEventListener('input', validateBooking);
    userPhoneInput.addEventListener('input', validateBooking);

    // Listen for service changes
    document.querySelectorAll('input[name="service"]').forEach(radio => {
        radio.addEventListener('change', validateBooking);
    });

    confirmBtn.addEventListener('click', () => {
        if (selectedDate && selectedTime && userNameInput.value && userPhoneInput.value) {
            const selectedService = document.querySelector('input[name="service"]:checked').value;
            const dateStr = selectedDate.toLocaleDateString('pt-BR');
            const message = `Olá! Gostaria de confirmar um agendamento na Chatubas Cortes:%0A%0A` +
                `*Serviço:* ${selectedService}%0A` +
                `*Cliente:* ${userNameInput.value}%0A` +
                `*Contato:* ${userPhoneInput.value}%0A` +
                `*Data:* ${dateStr}%0A` +
                `*Horário:* ${selectedTime}`;

            const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
            window.open(whatsappUrl, '_blank');
        }
    });
}

function renderCalendar() {
    calendarGrid.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('calendar-day', 'empty');
        calendarGrid.appendChild(emptyDiv);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
        dayDiv.textContent = day;

        const dateAtDay = new Date(year, month, day);

        if (dateAtDay < today) {
            dayDiv.classList.add('disabled');
        } else {
            if (dateAtDay.getTime() === today.getTime()) {
                dayDiv.classList.add('today');
            }

            // Highlight if this is the selected date
            if (selectedDate && dateAtDay.toDateString() === selectedDate.toDateString()) {
                dayDiv.classList.add('selected');
            }

            dayDiv.addEventListener('click', () => {
                document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                dayDiv.classList.add('selected');
                selectedDate = dateAtDay;
                validateBooking();
            });
        }
        calendarGrid.appendChild(dayDiv);
    }
}

function renderTimeSlots() {
    timeSlotsContainer.innerHTML = '';

    for (let hour = 6; hour <= 20; hour++) {
        // Full hour slot
        const time = `${hour.toString().padStart(2, '0')}:00`;
        const slot = createTimeSlot(time);
        timeSlotsContainer.appendChild(slot);

        // Half hour slot
        if (hour < 20) {
            const timeHalf = `${hour.toString().padStart(2, '0')}:30`;
            const slotHalf = createTimeSlot(timeHalf);
            timeSlotsContainer.appendChild(slotHalf);
        }
    }
}

function createTimeSlot(time) {
    const slot = document.createElement('div');
    slot.classList.add('time-slot');
    slot.textContent = time;

    if (selectedTime === time) {
        slot.classList.add('selected');
    }

    slot.addEventListener('click', () => {
        if (slot.classList.contains('disabled')) return;
        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
        slot.classList.add('selected');
        selectedTime = time;
        validateBooking();
    });

    return slot;
}

function validateBooking() {
    const isNameOk = userNameInput.value.trim().length > 0;
    const isPhoneOk = userPhoneInput.value.trim().length > 0;
    const isDateOk = selectedDate !== null;
    const isTimeOk = selectedTime !== null;

    if (isNameOk && isPhoneOk && isDateOk && isTimeOk) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirmar Agendamento";
    } else {
        confirmBtn.disabled = true;

        // Provide feedback on what's missing
        if (!isDateOk) confirmBtn.textContent = "Selecione uma Data";
        else if (!isTimeOk) confirmBtn.textContent = "Selecione um Horário";
        else if (!isNameOk) confirmBtn.textContent = "Digite seu Nome";
        else if (!isPhoneOk) confirmBtn.textContent = "Digite seu Telefone";
    }
}

init();
