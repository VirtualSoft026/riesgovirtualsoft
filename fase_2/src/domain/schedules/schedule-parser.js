/**
 * Clasificación de turnos a partir del texto crudo que viene del Excel de
 * cronograma (columna de horario) o de la sesión activa en Firebase.
 *
 * Puerto 1:1 de `getShiftCategory()` en `app.js` (línea 772). No cambia
 * ninguna regla: se migra literal, incluida la ambigüedad de los rangos de
 * hora que caen fuera de las tres franjas con nombre propio (devuelve
 * "Noche" para cualquier hora de inicio que no sea Mañana/Tarde, en vez de
 * devolver "" como podría esperarse de un turno sin clasificar).
 */

/**
 * Clasifica un texto de turno en una de las categorías usadas en toda la
 * aplicación: "Mañana", "Tarde", "Noche", "Master", o "" si no se reconoce.
 *
 * Primero busca las palabras clave de categoría (coincidencia por
 * substring, no por palabra completa — así "Master" también matchea un
 * texto como "Turno Master 2"). Si no hay palabra clave, intenta parsear un
 * rango de horas con el formato `"8am - 4pm"` y clasifica según la hora de
 * inicio.
 *
 * @param {string} shiftText Texto crudo del turno (p. ej. "Mañana",
 *   "8am - 4pm", "Descansa").
 * @returns {string} Una de "Mañana" | "Tarde" | "Noche" | "Master" | "".
 */
export function getShiftCategory(shiftText) {
    if (!shiftText) return '';
    const clean = String(shiftText).trim().toLowerCase();

    // Coincidencias exactas o parciales de categoría.
    if (clean.includes('manana') || clean.includes('mañana')) return 'Mañana';
    if (clean.includes('tarde')) return 'Tarde';
    if (clean.includes('noche')) return 'Noche';
    if (clean.includes('master')) return 'Master';

    // Parsear rangos de hora (p. ej. "8am - 4pm", "3pm - 11pm", "10pm - 6am").
    // Toma solo la hora de inicio.
    const match = clean.match(/^(\d+)\s*(am|pm)/i);
    if (match) {
        let hour = parseInt(match[1], 10);
        const ampm = match[2].toLowerCase();
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;

        // Clasificación por hora de inicio (regla original de app.js, sin
        // cambios): 6-14 Mañana, 14-22 Tarde, cualquier otra hora Noche.
        if (hour >= 6 && hour < 14) return 'Mañana';
        if (hour >= 14 && hour < 22) return 'Tarde';
        return 'Noche';
    }

    return '';
}
