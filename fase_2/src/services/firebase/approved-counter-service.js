/**
 * Contador atómico de retiros aprobados sobre Firebase (app.js 8688-8709): transacción de incremento y
 * listener en vivo de `metrics/approvedCount`. La base se INYECTA.
 *
 * Fidelidad: el incremento usa `transaction()` con callback (no devuelve la promesa, como el original); el
 * callback solo repinta si no hubo error y la transacción se confirmó. El parámetro `uid` no se usa (igual
 * que en `app.js`). `onCount(valor)` recibe el valor confirmado (en `app.js`, `updateApprovedCountUI`).
 *
 * ---- ESTADO: INACTIVO (DECISIÓN D6 del responsable, plan maestro §4 ter) ----
 * El contador es inoperante hoy (`database.rules.json` no define `metrics`: lectura y escritura denegadas por
 * omisión) y `incrementApprovedWithdrawal` no se invoca en ningún lado; sin embargo `app.js` SÍ registra el
 * listener de `metrics/approvedCount` en `DOMContentLoaded` (una suscripción que la base rechaza en cada carga).
 * Decisión: rediseñar más adelante y mantenerlo AISLADO. Con `enabled` distinto de `true` (predeterminado) el
 * servicio es NO-OP: `incrementApprovedWithdrawal` no abre `transaction` y `initAtomicApprovedCounterListener`
 * no registra `on('value')` ni llama a `database.ref`; devuelve `undefined`. `enabled` indica el modo.
 *
 * Para REACTIVARLO (tarea futura):
 *  1. Reglas PRIMERO: añadir el nodo `metrics` a `database.rules.json` (quién lee `metrics/approvedCount`, quién
 *     puede incrementarlo y un `.validate` numérico que impida fijar valores arbitrarios). Sin eso todo falla
 *     con PERMISSION_DENIED.
 *  2. Diseño: decidir quién llama a `incrementApprovedWithdrawal` (hoy nadie) y cómo convive con los KPIs que se
 *     calculan desde el historial (decisión D5: nada de contadores globales estáticos para KPIs).
 *  3. Pasar `enabled: true` explícito desde el flujo que lo use y actualizar `presence-and-counter.test.mjs` y el
 *     e2e de comunicados.
 * El comportamiento original sigue cubierto por las pruebas diferenciales con `enabled: true`.
 *
 * @param {{
 *   database: {ref: (path: string) => any}|null|undefined,
 *   onCount: (count: unknown) => void,
 *   enabled?: boolean    // D6: SOLO `true` lo activa; por defecto `false` (no-op)
 * }} deps
 */

import { APPROVED_COUNTER_ENABLED_BY_DEFAULT, APPROVED_COUNTER_PATH, nextApprovedCount } from '../../domain/analytics/approved-counter.js';

export function createApprovedCounterService({ database, onCount, enabled = APPROVED_COUNTER_ENABLED_BY_DEFAULT }) {
    const active = enabled === true;

    return {
        /** `true` solo si se pasó `enabled: true` explícito. */
        enabled: active,

        /** Suma `amount` (1 por omisión) de forma atómica. */
        incrementApprovedWithdrawal(uid, amount = 1) {
            if (!active) return; // D6: inactivo -> no-op (sin transacción)
            if (!database) return;

            const counterRef = database.ref(APPROVED_COUNTER_PATH);
            counterRef.transaction((currentValue) => {
                return nextApprovedCount(currentValue, amount);
            }, (error, committed, snapshot) => {
                if (!error && committed) {
                    onCount(snapshot.val());
                }
            });
        },

        /** Escucha el contador en vivo. Devuelve la función de cancelación (`undefined` si está inactivo). */
        initAtomicApprovedCounterListener() {
            if (!active) return undefined; // D6: inactivo -> no-op (sin listener)
            if (!database) return undefined;

            const ref = database.ref(APPROVED_COUNTER_PATH);
            const handler = (snapshot) => {
                if (snapshot.exists()) {
                    onCount(snapshot.val());
                }
            };

            ref.on('value', handler);

            return () => {
                if (typeof ref.off === 'function') ref.off('value', handler);
            };
        }
    };
}
