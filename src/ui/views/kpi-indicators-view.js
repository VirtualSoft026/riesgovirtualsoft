/**
 * Vistas puras del panel KPI: bitácora de turnos y configuración de anillos SVG.
 *
 * Extraído de `calcularIndicadores()` (app.js 5952-6000, 6350-6416). Sin DOM, sin
 * `window.*`, sin Firebase. Recibe datos y devuelve cadenas HTML o configuraciones.
 *
 * Decisiones (plan maestro §4):
 *  - D5: la fecha del turno que se muestra en la bitácora sigue usando `toLocaleDateString('es-CO')`
 *    sobre el `timestamp` (o `loginTime`), igual que el original. La corrección del día operativo
 *    local (`resolveOperativeDayKey`) aplica a la tabla Control Operativo; aquí es solo presentación.
 *  - La lógica de anillos refleja literalmente la de `animateRing` (app.js 6375-6409); el controlador
 *    es quien aplica las propiedades CSS al DOM.
 */

import { escapeHTML } from '../../utils/sanitization.js';
import { SESSION_STATUS } from '../../domain/analytics/active-session-status.js';

/** Circunferencia del anillo SVG usada en `animateRing` (app.js 6381). */
export const KPI_RING_CIRCUMFERENCE = 251.2;

// ─────────────────────────────────────── Anillos KPI ─────────────────────────────────────────

/**
 * Configuración visual de un anillo KPI a partir de su porcentaje (app.js 6392-6408).
 *
 * @param {number} percentage 0-100
 * @returns {{
 *   offset: number,
 *   level: 'success'|'warning'|'danger',
 *   badgeText: 'Óptimo'|'Aceptable'|'Crítico'
 * }}
 */
export function resolveRingConfig(percentage) {
    const offset = KPI_RING_CIRCUMFERENCE - (percentage / 100) * KPI_RING_CIRCUMFERENCE;

    if (percentage >= 90) {
        return { offset, level: 'success', badgeText: 'Óptimo' };
    }

    if (percentage >= 75) {
        return { offset, level: 'warning', badgeText: 'Aceptable' };
    }

    return { offset, level: 'danger', badgeText: 'Crítico' };
}

// ─────────────────────────────────────── Bitácora ────────────────────────────────────────────

/**
 * HTML completo de una tarjeta de bitácora de turno (app.js 5952-5998).
 *
 * Cada turno del `shiftReports` filtrado produce una tarjeta: encabezado con fecha y
 * gestor, horario de ingreso/salida, y desglose del timeline (Desayuno, Almuerzo, Inactividad)
 * o la bitácora legacy de texto plano si no hay `timeline`.
 *
 * @param {{
 *   timestamp?:  number|string|null,
 *   loginTime?:  number|string|null,
 *   horaInicio?: string|null,
 *   horaFin?:    string|null,
 *   gestor?:     string|null,
 *   status?:     string|null,
 *   timeline?:   Array<{type: string, start: number, end?: number|null}>|null,
 *   reporte?:    string|null,
 * }} report
 * @returns {string}
 */
