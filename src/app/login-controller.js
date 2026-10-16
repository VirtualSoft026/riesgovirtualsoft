/**
 * Controlador de la página de inicio de sesión (paso 3.4: W-29 y DE-3 = a; W-54 (b) y (c)).
 *
 * Sustituye a `login.js` y al script en línea de `login.html`. Toda la lógica de acceso sale de
 * `domain/auth/auth-service.js` (`evaluateLoginAccess`, `validateRegistrationInput`, `normalizeRegistrationRole`)
 * y del turno (`evaluateShiftExpiration`, `findShiftStringForUser`). Aquí solo quedan el DOM, Firebase y el
 * almacenamiento, que llegan por parámetro.
 *
 * Correcciones frente a login.js (W-29):
 *  - Un usuario rechazado ya no provoca `ReferenceError` (`escapeHTML` no existía): el motivo se escribe como texto.
 *  - El rechazo se decide con `approved === 'Rechazado'` (y `rejected === true`), igual que el resto del sistema.
 *  - Todo el texto del usuario entra con `textContent`, nunca como HTML.
 *
 * Los mensajes son los mismos de login.js, salvo que se indique lo contrario en `LOGIN_MESSAGES`.
 */

import { bindActionDelegation } from '../utils/action-delegation.js';
import { SESSION_STORAGE_KEYS } from './session.js';
import {
    evaluateLoginAccess,
    LOGIN_ACCESS,
    normalizeRegistrationRole,
    validateRegistrationInput
} from '../domain/auth/auth-service.js';
import { evaluateShiftExpiration } from '../domain/auth/shift-expiration.js';
import { findShiftStringForUser } from '../domain/auth/login-shift-lookup.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import { ROLES } from '../config/roles.js';

/** Paneles de la página (ids del HTML). */
export const LOGIN_PANELS = Object.freeze({
    LOGIN: 'loginPanel',
    REGISTER: 'registerPanel',
    FORGOT: 'forgotPanel'
});

/** Acción delegada de los enlaces que cambian de panel (W-54 (b): sin `onclick` en línea). */
export const SWITCH_PANEL_ACTION = 'switch-panel';

/** Sitio de envío de notificaciones al supervisor (FormSubmit). Mismo destino que login.js. */
export const SUPERVISOR_NOTIFY_ACTION = 'https://formsubmit.co/maria.sanchez@virtualsoft.tech';

/** Retardo antes de volver al login tras un registro correcto (ms). */
export const REGISTER_REDIRECT_DELAY_MS = 2000;

/** Mensajes de la página. */
export const LOGIN_MESSAGES = Object.freeze({
    FILE_PROTOCOL: '¡ATENCIÓN! Estás abriendo la plataforma directamente como un archivo local (file:///).\n\nPor seguridad, el sistema de envío de correos (FormSubmit) bloquea estos envíos.\nDebes abrir la plataforma usando un servidor web local (ej. http://localhost:8080).',
    BROWSER_BLOCKED: 'Navegador no compatible',
    INVALID_CREDENTIALS: 'Correo o contraseña incorrectos. Si no tienes cuenta, regístrate.',
    INVALID_EMAIL: 'El correo no tiene un formato válido.',
    USER_DISABLED: 'Esta cuenta ha sido inhabilitada.',
    PENDING: 'Tu cuenta está pendiente de aprobación por un supervisor.',
    SHIFT_ENDED: 'Su turno ha finalizado',
    REJECTED: 'Tu solicitud de cuenta ha sido rechazada.',
    REJECTION_REASON_PREFIX: 'Motivo: ',
    REJECTION_REASON_DEFAULT: 'No especificado',
    REGISTER_SUCCESS: '¡Cuenta creada exitosamente! Redirigiendo al login...',
    REGISTER_ERROR: 'Error al crear la cuenta. Inténtalo de nuevo.',
    EMAIL_IN_USE: 'Este correo ya está registrado.',
    WEAK_PASSWORD: 'La contraseña debe tener al menos 6 caracteres.',
    RESET_INVALID_EMAIL: 'El correo ingresado no tiene un formato válido.',
    RESET_SENT: (email) => `Si el correo '${email}' está registrado en la plataforma, recibirás un enlace de restablecimiento en unos instantes. Revisa tu bandeja de entrada o spam.`
});

