import { createRunner, assert } from '../test-harness.mjs';
import {
    buildApproveDecision,
    buildPermissionStatusUpdate,
    buildRejectDecision,
    getPermissionUpdatedMessage,
    mapSnapshotEntries,
    preparePermissionsView,
    resolveApprovalReason,
    resolvePermissionCreatedTimeText
} from '../../domain/permissions/permission-service.js';
import { createRng } from '../controllers/approvals-fakes.mjs';

const { test, summarize } = createRunner('permission-service.js (diferencial vs app.js 4267-4448)');

// ---------------------------------------------------------------------------------------------
// COPIAS LITERALES del algoritmo original (app.js), con los números de línea de /tmp/app.lf.js
// ---------------------------------------------------------------------------------------------

/** app.js 4278-4303 y 4364-4376 (selección, orden, recorte e historial de renderPendingPermissions). */
function originalPermissionsView(permisos) {
    let pending = permisos.filter(p => p.status === 'Pendiente');

    // Sort so most recent is first
    pending.sort((a,b) => {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });

    let message = null;
    // Limit to 5
    if (pending.length > 5) {
        const total = pending.length;
        pending = pending.slice(0, 5);
        message = `Mostrando los 5 permisos más recientes de ${total} pendientes.`;
    }

    const history = permisos.filter(p => p.status !== 'Pendiente');
    history.sort((a, b) => b.id - a.id);

    return { pending, message, history };
}

/** app.js 4318-4324 (hora de solicitud). */
function originalCreatedTimeText(p) {
    let createdTimeText = p.horaSolicitud;
    if (!createdTimeText && p.id) {
        try {
            const d = new Date(p.id);
            createdTimeText = `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit', hour12:true})}`;
        } catch(err) { createdTimeText = 'N/A'; }
    }
    return createdTimeText;
}

/** app.js 4435-4439 (payload de updatePermissionStatus). */
function originalUpdates(newStatus, reason = null) {
    const updates = { status: newStatus, notified: false };
    if (reason) {
        updates.rejectionReason = reason;
    }
    return updates;
}

/** app.js 4271-4275 y 4116-4118 (lista con llave). */
function originalMap(data, idName) {
    return Object.keys(data).map(k => ({ ...data[k], [idName]: k }));
}

// ---------------------------------------------------------------------------------------------
const rng = createRng(4242);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

function randomPermission(i) {
    return {
        fb_id: '-N' + i,
        gestor: 'G' + i,
        status: pick(['Pendiente', 'Pendiente', 'Aprobado', 'Rechazado', 'Otro']),
        fecha: pick(['2026-10-10', '2026-09-30', '2027-01-01', 'garbage', undefined, '2026-10-10']),
        id: pick([1760000000000, 1760000005000, undefined, 'abc', 0, 1750000000000 + i])
    };
}

test('preparePermissionsView idéntico al algoritmo original (300 listas aleatorias con semilla, incluidas fechas inválidas)', () => {
    for (let n = 0; n < 300; n += 1) {
        const list = Array.from({ length: Math.floor(rng() * 16) }, (_, i) => randomPermission(i));
        const original = originalPermissionsView(JSON.parse(JSON.stringify(list)));
        const view = preparePermissionsView(JSON.parse(JSON.stringify(list)));

        assert.deepEqual(view.pending, original.pending, `pendientes, caso ${n}`);
        assert.deepEqual(view.history, original.history, `historial, caso ${n}`);
        assert.equal(view.noticeText, original.message, `aviso, caso ${n}`);
        assert.equal(view.truncated, original.message !== null);
    }
});

test('preparePermissionsView: 7 pendientes -> 5 visibles, aviso "de 7 pendientes", total 7', () => {
    const list = Array.from({ length: 7 }, (_, i) => ({ fb_id: 'p' + i, status: 'Pendiente', fecha: `2026-10-${10 + i}` }));
    const view = preparePermissionsView(list);

    assert.equal(view.pending.length, 5);
    assert.equal(view.total, 7);
    assert.equal(view.noticeText, 'Mostrando los 5 permisos más recientes de 7 pendientes.');
    assert.equal(view.pending[0].fecha, '2026-10-16', 'el más reciente primero');
});

test('preparePermissionsView: exactamente 5 pendientes no recorta ni avisa', () => {
    const list = Array.from({ length: 5 }, (_, i) => ({ fb_id: 'p' + i, status: 'Pendiente', fecha: `2026-10-${10 + i}` }));
    const view = preparePermissionsView(list);

    assert.equal(view.truncated, false);
    assert.equal(view.noticeText, null);
    assert.equal(view.pending.length, 5);
});