export function buildBitacoraCardHtml(report) {
    const baseTs = report.timestamp || report.loginTime || Date.now();
    const shiftDateStr = new Date(baseTs).toLocaleDateString('es-CO');

    let html = '<div style="background: var(--bg-secondary); border: 1px solid var(--glass-border); border-radius: 12px; padding: 15px; margin-bottom: 15px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">';

    // ── Encabezado ──
    html += '<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--glass-border); padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">';
    html += `<div style="font-weight: 600; color: var(--accent-primary); font-size: 14px;"><i class='bx bx-calendar-event'></i> Turno del ${shiftDateStr}</div>`;
    html += `<div style="font-size: 12px; color: var(--text-primary); background: var(--glass-border); padding: 5px 12px; border-radius: 20px; font-weight: 500;"><i class='bx bx-user'></i> ${escapeHTML(report.gestor || 'Desconocido')}</div>`;
    html += '</div>';

    // ── Horario ──
    // W-52: horaInicio y horaFin vienen de `shift_reports` (los escribe el cliente del gestor) y se escapan; app.js
    // los insertaba crudos. Los textos de respaldo ("N/A", "En Curso") son marcado propio y no se escapan.
    const horaI = (report.horaInicio ? escapeHTML(report.horaInicio) : '')
        || (report.loginTime
            ? new Date(report.loginTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
            : 'N/A');
    const horaF = (report.horaFin ? escapeHTML(report.horaFin) : '')
        || (report.status === SESSION_STATUS.ONLINE
            ? "<span style='color:var(--success)'><i class='bx bx-radio-circle-marked bx-flashing'></i> En Curso</span>"
            : 'N/A');

    html += '<div style="display: flex; gap: 15px; font-size: 13px; color: var(--text-secondary); margin-bottom: 15px; flex-wrap: wrap;">';
    html += `<div style="background: var(--bg-primary); border: 1px solid var(--glass-border); padding: 8px 15px; border-radius: 8px;"><i class='bx bx-log-in-circle' style="color: var(--accent-primary);"></i> Ingreso: <span style="color: var(--text-primary); font-weight: 600;">${horaI}</span></div>`;
    html += `<div style="background: var(--bg-primary); border: 1px solid var(--glass-border); padding: 8px 15px; border-radius: 8px;"><i class='bx bx-log-out-circle' style="color: var(--warning);"></i> Salida: <span style="color: var(--text-primary); font-weight: 600;">${horaF}</span></div>`;
    html += '</div>';

    // ── Timeline ──
    html += '<div style="display: flex; flex-direction: column; gap: 10px;">';

    if (report.timeline && report.timeline.length > 0) {
        report.timeline.forEach(ev => {
            const s = new Date(ev.start).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            const eTime = ev.end
                ? new Date(ev.end).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                : "<span style='color:var(--warning)'>En Pausa</span>";

            const isDesayuno = ev.type === 'Desayuno';
            const isAlmuerzo = ev.type === 'Almuerzo';
            const icon = isDesayuno
                ? "<i class='bx bx-coffee'></i>"
                : (isAlmuerzo ? "<i class='bx bx-restaurant'></i>" : "<i class='bx bx-time-five'></i>");
            const color    = isDesayuno ? 'var(--warning)'     : (isAlmuerzo ? 'var(--success)'     : 'var(--danger)');
            const bgLight  = isDesayuno ? 'var(--warning-bg)'  : (isAlmuerzo ? 'var(--success-bg)'  : 'var(--danger-bg)');

            html += `<div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-primary); padding: 12px 16px; border-radius: 10px; border-left: 4px solid ${color}; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">`;
            html += `<div style="display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 13px; color: var(--text-primary);"><div style="background: ${bgLight}; color: ${color}; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px;">${icon}</div> ${escapeHTML(String(ev.type))}</div>`;
            html += `<div style="font-family: monospace; font-size: 12px; color: var(--text-primary); background: var(--bg-secondary); border: 1px solid var(--glass-border); padding: 5px 12px; border-radius: 8px; font-weight: 500;"><i class='bx bx-time' style="color: var(--text-secondary);"></i> ${s} - ${eTime}</div>`;
            html += '</div>';
        });
    } else if (report.reporte && report.reporte.includes('=== BITÁCORA DE TIEMPOS ===')) {
        // Bitácora legacy de texto plano (reportes anteriores a la versión con timeline)
        const parts = report.reporte.split('=== BITÁCORA DE TIEMPOS ===');

        if (parts.length > 1) {
            const rawBitacora = parts[1].trim();
            const lines = rawBitacora.split('\n').map(l => l.trim()).filter(Boolean);
            const uniqueLines = [...new Set(lines)];
            html += `<div style="font-family: monospace; font-size: 13px; color: var(--text-secondary); white-space: pre-wrap; background: var(--bg-primary); border: 1px solid var(--glass-border); padding: 15px; border-radius: 10px;">${escapeHTML(uniqueLines.join('\n'))}</div>`;
        }
    } else {
        html += '<div style="text-align: center; padding: 20px; color: var(--text-secondary); font-size: 13px; background: var(--bg-primary); border-radius: 10px; border: 1px dashed var(--glass-border);">'
            + "<i class='bx bx-info-circle' style=\"font-size: 18px; display: block; margin-bottom: 5px; opacity: 0.5;\"></i>"
            + ' No se registraron pausas en este turno</div>';
    }

    html += '</div></div>';
    return html;
}

/**
 * `innerHTML` del estado vacío del card de bitácora (app.js 6368-6370).
 *
 * @param {string} gestorLabel  Nombre del gestor o "Todos los Gestores".
 * @param {string} periodoText  Texto legible del periodo (ej. "Hoy", "Últimos 7 días").
 * @returns {string}
 */
export function buildBitacoraEmptyHtml(gestorLabel, periodoText) {
    return '<div style="text-align: center; padding: 20px; color: var(--text-secondary); font-size: 13px; background: var(--bg-primary); border-radius: 10px; border: 1px dashed var(--glass-border);">'
        + "<i class='bx bx-info-circle' style=\"font-size: 18px; display: block; margin-bottom: 5px; opacity: 0.5;\"></i>"
        + ` No se registran turnos cerrados ni pausas para <strong style="color: var(--text-primary);">${escapeHTML(gestorLabel)}</strong> en el periodo seleccionado (${periodoText}).</div>`;
}

/**
 * `innerHTML` del título del card de bitácora (app.js 6359-6361).
 *
 * @param {string} gestorLabel
 * @returns {string}
 */
export function buildBitacoraTitleHtml(gestorLabel) {
    return "<i class='bx bx-time-five' style=\"color: #8B5CF6; margin-right: 6px;\"></i>"
        + ` Desglose de Horarios - <span style="color: var(--accent-primary); font-weight: 700;">${escapeHTML(gestorLabel)}</span>`
        + " <span style=\"font-size: 13px; color: var(--text-secondary); font-weight: normal;\">(Desayuno, Almuerzo/Cena e Inactividad)</span>";
}
