import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRunner, assert } from '../test-harness.mjs';
import {
    APPROVAL_MESSAGES,
    APPROVALS_LIST_LIMIT,
    DEFAULT_PERMISSION_APPROVAL_REASON,
    HIDDEN_APPROVED_USER_EMAIL,
    USER_REJECTED_VALUE,
    buildUserApprovalUpdate,
    buildUserRejectionUpdate,
    buildUserRevertToPendingUpdate,
    canApproveUsers,
    canRevertUserRejection,
    canManagePermissionApprovals,
    canReadUsersList,
    canRejectUsers,
    canViewApprovalsView,
    canViewUsersApprovalSection,
    isUserApproved,
    isUserPending,
    isUserRejected,
    validateRejectionReason,
    isSoloAdminAutoApproved,
    SOLO_ADMIN_AUTO_APPROVAL_REASON
} from '../../domain/auth/approval-policy.js';
import { PERMISSION_STATUS } from '../../utils/constants.js';
import { buildPermissionStatusUpdate } from '../../domain/permissions/permission-service.js';

const { test, summarize } = createRunner('approval-policy.js (política de aprobaciones + contraste con database.rules.json)');

// ---------------------------------------------------------------------------------------------
// Textos y estados: copias LITERALES de app.js (4222, 4228-4231, 4249-4250, 4256-4257, 4232/4262, 4430, 4442)
// ---------------------------------------------------------------------------------------------
test('mensajes de la interfaz idénticos a los literales de app.js', () => {
    assert.equal(APPROVAL_MESSAGES.CONFIRM_APPROVE_USER, `¿Estás seguro de aprobar el acceso para este usuario?`); // app.js 4222
    assert.equal(APPROVAL_MESSAGES.USER_APPROVED, 'Usuario aprobado exitosamente. Ahora puede iniciar sesión.'); // 4230
    assert.equal(APPROVAL_MESSAGES.USER_REJECTED, 'Usuario rechazado exitosamente.'); // 4259
    assert.equal(APPROVAL_MESSAGES.REJECTION_REASON_REQUIRED, 'Debes escribir un motivo de rechazo.'); // 4250 y 4405
    assert.equal(APPROVAL_MESSAGES.SERVER_ERROR, 'Error al contactar al servidor'); // 4232, 4262, 4445
    assert.equal(APPROVAL_MESSAGES.permissionUpdated('Aprobado'), `Permiso ${'Aprobado'} exitosamente.`); // 4442
    assert.equal(APPROVAL_MESSAGES.permissionUpdated('Rechazado'), 'Permiso Rechazado exitosamente.');
});

test('estados idénticos a los literales de app.js (PERMISSION_STATUS y rechazo de usuario)', () => {
    assert.equal(PERMISSION_STATUS.PENDING, 'Pendiente'); // 4282
    assert.equal(PERMISSION_STATUS.APPROVED, 'Aprobado'); // 4430
    assert.equal(PERMISSION_STATUS.REJECTED, 'Rechazado'); // 4408
    assert.equal(USER_REJECTED_VALUE, 'Rechazado'); // 4256
    assert.equal(HIDDEN_APPROVED_USER_EMAIL, 'maria.sanchez@virtualsoft.tech'); // 4121
    assert.equal(APPROVALS_LIST_LIMIT, 5);
    assert.equal(DEFAULT_PERMISSION_APPROVAL_REASON, 'Aprobado sin observaciones adicionales'); // 4430
});

test('estado de la cuenta: pendiente=false, aprobada=true, rechazada="Rechazado"; nada más cuenta', () => {
    assert.equal(isUserPending({ approved: false }), true);
    assert.equal(isUserPending({ approved: undefined }), false);
    assert.equal(isUserPending({ approved: 'false' }), false);
    assert.equal(isUserApproved({ approved: true }), true);
    assert.equal(isUserApproved({ approved: 'true' }), false);
    assert.equal(isUserApproved({ approved: 1 }), false);
    assert.equal(isUserRejected({ approved: 'Rechazado' }), true);
    assert.equal(isUserRejected({ approved: 'rechazado' }), false);
    assert.equal(isUserPending(null), false);
});

// ---------------------------------------------------------------------------------------------
// Payloads: copias literales de app.js 4225-4228, 4255-4258 y 4435-4439
// ---------------------------------------------------------------------------------------------
test('payload de aprobar usuario = { approved: true, approvalDate: <ISO> }', () => {
    assert.deepEqual(buildUserApprovalUpdate('2026-10-06T12:00:00.000Z'), { approved: true, approvalDate: '2026-10-06T12:00:00.000Z' });
});

