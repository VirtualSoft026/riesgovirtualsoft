import { createRunner, assert } from '../test-harness.mjs';
import { createRng, createSerialTestAsync } from '../controllers/tareas-fake-dom.mjs';
import { formatClockTime } from '../../domain/tasks/clock-format.js';
import { computeSyncPercentage, computeKpiFigures, formatProgress } from '../../domain/tasks/task-progress.js';
import {
    APP_VERSION, shouldSyncActiveSession, isSessionClosedElsewhere, resolveLoginTime, resolveIsInactive,
    decideInactivityTimelineAction, buildSessionMetadata, buildSessionMetadataTail
} from '../../domain/tasks/task-session-sync.js';
import { RECOVERY_STATUS, describeRecoveryAlert, shouldRecoverTaskProgress } from '../../domain/tasks/task-recovery.js';
import { validateTaskSaveInput, buildTaskRecord, resolveStatusClassForButton, describeTaskSaveError } from '../../domain/tasks/task-save-rules.js';
import { isTaskReviewerRole, findCatalogTask, buildReviewerTaskDetailText } from '../../domain/tasks/task-selection.js';
import { QUICK_DOC_FILES, matchQuickDoc, getQuickDocIconMeta, stripDocExtension } from '../../domain/tasks/quick-docs.js';
import {
    AVAILABLE_AVATARS, findAvatarFile, buildAvatarSrc, buildFallbackAvatarUrl, resolveSavedTheme, nextTheme, themeIconHTML,
    PING_INTERVAL_MS, buildPingWorkerCode
} from '../../domain/tasks/app-init-rules.js';
import {
    TASKS_EXCEL_PATH, buildTasksExcelUrl, assignMasterRowIds, getRowSet, resolveGestorShift, createMockTaskIdGenerator,
    buildGestorTaskRows, groupTasksBySet, reconcileGestorTaskCache, buildSetSelectorOptionsHTML, decideSetSelectorView, selectTasksForSet
} from '../../domain/tasks/task-catalog.js';
import { formatExcelDate as newFormatExcelDate } from '../../domain/tasks/schedule-sheet.js';
import { namesMatch } from '../../utils/normalize.js';
import { escapeHTML } from '../../utils/sanitization.js';

const { test, testAsync: rawTestAsync, summarizeAsync } = createRunner('reglas puras de tareas (reloj, progreso, latido, recuperación, guardado, selección, catálogo; diferencial vs app.js)');
const testAsync = createSerialTestAsync(rawTestAsync);

// ======================================================================================================
// Entorno simulado para el código LITERAL de app.js
// ======================================================================================================
const RealDate = globalThis.Date;
let fixedNow = RealDate.UTC(2026, 9, 6, 15, 4, 9);
class FakeDate extends RealDate {
    constructor(...args) { if (args.length) super(...args); else super(fixedNow); }
    static now() { return fixedNow; }
}
const Date = FakeDate;                        // `new Date()` / `Date.now()` del original
let domCounts = { total: 0, completed: 0, notDone: 0 };
const document = {
    clockElement: { textContent: '' },
    getElementById(id) { return id === 'liveClock' ? this.clockElement : null; },
    querySelectorAll(selector) {
        const n = selector === '.task-item' ? domCounts.total : selector === '.task-item .status-completed' ? domCounts.completed : domCounts.notDone;
        return { length: n };
    }
};
const window = { idleDetectorGranted: false };
let globalIdleState = false;
let domFallbackResult = false;
function shouldApplyDomIdleFallback() { return domFallbackResult; }
let currentUser = null;
let alerts = [];
let recoverResult = null;
let recoverThrows = null;
async function recoverGestorTaskProgress() { if (recoverThrows) throw recoverThrows; return recoverResult; }
const alert = (m) => alerts.push(m);
const consoleErrors = [];
const console = { error: (...a) => consoleErrors.push(a.map(String).join(' ')), log() {}, warn() {} };
const timelineCalls = [];
function pushTimelineEvent(type, action) { timelineCalls.push([type, action]); }
const localStorage = { value: null, getItem() { return this.value; } };


// --- copia LITERAL de app.js líneas 1322-1332 (updateClock) ---
function updateClock() {
    const clockElement = document.getElementById('liveClock');
    if (!clockElement) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    clockElement.textContent = `${hours}:${minutes}:${seconds}`;
}

// --- copia LITERAL de app.js líneas 1559-1579 (formatExcelDate, anidada en loadSchedule) ---
        function formatExcelDate(serial) {
            if(!serial) return "";
            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            
            // Si ya es un string que parece fecha (ej: "2026-06-08" o "2026-06-08T00:00...")
            if (typeof serial === 'string' && (serial.includes('-') || serial.includes('/'))) {
                const d = new Date(serial);
                if (!isNaN(d.getTime())) {
                    return `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`;
                }
            }
            
            // Si es un número (serial de Excel)
            if (!isNaN(serial)) {
                const epochUTC = Date.UTC(1899, 11, 30);
                const d = new Date(epochUTC + parseFloat(serial) * 86400000);
                return `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`;
            }
            
            return "";
        }

// --- copia LITERAL de app.js líneas 2123-2125 (canonicalTaskId) ---
function canonicalTaskId(id) {
    return String(id);
}

