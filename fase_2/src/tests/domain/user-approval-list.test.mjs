import { createRunner, assert } from '../test-harness.mjs';
import {
    REJECTED_FILTER_OPTION,
    USER_STATUS_FILTER,
    formatApprovalDate,
    formatRegistrationDate,
    prepareUsersApprovalList,
    selectRejectedUsers
} from '../../domain/permissions/user-approval-list.js';
import { createRng } from '../controllers/approvals-fakes.mjs';

const { test, summarize } = createRunner('user-approval-list.js (diferencial vs app.js 4111-4219)');

// COPIAS LITERALES (app.js 723-726: normalizeName; 4121-4172: lista de usuarios; 4207-4208: textos de fecha)
function normalizeName(name) {
    if (!name) return "";
    return name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

function originalUsersList(users, searchValue, statusValue) {
    const pending = users.filter(u => u.approved === false);
    const approved = users.filter(u => u.approved === true && u.email !== 'maria.sanchez@virtualsoft.tech');

    const searchVal = searchValue !== null ? normalizeName(searchValue) : '';
    const statusVal = statusValue !== null ? statusValue : 'Todos';

    let allDisplayUsers = [...pending, ...approved].sort((a, b) => {
        const dateA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
        const dateB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
        return dateB - dateA;
    });

    // Apply filters
    const hasFilter = searchVal !== '' || statusVal !== 'Todos';
    allDisplayUsers = allDisplayUsers.filter(u => {
        const matchSearch = searchVal === '' || normalizeName(u.name || '').includes(searchVal) || normalizeName(u.email || '').includes(searchVal);
        let matchStatus = true;
        if (statusVal === 'Pendiente') matchStatus = (u.approved === false);
        if (statusVal === 'Aprobado') matchStatus = (u.approved === true);
        return matchSearch && matchStatus;
    });

    let message = null;
    // Only show top 5 if no filters are active to keep UI clean
    if (!hasFilter && allDisplayUsers.length > 5) {
        allDisplayUsers = allDisplayUsers.slice(0, 5);
        const total = [...pending, ...approved].length;
        message = `Mostrando los 5 registros más recientes de ${total} en total. Usa los filtros arriba para buscar más.`;
    }

    return { rows: allDisplayUsers, message, hasFilter };
}

const originalRegDate = (user) => user.registrationDate ? new Date(user.registrationDate).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Desconocida';
const originalAppDate = (user) => user.approvalDate ? new Date(user.approvalDate).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : (user.approved === true ? 'Desconocida' : '-');

// ---------------------------------------------------------------------------------------------
const rng = createRng(909);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

function randomUser(i) {
    return {
        id: 'u' + i,
        name: pick(['Ana Gómez', 'Luis Pérez', 'Ángela', undefined, null, '']),
        email: pick(['ana@virtualsoft.tech', 'maria.sanchez@virtualsoft.tech', 'x@y.z', undefined]),
        approved: pick([true, false, 'Rechazado', undefined, null, 'true']),
        registrationDate: pick(['2026-10-01T10:00:00.000Z', '2025-01-15T00:00:00Z', 'garbage', '', undefined, 1760000000000]),
        approvalDate: pick(['2026-10-02T09:30:00.000Z', undefined, 'garbage'])
    };
}

test('prepareUsersApprovalList idéntico al algoritmo original (400 casos aleatorios con filtros)', () => {
    for (let n = 0; n < 400; n += 1) {
        const users = Array.from({ length: Math.floor(rng() * 14) }, (_, i) => randomUser(i));
        const search = pick(['', '', 'ana', 'ÁNGELA', 'virtualsoft', ' x ', 'zzz', null]);
        const status = pick(['Todos', 'Todos', 'Pendiente', 'Aprobado', null]);

        const original = originalUsersList(JSON.parse(JSON.stringify(users)), search, status);
        const view = prepareUsersApprovalList(JSON.parse(JSON.stringify(users)), { search: search === null ? undefined : search, status: status === null ? undefined : status });

        assert.deepEqual(view.rows, original.rows, `filas, caso ${n} (${JSON.stringify(search)}, ${status})`);
        assert.equal(view.noticeText, original.message, `aviso, caso ${n}`);
        assert.equal(view.hasFilter, original.hasFilter, `hasFilter, caso ${n}`);
    }
});

test('los rechazados NO aparecen en "Todos"/"Pendiente"/"Aprobado" (igual que app.js; D9a los muestra solo en "Rechazado")', () => {
    const users = [{ id: 'r', approved: 'Rechazado', registrationDate: '2026-10-01' }, { id: 'p', approved: false }];

    for (const status of [undefined, 'Todos', 'Pendiente']) {
        assert.deepEqual(prepareUsersApprovalList(users, { status }).rows.map((u) => u.id), ['p'], String(status));
    }
    assert.deepEqual(prepareUsersApprovalList(users, { status: 'Aprobado' }).rows, []);
});

// ---------------------------------------------------------------------------------------------
// Decisión D9a: vista "Rechazados"
// ---------------------------------------------------------------------------------------------
test('D9a: el valor del filtro y la opción del selector', () => {
    assert.equal(USER_STATUS_FILTER.REJECTED, 'Rechazado');
    assert.deepEqual({ ...REJECTED_FILTER_OPTION }, { value: 'Rechazado', text: 'Rechazados' });
});

test('D9a: estado "Rechazado" devuelve SOLO los rechazados (approved === "Rechazado"), más reciente primero', () => {
    const users = [
        { id: 'p', approved: false, registrationDate: '2026-10-05' },
        { id: 'a', approved: true, registrationDate: '2026-10-04' },
        { id: 'r1', approved: 'Rechazado', registrationDate: '2026-10-01' },
        { id: 'r2', approved: 'Rechazado', registrationDate: '2026-10-03' },
        { id: 'r3', approved: 'Rechazado' },
        { id: 'x', approved: 'rechazado' }, // otro texto: no es el valor que escribe app.js
        { id: 'm', approved: 'Rechazado', email: 'maria.sanchez@virtualsoft.tech', registrationDate: '2026-10-02' }
    ];
    const view = prepareUsersApprovalList(users, { status: 'Rechazado' });

    assert.deepEqual(view.rows.map((u) => u.id), ['r2', 'm', 'r1', 'r3']);
    assert.equal(view.hasFilter, true);
    assert.equal(view.truncated, false);
    assert.equal(view.noticeText, null);
    assert.equal(view.total, 4);
});

test('D9a: la vista "Rechazado" nunca recorta a 5 y aplica la búsqueda (sin acentos, nombre o correo)', () => {
    const users = Array.from({ length: 9 }, (_, i) => ({ id: 'r' + i, approved: 'Rechazado', name: i === 4 ? 'Ángela Ruiz' : 'Rech ' + i, email: `r${i}@virtualsoft.tech` }));

    assert.equal(prepareUsersApprovalList(users, { status: 'Rechazado' }).rows.length, 9);
    assert.deepEqual(prepareUsersApprovalList(users, { status: 'Rechazado', search: ' ANGELA ' }).rows.map((u) => u.id), ['r4']);
    assert.deepEqual(prepareUsersApprovalList(users, { status: 'Rechazado', search: 'r7@' }).rows.map((u) => u.id), ['r7']);
    assert.deepEqual(selectRejectedUsers(users, 'zzz'), []);
    assert.deepEqual(selectRejectedUsers([null, { approved: 'Rechazado', id: 'z' }]).map((u) => u.id), ['z']);
});

test('D9a: con { includeRejected: false } el estado "Rechazado" es idéntico al algoritmo original (200 casos)', () => {
    for (let n = 0; n < 200; n += 1) {
        const users = Array.from({ length: Math.floor(rng() * 14) }, (_, i) => randomUser(i));
        const search = pick(['', 'ana', 'virtualsoft']);
        const original = originalUsersList(JSON.parse(JSON.stringify(users)), search, 'Rechazado');
        const view = prepareUsersApprovalList(JSON.parse(JSON.stringify(users)), { search, status: 'Rechazado' }, { includeRejected: false });

        assert.deepEqual(view.rows, original.rows, `caso ${n}`);
        assert.equal(view.noticeText, original.message, `aviso, caso ${n}`);
    }
});

test('D9a: "F. Aprobación" de un rechazado es "-" (como app.js)', () => {
    assert.equal(formatApprovalDate({ approved: 'Rechazado' }, () => 'X'), '-');
});

test('la administradora protegida nunca aparece como aprobada, pero sí si estuviera pendiente', () => {
    const view = prepareUsersApprovalList([
        { id: 'm1', approved: true, email: 'maria.sanchez@virtualsoft.tech' },
        { id: 'm2', approved: false, email: 'maria.sanchez@virtualsoft.tech' }
    ]);

    assert.deepEqual(view.rows.map((u) => u.id), ['m2']);
});

test('pendientes y aprobados se ordenan juntos por fecha de registro, más reciente primero', () => {
    const view = prepareUsersApprovalList([
        { id: 'a', approved: true, registrationDate: '2026-10-01T00:00:00Z' },
        { id: 'b', approved: false, registrationDate: '2026-10-03T00:00:00Z' },
        { id: 'c', approved: true, registrationDate: '2026-10-02T00:00:00Z' },
        { id: 'd', approved: false }
    ]);

    assert.deepEqual(view.rows.map((u) => u.id), ['b', 'c', 'a', 'd']);
});

test('sin filtros y más de 5 filas: recorta a 5 y el aviso cuenta el total sin recortar; con filtro no recorta', () => {
    const users = Array.from({ length: 9 }, (_, i) => ({ id: 'u' + i, approved: i % 2 === 0, name: 'Gestor', registrationDate: `2026-09-${10 + i}T00:00:00Z` }));
    const unfiltered = prepareUsersApprovalList(users, { search: '', status: USER_STATUS_FILTER.ALL });
    const filtered = prepareUsersApprovalList(users, { search: 'gestor', status: USER_STATUS_FILTER.ALL });

    assert.equal(unfiltered.rows.length, 5);
    assert.equal(unfiltered.total, 9);
    assert.equal(unfiltered.noticeText, 'Mostrando los 5 registros más recientes de 9 en total. Usa los filtros arriba para buscar más.');
    assert.equal(filtered.rows.length, 9);
    assert.equal(filtered.noticeText, null);
});

test('textos de fecha idénticos al original (con fecha, sin fecha, aprobado sin fecha, fecha inválida)', () => {
    const cases = [
        { registrationDate: '2026-10-01T10:00:00.000Z', approvalDate: '2026-10-02T09:30:00.000Z', approved: true },
        { approved: true }, { approved: false }, { approved: 'Rechazado' },
        { registrationDate: 'garbage', approvalDate: 'garbage', approved: true }, { registrationDate: 1760000000000 }
    ];

    for (const user of cases) {
        assert.equal(formatRegistrationDate(user), originalRegDate(user), 'solicitud ' + JSON.stringify(user));
        assert.equal(formatApprovalDate(user), originalAppDate(user), 'aprobación ' + JSON.stringify(user));
    }
});

test('formatDate inyectable (para formatos fijos en pruebas)', () => {
    const fixed = () => 'FECHA';

    assert.equal(formatRegistrationDate({ registrationDate: '2026-10-01' }, fixed), 'FECHA');
    assert.equal(formatApprovalDate({ approvalDate: '2026-10-01' }, fixed), 'FECHA');
    assert.equal(formatApprovalDate({ approved: true }, fixed), 'Desconocida');
    assert.equal(formatApprovalDate({ approved: false }, fixed), '-');
});

summarize();
