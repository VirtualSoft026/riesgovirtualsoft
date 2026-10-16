/**
 * Búsqueda del turno del Gestor en el Excel de horarios, para el chequeo de «turno finalizado» al iniciar sesión
 * (paso 3.4, W-29, DE-3 = a). Es la misma lógica que `checkShiftExpirationOnLogin()` de login.js, separada en
 * funciones puras: la lectura del Excel (fetch y XLSX) queda en la capa de arranque, fuera de `src/domain`.
 *
 * Sin DOM, sin red, sin Firebase. El reloj entra por parámetro.
 */

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 86400000;

/**
 * Convierte una celda del Excel (serial numérico o texto con fecha) en `Date`, o `null` si no es fecha.
 *
 * @param {unknown} serial
 * @returns {Date|null}
 */
export function parseExcelDate(serial) {
    if (!serial) return null;

    if (typeof serial === 'string' && (serial.includes('-') || serial.includes('/'))) {
        const parsed = new Date(serial);

        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (!Number.isNaN(Number(serial))) {
        return new Date(EXCEL_EPOCH_UTC_MS + parseFloat(String(serial)) * DAY_MS);
    }

    return null;
}

/**
 * Normaliza un nombre para compararlo: minúsculas, sin acentos y sin espacios sobrantes.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeShiftName(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/**
 * Localiza el bloque de «hoy» en la hoja (una fila con fecha, seguida de una fila «Lunes» o «Martes») y devuelve
 * el turno del usuario en esa columna. Cadena vacía si no hay bloque para hoy o el usuario no aparece.
 *
 * @param {unknown[][]} rows filas de la primera hoja (`sheet_to_json` con `header: 1`)
 * @param {unknown} userName nombre del usuario (`users/{uid}.name`)
 * @param {Date} [now=new Date()]
 * @returns {string} turno tal como aparece en la hoja, p. ej. "08:00 - 17:00"
 */
export function findShiftStringForUser(rows, userName, now = new Date()) {
    if (!Array.isArray(rows) || rows.length < 3) return '';

    let blockStart = -1;
    let targetCol = -1;

    for (let rIdx = 0; rIdx < rows.length; rIdx += 1) {
        const testRow = rows[rIdx];
        if (!testRow || testRow.length < 2) continue;

        const firstDate = parseExcelDate(testRow[1]);
        if (!firstDate) continue;

        const nextRow = rows[rIdx + 1];
        if (!nextRow || (nextRow[1] !== 'Lunes' && nextRow[1] !== 'Martes')) continue;

        for (let c = 1; c < testRow.length; c += 1) {
            const cellDate = parseExcelDate(testRow[c]);

            if (cellDate
                && cellDate.getUTCDate() === now.getDate()
                && cellDate.getUTCMonth() === now.getMonth()
                && cellDate.getUTCFullYear() === now.getFullYear()) {
                blockStart = rIdx;
                targetCol = c;
                break;
            }
        }

        if (blockStart !== -1) break;
    }

    if (blockStart === -1 || targetCol === -1) return '';

    const wantedName = normalizeShiftName(userName);

    for (let rIdx = blockStart + 2; rIdx < rows.length; rIdx += 1) {
        const row = rows[rIdx];
        if (!row || !row[0] || String(row[0]).trim() === '' || String(row[0]).trim().toUpperCase() === 'GESTOR') break;

        if (normalizeShiftName(row[0]) === wantedName) {
            return String(row[targetCol] || '').trim();
        }
    }

    return '';
}
