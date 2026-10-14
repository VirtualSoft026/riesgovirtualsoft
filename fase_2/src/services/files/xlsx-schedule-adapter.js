/**
 * Adapter de E/S para el libro de horarios (.xlsx) de los Gestores.
 *
 * Extrae la parte de red + parseo de Excel de `checkShiftExpirationOnLogin()` (login.js 17-135).
 * La parte de cálculo (¿venció el turno?) la cubre:
 *   fase_2/src/domain/auth/shift-expiration.js#evaluateShiftExpiration()
 *
 * Estructura esperada del libro de horarios:
 *   - Fila 1 (encabezado): primera celda = etiqueta de nombre; resto = fechas del período
 *                          (una por columna).
 *   - Filas 2+: primera celda = nombre del Gestor; resto = turno asignado por fecha
 *               (p. ej. "8am - 4pm", "Descansa", "Por Asignar") o vacío.
 *
 * Dependencias inyectables — ninguna importación en tiempo de módulo:
 *   - `fetchFn`  — implementación de Fetch API (por defecto `globalThis.fetch`).
 *   - `XLSX`     — librería SheetJS (por defecto `globalThis.XLSX`).
 *
 * Sin DOM · Sin Firebase · Sin localStorage.
 */

// ------------------------------------------------------------------------------------------------
// Utilidades internas
// ------------------------------------------------------------------------------------------------

/**
 * Normaliza un nombre para comparación insensible a tildes, mayúsculas y espacios sobrantes.
 * Replica la normalización aplicada en checkShiftExpirationOnLogin() (login.js):
 *   toLowerCase + NFD + elimina marcas de combinación (diacríticos) + trim.
 *
 * Ejemplos: "José Pérez" → "jose perez",  "MARÍA LÓPEZ" → "maria lopez".
 *
 * @param {unknown} value
 * @returns {string}
 */
function normalizeName(value) {
    return String(value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // elimina: á→a, é→e, í→i, ó→o, ú→u, ñ→n, etc.
        .trim();
}

/**
 * Comprueba si el valor de una celda de encabezado corresponde a la fecha (year, month, day).
 *
 * SheetJS con { raw: false } formatea las celdas de fecha como strings; el formato exacto
 * depende del archivo y de la locale del runtime. Se intentan en orden:
 *   1. Parseo nativo con `new Date(s)` — cubre ISO 8601 y "M/D/YYYY" en V8.
 *   2. Parseo manual de "A/B/YYYY" o "A-B-YYYY" interpretando A/B como D/M ó M/D.
 *
 * @param {unknown} cellValue
 * @param {number} year
 * @param {number} month — 1-indexed
 * @param {number} day
 * @returns {boolean}
 */
function matchesTargetDate(cellValue, year, month, day) {
    if (cellValue === null || cellValue === undefined || cellValue === '') return false;

    const s = String(cellValue).trim();
    if (!s) return false;

    // Intento 1: parseo nativo (cubre ISO 8601 y formatos M/D/YYYY de V8)
    const native = new Date(s);
    if (!isNaN(native.getTime())) {
        if (
            native.getFullYear() === year &&
            native.getMonth() + 1  === month &&
            native.getDate()       === day
        ) {
            return true;
        }
    }

    // Intento 2: parseo manual de formatos "A/B/C" o "A-B-C"
    const parts = s.split(/[\/-]/);
    if (parts.length === 3) {
        const nums = parts.map(Number);
        if (nums.every((n) => !isNaN(n))) {
            const [a, b, c] = nums;
            const y = c > 99 ? c : 2000 + c;
            if (y === year) {
                if (a === day   && b === month) return true; // D/M/YYYY
                if (a === month && b === day)   return true; // M/D/YYYY
            }
        }
    }

    return false;
}

// ------------------------------------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------------------------------------

/**
 * @typedef {Object} ScheduleWorkbook
 * @property {Array<Array<string>>} rows
 *   Matriz 2D de celdas como strings. Fila 0 = encabezados; filas 1+ = datos por Gestor.
 */

// ------------------------------------------------------------------------------------------------
// API pública
// ------------------------------------------------------------------------------------------------

/**
 * Descarga el libro de horarios desde `url` y lo convierte a una matriz 2D de strings.
 *
 * @param {string} url — URL del archivo .xlsx (p. ej. `"Horario/Horario 2026.xlsx"`).
 * @param {{ fetchFn?: typeof globalThis.fetch, XLSX?: object }} [deps]
 * @returns {Promise<ScheduleWorkbook>}
 * @throws {Error} si la descarga falla (HTTP ≠ 2xx) o si el archivo no es parseable.
 */
export async function fetchScheduleWorkbook(url, { fetchFn = globalThis.fetch, XLSX = globalThis.XLSX } = {}) {
    const response = await fetchFn(url);

    if (!response.ok) {
        throw new Error(
            `[xlsx-schedule-adapter] HTTP ${response.status} al descargar el horario: ${url}`
        );
    }

    const buffer   = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
        throw new Error('[xlsx-schedule-adapter] El archivo de horario no contiene hojas.');
    }

    const sheet = workbook.Sheets[firstSheetName];

    // raw: false  → SheetJS formatea fechas y números como strings (más portable entre archivos).
    // defval: ''  → celdas vacías devuelven '' en lugar de undefined.
    const rows = /** @type {Array<Array<string>>} */ (
        XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })
    );

    return { rows };
}

/**
 * Busca en la matriz de filas del libro de horarios el turno de `gestorName` para `date`.
 *
 * Replica la lógica de búsqueda de checkShiftExpirationOnLogin() (login.js 17-135):
 *   1. Localiza la columna cuyo encabezado coincide con la fecha indicada.
 *   2. Localiza la fila cuya primera columna (nombre) coincide con `gestorName`
 *      tras normalizar (lowercase + sin tildes + trim).
 *   3. Devuelve el valor de celda en esa intersección, o `null` si no se encontró
 *      la columna o la fila.
 *
 * Función pura — sin I/O, sin efectos secundarios.
 *
 * @param {ScheduleWorkbook} workbook — Resultado de `fetchScheduleWorkbook()`.
 * @param {string} gestorName — Nombre del Gestor tal como aparece en su perfil de Firebase.
 * @param {Date} [date=new Date()] — Fecha para la que se busca el turno.
 * @returns {string|null} String de turno (p. ej. `"8am - 4pm"`, `"Descansa"`) o `null`.
 */
export function findGestorShiftForDate(workbook, gestorName, date = new Date()) {
    const rows = workbook && workbook.rows;
    if (!Array.isArray(rows) || rows.length < 2) return null;

    const headerRow = rows[0];
    if (!Array.isArray(headerRow)) return null;

    const targetYear  = date.getFullYear();
    const targetMonth = date.getMonth() + 1; // 1-indexed
    const targetDay   = date.getDate();

    // 1. Columna para la fecha indicada
    const colIndex = headerRow.findIndex((cell) =>
        matchesTargetDate(cell, targetYear, targetMonth, targetDay)
    );
    if (colIndex === -1) return null;

    // 2. Fila del Gestor (búsqueda por nombre normalizado en la primera columna)
    const normalizedTarget = normalizeName(gestorName);
    const dataRow = rows.slice(1).find(
        (row) => Array.isArray(row) && normalizeName(row[0]) === normalizedTarget
    );
    if (!dataRow) return null;

    // 3. Turno en la intersección fila × columna
    const shift = String(dataRow[colIndex] ?? '').trim();
    return shift || null;
}
