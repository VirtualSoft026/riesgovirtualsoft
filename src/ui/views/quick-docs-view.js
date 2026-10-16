/**
 * HTML del panel de documentos de acceso rápido (`renderQuickDocs()`, app.js 2528-2610).
 * El documento sugerido para la tarea se muestra destacado arriba y el resto se lista debajo.
 *
 * W-52: la URL y el nombre se escapan aunque hoy sean constantes del código (defensa en profundidad: ninguna
 * interpolación a `innerHTML` queda sin revisar). Con los nombres y URL actuales (sin `&`, `<`, `>`, comillas) el HTML
 * es idéntico al de app.js.
 */

import { escapeHTML } from '../../utils/sanitization.js';
import { QUICK_DOC_FILES, matchQuickDoc, getQuickDocIconMeta, stripDocExtension } from '../../domain/tasks/quick-docs.js';

/**
 * @param {string|null|undefined} selectedTaskName
 * @param {(fileName: string) => string} getDocUrl
 * @returns {string} contenido completo de `#quickDocsList`
 */
export function buildQuickDocsHTML(selectedTaskName, getDocUrl) {
    const matchedDoc = matchQuickDoc(selectedTaskName);
    let html = '';

    // Si hay un documento que coincide, mostrarlo destacado arriba
    if (matchedDoc) {
        const { icon, color } = getQuickDocIconMeta(matchedDoc);

        html += `
            <div style="margin-bottom: 12px; background: rgba(0, 180, 216, 0.1); padding: 10px; border-radius: var(--radius-md); border: 1px dashed var(--accent-primary);">
                <span style="font-size: 10px; color: var(--accent-primary); font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                    <i class='bx bxs-star'></i> Sugerido para esta tarea
                </span>
                <a href="${escapeHTML(getDocUrl(matchedDoc))}" target="_blank" rel="noopener noreferrer" class="doc-link" style="background: transparent; padding: 0; display: flex; align-items: center; gap: 10px;">
                    <i class='bx ${icon}' style="font-size: 20px; color: ${color};"></i>
                    <span style="color: var(--text-primary); font-weight: 500; font-size: 13px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(stripDocExtension(matchedDoc))}</span>
                </a>
            </div>
            <div style="height: 1px; background: var(--glass-border); margin: 10px 0;"></div>
        `;
    }

    // Listar todos los demás documentos
    QUICK_DOC_FILES.forEach((file) => {
        if (file === matchedDoc) return; // Omitir el destacado ya listado

        const { icon, color } = getQuickDocIconMeta(file);

        html += `
            <a href="${escapeHTML(getDocUrl(file))}" target="_blank" rel="noopener noreferrer" class="doc-link" style="margin-bottom: 8px;">
                <i class='bx ${icon}' style="font-size: 18px; color: ${color};"></i>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">${escapeHTML(stripDocExtension(file))}</span>
            </a>
        `;
    });

    return html;
}