// --- envoltorios mínimos (solo reciben/devuelven variables; el cuerpo es literal) ---
function legacyMockIdGenerator() {
// --- copia LITERAL de app.js líneas 1389-1403 (generateDeterministicMockTaskId) ---
                const usedMockIds = new Set();
                const generateDeterministicMockTaskId = (taskName, set) => {
                    const raw = `${(set || 'Otros').trim().toLowerCase()}::${(taskName || '').trim().toLowerCase()}`;
                    let hash = 0;
                    for (let i = 0; i < raw.length; i++) {
                        hash = ((hash << 5) - hash) + raw.charCodeAt(i);
                        hash |= 0;
                    }
                    let candidate = 10000 + (Math.abs(hash) % 89999);
                    while (usedMockIds.has(candidate)) {
                        candidate++;
                    }
                    usedMockIds.add(candidate);
                    return candidate;
                };
    return generateDeterministicMockTaskId;
}

function legacyReconcileCache(processedRows, taskStateCache) {
// --- copia LITERAL de app.js líneas 1462-1463 (inicio del bloque de caché) ---
            let hasNewTasksToSync = false;
            const validAssignedIds = new Set(processedRows.map((row, index) => canonicalTaskId(row.id !== undefined ? row.id : index)));
// --- copia LITERAL de app.js líneas 1466-1486 (purga + estado inicial) ---
            let cacheWasPurged = false;
            for (const cachedId in taskStateCache) {
                if (!validAssignedIds.has(cachedId) && !cachedId.startsWith('extra_')) {
                    delete taskStateCache[cachedId];
                    cacheWasPurged = true;
                }
            }

            processedRows.forEach((row, index) => {
                const taskId = canonicalTaskId(row.id !== undefined ? row.id : index);
                const taskName = row['Tarea'];
                if (!taskStateCache[taskId]) {
                    taskStateCache[taskId] = {
                        name: taskName,
                        status: 'En Proceso',
                        observation: '',
                        updatedAt: Date.now()
                    };
                    hasNewTasksToSync = true;
                }
            });
    return { hasNewTasksToSync, cacheWasPurged };
}

function legacySyncCounters() {
// --- copia LITERAL de app.js líneas 2398-2406 (contadores del latido) ---
    const totalTasks = document.querySelectorAll('.task-item').length;
    const completedTasks = document.querySelectorAll('.task-item .status-completed').length;
    const notDoneTasks = document.querySelectorAll('.task-item .status-not-done').length;
    const finalized = completedTasks + notDoneTasks;

    let percentage = 0;
    if (totalTasks > 0) {
        percentage = Math.round((finalized / totalTasks) * 100);
    }
    return { totalTasks, completedTasks, notDoneTasks, finalized, percentage };
}

function legacyKpiFigures() {
// --- copia LITERAL de app.js líneas 2475-2491 (cifras de updateKPI) ---
    const totalTasks = document.querySelectorAll('.task-item').length;
    const completedTasks = document.querySelectorAll('.task-item .status-completed').length;
    const notDoneTasks = document.querySelectorAll('.task-item .status-not-done').length;
    
    // Finalizadas = completed + not-done
    const finalized = completedTasks + notDoneTasks; 
    const pending = totalTasks - finalized;
    
    let completedPercentage = 0;
    let notDonePercentage = 0;
    let totalPercentage = 0;
    
    if (totalTasks > 0) {
        completedPercentage = Math.round((completedTasks / totalTasks) * 100);
        notDonePercentage = Math.round((notDoneTasks / totalTasks) * 100);
        totalPercentage = completedPercentage + notDonePercentage;
    }
    return { totalTasks, completedTasks, notDoneTasks, finalized, pending, completedPercentage, notDonePercentage, totalPercentage };
}

function legacyIsInactive() {
    const nowMs = 0;
// --- copia LITERAL de app.js líneas 2419-2424 (isInactive del latido) ---
    let isInactive = false;
    if (window.idleDetectorGranted) {
        isInactive = globalIdleState;
    } else if (shouldApplyDomIdleFallback(nowMs)) {
        isInactive = true;
    }
    return isInactive;
}

function legacyTimelineTransition(currentStatus, localStatus) {
// --- copia LITERAL de app.js líneas 2438-2442 (transición de Inactividad) ---
    if (currentStatus === 'Inactivo' && localStatus !== 'Inactivo') {
        pushTimelineEvent('Inactividad', 'start');
    } else if (currentStatus !== 'Inactivo' && localStatus === 'Inactivo') {
        pushTimelineEvent('Inactividad', 'end');
    }
}

function legacySessionMetadata(currentUser, loginTime, newLastActive, currentStatus, totalTasks, finalized, completedTasks, notDoneTasks, percentage, shiftTimeline) {
// --- copia LITERAL de app.js líneas 2451-2465 (sessionMetadata) ---
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
    return sessionMetadata;
}

function legacyReviewerText(task) {
// --- copia LITERAL de app.js líneas 2639-2643 (texto de Admin/Supervisor) ---
                // Show task detail and instructions for admin/supervisor review
                let detailText = `Detalle: ${task['Detalle de Tarea'] || 'Sin detalle'}\n\n`;
                detailText += `Horario: ${task['Horario'] || 'No especificado'}\n`;
                detailText += `Día: ${task['Día'] || 'No especificado'}\n\n`;
                detailText += `Instrucciones:\n${task['Instrucciones'] || 'Sin instrucciones'}`;
    return detailText;
}