test('payload de rechazar usuario = { approved: "Rechazado", rejectionReason }', () => {
    assert.deepEqual(buildUserRejectionUpdate('Datos incompletos'), { approved: 'Rechazado', rejectionReason: 'Datos incompletos' });
});

test('D9a payload de revertir un rechazo = { approved: false, rejectionReason: null } (inverso exacto del rechazo)', () => {
    assert.deepEqual(buildUserRevertToPendingUpdate(), { approved: false, rejectionReason: null });
    // Mismo valor de `approved` que escribe el alta de login.js (`approved: false`): vuelve a "pendiente".
    assert.equal(isUserPending({ ...buildUserRejectionUpdate('x'), ...buildUserRevertToPendingUpdate() }), true);
});

test('D9a/D7 textos nuevos (no existen en app.js): confirmación y éxito de la reversión, rol insuficiente', () => {
    assert.equal(APPROVAL_MESSAGES.CONFIRM_REVERT_USER, '¿Deseas revertir el rechazo y devolver este usuario a "Pendiente de aprobación"?');
    assert.equal(APPROVAL_MESSAGES.USER_REVERTED, 'Rechazo revertido: el usuario volvió a "Pendiente de aprobación".');
    assert.equal(APPROVAL_MESSAGES.NOT_ALLOWED, 'No tienes permiso para realizar esta acción.');
});

test('validateRejectionReason recorta y rechaza vacío, solo espacios, null y undefined', () => {
    assert.deepEqual(validateRejectionReason('  falta cargo  '), { ok: true, reason: 'falta cargo' });
    for (const empty of ['', '   ', '\n\t', null, undefined]) {
        assert.deepEqual(validateRejectionReason(empty), { ok: false, message: 'Debes escribir un motivo de rechazo.' });
    }
    assert.deepEqual(validateRejectionReason(0), { ok: true, reason: '0' });
});

// ---------------------------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------------------------
test('canApproveUsers / canRejectUsers: solo Admin aprobado', () => {
    assert.equal(canApproveUsers('Admin'), true);
    assert.equal(canRejectUsers('Admin'), true);
    assert.equal(canApproveUsers('Supervisor'), false);
    assert.equal(canApproveUsers('Gestor'), false);
    assert.equal(canApproveUsers(undefined), false);
    assert.equal(canApproveUsers('admin'), false, 'el rol distingue mayúsculas');
    assert.equal(canApproveUsers('Admin', false), false, 'Admin sin aprobar no escribe (reglas)');
    assert.equal(canApproveUsers('Admin', 'Rechazado'), false);
});

test('D9a canRevertUserRejection: igual que aprobar (solo Admin aprobado)', () => {
    for (const [role, approved] of [['Admin', true], ['Admin', false], ['Supervisor', true], ['Gestor', true], [undefined, true]]) {
        assert.equal(canRevertUserRejection(role, approved), canApproveUsers(role, approved), `${role} ${approved}`);
    }
});

test('canManagePermissionApprovals: Admin o Supervisor aprobados', () => {
    assert.equal(canManagePermissionApprovals('Admin'), true);
    assert.equal(canManagePermissionApprovals('Supervisor'), true);
    assert.equal(canManagePermissionApprovals('Gestor'), false);
    assert.equal(canManagePermissionApprovals('Supervisor', false), false);
    assert.equal(canManagePermissionApprovals(null), false);
});

test('visibilidad: la vista Aprobaciones es de Admin y Supervisor; la sección de usuarios solo de Admin', () => {
    assert.equal(canViewApprovalsView('Admin'), true);
    assert.equal(canViewApprovalsView('Supervisor'), true);
    assert.equal(canViewApprovalsView('Gestor'), false);
    assert.equal(canViewUsersApprovalSection('Admin'), true);
    assert.equal(canViewUsersApprovalSection('Supervisor'), false);
});

test('canReadUsersList: Admin o Supervisor aprobados', () => {
    assert.equal(canReadUsersList('Admin'), true);
    assert.equal(canReadUsersList('Supervisor'), true);
    assert.equal(canReadUsersList('Gestor'), false);
    assert.equal(canReadUsersList('Admin', false), false);
});

test('DESAJUSTE DOCUMENTADO: el Supervisor puede LEER users (reglas) pero no ve ni puede escribir la sección de usuarios', () => {
    // Las reglas dejan leer `users` a un Supervisor; la interfaz oculta la sección (app.js 4983-4991) y la escritura
    // de users/$uid está reservada a Admin. Si el Supervisor llamara renderPendingUsers() (p. ej. por el `oninput` de
    // un campo oculto) vería botones que Firebase rechazaría con PERMISSION_DENIED.
    assert.equal(canReadUsersList('Supervisor'), true);
    assert.equal(canViewUsersApprovalSection('Supervisor'), false);
    assert.equal(canApproveUsers('Supervisor'), false);
});

