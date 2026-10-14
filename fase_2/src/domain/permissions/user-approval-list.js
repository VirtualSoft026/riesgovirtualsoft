/**
 * Lógica pura de la tabla "Gestión de Usuarios" (vista Aprobaciones, solo Admin).
 *
 * Puerto 1:1 de la parte sin efectos de `renderPendingUsers()` (app.js 4111-4219): clasificación en
 * pendientes/aprobados, orden por fecha de registro, filtros de búsqueda/estado, recorte a 5 filas y
 * textos de fecha.
 *
 * Decisión D9a (2026-10-06, plan maestro §4 ter): en app.js un usuario con `approved === 'Rechazado'` NO entra en
 * ninguna lista y desaparece de la tabla (quien rechaza no puede revertirlo). Ahora, por defecto, el filtro de estado
 * acepta además `USER_STATUS_FILTER.REJECTED` ("Rechazado"), que lista SOLO a los rechazados para poder revertirlos.
 * "Todos", "Pendiente" y "Aprobado" se comportan exactamente como en app.js (los rechazados siguen fuera de "Todos";
 * punto abierto anotado en el log de decisiones). `{ includeRejected: false }` reproduce app.js también con el valor
 * "Rechazado" (que app.js trata como un estado desconocido: no filtra por estado pero cuenta como filtro activo).
 *
 * Sin DOM, sin Firebase.
 */

import { HIDDEN_APPROVED_USER_EMAIL, APPROVALS_LIST_LIMIT, USER_REJECTED_VALUE } from '../auth/approval-policy.js';
import { normalizeName } from '../../utils/normalize.js';

/** Valor del selector de estado (`filterAprobacionesStatus`) que no filtra. */
export const USER_STATUS_FILTER = Object.freeze({
    ALL: 'Todos',
    PENDING: 'Pendiente',
    APPROVED: 'Aprobado',
    /** Decisión D9a: no existe en el `<select>` de index.html; el controlador agrega la opción. */
    REJECTED: 'Rechazado'
});

/** Opción "Rechazados" del selector `filterAprobacionesStatus` (D9a; mismo patrón que las de index.html 365-367). */
export const REJECTED_FILTER_OPTION = Object.freeze({ value: USER_STATUS_FILTER.REJECTED, text: 'Rechazados' });

function byRegistrationDateDesc(a, b) {
    const dateA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
    const dateB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
    return dateB - dateA;
}

function matchesSearch(user, searchVal) {
    return searchVal === '' || normalizeName(user.name || '').includes(searchVal) || normalizeName(user.email || '').includes(searchVal);
}

/**
 * Usuarios rechazados (`approved === 'Rechazado'`, el valor que escribe el rechazo de app.js 4256), con la misma
 * búsqueda por nombre/correo (sin acentos) y el mismo orden por fecha de registro que la tabla. Decisión D9a.
 *
 * @param {object[]} users Lista con `id`.
 * @param {string} [search] Texto crudo del buscador.
 * @returns {object[]}
 */
export function selectRejectedUsers(users, search = '') {
    const searchVal = search ? normalizeName(search) : '';

    return users
        .filter((u) => u && u.approved === USER_REJECTED_VALUE)
        .sort(byRegistrationDateDesc)
        .filter((u) => matchesSearch(u, searchVal));
}

/** Opciones de fecha de las columnas "F. Solicitud" y "F. Aprobación" (app.js 4207-4208). */
export const USER_DATE_FORMAT_OPTIONS = Object.freeze({ year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * @param {object[]} users Lista con `id`.
 * @param {{search?: string, status?: string}} [filters] Valores crudos de los controles (`search` sin normalizar).
 * @param {{includeRejected?: boolean}} [options] `includeRejected` (por defecto `true`, decisión D9a): con el estado
 *   "Rechazado" devuelve solo los rechazados. `false` = comportamiento de app.js.
 * @returns {{
 *   rows: object[], total: number, hasFilter: boolean, truncated: boolean, noticeText: string|null
 * }} `total` = pendientes + aprobados visibles ANTES de filtrar (el que usa el aviso de app.js 4157).
 */
export function prepareUsersApprovalList(users, filters = {}, { includeRejected = true } = {}) {
    const searchVal = filters.search ? normalizeName(filters.search) : '';
    const statusVal = filters.status ? filters.status : USER_STATUS_FILTER.ALL;

    if (includeRejected && statusVal === USER_STATUS_FILTER.REJECTED) {
        // Vista "Rechazados" (D9a): siempre es un filtro activo, así que nunca se recorta ni muestra el aviso de 5.
        const rejected = selectRejectedUsers(users, filters.search || '');

        return { rows: rejected, total: rejected.length, hasFilter: true, truncated: false, noticeText: null };
    }

    const pending = users.filter((u) => u.approved === false);
    const approved = users.filter((u) => u.approved === true && u.email !== HIDDEN_APPROVED_USER_EMAIL);

    // Primero pendientes y luego aprobados; después se ordena por fecha de registro (más reciente primero).
    let rows = [...pending, ...approved].sort((a, b) => {
        const dateA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
        const dateB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
        return dateB - dateA;
    });

    const hasFilter = searchVal !== '' || statusVal !== USER_STATUS_FILTER.ALL;

    rows = rows.filter((u) => {
        const matchSearch = searchVal === '' || normalizeName(u.name || '').includes(searchVal) || normalizeName(u.email || '').includes(searchVal);
        let matchStatus = true;
        if (statusVal === USER_STATUS_FILTER.PENDING) matchStatus = (u.approved === false);
        if (statusVal === USER_STATUS_FILTER.APPROVED) matchStatus = (u.approved === true);
        return matchSearch && matchStatus;
    });

    const total = [...pending, ...approved].length;
    let truncated = false;
    let noticeText = null;

    if (!hasFilter && rows.length > APPROVALS_LIST_LIMIT) {
        rows = rows.slice(0, APPROVALS_LIST_LIMIT);
        truncated = true;
        noticeText = `Mostrando los 5 registros más recientes de ${total} en total. Usa los filtros arriba para buscar más.`;
    }

    return { rows, total, hasFilter, truncated, noticeText };
}

/**
 * Texto de "F. Solicitud" (app.js 4207): `Desconocida` si no hay fecha.
 *
 * @param {{registrationDate?: string|number}} user
 * @param {(date: Date) => string} [formatDate] Por defecto `toLocaleString([], opciones)` como app.js.
 */
export function formatRegistrationDate(user, formatDate = defaultFormatDate) {
    return user.registrationDate ? formatDate(new Date(user.registrationDate)) : 'Desconocida';
}

/**
 * Texto de "F. Aprobación" (app.js 4208): fecha formateada; si no hay, `Desconocida` para un aprobado y `-`
 * para el resto.
 */
export function formatApprovalDate(user, formatDate = defaultFormatDate) {
    if (user.approvalDate) return formatDate(new Date(user.approvalDate));

    return user.approved === true ? 'Desconocida' : '-';
}

function defaultFormatDate(date) {
    return date.toLocaleString([], USER_DATE_FORMAT_OPTIONS);
}
