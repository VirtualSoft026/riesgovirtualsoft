/**
 * HTML del historial de reportes de turno: fila de la tabla, cuerpo del modal "Ver Todo" y documento del PDF.
 *
 * Las plantillas son COPIA LITERAL de `app.js` (exportShiftReport 4490-4550, applyShiftReportsFilters 4702-4727,
 * openShiftDetailModal 4766-4825); lo único que cambia es que los valores que antes se calculaban en línea ahora
 * llegan por parámetro. Todo texto de usuario pasa por `escapeHTML` como en el original.
 */

import { escapeHTML, encodeInlineHandlerArg } from '../../utils/sanitization.js';
import { extractBitacoraLines } from '../../domain/shifts/shift-report-view.js';

/** Estilo del resaltado `[ESTADO]` del resumen de tareas en cada superficie. */
export const HIGHLIGHT_STYLE = Object.freeze({
    TABLE: 'table',
    MODAL: 'modal',
    PDF: 'pdf'
});

/**
 * Texto del resumen de tareas listo para HTML: escapa, convierte saltos de línea en <br> y resalta cada
 * `[ESTADO]` (app.js 4491 PDF, 4693 tabla, 4762 modal).
 *
 * @param {string} reportText
 * @param {'table'|'modal'|'pdf'} style
 * @returns {string}
 */
export function formatReportTextHtml(reportText, style) {
    const escaped = escapeHTML(reportText).replace(/\n/g, '<br>');

    if (style === HIGHLIGHT_STYLE.TABLE) {
        return escaped.replace(/\[(.*?)\]/g, '<strong>[$1]</strong>');
    }

    if (style === HIGHLIGHT_STYLE.MODAL) {
        return escaped.replace(/\[(.*?)\]/g, '<span style="background: rgba(139, 92, 246, 0.15); color: var(--accent-primary); padding: 2px 6px; border-radius: 4px; font-weight: 600;">$1</span>');
    }

    return escaped.replace(/\[(.*?)\]/g, '<span style="background: #E0E7FF; color: #3730A3; padding: 2px 6px; border-radius: 4px; font-weight: 600;">$1</span>');
}

/** Fila de "cargando" del historial (app.js 4590). */
export function buildShiftReportsLoadingRowHtml() {
    return `<tr><td colspan="6" style="padding: 30px; text-align: center; color: var(--accent-primary);"><i class='bx bx-loader-alt bx-spin' style='font-size: 24px;'></i><br><span style='font-size:12px; margin-top:5px; display:inline-block;'>Cargando historial de turnos...</span></td></tr>`;
}

/** Fila de "sin resultados" del historial (app.js 4662). */
export function buildShiftReportsEmptyRowHtml(emptyMsg) {
    return `<tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-secondary);">${escapeHTML(emptyMsg)}</td></tr>`;
}

/** Desplegable "Ver Bitácora de Tiempos" de una fila (app.js 4653-4691); '' si el reporte no trae bitácora. */
export function buildBitacoraDetailsHtml(rawReporte) {
    const uniqueLines = extractBitacoraLines(rawReporte);

    if (uniqueLines.length === 0) return '';

    const bitacoraContent = uniqueLines.map((l) => escapeHTML(l)).join('<br>');

    return `
                    <details style="margin-top: 8px; border-top: 1px dashed var(--glass-border); padding-top: 6px;">
                        <summary style="cursor: pointer; color: var(--accent-primary); font-weight: 600; font-size: 11px; outline: none; list-style: none; display: flex; align-items: center; gap: 4px;">
                            <i class='bx bx-chevron-down'></i> Ver Bitácora de Tiempos
                        </summary>
                        <div style="font-size: 11px; margin-top: 5px; color: var(--text-secondary); line-height: 1.5; background: rgba(0,0,0,0.15); padding: 6px; border-radius: 4px;">
                            ${bitacoraContent}
                        </div>
                    </details>
                `;
}

/**
 * Fila <tr> del historial (app.js 4702-4727).
 *
 * @param {object} r reporte con `fb_id`
 * @param {string} reportText resumen de tareas ya resuelto (`buildTaskReportSummaryText(r)`)
 * @returns {string}
 */
