
// ---- Adaptadores a RiskOps (paso 3.1) ----
// Las funciones de abajo son delegaciones: la lógica vive en src/ (RiskOps) y se conserva el nombre global
// porque index.html y js/tiempos.js las llaman. Sustituyen a las copias que había en este archivo (W-07 a W-14).
function currentAllTasksOrNull() { return typeof allTasks !== 'undefined' ? allTasks : null; }
function warnUnresolvedTaskName(message, key) { console.warn(message, key); }
function cronogramaFetchDependencies() { return { baseUrl: 'Cronograma de Tareas/', fetchImpl: fetch, xlsx: XLSX }; }

function appendFormSubmitCc(formData) {
    return RiskOps.formSubmit.appendFormSubmitCc(formData);
}

// XSS Sanitizer Helper
function escapeHTML(str) {
    return RiskOps.sanitization.escapeHTML(str);
}
window.escapeHTML = escapeHTML;

// Encode dynamic values before placing them inside single-quoted inline handlers.
// encodeURIComponent intentionally leaves apostrophes untouched, so encode them too.
function encodeInlineHandlerArg(value) {
    return RiskOps.sanitization.encodeInlineHandlerArg(value);
}

// W-55 (b): cierre de sesión. Borra TODAS las claves de sesión (las mismas que SESSION_STORAGE_KEYS en
// src/app/session.js); el tema (riskOps_theme) se conserva. Lista literal porque app.js es un script clásico.
const RISKOPS_SESSION_STORAGE_KEYS = ['riskOps_currentUser', 'riskOps_cache', 'riskOps_breakState', 'riskOps_timeline', 'riskOps_usersData'];
function clearRiskOpsSessionStorage() {
    RISKOPS_SESSION_STORAGE_KEYS.forEach((key) => {
        try { localStorage.removeItem(key); } catch (e) { /* almacenamiento no disponible: no bloquea la salida */ }
    });
}

function sanitizeAnnouncementHTML(value) {
    return RiskOps.sanitization.sanitizeAnnouncementHTML(value);
}
window.sanitizeAnnouncementHTML = sanitizeAnnouncementHTML;

// --- Comunicados Authorization (centralized capability checks) ---
// Single source of truth for who may publish/view-lecturas vs. delete
// announcements, so role checks aren't duplicated (and don't drift) across
// nav rendering, view rendering, and the action functions themselves.

function canPublishComunicados(role) {
    return RiskOps.announcementCapabilities.canPublishComunicados(role);
}

function canViewComunicadoLecturas(role) {
    return RiskOps.announcementCapabilities.canViewComunicadoLecturas(role);
}

function canDeleteComunicados(role) {
    return RiskOps.announcementCapabilities.canDeleteComunicados(role);
}

// Any of the three capabilities is enough to warrant seeing the "Gestión Comunicados"
// nav entry / view; delete itself is gated separately (canDeleteComunicados).
function canManageComunicados(role) {
    return RiskOps.announcementCapabilities.canManageComunicados(role);
}

window.canPublishComunicados = canPublishComunicados;
window.canViewComunicadoLecturas = canViewComunicadoLecturas;
window.canDeleteComunicados = canDeleteComunicados;
window.canManageComunicados = canManageComunicados;

// Auth Check
const currentUserObj = localStorage.getItem('riskOps_currentUser');
if (!currentUserObj && !window.location.href.includes('login.html')) {
    window.location.href = 'login.html';
}

let currentUser = null;
let currentTaskRef = null;
let activeSessionRef = null;

// Helper Functions for Custom Multi-Select Dropdowns
function setupCustomMultiSelect(containerId, optionsList, onChangeCallback) {
    return RiskOps.multiSelect.setupCustomMultiSelect(containerId, optionsList, onChangeCallback);
}

function getSelectedMultiSelectValues(containerId) {
    return RiskOps.multiSelect.getSelectedMultiSelectValues(containerId);
}

function resetCustomMultiSelect(containerId) {
    return RiskOps.multiSelect.resetCustomMultiSelect(containerId);
}

function setCustomMultiSelectValues(containerId, newValuesArray) {
    return RiskOps.multiSelect.setCustomMultiSelectValues(containerId, newValuesArray);
}

// --- INACTIVITY & LUNCH TRACKING GLOBALS ---
let lastLocalActivityTimestamp = Date.now();
let lastSyncLoopTimestamp = Date.now();

let isLunchBreak = false;
let lunchStartTime = null;
let totalLunchTimeMs = 0;
let isBreakfastBreak = false;
let breakfastStartTime = null;
let totalBreakfastTimeMs = 0;
let isSplitShiftBreak = false;
let splitShiftStartTime = null;
let totalSplitShiftTimeMs = 0;
let globalIdleState = false; // Tracks if the OS/PC is idle or locked via IdleDetector
let idleDetectorStartPromise = null;
let activeIdleDetector = null;
window.idleDetectorGranted = false;
window.idleDetectorStarted = false;

// [LAB-INTEGRACION:INICIO]
// Puente entre app.js (estado global de pausas) y RiskOps.shiftController (src/controllers/shift-controller.js).
function __labCurrentUid() {
    try {
        const u = JSON.parse(localStorage.getItem('riskOps_currentUser'));
        return u && u.uid ? u.uid : null;
    } catch (e) { return null; }
}

function __labSetSyncWarning(failed) {
    try {
        let el = document.getElementById('riskOpsSyncWarning');
        if (!el && failed) {
            el = document.createElement('div');
            el.id = 'riskOpsSyncWarning';
            el.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:99999;background:#b45309;color:#fff;padding:8px 12px;border-radius:8px;font-size:13px;';
            el.textContent = 'Sin sincronizar con el supervisor. Reintentando...';
            document.body.appendChild(el);
        }
        if (el) el.style.display = failed ? 'block' : 'none';
    } catch (e) {}
}

let __labShiftController = null;
function __shiftController() {
    if (__labShiftController) return __labShiftController;
    __labShiftController = RiskOps.shiftController.createShiftController({
        getUser: () => currentUser,
        getState: () => ({
            isLunchBreak, lunchStartTime, totalLunchTimeMs,
            isBreakfastBreak, breakfastStartTime, totalBreakfastTimeMs,
            isSplitShiftBreak, splitShiftStartTime, totalSplitShiftTimeMs
        }),
        applyState: (f) => {
            isLunchBreak = f.isLunchBreak; lunchStartTime = f.lunchStartTime; totalLunchTimeMs = f.totalLunchTimeMs;
            isBreakfastBreak = f.isBreakfastBreak; breakfastStartTime = f.breakfastStartTime; totalBreakfastTimeMs = f.totalBreakfastTimeMs;
            isSplitShiftBreak = f.isSplitShiftBreak; splitShiftStartTime = f.splitShiftStartTime; totalSplitShiftTimeMs = f.totalSplitShiftTimeMs;
        },
        reloadState: () => loadBreakState(),
        setUserFlag: (v) => {
            currentUser.hasSplitShift = v;
            localStorage.setItem('riskOps_currentUser', JSON.stringify(currentUser));
        },
        now: () => Date.now(),
        timeline: { push: (type, action) => pushTimelineEvent(type, action) },
        storage: { saveBreakState: () => saveBreakState() },
        sync: () => syncActiveSessionToFirebase(),
        onActivity: () => updateActivity(),
        ui: {
            getButton: (id) => document.getElementById(id),
            setSplitShiftVisible: (visible) => {
                const b = document.getElementById('toggleSplitShiftBtn');
                if (b) b.style.display = visible ? 'flex' : 'none';
            },
            notifyBlocked: (reason, message) => { if (message) alert(message); },
            setSyncWarning: (failed) => __labSetSyncWarning(failed),
            refreshSidebar: () => { if (typeof setupSidebar === 'function') setupSidebar(); }
        },
        logger: console
    });
    return __labShiftController;
}
// [LAB-INTEGRACION:FIN]

function saveBreakState() {
    // [LAB-INTEGRACION] el estado se guarda con ownerUid (RiskOps.breakStateOwnership)
    localStorage.setItem('riskOps_breakState', JSON.stringify(RiskOps.breakStateOwnership.serializeBreakState({
        isLunchBreak, lunchStartTime, totalLunchTimeMs,
        isBreakfastBreak, breakfastStartTime, totalBreakfastTimeMs,
        isSplitShiftBreak, splitShiftStartTime, totalSplitShiftTimeMs
    }, __labCurrentUid())));
}

function loadBreakState() {
    try {
        // [LAB-INTEGRACION] un estado de pausas guardado por OTRO usuario se descarta (no se hereda)
        const restored = RiskOps.breakStateOwnership.restoreBreakState(localStorage.getItem('riskOps_breakState'), __labCurrentUid());
        if (restored.status === RiskOps.breakStateOwnership.BREAK_STATE_RESTORE.OTHER_OWNER) {
            localStorage.removeItem('riskOps_breakState');
        } else if (!restored.discarded && restored.status !== RiskOps.breakStateOwnership.BREAK_STATE_RESTORE.EMPTY) {
            const parsed = restored.state;
            isLunchBreak = parsed.isLunchBreak || false;
            lunchStartTime = parsed.lunchStartTime || null;
            totalLunchTimeMs = parsed.totalLunchTimeMs || 0;
            isBreakfastBreak = parsed.isBreakfastBreak || false;
            breakfastStartTime = parsed.breakfastStartTime || null;
            totalBreakfastTimeMs = parsed.totalBreakfastTimeMs || 0;
            isSplitShiftBreak = parsed.isSplitShiftBreak || false;
            splitShiftStartTime = parsed.splitShiftStartTime || null;
            totalSplitShiftTimeMs = parsed.totalSplitShiftTimeMs || 0;
        }
    } catch(e) {}
}

loadBreakState();

window.addEventListener('storage', (e) => {
    if (e.key === 'riskOps_breakState') {
        // [LAB-INTEGRACION] recarga el estado Y repinta botones/visibilidad (antes solo actualizaba variables)
        __shiftController().handleStorageChange(e.key);
    }
});

let shiftTimeline = [];
let localStatus = 'En Línea';

