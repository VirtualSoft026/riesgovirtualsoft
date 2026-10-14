/**
 * Vista del "Análisis Textual" del Control Operativo: arma el HTML del reporte a partir de las métricas
 * agregadas (`computeAnalysisStats`). Texto 100 % determinista.
 * Extraído de `generarAnalisisTextual()` (app.js 7121-7207, plantillas copiadas literalmente).
 *
 * Los valores dinámicos que el original ya escapaba se siguen escapando con `escapeHTML`; el nombre del gestor
 * del reporte individual (`filtroGestor`) NO se escapa en el original; con `corregirBugs` (encendido por defecto
 * desde la decisión D5) sí se escapa.
 */

import { escapeHTML } from '../../utils/sanitization.js';

/** Mensaje cuando no hay datos procesados (app.js 7124). */
export const ANALYSIS_NO_DATA_HTML = `<p>No hay suficientes datos procesados para el periodo o gestor seleccionado para generar un análisis.</p>`;

/**
 * Construye el HTML del análisis.
 *
 * Decisión D5 (predeterminado, `corregirBugs: true`): con 2+ gestores seleccionados ('Varios') se muestra el resumen
 * del EQUIPO SELECCIONADO (las estadísticas ya vienen filtradas por esos gestores y por el rango de fechas), recorriendo
 * las entradas propias con `Object.entries` (mapeo seguro: nunca `gestoresStats[...]` sobre una llave inexistente);
 * un gestor ausente de las estadísticas muestra el mensaje de "no hay suficientes datos"; el nombre se escapa.
 *
 * Comportamiento ORIGINAL (solo con `corregirBugs: false` explícito, pruebas diferenciales): con un filtro distinto de
 * 'Todos' busca `gestoresStats[filtroGestor]`; con 'Varios' no existe y lanza `TypeError` ("Cannot read properties of
 * undefined (reading 'procesados')") y el modal no se abre.
 *
 * @param {{
 *   totalProcesados: number, totalAprobados: number, totalRechazados: number,
 *   gestoresStats: Object<string, {procesados: number, aprobados: number, rechazados: number, artPromedio: number}>
 * }} analysis Resultado de `computeAnalysisStats`.
 * @param {string} filtroGestor 'Todos', 'Varios' o el nombre de un gestor (`resolveFiltroGestor`).
 * @param {{corregirBugs?: boolean}} [options]
 *   `corregirBugs` (ENCENDIDO por defecto, D5): ver arriba. `false` reproduce app.js 7121-7207.
 * @returns {string}
 */
