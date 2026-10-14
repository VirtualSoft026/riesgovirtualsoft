/**
 * Reglas puras de la recuperación del progreso de tareas del Gestor al iniciar la aplicación
 * (`recoverGestorTaskProgress()`, app.js 2694-2720, y el primer bloque de `initApp()`, app.js 2722-2748).
 *
 * La orquestación con efectos (leer Firebase, fusionar, migrar) vive en `controllers/task-controller.js`.
 * Aquí quedan los códigos de resultado y los mensajes que ve el Gestor.
 */

/** Resultados de `recoverGestorTaskProgress()`. */
export const RECOVERY_STATUS = Object.freeze({
    OK: 'OK',
    REMOTE_READ_FAILED: 'REMOTE_READ_FAILED',
    IDENTITY_MISMATCH: 'IDENTITY_MISMATCH'
});

export const RECOVERY_REMOTE_READ_FAILED_MESSAGE =
    'No se pudo verificar el progreso remoto de tareas en el servidor. '
    + 'Se conserva el respaldo local de este dispositivo; se reintentará más adelante.';

/**
 * Mensaje de advertencia para un resultado de recuperación, o `null` si no hay nada que avisar
 * (app.js 2730-2743). Un resultado `IDENTITY_MISMATCH` NO muestra alerta en el original (solo se registra
 * en consola): se conserva así.
 *
 * @param {{status: string, failedMigrationsCount: number}} recovery
 * @returns {string|null}
 */
export function describeRecoveryAlert(recovery) {
    if (recovery.status === RECOVERY_STATUS.REMOTE_READ_FAILED) {
        return RECOVERY_REMOTE_READ_FAILED_MESSAGE;
    }

    if (recovery.failedMigrationsCount > 0) {
        return `No se pudo sincronizar con el servidor el progreso local de ${recovery.failedMigrationsCount} tarea(s). `
            + 'Se conservó el respaldo local en este dispositivo; vuelve a guardar esas tareas cuando tengas conexión.';
    }

    return null;
}

/**
 * ¿Aplica la recuperación? Solo un Gestor con uid (app.js 2728).
 *
 * @param {{role?: string, uid?: string}|null|undefined} user
 * @returns {boolean}
 */
export function shouldRecoverTaskProgress(user) {
    return !!(user && user.role === 'Gestor' && user.uid);
}
