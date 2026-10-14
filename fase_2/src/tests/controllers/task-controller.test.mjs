import { createRunner, assert } from '../test-harness.mjs';
import { createFakeDocument, snapshotDocument, createRng, createFakeDatabase, createSerialTestAsync, FakeElement } from './tareas-fake-dom.mjs';
import {
    createTaskRecoveryController, createSessionSyncController, createTaskSaveController, createTaskWorkspaceController,
    runStartupDataSequence, countDomTasks
} from '../../controllers/task-controller.js';
import { createTaskRepository } from '../../services/firebase/firebase-task-repository.js';
import { resolveLiveStatus, buildBreakPayloadFields } from '../../domain/shifts/active-session-payload.js';
import { escapeHTML, encodeInlineHandlerArg } from '../../utils/sanitization.js';
import { getDocUrl } from '../../config/doc-links.js';

const { test, testAsync: rawTestAsync, summarizeAsync } = createRunner('task-controller.js (recuperación, latido, guardado, selección, arranque; diferencial vs app.js)');
const testAsync = createSerialTestAsync(rawTestAsync); // las pruebas comparten el estado global simulado: van en serie

// ======================================================================================================
// Entorno simulado para el código LITERAL de app.js (los globales que el original usa)
// ======================================================================================================
const RealDate = globalThis.Date;
const FIXED_NOW = RealDate.UTC(2026, 9, 6, 15, 0, 0);
class FakeDate extends RealDate {
    constructor(...args) { if (args.length) super(...args); else super(FIXED_NOW); }
    static now() { return FIXED_NOW; }
}
const Date = FakeDate;
let database = null;
let storage = new Map();
let storageBroken = false;
const localStorage = {
    setItem(k, v) { if (storageBroken) throw new Error('QuotaExceededError'); storage.set(k, String(v)); },
    getItem(k) { return storage.has(k) ? storage.get(k) : null; },
    removeItem(k) { storage.delete(k); }
};
let consoleErrors = [];
const console = { error: (...a) => consoleErrors.push(a.map(String).join(' ')), log() {}, warn() {} };
let alerts = [];
const alert = (m) => alerts.push(m);
let authUser = null;
const firebase = { auth: () => ({ currentUser: authUser }) };
let document = null;
const window = { idleDetectorGranted: false, location: { href: '' } };
let timeouts = [];
const setTimeout = (fn, ms) => { timeouts.push(ms); return 0; };

// estado global de app.js
let taskStateCache = {};
let currentUser = null;
let currentActiveTaskId = null;
let currentSelectedTask = null;
let allTasks = [];
let kpiUpdates = 0;
function updateKPI() { kpiUpdates += 1; }
let lastSyncLoopTimestamp = 0;
let globalIdleState = false;
let domFallbackResult = false;
function shouldApplyDomIdleFallback() { return domFallbackResult; }
let isSplitShiftBreak = false;
let isLunchBreak = false;
let isBreakfastBreak = false;
let localStatus = 'En Línea';
let shiftTimeline = [];
let timelineCalls = [];
function pushTimelineEvent(type, action) { timelineCalls.push([type, action]); }
let loadBreakStateCalls = 0;
function loadBreakState() { loadBreakStateCalls += 1; }


// --- copia LITERAL de app.js líneas 2123-2125 (canonicalTaskId) ---
function canonicalTaskId(id) {
    return String(id);
}

// --- copia LITERAL de app.js líneas 2241-2245 ---
function persistTaskToActiveSession(uid, taskId, taskData) {
    if (!uid) return Promise.reject(new Error('MISSING_UID'));
    if (!taskId) return Promise.reject(new Error('MISSING_TASK_ID'));
    return database.ref(`active_sessions/${uid}/tasks/${taskId}`).update(taskData);
}

// --- copia LITERAL de app.js líneas 2256-2265 ---
async function fetchOwnActiveSessionTasks(uid) {
    if (!uid) return { ok: false, tasks: {} };
    try {
        const snapshot = await database.ref(`active_sessions/${uid}/tasks`).once('value');
        return { ok: true, tasks: snapshot.exists() ? snapshot.val() : {} };
    } catch (e) {
        console.error('Error al recuperar el progreso remoto de tareas:', e);
        return { ok: false, tasks: {} };
    }
}

// --- copia LITERAL de app.js líneas 2273-2289 ---
function mergeTaskCaches(localCache, remoteCache) {
    const merged = { ...(localCache || {}) };
    Object.keys(remoteCache || {}).forEach((taskId) => {
        const remoteEntry = remoteCache[taskId];
        const localEntry = merged[taskId];
        if (!localEntry) {
            merged[taskId] = remoteEntry;
            return;
        }
        const remoteUpdatedAt = typeof remoteEntry.updatedAt === 'number' ? remoteEntry.updatedAt : null;
        const localUpdatedAt = typeof localEntry.updatedAt === 'number' ? localEntry.updatedAt : null;
        if (remoteUpdatedAt !== null && localUpdatedAt !== null && remoteUpdatedAt > localUpdatedAt) {
            merged[taskId] = remoteEntry;
        }
    });
    return merged;
}

// --- copia LITERAL de app.js líneas 2301-2321 ---
function computeLocalTaskMigrations(mergedCache, remoteCache, now) {
    const remote = remoteCache || {};
    const migrations = [];
    Object.keys(mergedCache || {}).forEach((taskId) => {
        const mergedEntry = mergedCache[taskId];
        const remoteEntry = remote[taskId];
        const alreadyInSync = !!remoteEntry
            && mergedEntry.name === remoteEntry.name
            && mergedEntry.status === remoteEntry.status
            && mergedEntry.observation === remoteEntry.observation
            && mergedEntry.updatedAt === remoteEntry.updatedAt;
        if (alreadyInSync) return;

        // Registro legado sin updatedAt: se estampa ANTES de guardarlo.
        const record = typeof mergedEntry.updatedAt === 'number'
            ? mergedEntry
            : { ...mergedEntry, updatedAt: now };
        migrations.push({ taskId, record });
    });
    return migrations;
}

// --- copia LITERAL de app.js líneas 2332-2346 ---
function persistTaskIfNotNewerRemote(uid, taskId, record) {
    if (!uid) return Promise.reject(new Error('MISSING_UID'));
    if (!taskId) return Promise.reject(new Error('MISSING_TASK_ID'));
    return database.ref(`active_sessions/${uid}/tasks/${taskId}`).transaction((currentValue) => {
        if (
            currentValue
            && typeof currentValue.updatedAt === 'number'
            && typeof record.updatedAt === 'number'
            && currentValue.updatedAt > record.updatedAt
        ) {
            return undefined; // Abortar: conservar la versión remota más reciente.
        }
        return record;
    });
}

