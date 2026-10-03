import {
    ALLOWED_LUNCH_MINUTES,
    ALLOWED_BREAKFAST_MINUTES
} from '../../utils/constants.js';

/**
 * Break durations and the connectivity penalty applied at shift close.
 * Penalty = lunch excess over 60 min + breakfast excess over 15 min +
 * inactivity minutes, rounded to one decimal.
 *
 * @param {{lunchMs: number, breakfastMs: number, inactivityMins: number}} input
 * @returns {{lunchMinutes: number, breakfastMinutes: number, extraLunch: number, extraBreakfast: number, penaltyMins: number}}
 */
export function calculateConnectivityPenalty({ lunchMs, breakfastMs, inactivityMins }) {
    const lunchMinutes = parseFloat((lunchMs / (1000 * 60)).toFixed(1));
    const breakfastMinutes = parseFloat((breakfastMs / (1000 * 60)).toFixed(1));
    const extraLunch = Math.max(0, lunchMinutes - ALLOWED_LUNCH_MINUTES);
    const extraBreakfast = Math.max(0, breakfastMinutes - ALLOWED_BREAKFAST_MINUTES);
    const penaltyMins = parseFloat((extraLunch + extraBreakfast + inactivityMins).toFixed(1));

    return { lunchMinutes, breakfastMinutes, extraLunch, extraBreakfast, penaltyMins };
}

/**
 * Effective worked hours (2 decimals, as a string): total shift time minus
 * lunch, breakfast and the connectivity penalty, never negative.
 *
 * @param {{loginMs: number, endMs: number, lunchMs: number, breakfastMs: number, penaltyMins: number}} input
 * @returns {string}
 */
export function calculateEffectiveHours({ loginMs, endMs, lunchMs, breakfastMs, penaltyMins }) {
    const effectiveShiftMs = (endMs - loginMs) - lunchMs - breakfastMs - (penaltyMins * 60 * 1000);

    return Math.max(0, (effectiveShiftMs / (1000 * 60 * 60))).toFixed(2);
}

/**
 * Returns the default shape of the shift break/pause state.
 *
 * @returns {object}
 */
export function defaultState() {
    return {
        isLunchBreak: false,
        lunchStartTime: null,
        totalLunchTimeMs: 0,
        isBreakfastBreak: false,
        breakfastStartTime: null,
        totalBreakfastTimeMs: 0,
        isSplitShiftBreak: false,
        splitShiftStartTime: null,
        totalSplitShiftTimeMs: 0,
        shiftTimeline: []
    };
}

/**
 * Normalizes a persisted or partial break state into a complete, safe shape.
 *
 * @param {object} value
 * @returns {object}
 */
export function normalizeState(value) {
    const defaults = defaultState();
    if (!value || typeof value !== 'object') return defaults;

    return {
        isLunchBreak: value.isLunchBreak === true,
        lunchStartTime: Number.isFinite(value.lunchStartTime) ? value.lunchStartTime : null,
        totalLunchTimeMs: Number.isFinite(value.totalLunchTimeMs) ? value.totalLunchTimeMs : 0,
        isBreakfastBreak: value.isBreakfastBreak === true,
        breakfastStartTime: Number.isFinite(value.breakfastStartTime) ? value.breakfastStartTime : null,
        totalBreakfastTimeMs: Number.isFinite(value.totalBreakfastTimeMs) ? value.totalBreakfastTimeMs : 0,
        isSplitShiftBreak: value.isSplitShiftBreak === true,
        splitShiftStartTime: Number.isFinite(value.splitShiftStartTime) ? value.splitShiftStartTime : null,
        totalSplitShiftTimeMs: Number.isFinite(value.totalSplitShiftTimeMs) ? value.totalSplitShiftTimeMs : 0,
        shiftTimeline: Array.isArray(value.shiftTimeline)
            ? value.shiftTimeline.map(event => ({ ...event }))
            : []
    };
}
