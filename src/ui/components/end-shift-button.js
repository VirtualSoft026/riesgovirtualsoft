/**
 * Restaura el botón "Finalizar Turno" tras un fallo.
 *
 * Puerto 1:1 de `restoreEndShiftButton()` (app.js 3614-3618). Acepta cualquier
 * objeto con `innerHTML` y `disabled` (un botón real o uno simulado).
 *
 * @param {{innerHTML: string, disabled: boolean}|null} button
 * @param {string} [previousHtml]
 */
export function restoreEndShiftButton(button, previousHtml) {
    if (!button) return;
    button.innerHTML = previousHtml || "<i class='bx bx-log-out-circle'></i> Finalizar Turno";
    button.disabled = false;
}
