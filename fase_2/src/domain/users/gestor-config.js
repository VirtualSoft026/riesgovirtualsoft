/**
 * Configuración de gestores (vista de Admin "Configuración de Gestores", app.js 6757-6834): tabla con el
 * interruptor de la Pausa de Turno, que es el ORIGEN del flag `users/{uid}/hasSplitShift` que gobierna el
 * botón "Pausa de Turno" del gestor (reglas RN-1..RN-3, plan maestro §4 bis).
 *
 * Todo lo de este archivo es PURO (sin DOM, Firebase ni `Date.now()`); los efectos viven en
 * `controllers/config-gestores-controller.js` y `services/firebase/firebase-config-repository.js`.
 *
 * ---- Quién puede escribir `users/{uid}/hasSplitShift` (verificado en `database.rules.json`, solo lectura) ----
 * El nodo `users/$uid` tiene un `.write` que se hereda a todos sus hijos (`hasSplitShift` no tiene regla
 * propia ni `.validate`):
 *
 *   auth != null && (
 *       (users/{auth.uid}/approved === true && users/{auth.uid}/role === 'Admin')      // 1. Admin aprobado
 *    || (auth.uid === $uid && !data.exists() && newData.exists())                      // 2. alta propia
 *   )
 *
 * Es decir: SOLO un Admin aprobado puede cambiar el flag de un usuario existente. Un Supervisor no puede
 * (su botón no existe: la vista y el menú son solo de Admin, app.js 5092) y un Gestor tampoco. La rama 2 es
 * una brecha de reglas documentada en el informe: un usuario cuyo nodo AÚN NO existe puede crear su propio
 * nodo con `hasSplitShift: true` porque ese campo no se valida (a diferencia de `role`, `approved`,
 * `email` y `status`). `canWriteHasSplitShift` reproduce ambas ramas para que una prueba la detecte si
 * las reglas cambian.
 */

import { encodeInlineHandlerArg, escapeHTML } from '../../utils/sanitization.js';
import { isSplitShiftEnabled } from '../shifts/split-shift-policy.js';

export const SPLIT_SHIFT_FIELD = 'hasSplitShift';

export const EMPTY_GESTORES_ROW_HTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay gestores registrados.</td></tr>';
export const ERROR_GESTORES_ROW_HTML = '<tr><td colspan="3" style="text-align: center; color: var(--danger); padding: 20px;">Error al cargar datos.</td></tr>';
export const GESTOR_ROW_BORDER = '1px solid rgba(255,255,255,0.05)';
export const SPLIT_SHIFT_SAVE_ERROR = 'Hubo un error al guardar. Intenta de nuevo.';

/**
 * Solo el Admin ve y usa la configuración de la Pausa de Turno (menú `navConfigGestores`, app.js 5092).
 *
 * @param {{role?: string}|null|undefined} user
 * @returns {boolean}
 */
export function canUseSplitShiftConfig(user) {
    return Boolean(user) && user.role === 'Admin';
}

/**
 * Reproduce el `.write` de `users/$uid` de `database.rules.json` para el campo `hasSplitShift`.
 *
 * @param {{
 *   actor: {uid?: string, role?: string, approved?: unknown}|null|undefined, // quien escribe (auth + su nodo users)
 *   targetUid: string,                                                         // usuario cuyo flag se cambia
 *   targetExists: boolean,                                                     // ¿ya existe users/{targetUid}?
 *   newValue: unknown
 * }} args
 * @returns {boolean}
 */
export function canWriteHasSplitShift({ actor, targetUid, targetExists, newValue }) {
    if (!actor || !actor.uid) return false;

    const isApprovedAdmin = actor.approved === true && actor.role === 'Admin';
    const isOwnCreation = actor.uid === targetUid && targetExists === false && newValue !== null && newValue !== undefined;

    return isApprovedAdmin || isOwnCreation;
}

/**
 * El flag cuenta solo si es el booleano `true` (contrato estricto, igual que `isSplitShiftEnabled`).
 *
 * @param {{hasSplitShift?: unknown}} user
 * @returns {boolean}
 */
export function hasSplitShiftEnabled(user) {
    return isSplitShiftEnabled(user);
}

/**
 * Texto de la confirmación al mover el interruptor (app.js 6824).
 *
 * @param {boolean} isChecked
 * @returns {string}
 */
export function buildSplitShiftConfirmMessage(isChecked) {
    return `¿Estás segura de que quieres ${isChecked ? 'habilitar' : 'deshabilitar'} la Pausa de Turno para este usuario?`;
}

/**
 * ¿Aparece en la tabla? Solo Gestores con correo que no sea de pruebas (app.js 6773).
 *
 * @param {{role?: string, email?: string}} user
 * @returns {boolean}
 */