function legacyMatchRenderQuickDocs(selectedTaskName) {
    let matchedDoc = null;
// --- copia LITERAL de app.js líneas 2545-2556 (regla de renderQuickDocs) ---
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
    return matchedDoc;
}

function legacyMatchHelpBtn(taskName) {
// --- copia LITERAL de app.js líneas 3093-3102 (regla del botón de ayuda) ---
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
    return matchedDoc;
}

function legacyAvatar(fullName) {
// --- copia LITERAL de app.js líneas 2795-2810 (lista de avatares) ---
            const availableAvatars = [
                "Alexander Villada.png",
                "Camilo Espinosa.png",
                "Daniel Benavides.png",
                "Josue Alvarez.png",
                "Juan Jose Diaz.png",
                "Luis Fuentes.png",
                "Maria Sanchez.png",
                "Marilyn Jimenez.png",
                "Oriana Borja.png",
                "Samuel Cruz.png",
                "Sara Santamaria.png",
                "Sebastian Arango.png",
                "Sebastian Hincapie.png",
                "Yefferson Giraldo.png"
            ];
// --- copia LITERAL de app.js líneas 2814-2814 (búsqueda) ---
            let matchedAvatar = availableAvatars.find(img => namesMatch(fullName, img.replace('.png', '')));
    return { availableAvatars, matchedAvatar };
}

function legacyPingWorkerCode() {
// --- copia LITERAL de app.js líneas 2833-2837 (código del worker) ---
            const workerCode = `
                setInterval(() => {
                    postMessage('ping');
                }, 30000);
            `;
    return workerCode;
}

async function legacyStartupRecovery(currentUser) {
// --- copia LITERAL de app.js líneas 2728-2748 (primer bloque de initApp) ---
    if (currentUser && currentUser.role === 'Gestor' && currentUser.uid) {
        try {
            const recovery = await recoverGestorTaskProgress(currentUser.uid);
            if (recovery.status === 'REMOTE_READ_FAILED') {
                alert(
                    'No se pudo verificar el progreso remoto de tareas en el servidor. '
                    + 'Se conserva el respaldo local de este dispositivo; se reintentará más adelante.',
                );
            } else if (recovery.failedMigrationsCount > 0) {
                // Advertencia visible; nunca se reporta esto como una recuperación
                // exitosa. El respaldo local ya quedó conservado por
                // migrateLocalTasksToActiveSession() antes de cada intento fallido.
                alert(
                    `No se pudo sincronizar con el servidor el progreso local de ${recovery.failedMigrationsCount} tarea(s). `
                    + 'Se conservó el respaldo local en este dispositivo; vuelve a guardar esas tareas cuando tengas conexión.',
                );
            }
        } catch (e) {
            console.error('No se pudo recuperar el progreso remoto de tareas al iniciar:', e);
        }
    }
}

// ======================================================================================================
// updateClock → formatClockTime
// ======================================================================================================
test('formatClockTime: igual que updateClock() de app.js en horas límite y 500 instantes aleatorios', () => {
    const rng = createRng(77);
    const instants = [
        RealDate.UTC(2026, 0, 1, 0, 0, 0), RealDate.UTC(2026, 0, 1, 9, 5, 7), RealDate.UTC(2026, 5, 15, 23, 59, 59), RealDate.UTC(2026, 11, 31, 12, 0, 0)
    ];

    for (let i = 0; i < 500; i++) instants.push(Math.floor(rng() * 4e12));

    instants.forEach((ms) => {
        fixedNow = ms;
        document.clockElement.textContent = '';
        updateClock();
        assert.equal(formatClockTime(new RealDate(ms)), document.clockElement.textContent);
    });

    assert.match(formatClockTime(new RealDate(2026, 0, 1, 9, 5, 7)), /^09:05:07$/);
});

// ======================================================================================================
// formatExcelDate (anidada en loadSchedule)
// ======================================================================================================
test('formatExcelDate: igual que app.js para seriales, cadenas de fecha, vacíos y basura (incluye 1000 seriales aleatorios)', () => {
    const rng = createRng(2026);
    const inputs = [
        '', null, undefined, 0, '0', false, true, 'Lunes', 'GESTOR', '2026-06-08', '2026-06-08T00:00:00.000Z', '8/6/2026', '2026/06/08',
        'abc-def', 'x/y', '1-1', 45000, 45000.5, '45000', 45201, 46022, 1, -5, 'NaN', ' ', {}, [], [45000], 'Vac-1', 'Desc/Familia', '12/25/2026', 'Dic'
    ];

    for (let i = 0; i < 1000; i++) inputs.push(Math.floor(30000 + rng() * 25000) + (rng() < 0.3 ? rng() : 0));

    inputs.forEach((value) => assert.equal(newFormatExcelDate(value), formatExcelDate(value), `entrada ${JSON.stringify(value)}`));
});

