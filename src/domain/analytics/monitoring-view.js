/**
 * Vista del panel de Monitoreo del supervisor: tarjetas de sesiones activas, filtros, avance de tareas,
 * retraso de inicio de turno, línea de tiempo (bitácora) y detalle de tareas.
 *
 * Puerto de `renderActiveSessionsDashboard()` (app.js 5215-5457), `calculateShiftDelay()` (5175-5213, la parte
 * de la insignia HTML), `viewTimelineInMonitoreo()` (5460-5524), `openMonitoreoDetails()` (5527-5638) y
 * `populateGestoresDropdown()` (5640-5666, ver `services/firebase/firebase-monitoring-repository.js`).
 *
 * La LÓGICA DE ESTADO (En Línea / Inactivo / En Almuerzo / En Desayuno / En Pausa de Turno) viene de
 * `./active-session-status.js` y NO se redefine aquí. Sin DOM, sin Firebase y sin `Date.now()` implícito:
 * `nowMs` entra por parámetro. Las plantillas HTML son copia LITERAL de `app.js`.
 *
 * Variables del original que se calculaban y NO se usaban (código muerto) y por eso no se portan:
 * `lastActiveTime`, `statusBadge` y `statusDot` de la tarjeta.
 */

import { escapeHTML, encodeInlineHandlerArg } from '../../utils/sanitization.js';
import { normalizeName, namesMatch } from '../../utils/normalize.js';
import { isSessionOnlineForFilter, resolveSessionDisplay } from './active-session-status.js';
import { assertSupervisorDirectory, isSupervisorEntry } from '../schedules/supervisor-directory.js';
import { formatProgress } from '../tasks/task-progress.js';

/** Lista de avatares disponibles (W-41: una sola fuente, `domain/tasks/app-init-rules.js`). */
import { AVAILABLE_AVATARS } from '../tasks/app-init-rules.js';
import { TASK_STATUS } from '../../utils/constants.js';
export { AVAILABLE_AVATARS };

/** Avatar de respaldo cuando la imagen local no existe o falla (app.js 5322, 5533). */
export function buildFallbackAvatarSrc(fullName) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
}

/**
 * Ruta del avatar de un gestor (app.js 5321-5322 y 5532-5533).
 *
 * @param {string} fullName
 * @param {readonly string[]} [avatars]
 * @param {(a: string, b: string) => boolean} [match]
 * @returns {string}
 */
export function resolveAvatarSrc(fullName, avatars = AVAILABLE_AVATARS, match = namesMatch) {
    const matchedAvatar = avatars.find((img) => match(fullName, img.replace('.png', '')));

    return matchedAvatar ? `assets/src/img/${matchedAvatar}` : buildFallbackAvatarSrc(fullName);
}

// ----------------------------------------------------------------------------------------------
// Retraso / tardanza de inicio de turno (calculateShiftDelay)
// ----------------------------------------------------------------------------------------------

/** Minutos de tolerancia (app.js 5198) y límite a partir del cual ya no es "tardanza" del turno (app.js 5200). */
export const DELAY_ON_TIME_MAX_MINUTES = 5;
export const DELAY_OUT_OF_SCHEDULE_MINUTES = 240;

/**
 * Insignia HTML de puntualidad del inicio de turno (A tiempo / +Nm Tarde / Fuera de Horario); '' si no hay
 * hora de ingreso o no se puede interpretar el turno (app.js 5175-5213).
 *
 * @param {{loginTime?: number|string, shift?: string}} session
 * @returns {string}
 */
export function buildShiftDelayBadgeHtml(session) {
    if (!session.loginTime || !session.shift) return '';
    const shiftStr = session.shift.toLowerCase().trim();

    // Parse start time: e.g. "8am - 4pm" -> "8", "am"
    const match = shiftStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (!match) return ''; // Cannot parse shift

    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
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

    const limit = expected.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffMinutes <= DELAY_ON_TIME_MAX_MINUTES) {
        return `<span style="background: var(--success); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 5px;" title="Límite: ${limit}">A tiempo</span>`;
    } else if (diffMinutes > DELAY_OUT_OF_SCHEDULE_MINUTES) {
        // Fuera del horario: > 4 horas tarde no se considera "tardanza" de este turno
        return `<span style="background: rgba(139,92,246,0.15); color: #8b5cf6; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 5px;" title="Límite: ${limit}">Fuera de Horario</span>`;
    }

    const tardanza = Math.round(diffMinutes);

    return `<span style="background: var(--danger); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 5px;" title="Límite: ${limit}">+${tardanza}m Tarde</span>`;
}

