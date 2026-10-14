/**
 * Reloj en vivo del encabezado (`updateClock()`, app.js 1322-1333).
 *
 * La parte con efectos (buscar `#liveClock`, escribir `textContent`, `setInterval`) queda en el
 * controlador; aquí solo vive el formato HH:MM:SS, que recibe la fecha por parámetro para poder
 * probarse sin depender del reloj del sistema.
 */

/**
 * Formatea una fecha como `HH:MM:SS` (24 horas, hora local, con ceros a la izquierda).
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatClockTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}
