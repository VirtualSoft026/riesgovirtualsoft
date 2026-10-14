import { createRunner, assert } from '../test-harness.mjs';
import { buildSupervisorDirectory } from '../../domain/schedules/supervisor-directory.js';
import {
    AVAILABLE_AVATARS,
    resolveAvatarSrc,
    buildFallbackAvatarSrc,
    buildShiftDelayBadgeHtml,
    filterActiveSessionUids,
    computeTaskProgress,
    buildCardDisplayTasks,
    buildTasksListHtml,
    buildSessionCardModel,
    buildSessionCardHtml,
    buildEmptyMonitoringHtml,
    buildVisibleTimeline,
    buildTimelineRowHtml,
    buildTimelineRowsHtml,
    EMPTY_TIMELINE_ROW_HTML,
    buildMonitoreoInfoText,
    buildDetailDisplayTasks,
    buildDetailTaskCardHtml,
    resolveTaskBadge,
    buildNoTasksHtml
} from '../../domain/analytics/monitoring-view.js';
import { escapeHTML } from '../../utils/sanitization.js';

const { test, summarize } = createRunner('monitoring-view (tarjetas de Monitoreo: filtros, estado, retraso, tareas, bitácora y detalle)');

function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

/** Copia LITERAL de app.js 723-726. */
function normalizeName(name) {
    if (!name) return "";
    return name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

// ------------------------------------------------------------------ retraso (calculateShiftDelay, app.js 5175-5213)
/** Copia LITERAL de app.js 5175-5213. */
function legacyCalculateShiftDelay(session) {
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
        expected.setDate(expected.getDate() - 1);
        diffMinutes = (loginDate - expected) / 60000;
    } else if (diffMinutes > 12 * 60) {
        expected.setDate(expected.getDate() + 1);
        diffMinutes = (loginDate - expected) / 60000;
    }

    if (diffMinutes <= 5) {
        return `<span style="background: var(--success); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 5px;" title="Límite: ${expected.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}">A tiempo</span>`;
    } else if (diffMinutes > 240) {
        // Fuera del horario: > 4 horas tarde no se considera "tardanza" de este turno
        return `<span style="background: rgba(139,92,246,0.15); color: #8b5cf6; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 5px;" title="Límite: ${expected.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}">Fuera de Horario</span>`;
    } else {
        const tardanza = Math.round(diffMinutes);
        return `<span style="background: var(--danger); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 5px;" title="Límite: ${expected.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}">+${tardanza}m Tarde</span>`;
    }
}

test('diferencial vs app.js: insignia de retraso/puntualidad idéntica en 1500 ingresos con semilla (turnos am/pm, medianoche, +4 h, sin turno)', () => {
    const r = rng(11);
    const shifts = ['8am - 4pm', '6:30 am - 2:30 pm', '12pm - 8pm', '12am - 8am', '10pm - 6am', '2 PM', 'Mañana', '', undefined, '9:15am', '11:59pm - 7am'];
    const counts = { 'A tiempo': 0, 'Tarde': 0, 'Fuera': 0, vacio: 0 };
    for (let i = 0; i < 1500; i++) {
        const session = { shift: pick(r, shifts), loginTime: r() < 0.05 ? undefined : new Date(2026, 9, 6, 0, 0, 0).getTime() + Math.floor(r() * 36 * 3600000) - 4 * 3600000 };
        const a = legacyCalculateShiftDelay(session);
        const b = buildShiftDelayBadgeHtml(session);
        assert.equal(b, a, JSON.stringify(session));
        if (a === '') counts.vacio++; else if (a.includes('A tiempo')) counts['A tiempo']++; else if (a.includes('Tarde')) counts.Tarde++; else counts.Fuera++;
    }
    assert.ok(counts['A tiempo'] > 50 && counts.Tarde > 50 && counts.Fuera > 50 && counts.vacio > 50, JSON.stringify(counts));
});

test('retraso: límites exactos (5 min = A tiempo; 6 min = +6m Tarde; 240 min = tarde; 241 min = Fuera de Horario)', () => {
    const base = new Date(2026, 9, 6, 8, 0, 0).getTime();
    const at = (min) => buildShiftDelayBadgeHtml({ shift: '8am - 4pm', loginTime: base + min * 60000 });
    assert.ok(at(5).includes('A tiempo'));
    assert.ok(at(6).includes('+6m Tarde'));
    assert.ok(at(240).includes('+240m Tarde'));
    assert.ok(at(241).includes('Fuera de Horario'));
    assert.equal(buildShiftDelayBadgeHtml({ shift: 'Mañana', loginTime: base }), '');
    assert.equal(buildShiftDelayBadgeHtml({ shift: '8am', loginTime: 0 }), '');
});