try {
    const savedTimeline = localStorage.getItem('riskOps_timeline');
    if (savedTimeline) {
        shiftTimeline = JSON.parse(savedTimeline);
        let changed = false;
        
        // Limpiador automático: Eliminar eventos de Inactividad que se crucen con Almuerzo o Desayuno o Pausa de Turno
        const breaks = shiftTimeline.filter(e => e.type === 'Almuerzo' || e.type === 'Desayuno' || e.type === 'Pausa de Turno');
        const originalLength = shiftTimeline.length;
        shiftTimeline = shiftTimeline.filter(e => {
            if (e.type !== 'Inactividad') return true;
            let eStart = e.start;
            let eEnd = e.end || Date.now();
            // Ignorar inactividades inválidas o duraciones menores a 30 segundos
            if (eEnd - eStart < 30000) return false;
            let overlaps = breaks.some(b => {
                let bStart = b.start;
                let bEnd = b.end || Date.now();
                return (eStart < bEnd && eEnd > bStart);
            });
            return !overlaps;
        });
        if (shiftTimeline.length !== originalLength) changed = true;

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
    shiftTimeline = RiskOps.timelineService.pushTimelineEvent(shiftTimeline, type, action);
    localStorage.setItem('riskOps_timeline', JSON.stringify(shiftTimeline));
}

let screenLockTimer = null;

function setIdleDetectorWarning(visible, message = '') {
    const warningBanner = document.getElementById('idleDetectorWarning');
    const warningText = document.getElementById('idleDetectorWarningText');
    if (warningText && message) warningText.textContent = message;
    if (warningBanner) warningBanner.style.display = visible ? 'flex' : 'none';
}

async function checkAndStartIdleDetector() {
    if (!('IdleDetector' in window)) {
        setIdleDetectorWarning(true, 'Tu navegador no admite el permiso de inactividad. Esto no impide finalizar el turno.');
        return false;
    }

    try {
        const status = await navigator.permissions.query({ name: 'idle-detection' });
        if (status.state === 'granted') {
            const started = await startIdleDetectorLogic();
            window.idleDetectorGranted = started;
            if (!started) {
                setIdleDetectorWarning(true, 'El permiso está otorgado, pero el detector de inactividad no pudo iniciarse. Usa el botón para reintentar.');
            }
            return started;
        }
        setIdleDetectorWarning(true, 'Permiso de inactividad pendiente o denegado. RiskOps no podrá registrar automáticamente cuando bloquees la pantalla. Esto no impide finalizar el turno.');
    } catch (e) {
        console.error('Permission query error:', e);
        setIdleDetectorWarning(true, 'No fue posible verificar el permiso de inactividad. Esto no impide finalizar el turno.');
    }
    return false;
}

async function requestIdlePermission() {
    if (!('IdleDetector' in window)) {
        setIdleDetectorWarning(true, 'Tu navegador no admite el permiso de inactividad. Esto no impide finalizar el turno.');
        return false;
    }

    try {
        const state = await IdleDetector.requestPermission();
        if (state === 'granted') {
            const started = await startIdleDetectorLogic();
            window.idleDetectorGranted = started;
            if (!started) {
                setIdleDetectorWarning(true, 'El permiso fue otorgado, pero el detector de inactividad no pudo iniciarse. Esto no impide finalizar el turno.');
            }
            return started;
        }
        window.idleDetectorGranted = false;
        setIdleDetectorWarning(true, 'Permiso de inactividad denegado. Esto no impide finalizar el turno.');
    } catch (e) {
        console.error('Request permission error:', e);
        window.idleDetectorGranted = false;
        setIdleDetectorWarning(true, 'No fue posible activar el permiso de inactividad. Esto no impide finalizar el turno.');
    }
    return false;
}

async function startIdleDetectorLogic() {
    if (window.idleDetectorStarted && activeIdleDetector) return true;
    if (idleDetectorStartPromise) return idleDetectorStartPromise;

    idleDetectorStartPromise = (async () => {
        try {
            const idleDetector = new IdleDetector();
            idleDetector.addEventListener('change', () => {
                const isLocked = idleDetector.screenState === 'locked';
                const isIdle = idleDetector.userState === 'idle';

                if (isLocked) {
                    if (!screenLockTimer) {
                        screenLockTimer = setTimeout(() => {
                            globalIdleState = true;
                            applyIdleStateChange();
                        }, 10000);
                    }
                } else if (isIdle) {
                    globalIdleState = true;
                    applyIdleStateChange();
                } else {
                    if (screenLockTimer) {
                        clearTimeout(screenLockTimer);
                        screenLockTimer = null;
                    }
                    globalIdleState = false;
                    applyIdleStateChange();
                }
            });

            await idleDetector.start({ threshold: RiskOps.constants.NATIVE_IDLE_THRESHOLD_MS });
            activeIdleDetector = idleDetector;
            window.idleDetectorStarted = true;
            window.idleDetectorGranted = true;
            setIdleDetectorWarning(false);
            return true;
        } catch (e) {
            console.error('IdleDetector start failed:', e);
            activeIdleDetector = null;
            window.idleDetectorStarted = false;
            window.idleDetectorGranted = false;
            return false;
        } finally {
            idleDetectorStartPromise = null;
        }
    })();

    return idleDetectorStartPromise;
}

// [LAB-INTEGRACION:ACTIVIDAD-INICIO]
// [LAB-INTEGRACION] Detector de inactividad: RiskOps.shiftActivityController (src/controllers/shift-activity-controller.js)
// Singleton lazy — se crea la primera vez que cualquiera de las tres funciones lo llama.
let __labShiftActivityCtrl = null;
function __shiftActivityController() {
    if (__labShiftActivityCtrl) return __labShiftActivityCtrl;
    __labShiftActivityCtrl = RiskOps.shiftActivityController.createShiftActivityController({
        getUser: () => currentUser,
        isOnBreak: () => Boolean(isLunchBreak || isBreakfastBreak || isSplitShiftBreak),
        setUserStatus: (uid, status) => {
            if (typeof database !== 'undefined') database.ref('users/' + uid + '/status').set(status);
        },
        pushTimelineEvent: (type, action) => {
            // En el scope de app.js (a diferencia de bootstrap.js) esta función sí está disponible.
            if (typeof pushTimelineEvent === 'function') pushTimelineEvent(type, action);
        },
        onStatusDisplay: () => {
            if (typeof updateStatusDisplay === 'function') updateStatusDisplay();
        },
        syncSession: () => {
            if (typeof syncActiveSessionToFirebase === 'function') syncActiveSessionToFirebase();
        },
        now: Date.now,
        logger: console,
    });
    return __labShiftActivityCtrl;
}
// [LAB-INTEGRACION:ACTIVIDAD-FIN]

function applyIdleStateChange() {
    // [LAB-INTEGRACION] delega en RiskOps.shiftActivityController
    // Conserva lastLocalActivityTimestamp cuando vuelve a Activo (igual que app.js original)
    if (!globalIdleState) lastLocalActivityTimestamp = Date.now();
    __shiftActivityController().onIdleChange(globalIdleState);
}

checkAndStartIdleDetector();

window.requestIdlePermissionManual = async function() {
    const enableButton = document.querySelector('#idleDetectorWarning button');
    if (enableButton) enableButton.disabled = true;
    try {
        const started = await requestIdlePermission();
        if (started) {
            alert("¡Permiso otorgado! RiskOps ahora podrá registrar tu inactividad correctamente.");
        } else {
            alert("El permiso no pudo activarse. Revisa los permisos del sitio en el navegador. Esto no impide finalizar tu turno.");
        }
    } finally {
        if (enableButton) enableButton.disabled = false;
    }
};

// Activity listeners
function shouldApplyDomIdleFallback(now = Date.now()) {
    if (window.idleDetectorGranted) return false;
    if (document.visibilityState !== 'visible') return false;
    if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false;
    return now - lastLocalActivityTimestamp > RiskOps.constants.DOM_IDLE_FALLBACK_THRESHOLD_MS;
}

function updateActivity() {
    // [LAB-INTEGRACION] delega en RiskOps.shiftActivityController
    lastLocalActivityTimestamp = Date.now(); // mantiene la variable para shouldApplyDomIdleFallback
    if (typeof globalIdleState !== 'undefined') globalIdleState = false;
    __shiftActivityController().onActivity();
}

document.addEventListener('mousemove', updateActivity);
document.addEventListener('keydown', updateActivity);
document.addEventListener('click', updateActivity);
document.addEventListener('scroll', updateActivity);
document.addEventListener('visibilitychange', updateActivity);
window.addEventListener('focus', updateActivity);

// Fast checker loop to apply 10s inactivity exactly on time — [LAB-INTEGRACION]
setInterval(() => {
    // [LAB-INTEGRACION] los guards de rol, pausa y estado los maneja el controlador internamente
    if (shouldApplyDomIdleFallback()) {
        __shiftActivityController().onIdleChange(true);
    }
}, 1000);

try {
    currentUser = currentUserObj ? JSON.parse(currentUserObj) : null;
    if (currentUser) {
        // Validar si la sesión guardada en localStorage es de un día anterior para Gestores
        if (currentUser.role === 'Gestor' && currentUser.loginTime) {
            const loginD = new Date(currentUser.loginTime);
            const nowD = new Date();
            const isSameDay = !isNaN(loginD.getTime()) &&
                              loginD.getDate() === nowD.getDate() &&
                              loginD.getMonth() === nowD.getMonth() &&
                              loginD.getFullYear() === nowD.getFullYear();
            if (!isSameDay) {
                clearRiskOpsSessionStorage();
                currentUser = null;
                window.location.href = 'login.html';
            }
        }
        if (currentUser && !currentUser.status) currentUser.status = 'Activo';
        // Mobile / Role handling
        if (window.innerWidth <= 768) {
            if (['Admin', 'Supervisor'].includes(currentUser.role)) {
                // Admin/Supervisor: hide mobile blocker and allow horizontal scroll
                const mob = document.getElementById('mobileBlocker');
                if (mob) mob.style.display = 'none';
                document.documentElement.style.overflowX = 'auto';
                document.body.style.minWidth = '1200px';
                document.body.style.overflowX = 'auto';
            } else {
                // Gestor: enforce mobile block
                const enforceMobileBlock = () => {
                    const mob = document.getElementById('mobileBlocker');
                    if (mob) mob.style.display = 'flex';
                    const app = document.querySelector('.app-container');
                    if (app) app.style.display = 'none';
                };
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', enforceMobileBlock);
                } else {
                    enforceMobileBlock();
                }
            }
        }
        // (Old visibilitychange logic removed, handled by new interval and mouse events)

        if (currentUser.loginLogId) {
            // Eliminar cualquier falso logoutTime que se haya generado si el usuario simplemente refrescó la página (F5) o perdió red temporalmente
            database.ref(`login_logs/${currentUser.loginLogId}/logoutTime`).remove();
            
            database.ref(`login_logs/${currentUser.loginLogId}`).onDisconnect().update({
                logoutTime: firebase.database.ServerValue.TIMESTAMP
            });
        }
        if (currentUser.uid && currentUser.role === 'Gestor') {
            // We removed the aggressive onDisconnect hook because it was triggering falsely when Chrome paused the background tab
            // The admin dashboard's 2-minute lastActive timeout serves as a perfect fallback if the user actually closes the tab
            
            // Listen for hasSplitShift changes in real-time
            database.ref(`users/${currentUser.uid}/hasSplitShift`).on('value', snap => {
                const newVal = snap.val() === true;
                // [LAB-INTEGRACION] si se revoca con la pausa en curso, "Retomar Turno" sigue visible
                __shiftController().handleFlagChange(newVal);
            });

        }
    }
    

    
} catch(e) {
    clearRiskOpsSessionStorage();
    window.location.href = 'login.html';
}
let globalScheduleRows = null;
let globalScheduleBlocks = null;
// Helper to remove accents and normalize names for comparison and file paths
function normalizeName(name) {
    return RiskOps.normalize.normalizeName(name);
}

// Robust comparison to prevent greedy matching across similar names and support both parameter orders
function namesMatch(name1, name2) {
    return RiskOps.normalize.namesMatch(name1, name2);
}

// Helpers for date calculations in schedules

function getShiftCategory(shiftText) {
    return RiskOps.scheduleParser.getShiftCategory(shiftText);
}

function taskNamesMatch(cronTask, masterTask) {
    return RiskOps.normalize.taskNamesMatch(cronTask, masterTask);
}

function setNamesMatch(set1, set2) {
    return RiskOps.normalize.setNamesMatch(set1, set2);
}

let globalCronogramaData = null;
async function preloadCronograma() {
    try {
        await RiskOps.cronogramParser.preloadCronograma({
            targetDate: new Date(),
            fetchDependencies: cronogramaFetchDependencies(),
            onLoaded: (rows) => {
                globalCronogramaData = rows;
                // Re-render del monitoreo por si cargó antes de que terminara la carga (app.js original)
                const viewMonitoreo = document.getElementById('view-monitoreo');
                if (viewMonitoreo && viewMonitoreo.style.display !== 'none' && typeof renderActiveSessionsDashboard === 'function') {
                    renderActiveSessionsDashboard();
                }
            }
        });
    } catch (e) {
        console.error("preloadCronograma error", e);
    }
}

