import { TASK_STATUS } from '../../utils/constants.js';

/**
 * Names of the tasks that are still unmanaged (In Progress or Pending) in a
 * task state cache; falls back to the task key when the entry has no name.
 * A shift cannot be closed while this list is not empty.
 *
 * @param {Record<string, {name?: string, status?: string}>|null|undefined} taskStateCache
 * @returns {string[]}
 */
export function findUnmanagedTasks(taskStateCache) {
    const unmanaged = [];

    if (!taskStateCache) {
        return unmanaged;
    }

    for (const taskId in taskStateCache) {
        const entry = taskStateCache[taskId];

        if (entry && (entry.status === TASK_STATUS.IN_PROGRESS || entry.status === TASK_STATUS.PENDING)) {
            unmanaged.push(entry.name || taskId);
        }
    }

    return unmanaged;
}
