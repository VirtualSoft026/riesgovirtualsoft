/**
 * Directorio de supervisores derivado del nodo `users` (decisión D9b del responsable, plan maestro §4 ter).
 *
 * ANTES (app.js): `SUPERVISORES_NOMBRES = ['Sara Santamaría', ..., 'Sara', 'Maria', 'Camilo', 'Oriana']` y cada consumidor
 * comparaba por SUBCADENA (`nombre.includes(ex)`), de modo que "Mariana" quedaba oculta por contener "Maria" y la lista
 * había que mantenerla a mano.
 *
 * AHORA: es supervisor quien tenga en su nodo `users/{uid}` el campo `role` con valor EXACTO `'Supervisor'` o `'Admin'`
 * (mismo campo y mismos valores que usan `database.rules.json` —`root.child('users').child(auth.uid).child('role').val()
 * === 'Admin' | 'Supervisor'`— y `login.js`). No hay lista fija.
 *
 * Identificación:
 *  - Si el dato trae `uid` (p. ej. la llave de `active_sessions/{uid}`), decide SOLO el uid: es supervisor si el uid está
 *    en el directorio. Un homónimo con otro uid NO se oculta.
 *  - Si el dato solo trae nombre (JSON operativo de retiros, `shift_reports.gestor`): coincidencia EXACTA del nombre
 *    completo normalizado (minúsculas, sin acentos, espacios colapsados) contra los nombres de los usuarios con ese rol.
 *    Nunca por subcadena ni por palabra suelta.
 *  - Sin directorio (`null`: aún no se leyó `users`, o el rol del lector no tiene permiso de leerlo) no se identifica a
 *    nadie como supervisor (es preferible mostrar de más que ocultar a un gestor; ver informe/log, punto abierto).
 *
 * Puro: sin Firebase ni DOM.
 */

import { ROLES } from '../../config/roles.js';

/** Valores EXACTOS de `users/{uid}/role` que cuentan como supervisor (los mismos que valida `database.rules.json`). */
export const SUPERVISOR_ROLES = Object.freeze([ROLES.SUPERVISOR, ROLES.ADMIN]);

/**
 * ¿El rol es de supervisor/administrador? Comparación exacta (como las reglas de Firebase).
 *
 * @param {unknown} role
 * @returns {boolean}
 */
export function isSupervisorRole(role) {
    return typeof role === 'string' && SUPERVISOR_ROLES.includes(role);
}

/**
 * Nombre completo normalizado para comparar con igualdad exacta: minúsculas, sin acentos, sin espacios a los
 * extremos y con los espacios internos colapsados. `null`/no-texto -> ''.
 *
 * @param {unknown} name
 * @returns {string}
 */
export function normalizeFullName(name) {
    if (typeof name !== 'string') return '';
    return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Construye el directorio a partir del nodo `users` (uid -> usuario) o de un arreglo de usuarios con `uid`.
 * Ignora entradas nulas o sin rol de supervisor. El resultado está congelado.
 *
 * @param {Object<string, {name?: string, role?: string}>|Array<{uid?: string, name?: string, role?: string}>|null|undefined} users
 * @returns {{
 *   uids: ReadonlySet<string>,
 *   names: ReadonlySet<string>,
 *   list: ReadonlyArray<{uid: (string|null), name: string, role: string}>
 * }} `list` ordenada por nombre (es) y, a igual nombre, por uid.
 */
export function buildSupervisorDirectory(users) {
    const entries = Array.isArray(users)
        ? users.map((u) => [u && u.uid != null ? String(u.uid) : null, u])
        : Object.entries(users || {});

    const uids = new Set();
    const names = new Set();
    const list = [];

    for (const [uid, user] of entries) {
        if (!user || typeof user !== 'object' || !isSupervisorRole(user.role)) continue;
        const name = typeof user.name === 'string' ? user.name.trim() : '';
        if (uid) uids.add(uid);
        const norm = normalizeFullName(name);
        if (norm) names.add(norm);
        list.push(Object.freeze({ uid: uid || null, name, role: user.role }));
    }

    list.sort((a, b) => a.name.localeCompare(b.name, 'es') || String(a.uid).localeCompare(String(b.uid)));

    return Object.freeze({ uids, names, list: Object.freeze(list) });
}

/** Directorio vacío (nadie es supervisor). */
export const EMPTY_SUPERVISOR_DIRECTORY = buildSupervisorDirectory(null);

/**
 * ¿Es un directorio construido con `buildSupervisorDirectory`? Sirve para rechazar, con un error claro, a los
 * llamadores que todavía pasan la lista fija de nombres (arreglo) donde ahora se espera el directorio.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isSupervisorDirectory(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
        && value.uids instanceof Set && value.names instanceof Set && Array.isArray(value.list);
}

/**
 * Valida el argumento "directorio" de los consumidores: acepta un directorio o `null`/`undefined` (sin directorio).
 * Un arreglo (la antigua `SUPERVISORES_NOMBRES`) lanza TypeError para que ningún llamador quede usando la lista fija
 * por descuido.
 *
 * @param {unknown} value
 * @param {string} where nombre del consumidor (para el mensaje)
 * @returns {ReturnType<typeof buildSupervisorDirectory>|null}
 */
export function assertSupervisorDirectory(value, where) {
    if (value === null || value === undefined) return null;
    if (isSupervisorDirectory(value)) return value;
    throw new TypeError(`${where}: se esperaba un directorio de supervisores (buildSupervisorDirectory(users)); `
        + 'la lista fija de nombres (SUPERVISORES_NOMBRES) ya no se admite (decisión D9b). '
        + 'Para reproducir el comportamiento original en una prueba diferencial use la opción explícita legacyExcludedNames.');
}

/**
 * ¿La entrada corresponde a un supervisor?
 *
 * @param {ReturnType<typeof buildSupervisorDirectory>|null|undefined} directory
 * @param {{uid?: (string|null), name?: (string|null)}} entry
 * @returns {boolean}
 */
export function isSupervisorEntry(directory, { uid = null, name = null } = {}) {
    if (!directory) return false;
    if (uid !== null && uid !== undefined && uid !== '') return directory.uids.has(String(uid));
    const norm = normalizeFullName(name);
    return norm !== '' && directory.names.has(norm);
}

/**
 * Atajo para datos que SOLO traen nombre (llaves del JSON operativo): coincidencia exacta del nombre completo.
 *
 * @param {ReturnType<typeof buildSupervisorDirectory>|null|undefined} directory
 * @param {unknown} name
 * @returns {boolean}
 */
export function isSupervisorName(directory, name) {
    return isSupervisorEntry(directory, { name: typeof name === 'string' ? name : null });
}

/**
 * Comportamiento ORIGINAL de app.js (solo para pruebas diferenciales y para documentar la diferencia): ¿algún nombre de
 * la lista fija es SUBCADENA del nombre? (app.js 7031/7101: `gestor.includes(ex)`).
 *
 * @param {readonly string[]} legacyExcludedNames
 * @param {string} name
 * @returns {boolean}
 */
export function legacySubstringMatch(legacyExcludedNames, name) {
    return legacyExcludedNames.some((ex) => name.includes(ex));
}
