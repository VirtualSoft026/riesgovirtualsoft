import { canonicalTaskId } from '../tasks/task-report.js';
import { EXTRA_TASK_KEY_PREFIX } from '../../utils/constants.js';

/**
 * Reglas de validación previas al cierre de turno.
 *
 * Puerto 1:1 de la lógica pura de `handleEndShift()` (app.js 3661-3724),
 * `hasRealSetOptions()` (3602-3607) y `requiresSpecificSetSelection()`
 * (3609-3612). Los `alert()` y el `return` posterior quedan para el
 * controlador: aquí solo se decide QUÉ falta.
 */

/**
 * ¿El <select> de SET tiene alguna opción real (habilitada y distinta de
 * "" / "Todos")? Acepta cualquier objeto con `options` iterable (un
 * HTMLSelectElement real o un objeto simulado).
 *
 * @param {{options?: Iterable<{disabled?: boolean, value: string}>}|null} setSelect
 * @returns {boolean}
 */
export function hasRealSetOptions(setSelect) {
    if (!setSelect || !setSelect.options) return false;
    return Array.from(setSelect.options).some((option) => (
        !option.disabled && option.value !== '' && option.value !== 'Todos'
    ));
}

/**
 * ¿Hay que obligar al Gestor a elegir un SET específico? Verdadero si existen
 * opciones reales y el valor actual es "" o "Todos".
 *
 * @param {{options?: Iterable<{disabled?: boolean, value: string}>, value?: string}|null} setSelect
 * @returns {boolean}
 */
export function requiresSpecificSetSelection(setSelect) {
    if (!hasRealSetOptions(setSelect)) return false;
    return setSelect.value === '' || setSelect.value === 'Todos';
}

function isManagedStatus(entry) {
    const statusNorm = (entry && entry.status ? String(entry.status) : '')
        .toLowerCase()
        .replace(/_/g, ' ')
        .trim();

    return statusNorm === 'finalizada' || statusNorm === 'no realizada';
}

/**
 * Lista los nombres de las tareas sin gestionar (ni "Finalizada" ni "No
 * Realizada"). Mismo orden y mismos nombres de respaldo que `app.js`:
 * 1) tareas del catálogo `allTasks` (o, si no es un arreglo, las del caché que
 * no empiezan por "extra_"), 2) tareas extra del caché.
 *
 * @param {{allTasks?: Array<object>|null, taskStateCache: Record<string, {status?: string, name?: string}>}} input
 * @returns {string[]}
 */
export function listUnmanagedTasks({ allTasks, taskStateCache }) {
    const unmanaged = [];
    const cache = taskStateCache || {};

    if (Array.isArray(allTasks)) {
        for (const task of allTasks) {
            const cId = canonicalTaskId(task.id);
            const entry = cache[cId];

            if (!isManagedStatus(entry)) {
                unmanaged.push(task['Tarea'] || (entry && entry.name) || cId);
            }
        }
    } else {
        for (const tId in cache) {
            if (!tId.startsWith(EXTRA_TASK_KEY_PREFIX)) {
                const entry = cache[tId];

                if (!isManagedStatus(entry)) {
                    unmanaged.push((entry && entry.name) || tId);
                }
            }
        }
    }

    for (const tId in cache) {
        if (tId.startsWith(EXTRA_TASK_KEY_PREFIX)) {
            const entry = cache[tId];

            if (!isManagedStatus(entry)) {
                unmanaged.push((entry && entry.name) || tId);
            }
        }
    }

    return unmanaged;
}

/**
 * ¿Aplica la validación de tareas gestionadas? Solo a Gestores con caché de
 * tareas disponible (condición de app.js línea 3682).
 *
 * @param {{role?: string}|null} localUser
 * @param {object|null|undefined} taskStateCache
 * @returns {boolean}
 */
export function shouldValidateManagedTasks(localUser, taskStateCache) {
    return Boolean(localUser && localUser.role === 'Gestor' && taskStateCache);
}
