// Auth Check
const currentUserObj = localStorage.getItem('riskOps_currentUser');
if (!currentUserObj && !window.location.href.includes('login.html')) {
    window.location.href = 'login.html';
}

let currentUser = null;
let currentTaskRef = null;
let activeSessionRef = null;

// --- INACTIVITY & LUNCH TRACKING GLOBALS ---
let lastLocalActivityTimestamp = Date.now();
let isLunchBreak = false;
let lunchStartTime = null;
let totalLunchTimeMs = 0;
let isBreakfastBreak = false;
let breakfastStartTime = null;
let totalBreakfastTimeMs = 0;
let globalIdleState = false; // Tracks if the OS/PC is idle or locked via IdleDetector

function saveBreakState() {
    localStorage.setItem('riskOps_breakState', JSON.stringify({
        isLunchBreak, lunchStartTime, totalLunchTimeMs,
        isBreakfastBreak, breakfastStartTime, totalBreakfastTimeMs
    }));
}

try {
    const savedState = localStorage.getItem('riskOps_breakState');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        isLunchBreak = parsed.isLunchBreak || false;
        lunchStartTime = parsed.lunchStartTime || null;
        totalLunchTimeMs = parsed.totalLunchTimeMs || 0;
        isBreakfastBreak = parsed.isBreakfastBreak || false;
        breakfastStartTime = parsed.breakfastStartTime || null;
        totalBreakfastTimeMs = parsed.totalBreakfastTimeMs || 0;
    }
} catch(e) {}

let shiftTimeline = [];
let localStatus = 'En Línea';

try {
    const savedTimeline = localStorage.getItem('riskOps_timeline');
    if (savedTimeline) {
        shiftTimeline = JSON.parse(savedTimeline);
        let changed = false;
        shiftTimeline.forEach(ev => {
            if (ev.type === 'Inactividad' && ev.end === null) {
                ev.end = Date.now();
                changed = true;
            }
        });
        if (changed) {
            localStorage.setItem('riskOps_timeline', JSON.stringify(shiftTimeline));
        }
    }
} catch(e) {}

function pushTimelineEvent(type, action) {
    const now = Date.now();
    if (action === 'start') {
        shiftTimeline.push({ type, start: now, end: null });
    } else if (action === 'end') {
        for (let i = shiftTimeline.length - 1; i >= 0; i--) {
            if (shiftTimeline[i].type === type && shiftTimeline[i].end === null) {
                shiftTimeline[i].end = now;
                break;
            }
        }
    }
    localStorage.setItem('riskOps_timeline', JSON.stringify(shiftTimeline));
}

async function initIdleDetector() {
    if ('IdleDetector' in window) {
        try {
            const state = await IdleDetector.requestPermission();
            if (state === 'granted') {
                const idleDetector = new IdleDetector();
                idleDetector.addEventListener('change', () => {
                    globalIdleState = (idleDetector.userState === 'idle') || (idleDetector.screenState === 'locked');
                });
                await idleDetector.start({ threshold: 5 * 60 * 1000 }); // 5 minutes
            }
        } catch (err) {
            console.error('IdleDetector init failed:', err);
        }
    }
}

// Pedir permiso en el primer clic del usuario en la página
document.addEventListener('click', () => {
    if (!window.idleDetectorRequested) {
        window.idleDetectorRequested = true;
        initIdleDetector();
    }
}, { once: true });

// Activity listeners
function updateActivity() {
    const now = Date.now();
    lastLocalActivityTimestamp = now;
}
document.addEventListener('mousemove', updateActivity);
document.addEventListener('keydown', updateActivity);
document.addEventListener('click', updateActivity);
document.addEventListener('scroll', updateActivity);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        updateActivity();
    }
});

try {
    // TEMPORARY LOCAL CLEANUP: Remove false 'Inactividad' from localStorage so gestores don't re-upload it
    let localTimeline = JSON.parse(localStorage.getItem('riskOps_timeline')) || [];
    let initialLength = localTimeline.length;
    localTimeline = localTimeline.filter(ev => ev.type !== 'Inactividad');
    if (localTimeline.length !== initialLength) {
        localStorage.setItem('riskOps_timeline', JSON.stringify(localTimeline));
    }
    
    currentUser = currentUserObj ? JSON.parse(currentUserObj) : null;
    if (currentUser) {
        if (currentUser.loginLogId) {
            // Eliminar cualquier falso logoutTime que se haya generado si el usuario simplemente refrescó la página (F5) o perdió red temporalmente
            database.ref(`login_logs/${currentUser.loginLogId}/logoutTime`).remove();
            
            database.ref(`login_logs/${currentUser.loginLogId}`).onDisconnect().update({
                logoutTime: firebase.database.ServerValue.TIMESTAMP
            });
        }
        if (currentUser.uid) {
            database.ref(`active_sessions/${currentUser.uid}`).onDisconnect().remove();
        }
    }
    
    // TEMPORARY CLEANUP: Remove false 'Inactividad' records from the last 48 hours for all shift_reports
    if (currentUser && currentUser.role === 'Administrador' && !window.cleanupDone) {
        window.cleanupDone = true;
        const ayer = Date.now() - (2 * 24 * 60 * 60 * 1000);
        database.ref('shift_reports').once('value').then(snap => {
            const data = snap.val();
            if (data) {
                for (let key in data) {
                    let r = data[key];
                    let t = r.timestamp || r.loginTime;
                    if (t && t >= ayer && r.timeline) {
                        let newTimeline = r.timeline.filter(ev => ev.type !== 'Inactividad');
                        if (newTimeline.length !== r.timeline.length) {
                            database.ref('shift_reports/' + key + '/timeline').set(newTimeline);
                            // Set inactividadTotalMins to 0 so the fallback logic doesn't re-calculate from deleted blocks
                            database.ref('shift_reports/' + key + '/inactividadTotalMins').set(0);
                        }
                    }
                }
            }
        });
    }
    
} catch(e) {
    localStorage.removeItem('riskOps_currentUser');
    window.location.href = 'login.html';
}
let globalScheduleRows = null;
let globalScheduleBlocks = null;
// Helper to remove accents and normalize names for comparison and file paths
function normalizeName(name) {
    if (!name) return "";
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

// Robust comparison: checks if all words of one name are present in the other
function namesMatch(name1, name2) {
    if (!name1 || !name2) return false;
    const n1 = normalizeName(name1);
    const n2 = normalizeName(name2);
    
    // Split into words and filter out very short ones (like 'de', 'la')
    const words1 = n1.split(/\s+/).filter(w => w.length > 2);
    const words2 = n2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return n1.includes(n2) || n2.includes(n1);

    // Check if all words of the shorter name are in the longer name
    const [shorter, longer] = words1.length <= words2.length ? [words1, n2] : [words2, n1];
    return shorter.every(word => longer.includes(word));
}

// Helpers for date calculations in schedules
function excelToJSDate(serial) {
    if(!serial || isNaN(serial)) return null;
    const epochUTC = Date.UTC(1899, 11, 30);
    return new Date(epochUTC + serial * 86400000);
}

function isSameDate(excelDate, jsDate) {
    if (!excelDate || !jsDate) return false;
    // Compare the UTC date from Excel (which is timezone-naive) with the browser's local date
    return excelDate.getUTCDate()   === jsDate.getDate() &&
           excelDate.getUTCMonth()  === jsDate.getMonth() &&
           excelDate.getUTCFullYear() === jsDate.getFullYear();
}

function getShiftCategory(shiftText) {
    if (!shiftText) return "";
    const clean = shiftText.trim().toLowerCase();
    
    // Exact or partial category matches
    if (clean.includes("manana") || clean.includes("mañana")) return "Mañana";
    if (clean.includes("tarde")) return "Tarde";
    if (clean.includes("noche")) return "Noche";
    if (clean.includes("master")) return "Master";
    
    // Parse time ranges (e.g. "8am - 4pm", "3pm - 11pm", "10pm - 6am")
    // Match the starting hour
    const match = clean.match(/^(\d+)\s*(am|pm)/i);
    if (match) {
        let hour = parseInt(match[1]);
        const ampm = match[2].toLowerCase();
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        
        // Define classifications based on starting hour
        if (hour >= 6 && hour < 14) return "Mañana";
        if (hour >= 14 && hour < 22) return "Tarde";
        return "Noche";
    }
    
    return "";
}

function cleanText(text) {
    if (!text || typeof text !== 'string') return "";
    let cleaned = text.toLowerCase();
    cleaned = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    cleaned = cleaned.replace(/[^a-z0-9\s]/g, " ");
    cleaned = cleaned.split(/\s+/).join(" ").trim();
    return cleaned;
}

function normalizeTaskName(name) {
    const cleaned = cleanText(name);
    if (cleaned.includes("conciliacion de pasarelas")) {
        return "conciliacion de pasarelas";
    }
    if (cleaned.includes("revision de billetera") || cleaned.includes("billetera usuarios")) {
        return "revision de billetera usuarios pdv";
    }
    if (cleaned.includes("revision de eventos") || cleaned.includes("revision de evento")) {
        return "revision de eventos";
    }
    return cleaned;
}

function taskNamesMatch(cronTask, masterTask) {
    if (!cronTask || !masterTask) return false;
    const normCron = normalizeTaskName(cronTask);
    const normMaster = normalizeTaskName(masterTask);
    return normCron === normMaster || normMaster.includes(normCron) || normCron.includes(normMaster);
}

function setNamesMatch(set1, set2) {
    if (!set1 || !set2) return false;
    const s1 = cleanText(set1);
    const s2 = cleanText(set2);
    return s1 === s2 || s1.includes(s2) || s2.includes(s1);
}

const MONTHS_MAP = {
    "ene": 0, "enero": 0,
    "feb": 1, "febrero": 1,
    "mar": 2, "marzo": 2,
    "abr": 3, "abril": 3,
    "may": 4, "mayo": 4,
    "jun": 5, "junio": 5,
    "jul": 6, "julio": 6,
    "ago": 7, "agosto": 7,
    "sep": 8, "set": 8, "septiembre": 8,
    "oct": 9, "octubre": 9,
    "nov": 10, "noviembre": 10,
    "dic": 11, "diciembre": 11
};

function parseSheetRange(sheetName, year = 2026) {
    if (!sheetName) return null;
    let clean = sheetName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    let m = clean.match(/Semana\s+\d+\s*-\s*(\d+)\s+(\w+)\s+al\s+(\d+)\s+(\w+)/i);
    if (m) {
        let startDay = parseInt(m[1], 10);
        let startMStr = m[2].substring(0, 3).toLowerCase();
        let endDay = parseInt(m[3], 10);
        let endMStr = m[4].substring(0, 3).toLowerCase();
        
        let startMonth = MONTHS_MAP[startMStr] !== undefined ? MONTHS_MAP[startMStr] : 0;
        let endMonth = MONTHS_MAP[endMStr] !== undefined ? MONTHS_MAP[endMStr] : 0;
        
        let startDate = new Date(year, startMonth, startDay, 0, 0, 0);
        let endDate = new Date(year, endMonth, endDay, 23, 59, 59);
        return { start: startDate, end: endDate };
    }
    
    m = clean.match(/Semana\s+\d+\s*-\s*(\d+)\s+al\s+(\d+)\s+(\w+)/i);
    if (m) {
        let startDay = parseInt(m[1], 10);
        let endDay = parseInt(m[2], 10);
        let mStr = m[3].substring(0, 3).toLowerCase();
        
        let month = MONTHS_MAP[mStr] !== undefined ? MONTHS_MAP[mStr] : 0;
        let startDate = new Date(year, month, startDay, 0, 0, 0);
        let endDate = new Date(year, month, endDay, 23, 59, 59);
        return { start: startDate, end: endDate };
    }
    
    return null;
}

function getWeekSheet(sheetNames, targetDate) {
    if (!sheetNames || sheetNames.length === 0) return null;
    const year = targetDate.getFullYear();
    for (let name of sheetNames) {
        let r = parseSheetRange(name, year);
        if (r) {
            if (targetDate >= r.start && targetDate <= r.end) {
                return name;
            }
        }
    }
    return sheetNames[sheetNames.length - 1];
}

function getCronogramaColumnsForToday(targetDate, shiftText, rows = []) {
    const day = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    let cols = { manana: [], tarde: [], sabado: [], domingo: [] };
    
    for (let rIdx = 0; rIdx < Math.min(5, rows.length); rIdx++) {
        const row = rows[rIdx];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
            const val = String(row[c] || "").trim().toLowerCase();
            if (val.includes("mañana") && !val.includes("sabado") && !val.includes("sábado") && !val.includes("domingo") && cols.manana.length === 0) {
                if (c + 1 < row.length) cols.manana = [c, c + 1];
            }
            if (val.includes("tarde") && cols.tarde.length === 0) {
                if (c + 1 < row.length) cols.tarde = [c, c + 1];
            }
            if ((val.includes("sábado") || val.includes("sabado")) && cols.sabado.length === 0) {
                if (c + 1 < row.length) cols.sabado = [c, c + 1];
            }
            if (val.includes("domingo") && cols.domingo.length === 0) {
                if (c + 1 < row.length) cols.domingo = [c, c + 1];
            }
        }
    }
    
    // Fallback si no se encuentran
    if (cols.manana.length === 0) cols.manana = [1, 2];
    if (cols.tarde.length === 0) cols.tarde = [4, 5];
    if (cols.sabado.length === 0) cols.sabado = [7, 8];
    if (cols.domingo.length === 0) cols.domingo = [10, 11];

    if (day === 0) { // Sunday
        return [cols.domingo];
    } else if (day === 6) { // Saturday
        return [cols.sabado];
    } else { // Monday to Friday
        return [cols.manana, cols.tarde];
    }
}

let globalCronogramaData = null;
async function preloadCronograma() {
    try {
        const url = encodeURI('Cronograma de Tareas/Cronograma Junio.xlsx') + '?t=' + Date.now();
        const response = await fetch(url);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        const today = new Date();
        const sheetName = getWeekSheet(workbook.SheetNames, today);
        if (sheetName) {
            globalCronogramaData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
            // Re-render dashboard just in case it loaded before this finished
            if (document.getElementById('monitoreoView').style.display !== 'none') {
                renderDashboardCards();
            }
        }
    } catch(e) {
        console.error("preloadCronograma error", e);
    }
}

function getAssignedTasksForGestor(gestorName, shiftText) {
    if (!globalCronogramaData) return [];
    let assignments = [];
    const today = new Date();
    const colGroups = getCronogramaColumnsForToday(today, shiftText, globalCronogramaData);
    
    for (let colGroup of colGroups) {
        const tCol = colGroup[0];
        const gCol = colGroup[1];
        for (let rIdx = 0; rIdx < globalCronogramaData.length; rIdx++) {
            const row = globalCronogramaData[rIdx];
            if (!row) continue;
            const taskVal = row[tCol];
            const gestorVal = row[gCol];
            if (taskVal !== undefined && taskVal !== null && String(taskVal).trim() !== "") {
                const tStrLower = String(taskVal).trim().toLowerCase();
                if (!tStrLower.startsWith("set ") && !tStrLower.includes("cronograma") && gestorVal !== "Gestor") {
                    if (gestorVal !== undefined && gestorVal !== null && namesMatch(String(gestorVal).trim(), gestorName)) {
                        assignments.push(String(taskVal).trim());
                    }
                }
            }
        }
    }
    return assignments;
}

let gestorCronogramaAssignments = null;

async function loadCronogramaAssignments(gestorName, gestorShift) {
    try {
        const url = encodeURI('Cronograma de Tareas/Cronograma Junio.xlsx') + '?t=' + Date.now();
        const response = await fetch(url);
        if (!response.ok) throw new Error("Fallo al cargar cronograma");
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        
        const today = new Date();
        const sheetName = getWeekSheet(workbook.SheetNames, today);
        if (!sheetName) return;
        
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        const colGroups = getCronogramaColumnsForToday(today, gestorShift, rows);
        
        gestorCronogramaAssignments = [];
        
        for (let colGroup of colGroups) {
            const tCol = colGroup[0];
            const gCol = colGroup[1];
            
            let currentSet = "";
            for (let rIdx = 0; rIdx < rows.length; rIdx++) {
                const row = rows[rIdx];
                if (!row) continue;
                
                const taskVal = row[tCol];
                const gestorVal = row[gCol];
                
                if (taskVal !== undefined && taskVal !== null && String(taskVal).trim() !== "") {
                    const tStr = String(taskVal).trim();
                    const tStrLower = tStr.toLowerCase();
                    
                    if (tStrLower.startsWith("set ")) {
                        currentSet = tStr;
                    } else if (!tStrLower.includes("cronograma") && gestorVal !== "Gestor") {
                        if (gestorVal !== undefined && gestorVal !== null && namesMatch(String(gestorVal).trim(), gestorName)) {
                            gestorCronogramaAssignments.push({
                                set: currentSet || "Otros",
                                task: tStr
                            });
                        }
                    }
                }
            }
        }
        console.log("Cargadas asignaciones de cronograma para " + gestorName + ":", gestorCronogramaAssignments);
    } catch (e) {
        console.error("Error al cargar Cronograma de Tareas:", e);
        gestorCronogramaAssignments = [];
    }
}

function getScheduledGestoresCountForShift(shiftName, targetDate = new Date()) {
    if (!globalScheduleRows || !globalScheduleBlocks || globalScheduleBlocks.length === 0) {
        return 0;
    }
    
    let targetBlock = null;
    let targetColIndex = -1;
    
    for (let block of globalScheduleBlocks) {
        const dateRow = globalScheduleRows[block.startRow];
        for (let c = 1; c < dateRow.length; c++) {
            const serial = dateRow[c];
            if (serial && !isNaN(serial)) {
                const cellDate = excelToJSDate(serial);
                if (cellDate && isSameDate(cellDate, targetDate)) {
                    targetBlock = block;
                    targetColIndex = c;
                    break;
                }
            }
        }
        if (targetBlock) break;
    }
    
    if (!targetBlock) {
        targetBlock = globalScheduleBlocks[globalScheduleBlocks.length - 1];
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayRow = globalScheduleRows[targetBlock.startRow + 1];
        const targetDayName = dayNames[targetDate.getDay()];
        
        for (let c = 1; c < dayRow.length; c++) {
            const dayName = String(dayRow[c] || '').trim();
            if (normalizeName(dayName) === normalizeName(targetDayName)) {
                targetColIndex = c;
                break;
            }
        }
        
        if (targetColIndex === -1) {
            let jsDay = targetDate.getDay();
            targetColIndex = jsDay === 0 ? 7 : jsDay;
        }
    }
    
    let count = 0;
    const blockStartRow = targetBlock.startRow;
    for (let rIdx = blockStartRow + 2; rIdx < globalScheduleRows.length; rIdx++) {
        const r = globalScheduleRows[rIdx];
        if (!r || !r[0] || String(r[0]).trim() === '' || String(r[0]).trim().toUpperCase() === 'GESTOR') break;
        
        const rawShift = r[targetColIndex] || 'Descansa';
        const category = getShiftCategory(rawShift);
        if (category === shiftName) {
            count++;
        }
    }
    
    return count;
}

function getShiftForDate(rows, allScheduleBlocks, gestorName, date) {
    if (!rows || rows.length === 0 || !allScheduleBlocks || allScheduleBlocks.length === 0) {
        return 'Por Asignar';
    }
    
    let targetBlock = null;
    let targetColIndex = -1;
    
    for (let block of allScheduleBlocks) {
        const dateRow = rows[block.startRow];
        for (let c = 1; c < dateRow.length; c++) {
            const serial = dateRow[c];
            if (serial && !isNaN(serial)) {
                const cellDate = excelToJSDate(serial);
                if (cellDate && isSameDate(cellDate, date)) {
                    targetBlock = block;
                    targetColIndex = c;
                    break;
                }
            }
        }
        if (targetBlock) break;
    }
    
    if (!targetBlock) {
        targetBlock = allScheduleBlocks[allScheduleBlocks.length - 1];
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayRow = rows[targetBlock.startRow + 1];
        const targetDayName = dayNames[date.getDay()];
        
        for (let c = 1; c < dayRow.length; c++) {
            const dayName = String(dayRow[c] || '').trim();
            if (normalizeName(dayName) === normalizeName(targetDayName)) {
                targetColIndex = c;
                break;
            }
        }
        
        if (targetColIndex === -1) {
            let jsDay = date.getDay();
            targetColIndex = jsDay === 0 ? 7 : jsDay;
        }
    }
    
    const blockStartRow = targetBlock.startRow;
    for (let rIdx = blockStartRow + 2; rIdx < rows.length; rIdx++) {
        const r = rows[rIdx];
        if (!r || !r[0] || String(r[0]).trim() === '' || String(r[0]).trim().toUpperCase() === 'GESTOR') break;
        
        if (namesMatch(r[0], gestorName)) {
            return r[targetColIndex] || 'Descansa';
        }
    }
    
    return 'Por Asignar';
}

// Mapeo de URLs para documentos (especialmente videos pesados alojados en Google Drive)
const documentUrls = {
    "Revisión de Eventos Deportivos.mp4": "https://drive.google.com/file/d/1UqccsnUwTG6tgPcDYdUeLnf9XqvGzSoc/view?usp=sharing",
    "Revisión de Eventos.mp4": "https://drive.google.com/file/d/1SB9ePi1EOJU05hzOsxOyl7BeNvCN1hOh/view?usp=sharing",
    "Validación SEON.mp4": "https://drive.google.com/file/d/1JFf5basGD0gmrAVIy5AlMK1DBHYgE6JC/view?usp=sharing"
};

function getDocUrl(fileName) {
    if (documentUrls[fileName]) {
        return documentUrls[fileName];
    }
    return "Procesos/" + fileName;
}

let taskStateCache = {};
try {
    const cached = localStorage.getItem('riskOps_cache');
    if(cached) taskStateCache = JSON.parse(cached);
} catch(e) {}

