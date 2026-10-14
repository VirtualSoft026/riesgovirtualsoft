/**
 * Tarea extra ("Añadir Tarea Adicional"): validaciones, armado del registro y mensajes.
 *
 * Puerto 1:1 de la parte pura de `saveExtraTask()` (app.js 4033-4109) y del reinicio de
 * `openExtraTaskModal()` (4021-4031). La persistencia (`persistTaskToActiveSession`), el respaldo en
 * `localStorage`, el botón "Guardando..." y el modal viven en `controllers/approvals-controller.js`.
 *
 * Reglas conservadas:
 *  - Nombre y observación obligatorios (recortados); el estado viene del selector y no se valida
 *    (hallazgo: un DOM manipulado podría enviar cualquier texto; `isKnownExtraTaskStatus` lo expone sin aplicarlo).
 *  - La llave es `extra_<ms>` (`EXTRA_TASK_KEY_PREFIX`) y se REUTILIZA en el reintento tras un fallo para no
 *    duplicar la tarea (`resolveExtraTaskId`).
 *  - El nombre guardado lleva el prefijo literal `[EXTRA] `.
 *
 * Sin DOM, sin Firebase, sin `Date.now()` implícito: la hora llega por parámetro.
 */

import { EXTRA_TASK_KEY_PREFIX, TASK_STATUS } from '../../utils/constants.js';

/** Prefijo del nombre guardado (app.js 4075). */
export const EXTRA_TASK_NAME_PREFIX = '[EXTRA] ';

/** Textos visibles de `saveExtraTask()` (idénticos a app.js). */
export const EXTRA_TASK_MESSAGES = Object.freeze({
    NAME_REQUIRED: 'OBLIGATORIO: Debes ingresar el nombre de la tarea extra.',
    OBSERVATION_REQUIRED: 'OBLIGATORIO: Debes detallar la gestión realizada en las Notas Técnicas.',
    SESSION_EXPIRED: 'Tu sesión expiró. Vuelve a iniciar sesión para guardar la tarea extra.',
    IDENTITY_MISMATCH: 'No se pudo verificar tu identidad. Vuelve a iniciar sesión para guardar la tarea extra.',
    PERMISSION_DENIED: 'No tienes permiso para guardar esta tarea extra. Contacta a tu supervisor.',
    SAVE_FAILED: 'No se pudo guardar la tarea extra en el servidor. El cambio quedó respaldado localmente; intenta guardar de nuevo.',
    saved: (name) => `Tarea Adicional "${name}" agregada exitosamente y se incluirá en tu reporte de turno.`
});

/** HTML del botón mientras guarda (app.js 4062). */
export const EXTRA_TASK_SAVING_BUTTON_HTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";

/** Estado inicial del selector al abrir el modal (app.js 4025). */
export const EXTRA_TASK_DEFAULT_STATUS = TASK_STATUS.DONE;

/**
 * Recorta nombre y observación como lo hace app.js (4036 y 4038); el estado pasa tal cual.
 *
 * @param {{name?: unknown, status?: unknown, obs?: unknown}} raw
 */
export function normalizeExtraTaskInput(raw) {
    return {
        name: String(raw.name === null || raw.name === undefined ? '' : raw.name).trim(),
        status: raw.status,
        obs: String(raw.obs === null || raw.obs === undefined ? '' : raw.obs).trim()
    };
}

/**
 * Valida el formulario (app.js 4040-4046): primero el nombre, luego la observación.
 *
 * @param {{name: string, obs: string}} input Valores ya recortados.
 * @returns {{ok: true}|{ok: false, message: string}}
 */
export function validateExtraTaskInput(input) {
    if (!input.name) return { ok: false, message: EXTRA_TASK_MESSAGES.NAME_REQUIRED };
    if (!input.obs) return { ok: false, message: EXTRA_TASK_MESSAGES.OBSERVATION_REQUIRED };

    return { ok: true };
}

/**
 * Verifica la identidad antes de escribir (app.js 4047-4054): debe haber sesión de Firebase y coincidir con el
 * usuario local (las reglas exigen `auth.uid === $session_id` para escribir `active_sessions/{uid}`).
 *
 * @param {{uid: string}|null|undefined} authUser Usuario de Firebase Auth.
 * @param {{uid: string}|null|undefined} currentUser Usuario local.
 * @returns {{ok: true}|{ok: false, message: string}}
 */
export function validateExtraTaskIdentity(authUser, currentUser) {
    if (!authUser) return { ok: false, message: EXTRA_TASK_MESSAGES.SESSION_EXPIRED };
    if (!currentUser || currentUser.uid !== authUser.uid) return { ok: false, message: EXTRA_TASK_MESSAGES.IDENTITY_MISMATCH };

    return { ok: true };
}

/**
 * Llave de la tarea: la pendiente (reintento) o `extra_<ms>` nueva (app.js 4068).
 *
 * @param {string|null} pendingId
 * @param {number} nowMs
 */
export function resolveExtraTaskId(pendingId, nowMs) {
    return pendingId || (EXTRA_TASK_KEY_PREFIX + nowMs);
}

/**
 * Registro que se guarda (app.js 4072-4077).
 *
 * @param {{name: string, status: string, obs: string}} input Valores ya recortados.
 * @param {number} nowMs
 * @returns {{name: string, status: string, observation: string, updatedAt: number}}
 */
export function buildExtraTaskRecord(input, nowMs) {
    return {
        name: EXTRA_TASK_NAME_PREFIX + input.name,
        status: input.status,
        observation: input.obs,
        updatedAt: nowMs
    };
}

/** ¿La llave corresponde a una tarea extra? */
export function isExtraTaskKey(taskId) {
    return typeof taskId === 'string' && taskId.startsWith(EXTRA_TASK_KEY_PREFIX);
}

/** ¿El estado es uno de los del selector? (no lo aplica `saveExtraTask`; queda disponible para el controlador). */
export function isKnownExtraTaskStatus(status) {
    return Object.values(TASK_STATUS).includes(status);
}

/**
 * ¿El error es un "permiso denegado" de Firebase? (app.js 4096-4097)
 *
 * @param {unknown} error
 */
export function isPermissionDeniedError(error) {
    const errorCode = error && error.code ? error.code : '';

    return errorCode === 'PERMISSION_DENIED' || /permission[_ ]denied/i.test((error && error.message) || '');
}

/** Mensaje de la alerta cuando falla el guardado (app.js 4098-4100). */
export function resolveExtraTaskSaveErrorMessage(error) {
    return isPermissionDeniedError(error) ? EXTRA_TASK_MESSAGES.PERMISSION_DENIED : EXTRA_TASK_MESSAGES.SAVE_FAILED;
}
