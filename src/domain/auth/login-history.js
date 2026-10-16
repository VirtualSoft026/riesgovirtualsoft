/**
 * Historial de accesos (modal "Historial de Accesos"; app.js 8402-8628): unifica tres fuentes de Firebase
 * (sesiones en vivo `active_sessions`, `login_history` y bitácoras `shift_reports`), calcula la insignia de
 * puntualidad, construye la tabla y filtra por texto y fecha.
 *
 * Todo PURO: sin DOM, sin Firebase y sin `Date.now()`/`new Date()` implícitos (la hora llega como `nowMs`
 * o `now`). Los efectos viven en `controllers/login-history-controller.js` y
 * `services/firebase/firebase-login-history-repository.js`. NO depende de `domain/auth/auth-service.js`.
 *
 * Fidelidad: la lógica es 1:1 con `app.js`, incluidos sus comportamientos discutibles, que quedan
 * documentados en el informe:
 *  - El filtro "Hoy" compara el día en UTC (`toISOString`), no el día local: a partir de las 19:00 en
 *    Colombia "Hoy" ya es "mañana" en UTC.
 *  - Una fecha de acceso inválida hace que el filtro por fecha lance `RangeError` (`toISOString`). Opción
 *    `tolerateInvalidDates` (apagada por defecto) las excluye en vez de lanzar.
 *  - DECISIÓN D2 (plan maestro §4 ter): si `loginTime` no es una fecha válida, `app.js` lo inserta TAL CUAL
 *    en la celda (sin escapar) y esos datos los puede escribir cualquier gestor en `login_history`/
 *    `shift_reports` (stored XSS hacia Supervisor/Admin). Aquí el valor crudo se escapa SIEMPRE (W-52, paso
 *    3.1: ya no hay opción para apagarlo). El resto de campos de la fila ya se escapaban.
 */

import { escapeHTML } from '../../utils/sanitization.js';
import { SESSION_STATUS } from '../analytics/active-session-status.js';

export const LOGIN_HISTORY_LOADING_HTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-secondary);"><i class='bx bx-loader-alt bx-spin' style="font-size: 24px; margin-bottom: 8px;"></i><br>Cargando historial de accesos...</td></tr>`;
export const LOGIN_HISTORY_ERROR_HTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--danger);">Error cargando los accesos. Por favor intenta de nuevo.</td></tr>`;
export const LOGIN_HISTORY_EMPTY_HTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-secondary);">No se encontraron registros de accesos.</td></tr>`;

/** Una sesión en vivo cuenta como "En Línea" si hubo latido en los últimos 2 minutos (app.js 8433). */
export const ONLINE_THRESHOLD_MS = 120000;

/** Estados en los que una sesión en vivo NO se considera en línea (app.js 8434). */
export const NOT_ONLINE_STATUSES = Object.freeze([SESSION_STATUS.LUNCH, SESSION_STATUS.BREAKFAST, SESSION_STATUS.SHIFT_BREAK, SESSION_STATUS.INACTIVE]);

/**
 * Une las tres fuentes en una sola lista ordenada por `loginTime` descendente (app.js 8417-8510).
 * Orden de prioridad (la primera que aparece gana, por clave `nombre_aaaa-mm-ddThh:mm`): sesiones en
 * vivo, `login_history`, bitácoras.
 *
 * @param {{activeSessions?: Record<string, object>|null, loginLogs?: Record<string, object>|null, shiftReports?: Record<string, object>|null}} sources
 *   valores (`snapshot.val()`) de cada nodo; `null` si el nodo no existe
 * @param {number} nowMs hora actual (reemplaza `Date.now()`/`new Date()` del original)
 * @param {Array<object>} [sink] arreglo donde se acumulan los registros (el controlador lo pasa para
 *   conservar el comportamiento del original ante un fallo a medio camino)
 * @returns {Array<object>} el mismo `sink`, ordenado
 */