let currentActiveTaskId = null;

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

// Update clock every second
setInterval(updateClock, 1000);
updateClock(); // Initial call

// Data source real
let allTasks = [];
let currentSelectedTask = null;

// Initialize Excel fetching
async function loadExcelTasks() {
    const container = document.querySelector('.tree-container');
    if(container) container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);"><i class="bx bx-loader-alt bx-spin"></i> Cargando Tareas...</div>';
    
    try {
        const url = encodeURI('Tareas Riesgo/Tareas de Riesgo.xlsx') + '?t=' + new Date().getTime();
        const response = await fetch(url);
        if(!response.ok) throw new Error("Error HTTP " + response.status);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        // Assign ID to all master tasks in json
        json.forEach((row, idx) => {
            row.id = idx;
        });
        
        let processedRows = [];
        
        if (currentUser && currentUser.role === 'Gestor') {
            // Resolve today's real shift from the parsed schedule (globalScheduleRows/globalScheduleBlocks)
            // This ensures the filter uses the actual shift for today, not a stale value from localStorage
            let resolvedShift = currentUser.shift || 'Por Asignar';
            if (globalScheduleRows && globalScheduleBlocks && globalScheduleBlocks.length > 0) {
                const todayShift = getShiftForDate(globalScheduleRows, globalScheduleBlocks, currentUser.name, new Date());
                if (todayShift && todayShift !== 'Por Asignar' && todayShift !== 'Descansa') {
                    resolvedShift = todayShift;
                }
            }
            // Load cronograma assignments using the resolved real shift
            await loadCronogramaAssignments(currentUser.name, resolvedShift);
            
            if (gestorCronogramaAssignments && gestorCronogramaAssignments.length > 0) {
                // Filter the master json rows
                const filteredMasterRows = json.filter(row => {
                    const set = row['Set '] || row['Set'] || 'Otros';
                    const taskName = row['Tarea'];
                    return gestorCronogramaAssignments.some(assign => 
                        taskNamesMatch(assign.task, taskName) && setNamesMatch(assign.set, set)
                    );
                });
                
                // Generate mock tasks for assignments that aren't in the master sheet
                const generatedMocks = [];
                let mockId = 10000;
                gestorCronogramaAssignments.forEach(assign => {
                    const hasMasterMatch = json.some(row => 
                        taskNamesMatch(assign.task, row['Tarea']) && setNamesMatch(assign.set, row['Set '] || row['Set'] || 'Otros')
                    );
                    
                    if (!hasMasterMatch) {
                        const mockRow = {
                            'Set ': assign.set,
                            'Tarea': assign.task,
                            'Detalle de Tarea': `Tarea de control rutinario: ${assign.task}. Realizar las verificaciones correspondientes según los lineamientos de Riesgo.`,
                            'Horario': 'Durante el turno',
                            'Día': 'Diario',
                            'Instrucciones': '1. Realizar la validación de la tarea de acuerdo con el procedimiento estándar.\n2. Registrar cualquier anomalía en los canales oficiales.\n3. Marcar como completada en esta plataforma al finalizar.',
                            'Documento / Video de Apoyo': '',
                            id: mockId++
                        };
                        generatedMocks.push(mockRow);
                    }
                });
                
                processedRows = [...filteredMasterRows, ...generatedMocks];
            } else {
                processedRows = [];
            }
        } else {
            // Admin/Supervisor or other roles see everything
            processedRows = json;
        }
        
        // Transform the data, group by Set
        const tasksBySet = {};
        allTasks = []; // Clear global allTasks
        
        processedRows.forEach((row, index) => {
            const set = row['Set '] || row['Set'] || 'Otros';
            const taskName = row['Tarea'];
            const taskId = row.id !== undefined ? row.id : index;
            
            if (!tasksBySet[set]) tasksBySet[set] = [];
            
            // Check for duplicates in the visual tree
            const isDuplicate = tasksBySet[set].some(t => t.name === taskName);
            
            if (!isDuplicate) {
                tasksBySet[set].push({
                    id: taskId,
                    name: taskName,
                    detail: row['Detalle de Tarea'],
                    time: row['Horario'],
                    day: row['Día']
                });
            }
            allTasks.push({ ...row, id: taskId });
        });
        
        // Populate Set Selector
        const select = document.getElementById('activeSetSelect');
        if(select) {
            select.innerHTML = '<option value="" disabled selected>Selecciona tu SET a trabajar...</option><option value="Todos">Mostrar Todos</option>';
            const setsKeys = Object.keys(tasksBySet).sort();
            setsKeys.forEach(set => {
                select.innerHTML += `<option value="${set}">${set}</option>`;
            });
            
            // Clone select to remove old event listeners
            const newSelect = select.cloneNode(true);
            select.parentNode.replaceChild(newSelect, select);
            
            newSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if(val === 'Todos') {
                    renderTree(tasksBySet);
                } else {
                    const filtered = {};
                    filtered[val] = tasksBySet[val];
                    renderTree(filtered);
                }
            });

            if (setsKeys.length === 1) {
                newSelect.value = setsKeys[0];
                const filtered = {};
                filtered[setsKeys[0]] = tasksBySet[setsKeys[0]];
                renderTree(filtered);
            } else if (setsKeys.length === 0) {
                const container = document.querySelector('.tree-container');
                if(container) container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">No hay tareas asignadas en tu cronograma para el día de hoy.</div>';
            } else {
                // No renderizar todos por defecto, esperar selección
                const container = document.querySelector('.tree-container');
                if(container) container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">Selecciona un SET en el menú desplegable para ver las tareas.</div>';
            }
        }
        
    } catch(err) {
        console.error("Error loading tasks:", err);
        const container = document.querySelector('.tree-container');
        if(container) container.innerHTML = `<div style="padding: 20px; color: var(--danger);"><i class="bx bx-error-circle"></i> Error cargando tareas: ${err.message}</div>`;
    }
}

// Initializar parseo del Horario Personal
async function loadSchedule() {
    try {
        const url = encodeURI('Horario/Horario 2026.xlsx') + '?t=' + Date.now();
        const response = await fetch(url);
        if(!response.ok) throw new Error("Fallo red");
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        // Función helper para parsear fechas de Excel a JS
        function formatExcelDate(serial) {
            if(!serial || isNaN(serial)) return "";
            // Usar UTC para evitar problemas de zonas horarias e historia de DST
            const epochUTC = Date.UTC(1899, 11, 30);
            const d = new Date(epochUTC + serial * 86400000);
            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            return `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`;
        }
        
        let allScheduleBlocks = [];
        if (rows && rows.length > 2) {
            for(let rIdx = 0; rIdx < rows.length; rIdx++) {
                const testRow = rows[rIdx];
                if (!testRow || testRow.length < 2) continue;
                
                if (formatExcelDate(testRow[1]) !== "") {
                    const nextR = rows[rIdx+1];
                    if (nextR && nextR.length > 1 && (nextR[1] === 'Lunes' || nextR[1] === 'Martes')) {
                        // Encontramos un bloque, vamos a ver la fecha inicial y final
                        let firstDate = formatExcelDate(testRow[1]);
                        let lastDate = firstDate;
                        for(let c = 1; c < testRow.length; c++) {
                            if(formatExcelDate(testRow[c])) lastDate = formatExcelDate(testRow[c]);
                        }
                        
                        allScheduleBlocks.push({
                            startRow: rIdx,
                            label: `Semana del ${firstDate} al ${lastDate}`
                        });
                        rIdx++; // Saltar la fila de días
                    }
                }
            }
        }

        globalScheduleRows = rows;
        globalScheduleBlocks = allScheduleBlocks;
        
        if (allScheduleBlocks.length === 0) return; // No hay datos válidos

        const tableHead = document.getElementById('scheduleTableHead');
        const tableBody = document.getElementById('scheduleTableBody');
        
        if(tableHead && tableBody && rows.length > 2) {
            
            const weekSelector = document.getElementById('weekSelector');
            
            // Encontrar el bloque correspondiente a hoy
            let defaultBlockRow = null;
            const today = new Date();
            for (let block of allScheduleBlocks) {
                const dateRow = rows[block.startRow];
                for (let c = 1; c < dateRow.length; c++) {
                    const serial = dateRow[c];
                    if (serial && !isNaN(serial)) {
                        const cellDate = excelToJSDate(serial);
                        if (cellDate && isSameDate(cellDate, today)) {
                            defaultBlockRow = block.startRow;
                            break;
                        }
                    }
                }
                if (defaultBlockRow !== null) break;
            }
            
            if (defaultBlockRow === null) {
                defaultBlockRow = allScheduleBlocks[allScheduleBlocks.length - 1].startRow;
            }
            
            if (weekSelector) {
                weekSelector.innerHTML = '';
                allScheduleBlocks.forEach(block => {
                    weekSelector.innerHTML += `<option value="${block.startRow}">${block.label}</option>`;
                });
                
                weekSelector.value = defaultBlockRow;
                
                weekSelector.addEventListener('change', (e) => {
                    renderScheduleBlock(parseInt(e.target.value));
                });
            }
            
            // Renderizar el bloque inicial
            renderScheduleBlock(defaultBlockRow);
            
            function renderScheduleBlock(blockStartRow) {
                const dateRow = rows[blockStartRow];
                const dayRow = rows[blockStartRow + 1];
                
                let numCols = 0;
                for(let i=1; i<dateRow.length; i++) {
                    if(formatExcelDate(dateRow[i])) numCols = i;
                }
                if(numCols === 0) numCols = 7; // fallback
                
                let headHTML = '<tr style="border-bottom: 1px solid var(--glass-border);">';
                headHTML += `<th style="padding: 12px; color: var(--accent-primary); text-align: left; position: sticky; left: 0; background: var(--bg-panel); z-index: 2;">GESTOR <i class='bx bx-refresh' style='cursor:pointer; margin-left:5px;' onclick='loadSchedule()' title='Refrescar Horario'></i></th>`;
                for(let i = 1; i <= numCols; i++) {
                    const dayName = dayRow[i] || `Día ${i}`;
                    const dateParsed = formatExcelDate(dateRow[i]);
                    const subText = dateParsed ? `<br><span style="font-size: 11px; font-weight: normal; color: var(--text-secondary);">${dateParsed}</span>` : '';
                    headHTML += `<th style="padding: 12px; color: var(--accent-primary); text-align: center;">${dayName}${subText}</th>`;
                }
                headHTML += '</tr>';
                tableHead.innerHTML = headHTML;
                
                tableBody.innerHTML = '';
                for(let rowIndex = blockStartRow + 2; rowIndex < rows.length; rowIndex++) {
                    const r = rows[rowIndex];
                    if (!r || !r[0] || String(r[0]).trim() === '' || String(r[0]).trim().toUpperCase() === 'GESTOR') break;
                    
                    let isCurrentUser = (currentUser && namesMatch(r[0], currentUser.name));
                    
                    if (currentUser && currentUser.role === 'Gestor' && !isCurrentUser) continue;

                    let bgClass = isCurrentUser ? 'rgba(59,130,246,0.1)' : 'transparent';
                    
                    let trHTML = `<tr class="hover-highlight" style="border-bottom: 1px solid var(--glass-border); background: ${bgClass};">`;
                    trHTML += `<td style="padding: 12px; font-weight: 600; text-align: left; color: ${isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)'}; position: sticky; left: 0; background: ${isCurrentUser ? 'var(--bg-dark)' : 'var(--bg-panel)'}; z-index: 1;">${r[0]}</td>`;
                    
                    // Encontrar el turno para mostrar en el badge principal (corresponde a hoy)
                    let badgeShift = getShiftForDate(rows, allScheduleBlocks, r[0], new Date());
                    
                    for(let i = 1; i <= numCols; i++) {
                        const shift = r[i] || 'Descansa';
                        
                        let badgeClass = 'pending';
                        const sLower = normalizeName(shift);
                        if(/\d\s*(am|pm)/i.test(shift)) badgeClass = 'in-progress';
                        else if(sLower.includes('vacacion')) badgeClass = 'vacaciones-badge';
                        else if(sLower.includes('descansa')) badgeClass = 'descanso-badge';
                        else if(sLower.includes('familia')) badgeClass = 'familia-badge';
                        
                        trHTML += `<td style="padding: 12px; text-align: center; white-space: nowrap;"><span class="badge ${badgeClass}">${shift}</span></td>`;
                    }
                    
                    if (isCurrentUser && badgeShift) {
                        const userRoleEl = document.getElementById('userRole');
                        if (userRoleEl) userRoleEl.textContent = `${currentUser.role} | Turno: ${badgeShift}`;
                        const headerShiftBadge = document.querySelector('.shift-badge');
                        if (headerShiftBadge) headerShiftBadge.textContent = `TURNO: ${badgeShift}`;
                        
                        // Guardar el turno en currentUser y sincronizar a Firebase
                        if (currentUser.shift !== badgeShift) {
                            currentUser.shift = badgeShift;
                            localStorage.setItem('riskOps_currentUser', JSON.stringify(currentUser));
                            syncActiveSessionToFirebase();
                            loadExcelTasks();
                        }
                    }
                    trHTML += '</tr>';
                    tableBody.innerHTML += trHTML;
                }
            }
        }
        updateGlobalStats();
    } catch(e) {
        console.log("No se pudo cargar el horario", e);
    }
}

function loadTeletrabajo() {
    fetch('Teletrabajo/Teletrabajo.xlsx?v=' + Date.now())
        .then(res => {
            if(!res.ok) throw new Error("No se encontró el archivo de Teletrabajo");
            return res.arrayBuffer();
        })
        .then(data => {
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1, defval: ""});
            
            let allBlocks = [];
            
            for(let r = 0; r < rows.length; r++) {
                for(let c = 0; c < rows[r].length; c++) {
                    // Bloque mejorado: busca etiquetas claras de calendario
                    const cellVal = String(rows[r][c]).trim();
                    const lowCell = cellVal.toLowerCase();
                    if(lowCell.includes('semana') || lowCell.includes('teletrabajo') || /^\d{1,2}\/\d{1,2}/.test(cellVal)) {
                        let block = {
                            label: cellVal,
                            startRow: r,
                            colIndex: c,
                            data: []
                        };
                        
                        // Buscamos filas debajo de este título que tengan nombres
                        for(let i = r + 1; i < rows.length; i++) {
                            const gestor = rows[i] ? rows[i][c] : null;
                            const dia = rows[i] ? rows[i][c+1] : null;
                            
                            if(!gestor || String(gestor).trim() === '') break;
                            if(String(gestor).trim().toUpperCase() === 'GESTOR') continue; 
                            
                            block.data.push({
                                gestor: String(gestor).trim(),
                                dia: String(dia || '').trim()
                            });
                        }
                        
                        if(block.data.length > 0) allBlocks.push(block);
                    }
                }
            }
            
            if(allBlocks.length === 0) return;
            
            const weekSelector = document.getElementById('teletrabajoWeekSelector');
            const tableHead = document.getElementById('teletrabajoTableHead');
            const tableBody = document.getElementById('teletrabajoTableBody');
            
            if(weekSelector) {
                weekSelector.innerHTML = '';
                allBlocks.forEach((block, idx) => {
                    weekSelector.innerHTML += `<option value="${idx}">${block.label}</option>`;
                });
                
                // Mostrar siempre la última semana disponible al inicio
                let defaultBlockIdx = allBlocks.length - 1;
                
                weekSelector.value = defaultBlockIdx;
                
                weekSelector.addEventListener('change', (e) => {
                    renderTeletrabajoBlock(allBlocks[e.target.value]);
                });
                
                renderTeletrabajoBlock(allBlocks[defaultBlockIdx]);
            }
            
            function renderTeletrabajoBlock(block) {
                tableHead.innerHTML = `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <th style="padding: 12px; color: var(--accent-primary); text-align: left; position: sticky; left: 0; background: var(--bg-panel); z-index: 2;">GESTOR <i class='bx bx-refresh' style='cursor:pointer; margin-left:5px;' onclick='loadTeletrabajo()' title='Refrescar Teletrabajo'></i></th>
                        <th style="padding: 12px; color: var(--accent-primary); text-align: center;">DÍA</th>
                        <th style="padding: 12px; color: var(--accent-primary); text-align: center;">MODALIDAD</th>
                    </tr>
                `;
                
                tableBody.innerHTML = '';
                block.data.forEach(row => {
                    let isCurrentUser = (currentUser && namesMatch(row.gestor, currentUser.name));
                    
                    if (currentUser && currentUser.role === 'Gestor' && !isCurrentUser) return;

                    let bgClass = isCurrentUser ? 'rgba(59,130,246,0.1)' : 'transparent';
                    
                    let isTeletrabajo = row.dia && row.dia.toLowerCase() !== 'nan';
                    let estadoHtml = isTeletrabajo ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">HOME OFFICE</span>` : `<span class="badge pending">PRESENCIAL</span>`;
                    
                    tableBody.innerHTML += `
                        <tr class="hover-highlight" style="border-bottom: 1px solid var(--glass-border); background: ${bgClass};">
                            <td style="padding: 12px; font-weight: 600; text-align: left; color: ${isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)'}; position: sticky; left: 0; background: ${isCurrentUser ? 'var(--bg-dark)' : 'var(--bg-panel)'}; z-index: 1;">${row.gestor}</td>
                            <td style="padding: 12px; text-align: center;">${isTeletrabajo ? row.dia : '-'}</td>
                            <td style="padding: 12px; text-align: center;">${estadoHtml}</td>
                        </tr>
                    `;
                });
            }
        })
        .catch(err => {
            console.error("Error cargando Teletrabajo:", err);
            const tb = document.getElementById('teletrabajoTableBody');
            if(tb) tb.innerHTML = `<tr><td colspan="3" style="padding: 20px; color: var(--danger); text-align: center;">No se pudo cargar Teletrabajo.xlsx o no existe.</td></tr>`;
        });
}

// Cargar Histórico de Permisos desde Firebase
async function loadPermisos() {
    try {
        const snapshot = await database.ref('permissions').once('value');
        const historicoContainer = document.getElementById('historicoPermisosList');
        if(!historicoContainer) return;
        
        historicoContainer.innerHTML = '';
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            let permisos = Object.keys(data).map(k => ({...data[k], fb_id: k}));
            
            // Filtro de privacidad: Gestor solo ve lo suyo. Admin ve todo.
            if (currentUser && currentUser.role !== 'Admin' && currentUser.role !== 'Supervisor') {
                permisos = permisos.filter(p => p.gestor === currentUser.name);
            }
            
            // Ordenar por ID descendente (más nuevos primero)
            permisos.sort((a,b) => b.id - a.id);
            
            if (permisos.length === 0) {
                historicoContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay permisos en el historial.</p>';
                return;
            }
            
            permisos.forEach(p => {
                let icon = 'bx-time';
                let badgeClass = 'pending';
                if(p.status === 'Aprobado') { badgeClass = 'in-progress'; icon = 'bx-check-double'; }
                if(p.status === 'Rechazado') { badgeClass = 'not-done'; icon = 'bx-x'; }
                
                let rejectionHtml = p.rejectionReason ? `<br><small style="color:var(--danger)">Razón: ${p.rejectionReason}</small>` : '';

                historicoContainer.innerHTML += `
                    <div class="tree-item" style="margin-top: 10px;">
                        <div class="tree-header">
                            <i class='bx ${icon}'></i>
                            <div style="display:flex; flex-direction:column;">
                                <span>${p.tipo}</span>
                                <small style="font-size:11px; opacity:0.7">${p.gestor} | ${p.fecha} (${p.horaInicio} a ${p.horaFin})${rejectionHtml}</small>
                            </div>
                            <span class="badge ${badgeClass}" style="margin-left: auto;">${p.status}</span>
                        </div>
                    </div>
                `;
            });
        } else {
            historicoContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay permisos registrados.</p>';
        }
    } catch(e) {
        console.error("No se pudo cargar permisos desde Firebase", e);
    }
}

function renderTree(tasksBySet) {
    const container = document.querySelector('.tree-container');
    if(!container) return;
    
    container.innerHTML = ''; // clear mock
    
    // Sort keys logically
    const sets = Object.keys(tasksBySet).sort();
    const shouldAutoExpand = sets.length === 1;
    
    sets.forEach(set => {
        const setDiv = document.createElement('div');
        setDiv.className = 'tree-item';
        
        const total = tasksBySet[set].length;
        const headerClass = shouldAutoExpand ? 'tree-header open' : 'tree-header';
        const childrenClass = shouldAutoExpand ? 'tree-children show' : 'tree-children';
        
        setDiv.innerHTML = `
            <div class="${headerClass}" onclick="toggleTree(this)">
                <i class='bx bx-chevron-right'></i>
                <span>${set}</span>
                <span class="badge pending">${total} Tareas</span>
            </div>
            <div class="${childrenClass}">
                ${tasksBySet[set].map(task => {
                    let statusClass = 'status-pending';
                    if (taskStateCache[task.id]) {
                        const statusText = taskStateCache[task.id].status;
                        if (statusText === 'Finalizada') statusClass = 'status-completed';
                        else if (statusText === 'En Proceso') statusClass = 'status-in-progress';
                        else if (statusText === 'No Realizada') statusClass = 'status-not-done';
                    }
                    return `
                    <div class="task-item" onclick="selectTask(${task.id})">
                        <i class='bx bx-file-blank'></i> ${task.name}
                        <div class="task-status ${statusClass}"></div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(setDiv);
    });
    
    // Update KPI whenever tree is rendered
    updateKPI();
}

