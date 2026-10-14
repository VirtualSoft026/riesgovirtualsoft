const CLOCK_TIME_PATTERN = /(\d{1,2})(?::(\d{2}))?\s*([ap]\.?\s*m\.?)?/i;
const LOCALE_TIME_PATTERN = /(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?\s*m\.?)?/i;
const SHIFT_START_PATTERN = /(\d{1,2}):(\d{2})\s*([ap]\.?\s*m\.?)?/i;
const MINUTES_PER_DAY = 1440;

/**
 * Reduces a raw meridiem token ("p. m.", "AM", "pm") to "am", "pm" or null.
 *
 * @param {string|null|undefined} rawMeridiem
 * @returns {'am'|'pm'|null}
 */
export function normalizeMeridiem(rawMeridiem) {
    if (!rawMeridiem) {
        return null;
    }

    const token = rawMeridiem.toLowerCase().replace(/[^apm]/g, '');

    return token === 'am' || token === 'pm' ? token : null;
}

/**
 * Converts a 12-hour clock hour into a 24-hour clock hour.
 *
 * @param {number} hour
 * @param {'am'|'pm'|null} meridiem
 * @returns {number}
 */
export function to24Hour(hour, meridiem) {
    if (meridiem === 'pm' && hour < 12) {
        return hour + 12;
    }

    if (meridiem === 'am' && hour === 12) {
        return 0;
    }

    return hour;
}

/**
 * Parses a clock time such as "8", "8:30", "8 am" or "10:15 p. m.".
 *
 * @param {unknown} value
 * @returns {{h: number, min: number}|null}
 */
export function parseClockTime(value) {
    if (!value) {
        return null;
    }

    const match = String(value).match(CLOCK_TIME_PATTERN);

    if (!match) {
        return null;
    }

    return {
        h: to24Hour(parseInt(match[1], 10), normalizeMeridiem(match[3])),
        min: match[2] ? parseInt(match[2], 10) : 0
    };
}

/**
 * Parses the time portion of a locale string such as
 * "16/6/2026, 14:05:00" or "6/16/2026, 2:05:00 p. m.".
 *
 * @param {string|null|undefined} timeStr
 * @returns {{h: number, min: number}|null}
 */
export function parseTimeFromLocaleString(timeStr) {
    if (!timeStr) {
        return null;
    }

    const match = timeStr.match(LOCALE_TIME_PATTERN);

    if (!match) {
        return null;
    }

    return {
        h: to24Hour(parseInt(match[1], 10), normalizeMeridiem(match[3])),
        min: parseInt(match[2], 10)
    };
}

/**
 * Infers the shift start time from a schedule cell ("8:00 am - 5:00 pm",
 * "Tarde Set 1", "Sábado Set 2", ...), falling back to the historical
 * SET conventions.
 *
 * @param {string|null|undefined} shiftStr
 * @returns {{h: number, min: number}|null}
 */
export function parseShiftStart(shiftStr) {
    if (!shiftStr) {
        return null;
    }

    const s = shiftStr.toLowerCase();

    const explicit = shiftStr.match(SHIFT_START_PATTERN);

    if (explicit) {
        return {
            h: to24Hour(parseInt(explicit[1], 10), normalizeMeridiem(explicit[3])),
            min: parseInt(explicit[2], 10)
        };
    }

    if (s.includes('tarde')) {
        if (s.includes('set 1') || s.includes('soporte 1')) return { h: 15, min: 0 };
        if (s.includes('set 2') || s.includes('soporte 2')) return { h: 19, min: 0 };
    } else if (s.includes('sábado') || s.includes('sabado') || s.includes('domingo')) {
        if (s.includes('set 1')) return { h: 8, min: 0 };
        if (s.includes('set 2')) return { h: 15, min: 0 };
        if (s.includes('set 3')) return { h: 19, min: 0 };
    } else if (s.includes('mañana') || s.includes('manana')) {
        return { h: 8, min: 0 };
    }

    if (s.includes('set 1') || s.includes('soporte 1')) return { h: 8, min: 0 };
    if (s.includes('set 2') || s.includes('soporte 2')) return { h: 14, min: 0 };
    if (s.includes('set 3')) return { h: 15, min: 0 };
    if (s.includes('set 4')) return { h: 22, min: 0 };

    return null;
}

/**
 * Splits a "start - end" schedule cell into parsed start and end times.
 * The start is null when it cannot be parsed; the result is null when the
 * end is missing or unparseable.
 *
 * @param {string} shiftStr
 * @returns {{start: {h: number, min: number}|null, end: {h: number, min: number}}|null}
 */
export function parseShiftRange(shiftStr) {
    const parts = String(shiftStr || '').split('-');
    const endStr = parts.length > 1 ? parts[1].trim() : '';

    if (!endStr) {
        return null;
    }

    const end = parseClockTime(endStr);

    if (!end) {
        return null;
    }

    return {
        start: parseClockTime(parts[0].trim()),
        end
    };
}

/**
 * Converts a clock time into minutes since midnight.
 *
 * @param {{h: number, min: number}} time
 * @returns {number}
 */
export function toMinutesOfDay(time) {
    return time.h * 60 + time.min;
}

/**
 * Elapsed minutes between two timestamps, adding a day when the interval
 * crosses midnight (end earlier than start).
 *
 * @param {number} startMs
 * @param {number} endMs
 * @returns {number}
 */
export function minutesBetweenWrappingMidnight(startMs, endMs) {
    const diff = (endMs - startMs) / 60000;

    return diff < 0 ? diff + MINUTES_PER_DAY : diff;
}

/**
 * Converts a time-of-day or full date string into epoch milliseconds.
 * Falls back to applying an "HH:MM [AM|PM]" string onto the base date.
 * Returns NaN when the value cannot be interpreted.
 *
 * @param {unknown} timeStr
 * @param {number} baseDateMs
 * @returns {number}
 */
export function parseTimeToMs(timeStr, baseDateMs) {
    let value = timeStr;

    if (typeof value === 'string') {
        value = value.replace(/a\.\s*m\./i, 'AM').replace(/p\.\s*m\./i, 'PM');
    }

    const direct = new Date(value);

    if (!isNaN(direct.getTime())) {
        return direct.getTime();
    }

    if (typeof value === 'string' && value.includes(':')) {
        const parts = value.match(/(\d+):(\d+)/);

        if (parts) {
            const base = new Date(baseDateMs);
            let hours = parseInt(parts[1], 10);

            if (value.toUpperCase().includes('PM') && hours < 12) hours += 12;
            if (value.toUpperCase().includes('AM') && hours === 12) hours = 0;

            base.setHours(hours, parseInt(parts[2], 10), 0, 0);

            return base.getTime();
        }
    }

    return NaN;
}
