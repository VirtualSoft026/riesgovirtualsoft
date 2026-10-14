/**
 * Converts an Excel serial number into a JavaScript Date.
 *
 * @param {number|string} serial
 * @returns {Date|null}
 */
export function excelToJSDate(serial) {
    if (!serial || Number.isNaN(Number(serial))) {
        return null;
    }

    const epochUTC = Date.UTC(1899, 11, 30);

    return new Date(
        epochUTC + Number(serial) * 86400000
    );
}

/**
 * Interprets a schedule cell as a date: ISO/slash strings are parsed
 * directly and numeric values are treated as Excel serial numbers (UTC).
 *
 * @param {unknown} value
 * @returns {Date|null}
 */
export function parseExcelDate(value) {
    if (!value) {
        return null;
    }

    if (typeof value === 'string' && (value.includes('-') || value.includes('/'))) {
        const parsed = new Date(value);

        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (!Number.isNaN(Number(value))) {
        return new Date(Date.UTC(1899, 11, 30) + parseFloat(value) * 86400000);
    }

    return null;
}

/**
 * Reads the first sheet of a workbook as an array of rows (or objects when
 * `asObjects` is true). The SheetJS API is injected to keep this module
 * independent from browser globals. Returns null when the workbook has no
 * sheets.
 *
 * @param {{SheetNames?: string[], Sheets?: Record<string, unknown>}} workbook
 * @param {{utils: {sheet_to_json: Function}}} xlsx
 * @param {{asObjects?: boolean}} [options]
 * @returns {unknown[]|null}
 */
export function readFirstSheetRows(workbook, xlsx, options = {}) {
    if (!workbook || !Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
        return null;
    }

    const worksheet = workbook.Sheets && workbook.Sheets[workbook.SheetNames[0]];

    if (!worksheet) {
        return null;
    }

    const config = options.asObjects
        ? { defval: '' }
        : { header: 1, defval: '' };

    return xlsx.utils.sheet_to_json(worksheet, config);
}

/**
 * Returns true when the row matrix has at least `minimumRows` rows.
 *
 * @param {unknown} rows
 * @param {number} [minimumRows=3]
 * @returns {boolean}
 */
export function hasMinimumRows(rows, minimumRows = 3) {
    return Array.isArray(rows) && rows.length >= minimumRows;
}

/**
 * Safely reads a cell from a row matrix; returns `fallback` when the row or
 * column does not exist.
 *
 * @param {unknown[][]} rows
 * @param {number} rowIndex
 * @param {number} columnIndex
 * @param {unknown} [fallback='']
 * @returns {unknown}
 */
export function getCell(rows, rowIndex, columnIndex, fallback = '') {
    const row = Array.isArray(rows) ? rows[rowIndex] : undefined;

    if (!Array.isArray(row) || columnIndex < 0 || columnIndex >= row.length) {
        return fallback;
    }

    return row[columnIndex];
}

/**
 * Compares an Excel date with a JavaScript date.
 *
 * @param {Date|null} excelDate
 * @param {Date|null} jsDate
 * @returns {boolean}
 */
export function isSameDate(excelDate, jsDate) {
    if (!excelDate || !jsDate) {
        return false;
    }

    return (
        excelDate.getUTCDate() === jsDate.getDate() &&
        excelDate.getUTCMonth() === jsDate.getMonth() &&
        excelDate.getUTCFullYear() === jsDate.getFullYear()
    );
}
