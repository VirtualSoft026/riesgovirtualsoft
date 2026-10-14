import {
    parseShiftStart,
    parseTimeFromLocaleString,
    toMinutesOfDay
} from '../../utils/date-time.js';
import {
    MINUTES_PER_DAY,
    MAX_TARDINESS_MINUTES,
    MAX_SHIFT_DURATION_MS,
    OUT_OF_SCHEDULE_MINUTES,
    MIN_REPORTED_TARDINESS_MINUTES,
    TIMELINE_EVENT
} from '../../utils/constants.js';

const NO_TARDINESS_SHIFTS = new Set(['Por Asignar', 'Descansa', 'N/A']);
const FULL_DAY_PERMISSION_TYPES = new Set(['Vacaciones', 'Falta Justificada', 'Calamidad']);

/**
 * Minutes of tardiness for a login relative to the assigned shift start.
 * Approved permissions that end after the scheduled start push the start
 * back; full-day absences and early or extremely late logins yield 0.
 *
 * @param {string} loginLocaleStr Login time as a locale string.
 * @param {string} shiftStr Schedule cell for the day.
 * @param {Array<{horaFin?: string, Hora_Fin?: string, tipo?: string}>} [permisos=[]]
 * @returns {number}
 */
export function getTardiness(loginLocaleStr, shiftStr, permisos = []) {
    if (!shiftStr || NO_TARDINESS_SHIFTS.has(shiftStr)) {
        return 0;
    }

    let sched = parseShiftStart(shiftStr);
    const actual = parseTimeFromLocaleString(loginLocaleStr);

    if (!sched || !actual) {
        return 0;
    }

    if (permisos && permisos.length > 0) {
        for (const permiso of permisos) {
            const horaFin = permiso.horaFin || permiso.Hora_Fin;

            if (horaFin) {
                const parts = horaFin.split(':');

                if (parts.length >= 2) {
                    const permissionHour = parseInt(parts[0], 10);
                    const permissionMinute = parseInt(parts[1], 10);

                    if (!isNaN(permissionHour) && !isNaN(permissionMinute)) {
                        const permissionTotal = permissionHour * 60 + permissionMinute;

                        if (permissionTotal > toMinutesOfDay(sched)) {
                            sched = { h: permissionHour, min: permissionMinute };
                        }
                    }
                }
            } else if (FULL_DAY_PERMISSION_TYPES.has(permiso.tipo)) {
                return 0;
            }
        }
    }

    let diff = toMinutesOfDay(actual) - toMinutesOfDay(sched);

    if (diff < -MAX_TARDINESS_MINUTES) {
        diff += MINUTES_PER_DAY;
    }

    if (diff > 0 && diff < MAX_TARDINESS_MINUTES) {
        return diff;
    }

    return 0;
}

/**
 * Total minutes of inactivity events in a timeline. Open events run until
 * `nowMs`.
 *
 * @param {Array<{type: string, start: number, end?: number|null}>} timeline
 * @param {number} [nowMs=Date.now()]
 * @returns {number}
 */
export function sumInactivityMinutes(timeline, nowMs = Date.now()) {
    let minutes = 0;

    if (Array.isArray(timeline)) {
        timeline.forEach((event) => {
            if (event.type === TIMELINE_EVENT.INACTIVITY) {
                const eventEnd = event.end ? event.end : nowMs;

                minutes += (eventEnd - event.start) / (1000 * 60);
            }
        });
    }

    return minutes;
}

/**
 * Total minutes of inactivity capped to the maximum shift window that starts
 * at `loginMs` (10 h). Events starting after the window are ignored and events
 * crossing it are truncated. Without `loginMs` no window applies.
 *
 * @param {Array<{type: string, start: number, end?: number|null}>} timeline
 * @param {{loginMs?: number|null, nowMs?: number}} [options]
 * @returns {number}
 */
export function sumInactivityMinutesWithinShiftWindow(timeline, options = {}) {
    const { loginMs = null, nowMs = Date.now() } = options;
    const hasLogin = loginMs !== null && loginMs !== undefined;
    const maxEndMs = hasLogin ? loginMs + MAX_SHIFT_DURATION_MS : nowMs + 99999999;
    let minutes = 0;

    if (Array.isArray(timeline)) {
        timeline.forEach((event) => {
            if (event.type !== TIMELINE_EVENT.INACTIVITY) {
                return;
            }

            if (hasLogin && event.start > maxEndMs) {
                return;
            }

            let eventEnd = event.end ? event.end : nowMs;

            if (hasLogin && eventEnd > maxEndMs) {
                eventEnd = maxEndMs;
            }

            const eventMinutes = (eventEnd - event.start) / (1000 * 60);

            if (eventMinutes > 0) {
                minutes += eventMinutes;
            }
        });
    }

    return minutes;
}

/**
 * Rebuilds the login date of a stored report from its "d/m/yyyy, hh:mm:ss"
 * locale string (swapping day and month when the month exceeds 12).
 * Returns null when it cannot be rebuilt. With `fallbackToNativeDate`, a
 * value without a d/m/y date part is passed to `new Date()`.
 *
 * @param {string} horaInicio
 * @param {{fallbackToNativeDate?: boolean}} [options]
 * @returns {Date|null}
 */
export function parseReportStartDate(horaInicio, options = {}) {
    try {
        const parts = horaInicio.split(',');

        if (parts.length > 0) {
            const dateParts = parts[0].trim().split('/');

            if (dateParts.length === 3) {
                let day = parseInt(dateParts[0]);
                let month = parseInt(dateParts[1]);
                const year = parseInt(dateParts[2]);

                if (month > 12) {
                    const swap = day;
                    day = month;
                    month = swap;
                }

                const timePart = parts.length > 1
                    ? parts[1].trim().replace(/\./g, '').replace(/a\s*m/i, 'AM').replace(/p\s*m/i, 'PM')
                    : '00:00:00';

                return new Date(`${month}/${day}/${year} ${timePart}`);
            }

            if (options.fallbackToNativeDate) {
                return new Date(horaInicio);
            }
        }
    } catch (error) {
        return null;
    }

    return null;
}

/**
 * Evaluates a report login against its programmed shift ("8:00 am", "3 pm").
 * `isOutOfSchedule` is true when the login is more than 4 h from the closest
 * occurrence of the shift start; `tardinessMins` is the rounded delay when it
 * exceeds 5 min and the login is in schedule. Unparseable shifts yield no
 * match.
 *
 * @param {Date} loginDate
 * @param {string} turnoProgramado
 * @returns {{matched: boolean, diffMinutes: number|null, isOutOfSchedule: boolean, tardinessMins: number}}
 */
export function evaluateReportLateness(loginDate, turnoProgramado) {
    const noMatch = { matched: false, diffMinutes: null, isOutOfSchedule: false, tardinessMins: 0 };

    if (!loginDate || Number.isNaN(loginDate.getTime()) || !turnoProgramado) {
        return noMatch;
    }

    const shiftStr = turnoProgramado.toLowerCase().trim();
    const match = shiftStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);

    if (!match) {
        return noMatch;
    }

    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3].toLowerCase();

    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;

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

    const isOutOfSchedule = diffMinutes > OUT_OF_SCHEDULE_MINUTES;
    const tardinessMins = diffMinutes > MIN_REPORTED_TARDINESS_MINUTES && !isOutOfSchedule
        ? Math.round(diffMinutes)
        : 0;

    return { matched: true, diffMinutes, isOutOfSchedule, tardinessMins };
}
