import {
    TIMELINE_EVENT,
    MIN_INACTIVITY_EVENT_MS,
    TIMELINE_MERGE_GAP_MS
} from '../../utils/constants.js';

const STORED_TIMELINE_BREAK_TYPES = new Set([
    TIMELINE_EVENT.LUNCH,
    TIMELINE_EVENT.BREAKFAST,
    TIMELINE_EVENT.SHIFT_BREAK
]);

/**
 * Cleans a timeline restored from storage: drops inactivity events shorter
 * than 30 s or that overlap any break, and closes inactivity events that were
 * left open. Returns new event objects; the input is not mutated.
 *
 * @param {Array<{type: string, start: number, end: number|null}>} events
 * @param {number} [nowMs=Date.now()]
 * @returns {{timeline: Array<object>, changed: boolean}}
 */
export function cleanupStoredTimeline(events, nowMs = Date.now()) {
    const list = Array.isArray(events) ? events : [];
    const breaks = list.filter((event) => STORED_TIMELINE_BREAK_TYPES.has(event.type));

    const kept = list.filter((event) => {
        if (event.type !== TIMELINE_EVENT.INACTIVITY) {
            return true;
        }

        const eventStart = event.start;
        const eventEnd = event.end || nowMs;

        if (eventEnd - eventStart < MIN_INACTIVITY_EVENT_MS) {
            return false;
        }

        const overlaps = breaks.some((breakEvent) => {
            const breakEnd = breakEvent.end || nowMs;

            return eventStart < breakEnd && eventEnd > breakEvent.start;
        });

        return !overlaps;
    });

    let changed = kept.length !== list.length;

    const timeline = kept.map((event) => {
        if (event.type === TIMELINE_EVENT.INACTIVITY && event.end === null) {
            changed = true;

            return { ...event, end: nowMs };
        }

        return { ...event };
    });

    return { timeline, changed };
}

/**
 * Consolidates duplicated or overlapping timeline events into a clean,
 * chronological list. Open events end at `defaultEndMs`. Inactivity shorter
 * than 30 s or fully inside a break is discarded; same-type events less than
 * one minute apart are merged; inactivity overlapping a different event starts
 * when that event ends.
 *
 * @param {Array<{type: string, start: number, end: number|null}>} events
 * @param {{defaultEndMs: number, breakTypes?: Iterable<string>}} options
 * @returns {Array<{type: string, start: number, end: number}>}
 */
export function consolidateTimeline(events, options) {
    const { defaultEndMs } = options;
    const breakTypes = new Set(
        options.breakTypes || [
            TIMELINE_EVENT.BREAKFAST,
            TIMELINE_EVENT.LUNCH,
            TIMELINE_EVENT.SHIFT_BREAK
        ]
    );

    const cleanTimeline = [];

    if (!Array.isArray(events) || events.length === 0) {
        return cleanTimeline;
    }

    const breaks = events.filter((event) => breakTypes.has(event.type));
    const sortedEvents = [...events].sort((a, b) => a.start - b.start);

    sortedEvents.forEach((event) => {
        let eventStart = event.start;
        const eventEnd = event.end || defaultEndMs;

        if (eventEnd <= eventStart) {
            return;
        }

        if (event.type === TIMELINE_EVENT.INACTIVITY) {
            if (eventEnd - eventStart < MIN_INACTIVITY_EVENT_MS) {
                return;
            }

            const insideBreak = breaks.some((breakEvent) => {
                const breakEnd = breakEvent.end || defaultEndMs;

                return eventStart >= breakEvent.start && eventEnd <= breakEnd;
            });

            if (insideBreak) {
                return;
            }
        }

        if (cleanTimeline.length === 0) {
            cleanTimeline.push({ type: event.type, start: eventStart, end: eventEnd });

            return;
        }

        const previous = cleanTimeline[cleanTimeline.length - 1];

        if (previous.type === event.type && eventStart <= previous.end + TIMELINE_MERGE_GAP_MS) {
            previous.end = Math.max(previous.end, eventEnd);
        } else if (eventStart < previous.end) {
            if (event.type === TIMELINE_EVENT.INACTIVITY) {
                if (eventEnd > previous.end) {
                    eventStart = previous.end;

                    if (eventEnd - eventStart >= MIN_INACTIVITY_EVENT_MS) {
                        cleanTimeline.push({ type: event.type, start: eventStart, end: eventEnd });
                    }
                }
            } else {
                cleanTimeline.push({ type: event.type, start: eventStart, end: eventEnd });
            }
        } else {
            cleanTimeline.push({ type: event.type, start: eventStart, end: eventEnd });
        }
    });

    return cleanTimeline;
}

/**
 * Returns a new timeline after applying an event.
 * @param {Array<object>} timeline
 * @param {string} type
 * @param {'start'|'end'} action
 * @param {number} [now=Date.now()]
 * @returns {Array<object>}
 */
export function pushTimelineEvent(timeline, type, action, now = Date.now()) {
    const nextTimeline = Array.isArray(timeline)
        ? timeline.map(event => ({ ...event }))
        : [];

    if (action === 'start') {
        nextTimeline.forEach(event => {
            if (event.end === null) event.end = now;
        });
        nextTimeline.push({ type, start: now, end: null });
    } else if (action === 'end') {
        for (let index = nextTimeline.length - 1; index >= 0; index -= 1) {
            if (nextTimeline[index].type === type && nextTimeline[index].end === null) {
                nextTimeline[index].end = now;
                break;
            }
        }
    }

    return nextTimeline;
}