// ------------------------------------------------------------------ filtros (app.js 5229-5266)
/** Copia LITERAL de app.js 5229-5266 (filtrado de uids), con entradas por parámetro (DOM -> valores; Date.now() -> nowMs). */
function legacyFilter(allActiveSessions, searchValue, shiftQuery, statusQuery, nowMs, SUPERVISORES_NOMBRES, getShiftCategory) {
    const searchQuery = searchValue ? normalizeName(searchValue) : '';
    const uids = Object.keys(allActiveSessions);

    // Filtering active sessions
    let filteredUids = uids.filter(uid => {
        const session = allActiveSessions[uid];
        if (!session || !session.name) return false;

        const fullName = (session.name || '').trim();
        const email = (session.email || '');
        const shift = session.shift || 'Mañana';
        let isOnline = session.lastActive ? ((nowMs - session.lastActive) < 120000) : false;

        // Exclude supervisors from Monitoreo
        const excludedMonitoreo = SUPERVISORES_NOMBRES;
        if (excludedMonitoreo.some(ex => fullName.toLowerCase().includes(ex.toLowerCase()))) return false;

        if (session.status === 'En Almuerzo' || session.status === 'En Desayuno' || session.status === 'En Pausa de Turno' || session.status === 'Inactivo') {
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
    return filteredUids;
}

const SUPERVISORES = ['Sara Santamaría', 'Sara Santamaria', 'Maria Sanchez', 'Camilo Espinosa', 'Oriana Borja', 'Sara', 'Maria', 'Camilo', 'Oriana'];
const catOf = (shift) => (/pm/i.test(shift) ? 'Tarde' : /^\s*(10|11|12)\s*pm/i.test(shift) ? 'Noche' : 'Mañana');
const NOW = 1790000000000;

function randomSessions(seed, n) {
    const r = rng(seed);
    const names = ['Ana Pérez', 'Luis Fuentes', 'Óscar Díaz', 'Sara Santamaría', 'Camilo Espinosa', 'Juan José Díaz', '  Marilyn Jiménez  ', 'María Sánchez', ''];
    const statuses = ['En Línea', 'Inactivo', 'En Almuerzo', 'En Desayuno', 'En Pausa de Turno', 'Activo', undefined];
    const out = {};
    for (let i = 0; i < n; i++) {
        out['u' + i] = r() < 0.05 ? null : {
            name: pick(r, names), email: r() < 0.2 ? undefined : pick(r, ['ana@virtualsoft.tech', 'LUIS@virtualsoft.tech', 'x@y.co']),
            shift: r() < 0.15 ? undefined : pick(r, ['8am - 4pm', '2pm - 10pm', '10pm - 6am']),
            status: pick(r, statuses), lastActive: r() < 0.1 ? undefined : NOW - Math.floor(r() * 300000)
        };
    }
    return out;
}

test('diferencial vs app.js: filtro de sesiones (búsqueda, turno, estado, supervisores excluidos) idéntico en 1200 combinaciones con semilla', () => {
    const r = rng(5);
    let nonEmpty = 0;
    for (let seed = 1; seed <= 60; seed++) {
        const sessions = randomSessions(seed, 25);
        for (let k = 0; k < 20; k++) {
            const search = pick(r, ['', '', 'ana', 'ÓSCAR', 'virtualsoft', 'LUIS@', 'nadie']);
            const shiftQ = pick(r, ['', '', 'Mañana', 'Tarde', 'Noche']);
            const statusQ = pick(r, ['', '', 'online', 'offline']);
            const a = legacyFilter(sessions, search, shiftQ, statusQ, NOW, SUPERVISORES, catOf);
            const b = filterActiveSessionUids(sessions, { searchText: search, shiftQuery: shiftQ, statusQuery: statusQ }, { nowMs: NOW, legacyExcludedNames: SUPERVISORES, getShiftCategory: catOf }); // original explícito (D9b)
            assert.deepEqual(b, a, `seed ${seed} k ${k}`);
            if (a.length) nonEmpty++;
        }
    }
    assert.ok(nonEmpty > 300, String(nonEmpty));
});

test('filtro: una sesión "En Pausa de Turno" con latido reciente NO cuenta como en línea (corrección ya incorporada en el repo)', () => {
    const sessions = { a: { name: 'Ana Pérez', status: 'En Pausa de Turno', lastActive: NOW - 5000 }, b: { name: 'Luis Fuentes', status: 'En Línea', lastActive: NOW - 5000 } };
    const f = (statusQuery) => filterActiveSessionUids(sessions, { statusQuery }, { nowMs: NOW, supervisorDirectory: null, getShiftCategory: () => 'Mañana' });
    assert.deepEqual(f('online'), ['b']);
    assert.deepEqual(f('offline'), ['a']);
});

test('ORIGINAL explícito (legacyExcludedNames): supervisores excluidos por subcadena sin importar mayúsculas (también excluye a "Mariana")', () => {
    const sessions = { a: { name: 'SARA santamaría' }, b: { name: 'Mariana Ruiz' }, c: { name: 'Pedro' } };
    const uids = filterActiveSessionUids(sessions, {}, { nowMs: NOW, legacyExcludedNames: SUPERVISORES, getShiftCategory: () => 'Mañana' });
    assert.deepEqual(uids, ['c']);
});

test('D9b (predeterminado): se oculta por UID con rol Supervisor/Admin en users; "Mariana" y los homónimos con otro uid se ven', () => {
    const users = {
        s1: { name: 'Sara Santamaría', role: 'Supervisor' }, s2: { name: 'Maria Sanchez', role: 'Admin' },
        g1: { name: 'Mariana Ruiz', role: 'Gestor' }, g2: { name: 'Oriana Borja', role: 'Gestor' }, g3: { name: 'Sara Santamaría', role: 'Gestor' }
    };
    const sessions = {
        s1: { name: 'SARA santamaría' }, s2: { name: 'Maria Sanchez' }, g1: { name: 'Mariana Ruiz' }, g2: { name: 'Oriana Borja' },
        g3: { name: 'Sara Santamaría' }, x9: { name: 'Maria Sanchez' }
    };
    const dir = buildSupervisorDirectory(users);
    const uids = filterActiveSessionUids(sessions, {}, { nowMs: NOW, supervisorDirectory: dir, getShiftCategory: () => 'Mañana' });
    assert.deepEqual(uids, ['g1', 'g2', 'g3', 'x9'], 'decide el uid: x9 (sin rol en users) se ve aunque se llame igual que una supervisora');
    assert.deepEqual(filterActiveSessionUids(sessions, {}, { nowMs: NOW, getShiftCategory: () => 'Mañana' }), Object.keys(sessions), 'sin directorio no se oculta a nadie');
    assert.deepEqual(legacyFilter(sessions, '', '', '', NOW, SUPERVISORES, () => 'Mañana'), [], 'el original ocultaba a TODAS (Mariana, Oriana, homónimos)');
    assert.throws(() => filterActiveSessionUids(sessions, {}, { nowMs: NOW, excludedNames: SUPERVISORES, getShiftCategory: () => 'Mañana' }), /excludedNames/);
    assert.throws(() => filterActiveSessionUids(sessions, {}, { nowMs: NOW, supervisorDirectory: SUPERVISORES, getShiftCategory: () => 'Mañana' }), /legacyExcludedNames/);
});

// ------------------------------------------------------------------ avance de tareas (app.js 5325-5337)
/** Copia LITERAL de app.js 5325-5337. */
function legacyProgress(session) {
    let completedCount = session.completedTasks !== undefined ? session.completedTasks : 0;
    let notDoneCount = session.notDoneTasks !== undefined ? session.notDoneTasks : 0;
    const totalTasks = session.totalTasks || 0;

    // Fallback for older sessions that haven't synced the new variables yet
    if (session.completedTasks === undefined && session.tasks) {
        completedCount = Object.values(session.tasks).filter(t => t.status === 'Finalizada').length;
        notDoneCount = Object.values(session.tasks).filter(t => t.status === 'No Realizada').length;
    }

    const compPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
    const notDonePct = totalTasks > 0 ? Math.round((notDoneCount / totalTasks) * 100) : 0;
    const totalPct = compPct + notDonePct;
    return { completedCount, notDoneCount, totalTasks, compPct, notDonePct, totalPct };
}

test('diferencial vs app.js: avance de tareas (contadores, porcentajes y respaldo para sesiones antiguas) en 800 sesiones con semilla', () => {
    const r = rng(21);
    for (let i = 0; i < 800; i++) {
        const tasks = {};
        const n = Math.floor(r() * 6);
        for (let k = 0; k < n; k++) tasks['t' + k] = { status: pick(r, ['Finalizada', 'No Realizada', 'En Proceso', 'Pendiente']) };
        const s = {};
        if (r() < 0.6) s.completedTasks = Math.floor(r() * 10);
        if (r() < 0.6) s.notDoneTasks = Math.floor(r() * 10);
        if (r() < 0.8) s.totalTasks = Math.floor(r() * 12);
        if (r() < 0.7) s.tasks = tasks;
        assert.deepEqual(computeTaskProgress(s, { legacy: true }), legacyProgress(s), JSON.stringify(s));
        // Decisión D8: el predeterminado solo cambia totalPct (un único redondeo); el resto es idéntico al original.
        const nuevo = computeTaskProgress(s);
        const viejo = legacyProgress(s);
        assert.deepEqual({ ...nuevo, totalPct: 0 }, { ...viejo, totalPct: 0 }, JSON.stringify(s));
        const done = viejo.completedCount + viejo.notDoneCount;
        assert.equal(nuevo.totalPct, viejo.totalTasks > 0 ? Math.round((done / viejo.totalTasks) * 100) : 0, JSON.stringify(s));
    }
});

test('D8: 1 finalizada + 1 no realizada de 3 → 67 % en la tarjeta de Monitoreo (antes 33+33 = 66 %), igual que el latido', () => {
    const s = { completedTasks: 1, notDoneTasks: 1, totalTasks: 3 };
    assert.equal(computeTaskProgress(s).totalPct, 67);
    assert.equal(computeTaskProgress(s, { legacy: true }).totalPct, 66);
    assert.equal(computeTaskProgress({ totalTasks: 0 }).totalPct, 0);
});

// ------------------------------------------------------------------ lista de tareas de la tarjeta (app.js 5339-5389)
/** Copia LITERAL de app.js 5339-5389 (tareas asignadas + extras y su HTML). */
function legacyCardTasks(session, fullName, globalCronogramaData, getAssignedTasksForGestor, reconcileScheduledTaskWithSession) {
    const tasks = session.tasks || {};

    let assignedTasks = [];
    if (globalCronogramaData) {
        assignedTasks = getAssignedTasksForGestor(fullName, session.shift || 'Mañana');
    }

    let displayTasks = [];
    if (assignedTasks && assignedTasks.length > 0) {
        assignedTasks.forEach(taskName => {
            const reconciled = reconcileScheduledTaskWithSession(taskName, tasks);
            displayTasks.push({ name: taskName, status: reconciled.status });
        });
    }

    // Agregar las tareas extras
    for (let key in tasks) {
        if (key.startsWith('extra_') && tasks[key]) {
            displayTasks.push({ name: tasks[key].name, status: tasks[key].status });
        }
    }

    let tasksHtml = '';
    if (displayTasks.length > 0) {
        tasksHtml = '<div style="margin-top: 15px; max-height: 80px; overflow-y: auto; font-size: 11px; border: 1px solid var(--glass-border); border-radius: 4px; padding: 5px; background: rgba(0,0,0,0.02);">';
        displayTasks.forEach(t => {
            let icon = "<i class='bx bx-radio-circle' style='color: var(--text-secondary)'></i>";

            let textStyle = '';
            if (t.status === 'Finalizada') {
                icon = "<i class='bx bx-check-circle' style='color: var(--success)'></i>";
                textStyle = "color: var(--success); font-weight: bold;";
            } else if (t.status === 'En Proceso') {
                icon = "<i class='bx bx-time-five' style='color: var(--warning)'></i>";
                textStyle = "color: var(--warning);";
            } else if (t.status === 'No Realizada') {
                icon = "<i class='bx bx-x-circle' style='color: var(--danger)'></i>";
                textStyle = "color: var(--danger); text-decoration: line-through;";
            }

            tasksHtml += `<div style="display: flex; align-items: center; gap: 5px; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: ${t.status==='Pendiente'?0.7:1};">${icon} <span title="${escapeHTML(t.name)}" style="${textStyle}">${escapeHTML(t.name)}</span></div>`;
        });
        tasksHtml += '</div>';
    } else {
        tasksHtml = '<div style="margin-top: 15px; font-size: 11px; color: var(--text-secondary); text-align: center; font-style: italic;">' +
                    (globalCronogramaData ? 'No tiene tareas asignadas en este turno' : 'Cargando cronograma...') + '</div>';
    }
    return tasksHtml;
}

test('diferencial vs app.js: lista de tareas de la tarjeta (asignadas reconciliadas + extras, estados, escape de HTML) en 600 sesiones con semilla', () => {
    const r = rng(33);
    const reconcile = (taskName, tasks) => {
        for (const k in tasks) if (!k.startsWith('extra_') && tasks[k] && tasks[k].name === taskName) return { status: tasks[k].status || 'Pendiente' };
        return { status: 'Pendiente' };
    };
    for (let i = 0; i < 600; i++) {
        const tasks = {};
        const n = Math.floor(r() * 5);
        for (let k = 0; k < n; k++) {
            const extra = r() < 0.4;
            tasks[(extra ? 'extra_' : 'T-') + k] = r() < 0.08 ? null : { name: pick(r, ['Revisar <b>alertas</b>', 'Conciliar "caja"', "Tarea d'prueba", 'Cierre']), status: pick(r, ['Finalizada', 'No Realizada', 'En Proceso', 'Pendiente', undefined]) };
        }
        const session = { shift: pick(r, ['8am - 4pm', undefined]), tasks: r() < 0.9 ? tasks : undefined };
        const hasCron = r() < 0.7;
        const assigned = ['Revisar <b>alertas</b>', 'Cierre', 'Otra tarea'].slice(0, Math.floor(r() * 4));
        const getAssigned = () => assigned;
        const a = legacyCardTasks(session, 'Ana', hasCron, getAssigned, reconcile);
        const display = buildCardDisplayTasks(session, { assignedTasks: hasCron ? getAssigned('Ana', session.shift || 'Mañana') : [], reconcileTask: reconcile });
        assert.equal(buildTasksListHtml(display, hasCron), a, JSON.stringify(session));
    }
});

// ------------------------------------------------------------------ bitácora (app.js 5470-5519)
/** Copia LITERAL de app.js 5470-5519 (viewTimelineInMonitoreo, parte de datos y filas), con `now` como parámetro. */
function legacyTimelineHtml(session, now) {
    const timeline = session.timeline || [];
    let rows = '';

    // Filter out very short glitches (under 60 seconds) that have already ended
    let validTimeline = timeline.filter(ev => {
        if (ev.end && (ev.end - ev.start) < 60000) return false;
        return true;
    });

    // Inyectar dinámicamente el bloque de inactividad actual si el gestor perdió conexión (PC suspendido) y no está en pausa
    const lastPing = session.lastActive ? new Date(session.lastActive).getTime() : 0;
    if (lastPing && (now - lastPing) > 120000 && session.status !== 'En Almuerzo' && session.status !== 'En Desayuno' && session.status !== 'En Pausa de Turno') { // más de 2 minutos sin dar señal y no está en break
        const hasOngoingInactividad = validTimeline.some(ev => ev.type === 'Inactividad' && !ev.end);
        if (!hasOngoingInactividad) {
            validTimeline.push({
                type: 'Inactividad',
                start: lastPing,
                end: null // En curso
            });
        }
    }

    if (validTimeline.length === 0) {
        rows = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">No hay pausas ni inactividades registradas en este turno.</td></tr>';
    } else {
        validTimeline.forEach(ev => {
            const s = new Date(ev.start).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});
            let eTime = "No regresó";
            let durationStr = "En curso...";
            if (ev.end) {
                eTime = new Date(ev.end).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});
                const mins = Math.max(1, Math.round((ev.end - ev.start) / 60000));
                durationStr = `${mins} min`;
            }

            let icon = "<i class='bx bx-time'></i>";
            if (ev.type === 'Almuerzo') icon = "<i class='bx bx-restaurant' style='color: var(--success)'></i>";
            if (ev.type === 'Desayuno') icon = "<i class='bx bx-coffee' style='color: var(--warning)'></i>";
            if (ev.type === 'Inactividad') icon = "<i class='bx bx-sleepy' style='color: var(--danger)'></i>";
            if (ev.type === 'Pausa de Turno') icon = "<i class='bx bx-pause-circle' style='color: #8b5cf6'></i>";

            rows += `
                <tr style="border-bottom: 1px solid var(--glass-border);">
                    <td style="padding: 10px; font-weight: 500;">${icon} ${ev.type}</td>
                    <td style="padding: 10px; font-size: 13px;">${s} - ${eTime}</td>
                    <td style="padding: 10px; text-align: center;"><span class="badge" style="background: rgba(255,255,255,0.05);">${durationStr}</span></td>
                </tr>
            `;
        });
    }
    return rows;
}

