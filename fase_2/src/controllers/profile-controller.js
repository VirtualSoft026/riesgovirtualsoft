/**
 * Controlador del modal de perfil: abrir, mostrar/ocultar la contraseña y cambiarla.
 *
 * Reemplaza, de `app.js`: `openProfileModal()` (4900), `toggleProfilePassword()` (4921) y `changePassword()`
 * (4934). La autenticación (`firebase.auth().currentUser`) se INYECTA con `getAuthUser`; las reglas y los
 * textos están en `domain/auth/auth-service.js`.
 *
 * SEGURIDAD: la contraseña nueva solo se lee del campo y se pasa a `updatePassword`; nunca se guarda,
 * se muestra en mensajes ni se registra. Solo se registra el objeto de error de Firebase (que no la contiene).
 */

import {
    PASSWORD_MESSAGES,
    PASSWORD_TONE,
    PASSWORD_TONE_COLOR,
    isPasswordInputAcceptable,
    changeUserPassword
} from '../domain/auth/auth-service.js';

/**
 * @param {{
 *   document: any,
 *   getUser: () => (object|null),
 *   getAuthUser: () => ({updatePassword: (p: string) => Promise<unknown>}|null|undefined),
 *   closeModal: (id: string) => void,
 *   setTimeout?: (fn: Function, ms: number) => unknown,
 *   logger?: {error: Function}
 * }} deps
 */
export function createProfileController(deps) {
    const {
        document, getUser, getAuthUser, closeModal,
        setTimeout: schedule = (fn, ms) => setTimeout(fn, ms), logger = console
    } = deps;

    /** app.js 4900-4919 */
    function openProfileModal() {
        const avatarEl = document.querySelector('.user-profile .avatar');
        const modalImg = document.getElementById('modalProfileAvatar');
        if (avatarEl && modalImg) {
            modalImg.src = avatarEl.src;
        }

        const currentUser = getUser();
        if (currentUser) {
            const modalName = document.getElementById('modalProfileName');
            if (modalName) modalName.textContent = currentUser.name || 'Usuario';

            const modalRole = document.getElementById('modalProfileRole');
            if (modalRole) modalRole.textContent = currentUser.role || 'Rol';
        }

        document.getElementById('profileModal').classList.add('active');
        document.getElementById('newPasswordInput').value = '';
        const msg = document.getElementById('passwordChangeMsg');
        if (msg) msg.style.display = 'none';
    }

    /** app.js 4921-4932 */
    function toggleProfilePassword(iconElement) {
        const input = document.getElementById('newPasswordInput');
        if (input.type === 'password') {
            input.type = 'text';
            iconElement.classList.remove('bx-show');
            iconElement.classList.add('bx-hide');
        } else {
            input.type = 'password';
            iconElement.classList.remove('bx-hide');
            iconElement.classList.add('bx-show');
        }
    }

    function showMessage(msg, text, tone) {
        msg.textContent = text;
        msg.style.color = PASSWORD_TONE_COLOR[tone];
        msg.style.display = 'block';
    }

    /** app.js 4934-4972 */
    async function changePassword() {
        const newPass = document.getElementById('newPasswordInput').value;
        const msg = document.getElementById('passwordChangeMsg');

        if (!isPasswordInputAcceptable(newPass)) {
            showMessage(msg, PASSWORD_MESSAGES.EMPTY, PASSWORD_TONE.DANGER);
            return;
        }

        showMessage(msg, PASSWORD_MESSAGES.PENDING, PASSWORD_TONE.NEUTRAL);

        const result = await changeUserPassword({ newPassword: newPass, getAuthUser });

        msg.textContent = result.message;
        msg.style.color = PASSWORD_TONE_COLOR[result.tone];

        if (result.closeModalAfterMs !== null) {
            schedule(() => closeModal('profileModal'), result.closeModalAfterMs);
        }

        if (result.status === 'error') {
            logger.error('Error al actualizar la contraseña:', result.error);
        }

        return result.status;
    }

    return { openProfileModal, toggleProfilePassword, changePassword };
}