export function buildShiftReportRowHtml(r, reportText) {
    const safeReport = formatReportTextHtml(reportText, HIGHLIGHT_STYLE.TABLE) + buildBitacoraDetailsHtml(r.reporte);

    return `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-weight: 500;">
                    ${escapeHTML(r.gestor)}
                    <div style="font-size: 11px; color: var(--text-secondary);">${escapeHTML(r.rol)}</div>
                </td>
                <td style="padding: 12px; color: var(--accent-primary);">${escapeHTML(r.setTrabajado)}</td>
                <td style="padding: 12px; font-size: 13px;">${escapeHTML(r.horaInicio)}</td>
                <td style="padding: 12px; font-size: 13px;">${escapeHTML(r.horaFin)}</td>
                <td style="padding: 12px; font-size: 12px; color: var(--text-secondary); max-width: 350px; text-align: left;">
                    <div style="max-height: 120px; overflow-y: auto; background: var(--bg-dark); padding: 8px; border-radius: 6px;">
                        ${safeReport}
                    </div>
                </td>
                <td style="padding: 12px; text-align: center; white-space: nowrap;">
                    <div style="display: flex; gap: 6px; justify-content: center;">
                        <button class="btn btn-primary" style="padding: 5px 10px; font-size: 12px;" onclick="openShiftDetailModal(decodeURIComponent('${encodeInlineHandlerArg(r.fb_id)}'))" title="Ver todo el informe igual al correo">
                            <i class='bx bx-show'></i> Ver Todo
                        </button>
                        <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" onclick="exportShiftReport(decodeURIComponent('${encodeInlineHandlerArg(r.fb_id)}'))" title="Exportar PDF">
                            <i class='bx bx-file-blank'></i> PDF
                        </button>
                    </div>
                </td>
            </tr>
        `;
}

/** Bitácora del modal "Ver Todo" (app.js 4756-4764). */
export function buildDetailBitacoraHtml(bitacoraLines) {
    if (bitacoraLines.length > 0) {
        return bitacoraLines.map((l) => `<div style="padding: 4px 8px; background: rgba(0,0,0,0.2); border-radius: 4px; font-family: monospace; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;"><i class='bx bx-time-five' style="color: var(--accent-primary);"></i> ${escapeHTML(l)}</div>`).join('');
    }

    return '<div style="color: var(--text-secondary); font-size: 12px; font-style: italic;">No se registraron pausas o inactividades en este turno.</div>';
}

/**
 * Cuerpo del modal "Ver Todo" (app.js 4766-4825).
 *
 * @param {object} reportObj
 * @param {string} reportText resumen de tareas ya resuelto
 * @returns {string}
 */
