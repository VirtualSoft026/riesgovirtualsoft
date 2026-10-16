/**
 * Lógica pura de `loadTeletrabajo()` (app.js 1768-1892) y `renderTeletrabajoBlock()` (anidada,
 * 1850-1887): detección de bloques en la hoja de Teletrabajo, lista de gestores y HTML de la tabla.
 * Los efectos (fetch, DOM, selector múltiple) quedan en `controllers/task-loaders-controller.js`.
 */

import { escapeHTML as defaultEscapeHTML } from '../../utils/sanitization.js';
import { normalizeName as defaultNormalizeName, namesMatch as defaultNamesMatch } from '../../utils/normalize.js';

/** Ruta del Excel de teletrabajo (app.js 1769). */
export const TELEWORK_EXCEL_PATH = 'Teletrabajo/Teletrabajo.xlsx';

export const TELEWORK_LOAD_ERROR_ROW_HTML =
    '<tr><td colspan="3" style="padding: 20px; color: var(--danger); text-align: center;">No se pudo cargar Teletrabajo.xlsx o no existe.</td></tr>';

/**
 * URL del Excel con parámetro anti-caché (la ruta no se codifica, como en el original).
 *
 * @param {number} nowMs
 * @returns {string}
 */
export function buildTeleworkExcelUrl(nowMs) {
    return TELEWORK_EXCEL_PATH + '?v=' + nowMs;
}

/**
 * Detecta los bloques: cualquier celda que contenga "semana", "teletrabajo" o empiece con fecha `d/m`
 * abre un bloque; sus filas son los pares gestor/día debajo, hasta una celda vacía (app.js 1778-1807).
 *
 * @param {unknown[][]} rows
 * @returns {Array<{label: string, startRow: number, colIndex: number, data: Array<{gestor: string, dia: string}>}>}
 */
export function findTeleworkBlocks(rows) {
    const allBlocks = [];

    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
            // Bloque mejorado: busca etiquetas claras de calendario
            const cellVal = String(rows[r][c]).trim();
            const lowCell = cellVal.toLowerCase();

            if (lowCell.includes('semana') || lowCell.includes('teletrabajo') || /^\d{1,2}\/\d{1,2}/.test(cellVal)) {
                const block = {
                    label: cellVal,
                    startRow: r,
                    colIndex: c,
                    data: []
                };

                // Buscamos filas debajo de este título que tengan nombres
                for (let i = r + 1; i < rows.length; i++) {
                    const gestor = rows[i] ? rows[i][c] : null;
                    const dia = rows[i] ? rows[i][c + 1] : null;

                    if (!gestor || String(gestor).trim() === '') break;
                    if (String(gestor).trim().toUpperCase() === 'GESTOR') continue;

                    block.data.push({
                        gestor: String(gestor).trim(),
                        dia: String(dia || '').trim()
                    });
                }

                if (block.data.length > 0) allBlocks.push(block);
            }
        }
    }

    return allBlocks;
}

/**
 * Lista única y ordenada de gestores de todos los bloques (app.js 1814-1821).
 *
 * @param {Array<{data: Array<{gestor: string}>}>} blocks
 * @returns {string[]}
 */
export function listTeleworkGestores(blocks) {
    const allTeleGestores = new Set();

    blocks.forEach((b) => {
        b.data.forEach((r) => {
            if (r.gestor) allTeleGestores.add(String(r.gestor).trim());
        });
    });

    return Array.from(allTeleGestores).sort((a, b) => a.localeCompare(b));
}

/**
 * Opciones del selector de semana (app.js 1831-1833).
 *
 * @param {Array<{label: string}>} blocks
 * @param {(value: unknown) => string} [escape]
 * @returns {string}
 */
export function buildTeleworkWeekOptionsHTML(blocks, escape = defaultEscapeHTML) {
    let html = '';

    blocks.forEach((block, idx) => {
        html += `<option value="${escape(String(idx))}">${escape(block.label)}</option>`;
    });

    return html;
}

/** Encabezado de la tabla (app.js 1852-1858). */
export const TELEWORK_TABLE_HEAD_HTML = `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <th style="padding: 12px; color: var(--accent-primary); text-align: left; position: sticky; left: 0; background: var(--bg-panel); z-index: 2;">GESTOR <i class='bx bx-refresh' style='cursor:pointer; margin-left:5px;' data-action="load-teletrabajo" title='Refrescar Teletrabajo'></i></th>
                        <th style="padding: 12px; color: var(--accent-primary); text-align: center;">DÍA</th>
                        <th style="padding: 12px; color: var(--accent-primary); text-align: center;">MODALIDAD</th>
                    </tr>
                `;

/**
 * Filas del cuerpo de la tabla para un bloque (app.js 1860-1886).
 *
 * @param {{
 *   block: {data: Array<{gestor: string, dia: string}>},
 *   selectedList: string[],
 *   currentUser: {name?: string, role?: string}|null,
 *   escape?: (value: unknown) => string,
 *   normalizeName?: Function,
 *   namesMatch?: Function
 * }} input
 * @returns {string}
 */
export function buildTeleworkRowsHTML(input) {
    const {
        block, selectedList, currentUser,
        escape = defaultEscapeHTML, normalizeName = defaultNormalizeName, namesMatch = defaultNamesMatch
    } = input;
    let html = '';

    block.data.forEach((row) => {
        if (selectedList.length > 0 && !selectedList.some((sel) => normalizeName(row.gestor) === normalizeName(sel))) {
            return;
        }

        const isCurrentUser = (currentUser && namesMatch(row.gestor, currentUser.name));

        if (currentUser && currentUser.role === 'Gestor' && !isCurrentUser) return;

        const bgClass = isCurrentUser ? 'rgba(59,130,246,0.1)' : 'transparent';

        const isTeletrabajo = row.dia && row.dia.toLowerCase() !== 'nan';
        const estadoHtml = isTeletrabajo ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">HOME OFFICE</span>` : `<span class="badge pending">PRESENCIAL</span>`;

        html += `
                        <tr class="hover-highlight" style="border-bottom: 1px solid var(--glass-border); background: ${bgClass};">
                            <td style="padding: 12px; font-weight: 600; text-align: left; color: ${isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)'}; position: sticky; left: 0; background: ${isCurrentUser ? 'var(--bg-dark)' : 'var(--bg-panel)'}; z-index: 1;">${escape(row.gestor)}</td>
                            <td style="padding: 12px; text-align: center;">${isTeletrabajo ? escape(row.dia) : '-'}</td>
                            <td style="padding: 12px; text-align: center;">${estadoHtml}</td>
                        </tr>
                    `;
    });

    return html;
}