/**
 * ¿El navegador es Chrome (y no Edge u Opera)? Misma regla que el bloqueo de login.html.
 *
 * @param {string} userAgent
 * @returns {boolean}
 */
export function isChromeUserAgent(userAgent) {
    const ua = String(userAgent || '');

    return /Chrome|CriOS/i.test(ua) && !/Edg|OPR/i.test(ua);
}

/**
 * Muestra un panel de autenticación y limpia formularios y errores (el mismo efecto que `switchPanel` de login.js).
 *
 * @param {{querySelectorAll: Function, getElementById: Function}} doc
 * @param {string} panelId
 */
export function switchLoginPanel(doc, panelId) {
    doc.querySelectorAll('.auth-panel').forEach((panel) => {
        panel.style.display = 'none';
    });
    doc.getElementById(panelId).style.display = 'block';

    doc.querySelectorAll('.login-form').forEach((form) => form.reset());
    doc.querySelectorAll('.login-error-msg').forEach((msg) => {
        msg.style.display = 'none';
        msg.textContent = '';
    });
}

/**
 * Crea el controlador de la página. Todas las dependencias del entorno se inyectan.
 *
 * @param {{
 *   doc: any,                                   documento
 *   win: {location: {href: string, protocol: string}, navigator?: {userAgent: string}},
 *   auth: {signInWithEmailAndPassword: Function, createUserWithEmailAndPassword: Function,
 *          sendPasswordResetEmail: Function, signOut: Function},
 *   database: {ref: (path: string) => any},
 *   storage: {getItem: Function, setItem: Function, removeItem: Function},
 *   alert?: (message: string) => void,
 *   now?: () => Date,
 *   logger?: {error: Function, warn: Function},
 *   loadShiftRows?: () => Promise<unknown[][]|null>,   filas del Excel de horarios, o null si no hay
 *   notifySupervisor?: (fields: Record<string, string>) => void,
 *   setTimer?: (fn: () => void, ms: number) => unknown
 * }} deps
 * @returns {{init: () => () => void, handleLogin: Function, handleRegister: Function, handleForgot: Function}}
 */