// ----------------------------------------------------------------------------------------------
// Filtros
// ----------------------------------------------------------------------------------------------

/**
 * Uids de las sesiones que pasan los filtros del panel (app.js 5229-5266).
 *
 *  - Sin nombre → fuera. Los supervisores no se listan. Decisión D9b (predeterminado): supervisor = el UID de la sesión
 *    (llave de `active_sessions/{uid}`) pertenece a un usuario con rol 'Supervisor'/'Admin' (`supervisorDirectory`,
 *    derivado de `users`); decide el uid, nunca el nombre, así que "Mariana" ya no se oculta por contener "Maria".
 *    Sin directorio (`null`) no se oculta a nadie. Original (solo pruebas diferenciales): `legacyExcludedNames`,
 *    subcadena sin distinguir mayúsculas (app.js 5242-5243).
 *  - Búsqueda: subcadena sin tildes en nombre o correo.
 *  - Turno: categoría (`getShiftCategory`) igual a la elegida.
 *  - Estado `online`/`offline`: `isSessionOnlineForFilter` (en pausa o inactivo = no en línea, aunque haya latido).
 *
 * @param {Record<string, object>} sessions
 * @param {{searchText?: string, shiftQuery?: string, statusQuery?: string}} filters
 * @param {{nowMs: number, supervisorDirectory?: (object|null), legacyExcludedNames?: readonly string[], getShiftCategory: (shift: string) => string}} deps
 * @returns {string[]}
 */
