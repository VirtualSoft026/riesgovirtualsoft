/**
 * HTML de la tabla "Resumen de Retiros por Gestor" y de las tarjetas resumen del Control Operativo.
 * Extraído de `renderControlOperativoFiltered()` (app.js 7695-7716). Solo construye texto/HTML.
 */

import { escapeHTML } from '../../utils/sanitization.js';

/**
 * Contenido (`innerHTML`) de la fila de un gestor.
 *
 * @param {{gestor: string, Retiros_Aprobados: number, Retiros_Rechazados: number, Retiros_Procesados: number, Porcentaje_Rechazos: number, Tasa_Aprobacion_Dia: number}} d
 * @returns {string}
 */
export function buildOperativoRowHtml(d) {
    const gestor = d.gestor;
    const badgeAprobados = `<span style="background: rgba(16, 185, 129, 0.15); color: var(--success); padding: 4px 10px; border-radius: 20px; font-weight: 700;">${d.Retiros_Aprobados}</span>`;
    const badgeRechazados = `<span style="background: rgba(239, 68, 68, 0.15); color: var(--danger); padding: 4px 10px; border-radius: 20px; font-weight: 700;">${d.Retiros_Rechazados}</span>`;

    return `
            <td style="padding: 16px 20px; font-weight: 600; color: var(--text-primary);">${escapeHTML(gestor)}</td>
            <td style="padding: 16px 20px;">${badgeAprobados}</td>
            <td style="padding: 16px 20px;">${badgeRechazados}</td>
            <td style="padding: 16px 20px; font-weight: 600; color: var(--text-secondary);">${d.Retiros_Procesados}</td>
            <td style="padding: 16px 20px; font-weight: 600; color: var(--text-secondary);">${d.Porcentaje_Rechazos}%</td>
            <td style="padding: 16px 20px; font-weight: 600; color: var(--text-secondary);">${d.Tasa_Aprobacion_Dia}</td>
        `;
}

/** `innerHTML` del widget de tiempo promedio de resolución (app.js 7706). */
export function buildOperativoArtWidgetHtml(avgArt) {
    return `${escapeHTML(String(avgArt))}<span style="font-size: 16px; font-weight: 600; margin-left: 4px;">min</span>`;
}
