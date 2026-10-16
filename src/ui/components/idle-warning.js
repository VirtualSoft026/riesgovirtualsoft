/**
 * Banner de advertencia del detector de inactividad (W-24, paso 3.3).
 *
 * Migra `setIdleDetectorWarning(visible, message)` de app.js: escribe el texto (si llega) y muestra u oculta el banner
 * `#idleDetectorWarning`. Recibe el documento por parámetro para poder probarlo sin navegador.
 */

/**
 * @param {{getElementById: (id: string) => any}} doc
 * @param {boolean} visible
 * @param {string} [message] si está vacío, el texto anterior se conserva
 * @returns {void}
 */
export function setIdleDetectorWarning(doc, visible, message = '') {
    const warningBanner = doc.getElementById('idleDetectorWarning');
    const warningText = doc.getElementById('idleDetectorWarningText');

    if (warningText && message) warningText.textContent = message;
    if (warningBanner) warningBanner.style.display = visible ? 'flex' : 'none';
}