// ======================================================================================================
// task-progress: contadores del latido y cifras del KPI
// ======================================================================================================
test('computeSyncPercentage y computeKpiFigures({ legacy: true }): igual que el código de app.js para TODAS las combinaciones 0..30', () => {
    let n = 0;

    for (let total = 0; total <= 30; total++) {
        for (let completed = 0; completed <= total; completed++) {
            for (let notDone = 0; notDone <= total - completed; notDone++) {
                domCounts = { total, completed, notDone };
                const counts = { total, completed, notDone };

                assert.deepEqual(computeSyncPercentage(counts), legacySyncCounters());
                // D8: el cálculo original de la tarjeta solo con la opción explícita `legacy: true`
                assert.deepEqual(computeKpiFigures(counts, { legacy: true }), legacyKpiFigures());
                // Por defecto solo cambia totalPercentage (= formatProgress(finalizadas, total)); el resto es idéntico
                const legacyFig = legacyKpiFigures();
                assert.deepEqual(computeKpiFigures(counts), { ...legacyFig, totalPercentage: total > 0 ? Math.round(((completed + notDone) / total) * 100) : 0 });
                n += 1;
            }
        }
    }

    assert.ok(n > 5000);
});

test('D8: formatProgress(current, total) = Math.round(current/total*100); 0 si total = 0 o inválido', () => {
    assert.equal(formatProgress(2, 3), 67);
    assert.equal(formatProgress(1, 3), 33);
    assert.equal(formatProgress(0, 3), 0);
    assert.equal(formatProgress(3, 3), 100);
    assert.equal(formatProgress(1, 8), 13); // 12,5 -> 13 (Math.round redondea .5 hacia arriba)
    assert.equal(formatProgress(5, 0), 0);
    assert.equal(formatProgress(0, 0), 0);
    assert.equal(formatProgress(1, -2), 0);
    assert.equal(formatProgress(1, NaN), 0);
    assert.equal(formatProgress(1, undefined), 0);
    assert.equal(formatProgress(1, null), 0);
    assert.equal(formatProgress(undefined, 4), 0);
    assert.equal(formatProgress(NaN, 4), 0);
    assert.equal(formatProgress(1, Infinity), 0);
});

test('D8: 1 realizada + 1 no realizada de 3 -> 67 en el latido Y en la tarjeta KPI (app.js mostraba 66 en la tarjeta)', () => {
    const counts = { total: 3, completed: 1, notDone: 1 };

    assert.equal(computeSyncPercentage(counts).percentage, 67);
    assert.equal(computeKpiFigures(counts).totalPercentage, 67);
    assert.equal(computeKpiFigures(counts, { legacy: true }).totalPercentage, 66, 'cálculo anterior de app.js, solo con legacy');
    // Los arcos del círculo siguen siendo los porcentajes individuales
    assert.equal(computeKpiFigures(counts).completedPercentage, 33);
    assert.equal(computeKpiFigures(counts).notDonePercentage, 33);
});

test('D8: latido y tarjeta KPI muestran SIEMPRE el mismo entero (todas las combinaciones 0..30); sin tareas ambos 0', () => {
    let antesDistintos = 0;

    for (let total = 0; total <= 30; total++) {
        for (let c = 0; c <= total; c++) {
            for (let d = 0; d <= total - c; d++) {
                const counts = { total, completed: c, notDone: d };
                const sync = computeSyncPercentage(counts).percentage;
                assert.equal(computeKpiFigures(counts).totalPercentage, sync, JSON.stringify(counts));
                assert.equal(sync, formatProgress(c + d, total));
                if (computeKpiFigures(counts, { legacy: true }).totalPercentage !== sync) antesDistintos += 1;
            }
        }
    }

    assert.ok(antesDistintos > 0, `app.js difería en ${antesDistintos} combinaciones`);
    assert.equal(computeSyncPercentage({ total: 0, completed: 0, notDone: 0 }).percentage, 0);
    assert.equal(computeKpiFigures({ total: 0, completed: 0, notDone: 0 }).totalPercentage, 0);
});

// ======================================================================================================
// task-session-sync
// ======================================================================================================
test('shouldSyncActiveSession: solo un Gestor con uid (igual que la guarda de app.js 2387-2389)', () => {
    assert.equal(shouldSyncActiveSession(null), false);
    assert.equal(shouldSyncActiveSession(undefined), false);
    assert.equal(shouldSyncActiveSession({ role: 'Admin', uid: 'x' }), false);
    assert.equal(shouldSyncActiveSession({ role: 'Supervisor', uid: 'x' }), false);
    assert.equal(shouldSyncActiveSession({ role: 'Gestor' }), false);
    assert.equal(shouldSyncActiveSession({ role: 'Gestor', uid: '' }), false);
    assert.equal(shouldSyncActiveSession({ role: 'Gestor', uid: 'g1' }), true);
});

test('isSessionClosedElsewhere / resolveLoginTime: sesión cerrada en otra pestaña y hora de login de respaldo', () => {
    assert.equal(isSessionClosedElsewhere(null), true);
    assert.equal(isSessionClosedElsewhere(''), true);
    assert.equal(isSessionClosedElsewhere('{"uid":"g1"}'), false);
    assert.equal(resolveLoginTime({ loginTime: '2026-10-06T08:00:00.000Z' }, () => 'AHORA'), '2026-10-06T08:00:00.000Z');
    assert.equal(resolveLoginTime({}, () => 'AHORA'), 'AHORA');
    assert.equal(resolveLoginTime({ loginTime: '' }, () => 'AHORA'), 'AHORA');
});

