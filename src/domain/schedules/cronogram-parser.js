import { namesMatch } from '../../utils/normalize.js';

const MONTH_NAMES = Object.freeze([
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
]);

const MONTHS_MAP = Object.freeze({
    ene: 0,
    enero: 0,
    feb: 1,
    febrero: 1,
    mar: 2,
    marzo: 2,
    abr: 3,
    abril: 3,
    may: 4,
    mayo: 4,
    jun: 5,
    junio: 5,
    jul: 6,
    julio: 6,
    ago: 7,
    agosto: 7,
    sep: 8,
    set: 8,
    septiembre: 8,
    oct: 9,
    octubre: 9,
    nov: 10,
    noviembre: 10,
    dic: 11,
    diciembre: 11
});

/**
 * Parses a weekly date range encoded in an Excel sheet name.
 *
 * @param {string} sheetName
 * @param {number} [year=2026]
 * @param {number} [fallbackMonth=0]
 * @returns {{start: Date, end: Date}|null}
 */
export function parseSheetRange(
    sheetName,
    year = 2026,
    fallbackMonth = 0
) {
    if (!sheetName) {
        return null;
    }

    const cleanName = String(sheetName)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim();

    let match = cleanName.match(
        /Semana\s+\d+\s*-\s*(\d+)\s+(?:de\s+)?(\w+)\s+(?:al|a|-)\s+(\d+)\s+(?:de\s+)?(\w+)/i
    );

    if (match) {
        const startDay = parseInt(match[1], 10);
        const startMonthKey = match[2]
            .substring(0, 3)
            .toLowerCase();

        const endDay = parseInt(match[3], 10);
        const endMonthKey = match[4]
            .substring(0, 3)
            .toLowerCase();

        const startMonth =
            MONTHS_MAP[startMonthKey] ?? fallbackMonth;

        const endMonth =
            MONTHS_MAP[endMonthKey] ?? fallbackMonth;

        return {
            start: new Date(year, startMonth, startDay, 0, 0, 0),
            end: new Date(year, endMonth, endDay, 23, 59, 59)
        };
    }

    match = cleanName.match(
        /Semana\s+\d+\s*-\s*(\d+)\s+(?:al|a|-)\s+(\d+)\s+(?:de\s+)?(\w+)/i
    );

    if (match) {
        const startDay = parseInt(match[1], 10);
        const endDay = parseInt(match[2], 10);
        const monthKey = match[3]
            .substring(0, 3)
            .toLowerCase();

        const month = MONTHS_MAP[monthKey] ?? fallbackMonth;

        return {
            start: new Date(year, month, startDay, 0, 0, 0),
            end: new Date(year, month, endDay, 23, 59, 59)
        };
    }

    match = cleanName.match(
        /Semana\s+\d+\s*-\s*(\d+)\s+al\s+(\d+)/i
    );

    if (match) {
        const startDay = parseInt(match[1], 10);
        const endDay = parseInt(match[2], 10);

        const startMonth = fallbackMonth;
        const endMonth =
            endDay < startDay
                ? startMonth + 1
                : startMonth;

        return {
            start: new Date(year, startMonth, startDay, 0, 0, 0),
            end: new Date(year, endMonth, endDay, 23, 59, 59)
        };
    }

    return null;
}

/**
 * Selects the sheet whose parsed range contains the target date.
 *
 * @param {string[]} sheetNames
 * @param {Date} targetDate
 * @returns {string|null}
 */
export function getWeekSheet(sheetNames, targetDate) {
    if (!Array.isArray(sheetNames) || sheetNames.length === 0) {
        return null;
    }

    const year = targetDate.getFullYear();
    const fallbackMonth = targetDate.getMonth();
    let hasDatedSheet = false;

    for (const sheetName of sheetNames) {
        const range = parseSheetRange(
            sheetName,
            year,
            fallbackMonth
        );

        if (!range) {
            continue;
        }

        hasDatedSheet = true;

        if (
            targetDate >= range.start &&
            targetDate <= range.end
        ) {
            return sheetName;
        }
    }

    if (!hasDatedSheet) {
        return (
            sheetNames.find((sheetName) =>
                sheetName.toLowerCase().includes('semana')
            ) || sheetNames[0]
        );
    }

    return null;
}