test('diferencial vs app.js: bitácora (glitches < 60 s, inactividad en curso por pérdida de señal, iconos por tipo, duraciones) en 800 sesiones con semilla', () => {
    const r = rng(44);
    let withOngoing = 0;
    for (let i = 0; i < 800; i++) {
        const timeline = [];
        const n = Math.floor(r() * 5);
        for (let k = 0; k < n; k++) {
            const start = NOW - Math.floor(r() * 6 * 3600000);
            const ended = r() < 0.8;
            timeline.push({ type: pick(r, ['Almuerzo', 'Desayuno', 'Inactividad', 'Pausa de Turno', 'Otro']), start, end: ended ? start + Math.floor(r() * 3600000) : null });
        }
        const session = {
            timeline: r() < 0.9 ? timeline : undefined,
            status: pick(r, ['En Línea', 'Inactivo', 'En Almuerzo', 'En Desayuno', 'En Pausa de Turno']),
            lastActive: r() < 0.15 ? undefined : NOW - Math.floor(r() * 600000)
        };
        const a = legacyTimelineHtml(session, NOW);
        const b = buildTimelineRowsHtml(buildVisibleTimeline(session, NOW));
        assert.equal(b, a, JSON.stringify(session));
        if (buildVisibleTimeline(session, NOW).some((e) => e.type === 'Inactividad' && e.end === null)) withOngoing++;
    }
    assert.ok(withOngoing > 50, String(withOngoing));
});

