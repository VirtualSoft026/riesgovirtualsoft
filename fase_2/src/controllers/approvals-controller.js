/**
 * Controlador de aprobaciones (usuarios y permisos) y de los modales de tarea extra / excepción.
 *
 * Reemplaza, de `app.js`, la parte con efectos de:
 *  - Aprobación de usuarios: `renderPendingUsers()` (4111), `approveUser()` (4221), `showUserRejectBox()` (4236),
 *    `cancelRejectUser()` (4241), `confirmRejectUser()` (4247).
 *  - Aprobación de permisos: `renderPendingPermissions()` (4267), `showPermRejectBox()` (4391),
 *    `cancelRejectPerm()` (4396/4422), `confirmRejectPerm()` (4402, no figura en el inventario del plan),
 *    `showPermApproveBox()` (4411), `cancelApprovePerm()` (4416), `confirmApprovePerm()` (4428),
 *    `updatePermissionStatus()` (4433).
 *  - Modales: `openExceptionModal()` (3976), `closeModal()` (3994), `confirmException()` (4001),
 *    `openExtraTaskModal()` (4021), `saveExtraTask()` (4033).
 *
 * Dos fábricas (viven juntas porque este corte tiene asignado un único archivo de controlador):
 * `createApprovalsController` y `createModalsController`. Ninguna toca `window`, `localStorage`, `firebase`
 * ni `alert/confirm` directamente: todo llega por `deps`, así se prueban sin navegador. Los textos, estados y
 * payloads salen de `domain/auth/approval-policy.js`, `domain/permissions/*` y `domain/tasks/*` y son idénticos
 * a los de app.js (lo verifican las pruebas diferenciales y el e2e contra el app.js integrado).
 *
 * Decisiones del responsable (2026-10-06, plan maestro §4 ter), ENCENDIDAS POR DEFECTO:
 *  - D7 `preventDuplicates` (por defecto `true`): estado `isSubmitting` por fila. Desde el primer clic, un segundo
 *    clic sobre el mismo usuario/permiso se ignora mientras la escritura está en vuelo y los botones de la fila quedan
 *    deshabilitados; la guarda se libera aunque la escritura falle (permite reintentar). app.js permite dobles
 *    confirmaciones, escrituras y alertas.
 *  - D7 `enforcePolicy` + `getUser` (por defecto `true`): antes de escribir valida el rol con `approval-policy.js`
 *    (usuarios: solo Admin; permisos: Admin o Supervisor) y avisa con `APPROVAL_MESSAGES.NOT_ALLOWED` sin tocar
 *    Firebase. Sin `getUser` o sin usuario cargado se DENIEGA (seguro por omisión). Es una capa adicional: la
 *    seguridad real son las reglas de Firebase (propuesta de endurecimiento en
 *    `Docs/05-pruebas/2026-10-06-propuesta-reglas-d3-d7.md`).
 *  - D2 `escapeRole` (por defecto `true`): escapa el rol en la insignia (app.js lo inserta sin escapar).
 *  - D9a `showRejectedUsers` (por defecto `true`): agrega la opción "Rechazados" al selector de estado existente,
 *    lista los rechazados con su motivo y ofrece "Revertir" (`revertRejectedUser`: vuelve a pendiente) y "Aprobar".
 *
 * `APPROVALS_LEGACY_OPTIONS` pone las cuatro en `false` y reproduce app.js; solo lo usan las pruebas diferenciales.
 */