function syncActiveSessionToFirebase() {
    if (!currentUser || currentUser.role !== 'Gestor') return;
    const uid = currentUser.uid;
    if (!uid) return;

    const totalTasks = document.querySelectorAll('.task-item').length;
    const completedTasks = document.querySelectorAll('.task-item .status-completed').length;
    const notDoneTasks = document.querySelectorAll('.task-item .status-not-done').length;
    const finalized = completedTasks + notDoneTasks;

    let percentage = 0;
    if (totalTasks > 0) {
        percentage = Math.round((finalized / totalTasks) * 100);
    }

    const sessionRef = database.ref('active_sessions/' + uid);
    
    // Read existing session first to preserve the original loginTime.
    // Using update() instead of set() so we only overwrite what we need.
    // For loginTime: only write it if the node doesn't have one yet (first login of the day).
    sessionRef.once('value').then(snap => {
        const existing = snap.val();
        // Preserve the loginTime from Firebase if it already exists, otherwise use the one from localStorage
        const loginTime = (existing && existing.loginTime) ? existing.loginTime : (currentUser.loginTime || new Date().toISOString());
        
        // --- INACTIVITY LOGIC ---
        let newLastActive = Date.now();
        let currentStatus = existing ? existing.status : 'Activo';
        
        const timeSinceLastActivity = Date.now() - lastLocalActivityTimestamp;
        const isDomIdle = timeSinceLastActivity > (5 * 60 * 1000); // 5 minutes local DOM idle
        const isPageVisible = document.visibilityState === 'visible';
        
        let isInactive = false;
        if (globalIdleState) {
            isInactive = true; // PC is locked or idle globally (via IdleDetector)
        } else if (isDomIdle && isPageVisible) {
            isInactive = true; // Left the tab open and walked away
        } else if (isDomIdle && !isPageVisible) {
            isInactive = false; // Tab is hidden, they are probably working in Jira/Email
        }
        
        if (isLunchBreak) {
            newLastActive = (existing && existing.lastActive) ? existing.lastActive : Date.now();
            currentStatus = 'En Almuerzo';
        } else if (isBreakfastBreak) {
            newLastActive = (existing && existing.lastActive) ? existing.lastActive : Date.now();
            currentStatus = 'En Desayuno';
        } else if (isInactive) {
            newLastActive = (existing && existing.lastActive) ? existing.lastActive : Date.now();
            currentStatus = 'Inactivo';
        } else {
            currentStatus = 'En Línea';
        }
        
        // Timeline transitions for Inactivity
        if (currentStatus === 'Inactivo' && localStatus !== 'Inactivo') {
            pushTimelineEvent('Inactividad', 'start');
        } else if (currentStatus !== 'Inactivo' && localStatus === 'Inactivo') {
            pushTimelineEvent('Inactividad', 'end');
        }
        localStatus = currentStatus;
        
        sessionRef.set({
            name: currentUser.name,
            email: currentUser.email,
            shift: currentUser.shift || 'Por Asignar',
            loginTime: loginTime,
            lastActive: newLastActive,
            status: currentStatus,
            totalTasks: totalTasks,
            finalizedTasks: finalized,
            percentage: percentage,
            tasks: taskStateCache || {},
            timeline: shiftTimeline || []
        }).catch(e => console.error("Error syncing active session to Firebase:", e));
    }).catch(e => console.error("Error reading session from Firebase:", e));
}

function updateKPI() {
    const totalTasks = document.querySelectorAll('.task-item').length;
    const completedTasks = document.querySelectorAll('.task-item .status-completed').length;
    const notDoneTasks = document.querySelectorAll('.task-item .status-not-done').length;
    
    // Finalizadas = completed + not-done
    const finalized = completedTasks + notDoneTasks; 
    const pending = totalTasks - finalized;
    
    let percentage = 0;
    if (totalTasks > 0) {
        percentage = Math.round((finalized / totalTasks) * 100);
    }
    
    const kpiContainer = document.querySelector('.kpi-card');
    if (kpiContainer) {
        kpiContainer.innerHTML = `
            <div class="kpi-circle">
                <svg viewBox="0 0 36 36" class="circular-chart" style="width: 100%; height: 100%;">
                    <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke: var(--glass-border); stroke-width: 3.8;"/>
                    <path class="circle" stroke-dasharray="${percentage}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke-width: 3.8; stroke-linecap: round; stroke: var(--success); transition: stroke-dasharray 1s ease-out;"/>
                    <text x="18" y="20.35" class="percentage" style="fill: var(--text-primary); font-family: 'Inter'; font-size: 8px; font-weight: bold; text-anchor: middle;">${percentage}%</text>
                </svg>
            </div>
            <div class="kpi-stats">
                <p><strong>${totalTasks}</strong> Tareas Asignadas</p>
                <p><strong>${finalized}</strong> Finalizadas</p>
                <p><strong>${pending}</strong> Pendientes</p>
            </div>
        `;
    }

    // Sincronizar sesión activa si es gestor
    if (currentUser && currentUser.role === 'Gestor') {
        syncActiveSessionToFirebase();
    }
}

function toggleTree(element) {
    element.classList.toggle('open');
    const childrenContainer = element.nextElementSibling;
    if (childrenContainer) {
        childrenContainer.classList.toggle('show');
    }
}

// Renderizar documentos en el panel de accesos rápidos
function renderQuickDocs(selectedTaskName) {
    const container = document.getElementById('quickDocsList');
    if (!container) return;

    const archivos = [
        "Instructivo de revisión de apuestas casino.pdf",
        "Instructivo de validación de GGR Casino.pdf",
        "Política Procedimiento De Aprobación De Retiros.pdf",
        "Procedimiento Identificación de jineteo.pdf",
        "Proceso de Eliminación de Cuentas - Implementaciones.pdf",
        "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf",
        "Revisión de Eventos Deportivos.mp4",
        "Revisión de Eventos.mp4",
        "Validación SEON.mp4"
    ];

    let matchedDoc = null;
    if (selectedTaskName) {
        const taskNameLower = selectedTaskName.toLowerCase();
        if (taskNameLower.includes('ggr')) matchedDoc = "Instructivo de validación de GGR Casino.pdf";
        else if (taskNameLower.includes('apuesta')) matchedDoc = "Instructivo de revisión de apuestas casino.pdf";
        else if (taskNameLower.includes('retiro')) matchedDoc = "Política Procedimiento De Aprobación De Retiros.pdf";
        else if (taskNameLower.includes('jineteo') || taskNameLower.includes('jineteo')) matchedDoc = "Procedimiento Identificación de jineteo.pdf";
        else if (taskNameLower.includes('eliminaci')) matchedDoc = "Proceso de Eliminación de Cuentas - Implementaciones.pdf";
        else if (taskNameLower.includes('bonos')) matchedDoc = "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf";
        else if (taskNameLower.includes('deportiv')) matchedDoc = "Revisión de Eventos Deportivos.mp4";
        else if (taskNameLower.includes('evento')) matchedDoc = "Revisión de Eventos.mp4";
        else if (taskNameLower.includes('seon')) matchedDoc = "Validación SEON.mp4";
    }

    container.innerHTML = '';

    // Si hay un documento que coincide, mostrarlo destacado arriba
    if (matchedDoc) {
        const isVideo = matchedDoc.toLowerCase().endsWith('.mp4');
        const isWord = matchedDoc.toLowerCase().endsWith('.docx') || matchedDoc.toLowerCase().endsWith('.doc');
        const isExcel = matchedDoc.toLowerCase().endsWith('.xlsx') || matchedDoc.toLowerCase().endsWith('.xls');
        
        let icon = 'bx-file-pdf';
        let color = '#FF5A5A'; // PDF red
        
        if (isVideo) { icon = 'bx-video'; color = '#3B82F6'; }
        else if (isWord) { icon = 'bx-file-blank'; color = '#2563EB'; } // Word blue
        else if (isExcel) { icon = 'bx-table'; color = '#10B981'; } // Excel green

        container.innerHTML += `
            <div style="margin-bottom: 12px; background: rgba(0, 180, 216, 0.1); padding: 10px; border-radius: var(--radius-md); border: 1px dashed var(--accent-primary);">
                <span style="font-size: 10px; color: var(--accent-primary); font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                    <i class='bx bxs-star'></i> Sugerido para esta tarea
                </span>
                <a href="${getDocUrl(matchedDoc)}" target="_blank" class="doc-link" style="background: transparent; padding: 0; display: flex; align-items: center; gap: 10px;">
                    <i class='bx ${icon}' style="font-size: 20px; color: ${color};"></i>
                    <span style="color: var(--text-primary); font-weight: 500; font-size: 13px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${matchedDoc.replace(/\.[^/.]+$/, "")}</span>
                </a>
            </div>
            <div style="height: 1px; background: var(--glass-border); margin: 10px 0;"></div>
        `;
    }

    // Listar todos los demás documentos
    archivos.forEach(file => {
        if (file === matchedDoc) return; // Omitir el destacado ya listado

        const isVideo = file.toLowerCase().endsWith('.mp4');
        const isWord = file.toLowerCase().endsWith('.docx') || file.toLowerCase().endsWith('.doc');
        const isExcel = file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls');
        
        let icon = 'bx-file-pdf';
        let color = '#FF5A5A'; // PDF red
        
        if (isVideo) { icon = 'bx-video'; color = '#3B82F6'; }
        else if (isWord) { icon = 'bx-file-blank'; color = '#2563EB'; } // Word blue
        else if (isExcel) { icon = 'bx-table'; color = '#10B981'; } // Excel green

        container.innerHTML += `
            <a href="${getDocUrl(file)}" target="_blank" class="doc-link" style="margin-bottom: 8px;">
                <i class='bx ${icon}' style="font-size: 18px; color: ${color};"></i>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">${file.replace(/\.[^/.]+$/, "")}</span>
            </a>
        `;
    });
}

// Global scope logic for onclick elements
window.selectTask = function(taskId) {
    currentActiveTaskId = taskId;
    // Remove active
    document.querySelectorAll('.task-item').forEach(el => el.classList.remove('active'));
    // Add active
    const eventTarget = window.event && window.event.currentTarget;
    if(eventTarget) eventTarget.classList.add('active');
    
    const task = allTasks.find(t => t.id === taskId);
    if(task) {
        const titleElement = document.getElementById('currentTaskTitle');
        if (titleElement) titleElement.textContent = task['Tarea'];
        currentSelectedTask = task;
        
        // Renderizar accesos rápidos destacando el documento de esta tarea
        renderQuickDocs(task['Tarea']);
        
        // Populate instructions text area if we want to
        const textArea = document.getElementById('taskObservation');
        
        if (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Supervisor')) {
            if (textArea) {
                // Show task detail and instructions for admin/supervisor review
                let detailText = `Detalle: ${task['Detalle de Tarea'] || 'Sin detalle'}\n\n`;
                detailText += `Horario: ${task['Horario'] || 'No especificado'}\n`;
                detailText += `Día: ${task['Día'] || 'No especificado'}\n\n`;
                detailText += `Instrucciones:\n${task['Instrucciones'] || 'Sin instrucciones'}`;
                textArea.value = detailText;
            }
        } else {
            if(textArea) {
               textArea.value = task['Detalle de Tarea'] || "";
            }

            // Restore from cache if exists
            document.querySelectorAll('.btn-status').forEach(el => el.classList.remove('active'));
            if(taskStateCache[taskId]) {
                if(textArea) textArea.value = taskStateCache[taskId].observation;
                
                const cachedStatus = taskStateCache[taskId].status;
                let found = false;
                document.querySelectorAll('.btn-status').forEach(el => {
                    if(el.textContent.trim() === cachedStatus) {
                        el.classList.add('active');
                        found = true;
                    }
                });
                if(!found) document.querySelector('.btn-status.pending').classList.add('active');
            } else {
                if(textArea) textArea.value = ""; // Limpiar nota de otras tareas
                document.querySelector('.btn-status.pending').classList.add('active');
            }
        }
    }
}

