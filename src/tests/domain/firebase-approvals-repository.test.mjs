import { createRunner, assert } from '../test-harness.mjs';
import { createApprovalsRepository } from '../../services/firebase/firebase-approvals-repository.js';
import { createFakeDatabase } from '../controllers/approvals-fakes.mjs';

const { test, testAsync, summarizeAsync } = createRunner('firebase-approvals-repository.js (rutas y payloads de app.js 4115-4441)');

const TREE = {
    users: { u1: { name: 'Ana', approved: false }, u2: { name: 'Luis', approved: true, id: 'x' } },
    permissions: { p1: { gestor: 'Ana', status: 'Pendiente', id: 1760000000000 } }
};

testAsync('fetchUsers: lee users una vez y devuelve la lista con la llave en `id`', async () => {
    const db = createFakeDatabase(TREE);
    const users = await createApprovalsRepository({ database: db }).fetchUsers();

    assert.deepEqual(db.calls, [{ op: 'once', path: 'users', event: 'value' }]);
    assert.deepEqual(users, [{ name: 'Ana', approved: false, id: 'u1' }, { name: 'Luis', approved: true, id: 'u2' }]);
});

testAsync('fetchPermissions: lee permissions y devuelve la lista con la llave en `fb_id` (conserva `id`)', async () => {
    const db = createFakeDatabase(TREE);
    const perms = await createApprovalsRepository({ database: db }).fetchPermissions();

    assert.deepEqual(db.calls, [{ op: 'once', path: 'permissions', event: 'value' }]);
    assert.deepEqual(perms, [{ gestor: 'Ana', status: 'Pendiente', id: 1760000000000, fb_id: 'p1' }]);
});

testAsync('fetch sobre un nodo inexistente devuelve []', async () => {
    const repo = createApprovalsRepository({ database: createFakeDatabase({}) });

    assert.deepEqual(await repo.fetchUsers(), []);
    assert.deepEqual(await repo.fetchPermissions(), []);
});

testAsync('un fallo de lectura se propaga (el controlador decide qué hacer)', async () => {
    const repo = createApprovalsRepository({ database: createFakeDatabase(TREE, { failOn: [{ op: 'once' }] }) });

    await assert.rejects(() => repo.fetchUsers(), /PERMISSION_DENIED/);
    await assert.rejects(() => repo.fetchPermissions(), /PERMISSION_DENIED/);
});

testAsync('approveUser: update en users/<id> con { approved: true, approvalDate }', async () => {
    const db = createFakeDatabase(TREE);
    await createApprovalsRepository({ database: db }).approveUser('u1', '2026-10-06T12:00:00.000Z');

    assert.deepEqual(db.calls, [{ op: 'update', path: 'users/u1', data: { approved: true, approvalDate: '2026-10-06T12:00:00.000Z' } }]);
});

testAsync('rejectUser: update en users/<id> con { approved: "Rechazado", rejectionReason }', async () => {
    const db = createFakeDatabase(TREE);
    await createApprovalsRepository({ database: db }).rejectUser('u1', 'Datos incompletos');

    assert.deepEqual(db.calls, [{ op: 'update', path: 'users/u1', data: { approved: 'Rechazado', rejectionReason: 'Datos incompletos' } }]);
});

testAsync('D9a revertUserToPending: update en users/<id> con { approved: false, rejectionReason: null } (borra el motivo)', async () => {
    const db = createFakeDatabase(TREE);
    await createApprovalsRepository({ database: db }).revertUserToPending('u3');

    assert.deepEqual(db.calls, [{ op: 'update', path: 'users/u3', data: { approved: false, rejectionReason: null } }]);
});

testAsync('D9a revertUserToPending: un fallo de escritura se propaga', async () => {
    const repo = createApprovalsRepository({ database: createFakeDatabase(TREE, { failOn: [{ op: 'update' }] }) });

    await assert.rejects(() => repo.revertUserToPending('u3'), (e) => e.code === 'PERMISSION_DENIED');
});

testAsync('updatePermissionStatus: con motivo -> { status, notified:false, rejectionReason }; sin motivo -> sin rejectionReason', async () => {
    const db = createFakeDatabase(TREE);
    const repo = createApprovalsRepository({ database: db });
    await repo.updatePermissionStatus('p1', 'Rechazado', 'Sin soporte');
    await repo.updatePermissionStatus('p1', 'Aprobado');

    assert.deepEqual(db.calls, [
        { op: 'update', path: 'permissions/p1', data: { status: 'Rechazado', notified: false, rejectionReason: 'Sin soporte' } },
        { op: 'update', path: 'permissions/p1', data: { status: 'Aprobado', notified: false } }
    ]);
});

testAsync('un fallo de escritura se propaga con su código (para clasificarlo arriba)', async () => {
    const repo = createApprovalsRepository({ database: createFakeDatabase(TREE, { failOn: [{ op: 'update' }] }) });

    await assert.rejects(() => repo.approveUser('u1', 'x'), (e) => e.code === 'PERMISSION_DENIED');
    await assert.rejects(() => repo.updatePermissionStatus('p1', 'Aprobado'), (e) => e.code === 'PERMISSION_DENIED');
});

testAsync('llave vacía o no textual: se rechaza ANTES de tocar Firebase (app.js escribiría el nodo raíz users)', async () => {
    const db = createFakeDatabase(TREE);
    const repo = createApprovalsRepository({ database: db });

    for (const bad of ['', undefined, null, 0, {}]) {
        await assert.rejects(() => repo.approveUser(bad, 'x'), /MISSING_USER_ID/);
        await assert.rejects(() => repo.rejectUser(bad, 'x'), /MISSING_USER_ID/);
        await assert.rejects(() => repo.revertUserToPending(bad), /MISSING_USER_ID/);
        await assert.rejects(() => repo.updatePermissionStatus(bad, 'Aprobado'), /MISSING_PERMISSION_ID/);
    }
    assert.equal(db.calls.length, 0);
});

test('referencia: la ruta con llave vacía del original sería el nodo raíz (documenta el riesgo evitado)', () => {
    const userId = '';
    assert.equal('users/' + userId, 'users/'); // app.js 4225: database.ref('users/' + userId)
});

summarizeAsync();