function getAssignedTasksForGestor(gestorName, shiftText) {
    if (!globalCronogramaData) return [];
    return RiskOps.cronogramParser.getAssignedTasksForGestor(gestorName, shiftText, globalCronogramaData, new Date());
}

let gestorCronogramaAssignments = null;

async function loadCronogramaAssignments(gestorName, gestorShift) {
    try {
        gestorCronogramaAssignments = await RiskOps.cronogramParser.loadCronogramaAssignments(gestorName, gestorShift, {
            targetDate: new Date(),
            fetchDependencies: cronogramaFetchDependencies()
        });
        console.log("Cargadas asignaciones de cronograma para " + gestorName + ":", gestorCronogramaAssignments);
    } catch (e) {
        console.error("Error al cargar Cronograma de Tareas:", e);
        gestorCronogramaAssignments = [];
    }
}

function getShiftForDate(rows, allScheduleBlocks, gestorName, date) {
    return RiskOps.scheduleService.getShiftForDate(rows, allScheduleBlocks, gestorName, date);
}

// Mapeo de URLs para documentos (especialmente videos pesados alojados en Google Drive)
const privateGitHubDocs = {
  "Guia Jira EGT - Proveedor de Casino.pdf": "https://virtualsoftserv.sharepoint.com/:b:/s/GestindeRiesgo/IQAN4F3bHU1fQLV0q-zHiZ22AcaHMxxApoL7T_v7J1fTfyU?e=msaPhD",
  "Instructivo de revisión de apuestas casino.pdf": "https://github.com/RiesgoVirtualsoft/riskmanager-internal-docs/blob/main/Procedimientos/Instructivo%20de%20revisi%C3%B3n%20de%20apuestas%20casino.pdf",
  "Instructivo de validación de GGR Casino.pdf": "https://github.com/RiesgoVirtualsoft/riskmanager-internal-docs/blob/main/Procedimientos/Instructivo%20de%20validaci%C3%B3n%20de%20GGR%20Casino.pdf",
  "Política Procedimiento De Aprobación De Retiros.pdf": "https://github.com/RiesgoVirtualsoft/riskmanager-internal-docs/blob/main/Procedimientos/Pol%C3%ADtica%20Procedimiento%20De%20Aprobaci%C3%B3n%20De%20Retiros.pdf",
  "Procedimiento Identificación de jineteo.pdf": "https://github.com/RiesgoVirtualsoft/riskmanager-internal-docs/blob/main/Procedimientos/Procedimiento%20Identificaci%C3%B3n%20de%20jineteo.pdf",
  "Proceso de Eliminación de Cuentas - Implementaciones.pdf": "https://github.com/RiesgoVirtualsoft/riskmanager-internal-docs/blob/main/Procedimientos/Proceso%20de%20Eliminaci%C3%B3n%20de%20Cuentas%20-%20Implementaciones.pdf",
  "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf": "https://github.com/RiesgoVirtualsoft/riskmanager-internal-docs/blob/main/Procedimientos/VALIDACI%C3%93N%20DE%20ABUSO%20DE%20BONOS%20EN%20CAMPA%C3%91AS%20DE%20CRM.pdf"
};

const documentUrls = {
    "Revisión de Eventos Deportivos.mp4": "https://drive.google.com/file/d/1UqccsnUwTG6tgPcDYdUeLnf9XqvGzSoc/view?usp=sharing",
    "Revisión de Eventos.mp4": "https://drive.google.com/file/d/1SB9ePi1EOJU05hzOsxOyl7BeNvCN1hOh/view?usp=sharing",
    "Validación SEON.mp4": "https://drive.google.com/file/d/1JFf5basGD0gmrAVIy5AlMK1DBHYgE6JC/view?usp=sharing"
};

function getDocUrl(fileName) {
    return RiskOps.docLinks.getDocUrl(fileName);
}

const privateTeamsManuals = {
    "3oaks.pdf": "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQDKFNjEjbkHRqwX17cHrcuQAca3E58JknfNg1voWyPmYlg?e=beWE2e",
    "Airdice.pdf": "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQAOz1vWcvgbQYTDxPDwsJj3AWV0PHfqSKOKpe9ZpXsdHXE?e=tqWW4B",
    "Amigogaming":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQBy_TFBmiXtRIRBLM17t1GLAbpTqwvREudyaj3svco7E88?e=KhePZM",
    "Amusnet":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQCBJoKWY5FfS7etdPZfnxzpAflSu1BD8XqdMI2_7uBIsPg?e=Xd2Gvv",
    "Aviatrix":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQBfvgW5WaX6TII45Petp95PAa5POqG8BQzWcy9yo92KkpI?e=TWSCB42",
    "Belatra":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQBfvgW5WaX6TII45Petp95PAa5POqG8BQzWcy9yo92KkpI?e=TWSCB4",
    "Egt":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQBfvgW5WaX6TII45Petp95PAa5POqG8BQzWcy9yo92KkpI?e=TWSCB4",
    "Evolution":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQDlFklX__OXRr5D7HHkhTxNAUA5QCL87QdDe3u7ngX-rUg?e=BtCIFL",
    "Mancala":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQASeOCMQcuoR4um2ha_bUcsAVPNezVck9cXaS30gC5JYik?e=HQDduM",
    "Manual":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQAlqJvOPdb1Q5yLeAK5hSpHAeGml7SGGGhPtHj52ExkWJA?e=D821Dz",
    "Pariplay":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQC_VU-AHEJhRKGK8Qfw1Hh2AQSzWxI4FWDT3AYovt01TaE?e=VOJ7nx",
    "playnGo":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQCC_qzPuTOXQqcoqika6LLrAfM9yZKteZJ0kMPAoY9e3fw?e=RZuKKd",
    "PlaytechLive":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQBNmdba5xoAS6gdkPxkpJmdAZyiMaIgRMITPVl17kTxxNk?e=Cehg9s",
    "Pragmatic":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQAt0TYGB8kkQ7Du3JNnd9XfAe69Mxr5Yga2S_AVlZKUsoo?e=yz932I",
    "PragmaticplaySlot":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQBed0oHqboZRabYqQnGJMxUATLlSdPshzsD7pnAsl8JxdM?e=wIyTFp",
    "Redrakegaming":"https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQCmcIAXj_tLRZKJx2dpTMyZAQP18AdXeKvHLc1PtnVBhd4?e=e6ltHs",
};

function getManualUrl(fileName) {
    return RiskOps.docLinks.getManualUrl(fileName);
}

let taskStateCache = {};
try {
    const cached = localStorage.getItem('riskOps_cache');
    if(cached) taskStateCache = JSON.parse(cached);
} catch(e) {}

let currentActiveTaskId = null;

// ID pendiente de confirmación para la tarea adicional en curso en el modal
// "Añadir Tarea Adicional". Se conserva entre reintentos fallidos (para no
// duplicar la entrada) y se reinicia cada vez que el modal se abre de nuevo.
let pendingExtraTaskId = null;
let isSavingExtraTask = false;

// [LAB-INTEGRACION] Puente app.js -> RiskOps (corte "tareas"): controladores creados la primera vez que se usan.
// Todo el estado (taskStateCache, allTasks, currentUser, ...) sigue siendo de app.js y se lee/escribe por getters/setters.
let __labTaskRepository = null;
function __tareasRepo() {
    if (__labTaskRepository) return __labTaskRepository;
    __labTaskRepository = RiskOps.taskRepository.createTaskRepository({
        database: database,
        now: () => Date.now(),
        saveCache: (cache) => localStorage.setItem('riskOps_cache', JSON.stringify(cache)),
        logger: console
    });
    return __labTaskRepository;
}

let __labTaskWorkspace = null;
function __tareasWorkspace() {
    if (__labTaskWorkspace) return __labTaskWorkspace;
    __labTaskWorkspace = RiskOps.taskController.createTaskWorkspaceController({
        doc: document,
        getUser: () => currentUser,
        getTaskCache: () => taskStateCache,
        getAllTasks: () => allTasks,
        setActiveTaskId: (id) => { currentActiveTaskId = id; },
        setSelectedTask: (task) => { currentSelectedTask = task; },
        getDocUrl: (fileName) => getDocUrl(fileName),
        syncActiveSession: () => syncActiveSessionToFirebase(),
        escape: (value) => escapeHTML(value),
        encodeArg: (value) => encodeInlineHandlerArg(value),
        newDate: () => new Date()
    });
    return __labTaskWorkspace;
}

let __labTaskRecovery = null;
function __tareasRecovery() {
    if (__labTaskRecovery) return __labTaskRecovery;
    __labTaskRecovery = RiskOps.taskController.createTaskRecoveryController({
        repository: __tareasRepo(),
        getTaskCache: () => taskStateCache,
        setTaskCache: (cache) => { taskStateCache = cache; },
        saveTaskCache: (cache) => localStorage.setItem('riskOps_cache', JSON.stringify(cache)),
        getAuthUser: () => firebase.auth().currentUser,
        alert: (message) => alert(message),
        logger: console
    });
    return __labTaskRecovery;
}

let __labTaskLoaders = null;
function __tareasLoaders() {
    if (__labTaskLoaders) return __labTaskLoaders;
    __labTaskLoaders = RiskOps.taskLoadersController.createTaskLoadersController({
        fetchFn: (url) => fetch(url),
        XLSX: XLSX,
        doc: document,
        now: () => Date.now(),
        newDate: () => new Date(),
        getUser: () => currentUser,
        persistUser: (user) => localStorage.setItem('riskOps_currentUser', JSON.stringify(user)),
        getScheduleRows: () => globalScheduleRows,
        getScheduleBlocks: () => globalScheduleBlocks,
        setSchedule: (rows, blocks) => { globalScheduleRows = rows; globalScheduleBlocks = blocks; },
        getShiftForDate: (rows, blocks, name, date) => getShiftForDate(rows, blocks, name, date),
        normalizeName: (name) => normalizeName(name),
        namesMatch: (a, b) => namesMatch(a, b),
        taskNamesMatch: (a, b) => taskNamesMatch(a, b),
        setNamesMatch: (a, b) => setNamesMatch(a, b),
        escape: (value) => escapeHTML(value),
        encodeArg: (value) => encodeInlineHandlerArg(value),
        multiSelect: {
            setup: (id, options, onChange) => setupCustomMultiSelect(id, options, onChange),
            getValues: (id) => getSelectedMultiSelectValues(id)
        },
        loadCronogramaAssignments: (name, shift) => loadCronogramaAssignments(name, shift),
        getCronogramaAssignments: () => gestorCronogramaAssignments,
        getTaskCache: () => taskStateCache,
        saveTaskCache: (cache) => localStorage.setItem('riskOps_cache', JSON.stringify(cache)),
        repository: __tareasRepo(),
        setAllTasks: (tasks) => { allTasks = tasks; },
        renderTree: (tasksBySet) => renderTree(tasksBySet),
        syncActiveSession: () => syncActiveSessionToFirebase(),
        database: database,
        getAuthUid: () => { const u = firebase.auth().currentUser; return u && u.uid; },
        alert: (message) => alert(message),
        logger: console
    });
    return __labTaskLoaders;
}

// Live Clock Logic — [LAB-INTEGRACION] delega en RiskOps.clockFormat
function updateClock() {
    const clockElement = document.getElementById('liveClock');
    if (!clockElement) return;

    clockElement.textContent = RiskOps.clockFormat.formatClockTime(new Date());
}

