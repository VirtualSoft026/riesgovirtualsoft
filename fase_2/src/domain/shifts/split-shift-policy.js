/**
 * Política de la "Pausa de Turno" (turno partido) condicionada al flag
 * `users/{uid}/hasSplitShift`.
 *
 * Reglas de negocio confirmadas (2026-10-06) que la refactorización debe heredar
 * (RN-1 a RN-3 en `plan-maestro-ejecucion.md`, sección 4 bis):
 *
 *  RN-1  Un gestor SIN `hasSplitShift === true` no ve el botón "Pausa de Turno" y no puede iniciar una pausa.
 *  RN-2  Con el flag activo el botón es visible y el gestor puede entrar y salir de "En Pausa de Turno".
 *  RN-3  Si el flag se revoca MIENTRAS el gestor está en pausa (o se recarga la página con la pausa
 *        restaurada), el botón "Retomar Turno" debe seguir visible: retomar SIEMPRE está permitido.
 *        De lo contrario el gestor queda atrapado, porque Almuerzo y Desayuno están bloqueados
 *        mientras haya una pausa activa.
 *
 * El flag solo lo puede escribir un Admin (reglas de `database.rules.json`); el cliente nunca debe
 * poder activárselo. Esta política es una capa de interfaz, no de seguridad.
 *
 * Origen: candidato de parche 2026-10-06 (app.js 689, 3622, 5124 y 5135; hallazgos B1–B4 de
 * `05-pruebas/2026-10-06-informe-pruebas-flag-hassplitshift.md`).
 */

export const SPLIT_SHIFT_BLOCK_REASON = Object.freeze({
    OTHER_BREAK_ACTIVE: 'OTHER_BREAK_ACTIVE',
    SPLIT_SHIFT_NOT_ENABLED: 'SPLIT_SHIFT_NOT_ENABLED'
});

/**
 * El flag cuenta solo si es el booleano `true` (el texto "true" o 1 no cuentan).
 *
 * @param {{hasSplitShift?: unknown}|null|undefined} user
 * @returns {boolean}
 */
export function isSplitShiftEnabled(user) {
    return Boolean(user) && user.hasSplitShift === true;
}

/**
 * ¿Se muestra el botón de Pausa de Turno?
 * Solo para el rol Gestor: con el flag activo, o con una pausa en curso (RN-3).
 *
 * @param {{role?: string, hasSplitShift?: unknown}|null|undefined} user
 * @param {{isSplitShiftBreak?: boolean}} [state]
 * @returns {boolean}
 */
export function shouldShowSplitShiftButton(user, state = {}) {
    if (!user || user.role !== 'Gestor') return false;

    return user.hasSplitShift === true || state.isSplitShiftBreak === true;
}

/**
 * ¿Se puede pulsar el botón? Iniciar exige el flag; retomar (pausa activa) siempre se permite.
 *
 * @param {{hasSplitShift?: unknown}|null|undefined} user
 * @param {{isSplitShiftBreak?: boolean}} [state]
 * @returns {boolean}
 */
export function canToggleSplitShiftBreak(user, state = {}) {
    if (!user) return false;
    if (state.isSplitShiftBreak === true) return true;

    return user.hasSplitShift === true;
}
