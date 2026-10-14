/**
 * Controlador de la insignia de supervisor(a) activo(a) (app.js 8329-8396). Los temporizadores
 * (`setInterval`/`setTimeout`) siguen en `app.js`. Todo por inyección.
 *
 * Decisión D9b: los supervisores de la insignia se derivan del nodo `users` (rol exacto 'Supervisor' | 'Admin'), no de
 * una lista fija. Fuente: `getSupervisorUsers()`, que devuelve el nodo `users` (o solo los usuarios con esos roles), un
 * directorio ya construido, `null` si no está disponible, o una Promesa de cualquiera de ellos (se cachea el primer
 * resultado válido y se repinta al llegar).
 *
 *  - Con `getSupervisorUsers` y SIN datos (`null`; p. ej. un Gestor, al que `database.rules.json` no deja leer `users`):
 *    la insignia NO se toca (no se afirma "Ninguna" sin saber quién es supervisor). PUNTO ABIERTO (producción): para que
 *    el Gestor vea la insignia hace falta una fuente legible por él (ver el log de decisiones kpis-supervisores).
 *  - `legacySupervisors: true` (explícito): lista fija original `LEGACY_BADGE_SUPERVISORS`.
 *  - MODO TRANSITORIO: si el llamador no inyecta `getSupervisorUsers` (el paso de laboratorio `comunicados.mjs`, fuera de
 *    la zona de este cambio, todavía no lo hace) se usa la lista fija original para no romper ese paso; queda reportado
 *    como cambio pendiente fuera de zona.
 *
 * @param {{
 *   document: {getElementById: (id: string) => any},
 *   getScheduleRows: () => (unknown[]|null|undefined),
 *   getScheduleBlocks: () => (unknown[]|null|undefined),
 *   getShiftForDate?: (rows: unknown, blocks: unknown, name: string, date: Date) => unknown,
 *   getSupervisorUsers?: () => (object|null|undefined|Promise<object|null|undefined>),
 *   legacySupervisors?: boolean,
 *   now?: () => Date,
 *   logger?: {error: Function}
 * }} deps
 */

import {
    buildSupervisorBadgeHtml, computeActiveSupervisors, buildBadgeSupervisors, LEGACY_BADGE_SUPERVISORS
} from '../domain/schedules/active-supervisors.js';

export function createSupervisorBadgeController({
    document: doc, getScheduleRows, getScheduleBlocks, getShiftForDate, getSupervisorUsers, legacySupervisors = false,
    now = () => new Date(), logger = console
}) {
    const useLegacyList = legacySupervisors === true || typeof getSupervisorUsers !== 'function';
    let cachedSupervisors = null; // lista derivada de users (D9b)
    let pending = null;

    /** Lista vigente: fija (heredada explícita/transitoria) o derivada de users; `null` si aún no hay datos. */
    function resolveSupervisors() {
        if (useLegacyList) return LEGACY_BADGE_SUPERVISORS;
        if (cachedSupervisors) return cachedSupervisors;
        if (pending) return null;

        const result = getSupervisorUsers();
        if (result && typeof result.then === 'function') {
            pending = Promise.resolve(result).then((users) => {
                pending = null;
                if (users) {
                    cachedSupervisors = buildBadgeSupervisors(users);
                    update();
                }
            }, (error) => {
                pending = null;
                logger.error('No se pudo leer el directorio de supervisores para la insignia:', error);
            });
            return null;
        }
        if (!result) return null;
        cachedSupervisors = buildBadgeSupervisors(result);
        return cachedSupervisors;
    }

    function update() {
        const rows = getScheduleRows();
        if (!rows || rows.length === 0) return;

        const badge = doc.getElementById('activeSupervisorBadge');
        if (!badge) return;

        const supervisors = resolveSupervisors();
        if (!supervisors) return; // sin fuente de supervisores: no se afirma nada

        const current = now();
        const activeSups = computeActiveSupervisors(
            (name) => (typeof getShiftForDate === 'function' ? getShiftForDate(rows, getScheduleBlocks(), name, current) : null),
            current,
            supervisors
        );

        badge.innerHTML = buildSupervisorBadgeHtml(activeSups);
        badge.style.display = 'inline-flex';
    }

    /** Olvida la lista derivada (p. ej. tras cambiar roles en Configuración); el próximo `update` la vuelve a pedir. */
    function invalidateSupervisors() {
        cachedSupervisors = null;
    }

    return { update, invalidateSupervisors };
}
