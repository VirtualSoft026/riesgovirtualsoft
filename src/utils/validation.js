/**
 * Returns true when the value is a non-empty string after trimming.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
}

/**
 * Returns true when the value is a finite number.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Returns true when the value is a valid Date instance.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidDate(value) {
    return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Returns true when the value is one of the allowed options.
 *
 * @param {unknown} value
 * @param {Iterable<unknown>} allowed
 * @returns {boolean}
 */
export function isOneOf(value, allowed) {
    return new Set(allowed).has(value);
}

/**
 * Returns the names of the required fields that are missing or empty.
 *
 * @param {Record<string, unknown>|null|undefined} source
 * @param {string[]} requiredFields
 * @returns {string[]}
 */
export function findMissingFields(source, requiredFields) {
    const target = source && typeof source === 'object' ? source : {};

    return requiredFields.filter((field) => {
        const value = target[field];

        return value === undefined || value === null || value === '';
    });
}