test('bitácora: sin eventos se muestra el mensaje; con pausa de turno el icono es el de pausa; la Inactividad en curso no se duplica ni se agrega si está en pausa', () => {
    assert.equal(buildTimelineRowsHtml([]), EMPTY_TIMELINE_ROW_HTML);
    assert.ok(buildTimelineRowHtml({ type: 'Pausa de Turno', start: NOW - 3600000, end: NOW }).includes("bx-pause-circle"));
    const stale = { lastActive: NOW - 300000, status: 'En Línea', timeline: [{ type: 'Inactividad', start: NOW - 400000, end: null }] };
    assert.equal(buildVisibleTimeline(stale, NOW).length, 1);
    const stalePause = { lastActive: NOW - 300000, status: 'En Pausa de Turno', timeline: [] };
    assert.equal(buildVisibleTimeline(stalePause, NOW).length, 0);
    const staleLine = { lastActive: NOW - 300000, status: 'En Línea', timeline: [] };
    const v = buildVisibleTimeline(staleLine, NOW);
    assert.deepEqual(v, [{ type: 'Inactividad', start: NOW - 300000, end: null }]);
    assert.ok(buildTimelineRowHtml(v[0]).includes('No regresó') && buildTimelineRowHtml(v[0]).includes('En curso...'));
});

