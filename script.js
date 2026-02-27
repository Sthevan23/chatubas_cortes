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
let bookedSlots = loadBookedSlots();

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

// Initialize
function init() {
    renderCalendar();
    renderTimeSlots();
    setupEventListeners();
}

// Data persistence
function loadBookedSlots() {
    const saved = localStorage.getItem('chatubas_booked_slots');
    return saved ? JSON.parse(saved) : {};
}

function saveBookedSlots(dateStr, time) {
    if (!bookedSlots[dateStr]) {
        bookedSlots[dateStr] = [];
    }
    bookedSlots[dateStr].push(time);
    localStorage.setItem('chatubas_booked_slots', JSON.stringify(bookedSlots));
}

function isSlotBooked(dateStr, time) {
    return bookedSlots[dateStr] && bookedSlots[dateStr].includes(time);
}

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

    // Listen for service changes
    document.querySelectorAll('input[name="service"]').forEach(radio => {
        radio.addEventListener('change', validateBooking);
    });

    // Listen for barber changes
    document.querySelectorAll('input[name="barber"]').forEach(radio => {
        radio.addEventListener('change', validateBooking);
    });

    confirmBtn.addEventListener('click', () => {
        if (selectedDate && selectedTime && userNameInput.value && userPhoneInput.value) {
            const selectedService = document.querySelector('input[name="service"]:checked').value;
            const selectedBarber = document.querySelector('input[name="barber"]:checked').value;
            const barberNumber = BARBER_NUMBERS[selectedBarber] || DEFAULT_NUMBER;
            const dateStr = selectedDate.toLocaleDateString('pt-BR');

            // 1. Block the slot in localStorage
            saveBookedSlots(dateStr, selectedTime);

            // 2. Prepare and send WhatsApp message
            const message = `Olá! Gostaria de confirmar um agendamento na Chatubas Cortes:%0A%0A` +
                `*Barbeiro:* ${selectedBarber}%0A` +
                `*Serviço:* ${selectedService}%0A` +
                `*Cliente:* ${userNameInput.value}%0A` +
                `*Contato:* ${userPhoneInput.value}%0A` +
                `*Data:* ${dateStr}%0A` +
                `*Horário:* ${selectedTime}`;

            const whatsappUrl = `https://wa.me/${barberNumber}?text=${message}`;
            window.open(whatsappUrl, '_blank');

            // 3. Reset UI
            alert('Agendamento realizado com sucesso! O horário selecionado não estará mais disponível.');
            selectedTime = null;
            renderTimeSlots();
            validateBooking();
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

                // Re-render time slots for the new date to show availability
                selectedTime = null;
                renderTimeSlots();
                validateBooking();
            });
        }
        calendarGrid.appendChild(dayDiv);
    }
}

function renderTimeSlots() {
    timeSlotsContainer.innerHTML = '';

    const dateStr = selectedDate ? selectedDate.toLocaleDateString('pt-BR') : null;

    for (let hour = 6; hour <= 20; hour++) {
        // Full hour slot
        const time = `${hour.toString().padStart(2, '0')}:00`;
        const slot = createTimeSlot(time, dateStr);
        timeSlotsContainer.appendChild(slot);
    }
}

function createTimeSlot(time, dateStr) {
    const slot = document.createElement('div');
    slot.classList.add('time-slot');
    slot.textContent = time;

    // Check if slot is booked for the currently selected date
    if (dateStr && isSlotBooked(dateStr, time)) {
        slot.classList.add('disabled');
        slot.title = "Horário já reservado";
    } else {
        if (selectedTime === time) {
            slot.classList.add('selected');
        }

        slot.addEventListener('click', () => {
            document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
            slot.classList.add('selected');
            selectedTime = time;
            validateBooking();
        });
    }

    return slot;
}

function validateBooking() {
    const isNameOk = userNameInput.value.trim().length > 0;
    const isPhoneOk = userPhoneInput.value.trim().length > 0;
    const isDateOk = selectedDate !== null;
    const isTimeOk = selectedTime !== null;
    const isBarberOk = document.querySelector('input[name="barber"]:checked') !== null;
    const isServiceOk = document.querySelector('input[name="service"]:checked') !== null;

    if (isNameOk && isPhoneOk && isDateOk && isTimeOk && isBarberOk && isServiceOk) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirmar Agendamento";
    } else {
        confirmBtn.disabled = true;

        // Provide feedback on what's missing
        if (!isBarberOk) confirmBtn.textContent = "Selecione um Barbeiro";
        else if (!isServiceOk) confirmBtn.textContent = "Selecione um Serviço";
        else if (!isDateOk) confirmBtn.textContent = "Selecione uma Data";
        else if (!isTimeOk) confirmBtn.textContent = "Selecione um Horário";
        else if (!isNameOk) confirmBtn.textContent = "Digite seu Nome";
        else if (!isPhoneOk) confirmBtn.textContent = "Digite seu Telefone";
    }
}

init();
