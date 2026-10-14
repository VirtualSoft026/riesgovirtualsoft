/**
 * Categorías de error de aplicación compartidas por adapters y controladores.
 */
export const ERROR_CODES = Object.freeze({
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    SOURCE_FORMAT_ERROR: 'SOURCE_FORMAT_ERROR',
    PERSISTENCE_ERROR: 'PERSISTENCE_ERROR'
});

/**
 * Builds a successful result.
 *
 * @template T
 * @param {T} value
 * @returns {{ok: true, value: T}}
 */
export function ok(value) {
    return Object.freeze({ ok: true, value });
}

/**
 * Builds a failed result.
 *
 * @param {string} code One of ERROR_CODES.
 * @param {string} [message]
 * @param {unknown} [cause]
 * @returns {{ok: false, error: {code: string, message: string, cause: unknown}}}
 */
export function fail(code, message = '', cause = null) {
    return Object.freeze({
        ok: false,
        error: Object.freeze({ code, message, cause })
    });
}
