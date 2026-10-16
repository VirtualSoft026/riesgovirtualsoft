import { createRunner, assert } from '../test-harness.mjs';
import { createFakeRtdb } from '../helpers/fake-rtdb-comunicados.mjs';
import { createFakeDocument } from '../helpers/fake-dom-comunicados.mjs';
import { createConfigRepository } from '../../services/firebase/firebase-config-repository.js';
import { createConfigGestoresController } from '../../controllers/config-gestores-controller.js';
import { canWriteHasSplitShift } from '../../domain/users/gestor-config.js';
import { escapeHTML } from '../../utils/sanitization.js';
import { normalizeLegacyHtml } from '../helpers/w50-delegation.mjs';

const { test, testAsync, summarizeAsync } = createRunner('config-gestores-controller (interruptor de Pausa de Turno con base y DOM simulados)');

// ---- Copia LITERAL de app.js 6757-6834 (renderConfigGestores + toggleGestorSplitShift), con sus globales como parámetros ----
function makeLegacy({ database, document, confirm, alert, console }) {
    function renderConfigGestores() {
        const tbody = document.getElementById('configGestoresTableBody');
        if (!tbody) return;

        database.ref('users').once('value').then(snap => {
            tbody.innerHTML = '';
            if (!snap.exists()) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay gestores registrados.</td></tr>';
                return;
            }

            const usersMap = {};
            snap.forEach(child => {
                const u = child.val();
                // Mostrar solo Gestores (excluir Supervisores como Sara y Camilo)
                if (u.role === 'Gestor' && u.email && !u.email.toLowerCase().includes('pruebas')) {
                    const email = u.email.toLowerCase();
                    // Si hay duplicados, preferimos el que tenga loginTime mas reciente o simplemente guardamos uno
                    if (!usersMap[email] || (u.loginTime && (!usersMap[email].loginTime || new Date(u.loginTime) > new Date(usersMap[email].loginTime)))) {
                        u.uid = child.key;
                        usersMap[email] = u;
                    }
                }
            });

            const users = Object.values(usersMap);

            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay gestores registrados.</td></tr>';
                return;
            }

            // Ordenar alfabéticamente
            users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            users.forEach(u => {
                const hasSplitShift = u.hasSplitShift === true;
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                row.innerHTML = `
                <td style="padding: 15px; display: flex; align-items: center; gap: 10px;">
                    <div style="width: 30px; height: 30px; background: var(--glass-border); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--accent-primary);"><i class='bx bx-user'></i></div>
                    <div>
                        <div style="font-weight: 500; color: var(--text-primary);">${u.name || 'Desconocido'}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">${u.role}</div>
                    </div>
                </td>
                <td style="padding: 15px; color: var(--text-secondary); font-size: 13px;">${u.email}</td>
                <td style="padding: 15px; text-align: center;">
                    <label for="splitShiftToggle_${u.uid}" class="switch" style="position: relative; display: inline-block; width: 44px; height: 22px;">
                        <input type="checkbox" id="splitShiftToggle_${u.uid}" name="splitShiftToggle_${u.uid}" aria-label="Turno Partido para ${escapeHTML(u.name || 'Gestor')}" onchange="toggleGestorSplitShift('${u.uid}', this.checked)" ${hasSplitShift ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                        <span class="slider round" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${hasSplitShift ? 'var(--success)' : 'var(--glass-border)'}; transition: .4s; border-radius: 22px;">
                            <span style="position: absolute; height: 16px; width: 16px; left: ${hasSplitShift ? '24px' : '3px'}; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%;"></span>
                        </span>
                    </label>
                </td>
            `;
                tbody.appendChild(row);
            });
        }).catch(err => {
            console.error('Error cargando gestores:', err);
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--danger); padding: 20px;">Error al cargar datos.</td></tr>';
        });
    }

    function toggleGestorSplitShift(uid, isChecked) {
        if(confirm(`¿Estás segura de que quieres ${isChecked ? 'habilitar' : 'deshabilitar'} la Pausa de Turno para este usuario?`)) {
            database.ref('users/' + uid + '/hasSplitShift').set(isChecked).then(() => {
                renderConfigGestores(); // Refrescar vista
            }).catch(err => {
                console.error('Error actualizando permiso de turno partido:', err);
                alert("Hubo un error al guardar. Intenta de nuevo.");
                renderConfigGestores(); // Revertir toggle
            });
        } else {
            renderConfigGestores(); // Revertir toggle si cancela
        }
    }

    return { renderConfigGestores, toggleGestorSplitShift };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 5));

