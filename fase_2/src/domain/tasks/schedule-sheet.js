/**
 * Lógica pura de `loadSchedule()` (app.js 1548-1766), `formatExcelDate()` (anidada en loadSchedule,
 * 1558-1578) y `renderScheduleBlock()` (anidada, 1664-1764): detección de bloques semanales en la hoja del
 * horario, bloque por defecto, lista de gestores, y el HTML de encabezado y filas.
 *
 * Los efectos (fetch, DOM, `currentUser.shift`, sincronización, recarga de tareas) quedan en
 * `controllers/task-loaders-controller.js`. Las funciones de nombres se inyectan para que app.js pueda
 * pasar sus propios globales (ver HALLAZGO en `buildScheduleRowsHTML`).
 */

import { excelToJSDate, isSameDate } from '../../utils/excel.js';
import { escapeHTML as defaultEscapeHTML } from '../../utils/sanitization.js';
import { normalizeName as defaultNormalizeName, namesMatch as defaultNamesMatch } from '../../utils/normalize.js';

/** Ruta del Excel del horario (app.js 1550). */
export const SCHEDULE_EXCEL_PATH = 'Horario/Horario 2026.xlsx';

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * URL del Excel del horario con parámetro anti-caché.
 *
 * @param {number} nowMs
 * @returns {string}
 */
export function buildScheduleExcelUrl(nowMs) {
    return encodeURI(SCHEDULE_EXCEL_PATH) + '?t=' + nowMs;
}

/**
 * Convierte la celda de fecha de la hoja ("2026-06-08", "8/6/2026" o serial de Excel) en "8 Jun".
 * Devuelve "" si no es una fecha (app.js 1558-1578).
 *
 * @param {unknown} serial
 * @returns {string}
 */
export function formatExcelDate(serial) {
    if (!serial) return '';

    // Si ya es un string que parece fecha (ej: "2026-06-08" o "2026-06-08T00:00...")
    if (typeof serial === 'string' && (serial.includes('-') || serial.includes('/'))) {
        const d = new Date(serial);

        if (!isNaN(d.getTime())) {
            return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
        }
    }

    // Si es un número (serial de Excel)
    if (!isNaN(serial)) {
        const epochUTC = Date.UTC(1899, 11, 30);
        const d = new Date(epochUTC + parseFloat(serial) * 86400000);

        return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
    }

    return '';
}

/**
 * Detecta los bloques semanales: una fila con fecha en la columna 1 seguida de una fila cuya columna 1 es
 * "Lunes" o "Martes" (app.js 1580-1604). Cada bloque: `{startRow, label: "Semana del X al Y"}`.
 *
 * @param {unknown[][]|null} rows
 * @returns {Array<{startRow: number, label: string}>}
 */
export function findScheduleBlocks(rows) {
    const allScheduleBlocks = [];

    if (rows && rows.length > 2) {
        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
            const testRow = rows[rIdx];

            if (!testRow || testRow.length < 2) continue;

            if (formatExcelDate(testRow[1]) !== '') {
                const nextR = rows[rIdx + 1];

                if (nextR && nextR.length > 1 && (nextR[1] === 'Lunes' || nextR[1] === 'Martes')) {
                    // Encontramos un bloque, vamos a ver la fecha inicial y final
                    const firstDate = formatExcelDate(testRow[1]);
                    let lastDate = firstDate;

                    for (let c = 1; c < testRow.length; c++) {
                        if (formatExcelDate(testRow[c])) lastDate = formatExcelDate(testRow[c]);
                    }

                    allScheduleBlocks.push({
                        startRow: rIdx,
                        label: `Semana del ${firstDate} al ${lastDate}`
                    });
                    rIdx++; // Saltar la fila de días
                }
            }
        }
    }

    return allScheduleBlocks;
}

/**
 * Fila de inicio del bloque que contiene a `today`; si ninguno la contiene, la del último bloque
 * (app.js 1618-1647). Requiere al menos un bloque.
 *
 * @param {unknown[][]} rows
 * @param {Array<{startRow: number}>} blocks
 * @param {Date} today
 * @returns {number}
 */