export function buildLoginHistoryRecords({ activeSessions, loginLogs, shiftReports }, nowMs, sink = []) {
    const allLoginHistoryRecords = sink;
    const seenKeys = new Set();

    // 1. Current Active Sessions
    if (activeSessions) {
        const activeData = activeSessions;
        for (let uid in activeData) {
            const s = activeData[uid];
            if (!s || !s.name) continue;
            const loginTimeStr = s.loginTime || s.startTime || (s.lastActive ? new Date(s.lastActive).toISOString() : new Date(nowMs).toISOString());
            const key = `${s.name.trim().toLowerCase()}_${loginTimeStr.substring(0, 16)}`;
            seenKeys.add(key);

            let isOnline = s.lastActive ? ((nowMs - s.lastActive) < ONLINE_THRESHOLD_MS) : false;
            if (s.status === SESSION_STATUS.LUNCH || s.status === SESSION_STATUS.BREAKFAST || s.status === SESSION_STATUS.SHIFT_BREAK || s.status === SESSION_STATUS.INACTIVE) isOnline = false;

            allLoginHistoryRecords.push({
                name: s.name,
                email: s.email || '',
                shift: s.shift || 'Mañana',
                loginTime: loginTimeStr,
                lastActive: s.lastActive ? new Date(s.lastActive).toLocaleString('es-CO') : 'Reciente',
                isOnline: isOnline,
                status: s.status || (isOnline ? SESSION_STATUS.ONLINE : SESSION_STATUS.INACTIVE),
                source: 'En Vivo'
            });
        }
    }

    // 2. Login History Logs
    if (loginLogs) {
        const logData = loginLogs;
        for (let id in logData) {
            const l = logData[id];
            if (!l || !l.name) continue;
            const key = `${l.name.trim().toLowerCase()}_${(l.loginTime||'').substring(0, 16)}`;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);

            allLoginHistoryRecords.push({
                name: l.name,
                email: l.email || '',
                shift: l.shift || 'General',
                loginTime: l.loginTime || l.timestamp,
                lastActive: l.lastActive ? new Date(l.lastActive).toLocaleString('es-CO') : 'Finalizado',
                isOnline: false,
                status: l.status || 'Finalizado',
                source: 'Historial'
            });
        }
    }

    // 3. Past Shift Reports (Bitácoras)
    if (shiftReports) {
        const reportsData = shiftReports;
        for (let id in reportsData) {
            const r = reportsData[id];
            if (!r) continue;
            const gestorName = (r.gestor || r.name || r.userName || '').trim();
            if (!gestorName) continue;

            const shiftStr = r.turnoProgramado || r.shift || 'General';
            const loginTimeStr = r.horaInicio || r.loginTime || r.startTime || r.reportDate || (r.timestamp ? new Date(r.timestamp).toISOString() : '');
            const endTimeStr = r.horaFin || r.endTime || (r.timestamp ? new Date(r.timestamp).toLocaleString('es-CO') : 'Turno Finalizado');

            const key = `${gestorName.toLowerCase()}_${loginTimeStr.substring(0, 16)}`;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);

            let statusLabel = 'Turno Completado';
            if (shiftStr.toLowerCase().includes('descansa')) {
                statusLabel = 'Ingreso en Día de Descanso';
            }

            allLoginHistoryRecords.push({
                name: gestorName,
                email: r.email || '',
                shift: shiftStr,
                loginTime: loginTimeStr,
                lastActive: endTimeStr,
                isOnline: false,
                status: statusLabel,
                source: 'Bitácora'
            });
        }
    }

    // Sort descending by loginTime
    allLoginHistoryRecords.sort((a, b) => new Date(b.loginTime || 0) - new Date(a.loginTime || 0));

    return allLoginHistoryRecords;
}

/**
 * Puntualidad del acceso frente al turno (app.js 8541-8573).
 *
 * @param {string|undefined} shift texto del turno (p. ej. "8am - 4pm", "Descansa")
 * @param {string|number|undefined} loginTime
 * @returns {{kind: 'rest'}|{kind: 'on_time'}|{kind: 'off_hours'}|{kind: 'late', minutes: number}|null}
 */
export function computeLoginDelay(shift, loginTime) {
    const loginDateObj = loginTime ? new Date(loginTime) : null;

    if (shift && shift.toLowerCase().includes('descansa')) {
        return { kind: 'rest' };
    }

    if (loginDateObj && !isNaN(loginDateObj) && shift) {
        const shiftStr = shift.toLowerCase().trim();
        const match = shiftStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);

        if (match) {
            let hour = parseInt(match[1], 10);
            let minute = match[2] ? parseInt(match[2], 10) : 0;
            const ampm = match[3].toLowerCase();
            if (ampm === 'pm' && hour < 12) hour += 12;
            if (ampm === 'am' && hour === 12) hour = 0;

            const expected = new Date(loginDateObj);
            expected.setHours(hour, minute, 0, 0);
            let diffMin = (loginDateObj - expected) / (1000 * 60);

            if (diffMin < -12 * 60) {
                expected.setDate(expected.getDate() - 1);
                diffMin = (loginDateObj - expected) / (1000 * 60);
            } else if (diffMin > 12 * 60) {
                expected.setDate(expected.getDate() + 1);
                diffMin = (loginDateObj - expected) / (1000 * 60);
            }

            if (diffMin <= 5) {
                return { kind: 'on_time' };
            } else if (diffMin > 240) {
                return { kind: 'off_hours' };
            }

            return { kind: 'late', minutes: Math.round(diffMin) };
        }
    }

    return null;
}

