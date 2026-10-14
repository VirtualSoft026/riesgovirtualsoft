/**
 * Controlador de comunicados: orquesta el módulo "MÓDULO DE COMUNICADOS" de `app.js` (6555-6965):
 * suscripción en vivo, modal de nuevo comunicado, publicación, insignia de no leídos, listas del gestor
 * y del administrador, marcar leído, cola de comunicados urgentes, lectura de contenido, lecturas por
 * usuario y eliminación.
 *
 * No toca `window`, `document` global, `firebase` ni `alert` directamente: todo llega por `deps`
 * (inyección de dependencias), así se prueba en Node con un DOM y una base simulados. La lógica pura
 * (orden, "no leído", HTML, permisos, payloads) vive en `domain/announcements/announcement-service.js`.
 *
 * Fidelidad: cada método conserva el orden de efectos y los textos de la función original de `app.js`,
 * salvo las DECISIONES D4 y D9(c) del responsable (plan maestro, sección 4 ter):
 *
 *  - D4 `skipIfAlreadyRead` (por defecto `true`). Regla real de `database.rules.json`:
 *    `announcements/$id/readBy/$reader_uid/.write = approved && auth.uid === $reader_uid && !data.exists() && newData.exists()`
 *    (cada usuario escribe SU lectura UNA sola vez). `app.js` hace `set` a ciegas: la segunda escritura falla con
 *    PERMISSION_DENIED, avisa "Error al marcar como leído.", cierra el modal urgente y lo reabre 500 ms después
 *    (bucle). Con la opción: (1) comprobación previa en el cliente (`if (!readBy[uid])`): si ya está leído no se
 *    escribe; (2) si la escritura falla con PERMISSION_DENIED (ambiguo: duplicidad o permiso real) se VERIFICA con
 *    una lectura de `readBy/{uid}`: si existe -> duplicidad -> "ya leído" (sin aviso, se recuerda localmente para
 *    que el modal NO se reabra aunque el caché del listener aún no lo traiga); si no existe o no se puede leer ->
 *    fallo real: se avisa y NO se marca leído. Un fallo de red u otro error NUNCA se toma por "ya leído".
 *  - D4 `keepUrgentModalOpenOnFailure` (por defecto `true`): si la lectura NO quedó registrada (fallo real), el
 *    modal urgente permanece abierto con el botón rehabilitado para reintentar (el original lo cierra igual y lo
 *    reabre a los 500 ms). Una duplicidad confirmada cuenta como registrada: el modal se cierra y no reaparece.
 *  - `options.legacy: true` restaura el comportamiento ORIGINAL de app.js (ambas en `false`); también se puede
 *    poner cada opción en `false` por separado. Las pruebas diferenciales contra la copia literal lo usan.
 *  - D9(c): Admin, Supervisor y Gestor reciben el modal urgente bloqueante y deben confirmar la lectura
 *    (`requiresUrgentConfirmation`, en `announcement-service.js`). Es lo que ya hacía app.js; queda explícito.
 *
 * @param {{
 *   repository: ReturnType<typeof import('../services/firebase/firebase-announcement-repository.js').createAnnouncementRepository>,
 *   document: {getElementById: (id: string) => any},
 *   getUser: () => (object|null|undefined),
 *   getAuthUser?: () => ({uid?: string}|null|undefined),
 *   getAnnouncements?: () => Record<string, object>,
 *   setAnnouncements?: (map: Record<string, object>) => void,
 *   now?: () => number,
 *   alert?: (message: string) => void,
 *   closeModal?: (id: string) => void,
 *   setTimeout?: (fn: Function, ms: number) => unknown,
 *   logger?: {warn: Function, error: Function},
 *   helpers?: {escapeHTML?: Function, encodeInlineHandlerArg?: Function, sanitizeAnnouncementHTML?: Function},
 *   options?: {legacy?: boolean, skipIfAlreadyRead?: boolean, keepUrgentModalOpenOnFailure?: boolean}
 * }} deps
 */

import {
    ANNOUNCEMENT_MESSAGES,
    LOADING_USERS_HTML,
    READ_FAILURE_KINDS,
    USERS_ERROR_HTML,
    applyAssumedReads,
    buildAdminComunicadosRowsHtml,
    classifyReadWriteError,
    buildAnnouncementPayload,
    buildAnnouncementView,
    buildGestorComunicadosHtml,
    buildReadReceipt,
    buildReadersListHtml,
    buildUnreadersListHtml,
    canDeleteComunicados,
    canPublishComunicados,
    canViewComunicadoLecturas,
    computeUnreadBadge,
    findNextUnreadUrgent,
    isAnnouncementRead,
    parseNewAnnouncementForm,
    requiresUrgentConfirmation,
    resolveReaderUid
} from '../domain/announcements/announcement-service.js';