export function findDefaultScheduleBlockRow(rows, blocks, today) {
    let defaultBlockRow = null;

    for (const block of blocks) {
        const dateRow = rows[block.startRow];

        for (let c = 1; c < dateRow.length; c++) {
            const serial = dateRow[c];

            if (serial) {
                let cellDate = null;

                if (!isNaN(serial)) {
                    cellDate = excelToJSDate(serial);
                } else if (typeof serial === 'string' && (serial.includes('-') || serial.includes('/'))) {
                    const parsed = new Date(serial);

                    if (!isNaN(parsed.getTime())) {
                        cellDate = parsed;
                    }
                }

                if (cellDate && isSameDate(cellDate, today)) {
                    defaultBlockRow = block.startRow;
                    break;
                }
            }
        }

        if (defaultBlockRow !== null) break;
    }

    if (defaultBlockRow === null) {
        defaultBlockRow = blocks[blocks.length - 1].startRow;
    }

    return defaultBlockRow;
}

/**
 * ¿Esta fila de la hoja termina la lista de gestores del bloque? (fila vacía o repetición del título
 * "GESTOR": app.js 1654, 1688).
 *
 * @param {unknown[]|undefined} row
 * @returns {boolean}
 */
function isEndOfGestorList(row) {
    return !row || !row[0] || String(row[0]).trim() === '' || String(row[0]).trim().toUpperCase() === 'GESTOR';
}

/**
 * Lista única y ordenada de gestores de todos los bloques (app.js 1650-1660).
 *
 * @param {unknown[][]} rows
 * @param {Array<{startRow: number}>} blocks
 * @returns {string[]}
 */