// --- copia LITERAL de app.js líneas 2359-2384 ---
async function migrateLocalTasksToActiveSession(uid, mergedCache, remoteCache) {
    if (!uid || !mergedCache) return { migrated: [], failed: [], skipped: [] };
    const migrations = computeLocalTaskMigrations(mergedCache, remoteCache, Date.now());
    const migrated = [];
    const failed = [];
    const skipped = [];
    for (const { taskId, record } of migrations) {
        mergedCache[taskId] = record;
        try {
            localStorage.setItem('riskOps_cache', JSON.stringify(mergedCache));
        } catch (e) { /* localStorage no disponible: el respaldo local es best-effort */ }

        try {
            const result = await persistTaskIfNotNewerRemote(uid, taskId, record);
            if (result && result.committed === false) {
                skipped.push(taskId);
            } else {
                migrated.push(taskId);
            }
        } catch (error) {
            console.error('Error al migrar una tarea local a Firebase durante la recuperación de sesión:', taskId, error);
            failed.push(taskId);
        }
    }
    return { migrated, failed, skipped };
}

// --- copia LITERAL de app.js líneas 2694-2719 ---
async function recoverGestorTaskProgress(uid) {
    const remoteResult = await fetchOwnActiveSessionTasks(uid);
    if (!remoteResult.ok) {
        return { status: 'REMOTE_READ_FAILED', failedMigrationsCount: 0 };
    }

    taskStateCache = mergeTaskCaches(taskStateCache, remoteResult.tasks);
    try {
        localStorage.setItem('riskOps_cache', JSON.stringify(taskStateCache));
    } catch (e) { /* localStorage no disponible: el respaldo local es best-effort */ }

    const authUser = firebase.auth().currentUser;
    if (!authUser || authUser.uid !== uid) {
        console.error('No se pudo verificar la identidad autenticada antes de migrar el progreso local; se omite la migración.');
        return { status: 'IDENTITY_MISMATCH', failedMigrationsCount: 0 };
    }

    // Migración de recuperación puntual (una sola vez, no periódica):
    // re-escribe en Firebase, tarea por tarea y de forma transaccional
    // condicional, lo que ya está resuelto localmente pero que Firebase
    // todavía no tiene o tiene desactualizado (ausente en remoto, o el local
    // ganó el conflicto de mergeTaskCaches). Es idempotente: una recarga
    // posterior no vuelve a migrar lo ya igual.
    const { failed } = await migrateLocalTasksToActiveSession(uid, taskStateCache, remoteResult.tasks);
    return { status: 'OK', failedMigrationsCount: failed.length };
}

// --- copia LITERAL de app.js líneas 2386-2472 ---
function syncActiveSessionToFirebase() {
    if (!currentUser || currentUser.role !== 'Gestor') return Promise.resolve();
    const uid = currentUser.uid;
    if (!uid) return Promise.resolve();

    // Si la sesin fue cerrada en otra pestaa, localStorage estar vaco
    if (!localStorage.getItem('riskOps_currentUser')) {
        currentUser = null;
        window.location.href = 'login.html';
        return Promise.resolve();
    }

    const totalTasks = document.querySelectorAll('.task-item').length;
    const completedTasks = document.querySelectorAll('.task-item .status-completed').length;
    const notDoneTasks = document.querySelectorAll('.task-item .status-not-done').length;
    const finalized = completedTasks + notDoneTasks;

    let percentage = 0;
    if (totalTasks > 0) {
        percentage = Math.round((finalized / totalTasks) * 100);
    }

    // Use local currentUser.loginTime, avoiding any database reads that could hang
    const loginTime = currentUser.loginTime || new Date().toISOString();
    
    // --- INACTIVITY LOGIC ---
    let nowMs = Date.now();
    lastSyncLoopTimestamp = nowMs;
    loadBreakState();

    let newLastActive = Date.now();
    let currentStatus = 'Activo';
    
    let isInactive = false;
    if (window.idleDetectorGranted) {
        isInactive = globalIdleState;
    } else if (shouldApplyDomIdleFallback(nowMs)) {
        isInactive = true;
    }
    
    if (isSplitShiftBreak) {
        currentStatus = 'En Pausa de Turno';
    } else if (isLunchBreak) {
        currentStatus = 'En Almuerzo';
    } else if (isBreakfastBreak) {
        currentStatus = 'En Desayuno';
    } else if (isInactive) {
        currentStatus = 'Inactivo';
    } else {
        currentStatus = 'En Línea';
    }
    
    if (currentStatus === 'Inactivo' && localStatus !== 'Inactivo') {
        pushTimelineEvent('Inactividad', 'start');
    } else if (currentStatus !== 'Inactivo' && localStatus === 'Inactivo') {
        pushTimelineEvent('Inactividad', 'end');
    }
    localStatus = currentStatus;
    
    // Esta sincronización SOLO transporta metadatos de la sesión (nombre,
    // estado, contadores derivados del DOM, línea de tiempo, etc.). Nunca
    // incluye ni reenvía "tasks": la persistencia de cada tarea es
    // responsabilidad exclusiva de persistTaskToActiveSession(), que escribe
    // por taskId de forma explícita. Así un ping periódico con un snapshot
    // desactualizado nunca puede pisar una tarea recién guardada.
    const sessionMetadata = {
        name: currentUser.name,
        email: currentUser.email,
        shift: currentUser.shift || 'Por Asignar',
        loginTime: loginTime,
        lastActive: newLastActive,
        status: currentStatus,
        totalTasks: totalTasks,
        finalizedTasks: finalized,
        completedTasks: completedTasks,
        notDoneTasks: notDoneTasks,
        percentage: percentage,
        timeline: shiftTimeline || [],
        appVersion: 'v104'
    };

    // No se atrapa el error de forma que oculte el fallo: se devuelve la
    // Promise real (rechazada si falla) y, aparte, se registra en consola.
    const syncPromise = database.ref(`active_sessions/${uid}`).update(sessionMetadata);
    syncPromise.catch(e => console.error("Error syncing active session via SDK:", e));
    return syncPromise;
}

