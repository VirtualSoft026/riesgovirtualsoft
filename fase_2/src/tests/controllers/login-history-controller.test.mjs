import { createRunner, assert } from '../test-harness.mjs';
import { createFakeRtdb } from '../helpers/fake-rtdb-comunicados.mjs';
import { createFakeDocument } from '../helpers/fake-dom-comunicados.mjs';
import { createLoginHistoryRepository } from '../../services/firebase/firebase-login-history-repository.js';
import { createLoginHistoryController } from '../../controllers/login-history-controller.js';
import { LOGIN_HISTORY_ERROR_HTML, LOGIN_HISTORY_LOADING_HTML, LOGIN_HISTORY_EMPTY_HTML } from '../../domain/auth/login-history.js';

const { test, testAsync, summarizeAsync } = createRunner('login-history-controller (modal de accesos con base y DOM simulados)');

const NOW = Date.UTC(2026, 9, 6, 20, 0, 0);
const iso = (ms) => new Date(ms).toISOString();

function data() {
    return {
        active_sessions: { u1: { name: 'Ana', email: 'ana@v.tech', shift: '8am - 4pm', loginTime: iso(NOW - 3600000), lastActive: NOW - 1000, status: 'En Línea' } },
        login_history: { h1: { name: 'Beto', loginTime: iso(NOW - 2 * 86400000), shift: '6am - 2pm' }, h2: { name: 'Cata', loginTime: iso(NOW - 20 * 86400000) } },
        shift_reports: { r1: { gestor: 'Dani', turnoProgramado: 'Descansa', horaInicio: iso(NOW - 40 * 86400000) } }
    };
}

function setup(d = data(), options = {}) {
    const db = createFakeRtdb({ data: d });
    const document = createFakeDocument();
    const errors = [];
    const controller = createLoginHistoryController({ repository: createLoginHistoryRepository({ database: db }), document, now: () => NOW, logger: { error: (...a) => errors.push(a) }, options });
    return { db, document, controller, errors };
}

testAsync('abrir: muestra "Cargando...", lee las tres fuentes en orden y pinta la tabla ordenada por fecha desc', async () => {
    const t = setup();
    const p = t.controller.open();
    assert.equal(t.document.isActive('loginHistoryModal'), true);
    assert.equal(t.document.el('loginHistoryTableBody').innerHTML, LOGIN_HISTORY_LOADING_HTML);
    await p;
    const html = t.document.el('loginHistoryTableBody').innerHTML;
    assert.deepEqual(t.controller.getRecords().map((r) => r.name), ['Ana', 'Beto', 'Cata', 'Dani']);
    assert.ok(html.includes('En Línea') && html.includes('Ingreso en Descanso'));
});

testAsync('abrir con error de lectura (sin permiso): muestra el mensaje de error y registra el error', async () => {
    const t = setup();
    t.db.rules = { canRead: () => false, canWrite: () => true };
    await t.controller.open();
    assert.equal(t.document.el('loginHistoryTableBody').innerHTML, LOGIN_HISTORY_ERROR_HTML);
    assert.equal(t.errors[0][0], 'Error cargando historial de accesos:');
});

testAsync('abrir sin nodos: tabla vacía con el mensaje; sin modal en la página no hace nada', async () => {
    const t = setup({});
    await t.controller.open();
    assert.equal(t.document.el('loginHistoryTableBody').innerHTML, LOGIN_HISTORY_EMPTY_HTML);
    const m = createFakeDocument({ missing: ['loginHistoryModal'] });
    const c = createLoginHistoryController({ repository: createLoginHistoryRepository({ database: createFakeRtdb() }), document: m, now: () => NOW });
    await c.open();
    assert.equal(m.elements.size, 0);
});

testAsync('filtrar: por texto y por fecha con los controles de la página; sin controles usa "todos" y texto vacío', async () => {
    const t = setup();
    await t.controller.open();
    t.document.el('loginHistorySearch').value = '  BETO ';
    t.document.el('loginHistoryDateFilter').value = 'todos';
    t.controller.filter();
    assert.ok(t.document.el('loginHistoryTableBody').innerHTML.includes('Beto') && !t.document.el('loginHistoryTableBody').innerHTML.includes('Ana'));
    t.document.el('loginHistorySearch').value = '';
    t.document.el('loginHistoryDateFilter').value = '7d';
    t.controller.filter();
    const html = t.document.el('loginHistoryTableBody').innerHTML;
    assert.ok(html.includes('Ana') && html.includes('Beto') && !html.includes('Cata') && !html.includes('Dani'));
    t.document.el('loginHistorySearch').value = 'zzz';
    t.controller.filter();
    assert.equal(t.document.el('loginHistoryTableBody').innerHTML, LOGIN_HISTORY_EMPTY_HTML);
    const t2 = setup();
    await t2.controller.open();
    t2.document.getElementById = (id) => (id.startsWith('loginHistory') && id !== 'loginHistoryTableBody' ? null : t2.document.elements.get(id) || (t2.document.elements.set(id, { innerHTML: '' }), t2.document.elements.get(id)));
    t2.controller.filter();
    assert.equal(t2.controller.getRecords().length, 4);
});

testAsync('D2 (predeterminado): un loginTime malicioso escrito por un gestor se pinta ESCAPADO; el original (sin escapar) solo con escapeRawLoginTime: false', async () => {
    const d = data();
    d.login_history.hx = { name: 'Mal', loginTime: '<img src=x onerror=alert(1)>' };
    d.login_history.hy = { name: 'Mal2', loginTime: `"><script>alert('x')</script>` };
    const legacy = setup(d, { escapeRawLoginTime: false });
    await legacy.controller.open();
    assert.ok(legacy.document.el('loginHistoryTableBody').innerHTML.includes('<img src=x onerror=alert(1)>'), 'HALLAZGO reproducido solo con la opción legada');
    for (const options of [{}, { escapeRawLoginTime: true }]) {
        const safe = setup(d, options);
        await safe.controller.open();
        const html = safe.document.el('loginHistoryTableBody').innerHTML;
        assert.ok(!html.includes('<img') && !html.includes('<script'), JSON.stringify(options));
        assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;') && html.includes('&quot;&gt;&lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt;'));
        // al filtrar por texto se repinta igual de escapado
        safe.document.el('loginHistorySearch').value = 'mal';
        safe.document.el('loginHistoryDateFilter').value = 'todos';
        safe.controller.filter();
        assert.ok(safe.document.el('loginHistoryTableBody').innerHTML.includes('Mal2'));
        assert.ok(!safe.document.el('loginHistoryTableBody').innerHTML.includes('<img'));
    }
});

testAsync('filtro con fecha inválida: el original lanza (RangeError); con tolerateInvalidDates no', async () => {
    const d = data();
    d.login_history.hx = { name: 'Rota', loginTime: 'rota' };
    const t = setup(d);
    await t.controller.open();
    t.document.el('loginHistoryDateFilter').value = '7d';
    assert.throws(() => t.controller.filter(), RangeError);
    const s = setup(d, { tolerateInvalidDates: true });
    await s.controller.open();
    s.document.el('loginHistoryDateFilter').value = '7d';
    s.controller.filter();
    assert.ok(!s.document.el('loginHistoryTableBody').innerHTML.includes('Rota'));
});

await summarizeAsync();