export const URGENT_BUTTON_IDLE_HTML = "<i class='bx bx-check-double'></i> He leído y entendido este comunicado";
export const URGENT_BUTTON_BUSY_HTML = "<i class='bx bx-loader-alt bx-spin'></i> Registrando...";
export const DELETE_BUTTON_BUSY_HTML = "<i class='bx bx-loader-alt bx-spin'></i> Eliminando...";

/** D4 encendido por defecto (decisión del responsable). */
export const DEFAULT_OPTIONS = Object.freeze({ skipIfAlreadyRead: true, keepUrgentModalOpenOnFailure: true });

/** Comportamiento original de app.js (las dos correcciones de D4 apagadas). */
export const LEGACY_OPTIONS = Object.freeze({ skipIfAlreadyRead: false, keepUrgentModalOpenOnFailure: false });

/**
 * Opciones efectivas: `legacy: true` parte del comportamiento original; las claves explícitas siempre mandan.
 *
 * @param {{legacy?: boolean, skipIfAlreadyRead?: boolean, keepUrgentModalOpenOnFailure?: boolean}} [options]
 */
export function resolveAnnouncementOptions(options = {}) {
    const base = options.legacy ? LEGACY_OPTIONS : DEFAULT_OPTIONS;

    return {
        skipIfAlreadyRead: options.skipIfAlreadyRead === undefined ? base.skipIfAlreadyRead : Boolean(options.skipIfAlreadyRead),
        keepUrgentModalOpenOnFailure: options.keepUrgentModalOpenOnFailure === undefined ? base.keepUrgentModalOpenOnFailure : Boolean(options.keepUrgentModalOpenOnFailure)
    };
}