test('resolveIsInactive: igual que app.js (detector nativo manda; sin él, el respaldo por DOM) en las 8 combinaciones', () => {
    for (const granted of [false, true]) {
        for (const idle of [false, true]) {
            for (const fallback of [false, true]) {
                window.idleDetectorGranted = granted;
                globalIdleState = idle;
                domFallbackResult = fallback;

                const nuevo = resolveIsInactive({ idleDetectorGranted: granted, globalIdleState: idle, domIdleFallback: () => fallback });

                assert.equal(nuevo, legacyIsInactive());
            }
        }
    }

    let evaluated = 0;
    resolveIsInactive({ idleDetectorGranted: true, globalIdleState: false, domIdleFallback: () => { evaluated += 1; return true; } });
    assert.equal(evaluated, 0, 'con detector nativo el respaldo por DOM ni se evalúa');
});

test('decideInactivityTimelineAction: igual que app.js en todos los pares de estados', () => {
    const statuses = ['En Línea', 'Inactivo', 'En Almuerzo', 'En Desayuno', 'En Pausa de Turno', 'Activo'];

    statuses.forEach((current) => statuses.forEach((previous) => {
        timelineCalls.length = 0;
        legacyTimelineTransition(current, previous);
        const expected = timelineCalls.length ? timelineCalls[0][1] : null;

        assert.equal(decideInactivityTimelineAction(current, previous), expected, `${previous} -> ${current}`);
        if (timelineCalls.length) assert.equal(timelineCalls[0][0], 'Inactividad');
    }));
});

test('buildSessionMetadata y buildSessionMetadataTail: mismo payload que app.js (diferencial; sin tasks)', () => {
    const user = { name: 'Ana Prueba', email: 'ana@x.co', shift: '8am - 4pm', uid: 'g1', tasks: { a: 1 } };

    for (const timeline of [null, undefined, [], [{ type: 'Inactividad', start: 1, end: 2 }]]) {
        for (const shift of ['8am - 4pm', '', undefined]) {
            const u = { ...user, shift };
            const counters = { totalTasks: 7, finalized: 3, completedTasks: 2, notDoneTasks: 1, percentage: 43 };
            const legacy = legacySessionMetadata(u, 'LOGIN', 12345, 'En Línea', 7, 3, 2, 1, 43, timeline);
            const nuevo = buildSessionMetadata({ user: u, loginTime: 'LOGIN', lastActive: 12345, status: 'En Línea', counters, timeline });

            assert.deepEqual(nuevo, legacy);
            assert.ok(!('tasks' in nuevo));

            const tail = buildSessionMetadataTail(counters, timeline);
            const expectedTail = { finalizedTasks: legacy.finalizedTasks, completedTasks: legacy.completedTasks, notDoneTasks: legacy.notDoneTasks, percentage: legacy.percentage, timeline: legacy.timeline, appVersion: legacy.appVersion };

            assert.deepEqual(tail, expectedTail);
        }
    }

    assert.equal(APP_VERSION, 'v104');
});

// ======================================================================================================
// task-recovery
// ======================================================================================================
testAsync('describeRecoveryAlert + shouldRecoverTaskProgress: mismas alertas que el primer bloque de initApp()', async () => {
    const results = [
        { status: 'OK', failedMigrationsCount: 0 },
        { status: 'OK', failedMigrationsCount: 3 },
        { status: 'REMOTE_READ_FAILED', failedMigrationsCount: 0 },
        { status: 'IDENTITY_MISMATCH', failedMigrationsCount: 0 },
        { status: 'OK', failedMigrationsCount: 1 }
    ];

    for (const recovery of results) {
        for (const user of [{ role: 'Gestor', uid: 'g1' }, { role: 'Gestor' }, { role: 'Admin', uid: 'a1' }, null]) {
            alerts = [];
            recoverResult = recovery;
            recoverThrows = null;
            currentUser = user;
            await legacyStartupRecovery(currentUser);

            const expected = shouldRecoverTaskProgress(user) ? describeRecoveryAlert(recovery) : null;

            assert.deepEqual(alerts, expected ? [expected] : [], `${JSON.stringify(recovery)} / ${JSON.stringify(user)}`);
        }
    }

    assert.equal(RECOVERY_STATUS.IDENTITY_MISMATCH, 'IDENTITY_MISMATCH');
});

