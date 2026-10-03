const MONTH_NAME_ALIASES = Object.freeze({
    ene: 'enero',
    feb: 'febrero',
    mar: 'marzo',
    abr: 'abril',
    may: 'mayo',
    jun: 'junio',
    jul: 'julio',
    ago: 'agosto',
    sep: 'septiembre',
    set: 'septiembre',
    oct: 'octubre',
    nov: 'noviembre',
    dic: 'diciembre'
});

/**
 * Normalizes a name by removing accents, trimming whitespace and converting
 * the value to lowercase.
 *
 * @param {unknown} name
 * @returns {string}
 */
export function normalizeName(name) {
    if (!name) {
        return '';
    }

    return String(name)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
        .toLowerCase();
}

/**
 * Compares two names using normalized tokens.
 *
 * @param {string} name1
 * @param {string} name2
 * @returns {boolean}
 */
export function namesMatch(name1, name2) {
    if (!name1 || !name2) {
        return false;
    }

    const parts1 = normalizeName(name1)
        .split(' ')
        .filter((part) => part.length > 2);

    const parts2 = normalizeName(name2)
        .split(' ')
        .filter((part) => part.length > 2);

    if (parts1.length === 0 || parts2.length === 0) {
        return false;
    }

    const [shorter, longer] =
        parts1.length <= parts2.length
            ? [parts1, parts2]
            : [parts2, parts1];

    if (shorter.length > 1) {
        return shorter.every((part) => longer.includes(part));
    }

    const shortPart = shorter[0];

    if (shortPart === 'daniel' && longer.includes('josue')) {
        return false;
    }

    if (longer[0] === shortPart) {
        return true;
    }

    return longer.includes(shortPart);
}

/**
 * Converts text into a normalized comparison value.
 *
 * @param {unknown} text
 * @returns {string}
 */
export function cleanText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .join(' ')
        .trim();
}

/**
 * Normalizes known task-name variants.
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizeTaskName(name) {
    const cleaned = cleanText(name);

    if (cleaned.includes('conciliacion de pasarelas')) {
        return 'conciliacion de pasarelas';
    }

    if (
        cleaned.includes('revision de billetera') ||
        cleaned.includes('billetera usuarios')
    ) {
        return 'revision de billetera usuarios pdv';
    }

    if (
        cleaned.includes('revision de eventos') ||
        cleaned.includes('revision de evento')
    ) {
        return 'revision de eventos';
    }

    return cleaned;
}

/**
 * Compares a cronogram task with a master task.
 *
 * @param {string} cronTask
 * @param {string} masterTask
 * @returns {boolean}
 */
export function taskNamesMatch(cronTask, masterTask) {
    if (!cronTask || !masterTask) {
        return false;
    }

    const normalizedCronTask = normalizeTaskName(cronTask);
    const normalizedMasterTask = normalizeTaskName(masterTask);

    if (normalizedCronTask === normalizedMasterTask) {
        return true;
    }

    const minimumLength = Math.min(
        normalizedCronTask.length,
        normalizedMasterTask.length
    );

    if (
        minimumLength >= 15 &&
        (
            normalizedMasterTask.includes(normalizedCronTask) ||
            normalizedCronTask.includes(normalizedMasterTask)
        )
    ) {
        const lengthDifference = Math.abs(
            normalizedCronTask.length - normalizedMasterTask.length
        );

        return lengthDifference <= 6;
    }

    return false;
}

/**
 * Compares two SET names after text normalization.
 *
 * @param {string} set1
 * @param {string} set2
 * @returns {boolean}
 */
export function setNamesMatch(set1, set2) {
    if (!set1 || !set2) {
        return false;
    }

    const normalizedSet1 = cleanText(set1);
    const normalizedSet2 = cleanText(set2);

    return (
        normalizedSet1 === normalizedSet2 ||
        normalizedSet1.includes(normalizedSet2) ||
        normalizedSet2.includes(normalizedSet1)
    );
}

export { MONTH_NAME_ALIASES };