// ---------------------------------------------------------------------------------------------
// D3(b) — Auto-aprobación del Admin único (decisión 2026-10-07)
// ---------------------------------------------------------------------------------------------
test('D3(b) isSoloAdminAutoApproved: Admin único (0 admins aprobados) → true', () => {
    assert.equal(isSoloAdminAutoApproved({ role: 'Admin' }, 0), true);
});

test('D3(b) isSoloAdminAutoApproved: Admin cuando ya existe otro Admin aprobado → false', () => {
    assert.equal(isSoloAdminAutoApproved({ role: 'Admin' }, 1), false);
    assert.equal(isSoloAdminAutoApproved({ role: 'Admin' }, 2), false);
});

test('D3(b) isSoloAdminAutoApproved: rol distinto de Admin → false aunque no haya admins', () => {
    assert.equal(isSoloAdminAutoApproved({ role: 'Gestor' }, 0), false);
    assert.equal(isSoloAdminAutoApproved({ role: 'Supervisor' }, 0), false);
});

test('D3(b) isSoloAdminAutoApproved: usuario nulo o indefinido → false', () => {
    assert.equal(isSoloAdminAutoApproved(null, 0), false);
    assert.equal(isSoloAdminAutoApproved(undefined, 0), false);
});

test('D3(b) isSoloAdminAutoApproved: approvedAdminCount como string "0" → true (coerción Number)', () => {
    // El controlador puede leer el conteo de Firebase como string; Number('0') === 0 → se auto-aprueba igual.
    assert.equal(isSoloAdminAutoApproved({ role: 'Admin' }, '0'), true);
});

test('D3(b) SOLO_ADMIN_AUTO_APPROVAL_REASON: string no vacío con referencia a la decisión D3-b', () => {
    assert.equal(typeof SOLO_ADMIN_AUTO_APPROVAL_REASON, 'string');
    assert.equal(SOLO_ADMIN_AUTO_APPROVAL_REASON.length > 0, true);
    assert.equal(SOLO_ADMIN_AUTO_APPROVAL_REASON.includes('D3-b'), true);
});

// ---------------------------------------------------------------------------------------------
// Contraste con las expresiones REALES de database.rules.json
// ---------------------------------------------------------------------------------------------
// Orden de búsqueda: variable RISKOPS_RULES, la raíz del repo (fase_2/../database.rules.json) y la copia de uploads.
const rulesCandidates = [
    process.env.RISKOPS_RULES,
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../database.rules.json'),
    '/mnt/user-data/uploads/riesgovirtualsoft/database.rules.json'
].filter(Boolean);
const rulesPath = rulesCandidates.find((candidate) => fs.existsSync(candidate));

