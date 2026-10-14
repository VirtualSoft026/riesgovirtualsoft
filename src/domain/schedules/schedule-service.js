import { normalizeName, namesMatch } from '../../utils/normalize.js';

/**
 * Counts managers assigned to a shift.
 *
 * @param {string} shiftName
 * @param {unknown[][]} rows
 * @param {Array<{startRow: number}>} scheduleBlocks
 * @param {(shift: string) => string} getShiftCategory
 * @param {Date} [targetDate=new Date()]
 * @returns {number}
 */
export function getScheduledGestoresCountForShift(
    shiftName,
    rows,
    scheduleBlocks,
    getShiftCategory,
    targetDate = new Date()
) {
    if (
        !Array.isArray(rows) ||
        !Array.isArray(scheduleBlocks) ||
        scheduleBlocks.length === 0 ||
        typeof getShiftCategory !== 'function'
    ) {
        return 0;
    }

    let targetBlock = null;
    let targetColumnIndex = -1;

    for (const block of scheduleBlocks) {
        const dateRow = rows[block.startRow];

        if (!Array.isArray(dateRow)) {
            continue;
        }

        for (
            let columnIndex = 1;
            columnIndex < dateRow.length;
            columnIndex += 1
        ) {
            const cellValue = dateRow[columnIndex];

            if (
                cellValue &&
                !Number.isNaN(Number(cellValue))
            ) {
                const cellDate = new Date(
                    Date.UTC(
                        1899,
                        11,
                        30
                    ) + Number(cellValue) * 86400000
                );

                if (
                    cellDate.getUTCDate() === targetDate.getDate() &&
                    cellDate.getUTCMonth() === targetDate.getMonth() &&
                    cellDate.getUTCFullYear() === targetDate.getFullYear()
                ) {
                    targetBlock = block;
                    targetColumnIndex = columnIndex;
                    break;
                }
            }
        }

        if (targetBlock) {
            break;
        }
    }

    if (!targetBlock) {
        targetBlock = scheduleBlocks[scheduleBlocks.length - 1];

        const dayRow = rows[targetBlock.startRow + 1];
        const dayNames = [
            'Domingo',
            'Lunes',
            'Martes',
            'Miércoles',
            'Jueves',
            'Viernes',
            'Sábado'
        ];

        const targetDayName =
            dayNames[targetDate.getDay()];

        if (Array.isArray(dayRow)) {
            for (
                let columnIndex = 1;
                columnIndex < dayRow.length;
                columnIndex += 1
            ) {
                if (
                    normalizeName(dayRow[columnIndex]) ===
                    normalizeName(targetDayName)
                ) {
                    targetColumnIndex = columnIndex;
                    break;
                }
            }
        }

        if (targetColumnIndex === -1) {
            targetColumnIndex =
                targetDate.getDay() === 0
                    ? 7
                    : targetDate.getDay();
        }
    }

    let count = 0;
    const startRow = targetBlock.startRow;

    for (
        let rowIndex = startRow + 2;
        rowIndex < rows.length;
        rowIndex += 1
    ) {
        const row = rows[rowIndex];

        if (
            !Array.isArray(row) ||
            !row[0] ||
            String(row[0]).trim() === '' ||
            String(row[0]).trim().toUpperCase() === 'GESTOR'
        ) {
            break;
        }

        const rawShift = row[targetColumnIndex] || 'Descansa';

        if (getShiftCategory(rawShift) === shiftName) {
            count += 1;
        }
    }

    return count;
}

/**
 * Resolves a manager shift for a date.
 *
 * @param {unknown[][]} rows
 * @param {Array<{startRow: number}>} scheduleBlocks
 * @param {string} gestorName
 * @param {Date} date
 * @returns {string}
 */
export function getShiftForDate(
    rows,
    scheduleBlocks,
    gestorName,
    date
) {
    if (
        !Array.isArray(rows) ||
        rows.length === 0 ||
        !Array.isArray(scheduleBlocks) ||
        scheduleBlocks.length === 0
    ) {
        return 'Por Asignar';
    }

    let targetBlock = null;
    let targetColumnIndex = -1;

    for (const block of scheduleBlocks) {
        const dateRow = rows[block.startRow];

        if (!Array.isArray(dateRow)) {
            continue;
        }

        for (
            let columnIndex = 1;
            columnIndex < dateRow.length;
            columnIndex += 1
        ) {
            const serial = dateRow[columnIndex];
            let cellDate = null;

            if (!Number.isNaN(Number(serial)) && serial) {
                cellDate = new Date(
                    Date.UTC(1899, 11, 30) +
                    Number(serial) * 86400000
                );
            } else if (
                typeof serial === 'string' &&
                (serial.includes('-') || serial.includes('/'))
            ) {
                const parsed = new Date(serial);

                if (!Number.isNaN(parsed.getTime())) {
                    cellDate = parsed;
                }
            }

            if (
                cellDate &&
                cellDate.getUTCDate() === date.getDate() &&
                cellDate.getUTCMonth() === date.getMonth() &&
                cellDate.getUTCFullYear() === date.getFullYear()
            ) {
                targetBlock = block;
                targetColumnIndex = columnIndex;
                break;
            }
        }

        if (targetBlock) {
            break;
        }
    }

    if (!targetBlock) {
        targetBlock = scheduleBlocks[scheduleBlocks.length - 1];

        const dayRow = rows[targetBlock.startRow + 1];
        const dayNames = [
            'Domingo',
            'Lunes',
            'Martes',
            'Miércoles',
            'Jueves',
            'Viernes',
            'Sábado'
        ];

        const targetDayName = dayNames[date.getDay()];

        if (Array.isArray(dayRow)) {
            for (
                let columnIndex = 1;
                columnIndex < dayRow.length;
                columnIndex += 1
            ) {
                if (
                    normalizeName(dayRow[columnIndex]) ===
                    normalizeName(targetDayName)
                ) {
                    targetColumnIndex = columnIndex;
                    break;
                }
            }
        }

        if (targetColumnIndex === -1) {
            targetColumnIndex =
                date.getDay() === 0
                    ? 7
                    : date.getDay();
        }
    }

    const startRow = targetBlock.startRow;

    for (
        let rowIndex = startRow + 2;
        rowIndex < rows.length;
        rowIndex += 1
    ) {
        const row = rows[rowIndex];

        if (
            !Array.isArray(row) ||
            !row[0] ||
            String(row[0]).trim() === '' ||
            String(row[0]).trim().toUpperCase() === 'GESTOR'
        ) {
            break;
        }

        if (namesMatch(row[0], gestorName)) {
            return row[targetColumnIndex] || 'Descansa';
        }
    }

    return 'Por Asignar';
}
