/**
 * Reglas puras del botón "Guardar progreso" de una tarea (listener de `#saveTaskBtn` dentro de
 * `initApp()`, app.js 3260-3377). El listener sigue en `app.js`; aquí queda la validación previa a
 * escribir, el armado del registro, la clase visual del estado y la clasificación del error.
 *
 * El orden de las validaciones es parte del contrato (cada una devuelve el mensaje de la primera que
 * falla): id de tarea, estado, observación, sesión, identidad, id válido, selección resuelta.
 */

import { canonicalTaskId } from './task-report.js';

/** Caracteres que Firebase no admite en una llave: `. # $ [ ] /` (app.js 3291). */
const INVALID_TASK_KEY_PATTERN = /[.#$\[\]/]/;

/**
 * @param {{
 *   currentActiveTaskId: unknown,
 *   selectedStatusText: string|null,
 *   observation: string,
 *   authUser: {uid?: string}|null,
 *   currentUser: {uid?: string}|null,
 *   currentSelectedTask: {id: unknown}|null
 * }} input `selectedStatusText` es null si no hay botón de estado activo; `observation` ya viene sin trim.
 * @returns {{ok: true, taskId: string, observation: string}|{ok: false, message: string}}
 */
export function validateTaskSaveInput(input) {
    const { currentActiveTaskId, selectedStatusText, authUser, currentUser, currentSelectedTask } = input;

    if (currentActiveTaskId === null || currentActiveTaskId === undefined) {
        return { ok: false, message: 'Selecciona una tarea antes de guardar el progreso.' };
    }

    if (selectedStatusText === null || selectedStatusText === undefined) {
        return { ok: false, message: 'Selecciona un estado antes de guardar el progreso.' };
    }

    const observation = (input.observation === null || input.observation === undefined) ? '' : input.observation.trim();

    if (!observation) {
        return { ok: false, message: 'OBLIGATORIO: Debes detallar la gestión realizada en las Notas Técnicas antes de guardar.' };
    }

    if (!authUser) {
        return { ok: false, message: 'Tu sesión expiró. Vuelve a iniciar sesión para guardar el progreso.' };
    }

    if (!currentUser || currentUser.uid !== authUser.uid) {
        return { ok: false, message: 'No se pudo verificar tu identidad. Vuelve a iniciar sesión para guardar el progreso.' };
    }

    const taskId = canonicalTaskId(currentActiveTaskId);

    if (!taskId || INVALID_TASK_KEY_PATTERN.test(taskId)) {
        return { ok: false, message: 'La tarea seleccionada tiene un identificador inválido y no puede guardarse.' };
    }

    // La selección debe estar resuelta contra el catálogo antes de permitir guardar: nunca se debe
    // persistir un nombre genérico "Tarea <id>".
    if (!currentSelectedTask || canonicalTaskId(currentSelectedTask.id) !== taskId) {
        return { ok: false, message: 'No se pudo confirmar la tarea seleccionada. Vuelve a seleccionarla antes de guardar.' };
    }

    return { ok: true, taskId, observation };
}

/**
 * Registro que se guarda en `active_sessions/{uid}/tasks/{taskId}` y en el caché local (app.js 3310-3317).
 *
 * @param {{'Tarea': string}} selectedTask
 * @param {string} statusText
 * @param {string} observation
 * @param {number} now
 * @returns {{name: string, status: string, observation: string, updatedAt: number}}
 */
export function buildTaskRecord(selectedTask, statusText, observation, now) {
    return {
        name: selectedTask['Tarea'],
        status: statusText.trim(),
        observation,
        updatedAt: now
    };
}

/**
 * Clase del indicador visual según las clases del botón de estado pulsado (app.js 3330-3333).
 *
 * @param {{contains: (name: string) => boolean}} buttonClassList
 * @returns {'status-completed'|'status-in-progress'|'status-not-done'|'status-pending'}
 */
export function resolveStatusClassForButton(buttonClassList) {
    if (buttonClassList.contains('completed')) return 'status-completed';
    if (buttonClassList.contains('in-progress')) return 'status-in-progress';
    if (buttonClassList.contains('not-done')) return 'status-not-done';

    return 'status-pending';
}

/**
 * Mensaje de error al fallar la escritura (app.js 3357-3363).
 *
 * @param {unknown} error
 * @returns {{isPermissionDenied: boolean, message: string}}
 */
export function describeTaskSaveError(error) {
    const errorCode = error && error.code ? error.code : '';
    const isPermissionDenied = errorCode === 'PERMISSION_DENIED'
        || /permission[_ ]denied/i.test((error && error.message) || '');

    return {
        isPermissionDenied,
        message: isPermissionDenied
            ? 'No tienes permiso para guardar esta tarea. Contacta a tu supervisor.'
            : 'No se pudo guardar el progreso en el servidor. El cambio quedó respaldado localmente; intenta guardar de nuevo.'
    };
}