// ======================================================================================================
// task-save-rules (el diferencial completo del listener va en controllers/task-controller.test.mjs)
// ======================================================================================================
test('validateTaskSaveInput: cada regla devuelve su mensaje y el orden es el del original', () => {
    const ok = { currentActiveTaskId: '3', selectedStatusText: ' Finalizada ', observation: '  hecho  ', authUser: { uid: 'g1' }, currentUser: { uid: 'g1' }, currentSelectedTask: { id: 3 } };

    assert.deepEqual(validateTaskSaveInput(ok), { ok: true, taskId: '3', observation: 'hecho' });
    assert.equal(validateTaskSaveInput({ ...ok, currentActiveTaskId: null }).message, 'Selecciona una tarea antes de guardar el progreso.');
    assert.equal(validateTaskSaveInput({ ...ok, currentActiveTaskId: undefined }).message, 'Selecciona una tarea antes de guardar el progreso.');
    assert.equal(validateTaskSaveInput({ ...ok, selectedStatusText: null }).message, 'Selecciona un estado antes de guardar el progreso.');
    assert.equal(validateTaskSaveInput({ ...ok, observation: '   ' }).message, 'OBLIGATORIO: Debes detallar la gestión realizada en las Notas Técnicas antes de guardar.');
    assert.equal(validateTaskSaveInput({ ...ok, authUser: null }).message, 'Tu sesión expiró. Vuelve a iniciar sesión para guardar el progreso.');
    assert.equal(validateTaskSaveInput({ ...ok, currentUser: { uid: 'otro' } }).message, 'No se pudo verificar tu identidad. Vuelve a iniciar sesión para guardar el progreso.');
    assert.equal(validateTaskSaveInput({ ...ok, currentUser: null }).message, 'No se pudo verificar tu identidad. Vuelve a iniciar sesión para guardar el progreso.');
    assert.equal(validateTaskSaveInput({ ...ok, currentActiveTaskId: 'a.b' }).message, 'La tarea seleccionada tiene un identificador inválido y no puede guardarse.');
    assert.equal(validateTaskSaveInput({ ...ok, currentActiveTaskId: 'a/b' }).message, 'La tarea seleccionada tiene un identificador inválido y no puede guardarse.');
    assert.equal(validateTaskSaveInput({ ...ok, currentSelectedTask: null }).message, 'No se pudo confirmar la tarea seleccionada. Vuelve a seleccionarla antes de guardar.');
    assert.equal(validateTaskSaveInput({ ...ok, currentSelectedTask: { id: 9 } }).message, 'No se pudo confirmar la tarea seleccionada. Vuelve a seleccionarla antes de guardar.');
    assert.equal(validateTaskSaveInput({ ...ok, currentActiveTaskId: null, selectedStatusText: null }).message, 'Selecciona una tarea antes de guardar el progreso.');
    assert.equal(validateTaskSaveInput({ ...ok, currentActiveTaskId: 0, currentSelectedTask: { id: 0 } }).ok, true);
});

test('buildTaskRecord, resolveStatusClassForButton y describeTaskSaveError', () => {
    assert.deepEqual(buildTaskRecord({ Tarea: 'Revisar GGR' }, ' En Proceso ', 'obs', 99), { name: 'Revisar GGR', status: 'En Proceso', observation: 'obs', updatedAt: 99 });

    const cl = (...names) => ({ contains: (n) => names.includes(n) });

    assert.equal(resolveStatusClassForButton(cl('completed')), 'status-completed');
    assert.equal(resolveStatusClassForButton(cl('in-progress')), 'status-in-progress');
    assert.equal(resolveStatusClassForButton(cl('not-done')), 'status-not-done');
    assert.equal(resolveStatusClassForButton(cl('pending')), 'status-pending');
    assert.equal(resolveStatusClassForButton(cl('completed', 'not-done')), 'status-completed', 'prioridad del original');

    assert.equal(describeTaskSaveError({ code: 'PERMISSION_DENIED' }).isPermissionDenied, true);
    assert.equal(describeTaskSaveError({ message: 'Permission denied' }).isPermissionDenied, true);
    assert.equal(describeTaskSaveError({ message: 'permission_denied' }).message, 'No tienes permiso para guardar esta tarea. Contacta a tu supervisor.');
    assert.equal(describeTaskSaveError(new Error('red')).message, 'No se pudo guardar el progreso en el servidor. El cambio quedó respaldado localmente; intenta guardar de nuevo.');
    assert.equal(describeTaskSaveError(null).isPermissionDenied, false);
});

// ======================================================================================================
// task-selection
// ======================================================================================================
test('buildReviewerTaskDetailText: igual que app.js con y sin campos', () => {
    const tasks = [
        { 'Detalle de Tarea': 'D', 'Horario': 'H', 'Día': 'Lun', 'Instrucciones': '1. a\n2. b' },
        {}, { 'Detalle de Tarea': '', 'Horario': null }, { 'Instrucciones': 'solo' }
    ];

    tasks.forEach((task) => assert.equal(buildReviewerTaskDetailText(task), legacyReviewerText(task)));
});

test('findCatalogTask: compara por id canónico (0 y "0" coinciden) y isTaskReviewerRole', () => {
    const catalog = [{ id: 0, Tarea: 'cero' }, { id: 7, Tarea: 'siete' }, { id: 10001, Tarea: 'mock' }];

    assert.equal(findCatalogTask(catalog, '0').Tarea, 'cero');
    assert.equal(findCatalogTask(catalog, 0).Tarea, 'cero');
    assert.equal(findCatalogTask(catalog, '10001').Tarea, 'mock');
    assert.equal(findCatalogTask(catalog, 'x'), undefined);
    assert.equal(isTaskReviewerRole({ role: 'Admin' }), true);
    assert.equal(isTaskReviewerRole({ role: 'Supervisor' }), true);
    assert.equal(isTaskReviewerRole({ role: 'Gestor' }), false);
    assert.equal(isTaskReviewerRole(null), false);
});