test('preparePermissionsView: no modifica el arreglo de entrada (filtra copias)', () => {
    const list = [{ status: 'Pendiente', fecha: '2026-10-01' }, { status: 'Pendiente', fecha: '2026-10-09' }, { status: 'Aprobado', id: 1 }];
    const snapshot = JSON.stringify(list);
    preparePermissionsView(list);

    assert.equal(JSON.stringify(list), snapshot);
});

test('resolvePermissionCreatedTimeText idéntico al original (horaSolicitud, derivada de id, ausentes)', () => {
    const cases = [
        { horaSolicitud: '9:00 a. m.', id: 1760000000000 }, { id: 1760000000000 }, { id: 0 }, {}, { horaSolicitud: '', id: 1700000000000 },
        { id: 'abc' }, { id: '2026-10-06T10:00:00Z' }, { horaSolicitud: null, id: 1750000000000 }
    ];

    for (const c of cases) assert.equal(resolvePermissionCreatedTimeText(c), originalCreatedTimeText(c), JSON.stringify(c));
});

test('payload de estado idéntico al original (con motivo, sin motivo, motivo vacío, null)', () => {
    for (const [status, reason] of [['Aprobado', undefined], ['Aprobado', 'ok'], ['Rechazado', ''], ['Rechazado', null], ['Rechazado', 'Sin soporte'], ['Otro', 'x']]) {
        const expected = originalUpdates(status, reason === undefined ? undefined : reason);
        const actual = reason === undefined ? buildPermissionStatusUpdate(status) : buildPermissionStatusUpdate(status, reason);

        assert.deepEqual(actual, expected);
        assert.deepEqual(Object.keys(actual), Object.keys(expected), 'mismo orden de llaves');
    }
});

test('el payload siempre lleva notified:false (el gestor recibe la notificación)', () => {
    assert.equal(buildPermissionStatusUpdate('Aprobado', 'x').notified, false);
    assert.equal(buildPermissionStatusUpdate('Rechazado').notified, false);
});

test('mapSnapshotEntries idéntico al original; vacío/null -> []', () => {
    const data = { a: { x: 1 }, b: { id: 99, y: 2 }, c: {} };

    assert.deepEqual(mapSnapshotEntries(data, 'fb_id'), originalMap(data, 'fb_id'));
    assert.deepEqual(mapSnapshotEntries(data, 'id'), originalMap(data, 'id'));
    assert.deepEqual(mapSnapshotEntries(null, 'id'), []);
    assert.deepEqual(mapSnapshotEntries(undefined, 'id'), []);
    assert.deepEqual(mapSnapshotEntries({}, 'id'), []);
});

test('la llave de Firebase pisa un campo `id` del propio registro (como app.js)', () => {
    assert.equal(mapSnapshotEntries({ k1: { id: 'otro' } }, 'id')[0].id, 'k1');
    assert.equal(mapSnapshotEntries({ k1: { id: 12345 } }, 'fb_id')[0].id, 12345, 'en permisos `id` (marca de tiempo) se conserva y la llave va en fb_id');
});

test('buildApproveDecision: sin observación usa el texto por defecto; con observación la recorta', () => {
    assert.deepEqual(buildApproveDecision(''), { status: 'Aprobado', reason: 'Aprobado sin observaciones adicionales' });
    assert.deepEqual(buildApproveDecision('   '), { status: 'Aprobado', reason: 'Aprobado sin observaciones adicionales' });
    assert.deepEqual(buildApproveDecision(null), { status: 'Aprobado', reason: 'Aprobado sin observaciones adicionales' });
    assert.deepEqual(buildApproveDecision('  Con gusto  '), { status: 'Aprobado', reason: 'Con gusto' });
    assert.equal(resolveApprovalReason(undefined), 'Aprobado sin observaciones adicionales');
});

test('buildRejectDecision: el motivo es obligatorio; entradas vacías y solo espacios se rechazan', () => {
    for (const empty of ['', '  ', '\n', null, undefined]) {
        assert.deepEqual(buildRejectDecision(empty), { ok: false, message: 'Debes escribir un motivo de rechazo.' });
    }
    assert.deepEqual(buildRejectDecision(' Sin soporte '), { ok: true, status: 'Rechazado', reason: 'Sin soporte' });
});

test('mensaje de éxito: "Permiso <estado> exitosamente."', () => {
    assert.equal(getPermissionUpdatedMessage('Aprobado'), 'Permiso Aprobado exitosamente.');
    assert.equal(getPermissionUpdatedMessage('Rechazado'), 'Permiso Rechazado exitosamente.');
});

summarize();