const USERS = () => ({
    a1: { name: 'Admin', role: 'Admin', email: 'admin@virtualsoft.tech', approved: true },
    g1: { name: 'Zoe', role: 'Gestor', email: 'zoe@virtualsoft.tech', approved: true, hasSplitShift: true },
    g2: { name: 'Ana', role: 'Gestor', email: 'ana@virtualsoft.tech', approved: true },
    g3: { name: 'Beto', role: 'Gestor', email: 'beto@virtualsoft.tech', approved: true, hasSplitShift: false },
    g4: { name: 'Pru', role: 'Gestor', email: 'qa.pruebas@virtualsoft.tech', approved: true }
});

/** Entorno con reglas reales de escritura del flag (solo Admin aprobado). */
function setup({ data = { users: USERS() }, actor = { uid: 'a1', role: 'Admin', approved: true }, confirmAnswer = true, options = {} } = {}) {
    const db = createFakeRtdb({ data });
    const document = createFakeDocument();
    const alerts = [];
    const errors = [];
    const confirms = [];
    db.rules = {
        canRead: () => true,
        canWrite: (op, path, newValue, oldValue) => {
            const m = /^users\/([^/]+)\/hasSplitShift$/.exec(path);
            if (!m) return false;
            return canWriteHasSplitShift({ actor, targetUid: m[1], targetExists: db.snapshot(`users/${m[1]}`) !== null, newValue });
        }
    };
    const confirm = (m) => { confirms.push(m); return confirmAnswer; };
    const alert = (m) => alerts.push(m);
    const logger = { error: (...a) => errors.push(a) };
    const controller = createConfigGestoresController({ repository: createConfigRepository({ database: db }), document, confirm, alert, logger, options });
    return { db, document, controller, alerts, errors, confirms, confirm, alert, logger };
}

function tableState(document) {
    const tbody = document.el('configGestoresTableBody');
    return { html: tbody.innerHTML, rows: tbody.children.map((r) => ({ borderBottom: r.style.borderBottom, html: r.innerHTML })) };
}

/**
 * W-52 y paso 3.4: el escape ya no se apaga. Para comparar con app.js se usan datos sin caracteres especiales, y el
 * ORIGINAL (con sus `onchange`/`onclick` en línea) se lleva a la forma delegada con el normalizador general
 * (src/tests/helpers/legacy-action-migration.mjs). El resto del HTML se compara byte a byte.
 */
function delegatedLegacyState(state) {
    return { html: normalizeLegacyHtml(state.html), rows: state.rows.map((r) => ({ ...r, html: normalizeLegacyHtml(r.html) })) };
}

testAsync('diferencial (datos sin caracteres especiales): la tabla es idéntica a la de app.js (varios conjuntos, incluido vacío y sin gestores)', async () => {
    const datasets = [
        { users: USERS() },
        {},
        { users: { a1: { name: 'Admin', role: 'Admin', email: 'a@v.tech' } } },
        { users: { x: { name: 'Dup', role: 'Gestor', email: 'dup@v.tech' }, y: { name: 'Dup', role: 'Gestor', email: 'DUP@v.tech', loginTime: '2026-10-05T00:00:00.000Z' } } }
    ];
    for (const data of datasets) {
        const a = setup({ data });
        await a.controller.render();
        const b = setup({ data });
        const legacy = makeLegacy({ database: b.db, document: b.document, confirm: b.confirm, alert: b.alert, console: b.logger });
        legacy.renderConfigGestores();
        await flush();
        assert.deepEqual(tableState(a.document), delegatedLegacyState(tableState(b.document)), JSON.stringify(Object.keys(data)));
    }
});

testAsync('render: muestra solo gestores, ordenados por nombre, con el interruptor según hasSplitShift === true', async () => {
    const t = setup();
    await t.controller.render();
    const rows = t.document.el('configGestoresTableBody').children;
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map((r) => /<div style="font-weight: 500; color: var\(--text-primary\);">([^<]*)</.exec(r.innerHTML)[1]), ['Ana', 'Beto', 'Zoe']);
    assert.ok(rows[2].innerHTML.includes(' checked ') && !rows[0].innerHTML.includes(' checked ') && !rows[1].innerHTML.includes(' checked '));
});