// --- copia LITERAL de app.js líneas 2528-2609 ---
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
                <a href="${getDocUrl(matchedDoc)}" target="_blank" rel="noopener noreferrer" class="doc-link" style="background: transparent; padding: 0; display: flex; align-items: center; gap: 10px;">
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
            <a href="${getDocUrl(file)}" target="_blank" rel="noopener noreferrer" class="doc-link" style="margin-bottom: 8px;">
                <i class='bx ${icon}' style="font-size: 18px; color: ${color};"></i>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">${file.replace(/\.[^/.]+$/, "")}</span>
            </a>
        `;
    });
}

// --- copia LITERAL de app.js líneas 2612-2676 ---
window.selectTask = function(taskId, evt) {
    const canonicalId = canonicalTaskId(taskId);
    currentActiveTaskId = canonicalId;
    // Remove active
    document.querySelectorAll('.task-item').forEach(el => el.classList.remove('active'));
    // Add active (evt is passed explicitly from the inline onclick; never rely on the global event object)
    const eventTarget = evt && evt.currentTarget;
    if(eventTarget) eventTarget.classList.add('active');

    // Comparar por ID canónico (string): allTasks trae IDs number (loadExcelTasks:
    // row.id = idx) mientras que taskId llega siempre como string (decodeURIComponent()
    // del onclick serializado por renderTree()). Sin canonicalTaskId(), 0 !== "0"
    // dejaba la selección sin resolver.
    const task = allTasks.find(t => canonicalTaskId(t.id) === canonicalId);
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
            // Restore from cache if exists
            document.querySelectorAll('.btn-status').forEach(el => el.classList.remove('active'));
            if(taskStateCache[canonicalId]) {
                if(textArea) textArea.value = taskStateCache[canonicalId].observation || "";

                const cachedStatus = taskStateCache[canonicalId].status;
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
    } else {
        currentSelectedTask = null;
        currentActiveTaskId = null;
        if(eventTarget) eventTarget.classList.remove('active');
        const titleElement = document.getElementById('currentTaskTitle');
        if (titleElement) titleElement.textContent = "Selecciona una tarea";
        const textArea = document.getElementById('taskObservation');
        if (textArea) textArea.value = "";
        document.querySelectorAll('.btn-status').forEach(el => el.classList.remove('active'));
    }
}

function makeLegacySaveHandler(saveTaskBtn) {
    let isSavingTask = false;
    return async () => {
// --- copia LITERAL de app.js líneas 3265-3379 (listener de #saveTaskBtn (cuerpo)) ---
            // Evitar dobles clics / escrituras simultáneas mientras una ya está en curso
            if (isSavingTask) return;

            // --- Validaciones obligatorias antes de escribir ---
            if (currentActiveTaskId === null || currentActiveTaskId === undefined) {
                alert("Selecciona una tarea antes de guardar el progreso.");
                return;
            }
            const selectedStatusBtn = document.querySelector('.btn-status.active');
            if (!selectedStatusBtn) {
                alert("Selecciona un estado antes de guardar el progreso.");
                return;
            }
            const obsField = document.getElementById('taskObservation');
            const obsValue = obsField ? obsField.value.trim() : '';
            if (!obsValue) {
                alert("OBLIGATORIO: Debes detallar la gestión realizada en las Notas Técnicas antes de guardar.");
                return;
            }
            const authUser = firebase.auth().currentUser;
            if (!authUser) {
                alert("Tu sesión expiró. Vuelve a iniciar sesión para guardar el progreso.");
                return;
            }
            if (!currentUser || currentUser.uid !== authUser.uid) {
                alert("No se pudo verificar tu identidad. Vuelve a iniciar sesión para guardar el progreso.");
                return;
            }
            const taskIdStr = canonicalTaskId(currentActiveTaskId);
            if (!taskIdStr || /[.#$\[\]/]/.test(taskIdStr)) {
                alert("La tarea seleccionada tiene un identificador inválido y no puede guardarse.");
                return;
            }
            // La selección debe estar resuelta contra el catálogo (allTasks) antes de
            // permitir guardar: si currentSelectedTask no existe o quedó apuntando a
            // una tarea distinta de currentActiveTaskId (selección no resuelta, ver
            // selectTask()), nunca se debe persistir un nombre genérico "Tarea <id>".
            if (!currentSelectedTask || canonicalTaskId(currentSelectedTask.id) !== taskIdStr) {
                alert("No se pudo confirmar la tarea seleccionada. Vuelve a seleccionarla antes de guardar.");
                return;
            }

            const btn = saveTaskBtn;
            const prevText = btn.innerHTML;
            isSavingTask = true;
            btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";
            btn.disabled = true;
            btn.classList.remove('btn-success', 'btn-error');

            const taskRecord = {
                // currentSelectedTask ya quedó validado arriba: siempre existe y su ID
                // coincide con taskIdStr, así que su nombre real de catálogo (nunca un
                // "Tarea <id>" genérico) es lo único que se persiste aquí.
                name: currentSelectedTask['Tarea'],
                status: selectedStatusBtn.textContent.trim(),
                observation: obsValue,
                updatedAt: Date.now()
            };

            // Respaldo local inmediato para permitir reintento visual, pero esto
            // NO cuenta como confirmación de persistencia (eso solo lo da Firebase).
            taskStateCache[taskIdStr] = taskRecord;
            try {
                localStorage.setItem('riskOps_cache', JSON.stringify(taskStateCache));
            } catch (e) { /* localStorage no disponible: el respaldo local es best-effort */ }

            try {
                // Capturar el elemento visual actual y la clase de estado antes de la promesa,
                // para evitar condiciones de carrera si el usuario cambia la selección mientras guarda.
                const visualTaskElement = document.querySelector('.task-item.active .task-status');
                const statusClassToAdd = selectedStatusBtn.classList.contains('completed') ? 'status-completed' :
                                         selectedStatusBtn.classList.contains('in-progress') ? 'status-in-progress' :
                                         selectedStatusBtn.classList.contains('not-done') ? 'status-not-done' : 'status-pending';

                // Único punto de verdad para la persistencia: espera la Promise
                // real de Firebase antes de mostrar cualquier éxito.
                await persistTaskToActiveSession(authUser.uid, taskIdStr, taskRecord);

                btn.innerHTML = "<i class='bx bx-check'></i> Guardado Exitosamente";
                btn.classList.add('btn-success');

                // Limpiar el campo de texto de observaciones al confirmarse el envío de la actividad
                if (obsField) {
                    obsField.value = '';
                }

                // Actualizar estado visual de la tarea guardada
                if (visualTaskElement) {
                    visualTaskElement.classList.remove('status-pending', 'status-completed', 'status-not-done', 'status-in-progress');
                    visualTaskElement.classList.add(statusClassToAdd);
                }

                updateKPI();

                setTimeout(() => {
                    btn.innerHTML = prevText;
                    btn.classList.remove('btn-success');
                }, 2000);
            } catch (error) {
                console.error("Error al guardar el progreso de la tarea:", error);
                const errorCode = error && error.code ? error.code : '';
                const isPermissionDenied = errorCode === 'PERMISSION_DENIED' || /permission[_ ]denied/i.test((error && error.message) || '');
                btn.innerHTML = "<i class='bx bx-error'></i> Error al guardar";
                btn.classList.add('btn-error');
                alert(isPermissionDenied
                    ? "No tienes permiso para guardar esta tarea. Contacta a tu supervisor."
                    : "No se pudo guardar el progreso en el servidor. El cambio quedó respaldado localmente; intenta guardar de nuevo.");
                setTimeout(() => {
                    btn.innerHTML = prevText;
                    btn.classList.remove('btn-error');
                }, 2500);
            } finally {
                btn.disabled = false;
                isSavingTask = false;
            }
    };
}

// ======================================================================================================
// Utilidades
// ======================================================================================================
const UID = 'g1';
const TASKS_PATH = `active_sessions/${UID}/tasks`;
const clone = (v) => JSON.parse(JSON.stringify(v));
const rec = (name, status, updatedAt, observation = '') => (updatedAt === undefined ? { name, status, observation } : { name, status, observation, updatedAt });

function resetEnv() {
    storage = new Map();
    storageBroken = false;
    consoleErrors = [];
    alerts = [];
    timeouts = [];
    kpiUpdates = 0;
    timelineCalls = [];
    loadBreakStateCalls = 0;
    window.location.href = '';
    window.idleDetectorGranted = false;
}

function newRepository(db) {
    return createTaskRepository({
        database: db,
        now: () => Date.now(),
        saveCache: (cache) => localStorage.setItem('riskOps_cache', JSON.stringify(cache)),
        logger: console
    });
}

// ======================================================================================================
// recoverGestorTaskProgress: diferencial de punta a punta (código literal de app.js vs controlador + repositorio)
// ======================================================================================================
async function runRecoveryBoth({ initialDb, local, authUid, dbOpts = {}, storageBrokenFlag = false }) {
    const shots = {};

    for (const mode of ['legacy', 'nuevo']) {
        resetEnv();
        storageBroken = storageBrokenFlag;
        const db = createFakeDatabase(initialDb, dbOpts);
        taskStateCache = clone(local);
        authUser = authUid === null ? null : { uid: authUid };
        let result;
        let thrown = null;

        try {
            if (mode === 'legacy') {
                database = db;
                result = await recoverGestorTaskProgress(UID);
            } else {
                const controller = createTaskRecoveryController({
                    repository: newRepository(db),
                    getTaskCache: () => taskStateCache,
                    setTaskCache: (c) => { taskStateCache = c; },
                    saveTaskCache: (c) => localStorage.setItem('riskOps_cache', JSON.stringify(c)),
                    getAuthUser: () => firebase.auth().currentUser,
                    logger: console
                });
                result = await controller.recoverGestorTaskProgress(UID);
            }
        } catch (e) {
            thrown = String(e && e.message);
        }

        shots[mode] = {
            result, thrown, cache: clone(taskStateCache), stored: storage.get('riskOps_cache') || null,
            remoteTasks: db.getAt(TASKS_PATH), ops: db.log.map((o) => `${o.op}:${o.path}`), errors: consoleErrors.length
        };
    }

    return shots;
}

testAsync('recoverGestorTaskProgress: fusión + migración idéntica a app.js (caso base con remoto más nuevo, local más nuevo y ausentes)', async () => {
    const local = { a: rec('A', 'En Proceso', 100), b: rec('B', 'Finalizada', 300, 'l'), c: rec('C', 'En Proceso', 100), extra_1: rec('[EXTRA] x', 'Finalizada', 50) };
    const remote = { b: rec('B', 'En Proceso', 200, 'r'), c: rec('C', 'Finalizada', 400, 'r'), d: rec('D', 'No Realizada', 10, 'solo remoto') };
    const shots = await runRecoveryBoth({ initialDb: { active_sessions: { [UID]: { tasks: remote } } }, local, authUid: UID });

    assert.deepEqual(shots.nuevo, shots.legacy);
    assert.deepEqual(shots.nuevo.result, { status: 'OK', failedMigrationsCount: 0 });
    assert.equal(shots.nuevo.cache.c.status, 'Finalizada', 'el remoto más nuevo reemplaza al local');
    assert.equal(shots.nuevo.cache.b.status, 'Finalizada', 'el local más nuevo se conserva');
    assert.equal(shots.nuevo.cache.d.observation, 'solo remoto', 'lo que solo existe en remoto se recupera');
    assert.equal(shots.nuevo.remoteTasks.c.status, 'Finalizada', 'la versión remota más nueva NO se pisa');
});

testAsync('recoverGestorTaskProgress: lectura remota fallida → REMOTE_READ_FAILED, cero escrituras y caché local intacto', async () => {
    const local = { a: rec('A', 'Finalizada', 100, 'local valioso') };
    const shots = await runRecoveryBoth({ initialDb: {}, local, authUid: UID, dbOpts: { failPaths: { [TASKS_PATH]: ['once'] } } });

    assert.deepEqual(shots.nuevo, shots.legacy);
    assert.deepEqual(shots.nuevo.result, { status: 'REMOTE_READ_FAILED', failedMigrationsCount: 0 });
    assert.deepEqual(shots.nuevo.cache, local, 'el caché local queda tal cual');
    assert.equal(shots.nuevo.stored, null, 'ni siquiera se escribe en localStorage');
    assert.deepEqual(shots.nuevo.ops, [`once:${TASKS_PATH}`], 'solo la lectura: ninguna escritura remota');
});

testAsync('recoverGestorTaskProgress: identidad distinta o sin sesión → IDENTITY_MISMATCH, fusión local pero cero escrituras remotas', async () => {
    const local = { a: rec('A', 'En Proceso', 100) };
    const remote = { z: rec('Z', 'Finalizada', 5) };

    for (const authUid of ['otro-usuario', null]) {
        const shots = await runRecoveryBoth({ initialDb: { active_sessions: { [UID]: { tasks: remote } } }, local, authUid });

        assert.deepEqual(shots.nuevo, shots.legacy);
        assert.equal(shots.nuevo.result.status, 'IDENTITY_MISMATCH');
        assert.deepEqual(shots.nuevo.ops, [`once:${TASKS_PATH}`], 'sin escrituras remotas');
        assert.ok(shots.nuevo.cache.z, 'la vista local sí se fusionó');
        assert.equal(shots.nuevo.errors, 1);
    }
});

testAsync('recoverGestorTaskProgress: fallos de migración se cuentan, no se ocultan, y el respaldo local queda conservado', async () => {
    const local = { a: rec('A', 'En Proceso', 100), b: rec('B', 'Finalizada', 200, 'x'), c: rec('C', 'En Proceso', 300) };
    const failing = { [`${TASKS_PATH}/a`]: ['transaction'], [`${TASKS_PATH}/c`]: ['transaction'] };
    const shots = await runRecoveryBoth({ initialDb: {}, local, authUid: UID, dbOpts: { failPaths: failing } });

    assert.deepEqual(shots.nuevo, shots.legacy);
    assert.deepEqual(shots.nuevo.result, { status: 'OK', failedMigrationsCount: 2 });
    assert.ok(JSON.parse(shots.nuevo.stored).a, 'el respaldo local conserva la tarea fallida');
    assert.deepEqual(Object.keys(shots.nuevo.remoteTasks), ['b']);
});

testAsync('recoverGestorTaskProgress: localStorage roto no impide fusionar ni migrar', async () => {
    const shots = await runRecoveryBoth({ initialDb: {}, local: { a: rec('A', 'En Proceso', 1) }, authUid: UID, storageBrokenFlag: true });

    assert.deepEqual(shots.nuevo, shots.legacy);
    assert.equal(shots.nuevo.result.status, 'OK');
    assert.ok(shots.nuevo.remoteTasks.a);
});

testAsync('recoverGestorTaskProgress: 250 escenarios aleatorios con semilla (carreras remoto más nuevo, red, identidad) — diferencial', async () => {
    const rng = createRng(777);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const stamps = [undefined, 50, 100, 100, 200, 300];
    const statuses = ['En Proceso', 'Finalizada', 'No Realizada'];
    const outcomes = { OK: 0, REMOTE_READ_FAILED: 0, IDENTITY_MISMATCH: 0 };

    for (let i = 0; i < 250; i++) {
        const local = {};
        const remote = {};
        const failPaths = {};

        ids.forEach((id) => {
            if (rng() < 0.7) local[id] = rec('T' + id, pick(statuses), pick(stamps), rng() < 0.5 ? 'o' : '');
            if (rng() < 0.6) remote[id] = rec('T' + id, pick(statuses), pick(stamps), rng() < 0.5 ? 'o' : '');
            if (rng() < 0.12) failPaths[`${TASKS_PATH}/${id}`] = ['transaction'];
        });

        if (rng() < 0.1) local.extra_9 = rec('[EXTRA] z', 'Finalizada', 5);
        if (rng() < 0.1) failPaths[TASKS_PATH] = ['once'];

        const authUid = rng() < 0.1 ? 'otro' : (rng() < 0.05 ? null : UID);
        const initialDb = Object.keys(remote).length ? { active_sessions: { [UID]: { tasks: remote } } } : {};
        const shots = await runRecoveryBoth({ initialDb, local, authUid, dbOpts: { failPaths } });

        assert.deepEqual(shots.nuevo, shots.legacy, `escenario ${i}`);
        outcomes[shots.nuevo.result.status] += 1;
    }

    assert.ok(outcomes.OK > 100 && outcomes.REMOTE_READ_FAILED > 3 && outcomes.IDENTITY_MISMATCH > 3, JSON.stringify(outcomes));
});

testAsync('runStartupRecovery: avisa UNA vez, nunca lanza y no corre para quien no es Gestor con uid', async () => {
    resetEnv();
    const db = createFakeDatabase({}, { failPaths: { [TASKS_PATH]: ['once'] } });
    taskStateCache = {};
    authUser = { uid: UID };
    const controller = createTaskRecoveryController({
        repository: newRepository(db), getTaskCache: () => taskStateCache, setTaskCache: (c) => { taskStateCache = c; },
        getAuthUser: () => authUser, alert, logger: console
    });

    assert.equal((await controller.runStartupRecovery({ role: 'Admin', uid: UID })).ran, false);
    assert.equal((await controller.runStartupRecovery({ role: 'Gestor' })).ran, false);
    assert.equal((await controller.runStartupRecovery(null)).ran, false);
    assert.equal(alerts.length, 0);
    assert.equal(db.log.length, 0);

    const outcome = await controller.runStartupRecovery({ role: 'Gestor', uid: UID });

    assert.equal(outcome.ran, true);
    assert.equal(alerts.length, 1);
    assert.match(alerts[0], /No se pudo verificar el progreso remoto/);

    // un fallo inesperado del repositorio se registra y no se propaga
    const exploding = createTaskRecoveryController({
        repository: { fetchOwnActiveSessionTasks: async () => { throw new Error('boom'); }, migrateLocalTasksToActiveSession: async () => ({ failed: [] }) },
        getTaskCache: () => ({}), setTaskCache: () => {}, getAuthUser: () => authUser, alert, logger: console
    });
    const result = await exploding.runStartupRecovery({ role: 'Gestor', uid: UID });

    assert.equal(result.ran, true);
    assert.ok(result.error);
    assert.equal(alerts.length, 1, 'sin alerta adicional');
});

// ======================================================================================================
// Listener de #saveTaskBtn (initApp): diferencial literal vs controlador
// ======================================================================================================
function newSaveScenario(sc) {
    const doc = createFakeDocument({ missingSelectors: sc.noStatusButton ? ['.btn-status.active'] : [], missingIds: sc.noObsField ? ['taskObservation'] : [] });
    const statusBtn = new FakeElement('button');
    statusBtn.textContent = sc.statusText;
    sc.statusClasses.forEach((c) => statusBtn.classList.add(c));
    if (!sc.noStatusButton) doc.bySelector.set('.btn-status.active', statusBtn);
    const visual = new FakeElement('div');
    visual.classList.add('status-pending');
    if (!sc.noVisual) doc.bySelector.set('.task-item.active .task-status', visual);
    const obs = doc.getElementById('taskObservation');
    if (obs) obs.value = sc.observation;
    const saveBtn = new FakeElement('button');
    saveBtn.innerHTML = 'Guardar progreso';
    saveBtn.classList.add('btn-success');
    return { doc, statusBtn, visual, obs, saveBtn };
}

async function runSaveBoth(sc, double = false) {
    const shots = {};

    for (const mode of ['legacy', 'nuevo']) {
        resetEnv();
        const env = newSaveScenario(sc);
        document = env.doc;
        const db = createFakeDatabase(sc.initialDb || {}, { failPaths: sc.failPaths || {}, errorCode: sc.errorCode });
        database = db;
        taskStateCache = clone(sc.cache || {});
        authUser = sc.authUser === undefined ? { uid: UID } : sc.authUser;
        currentUser = sc.currentUser === undefined ? { uid: UID, role: 'Gestor' } : sc.currentUser;
        currentActiveTaskId = sc.activeId === undefined ? '3' : sc.activeId;
        currentSelectedTask = sc.selected === undefined ? { id: 3, Tarea: 'Revisar GGR' } : sc.selected;
        let handler;

        if (mode === 'legacy') {
            handler = makeLegacySaveHandler(env.saveBtn);
        } else {
            const controller = createTaskSaveController({
                doc: env.doc, saveButton: env.saveBtn, getAuthUser: () => firebase.auth().currentUser, getUser: () => currentUser,
                getActiveTaskId: () => currentActiveTaskId, getSelectedTask: () => currentSelectedTask, getTaskCache: () => taskStateCache,
                saveTaskCache: (c) => localStorage.setItem('riskOps_cache', JSON.stringify(c)), repository: newRepository(db),
                updateKPI: () => updateKPI(), alert, setTimeout: (fn, ms) => setTimeout(fn, ms), now: () => Date.now(), logger: console
            });
            handler = controller.saveTaskProgress;
        }

        if (double) await Promise.all([handler(), handler()]);
        else await handler();

        shots[mode] = {
            alerts, cache: clone(taskStateCache), stored: storage.get('riskOps_cache') || null, remoteTasks: db.getAt(TASKS_PATH),
            ops: db.log.map((o) => `${o.op}:${o.path}`), kpi: kpiUpdates, timeouts: [...timeouts], errors: consoleErrors.length,
            btn: { html: env.saveBtn.innerHTML, classes: env.saveBtn.classList.toString(), disabled: env.saveBtn.disabled },
            obs: env.obs ? env.obs.value : null, visual: env.visual.classList.toString()
        };
        shots[mode].alerts = [...alerts];
    }

    return shots;
}

const BASE_SAVE = { statusText: ' Finalizada ', statusClasses: ['btn-status', 'completed', 'active'], observation: '  gestión completa  ' };

testAsync('guardar progreso: camino feliz idéntico a app.js (respaldo local, Firebase, éxito visual, KPI, observación limpia)', async () => {
    const shots = await runSaveBoth(BASE_SAVE);

    assert.deepEqual(shots.nuevo, shots.legacy);
    assert.equal(shots.nuevo.remoteTasks['3'].status, 'Finalizada');
    assert.equal(shots.nuevo.remoteTasks['3'].observation, 'gestión completa');
    assert.equal(shots.nuevo.remoteTasks['3'].name, 'Revisar GGR');
    assert.equal(shots.nuevo.visual, 'status-completed');
    assert.equal(shots.nuevo.obs, '');
    assert.equal(shots.nuevo.kpi, 1);
    assert.deepEqual(shots.nuevo.timeouts, [2000]);
    assert.match(shots.nuevo.btn.html, /Guardado Exitosamente|Guardar progreso/);
});

testAsync('guardar progreso: cada validación avisa lo mismo que app.js y NO escribe nada (8 casos)', async () => {
    const cases = [
        { ...BASE_SAVE, activeId: null },
        { ...BASE_SAVE, noStatusButton: true },
        { ...BASE_SAVE, observation: '   ' },
        { ...BASE_SAVE, noObsField: true },
        { ...BASE_SAVE, authUser: null },
        { ...BASE_SAVE, currentUser: { uid: 'otro', role: 'Gestor' } },
        { ...BASE_SAVE, activeId: 'a.b' },
        { ...BASE_SAVE, selected: { id: 99, Tarea: 'Otra' } },
        { ...BASE_SAVE, selected: null }
    ];

    for (const sc of cases) {
        const shots = await runSaveBoth(sc);

        assert.deepEqual(shots.nuevo, shots.legacy, JSON.stringify(sc));
        assert.equal(shots.nuevo.alerts.length, 1);
        assert.deepEqual(shots.nuevo.ops, [], 'sin escrituras remotas');
        assert.equal(shots.nuevo.stored, null, 'sin respaldo local');
    }
});

testAsync('guardar progreso: fallo de Firebase → respaldo local conservado, aviso y botón de error (permiso denegado y red)', async () => {
    for (const errorCode of ['PERMISSION_DENIED', 'NETWORK_ERROR']) {
        const sc = { ...BASE_SAVE, failPaths: { [`${TASKS_PATH}/3`]: ['update'] }, errorCode };
        const shots = await runSaveBoth(sc);

        assert.deepEqual(shots.nuevo, shots.legacy);
        assert.equal(shots.nuevo.alerts.length, 1);
        assert.equal(/permiso/.test(shots.nuevo.alerts[0]), errorCode === 'PERMISSION_DENIED');
        assert.equal(shots.nuevo.cache['3'].status, 'Finalizada', 'el cambio queda respaldado en el caché local');
        assert.ok(JSON.parse(shots.nuevo.stored)['3']);
        assert.equal(shots.nuevo.remoteTasks, null);
        assert.equal(shots.nuevo.kpi, 0, 'no se muestra éxito ni se refresca el KPI');
        assert.deepEqual(shots.nuevo.timeouts, [2500]);
        assert.equal(shots.nuevo.btn.disabled, false);
    }
});

testAsync('guardar progreso: estados No Realizada / En Proceso, sin elemento visual y doble clic (diferencial)', async () => {
    for (const sc of [
        { ...BASE_SAVE, statusText: 'No Realizada', statusClasses: ['not-done', 'active'] },
        { ...BASE_SAVE, statusText: 'En Proceso', statusClasses: ['in-progress', 'active'] },
        { ...BASE_SAVE, statusText: 'Pendiente', statusClasses: ['pending', 'active'] },
        { ...BASE_SAVE, noVisual: true },
        { ...BASE_SAVE, activeId: 0, selected: { id: 0, Tarea: 'Cero' } },
        { ...BASE_SAVE, cache: { 3: rec('viejo', 'En Proceso', 1) } }
    ]) {
        const shots = await runSaveBoth(sc);

        assert.deepEqual(shots.nuevo, shots.legacy, JSON.stringify(sc));
    }

    const doble = await runSaveBoth(BASE_SAVE, true);

    assert.deepEqual(doble.nuevo, doble.legacy);
    assert.equal(doble.nuevo.ops.length, 1, 'el segundo clic mientras guarda no escribe de nuevo');
});

// ======================================================================================================
// syncActiveSessionToFirebase: diferencial (el estado/pausas lo aporta describeLiveSession)
// ======================================================================================================
const SPLIT_FIELDS = ['splitShiftStartTime', 'totalSplitShiftTimeMs'];

async function runSyncBoth(sc) {
    const shots = {};

    for (const mode of ['legacy', 'nuevo']) {
        resetEnv();
        document = createFakeDocument();
        document.setAll('.task-item', new Array(sc.total).fill(0));
        document.setAll('.task-item .status-completed', new Array(sc.completed).fill(0));
        document.setAll('.task-item .status-not-done', new Array(sc.notDone).fill(0));
        const db = createFakeDatabase({ active_sessions: { [UID]: { tasks: { a: rec('A', 'Finalizada', 900, 'guardada') } } } }, { failPaths: sc.failPaths || {} });
        database = db;
        currentUser = clone(sc.user);
        if (sc.storedUser) storage.set('riskOps_currentUser', JSON.stringify(sc.user));
        window.idleDetectorGranted = sc.granted;
        globalIdleState = sc.globalIdle;
        domFallbackResult = sc.domFallback;
        isSplitShiftBreak = sc.split;
        isLunchBreak = sc.lunch;
        isBreakfastBreak = sc.breakfast;
        localStatus = sc.localStatus;
        shiftTimeline = clone(sc.timeline);
        lastSyncLoopTimestamp = 0;
        let outcome;

        if (mode === 'legacy') {
            outcome = await syncActiveSessionToFirebase().then(() => 'resuelta', () => 'rechazada');
        } else {
            const breakState = () => ({ isSplitShiftBreak, isLunchBreak, isBreakfastBreak, splitShiftStartTime: 123, totalSplitShiftTimeMs: 456 });
            const controller = createSessionSyncController({
                getUser: () => currentUser, clearUser: () => { currentUser = null; }, getStoredUserRaw: () => localStorage.getItem('riskOps_currentUser'),
                redirectToLogin: () => { window.location.href = 'login.html'; }, doc: document, now: () => Date.now(), nowIso: () => new Date().toISOString(),
                markSyncLoop: (ms) => { lastSyncLoopTimestamp = ms; }, loadBreakState,
                idle: { isGranted: () => window.idleDetectorGranted, getGlobalIdleState: () => globalIdleState, domFallback: (ms) => shouldApplyDomIdleFallback(ms) },
                describeLiveSession: (isInactive) => ({ status: resolveLiveStatus(breakState(), isInactive), ...buildBreakPayloadFields(breakState()) }),
                getLocalStatus: () => localStatus, setLocalStatus: (s) => { localStatus = s; }, pushTimelineEvent,
                getTimeline: () => shiftTimeline, repository: newRepository(db)
            });
            outcome = await controller.syncActiveSession().then(() => 'resuelta', () => 'rechazada');
        }

        const session = db.getAt(`active_sessions/${UID}`);
        const payload = session ? clone(session) : null;

        if (payload) SPLIT_FIELDS.forEach((f) => delete payload[f]);

        shots[mode] = {
            outcome, payload, timelineCalls: clone(timelineCalls), localStatus, lastSync: lastSyncLoopTimestamp, loadBreakStateCalls,
            href: window.location.href, userCleared: currentUser === null, ops: db.log.map((o) => `${o.op}:${o.path}`)
        };
    }

    return shots;
}

const BASE_SYNC = {
    user: { uid: UID, role: 'Gestor', name: 'Ana', email: 'ana@x.co', shift: '8am - 4pm', loginTime: '2026-10-06T13:00:00.000Z' },
    storedUser: true, total: 6, completed: 2, notDone: 1, granted: false, globalIdle: false, domFallback: false,
    split: false, lunch: false, breakfast: false, localStatus: 'En Línea', timeline: []
};

testAsync('latido: payload, contadores, bitácora y estado idénticos a app.js; NUNCA pisa las tareas guardadas', async () => {
    const shots = await runSyncBoth(BASE_SYNC);

    assert.deepEqual(shots.nuevo, shots.legacy);
    assert.equal(shots.nuevo.outcome, 'resuelta');
    assert.deepEqual(shots.nuevo.payload.tasks, { a: rec('A', 'Finalizada', 900, 'guardada') }, 'la tarea guardada sigue intacta');
    assert.equal(shots.nuevo.payload.percentage, 50);
    assert.equal(shots.nuevo.payload.totalTasks, 6);
    assert.equal(shots.nuevo.payload.status, 'En Línea');
    assert.ok(shots.nuevo.ops.every((op) => op.startsWith('update:active_sessions/g1')), 'solo update() sobre la sesión');
});

testAsync('latido: no corre para quien no es Gestor con uid; sesión cerrada en otra pestaña limpia y redirige (diferencial)', async () => {
    for (const sc of [
        { ...BASE_SYNC, user: { ...BASE_SYNC.user, role: 'Admin' } },
        { ...BASE_SYNC, user: { ...BASE_SYNC.user, uid: '' } },
        { ...BASE_SYNC, storedUser: false },
        { ...BASE_SYNC, user: { ...BASE_SYNC.user, loginTime: undefined } },
        { ...BASE_SYNC, user: { ...BASE_SYNC.user, shift: undefined } }
    ]) {
        const shots = await runSyncBoth(sc);

        assert.deepEqual(shots.nuevo, shots.legacy, JSON.stringify(sc.user));
    }

    const closed = await runSyncBoth({ ...BASE_SYNC, storedUser: false });

    assert.equal(closed.nuevo.href, 'login.html');
    assert.equal(closed.nuevo.userCleared, true);
    assert.deepEqual(closed.nuevo.ops, [], 'no escribe nada');
});

testAsync('latido: 300 escenarios aleatorios (idle nativo/DOM, pausas, estado local, bitácora, fallos de red) — diferencial', async () => {
    const rng = createRng(1234);
    const statuses = ['En Línea', 'Inactivo', 'En Almuerzo', 'En Desayuno', 'En Pausa de Turno', 'Activo'];
    const bool = (p = 0.5) => rng() < p;
    const seen = new Set();

    for (let i = 0; i < 300; i++) {
        const total = Math.floor(rng() * 12);
        const completed = Math.floor(rng() * (total + 1));
        const sc = {
            ...BASE_SYNC, total, completed, notDone: Math.floor(rng() * (total - completed + 1)),
            granted: bool(), globalIdle: bool(), domFallback: bool(), split: bool(0.2), lunch: bool(0.2), breakfast: bool(0.2),
            localStatus: statuses[Math.floor(rng() * statuses.length)],
            timeline: bool() ? [] : [{ type: 'Inactividad', start: 1, end: null }],
            failPaths: bool(0.15) ? { [`active_sessions/${UID}`]: ['update'] } : {}
        };
        const shots = await runSyncBoth(sc);

        assert.deepEqual(shots.nuevo, shots.legacy, `escenario ${i}`);
        seen.add(`${shots.nuevo.payload && shots.nuevo.payload.status}|${shots.nuevo.outcome}`);
    }

    assert.ok(seen.size >= 6, [...seen].join(', '));
});

test('latido: inyectando el estado de pausas, el payload agrega splitShiftStartTime/totalSplitShiftTimeMs (lo que ya hace el controlador de turno)', () => {
    resetEnv();
    document = createFakeDocument();
    const db = createFakeDatabase({});
    const writes = [];
    const controller = createSessionSyncController({
        getUser: () => ({ ...BASE_SYNC.user }), clearUser() {}, getStoredUserRaw: () => '{}', redirectToLogin() {}, doc: document,
        now: () => 1000, nowIso: () => 'X', idle: { isGranted: () => true, getGlobalIdleState: () => false, domFallback: () => false },
        describeLiveSession: () => ({ status: 'En Pausa de Turno', splitShiftStartTime: 77, totalSplitShiftTimeMs: 5 }),
        getLocalStatus: () => 'En Línea', setLocalStatus() {}, pushTimelineEvent() {}, getTimeline: () => null,
        repository: { syncSessionMetadata: (uid, data) => { writes.push([uid, data]); return Promise.resolve(); } }
    });

    controller.syncActiveSession();

    assert.equal(writes[0][0], UID);
    assert.equal(writes[0][1].status, 'En Pausa de Turno');
    assert.equal(writes[0][1].splitShiftStartTime, 77);
    assert.equal(writes[0][1].totalSplitShiftTimeMs, 5);
    assert.deepEqual(writes[0][1].timeline, []);
    assert.ok(!('tasks' in writes[0][1]));
    assert.deepEqual(countDomTasks(document), { total: 0, completed: 0, notDone: 0 });
});

// ======================================================================================================
// selectTask: diferencial
// ======================================================================================================
async function runSelectBoth(sc) {
    const shots = {};

    for (const mode of ['legacy', 'nuevo']) {
        resetEnv();
        document = createFakeDocument();
        const items = [new FakeElement('div'), new FakeElement('div'), new FakeElement('div')];
        items.forEach((it) => it.classList.add('active'));
        const buttons = ['Pendiente', 'En Proceso', 'Finalizada', 'No Realizada'].map((t) => { const b = new FakeElement('button'); b.textContent = ' ' + t + ' '; return b; });
        buttons[3].classList.add('active');
        document.setAll('.task-item', items);
        document.setAll('.btn-status', buttons);
        document.bySelector.set('.btn-status.pending', buttons[0]);
        document.getElementById('taskObservation').value = 'nota previa';
        taskStateCache = clone(sc.cache || {});
        currentUser = sc.user;
        allTasks = clone(sc.tasks);
        currentActiveTaskId = 'previo';
        currentSelectedTask = { id: 'previo' };
        const evt = sc.noEvent ? undefined : { currentTarget: items[1] };
        const state = { active: undefined, selected: undefined };

        if (mode === 'legacy') {
            window.selectTask(sc.taskId, evt);
            state.active = currentActiveTaskId;
            state.selected = currentSelectedTask;
        } else {
            let active = 'previo';
            let selected = { id: 'previo' };
            const controller = createTaskWorkspaceController({
                doc: document, getUser: () => currentUser, getTaskCache: () => taskStateCache, getAllTasks: () => allTasks,
                setActiveTaskId: (id) => { active = id; }, setSelectedTask: (t) => { selected = t; }, getDocUrl,
                escape: escapeHTML, encodeArg: encodeInlineHandlerArg
            });
            controller.selectTask(sc.taskId, evt);
            state.active = active;
            state.selected = selected;
        }

        shots[mode] = {
            state, doc: snapshotDocument(document), items: items.map((i) => i.classList.toString()), buttons: buttons.map((b) => b.classList.toString())
        };
    }

    return shots;
}

const CATALOG = [
    { id: 0, Tarea: 'Revisión GGR', 'Detalle de Tarea': 'd', Horario: 'h', 'Día': 'Lun', Instrucciones: 'i' },
    { id: 7, Tarea: 'Validar apuestas' }, { id: 10001, Tarea: 'Tarea mock SEON' }
];

testAsync('selectTask: igual que app.js para Gestor (con caché, sin caché, estado desconocido), Admin/Supervisor y tarea inexistente', async () => {
    const cases = [
        { taskId: '0', user: { role: 'Gestor' }, tasks: CATALOG, cache: { 0: rec('Revisión GGR', 'Finalizada', 5, 'ya hecha') } },
        { taskId: '7', user: { role: 'Gestor' }, tasks: CATALOG, cache: {} },
        { taskId: '7', user: { role: 'Gestor' }, tasks: CATALOG, cache: { 7: rec('Validar apuestas', 'Estado raro', 5, 'o') } },
        { taskId: '10001', user: { role: 'Gestor' }, tasks: CATALOG, cache: { 10001: { name: 'x', status: 'En Proceso' } } },
        { taskId: '0', user: { role: 'Admin' }, tasks: CATALOG },
        { taskId: '7', user: { role: 'Supervisor' }, tasks: CATALOG },
        { taskId: 'no-existe', user: { role: 'Gestor' }, tasks: CATALOG },
        { taskId: 0, user: null, tasks: CATALOG },
        { taskId: '0', user: { role: 'Gestor' }, tasks: CATALOG, noEvent: true },
        { taskId: 'no-existe', user: { role: 'Admin' }, tasks: CATALOG, noEvent: true }
    ];

    for (const sc of cases) {
        const shots = await runSelectBoth(sc);

        assert.deepEqual(shots.nuevo, shots.legacy, JSON.stringify(sc));
    }

    const ok = await runSelectBoth(cases[0]);

    assert.equal(ok.nuevo.state.active, '0');
    assert.equal(ok.nuevo.state.selected.Tarea, 'Revisión GGR');
    assert.equal(ok.nuevo.doc['#taskObservation'].value, 'ya hecha');
    const missing = await runSelectBoth(cases[6]);

    assert.equal(missing.nuevo.state.active, null);
    assert.equal(missing.nuevo.state.selected, null);
});

// ======================================================================================================
// Arranque de datos de initApp y reloj
// ======================================================================================================
testAsync('runStartupDataSequence: orden de pasos, un fallo de horario/tareas no impide los siguientes y se registra', async () => {
    resetEnv();
    const calls = [];
    const make = (name, fail) => () => { calls.push(name); if (fail) return Promise.reject(new Error(name + ' falló')); return Promise.resolve(); };

    const steps = await runStartupDataSequence({
        user: { role: 'Gestor', uid: UID },
        runStartupRecovery: make('recovery'), loadSchedule: make('schedule', true), loadExcelTasks: make('tasks', true),
        loadTeletrabajo: () => calls.push('teletrabajo'), loadPermisos: () => calls.push('permisos'), renderQuickDocs: (n) => calls.push('quickDocs:' + n),
        logger: console
    });

    assert.deepEqual(calls, ['recovery', 'schedule', 'tasks', 'teletrabajo', 'permisos', 'quickDocs:null']);
    assert.deepEqual(steps, ['recovery', 'schedule', 'tasks', 'teletrabajo', 'permisos', 'quickDocs']);
    assert.equal(consoleErrors.length, 2);
    assert.match(consoleErrors[0], /horario en la inicialización/);
    assert.match(consoleErrors[1], /tareas en la inicialización/);
});

test('updateClock del controlador: escribe HH:MM:SS en #liveClock y no falla sin el elemento', () => {
    const doc = createFakeDocument();
    const controller = createTaskWorkspaceController({
        doc, getUser: () => null, getTaskCache: () => ({}), getAllTasks: () => [], setActiveTaskId() {}, setSelectedTask() {}, getDocUrl,
        newDate: () => new RealDate(2026, 0, 2, 3, 4, 5)
    });

    controller.updateClock();
    assert.equal(doc.getElementById('liveClock').textContent, '03:04:05');

    const missing = createFakeDocument({ missingIds: ['liveClock'] });
    createTaskWorkspaceController({ doc: missing, getUser: () => null, getTaskCache: () => ({}), getAllTasks: () => [], setActiveTaskId() {}, setSelectedTask() {}, getDocUrl }).updateClock();
    assert.equal(missing.byId.size, 0);
});

await summarizeAsync();