// Update clock every second
setInterval(updateClock, 1000);
updateClock(); // Initial call

// Data source real
let allTasks = [];
let currentSelectedTask = null;

// Initialize Excel fetching
async function loadExcelTasks() { return __tareasLoaders().loadExcelTasks(); } // [LAB-INTEGRACION] RiskOps.taskLoadersController

// Initializar parseo del Horario Personal
async function loadSchedule() { return __tareasLoaders().loadSchedule(); } // [LAB-INTEGRACION] RiskOps.taskLoadersController

function loadTeletrabajo() { return __tareasLoaders().loadTeletrabajo(); } // [LAB-INTEGRACION] RiskOps.taskLoadersController

async function loadPermisos() { return __tareasLoaders().loadPermisos(); } // [LAB-INTEGRACION] RiskOps.taskLoadersController (allLoadedPermissions vive dentro del controlador)

// Modal de detalle completo de permiso
window.openPermisoDetailModal = async function(fb_id) { return __tareasLoaders().openPermisoDetailModal(fb_id); }; // [LAB-INTEGRACION] RiskOps.taskLoadersController

function renderTree(tasksBySet) { return __tareasWorkspace().renderTree(tasksBySet); } // [LAB-INTEGRACION] RiskOps.taskController

// --- Identidad canónica y nombre visible de tareas normales ---------------
// Los IDs de tareas normales pueden llegar como number (loadExcelTasks():
// row.id = idx) o como string (decodeURIComponent() del onclick serializado
// por renderTree()). Comparar ambos con === sin normalizar produce falsos
// negativos (0 !== "0") que dejan la selección de tarea sin resolver.
// canonicalTaskId() es el único punto de conversión: se usa para
// currentActiveTaskId, la llave de taskStateCache, y toda comparación de
// identidad de tarea normal en selectTask()/guardado/Monitoreo. Nunca se
// compara con == (igualdad débil).
function canonicalTaskId(id) {
    return RiskOps.taskReport.canonicalTaskId(id);
}

// Detecta el nombre de respaldo legado "Tarea <id>" que versiones anteriores
// persistían cuando la selección de tarea no se resolvía. Solo dispara para
// ese patrón exacto: un nombre real de catálogo que empiece con "Tarea" pero
// no sea "Tarea <dígitos>" no se toca.
function isLegacyGenericTaskName(name) {
    return RiskOps.taskReport.isLegacyGenericTaskName(name);
}

// Resolvedor central del nombre visible de una tarea NORMAL (nunca de una
// tarea extra: su llave empieza con "extra_" y su nombre real ya incluye el
// prefijo "[EXTRA] " desde saveExtraTask(), así que nunca debe pasar por
// aquí). Usado por todas las superficies que muestran el progreso de un
// Gestor: Monitoreo (tarjeta y modal), Bitácora/Historial de turnos y el
// reporte de cierre de turno. Prioriza el nombre ya guardado si es válido;
// si es el patrón legado "Tarea <id>" (o no tiene nombre), intenta
// resolverlo contra el catálogo cargado en allTasks usando el ID canónico de
// la entrada. Nunca expone el ID técnico en la superficie visible: ante
// fallo de resolución, devuelve un texto neutro y deja una advertencia en
// consola para diagnóstico interno.
function resolveTaskDisplayName(key, entry, tasksCatalog) {
    return RiskOps.taskReport.resolveTaskDisplayName(key, entry, tasksCatalog || currentAllTasksOrNull(), warnUnresolvedTaskName);
}

// Reconcilia UNA tarea programada del cronograma (taskName, tal como la
// devuelve getAssignedTasksForGestor()) contra session.tasks, usando
// taskNamesMatch() -nunca igualdad exacta- para tolerar las variantes de
// nombre que ya existen entre el cronograma y el catálogo maestro. Excluye
// explícitamente cualquier entrada extra_*: una tarea extra jamás debe
// casarse con una tarea programada. Reutilizada tanto por la tarjeta de
// Monitoreo (renderActiveSessionsDashboard) como por el modal de detalles
// (openMonitoreoDetails), para que ambas superficies muestren siempre el
// mismo estado.
function reconcileScheduledTaskWithSession(taskName, sessionTasks, tasksCatalog) {
    return RiskOps.taskReconciler.reconcileScheduledTaskWithSession(taskName, sessionTasks, tasksCatalog || currentAllTasksOrNull(), warnUnresolvedTaskName);
}

// Construye el texto de la sección "tareas" de un reporte de cierre de turno
// (Historial de Turnos, modal "Ver Todo" y exportación a PDF). Prioriza
// SIEMPRE el objeto estructurado report.tasks (con nombres resueltos vía
// resolveTaskDisplayName) sobre el texto legado report.reporte, para que un
// registro legado con "Tarea <id>" horneado en el texto no se muestre tal
// cual. Solo cae al texto legado si el reporte no tiene report.tasks en
// absoluto (reportes previos a esta migración).
function buildTaskReportSummaryText(report) {
    return RiskOps.taskReport.buildTaskReportSummaryText(report, { catalog: currentAllTasksOrNull(), onWarn: warnUnresolvedTaskName });
}

// Persistencia central y testeable del progreso de una tarea individual.
// Escribe únicamente en active_sessions/{uid}/tasks/{taskId}, nunca reemplaza
// el nodo "tasks" completo, y siempre devuelve/rechaza la Promise real de
// Firebase (no la atrapa ni la convierte en éxito).
// [LAB-INTEGRACION] Persistencia central del progreso de UNA tarea y lectura del progreso remoto propio: delegan en
// RiskOps.taskRepository (mismas rutas, mismas Promises reales, `ok:false` ante fallo de lectura).
// Autocontenida a propósito (solo usa `database` y `RiskOps`): la prueba de otro corte (modales-permisos-integrado.e2e.cjs) la
// extrae de app.js por su cabecera hasta la primera llave de cierre y la ejecuta aislada.
function persistTaskToActiveSession(uid, taskId, taskData) {
    return RiskOps.taskRepository.createTaskRepository({ database: database }).persistTaskToActiveSession(uid, taskId, taskData);
}

async function fetchOwnActiveSessionTasks(uid) { return __tareasRepo().fetchOwnActiveSessionTasks(uid); }

// Combina el caché local (localStorage) con el progreso remoto recuperado,
// resolviendo conflictos por tarea mediante updatedAt: el remoto solo
// reemplaza al local si es ESTRICTAMENTE más reciente. Ante empate, o si a
// cualquiera de los dos lados le falta updatedAt (entradas legadas), prevalece
// el caché local: es la fuente de verdad para lo que el propio Gestor ya
// tiene en pantalla en este dispositivo durante el turno en curso.
function mergeTaskCaches(localCache, remoteCache) {
    return RiskOps.taskReconciler.mergeTaskCaches(localCache, remoteCache);
}

// Identifica, de forma pura, qué tareas de "mergedCache" (el resultado de
// mergeTaskCaches) necesitan re-escribirse en Firebase: las que están
// ausentes en remoteCache, o las que mergeTaskCaches ya resolvió a favor del
// local (empate, updatedAt legado, o local estrictamente más reciente). Una
// tarea cuyo contenido en mergedCache coincide exactamente con remoteCache
// (incluido updatedAt) se considera ya sincronizada y se omite — así una
// recarga posterior no vuelve a migrar lo que ya quedó igual en ambos lados
// (idempotencia). Nunca incluye una tarea donde mergeTaskCaches ya prefirió
// el remoto por tener un updatedAt estrictamente más reciente, porque en ese
// caso mergedCache[taskId] es exactamente remoteCache[taskId].
function computeLocalTaskMigrations(mergedCache, remoteCache, now) {
    return RiskOps.taskReconciler.computeLocalTaskMigrations(mergedCache, remoteCache, now);
}

// Escritura condicional usada EXCLUSIVAMENTE por la migración de
// recuperación (nunca por el guardado interactivo de saveTaskBtn/
// saveExtraTask, que siguen usando persistTaskToActiveSession()). Aplica el
// registro local solo si no hay una versión remota más reciente en el
// servidor en el instante exacto de escribir: si durante la transacción
// aparece una versión remota con updatedAt superior al del registro que se
// intenta migrar (por ejemplo, el propio Gestor guardó esa misma tarea desde
// otra pestaña justo mientras corría la migración), la transacción se aborta
// devolviendo undefined y Firebase conserva la remota sin modificarla.
// [LAB-INTEGRACION] Transacción condicional (aborta si el remoto es estrictamente más reciente): RiskOps.taskRepository
function persistTaskIfNotNewerRemote(uid, taskId, record) { return __tareasRepo().persistTaskIfNotNewerRemote(uid, taskId, record); }

// Migración de recuperación puntual (se ejecuta una vez durante initApp,
// nunca de forma periódica): persiste individualmente, vía la transacción
// condicional persistTaskIfNotNewerRemote(), cada tarea que
// computeLocalTaskMigrations() identificó como pendiente. El registro
// estampado se refleja de inmediato en mergedCache/localStorage como
// respaldo local — ANTES de intentar la escritura remota — para que
// sobreviva aunque esa escritura falle. Un fallo individual no aborta el
// resto de la migración ni se reporta como éxito; el llamador decide cómo
// advertir de los taskId en "failed". Un taskId en "skipped" no es un fallo:
// significa que una versión remota más reciente ganó la transacción y se
// conservó intacta, tal como exige persistTaskIfNotNewerRemote().
// [LAB-INTEGRACION] Migración de recuperación puntual (respaldo local ANTES del intento remoto): RiskOps.taskRepository

// [LAB-INTEGRACION] W-19 (paso 3.2): latido de sesión activa desde RiskOps.taskController.createSessionSyncController.
// app.js solo inyecta dependencias (envoltorio); la lógica vive en src/controllers/task-controller.js.
let __labSessionSync = null;
function __sessionSync() {
    if (__labSessionSync) return __labSessionSync;
    __labSessionSync = RiskOps.taskController.createSessionSyncController({
        getUser: () => currentUser,
        clearUser: () => { currentUser = null; },
        getStoredUserRaw: () => localStorage.getItem('riskOps_currentUser'),
        redirectToLogin: () => { window.location.href = 'login.html'; },
        doc: document,
        now: () => Date.now(),
        nowIso: () => new Date().toISOString(),
        markSyncLoop: (nowMs) => { lastSyncLoopTimestamp = nowMs; },
        loadBreakState: () => loadBreakState(),
        idle: {
            isGranted: () => !!window.idleDetectorGranted,
            getGlobalIdleState: () => globalIdleState,
            domFallback: (nowMs) => shouldApplyDomIdleFallback(nowMs)
        },
        describeLiveSession: (isInactive) => __shiftController().describeLiveSession(isInactive),
        getLocalStatus: () => localStatus,
        setLocalStatus: (status) => { localStatus = status; },
        pushTimelineEvent: (type, action) => pushTimelineEvent(type, action),
        getTimeline: () => shiftTimeline,
        repository: {
            syncSessionMetadata: (uid, metadata) => {
                // Mismo orden que el original: catch (consola) en el repositorio; aquí, el aviso de sincronización.
                const syncPromise = __tareasRepo().syncSessionMetadata(uid, metadata);
                syncPromise.then(() => __labSetSyncWarning(false), () => __labSetSyncWarning(true));
                return syncPromise;
            }
        }
    });
    return __labSessionSync;
}

function syncActiveSessionToFirebase() {
    return __sessionSync().syncActiveSession();
}