/**
 * Fetches and parses the cronogram workbook for a target date.
 *
 * The base URL, fetch implementation and XLSX parser are injected to keep
 * this service independent from browser globals and hardcoded paths.
 *
 * @param {Date} targetDate
 * @param {{
 *   baseUrl: string,
 *   fetchImpl: typeof fetch,
 *   xlsx: {
 *     read: Function,
 *     utils: {
 *       sheet_to_json: Function
 *     }
 *   },
 *   cacheBust?: boolean
 * }} dependencies
 * @returns {Promise<unknown[][]|null>}
 */
export async function fetchCronogramaRowsForDate(
    targetDate,
    dependencies
) {
    const {
        baseUrl,
        fetchImpl,
        xlsx,
        cacheBust = true
    } = dependencies || {};

    if (
        !baseUrl ||
        typeof fetchImpl !== 'function' ||
        !xlsx ||
        typeof xlsx.read !== 'function' ||
        !xlsx.utils ||
        typeof xlsx.utils.sheet_to_json !== 'function'
    ) {
        throw new TypeError(
            'baseUrl, fetchImpl and xlsx parser are required'
        );
    }

    const dayOfWeek = targetDate.getDay();
    const monday = new Date(targetDate);

    monday.setDate(
        targetDate.getDate() -
        (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    );

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const candidateMonths = [
        targetDate.getMonth(),
        monday.getMonth(),
        sunday.getMonth()
    ];

    const uniqueMonths = [...new Set(candidateMonths)];

    for (const monthIndex of uniqueMonths) {
        const monthName = MONTH_NAMES[monthIndex];
        const fileName = `Cronograma ${monthName}.xlsx`;
        const encodedPath = encodeURI(
            `${baseUrl.replace(/\/$/, '')}/${fileName}`
        );

        const url = cacheBust
            ? `${encodedPath}?t=${Date.now()}`
            : encodedPath;

        try {
            const response = await fetchImpl(url);

            if (!response.ok) {
                continue;
            }

            const arrayBuffer = await response.arrayBuffer();
            const workbook = xlsx.read(arrayBuffer, {
                type: 'array'
            });

            const sheetName = getWeekSheet(
                workbook.SheetNames,
                targetDate
            );

            if (sheetName) {
                return xlsx.utils.sheet_to_json(
                    workbook.Sheets[sheetName],
                    {
                        header: 1,
                        defval: ''
                    }
                );
            }
        } catch (error) {
            console.warn(
                `Error procesando ${fileName}:`,
                error
            );
        }
    }

    return null;
}

/**
 * Finds the task and manager columns for a target date.
 *
 * @param {Date} targetDate
 * @param {string} shiftText
 * @param {unknown[][]} rows
 * @returns {number[][]}
 */
export function getCronogramaColumnsForToday(
    targetDate,
    shiftText,
    rows = []
) {
    void shiftText;

    const day = targetDate.getDay();

    const columns = {
        manana: [],
        tarde: [],
        sabado: [],
        domingo: []
    };

    for (
        let rowIndex = 0;
        rowIndex < Math.min(5, rows.length);
        rowIndex += 1
    ) {
        const row = rows[rowIndex];

        if (!Array.isArray(row)) {
            continue;
        }

        for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
            const value = String(row[columnIndex] || '')
                .trim()
                .toLowerCase();

            if (
                value.includes('mañana') &&
                !value.includes('sabado') &&
                !value.includes('sábado') &&
                !value.includes('domingo') &&
                columns.manana.length === 0 &&
                columnIndex + 1 < row.length
            ) {
                columns.manana = [
                    columnIndex,
                    columnIndex + 1
                ];
            }

            if (
                value.includes('tarde') &&
                columns.tarde.length === 0 &&
                columnIndex + 1 < row.length
            ) {
                columns.tarde = [
                    columnIndex,
                    columnIndex + 1
                ];
            }

            if (
                (
                    value.includes('sábado') ||
                    value.includes('sabado')
                ) &&
                columns.sabado.length === 0 &&
                columnIndex + 1 < row.length
            ) {
                columns.sabado = [
                    columnIndex,
                    columnIndex + 1
                ];
            }

            if (
                value.includes('domingo') &&
                columns.domingo.length === 0 &&
                columnIndex + 1 < row.length
            ) {
                columns.domingo = [
                    columnIndex,
                    columnIndex + 1
                ];
            }
        }
    }

    if (columns.manana.length === 0) {
        columns.manana = [1, 2];
    }

    if (columns.tarde.length === 0) {
        columns.tarde = [4, 5];
    }

    if (columns.sabado.length === 0) {
        columns.sabado = [7, 8];
    }

    if (columns.domingo.length === 0) {
        columns.domingo = [10, 11];
    }

    if (day === 0) {
        return [columns.domingo];
    }

    if (day === 6) {
        return [columns.sabado];
    }

    return [columns.manana, columns.tarde];
}