// Task Status Buttons Interaction
async function initApp() {
    // Carga de Excel Inicial
    try {
        await loadSchedule();
    } catch(e) {
        console.error("Error al cargar el horario en la inicialización:", e);
    }
    
    try {
        await loadExcelTasks();
    } catch(e) {
        console.error("Error al cargar las tareas en la inicialización:", e);
    }
    
    loadTeletrabajo();
    loadPermisos();
    renderQuickDocs(null);

    // Theme logic
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

    // Populate user UI
    if (currentUser) {
        const userNameEl = document.querySelector('.user-name');
        const roleEl = document.querySelector('.user-role');
        const shiftBadgeEl = document.querySelector('.shift-badge');
        
        if (userNameEl) userNameEl.textContent = currentUser.name;
        if (roleEl) roleEl.textContent = currentUser.role;
        if (shiftBadgeEl) shiftBadgeEl.textContent = 'Turno ' + currentUser.shift;
        
        const avatarEl = document.querySelector('.avatar');
        if (avatarEl && currentUser.name) {
            const availableAvatars = [
                "Alexander Villada.png",
                "Camilo Espinosa.png",
                "Daniel Benavides.png",
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
            
            const fullName = currentUser.name.trim();
            // Buscar una imagen que coincida con el nombre registrado
            let matchedAvatar = availableAvatars.find(img => namesMatch(fullName, img.replace('.png', '')));
            console.log("DEBUG_AVATAR: fullName =", fullName, "matchedAvatar =", matchedAvatar);
            
            if (matchedAvatar) {
                avatarEl.src = `assets/src/img/${matchedAvatar}`;
                // Fallback por si la imagen se borra o falla
                avatarEl.onerror = function() {
                    this.onerror = null;
                    this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
                };
            } else {
                avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
            }
        }

        if (currentUser.role === 'Gestor') {
            syncActiveSessionToFirebase();
            setInterval(syncActiveSessionToFirebase, 30000);
        }

        // Setup programmatical sidebar ordering for roles
        setupSidebar();

        // Show Aprobaciones tab for Supervisor/Admin
        if (currentUser.role === 'Admin' || currentUser.role === 'Supervisor') {
            const navAprobaciones = document.getElementById('navAprobaciones');
            const navTurnos = document.getElementById('navTurnos');
            const navMonitoreo = document.getElementById('navMonitoreo');
            const navIndicadores = document.getElementById('navIndicadores');
            const navWorkspace = document.getElementById('navWorkspace');
            const viewWorkspace = document.getElementById('view-workspace');
            const viewAprobaciones = document.getElementById('view-aprobaciones');
            const viewTurnos = document.getElementById('view-turnos');
            const permissionForm = document.getElementById('permissionForm');
            const navLogins = document.getElementById('navLogins');
            const endShiftBtn = document.getElementById('endShiftBtn');

            if(navAprobaciones) navAprobaciones.style.display = 'flex';
            if(navTurnos) navTurnos.style.display = 'flex';
            if(navMonitoreo) navMonitoreo.style.display = 'flex';
            if(navIndicadores) navIndicadores.style.display = 'flex';
            if(navLogins) navLogins.style.display = 'flex';
            if(navWorkspace) navWorkspace.style.display = 'flex'; // Keep Mis Tareas visible
            
            // Ocultar el panel de Progreso del Turno / Documentos de Acceso Rápido en Mis Tareas para Admin o Supervisor
            const rightPanel = document.querySelector('.right-panel');
            if (rightPanel) rightPanel.style.display = 'none';
            const workspaceGrid = document.querySelector('.workspace-grid');
            if (workspaceGrid) workspaceGrid.classList.add('no-right-panel');

            // Restringir el panel de tareas para Admin/Supervisor (solo lectura)
            const taskControls = document.querySelector('.task-controls');
            if (taskControls) taskControls.style.display = 'none';
            const actionBar = document.querySelector('.action-bar');
            if (actionBar) actionBar.style.display = 'none';
            const taskObservation = document.getElementById('taskObservation');
            if (taskObservation) {
                taskObservation.readOnly = true;
                taskObservation.placeholder = "Detalles de la tarea...";
            }

            // Forzar vista de Monitoreo Realtime como inicial
            const viewMonitoreo = document.getElementById('view-monitoreo');
            if (viewMonitoreo && navMonitoreo) {
                document.querySelectorAll('.view-panel').forEach(v => v.style.display = 'none');
                viewMonitoreo.style.display = 'block';
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                navMonitoreo.classList.add('active');
            }

            // Iniciar sincronización en tiempo real para Monitoreo
            startActiveSessionsListener();
            populateGestoresDropdown();

            // Listeners for Monitoreo filters
            const searchInput = document.getElementById('monitoreoSearchInput');
            const shiftSelect = document.getElementById('filterShiftSelect');
            const statusSelect = document.getElementById('filterStatusSelect');
            const clearMonitoreoFiltersBtn = document.getElementById('clearMonitoreoFiltersBtn');

            if (searchInput) searchInput.addEventListener('change', renderActiveSessionsDashboard);
            if (shiftSelect) shiftSelect.addEventListener('change', renderActiveSessionsDashboard);
            if (statusSelect) statusSelect.addEventListener('change', renderActiveSessionsDashboard);

            if (clearMonitoreoFiltersBtn) {
                clearMonitoreoFiltersBtn.addEventListener('click', () => {
                    if (searchInput) searchInput.value = '';
                    if (shiftSelect) shiftSelect.value = '';
                    if (statusSelect) statusSelect.value = '';
                    renderActiveSessionsDashboard();
                });
            }

            // Close Monitoreo modal listeners
            const closeBtn = document.getElementById('closeMonitoreoModalBtn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    const modal = document.getElementById('monitoreoModal');
                    if (modal) modal.classList.remove('active');
                });
            }
            const modalOverlay = document.getElementById('monitoreoModal');
            if (modalOverlay) {
                modalOverlay.addEventListener('click', (e) => {
                    if (e.target === modalOverlay) {
                        modalOverlay.classList.remove('active');
                    }
                });
            }
            
            // Ocultar formulario de pedir permiso
            const crearPermisoPanel = document.getElementById('crearPermisoPanel');
            const permisosLayout = document.getElementById('permisosLayout');
            if(crearPermisoPanel) crearPermisoPanel.style.display = 'none';
            if(permisosLayout) permisosLayout.style.gridTemplateColumns = '1fr';
            if(permissionForm) permissionForm.style.display = 'none';
            
            // Cambiar Finalizar Turno por Cerrar Sesión
            if(endShiftBtn) {
                endShiftBtn.innerHTML = "<i class='bx bx-log-out'></i> Cerrar Sesión";
                endShiftBtn.onclick = function(e) {
                    e.preventDefault();
                    if(confirm("¿Seguro que deseas cerrar sesión?")) {
                        localStorage.removeItem('riskOps_currentUser');
                        firebase.auth().signOut().catch(err => console.error(err));
                        window.location.href = 'login.html';
                    }
                };
            }
            
            // Ocultar el badge del turno para Admin/Supervisor
            const headerShiftBadgeAdmin = document.querySelector('.shift-badge');
            if (headerShiftBadgeAdmin) headerShiftBadgeAdmin.style.display = 'none';

            renderPendingUsers();
            
            const notifList = document.getElementById('notificationList');
            const notifCount = document.getElementById('notificationCount');

            database.ref('permissions').on('value', (snapshot) => {
                let unreadCount = 0;
                let notifsHtml = '';
                
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const perms = Object.keys(data).map(k => ({...data[k], fb_id: k}));
                    const pending = perms.filter(p => p.status === 'Pendiente');
                    pending.sort((a,b) => b.id - a.id);
                    
                    pending.forEach(p => {
                        if (p.notified_admin === false) unreadCount++;
                        let bg = p.notified_admin === false ? 'rgba(59,130,246,0.1)' : 'transparent';
                        
                        notifsHtml += `
                            <div style="background: ${bg}; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); display: flex; gap: 10px; align-items: start; cursor: pointer; transition: background 0.2s;" onclick="document.getElementById('navAprobaciones').click(); document.getElementById('notificationDropdown').style.display = 'none';">
                                <i class='bx bx-time' style="color: var(--warning); font-size: 18px; margin-top: 2px;"></i>
                                <div style="flex-grow: 1;">
                                    <div style="font-size: 12px; font-weight: 500; color: var(--text-primary);">Nuevo Permiso Solicitado</div>
                                    <div style="font-size: 11px; color: var(--text-secondary);">${p.gestor} - ${p.tipo}</div>
                                </div>
                            </div>
                        `;
                    });
                }
                
                if (notifsHtml === '') {
                    notifList.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px;">No tienes notificaciones nuevas.</p>';
                } else {
                    notifList.innerHTML = notifsHtml;
                }
                
                if (unreadCount > 0) {
                    notifCount.textContent = unreadCount;
                    notifCount.style.display = 'block';
                } else {
                    notifCount.style.display = 'none';
                }
            });
            
        } else {
            // Escuchar notificaciones en tiempo real para el Gestor
            const notifList = document.getElementById('notificationList');
            const notifCount = document.getElementById('notificationCount');

            database.ref('permissions').orderByChild('gestor').equalTo(currentUser.name).on('value', (snapshot) => {
                let unreadCount = 0;
                let notifsHtml = '';
                
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const perms = Object.keys(data).map(k => ({...data[k], fb_id: k}));
                    // Solo finalizados
                    const finished = perms.filter(p => p.status !== 'Pendiente');
                    finished.sort((a,b) => b.id - a.id);
                    
                    finished.forEach(p => {
                        if (p.notified === false) unreadCount++;
                        let bg = p.notified === false ? 'rgba(59,130,246,0.1)' : 'transparent';
                        let iconColor = p.status === 'Aprobado' ? 'var(--success)' : 'var(--danger)';
                        let icon = p.status === 'Aprobado' ? 'bx-check-double' : 'bx-x';
                        let reasonHtml = p.rejectionReason ? `<div style="font-size:11px; color:var(--danger); margin-top:2px;">Razón: ${p.rejectionReason}</div>` : '';
                        
                        notifsHtml += `
                            <div style="background: ${bg}; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); display: flex; gap: 10px; align-items: start; cursor: pointer; transition: background 0.2s;" onclick="document.getElementById('navPermisos').click(); document.getElementById('notificationDropdown').style.display = 'none';">
                                <i class='bx ${icon}' style="color: ${iconColor}; font-size: 18px; margin-top: 2px;"></i>
                                <div style="flex-grow: 1;">
                                    <div style="font-size: 12px; font-weight: 500; color: var(--text-primary);">Permiso ${p.status}</div>
                                    <div style="font-size: 11px; color: var(--text-secondary);">${p.fecha} (${p.horaInicio} a ${p.horaFin})</div>
                                    ${reasonHtml}
                                </div>
                            </div>
                        `;
                    });
                }
                
                if (notifsHtml === '') {
                    notifList.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px;">No tienes notificaciones nuevas.</p>';
                } else {
                    notifList.innerHTML = notifsHtml;
                }
                
                if (unreadCount > 0) {
                    notifCount.textContent = unreadCount;
                    notifCount.style.display = 'block';
                } else {
                    notifCount.style.display = 'none';
                }
            });
        }
    }

    const statusBtns = document.querySelectorAll('.btn-status');
    statusBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Only toggle if it's not the 'No Realizada', as it opens a modal
            if(!this.classList.contains('not-done')) {
                statusBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    // Help Button (Instructivo)
    const helpBtn = document.getElementById('helpBtn');
    if(helpBtn) {
        helpBtn.addEventListener('click', () => {
            if(!currentSelectedTask) {
                alert("Selecciona una tarea primero.");
                return;
            }
            
            const taskName = (currentSelectedTask['Tarea'] || currentSelectedTask.name || '').toLowerCase();
            const archivos = [
                "Instructivo de revisión de apuestas casino.pdf",
                "Instructivo de validación de GGR Casino.pdf",
                "Política Procedimiento De Aprobación De Retiros.pdf",
                "Procedimiento Identificación de jineteo.pdf",
                "Proceso de Eliminación de Cuentas - Implementaciones.pdf",
                "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf",
                "Revisión de Eventos Deportivos.mp4",
                "Revisión de Eventos.mp4",
                "Validación SEON.mp4"
            ];
            
            let matchedDoc = null;
            if (taskName.includes('ggr')) matchedDoc = "Instructivo de validación de GGR Casino.pdf";
            else if (taskName.includes('apuesta')) matchedDoc = "Instructivo de revisión de apuestas casino.pdf";
            else if (taskName.includes('retiro')) matchedDoc = "Política Procedimiento De Aprobación De Retiros.pdf";
            else if (taskName.includes('jineteo')) matchedDoc = "Procedimiento Identificación de jineteo.pdf";
            else if (taskName.includes('eliminaci')) matchedDoc = "Proceso de Eliminación de Cuentas - Implementaciones.pdf";
            else if (taskName.includes('bonos')) matchedDoc = "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf";
            else if (taskName.includes('deportiv')) matchedDoc = "Revisión de Eventos Deportivos.mp4";
            else if (taskName.includes('evento')) matchedDoc = "Revisión de Eventos.mp4";
            else if (taskName.includes('seon')) matchedDoc = "Validación SEON.mp4";
            
            if (matchedDoc) {
                window.open(getDocUrl(matchedDoc), "_blank");
            } else {
                alert("No se encontró un documento específico para esta tarea. Por favor, búscalo en la pestaña Documentación.");
            }
        });
    }

    // Listeners para filtros de historial de turnos
    const filterGestorInput = document.getElementById('filterGestorInput');
    const filterFechaInput = document.getElementById('filterFechaInput');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (filterGestorInput) filterGestorInput.addEventListener('input', applyShiftReportsFilters);
    if (filterFechaInput) filterFechaInput.addEventListener('change', applyShiftReportsFilters);
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (filterGestorInput) filterGestorInput.value = '';
            if (filterFechaInput) filterFechaInput.value = '';
            applyShiftReportsFilters();
        });
    }

    // Navegación de Vistas (Tabs)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Evitar redirigir erróneamente en el botón soporte real
            if(item.id === 'navSoporte' || item.textContent.includes('Soporte')) {
                alert("Redirigiendo al IT HelpDesk...");
                return;
            }

            // UI
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Ocultar todas las vistas
            document.querySelectorAll('.view-panel').forEach(v => v.style.display = 'none');
            
            // Mostrar por defecto el top-header para todas las vistas (se oculta en casos específicos)
            const topHeader = document.querySelector('.top-header');
            if (topHeader) topHeader.style.display = 'flex';

            // Mostrar la correcta
            if (item.id === 'navWorkspace') {
                document.getElementById('view-workspace').style.display = 'block';
            } else if (item.id === 'navHorario') {
                document.getElementById('view-horario').style.display = 'block';
            } else if (item.id === 'navTeletrabajo') {
                document.getElementById('view-teletrabajo').style.display = 'block';
            } else if (item.id === 'navDocs') {
                document.getElementById('view-docs').style.display = 'block';
            } else if (item.id === 'navPermisos') {
                document.getElementById('view-permisos').style.display = 'block';
            } else if (item.id === 'navTurnos') {
                document.getElementById('view-turnos').style.display = 'block';
                renderShiftReports();
            } else if (item.id === 'navAprobaciones') {
                document.getElementById('view-aprobaciones').style.display = 'block';
                renderPendingUsers();
                renderPendingPermissions();
            } else if (item.id === 'navMonitoreo') {
                const viewMonitoreo = document.getElementById('view-monitoreo');
                if (viewMonitoreo) viewMonitoreo.style.display = 'block';
                renderActiveSessionsDashboard();
                updateGlobalStats();
            } else if (item.id === 'navIndicadores') {
                const viewIndicadores = document.getElementById('view-indicadores');
                if (viewIndicadores) viewIndicadores.style.display = 'block';
                if (topHeader) topHeader.style.display = 'none'; // Ocultar header según solicitud
                loadGestoresForKPIs();
            } else if (item.id === 'navComunicados') {
                const viewComunicados = document.getElementById('view-comunicados');
                if (viewComunicados) viewComunicados.style.display = 'block';
                renderGestorComunicados();
            } else if (item.id === 'navAdminComunicados') {
                const viewAdminComunicados = document.getElementById('view-gestion-comunicados');
                if (viewAdminComunicados) viewAdminComunicados.style.display = 'block';
                renderAdminComunicados();
            } else if (item.id === 'navLogins') {
                const viewLogins = document.getElementById('view-logins');
                if (viewLogins) viewLogins.style.display = 'block';
                loadLoginHistory();
            }
        });
    });

    // Inyectar documentos reales de la carpeta "Procesos" en el Módulo de Docs
    const docsGrid = document.querySelector('.docs-grid');
    if(docsGrid) {
        const archivos = [
            "Instructivo de revisión de apuestas casino.pdf",
            "Instructivo de validación de GGR Casino.pdf",
            "Política Procedimiento De Aprobación De Retiros.pdf",
            "Procedimiento Identificación de jineteo.pdf",
            "Proceso de Eliminación de Cuentas - Implementaciones.pdf",
            "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf",
            "Revisión de Eventos Deportivos.mp4",
            "Revisión de Eventos.mp4",
            "Validación SEON.mp4"
        ];

        archivos.forEach(file => {
            const isVideo = file.toLowerCase().endsWith('.mp4');
            const isWord = file.toLowerCase().endsWith('.docx') || file.toLowerCase().endsWith('.doc');
            const isExcel = file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls');
            
            let icon = 'bx-file-pdf';
            let color = '#FF5A5A'; // PDF red
            
            if(isVideo) { icon = 'bx-video'; color = '#3B82F6'; }
            else if(isWord) { icon = 'bx-file-blank'; color = '#2563EB'; } // Word blue
            else if(isExcel) { icon = 'bx-table'; color = '#10B981'; } // Excel green

            docsGrid.innerHTML += `
                <a href="${getDocUrl(file)}" target="_blank" class="glass-panel" style="padding: 20px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; transition: transform 0.2s;">
                    <i class='bx ${icon}' style="font-size: 40px; color: ${color};"></i>
                    <span style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${file.replace(/\.[^/.]+$/, "")}</span>
                </a>
            `;
        });
    }

    // Poblar nombre en form de permisos y manejar envío por AJAX
    if(currentUser) {
        const pName = document.getElementById('permisoGestorName');
        if(pName) pName.value = currentUser.name;
    }
    
    // Botón de guardar progreso en tarea
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    if(saveTaskBtn) {
        saveTaskBtn.addEventListener('click', () => {
            const selectedStatusBtn = document.querySelector('.btn-status.active');
            
            // Validación obligatoria para todas las tareas
            const obsField = document.getElementById('taskObservation');
            if(!obsField || !obsField.value.trim()) {
                alert("OBLIGATORIO: Debes detallar la gestión realizada en las Notas Técnicas antes de guardar.");
                return;
            }

            const btn = saveTaskBtn;
            const prevText = btn.innerHTML;
            btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = "<i class='bx bx-check'></i> Guardado Exitosamente";
                btn.classList.add('btn-success');
                
                // Actualizar estado visual de la tarea activa en el árbol
                const activeTask = document.querySelector('.task-item.active .task-status');
                const selectedStatusBtn = document.querySelector('.btn-status.active');
                
                if(activeTask && selectedStatusBtn) {
                    // Limpiar clases anteriores
                    activeTask.classList.remove('status-pending', 'status-completed', 'status-not-done', 'status-in-progress');
                    
                    if(selectedStatusBtn.classList.contains('completed')) {
                        activeTask.classList.add('status-completed');
                    } else if(selectedStatusBtn.classList.contains('in-progress')) {
                        activeTask.classList.add('status-in-progress');
                    } else if(selectedStatusBtn.classList.contains('not-done')) {
                        activeTask.classList.add('status-not-done');
                    } else {
                        activeTask.classList.add('status-pending');
                    }
                    
                    // Save to cache
                    const obsValue = document.getElementById('taskObservation') ? document.getElementById('taskObservation').value : '';
                    if(currentActiveTaskId !== null) {
                        taskStateCache[currentActiveTaskId] = {
                            name: currentSelectedTask ? currentSelectedTask['Tarea'] : 'Tarea ' + currentActiveTaskId,
                            status: selectedStatusBtn.textContent.trim(),
                            observation: obsValue
                        };
                        localStorage.setItem('riskOps_cache', JSON.stringify(taskStateCache));
                    }
                    
                    updateKPI();
                }

                setTimeout(() => {
                    btn.innerHTML = prevText;
                    btn.disabled = false;
                    btn.classList.remove('btn-success');
                }, 2000);
            }, 800);
        });
    }

    const pForm = document.getElementById('permisosForm');
    
    // Toggle para la opción "Otro"
    const pSelect = document.getElementById('tipoPermisoSelect');
    const pOtroCont = document.getElementById('otroPermisoContainer');
    const pOtroInp = document.getElementById('otroPermisoInput');
    if(pSelect && pOtroCont && pOtroInp) {
        pSelect.addEventListener('change', (e) => {
            if(e.target.value === 'Otro') {
                pOtroCont.style.display = 'block';
                pOtroInp.required = true;
            } else {
                pOtroCont.style.display = 'none';
                pOtroInp.required = false;
                pOtroInp.value = '';
            }
        });
    }

    if(pForm) {
        pForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Evitar recarga
            
            const formData = new FormData(pForm);
            formData.append("_cc", "sara.santamaria@virtualsoft.tech");
            
            const tipo = formData.get("Tipo_Permiso");
            const especifico = formData.get("Especificacion_Otro");
            const finalTipo = tipo === 'Otro' ? `Otro (${especifico})` : tipo;

            const newPermiso = {
                id: Date.now(),
                gestor: formData.get("Gestor"),
                tipo: finalTipo,
                fecha: formData.get("Fecha"),
                horaInicio: formData.get("Hora_Inicio"),
                horaFin: formData.get("Hora_Fin"),
                motivo: formData.get("Justificacion"),
                status: 'Pendiente',
                notified: false,
                notified_admin: false
            };
            
            const btn = pForm.querySelector('button[type="submit"]');
            const prevText = btn.innerHTML;
            btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Enviando solicitud...";
            btn.disabled = true;

            try {
                await database.ref('permissions').push(newPermiso);
            } catch(e) {
                console.error("Error Firebase local", e);
            }

            fetch(pForm.action, {
                method: pForm.method,
                body: formData,
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if(response.ok) {
                    alert('¡Permiso solicitado exitosamente! Está pendiente de aprobación.');
                    pForm.reset();
                    if(currentUser) pForm.querySelector('#permisoGestorName').value = currentUser.name;
                    loadPermisos(); // Refresh local permissions UI if they are an admin looking at it
                } else {
                    alert('Hubo un error contactando el servidor de correos.');
                }
            }).catch(err => {
                alert('No hay Internet. Se simula envío exitoso.');
            }).finally(() => {
                btn.innerHTML = prevText;
                btn.disabled = false;
            });
        });
    }
}

// Lógica de Desayuno
function toggleBreakfastBreak() {
    if (!currentUser) return;
    const btn = document.getElementById('toggleBreakfastBtn');
    
    if (!isBreakfastBreak) {
        if (isLunchBreak) { alert("Debes volver del almuerzo primero."); return; }
        isBreakfastBreak = true;
        breakfastStartTime = Date.now();
        pushTimelineEvent('Desayuno', 'start');
        saveBreakState();
        if(btn) {
            btn.innerHTML = "<i class='bx bx-check-circle'></i> Volver del Desayuno";
            btn.classList.remove('btn-outline');
            btn.classList.add('btn-warning');
            btn.style.color = "white";
            btn.style.borderColor = "transparent";
        }
        syncActiveSessionToFirebase();
    } else {
        isBreakfastBreak = false;
        if(breakfastStartTime) {
            totalBreakfastTimeMs += (Date.now() - breakfastStartTime);
        }
        breakfastStartTime = null;
        pushTimelineEvent('Desayuno', 'end');
        saveBreakState();
        if(btn) {
            btn.innerHTML = "<i class='bx bx-coffee'></i> Tomar Desayuno";
            btn.classList.add('btn-outline');
            btn.classList.remove('btn-warning');
            btn.style.color = "var(--text-primary)";
            btn.style.borderColor = "rgba(255,255,255,0.2)";
        }
        updateActivity();
        syncActiveSessionToFirebase();
    }
}

// Lógica de Almuerzo
function toggleLunchBreak() {
    if (!currentUser) return;
    const btn = document.getElementById('toggleLunchBtn');
    
    if (!isLunchBreak) {
        if (isBreakfastBreak) { alert("Debes volver del desayuno primero."); return; }
        isLunchBreak = true;
        lunchStartTime = Date.now();
        pushTimelineEvent('Almuerzo', 'start');
        saveBreakState();
        if(btn) {
            btn.innerHTML = "<i class='bx bx-check-circle'></i> Volver del Almuerzo";
            btn.classList.remove('btn-outline');
            btn.classList.add('btn-success');
            btn.style.color = "white";
            btn.style.borderColor = "transparent";
        }
        syncActiveSessionToFirebase();
    } else {
        isLunchBreak = false;
        if(lunchStartTime) {
            totalLunchTimeMs += (Date.now() - lunchStartTime);
        }
        lunchStartTime = null;
        pushTimelineEvent('Almuerzo', 'end');
        saveBreakState();
        if(btn) {
            btn.innerHTML = "<i class='bx bx-restaurant'></i> Tomar Almuerzo";
            btn.classList.add('btn-outline');
            btn.classList.remove('btn-success');
            btn.style.color = "var(--text-primary)";
            btn.style.borderColor = "rgba(255,255,255,0.2)";
        }
        updateActivity();
        syncActiveSessionToFirebase();
    }
}

function handleEndShift() {
    if(confirm("¿Estás seguro que deseas finalizar tu turno actual? Se enviará un resumen al supervisor.")) {
        // Cerrar almuerzo o desayuno si quedó abierto
        if (isLunchBreak) toggleLunchBreak();
        if (isBreakfastBreak) toggleBreakfastBreak();

        
        let localUser = null;
        try { localUser = JSON.parse(localStorage.getItem('riskOps_currentUser')); } catch(e) {}
        
        if (localUser) {
            // Build task report
            const setSelect = document.getElementById('activeSetSelect');
            if(setSelect && setSelect.value === 'Todos') {
                alert("OBLIGATORIO: Debes seleccionar el SET específico en el que trabajaste antes de finalizar el turno (Arriba a la derecha).");
                return;
            }

            const formData = new FormData();
            
            // Format login time
            const loginDate = new Date(localUser.loginTime);
            const endDate = new Date();
            
            // Calculo de tiempos tomados
            const lunchMinutes = parseFloat((totalLunchTimeMs / (1000 * 60)).toFixed(1));
            const breakfastMinutes = parseFloat((totalBreakfastTimeMs / (1000 * 60)).toFixed(1));
            
            // Calculo de penalidades (excesos)
            const allowedLunch = 60;
            const allowedBreakfast = 15;
            
            let extraLunch = Math.max(0, lunchMinutes - allowedLunch);
            let extraBreakfast = Math.max(0, breakfastMinutes - allowedBreakfast);
            
            let inactividadMins = 0;
            if (shiftTimeline && shiftTimeline.length > 0) {
                shiftTimeline.forEach(ev => {
                    if (ev.type === 'Inactividad') {
                        let eTime = ev.end ? ev.end : Date.now();
                        inactividadMins += (eTime - ev.start) / (1000 * 60);
                    }
                });
            }
            
            let penalidadConectividadMins = parseFloat((extraLunch + extraBreakfast + inactividadMins).toFixed(1));

            // Calculo de tiempo efectivo
            const totalShiftMs = endDate.getTime() - loginDate.getTime();
            // Restamos TODAS las pausas, pero además la penalidad adicional sobre las horas efectivas
            const effectiveShiftMs = totalShiftMs - totalLunchTimeMs - totalBreakfastTimeMs - (penalidadConectividadMins * 60 * 1000);
            const effectiveHours = Math.max(0, (effectiveShiftMs / (1000 * 60 * 60))).toFixed(2);
            
            formData.append("Usuario", localUser.name);
            formData.append("Rol", localUser.role);
            formData.append("Reporte", "CIERRE DE TURNO Y RESUMEN DE TAREAS");
            formData.append("Hora_Inicio_Turno", loginDate.toLocaleString());
            formData.append("Hora_Fin_Turno", endDate.toLocaleString());
            formData.append("Tiempo_Almuerzo_Descontado", lunchMinutes + " minutos");
            formData.append("Tiempo_Desayuno_Descontado", breakfastMinutes + " minutos");
            formData.append("Exceso_Pausas_Penalidad", penalidadConectividadMins + " minutos");
            formData.append("Horas_Efectivas_Trabajadas", effectiveHours + " hrs");
            
            // Construir reporte de bitácora
            let bitacoraTexto = "";
            if (shiftTimeline.length > 0) {
                shiftTimeline.forEach(ev => {
                    const s = new Date(ev.start).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});
                    const eTime = ev.end ? new Date(ev.end).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'}) : "No regresó";
                    bitacoraTexto += `- ${ev.type}: inicio ${s} fin ${eTime}\n`;
                });
            } else {
                bitacoraTexto = "No se registraron pausas o inactividades.";
            }
            formData.append("Bitacora_de_Tiempos", bitacoraTexto);
            
            if(setSelect) {
                formData.append("SET_Principal_Trabajado", setSelect.value);
            }
            
            formData.append("_subject", `Reporte de Turno: ${localUser.name}`);
            formData.append("_captcha", "false");
            formData.append("_cc", "sara.santamaria@virtualsoft.tech");
            
            // Build task report
            let report = "";
            let keys = Object.keys(taskStateCache);
            if(keys.length === 0) {
                report = "El gestor no marcó ninguna tarea explícitamente durante este turno.";
            } else {
                keys.forEach(id => {
                    let t = taskStateCache[id];
                    report += `\n[ ${t.status.toUpperCase()} ] - ${t.name}\nObservación: ${t.observation || 'N/A'}\n`;
                });
            }
            report += "\n\n=== BITÁCORA DE TIEMPOS ===\n" + bitacoraTexto;
            formData.append("Resumen_de_Tareas", report);
            
            // Reemplazar texto del botón para feedback visual
            const btn = document.getElementById('endShiftBtn');
            const prevHtml = btn ? btn.innerHTML : '';
            if(btn) {
                btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Notificando...";
                btn.disabled = true;
            }

            // --- RESPALDO SEGURO EN FIREBASE ---
            const shiftReportObject = {
                gestor: localUser.name,
                rol: localUser.role,
                horaInicio: loginDate.toLocaleString(),
                horaFin: new Date().toLocaleString(),
                setTrabajado: setSelect ? setSelect.value : 'N/A',
                reporte: report,
                tasks: taskStateCache,
                timeline: shiftTimeline,
                penalidadConectividadMins: penalidadConectividadMins,
                inactividadTotalMins: inactividadMins,
                tiempoAlmuerzoMins: lunchMinutes,
                tiempoDesayunoMins: breakfastMinutes,
                timestamp: Date.now()
            };

            // Intentamos guardar en firebase pero no bloqueamos el flujo si hay error
            database.ref('shift_reports').push(shiftReportObject).catch(e => console.error("Firebase backup failed", e));

            // Eliminar sesión activa de Firebase
            if (localUser.uid) {
                database.ref('active_sessions/' + localUser.uid).remove().catch(e => console.error("Error removing active session on shift end:", e));
            }
            if (localUser.loginLogId) {
                database.ref('login_logs/' + localUser.loginLogId).update({
                    logoutTime: firebase.database.ServerValue.TIMESTAMP
                });
            }

            // Antes de enviar, limpiamos la sesión y el caché
            localStorage.removeItem('riskOps_currentUser');
            localStorage.removeItem('riskOps_cache');
            localStorage.removeItem('riskOps_breakState');
            localStorage.removeItem('riskOps_timeline');
            
            // Set the global currentUser to null so syncActiveSessionToFirebase stops firing
            currentUser = null;
            
            firebase.auth().signOut().catch(err => console.error(err));
            
            // Enviar de forma silenciosa para que un error 522 de Cloudflare no bloquee la pantalla
            fetch('https://formsubmit.co/ajax/maria.sanchez@virtualsoft.tech', {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if(response.ok) {
                    alert('Turno finalizado y reporte enviado al supervisor.');
                } else {
                    alert('Turno finalizado localmente. Nota: El servidor de correos está inactivo temporalmente.');
                }
            }).catch(err => {
                alert('Turno finalizado. (Error de red al intentar enviar el correo).');
            }).finally(() => {
                window.location.href = 'login.html';
            });
        } else {
            alert("Turno finalizado.");
            if (localUser && localUser.loginLogId) {
                database.ref('login_logs/' + localUser.loginLogId).update({
                    logoutTime: firebase.database.ServerValue.TIMESTAMP
                });
            }
            localStorage.removeItem('riskOps_currentUser');
            localStorage.removeItem('riskOps_cache');
            firebase.auth().signOut().catch(err => console.error(err));
            window.location.href = 'login.html';
        }
    }
}

