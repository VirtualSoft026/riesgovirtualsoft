import { parseShiftRange } from '../../utils/date-time.js';

const NON_WORKING_SHIFTS = new Set(['', 'Descansa', 'Por Asignar']);

/**
 * Decides whether a "start - end" shift has already ended at `now`.
 * Shifts whose end hour is earlier than the start hour are treated as
 * overnight (end falls on the next day). Unparseable shifts never expire.
 *
 * @param {string} shiftStr
 * @param {Date} [now=new Date()]
 * @returns {{expired: boolean, shiftStr?: string, shiftEndTime?: Date}}
 */
export function evaluateShiftExpiration(shiftStr, now = new Date()) {
    if (!shiftStr || NON_WORKING_SHIFTS.has(shiftStr)) {
        return { expired: false };
    }

    const range = parseShiftRange(shiftStr);

    if (!range) {
        return { expired: false };
    }

    const shiftEndTime = new Date(now);
    shiftEndTime.setHours(range.end.h, range.end.min, 0, 0);

    if (range.start && range.end.h < range.start.h) {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
    }

    if (now > shiftEndTime) {
        return { expired: true, shiftStr, shiftEndTime };
    }

    return { expired: false };
}
