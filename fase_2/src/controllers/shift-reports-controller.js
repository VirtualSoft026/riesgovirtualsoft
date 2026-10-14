/**
 * Controlador del historial de reportes de turno: carga, filtros, tabla, modal "Ver Todo" y exportación a PDF.
 *
 * Reemplaza, de `app.js`: `exportShiftReport()` (4451), `renderShiftReports()` (4582),
 * `applyShiftReportsFilters()` (4617) y `openShiftDetailModal()` (4730), junto con el estado global
 * `allShiftReports` (4580), que aquí vive dentro del controlador.
 *
 * Todo lo externo se INYECTA: `document`, el repositorio de `shift_reports`, el multiselect de gestores, el
 * resumen de tareas (`buildTaskReportSummaryText`, que en app.js depende del catálogo global de tareas), el
 * motor de PDF y los temporizadores. La lógica y el HTML viven en `domain/shifts/shift-report-view.js` y
 * `ui/views/shift-reports-view.js`.
 *
 * Nota de estructura: en app.js, `window.openShiftDetailModal` está asignada DENTRO de
 * `applyShiftReportsFilters()` (después del `forEach` de filas, por una llave mal colocada), así que solo
 * existe tras el primer filtrado con resultados. Aquí es un método más del controlador; los botones "Ver Todo"
 * solo se pintan cuando hay filas, por lo que el comportamiento visible es el mismo.
 */

import {
    filterShiftReports,
    buildShiftReportsEmptyMessage,
    buildShiftReportsFooterMessage,
    collectGestorOptions,
    buildShiftReportPdfFileName,
    buildPdfOptions
} from '../domain/shifts/shift-report-view.js';
import {
    buildShiftReportRowHtml,
    buildShiftDetailHtml,
    buildShiftReportPdfHtml,
    buildShiftReportsLoadingRowHtml,
    buildShiftReportsEmptyRowHtml,
    PDF_CONTAINER_STYLE
} from '../ui/views/shift-reports-view.js';

export const SHIFT_REPORTS_MESSAGES = Object.freeze({
    NOT_FOUND_DB: 'No se encontró el reporte en la base de datos.',
    NOT_FOUND_LOCAL: 'No se encontró la información del turno.',
    PDF_ENGINE_LOADING: 'Cargando motor de generación PDF, por favor intenta en unos segundos.',
    EXPORT_ERROR: 'Hubo un error al intentar exportar el reporte.'
});

/**
 * @param {{
 *   document: any,
 *   repository: {fetchAllShiftReports: () => Promise<object[]>, fetchShiftReportById: (id: string) => Promise<object|null>},
 *   setupCustomMultiSelect: (id: string, options: string[], onChange?: Function) => unknown,
 *   getSelectedMultiSelectValues: (id: string) => string[],
 *   summarizeTasks: (report: object) => string,
 *   getPdfWorker?: () => ({set: Function}|null),
 *   alert?: (message: string) => void,
 *   now?: () => number,
 *   setTimeout?: (fn: Function, ms: number) => unknown,
 *   logger?: {error: Function}
 * }} deps
 */
