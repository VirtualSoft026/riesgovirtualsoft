/**
 * Fuente de los datos operativos de KPIs (JSON pre-procesado del motor operativo).
 *
 * Extraído de `fetchKpiOperativosData()` (app.js 5676-5702). La red y el entorno se inyectan
 * (`fetchFn`, `isLocal`, `now`, `logger`): no toca `window` ni `fetch` globales, así se prueba sin navegador.
 */

export const KPI_OPERATIVOS_SEED_FILE = 'kpi_operativos_seed.json';
export const KPI_OPERATIVOS_DATA_FILE = 'kpi_operativos_v2.json';

/**
 * ¿La app corre en el laboratorio local? (localhost, 127.0.0.1 o file://).
 * Equivale a la condición `isLocal` del original; sin `win` devuelve false.
 *
 * @param {{location?: {hostname?: string, protocol?: string}}|undefined} win
 * @returns {boolean}
 */
export function detectLocalEnvironment(win) {
    return typeof win !== 'undefined' && win !== null && !!win.location && (
        win.location.hostname === 'localhost' ||
        win.location.hostname === '127.0.0.1' ||
        win.location.protocol === 'file:'
    );
}

/**
 * Obtiene los datos de KPIs respetando el aislamiento de entornos: en local intenta primero el archivo
 * semilla (si existe y no está vacío); si no, usa el archivo estándar y falla si la respuesta no es OK.
 *
 * @param {{
 *   fetchFn: (url: string) => Promise<{ok: boolean, json: () => Promise<any>}>,
 *   isLocal: boolean,
 *   now?: () => number,
 *   logger?: {log: Function, warn: Function}
 * }} deps
 * @returns {Promise<object>}
 */
export async function fetchKpiOperativosData({ fetchFn, isLocal, now = () => new Date().getTime(), logger = console }) {
    if (isLocal) {
        try {
            const seedResp = await fetchFn(KPI_OPERATIVOS_SEED_FILE + '?v=' + now());
            if (seedResp.ok) {
                const seedData = await seedResp.json();
                if (seedData && Object.keys(seedData).length > 0) {
                    logger.log('[Laboratorio Local] Datos semilla cargados con éxito desde kpi_operativos_seed.json');
                    return seedData;
                }
            }
        } catch (e) {
            logger.warn('[Laboratorio Local] kpi_operativos_seed.json no disponible, usando archivo estándar', e);
        }
    }

    const response = await fetchFn(KPI_OPERATIVOS_DATA_FILE + '?v=' + now());
    if (!response.ok) throw new Error('No se pudo cargar kpi_operativos_v2.json');
    return await response.json();
}