export function buildShiftDetailHtml(reportObj, reportText) {
    const bitacoraHtml = buildDetailBitacoraHtml(extractBitacoraLines(reportObj.reporte));
    const formattedReportText = formatReportTextHtml(reportText, HIGHLIGHT_STYLE.MODAL);

    return `
        <div style="display: flex; flex-direction: column; gap: 15px;">
            <!-- Encabezado Gestor y Rol -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 14px 18px; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); display: block;">Gestor</span>
                    <strong style="font-size: 18px; color: var(--text-primary); margin-top: 2px; display: block;">${escapeHTML(reportObj.gestor)}</strong>
                    <span style="font-size: 12px; color: var(--accent-primary); font-weight: 500;">Rol: ${escapeHTML(reportObj.rol || 'Gestor')}</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); display: block;">SET Principal Trabajado</span>
                    <strong style="font-size: 15px; color: var(--success); margin-top: 2px; display: block;"><i class='bx bx-layer'></i> ${escapeHTML(reportObj.setTrabajado || 'N/A')}</strong>
                </div>
            </div>

            <!-- Tiempos de Turno e Indicadores (Igual al correo) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 10px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Hora Inicio Turno</small>
                    <strong style="font-size: 13px; color: var(--text-primary); margin-top: 4px; display: block;"><i class='bx bx-log-in-circle' style="color: var(--accent-primary);"></i> ${escapeHTML(reportObj.horaInicio || 'N/A')}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 10px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Hora Fin Turno</small>
                    <strong style="font-size: 13px; color: var(--text-primary); margin-top: 4px; display: block;"><i class='bx bx-log-out-circle' style="color: var(--warning);"></i> ${escapeHTML(reportObj.horaFin || 'N/A')}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 10px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Tiempo Almuerzo Descontado</small>
                    <strong style="font-size: 13px; color: var(--success); margin-top: 4px; display: block;"><i class='bx bx-restaurant'></i> ${escapeHTML(reportObj.tiempoAlmuerzoMins != null ? reportObj.tiempoAlmuerzoMins + ' minutos' : 'N/A')}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 10px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Tiempo Desayuno Descontado</small>
                    <strong style="font-size: 13px; color: var(--warning); margin-top: 4px; display: block;"><i class='bx bx-coffee'></i> ${escapeHTML(reportObj.tiempoDesayunoMins != null ? reportObj.tiempoDesayunoMins + ' minutos' : 'N/A')}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 10px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Inactividad / Exceso Pausas</small>
                    <strong style="font-size: 13px; color: var(--danger); margin-top: 4px; display: block;"><i class='bx bx-stopwatch'></i> ${escapeHTML(reportObj.inactividadTotalMins != null ? reportObj.inactividadTotalMins + ' minutos' : 'N/A')}</strong>
                </div>
            </div>

            <!-- Bitácora de Tiempos -->
            <div style="background: rgba(0,0,0,0.15); padding: 14px; border-radius: 10px; border: 1px solid var(--glass-border);">
                <h4 style="font-size: 13px; color: var(--accent-primary); margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px;">
                    <i class='bx bx-list-ul'></i> Bitácora de Tiempos
                </h4>
                <div style="max-height: 180px; overflow-y: auto; padding-right: 5px;">
                    ${bitacoraHtml}
                </div>
            </div>

            <!-- Resumen de Tareas y Observaciones -->
            <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: 10px; border: 1px solid var(--glass-border);">
                <h4 style="font-size: 13px; color: var(--accent-primary); margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px;">
                    <i class='bx bx-task'></i> Resumen de Tareas y Observaciones
                </h4>
                <div style="font-size: 13px; color: var(--text-primary); line-height: 1.6; white-space: pre-wrap; word-break: break-word; font-family: inherit;">
                    ${formattedReportText}
                </div>
            </div>
        </div>
    `;
}

/** Bitácora del PDF (app.js 4478-4484). */
export function buildPdfBitacoraHtml(bitacoraLines) {
    if (bitacoraLines.length > 0) {
        return bitacoraLines.map((l) => `<div style="padding: 6px 10px; background: #F1F5F9; border-radius: 4px; font-family: monospace; font-size: 11px; color: #334155; margin-bottom: 4px; border-left: 3px solid #3B82F6;">${escapeHTML(l)}</div>`).join('');
    }

    return '<div style="color: #64748B; font-size: 12px; font-style: italic;">No se registraron pausas o inactividades en este turno.</div>';
}

/**
 * Documento HTML del PDF (app.js 4490-4550).
 *
 * @param {object} reportObj
 * @param {string} reportText resumen de tareas ya resuelto
 * @param {Date|number} now fecha de generación (se muestra con el formato local `es-CO`)
 * @returns {string}
 */