testAsync('render: error de lectura (p. ej. un Gestor no puede leer users) muestra "Error al cargar datos."', async () => {
    const t = setup();
    t.db.rules.canRead = () => false;
    await t.controller.render();
    assert.ok(t.document.el('configGestoresTableBody').innerHTML.includes('Error al cargar datos.'));
    assert.equal(t.errors[0][0], 'Error cargando gestores:');
});

testAsync('render sin tabla en la página no hace nada', async () => {
    const t = setup();
    t.document.getElementById = (id) => (id === 'configGestoresTableBody' ? null : null);
    assert.equal(t.controller.render(), undefined);
});

testAsync('toggle (Admin): confirma, escribe el booleano en users/{uid}/hasSplitShift y repinta con el nuevo estado', async () => {
    const t = setup();
    await t.controller.toggle('g2', true);
    await flush();
    assert.deepEqual(t.confirms, ['¿Estás segura de que quieres habilitar la Pausa de Turno para este usuario?']);
    assert.strictEqual(t.db.snapshot('users/g2/hasSplitShift'), true);
    assert.ok(t.document.el('configGestoresTableBody').children[0].innerHTML.includes(' checked '), 'Ana ahora aparece activada');
    await t.controller.toggle('g2', false);
    await flush();
    assert.strictEqual(t.db.snapshot('users/g2/hasSplitShift'), false);
    assert.equal(t.confirms[1], '¿Estás segura de que quieres deshabilitar la Pausa de Turno para este usuario?');
    assert.ok(!t.document.el('configGestoresTableBody').children[0].innerHTML.includes(' checked '));
    assert.deepEqual(t.alerts, []);
});

testAsync('toggle cancelado: no escribe nada y el interruptor vuelve a su estado previo (se repinta desde la base)', async () => {
    const t = setup({ confirmAnswer: false });
    await t.controller.render();
    const before = tableState(t.document);
    assert.equal(t.controller.toggle('g2', true), undefined);
    await flush();
    assert.equal(t.db.log.length, 0);
    assert.deepEqual(tableState(t.document), before);
});

testAsync('FALLO DE ESCRITURA: un Supervisor (sin permiso por reglas) intenta cambiar el flag -> avisa y el interruptor regresa a su estado previo', async () => {
    const t = setup({ actor: { uid: 's1', role: 'Supervisor', approved: true } });
    await t.controller.render();
    const before = tableState(t.document);
    await t.controller.toggle('g2', true);
    await flush();
    assert.deepEqual(t.alerts, ['Hubo un error al guardar. Intenta de nuevo.']);
    assert.equal(t.errors[0][0], 'Error actualizando permiso de turno partido:');
    assert.equal(t.db.snapshot('users/g2/hasSplitShift'), null, 'la base no cambió');
    assert.deepEqual(tableState(t.document), before, 'la tabla (interruptor) volvió al estado previo');
});

testAsync('FALLO DE ESCRITURA: un Gestor tampoco puede activarse el flag a sí mismo (reglas); un Admin no aprobado tampoco', async () => {
    for (const actor of [{ uid: 'g2', role: 'Gestor', approved: true }, { uid: 'a1', role: 'Admin', approved: false }]) {
        const t = setup({ actor });
        await t.controller.toggle('g2', true);
        await flush();
        assert.deepEqual(t.alerts, ['Hubo un error al guardar. Intenta de nuevo.']);
        assert.equal(t.db.snapshot('users/g2/hasSplitShift'), null);
    }
});