import {
    APPROVAL_MESSAGES,
    canApproveUsers,
    canManagePermissionApprovals,
    canRevertUserRejection,
    validateRejectionReason
} from '../domain/auth/approval-policy.js';
import {
    buildApproveDecision,
    buildRejectDecision,
    preparePermissionsView,
    resolvePermissionCreatedTimeText
} from '../domain/permissions/permission-service.js';
import {
    formatApprovalDate,
    formatRegistrationDate,
    prepareUsersApprovalList
} from '../domain/permissions/user-approval-list.js';
import {
    EXTRA_TASK_DEFAULT_STATUS,
    EXTRA_TASK_MESSAGES,
    EXTRA_TASK_SAVING_BUTTON_HTML,
    buildExtraTaskRecord,
    normalizeExtraTaskInput,
    resolveExtraTaskId,
    resolveExtraTaskSaveErrorMessage,
    validateExtraTaskIdentity,
    validateExtraTaskInput
} from '../domain/tasks/extra-task.js';
import { buildExceptionObservation, validateExceptionInput } from '../domain/tasks/exception-justification.js';
import {
    APPROVAL_BOX,
    cancelApprovalBox,
    permissionActionContainerIds,
    readApprovalReason,
    setApprovalButtonsDisabled,
    showApprovalBox,
    userActionContainerIds
} from '../ui/components/approval-boxes.js';
import { LIST_NOTICE_IDS, removeListNotice, showListNotice } from '../ui/components/list-notice.js';
import { closeModal as closeModalView, openExceptionModal as openExceptionModalView, openExtraTaskModal as openExtraTaskModalView } from '../ui/components/modal.js';
import { NO_PENDING_PERMISSIONS_ROW_HTML, NO_PERMISSION_HISTORY_ROW_HTML, buildPendingPermissionRowHtml, buildPermissionHistoryRowHtml } from '../ui/components/pending-permissions-table.js';
import { NO_USERS_ROW_HTML, buildUserRowHtml, ensureRejectedFilterOption } from '../ui/components/pending-users-table.js';
import { STORAGE_KEYS } from '../utils/constants.js';

/** Demora del aviso "Mostrando los 5 ..." (app.js 4158, 4169, 4290, 4300). */
const NOTICE_DELAY_MS = 100;

/**
 * Opciones que reproducen app.js tal cual (sin las decisiones D2, D7 y D9a). SOLO para pruebas diferenciales y e2e
 * de paridad; la aplicación usa los valores por defecto.
 */
export const APPROVALS_LEGACY_OPTIONS = Object.freeze({
    preventDuplicates: false,
    enforcePolicy: false,
    escapeRole: false,
    showRejectedUsers: false
});

/**
 * @param {{
 *   doc: {getElementById: Function, createElement: Function},
 *   repository: ReturnType<typeof import('../services/firebase/firebase-approvals-repository.js').createApprovalsRepository>,
 *   alert: (message: string) => void,
 *   confirm: (message: string) => boolean,
 *   now?: () => Date,
 *   schedule?: (fn: Function, ms: number) => unknown,
 *   logger?: {error: Function},
 *   onPermissionUpdated?: () => unknown,
 *   getUser?: () => ({role?: string, approved?: unknown}|null),
 *   enforcePolicy?: boolean,
 *   preventDuplicates?: boolean,
 *   escapeRole?: boolean,
 *   showRejectedUsers?: boolean,
 *   formatDate?: (date: Date) => string
 * }} deps Las cuatro opciones booleanas son `true` por defecto (decisiones D2, D7, D9a); ver `APPROVALS_LEGACY_OPTIONS`.
 */
