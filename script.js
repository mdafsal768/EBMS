/* ==========================================================================
   EVENTHUB - COMPLETE ARCHITECTURE & DATA ENGINE (GEMINI POWERED)
   ========================================================================== */

// GEMINI API CONFIGURATION
const GEMINI_API_KEY = "AQ.Ab8RN6LY7oHH54CBxNxzsu5Qlli4tVlwJHAtmflA-Qw6LdWcDQ";

// Comprehensive Indian Location Database (States & Districts)
const INDIA_LOCATIONS = {
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Tirunelveli", "Salem", "Tiruppur", "Vellore", "Erode", "Cuddalore"],
    "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Davangere", "Ballari"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar"],
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati"],
    "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"]
};

// Global Memory State
let state = {
    currentUser: JSON.parse(localStorage.getItem('evt_currentUser')) || null,
    events: [],
    adminEvents: JSON.parse(localStorage.getItem('evt_adminEvents')) || [],
    bookings: JSON.parse(localStorage.getItem('evt_bookings')) || [],
    selectedEvent: JSON.parse(localStorage.getItem('evt_selectedEvent')) || null,
    selectedSeats: []
};

// Page Router & Initializer
document.addEventListener('DOMContentLoaded', () => {
    checkAuthGuard();
    initializeLocationDropdowns();

    const path = window.location.pathname.split("/").pop();

    if (path === 'events.html') {
        fetchLiveEvents();
    } else if (path === 'index.html' || path === '') {
        loadHomeEvents();
    } else if (path === 'booking.html') {
        loadSelectedEvent();
    } else if (path === 'bookings.html') {
        renderUserBookings();
    } else if (path === 'admin.html') {
        initializeAdmin();
    }
});

/* ==================== AUTHENTICATION SYSTEM ==================== */
function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
}

function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.add('active');
}

function toggleRoleUI(role) {
    const info = document.getElementById('admin-demo-info');
    const uLabel = document.getElementById('role-label-user');
    const aLabel = document.getElementById('role-label-admin');

    if (role === 'admin') {
        info.classList.remove('hidden');
        aLabel.classList.add('active');
        uLabel.classList.remove('active');
    } else {
        info.classList.add('hidden');
        uLabel.classList.add('active');
        aLabel.classList.remove('active');
    }
}