export function createAnnouncementsController(deps) {
    const {
        repository,
        document: doc,
        getUser,
        getAuthUser = () => null,
        now = Date.now,
        alert: notify = () => {},
        closeModal = () => {},
        setTimeout: schedule = (fn, ms) => setTimeout(fn, ms),
        logger = console,
        helpers
    } = deps;

    const options = resolveAnnouncementOptions(deps.options);

    let internalAnnouncements = {};
    const rawAnnouncements = deps.getAnnouncements || (() => internalAnnouncements);
    const setAnnouncements = deps.setAnnouncements || ((map) => { internalAnnouncements = map; });
    let pendingDeleteId = null;
    /** D4: uid -> { idComunicado: recibo } lecturas confirmadas por el servidor que el caché local quizá aún no trae. */
    const assumedReads = new Map();

    /**
     * Comunicados tal como los ve la interfaz: el caché del listener + las lecturas confirmadas por duplicidad
     * (D4). Sin lecturas asumidas devuelve el MISMO mapa (comportamiento original).
     */
    function getAnnouncements() {
        let map = rawAnnouncements();

        assumedReads.forEach((receipts, uid) => {
            map = applyAssumedReads(map, uid, receipts);
        });

        return map;
    }

    function rememberAssumedRead(uid, id, receipt) {
        const receipts = assumedReads.get(uid) || {};
        receipts[id] = receipt || { readAt: '' };
        assumedReads.set(uid, receipts);
    }

    /**
     * D4: tras un PERMISSION_DENIED, ¿la lectura YA estaba registrada en el servidor? Lee `readBy/{uid}`.
     * Cualquier fallo de esa lectura cuenta como "no" (conservador: no se marca leído en falso).
     */
    async function isReadOnServer(id, uid) {
        if (typeof repository.fetchReadReceipt !== 'function') return null;

        try {
            return await repository.fetchReadReceipt(id, uid);
        } catch (verifyError) {
            logger.error(verifyError);
            return null;
        }
    }

    /** UID del lector; consulta la sesión de Firebase solo si el usuario local no trae uid. */
    function readerUid() {
        const user = getUser();

        return (user && user.uid) ? user.uid : resolveReaderUid(user, getAuthUser());
    }

    function initListener(onError) {
        return repository.subscribe((map) => {
            setAnnouncements(map);
            updateUnreadBadge();
            checkUnreadUrgent();

            // Re-render views if they are open
            const viewGestor = doc.getElementById('view-comunicados');
            if (viewGestor && viewGestor.style.display === 'block') {
                renderGestor();
            }

            const viewAdmin = doc.getElementById('view-gestion-comunicados');
            if (viewAdmin && viewAdmin.style.display === 'block') {
                renderAdmin();
            }
        }, onError);
    }

    function openNewModal() {
        const user = getUser();

        if (!user || !canPublishComunicados(user.role)) {
            logger.warn('openNewComunicadoModal: rol no autorizado', user && user.role);
            return;
        }

        doc.getElementById('comunicadoTitle').value = '';
        doc.getElementById('comunicadoContent').innerHTML = '';
        doc.getElementById('newComunicadoModal').classList.add('active');
    }

    async function save() {
        const user = getUser();

        if (!user || !canPublishComunicados(user.role)) {
            logger.warn('saveNewComunicado: rol no autorizado', user && user.role);
            notify(ANNOUNCEMENT_MESSAGES.NOT_ALLOWED_PUBLISH);
            return;
        }

        const form = parseNewAnnouncementForm({
            title: doc.getElementById('comunicadoTitle').value,
            rawContentHtml: doc.getElementById('comunicadoContent').innerHTML
        }, helpers);

        if (!form.ok) {
            notify(ANNOUNCEMENT_MESSAGES.MISSING_FIELDS);
            return;
        }

        try {
            await repository.publish(buildAnnouncementPayload({
                title: form.title,
                content: form.content,
                currentUser: user,
                authUid: getAuthUser().uid,
                now: now()
            }));

            notify(ANNOUNCEMENT_MESSAGES.PUBLISHED);
            closeModal('newComunicadoModal');
        } catch (e) {
            logger.error(e);
            notify(ANNOUNCEMENT_MESSAGES.PUBLISH_ERROR);
        }
    }

    function updateUnreadBadge() {
        const user = getUser();
        const badge = doc.getElementById('unreadAnnouncementsBadge');
        // La sesión de Firebase solo se consulta si hace falta (Gestor sin uid local), como en app.js.
        const needsAuthUser = user && user.role !== 'Admin' && user.role !== 'Supervisor' && !user.uid;
        const view = computeUnreadBadge(user, needsAuthUser ? getAuthUser() : null, getAnnouncements());

        if (!badge) return;

        if (view.visible) {
            badge.textContent = view.count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    function renderGestor() {
        const list = doc.getElementById('gestorComunicadosList');
        if (!list) return;

        list.innerHTML = buildGestorComunicadosHtml(getAnnouncements(), readerUid(), helpers);
    }

    /**
     * Registra la lectura del usuario. Devuelve `true` si quedó registrada (o, con `skipIfAlreadyRead`, si ya lo
     * estaba: comprobación previa o duplicidad verificada) y `false` si falló de verdad (ya se avisó al usuario
     * con el mensaje original "Error al marcar como leído.").
     */
    async function markAsRead(id) {
        let uid;

        try {
            uid = readerUid();
            const user = getUser();

            if (options.skipIfAlreadyRead) {
                const current = getAnnouncements()[id];

                if (current && isAnnouncementRead(current, uid)) {
                    return true; // comprobación previa: ya leído, no se escribe (la regla lo rechazaría)
                }
            }

            const receipt = buildReadReceipt(user, now());
            await repository.markAsRead(id, uid, receipt);

            if (options.skipIfAlreadyRead) {
                // Escritura confirmada por el servidor: se recuerda localmente para que, si el listener tarda más de
                // 500 ms en traerla, el modal urgente no reabra este comunicado (y un reintento no choque con la regla).
                rememberAssumedRead(uid, id, receipt);
            }

            return true;
        } catch (e) {
            if (options.skipIfAlreadyRead && uid && classifyReadWriteError(e) === READ_FAILURE_KINDS.PERMISSION_DENIED) {
                const receipt = await isReadOnServer(id, uid);

                if (receipt) {
                    // Duplicidad: la regla de escritura única rechazó porque la lectura YA existe -> "ya leído".
                    rememberAssumedRead(uid, id, receipt);
                    updateUnreadBadge();
                    return true;
                }
            }

            logger.error(e);
            notify(ANNOUNCEMENT_MESSAGES.READ_ERROR);
            return false;
        }
    }

    function checkUnreadUrgent() {
        const user = getUser();

        if (!user || !user.uid) return;
        if (!requiresUrgentConfirmation(user.role)) return; // D9(c): hoy aplica a Admin, Supervisor y Gestor

        const modal = doc.getElementById('urgentAnnouncementModal');
        if (modal && modal.classList.contains('active')) return;

        const next = findNextUnreadUrgent(getAnnouncements(), user.uid);

        if (!next) return;

        const view = buildAnnouncementView(next.announcement, helpers);

        doc.getElementById('urgentAnnouncementTitle').innerText = view.title;
        doc.getElementById('urgentAnnouncementAuthor').innerText = view.author;
        doc.getElementById('urgentAnnouncementDate').innerText = view.dateText;
        doc.getElementById('urgentAnnouncementBody').innerHTML = view.bodyHtml;

        const btn = doc.getElementById('btnUrgentUnderstand');
        btn.onclick = () => markUrgentAsRead(next.key);

        modal.classList.add('active');
    }

    async function markUrgentAsRead(id) {
        const btn = doc.getElementById('btnUrgentUnderstand');
        btn.innerHTML = URGENT_BUTTON_BUSY_HTML;
        btn.disabled = true;

        try {
            const ok = await markAsRead(id);

            if (options.keepUrgentModalOpenOnFailure && ok === false) {
                btn.innerHTML = URGENT_BUTTON_IDLE_HTML;
                btn.disabled = false;
                return;
            }

            doc.getElementById('urgentAnnouncementModal').classList.remove('active');
            btn.innerHTML = URGENT_BUTTON_IDLE_HTML;
            btn.disabled = false;

            schedule(() => {
                checkUnreadUrgent();
            }, 500);
        } catch (e) {
            btn.innerHTML = URGENT_BUTTON_IDLE_HTML;
            btn.disabled = false;
        }
    }

    function renderAdmin() {
        const tbody = doc.getElementById('adminComunicadosTableBody');
        if (!tbody) return;

        const user = getUser();
        const showDelete = canDeleteComunicados(user && user.role);

        tbody.innerHTML = buildAdminComunicadosRowsHtml(getAnnouncements(), showDelete, helpers);
    }

    function viewContent(id) {
        const c = getAnnouncements()[id];
        if (!c) return;

        const view = buildAnnouncementView(c, helpers);

        doc.getElementById('viewComunicadoContentTitle').innerText = view.title;
        doc.getElementById('viewComunicadoContentAuthor').innerText = view.author;
        doc.getElementById('viewComunicadoContentDate').innerText = view.dateText;
        doc.getElementById('viewComunicadoContentBody').innerHTML = view.bodyHtml;

        doc.getElementById('viewComunicadoContentModal').classList.add('active');
    }

    async function viewLecturas(id) {
        const user = getUser();

        if (!user || !canViewComunicadoLecturas(user.role)) {
            logger.warn('viewComunicadoLecturas: rol no autorizado', user && user.role);
            return;
        }

        const c = getAnnouncements()[id];
        if (!c) return;

        doc.getElementById('comunicadoLecturasModal').classList.add('active');
        const readList = doc.getElementById('comunicadoReadList');
        const unreadList = doc.getElementById('comunicadoUnreadList');

        readList.innerHTML = '';
        unreadList.innerHTML = LOADING_USERS_HTML;

        // Poblar leídos
        const readers = c.readBy || {};
        const readView = buildReadersListHtml(readers, helpers);
        readList.innerHTML = readView.html;

        // Fetch all active gestores to find who hasn't read
        try {
            const snap = await repository.fetchUsersSnapshot();

            if (snap.exists()) {
                const allUsers = snap.val();
                unreadList.innerHTML = '';
                unreadList.innerHTML = buildUnreadersListHtml(allUsers, readers, readView.readNames, helpers).html;
            }
        } catch (e) {
            logger.error(e);
            unreadList.innerHTML = USERS_ERROR_HTML;
        }
    }

    function requestDelete(id) {
        const user = getUser();

        if (!user || !canDeleteComunicados(user.role)) {
            logger.warn('deleteComunicado: rol no autorizado', user && user.role);
            notify(ANNOUNCEMENT_MESSAGES.NOT_ALLOWED_DELETE);
            return;
        }

        pendingDeleteId = id;
        doc.getElementById('confirmDeleteModal').classList.add('active');
    }

    /** Cuerpo del manejador del botón `#confirmDeleteBtn` (app.js 6968-6998). */
    async function confirmDelete() {
        if (!pendingDeleteId) return;

        const user = getUser();

        if (!user || !canDeleteComunicados(user.role)) {
            logger.warn('confirmDeleteBtn: rol no autorizado', user && user.role);
            pendingDeleteId = null;
            closeModal('confirmDeleteModal');
            return;
        }

        const btn = doc.getElementById('confirmDeleteBtn');
        const prevText = btn.innerHTML;
        btn.innerHTML = DELETE_BUTTON_BUSY_HTML;
        btn.disabled = true;

        try {
            await repository.remove(pendingDeleteId);
            closeModal('confirmDeleteModal');
        } catch (e) {
            logger.error(e);
            notify(ANNOUNCEMENT_MESSAGES.DELETE_ERROR);
        } finally {
            btn.innerHTML = prevText;
            btn.disabled = false;
            pendingDeleteId = null;
        }
    }

    return {
        initListener,
        openNewModal,
        save,
        updateUnreadBadge,
        renderGestor,
        markAsRead,
        checkUnreadUrgent,
        markUrgentAsRead,
        renderAdmin,
        viewContent,
        viewLecturas,
        requestDelete,
        confirmDelete,
        getPendingDeleteId: () => pendingDeleteId
    };
}