export function filterActiveSessionUids(sessions, filters, deps) {
    const { searchText = '', shiftQuery = '', statusQuery = '' } = filters;
    if (Object.prototype.hasOwnProperty.call(deps, 'excludedNames')) {
        throw new TypeError('filterActiveSessionUids: excludedNames (SUPERVISORES_NOMBRES) ya no se admite (decisión D9b); '
            + 'use supervisorDirectory o, solo en pruebas diferenciales, legacyExcludedNames.');
    }
    const { nowMs, legacyExcludedNames, getShiftCategory } = deps;
    const directory = legacyExcludedNames ? null : assertSupervisorDirectory(deps.supervisorDirectory, 'filterActiveSessionUids');
    const isSupervisorSession = legacyExcludedNames
        ? (uid, fullName) => legacyExcludedNames.some((ex) => fullName.toLowerCase().includes(ex.toLowerCase()))
        : (uid) => isSupervisorEntry(directory, { uid });
    const searchQuery = normalizeName(searchText);

    return Object.keys(sessions).filter((uid) => {
        const session = sessions[uid];
        if (!session || !session.name) return false;

        const fullName = (session.name || '').trim();
        const email = (session.email || '');
        const shift = session.shift || 'Mañana';

        // Exclude supervisors from Monitoreo
        if (isSupervisorSession(uid, fullName)) return false;

        const isOnline = isSessionOnlineForFilter(session, nowMs);

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
}

// ----------------------------------------------------------------------------------------------
// Avance de tareas y lista de tareas de la tarjeta
// ----------------------------------------------------------------------------------------------

/**
 * Contadores y porcentajes del avance de tareas (app.js 5325-5337). Las sesiones antiguas que aún no sincronizan
 * `completedTasks`/`notDoneTasks` se calculan desde `session.tasks`.
 *
 * @param {{completedTasks?: number, notDoneTasks?: number, totalTasks?: number, tasks?: Record<string, {status?: string}>}} session
 * @returns {{completedCount: number, notDoneCount: number, totalTasks: number, compPct: number, notDonePct: number, totalPct: number}}
 */
export function computeTaskProgress(session, { legacy = false } = {}) {
    let completedCount = session.completedTasks !== undefined ? session.completedTasks : 0;
    let notDoneCount = session.notDoneTasks !== undefined ? session.notDoneTasks : 0;
    const totalTasks = session.totalTasks || 0;

    // Fallback for older sessions that haven't synced the new variables yet
    if (session.completedTasks === undefined && session.tasks) {
        completedCount = Object.values(session.tasks).filter((t) => t.status === TASK_STATUS.DONE).length;
        notDoneCount = Object.values(session.tasks).filter((t) => t.status === TASK_STATUS.NOT_DONE).length;
    }

    const compPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
    const notDonePct = totalTasks > 0 ? Math.round((notDoneCount / totalTasks) * 100) : 0;

    // Decisión D8: el total se redondea una sola vez (formatProgress), igual que el latido y la tarjeta KPI
    // (antes 1+1 de 3 daba 33+33 = 66 % aquí y 67 % en el latido). `legacy: true` = suma de redondeos de app.js.
    const totalPct = legacy ? compPct + notDonePct : formatProgress(completedCount + notDoneCount, totalTasks);
    return { completedCount, notDoneCount, totalTasks, compPct, notDonePct, totalPct };
}

/**
 * Tareas que muestra la tarjeta: las asignadas del cronograma (reconciliadas con lo confirmado en la sesión) y
 * las extras (`extra_*`) (app.js 5339-5363).
 *
 * @param {object} session
 * @param {{assignedTasks: string[], reconcileTask: (taskName: string, tasks: object) => {status: string}}} deps
 * @returns {Array<{name: string, status: string|undefined}>}
 */
export function buildCardDisplayTasks(session, { assignedTasks, reconcileTask }) {
    const tasks = session.tasks || {};
    const displayTasks = [];

    if (assignedTasks && assignedTasks.length > 0) {
        assignedTasks.forEach((taskName) => {
            const reconciled = reconcileTask(taskName, tasks);
            displayTasks.push({ name: taskName, status: reconciled.status });
        });
    }

    for (const key in tasks) {
        if (key.startsWith('extra_') && tasks[key]) {
            displayTasks.push({ name: tasks[key].name, status: tasks[key].status });
        }
    }

    return displayTasks;
}

/**
 * Lista de tareas de la tarjeta (app.js 5365-5389).
 *
 * @param {Array<{name: string, status?: string}>} displayTasks
 * @param {boolean} hasCronograma si el cronograma ya cargó (cambia el mensaje cuando no hay tareas)
 * @returns {string}
 */
export function buildTasksListHtml(displayTasks, hasCronograma) {
    let tasksHtml = '';

    if (displayTasks.length > 0) {
        tasksHtml = '<div style="margin-top: 15px; max-height: 80px; overflow-y: auto; font-size: 11px; border: 1px solid var(--glass-border); border-radius: 4px; padding: 5px; background: rgba(0,0,0,0.02);">';
        displayTasks.forEach((t) => {
            let icon = "<i class='bx bx-radio-circle' style='color: var(--text-secondary)'></i>";

            let textStyle = '';
            if (t.status === TASK_STATUS.DONE) {
                icon = "<i class='bx bx-check-circle' style='color: var(--success)'></i>";
                textStyle = 'color: var(--success); font-weight: bold;';
            } else if (t.status === TASK_STATUS.IN_PROGRESS) {
                icon = "<i class='bx bx-time-five' style='color: var(--warning)'></i>";
                textStyle = 'color: var(--warning);';
            } else if (t.status === TASK_STATUS.NOT_DONE) {
                icon = "<i class='bx bx-x-circle' style='color: var(--danger)'></i>";
                textStyle = 'color: var(--danger); text-decoration: line-through;';
            }

            tasksHtml += `<div style="display: flex; align-items: center; gap: 5px; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: ${t.status==='Pendiente'?0.7:1};">${icon} <span title="${escapeHTML(t.name)}" style="${textStyle}">${escapeHTML(t.name)}</span></div>`;
        });
        tasksHtml += '</div>';
    } else {
        tasksHtml = '<div style="margin-top: 15px; font-size: 11px; color: var(--text-secondary); text-align: center; font-style: italic;">' +
                    (hasCronograma ? 'No tiene tareas asignadas en este turno' : 'Cargando cronograma...') + '</div>';
    }

    return tasksHtml;
}

// ----------------------------------------------------------------------------------------------
// Tarjeta
// ----------------------------------------------------------------------------------------------

/** Estado vacío del panel (app.js 5270-5276). */
export function buildEmptyMonitoringHtml() {
    return `
            <div style="grid-column: 1 / -1; padding: 60px; text-align: center; color: var(--text-secondary);">
                <i class='bx bx-devices' style="font-size: 48px; margin-bottom: 15px; color: var(--text-secondary); opacity: 0.5;"></i>
                <p style="font-size: 16px; font-weight: 500;">No se encontraron gestores en el turno con los filtros aplicados.</p>
                <p style="font-size: 12px; margin-top: 5px; opacity: 0.7;">Los gestores activos se listarán aquí automáticamente al ingresar.</p>
            </div>
        `;
}

/**
 * Modelo de una tarjeta de sesión: todo lo que la plantilla necesita, ya calculado (app.js 5280-5390).
 *
 * @param {string} uid
 * @param {object} session
 * @param {{
 *   nowMs: number,
 *   hasCronograma: boolean,
 *   getAssignedTasks: (fullName: string, shift: string) => string[],
 *   reconcileTask: (taskName: string, tasks: object) => {status: string},
 *   avatars?: readonly string[]
 * }} deps
 */
export function buildSessionCardModel(uid, session, deps) {
    const { nowMs, hasCronograma, getAssignedTasks, reconcileTask, avatars = AVAILABLE_AVATARS } = deps;
    const display = resolveSessionDisplay(session, nowMs);
    const fullName = (session.name || '').trim();
    const assignedTasks = hasCronograma ? getAssignedTasks(fullName, session.shift || 'Mañana') : [];
    const displayTasks = buildCardDisplayTasks(session, { assignedTasks, reconcileTask });

    return {
        uid,
        fullName,
        isOnline: display.isOnline,
        displayStatus: display.displayStatus,
        loginTimeStr: session.loginTime
            ? new Date(session.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : 'Pendiente (Falta actualizar)',
        shift: session.shift,
        email: session.email,
        delayBadge: buildShiftDelayBadgeHtml(session),
        avatarSrc: resolveAvatarSrc(fullName, avatars),
        fallbackAvatarSrc: buildFallbackAvatarSrc(fullName),
        progress: computeTaskProgress(session),
        tasksHtml: buildTasksListHtml(displayTasks, hasCronograma)
    };
}

/**
 * HTML interno de la tarjeta (app.js 5392-5446). El avatar se asigna después por DOM (con respaldo si falla).
 *
 * @param {ReturnType<typeof buildSessionCardModel>} model
 * @returns {string}
 */
export function buildSessionCardHtml(model) {
    const { uid, fullName, isOnline, displayStatus, loginTimeStr, delayBadge, tasksHtml } = model;
    const { completedCount, notDoneCount, totalTasks, compPct, notDonePct, totalPct } = model.progress;
    const session = { shift: model.shift, email: model.email };

    return `
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
                <div class="monitoreo-user-info">
                    <img class="monitoreo-avatar">
                    <div class="monitoreo-details">
                        <span class="monitoreo-name">${escapeHTML(fullName)}</span>
                        <span class="monitoreo-meta">${escapeHTML(session.email || '')}</span>
                    </div>
                </div>
                <div class="status-indicator-badge ${isOnline ? 'status-online' : 'status-offline'}">
                    <div class="pulse-dot ${isOnline ? '' : 'offline'}"></div>
                    ${escapeHTML(displayStatus)}
                </div>
            </div>
            
            <div style="margin-top: 10px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: var(--text-secondary);"><i class='bx bx-calendar-check'></i> Turno:</span>
                    <strong style="color: var(--text-primary);">${escapeHTML(session.shift || 'Mañana')}</strong>
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
                    <div style="display: flex; gap: 6px; font-size: 11px;">
                        <strong style="color: var(--success);" title="Realizadas">${completedCount} <i class='bx bx-check'></i></strong>
                        <strong style="color: var(--danger);" title="No Realizadas">${notDoneCount} <i class='bx bx-x'></i></strong>
                        <strong style="color: var(--text-secondary); margin-left: 4px;">/ ${totalTasks} (${totalPct}%)</strong>
                    </div>
                </div>
                <div class="progress-bar-bg" style="display: flex; overflow: hidden; background: rgba(255,255,255,0.05);">
                    <div class="progress-bar-fill" style="width: ${compPct}%; border-radius: 0; background: linear-gradient(90deg, var(--success), #34d399); transition: width 0.5s;"></div>
                    <div style="width: ${notDonePct}%; background: linear-gradient(90deg, var(--danger), #fb7185); transition: width 0.5s;"></div>
                </div>
            </div>

            ${tasksHtml}

            <div style="margin-top: 15px; display: flex; gap: 5px; justify-content: flex-end;">
                <button class="btn btn-outline" style="flex: 1; padding: 6px 10px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px;" data-action="open-monitoreo-details" data-uid="${escapeHTML(uid)}">
                    <i class='bx bx-search-alt-2'></i> Detalles
                </button>
                <button class="btn btn-outline" style="flex: 1; padding: 6px 10px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px; border-color: var(--warning); color: var(--warning);" data-action="view-timeline-monitoreo" data-uid="${escapeHTML(uid)}">
                    <i class='bx bx-time'></i> Bitácora
                </button>
            </div>
        `;
}

// ----------------------------------------------------------------------------------------------
// Bitácora (línea de tiempo) de una sesión
// ----------------------------------------------------------------------------------------------

/** Un evento de menos de este tiempo ya terminado se descarta como "glitch" (app.js 5474). */
export const TIMELINE_MIN_EVENT_MS = 60000;

/**
 * Eventos de la línea de tiempo a mostrar: descarta los glitches (< 60 s ya terminados) y, si el gestor perdió
 * conexión (más de 2 minutos sin latido y fuera de pausa), agrega una Inactividad en curso desde su último latido
 * (app.js 5470-5493).
 *
 * @param {{timeline?: Array<{type: string, start: number, end?: number|null}>, lastActive?: number|string, status?: string}} session
 * @param {number} nowMs
 * @returns {Array<{type: string, start: number, end?: number|null}>}
 */
export function buildVisibleTimeline(session, nowMs) {
    const timeline = session.timeline || [];
    const validTimeline = timeline.filter((ev) => {
        if (ev.end && (ev.end - ev.start) < TIMELINE_MIN_EVENT_MS) return false;
        return true;
    });

    const lastPing = session.lastActive ? new Date(session.lastActive).getTime() : 0;

    if (lastPing && (nowMs - lastPing) > 120000 && session.status !== 'En Almuerzo' && session.status !== 'En Desayuno' && session.status !== 'En Pausa de Turno') {
        const hasOngoingInactividad = validTimeline.some((ev) => ev.type === 'Inactividad' && !ev.end);

        if (!hasOngoingInactividad) {
            validTimeline.push({ type: 'Inactividad', start: lastPing, end: null });
        }
    }

    return validTimeline;
}

/** Fila de "sin eventos" (app.js 5497). */
export const EMPTY_TIMELINE_ROW_HTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">No hay pausas ni inactividades registradas en este turno.</td></tr>';

/**
 * Fila <tr> de un evento de la bitácora (app.js 5499-5519).
 *
 * W-52: `ev.type` viene de `active_sessions/{uid}/timeline` (lo escribe el cliente del gestor) y se escapa; app.js
 * lo insertaba crudo. Para los tipos del catálogo (Almuerzo, Desayuno, Inactividad, Pausa de Turno) no cambia nada.
 *
 * @param {{type: string, start: number, end?: number|null}} ev
 * @returns {string}
 */
export function buildTimelineRowHtml(ev) {
    const s = new Date(ev.start).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    let eTime = 'No regresó';
    let durationStr = 'En curso...';

    if (ev.end) {
        eTime = new Date(ev.end).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        const mins = Math.max(1, Math.round((ev.end - ev.start) / 60000));
        durationStr = `${mins} min`;
    }

    let icon = "<i class='bx bx-time'></i>";
    if (ev.type === 'Almuerzo') icon = "<i class='bx bx-restaurant' style='color: var(--success)'></i>";
    if (ev.type === 'Desayuno') icon = "<i class='bx bx-coffee' style='color: var(--warning)'></i>";
    if (ev.type === 'Inactividad') icon = "<i class='bx bx-sleepy' style='color: var(--danger)'></i>";
    if (ev.type === 'Pausa de Turno') icon = "<i class='bx bx-pause-circle' style='color: #8b5cf6'></i>";

    return `
                <tr style="border-bottom: 1px solid var(--glass-border);">
                    <td style="padding: 10px; font-weight: 500;">${icon} ${escapeHTML(ev.type)}</td>
                    <td style="padding: 10px; font-size: 13px;">${s} - ${eTime}</td>
                    <td style="padding: 10px; text-align: center;"><span class="badge" style="background: rgba(255,255,255,0.05);">${durationStr}</span></td>
                </tr>
            `;
}

/**
 * HTML de las filas de la bitácora (vacío = mensaje de "sin eventos").
 *
 * @param {Array<{type: string, start: number, end?: number|null}>} events
 * @returns {string}
 */
export function buildTimelineRowsHtml(events) {
    if (events.length === 0) return EMPTY_TIMELINE_ROW_HTML;

    return events.map(buildTimelineRowHtml).join('');
}

// ----------------------------------------------------------------------------------------------
// Detalle de tareas de un gestor (openMonitoreoDetails)
// ----------------------------------------------------------------------------------------------

/** Texto de la línea "Turno | Inicio | Actividad" del modal (app.js 5546-5549). */
export function buildMonitoreoInfoText(session) {
    const lastActiveTime = session.lastActive ? new Date(session.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nunca';
    const loginTimeStr = session.loginTime ? new Date(session.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pendiente';

    return `Turno: ${session.shift || 'Mañana'} | Inicio: ${loginTimeStr} | Actividad: ${lastActiveTime}`;
}

/**
 * Tareas del modal de detalle (app.js 5551-5594): asignadas reconciliadas, extras y, si no hubo ninguna, las
 * tareas directas de la sesión con su nombre resuelto.
 *
 * @param {object} session
 * @param {{
 *   assignedTasks: string[],
 *   reconcileTask: (taskName: string, tasks: object) => {status: string, observation: string},
 *   resolveTaskName: (key: string, entry: object) => string
 * }} deps
 * @returns {Array<{name: string, status: string, observation: string}>}
 */
export function buildDetailDisplayTasks(session, { assignedTasks, reconcileTask, resolveTaskName }) {
    const tasks = session.tasks || {};
    const displayTasks = [];

    if (assignedTasks && assignedTasks.length > 0) {
        assignedTasks.forEach((taskName) => {
            const reconciled = reconcileTask(taskName, tasks);
            displayTasks.push({ name: taskName, status: reconciled.status, observation: reconciled.observation });
        });
    }

    // Extras
    for (const key in tasks) {
        if (key.startsWith('extra_') && tasks[key]) {
            displayTasks.push({
                name: tasks[key].name,
                status: tasks[key].status || TASK_STATUS.PENDING,
                observation: tasks[key].observation || 'Tarea extra agregada durante el turno.'
            });
        }
    }

    // Direct tasks fallback if displayTasks is empty
    if (displayTasks.length === 0 && Object.keys(tasks).length > 0) {
        for (const key in tasks) {
            if (!tasks[key]) continue;
            const isExtra = key.startsWith('extra_');
            displayTasks.push({
                name: isExtra ? (tasks[key].name || key) : resolveTaskName(key, tasks[key]),
                status: tasks[key].status || TASK_STATUS.PENDING,
                observation: tasks[key].observation || ''
            });
        }
    }

    return displayTasks;
}

/** Mensaje cuando el gestor no tiene tareas (app.js 5599-5603). */
export function buildNoTasksHtml() {
    return `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    Este gestor aún no tiene tareas asignadas en este turno.
                </div>
            `;
}

/**
 * Estilo de la insignia de estado de una tarea del modal (app.js 5607-5619).
 *
 * @param {string} status
 * @returns {{badgeClass: string, badgeStyle: string}}
 */
export function resolveTaskBadge(status) {
    let badgeClass = 'pending';
    let badgeStyle = 'background: rgba(148,163,184,0.15); color: #94a3b8;';

    if (status === TASK_STATUS.DONE) {
        badgeClass = 'completed';
        badgeStyle = 'background: rgba(16,185,129,0.15); color: var(--success);';
    } else if (status === TASK_STATUS.IN_PROGRESS) {
        badgeClass = 'in-progress';
        badgeStyle = 'background: rgba(245,158,11,0.15); color: var(--warning);';
    } else if (status === TASK_STATUS.NOT_DONE) {
        badgeClass = 'not-done';
        badgeStyle = 'background: rgba(239,68,68,0.15); color: var(--danger);';
    }

    return { badgeClass, badgeStyle };
}

/**
 * Tarjeta de una tarea del modal de detalle (app.js 5606-5633).
 *
 * @param {{name: string, status: string, observation?: string}} t
 * @returns {string}
 */
export function buildDetailTaskCardHtml(t) {
    const { badgeClass, badgeStyle } = resolveTaskBadge(t.status);
    const observationText = t.observation ? escapeHTML(t.observation.trim()) : 'Sin observaciones cargadas.';

    return `
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
}