export function createShiftReportsController(deps) {
    const {
        document, repository, setupCustomMultiSelect, getSelectedMultiSelectValues, summarizeTasks,
        getPdfWorker = () => null, alert = () => {}, now = Date.now,
        setTimeout: schedule = (fn, ms) => setTimeout(fn, ms), logger = console
    } = deps;

    let allShiftReports = [];

    /** app.js 4451-4578 */
    async function exportShiftReport(fbId) {
        try {
            let reportObj = allShiftReports.find((r) => r.fb_id === fbId);

            if (!reportObj) {
                const fetched = await repository.fetchShiftReportById(fbId);
                if (fetched) reportObj = fetched;
            }

            if (!reportObj) return alert(SHIFT_REPORTS_MESSAGES.NOT_FOUND_DB);

            // El texto de tareas SIEMPRE sale de reportObj.tasks cuando existe (ver buildTaskReportSummaryText).
            const reportText = summarizeTasks(reportObj);

            const pdfContainer = document.createElement('div');
            pdfContainer.style = PDF_CONTAINER_STYLE;
            pdfContainer.innerHTML = buildShiftReportPdfHtml(reportObj, reportText, now());

            document.body.appendChild(pdfContainer);

            const opt = buildPdfOptions(buildShiftReportPdfFileName(reportObj));
            const worker = getPdfWorker();

            if (worker) {
                await worker.set(opt).from(pdfContainer).save();
            } else {
                alert(SHIFT_REPORTS_MESSAGES.PDF_ENGINE_LOADING);
            }

            document.body.removeChild(pdfContainer);
        } catch (e) {
            alert(SHIFT_REPORTS_MESSAGES.EXPORT_ERROR);
            logger.error(e);
        }
    }

    /** app.js 4617-4728 y 4835-4851 */
    function applyShiftReportsFilters() {
        const tbody = document.getElementById('shiftReportsTableBody');
        if (!tbody) return;

        const selectedGestores = getSelectedMultiSelectValues('turnosGestorMultiSelect');
        const fechaInput = document.getElementById('filterFechaInput');
        const fechaQuery = fechaInput ? fechaInput.value : '';

        const { rows, hasExplicitFilter } = filterShiftReports(allShiftReports, { selectedGestores, fechaQuery, now: now() });

        tbody.innerHTML = '';

        if (rows.length === 0) {
            tbody.innerHTML = buildShiftReportsEmptyRowHtml(buildShiftReportsEmptyMessage(hasExplicitFilter));
            return;
        }

        tbody.innerHTML = rows.map((r) => buildShiftReportRowHtml(r, summarizeTasks(r))).join('');

        const removeFooter = () => {
            const existing = document.getElementById('shiftReportsMostrandoMsg');
            if (existing) existing.remove();
        };

        if (!hasExplicitFilter) {
            schedule(() => {
                removeFooter();
                const msg = document.createElement('div');
                msg.id = 'shiftReportsMostrandoMsg';
                msg.style = 'text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 10px; font-style: italic;';
                msg.innerText = buildShiftReportsFooterMessage(rows.length);
                tbody.parentElement.parentElement.appendChild(msg);
            }, 50);
        } else {
            schedule(removeFooter, 50);
        }
    }

    /** app.js 4582-4615 */
    async function renderShiftReports() {
        const tbody = document.getElementById('shiftReportsTableBody');
        if (!tbody) return;

        // Si ya tenemos los reportes precargados, aplicamos filtros rápido
        if (allShiftReports.length > 0) {
            applyShiftReportsFilters();
        } else {
            tbody.innerHTML = buildShiftReportsLoadingRowHtml();
        }

        try {
            allShiftReports = await repository.fetchAllShiftReports();

            setupCustomMultiSelect('turnosGestorMultiSelect', collectGestorOptions(allShiftReports), () => {
                applyShiftReportsFilters();
            });
        } catch (e) {
            logger.error('Error cargando historial de turnos:', e);
        }

        applyShiftReportsFilters();
    }

    /** app.js 4730-4833 */
    function openShiftDetailModal(fbId) {
        const reportObj = allShiftReports.find((r) => r.fb_id === fbId);
        if (!reportObj) return alert(SHIFT_REPORTS_MESSAGES.NOT_FOUND_LOCAL);

        const body = document.getElementById('shiftDetailModalBody');
        const exportBtn = document.getElementById('exportPdfModalBtn');
        if (exportBtn) {
            exportBtn.onclick = function () { exportShiftReport(fbId); };
        }

        body.innerHTML = buildShiftDetailHtml(reportObj, summarizeTasks(reportObj));

        document.getElementById('shiftDetailModal').classList.add('active');
    }

    return {
        exportShiftReport,
        renderShiftReports,
        applyShiftReportsFilters,
        openShiftDetailModal,
        getLoadedReports: () => allShiftReports,
        // Solo pruebas / diagnóstico: reemplaza los reportes cargados sin ir a Firebase.
        setLoadedReports: (reports) => { allShiftReports = reports; }
    };
}