export function buildShiftReportPdfHtml(reportObj, reportText, now) {
    const bitacoraHtml = buildPdfBitacoraHtml(extractBitacoraLines(reportObj.reporte));
    const formattedReportText = formatReportTextHtml(reportText, HIGHLIGHT_STYLE.PDF);
    const generatedOn = new Date(now).toLocaleDateString('es-CO');

    return `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3B82F6; padding-bottom: 12px; margin-bottom: 20px;">
                <div>
                    <h1 style="margin: 0; font-size: 22px; color: #1E293B; font-weight: 700;">RISK MANAGER</h1>
                    <span style="font-size: 12px; color: #64748B;">Detalle de Turno y Control Operativo</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 11px; color: #64748B; display: block;">Fecha de Generación</span>
                    <strong style="font-size: 12px; color: #0F172A;">${generatedOn}</strong>
                </div>
            </div>

            <!-- Encabezado Gestor y Rol -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; padding: 16px; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 15px;">
                <div>
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748B; display: block;">GESTOR</span>
                    <strong style="font-size: 18px; color: #0F172A; margin-top: 2px; display: block;">${escapeHTML(reportObj.gestor)}</strong>
                    <span style="font-size: 12px; color: #2563EB; font-weight: 600;">Rol: ${escapeHTML(reportObj.rol || 'Gestor')}</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748B; display: block;">SET PRINCIPAL TRABAJADO</span>
                    <strong style="font-size: 15px; color: #059669; margin-top: 2px; display: block;">${escapeHTML(reportObj.setTrabajado || 'N/A')}</strong>
                </div>
            </div>

            <!-- Tiempos e Indicadores -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;">
                <div style="background: #F8FAFC; padding: 10px 12px; border-radius: 6px; border: 1px solid #E2E8F0;">
                    <small style="color: #64748B; display: block; font-size: 10px;">Hora Inicio Turno</small>
                    <strong style="font-size: 12px; color: #0F172A; margin-top: 2px; display: block;">${escapeHTML(reportObj.horaInicio || 'N/A')}</strong>
                </div>
                <div style="background: #F8FAFC; padding: 10px 12px; border-radius: 6px; border: 1px solid #E2E8F0;">
                    <small style="color: #64748B; display: block; font-size: 10px;">Hora Fin Turno</small>
                    <strong style="font-size: 12px; color: #0F172A; margin-top: 2px; display: block;">${escapeHTML(reportObj.horaFin || 'N/A')}</strong>
                </div>
                <div style="background: #F8FAFC; padding: 10px 12px; border-radius: 6px; border: 1px solid #E2E8F0;">
                    <small style="color: #64748B; display: block; font-size: 10px;">Almuerzo Descontado</small>
                    <strong style="font-size: 12px; color: #059669; margin-top: 2px; display: block;">${escapeHTML(reportObj.tiempoAlmuerzoMins != null ? reportObj.tiempoAlmuerzoMins + ' minutos' : 'N/A')}</strong>
                </div>
                <div style="background: #F8FAFC; padding: 10px 12px; border-radius: 6px; border: 1px solid #E2E8F0;">
                    <small style="color: #64748B; display: block; font-size: 10px;">Desayuno Descontado</small>
                    <strong style="font-size: 12px; color: #D97706; margin-top: 2px; display: block;">${escapeHTML(reportObj.tiempoDesayunoMins != null ? reportObj.tiempoDesayunoMins + ' minutos' : 'N/A')}</strong>
                </div>
                <div style="background: #F8FAFC; padding: 10px 12px; border-radius: 6px; border: 1px solid #E2E8F0; grid-column: span 2;">
                    <small style="color: #64748B; display: block; font-size: 10px;">Inactividad / Exceso Pausas</small>
                    <strong style="font-size: 12px; color: #DC2626; margin-top: 2px; display: block;">${escapeHTML(reportObj.inactividadTotalMins != null ? reportObj.inactividadTotalMins + ' minutos' : 'N/A')}</strong>
                </div>
            </div>

            <!-- Bitácora de Tiempos -->
            <div style="background: #F8FAFC; padding: 12px 14px; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 15px;">
                <h4 style="font-size: 12px; color: #2563EB; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Bitácora de Tiempos</h4>
                <div>${bitacoraHtml}</div>
            </div>

            <!-- Resumen de Tareas -->
            <div style="background: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0;">
                <h4 style="font-size: 12px; color: #2563EB; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Resumen de Tareas y Observaciones</h4>
                <div style="font-size: 12px; color: #1E293B; line-height: 1.6; white-space: pre-wrap; word-break: break-word;">${formattedReportText}</div>
            </div>
        `;
}

/** Estilo del contenedor temporal del PDF (app.js 4489). */
export const PDF_CONTAINER_STYLE = "width: 750px; padding: 25px; background: #FFFFFF; font-family: 'Inter', sans-serif; color: #0F172A;";
