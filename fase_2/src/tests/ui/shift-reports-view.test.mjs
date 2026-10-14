import { createRunner, assert } from '../test-harness.mjs';
import {
    HIGHLIGHT_STYLE,
    formatReportTextHtml,
    buildBitacoraDetailsHtml,
    buildShiftReportRowHtml,
    buildDetailBitacoraHtml,
    buildShiftDetailHtml,
    buildPdfBitacoraHtml,
    buildShiftReportPdfHtml,
    buildShiftReportsLoadingRowHtml,
    buildShiftReportsEmptyRowHtml,
    PDF_CONTAINER_STYLE
} from '../../ui/views/shift-reports-view.js';
import { extractBitacoraLines } from '../../domain/shifts/shift-report-view.js';
import { escapeHTML } from '../../utils/sanitization.js';

const { test, summarize } = createRunner('shift-reports-view (HTML de la tabla, el modal "Ver Todo" y el PDF del historial de turnos)');

const REPORT = {
    fb_id: "k'1", gestor: 'Ana <Pérez>', rol: 'Gestor', setTrabajado: 'SET "A"', horaInicio: '6/10/2026, 8:00:00 a. m.', horaFin: '6/10/2026, 5:00:00 p. m.',
    tiempoAlmuerzoMins: 30, tiempoDesayunoMins: 0, inactividadTotalMins: 12.5, timestamp: new Date(2026, 9, 6, 17).getTime(),
    reporte: 'Resumen\n=== BITÁCORA DE TIEMPOS ===\nAlmuerzo 12:00 - 12:30\nAlmuerzo 12:00 - 12:30\nInactividad <script>x</script>\n'
};
const TEXT = '\n[ FINALIZADA ] - Revisar alertas\nObservación: ok <b>\n';

// ---- Copias LITERALES de los resaltados de app.js 4491 (PDF), 4693 (tabla) y 4762 (modal)
const legacyPdf = (t) => escapeHTML(t).replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<span style="background: #E0E7FF; color: #3730A3; padding: 2px 6px; border-radius: 4px; font-weight: 600;">$1</span>');
const legacyTable = (t) => escapeHTML(t).replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<strong>[$1]</strong>');
const legacyModal = (t) => escapeHTML(t).replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<span style="background: rgba(139, 92, 246, 0.15); color: var(--accent-primary); padding: 2px 6px; border-radius: 4px; font-weight: 600;">$1</span>');

test('diferencial vs app.js: resaltado [ESTADO] de tabla, modal y PDF idéntico (incluye HTML malicioso escapado)', () => {
    for (const t of [TEXT, '', 'sin corchetes', '[A] y [B]\nlínea <img src=x onerror=alert(1)>', '[ [anidado] ]']) {
        assert.equal(formatReportTextHtml(t, HIGHLIGHT_STYLE.TABLE), legacyTable(t));
        assert.equal(formatReportTextHtml(t, HIGHLIGHT_STYLE.MODAL), legacyModal(t));
        assert.equal(formatReportTextHtml(t, HIGHLIGHT_STYLE.PDF), legacyPdf(t));
    }
});