export function createApprovalsController(deps) {
    const {
        doc, repository, alert: showAlert, confirm: askConfirm,
        now = () => new Date(),
        schedule = (fn, ms) => setTimeout(fn, ms),
        logger = console,
        onPermissionUpdated,
        getUser,
        enforcePolicy = true,
        preventDuplicates = true,
        escapeRole = true,
        showRejectedUsers = true,
        formatDate
    } = deps;

    /** Filas con una escritura en vuelo (`isSubmitting` por usuario/permiso, decisión D7). */
    const inFlight = new Set();

    /**
     * Con `preventDuplicates`: ignora la acción si la misma fila ya tiene otra en curso (aunque sea otro botón de la
     * misma fila, p. ej. "Aprobar" y "Revertir"), deshabilita sus botones desde el primer clic y SIEMPRE libera la
     * guarda y rehabilita los botones al terminar (éxito, cancelación o fallo).
     */
    async function guarded(key, containerIds, action) {
        if (preventDuplicates) {
            if (inFlight.has(key)) return undefined;
            inFlight.add(key);
            setApprovalButtonsDisabled(doc, containerIds, true);
        }

        try {
            return await action();
        } finally {
            if (preventDuplicates) {
                inFlight.delete(key);
                setApprovalButtonsDisabled(doc, containerIds, false);
            }
        }
    }

    function isAllowed(check) {
        if (!enforcePolicy) return true;

        const user = (getUser && getUser()) || {};

        if (check(user.role, user.approved === undefined ? true : user.approved)) return true;

        showAlert(APPROVAL_MESSAGES.NOT_ALLOWED);
        return false;
    }

    /** Lanza un render sin esperarlo (como app.js) pero deja constancia si falla en vez de una promesa huérfana. */
    function fireAndLog(promise) {
        if (promise && typeof promise.catch === 'function') promise.catch((error) => logger.error(error));
    }

    // ------------------------------------------------------------------ usuarios

    async function renderPendingUsers() {
        const tbody = doc.getElementById('pendingUsersTableBody');
        if (!tbody) return;

        let users = [];
        try {
            users = await repository.fetchUsers();
        } catch (e) {
            logger.error(e);
        }

        tbody.innerHTML = '';

        const searchInput = doc.getElementById('filterAprobacionesSearch');
        const statusSelect = doc.getElementById('filterAprobacionesStatus');
        const filters = {
            search: searchInput ? searchInput.value : '',
            status: statusSelect ? statusSelect.value : 'Todos'
        };

        if (showRejectedUsers) ensureRejectedFilterOption(doc, statusSelect);

        const view = prepareUsersApprovalList(users, filters, { includeRejected: showRejectedUsers });

        if (view.truncated) {
            schedule(() => {
                showListNotice(doc, { tbodyId: 'pendingUsersTableBody', noticeId: LIST_NOTICE_IDS.USERS, text: view.noticeText, requireTable: true });
            }, NOTICE_DELAY_MS);
        } else {
            schedule(() => removeListNotice(doc, LIST_NOTICE_IDS.USERS), NOTICE_DELAY_MS);
        }

        if (view.rows.length === 0) {
            tbody.innerHTML = NO_USERS_ROW_HTML;
            return;
        }

        const html = view.rows.map((user) => buildUserRowHtml(user, {
            regDateStr: formatRegistrationDate(user, formatDate),
            appDateStr: formatApprovalDate(user, formatDate),
            escapeRole,
            rejectedActions: showRejectedUsers
        })).join('');

        tbody.innerHTML += html;
    }

    async function approveUser(userId) {
        return guarded('user:' + userId, userActionContainerIds(userId), async () => {
            if (!isAllowed(canApproveUsers)) return;
            if (!askConfirm(APPROVAL_MESSAGES.CONFIRM_APPROVE_USER)) return;

            try {
                await repository.approveUser(userId, now().toISOString());
                showAlert(APPROVAL_MESSAGES.USER_APPROVED);
                fireAndLog(renderPendingUsers()); // Recarga la tabla
            } catch (e) {
                showAlert(APPROVAL_MESSAGES.SERVER_ERROR);
            }
        });
    }

    function showUserRejectBox(id) {
        showApprovalBox(doc, APPROVAL_BOX.USER_REJECT, id);
    }

    function cancelRejectUser(id) {
        cancelApprovalBox(doc, APPROVAL_BOX.USER_REJECT, id);
    }

    async function confirmRejectUser(userId) {
        return guarded('user:' + userId, userActionContainerIds(userId), async () => {
            if (!isAllowed(canApproveUsers)) return;

            const check = validateRejectionReason(readApprovalReason(doc, APPROVAL_BOX.USER_REJECT, userId));
            if (!check.ok) {
                showAlert(check.message);
                return;
            }

            try {
                await repository.rejectUser(userId, check.reason);
                showAlert(APPROVAL_MESSAGES.USER_REJECTED);
                fireAndLog(renderPendingUsers());
            } catch (e) {
                showAlert(APPROVAL_MESSAGES.SERVER_ERROR);
            }
        });
    }

    /**
     * Revierte el rechazo de un usuario (decisión D9a; no existe en app.js): confirma, escribe
     * `{approved: false, rejectionReason: null}` y recarga la tabla. Mismo rol que aprobar/rechazar (solo Admin) y misma
     * guarda por fila. Con `showRejectedUsers: false` no hace nada (la vista legacy no ofrece la acción).
     */
    async function revertRejectedUser(userId) {
        if (!showRejectedUsers) return undefined;

        return guarded('user:' + userId, userActionContainerIds(userId), async () => {
            if (!isAllowed(canRevertUserRejection)) return;
            if (!askConfirm(APPROVAL_MESSAGES.CONFIRM_REVERT_USER)) return;

            try {
                await repository.revertUserToPending(userId);
                showAlert(APPROVAL_MESSAGES.USER_REVERTED);
                fireAndLog(renderPendingUsers());
            } catch (e) {
                showAlert(APPROVAL_MESSAGES.SERVER_ERROR);
            }
        });
    }

    // ------------------------------------------------------------------ permisos

    async function renderPendingPermissions() {
        const tbody = doc.getElementById('pendingPermissionsTableBody');
        if (!tbody) return;

        let permisos = [];
        try {
            permisos = await repository.fetchPermissions();
        } catch (e) {
            logger.error(e);
        }

        const view = preparePermissionsView(permisos);

        if (view.truncated) {
            schedule(() => {
                showListNotice(doc, { tbodyId: 'pendingPermissionsTableBody', noticeId: LIST_NOTICE_IDS.PERMISSIONS, text: view.noticeText });
            }, NOTICE_DELAY_MS);
        } else {
            schedule(() => removeListNotice(doc, LIST_NOTICE_IDS.PERMISSIONS), NOTICE_DELAY_MS);
        }

        tbody.innerHTML = '';

        if (view.pending.length === 0) {
            // Como app.js 4311-4315: con la bandeja vacía NO se pinta el historial.
            tbody.innerHTML = NO_PENDING_PERMISSIONS_ROW_HTML;
            return;
        }

        tbody.innerHTML += view.pending
            .map((p) => buildPendingPermissionRowHtml(p, resolvePermissionCreatedTimeText(p)))
            .join('');

        const historyBody = doc.getElementById('historyPermissionsTableBody');
        if (historyBody) {
            historyBody.innerHTML = '';

            if (view.history.length === 0) {
                historyBody.innerHTML = NO_PERMISSION_HISTORY_ROW_HTML;
            } else {
                historyBody.innerHTML += view.history.map((p) => buildPermissionHistoryRowHtml(p)).join('');
            }
        }
    }

    function showPermRejectBox(id) {
        showApprovalBox(doc, APPROVAL_BOX.PERMISSION_REJECT, id);
    }

    function cancelRejectPerm(id) {
        cancelApprovalBox(doc, APPROVAL_BOX.PERMISSION_REJECT, id);
    }

    function showPermApproveBox(id) {
        showApprovalBox(doc, APPROVAL_BOX.PERMISSION_APPROVE, id);
    }

    function cancelApprovePerm(id) {
        cancelApprovalBox(doc, APPROVAL_BOX.PERMISSION_APPROVE, id);
    }

    async function updatePermissionStatus(fbId, newStatus, reason = null) {
        return guarded('permission:' + fbId, permissionActionContainerIds(fbId), async () => {
            if (!isAllowed(canManagePermissionApprovals)) return;

            try {
                await repository.updatePermissionStatus(fbId, newStatus, reason);

                showAlert(APPROVAL_MESSAGES.permissionUpdated(newStatus));
                fireAndLog(renderPendingPermissions()); // Recarga la tabla
                if (onPermissionUpdated) fireAndLog(onPermissionUpdated()); // Recarga el historial de permisos si se está viendo
            } catch (e) {
                showAlert(APPROVAL_MESSAGES.SERVER_ERROR);
            }
        });
    }

    async function confirmRejectPerm(id) {
        const decision = buildRejectDecision(readApprovalReason(doc, APPROVAL_BOX.PERMISSION_REJECT, id));
        if (!decision.ok) {
            showAlert(decision.message);
            return;
        }

        await updatePermissionStatus(id, decision.status, decision.reason);
    }

    async function confirmApprovePerm(id) {
        const decision = buildApproveDecision(readApprovalReason(doc, APPROVAL_BOX.PERMISSION_APPROVE, id));

        await updatePermissionStatus(id, decision.status, decision.reason);
    }

    return {
        renderPendingUsers, approveUser, showUserRejectBox, cancelRejectUser, confirmRejectUser, revertRejectedUser,
        renderPendingPermissions, showPermRejectBox, cancelRejectPerm, showPermApproveBox, cancelApprovePerm,
        confirmRejectPerm, confirmApprovePerm, updatePermissionStatus,
        /** Solo para pruebas y diagnóstico: ¿hay alguna escritura de aprobación en vuelo? (D7) */
        isSubmitting: () => inFlight.size > 0
    };
}

