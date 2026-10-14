/**
 * Controlador del modal "Historial de Accesos" (app.js 8402-8628): `openLoginHistoryModal()`,
 * `renderLoginHistoryTable()` y `filterLoginHistoryTable()`. Todo por inyección (`document`, `repository`,
 * `now`, `logger`); la lógica pura está en `domain/auth/login-history.js`.
 *
 * Opciones (ver el encabezado de `login-history.js`):
 *  - `escapeRawLoginTime`: `true` por defecto (DECISIÓN D2: sanear el `loginTime` inválido). Solo `false`
 *    explícito reproduce el original de app.js (para la prueba diferencial).
 *  - `tolerateInvalidDates`: apagada por defecto (no forma parte de una decisión; el original lanza RangeError).
 *
 * @param {{
 *   repository: ReturnType<typeof import('../services/firebase/firebase-login-history-repository.js').createLoginHistoryRepository>,
 *   document: {getElementById: (id: string) => any},
 *   now?: () => number,
 *   logger?: {error: Function},
 *   helpers?: {escapeHTML?: Function},
 *   options?: {escapeRawLoginTime?: boolean, tolerateInvalidDates?: boolean}
 * }} deps
 */

import {
    LOGIN_HISTORY_ERROR_HTML,
    LOGIN_HISTORY_LOADING_HTML,
    buildLoginHistoryRecords,
    buildLoginHistoryTableHtml,
    filterLoginHistoryRecords
} from '../domain/auth/login-history.js';

export function createLoginHistoryController(deps) {
    const { repository, document: doc, now = Date.now, logger = console, helpers, options = {} } = deps;
    let allLoginHistoryRecords = [];

    function render(records) {
        const tbody = doc.getElementById('loginHistoryTableBody');
        if (!tbody) return;

        tbody.innerHTML = buildLoginHistoryTableHtml(records, {
            escapeHTML: helpers && helpers.escapeHTML,
            escapeRawLoginTime: options.escapeRawLoginTime !== false
        });
    }

    async function open() {
        const modal = doc.getElementById('loginHistoryModal');
        if (!modal) return;

        modal.classList.add('active');
        const tbody = doc.getElementById('loginHistoryTableBody');
        if (tbody) {
            tbody.innerHTML = LOGIN_HISTORY_LOADING_HTML;
        }

        try {
            const { active, reports, logs } = await repository.fetchSources();

            allLoginHistoryRecords = [];
            buildLoginHistoryRecords({
                activeSessions: active.exists() ? active.val() : null,
                loginLogs: logs.exists() ? logs.val() : null,
                shiftReports: reports.exists() ? reports.val() : null
            }, now(), allLoginHistoryRecords);

            render(allLoginHistoryRecords);
        } catch (e) {
            logger.error('Error cargando historial de accesos:', e);
            if (tbody) {
                tbody.innerHTML = LOGIN_HISTORY_ERROR_HTML;
            }
        }
    }

    function filter() {
        const searchInput = doc.getElementById('loginHistorySearch');
        const dateFilter = doc.getElementById('loginHistoryDateFilter');

        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const dateVal = dateFilter ? dateFilter.value : 'todos';

        render(filterLoginHistoryRecords(allLoginHistoryRecords, { query, dateVal }, new Date(now()), {
            tolerateInvalidDates: options.tolerateInvalidDates === true
        }));
    }

    return { open, render, filter, getRecords: () => allLoginHistoryRecords };
}
