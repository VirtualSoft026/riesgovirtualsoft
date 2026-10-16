/**
 * Controlador de «Control de Tiempos» (paso 3.4, W-28 y DE-4 = a). Sustituye a `loadTiemposMetrics()` y
 * `toggleTiemposCustomDates()` de js/tiempos.js.
 *
 * El agregado está en `domain/analytics/tiempos-report.js` y el render en `ui/views/tiempos-view.js`. Aquí quedan las
 * lecturas de Firebase, los filtros del DOM y el enlace de los controles (`onchange` en línea se sustituye por
 * `addEventListener`, W-54 (b)).
 */

import { buildTiemposReport } from '../domain/analytics/tiempos-report.js';

/** Evento que dispara la vista de navegación al abrir «Control de Tiempos» (lo emite app.js). */
export const TIEMPOS_REFRESH_EVENT = 'riskops:tiempos-refresh';

/** Ids de los controles de filtro (los mismos de index.html). */
export const TIEMPOS_IDS = Object.freeze({
    DATE_FILTER: 'tiemposDateFilter',
    DATE_START: 'tiemposDateStart',
    DATE_END: 'tiemposDateEnd',
    GESTOR_FILTER: 'tiemposGestorFilter',
    CUSTOM_CONTAINER: 'tiemposCustomDateContainer'
});

/**
 * @param {{
 *   doc: any,
 *   database: {ref: (path: string) => any},
 *   ensureSchedule: () => Promise<void>,                          carga el horario si aún no está
 *   getSchedule: () => {rows: unknown, blocks: unknown},
 *   getShift: (rows: unknown, blocks: unknown, gestorName: string, date: Date) => string,
 *   view: {renderTotals: Function, renderDashboard: Function},
 *   now?: () => Date,
 *   logger?: {error: Function}
 * }} deps
 */
export function createTiemposController({
    doc,
    database,
    ensureSchedule,
    getSchedule,
    getShift,
    view,
    now = () => new Date(),
    logger = console
}) {
    const el = (id) => doc.getElementById(id);

    /** Muestra el rango personalizado solo cuando el filtro es «custom». */
    function toggleCustomDates() {
        const container = el(TIEMPOS_IDS.CUSTOM_CONTAINER);
        container.style.display = el(TIEMPOS_IDS.DATE_FILTER).value === 'custom' ? 'flex' : 'none';
    }

    /** Llena el selector de gestores solo la primera vez (como el original) y conserva el valor elegido. */
    function populateGestores(gestores, gestorFilter) {
        const dropdown = el(TIEMPOS_IDS.GESTOR_FILTER);
        if (!dropdown || dropdown.options.length > 1) return;

        gestores.forEach((gestor) => {
            const option = doc.createElement('option');
            option.value = gestor;
            option.textContent = gestor;
            dropdown.appendChild(option);
        });

        dropdown.value = gestorFilter;
    }

    function readFilters() {
        const start = el(TIEMPOS_IDS.DATE_START);
        const end = el(TIEMPOS_IDS.DATE_END);

        return {
            dateFilter: el(TIEMPOS_IDS.DATE_FILTER).value,
            gestorFilter: el(TIEMPOS_IDS.GESTOR_FILTER).value,
            customStartStr: start ? start.value : null,
            customEndStr: end ? end.value : null
        };
    }

    /** Carga los reportes y pinta la vista. Si no hay reportes, no toca el DOM (como el original). */
    async function load() {
        try {
            if (!getSchedule().rows) {
                await ensureSchedule();
            }

            const [snapshot, permSnapshot] = await Promise.all([
                database.ref('shift_reports').once('value'),
                database.ref('permissions').once('value')
            ]);

            const data = snapshot.val();
            if (!data) return;

            const filters = readFilters();
            const report = buildTiemposReport({
                reports: data,
                permissions: permSnapshot.val() || {},
                schedule: getSchedule(),
                getShift,
                filters,
                now: now()
            });

            populateGestores(report.gestores, filters.gestorFilter);
            view.renderTotals(report.totals);
            view.renderDashboard(report.metrics);
        } catch (error) {
            logger.error('Error loading Tiempos metrics', error);
        }
    }

    /** Enlaza los filtros y el evento de refresco. Devuelve el desenlace. */
    function init() {
        const dateFilter = el(TIEMPOS_IDS.DATE_FILTER);
        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                toggleCustomDates();
                load();
            });
        }

        [TIEMPOS_IDS.DATE_START, TIEMPOS_IDS.DATE_END, TIEMPOS_IDS.GESTOR_FILTER].forEach((id) => {
            const control = el(id);
            if (control) control.addEventListener('change', () => load());
        });

        const onRefresh = () => load();
        doc.addEventListener(TIEMPOS_REFRESH_EVENT, onRefresh);

        return () => doc.removeEventListener(TIEMPOS_REFRESH_EVENT, onRefresh);
    }

    return { init, load, toggleCustomDates };
}