/**
 * Modales de justificación y de tarea extra.
 *
 * @param {{
 *   doc: {getElementById: Function, querySelector: Function, querySelectorAll: Function},
 *   alert: (message: string) => void,
 *   now?: () => number,
 *   logger?: {error: Function},
 *   getAuthUser: () => ({uid: string}|null|undefined),
 *   getCurrentUser: () => ({uid: string}|null|undefined),
 *   persistTask: (uid: string, taskId: string, record: object) => Promise<unknown>,
 *   getTaskCache: () => Record<string, object>,
 *   storage?: {setItem: (key: string, value: string) => void},
 *   updateKPI?: () => void
 * }} deps `persistTask` es `persistTaskToActiveSession` de app.js (la única vía real de escritura).
 */
export function createModalsController(deps) {
    const {
        doc, alert: showAlert,
        now = Date.now,
        logger = console,
        getAuthUser, getCurrentUser, persistTask, getTaskCache, storage, updateKPI
    } = deps;

    // Estado propio del modal de tarea extra (app.js 1318-1319).
    let pendingExtraTaskId = null;
    let isSavingExtraTask = false;

    function openExceptionModal() {
        openExceptionModalView(doc);
    }

    function closeModal(modalId) {
        closeModalView(doc, modalId);
    }

    function confirmException() {
        const select = doc.getElementById('exceptionReason');
        const reasonText = select.options[select.selectedIndex].text;
        const rawDetails = doc.getElementById('exceptionDetails').value;

        const check = validateExceptionInput({ reasonValue: select.value, details: rawDetails });
        if (!check.ok) {
            showAlert(check.message);
            return;
        }

        doc.getElementById('taskObservation').value = buildExceptionObservation(reasonText, check.details);
        closeModal('exceptionModal');
    }

    function openExtraTaskModal() {
        // Un modal recién abierto empieza una tarea extra lógicamente nueva.
        if (openExtraTaskModalView(doc, EXTRA_TASK_DEFAULT_STATUS)) pendingExtraTaskId = null;
    }

    async function saveExtraTask() {
        if (isSavingExtraTask) return; // Evitar dobles clics / escrituras simultáneas

        const input = normalizeExtraTaskInput({
            name: doc.getElementById('extraTaskName').value,
            status: doc.getElementById('extraTaskStatus').value,
            obs: doc.getElementById('extraTaskObs').value
        });

        const inputCheck = validateExtraTaskInput(input);
        if (!inputCheck.ok) {
            showAlert(inputCheck.message);
            return;
        }

        const authUser = getAuthUser();
        const identityCheck = validateExtraTaskIdentity(authUser, getCurrentUser());
        if (!identityCheck.ok) {
            showAlert(identityCheck.message);
            return;
        }

        const btn = doc.getElementById('saveExtraTaskBtn');
        const prevText = btn ? btn.innerHTML : '';
        isSavingExtraTask = true;
        if (btn) {
            btn.innerHTML = EXTRA_TASK_SAVING_BUTTON_HTML;
            btn.disabled = true;
        }

        // Reutilizar el mismo ID en un reintento tras un fallo previo, para no duplicar la tarea extra.
        const extraId = pendingExtraTaskId || resolveExtraTaskId(null, now());
        pendingExtraTaskId = extraId;

        const taskRecord = buildExtraTaskRecord(input, now());

        // Respaldo local inmediato para permitir reintento visual; NO cuenta como confirmación de persistencia.
        const cache = getTaskCache();
        cache[extraId] = taskRecord;
        try {
            if (storage) storage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
        } catch (e) { /* localStorage no disponible: el respaldo local es best-effort */ }

        try {
            // Único punto de verdad para la persistencia: espera la Promise real de Firebase antes de mostrar éxito.
            await persistTask(authUser.uid, extraId, taskRecord);

            pendingExtraTaskId = null;
            if (updateKPI) updateKPI(); // Actualizar el anillo de progreso
            closeModal('extraTaskModal');
            showAlert(EXTRA_TASK_MESSAGES.saved(input.name));
        } catch (error) {
            logger.error('Error al guardar la tarea extra:', error);
            showAlert(resolveExtraTaskSaveErrorMessage(error));
        } finally {
            if (btn) {
                btn.innerHTML = prevText;
                btn.disabled = false;
            }
            isSavingExtraTask = false;
        }
    }

    return {
        openExceptionModal, closeModal, confirmException, openExtraTaskModal, saveExtraTask,
        /** Solo para pruebas y diagnóstico. */
        getPendingExtraTaskId: () => pendingExtraTaskId,
        isSaving: () => isSavingExtraTask
    };
}