// Inicializar inmediatamente ya que el script está al final del DOM
initApp();

// Modal Logic
function openExceptionModal() {
    // Set 'not-done' active visually
    document.querySelectorAll('.btn-status').forEach(b => b.classList.remove('active'));
    document.querySelector('.btn-status.not-done').classList.add('active');
    
    // Clear previous exception inputs!
    const exReason = document.getElementById('exceptionReason');
    if(exReason) exReason.value = "";
    const exDetails = document.getElementById('exceptionDetails');
    if(exDetails) exDetails.value = "";
    
    // Open Modal
    const modal = document.getElementById('exceptionModal');
    if(modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.remove('active');
    }
}

function confirmException() {
    const select = document.getElementById('exceptionReason');
    const reasonText = select.options[select.selectedIndex].text;
    const details = document.getElementById('exceptionDetails').value.trim();
    
    if(!select.value) {
        alert('Por favor seleccione una razón principal.');
        return;
    }
    
    if(!details) {
        alert('Por favor detalle el problema obligatoriamente.');
        return;
    }
    
    const obsText = `Excepción: ${reasonText}${details ? ' - ' + details : ''}`;
    document.getElementById('taskObservation').value = obsText;
    closeModal('exceptionModal');
}

function openExtraTaskModal() {
    const modal = document.getElementById('extraTaskModal');
    if (modal) {
        document.getElementById('extraTaskName').value = '';
        document.getElementById('extraTaskStatus').value = 'Finalizada';
        document.getElementById('extraTaskObs').value = '';
        modal.classList.add('active');
    }
}

function saveExtraTask() {
    const name = document.getElementById('extraTaskName').value.trim();
    const status = document.getElementById('extraTaskStatus').value;
    const obs = document.getElementById('extraTaskObs').value.trim();
    
    if (!name) {
        alert("OBLIGATORIO: Debes ingresar el nombre de la tarea extra.");
        return;
    }
    
    if (!obs) {
        alert("OBLIGATORIO: Debes detallar la gestión realizada en las Notas Técnicas.");
        return;
    }
    
    // Generar un ID único para esta tarea extra
    const extraId = 'extra_' + Date.now();
    
    // Guardar en la caché local
    taskStateCache[extraId] = {
        name: "[EXTRA] " + name,
        status: status,
        observation: obs
    };
    localStorage.setItem('riskOps_cache', JSON.stringify(taskStateCache));
    
    updateKPI(); // Actualizar el anillo de progreso
    closeModal('extraTaskModal');
    
    alert(`Tarea Adicional "${name}" agregada exitosamente y se incluirá en tu reporte de turno.`);
}

// Logic for Approving Users
async function renderPendingUsers() {
    const tbody = document.getElementById('pendingUsersTableBody');
    if (!tbody) return;
    
    let users = [];
    try { 
        const snapshot = await database.ref('users').once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            users = Object.keys(data).map(k => ({...data[k], id: k}));
        }
    } catch(e) {
        console.error(e);
    }
    
    const pending = users.filter(u => u.approved === false);
    const approved = users.filter(u => u.approved === true && u.email !== 'maria.sanchez@virtualsoft.tech');
    
    tbody.innerHTML = '';
    
    const searchInput = document.getElementById('filterAprobacionesSearch');
    const statusSelect = document.getElementById('filterAprobacionesStatus');
    const searchVal = searchInput ? normalizeName(searchInput.value) : '';
    const statusVal = statusSelect ? statusSelect.value : 'Todos';

    // Mostramos primero los pendientes, luego los aprobados, ordenados por fecha de registro (más reciente a más antiguo)
    let allDisplayUsers = [...pending, ...approved].sort((a, b) => {
        const dateA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
        const dateB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
        return dateB - dateA;
    });
    
    // Apply filters
    const hasFilter = searchVal !== '' || statusVal !== 'Todos';
    allDisplayUsers = allDisplayUsers.filter(u => {
        const matchSearch = searchVal === '' || normalizeName(u.name || '').includes(searchVal) || normalizeName(u.email || '').includes(searchVal);
        let matchStatus = true;
        if (statusVal === 'Pendiente') matchStatus = (u.approved === false);
        if (statusVal === 'Aprobado') matchStatus = (u.approved === true);
        return matchSearch && matchStatus;
    });
    
    // Only show top 5 if no filters are active to keep UI clean
    if (!hasFilter && allDisplayUsers.length > 5) {
        allDisplayUsers = allDisplayUsers.slice(0, 5);
        // Add a fake row to indicate there are more
        const total = [...pending, ...approved].length;
        setTimeout(() => {
            if(document.getElementById('pendingUsersTableBody')) {
                document.getElementById('pendingMostrandoMsg') ? document.getElementById('pendingMostrandoMsg').remove() : null;
                const msg = document.createElement('div');
                msg.id = 'pendingMostrandoMsg';
                msg.style = 'text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 10px; margin-bottom: 15px; font-style: italic;';
                msg.innerText = `Mostrando los 5 registros más recientes de ${total} en total. Usa los filtros arriba para buscar más.`;
                document.getElementById('pendingUsersTableBody').parentElement.parentElement.appendChild(msg);
            }
        }, 100);
    } else {
        setTimeout(() => {
            if(document.getElementById('pendingMostrandoMsg')) document.getElementById('pendingMostrandoMsg').remove();
        }, 100);
    }
    
    if (allDisplayUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay usuarios que coincidan con los filtros.</td></tr>`;
        return;
    }
    
    allDisplayUsers.forEach(user => {
        let actionHtml = '';
        if (user.approved === true) {
            actionHtml = `<span style="color: var(--success); font-weight: bold;"><i class='bx bx-check'></i> Aprobado</span>`;
        } else if (user.approved === 'Rechazado') {
            actionHtml = `<span style="color: var(--danger); font-weight: bold;"><i class='bx bx-x'></i> Rechazado</span>`;
        } else {
            actionHtml = `
                <div id="user-action-btns-${user.id}" style="display:flex; justify-content:center; gap:5px;">
                    <button class="btn btn-success" style="padding: 5px 10px; font-size: 12px;" onclick="approveUser('${user.id}')">Aprobar</button>
                    <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="showUserRejectBox('${user.id}')">Rechazar</button>
                </div>
                <div id="user-reject-box-${user.id}" style="display:none; flex-direction:column; gap:5px; margin-top:5px;">
                    <input type="text" id="user-reason-${user.id}" placeholder="Motivo de rechazo" class="modern-input" style="padding:4px; font-size:11px; width:100%;">
                    <div style="display:flex; gap:5px; justify-content:center;">
                        <button class="btn btn-danger" style="padding: 2px 5px; font-size: 10px;" onclick="confirmRejectUser('${user.id}')">Confirmar</button>
                        <button class="btn btn-outline" style="padding: 2px 5px; font-size: 10px;" onclick="cancelRejectUser('${user.id}')">Cancelar</button>
                    </div>
                </div>
            `;
        }
        
        let statusBadge = user.approved ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">${user.role}</span>` : `<span class="badge pending">${user.role}</span>`;

        const regDateStr = user.registrationDate ? new Date(user.registrationDate).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Desconocida';
        const appDateStr = user.approvalDate ? new Date(user.approvalDate).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : (user.approved === true ? 'Desconocida' : '-');
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px;">${user.name}</td>
                <td style="padding: 12px; color: var(--text-secondary);">${user.email}</td>
                <td style="padding: 12px;">${statusBadge}</td>
                <td style="padding: 12px; font-size: 12px;">${regDateStr}</td>
                <td style="padding: 12px; font-size: 12px;">${appDateStr}</td>
                <td style="padding: 12px; text-align: center;">
                    ${actionHtml}
                </td>
            </tr>
        `;
    });
}

async function approveUser(userId) {
    if(!confirm(`¿Estás seguro de aprobar el acceso para este usuario?`)) return;
    
    try {
        await database.ref('users/' + userId).update({
            approved: true,
            approvalDate: new Date().toISOString()
        });
        alert('Usuario aprobado exitosamente. Ahora puede iniciar sesión.');
        renderPendingUsers(); // Reload table
    } catch(e) {
        alert('Error al contactar al servidor');
    }
}

function showUserRejectBox(id) {
    document.getElementById('user-action-btns-' + id).style.display = 'none';
    document.getElementById('user-reject-box-' + id).style.display = 'flex';
}

function cancelRejectUser(id) {
    document.getElementById('user-reject-box-' + id).style.display = 'none';
    document.getElementById('user-action-btns-' + id).style.display = 'flex';
    document.getElementById('user-reason-' + id).value = '';
}

async function confirmRejectUser(userId) {
    const reason = document.getElementById('user-reason-' + userId).value.trim();
    if (!reason) {
        alert("Debes escribir un motivo de rechazo.");
        return;
    }
    
    try {
        await database.ref('users/' + userId).update({
            approved: 'Rechazado',
            rejectionReason: reason
        });
        alert('Usuario rechazado exitosamente.');
        renderPendingUsers(); // Reload table
    } catch(e) {
        alert('Error al contactar al servidor');
    }
}

// Logic for Approving Permissions
async function renderPendingPermissions() {
    const tbody = document.getElementById('pendingPermissionsTableBody');
    if (!tbody) return;
    
    let permisos = [];
    try { 
        const snapshot = await database.ref('permissions').once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            permisos = Object.keys(data).map(k => ({...data[k], fb_id: k}));
        }
    } catch(e) {
        console.error(e);
    }
    
    const searchInput = document.getElementById('filterPermisosSearch');
    const searchVal = searchInput ? normalizeName(searchInput.value) : '';

    let pending = permisos.filter(p => p.status === 'Pendiente');
    
    // Sort so most recent is first
    pending.sort((a,b) => {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
    
    // Limit to 5
    if (pending.length > 5) {
        const total = pending.length;
        pending = pending.slice(0, 5);
        setTimeout(() => {
            if(document.getElementById('pendingPermsMostrandoMsg')) document.getElementById('pendingPermsMostrandoMsg').remove();
            const msg = document.createElement('div');
            msg.id = 'pendingPermsMostrandoMsg';
            msg.style = 'text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 10px; margin-bottom: 15px; font-style: italic;';
            msg.innerText = `Mostrando los 5 permisos más recientes de ${total} pendientes.`;
            document.getElementById('pendingPermissionsTableBody').parentElement.parentElement.appendChild(msg);
        }, 100);
    } else {
        setTimeout(() => {
            if(document.getElementById('pendingPermsMostrandoMsg')) document.getElementById('pendingPermsMostrandoMsg').remove();
        }, 100);
    }
    
    tbody.innerHTML = '';
    
    if (pending.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay permisos pendientes de aprobación.</td></tr>`;
        return;
    }
    
    pending.forEach(p => {
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-weight: 500;">${p.gestor}</td>
                <td style="padding: 12px;"><span class="badge pending">${p.tipo}</span></td>
                <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">${p.fecha}<br>${p.horaInicio} a ${p.horaFin}</td>
                <td style="padding: 12px; font-size: 13px;">
                    <div style="max-width: 250px; max-height: 60px; overflow-y: auto; white-space: normal; word-wrap: break-word; padding-right: 5px; font-style: italic; color: var(--text-secondary);">
                        ${p.motivo}
                    </div>
                </td>
                <td style="padding: 12px; text-align: center;">
                    <div id="perm-action-btns-${p.fb_id}">
                        <button class="btn btn-success" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;" onclick="showPermApproveBox('${p.fb_id}')"><i class='bx bx-check'></i></button>
                        <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="showPermRejectBox('${p.fb_id}')"><i class='bx bx-x'></i></button>
                    </div>
                    <div id="perm-approve-box-${p.fb_id}" style="display:none; flex-direction:column; gap:5px; margin-top:5px;">
                        <input type="text" id="perm-approve-reason-${p.fb_id}" placeholder="Motivo de aprobación" class="modern-input" style="padding:4px; font-size:11px; width:100%;">
                        <div style="display:flex; gap:5px;">
                            <button class="btn btn-success" style="padding: 2px 5px; font-size: 10px;" onclick="confirmApprovePerm('${p.fb_id}')">Confirmar</button>
                            <button class="btn btn-outline" style="padding: 2px 5px; font-size: 10px;" onclick="cancelApprovePerm('${p.fb_id}')">Cancelar</button>
                        </div>
                    </div>
                    <div id="perm-reject-box-${p.fb_id}" style="display:none; flex-direction:column; gap:5px; margin-top:5px;">
                        <input type="text" id="perm-reason-${p.fb_id}" placeholder="Motivo de rechazo" class="modern-input" style="padding:4px; font-size:11px; width:100%;">
                        <div style="display:flex; gap:5px;">
                            <button class="btn btn-danger" style="padding: 2px 5px; font-size: 10px;" onclick="confirmRejectPerm('${p.fb_id}')">Confirmar</button>
                            <button class="btn btn-outline" style="padding: 2px 5px; font-size: 10px;" onclick="cancelRejectPerm('${p.fb_id}')">Cancelar</button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    const historyBody = document.getElementById('historyPermissionsTableBody');
    if(historyBody) {
        historyBody.innerHTML = '';
        const history = permisos.filter(p => p.status !== 'Pendiente');
        
        if (history.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay historial de permisos procesados.</td></tr>`;
        } else {
            // Ordenar los más recientes primero
            history.sort((a, b) => b.id - a.id);
            history.forEach(p => {
                let statusBadge = p.status === 'Aprobado' ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);"><i class='bx bx-check'></i> Aprobado</span>` : `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: var(--danger);"><i class='bx bx-x'></i> Rechazado</span>`;
                historyBody.innerHTML += `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <td style="padding: 12px; font-weight: 500;">${p.gestor}</td>
                        <td style="padding: 12px;">${p.tipo}</td>
                        <td style="padding: 12px;">${statusBadge}</td>
                        <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">${p.fecha}</td>
                        <td style="padding: 12px; font-size: 13px; color: var(--text-secondary);">${p.rejectionReason || '-'}</td>
                    </tr>
                `;
            });
        }
    }
}

function showPermRejectBox(id) {
    document.getElementById('perm-action-btns-' + id).style.display = 'none';
    document.getElementById('perm-reject-box-' + id).style.display = 'flex';
}

function cancelRejectPerm(id) {
    document.getElementById('perm-reject-box-' + id).style.display = 'none';
    document.getElementById('perm-action-btns-' + id).style.display = 'block';
    document.getElementById('perm-reason-' + id).value = '';
}

async function confirmRejectPerm(id) {
    const reason = document.getElementById('perm-reason-' + id).value.trim();
    if (!reason) {
        alert("Debes escribir un motivo de rechazo.");
        return;
    }
    await updatePermissionStatus(id, 'Rechazado', reason);
}

function showPermApproveBox(id) {
    document.getElementById('perm-action-btns-' + id).style.display = 'none';
    document.getElementById('perm-approve-box-' + id).style.display = 'flex';
}

function cancelApprovePerm(id) {
    document.getElementById('perm-approve-box-' + id).style.display = 'none';
    document.getElementById('perm-action-btns-' + id).style.display = 'block';
    document.getElementById('perm-approve-reason-' + id).value = '';
}

async function confirmApprovePerm(id) {
    const reason = document.getElementById('perm-approve-reason-' + id).value.trim();
    if (!reason) {
        alert("Debes escribir una observación para aprobar el permiso.");
        return;
    }
    await updatePermissionStatus(id, 'Aprobado', reason);
}

async function updatePermissionStatus(fb_id, newStatus, reason = null) {
    try {
        const updates = { status: newStatus, notified: false };
        if (reason) {
            updates.rejectionReason = reason;
        }
        
        await database.ref('permissions/' + fb_id).update(updates);
        
        alert(`Permiso ${newStatus} exitosamente.`);
        renderPendingPermissions(); // Reload table
        loadPermisos(); // Reload historical permissions if looking at it
    } catch(e) {
        alert('Error al contactar al servidor');
    }
}

// Exportar Reporte a PDF
window.exportShiftReport = async function(fb_id) {
    try {
        const snapshot = await database.ref('shift_reports/' + fb_id).once('value');
        if(!snapshot.exists()) return alert("No se encontró el reporte en la base de datos.");
        
        const r = snapshot.val();
        
        // Inicializar jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(16);
        doc.setTextColor(13, 138, 188); // Accent color
        doc.text("REPORTE DE TURNO - RISK MANAGER", 15, 20);
        
        // Metadatos
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.text("Gestor: " + (r.gestor || 'N/A'), 15, 35);
        doc.text("Rol: " + (r.rol || 'N/A'), 15, 42);
        doc.text("SET Trabajado: " + (r.setTrabajado || 'N/A'), 15, 49);
        doc.text("Hora de Inicio: " + (r.horaInicio || 'N/A'), 15, 56);
        doc.text("Hora de Fin: " + (r.horaFin || 'N/A'), 15, 63);
        
        // Línea separadora
        doc.setLineWidth(0.5);
        doc.line(15, 70, 195, 70);
        
        // Resumen
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Resumen de Tareas:", 15, 80);
        
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        
        const reportText = r.reporte || 'Sin reporte detallado.';
        const splitText = doc.splitTextToSize(reportText, 180);
        
        doc.text(splitText, 15, 90);
        
        // Guardar
        const safeName = (r.gestor || 'Gestor').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateStr = new Date(r.timestamp || Date.now()).toISOString().split('T')[0];
        doc.save(`Reporte_${safeName}_${dateStr}.pdf`);
        
    } catch(e) {
        alert("Hubo un error al intentar exportar el reporte.");
        console.error(e);
    }
};

// Logic for Shift Reports History
let allShiftReports = [];

async function renderShiftReports() {
    const tbody = document.getElementById('shiftReportsTableBody');
    if (!tbody) return;
    
    try { 
        const snapshot = await database.ref('shift_reports').once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            allShiftReports = Object.keys(data).map(k => ({...data[k], fb_id: k}));
        } else {
            allShiftReports = [];
        }
    } catch(e) {
        console.error("Error cargando historial de turnos:", e);
    }
    
    applyShiftReportsFilters();
}

function applyShiftReportsFilters() {
    const tbody = document.getElementById('shiftReportsTableBody');
    if (!tbody) return;

    const gestorQueryInput = document.getElementById('filterGestorInput');
    const gestorQuery = gestorQueryInput ? normalizeName(gestorQueryInput.value) : '';
    const fechaQuery = document.getElementById('filterFechaInput') ? document.getElementById('filterFechaInput').value : '';

    let filtered = [...allShiftReports];

    // Filter by Gestor name (accent-insensitive)
    if (gestorQuery) {
        filtered = filtered.filter(r => normalizeName(r.gestor).includes(gestorQuery));
    }

    // Filter by Date (comparing local YYYY-MM-DD format)
    if (fechaQuery) {
        filtered = filtered.filter(r => {
            if (r.timestamp) {
                const d = new Date(r.timestamp);
                const localYear = d.getFullYear();
                const localMonth = String(d.getMonth() + 1).padStart(2, '0');
                const localDay = String(d.getDate()).padStart(2, '0');
                const localDateStr = `${localYear}-${localMonth}-${localDay}`;
                if (localDateStr === fechaQuery) return true;
            }
            if (r.horaInicio && r.horaInicio.includes(fechaQuery)) return true;
            if (r.horaFin && r.horaFin.includes(fechaQuery)) return true;
            return false;
        });
    }

    tbody.innerHTML = '';
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay historial de turnos registrados con los filtros seleccionados.</td></tr>`;
        return;
    }
    
    // Sort descending by timestamp
    filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    filtered.forEach(r => {
        // Formatear el reporte de tareas para que sea legible en HTML
        const safeReport = (r.reporte || 'Sin reporte').replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<strong>[$1]</strong>');
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-weight: 500;">
                    ${r.gestor}
                    <div style="font-size: 11px; color: var(--text-secondary);">${r.rol}</div>
                </td>
                <td style="padding: 12px; color: var(--accent-primary);">${r.setTrabajado}</td>
                <td style="padding: 12px; font-size: 13px;">${r.horaInicio}</td>
                <td style="padding: 12px; font-size: 13px;">${r.horaFin}</td>
                <td style="padding: 12px; font-size: 12px; color: var(--text-secondary); max-width: 300px; text-align: left;">
                    <div style="max-height: 80px; overflow-y: auto; background: var(--bg-dark); padding: 5px; border-radius: 4px;">
                        ${safeReport}
                    </div>
                </td>
                <td style="padding: 12px; text-align: center;">
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" onclick="exportShiftReport('${r.fb_id}')">
                        <i class='bx bx-file-blank'></i> Exportar PDF
                    </button>
                </td>
            </tr>
        `;
    });
}



// Helper Notification function
function toggleNotifications() {
    const drop = document.getElementById('notificationDropdown');
    if (drop) {
        if (drop.style.display === 'none' || drop.style.display === '') {
            drop.style.display = 'block';
        } else {
            drop.style.display = 'none';
        }
    }
}