function updateKPI() { return __tareasWorkspace().updateKPI(); } // [LAB-INTEGRACION] RiskOps.taskController

function renderQuickDocs(selectedTaskName) { return __tareasWorkspace().renderQuickDocs(selectedTaskName); } // [LAB-INTEGRACION] RiskOps.taskController

// Global scope logic for onclick elements
window.selectTask = function(taskId, evt) { return __tareasWorkspace().selectTask(taskId, evt); }; // [LAB-INTEGRACION] RiskOps.taskController

// Orquesta, de forma "fail-safe", la recuperación del progreso remoto de
// tareas y la migración de recuperación puntual para el Gestor autenticado.
// Reglas de seguridad ante fallos:
//   1) Si la lectura remota falla (fetchOwnActiveSessionTasks devuelve
//      { ok: false }), NO se fusiona ni se migra absolutamente nada: el
//      caché local se conserva tal cual, sin ninguna escritura (ni en
//      Firebase ni en localStorage), y se reporta REMOTE_READ_FAILED para
//      que el llamador muestre una única advertencia visible.
//   2) Justo antes de migrar (nunca antes, para no depender de un estado de
//      autenticación potencialmente obsoleto), se revalida que
//      firebase.auth().currentUser.uid === uid. Si no coincide, se omite la
//      migración por completo (cero escrituras en Firebase) y se reporta
//      IDENTITY_MISMATCH.
// La combinación (merge) en memoria y su respaldo en localStorage sí pueden
// ocurrir con el resultado ya leído de Firebase (es solo una vista local),
// pero ninguna escritura remota ocurre salvo que ambas validaciones pasen.
// [LAB-INTEGRACION] Recuperación "fail-safe" del progreso remoto (lectura no confiable o identidad distinta => cero escrituras remotas):
// RiskOps.taskController.createTaskRecoveryController
async function recoverGestorTaskProgress(uid) { return __tareasRecovery().recoverGestorTaskProgress(uid); }

