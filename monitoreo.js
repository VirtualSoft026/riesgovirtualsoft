// Security and Session Check
const currentUserObj = localStorage.getItem('riskOps_currentUser');
let currentUser = null;

try {
    currentUser = currentUserObj ? JSON.parse(currentUserObj) : null;
} catch (e) {
    localStorage.removeItem('riskOps_currentUser');
}

if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'Supervisor')) {
    alert("Acceso Restringido: Esta sección requiere privilegios de Supervisor o Administrador.");
    window.location.href = 'login.html';
}

// State management
let allActiveSessions = {};
const database = firebase.database();

// Live Clock Logic
function updateClock() {
    const clockElement = document.getElementById('liveClock');
    if (!clockElement) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    clockElement.textContent = `${hours}:${minutes}:${seconds}`;
}
setInterval(updateClock, 1000);
updateClock();

// Theme Logic
const themeToggleBtn = document.getElementById('themeToggleBtn');
if (themeToggleBtn) {
    const savedTheme = localStorage.getItem('riskOps_theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    themeToggleBtn.innerHTML = savedTheme === 'dark' ? "<i class='bx bx-moon'></i>" : "<i class='bx bx-sun'></i>";
    
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('riskOps_theme', newTheme);
        themeToggleBtn.innerHTML = newTheme === 'dark' ? "<i class='bx bx-moon'></i>" : "<i class='bx bx-sun'></i>";
    });
}