// ------------------------------------------------------------------ detalle de tareas (app.js 5551-5633)
/** Copia LITERAL de app.js 5551-5633 (openMonitoreoDetails: tareas del modal y su HTML). */
function legacyDetailHtml(session, fullName, globalCronogramaData, getAssignedTasksForGestor, reconcileScheduledTaskWithSession, resolveTaskDisplayName) {
    let out = '';
    const tasks = session.tasks || {};

    let assignedTasks = [];
    if (typeof globalCronogramaData !== 'undefined' && globalCronogramaData) {
        assignedTasks = getAssignedTasksForGestor(fullName, session.shift || 'Mañana');
    }

    let displayTasks = [];
    if (assignedTasks && assignedTasks.length > 0) {
        assignedTasks.forEach(taskName => {
            const reconciled = reconcileScheduledTaskWithSession(taskName, tasks);
            displayTasks.push({ name: taskName, status: reconciled.status, observation: reconciled.observation });
        });
    }

    // Extras
    for (let key in tasks) {
        if (key.startsWith('extra_') && tasks[key]) {
            displayTasks.push({
                name: tasks[key].name,
                status: tasks[key].status || 'Pendiente',
                observation: tasks[key].observation || 'Tarea extra agregada durante el turno.'
            });
        }
    }

    // Direct tasks fallback if displayTasks is empty
    if (displayTasks.length === 0 && Object.keys(tasks).length > 0) {
        for (let key in tasks) {
            if (!tasks[key]) continue;
            const isExtra = key.startsWith('extra_');
            displayTasks.push({
                name: isExtra ? (tasks[key].name || key) : resolveTaskDisplayName(key, tasks[key]),
                status: tasks[key].status || 'Pendiente',
                observation: tasks[key].observation || ''
            });
        }
    }

    if (displayTasks.length === 0) {
        out = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    Este gestor aún no tiene tareas asignadas en este turno.
                </div>
            `;
    } else {
        displayTasks.forEach(t => {
            let badgeClass = 'pending';
            let badgeStyle = 'background: rgba(148,163,184,0.15); color: #94a3b8;';
            if (t.status === 'Finalizada') {
                badgeClass = 'completed';
                badgeStyle = 'background: rgba(16,185,129,0.15); color: var(--success);';
            } else if (t.status === 'En Proceso') {
                badgeClass = 'in-progress';
                badgeStyle = 'background: rgba(245,158,11,0.15); color: var(--warning);';
            } else if (t.status === 'No Realizada') {
                badgeClass = 'not-done';
                badgeStyle = 'background: rgba(239,68,68,0.15); color: var(--danger);';
            }

            const observationText = t.observation ? escapeHTML(t.observation.trim()) : 'Sin observaciones cargadas.';

            out += `
                    <div style="background: rgba(0,0,0,0.02); border: 1px solid var(--glass-border); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px;">
                            <span style="font-weight: 600; font-size: 13.5px; color: var(--text-primary);">${escapeHTML(t.name)}</span>
                            <span class="monitoreo-task-badge ${badgeClass}" style="padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; ${badgeStyle}">${escapeHTML(t.status)}</span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); background: rgba(0,0,0,0.03); padding: 8px 10px; border-radius: 6px; border-left: 3px solid var(--accent-primary);">
                            <strong>Notas u Observaciones:</strong> ${observationText}
                        </div>
                    </div>
                `;
        });
    }
    return out;
}

test('diferencial vs app.js: detalle de tareas del modal (asignadas, extras, respaldo directo, estados, observaciones) en 700 sesiones con semilla', () => {
    const r = rng(55);
    const reconcile = (taskName, tasks) => {
        for (const k in tasks) if (!k.startsWith('extra_') && tasks[k] && tasks[k].name === taskName) return { status: tasks[k].status || 'Pendiente', observation: tasks[k].observation || '' };
        return { status: 'Pendiente', observation: '' };
    };
    const resolveName = (key, entry) => entry.name || 'Tarea ' + key;
    for (let i = 0; i < 700; i++) {
        const tasks = {};
        const n = Math.floor(r() * 5);
        for (let k = 0; k < n; k++) {
            const extra = r() < 0.4;
            tasks[(extra ? 'extra_' : 'T-') + k] = r() < 0.08 ? null : {
                name: pick(r, ['Revisar <b>alertas</b>', 'Cierre', undefined]), status: pick(r, ['Finalizada', 'No Realizada', 'En Proceso', 'Pendiente', undefined]),
                observation: pick(r, ['  nota <i>x</i>  ', '', undefined, 'ok'])
            };
        }
        const session = { shift: pick(r, ['8am - 4pm', undefined]), tasks: r() < 0.9 ? tasks : undefined };
        const hasCron = r() < 0.6;
        const assigned = ['Revisar <b>alertas</b>', 'Cierre'].slice(0, Math.floor(r() * 3));
        const getAssigned = () => assigned;
        const a = legacyDetailHtml(session, 'Ana', hasCron ? [] : null, getAssigned, reconcile, resolveName);
        const display = buildDetailDisplayTasks(session, { assignedTasks: hasCron ? getAssigned() : [], reconcileTask: reconcile, resolveTaskName: resolveName });
        const b = display.length === 0 ? buildNoTasksHtml() : display.map(buildDetailTaskCardHtml).join('');
        assert.equal(b, a, JSON.stringify(session));
    }
});

test('detalle: insignias por estado y observación vacía', () => {
    assert.deepEqual(resolveTaskBadge('Finalizada').badgeClass, 'completed');
    assert.deepEqual(resolveTaskBadge('En Proceso').badgeClass, 'in-progress');
    assert.deepEqual(resolveTaskBadge('No Realizada').badgeClass, 'not-done');
    assert.deepEqual(resolveTaskBadge('Pendiente').badgeClass, 'pending');
    assert.ok(buildDetailTaskCardHtml({ name: 'X', status: 'Pendiente', observation: '' }).includes('Sin observaciones cargadas.'));
});

test('texto de información del modal y avatares', () => {
    const s = { shift: '8am - 4pm', loginTime: new Date(2026, 9, 6, 8, 3).getTime(), lastActive: new Date(2026, 9, 6, 9, 15).getTime() };
    const t = new Date(s.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const a = new Date(s.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    assert.equal(buildMonitoreoInfoText(s), `Turno: 8am - 4pm | Inicio: ${t} | Actividad: ${a}`);
    assert.equal(buildMonitoreoInfoText({}), 'Turno: Mañana | Inicio: Pendiente | Actividad: Nunca');
    assert.equal(resolveAvatarSrc('Luis Fuentes'), 'assets/src/img/Luis Fuentes.png');
    assert.equal(resolveAvatarSrc('Nadie Conocido'), 'https://ui-avatars.com/api/?name=Nadie%20Conocido&background=0D8ABC&color=fff');
    assert.equal(buildFallbackAvatarSrc('A B'), 'https://ui-avatars.com/api/?name=A%20B&background=0D8ABC&color=fff');
    assert.equal(AVAILABLE_AVATARS.length, 14);
});

test('tarjeta: modelo + HTML con estado de Pausa de Turno, escape de datos y botones con uid codificado', () => {
    const session = { name: ' Ana <Pérez> ', email: 'a"b@x.co', shift: '8am - 4pm', status: 'En Pausa de Turno', lastActive: NOW - 5000, loginTime: NOW - 3600000, totalTasks: 4, completedTasks: 2, notDoneTasks: 1 };
    const model = buildSessionCardModel("u'1", session, { nowMs: NOW, hasCronograma: false, getAssignedTasks: () => [], reconcileTask: () => ({ status: 'Pendiente' }) });
    assert.equal(model.displayStatus, 'En Pausa de Turno ⏸️');
    assert.equal(model.isOnline, true);
    assert.equal(model.fullName, 'Ana <Pérez>');
    const html = buildSessionCardHtml(model);
    assert.ok(html.includes('status-online'));
    assert.ok(html.includes('En Pausa de Turno ⏸️'));
    assert.ok(html.includes('Ana &lt;Pérez&gt;'));
    assert.ok(html.includes('a&quot;b@x.co'));
    assert.ok(html.includes("openMonitoreoDetails(decodeURIComponent('u%271'))"));
    assert.ok(html.includes('2 <i') && html.includes('/ 4 (75%)'));
    assert.ok(html.includes('Cargando cronograma...'));
    assert.ok(buildEmptyMonitoringHtml().includes('No se encontraron gestores en el turno con los filtros aplicados.'));
});

test('tarjeta: sesión sin latido por más de 2 min y fuera de pausa se muestra Inactivo; en pausa se conserva aunque no haya latido', () => {
    const base = { name: 'Ana', shift: '8am - 4pm', lastActive: NOW - 300000 };
    const deps = { nowMs: NOW, hasCronograma: true, getAssignedTasks: () => [], reconcileTask: () => ({ status: 'Pendiente' }) };
    assert.equal(buildSessionCardModel('u', { ...base, status: 'En Línea' }, deps).displayStatus, 'Inactivo 💤');
    assert.equal(buildSessionCardModel('u', { ...base, status: 'En Pausa de Turno' }, deps).displayStatus, 'En Pausa de Turno ⏸️');
    assert.equal(buildSessionCardModel('u', { ...base, status: 'En Pausa de Turno' }, deps).isOnline, false);
});

summarize();