// Task Status Buttons Interaction
async function initApp() {
    // Recuperar el progreso de tareas ya persistido en Firebase para este
    // mismo Gestor (nunca de otros usuarios), combinarlo con el caché local
    // ANTES de renderizar, y migrar de vuelta lo que Firebase todavía no
    // tiene. Cualquier fallo se resuelve de forma segura dentro de
    // recoverGestorTaskProgress(): nunca produce un falso éxito.
    // [LAB-INTEGRACION] secuencia de arranque de datos desde RiskOps.taskController: recuperación -> horario -> tareas -> teletrabajo -> permisos -> docs
    await RiskOps.taskController.runStartupDataSequence({
        user: currentUser,
        runStartupRecovery: (user) => __tareasRecovery().runStartupRecovery(user),
        loadSchedule: () => loadSchedule(),
        loadExcelTasks: () => loadExcelTasks(),
        loadTeletrabajo: () => loadTeletrabajo(),
        loadPermisos: () => loadPermisos(),
        renderQuickDocs: (name) => renderQuickDocs(name),
        logger: console
    });

    // Theme logic
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        const savedTheme = RiskOps.appInitRules.resolveSavedTheme(localStorage.getItem('riskOps_theme'));
        document.body.setAttribute('data-theme', savedTheme);
        themeToggleBtn.innerHTML = RiskOps.appInitRules.themeIconHTML(savedTheme);

        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = RiskOps.appInitRules.nextTheme(currentTheme);
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('riskOps_theme', newTheme);
            themeToggleBtn.innerHTML = RiskOps.appInitRules.themeIconHTML(newTheme);
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
            const fullName = currentUser.name.trim();
            const matchedAvatar = RiskOps.appInitRules.findAvatarFile(fullName, namesMatch);
            console.log("DEBUG_AVATAR: fullName =", fullName, "matchedAvatar =", matchedAvatar);

            avatarEl.src = RiskOps.appInitRules.buildAvatarSrc(matchedAvatar, fullName);
            if (matchedAvatar) {
                avatarEl.onerror = function() {
                    this.onerror = null;
                    this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
                };
            }
        }

        if (currentUser.role === 'Gestor') {
            syncActiveSessionToFirebase();
            
            // Use a Web Worker to ensure the 30s ping is NOT throttled by Chrome when the tab is in the background
            const workerCode = `
                setInterval(() => {
                    postMessage('ping');
                }, 30000);
            `;
            const blob = new Blob([workerCode], {type: 'application/javascript'});
            window.pingWorker = new Worker(URL.createObjectURL(blob));
            window.pingWorker.onmessage = () => {
                syncActiveSessionToFirebase();
            };
        }

        // Setup programmatical sidebar ordering for roles
        setupSidebar();

        // Show Aprobaciones tab for Supervisor/Admin
        if (currentUser.role === 'Admin' || currentUser.role === 'Supervisor') {
            const navAprobaciones = document.getElementById('navAprobaciones');
            const navTurnos = document.getElementById('navTurnos');
            const navMonitoreo = document.getElementById('navMonitoreo');
            const navWorkspace = document.getElementById('navWorkspace');
            const viewWorkspace = document.getElementById('view-workspace');
            const viewAprobaciones = document.getElementById('view-aprobaciones');
            const viewTurnos = document.getElementById('view-turnos');
            const permissionForm = document.getElementById('permissionForm');
            const endShiftBtn = document.getElementById('endShiftBtn');

            if(navAprobaciones) navAprobaciones.style.display = 'flex';
            if(navTurnos) navTurnos.style.display = 'flex';
            if(navMonitoreo) navMonitoreo.style.display = 'flex';

            const navEficienciaOperativa = document.getElementById('navEficienciaOperativa');
            if(navEficienciaOperativa) navEficienciaOperativa.style.display = 'flex';

            if(navWorkspace) navWorkspace.style.display = 'none'; // Hide Mis Tareas for Admin/Supervisor
            
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
                        clearRiskOpsSessionStorage();
                        firebase.auth().signOut().catch(err => console.error(err));
                        window.location.href = 'login.html';
                    }
                };
            }
            
            // Ocultar el badge del turno para Admin/Supervisor
            const headerShiftBadgeAdmin = document.querySelector('.shift-badge');
            if (headerShiftBadgeAdmin) headerShiftBadgeAdmin.style.display = 'none';

            if (currentUser.role === 'Admin') {
                renderPendingUsers();
            }
            
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
                                    <div style="font-size: 11px; color: var(--text-secondary);">${escapeHTML(p.gestor)} - ${escapeHTML(p.tipo)}</div>
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

            const authUid = currentUser.uid || (firebase.auth().currentUser && firebase.auth().currentUser.uid);
            if (!authUid) return;
            database.ref('permissions').orderByChild('uid').equalTo(authUid).on('value', (snapshot) => {
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
                        let reasonHtml = p.rejectionReason ? `<div style="font-size:11px; color:var(--danger); margin-top:2px;">Razón: ${escapeHTML(p.rejectionReason)}</div>` : '';
                        
                        notifsHtml += `
                            <div style="background: ${bg}; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); display: flex; gap: 10px; align-items: start; cursor: pointer; transition: background 0.2s;" onclick="document.getElementById('navPermisos').click(); document.getElementById('notificationDropdown').style.display = 'none';">
                                <i class='bx ${icon}' style="color: ${iconColor}; font-size: 18px; margin-top: 2px;"></i>
                                <div style="flex-grow: 1;">
                                    <div style="font-size: 12px; font-weight: 500; color: var(--text-primary);">Permiso ${escapeHTML(p.status)}</div>
                                    <div style="font-size: 11px; color: var(--text-secondary);">${escapeHTML(p.fecha)} (${escapeHTML(p.horaInicio)} a ${escapeHTML(p.horaFin)})</div>
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
                window.open(getDocUrl(matchedDoc), "_blank", "noopener");  // W-52: sin acceso a window.opener
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
            resetCustomMultiSelect('turnosGestorMultiSelect');
            if (filterFechaInput) filterFechaInput.value = '';
            applyShiftReportsFilters();
        });
    }

    // Navegación de Vistas (Tabs)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

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
                loadSchedule();
                loadTeletrabajo();
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
                if (currentUser && currentUser.role === 'Admin') {
                    renderPendingUsers();
                }
                renderPendingPermissions();
            } else if (item.id === 'navMonitoreo') {
                const viewMonitoreo = document.getElementById('view-monitoreo');
                if (viewMonitoreo) viewMonitoreo.style.display = 'block';
                renderActiveSessionsDashboard();
            } else if (item.id === 'navEficienciaOperativa') {
                const viewEficiencia = document.getElementById('view-eficiencia-operativa');
                if (viewEficiencia) viewEficiencia.style.display = 'block';
                if (topHeader) topHeader.style.display = 'none';
                loadControlOperativoData();
            } else if (item.id === 'navTiempos') {
                const viewTiempos = document.getElementById('view-tiempos');
                if (viewTiempos) viewTiempos.style.display = 'block';
                if (topHeader) topHeader.style.display = 'none';
                loadTiemposMetrics();
            } else if (item.id === 'navComunicados') {
                const viewComunicados = document.getElementById('view-comunicados');
                if (viewComunicados) viewComunicados.style.display = 'block';
                renderGestorComunicados();
            } else if (item.id === 'navAdminComunicados') {
                const viewAdminComunicados = document.getElementById('view-gestion-comunicados');
                if (viewAdminComunicados) viewAdminComunicados.style.display = 'block';
                renderAdminComunicados();
            } else if (item.id === 'navConfigGestores') {
                const viewConfigGestores = document.getElementById('view-config-gestores');
                if (viewConfigGestores) viewConfigGestores.style.display = 'block';
                renderConfigGestores();
            }
        });
    });

    // Inyectar documentos reales de la carpeta "Procesos" en el Módulo de Docs
    const docsGrid = document.querySelector('.docs-grid');
    if(docsGrid) {
        fetch('procesos_list.json?t=' + Date.now())
        .then(res => res.json())
        .then(archivos => {
            archivos.forEach(file => {
                const isVideo = file.toLowerCase().endsWith('.mp4');
                const isWord = file.toLowerCase().endsWith('.docx') || file.toLowerCase().endsWith('.doc');
                const isExcel = file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls');
                const isHtml = file.toLowerCase().endsWith('.html');
                
                let icon = 'bx-file-pdf';
                let color = '#FF5A5A'; // PDF red
                
                if(isVideo) { icon = 'bx-video'; color = '#3B82F6'; }
                else if(isWord) { icon = 'bx-file-blank'; color = '#2563EB'; } // Word blue
                else if(isExcel) { icon = 'bx-table'; color = '#10B981'; } // Excel green
                else if(isHtml) { icon = 'bx-globe'; color = '#F59E0B'; } // HTML orange

                docsGrid.innerHTML += `
                    <a href="${escapeHTML(getDocUrl(file))}" target="_blank" rel="noopener noreferrer" class="glass-panel" style="padding: 20px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; transition: transform 0.2s;">
                        <i class='bx ${icon}' style="font-size: 40px; color: ${color};"></i>
                        <span style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${escapeHTML(file.replace(/\.[^/.]+$/, ""))}</span>
                    </a>
                `;
            });
        })
                .catch(err => console.error("Error cargando la lista de procesos:", err));
    }

    // --- Inyección del Módulo de Manuales ---
    const manualesGrid = document.querySelector('.manuales-grid');
    if(manualesGrid) {
        const archivos = Object.keys(privateTeamsManuals);
        archivos.forEach(file => {
                const isVideo = file.toLowerCase().endsWith('.mp4');
                const isWord = file.toLowerCase().endsWith('.docx') || file.toLowerCase().endsWith('.doc');
                const isExcel = file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls');
                const isHtml = file.toLowerCase().endsWith('.html');
                
                let icon = 'bx-file-pdf';
                let color = '#FF5A5A'; // PDF red
                
                if(isVideo) { icon = 'bx-video'; color = '#3B82F6'; }
                else if(isWord) { icon = 'bx-file-blank'; color = '#2563EB'; } // Word blue
                else if(isExcel) { icon = 'bx-table'; color = '#10B981'; } // Excel green
                else if(isHtml) { icon = 'bx-globe'; color = '#F59E0B'; } // HTML orange

                manualesGrid.innerHTML += `
                    <a href="${escapeHTML(getManualUrl(file))}" target="_blank" rel="noopener noreferrer" class="glass-panel" style="padding: 20px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; transition: transform 0.2s;">
                        <i class='bx ${icon}' style="font-size: 40px; color: ${color};"></i>
                        <span style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${escapeHTML(file.replace(/\.[^/.]+$/, ""))}</span>
                    </a>
                `;
            });
        
    }

// Poblar nombre en form de permisos y manejar envío por AJAX
    if(currentUser) {
        const pName = document.getElementById('permisoGestorName');
        if(pName) pName.value = currentUser.name;
    }
    
    // Botón de guardar progreso en tarea — [LAB-INTEGRACION] lógica en RiskOps.taskController.createTaskSaveController
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    if(saveTaskBtn) {
        const __saveTaskController = RiskOps.taskController.createTaskSaveController({
            doc: document,
            saveButton: saveTaskBtn,
            getAuthUser: () => firebase.auth().currentUser,
            getUser: () => currentUser,
            getActiveTaskId: () => currentActiveTaskId,
            getSelectedTask: () => currentSelectedTask,
            getTaskCache: () => taskStateCache,
            saveTaskCache: (cache) => localStorage.setItem('riskOps_cache', JSON.stringify(cache)),
            repository: { persistTaskToActiveSession: (uid, taskId, record) => persistTaskToActiveSession(uid, taskId, record) },
            updateKPI: () => updateKPI(),
            alert: (message) => alert(message),
            setTimeout: (fn, ms) => setTimeout(fn, ms),
            now: () => Date.now(),
            logger: console
        });
        saveTaskBtn.addEventListener('click', async () => { await __saveTaskController.saveTaskProgress(); });
    }

    const pForm = document.getElementById('permisosForm');
    
    // Toggle para la opción "Otro"
    const pSelect = document.getElementById('tipoPermisoSelect');
    const pOtroCont = document.getElementById('otroPermisoContainer');
    const pOtroInp = document.getElementById('otroPermisoInput');
    const stdDateCont = document.getElementById('standardDateContainer');
    const vacDateCont = document.getElementById('vacacionesDateContainer');
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
            
            if(stdDateCont && vacDateCont) {
                if(e.target.value === 'Vacaciones') {
                    stdDateCont.style.display = 'none';
                    vacDateCont.style.display = 'grid';
                    document.getElementById('permisoFecha').required = false;
                    document.getElementById('permisoHoraInicio').required = false;
                    document.getElementById('permisoHoraFin').required = false;
                    document.getElementById('permisoFechaDesde').required = true;
                    document.getElementById('permisoFechaHasta').required = true;
                } else {
                    stdDateCont.style.display = 'block';
                    vacDateCont.style.display = 'none';
                    document.getElementById('permisoFecha').required = true;
                    document.getElementById('permisoHoraInicio').required = true;
                    document.getElementById('permisoHoraFin').required = true;
                    document.getElementById('permisoFechaDesde').required = false;
                    document.getElementById('permisoFechaHasta').required = false;
                }
            }
        });
    }

    if(pForm) {
        pForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Evitar recarga
            
            const formData = new FormData(pForm);
            appendFormSubmitCc(formData);
            
            const tipo = formData.get("Tipo_Permiso");
            const especifico = formData.get("Especificacion_Otro");
            const finalTipo = tipo === 'Otro' ? `Otro (${especifico})` : tipo;

            let finalFecha = formData.get("Fecha");
            let finalHoraInicio = formData.get("Hora_Inicio");
            let finalHoraFin = formData.get("Hora_Fin");
            
            if (tipo === 'Vacaciones') {
                finalFecha = `Desde: ${formData.get("Fecha_Desde")} - Hasta: ${formData.get("Fecha_Hasta")}`;
                finalHoraInicio = 'N/A';
                finalHoraFin = 'N/A';
            }

            const now = new Date();
            const fechaSolicitudStr = now.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const horaSolicitudStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            const timestampSolicitud = `${fechaSolicitudStr} ${horaSolicitudStr}`;

            const userUid = (currentUser && currentUser.uid) || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : null);
            const userEmail = (currentUser && currentUser.email) || (firebase.auth().currentUser ? firebase.auth().currentUser.email : '');

            const newPermiso = {
                id: now.getTime(),
                uid: userUid,
                email: userEmail,
                gestor: formData.get("Gestor"),
                tipo: finalTipo,
                fecha: finalFecha,
                horaInicio: finalHoraInicio,
                horaFin: finalHoraFin,
                horaSolicitud: timestampSolicitud,
                motivo: formData.get("Justificacion"),
                status: 'Pendiente',
                approved: false,
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

// Lógica de Desayuno y Almuerzo — [LAB-INTEGRACION] delega en RiskOps.shiftController
function toggleBreakfastBreak() { return __shiftController().toggleBreakfast(); }

function toggleLunchBreak() { return __shiftController().toggleLunch(); }

// Lógica de Pausa Turno Partido — [LAB-INTEGRACION] delega en RiskOps.shiftController
// (iniciar exige users/{uid}/hasSplitShift === true; retomar siempre se permite)
function toggleSplitShiftBreak() { return __shiftController().toggleSplitShift(); }

// [LAB-INTEGRACION] W-17 (paso 3.2): cierre de turno desde RiskOps.shiftClosureController.
// app.js solo inyecta dependencias (envoltorio); el flujo vive en src/controllers/shift-closure-controller.js.
let __labShiftClosure = null;
function __shiftClosure() {
    if (__labShiftClosure) return __labShiftClosure;
    __labShiftClosure = RiskOps.shiftClosureController.createShiftClosureController({
        doc: document,
        confirm: (message) => confirm(message),
        alert: (message) => alert(message),
        redirectToLogin: () => { window.location.href = 'login.html'; },
        readStoredUserRaw: () => localStorage.getItem('riskOps_currentUser'),
        getUser: () => currentUser,
        clearUser: () => { currentUser = null; },
        getTaskCache: () => taskStateCache,
        getAllTasks: () => allTasks,
        getTimeline: () => shiftTimeline,
        getSplitShiftTotalMs: () => totalSplitShiftTimeMs,
        shift: {
            closeOpenBreaks: () => __shiftController().closeOpenBreaks(),
            computeShiftClosure: (input) => __shiftController().computeShiftClosure(input)
        },
        buildTaskReport: (report) => buildTaskReportSummaryText(report),
        persistShiftClosure: (uid, loginLogId, shiftReport) => RiskOps.shiftRepository.createShiftRepository({ database, serverTimestamp: firebase.database.ServerValue.TIMESTAMP }).persistShiftClosureCore(uid, loginLogId, shiftReport),
        restoreButton: (button, previousHtml) => RiskOps.endShiftButton.restoreEndShiftButton(button, previousHtml),
        clearSessionStorage: () => clearRiskOpsSessionStorage(),
        getAuthUid: () => { const u = firebase.auth().currentUser; return u ? u.uid : null; },
        signOut: () => firebase.auth().signOut(),
        appendFormSubmitCc: (formData) => appendFormSubmitCc(formData),
        createFormData: () => new FormData(),
        fetchFn: (url, init) => fetch(url, init),
        now: () => Date.now(),
        logger: console
    });
    return __labShiftClosure;
}

// Botón "Finalizar Turno" (index.html: onclick="handleEndShift()").
async function handleEndShift() { return __shiftClosure().handleEndShift(); }

// Inicializar inmediatamente ya que el script está al final del DOM
initApp();

// [LAB-INTEGRACION:MODALES-PERMISOS:INICIO]
// [LAB-INTEGRACION] Modales, tareas extra, usuarios y permisos: delegan en RiskOps.approvalsController
// (src/controllers/approvals-controller.js). Mismos nombres y firmas que las funciones originales.
let __labApprovalsController = null;
function __approvals() {
    if (__labApprovalsController) return __labApprovalsController;
    __labApprovalsController = RiskOps.approvalsController.createApprovalsController({
        doc: document,
        repository: RiskOps.approvalsRepository.createApprovalsRepository({ database }),
        alert: (message) => alert(message),
        confirm: (message) => confirm(message),
        now: () => new Date(),
        schedule: (fn, ms) => setTimeout(fn, ms),
        logger: console,
        onPermissionUpdated: () => loadPermisos(),
        // D7: el rol se valida en el cliente con la sesión actual (enforcePolicy encendido por defecto).
        getUser: () => currentUser
        // D2/D7/D9a: sin opciones legacy -> escapeRole, preventDuplicates, enforcePolicy y showRejectedUsers activos.
    });
    return __labApprovalsController;
}

let __labModalsController = null;
function __modals() {
    if (__labModalsController) return __labModalsController;
    __labModalsController = RiskOps.approvalsController.createModalsController({
        doc: document,
        alert: (message) => alert(message),
        now: () => Date.now(),
        logger: console,
        getAuthUser: () => firebase.auth().currentUser,
        getCurrentUser: () => currentUser,
        persistTask: (uid, taskId, record) => persistTaskToActiveSession(uid, taskId, record),
        getTaskCache: () => taskStateCache,
        storage: { setItem: (key, value) => localStorage.setItem(key, value) },
        updateKPI: () => updateKPI()
    });
    return __labModalsController;
}

// Modal Logic
function openExceptionModal() { return __modals().openExceptionModal(); }

function closeModal(modalId) { return __modals().closeModal(modalId); }

function confirmException() { return __modals().confirmException(); }

function openExtraTaskModal() { return __modals().openExtraTaskModal(); }

async function saveExtraTask() { return __modals().saveExtraTask(); }

// Logic for Approving Users
async function renderPendingUsers() { return __approvals().renderPendingUsers(); }

function showUserRejectBox(id) { return __approvals().showUserRejectBox(id); }

function cancelRejectUser(id) { return __approvals().cancelRejectUser(id); }

async function confirmRejectUser(userId) { return __approvals().confirmRejectUser(userId); }

// [LAB-INTEGRACION] D9a: revertir un rechazo (botón "Revertir" de la vista "Rechazados"); no existe en app.js original.
async function revertRejectedUser(userId) { return __approvals().revertRejectedUser(userId); }

// Logic for Approving Permissions
async function renderPendingPermissions() { return __approvals().renderPendingPermissions(); }

function showPermRejectBox(id) { return __approvals().showPermRejectBox(id); }

function cancelRejectPerm(id) { return __approvals().cancelRejectPerm(id); }

async function confirmRejectPerm(id) { return __approvals().confirmRejectPerm(id); }

function showPermApproveBox(id) { return __approvals().showPermApproveBox(id); }

function cancelApprovePerm(id) { return __approvals().cancelApprovePerm(id); }

async function confirmApprovePerm(id) { return __approvals().confirmApprovePerm(id); }

// [LAB-INTEGRACION:MODALES-PERMISOS:FIN]

// [LAB-INTEGRACION:HISTORIAL-NAVEGACION:INICIO]
// [LAB-INTEGRACION] Historial de turnos, notificaciones y perfil: delegan en RiskOps (src/controllers/*).
// Mismos nombres y firmas que las funciones originales (los onclick de index.html y del HTML generado siguen funcionando).
let __labHistNav = null;
function __histNav() {
    if (__labHistNav) return __labHistNav;
    __labHistNav = {
        shiftReports: RiskOps.shiftReportsController.createShiftReportsController({
            document,
            repository: RiskOps.shiftReportsRepository.createShiftReportsRepository({ database }),
            setupCustomMultiSelect: (id, options, cb) => setupCustomMultiSelect(id, options, cb),
            getSelectedMultiSelectValues: (id) => getSelectedMultiSelectValues(id),
            summarizeTasks: (report) => buildTaskReportSummaryText(report),
            getPdfWorker: () => (window.html2pdf ? window.html2pdf() : null),
            alert: (message) => alert(message),
            now: () => Date.now(),
            setTimeout: (fn, ms) => setTimeout(fn, ms),
            logger: console
        }),
        monitoring: RiskOps.monitoringController.createMonitoringController({
            document,
            repository: RiskOps.monitoringRepository.createMonitoringRepository({ database }),
            getSessions: () => allActiveSessions,
            setSessions: (sessions) => { allActiveSessions = sessions; },
            hasCronograma: () => typeof globalCronogramaData !== 'undefined' && !!globalCronogramaData,
            getAssignedTasksForGestor: (name, shift) => getAssignedTasksForGestor(name, shift),
            reconcileTask: (taskName, tasks) => reconcileScheduledTaskWithSession(taskName, tasks),
            resolveTaskName: (key, entry) => resolveTaskDisplayName(key, entry),
            getShiftCategory: (shift) => getShiftCategory(shift),
            // [LAB-INTEGRACION] D9b: sin SUPERVISORES_NOMBRES; el controlador deriva los supervisores del ROL en users (consulta por rol
            // con el repositorio de arriba; Monitoreo solo lo abre Supervisor/Admin, que puede leer users) y excluye por UID.
            avatars: RiskOps.appInitRules.AVAILABLE_AVATARS,
            now: () => Date.now(),
            logger: console
        }),
        profile: RiskOps.profileController.createProfileController({
            document,
            getUser: () => currentUser,
            getAuthUser: () => firebase.auth().currentUser,
            closeModal: (id) => closeModal(id),
            setTimeout: (fn, ms) => setTimeout(fn, ms),
            logger: console
        }),
        notifications: RiskOps.notificationsController.createNotificationsController({
            document,
            getUser: () => currentUser,
            repository: RiskOps.notificationsRepository.createNotificationsRepository({
                database,
                getAuthUid: () => (firebase.auth().currentUser && firebase.auth().currentUser.uid)
            }),
            logger: console
        })
    };
    return __labHistNav;
}

window.exportShiftReport = async function(fb_id) { return __histNav().shiftReports.exportShiftReport(fb_id); };
async function renderShiftReports() { return __histNav().shiftReports.renderShiftReports(); }
function applyShiftReportsFilters() { return __histNav().shiftReports.applyShiftReportsFilters(); }
window.openShiftDetailModal = function(fb_id) { return __histNav().shiftReports.openShiftDetailModal(fb_id); };
function toggleNotifications() { return __histNav().notifications.toggleNotifications(); }
async function markAllAsRead() { return __histNav().notifications.markAllAsRead(); }
function openProfileModal() { return __histNav().profile.openProfileModal(); }
async function changePassword() { return __histNav().profile.changePassword(); }
// [LAB-INTEGRACION:HISTORIAL-NAVEGACION:FIN]

// --- PROGRAMMATIC SIDEBAR ORDER & MONITOREO REALTIME ---

function alignAdministrativeControlsByRole() {
    // [LAB-INTEGRACION] política en RiskOps.authService; aplicación al DOM en RiskOps.appRouter
    return RiskOps.appRouter.createAppRouter({ document, getUser: () => currentUser }).alignAdministrativeControlsByRole();
}

// [LAB-INTEGRACION] Enrutador de navegación (W-20): RiskOps.appRouter. El usuario se lee en cada llamada.
let __labAppRouter = null;
function __appRouter() {
    if (!__labAppRouter) __labAppRouter = RiskOps.appRouter.createAppRouter({ document, getUser: () => currentUser });
    return __labAppRouter;
}

// [LAB-INTEGRACION] setupSidebar completo en RiskOps.appRouter (fusión Horario/Teletrabajo, orden por rol, botones).
function setupSidebar() {
    return __appRouter().setupSidebar({ refreshSplitShiftButton: () => __shiftController().refreshSplitShiftButton() }); // [LAB-INTEGRACION] visible con flag o con pausa en curso
}

function updateNavigation() {
    const toggleSplitShiftBtn = document.getElementById('toggleSplitShiftBtn');
    const refreshSplitShiftButton = (toggleSplitShiftBtn && typeof currentUser !== 'undefined' && currentUser)
        ? () => __shiftController().refreshSplitShiftButton() // [LAB-INTEGRACION] visible con flag o con pausa en curso
        : null;
    return __appRouter().updateNavigation({ refreshSplitShiftButton, setupSidebar });
}
window.updateNavigation = updateNavigation;

let allActiveSessions = {};

function startActiveSessionsListener() {
    // [LAB-INTEGRACION] escucha de active_sessions en RiskOps.monitoringController
    return __histNav().monitoring.startActiveSessionsListener();
}

function renderActiveSessionsDashboard() {
    // [LAB-INTEGRACION] Monitoreo: RiskOps.monitoringController (src/controllers/monitoring-controller.js)
    return __histNav().monitoring.renderActiveSessionsDashboard();
}

function viewTimelineInMonitoreo(uid) {
    // [LAB-INTEGRACION] Bitácora del gestor: RiskOps.monitoringController
    return __histNav().monitoring.viewTimelineInMonitoreo(uid);
}
window.viewTimelineInMonitoreo = viewTimelineInMonitoreo;

window.openMonitoreoDetails = function(uid) { return __histNav().monitoring.openMonitoreoDetails(uid); }; // [LAB-INTEGRACION]

function populateGestoresDropdown() { return __histNav().monitoring.populateGestoresDropdown(); } // [LAB-INTEGRACION]

// --- Lógica del Portal de Indicadores de Gestión (KPIs) ---

window.kpiUsersData = {}; // email -> name
window.retirosGlobalData = null; // Carga automática del backend
window.kpiTaskLists = { finalizadas: [], no_realizadas: [], pendientes: [] };

// [LAB-INTEGRACION] Puente app.js -> RiskOps (corte "kpis"): el controlador se crea la primera vez que se usa.
// El estado (window.*, controlOperativoCharts) sigue siendo de app.js; el controlador lo lee y escribe por referencia.
let __labKpiController = null;
function __kpiController() {
    if (__labKpiController) return __labKpiController;
    __labKpiController = RiskOps.kpiController.createKpiController({
        getEl: (id) => document.getElementById(id),
        querySelector: (selector) => document.querySelector(selector),
        createElement: (tag) => document.createElement(tag),
        state: window,
        chartRegistry: controlOperativoCharts,
        ChartClass: Chart,
        datalabelsPlugin: typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {},
        fetchKpiData: () => fetchKpiOperativosData(),
        database: database,
        getSelectedGestores: (id) => getSelectedMultiSelectValues(id),
        querySelectorAll: (selector) => document.querySelectorAll(selector),
        getUser: () => currentUser,
        resolveTaskDisplayName: (key, entry) => resolveTaskDisplayName(key, entry),
        isLegacyGenericTaskName: (name) => isLegacyGenericTaskName(name),
        setSelectedGestores: (id, values) => setCustomMultiSelectValues(id, values),
        setupMultiSelect: (id, options, onChange) => setupCustomMultiSelect(id, options, onChange),
        recalcularIndicadores: () => calcularIndicadores(),
        // [LAB-INTEGRACION] D9b: sin SUPERVISORES_NOMBRES. Los supervisores se derivan del ROL en users (la misma lectura de users que ya
        // hacen loadGestoresForKPIs/loadControlOperativoData; el panel de KPIs solo lo abre Supervisor/Admin).
        // D5: corregirBugs y fechaLocal quedan con su valor por defecto (encendidos); el día operativo usa la zona del navegador.
        now: () => new Date(),
        alert: (message) => alert(message),
        print: () => window.print(),
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        scrollToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        logger: console
    });
    return __labKpiController;
}

// Función centralizada para obtener datos de KPIs respetando el aislamiento de entornos
async function fetchKpiOperativosData() { // [LAB-INTEGRACION] RiskOps.kpiOperativosSource
    return RiskOps.kpiOperativosSource.fetchKpiOperativosData({
        fetchFn: (url) => fetch(url),
        now: () => new Date().getTime(),
        logger: console
    });
}

// Cargar data de retiros automáticamente (JSON pre-procesado del motor operativo)
async function loadRetirosData() { return __kpiController().loadRetirosData(); } // [LAB-INTEGRACION] RiskOps.kpiController

function loadGestoresForKPIs() { __kpiController().loadGestoresForKPIs(); } // [LAB-INTEGRACION] RiskOps.kpiController (el original no devuelve nada)

// [LAB-INTEGRACION] KPIs de turnos y retiros: RiskOps.kpiController.calcularIndicadores (src/controllers/kpi-controller.js)
async function calcularIndicadores() { return __kpiController().calcularIndicadores(); }

// Modal de Detalle de Tareas (KPIs) — [LAB-INTEGRACION] RiskOps.kpiController
function openKpiTaskDetails(tipo) { return __kpiController().openKpiTaskDetails(tipo); }

function closeKpiTaskDetails() { return __kpiController().closeKpiTaskDetails(); }

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    preloadCronograma();
    loadRetirosData();
    // Iniciar Módulo de Comunicados
    initComunicadosListener();
    // Iniciar listeners en tiempo real adicionales
    if (typeof initAtomicApprovedCounterListener === 'function') initAtomicApprovedCounterListener();
    if (typeof startIncidentsRealtimeListener === 'function') startIncidentsRealtimeListener();
    
    // Restaurar botones de pausas — [LAB-INTEGRACION]
    __shiftController().restoreOnLoad();

    const periodoSelect = document.getElementById('kpiPeriodoSelect');
    if (periodoSelect) {
        periodoSelect.addEventListener('change', function(e) {
            const customInput = document.getElementById('kpiCustomDateInput');
            const customContainer = document.getElementById('kpiCustomDateContainer');
            if (customInput) {
                customInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
            }
            if (customContainer) {
                customContainer.style.display = e.target.value === 'custom' ? 'block' : 'none';
            }
        });
    }
});

// [LAB-INTEGRACION] Cierre de modales por fondo y Escape: RiskOps.modalView.bindModalDismissal (W-22).
// El clic sobre el fondo de permisoModal se retiró: ese id no existe en index.html, así que nunca se ejecutaba.
const __labModalDismissalUnbind = RiskOps.modalView.bindModalDismissal({
    win: window,
    doc: document,
    backdrops: [{ id: 'kpiTaskDetailsModal', close: () => closeKpiTaskDetails() }]
});

// --- MÓDULO DE COMUNICADOS ---
let globalComunicados = {};

// [LAB-INTEGRACION:COMUNICADOS-INICIO]
// [LAB-INTEGRACION] Comunicados: RiskOps.announcementsController (src/controllers/announcements-controller.js)
let __labAnnouncementsController = null;
function __labAnnouncements() {
    if (__labAnnouncementsController) return __labAnnouncementsController;
    __labAnnouncementsController = RiskOps.announcementsController.createAnnouncementsController({
        repository: RiskOps.announcementRepository.createAnnouncementRepository({ database }),
        document,
        getUser: () => currentUser,
        getAuthUser: () => firebase.auth().currentUser,
        getAnnouncements: () => globalComunicados,
        setAnnouncements: (map) => { globalComunicados = map; },
        now: () => Date.now(),
        alert: (m) => alert(m),
        closeModal: (id) => closeModal(id),
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        logger: console,
        helpers: { escapeHTML, encodeInlineHandlerArg, sanitizeAnnouncementHTML }
    });
    return __labAnnouncementsController;
}

function initComunicadosListener() { __labAnnouncements().initListener(); } // [LAB-INTEGRACION]

function openNewComunicadoModal() { __labAnnouncements().openNewModal(); } // [LAB-INTEGRACION]

async function saveNewComunicado() { return __labAnnouncements().save(); } // [LAB-INTEGRACION]

function renderGestorComunicados() { __labAnnouncements().renderGestor(); } // [LAB-INTEGRACION]

async function markComunicadoAsRead(id) { await __labAnnouncements().markAsRead(id); } // [LAB-INTEGRACION]

// [LAB-INTEGRACION:COMUNICADOS-FIN]

// [LAB-INTEGRACION:CONFIG-GESTORES-INICIO]
// === CONFIGURACIÓN DE GESTORES === [LAB-INTEGRACION] RiskOps.configGestoresController (src/controllers/config-gestores-controller.js)
let __labConfigGestoresController = null;
function __labConfigGestores() {
    if (__labConfigGestoresController) return __labConfigGestoresController;
    __labConfigGestoresController = RiskOps.configGestoresController.createConfigGestoresController({
        repository: RiskOps.configRepository.createConfigRepository({ database }),
        document,
        confirm: (m) => confirm(m),
        alert: (m) => alert(m),
        logger: console
    });
    return __labConfigGestoresController;
}

function renderConfigGestores() { __labConfigGestores().render(); } // [LAB-INTEGRACION]

function toggleGestorSplitShift(uid, isChecked) { __labConfigGestores().toggle(uid, isChecked); } // [LAB-INTEGRACION]
// [LAB-INTEGRACION:CONFIG-GESTORES-FIN]

// [LAB-INTEGRACION:COMUNICADOS-ADMIN-INICIO]
function renderAdminComunicados() { __labAnnouncements().renderAdmin(); } // [LAB-INTEGRACION]

function viewComunicadoContent(id) { __labAnnouncements().viewContent(id); } // [LAB-INTEGRACION]

async function viewComunicadoLecturas(id) { return __labAnnouncements().viewLecturas(id); } // [LAB-INTEGRACION]

function deleteComunicado(id) { __labAnnouncements().requestDelete(id); } // [LAB-INTEGRACION]

document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => __labAnnouncements().confirmDelete()); // [LAB-INTEGRACION]
// [LAB-INTEGRACION:COMUNICADOS-ADMIN-FIN]

// ==========================================
// CONTROL OPERATIVO Y EFICIENCIA EN RETIROS
// ==========================================
let controlOperativoCharts = {};

window.controlOperativoRawData = null;

function toggleOperativoCustomDates() { return __kpiController().toggleOperativoCustomDates(); } // [LAB-INTEGRACION] RiskOps.kpiController

// ==========================================
// Función para Generar Análisis Textual IA
// ==========================================
function generarAnalisisTextual() { return __kpiController().generarAnalisisTextual(); } // [LAB-INTEGRACION] RiskOps.kpiController

// ==========================================
// Función para Generar Informe Ejecutivo en PDF
// ==========================================
function generarReporteEjecutivoPDF() { return __kpiController().generarReporteEjecutivoPDF(); } // [LAB-INTEGRACION] RiskOps.kpiController

async function loadControlOperativoData() { return __kpiController().loadControlOperativoData(); } // [LAB-INTEGRACION] RiskOps.kpiController

// [LAB-INTEGRACION] Tabla/tarjetas/gráficas del Control Operativo: RiskOps.kpiController (kpiMetrics, kpiChartPlan, kpiChartConfigs)
function renderControlOperativoFiltered() { return __kpiController().renderControlOperativoFiltered(); }

// ==========================================
// ACTIVE SUPERVISOR BADGE LOGIC
// ==========================================
// [LAB-INTEGRACION:SUPERVISOR-BADGE-INICIO]
let __labSupervisorBadgeController = null;
function updateActiveSupervisorBadge() { // [LAB-INTEGRACION] RiskOps.supervisorBadgeController
    if (!__labSupervisorBadgeController) {
        __labSupervisorBadgeController = RiskOps.supervisorBadgeController.createSupervisorBadgeController({
            document,
            getScheduleRows: () => (typeof globalScheduleRows === 'undefined' ? null : globalScheduleRows),
            getScheduleBlocks: () => globalScheduleBlocks,
            getShiftForDate: (rows, blocks, name, date) => (typeof getShiftForDate === 'function' ? getShiftForDate(rows, blocks, name, date) : null)
        });
    }
    __labSupervisorBadgeController.update();
}
// [LAB-INTEGRACION:SUPERVISOR-BADGE-FIN]

setInterval(updateActiveSupervisorBadge, 60000); // Check every minute
setTimeout(updateActiveSupervisorBadge, 3000); // Initial check after loading

// ==========================================
// HISTORIAL DE ACCESOS LOGIC
// ==========================================
// [LAB-INTEGRACION:LOGIN-HISTORY-INICIO]
// [LAB-INTEGRACION] Historial de accesos: RiskOps.loginHistoryController (src/controllers/login-history-controller.js)
let __labLoginHistoryController = null;
function __labLoginHistory() {
    if (__labLoginHistoryController) return __labLoginHistoryController;
    __labLoginHistoryController = RiskOps.loginHistoryController.createLoginHistoryController({
        repository: RiskOps.loginHistoryRepository.createLoginHistoryRepository({ database }),
        document,
        now: () => Date.now(),
        logger: console,
        helpers: { escapeHTML }
    });
    return __labLoginHistoryController;
}

async function openLoginHistoryModal() { return __labLoginHistory().open(); } // [LAB-INTEGRACION]

function filterLoginHistoryTable() { __labLoginHistory().filter(); } // [LAB-INTEGRACION]
// [LAB-INTEGRACION:LOGIN-HISTORY-FIN]

window.openLoginHistoryModal = openLoginHistoryModal;
window.filterLoginHistoryTable = filterLoginHistoryTable;

// =========================================================================
// --- PARCHES DE DIAGNÓSTICO E2E & REGLAS DE NEGOCIO SLA DE RETIROS ---
// =========================================================================

/**
 * 1. Fórmula Justa de Tiempo de Aprobación de Retiros (SLA Ajustado por Turno)
 * HoraInicioCálculo = MAX(FechaHoraCreaciónRetiro, FechaHoraInicioTurnoGestor)
 * Tiempo de Aprobación = FechaHoraAprobación - HoraInicioCálculo
 */
function calculateEffectiveApprovalTime(creacionTime, aprobacionTime, inicioTurnoTime) {
    return RiskOps.withdrawalMetrics.calculateEffectiveApprovalTime(creacionTime, aprobacionTime, inicioTurnoTime);
}

/**
 * 2. Monitoreo y Presencia en Tiempo Real con Firebase Realtime Database
 */
// [LAB-INTEGRACION:PRESENCIA-CONTADOR-INCIDENTES-INICIO]
// [LAB-INTEGRACION] Presencia, contador atómico y novedades: RiskOps.presenceService / approvedCounterService / approvedCountView / incidentsController
// [LAB-INTEGRACION] D6: presencia y contador INACTIVOS (predeterminado enabled: false de los servicios): las llamadas son no-op y no
// abren conexiones ni consumen cuota de Realtime Database. NO pasar enabled: true sin reglas "metrics" y rediseño.
function __labPresence() {
    return RiskOps.presenceService.createPresenceService({
        database,
        serverTimestamp: firebase.database.ServerValue.TIMESTAMP,
        onSessionsChanged: () => {
            if (typeof renderActiveSessionsDashboard === 'function') {
                renderActiveSessionsDashboard();
            }
        }
    });
}

function setupUserPresence(uid) {
    if (!uid || typeof database === 'undefined') return;
    __labPresence().setupUserPresence(uid); // [LAB-INTEGRACION]
}

function startMonitoringPresence() {
    if (typeof database === 'undefined') return;
    __labPresence().startMonitoringPresence(); // [LAB-INTEGRACION]
}

function __labApprovedCounter() {
    return RiskOps.approvedCounterService.createApprovedCounterService({ database, onCount: (count) => updateApprovedCountUI(count) });
}

function incrementApprovedWithdrawal(uid, amount = 1) {
    if (typeof database === 'undefined') return;
    __labApprovedCounter().incrementApprovedWithdrawal(uid, amount); // [LAB-INTEGRACION]
}

function initAtomicApprovedCounterListener() {
    if (typeof database === 'undefined') return;
    __labApprovedCounter().initAtomicApprovedCounterListener(); // [LAB-INTEGRACION]
}

function updateApprovedCountUI(count) {
    RiskOps.approvedCountView.renderApprovedCount({ // [LAB-INTEGRACION]
        count,
        isFiltered: window.isFilteredByGestor,
        element: window.isFilteredByGestor ? null : document.getElementById('metric-approved-count'),
        schedule: (fn, ms) => setTimeout(fn, ms)
    });
}

let __labIncidentsController = null;
function __labIncidents() {
    if (__labIncidentsController) return __labIncidentsController;
    __labIncidentsController = RiskOps.incidentsController.createIncidentsController({
        repository: RiskOps.incidentRepository.createIncidentRepository({ database }),
        document,
        getUser: () => currentUser,
        getAuthUser: () => firebase.auth().currentUser,
        now: () => Date.now(),
        alert: (m) => alert(m),
        logger: console,
        helpers: { escapeHTML }
    });
    return __labIncidentsController;
}

async function handleNewIncidentSubmit(event) { return __labIncidents().handleSubmit(event); } // [LAB-INTEGRACION]

function startIncidentsRealtimeListener() {
    if (typeof database === 'undefined') return;
    __labIncidents().startListener(); // [LAB-INTEGRACION]
}

function renderIncidentsTable(incidents) { __labIncidents().renderTable(incidents); } // [LAB-INTEGRACION]
// [LAB-INTEGRACION:PRESENCIA-CONTADOR-INCIDENTES-FIN]

/**
 * 5. Filtro por Responsable Asignado (#filter-assignee)
 */
function renderAssignedTasksFilter() {
    const assigneeSelect = document.getElementById('filter-assignee');
    if (!assigneeSelect) return;
    RiskOps.taskTreeView.filterTasksByAssignee(document, assigneeSelect.value); // [LAB-INTEGRACION] W-22
}

// Exponer funciones globalmente
window.calculateEffectiveApprovalTime = calculateEffectiveApprovalTime;
window.setupUserPresence = setupUserPresence;
window.startMonitoringPresence = startMonitoringPresence;
window.incrementApprovedWithdrawal = incrementApprovedWithdrawal;
window.initAtomicApprovedCounterListener = initAtomicApprovedCounterListener;
window.handleNewIncidentSubmit = handleNewIncidentSubmit;
window.startIncidentsRealtimeListener = startIncidentsRealtimeListener;
window.renderIncidentsTable = renderIncidentsTable;
window.renderAssignedTasksFilter = renderAssignedTasksFilter;