// Name Normalization helpers for Avatar mapping
function normalizeName(name) {
    if (!name) return "";
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function namesMatch(name1, name2) {
    if (!name1 || !name2) return false;
    const n1 = normalizeName(name1);
    const n2 = normalizeName(name2);
    
    const words1 = n1.split(/\s+/).filter(w => w.length > 2);
    const words2 = n2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return n1.includes(n2) || n2.includes(n1);

    const [shorter, longer] = words1.length <= words2.length ? [words1, n2] : [words2, n1];
    return shorter.every(word => longer.includes(word));
}

// Avatars mapping matching index app.js list
const availableAvatars = [
    "Alexander Villada.png",
    "Camilo Espinosa.png",
    "Daniel Benavidez.png",
    "Josue Alvarez.png",
    "Juan Jose Diaz.png",
    "Maria Sanchez.png",
    "Marilyn Jimenez.png",
    "Oriana Borja.png",
    "Samuel Cruz.png",
    "Sara Santamaria.png",
    "Sebastian Arango.png",
    "Sebastian Hincapie.png",
    "Yefferson Giraldo.png"
];

// Firebase Listener
function startActiveSessionsListener() {
    database.ref('active_sessions').on('value', (snapshot) => {
        if (snapshot.exists()) {
            allActiveSessions = snapshot.val();
        } else {
            allActiveSessions = {};
        }
        renderActiveSessionsDashboard();
        updateGlobalStats();
    }, (error) => {
        console.error("Error cargando monitoreo en tiempo real:", error);
    });
}

// Render Dashboard Grid
function renderActiveSessionsDashboard() {
    const grid = document.getElementById('monitoreoGrid');
    if (!grid) return;

    grid.innerHTML = '';
    
    // Get filter queries
    const searchQuery = document.getElementById('monitoreoSearchInput').value.toLowerCase().trim();
    const shiftQuery = document.getElementById('filterShiftSelect').value;
    const statusQuery = document.getElementById('filterStatusSelect').value;

    const uids = Object.keys(allActiveSessions);
    
    // Filtering active sessions
    let filteredUids = uids.filter(uid => {
        const session = allActiveSessions[uid];
        const fullName = (session.name || '').trim();
        const email = (session.email || '');
        const shift = session.shift || 'Mañana';
        const isOnline = (Date.now() - session.lastActive) < 120000;

        // Search match
        if (searchQuery && !fullName.toLowerCase().includes(searchQuery) && !email.toLowerCase().includes(searchQuery)) {
            return false;
        }

        // Shift match
        if (shiftQuery && shift !== shiftQuery) {
            return false;
        }

        // Status match
        if (statusQuery) {
            if (statusQuery === 'online' && !isOnline) return false;
            if (statusQuery === 'offline' && isOnline) return false;
        }

        return true;
    });

    if (filteredUids.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 60px; text-align: center; color: var(--text-secondary);">
                <i class='bx bx-devices' style="font-size: 48px; margin-bottom: 15px; color: var(--text-secondary); opacity: 0.5;"></i>
                <p style="font-size: 16px; font-weight: 500;">No se encontraron gestores en el turno con los filtros aplicados.</p>
                <p style="font-size: 12px; margin-top: 5px; opacity: 0.7;">Los gestores activos se listarán aquí automáticamente al ingresar.</p>
            </div>
        `;
        return;
    }

    filteredUids.forEach(uid => {
        const session = allActiveSessions[uid];
        const isOnline = (Date.now() - session.lastActive) < 120000;
        const lastActiveTime = new Date(session.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const fullName = (session.name || '').trim();
        let matchedAvatar = availableAvatars.find(img => namesMatch(fullName, img.replace('.png', '')));
        let avatarSrc = matchedAvatar ? `assets/src/img/${matchedAvatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;

        const completedTasks = session.finalizedTasks || 0;
        const totalTasks = session.totalTasks || 0;
        const percentage = session.percentage || 0;

        const card = document.createElement('div');
        card.className = 'monitoreo-card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div class="monitoreo-user-info">
                    <img src="${avatarSrc}" alt="${fullName}" class="monitoreo-avatar" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff';">
                    <div class="monitoreo-details">
                        <span class="monitoreo-name">${fullName}</span>
                        <span class="monitoreo-meta">${session.email}</span>
                    </div>
                </div>
                <div class="status-indicator-badge ${isOnline ? 'status-online' : 'status-offline'}">
                    <div class="pulse-dot ${isOnline ? '' : 'offline'}"></div>
                    ${isOnline ? 'En Línea' : 'Inactivo'}
                </div>
            </div>
            
            <div style="margin-top: 10px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: var(--text-secondary);"><i class='bx bx-calendar-check'></i> Turno:</span>
                    <strong style="color: var(--text-primary);">${session.shift || 'Mañana'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: var(--text-secondary);"><i class='bx bx-time'></i> Actividad:</span>
                    <span style="color: var(--text-primary); font-size: 12px;">${lastActiveTime}</span>
                </div>
            </div>

            <div class="progress-container">
                <div class="progress-label-row">
                    <span>Avance de Tareas</span>
                    <strong>${percentage}% (${completedTasks}/${totalTasks})</strong>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
                </div>
            </div>

            <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
                <button class="btn btn-outline" style="width: auto; padding: 6px 12px; font-size: 12px; display: flex; align-items: center; gap: 6px;" onclick="openMonitoreoDetails('${uid}')">
                    <i class='bx bx-search-alt-2'></i> Ver Tareas
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Update Header Statistics
function updateGlobalStats() {
    const statsGestores = document.getElementById('statsGestores');
    const statsKpi = document.getElementById('statsKpi');
    const statsTurno = document.getElementById('statsTurno');

    const uids = Object.keys(allActiveSessions);
    const totalGestores = uids.length;
    
    // Count active (lastActive within 2 mins)
    const onlineCount = uids.filter(uid => (Date.now() - allActiveSessions[uid].lastActive) < 120000).length;

    if (statsGestores) {
        statsGestores.textContent = `${onlineCount} / ${totalGestores}`;
    }

    // Compute average KPI
    let totalPercentage = 0;
    uids.forEach(uid => {
        totalPercentage += allActiveSessions[uid].percentage || 0;
    });
    const avgKpi = totalGestores > 0 ? Math.round(totalPercentage / totalGestores) : 0;
    if (statsKpi) {
        statsKpi.textContent = `${avgKpi}%`;
    }

    // Determine current shift based on active sessions or system hour
    let shiftName = "Mañana";
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) {
        shiftName = "Mañana";
    } else if (hour >= 14 && hour < 22) {
        shiftName = "Tarde";
    } else {
        shiftName = "Noche";
    }

    // Overwrite shift name if there is a dominant shift in active sessions
    if (totalGestores > 0) {
        const shifts = uids.map(uid => allActiveSessions[uid].shift).filter(Boolean);
        if (shifts.length > 0) {
            const counts = {};
            shifts.forEach(s => counts[s] = (counts[s] || 0) + 1);
            let dominantShift = shiftName;
            let maxCount = 0;
            for (const [s, count] of Object.entries(counts)) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantShift = s;
                }
            }
            shiftName = dominantShift;
        }
    }

    if (statsTurno) {
        statsTurno.textContent = shiftName;
    }
}

// Modal inspection controls
window.openMonitoreoDetails = function(uid) {
    const session = allActiveSessions[uid];
    if (!session) return;

    const fullName = (session.name || '').trim();
    let matchedAvatar = availableAvatars.find(img => namesMatch(fullName, img.replace('.png', '')));
    let avatarSrc = matchedAvatar ? `assets/src/img/${matchedAvatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;

    document.getElementById('monitoreoModalAvatar').src = avatarSrc;
    document.getElementById('monitoreoModalAvatar').onerror = function() {
        this.onerror = null;
        this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
    };

    document.getElementById('monitoreoModalName').textContent = "Tareas de " + fullName;
    
    const lastActiveTime = new Date(session.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('monitoreoModalInfo').textContent = `Turno: ${session.shift || 'Mañana'} | Última actividad: ${lastActiveTime}`;

    const tasksList = document.getElementById('monitoreoModalTasksList');
    tasksList.innerHTML = '';

    const tasks = session.tasks || {};
    const taskIds = Object.keys(tasks);

    if (taskIds.length === 0) {
        tasksList.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                Este gestor aún no ha registrado avances de tareas en su turno.
            </div>
        `;
    } else {
        taskIds.forEach(id => {
            const t = tasks[id];
            
            let badgeClass = 'pending';
            if (t.status === 'Finalizada') badgeClass = 'completed';
            else if (t.status === 'En Proceso') badgeClass = 'in-progress';
            else if (t.status === 'No Realizada') badgeClass = 'not-done';

            const observationText = t.observation ? t.observation.trim() : 'Sin observaciones cargadas.';

            tasksList.innerHTML += `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); padding: 12px; border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px;">
                        <span style="font-weight: 500; font-size: 13.5px; color: var(--text-primary);">${t.name}</span>
                        <span class="monitoreo-task-badge ${badgeClass}">${t.status}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); background: rgba(0,0,0,0.15); padding: 8px; border-radius: 4px; border-left: 3px solid var(--accent-primary);">
                        <strong>Notas Técnicas:</strong> ${observationText}
                    </div>
                </div>
            `;
        });
    }

    const modal = document.getElementById('monitoreoModal');
    if (modal) modal.classList.add('active');
};

const closeBtn = document.getElementById('closeMonitoreoModalBtn');
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        const modal = document.getElementById('monitoreoModal');
        if (modal) modal.classList.remove('active');
    });
}

// Overlay click to close modal
const modalOverlay = document.getElementById('monitoreoModal');
if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    });
}

// Filters logic
const searchInput = document.getElementById('monitoreoSearchInput');
const shiftSelect = document.getElementById('filterShiftSelect');
const statusSelect = document.getElementById('filterStatusSelect');
const clearFiltersBtn = document.getElementById('clearMonitoreoFiltersBtn');

if (searchInput) searchInput.addEventListener('input', renderActiveSessionsDashboard);
if (shiftSelect) shiftSelect.addEventListener('change', renderActiveSessionsDashboard);
if (statusSelect) statusSelect.addEventListener('change', renderActiveSessionsDashboard);

if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (shiftSelect) shiftSelect.value = '';
        if (statusSelect) statusSelect.value = '';
        renderActiveSessionsDashboard();
    });
}

// Init Realtime sync on page load
startActiveSessionsListener();
