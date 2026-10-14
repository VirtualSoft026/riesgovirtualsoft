/**
 * Contador operacional de retiros aprobados (app.js 8688-8721): reglas puras. La transacción y el listener
 * viven en `services/firebase/approved-counter-service.js`; el pintado en `ui/views/approved-count-view.js`.
 * NO modifica `withdrawal-metrics.js` (que tiene `calculateEffectiveApprovalTime`).
 *
 * Aviso: `database.rules.json` NO define el nodo `metrics`, así que la base lo deniega por omisión; tanto la
 * transacción como el listener de `metrics/approvedCount` fallan hoy con PERMISSION_DENIED (ver informe).
 *
 * ESTADO: INACTIVO por DECISIÓN D6 (plan maestro §4 ter): "rediseñar y mantener inactivo; aislado para que no
 * abra conexiones ni consuma cuota". `APPROVED_COUNTER_ENABLED_BY_DEFAULT = false` es el valor que usa
 * `services/firebase/approved-counter-service.js` cuando no se le pasa `enabled: true`. Requisitos para
 * reactivarlo (reglas `metrics` primero, diseño de quién incrementa): ver el encabezado de ese servicio.
 */

/** D6: el contador de retiros aprobados queda INACTIVO por defecto (no-op; sin transacciones ni listeners). */
export const APPROVED_COUNTER_ENABLED_BY_DEFAULT = false;

export const APPROVED_COUNTER_PATH = 'metrics/approvedCount';

/**
 * Función de actualización de la transacción: suma `amount` al valor actual (`null`/ausente cuenta 0).
 * Firebase la llama primero con `null` (suposición local) y la repite con el valor real del servidor.
 *
 * @param {number|null|undefined} currentValue
 * @param {number} [amount]
 * @returns {number}
 */
export function nextApprovedCount(currentValue, amount = 1) {
    return (currentValue || 0) + amount;
}
