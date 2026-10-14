/**
 * Reglas puras que `initApp()` (app.js 2722-3500) mezcla con su orquestación: avatar del usuario, tema
 * claro/oscuro y el código del Web Worker del latido. Lo demás de `initApp()` (listeners de navegación,
 * paneles de Admin/Supervisor, formulario de permisos, etc.) es orquestación con DOM y se queda en
 * `app.js` (ver informe).
 */

/** Imágenes de avatar disponibles en `assets/src/img/` (app.js 2792-2808). */
export const AVAILABLE_AVATARS = Object.freeze([
    'Alexander Villada.png',
    'Camilo Espinosa.png',
    'Daniel Benavides.png',
    'Josue Alvarez.png',
    'Juan Jose Diaz.png',
    'Luis Fuentes.png',
    'Maria Sanchez.png',
    'Marilyn Jimenez.png',
    'Oriana Borja.png',
    'Samuel Cruz.png',
    'Sara Santamaria.png',
    'Sebastian Arango.png',
    'Sebastian Hincapie.png',
    'Yefferson Giraldo.png'
]);

/**
 * Archivo de avatar que corresponde al nombre completo (app.js 2812): primera imagen cuyo nombre (sin
 * `.png`) coincide con `namesMatch`.
 *
 * @param {string} fullName ya sin espacios sobrantes
 * @param {(a: string, b: string) => boolean} namesMatch
 * @param {readonly string[]} [avatars]
 * @returns {string|undefined}
 */
export function findAvatarFile(fullName, namesMatch, avatars = AVAILABLE_AVATARS) {
    return avatars.find((img) => namesMatch(fullName, img.replace('.png', '')));
}

/**
 * URL del avatar de respaldo generado por nombre (app.js 2822, 2828).
 *
 * @param {string} fullName
 * @returns {string}
 */
export function buildFallbackAvatarUrl(fullName) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
}

/**
 * Fuente del avatar: la imagen local si hay coincidencia; si no, el avatar generado (app.js 2815-2829).
 *
 * @param {string|undefined} matchedAvatar
 * @param {string} fullName
 * @returns {string}
 */
export function buildAvatarSrc(matchedAvatar, fullName) {
    return matchedAvatar ? `assets/src/img/${matchedAvatar}` : buildFallbackAvatarUrl(fullName);
}

/**
 * Tema guardado o "dark" por defecto (app.js 2769).
 *
 * @param {string|null|undefined} stored
 * @returns {string}
 */
export function resolveSavedTheme(stored) {
    return stored || 'dark';
}

/**
 * Tema al pulsar el botón de tema (app.js 2775-2776).
 *
 * @param {string|null} currentTheme
 * @returns {'dark'|'light'}
 */
export function nextTheme(currentTheme) {
    return currentTheme === 'dark' ? 'light' : 'dark';
}

/**
 * Ícono del botón de tema (app.js 2771, 2779).
 *
 * @param {string} theme
 * @returns {string}
 */
export function themeIconHTML(theme) {
    return theme === 'dark' ? "<i class='bx bx-moon'></i>" : "<i class='bx bx-sun'></i>";
}

/** Intervalo del ping del Web Worker (app.js 2840): 30 s. */
export const PING_INTERVAL_MS = 30000;

/**
 * Código del Web Worker que emite 'ping' cada 30 s sin ser frenado por Chrome en pestañas en segundo
 * plano (app.js 2836-2845). Texto idéntico al original (incluida su sangría).
 *
 * @returns {string}
 */
export function buildPingWorkerCode() {
    return `
                setInterval(() => {
                    postMessage('ping');
                }, 30000);
            `;
}