if (!rulesPath) {
    console.log(`  [SKIP] contraste con database.rules.json: no se encontró (probado: ${rulesCandidates.join(', ')}; define RISKOPS_RULES)`);
} else {
    const RULES = JSON.parse(fs.readFileSync(rulesPath, 'utf8')).rules;

    function snap(value) {
        return {
            exists: () => value !== undefined && value !== null,
            val: () => (value === undefined ? null : value),
            child: (key) => snap(value && typeof value === 'object' ? value[key] : undefined)
        };
    }

    function evalRule(expression, { db, authUid, data, newData }) {
        const fn = new Function('root', 'auth', 'data', 'newData', 'query', '$uid', '$perm_id', `return (${expression});`);
        const auth = authUid ? { uid: authUid } : null;

        return Boolean(fn(snap(db), auth, snap(data), snap(newData), {}, null, null));
    }

    /** ¿Permite Firebase que `authUid` actualice `collection/key` con `fields`? (cascada de .write + .validate de los campos) */
    function canUpdate(db, authUid, collection, key, fields) {
        const node = RULES[collection][collection === 'users' ? '$uid' : '$perm_id'];
        const existing = db[collection] && db[collection][key];
        const merged = { ...(existing || {}), ...fields };
        const withVars = (expr) => expr.split('$uid').join(JSON.stringify(key)).split('$perm_id').join(JSON.stringify(key));

        const parentWrite = evalRule(withVars(node['.write']), { db, authUid, data: existing, newData: merged });

        return Object.keys(fields).every((field) => {
            const fieldNode = node[field] || {};
            const childWrite = fieldNode['.write']
                ? evalRule(withVars(fieldNode['.write']), { db, authUid, data: existing && existing[field], newData: fields[field] })
                : false;

            if (!(parentWrite || childWrite)) return false;

            return fieldNode['.validate']
                ? evalRule(withVars(fieldNode['.validate']), { db, authUid, data: existing && existing[field], newData: fields[field] })
                : true;
        });
    }

    function canReadUsers(db, authUid) {
        return evalRule(RULES.users['.read'], { db, authUid, data: db.users, newData: undefined });
    }

    const DB = {
        users: {
            admin1: { role: 'Admin', approved: true },
            admin2: { role: 'Admin', approved: false },
            sup1: { role: 'Supervisor', approved: true },
            sup2: { role: 'Supervisor', approved: false },
            gest1: { role: 'Gestor', approved: true },
            target: { role: 'Gestor', approved: false, email: 'ana@virtualsoft.tech' }
        },
        permissions: {
            p1: { uid: 'gest1', status: 'Pendiente', approved: false, notified: false, tipo: 'Cita médica' }
        }
    };

    const ACTORS = [
        { uid: 'admin1', role: 'Admin', approved: true },
        { uid: 'admin2', role: 'Admin', approved: false },
        { uid: 'sup1', role: 'Supervisor', approved: true },
        { uid: 'sup2', role: 'Supervisor', approved: false },
        { uid: 'gest1', role: 'Gestor', approved: true }
    ];

    for (const actor of ACTORS) {
        test(`reglas vs política (usuarios): ${actor.role} ${actor.approved ? 'aprobado' : 'sin aprobar'} aprobar/rechazar users/$uid`, () => {
            const approve = canUpdate(DB, actor.uid, 'users', 'target', buildUserApprovalUpdate('2026-10-06T12:00:00.000Z'));
            const reject = canUpdate(DB, actor.uid, 'users', 'target', buildUserRejectionUpdate('Datos incompletos'));

            assert.equal(approve, canApproveUsers(actor.role, actor.approved), 'aprobar');
            assert.equal(reject, canRejectUsers(actor.role, actor.approved), 'rechazar');
        });

        test(`reglas vs política (D9a revertir rechazo): ${actor.role} ${actor.approved ? 'aprobado' : 'sin aprobar'} users/$uid`, () => {
            const db = { ...DB, users: { ...DB.users, rejected: { role: 'Gestor', approved: 'Rechazado', rejectionReason: 'x', status: 'pending' } } };
            const revert = canUpdate(db, actor.uid, 'users', 'rejected', buildUserRevertToPendingUpdate());

            assert.equal(revert, canRevertUserRejection(actor.role, actor.approved));
        });

        test(`reglas vs política (permisos): ${actor.role} ${actor.approved ? 'aprobado' : 'sin aprobar'} aprobar/rechazar permissions/$perm_id`, () => {
            const approve = canUpdate(DB, actor.uid, 'permissions', 'p1', buildPermissionStatusUpdate(PERMISSION_STATUS.APPROVED, DEFAULT_PERMISSION_APPROVAL_REASON));
            const reject = canUpdate(DB, actor.uid, 'permissions', 'p1', buildPermissionStatusUpdate(PERMISSION_STATUS.REJECTED, 'Sin soporte'));

            assert.equal(approve, canManagePermissionApprovals(actor.role, actor.approved), 'aprobar');
            assert.equal(reject, canManagePermissionApprovals(actor.role, actor.approved), 'rechazar');
        });

        test(`reglas vs política (lectura): ${actor.role} ${actor.approved ? 'aprobado' : 'sin aprobar'} lee users`, () => {
            assert.equal(canReadUsers(DB, actor.uid), canReadUsersList(actor.role, actor.approved));
        });
    }

    test('reglas: el gestor dueño NO puede cambiarse el status de su propio permiso (solo crear la solicitud)', () => {
        assert.equal(canUpdate(DB, 'gest1', 'permissions', 'p1', { status: 'Aprobado' }), false);
    });

    test('reglas: un Admin puede escribir approved con el texto "Rechazado" (el .validate de approved lo permite a Admin)', () => {
        assert.equal(canUpdate(DB, 'admin1', 'users', 'target', { approved: 'Rechazado' }), true);
    });

    test('reglas: un Supervisor puede aprobar SU PROPIA solicitud de permiso (no hay regla contra la autoaprobación)', () => {
        const db = { ...DB, permissions: { ...DB.permissions, ps: { uid: 'sup1', status: 'Pendiente', approved: false, notified: false } } };

        assert.equal(canUpdate(db, 'sup1', 'permissions', 'ps', buildPermissionStatusUpdate('Aprobado', 'ok')), true);
    });
}

summarize();
