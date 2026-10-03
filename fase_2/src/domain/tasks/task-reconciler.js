import { taskNamesMatch } from '../../utils/normalize.js';
import { EXTRA_TASK_KEY_PREFIX, TASK_STATUS } from '../../utils/constants.js';
import { resolveTaskDisplayName } from './task-report.js';

/**
 * Reconciles ONE scheduled cronogram task against the session tasks using
 * fuzzy name matching (never exact equality). Extra tasks never match a
 * scheduled task.
 *
 * @param {string} taskName
 * @param {Record<string, {name?: string, status?: string, observation?: string}>|null} sessionTasks
 * @param {Array<Record<string, unknown>>|null} [catalog]
 * @param {(message: string, key: unknown) => void} [onWarn]
 * @returns {{status: string, observation: string}}
 */
export function reconcileScheduledTaskWithSession(taskName, sessionTasks, catalog = null, onWarn = () => {}) {
    const tasks = sessionTasks || {};

    for (const key in tasks) {
        if (key.startsWith(EXTRA_TASK_KEY_PREFIX)) {
            continue;
        }

        const entry = tasks[key];

        if (!entry) {
            continue;
        }

        const resolvedName = resolveTaskDisplayName(key, entry, catalog, onWarn);

        if (taskNamesMatch(taskName, resolvedName) || taskNamesMatch(taskName, entry.name)) {
            return {
                status: entry.status || TASK_STATUS.PENDING,
                observation: entry.observation || ''
            };
        }
    }

    return { status: TASK_STATUS.PENDING, observation: '' };
}

/**
 * Merges the local task cache with the recovered remote progress. Remote
 * replaces local only when its `updatedAt` is strictly newer; on ties or when
 * either side lacks `updatedAt` (legacy entries) the local entry wins.
 *
 * @param {Record<string, {updatedAt?: number}>|null} localCache
 * @param {Record<string, {updatedAt?: number}>|null} remoteCache
 * @returns {Record<string, object>}
 */
export function mergeTaskCaches(localCache, remoteCache) {
    const merged = { ...(localCache || {}) };

    Object.keys(remoteCache || {}).forEach((taskId) => {
        const remoteEntry = remoteCache[taskId];
        const localEntry = merged[taskId];

        if (!localEntry) {
            merged[taskId] = remoteEntry;

            return;
        }

        const remoteUpdatedAt = typeof remoteEntry.updatedAt === 'number' ? remoteEntry.updatedAt : null;
        const localUpdatedAt = typeof localEntry.updatedAt === 'number' ? localEntry.updatedAt : null;

        if (remoteUpdatedAt !== null && localUpdatedAt !== null && remoteUpdatedAt > localUpdatedAt) {
            merged[taskId] = remoteEntry;
        }
    });

    return merged;
}

/**
 * Lists which tasks of the merged cache must be rewritten to the remote:
 * those missing remotely or resolved in favor of local. Tasks identical in
 * both sides are skipped (idempotent). Legacy records without `updatedAt` are
 * stamped with `now` before being returned.
 *
 * @param {Record<string, object>|null} mergedCache
 * @param {Record<string, object>|null} remoteCache
 * @param {number} now
 * @returns {Array<{taskId: string, record: object}>}
 */
export function computeLocalTaskMigrations(mergedCache, remoteCache, now) {
    const remote = remoteCache || {};
    const migrations = [];

    Object.keys(mergedCache || {}).forEach((taskId) => {
        const mergedEntry = mergedCache[taskId];
        const remoteEntry = remote[taskId];
        const alreadyInSync = !!remoteEntry
            && mergedEntry.name === remoteEntry.name
            && mergedEntry.status === remoteEntry.status
            && mergedEntry.observation === remoteEntry.observation
            && mergedEntry.updatedAt === remoteEntry.updatedAt;

        if (alreadyInSync) {
            return;
        }

        const record = typeof mergedEntry.updatedAt === 'number'
            ? mergedEntry
            : { ...mergedEntry, updatedAt: now };

        migrations.push({ taskId, record });
    });

    return migrations;
}