async function markAllAsRead() {
    if (!currentUser) return;
    try {
        if (currentUser.role === 'Admin' || currentUser.role === 'Supervisor') {
            const snapshot = await database.ref('permissions').once('value');
            if (snapshot.exists()) {
                const data = snapshot.val();
                const updates = {};
                for (let key in data) {
                    if (data[key].notified_admin === false && data[key].status === 'Pendiente') {
                        updates[key + '/notified_admin'] = true;
                    }
                }
                if (Object.keys(updates).length > 0) {
                    await database.ref('permissions').update(updates);
                }
            }
        } else {
            const snapshot = await database.ref('permissions').orderByChild('gestor').equalTo(currentUser.name).once('value');
            if (snapshot.exists()) {
                const data = snapshot.val();
                const updates = {};
                for (let key in data) {
                    if (data[key].notified === false && data[key].status !== 'Pendiente') {
                        updates[key + '/notified'] = true;
                    }
                }
                if (Object.keys(updates).length > 0) {
                    await database.ref('permissions').update(updates);
                }
            }
        }
    } catch(e) {
        console.error(e);
    }
}

// Funciones del Modal de Perfil
function openProfileModal() {
    const avatarEl = document.querySelector('.user-profile .avatar');
    const modalImg = document.getElementById('modalProfileAvatar');
    if (avatarEl && modalImg) {
        modalImg.src = avatarEl.src;
    }
    
    if (currentUser) {
        const modalName = document.getElementById('modalProfileName');
        if (modalName) modalName.textContent = currentUser.name || 'Usuario';
        
        const modalRole = document.getElementById('modalProfileRole');
        if (modalRole) modalRole.textContent = currentUser.role || 'Rol';
    }

    document.getElementById('profileModal').classList.add('active');
    document.getElementById('newPasswordInput').value = '';
    const msg = document.getElementById('passwordChangeMsg');
    if (msg) msg.style.display = 'none';
}

function toggleProfilePassword(iconElement) {
    const input = document.getElementById('newPasswordInput');
    if (input.type === 'password') {
        input.type = 'text';
        iconElement.classList.remove('bx-show');
        iconElement.classList.add('bx-hide');
    } else {
        input.type = 'password';
        iconElement.classList.remove('bx-hide');
        iconElement.classList.add('bx-show');
    }
}

async function changePassword() {
    const newPass = document.getElementById('newPasswordInput').value;
    const msg = document.getElementById('passwordChangeMsg');
    
    if(!newPass || newPass.trim() === '') {
        msg.textContent = 'Por favor ingresa una contraseña válida.';
        msg.style.color = 'var(--danger)';
        msg.style.display = 'block';
        return;
    }
    
    msg.textContent = 'Actualizando...';
    msg.style.color = 'var(--text-primary)';
    msg.style.display = 'block';
    
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            await user.updatePassword(newPass);
            msg.textContent = '¡Contraseña actualizada exitosamente en Firebase Auth!';
            msg.style.color = 'var(--success)';
            setTimeout(() => closeModal('profileModal'), 2000);
        } else {
            msg.textContent = 'Error: No hay sesión activa en Firebase Auth. Por favor, vuelve a iniciar sesión.';
            msg.style.color = 'var(--danger)';
        }
    } catch(e) {
        msg.textContent = 'Error al actualizar contraseña.';
        if (e.code === 'auth/requires-recent-login') {
            msg.textContent = 'Por seguridad, debes cerrar sesión e iniciar sesión nuevamente para cambiar tu contraseña.';
        } else if (e.code === 'auth/weak-password') {
            msg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        }
        msg.style.color = 'var(--danger)';
        console.error("Error al actualizar la contraseña:", e);
    }
}

// --- PROGRAMMATIC SIDEBAR ORDER & MONITOREO REALTIME ---

function setupSidebar() {
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav) return;
    
    const navWorkspace = document.getElementById('navWorkspace');
    const navHorario = document.getElementById('navHorario');
    const navTeletrabajo = document.getElementById('navTeletrabajo');
    const navDocs = document.getElementById('navDocs');
    const navPermisos = document.getElementById('navPermisos');
    const navComunicados = document.getElementById('navComunicados');
    
    const adminNavGroup = document.getElementById('adminNavGroup');
    const navAdminComunicados = document.getElementById('navAdminComunicados');
    const navTurnos = document.getElementById('navTurnos');
    const navAprobaciones = document.getElementById('navAprobaciones');
    const navMonitoreo = document.getElementById('navMonitoreo');
    const navIndicadores = document.getElementById('navIndicadores');
    const navLogins = document.getElementById('navLogins');
    
    const navSoporte = document.getElementById('navSoporte');

    if (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Supervisor')) {
        // Admin/Supervisor Order
        if (adminNavGroup) { adminNavGroup.style.display = 'block'; sidebarNav.appendChild(adminNavGroup); }
        if (navMonitoreo) { navMonitoreo.style.display = 'flex'; adminNavGroup.appendChild(navMonitoreo); }
        if (navIndicadores) { navIndicadores.style.display = 'flex'; adminNavGroup.appendChild(navIndicadores); }
        if (navAdminComunicados) { navAdminComunicados.style.display = 'flex'; adminNavGroup.appendChild(navAdminComunicados); }
        if (navTurnos) { navTurnos.style.display = 'flex'; adminNavGroup.appendChild(navTurnos); }
        if (navAprobaciones) { navAprobaciones.style.display = 'flex'; adminNavGroup.appendChild(navAprobaciones); }
        if (navLogins) { navLogins.style.display = 'flex'; adminNavGroup.appendChild(navLogins); }
        
        if (navWorkspace) { navWorkspace.style.display = 'flex'; sidebarNav.appendChild(navWorkspace); }
        if (navComunicados) { navComunicados.style.display = 'none'; }
        if (navHorario) { navHorario.style.display = 'flex'; sidebarNav.appendChild(navHorario); }
        if (navTeletrabajo) { navTeletrabajo.style.display = 'flex'; sidebarNav.appendChild(navTeletrabajo); }
        if (navDocs) { navDocs.style.display = 'flex'; sidebarNav.appendChild(navDocs); }
        if (navPermisos) { navPermisos.style.display = 'flex'; sidebarNav.appendChild(navPermisos); }
        
        if (navSoporte) { navSoporte.style.display = 'flex'; sidebarNav.appendChild(navSoporte); }
    } else {
        // Gestor Order
        if (navWorkspace) { navWorkspace.style.display = 'flex'; sidebarNav.appendChild(navWorkspace); }
        if (navComunicados) { navComunicados.style.display = 'flex'; sidebarNav.appendChild(navComunicados); }
        
        // Merge Horario and Teletrabajo into "Mi Jornada" ONLY for Gestor
        if (navHorario) {
            navHorario.style.display = 'flex';
            sidebarNav.appendChild(navHorario);
            navHorario.innerHTML = "<i class='bx bx-calendar'></i> Mi Jornada";
        }
        
        if (navTeletrabajo) {
            navTeletrabajo.style.display = 'none'; // Ocultar pestaña separada
        }

        // Mover contenido de Teletrabajo dentro de Horario
        const viewHorario = document.getElementById('view-horario');
        const viewTeletrabajo = document.getElementById('view-teletrabajo');
        if (viewHorario && viewTeletrabajo) {
            const teletrabajoContent = viewTeletrabajo.querySelector('.glass-panel');
            if (teletrabajoContent && !document.getElementById('mergedTeletrabajoPanel')) {
                teletrabajoContent.id = 'mergedTeletrabajoPanel';
                
                // Cambiar el título dentro del contenedor Horario
                const panelTitle = viewHorario.querySelector('.panel-title');
                if (panelTitle) panelTitle.innerHTML = "<i class='bx bx-calendar'></i> Mi Jornada";
                
                // Agregar encabezados sutiles para separarlos visualmente
                const hrPanel = viewHorario.querySelector('.glass-panel');
                if (hrPanel && !hrPanel.querySelector('.section-header')) {
                    const h3Horario = document.createElement('h3');
                    h3Horario.className = 'section-header';
                    h3Horario.style.cssText = "color: var(--accent-primary); margin-bottom: 15px; font-size: 16px;";
                    h3Horario.innerText = "Horario Semanal";
                    hrPanel.insertBefore(h3Horario, hrPanel.firstChild);
                }
                
                if (!teletrabajoContent.querySelector('.section-header')) {
                    const h3Tele = document.createElement('h3');
                    h3Tele.className = 'section-header';
                    h3Tele.style.cssText = "color: var(--success); margin-bottom: 15px; font-size: 16px;";
                    h3Tele.innerText = "Cronograma de Teletrabajo";
                    teletrabajoContent.insertBefore(h3Tele, teletrabajoContent.firstChild);
                }

                viewHorario.appendChild(teletrabajoContent);
            }
        }

        if (navDocs) { navDocs.style.display = 'flex'; sidebarNav.appendChild(navDocs); }
        if (navPermisos) { navPermisos.style.display = 'flex'; sidebarNav.appendChild(navPermisos); }
        
        // Hide Admin tabs for Gestor
        if (adminNavGroup) adminNavGroup.style.display = 'none';
        
        if (navSoporte) { navSoporte.style.display = 'flex'; sidebarNav.appendChild(navSoporte); }
        
        // --- LUNCH BUTTON VISIBILITY ---
        const toggleLunchBtn = document.getElementById('toggleLunchBtn');
        if (toggleLunchBtn) {
            toggleLunchBtn.style.display = 'flex';
        }
        
        const toggleBreakfastBtn = document.getElementById('toggleBreakfastBtn');
        if (toggleBreakfastBtn) {
            toggleBreakfastBtn.style.display = 'flex';
        }
    }
}

let allActiveSessions = {};

const availableAvatars = [
    "Alexander Villada.png",
    "Camilo Espinosa.png",
    "Daniel Benavides.png",
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

function calculateShiftDelay(session) {
    if (!session.loginTime || !session.shift) return '';
    const shiftStr = session.shift.toLowerCase().trim();
    
    // Parse start time: e.g. "8am - 4pm" -> "8", "am"
    const match = shiftStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (!match) return ''; // Cannot parse shift
    
    let hour = parseInt(match[1], 10);
    let minute = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3].toLowerCase();
    
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    
    const loginDate = new Date(session.loginTime);
    const expected = new Date(loginDate);
    expected.setHours(hour, minute, 0, 0);
    
    let diffMinutes = (loginDate - expected) / 60000;
    
    if (diffMinutes < -12 * 60) {
        expected.setDate(expected.getDate() + 1);
        diffMinutes = (loginDate - expected) / 60000;
    } else if (diffMinutes > 12 * 60) {
        expected.setDate(expected.getDate() - 1);
        diffMinutes = (loginDate - expected) / 60000;
    }
    
    if (diffMinutes <= 5) {
        return `<span style="background: var(--success); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 5px;" title="Límite: ${expected.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}">A tiempo</span>`;
    } else {
        const tardanza = Math.round(diffMinutes);
        return `<span style="background: var(--danger); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 5px;" title="Límite: ${expected.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}">+${tardanza}m Tarde</span>`;
    }
}