// ======================================================================================================
// quick-docs y reglas de initApp
// ======================================================================================================
test('matchQuickDoc: igual que las DOS copias de app.js (renderQuickDocs y botón de ayuda) en todas las palabras clave', () => {
    const keywords = ['ggr', 'apuesta', 'retiro', 'jineteo', 'eliminaci', 'bonos', 'deportiv', 'evento', 'seon', 'zzz'];
    const names = ['', null, 'Revisión GGR casino', 'Validación de apuestas', 'Retiros pendientes', 'Jineteo', 'Eliminación de cuentas', 'Abuso de bonos', 'Eventos deportivos', 'Revisión de eventos', 'SEON check', 'Tarea sin pista', 'GGR de eventos deportivos con apuestas', 'bonos y retiros'];
    const rng = createRng(5);

    for (let i = 0; i < 300; i++) {
        const parts = [];
        for (let k = 0; k < 1 + Math.floor(rng() * 3); k++) parts.push(keywords[Math.floor(rng() * keywords.length)]);
        names.push(parts.join(' ').toUpperCase());
        names.push('Tarea ' + parts.join(' '));
    }

    names.forEach((name) => {
        assert.equal(matchQuickDoc(name), legacyMatchRenderQuickDocs(name), `renderQuickDocs: ${name}`);
        assert.equal(matchQuickDoc(name), name ? legacyMatchHelpBtn(name.toLowerCase()) : null, `botón de ayuda: ${name}`);
    });

    assert.equal(QUICK_DOC_FILES.length, 9);
});

test('getQuickDocIconMeta y stripDocExtension: ícono por tipo y nombre sin extensión', () => {
    assert.deepEqual(getQuickDocIconMeta('a.pdf'), { icon: 'bx-file-pdf', color: '#FF5A5A' });
    assert.deepEqual(getQuickDocIconMeta('A.MP4'), { icon: 'bx-video', color: '#3B82F6' });
    assert.deepEqual(getQuickDocIconMeta('a.docx'), { icon: 'bx-file-blank', color: '#2563EB' });
    assert.deepEqual(getQuickDocIconMeta('a.doc'), { icon: 'bx-file-blank', color: '#2563EB' });
    assert.deepEqual(getQuickDocIconMeta('a.xlsx'), { icon: 'bx-table', color: '#10B981' });
    assert.equal(stripDocExtension('Revisión de Eventos.mp4'), 'Revisión de Eventos');
    assert.equal(stripDocExtension('sin_extension'), 'sin_extension');
});

test('app-init-rules: avatares, búsqueda, worker de ping y tema (diferencial contra los literales de initApp)', () => {
    const legacy = legacyAvatar('Luis Fuentes');

    assert.deepEqual([...AVAILABLE_AVATARS], legacy.availableAvatars);
    assert.equal(PING_INTERVAL_MS, 30000);
    assert.equal(buildPingWorkerCode(), legacyPingWorkerCode());

    ['Luis Fuentes', 'Luis Alfredo Fuentes Martinez', 'Sara Santamaría', 'Josue Daniel Alvarez', 'Daniel Benavides', 'Nombre Inexistente', 'Maria Sanchez'].forEach((name) => {
        assert.equal(findAvatarFile(name, (a, b) => namesMatch(a, b)), legacyAvatar(name).matchedAvatar, name);
    });

    assert.equal(buildAvatarSrc('Luis Fuentes.png', 'Luis Fuentes'), 'assets/src/img/Luis Fuentes.png');
    assert.equal(buildAvatarSrc(undefined, 'Ana Pérez'), 'https://ui-avatars.com/api/?name=Ana%20P%C3%A9rez&background=0D8ABC&color=fff');
    assert.equal(buildFallbackAvatarUrl('Ana Pérez'), 'https://ui-avatars.com/api/?name=Ana%20P%C3%A9rez&background=0D8ABC&color=fff');
    assert.equal(resolveSavedTheme(null), 'dark');
    assert.equal(resolveSavedTheme(''), 'dark');
    assert.equal(resolveSavedTheme('light'), 'light');
    assert.equal(nextTheme('dark'), 'light');
    assert.equal(nextTheme('light'), 'dark');
    assert.equal(nextTheme(null), 'dark');
    assert.equal(themeIconHTML('dark'), "<i class='bx bx-moon'></i>");
    assert.equal(themeIconHTML('light'), "<i class='bx bx-sun'></i>");
});

// ======================================================================================================
// task-catalog (lógica pura de loadExcelTasks; el diferencial de la función completa va en controllers/)
// ======================================================================================================
test('createMockTaskIdGenerator: mismos ids que app.js, incluidas colisiones y rango 10000+', () => {
    const rng = createRng(31);
    const sets = ['Casino', 'Deportes', 'Otros', '', undefined, 'CASINO ', 'Pagos'];
    const names = ['Revisar GGR', 'Validar apuestas', '', undefined, 'revisar ggr', 'Tarea muy larga con ñ y acentos Ó'];
    const legacyGen = legacyMockIdGenerator();
    const nuevoGen = createMockTaskIdGenerator(new Set());
    const seen = [];

    for (let i = 0; i < 500; i++) {
        const name = names[Math.floor(rng() * names.length)];
        const set = sets[Math.floor(rng() * sets.length)];
        const a = legacyGen(name, set);
        const b = nuevoGen(name, set);

        assert.equal(b, a, `${set}::${name}`);
        assert.ok(b >= 10000);
        seen.push(b);
    }

    assert.equal(new Set(seen).size, seen.length, 'los ids son únicos aunque se repitan las entradas');
});