export function createLoginController({
    doc,
    win,
    auth,
    database,
    storage,
    alert = () => {},
    now = () => new Date(),
    logger = console,
    loadShiftRows = async () => null,
    notifySupervisor = () => {},
    setTimer = (fn, ms) => setTimeout(fn, ms)
}) {
    // ------------------------------------------------------------------------------------------
    // Ayudantes del DOM
    // ------------------------------------------------------------------------------------------

    function showError(element, text) {
        element.textContent = text;
        element.style.display = 'block';
    }

    function hideError(element) {
        element.style.display = 'none';
    }

    /** Pone el botón en estado «cargando» y devuelve la función que lo restaura. */
    function setBusy(button, loadingHtml) {
        const previous = button.innerHTML;
        button.innerHTML = loadingHtml;
        button.disabled = true;

        return () => {
            button.innerHTML = previous;
            button.disabled = false;
        };
    }

    function clearSessionKeys() {
        SESSION_STORAGE_KEYS.forEach((key) => {
            try {
                storage.removeItem(key);
            } catch (error) {
                // Almacenamiento no disponible: nada que borrar.
            }
        });
    }

    // ------------------------------------------------------------------------------------------
    // Turno: ¿el turno del Gestor ya finalizó hoy? (solo Gestor; Admin y Supervisor no tienen turno)
    // ------------------------------------------------------------------------------------------

    async function isShiftExpiredForUser(dbUser) {
        if (!dbUser || dbUser.role === ROLES.ADMIN || dbUser.role === ROLES.SUPERVISOR) return false;

        try {
            const rows = await loadShiftRows();
            if (!rows) return false;

            const current = now();
            const shiftStr = findShiftStringForUser(rows, dbUser.name, current);

            return evaluateShiftExpiration(shiftStr, current).expired === true;
        } catch (error) {
            logger.error('Error validando horario de turno en login:', error);

            return false;
        }
    }

    // ------------------------------------------------------------------------------------------
    // Inicio de sesión
    // ------------------------------------------------------------------------------------------

    /** Hora de inicio de sesión a conservar: la del reporte o la de la sesión activa, si son de hoy. */
    async function recoverLoginTime(uid, today) {
        try {
            const reportSnap = await database.ref(`reports_${today.key}/${uid}`).once('value');
            if (reportSnap.exists() && reportSnap.val().loginTime) return reportSnap.val().loginTime;

            const sessionSnap = await database.ref(`active_sessions/${uid}`).once('value');
            if (sessionSnap.exists() && sessionSnap.val().loginTime) {
                const sessionTime = new Date(sessionSnap.val().loginTime);
                if (sessionTime.getDate() === today.date.getDate() && sessionTime.getMonth() === today.date.getMonth()) {
                    return sessionSnap.val().loginTime;
                }
            }
        } catch (error) {
            logger.error('Error recuperando hora de inicio anterior', error);
        }

        return null;
    }

    function todayInfo() {
        const date = now();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');

        return { date, key: `${yyyy}-${mm}-${dd}` };
    }

    /**
     * Flujo completo de inicio de sesión. Devuelve el mensaje mostrado, o '' si entra y se redirige.
     * Expuesto para pruebas; el formulario lo usa a través de `init()`.
     *
     * @param {string} email
     * @param {string} password
     * @param {{loginError: any, button: any}} view
     * @returns {Promise<string>}
     */
    async function handleLogin(email, password, view) {
        const { loginError, button } = view;
        hideError(loginError);
        const restore = setBusy(button, "<i class='bx bx-loader-alt bx-spin'></i> Entrando...");

        try {
            const credential = await auth.signInWithEmailAndPassword(email, password);
            const uid = credential.user.uid;

            const snapshot = await database.ref(`users/${uid}`).once('value');
            const dbUser = snapshot.val();
            if (!dbUser) throw { code: 'user-data-missing' };

            let access = evaluateLoginAccess(dbUser, false);

            if (access.status === LOGIN_ACCESS.REJECTED) {
                showRejection(loginError, dbUser.rejectionReason);
                await auth.signOut();

                return LOGIN_MESSAGES.REJECTED;
            }

            if (access.status === LOGIN_ACCESS.PENDING) {
                showError(loginError, LOGIN_MESSAGES.PENDING);
                await auth.signOut();

                return LOGIN_MESSAGES.PENDING;
            }

            // Solo se consulta el turno si la cuenta está aprobada (como en login.js).
            const shiftExpired = await isShiftExpiredForUser(dbUser);
            access = evaluateLoginAccess(dbUser, shiftExpired);

            if (access.status === LOGIN_ACCESS.SHIFT_EXPIRED) {
                showError(loginError, LOGIN_MESSAGES.SHIFT_ENDED);
                await auth.signOut();
                clearSessionKeys();

                return LOGIN_MESSAGES.SHIFT_ENDED;
            }

            const today = todayInfo();
            const recovered = await recoverLoginTime(uid, today);
            const finalLoginTime = recovered || now().toISOString();

            const sessionData = {
                name: dbUser.name,
                email: dbUser.email,
                shift: dbUser.shift || 'Por Asignar',
                role: dbUser.role || ROLES.GESTOR,
                loginTime: finalLoginTime,
                uid
            };

            // El registro de acceso y la sesión local van juntos: si falla el registro, no se guarda la sesión
            // (comportamiento de login.js que se conserva; ver el informe, sección 4).
            try {
                const logRef = database.ref('login_logs').push();
                await logRef.set({
                    uid,
                    name: dbUser.name,
                    role: dbUser.role || ROLES.GESTOR,
                    email: dbUser.email,
                    timestamp: Date.now(),
                    logoutTime: null
                });

                sessionData.loginLogId = logRef.key;
                storage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(sessionData));
            } catch (errorLog) {
                logger.error('Error saving login log:', errorLog);
            }

            win.location.href = 'index.html';

            return '';
        } catch (error) {
            logger.error('Error al iniciar sesión:', error);

            let message = LOGIN_MESSAGES.INVALID_CREDENTIALS;
            if (error && error.code === 'auth/invalid-email') message = LOGIN_MESSAGES.INVALID_EMAIL;
            else if (error && error.code === 'auth/user-disabled') message = LOGIN_MESSAGES.USER_DISABLED;

            showError(loginError, message);

            return message;
        } finally {
            restore();
        }
    }

    /** Muestra el rechazo con el motivo como texto (nunca como HTML). */
    function showRejection(loginError, rejectionReason) {
        loginError.textContent = LOGIN_MESSAGES.REJECTED;
        loginError.appendChild(doc.createElement('br'));

        const reasonLine = doc.createElement('small');
        reasonLine.textContent = LOGIN_MESSAGES.REJECTION_REASON_PREFIX
            + (rejectionReason || LOGIN_MESSAGES.REJECTION_REASON_DEFAULT);
        loginError.appendChild(reasonLine);
        loginError.style.display = 'block';
    }

    // ------------------------------------------------------------------------------------------
    // Registro
    // ------------------------------------------------------------------------------------------

    async function handleRegister(form, view) {
        const { registerError, registerSuccess, button } = view;
        hideError(registerError);
        hideError(registerSuccess);

        const name = doc.getElementById('regName').value.trim();
        const email = doc.getElementById('regEmail').value.trim();
        const password = doc.getElementById('regPassword').value;
        const confirmPassword = doc.getElementById('regConfirmPassword').value;
        const role = normalizeRegistrationRole(doc.getElementById('regRole').value);

        const validationMessage = validateRegistrationInput({ name, password, confirmPassword });
        if (validationMessage) {
            showError(registerError, validationMessage);

            return validationMessage;
        }

        const restore = setBusy(button, "<i class='bx bx-loader-alt bx-spin'></i> Registrando...");

        try {
            const credential = await auth.createUserWithEmailAndPassword(email, password);
            const user = credential.user;

            // Ningún usuario se aprueba a sí mismo: el registro siempre queda pendiente.
            const newUser = {
                name,
                email,
                shift: 'Por Asignar',
                role,
                approved: false,
                status: 'pending',
                registrationDate: now().toISOString()
            };

            await database.ref(`users/${user.uid}`).set(newUser);

            notifySupervisor({
                Nombre: name,
                Correo: email,
                Rol_Solicitado: doc.getElementById('regRole').value,
                Mensaje: 'Hay un nuevo usuario pendiente de aprobación en la plataforma Risk Manager.',
                _subject: `Nuevo Registro Pendiente: ${name}`,
                _captcha: 'false',
                _next: win.location.href
            });

            showSuccess(registerSuccess, LOGIN_MESSAGES.REGISTER_SUCCESS);
            setTimer(() => switchLoginPanel(doc, LOGIN_PANELS.LOGIN), REGISTER_REDIRECT_DELAY_MS);

            return LOGIN_MESSAGES.REGISTER_SUCCESS;
        } catch (error) {
            logger.error('Error Firebase al registrar:', error);

            let message = LOGIN_MESSAGES.REGISTER_ERROR;
            if (error && error.code === 'auth/email-already-in-use') message = LOGIN_MESSAGES.EMAIL_IN_USE;
            else if (error && error.code === 'auth/invalid-email') message = LOGIN_MESSAGES.INVALID_EMAIL;
            else if (error && error.code === 'auth/weak-password') message = LOGIN_MESSAGES.WEAK_PASSWORD;

            showError(registerError, message);

            return message;
        } finally {
            restore();
        }
    }

    function showSuccess(element, text) {
        element.textContent = text;
        element.style.display = 'block';
    }

    // ------------------------------------------------------------------------------------------
    // Recuperación de contraseña
    // ------------------------------------------------------------------------------------------

    async function handleForgot(email, view) {
        const { forgotMessage, form, button } = view;
        const restore = setBusy(button, "<i class='bx bx-loader-alt bx-spin'></i> Enviando...");

        try {
            await auth.sendPasswordResetEmail(email);
        } catch (error) {
            logger.warn('Password reset request logged:', error);

            if (error && error.code === 'auth/invalid-email') {
                forgotMessage.style.color = 'var(--danger)';
                showError(forgotMessage, LOGIN_MESSAGES.RESET_INVALID_EMAIL);
                restore();

                return LOGIN_MESSAGES.RESET_INVALID_EMAIL;
            }
        }

        // Mensaje genérico también si la cuenta no existe, para no revelar qué correos están registrados.
        forgotMessage.style.color = 'var(--success)';
        showError(forgotMessage, LOGIN_MESSAGES.RESET_SENT(email));
        form.reset();
        restore();

        return LOGIN_MESSAGES.RESET_SENT(email);
    }

    // ------------------------------------------------------------------------------------------
    // Vistas y eventos
    // ------------------------------------------------------------------------------------------

    function applyBrowserGuard() {
        const userAgent = win.navigator && win.navigator.userAgent;
        if (isChromeUserAgent(userAgent)) return;

        doc.addEventListener('DOMContentLoaded', () => {
            doc.getElementById('browserBlocker').style.display = 'flex';
            const container = doc.querySelector('.login-container');
            if (container) container.style.display = 'none';
            const mobile = doc.getElementById('mobileBlocker');
            if (mobile) mobile.style.display = 'none';
        });
    }

    function bindPasswordToggles() {
        doc.querySelectorAll('.toggle-password').forEach((icon) => {
            icon.addEventListener('click', function onToggle() {
                const input = this.previousElementSibling;
                const showing = input.type === 'password';

                input.type = showing ? 'text' : 'password';
                this.classList.remove(showing ? 'bx-show' : 'bx-hide');
                this.classList.add(showing ? 'bx-hide' : 'bx-show');
            });
        });
    }

    function bindForms() {
        const loginForm = doc.getElementById('loginForm');
        const loginError = doc.getElementById('loginError');
        if (loginForm) {
            loginForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const email = doc.getElementById('loginEmail').value.trim();
                const password = doc.getElementById('loginPassword').value;
                handleLogin(email, password, { loginError, button: loginForm.querySelector('button[type="submit"]') });
            });
        }

        const registerForm = doc.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (event) => {
                event.preventDefault();
                handleRegister(registerForm, {
                    registerError: doc.getElementById('registerError'),
                    registerSuccess: doc.getElementById('registerSuccess'),
                    button: registerForm.querySelector('button[type="submit"]')
                });
            });
        }

        const forgotForm = doc.getElementById('forgotForm');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const email = doc.getElementById('forgotEmail').value.trim();
                handleForgot(email, {
                    forgotMessage: doc.getElementById('forgotMessage'),
                    form: forgotForm,
                    button: forgotForm.querySelector('button[type="submit"]')
                });
            });
        }
    }

    /**
     * Arranca la página: aviso de `file:`, bloqueo de navegadores distintos de Chrome, eventos de los formularios,
     * cambio de panel por delegación (W-54 (b)) y ojo de la contraseña.
     *
     * @returns {() => void} desenlace (retira el listener de delegación)
     */
    function init() {
        if (win.location.protocol === 'file:') alert(LOGIN_MESSAGES.FILE_PROTOCOL);

        applyBrowserGuard();
        bindPasswordToggles();
        bindForms();

        return bindActionDelegation(doc, SWITCH_PANEL_ACTION, (element) => {
            switchLoginPanel(doc, element.getAttribute('data-panel'));
        });
    }

    return { init, handleLogin, handleRegister, handleForgot };
}