function renderActiveSessionsDashboard() {
    const grid = document.getElementById('monitoreoGrid');
    if (!grid) return;

    grid.innerHTML = '';
    
    // Get filter queries
    const searchInputEl = document.getElementById('monitoreoSearchInput');
    const searchQuery = searchInputEl ? normalizeName(searchInputEl.value) : '';
    const shiftSelectEl = document.getElementById('filterShiftSelect');
    const shiftQuery = shiftSelectEl ? shiftSelectEl.value : '';
    const statusSelectEl = document.getElementById('filterStatusSelect');
    const statusQuery = statusSelectEl ? statusSelectEl.value : '';

    const uids = Object.keys(allActiveSessions);
    
    // Filtering active sessions
    let filteredUids = uids.filter(uid => {
        const session = allActiveSessions[uid];
        if (!session) return false;
        
        const fullName = (session.name || '').trim();
        const email = (session.email || '');
        const shift = session.shift || 'Mañana';
        let isOnline = session.lastActive ? ((Date.now() - session.lastActive) < 120000) : false;
        if (session.status === 'En Almuerzo' || session.status === 'En Desayuno' || session.status === 'Inactivo') {
            isOnline = false;
        }

        // Search match (accent-insensitive substring)
        if (searchQuery && !normalizeName(fullName).includes(searchQuery) && !normalizeName(email).includes(searchQuery)) {
            return false;
        }

        // Shift match using getShiftCategory helper
        const sessionShiftCat = getShiftCategory(shift);
        if (shiftQuery && sessionShiftCat !== shiftQuery) {
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
        updateGlobalStats();
        return;
    }

    filteredUids.forEach(uid => {
        const session = allActiveSessions[uid];
        if (!session) return;
        
        let isOnline = session.lastActive ? ((Date.now() - session.lastActive) < 120000) : false;
        let displayStatus = isOnline ? 'En Línea' : 'Inactivo';
        
        let statusBadge = '';
        let statusDot = isOnline ? '<div class="pulse-dot"></div>' : '<div class="pulse-dot offline"></div>';

        if (session.status === 'En Almuerzo') {
            statusBadge = '<span style="background: rgba(40,167,69,0.2); color: #28a745; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 500;"><i class="bx bx-restaurant"></i> Almuerzo</span>';
            displayStatus = 'En Almuerzo 🍽️';
            statusDot = '<div style="width: 8px; height: 8px; border-radius: 50%; background: #28a745; margin-right: 6px;"></div>';
        } else if (session.status === 'En Desayuno') {
            statusBadge = '<span style="background: rgba(255,193,7,0.2); color: #ffc107; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 500;"><i class="bx bx-coffee"></i> Desayuno</span>';
            displayStatus = 'En Desayuno ☕';
            statusDot = '<div style="width: 8px; height: 8px; border-radius: 50%; background: #ffc107; margin-right: 6px;"></div>';
        } else if (session.status === 'Inactivo') {
            isOnline = false;
            displayStatus = 'Inactivo 💤';
        } else if (session.status === 'En Línea') {
            isOnline = true;
            displayStatus = 'En Línea';
        }
        
        const lastActiveTime = session.lastActive ? new Date(session.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Nunca';
        const loginTimeStr = session.loginTime ? new Date(session.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Pendiente (Falta actualizar)';
        const delayBadge = calculateShiftDelay(session);
        
        const fullName = (session.name || '').trim();
        let matchedAvatar = availableAvatars.find(img => namesMatch(fullName, img.replace('.png', '')));
        let avatarSrc = matchedAvatar ? `assets/src/img/${matchedAvatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;

        const completedTasks = session.finalizedTasks || 0;
        const totalTasks = session.totalTasks || 0;
        const percentage = session.percentage || 0;

        const tasks = session.tasks || {};
        
        let assignedTasks = [];
        if (globalCronogramaData) {
            assignedTasks = getAssignedTasksForGestor(fullName, session.shift || 'Mañana');
        }

        let tasksHtml = '';
        if (assignedTasks.length > 0) {
            tasksHtml = '<div style="margin-top: 15px; max-height: 80px; overflow-y: auto; font-size: 11px; border: 1px solid var(--border-color); border-radius: 4px; padding: 5px; background: rgba(0,0,0,0.02);">';
            assignedTasks.forEach(taskName => {
                // Find if the gestor has interacted with this task
                let taskStatus = 'Pendiente';
                let icon = "<i class='bx bx-radio-circle' style='color: var(--text-secondary)'></i>";
                
                // Buscar si existe en session.tasks (por valor de objeto)
                for (let key in tasks) {
                    if (tasks[key].name === taskName) {
                        taskStatus = tasks[key].status;
                        break;
                    }
                }

                let textStyle = '';
                if (taskStatus === 'Finalizada') {
                    icon = "<i class='bx bx-check-circle' style='color: var(--success)'></i>";
                    textStyle = "color: var(--success); font-weight: bold;";
                } else if (taskStatus === 'En Proceso') {
                    icon = "<i class='bx bx-time-five' style='color: var(--warning)'></i>";
                    textStyle = "color: var(--warning);";
                } else if (taskStatus === 'No Realizada') {
                    icon = "<i class='bx bx-x-circle' style='color: var(--danger)'></i>";
                    textStyle = "color: var(--danger); text-decoration: line-through;";
                }

                tasksHtml += `<div style="display: flex; align-items: center; gap: 5px; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: ${taskStatus==='Pendiente'?0.7:1};">${icon} <span title="${taskName}" style="${textStyle}">${taskName}</span></div>`;
            });
            tasksHtml += '</div>';
        } else {
            tasksHtml = '<div style="margin-top: 15px; font-size: 11px; color: var(--text-secondary); text-align: center; font-style: italic;">' + 
                        (globalCronogramaData ? 'No tiene tareas asignadas en este turno' : 'Cargando cronograma...') + '</div>';
        }

        const card = document.createElement('div');
        card.className = 'monitoreo-card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div class="monitoreo-user-info">
                    <img src="${avatarSrc}" alt="${fullName}" class="monitoreo-avatar" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff';">
                    <div class="monitoreo-details">
                        <span class="monitoreo-name">${fullName}</span>
                        <span class="monitoreo-meta">${session.email || ''}</span>
                    </div>
                </div>
                <div class="status-indicator-badge ${isOnline ? 'status-online' : 'status-offline'}">
                    <div class="pulse-dot ${isOnline ? '' : 'offline'}"></div>
                    ${displayStatus}
                </div>
            </div>
            
            <div style="margin-top: 10px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: var(--text-secondary);"><i class='bx bx-calendar-check'></i> Turno:</span>
                    <strong style="color: var(--text-primary);">${session.shift || 'Mañana'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: var(--text-secondary);"><i class='bx bx-time'></i> Inicio de Turno:</span>
                    <div style="display: flex; align-items: center;">
                        <span style="color: var(--text-primary); font-size: 12px;">${loginTimeStr}</span>
                        ${delayBadge}
                    </div>
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

            ${tasksHtml}

            <div style="margin-top: 15px; display: flex; gap: 5px; justify-content: flex-end;">
                <button class="btn btn-outline" style="flex: 1; padding: 6px 10px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px;" onclick="openMonitoreoDetails('${uid}')">
                    <i class='bx bx-search-alt-2'></i> Detalles
                </button>
                <button class="btn btn-outline" style="flex: 1; padding: 6px 10px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px; border-color: var(--warning); color: var(--warning);" onclick="viewTimelineInMonitoreo('${uid}')">
                    <i class='bx bx-time'></i> Bitácora
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    updateGlobalStats();
}

function viewTimelineInMonitoreo(uid) {
    const session = allActiveSessions[uid];
    if (!session) return;
    
    const modal = document.getElementById('timelineModal');
    const tbody = document.getElementById('timelineTableBody');
    if (!modal || !tbody) return;
    
    document.getElementById('timelineModalName').innerText = session.name || 'Gestor';
    
    const timeline = session.timeline || [];
    if (timeline.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No hay pausas ni inactividades registradas en este turno.</td></tr>';
    } else {
        tbody.innerHTML = '';
        timeline.forEach(ev => {
            const s = new Date(ev.start).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});
            let eTime = "No regresó";
            let durationStr = "En curso...";
            if (ev.end) {
                eTime = new Date(ev.end).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});
                const mins = Math.round((ev.end - ev.start) / 60000);
                durationStr = `${mins} min`;
            }
            
            let icon = "<i class='bx bx-time'></i>";
            if (ev.type === 'Almuerzo') icon = "<i class='bx bx-restaurant' style='color: var(--success)'></i>";
            if (ev.type === 'Desayuno') icon = "<i class='bx bx-coffee' style='color: var(--warning)'></i>";
            if (ev.type === 'Inactividad') icon = "<i class='bx bx-sleepy' style='color: var(--danger)'></i>";

            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid var(--glass-border);">
                    <td style="padding: 10px; font-weight: 500;">${icon} ${ev.type}</td>
                    <td style="padding: 10px; font-size: 13px;">${s} - ${eTime}</td>
                    <td style="padding: 10px; text-align: center;"><span class="badge" style="background: rgba(255,255,255,0.05);">${durationStr}</span></td>
                </tr>
            `;
        });
    }
    
    modal.classList.add('active');
}

function updateGlobalStats() {
    const statsGestores = document.getElementById('statsGestores');
    const statsKpi = document.getElementById('statsKpi');
    const statsGestoresTitle = document.getElementById('statsGestoresTitle');

    const uids = Object.keys(allActiveSessions);
    const totalGestores = uids.length;

    // Determine current system shift based on system hour
    let shiftName = "Mañana";
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) {
        shiftName = "Mañana";
    } else if (hour >= 14 && hour < 22) {
        shiftName = "Tarde";
    } else {
        shiftName = "Noche";
    }

    // Overwrite system shift if there is a dominant shift in active sessions
    if (totalGestores > 0) {
        const shifts = uids.map(uid => allActiveSessions[uid] ? allActiveSessions[uid].shift : null).filter(Boolean);
        if (shifts.length > 0) {
            const counts = {};
            shifts.forEach(s => {
                const cat = getShiftCategory(s);
                if (cat) counts[cat] = (counts[cat] || 0) + 1;
            });
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

    // Get filter shift selection
    const shiftSelectEl = document.getElementById('filterShiftSelect');
    const selectedShift = shiftSelectEl ? shiftSelectEl.value : '';
    const targetShift = selectedShift || shiftName;

    // Count online managers belonging to targetShift
    const onlineCountForShift = uids.filter(uid => {
        const session = allActiveSessions[uid];
        if (!session) return false;
        const isOnline = session.lastActive ? ((Date.now() - session.lastActive) < 120000) : false;
        const sessionShiftCat = getShiftCategory(session.shift || 'Mañana');
        return isOnline && (sessionShiftCat === targetShift);
    }).length;

    // Get total scheduled managers for targetShift today
    const scheduledCountForShift = getScheduledGestoresCountForShift(targetShift);

    if (statsGestores) {
        statsGestores.textContent = `${onlineCountForShift} / ${scheduledCountForShift}`;
    }

    if (statsGestoresTitle) {
        statsGestoresTitle.textContent = `Gestores Activos (${targetShift})`;
    }

    // Compute average KPI
    let totalPercentage = 0;
    uids.forEach(uid => {
        const session = allActiveSessions[uid];
        totalPercentage += session ? (session.percentage || 0) : 0;
    });
    const avgKpi = totalGestores > 0 ? Math.round(totalPercentage / totalGestores) : 0;
    if (statsKpi) {
        statsKpi.textContent = `${avgKpi}%`;
    }
}

window.openMonitoreoDetails = function(uid) {
    const session = allActiveSessions[uid];
    if (!session) return;

    const fullName = (session.name || '').trim();
    let matchedAvatar = availableAvatars.find(img => namesMatch(fullName, img.replace('.png', '')));
    let avatarSrc = matchedAvatar ? `assets/src/img/${matchedAvatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;

    const avatarEl = document.getElementById('monitoreoModalAvatar');
    if (avatarEl) {
        avatarEl.src = avatarSrc;
        avatarEl.onerror = function() {
            this.onerror = null;
            this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
        };
    }

    const nameEl = document.getElementById('monitoreoModalName');
    if (nameEl) nameEl.textContent = "Tareas de " + fullName;
    
    const lastActiveTime = session.lastActive ? new Date(session.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nunca';
    const loginTimeStr = session.loginTime ? new Date(session.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pendiente (Falta actualizar)';
    const infoEl = document.getElementById('monitoreoModalInfo');
    if (infoEl) infoEl.textContent = `Turno: ${session.shift || 'Mañana'} | Inicio: ${loginTimeStr} | Actividad: ${lastActiveTime}`;

    const tasksList = document.getElementById('monitoreoModalTasksList');
    if (tasksList) {
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
    }

    const modal = document.getElementById('monitoreoModal');
    if (modal) modal.classList.add('active');
};

function populateGestoresDropdown() {
    const selectEl = document.getElementById('monitoreoSearchInput');
    if (!selectEl) return;
    
    selectEl.innerHTML = '<option value="">Todos los Gestores</option>';
    
    database.ref('users').once('value').then(snapshot => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const gestores = Object.keys(data)
                .map(k => data[k])
                .filter(u => u && u.role === 'Gestor' && u.approved === true)
                .map(u => u.name.trim())
                .sort((a, b) => a.localeCompare(b));
            
            const uniqueGestores = [...new Set(gestores)];
            
            uniqueGestores.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                selectEl.appendChild(opt);
            });
        }
    }).catch(err => {
        console.error("Error populating gestores dropdown:", err);
    });
}

// --- Lógica del Portal de Indicadores de Gestión (KPIs) ---

window.kpiUsersData = {}; // email -> name
window.retirosGlobalData = null; // Carga automática del backend
window.kpiTaskLists = { finalizadas: [], no_realizadas: [], pendientes: [] };

// Cargar data de retiros automáticamente (JSON pre-procesado por el bat)
function loadRetirosData() {
    fetch('Retiros/retiros_data.json')
        .then(response => {
            if (!response.ok) throw new Error('No se encontró el JSON');
            return response.json();
        })
        .then(data => {
            window.retirosGlobalData = data;
            console.log("Data de retiros cargada automáticamente:", Object.keys(data).length, "gestores");
        })
        .catch(err => {
            console.warn("No hay data de retiros automatizada o hubo un error:", err);
            window.retirosGlobalData = null;
        });
}

function loadGestoresForKPIs() {
    const selectEl = document.getElementById('kpiGestorSelect');
    if (!selectEl) return;
    
    if (selectEl.options.length > 2) {
        // If already loaded, just return. We don't want to overwrite and re-trigger calculation
        return;
    }
    
    selectEl.innerHTML = '<option value="todos" selected>Todos los gestores</option><option value="">Selecciona un gestor...</option>';
    
    database.ref('users').once('value').then(snapshot => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            window.kpiUsersData = {};
            
            const targetGestores = [
                "oriana borja",
                "marilyn",
                "sebastian hincapie",
                "sebastian arango",
                "sebastiana",
                "juan jose diaz",
                "yefferson",
                "alexander villada",
                "daniel",
                "josue alvarez"
            ];
            
            const gestores = Object.keys(data)
                .map(k => {
                    const u = data[k];
                    if (u && u.email && u.name) {
                        window.kpiUsersData[u.email.toLowerCase()] = u.name.trim();
                    }
                    return u;
                })
                .filter(u => {
                    if (!u || u.role !== 'Gestor' || u.approved !== true) return false;
                    const nameLower = u.name.toLowerCase();
                    return targetGestores.some(t => nameLower.includes(t));
                })
                .map(u => u.name.trim())
                .sort((a, b) => a.localeCompare(b));
            
            const uniqueGestores = [...new Set(gestores)];
            
            uniqueGestores.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                selectEl.appendChild(opt);
            });
            
            // Auto-trigger KPI calculation once loaded to map the global view
            calcularIndicadores();
        }
    }).catch(err => console.error("Error populating KPI gestores dropdown:", err));
}

async function calcularIndicadores() {
    const gestorName = document.getElementById('kpiGestorSelect').value;
    const periodo = document.getElementById('kpiPeriodoSelect').value;
    const db = firebase.database();
    
    // Resetear listas de detalle
    window.kpiTaskLists = { finalizadas: [], no_realizadas: [], pendientes: [] };
    window.kpiBitacoraTexto = "";

    // Limpiar UI anterior
    document.getElementById('kpiResultsContainer').style.display = 'none';
    
    if (!gestorName) {
        alert("Por favor, selecciona un gestor primero.");
        return;
    }
    
    const resultsContainer = document.getElementById('kpiResultsContainer');
    resultsContainer.style.display = 'none'; // hide while loading
    
    let shiftReports = [];
    try {
        let snapshot;
        if (gestorName === 'todos') {
            snapshot = await database.ref('shift_reports').once('value');
        } else {
            snapshot = await database.ref('shift_reports').orderByChild('gestor').equalTo(gestorName).once('value');
        }
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            shiftReports = Object.keys(data).map(k => data[k]);
        }
    } catch(e) {
        console.error("Error cargando shift reports para KPIs", e);
        alert("Hubo un error cargando los datos.");
        return;
    }
    
    if (shiftReports.length === 0) {
        alert(`No se encontraron turnos registrados para ${gestorName}.`);
        return;
    }
    // Filtro por fecha
    const now = Date.now();
    
    if (periodo === 'hoy') {
        const hoyStart = new Date().setHours(0,0,0,0);
        shiftReports = shiftReports.filter(r => { const t = r.timestamp || r.loginTime; return t && t >= hoyStart; });
    } else if (periodo === 'ayer') {
        const hoyStart = new Date().setHours(0,0,0,0);
        const ayerStart = hoyStart - (24 * 60 * 60 * 1000);
        shiftReports = shiftReports.filter(r => { const t = r.timestamp || r.loginTime; return t && t >= ayerStart && t < hoyStart; });
    } else if (periodo === 'semanal') {
        const unaSemanaAtras = now - (7 * 24 * 60 * 60 * 1000);
        shiftReports = shiftReports.filter(r => { const t = r.timestamp || r.loginTime; return t && t >= unaSemanaAtras; });
    } else if (periodo === '30dias') {
        const unMesAtras = now - (30 * 24 * 60 * 60 * 1000);
        shiftReports = shiftReports.filter(r => { const t = r.timestamp || r.loginTime; return t && t >= unMesAtras; });
    } else if (periodo === 'mes') {
        const esteMesStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        shiftReports = shiftReports.filter(r => { const t = r.timestamp || r.loginTime; return t && t >= esteMesStart; });
    } else if (periodo === 'custom') {
        const customDateStr = document.getElementById('kpiCustomDateInput').value;
        if (customDateStr) {
            const parts = customDateStr.split('-');
            const customStart = new Date(parts[0], parts[1]-1, parts[2]).getTime();
            const customEnd = customStart + 86400000;
            shiftReports = shiftReports.filter(r => { const t = r.timestamp || r.loginTime; return t && t >= customStart && t < customEnd; });
        } else {
            alert("Por favor selecciona una fecha específica en el calendario.");
            return;
        }
    }
    
    if (shiftReports.length === 0) {
        console.warn(`No hay reportes de turno para ${gestorName} en esta fecha/periodo.`);
        // No hacer return, permitir que el código continúe para cargar los datos de Retiros
    }

    let totalFinalizadas = 0;
    let totalNoRealizadas = 0;
    let totalPendientes = 0;
    let turnosAnalizados = shiftReports.length;
    let totalMinutosConectados = 0;
    let turnosValidosParaTiempo = 0;
    
    shiftReports.forEach(report => {
        // Calcular duración del turno
        if (report.horaInicio && report.horaFin) {
            const baseMs = report.timestamp || report.loginTime || Date.now();
            
            const parseTime = (timeStr, baseDateMs) => {
                if (typeof timeStr === 'string') {
                    timeStr = timeStr.replace(/a\.\s*m\./i, 'AM').replace(/p\.\s*m\./i, 'PM');
                }
                let d = new Date(timeStr);
                if (!isNaN(d.getTime())) return d.getTime();
                
                if (typeof timeStr === 'string' && timeStr.includes(':')) {
                    const parts = timeStr.match(/(\d+):(\d+)/);
                    if (parts) {
                        const base = new Date(baseDateMs);
                        let hours = parseInt(parts[1], 10);
                        if (timeStr.toUpperCase().includes('PM') && hours < 12) hours += 12;
                        if (timeStr.toUpperCase().includes('AM') && hours === 12) hours = 0;
                        base.setHours(hours, parseInt(parts[2], 10), 0, 0);
                        return base.getTime();
                    }
                }
                return NaN;
            };

            const startMs = parseTime(report.horaInicio, baseMs);
            const endMs = parseTime(report.horaFin, baseMs);
            
            if (!isNaN(startMs) && !isNaN(endMs)) {
                let diffMins = (endMs - startMs) / 60000;
                if (diffMins < 0) diffMins += 1440; // Cruzó la medianoche
                
                if (diffMins > 0 && diffMins <= 1440) {
                    totalMinutosConectados += diffMins;
                    turnosValidosParaTiempo++;
                }
            }
        }

        // Construir texto de bitácora para el modal/tarjeta
        const shiftDateStr = new Date(report.timestamp || report.loginTime || Date.now()).toLocaleDateString('es-CO');
        window.kpiBitacoraTexto += `\n▶ TURNO DEL ${shiftDateStr} - Gestor: ${report.gestor || 'Desconocido'}\n`;
        window.kpiBitacoraTexto += `Ingreso: ${report.horaInicio || 'N/A'} | Salida: ${report.horaFin || 'N/A'}\n`;
        
        if (report.timeline && report.timeline.length > 0) {
            report.timeline.forEach(ev => {
                const s = new Date(ev.start).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});
                const eTime = ev.end ? new Date(ev.end).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'}) : "No regresó";
                window.kpiBitacoraTexto += `  - ${ev.type}: de ${s} a ${eTime}\n`;
            });
        } else if (report.reporte && report.reporte.includes("=== BITÁCORA DE TIEMPOS ===")) {
            const parts = report.reporte.split("=== BITÁCORA DE TIEMPOS ===");
            if (parts.length > 1) {
                window.kpiBitacoraTexto += parts[1].trim() + "\n";
            }
        } else {
            window.kpiBitacoraTexto += "  (No se registraron pausas)\n";
        }
        window.kpiBitacoraTexto += "\n";
        
        let tasks = report.tasks;
        if (!tasks && report.reporte) {
            tasks = {};
            const regex = /\[\s*([A-Za-z_]+)\s*\]\s*-\s*([^\n]+)(?:\nObservación:\s*([^\n]+))?/g;
            let match;
            let i = 0;
            while ((match = regex.exec(report.reporte)) !== null) {
                tasks[`parsed_${i++}`] = {
                    status: match[1].toLowerCase(),
                    name: match[2].trim(),
                    observation: match[3] ? match[3].trim() : 'N/A'
                };
            }
        }
        
        if (!tasks) return;
        
        // Contar tareas
        for (let taskId in tasks) {
            const task = tasks[taskId];
            const shiftDateStr = new Date(report.timestamp || report.loginTime || Date.now()).toLocaleDateString();
            const taskObj = { name: task.name, date: shiftDateStr, type: task.type || 'N/A', observation: task.observation || 'N/A' };
            
            if (!task.status) continue;
            const tStatus = task.status.toLowerCase().trim();
            
            if (tStatus === 'finalizada') {
                totalFinalizadas++;
                window.kpiTaskLists.finalizadas.push(taskObj);
            } else if (tStatus === 'no_realizada' || tStatus === 'no realizada') {
                totalNoRealizadas++;
                window.kpiTaskLists.no_realizadas.push(taskObj);
            } else if (tStatus === 'pendiente' || tStatus === 'en_proceso' || tStatus === 'en proceso') {
                totalPendientes++;
                window.kpiTaskLists.pendientes.push(taskObj);
            }
        }
    });
    
    const totalTareas = totalFinalizadas + totalNoRealizadas + totalPendientes;
    let porcentajeActividades = 0;
    
    if (totalTareas > 0) {
        porcentajeActividades = (totalFinalizadas / totalTareas) * 100;
    } else {
        porcentajeActividades = 0; // Regla confirmada: 0% si no marcó nada
    }
    
    porcentajeActividades = Math.round(porcentajeActividades);
    
    // Calcular Penalidad de Conectividad e Inactividad
    let totalPenalidadConectividad = 0;
    let totalInactividadMins = 0;
    shiftReports.forEach(report => {
        if (report.penalidadConectividadMins) {
            // Regla confirmada: 1% menos por cada minuto sobrepasado
            totalPenalidadConectividad += report.penalidadConectividadMins;
        }
        
        if (report.inactividadTotalMins !== undefined) {
            totalInactividadMins += report.inactividadTotalMins;
        } else if (report.timeline && report.timeline.length > 0) {
            // Fallback para reportes antiguos que no tienen inactividadTotalMins guardado
            let fallbackMins = 0;
            const now = Date.now();
            report.timeline.forEach(ev => {
                if (ev.type === 'Inactividad') {
                    let eTime = ev.end ? ev.end : now;
                    fallbackMins += (eTime - ev.start) / (1000 * 60);
                }
            });
            totalInactividadMins += fallbackMins;
        }
    });
    
    let porcentajeConectividad = 100 - totalPenalidadConectividad;
    if (porcentajeConectividad < 0) porcentajeConectividad = 0;
    porcentajeConectividad = Math.round(porcentajeConectividad);
    
    // Aplicar penalidad de retiros si existe la data y llenar nuevas tarjetas
    let penalidadRetiros = 0;
    const cardRetiros = document.getElementById('kpiRetirosPenalidadCard');
    const textPenalidad = document.getElementById('kpiPenalidadRetiros');
    const textDemora = document.getElementById('kpiDemoraPromedioText');
    const cardPagados = document.getElementById('kpiRetirosPagados');
    const cardRechazados = document.getElementById('kpiRetirosRechazados');
    const cardMonto = document.getElementById('kpiRetirosMonto');
    const retirosCardsElements = document.querySelectorAll('.retiros-card');
    
    if (window.retirosGlobalData) {
        let stats = null;
        
        if (gestorName === 'todos') {
            // Aggregate all stats
            stats = {
                totalAprobados: 0,
                totalRechazados: 0,
                montoProcesado: 0,
                minutosDemoraTotales: 0,
                retirosConTiempo: 0,
                diario: {}
            };
            for (let excelEmail in window.retirosGlobalData) {
                const s = window.retirosGlobalData[excelEmail];
                stats.totalAprobados += s.totalAprobados || 0;
                stats.totalRechazados += s.totalRechazados || 0;
                stats.montoProcesado += s.montoProcesado || 0;
                stats.minutosDemoraTotales += s.minutosDemoraTotales || 0;
                stats.retirosConTiempo += s.retirosConTiempo || 0;
                if (s.diario) {
                    for (let dStr in s.diario) {
                        if (!stats.diario[dStr]) {
                            stats.diario[dStr] = { totalAprobados: 0, totalRechazados: 0, montoProcesado: 0, minutosDemoraTotales: 0, retirosConTiempo: 0 };
                        }
                        stats.diario[dStr].totalAprobados += s.diario[dStr].totalAprobados || 0;
                        stats.diario[dStr].totalRechazados += s.diario[dStr].totalRechazados || 0;
                        stats.diario[dStr].montoProcesado += s.diario[dStr].montoProcesado || 0;
                        stats.diario[dStr].minutosDemoraTotales += s.diario[dStr].minutosDemoraTotales || 0;
                        stats.diario[dStr].retirosConTiempo += s.diario[dStr].retirosConTiempo || 0;
                    }
                }
            }
        } else {
            let gestorEmail = null;
            for (let email in window.kpiUsersData) {
                if (window.kpiUsersData[email] === gestorName) {
                    gestorEmail = email;
                    break;
                }
            }
            
            if (gestorEmail) {
                const prefixDb = gestorEmail.split('@')[0].toLowerCase();
                for (let excelEmail in window.retirosGlobalData) {
                    const prefixExcel = excelEmail.split('@')[0].toLowerCase();
                    if (prefixDb === prefixExcel || gestorEmail === excelEmail) {
                        stats = window.retirosGlobalData[excelEmail];
                        break;
                    }
                }
            }
            
            // Fallback: Emparejamiento por nombre y apellido (AUN SI NO HAY EMAIL)
            if (!stats && gestorName) {
                const parts = gestorName.toLowerCase().split(' ');
                const firstName = parts[0];
                const lastName = parts.length > 1 ? parts[1] : '';
                
                for (let excelEmail in window.retirosGlobalData) {
                    const eLower = excelEmail.toLowerCase();
                    if (eLower.includes(firstName)) {
                        if (lastName && lastName.length >= 3 && eLower.includes(lastName.substring(0,3))) {
                            stats = window.retirosGlobalData[excelEmail];
                            break;
                        } else if (lastName.length < 3) {
                            stats = window.retirosGlobalData[excelEmail];
                            break;
                        }
                    }
                }
            }
        }
        
        if (stats) {
            let finalStats = stats;
            if (stats.diario && periodo !== 'general') {
                finalStats = { totalAprobados: 0, totalRechazados: 0, montoProcesado: 0, minutosDemoraTotales: 0, retirosConTiempo: 0 };
                let targetDates = [];
                const getLocalYYYYMMDD = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                const getLocalMDYYYY = (d) => (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
                
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                const addDates = (d) => {
                    targetDates.push(getLocalYYYYMMDD(d));
                    targetDates.push(getLocalMDYYYY(d));
                };

                if (periodo === 'hoy') {
                    addDates(todayStart);
                } else if (periodo === 'ayer') {
                    const ayer = new Date(todayStart.getTime() - 86400000);
                    addDates(ayer);
                } else if (periodo === 'semanal') {
                    for(let i=0; i<7; i++){
                        addDates(new Date(todayStart.getTime() - (i * 86400000)));
                    }
                } else if (periodo === '30dias') {
                    for(let i=0; i<30; i++){
                        addDates(new Date(todayStart.getTime() - (i * 86400000)));
                    }
                } else if (periodo === 'mes') {
                    for(let i=1; i<=31; i++){
                        const dt = new Date(todayStart.getFullYear(), todayStart.getMonth(), i);
                        if (dt.getMonth() === todayStart.getMonth() && dt <= todayStart) {
                            addDates(dt);
                        }
                    }
                } else if (periodo === 'custom') {
                    const customDateStr = document.getElementById('kpiCustomDateInput').value;
                    if (customDateStr) {
                        targetDates.push(customDateStr);
                        // Also parse and add M/D/YYYY if possible
                        let d = new Date(customDateStr + 'T12:00:00');
                        if(!isNaN(d.getTime())) targetDates.push(getLocalMDYYYY(d));
                    }
                }
                
                for (let td of targetDates) {
                    if (stats.diario[td]) {
                        finalStats.totalAprobados += stats.diario[td].totalAprobados;
                        finalStats.totalRechazados += stats.diario[td].totalRechazados;
                        finalStats.montoProcesado += stats.diario[td].montoProcesado;
                        finalStats.minutosDemoraTotales += stats.diario[td].minutosDemoraTotales;
                        finalStats.retirosConTiempo += stats.diario[td].retirosConTiempo;
                    }
                }
            }

            if (cardPagados) cardPagados.textContent = finalStats.totalAprobados;
            if (cardRechazados) cardRechazados.textContent = finalStats.totalRechazados;
            if (cardMonto) {
                const formattedMonto = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(finalStats.montoProcesado);
                cardMonto.textContent = formattedMonto;
            }
            
            if (finalStats.retirosConTiempo > 0) {
                const avgDemoraMins = finalStats.minutosDemoraTotales / finalStats.retirosConTiempo;
                
                // Penalidad: si el promedio supera los 15 minutos, restar 1% por cada minuto extra (max 30% de penalidad)
                if (avgDemoraMins > 15) {
                    penalidadRetiros = Math.floor(avgDemoraMins - 15);
                    if (penalidadRetiros > 30) penalidadRetiros = 30; // Cap
                }
                
                if (cardRetiros) cardRetiros.style.display = 'flex';
                if (textPenalidad) textPenalidad.textContent = `-${penalidadRetiros}%`;
                if (textDemora) textDemora.textContent = `Promedio: ${Math.round(avgDemoraMins)} min / ${finalStats.retirosConTiempo} retiros`;
            } else {
                if (cardRetiros) cardRetiros.style.display = 'none';
            }
        } else {
            // Gestor no tiene data de retiros, mostrar 0
            if (cardPagados) cardPagados.textContent = "0";
            if (cardRechazados) cardRechazados.textContent = "0";
            if (cardMonto) cardMonto.textContent = "$0";
            if (cardRetiros) cardRetiros.style.display = 'none';
        }
    } else {
        // No hay JSON de retiros
        if (cardPagados) cardPagados.textContent = "0";
        if (cardRechazados) cardRechazados.textContent = "0";
        if (cardMonto) cardMonto.textContent = "$0";
        if (cardRetiros) cardRetiros.style.display = 'none';
    }
    
    let porcentajeRetiros = 100 - penalidadRetiros;
    if (porcentajeRetiros < 0) porcentajeRetiros = 0;
    
    // SIEMPRE mostrar las tarjetas de retiros base, independientemente de si hay datos (excluyendo la de penalidad que es dinámica)
    retirosCardsElements.forEach(el => el.style.display = 'flex');
    
    // Calcular promedio de horas y minutos
    let promedioHoras = 0;
    let promedioMinutosRestantes = 0;
    if (turnosValidosParaTiempo > 0) {
        const avgMinutosTotales = totalMinutosConectados / turnosValidosParaTiempo;
        promedioHoras = Math.floor(avgMinutosTotales / 60);
        promedioMinutosRestantes = Math.round(avgMinutosTotales % 60);
    }
    
    // Update DOM
    document.getElementById('kpiTotalFinalizadas').textContent = totalFinalizadas;
    document.getElementById('kpiTotalNoRealizadas').textContent = totalNoRealizadas;
    document.getElementById('kpiTotalPendientes').textContent = totalPendientes;
    document.getElementById('kpiTurnosAnalizados').textContent = turnosAnalizados;
    document.getElementById('kpiDuracionPromedio').textContent = turnosValidosParaTiempo > 0 ? `${promedioHoras}h ${promedioMinutosRestantes}m` : 'N/A';
    
    // Inactividad
    let inactividadHoras = Math.floor(totalInactividadMins / 60);
    let inactividadMinutos = Math.round(totalInactividadMins % 60);
    let inactividadStr = totalInactividadMins > 0 ? `${inactividadHoras}h ${inactividadMinutos}m` : '0h 0m';
    if(document.getElementById('kpiTiempoInactivo')) {
        document.getElementById('kpiTiempoInactivo').textContent = inactividadStr;
    }
    
    // Mostrar Bitácora integrada
    const cardBitacora = document.getElementById('kpiBitacoraInlineCard');
    const listBitacora = document.getElementById('kpiBitacoraInlineList');
    if (cardBitacora && listBitacora) {
        if (window.kpiBitacoraTexto && window.kpiBitacoraTexto.trim() !== '') {
            listBitacora.textContent = window.kpiBitacoraTexto;
            cardBitacora.style.display = 'flex';
        } else {
            cardBitacora.style.display = 'none';
        }
    }
    
    // Animar anillos independientes
    const animateRing = (ringId, textId, badgeId, percentage) => {
        const ring = document.getElementById(ringId);
        const textPercent = document.getElementById(textId);
        const badge = document.getElementById(badgeId);
        if(!ring || !textPercent || !badge) return;
        
        const circumference = 251.2;
        const offset = circumference - (percentage / 100) * circumference;
        
        ring.style.transition = 'none';
        ring.style.strokeDashoffset = circumference;
        
        setTimeout(() => {
            ring.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
            ring.style.strokeDashoffset = offset;
            textPercent.textContent = percentage + '%';
            
            if (percentage >= 90) {
                ring.style.stroke = 'var(--success)';
                badge.style.background = 'rgba(16, 185, 129, 0.2)';
                badge.style.color = 'var(--success)';
                badge.textContent = 'Excelente';
            } else if (percentage >= 75) {
                ring.style.stroke = 'var(--warning)';
                badge.style.background = 'rgba(245, 158, 11, 0.2)';
                badge.style.color = 'var(--warning)';
                badge.textContent = 'Aceptable';
            } else {
                ring.style.stroke = 'var(--danger)';
                badge.style.background = 'rgba(239, 68, 68, 0.2)';
                badge.style.color = 'var(--danger)';
                badge.textContent = 'Crítico';
            }
        }, 50);
    };

    animateRing('kpiScoreRingActividades', 'kpiScoreTextActividades', 'kpiVerdictBadgeActividades', porcentajeActividades);
    animateRing('kpiScoreRingConectividad', 'kpiScoreTextConectividad', 'kpiVerdictBadgeConectividad', porcentajeConectividad);
    animateRing('kpiScoreRingRetiros', 'kpiScoreTextRetiros', 'kpiVerdictBadgeRetiros', porcentajeRetiros);
    
    resultsContainer.style.display = 'flex';
}

// Modal de Detalle de Tareas (KPIs)
function openKpiTaskDetails(tipo) {
    const modal = document.getElementById('kpiTaskDetailsModal');
    const title = document.getElementById('kpiModalTitle');
    const icon = document.getElementById('kpiModalIcon');
    const list = document.getElementById('kpiModalTaskList');
    
    if (!window.kpiTaskLists) return;
    
    const tasks = window.kpiTaskLists[tipo] || [];
    
    // Configurar cabecera
    if (tipo === 'finalizadas') {
        title.textContent = 'Tareas Finalizadas';
        icon.className = 'bx bx-check-double';
        icon.style.color = 'var(--success)';
    } else if (tipo === 'no_realizadas') {
        title.textContent = 'Tareas No Realizadas';
        icon.className = 'bx bx-x-circle';
        icon.style.color = 'var(--danger)';
    } else if (tipo === 'pendientes') {
        title.textContent = 'Tareas Pendientes';
        icon.className = 'bx bx-time';
        icon.style.color = 'var(--warning)';
    }
    
    list.innerHTML = '';
    
    if (tasks.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay tareas en este estado.</div>';
    } else {
        tasks.forEach(t => {
            const tTypeColor = t.type === 'adicional' ? 'var(--warning)' : 'var(--accent-primary)';
            const tTypeBadge = `<span style="font-size: 10px; background: ${tTypeColor}20; color: ${tTypeColor}; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">${t.type === 'adicional' ? 'Adicional' : 'Set'}</span>`;
            
            list.innerHTML += `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); padding: 10px 15px; border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">
                            ${t.name}
                            ${tTypeBadge}
                        </div>
                        <div style="font-size: 11px; color: var(--text-secondary);">
                            <i class='bx bx-calendar'></i> ${t.date}
                        </div>
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary); background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 4px; border-left: 2px solid ${tTypeColor};">
                        <strong>Nota:</strong> ${t.observation}
                    </div>
                </div>
            `;
        });
    }
    
    modal.classList.add('active');
}

function closeKpiTaskDetails() {
    document.getElementById('kpiTaskDetailsModal').classList.remove('active');
}

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    preloadCronograma();
    loadRetirosData();
    // Iniciar Módulo de Comunicados
    initComunicadosListener();
    
    // Restaurar botones de pausas
    const btnLunch = document.getElementById('toggleLunchBtn');
    if (btnLunch && isLunchBreak) {
        btnLunch.innerHTML = "<i class='bx bx-check-circle'></i> Volver del Almuerzo";
        btnLunch.classList.remove('btn-outline');
        btnLunch.classList.add('btn-success');
        btnLunch.style.color = "white";
        btnLunch.style.borderColor = "transparent";
    }
    const btnBreak = document.getElementById('toggleBreakfastBtn');
    if (btnBreak && isBreakfastBreak) {
        btnBreak.innerHTML = "<i class='bx bx-check-circle'></i> Volver del Desayuno";
        btnBreak.classList.remove('btn-outline');
        btnBreak.classList.add('btn-warning');
        btnBreak.style.color = "white";
        btnBreak.style.borderColor = "transparent";
    }
    
    const periodoSelect = document.getElementById('kpiPeriodoSelect');
    if (periodoSelect) {
        periodoSelect.addEventListener('change', function(e) {
            const customInput = document.getElementById('kpiCustomDateInput');
            if (customInput) {
                customInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
            }
        });
    }
});

// Window clicks para cerrar modales
window.onclick = function(event) {
    const modalPermiso = document.getElementById('permisoModal');
    if (event.target == modalPermiso) {
        cerrarModalPermiso();
    }
    
    const taskDetailsModal = document.getElementById('kpiTaskDetailsModal');
    if (event.target == taskDetailsModal) {
        closeKpiTaskDetails();
    }
};

// Cerrar modales con la tecla Escape
window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const activeModals = document.querySelectorAll('.modal-overlay.active');
        activeModals.forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// --- MÓDULO DE COMUNICADOS ---
let globalComunicados = {};

function initComunicadosListener() {
    database.ref('announcements').on('value', snapshot => {
        globalComunicados = snapshot.val() || {};
        updateUnreadBadge();
        
        // Re-render views if they are open
        const viewGestor = document.getElementById('view-comunicados');
        if (viewGestor && viewGestor.style.display === 'block') {
            renderGestorComunicados();
        }
        
        const viewAdmin = document.getElementById('view-gestion-comunicados');
        if (viewAdmin && viewAdmin.style.display === 'block') {
            renderAdminComunicados();
        }
    });
}

function openNewComunicadoModal() {
    document.getElementById('comunicadoTitle').value = '';
    document.getElementById('comunicadoContent').innerHTML = '';
    document.getElementById('newComunicadoModal').classList.add('active');
}

async function saveNewComunicado() {
    const title = document.getElementById('comunicadoTitle').value.trim();
    const content = document.getElementById('comunicadoContent').innerHTML.trim();
    
    if (!title || !content) {
        alert("Por favor llena todos los campos.");
        return;
    }
    
    try {
        const newRef = database.ref('announcements').push();
        await newRef.set({
            title: title,
            content: content,
            date: new Date().toISOString(),
            author: currentUser.name || 'Admin',
            readBy: {}
        });
        
        alert("Comunicado publicado exitosamente.");
        closeModal('newComunicadoModal');
    } catch(e) {
        console.error(e);
        alert("Error al publicar.");
    }
}

function updateUnreadBadge() {
    if (!currentUser || currentUser.role === 'Admin' || currentUser.role === 'Supervisor') {
        const badge = document.getElementById('unreadAnnouncementsBadge');
        if (badge) badge.style.display = 'none';
        return;
    }
    
    let unreadCount = 0;
    const uid = firebase.auth().currentUser.uid;
    
    Object.keys(globalComunicados).forEach(key => {
        const c = globalComunicados[key];
        if (!c.readBy || !c.readBy[uid]) {
            unreadCount++;
        }
    });
    
    const badge = document.getElementById('unreadAnnouncementsBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function renderGestorComunicados() {
    const list = document.getElementById('gestorComunicadosList');
    if (!list) return;
    
    list.innerHTML = '';
    const keys = Object.keys(globalComunicados).sort((a,b) => {
        return new Date(globalComunicados[b].date) - new Date(globalComunicados[a].date);
    });
    
    if (keys.length === 0) {
        list.innerHTML = `<div class="glass-panel" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay comunicados activos.</div>`;
        return;
    }
    
    const uid = firebase.auth().currentUser.uid;
    
    keys.forEach(key => {
        const c = globalComunicados[key];
        const isRead = c.readBy && c.readBy[uid];
        const formattedDate = new Date(c.date).toLocaleString('es-CO');
        
        let actionsHtml = '';
        if (isRead) {
            actionsHtml = `<div style="color: var(--success); font-size: 13px; margin-top: 15px; font-weight: 500;"><i class='bx bx-check-double'></i> Leído el ${new Date(c.readBy[uid].readAt).toLocaleString('es-CO')}</div>`;
        } else {
            actionsHtml = `<button class="btn btn-primary" style="margin-top: 15px; width: 100%; max-width: 300px; background: var(--success); border-color: var(--success);" onclick="markComunicadoAsRead('${key}')"><i class='bx bx-check'></i> Marcar como Leído y Entendido</button>`;
        }
        
        list.innerHTML += `
            <div class="glass-panel" style="padding: 20px; border-left: 4px solid ${isRead ? 'var(--glass-border)' : 'var(--danger)'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <h3 style="color: ${isRead ? 'var(--text-primary)' : 'var(--danger)'}; margin: 0; font-size: 18px;">${c.title}</h3>
                    <span style="font-size: 11px; color: var(--text-secondary); background: rgba(0,0,0,0.1); padding: 3px 8px; border-radius: 10px;">${formattedDate} por ${c.author}</span>
                </div>
                <div class="rich-text" style="font-size: 14px; color: var(--text-secondary); margin-top: 10px; line-height: 1.5; overflow-wrap: break-word;">${c.content}</div>
                ${actionsHtml}
            </div>
        `;
    });
}

async function markComunicadoAsRead(id) {
    try {
        const uid = firebase.auth().currentUser.uid;
        await database.ref(`announcements/${id}/readBy/${uid}`).set({
            name: currentUser.name,
            readAt: new Date().toISOString()
        });
    } catch(e) {
        console.error(e);
        alert("Error al marcar como leído.");
    }
}

function renderAdminComunicados() {
    const tbody = document.getElementById('adminComunicadosTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const keys = Object.keys(globalComunicados).sort((a,b) => {
        return new Date(globalComunicados[b].date) - new Date(globalComunicados[a].date);
    });
    
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay comunicados creados.</td></tr>`;
        return;
    }
    
    keys.forEach(key => {
        const c = globalComunicados[key];
        const formattedDate = new Date(c.date).toLocaleString('es-CO');
        const readCount = c.readBy ? Object.keys(c.readBy).length : 0;
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-size: 13px;">${formattedDate}</td>
                <td style="padding: 12px; font-weight: 500;">
                    <a href="javascript:void(0)" onclick="viewComunicadoContent('${key}')" style="color: var(--accent-primary); text-decoration: none; cursor: pointer; transition: color 0.2s;" onmouseover="this.style.textDecoration='underline'; this.style.color='var(--text-primary)'" onmouseout="this.style.textDecoration='none'; this.style.color='var(--accent-primary)'">${c.title}</a>
                </td>
                <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">${c.author}</td>
                <td style="padding: 12px; text-align: center;"><span class="badge" style="background: var(--success);">${readCount} lecturas</span></td>
                <td style="padding: 12px; text-align: center;">
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" onclick="viewComunicadoContent('${key}')"><i class='bx bx-book-open'></i> Leer</button>
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px; margin-left: 5px;" onclick="viewComunicadoLecturas('${key}')"><i class='bx bx-user-check'></i> Lecturas</button>
                    <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px; margin-left: 5px;" onclick="deleteComunicado('${key}')"><i class='bx bx-trash'></i></button>
                </td>
            </tr>
        `;
    });
}

function viewComunicadoContent(id) {
    const c = globalComunicados[id];
    if (!c) return;
    
    document.getElementById('viewComunicadoContentTitle').innerText = c.title;
    document.getElementById('viewComunicadoContentAuthor').innerText = c.author;
    document.getElementById('viewComunicadoContentDate').innerText = new Date(c.date).toLocaleString('es-CO');
    document.getElementById('viewComunicadoContentBody').innerHTML = c.content;
    
    document.getElementById('viewComunicadoContentModal').classList.add('active');
}

async function viewComunicadoLecturas(id) {
    const c = globalComunicados[id];
    if (!c) return;
    
    document.getElementById('comunicadoLecturasModal').classList.add('active');
    const readList = document.getElementById('comunicadoReadList');
    const unreadList = document.getElementById('comunicadoUnreadList');
    
    readList.innerHTML = '';
    unreadList.innerHTML = '<li style="color: var(--text-secondary);">Cargando usuarios...</li>';
    
    // Poblar leídos
    const readers = c.readBy || {};
    const readerUids = Object.keys(readers).sort((a,b) => new Date(readers[b].readAt) - new Date(readers[a].readAt));
    
    const readNames = new Set();
    if (readerUids.length === 0) {
        readList.innerHTML = '<li style="color: var(--text-secondary); margin-bottom: 5px;">Nadie ha leído esto aún.</li>';
    } else {
        readerUids.forEach(uid => {
            const r = readers[uid];
            if (r.name) readNames.add(r.name.trim().toLowerCase());
            readList.innerHTML += `<li style="margin-bottom: 8px; border-bottom: 1px solid var(--glass-border); padding-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 500; font-size: 13px;">${r.name}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${new Date(r.readAt).toLocaleString('es-CO')}</div>
            </li>`;
        });
    }
    
    // Fetch all active gestores to find who hasn't read
    try {
        const snap = await database.ref('users').once('value');
        if (snap.exists()) {
            const allUsers = snap.val();
            unreadList.innerHTML = '';
            
            let unreadCount = 0;
            Object.keys(allUsers).forEach(uKey => {
                const u = allUsers[uKey];
                // Solo listamos como pendientes a los gestores aprobados
                if (u.approved === true && (u.role === 'Gestor' || u.role === undefined)) {
                    const uName = (u.name || '').trim().toLowerCase();
                    // Verificar que el UID no haya leído Y que el nombre no esté en la lista de los que ya leyeron (evita duplicados de cuentas)
                    if (!readers[uKey] && !readNames.has(uName)) {
                        unreadCount++;
                        unreadList.innerHTML += `<li style="margin-bottom: 8px; border-bottom: 1px solid var(--glass-border); padding-bottom: 5px;">
                            <div style="font-weight: 500; color: var(--danger); font-size: 13px;"><i class='bx bx-x'></i> ${u.name || 'Sin nombre'}</div>
                        </li>`;
                        // Añadimos el nombre al set para evitar imprimir al mismo usuario varias veces si tiene múltiples cuentas viejas
                        if (uName) readNames.add(uName);
                    }
                }
            });
            
            if (unreadCount === 0) {
                unreadList.innerHTML = '<li style="color: var(--success); margin-bottom: 5px; text-align: center; font-weight: 500;"><i class="bx bx-check-double"></i> ¡Todos han leído!</li>';
            }
        }
    } catch(e) {
        console.error(e);
        unreadList.innerHTML = '<li style="color: var(--danger);">Error al cargar usuarios.</li>';
    }
}

let pendingDeleteComunicadoId = null;

function deleteComunicado(id) {
    pendingDeleteComunicadoId = id;
    document.getElementById('confirmDeleteModal').classList.add('active');
}

document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
    if (!pendingDeleteComunicadoId) return;
    
    const btn = document.getElementById('confirmDeleteBtn');
    const prevText = btn.innerHTML;
    btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Eliminando...";
    btn.disabled = true;
    
    try {
        await database.ref('announcements/' + pendingDeleteComunicadoId).remove();
        closeModal('confirmDeleteModal');
    } catch(e) {
        console.error(e);
        alert("No se pudo eliminar.");
    } finally {
        btn.innerHTML = prevText;
        btn.disabled = false;
        pendingDeleteComunicadoId = null;
    }
});

// Login History Logic
async function openLoginHistoryModal() {
    const modal = document.getElementById('loginHistoryModal');
    const tbody = document.getElementById('loginHistoryTableBody');
    if (!modal || !tbody) return;
    
    modal.classList.add('active');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;"><i class="bx bx-loader-alt bx-spin"></i> Cargando historial...</td></tr>';
    
    try {
        const snapshot = await database.ref('login_logs').orderByChild('timestamp').limitToLast(100).once('value');
        const logs = snapshot.val();
        
        if (!logs) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No hay registros de inicio de sesión aún.</td></tr>';
            return;
        }
        
        // Convert to array and sort descending
        const logsArray = Object.keys(logs).map(k => logs[k]).sort((a, b) => b.timestamp - a.timestamp);
        
        tbody.innerHTML = '';
        logsArray.forEach(log => {
            const dateStr = new Date(log.timestamp).toLocaleString('es-CO');
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid var(--glass-border);">
                    <td style="padding: 10px; font-size: 13px;">${dateStr}</td>
                    <td style="padding: 10px; font-weight: 500;">${log.name}</td>
                    <td style="padding: 10px;"><span class="badge" style="background: rgba(59, 130, 246, 0.1); color: var(--accent-primary);">${log.role}</span></td>
                </tr>
            `;
        });
    } catch(e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--danger);">Error al cargar los registros.</td></tr>';
    }
}