/**
 * HTML de la insignia de puntualidad ('' si no aplica).
 *
 * @param {ReturnType<typeof computeLoginDelay>} delay
 * @returns {string}
 */
export function buildDelayBadgeHtml(delay) {
    if (!delay) return '';

    switch (delay.kind) {
    case 'rest':
        return `<span style="background: rgba(139,92,246,0.15); color: #8b5cf6; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">Descanso</span>`;
    case 'on_time':
        return `<span style="background: rgba(16,185,129,0.15); color: var(--success); padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">A tiempo</span>`;
    case 'off_hours':
        return `<span style="background: rgba(139,92,246,0.15); color: #8b5cf6; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">Fuera de Horario</span>`;
    default:
        return `<span style="background: rgba(239,68,68,0.15); color: var(--danger); padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">+${delay.minutes}m Tarde</span>`;
    }
}

/**
 * Contenido completo de `#loginHistoryTableBody` (app.js 8522-8596).
 *
 * @param {Array<object>} records
 * @param {{escapeHTML?: (value: unknown) => string}} [options]
 * @returns {string}
 */
export function buildLoginHistoryTableHtml(records, options = {}) {
    const esc = options.escapeHTML || escapeHTML;

    if (records.length === 0) {
        return LOGIN_HISTORY_EMPTY_HTML;
    }

    let html = '';
    records.forEach((r) => {
        const loginDateObj = r.loginTime ? new Date(r.loginTime) : null;
        const rawLogin = r.loginTime || 'N/A';
        const formattedLogin = loginDateObj && !isNaN(loginDateObj)
            ? loginDateObj.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'medium' })
            : esc(rawLogin);

        const delayBadge = buildDelayBadgeHtml(computeLoginDelay(r.shift, r.loginTime));

        let statusBadge = `<span style="background: rgba(59,130,246,0.15); color: var(--accent-primary); padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">${esc(r.status)}</span>`;
        if (r.isOnline) {
            statusBadge = `<span style="background: rgba(16,185,129,0.15); color: var(--success); padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;"><i class='bx bx-radio-circle-marked'></i> En Línea</span>`;
        } else if (r.status === 'Ingreso en Día de Descanso') {
            statusBadge = `<span style="background: rgba(139,92,246,0.15); color: #8b5cf6; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">Ingreso en Descanso</span>`;
        }

        html += `
            <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                <td style="padding: 12px 16px; font-weight: 600; color: var(--text-primary);">
                    ${esc(r.name)}
                    ${r.email ? `<div style="font-size: 11px; color: var(--text-secondary); font-weight: 400;">${esc(r.email)}</div>` : ''}
                </td>
                <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 13px;">${esc(r.shift)}</td>
                <td style="padding: 12px 16px; color: var(--text-primary); font-size: 13px; font-weight: 500;">
                    ${formattedLogin} ${delayBadge}
                </td>
                <td style="padding: 12px 16px;">${statusBadge}</td>
                <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 12px;">${esc(r.lastActive)}</td>
            </tr>
        `;
    });

    return html;
}

/**
 * Filtra por texto (nombre o correo) y por fecha ('todos' | 'hoy' | '7d' | '30d'), app.js 8598-8627.
 *
 * @param {Array<object>} records
 * @param {{query?: string, dateVal?: string}} filters `query` en minúsculas y recortado; `dateVal` por omisión 'todos'
 * @param {Date} now reemplaza `new Date()` del original
 * @param {{tolerateInvalidDates?: boolean}} [options] opción (apagada por defecto): excluye en vez de lanzar
 * @returns {Array<object>}
 */
export function filterLoginHistoryRecords(records, { query = '', dateVal = 'todos' } = {}, now = new Date(), options = {}) {
    const todayStr = now.toISOString().substring(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    return records.filter((r) => {
        if (query && !r.name.toLowerCase().includes(query) && !(r.email && r.email.toLowerCase().includes(query))) {
            return false;
        }

        if (dateVal !== 'todos' && r.loginTime) {
            const rDate = new Date(r.loginTime);

            if (options.tolerateInvalidDates && isNaN(rDate)) return false;

            const rDateStr = rDate.toISOString().substring(0, 10);
            if (dateVal === 'hoy' && rDateStr !== todayStr) return false;
            if (dateVal === '7d' && rDate < sevenDaysAgo) return false;
            if (dateVal === '30d' && rDate < thirtyDaysAgo) return false;
        }

        return true;
    });
}
