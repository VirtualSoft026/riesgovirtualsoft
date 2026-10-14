/**
 * Reglas puras de `selectTask()` (app.js 2612-2672): qué texto de solo lectura ve un Admin/Supervisor al
 * abrir una tarea, qué botones de estado se pintan para un Gestor y la resolución de la tarea contra el
 * catálogo. Los efectos DOM quedan en `controllers/task-controller.js`.
 */

import { canonicalTaskId } from './task-report.js';

/**
 * ¿Es un perfil de revisión (solo lectura)? Admin o Supervisor (app.js 2635).
 *
 * @param {{role?: string}|null|undefined} user
 * @returns {boolean}
 */
export function isTaskReviewerRole(user) {
    return !!(user && (user.role === 'Admin' || user.role === 'Supervisor'));
}

/**
 * Busca la tarea en el catálogo por id canónico (app.js 2626). Los ids del catálogo son number y el que
 * llega del `onclick` es string: sin `canonicalTaskId()` `0 !== "0"` dejaba la selección sin resolver.
 *
 * @param {Array<{id: unknown}>} allTasks
 * @param {unknown} taskId
 * @returns {object|undefined}
 */
export function findCatalogTask(allTasks, taskId) {
    const canonicalId = canonicalTaskId(taskId);

    return allTasks.find((t) => canonicalTaskId(t.id) === canonicalId);
}

/**
 * Texto que ve un Admin/Supervisor en el cuadro de observaciones (app.js 2638-2644).
 *
 * @param {Record<string, string>} task fila del catálogo
 * @returns {string}
 */
export function buildReviewerTaskDetailText(task) {
    let detailText = `Detalle: ${task['Detalle de Tarea'] || 'Sin detalle'}\n\n`;
    detailText += `Horario: ${task['Horario'] || 'No especificado'}\n`;
    detailText += `Día: ${task['Día'] || 'No especificado'}\n\n`;
    detailText += `Instrucciones:\n${task['Instrucciones'] || 'Sin instrucciones'}`;

    return detailText;
}
