/**
 * Presencia de usuario y monitoreo en vivo sobre Firebase Realtime Database
 * (app.js 8654-8687: `setupUserPresence()` y `startMonitoringPresence()`). La base y el valor de marca de
 * tiempo del servidor se INYECTAN.
 *
 * Fidelidad: igual que `app.js`, al conectarse registra `onDisconnect().update({status:'offline', lastHeartbeat})`
 * y, cuando se confirma, escribe `status:'online'` + `lastHeartbeat` en `active_sessions/{uid}`.
 *
 * Hallazgos (ver informe): (1) en `app.js` ninguna de las dos funciones se invoca (solo se exponen en `window`);
 * es código muerto. (2) Si se activara, `status` pasaría a 'online'/'offline', vocabulario que NO entienden las
 * vistas de Monitoreo (que usan 'En Línea', 'En Almuerzo', 'En Pausa de Turno'...) y pisaría "En Pausa de Turno"
 * en cada reconexión. (3) `onDisconnect().update` volvería a CREAR `active_sessions/{uid}` (sesión fantasma
 * solo con status/lastHeartbeat) después de que `handleEndShift()` la borra, salvo que se cancele el
 * onDisconnect al cerrar el turno. (4) El `.then` no tiene `.catch`: si la base rechaza, queda una promesa
 * sin atender; `onError` (opcional) lo cubre.
 *
 * ---- ESTADO: INACTIVO (DECISIÓN D6 del responsable, plan maestro §4 ter) ----
 * "Rediseñar y mantener inactivo; mientras tanto debe quedar AISLADO para que no abra conexiones ni consuma
 * cuota de Realtime Database." Por eso el servicio nace APAGADO: con `enabled` distinto de `true` (el
 * predeterminado) `setupUserPresence` y `startMonitoringPresence` son NO-OP: no llaman a `database.ref`, no
 * registran `on('value')`, no escriben (`update`) ni programan `onDisconnect`, y devuelven `undefined` (igual
 * que el original sin base). La propiedad `enabled` del servicio indica en qué modo quedó.
 *
 * Para REACTIVARLO (tarea futura con diseño propio; no basta con pasar `enabled: true`):
 *  1. Diseño del vocabulario: Monitoreo entiende 'En Línea', 'En Almuerzo', 'En Desayuno', 'En Pausa de Turno',
 *     'Inactivo'...; escribir 'online'/'offline' pisa esos estados (hallazgo 2). Definir qué campo se usa
 *     (p. ej. uno propio de conectividad en vez de `status`).
 *  2. Cancelar el `onDisconnect` al cerrar el turno (`handleEndShift`) para no recrear sesiones fantasma
 *     (hallazgo 3), y tratar el error de la escritura (`onError`).
 *  3. Reglas: revisar en `database.rules.json` que `active_sessions/{uid}` admita exactamente esas escrituras
 *     (incluida la de `onDisconnect`) y medir el costo de cuota de mantener `.info/connected` + el listener de
 *     `active_sessions` completo por cada cliente.
 *  4. Conectar desde un flujo real (hoy app.js NO lo invoca: solo `window.setupUserPresence`), pasar
 *     `enabled: true` de forma explícita y actualizar `presence-and-counter.test.mjs` y el e2e de comunicados.
 * El comportamiento original sigue cubierto por las pruebas diferenciales con `enabled: true`.
 *
 * @param {{
 *   database: {ref: (path: string) => any}|null|undefined,
 *   serverTimestamp: unknown,                   // firebase.database.ServerValue.TIMESTAMP
 *   onSessionsChanged?: () => void,             // p. ej. renderActiveSessionsDashboard
 *   onError?: (error: unknown) => void,
 *   enabled?: boolean                           // D6: SOLO `true` lo activa; por defecto `false` (no-op)
 * }} deps
 */

/** D6: la presencia está INACTIVA por defecto (aislada: sin conexiones ni cuota de Realtime Database). */
export const PRESENCE_ENABLED_BY_DEFAULT = false;

export function createPresenceService({ database, serverTimestamp, onSessionsChanged, onError, enabled = PRESENCE_ENABLED_BY_DEFAULT }) {
    const active = enabled === true;

    return {
        /** `true` solo si se pasó `enabled: true` explícito. */
        enabled: active,

        /**
         * @param {string} uid
         * @returns {(() => void)|undefined} función para dejar de escuchar `.info/connected` (`undefined` si está inactivo)
         */
        setupUserPresence(uid) {
            if (!active) return undefined; // D6: inactivo -> no-op (no toca la base)
            if (!uid || !database) return undefined;

            const connectedRef = database.ref('.info/connected');
            const userSessionRef = database.ref(`active_sessions/${uid}`);
            const handler = (snap) => {
                if (snap.val() === true) {
                    const chain = userSessionRef.onDisconnect().update({
                        status: 'offline',
                        lastHeartbeat: serverTimestamp
                    }).then(() => userSessionRef.update({
                        status: 'online',
                        lastHeartbeat: serverTimestamp
                    }));

                    if (onError) chain.catch(onError);
                }
            };

            connectedRef.on('value', handler);

            return () => {
                if (typeof connectedRef.off === 'function') connectedRef.off('value', handler);
            };
        },

        /** @returns {(() => void)|undefined} función para dejar de escuchar `active_sessions` (`undefined` si está inactivo) */
        startMonitoringPresence() {
            if (!active) return undefined; // D6: inactivo -> no-op (no toca la base)
            if (!database) return undefined;

            const ref = database.ref('active_sessions');
            const handler = () => {
                if (typeof onSessionsChanged === 'function') {
                    onSessionsChanged();
                }
            };

            ref.on('value', handler);

            return () => {
                if (typeof ref.off === 'function') ref.off('value', handler);
            };
        }
    };
}
