/**
 * Contadores y porcentajes de progreso de tareas.
 *
 * `updateKPI()` (app.js 2474-2517) y `syncActiveSessionToFirebase()` (app.js 2386-2472) cuentan las
 * tareas del DOM (`.task-item`, `.status-completed`, `.status-not-done`) y calculan por separado el
 * porcentaje. Aquí queda SOLO la aritmética, que recibe los conteos ya leídos del DOM.
 *
 * Decisión D8 (2026-10-06): el porcentaje de avance se calcula en UN solo lugar, `formatProgress(current,
 * total)` = `Math.round((current / total) * 100)` (0 si no hay tareas), y lo usan el latido al supervisor
 * (`computeSyncPercentage().percentage`) y la tarjeta KPI del gestor (`computeKpiFigures().totalPercentage`),
 * así ambos muestran el mismo entero (1 realizada + 1 no realizada de 3: 67 % en los dos).
 *
 * Antes (app.js) la tarjeta KPI sumaba dos porcentajes ya redondeados, round(realizadas) + round(no
 * realizadas) = 33 + 33 = 66, mientras el latido mostraba 67. Ese cálculo solo sigue disponible con
 * `computeKpiFigures(counts, { legacy: true })` para la prueba diferencial contra app.js.
 */

/**
 * Porcentaje de avance central (D8): `Math.round((current / total) * 100)`.
 * Devuelve 0 si `total` no es un número finito mayor que 0, o si `current` no es finito.
 * No recorta a [0, 100]: con conteos del DOM `current <= total` siempre.
 *
 * @param {number} current tareas finalizadas (o la parte que se mide)
 * @param {number} total tareas asignadas
 * @returns {number} entero
 */
export function formatProgress(current, total) {
    if (!(typeof total === 'number' && Number.isFinite(total) && total > 0)) return 0;
    if (!(typeof current === 'number' && Number.isFinite(current))) return 0;

    return Math.round((current / total) * 100);
}

/**
 * @typedef {{total: number, completed: number, notDone: number}} DomTaskCounts
 */

/**
 * Contadores del latido: total, realizadas, no realizadas, finalizadas (= realizadas + no realizadas)
 * y porcentaje (app.js 2398-2408).
 *
 * @param {DomTaskCounts} counts
 * @returns {{totalTasks: number, completedTasks: number, notDoneTasks: number, finalized: number, percentage: number}}
 */
export function computeSyncPercentage(counts) {
    const totalTasks = counts.total;
    const completedTasks = counts.completed;
    const notDoneTasks = counts.notDone;
    const finalized = completedTasks + notDoneTasks;

    const percentage = formatProgress(finalized, totalTasks);

    return { totalTasks, completedTasks, notDoneTasks, finalized, percentage };
}

/**
 * Cifras de la tarjeta KPI (app.js 2474-2494): pendientes y porcentajes de realizadas / no realizadas.
 *
 * `totalPercentage` (el número grande de la tarjeta) = `formatProgress(finalizadas, total)`, el mismo del
 * latido (D8). `completedPercentage` / `notDonePercentage` (los dos arcos del círculo) se siguen redondeando
 * por separado, como en app.js.
 *
 * @param {DomTaskCounts} counts
 * @param {{legacy?: boolean}} [options] `legacy: true` = cálculo ORIGINAL de app.js para `totalPercentage`
 *   (suma de los dos porcentajes redondeados); solo para la prueba diferencial.
 * @returns {{
 *   totalTasks: number, completedTasks: number, notDoneTasks: number, finalized: number, pending: number,
 *   completedPercentage: number, notDonePercentage: number, totalPercentage: number
 * }}
 */
export function computeKpiFigures(counts, { legacy = false } = {}) {
    const totalTasks = counts.total;
    const completedTasks = counts.completed;
    const notDoneTasks = counts.notDone;

    // Finalizadas = completed + not-done
    const finalized = completedTasks + notDoneTasks;
    const pending = totalTasks - finalized;

    let completedPercentage = 0;
    let notDonePercentage = 0;
    let totalPercentage = 0;

    if (totalTasks > 0) {
        completedPercentage = formatProgress(completedTasks, totalTasks);
        notDonePercentage = formatProgress(notDoneTasks, totalTasks);
        totalPercentage = legacy ? completedPercentage + notDonePercentage : formatProgress(finalized, totalTasks);
    }

    return {
        totalTasks, completedTasks, notDoneTasks, finalized, pending,
        completedPercentage, notDonePercentage, totalPercentage
    };
}
