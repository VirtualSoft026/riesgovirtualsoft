/**
 * HTML del árbol de tareas por Set (`renderTree()`, app.js 2063-2115) y de la tarjeta de KPI
 * (`updateKPI()`, app.js 2474-2517). Solo genera cadenas: dibujarlas en el DOM es del controlador.
 *
 * Los handlers inline (`toggleTree`, `selectTask`) siguen siendo globales de app.js; el id de la tarea se
 * serializa con `encodeInlineHandlerArg` para que un apóstrofe no rompa el atributo.
 */

import { canonicalTaskId } from '../../domain/tasks/task-report.js';
import { TASK_STATUS } from '../../utils/constants.js';
import { escapeHTML as defaultEscapeHTML, encodeInlineHandlerArg as defaultEncode } from '../../utils/sanitization.js';

/**
 * Clase del indicador de estado de una tarea según su entrada en el caché (app.js 2085-2093).
 * Sin entrada o con un estado distinto → pendiente.
 *
 * @param {{status?: string}|null|undefined} taskEntry
 * @returns {'status-pending'|'status-completed'|'status-in-progress'|'status-not-done'}
 */
export function getTaskStatusClass(taskEntry) {
    let statusClass = 'status-pending';

    if (taskEntry) {
        const statusText = taskEntry.status;

        if (statusText === TASK_STATUS.DONE) statusClass = 'status-completed';
        else if (statusText === TASK_STATUS.IN_PROGRESS) statusClass = 'status-in-progress';
        else if (statusText === TASK_STATUS.NOT_DONE) statusClass = 'status-not-done';
    }

    return statusClass;
}

/**
 * Llaves de Set en orden (app.js 2070): orden por defecto de `Array.prototype.sort` (UTF-16).
 *
 * @param {Record<string, unknown>} tasksBySet
 * @returns {string[]}
 */
export function sortedSetKeys(tasksBySet) {
    return Object.keys(tasksBySet).sort();
}

/**
 * Se auto-expande el árbol cuando hay un único Set (app.js 2071).
 *
 * @param {string[]} sets
 * @returns {boolean}
 */
export function shouldAutoExpandTree(sets) {
    return sets.length === 1;
}

/**
 * Contenido de un Set del árbol (app.js 2078-2108).
 *
 * @param {{
 *   set: string,
 *   tasks: Array<{id: unknown, name: unknown}>,
 *   taskStateCache: Record<string, {status?: string}>,
 *   shouldAutoExpand: boolean,
 *   escape?: (value: unknown) => string,
 *   encodeArg?: (value: unknown) => string
 * }} input
 * @returns {string}
 */
export function buildTreeSetHTML(input) {
    const {
        set, tasks, taskStateCache, shouldAutoExpand,
        escape = defaultEscapeHTML, encodeArg = defaultEncode
    } = input;
    const total = tasks.length;
    const headerClass = shouldAutoExpand ? 'tree-header open' : 'tree-header';
    const childrenClass = shouldAutoExpand ? 'tree-children show' : 'tree-children';

    return `
            <div class="${headerClass}" onclick="toggleTree(this)">
                <i class='bx bx-chevron-right'></i>
                <span>${escape(set)}</span>
                <span class="badge pending">${total} Tareas</span>
            </div>
            <div class="${childrenClass}">
                ${tasks.map((task) => {
                    const cId = canonicalTaskId(task.id);
                    const taskEntry = taskStateCache[cId] || taskStateCache[task.id];
                    const statusClass = getTaskStatusClass(taskEntry);

                    return `
                    <div class="task-item" onclick="selectTask(decodeURIComponent('${encodeArg(task.id)}'), event)">
                        <i class='bx bx-file-blank'></i> ${escape(task.name)}
                        <div class="task-status ${statusClass}"></div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
}

/**
 * Tarjeta de KPI del progreso (app.js 2497-2515).
 *
 * @param {{
 *   totalTasks: number, completedTasks: number, notDoneTasks: number, pending: number,
 *   completedPercentage: number, notDonePercentage: number, totalPercentage: number
 * }} figures resultado de `computeKpiFigures()`
 * @returns {string}
 */
export function buildTaskKpiHTML(figures) {
    const { totalTasks, completedTasks, notDoneTasks, pending, completedPercentage, notDonePercentage, totalPercentage } = figures;

    return `
            <div class="kpi-circle">
                <svg viewBox="0 0 36 36" class="circular-chart" style="width: 100%; height: 100%;">
                    <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke: var(--glass-border); stroke-width: 3.8;"/>
                    <path class="circle" stroke-dasharray="${completedPercentage}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke-width: 3.8; stroke-linecap: round; stroke: var(--success); transition: stroke-dasharray 1s ease-out;"/>
                    <path class="circle-not-done" stroke-dasharray="${notDonePercentage}, 100" stroke-dashoffset="-${completedPercentage}" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke-width: 3.8; stroke-linecap: round; stroke: var(--danger); transition: stroke-dasharray 1s ease-out, stroke-dashoffset 1s ease-out;"/>
                    <text x="18" y="20.35" class="percentage" style="fill: var(--text-primary); font-family: 'Inter'; font-size: 8px; font-weight: bold; text-anchor: middle;">${totalPercentage}%</text>
                </svg>
            </div>
            <div class="kpi-stats">
                <p><strong>${totalTasks}</strong> Asignadas</p>
                <p><strong style="color: var(--success);">${completedTasks}</strong> Realizadas</p>
                <p><strong style="color: var(--danger);">${notDoneTasks}</strong> No Realizadas</p>
                <p><strong>${pending}</strong> Pendientes</p>
            </div>
        `;
}