export function isConfigGestorCandidate(user) {
    return Boolean(user.role === 'Gestor' && user.email && !user.email.toLowerCase().includes('pruebas'));
}

/**
 * Gestores a listar: filtra, deduplica por correo (gana el de `loginTime` más reciente; sin duplicado
 * gana el primero) y ordena alfabéticamente por nombre (app.js 6766-6797).
 *
 * @param {Array<{key: string, value: object}>} entries hijos de `users` (`snap.forEach`)
 * @returns {Array<object>} copias de cada usuario con `uid` = clave
 */
export function selectConfigGestores(entries) {
    const usersMap = new Map();

    entries.forEach(({ key, value }) => {
        const u = { ...value };

        // Mostrar solo Gestores (excluir Supervisores como Sara y Camilo)
        if (isConfigGestorCandidate(u)) {
            const email = u.email.toLowerCase();

            // Si hay duplicados, preferimos el que tenga loginTime mas reciente o simplemente guardamos uno
            if (!usersMap.has(email) || (u.loginTime && (!usersMap.get(email).loginTime || new Date(u.loginTime) > new Date(usersMap.get(email).loginTime)))) {
                u.uid = key;
                usersMap.set(email, u);
            }
        }
    });

    const users = Array.from(usersMap.values());

    // Ordenar alfabéticamente
    users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return users;
}

/**
 * Contenido (HTML) de la fila de un gestor (app.js 6803-6820).
 *
 * DECISIÓN D2 (plan maestro §4 ter): sanear. Con `escapeUserFields: true` (PREDETERMINADO) el nombre, el rol y el
 * correo se escapan con `escapeHTML` antes de inyectarse, y el uid (clave de Firebase) se escapa en los atributos
 * `id`/`for`/`name` y se codifica con `encodeInlineHandlerArg` + `decodeURIComponent` dentro del `onchange` (el
 * mismo patrón que ya usan los comunicados), de modo que ninguna comilla de un dato rompa el atributo. Para un uid
 * alfanumérico (los de Firebase Auth) el valor que recibe `toggleGestorSplitShift` es exactamente el mismo.
 *
 * `escapeUserFields: false` reproduce la plantilla ORIGINAL de app.js (nombre/rol/correo SIN escapar: stored XSS,
 * el usuario escribe su propio nombre al registrarse y el Admin lo vería ejecutarse). Solo existe para la prueba
 * diferencial contra la copia literal; no lo use código nuevo.
 *
 * @param {{uid: string, name?: string, role?: string, email?: string, hasSplitShift?: unknown}} u
 * @param {{escapeUserFields?: boolean}} [options]
 * @returns {string}
 */
export function buildGestorConfigRowHtml(u, { escapeUserFields = true } = {}) {
    const hasSplitShift = u.hasSplitShift === true;
    const name = escapeUserFields ? escapeHTML(u.name || 'Desconocido') : (u.name || 'Desconocido');
    const role = escapeUserFields ? escapeHTML(u.role) : u.role;
    const email = escapeUserFields ? escapeHTML(u.email) : u.email;
    const uidAttr = escapeUserFields ? escapeHTML(u.uid) : u.uid;
    const uidArg = escapeUserFields ? `decodeURIComponent('${encodeInlineHandlerArg(u.uid)}')` : `'${u.uid}'`;

    return `
                <td style="padding: 15px; display: flex; align-items: center; gap: 10px;">
                    <div style="width: 30px; height: 30px; background: var(--glass-border); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--accent-primary);"><i class='bx bx-user'></i></div>
                    <div>
                        <div style="font-weight: 500; color: var(--text-primary);">${name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">${role}</div>
                    </div>
                </td>
                <td style="padding: 15px; color: var(--text-secondary); font-size: 13px;">${email}</td>
                <td style="padding: 15px; text-align: center;">
                    <label for="splitShiftToggle_${uidAttr}" class="switch" style="position: relative; display: inline-block; width: 44px; height: 22px;">
                        <input type="checkbox" id="splitShiftToggle_${uidAttr}" name="splitShiftToggle_${uidAttr}" aria-label="Turno Partido para ${escapeHTML(u.name || 'Gestor')}" onchange="toggleGestorSplitShift(${uidArg}, this.checked)" ${hasSplitShift ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                        <span class="slider round" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${hasSplitShift ? 'var(--success)' : 'var(--glass-border)'}; transition: .4s; border-radius: 22px;">
                            <span style="position: absolute; height: 16px; width: 16px; left: ${hasSplitShift ? '24px' : '3px'}; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%;"></span>
                        </span>
                    </label>
                </td>
            `;
}