/** Copia LITERAL de app.js 4653-4691 (desplegable de bitácora de la fila). */
function legacyRowBitacora(r) {
    let bitacoraHTML = '';
    const rawReporte = r.reporte || '';
    if (rawReporte.includes('=== BITÁCORA DE TIEMPOS ===')) {
        const parts = rawReporte.split('=== BITÁCORA DE TIEMPOS ===');
        const rawBitacora = (parts[1] || '').trim();
        if (rawBitacora) {
            // Filtrar y desduplicar líneas de la bitácora textual
            const lines = rawBitacora.split('\n').map(l => l.trim()).filter(Boolean);
            const uniqueLines = [];
            lines.forEach(line => {
                if (!uniqueLines.includes(line)) {
                    uniqueLines.push(line);
                }
            });
            const bitacoraContent = uniqueLines.map(l => escapeHTML(l)).join('<br>');
            bitacoraHTML = `
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
    }
    return bitacoraHTML;
}

test('diferencial vs app.js: desplegable de bitácora de la fila idéntico, con y sin bitácora', () => {
    for (const reporte of [REPORT.reporte, 'sin bitácora', undefined, '=== BITÁCORA DE TIEMPOS ===\n', '=== BITÁCORA DE TIEMPOS ===\n  a  \n\n a \nb']) {
        assert.equal(buildBitacoraDetailsHtml(reporte), legacyRowBitacora({ reporte }));
    }
});

test('diferencial vs app.js: bitácora del modal (app.js 4756-4764) y del PDF (4478-4484) idénticas', () => {
    for (const reporte of [REPORT.reporte, 'sin bitácora', undefined]) {
        const lines = extractBitacoraLines(reporte);
        const legacyModalBit = lines.length > 0
            ? lines.map(l => `<div style="padding: 4px 8px; background: rgba(0,0,0,0.2); border-radius: 4px; font-family: monospace; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;"><i class='bx bx-time-five' style="color: var(--accent-primary);"></i> ${escapeHTML(l)}</div>`).join('')
            : '<div style="color: var(--text-secondary); font-size: 12px; font-style: italic;">No se registraron pausas o inactividades en este turno.</div>';
        assert.equal(buildDetailBitacoraHtml(lines), legacyModalBit);
        const legacyPdfBit = lines.length > 0
            ? lines.map(l => `<div style="padding: 6px 10px; background: #F1F5F9; border-radius: 4px; font-family: monospace; font-size: 11px; color: #334155; margin-bottom: 4px; border-left: 3px solid #3B82F6;">${escapeHTML(l)}</div>`).join('')
            : '<div style="color: #64748B; font-size: 12px; font-style: italic;">No se registraron pausas o inactividades en este turno.</div>';
        assert.equal(buildPdfBitacoraHtml(lines), legacyPdfBit);
    }
});

test('fila de la tabla: escapa gestor/set/horas, codifica el id del botón y conserva los textos del original', () => {
    const html = buildShiftReportRowHtml(REPORT, TEXT);
    assert.ok(html.includes('Ana &lt;Pérez&gt;'));
    assert.ok(html.includes('SET &quot;A&quot;'));
    assert.ok(html.includes("openShiftDetailModal(decodeURIComponent('k%271'))"));
    assert.ok(html.includes("exportShiftReport(decodeURIComponent('k%271'))"));
    assert.ok(html.includes('Ver Todo') && html.includes('PDF'));
    assert.ok(html.includes('<strong>[ FINALIZADA ]</strong>'));
    assert.ok(html.includes('Ver Bitácora de Tiempos'));
    assert.ok(!html.includes('<script>'), 'el script de la bitácora debe ir escapado');
    assert.equal((html.match(/Almuerzo 12:00 - 12:30/g) || []).length, 1, 'la línea repetida de la bitácora se muestra una vez');
});

test('modal "Ver Todo": tiempos como en el correo (N/A cuando faltan), rol por defecto Gestor y bitácora', () => {
    const html = buildShiftDetailHtml(REPORT, TEXT);
    assert.ok(html.includes('30 minutos') && html.includes('0 minutos') && html.includes('12.5 minutos'));
    assert.ok(html.includes('Rol: Gestor'));
    const sparse = buildShiftDetailHtml({ gestor: 'Luis' }, '');
    assert.ok(sparse.includes('Rol: Gestor'));
    assert.equal((sparse.match(/>[^<]*N\/A<\/strong>/g) || []).length >= 5, true, 'horas, set y tiempos en N/A');
    assert.ok(sparse.includes('No se registraron pausas o inactividades en este turno.'));
});

test('PDF: fecha de generación con formato es-CO, cabecera RISK MANAGER y el mismo escape que la tabla', () => {
    const now = new Date(2026, 9, 6, 10).getTime();
    const html = buildShiftReportPdfHtml(REPORT, TEXT, now);
    assert.ok(html.includes(new Date(now).toLocaleDateString('es-CO')));
    assert.ok(html.includes('RISK MANAGER') && html.includes('Detalle de Turno y Control Operativo'));
    assert.ok(html.includes('Ana &lt;Pérez&gt;'));
    assert.ok(!html.includes('${'), 'sin marcadores de plantilla sin resolver');
    assert.ok(PDF_CONTAINER_STYLE.startsWith('width: 750px;'));
});

test('filas auxiliares del historial: cargando y vacío (con escape del mensaje)', () => {
    assert.ok(buildShiftReportsLoadingRowHtml().includes('Cargando historial de turnos...'));
    assert.equal(buildShiftReportsEmptyRowHtml('a<b'), '<tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-secondary);">a&lt;b</td></tr>');
});

summarize();