export function buildAnalysisHtml(analysis, filtroGestor, options = {}) {
    const { corregirBugs = true } = options;
    const { totalProcesados, totalAprobados, gestoresStats } = analysis;
    let html = ``;

    // D5: evita el TypeError de 'Varios' y de gestores sin datos (búsqueda solo en llaves propias).
    const hasOwnStats = (name) => Object.prototype.hasOwnProperty.call(gestoresStats, name);
    if (corregirBugs && filtroGestor !== 'Todos' && filtroGestor !== 'Varios' && Object.keys(gestoresStats).length > 0 && !hasOwnStats(filtroGestor)) {
        return ANALYSIS_NO_DATA_HTML;
    }
    const modo = (corregirBugs && filtroGestor === 'Varios') ? 'Todos' : filtroGestor;

    if (Object.keys(gestoresStats).length === 0) {
        html = `<p>No hay suficientes datos procesados para el periodo o gestor seleccionado para generar un análisis.</p>`;
    } else if (modo !== 'Todos') {
        const stats = gestoresStats[filtroGestor];
        const tasaAprobacion = stats.procesados > 0 ? ((stats.aprobados / stats.procesados) * 100).toFixed(1) : 0;
        const tasaRechazo = stats.procesados > 0 ? ((stats.rechazados / stats.procesados) * 100).toFixed(1) : 0;

        html += `<h3 style="color: var(--accent-primary); border-bottom: 2px solid var(--accent-primary); padding-bottom: 5px; margin-bottom: 15px;">Reporte Individual: ${corregirBugs ? escapeHTML(filtroGestor) : filtroGestor}</h3>`;
        html += `<p>Resumen de rendimiento operativo para el periodo seleccionado. A continuación se presentan las métricas clave evaluadas:</p>`;
        
        html += `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: var(--accent-primary); color: white;">
                    <th style="padding: 10px; border: 1px solid #ddd;">Métrica</th>
                    <th style="padding: 10px; border: 1px solid #ddd;">Valor Alcanzado</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Retiros Procesados</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 16px;">${stats.procesados}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">Retiros Aprobados</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: var(--success);">${stats.aprobados} (${tasaAprobacion}%)</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">Retiros Rechazados</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: var(--danger);">${stats.rechazados} (${tasaRechazo}%)</td>
                </tr>
                <tr style="background-color: #f9f9f9;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Tiempo Promedio de Resolución (ART)</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 16px;">${stats.artPromedio.toFixed(2)} min</td>
                </tr>
            </tbody>
        </table>`;

        if (stats.artPromedio > 1200) {
            html += `<div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger); padding: 15px; margin-top: 15px;">
                <strong>⚠️ Área de Oportunidad:</strong> El tiempo de resolución es significativamente alto (más de 20 horas). Se sugiere revisar si hay bloqueos o si los casos asignados son de alta complejidad.
            </div>`;
        } else if (stats.artPromedio < 900) {
            html += `<div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid var(--success); padding: 15px; margin-top: 15px;">
                <strong>🏆 Excelente Velocidad:</strong> El gestor mantiene tiempos de respuesta altamente competitivos, por debajo del estándar de 15 horas.
            </div>`;
        } else {
            html += `<div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid var(--accent-primary); padding: 15px; margin-top: 15px;">
                <strong>📊 Rendimiento Estable:</strong> El gestor mantiene tiempos de respuesta dentro de los promedios esperados de la operación.
            </div>`;
        }
    } else {
        html += `<h3 style="color: var(--accent-primary);">Resumen Ejecutivo del Equipo</h3>`;
        html += `<p>El equipo procesó un volumen total de <strong>${totalProcesados} solicitudes</strong> en el periodo evaluado. La tasa global de aprobación es altísima (${((totalAprobados/totalProcesados)*100).toFixed(1)}%), sugiriendo flujos estables y predecibles.</p>`;
        
        const sortedByVol = Object.entries(gestoresStats).sort((a,b) => b[1].procesados - a[1].procesados);
        const sortedByART = Object.entries(gestoresStats).filter(a => a[1].artPromedio > 0).sort((a,b) => a[1].artPromedio - b[1].artPromedio);
        
        if (sortedByVol.length > 0) {
            html += `<h4>🏆 Liderazgo en Volumen</h4>`;
            html += `<p>El gestor con mayor carga operativa es <strong>${escapeHTML(sortedByVol[0][0])}</strong> con ${sortedByVol[0][1].procesados} procesados.`;
            if (sortedByVol.length > 1) {
                html += ` Le sigue <strong>${escapeHTML(sortedByVol[1][0])}</strong> con ${sortedByVol[1][1].procesados}.</p>`;
            } else {
                html += `</p>`;
            }
        }

        if (sortedByART.length > 0) {
            html += `<h4>⚡ Rendimiento en Velocidad (ART)</h4>`;
            html += `<p>El gestor más ágil en resolución es <strong>${escapeHTML(sortedByART[0][0])}</strong> con un tiempo promedio de <strong>${sortedByART[0][1].artPromedio.toFixed(2)} minutos</strong>.`;
            if (sortedByART.length > 1) {
                html += ` En segundo lugar destaca <strong>${escapeHTML(sortedByART[1][0])}</strong> con ${sortedByART[1][1].artPromedio.toFixed(2)} mins.</p>`;
            } else {
                html += `</p>`;
            }

            const slowest = sortedByART[sortedByART.length - 1];
            if (slowest[1].artPromedio > 1200) {
                html += `<div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger); padding: 15px; margin-top: 15px;">
                    <strong>⚠️ Cuello de Botella Detectado:</strong> <strong>${escapeHTML(slowest[0])}</strong> registra un tiempo promedio elevado (${slowest[1].artPromedio.toFixed(2)} min). Se recomienda una intervención para revisar bloqueos operativos o desbalance de cargas.
                </div>`;
            }
        }
    }
    return html;
}