window.loadLoginHistory = function() {
    const tbody = document.getElementById('loginHistoryTableBody');
    if(!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px;">Cargando historial de sesiones...</td></tr>';
    
    database.ref('login_logs').orderByChild('timestamp').limitToLast(100).once('value').then(snap => {
        const logs = snap.val();
        if(!logs) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--text-secondary);">No hay sesiones registradas aún.</td></tr>';
            return;
        }
        
        const logsArray = Object.keys(logs).map(k => logs[k]).sort((a, b) => b.timestamp - a.timestamp);
        
        let html = '';
        logsArray.forEach(log => {
            const dateObj = new Date(log.timestamp);
            const dateStr = dateObj.toLocaleDateString();
            const timeStr = dateObj.toLocaleTimeString();
            
            let logoutStr = '<span style="color: var(--success);"><i class="bx bx-radio-circle-marked bx-burst"></i> Sesión Activa</span>';
            if (log.logoutTime) {
                const outObj = new Date(log.logoutTime);
                logoutStr = `${outObj.toLocaleDateString()} ${outObj.toLocaleTimeString()}`;
            }
            
            html += `
                <tr>
                    <td style="font-weight: 500; font-size: 13px;">
                        <i class='bx bx-log-in' style="color: var(--accent-primary); margin-right: 5px;"></i>
                        ${dateStr} ${timeStr}
                    </td>
                    <td style="font-weight: 500; font-size: 13px; color: var(--text-secondary);">
                        <i class='bx bx-log-out' style="margin-right: 5px;"></i>
                        ${logoutStr}
                    </td>
                    <td style="font-size: 13px;">
                        <i class='bx bx-user' style="color: var(--text-secondary); margin-right: 5px;"></i>
                        ${log.name || log.email || 'Desconocido'}
                    </td>
                    <td>
                        <span class="badge ${log.role === 'Admin' || log.role === 'Supervisor' ? 'vacaciones-badge' : 'pending'}" style="font-size: 11px;">
                            ${log.role || 'Gestor'}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }).catch(err => {
        console.error("Error cargando el historial:", err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--danger);">Error al cargar el historial.</td></tr>';
    });
};