/**
 * Preloads cronogram rows and invokes an injected callback when data arrives.
 *
 * @param {{
 *   targetDate?: Date,
 *   fetchDependencies: object,
 *   onLoaded?: (rows: unknown[][]) => void
 * }} options
 * @returns {Promise<unknown[][]|null>}
 */
export async function preloadCronograma(options) {
    const {
        targetDate = new Date(),
        fetchDependencies,
        onLoaded
    } = options || {};

    const rows = await fetchCronogramaRowsForDate(
        targetDate,
        fetchDependencies
    );

    if (rows && typeof onLoaded === 'function') {
        onLoaded(rows);
    }

    return rows;
}

/**
 * Returns tasks assigned to a manager from cronogram rows.
 *
 * @param {string} gestorName
 * @param {string} shiftText
 * @param {unknown[][]} rows
 * @param {Date} [targetDate=new Date()]
 * @returns {string[]}
 */
export function getAssignedTasksForGestor(
    gestorName,
    shiftText,
    rows,
    targetDate = new Date()
) {
    if (!Array.isArray(rows)) {
        return [];
    }

    const assignments = [];
    const columnGroups = getCronogramaColumnsForToday(
        targetDate,
        shiftText,
        rows
    );

    for (const [taskColumn, gestorColumn] of columnGroups) {
        for (const row of rows) {
            if (!Array.isArray(row)) {
                continue;
            }

            const taskValue = row[taskColumn];
            const gestorValue = row[gestorColumn];

            if (
                taskValue === undefined ||
                taskValue === null ||
                String(taskValue).trim() === ''
            ) {
                continue;
            }

            const taskText = String(taskValue).trim();
            const taskTextLower = taskText.toLowerCase();

            if (
                taskTextLower.startsWith('set ') ||
                taskTextLower.includes('cronograma') ||
                gestorValue === 'Gestor'
            ) {
                continue;
            }

            if (
                gestorValue !== undefined &&
                gestorValue !== null &&
                namesMatch(String(gestorValue).trim(), gestorName)
            ) {
                assignments.push(taskText);
            }
        }
    }

    return assignments;
}

/**
 * Loads manager assignments from a fetched cronogram.
 *
 * @param {string} gestorName
 * @param {string} gestorShift
 * @param {{
 *   targetDate?: Date,
 *   fetchDependencies: object
 * }} options
 * @returns {Promise<Array<{set: string, task: string}>>}
 */
export async function loadCronogramaAssignments(
    gestorName,
    gestorShift,
    options
) {
    const {
        targetDate = new Date(),
        fetchDependencies
    } = options || {};

    try {
        const rows = await fetchCronogramaRowsForDate(
            targetDate,
            fetchDependencies
        );

        if (!rows) {
            return [];
        }

        const columnGroups = getCronogramaColumnsForToday(
            targetDate,
            gestorShift,
            rows
        );

        const assignments = [];

        for (const [taskColumn, gestorColumn] of columnGroups) {
            let currentSet = '';

            for (const row of rows) {
                if (!Array.isArray(row)) {
                    continue;
                }

                const taskValue = row[taskColumn];
                const gestorValue = row[gestorColumn];

                if (
                    taskValue !== undefined &&
                    taskValue !== null &&
                    String(taskValue)
                        .trim()
                        .toLowerCase()
                        .startsWith('set ')
                ) {
                    currentSet = String(taskValue).trim();
                }

                if (
                    taskValue === undefined ||
                    taskValue === null ||
                    String(taskValue).trim() === ''
                ) {
                    continue;
                }

                const taskText = String(taskValue).trim();
                const taskTextLower = taskText.toLowerCase();

                if (
                    taskTextLower.startsWith('set ') ||
                    taskTextLower.includes('cronograma') ||
                    gestorValue === 'Gestor'
                ) {
                    continue;
                }

                if (
                    gestorValue !== undefined &&
                    gestorValue !== null &&
                    namesMatch(String(gestorValue).trim(), gestorName)
                ) {
                    assignments.push({
                        set: currentSet || 'Otros',
                        task: taskText
                    });
                }
            }
        }

        return assignments;
    } catch (error) {
        console.error(
            'Error al cargar Cronograma de Tareas:',
            error
        );

        return [];
    }
}