test('reconcileGestorTaskCache: igual que el bloque de loadExcelTasks (purga de huérfanas, extra_ intactas, estado inicial)', () => {
    const rng = createRng(11);

    for (let i = 0; i < 200; i++) {
        const rows = [];
        const n = Math.floor(rng() * 6);

        for (let k = 0; k < n; k++) rows.push(rng() < 0.2 ? { Tarea: 'sin id ' + k } : { id: k + (rng() < 0.3 ? 10000 : 0), Tarea: 'T' + k });

        const cache = {};

        ['0', '1', '2', '10001', '77', 'extra_1', 'extra_zz', 'viejo'].forEach((id) => {
            if (rng() < 0.5) cache[id] = { name: 'N' + id, status: 'Finalizada', observation: 'o', updatedAt: 5 };
        });

        const legacyCache = JSON.parse(JSON.stringify(cache));
        const nuevoCache = JSON.parse(JSON.stringify(cache));
        const legacy = legacyReconcileCache(rows, legacyCache);
        const { purgedTaskIds, ...nuevo } = reconcileGestorTaskCache(nuevoCache, rows, fixedNow);

        assert.deepEqual(nuevo, legacy);
        // W-26: los ids purgados son exactamente las llaves que desaparecieron del caché.
        assert.deepEqual([...purgedTaskIds].sort(), Object.keys(cache).filter((k) => !(k in nuevoCache)).sort());
        assert.deepEqual(nuevoCache, legacyCache);
        assert.equal(Object.keys(nuevoCache).filter((k) => k.startsWith('extra_')).length, Object.keys(cache).filter((k) => k.startsWith('extra_')).length, 'las tareas extra nunca se purgan');
    }
});

test('buildGestorTaskRows: filtra el maestro por cronograma y agrega tareas mock; sin asignaciones → []', () => {
    const matchers = { taskNamesMatch: (a, b) => String(a).toLowerCase() === String(b).toLowerCase(), setNamesMatch: (a, b) => String(a).toLowerCase() === String(b).toLowerCase() };
    const master = assignMasterRowIds([
        { 'Set ': 'Casino', Tarea: 'Revisar GGR' }, { 'Set': 'Deportes', Tarea: 'Revisar apuestas' }, { Tarea: 'Sin set' }
    ]);

    // W-26: ids estables por contenido (Set + Tarea), en el rango 0-9999 y únicos.
    assert.equal(new Set(master.map((r) => r.id)).size, 3);
    assert.ok(master.every((r) => Number.isInteger(r.id) && r.id >= 0 && r.id < 10000));
    assert.deepEqual(buildGestorTaskRows(master, [], matchers), []);
    assert.deepEqual(buildGestorTaskRows(master, null, matchers), []);

    const rows = buildGestorTaskRows(master, [{ task: 'revisar ggr', set: 'casino' }, { task: 'Tarea nueva', set: 'Pagos' }], matchers);

    assert.equal(rows.length, 2);
    assert.equal(rows[0].id, master[0].id);
    assert.equal(rows[1]['Tarea'], 'Tarea nueva');
    assert.equal(rows[1]['Set '], 'Pagos');
    assert.equal(rows[1]['Horario'], 'Durante el turno');
    assert.equal(rows[1]['Día'], 'Diario');
    assert.ok(rows[1].id >= 10000);
    assert.equal(getRowSet({ 'Set ': '', Set: '' }), 'Otros');
});

test('groupTasksBySet, selector de Set y utilidades de catálogo', () => {
    const rows = [
        { id: 0, 'Set ': 'B', Tarea: 'x', 'Detalle de Tarea': 'd', Horario: 'h', 'Día': 'l' },
        { id: 1, 'Set ': 'B', Tarea: 'x' },
        { 'Set ': 'A', Tarea: 'y' }
    ];
    const { tasksBySet, allTasks } = groupTasksBySet(rows);

    assert.deepEqual(Object.keys(tasksBySet).sort(), ['A', 'B']);
    assert.equal(tasksBySet.B.length, 1);
    assert.equal(allTasks.length, 3);
    assert.equal(allTasks[2].id, 2);
    assert.deepEqual(tasksBySet.B[0], { id: 0, name: 'x', detail: 'd', time: 'h', day: 'l' });

    assert.equal(decideSetSelectorView([]).mode, 'none');
    assert.deepEqual(decideSetSelectorView(['A']), { mode: 'single', set: 'A' });
    assert.equal(decideSetSelectorView(['A', 'B']).mode, 'choose');
    assert.equal(selectTasksForSet(tasksBySet, 'Todos'), tasksBySet);
    assert.deepEqual(Object.keys(selectTasksForSet(tasksBySet, 'A')), ['A']);
    assert.equal(buildSetSelectorOptionsHTML(['A&B'], escapeHTML), '<option value="" disabled selected>Selecciona tu SET a trabajar...</option><option value="Todos">Mostrar Todos</option><option value="A&amp;B">A&amp;B</option>');
    assert.equal(resolveGestorShift('8am - 4pm', 'Descansa'), '8am - 4pm');
    assert.equal(resolveGestorShift('8am - 4pm', 'Por Asignar'), '8am - 4pm');
    assert.equal(resolveGestorShift('8am - 4pm', '2pm - 10pm'), '2pm - 10pm');
    assert.equal(resolveGestorShift(undefined, null), 'Por Asignar');
    assert.equal(buildTasksExcelUrl(5), encodeURI(TASKS_EXCEL_PATH) + '?t=5');
});

await summarizeAsync();
