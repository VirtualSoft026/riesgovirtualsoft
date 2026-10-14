/**
 * Paso de integración SOLO-LABORATORIO del corte "Modales, tareas extra, usuarios y permisos".
 *
 * Sustituye, en la copia de staging de app.js, el bloque contiguo `// Modal Logic` ... fin de
 * `updatePermissionStatus()` (app.js 3975-4448: 18 funciones) por funciones globales con el MISMO nombre y firma que
 * delegan en `RiskOps.approvalsController` (src/controllers/approvals-controller.js). Los manejadores `onclick`
 * que genera el HTML (`approveUser(...)`, `showPermRejectBox(...)`, `closeModal(...)`, ...) y los de index.html
 * (`renderPendingUsers()`, `confirmException()`, `saveExtraTask()`) siguen resolviendo a esas globales.
 *
 * Ancla única de inicio: "// Modal Logic\nfunction openExceptionModal() {". Ancla de fin (inclusive): las últimas líneas de
 * `updatePermissionStatus()`, que contienen "loadPermisos(); // Reload historical permissions if looking at it" (única).
 * El bloque va entre los marcadores `[LAB-INTEGRACION:MODALES-PERMISOS:INICIO/FIN]` (distintos de los del controlador de
 * turno, para no confundir a las pruebas que extraen ese bloque).
 *
 * Demostración de paridad: `src/tests/controllers/approvals-controller.test.mjs` (diferencial contra la copia literal) y
 * `src/tests/e2e/modales-permisos-integrado.e2e.cjs` (funciones reales del app.js integrado, en un `vm`, contra el original).
 *
 * Las variables `pendingExtraTaskId` e `isSavingExtraTask` (app.js 1318-1319) quedan declaradas pero sin uso: el estado
 * del modal de tarea extra vive ahora dentro del controlador.
 *
 * Decisiones D2, D7 y D9a (2026-10-06, plan maestro §4 ter): el controlador se crea con sus valores POR DEFECTO, es
 * decir con `escapeRole`, `preventDuplicates`, `enforcePolicy` (rol leído de `currentUser` vía `getUser`) y
 * `showRejectedUsers` encendidos. No se pasa ninguna opción legacy. Para D9a se agrega UNA global nueva,
 * `revertRejectedUser(id)`, que usan los botones "Revertir" de la vista "Rechazados"; la opción "Rechazados" del
 * selector `filterAprobacionesStatus` la crea el controlador en el `<select>` existente (index.html no se toca).
 * Paridad con el original salvo en esos puntos (diferencias intencionales documentadas en el e2e).
 */

export const MARK = '[LAB-INTEGRACION]';
export const BLOCK_START = '// [LAB-INTEGRACION:MODALES-PERMISOS:INICIO]';
export const BLOCK_END = '// [LAB-INTEGRACION:MODALES-PERMISOS:FIN]';

const REPLACEMENT = `${BLOCK_START}
// ${MARK} Modales, tareas extra, usuarios y permisos: delegan en RiskOps.approvalsController
// (src/controllers/approvals-controller.js). Mismos nombres y firmas que las funciones originales.
let __labApprovalsController = null;
function __approvals() {
    if (__labApprovalsController) return __labApprovalsController;
    __labApprovalsController = RiskOps.approvalsController.createApprovalsController({
        doc: document,
        repository: RiskOps.approvalsRepository.createApprovalsRepository({ database }),
        alert: (message) => alert(message),
        confirm: (message) => confirm(message),
        now: () => new Date(),
        schedule: (fn, ms) => setTimeout(fn, ms),
        logger: console,
        onPermissionUpdated: () => loadPermisos(),
        // D7: el rol se valida en el cliente con la sesión actual (enforcePolicy encendido por defecto).
        getUser: () => currentUser
        // D2/D7/D9a: sin opciones legacy -> escapeRole, preventDuplicates, enforcePolicy y showRejectedUsers activos.
    });
    return __labApprovalsController;
}

let __labModalsController = null;
function __modals() {
    if (__labModalsController) return __labModalsController;
    __labModalsController = RiskOps.approvalsController.createModalsController({
        doc: document,
        alert: (message) => alert(message),
        now: () => Date.now(),
        logger: console,
        getAuthUser: () => firebase.auth().currentUser,
        getCurrentUser: () => currentUser,
        persistTask: (uid, taskId, record) => persistTaskToActiveSession(uid, taskId, record),
        getTaskCache: () => taskStateCache,
        storage: { setItem: (key, value) => localStorage.setItem(key, value) },
        updateKPI: () => updateKPI()
    });
    return __labModalsController;
}

// Modal Logic
function openExceptionModal() { return __modals().openExceptionModal(); }

function closeModal(modalId) { return __modals().closeModal(modalId); }

function confirmException() { return __modals().confirmException(); }

function openExtraTaskModal() { return __modals().openExtraTaskModal(); }

async function saveExtraTask() { return __modals().saveExtraTask(); }

// Logic for Approving Users
async function renderPendingUsers() { return __approvals().renderPendingUsers(); }

async function approveUser(userId) { return __approvals().approveUser(userId); }

function showUserRejectBox(id) { return __approvals().showUserRejectBox(id); }

function cancelRejectUser(id) { return __approvals().cancelRejectUser(id); }

async function confirmRejectUser(userId) { return __approvals().confirmRejectUser(userId); }

// ${MARK} D9a: revertir un rechazo (botón "Revertir" de la vista "Rechazados"); no existe en app.js original.
async function revertRejectedUser(userId) { return __approvals().revertRejectedUser(userId); }

// Logic for Approving Permissions
async function renderPendingPermissions() { return __approvals().renderPendingPermissions(); }

function showPermRejectBox(id) { return __approvals().showPermRejectBox(id); }

function cancelRejectPerm(id) { return __approvals().cancelRejectPerm(id); }

async function confirmRejectPerm(id) { return __approvals().confirmRejectPerm(id); }

function showPermApproveBox(id) { return __approvals().showPermApproveBox(id); }

function cancelApprovePerm(id) { return __approvals().cancelApprovePerm(id); }

async function confirmApprovePerm(id) { return __approvals().confirmApprovePerm(id); }

async function updatePermissionStatus(fb_id, newStatus, reason = null) { return __approvals().updatePermissionStatus(fb_id, newStatus, reason); }
${BLOCK_END}
`;

export const STEPS = [
    {
        name: 'modales-permisos: modales, tarea extra, aprobación de usuarios y permisos delegan en RiskOps.approvalsController',
        start: '// Modal Logic\nfunction openExceptionModal() {',
        end: "        loadPermisos(); // Reload historical permissions if looking at it\n    } catch(e) {\n        alert('Error al contactar al servidor');\n    }\n}\n",
        endInclusive: true,
        replace: () => REPLACEMENT
    }
];
