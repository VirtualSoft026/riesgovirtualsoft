/**
 * Insignia de supervisor(a) activo(a) (app.js 8329-8396, `updateActiveSupervisorBadge`): decide quién está de
 * turno ahora a partir del texto de turno de cada supervisor y arma el texto de la insignia.
 *
 * PURO: la hora llega por parámetro (`now`) y la consulta del turno por función (`getShiftFor`, que en
 * `app.js` es `getShiftForDate(globalScheduleRows, globalScheduleBlocks, nombre, now)`; ya existe en
 * `schedule-service.js`, que no se modifica).
 *
 * Fidelidad (hallazgos en el informe): solo se usa la hora de inicio/fin SIN minutos ("7:30am" no se
 * reconoce y cae en la rama de "turno").
 *
 * Decisión D9b: la lista de supervisores de la insignia YA NO es fija; se deriva del nodo `users` (rol exacto
 * 'Supervisor' | 'Admin', ver `supervisor-directory.js`) con `buildBadgeSupervisors(directorio)`. El turno se busca con
 * el NOMBRE COMPLETO (no con el primer nombre: "Maria" encajaba con la fila de cualquier "Maria Fernanda"), y en la
 * insignia se muestra el primer nombre (o el nombre completo si dos supervisores comparten primer nombre).
 * La lista fija original queda como `LEGACY_BADGE_SUPERVISORS`, solo para pruebas diferenciales / modo explícito.
 */

import { buildSupervisorDirectory, isSupervisorDirectory, normalizeFullName } from './supervisor-directory.js';

/** Lista FIJA original de app.js 8346-8350 (solo comportamiento heredado explícito; no usar como predeterminado). */
export const LEGACY_BADGE_SUPERVISORS = Object.freeze([
    Object.freeze({ name: 'Maria', full: 'Maria Sanchez' }),
    Object.freeze({ name: 'Sara', full: 'Sara Santamaría' }),
    Object.freeze({ name: 'Oriana', full: 'Oriana Borja' })
]);

export const SHIFT_RANGE_PATTERN = /(\d+)(am|pm|a\.m\.|p\.m\.)\s*-\s*(\d+)(am|pm|a\.m\.|p\.m\.)/i;

/**
 * ¿El texto de turno indica que está de turno a `timeFloat` (horas + minutos/60)? (app.js 8355-8381)
 *
 * @param {unknown} shiftStr
 * @param {number} timeFloat
 * @returns {boolean}
 */
export function isSupervisorShiftActive(shiftStr, timeFloat) {
    if (!(shiftStr && typeof shiftStr === 'string' && shiftStr !== 'Descansa' && shiftStr !== 'Por Asignar' && shiftStr !== 'Vacaciones')) {
        return false;
    }

    const match = shiftStr.match(SHIFT_RANGE_PATTERN);

    if (match) {
        let startH = parseInt(match[1]);
        const startMeridiem = match[2].toLowerCase().replace(/\./g, '');
        if (startMeridiem === 'pm' && startH !== 12) startH += 12;
        if (startMeridiem === 'am' && startH === 12) startH = 0;

        let endH = parseInt(match[3]);
        const endMeridiem = match[4].toLowerCase().replace(/\./g, '');
        if (endMeridiem === 'pm' && endH !== 12) endH += 12;
        if (endMeridiem === 'am' && endH === 12) endH = 0;

        const startFloat = startH;
        const endFloat = endH;

        if (endFloat <= startFloat) {
            return timeFloat >= startFloat || timeFloat < endFloat;
        }

        return timeFloat >= startFloat && timeFloat < endFloat;
    }

    return shiftStr.toLowerCase().includes('turno');
}

/**
 * Supervisores de la insignia derivados del directorio de `users` (D9b), en orden alfabético.
 * `name` = texto que se muestra (primer nombre; nombre completo si el primer nombre se repite);
 * `lookupName` = nombre completo con el que se consulta el cronograma; `uid` del usuario.
 *
 * @param {object|Record<string, object>|Array<object>|null} directoryOrUsers directorio (`buildSupervisorDirectory`) o el nodo `users`.
 * @returns {ReadonlyArray<{uid: (string|null), name: string, full: string, lookupName: string}>}
 */
export function buildBadgeSupervisors(directoryOrUsers) {
    const directory = isSupervisorDirectory(directoryOrUsers) ? directoryOrUsers : buildSupervisorDirectory(directoryOrUsers);
    const withName = directory.list.filter((s) => s.name);
    const firstName = (full) => full.split(/\s+/)[0];
    const counts = new Map();
    const key = (full) => normalizeFullName(firstName(full)); // "María" y "Maria" cuentan como el mismo primer nombre
    withName.forEach((s) => counts.set(key(s.name), (counts.get(key(s.name)) || 0) + 1));
    return Object.freeze(withName.map((s) => Object.freeze({
        uid: s.uid,
        name: counts.get(key(s.name)) > 1 ? s.name : firstName(s.name),
        full: s.name,
        lookupName: s.name
    })));
}

/**
 * Nombres (en el orden de la lista) de los supervisores de turno a la hora `now`.
 *
 * @param {(name: string) => unknown} getShiftFor texto de turno de un supervisor (o null)
 * @param {Date} now
 * @param {ReadonlyArray<{name: string, lookupName?: string}>} supervisors OBLIGATORIO desde D9b (sin lista fija por
 *   defecto): `buildBadgeSupervisors(directorio)` o, solo en modo heredado explícito, `LEGACY_BADGE_SUPERVISORS`.
 *   El cronograma se consulta con `lookupName` si existe (nombre completo) y si no con `name` (lista heredada).
 * @returns {string[]}
 */
export function computeActiveSupervisors(getShiftFor, now, supervisors) {
    if (!Array.isArray(supervisors)) {
        throw new TypeError('computeActiveSupervisors: falta la lista de supervisores (decisión D9b: derivarla de users con buildBadgeSupervisors).');
    }
    const timeFloat = now.getHours() + (now.getMinutes() / 60);
    const activeSups = [];

    for (const sup of supervisors) {
        if (isSupervisorShiftActive(getShiftFor(sup.lookupName || sup.name), timeFloat)) {
            if (!activeSups.includes(sup.name)) activeSups.push(sup.name);
        }
    }

    return activeSups;
}

/**
 * Lista en español: "A", "A y B", "A, B y C".
 *
 * @param {string[]} names
 * @returns {string}
 */
export function formatSupervisorNames(names) {
    if (names.length === 1) return names[0];
    if (names.length === 2) return names.join(' y ');

    return names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1];
}

/**
 * HTML interno de la insignia.
 *
 * @param {string[]} activeSups
 * @returns {string}
 */
export function buildSupervisorBadgeHtml(activeSups) {
    if (activeSups.length > 0) {
        return `<i class='bx bx-support'></i> Sup: ${formatSupervisorNames(activeSups)}`;
    }

    return `<i class='bx bx-support'></i> Sup: Ninguna (Fuera de turno)`;
}
