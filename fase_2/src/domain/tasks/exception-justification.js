/**
 * Justificación de una tarea "No Realizada" (modal "Justificar Tarea No Realizada").
 *
 * Puerto 1:1 de la parte pura de `confirmException()` (app.js 4001-4019): validación del motivo y armado
 * del texto que se vuelca en `taskObservation`.
 *
 * Sin DOM.
 */

/** Textos visibles (idénticos a app.js). */
export const EXCEPTION_MESSAGES = Object.freeze({
    REASON_REQUIRED: 'Por favor seleccione una razón principal.',
    DETAILS_REQUIRED: 'Por favor detalle el problema obligatoriamente.'
});

/**
 * Valida la justificación (app.js 4008-4016): primero la razón (valor de la opción), luego el detalle recortado.
 *
 * @param {{reasonValue: unknown, details: unknown}} input `details` crudo del campo de texto.
 * @returns {{ok: true, details: string}|{ok: false, message: string}}
 */
export function validateExceptionInput({ reasonValue, details }) {
    const trimmed = String(details === null || details === undefined ? '' : details).trim();

    if (!reasonValue) return { ok: false, message: EXCEPTION_MESSAGES.REASON_REQUIRED };
    if (!trimmed) return { ok: false, message: EXCEPTION_MESSAGES.DETAILS_REQUIRED };

    return { ok: true, details: trimmed };
}

/**
 * Texto de la observación (app.js 4018): `Excepción: <texto de la razón> - <detalle>`.
 *
 * @param {string} reasonText Texto visible de la opción elegida (no su valor).
 * @param {string} details Detalle ya recortado.
 */
export function buildExceptionObservation(reasonText, details) {
    return `Excepción: ${reasonText}${details ? ' - ' + details : ''}`;
}
