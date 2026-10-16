/**
 * Normalizador del oráculo ORIGINAL para la diferencia intencional de la delegación (W-50, y desde el paso 3.4 W-54 b).
 *
 * Los originales marcan los botones con `onclick="fn(...)"` y la versión nueva usa `data-action` + `data-*` (un listener
 * delegado en el documento, sin inline scripts, CSP). Este módulo conserva la API de W-50 y delega en el normalizador
 * general (legacy-action-migration.mjs), que reescribe TODOS los manejadores migrados del lado original con la misma
 * correspondencia. Así las pruebas diferenciales siguen comparando el resto del HTML byte a byte. La conducta de cada
 * acción se prueba aparte (ui/action-delegation.test.mjs, ui/action-registry.test.mjs).
 */
import { legacyActionsToDelegated, normalizeLegacyActions } from './legacy-action-migration.mjs';

/**
 * @param {string} text HTML original
 * @returns {string} HTML con los manejadores en su forma delegada
 */
export function legacyApproveToDelegated(text) {
    return legacyActionsToDelegated(text);
}

/**
 * Aplica el normalizador a cada cadena de un valor (cadena, arreglo u objeto anidado).
 *
 * @param {unknown} value
 * @returns {unknown}
 */
export function normalizeLegacyHtml(value) {
    return normalizeLegacyActions(value);
}