testAsync('diferencial (datos sin caracteres especiales): toggle (confirmar, cancelar, escritura rechazada) produce las mismas escrituras, avisos, mensajes y tabla final que app.js', async () => {
    for (const scenario of [
        { name: 'confirmar', actor: { uid: 'a1', role: 'Admin', approved: true }, confirmAnswer: true },
        { name: 'cancelar', actor: { uid: 'a1', role: 'Admin', approved: true }, confirmAnswer: false },
        { name: 'rechazo', actor: { uid: 's1', role: 'Supervisor', approved: true }, confirmAnswer: true }
    ]) {
        const a = setup(scenario);
        await a.controller.toggle('g3', true);
        await flush();
        const b = setup(scenario);
        const legacy = makeLegacy({ database: b.db, document: b.document, confirm: b.confirm, alert: b.alert, console: b.logger });
        legacy.toggleGestorSplitShift('g3', true);
        await flush();
        assert.deepEqual(a.confirms, b.confirms, scenario.name);
        assert.deepEqual(a.alerts, b.alerts, scenario.name);
        assert.deepEqual(a.errors.map((e) => e[0]), b.errors.map((e) => e[0]), scenario.name);
        assert.deepEqual(a.db.log, b.db.log, scenario.name);
        assert.deepEqual(a.db.snapshot('users'), b.db.snapshot('users'), scenario.name);
        assert.deepEqual(tableState(a.document), delegatedLegacyState(tableState(b.document)), scenario.name);
    }
});

testAsync('el flag escrito es un booleano estricto y la tabla lo lee con === true: "true" (texto) en la base se muestra como DESACTIVADO', async () => {
    const t = setup({ data: { users: { g1: { name: 'Zoe', role: 'Gestor', email: 'zoe@virtualsoft.tech', hasSplitShift: 'true' } } } });
    await t.controller.render();
    assert.ok(!t.document.el('configGestoresTableBody').children[0].innerHTML.includes(' checked '));
});

const EVIL_USERS = () => ({
    g1: { name: '<img src=x onerror=alert(1)>', role: 'Gestor', email: '"><script>alert(2)</script>@virtualsoft.tech' },
    g2: { name: "O'Brien \"Bob\" <b>x</b>", role: 'Gestor', email: "o'brien@virtualsoft.tech" }
});

testAsync('D2 (predeterminado): nombre, rol y correo con <script>, <img onerror> y comillas se pintan ESCAPADOS (sin opción)', async () => {
    const t = setup({ data: { users: EVIL_USERS() } });
    await t.controller.render();
    const html = t.document.el('configGestoresTableBody').children.map((r) => r.innerHTML).join('\n');
    assert.ok(!html.includes('<img') && !html.includes('<script') && !html.includes('<b>'), 'ninguna etiqueta de usuario llega como HTML');
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
    assert.ok(html.includes('&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;@virtualsoft.tech'));
    assert.ok(html.includes('O&#039;Brien &quot;Bob&quot; &lt;b&gt;x&lt;/b&gt;'), 'comillas simples y dobles escapadas');
    assert.ok(html.includes('o&#039;brien@virtualsoft.tech'));
    // el interruptor sigue funcionando igual (uid alfanumérico: mismo argumento)
    assert.ok(html.includes(`data-action="toggle-gestor-split-shift" data-uid="g1"`) && !html.includes('onchange'));
});

testAsync('W-52: app.js pintaba el stored XSS; el controlador no tiene opción para reproducirlo', async () => {
    const b = setup({ data: { users: EVIL_USERS() } });
    const legacy = makeLegacy({ database: b.db, document: b.document, confirm: b.confirm, alert: b.alert, console: b.logger });
    legacy.renderConfigGestores();
    await flush();
    assert.ok(b.document.el('configGestoresTableBody').children.some((r) => r.innerHTML.includes('<img src=x onerror=alert(1)>')), 'HALLAZGO de app.js');
    for (const options of [{}, { escapeUserFields: false }]) {
        const t = setup({ data: { users: EVIL_USERS() }, options });
        await t.controller.render();
        assert.ok(!t.document.el('configGestoresTableBody').children.some((r) => r.innerHTML.includes('<img')), JSON.stringify(options));
    }
});

testAsync('D2: tras un toggle (o su rechazo) la tabla repintada sigue escapada', async () => {
    const t = setup({ data: { users: EVIL_USERS() }, actor: { uid: 's1', role: 'Supervisor', approved: true } });
    await t.controller.toggle('g1', true);
    await flush();
    assert.deepEqual(t.alerts, ['Hubo un error al guardar. Intenta de nuevo.']);
    assert.ok(!t.document.el('configGestoresTableBody').children.some((r) => r.innerHTML.includes('<img')));
});

await summarizeAsync();
