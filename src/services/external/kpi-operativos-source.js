/**
 * Fuente de los datos operativos de KPIs (JSON pre-procesado del motor operativo).
 *
 * Extraído de `fetchKpiOperativosData()` (app.js 5676-5702). La red se inyecta (`fetchFn`, `now`, `logger`):
 * no toca `window` ni `fetch` globales, así se prueba sin navegador.
 *
 * Producción carga siempre `kpi_operativos_v2.json`. No existe rama de laboratorio: los datos de prueba
 * (`kpi_operativos_seed.json`) viven en `fase_2/lab/` y no se publican (CF-5.4, W-49 b).
 */

export const KPI_OPERATIVOS_DATA_FILE = 'kpi_operativos_v2.json';

/**
 * Obtiene los datos de KPIs del archivo estándar y falla si la respuesta no es OK.
 *
 * @param {{
 *   fetchFn: (url: string) => Promise<{ok: boolean, json: () => Promise<any>}>,
 *   now?: () => number
 * }} deps
 * @returns {Promise<object>}
 */
export async function fetchKpiOperativosData({ fetchFn, now = () => new Date().getTime() }) {
    const response = await fetchFn(KPI_OPERATIVOS_DATA_FILE + '?v=' + now());
    if (!response.ok) throw new Error('No se pudo cargar kpi_operativos_v2.json');
    return await response.json();
}
