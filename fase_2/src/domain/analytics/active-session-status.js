/**
 * Estado de una sesión activa tal como lo ve el supervisor en "Monitoreo".
 *
 * Puerto de la lógica de estado de `renderActiveSessionsDashboard()` (app.js
 * 5239-5247 para el filtro y 5284-5310 para la tarjeta), CORREGIDA para
 * reconocer el estado "En Pausa de Turno", que `syncActiveSessionToFirebase()`
 * escribe (app.js 2426-2427) pero que la vista del supervisor no contemplaba:
 * con un latido reciente se mostraba "En Línea" aunque el Gestor estuviera en
 * pausa. Para los demás estados el resultado es idéntico al original.
 */

export const SESSION_STATUS = Object.freeze({
    ONLINE: 'En Línea',
    INACTIVE: 'Inactivo',
    LUNCH: 'En Almuerzo',
    BREAKFAST: 'En Desayuno',
    SHIFT_BREAK: 'En Pausa de Turno'
});

/** Sin latido en este tiempo, la sesión se considera sin conexión (app.js 5239/5284). */
export const SESSION_HEARTBEAT_TIMEOUT_MS = 120000;

const BREAK_STATUSES = new Set([
    SESSION_STATUS.LUNCH,
    SESSION_STATUS.BREAKFAST,
    SESSION_STATUS.SHIFT_BREAK
]);

function hasRecentHeartbeat(session, nowMs) {
    return session && session.lastActive
        ? (nowMs - session.lastActive) < SESSION_HEARTBEAT_TIMEOUT_MS
        : false;
}

/**
 * ¿Cuenta como "En Línea" para el filtro de estado? (app.js 5239-5247).
 * Falso en pausas y en inactividad aunque el latido sea reciente.
 *
 * @param {{lastActive?: number, status?: string}} session
 * @param {number} [nowMs=Date.now()]
 * @returns {boolean}
 */
export function isSessionOnlineForFilter(session, nowMs = Date.now()) {
    if (!hasRecentHeartbeat(session, nowMs)) return false;
    if (BREAK_STATUSES.has(session.status) || session.status === SESSION_STATUS.INACTIVE) return false;
    return true;
}

/**
 * Estado a mostrar en la tarjeta del supervisor (app.js 5284-5310).
 *
 * @param {{lastActive?: number, status?: string}} session
 * @param {number} [nowMs=Date.now()]
 * @returns {{status: string, displayStatus: string, isOnline: boolean, isBreak: boolean}}
 */
export function resolveSessionDisplay(session, nowMs = Date.now()) {
    let isOnline = hasRecentHeartbeat(session, nowMs);
    let status = session ? session.status : undefined;

    // Sin latido por más de 2 minutos y fuera de pausa: se fuerza "Inactivo".
    if (!isOnline && !BREAK_STATUSES.has(status)) {
        status = SESSION_STATUS.INACTIVE;
    }

    let displayStatus = isOnline ? 'En Línea' : 'Inactivo';

    if (status === SESSION_STATUS.LUNCH) {
        displayStatus = 'En Almuerzo/Cena 🍽️';
    } else if (status === SESSION_STATUS.BREAKFAST) {
        displayStatus = 'En Desayuno ☕';
    } else if (status === SESSION_STATUS.SHIFT_BREAK) {
        displayStatus = 'En Pausa de Turno ⏸️';
    } else if (status === SESSION_STATUS.INACTIVE) {
        isOnline = false;
        displayStatus = 'Inactivo 💤';
    } else if (status === SESSION_STATUS.ONLINE) {
        displayStatus = 'En Línea';
    }

    return { status, displayStatus, isOnline, isBreak: BREAK_STATUSES.has(status) };
}
