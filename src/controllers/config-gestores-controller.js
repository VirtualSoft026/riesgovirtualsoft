/**
 * Controlador de "Configuración de Gestores": pinta la tabla de gestores con el interruptor de la Pausa
 * de Turno y guarda el cambio (app.js 6757-6834: `renderConfigGestores()` y `toggleGestorSplitShift()`).
 *
 * Contrato que se conserva: el interruptor refleja `hasSplitShift === true` (estricto); mover el
 * interruptor pide confirmación; si se cancela o si la escritura falla, la tabla se VUELVE A PINTAR desde
 * la base, con lo que el interruptor regresa a su estado previo (el original lo hace igual; aquí queda
 * cubierto con pruebas, incluido el rechazo por reglas).
 *
 * Todo por inyección (`document`, `confirm`, `alert`, `repository`, `logger`), sin globales.
 *
 * DECISIÓN D2 (plan maestro §4 ter): `options.escapeUserFields` es `true` por defecto (nombre, rol, correo y uid
 * escapados; ver `buildGestorConfigRowHtml`). Solo `escapeUserFields: false` explícito reproduce la plantilla
 * original de app.js (stored XSS), y existe únicamente para la prueba diferencial.
 *
 * @param {{
 *   repository: ReturnType<typeof import('../services/firebase/firebase-config-repository.js').createConfigRepository>,
 *   document: {getElementById: (id: string) => any, createElement: (tag: string) => any},
 *   confirm: (message: string) => boolean,
 *   alert?: (message: string) => void,
 *   logger?: {error: Function},
 *   options?: {escapeUserFields?: boolean}
 * }} deps
 */

import {
    EMPTY_GESTORES_ROW_HTML,
    ERROR_GESTORES_ROW_HTML,
    GESTOR_ROW_BORDER,
    SPLIT_SHIFT_SAVE_ERROR,
    buildGestorConfigRowHtml,
    buildSplitShiftConfirmMessage,
    selectConfigGestores
} from '../domain/users/gestor-config.js';

export function createConfigGestoresController(deps) {
    const { repository, document: doc, confirm: ask, alert: notify = () => {}, logger = console, options = {} } = deps;

    /**
     * Repinta la tabla. Devuelve la promesa (el original no la devolvía; nadie la usa, pero así se puede esperar).
     */
    function render() {
        const tbody = doc.getElementById('configGestoresTableBody');
        if (!tbody) return undefined;

        return repository.fetchUsersSnapshot().then((snap) => {
            tbody.innerHTML = '';

            if (!snap.exists()) {
                tbody.innerHTML = EMPTY_GESTORES_ROW_HTML;
                return;
            }

            const entries = [];
            snap.forEach((child) => {
                entries.push({ key: child.key, value: child.val() });
            });

            const users = selectConfigGestores(entries);

            if (users.length === 0) {
                tbody.innerHTML = EMPTY_GESTORES_ROW_HTML;
                return;
            }

            users.forEach((u) => {
                const row = doc.createElement('tr');
                row.style.borderBottom = GESTOR_ROW_BORDER;
                row.innerHTML = buildGestorConfigRowHtml(u, { escapeUserFields: options.escapeUserFields !== false });
                tbody.appendChild(row);
            });
        }).catch((err) => {
            logger.error('Error cargando gestores:', err);
            tbody.innerHTML = ERROR_GESTORES_ROW_HTML;
        });
    }

    /**
     * Cambia el flag de un gestor tras confirmar. Devuelve la promesa de la escritura (o `undefined` si se
     * canceló, en cuyo caso solo se repinta).
     */
    function toggle(uid, isChecked) {
        if (ask(buildSplitShiftConfirmMessage(isChecked))) {
            return repository.setHasSplitShift(uid, isChecked).then(() => {
                render(); // Refrescar vista
            }).catch((err) => {
                logger.error('Error actualizando permiso de turno partido:', err);
                notify(SPLIT_SHIFT_SAVE_ERROR);
                render(); // Revertir toggle
            });
        }

        render(); // Revertir toggle si cancela
        return undefined;
    }

    return { render, toggle };
}