function registerUser(e) {
    e.preventDefault();
    const name = document.getElementById('reg-fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;

    if (password !== confirmPassword) {
        showAuthAlert('Passwords do not match!', 'danger');
        return;
    }

    let users = JSON.parse(localStorage.getItem('evt_registeredUsers')) || [];
    if (users.some(u => u.email === email)) {
        showAuthAlert('User with this email already exists!', 'danger');
        return;
    }

    const newUser = { id: 'USR' + Date.now(), name, email, phone, password, role: 'user' };
    users.push(newUser);
    localStorage.setItem('evt_registeredUsers', JSON.stringify(users));

    showAuthAlert('Registration successful! Please login.', 'success');
    showLogin();
}

function loginUser(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const selectedRole = document.querySelector('input[name="auth-role"]:checked').value;

    if (selectedRole === 'admin') {
        if (email === 'admin@event.com' && password === 'admin123') {
            const adminUser = { name: 'System Administrator', email, role: 'admin' };
            localStorage.setItem('evt_currentUser', JSON.stringify(adminUser));
            window.location.href = 'admin.html';
            return;
        } else {
            showAuthAlert('Invalid Admin Credentials!', 'danger');
            return;
        }
    }

    let users = JSON.parse(localStorage.getItem('evt_registeredUsers')) || [];
    const matchedUser = users.find(u => u.email === email && u.password === password);

    if (matchedUser) {
        localStorage.setItem('evt_currentUser', JSON.stringify(matchedUser));
        window.location.href = 'index.html';
    } else {
        showAuthAlert('Invalid Email or Password!', 'danger');
    }
}

function logoutUser() {
    localStorage.removeItem('evt_currentUser');
    window.location.href = 'auth.html';
}

function checkAuthGuard() {
    const path = window.location.pathname.split("/").pop();
    const user = state.currentUser;

    if (!user && path !== 'auth.html' && path !== 'about.html') {
        window.location.href = 'auth.html';
    } else if (user && path === 'auth.html') {
        window.location.href = user.role === 'admin' ? 'admin.html' : 'index.html';
    } else if (path === 'admin.html' && (!user || user.role !== 'admin')) {
        alert('Unauthorized Admin Access!');
        window.location.href = 'auth.html';
    }
}

function showAuthAlert(msg, type) {
    const box = document.getElementById('auth-alert');
    if (!box) return;
    box.className = `alert-box alert-${type}`;
    box.innerText = msg;
    box.classList.remove('hidden');
}

/* ==================== GEMINI API & EVENT ENGINE ==================== */
async function fetchLiveEvents() {
    const grid = document.getElementById('events-grid');
    if (grid) grid.innerHTML = '<p class="text-center span-2">Loading events...</p>';

    // Admin created events are loaded directly
    state.events = [...state.adminEvents];

    if (state.events.length === 0) {
        if (grid) {
            grid.innerHTML = `<div class="alert-box alert-danger text-center span-2">
                No events found. Add an event in Admin Panel or use Gemini Recommendations.
            </div>`;
        }
        return;
    }

    renderEvents(state.events);
}

function renderEvents(eventsList) {
    const grid = document.getElementById('events-grid');
    if (!grid) return;

    if (eventsList.length === 0) {
        grid.innerHTML = '<p class="text-center span-2">No events match your selected criteria.</p>';
        return;
    }

    grid.innerHTML = eventsList.map(ev => `
        <div class="event-card">
            <div class="card-img-wrapper">
                <img src="${ev.image}" alt="${ev.name}" onerror="this.src='https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=600&q=80'">
                <span class="card-tag">${ev.category}</span>
            </div>
            <div class="card-body">
                <h3 class="event-title">${ev.name}</h3>
                <div class="event-info-line"><i class="fa-regular fa-calendar"></i> ${ev.date} at ${ev.time}</div>
                <div class="event-info-line"><i class="fa-solid fa-location-dot"></i> ${ev.city}, ${ev.state}</div>
                <div class="event-info-line"><i class="fa-solid fa-building"></i> ${ev.venue}</div>
            </div>
            <div class="card-footer">
                <div class="event-price">₹${ev.price}</div>
                <div>
                    <button onclick="viewEventDetails('${ev.id}')" class="btn btn-outline btn-sm">Details</button>
                    <button onclick="proceedToBooking('${ev.id}')" class="btn btn-primary btn-sm">Book</button>
                </div>
            </div>
        </div>
    `).join('');
}

/* ==================== LOCATION & FILTERS ==================== */
function initializeLocationDropdowns() {
    const stateSelect = document.getElementById('filter-state');
    if (!stateSelect) return;
    updateDistricts();
}

function updateDistricts() {
    const stateVal = document.getElementById('filter-state').value;
    const districtSelect = document.getElementById('filter-district');
    if (!districtSelect) return;

    districtSelect.innerHTML = '<option value="ALL">All Cities</option>';

    if (stateVal !== 'ALL' && INDIA_LOCATIONS[stateVal]) {
        INDIA_LOCATIONS[stateVal].forEach(d => {
            districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
        });
    }
}

function filterEvents() {
    const searchVal = document.getElementById('filter-search').value.toLowerCase();
    const catVal = document.getElementById('filter-category').value;
    const stateVal = document.getElementById('filter-state').value;
    const distVal = document.getElementById('filter-district').value;
    const dateVal = document.getElementById('filter-date').value;

    const filtered = state.events.filter(ev => {
        const matchesSearch = ev.name.toLowerCase().includes(searchVal) || ev.description.toLowerCase().includes(searchVal);
        const matchesCat = (catVal === 'ALL' || ev.category === catVal);
        const matchesState = (stateVal === 'ALL' || ev.state === stateVal);
        const matchesDist = (distVal === 'ALL' || ev.city === distVal);

        let matchesDate = true;
        if (dateVal === 'UPCOMING') {
            matchesDate = new Date(ev.date) >= new Date();
        }

        return matchesSearch && matchesCat && matchesState && matchesDist && matchesDate;
    });

    renderEvents(filtered);
}

function resetFilters() {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-category').value = 'ALL';
    document.getElementById('filter-state').value = 'ALL';
    updateDistricts();
    document.getElementById('filter-date').value = 'ALL';
    renderEvents(state.events);
}

function selectCategory(catName) {
    localStorage.setItem('evt_selectedCat', catName);
    window.location.href = 'events.html';
}

function loadHomeEvents() {
    const preCat = localStorage.getItem('evt_selectedCat');
    if (preCat) {
        localStorage.removeItem('evt_selectedCat');
        const catElem = document.getElementById('filter-category');
        if (catElem) {
            catElem.value = preCat;
            filterEvents();
        }
    }
}

/* ==================== EVENT DETAILS & BOOKING ==================== */
function viewEventDetails(id) {
    const ev = state.events.find(e => e.id == id);
    if (!ev) return;

    const modal = document.getElementById('event-modal');
    const body = document.getElementById('modal-body');

    body.innerHTML = `
        <img src="${ev.image}" alt="${ev.name}" style="width:100%; height:250px; object-fit:cover; border-radius:12px;">
        <span class="badge margin-top-1">${ev.category}</span>
        <h2 class="margin-top-05">${ev.name}</h2>
        <p class="margin-top-1">${ev.description}</p>
        <div class="margin-top-1" style="line-height:2;">
            <p><i class="fa-regular fa-calendar"></i> <strong>Date:</strong> ${ev.date} at ${ev.time}</p>
            <p><i class="fa-solid fa-location-dot"></i> <strong>Location:</strong> ${ev.venue}, ${ev.city}, ${ev.state}</p>
            <p><i class="fa-solid fa-tag"></i> <strong>Price:</strong> ₹${ev.price}</p>
        </div>
        <div class="modal-actions margin-top-2">
            <button onclick="closeEventModal()" class="btn btn-outline">Back to Events</button>
            <button onclick="proceedToBooking('${ev.id}')" class="btn btn-primary shadow-btn">Book Now</button>
        </div>
    `;
    modal.classList.remove('hidden');
}

function closeEventModal() {
    document.getElementById('event-modal').classList.add('hidden');
}

function proceedToBooking(id) {
    const ev = state.events.find(e => e.id == id);
    if (!ev) return;
    localStorage.setItem('evt_selectedEvent', JSON.stringify(ev));
    window.location.href = 'booking.html';
}

function loadSelectedEvent() {
    const ev = state.selectedEvent;
    if (!ev) {
        document.getElementById('no-event-selected').classList.remove('hidden');
        document.getElementById('booking-container').classList.add('hidden');
        return;
    }

    document.getElementById('bk-event-img').src = ev.image;
    document.getElementById('bk-event-category').innerText = ev.category;
    document.getElementById('bk-event-name').innerText = ev.name;
    document.getElementById('bk-event-date').innerText = ev.date;
    document.getElementById('bk-event-time').innerText = ev.time;
    document.getElementById('bk-event-venue').innerText = `${ev.venue}, ${ev.city}, ${ev.state}`;
    document.getElementById('bk-event-price').innerText = ev.price;

    if (state.currentUser) {
        document.getElementById('att-name').value = state.currentUser.name || '';
        document.getElementById('att-email').value = state.currentUser.email || '';
        document.getElementById('att-phone').value = state.currentUser.phone || '';
    }

    renderSeatMatrix();
    updateBookingTotal();
}

function renderSeatMatrix() {
    const matrix = document.getElementById('seats-matrix');
    if (!matrix) return;
    const rows = ['A', 'B', 'C', 'D'];
    let html = '';

    rows.forEach(r => {
        for (let i = 1; i <= 5; i++) {
            const seatId = `${r}${i}`;
            html += `<div class="seat" id="seat-${seatId}" onclick="selectSeat('${seatId}')">${seatId}</div>`;
        }
    });
    matrix.innerHTML = html;
}

function selectSeat(seatId) {
    const qtyNeeded = parseInt(document.getElementById('att-quantity').value);
    const seatElem = document.getElementById(`seat-${seatId}`);

    if (state.selectedSeats.includes(seatId)) {
        state.selectedSeats = state.selectedSeats.filter(s => s !== seatId);
        seatElem.classList.remove('selected');
    } else {
        if (state.selectedSeats.length >= qtyNeeded) {
            alert(`You can only select ${qtyNeeded} seat(s).`);
            return;
        }
        state.selectedSeats.push(seatId);
        seatElem.classList.add('selected');
    }

    document.getElementById('selected-seats-display').innerText = state.selectedSeats.join(', ') || 'None';
    updateBookingTotal();
}

function handleQuantityChange(val) {
    document.getElementById('seat-needed-count').innerText = val;
    state.selectedSeats = [];
    document.querySelectorAll('.seat').forEach(s => s.classList.remove('selected'));
    document.getElementById('selected-seats-display').innerText = 'None';
    updateBookingTotal();
}

function updateBookingTotal() {
    const ev = state.selectedEvent;
    if (!ev) return;

    const qty = parseInt(document.getElementById('att-quantity').value);
    const basePrice = ev.price * qty;
    const fee = 50;
    const total = basePrice + fee;

    document.getElementById('calc-qty').innerText = qty;
    document.getElementById('calc-base').innerText = basePrice;
    document.getElementById('calc-fee').innerText = fee;
    document.getElementById('calc-total').innerText = total;
}

function confirmBooking() {
    const qtyNeeded = parseInt(document.getElementById('att-quantity').value);
    if (state.selectedSeats.length !== qtyNeeded) {
        alert(`Please select exactly ${qtyNeeded} seat(s) on the layout.`);
        return;
    }

    const name = document.getElementById('att-name').value.trim();
    const email = document.getElementById('att-email').value.trim();
    const phone = document.getElementById('att-phone').value.trim();

    if (!name || !email || !phone) {
        alert('Please fill in all attendee details.');
        return;
    }

    const bookingId = 'EVT2026' + Math.floor(1000 + Math.random() * 9000);
    const ev = state.selectedEvent;
    const totalAmount = document.getElementById('calc-total').innerText;

    const newBooking = {
        bookingId,
        userName: name,
        userEmail: email,
        phone,
        event: ev,
        seats: state.selectedSeats,
        totalAmount,
        bookingDate: new Date().toISOString()
    };

    state.bookings.push(newBooking);
    localStorage.setItem('evt_bookings', JSON.stringify(state.bookings));

    document.getElementById('conf-id').innerText = bookingId;
    document.getElementById('conf-event-name').innerText = ev.name;
    document.getElementById('conf-date-time').innerText = `${ev.date} at ${ev.time}`;
    document.getElementById('conf-location').innerText = `${ev.venue}, ${ev.city}`;
    document.getElementById('conf-seats').innerText = state.selectedSeats.join(', ');
    document.getElementById('conf-total').innerText = totalAmount;

    document.getElementById('qrcode').innerHTML = '';
    new QRCode(document.getElementById('qrcode'), {
        text: `BOOKING:${bookingId}|USER:${email}|EVENT:${ev.name}`,
        width: 128,
        height: 128
    });

    document.getElementById('booking-success-modal').classList.remove('hidden');
}

/* ==================== USER BOOKINGS PAGE ==================== */
function renderUserBookings() {
    const user = state.currentUser;
    if (!user) return;

    document.getElementById('user-display-name').innerText = user.name || 'Valued Guest';
    document.getElementById('user-display-email').innerText = user.email || '';

    const userBookings = state.bookings.filter(b => b.userEmail === user.email);
    document.getElementById('total-booking-count').innerText = userBookings.length;

    showBookingTab('upcoming');
}

function showBookingTab(tabType) {
    const user = state.currentUser;
    const userBookings = state.bookings.filter(b => b.userEmail === user.email);
    const grid = document.getElementById('user-bookings-list');

    document.getElementById('tab-upcoming').classList.toggle('active', tabType === 'upcoming');
    document.getElementById('tab-previous').classList.toggle('active', tabType === 'previous');

    const now = new Date();
    const filtered = userBookings.filter(b => {
        const evDate = new Date(b.event.date);
        return tabType === 'upcoming' ? evDate >= now : evDate < now;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="card text-center padding-2"><p>No ${tabType} bookings found.</p></div>`;
        return;
    }

    grid.innerHTML = filtered.map(b => `
        <div class="card event-card" style="flex-direction:row;">
            <img src="${b.event.image}" style="width:200px; object-fit:cover;">
            <div class="card-body">
                <span class="booking-id-tag">${b.bookingId}</span>
                <h3 class="margin-top-05">${b.event.name}</h3>
                <p><i class="fa-regular fa-calendar"></i> ${b.event.date} at ${b.event.time}</p>
                <p><i class="fa-solid fa-couch"></i> Seats: ${b.seats.join(', ')}</p>
                <p><i class="fa-solid fa-wallet"></i> Total Paid: ₹${b.totalAmount}</p>
            </div>
            <div style="padding:20px; display:flex; align-items:center;">
                <button onclick="viewTicket('${b.bookingId}')" class="btn btn-outline btn-sm">View Ticket</button>
            </div>
        </div>
    `).join('');
}

function viewTicket(bId) {
    const b = state.bookings.find(x => x.bookingId === bId);
    if (!b) return;

    const modal = document.getElementById('ticket-modal');
    const content = document.getElementById('ticket-modal-content');

    content.innerHTML = `
        <span class="booking-id-tag">${b.bookingId}</span>
        <h2 class="margin-top-05">${b.event.name}</h2>
        <p><i class="fa-regular fa-calendar"></i> ${b.event.date} at ${b.event.time}</p>
        <p><i class="fa-solid fa-location-dot"></i> ${b.event.venue}, ${b.event.city}</p>
        <p><i class="fa-solid fa-couch"></i> Seats: <strong>${b.seats.join(', ')}</strong></p>
        <div id="modal-qr" class="margin-top-1 text-center"></div>
    `;

    modal.classList.remove('hidden');
    new QRCode(document.getElementById('modal-qr'), {
        text: `BOOKING:${b.bookingId}`,
        width: 120,
        height: 120
    });
}

function closeTicketModal() {
    document.getElementById('ticket-modal').classList.add('hidden');
}

/* ==================== ADMIN DASHBOARD & CRUD ==================== */
function initializeAdmin() {
    updateAdminStats();
    renderAdminEventsTable(state.adminEvents);
    renderAdminBookingsTable(state.bookings);
    updateAdminDistricts();
}

function updateAdminStats() {
    document.getElementById('adm-stat-events').innerText = state.adminEvents.length;
    document.getElementById('adm-stat-bookings').innerText = state.bookings.length;
    const users = JSON.parse(localStorage.getItem('evt_registeredUsers')) || [];
    document.getElementById('adm-stat-users').innerText = users.length;
}

function switchAdminTab(tab) {
    document.getElementById('adm-tab-events').classList.toggle('active', tab === 'events');
    document.getElementById('adm-tab-bookings').classList.toggle('active', tab === 'bookings');
    document.getElementById('adm-section-events').classList.toggle('hidden', tab !== 'events');
    document.getElementById('adm-section-bookings').classList.toggle('hidden', tab !== 'bookings');
}

function updateAdminDistricts() {
    const stateVal = document.getElementById('adm-evt-state').value;
    const distSelect = document.getElementById('adm-evt-district');
    distSelect.innerHTML = '';
    if (INDIA_LOCATIONS[stateVal]) {
        INDIA_LOCATIONS[stateVal].forEach(d => {
            distSelect.innerHTML += `<option value="${d}">${d}</option>`;
        });
    }
}

function renderAdminEventsTable(events) {
    const tbody = document.getElementById('adm-events-tbody');
    tbody.innerHTML = events.map(ev => `
        <tr>
            <td><img src="${ev.image}" style="width:50px; height:40px; object-fit:cover; border-radius:4px;"></td>
            <td><strong>${ev.name}</strong></td>
            <td>${ev.category}</td>
            <td>${ev.date} ${ev.time}</td>
            <td>${ev.city}, ${ev.state}</td>
            <td>₹${ev.price}</td>
            <td><span class="badge">${ev.source || 'Admin'}</span></td>
            <td>
                <button onclick="editAdminEvent('${ev.id}')" class="btn btn-outline btn-sm"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteAdminEvent('${ev.id}')" class="btn btn-outline btn-sm" style="color:var(--danger-color);"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function openAddEventModal() {
    document.getElementById('modal-event-title').innerText = "Add New Event";
    document.getElementById('admin-event-form').reset();
    document.getElementById('adm-evt-id').value = '';
    document.getElementById('admin-event-modal').classList.remove('hidden');
}

function closeAdminEventModal() {
    document.getElementById('admin-event-modal').classList.add('hidden');
}

function saveAdminEvent(e) {
    e.preventDefault();
    const id = document.getElementById('adm-evt-id').value || 'ADM' + Date.now();
    const newEv = {
        id,
        name: document.getElementById('adm-evt-name').value,
        category: document.getElementById('adm-evt-category').value,
        date: document.getElementById('adm-evt-date').value,
        time: document.getElementById('adm-evt-time').value,
        state: document.getElementById('adm-evt-state').value,
        city: document.getElementById('adm-evt-district').value,
        price: parseFloat(document.getElementById('adm-evt-price').value),
        image: document.getElementById('adm-evt-image').value,
        venue: document.getElementById('adm-evt-venue').value,
        description: document.getElementById('adm-evt-desc').value,
        source: 'Admin Created'
    };

    const index = state.adminEvents.findIndex(x => x.id === id);
    if (index >= 0) {
        state.adminEvents[index] = newEv;
    } else {
        state.adminEvents.push(newEv);
    }

    localStorage.setItem('evt_adminEvents', JSON.stringify(state.adminEvents));
    closeAdminEventModal();
    initializeAdmin();
}

function editAdminEvent(id) {
    const ev = state.adminEvents.find(x => x.id === id);
    if (!ev) return;

    document.getElementById('modal-event-title').innerText = "Edit Event";
    document.getElementById('adm-evt-id').value = ev.id;
    document.getElementById('adm-evt-name').value = ev.name;
    document.getElementById('adm-evt-category').value = ev.category;
    document.getElementById('adm-evt-date').value = ev.date;
    document.getElementById('adm-evt-time').value = ev.time;
    document.getElementById('adm-evt-state').value = ev.state;
    updateAdminDistricts();
    document.getElementById('adm-evt-district').value = ev.city;
    document.getElementById('adm-evt-price').value = ev.price;
    document.getElementById('adm-evt-image').value = ev.image;
    document.getElementById('adm-evt-venue').value = ev.venue;
    document.getElementById('adm-evt-desc').value = ev.description;

    document.getElementById('admin-event-modal').classList.remove('hidden');
}

function deleteAdminEvent(id) {
    if (confirm('Are you sure you want to delete this event?')) {
        state.adminEvents = state.adminEvents.filter(x => x.id !== id);
        localStorage.setItem('evt_adminEvents', JSON.stringify(state.adminEvents));
        initializeAdmin();
    }
}

function renderAdminBookingsTable(bookings) {
    const tbody = document.getElementById('adm-bookings-tbody');
    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td><strong>${b.bookingId}</strong></td>
            <td>${b.userName}</td>
            <td>${b.userEmail}</td>
            <td>${b.event.name}</td>
            <td>${b.event.date}</td>
            <td>${b.seats.join(', ')}</td>
            <td>₹${b.totalAmount}</td>
            <td><span class="badge" style="background:#dcfce7; color:#15803d;">Confirmed</span></td>
        </tr>
    `).join('');
}

function adminSearchBookings() {
    const val = document.getElementById('adm-search-bookings').value.toLowerCase();
    const filtered = state.bookings.filter(b => 
        b.bookingId.toLowerCase().includes(val) ||
        b.userName.toLowerCase().includes(val) ||
        b.event.name.toLowerCase().includes(val)
    );
    renderAdminBookingsTable(filtered);
}

/* ==================== GEMINI AI RECOMMENDATION ENGINE ==================== */
async function runSmartRecommendation() {
    const cat = document.getElementById('ai-pref-category').value;
    const st = document.getElementById('ai-pref-state').value;
    const typ = document.getElementById('ai-pref-type').value;

    const wrapper = document.getElementById('ai-results-wrapper');
    const grid = document.getElementById('ai-results-grid');

    wrapper.classList.remove('hidden');
    grid.innerHTML = '<p>Gemini AI generate செய்கிறது...</p>';

    if (!GEMINI_API_KEY || GEMINI_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
        grid.innerHTML = '<p class="alert-box alert-danger">Gemini API Key அமைக்கப்படவில்லை.</p>';
        return;
    }

    const promptText = `Generate 3 realistic event recommendations in JSON format based on these criteria:
    Category: ${cat}, State: ${st}, Type: ${typ}.
    Return strictly a JSON array containing objects with properties: id, name, category, date, time, venue, city, state, price, image, description. No markdown formatting.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const data = await response.json();
        let rawText = data.candidates[0].content.parts[0].text;
        
        // Clean markdown block if present
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const recommended = JSON.parse(rawText);

        grid.innerHTML = recommended.map(ev => `
            <div class="event-card">
                <div class="card-img-wrapper">
                    <img src="${ev.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=600&q=80'}">
                    <span class="card-tag">${ev.category}</span>
                </div>
                <div class="card-body">
                    <h3>${ev.name}</h3>
                    <p>${ev.city}, ${ev.state}</p>
                </div>
                <div class="card-footer">
                    <span>₹${ev.price}</span>
                    <button onclick="proceedToBooking('${ev.id}')" class="btn btn-accent btn-sm">Book</button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error("Gemini API Error:", err);
        grid.innerHTML = '<p>AI recommendations பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.</p>';
    }
}

function toggleMobileMenu() {
    document.querySelector('.nav-menu').classList.toggle('active');
}