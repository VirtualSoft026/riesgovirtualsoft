/**
 * Pintado del contador "Retiros Aprobados" (app.js 8711-8720, `updateApprovedCountUI`). Presentación pura
 * con el elemento y el temporizador INYECTADOS.
 *
 * D6: es presentación pura (no toca Firebase). Solo la alimenta el contador atómico, que está INACTIVO por
 * defecto (`approved-counter-service.js`, `enabled: false`); mientras siga así nada la invoca con valores en vivo.
 *
 * Regla: con el panel filtrado por gestor (`isFilteredByGestor`) NO se pisa el valor filtrado con las
 * actualizaciones globales en vivo.
 *
 * @param {{
 *   count: unknown,
 *   isFiltered: boolean,
 *   element: {textContent: unknown, style: {transform: string}}|null|undefined,
 *   schedule?: (fn: Function, ms: number) => unknown
 * }} args
 * @returns {boolean} true si se pintó
 */
export function renderApprovedCount({ count, isFiltered, element, schedule = (fn, ms) => setTimeout(fn, ms) }) {
    if (isFiltered) return false; // Prevent overwriting filtered value with global realtime updates

    if (element) {
        element.textContent = count || 0;
        element.style.transform = 'scale(1.25)';
        schedule(() => { element.style.transform = 'scale(1)'; }, 300);
        return true;
    }

    return false;
}