export function listScheduleGestores(rows, blocks) {
    const allGestoresSet = new Set();

    blocks.forEach((block) => {
        for (let rIdx = block.startRow + 2; rIdx < rows.length; rIdx++) {
            const row = rows[rIdx];

            if (isEndOfGestorList(row)) break;

            allGestoresSet.add(String(row[0]).trim());
        }
    });

    return Array.from(allGestoresSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Opciones del selector de semana (app.js 1670-1673).
 *
 * @param {Array<{startRow: number, label: string}>} blocks
 * @param {(value: unknown) => string} [escape]
 * @returns {string}
 */
export function buildWeekSelectorOptionsHTML(blocks, escape = defaultEscapeHTML) {
    let html = '';

    blocks.forEach((block) => {
        html += `<option value="${escape(String(block.startRow))}">${escape(block.label)}</option>`;
    });

    return html;
}

/**
 * Número de columnas de día del bloque: la última con fecha; 7 si no hay ninguna (app.js 1669-1673).
 *
 * @param {unknown[]} dateRow
 * @returns {number}
 */
export function resolveScheduleColumnCount(dateRow) {
    let numCols = 0;

    for (let i = 1; i < dateRow.length; i++) {
        if (formatExcelDate(dateRow[i])) numCols = i;
    }

    if (numCols === 0) numCols = 7; // fallback

    return numCols;
}

/**
 * Encabezado de la tabla del horario (app.js 1675-1686).
 *
 * @param {unknown[]} dateRow
 * @param {unknown[]} dayRow
 * @param {number} numCols
 * @param {(value: unknown) => string} [escape]
 * @returns {string}
 */
export function buildScheduleHeadHTML(dateRow, dayRow, numCols, escape = defaultEscapeHTML) {
    let headHTML = '<tr style="border-bottom: 1px solid var(--glass-border);">';
    headHTML += `<th style="padding: 12px; color: var(--accent-primary); text-align: left; position: sticky; left: 0; background: var(--bg-panel); z-index: 2;">GESTOR <i class='bx bx-refresh' style='cursor:pointer; margin-left:5px;' onclick='loadSchedule()' title='Refrescar Horario'></i></th>`;

    for (let i = 1; i <= numCols; i++) {
        const dayName = dayRow[i] || `Día ${i}`;
        const dateParsed = formatExcelDate(dateRow[i]);
        const subText = dateParsed ? `<br><span style="font-size: 11px; font-weight: normal; color: var(--text-secondary);">${dateParsed}</span>` : '';
        headHTML += `<th style="padding: 12px; color: var(--accent-primary); text-align: center;">${escape(String(dayName))}${subText}</th>`;
    }

    headHTML += '</tr>';

    return headHTML;
}

/**
 * Clase visual del turno de una celda (app.js 1710-1717).
 *
 * @param {unknown} shift
 * @param {(name: unknown) => string} [normalizeName]
 * @returns {string}
 */
export function getScheduleBadgeClass(shift, normalizeName = defaultNormalizeName) {
    let badgeClass = 'pending';
    const sLower = normalizeName(shift);

    if (/\d\s*(am|pm)/i.test(shift)) badgeClass = 'in-progress';
    else if (sLower.includes('vacacion')) badgeClass = 'vacaciones-badge';
    else if (sLower.includes('descansa')) badgeClass = 'descanso-badge';
    else if (sLower.includes('familia')) badgeClass = 'familia-badge';
    else if (sLower.includes('incapacidad')) badgeClass = 'incapacidad-badge';
    else if (sLower.includes('disponible') || sLower.includes('dosponible')) badgeClass = 'disponible-badge';

    return badgeClass;
}

/**
 * Filas del cuerpo de la tabla del horario para un bloque (app.js 1688-1763).
 *
 * Devuelve el HTML y, aparte, los turnos de HOY de las filas que corresponden al usuario actual. Para
 * conservar el comportamiento del original ante datos corruptos (una fila posterior lanza a mitad del
 * bucle, p. ej. celda numérica), acepta `onCurrentUserShift` (el efecto se dispara en el mismo punto del
 * bucle donde lo hacía app.js) y `sink` (objeto cuyo `html` va quedando con las filas ya construidas).
 *
 * HALLAZGO: con el `normalizeName` de app.js una celda NUMÉRICA de turno (p. ej. `8`) lanza
 * `TypeError: name.normalize is not a function` y `loadSchedule()` lo atrapa dejando la tabla a medias;
 * el de `utils/normalize.js` convierte a texto y no falla. Por eso `normalizeName` se inyecta: en el
 * laboratorio se pasa el de app.js para conservar el comportamiento exacto.
 *
 * @param {{
 *   rows: unknown[][],
 *   blockStartRow: number,
 *   numCols: number,
 *   selectedList: string[],
 *   currentUser: {name?: string, role?: string}|null,
 *   getShiftForToday: (gestorName: string) => string,
 *   escape?: (value: unknown) => string,
 *   normalizeName?: Function,
 *   namesMatch?: Function,
 *   onCurrentUserShift?: (badgeShift: string) => void,
 *   sink?: {html: string}
 * }} input
 * @returns {{html: string, currentUserShifts: string[]}}
 */
export function buildScheduleRowsHTML(input) {
    const {
        rows, blockStartRow, numCols, selectedList, currentUser, getShiftForToday,
        escape = defaultEscapeHTML, normalizeName = defaultNormalizeName, namesMatch = defaultNamesMatch,
        onCurrentUserShift, sink
    } = input;
    let html = '';
    const currentUserShifts = [];

    for (let rowIndex = blockStartRow + 2; rowIndex < rows.length; rowIndex++) {
        const r = rows[rowIndex];

        if (isEndOfGestorList(r)) break;

        const gestorName = String(r[0]).trim();

        if (selectedList.length > 0 && !selectedList.some((sel) => normalizeName(gestorName) === normalizeName(sel))) {
            continue;
        }

        const isCurrentUser = (currentUser && namesMatch(gestorName, currentUser.name));

        if (currentUser && currentUser.role === 'Gestor' && !isCurrentUser) continue;

        const bgClass = isCurrentUser ? 'rgba(59,130,246,0.1)' : 'transparent';

        let trHTML = `<tr class="hover-highlight" style="border-bottom: 1px solid var(--glass-border); background: ${bgClass};">`;
        trHTML += `<td style="padding: 12px; font-weight: 600; text-align: left; color: ${isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)'}; position: sticky; left: 0; background: ${isCurrentUser ? 'var(--bg-dark)' : 'var(--bg-panel)'}; z-index: 1;">${escape(gestorName)}</td>`;

        // Encontrar el turno para mostrar en el badge principal (corresponde a hoy)
        const badgeShift = getShiftForToday(gestorName);

        for (let i = 1; i <= numCols; i++) {
            const shift = r[i] || 'Descansa';
            const badgeClass = getScheduleBadgeClass(shift, normalizeName);

            trHTML += `<td style="padding: 12px; text-align: center; white-space: nowrap;"><span class="badge ${badgeClass}">${escape(String(shift))}</span></td>`;
        }

        if (isCurrentUser && badgeShift) {
            currentUserShifts.push(badgeShift);
            if (onCurrentUserShift) onCurrentUserShift(badgeShift); // en el original el efecto ocurre aquí, dentro del bucle
        }

        trHTML += '</tr>';
        html += trHTML;
        if (sink) sink.html = html; // progreso visible aunque una fila posterior lance (como `tableBody.innerHTML +=`)
    }

    return { html, currentUserShifts };
}
