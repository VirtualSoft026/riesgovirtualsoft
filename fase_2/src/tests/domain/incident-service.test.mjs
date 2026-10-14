import { createRunner, assert } from '../test-harness.mjs';
import {
    INCIDENTS_LIMIT,
    INCIDENT_DEFAULT_TYPE,
    INCIDENT_MESSAGES,
    buildIncidentPayload,
    parseIncidentForm,
    snapshotToIncidents
} from '../../domain/incidents/incident-service.js';
import { EMPTY_INCIDENTS_HTML, buildIncidentsTableHtml, formatIncidentDate } from '../../ui/views/incidents-view.js';
import { escapeHTML } from '../../utils/sanitization.js';
import { createFakeRtdb } from '../helpers/fake-rtdb-comunicados.mjs';

const { test, testAsync, summarizeAsync } = createRunner('incident-service + incidents-view (novedades; diferencial vs app.js 8724-8815)');

/** Copia LITERAL de app.js 8777-8815 (renderIncidentsTable), con el DOM reducido a un objeto. */
function legacyRenderIncidentsTable(incidents) {
    const tbody = { innerHTML: '' };

    if (!incidents || incidents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">No hay novedades ni incidentes registrados.</td></tr>`;
        return tbody.innerHTML;
    }

    let html = '';
    incidents.forEach(inc => {
        const dateStr = inc.timestamp ? new Date(inc.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
        const typeBadge = `<span class="badge pending" style="font-size: 10px;">${escapeHTML(inc.type || 'Soporte')}</span>`;
        const statusBadge = inc.status === 'Cerrado' 
            ? `<span class="badge status-completed" style="font-size: 10px; background: var(--success); color: white;">Cerrado</span>`
            : `<span class="badge in-progress" style="font-size: 10px; background: var(--warning); color: white;">Abierto</span>`;

        html += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 10px; font-size: 12px; color: var(--text-secondary);">${dateStr}</td>
                <td style="padding: 10px;">${typeBadge}</td>
                <td style="padding: 10px;">
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 13px;">${escapeHTML(inc.title || '')}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${escapeHTML(inc.detail || '')}</div>
                    ${inc.assignedTo ? `<div style="font-size: 10px; color: var(--accent-primary); margin-top: 2px;">Resp: ${escapeHTML(inc.assignedTo)}</div>` : ''}
                </td>
                <td style="padding: 10px; font-size: 12px; color: var(--text-primary);">${escapeHTML(inc.reportedBy || 'Anónimo')}</td>
                <td style="padding: 10px; text-align: center;">${statusBadge}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    return tbody.innerHTML;
}

/** Copia LITERAL de app.js 8764-8774 (conversión del snapshot), con `renderIncidentsTable` reemplazado por el retorno. */
function legacySnapshotToIncidents(snapshot) {
    const incidents = [];
    if (snapshot.exists()) {
        snapshot.forEach((childSnap) => {
            incidents.unshift({ id: childSnap.key, ...childSnap.val() });
        });
    }
    return incidents;
}

function makeRng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

const EVIL = {
    type: '<script>alert(1)</script>',
    title: '"><img src=x onerror=alert(2)>',
    detail: "'; alert(3); //<svg onload=alert(4)>",
    assignedTo: '<a href="javascript:alert(5)">x</a>',
    reportedBy: '</td><script>alert(6)</script>'
};

test('diferencial: la tabla es idéntica byte a byte (vacía, nula, cerrados/abiertos, campos ausentes, maliciosos; fijo + 300 aleatorios)', () => {
    const fixed = [
        [], null, undefined,
        [{ id: 'a', timestamp: 1790000000000, type: 'Soporte', title: 'T', detail: 'D', assignedTo: 'Ana', reportedBy: 'Luis', status: 'Cerrado' }],
        [{ id: 'b' }],
        [{ id: 'c', timestamp: 0, status: 'Abierto', ...EVIL }],
        [{ id: 'd', timestamp: 1790000000000, status: 'otro', title: '  ', detail: '' }]
    ];
    fixed.forEach((incs) => assert.equal(buildIncidentsTableHtml(incs), legacyRenderIncidentsTable(incs)));
    assert.equal(buildIncidentsTableHtml([]), EMPTY_INCIDENTS_HTML);

    const rng = makeRng(9001);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    for (let i = 0; i < 300; i += 1) {
        const incs = [];
        for (let j = 0, n = Math.floor(rng() * 6); j < n; j += 1) {
            const inc = { id: `k${j}` };
            if (rng() < 0.8) inc.timestamp = 1790000000000 + Math.floor(rng() * 1e9);
            if (rng() < 0.7) inc.type = pick(['Soporte', 'Novedad Operativa', EVIL.type, '']);
            if (rng() < 0.9) inc.title = pick(['T', EVIL.title, '']);
            if (rng() < 0.9) inc.detail = pick(['D', EVIL.detail, '']);
            if (rng() < 0.5) inc.assignedTo = pick(['Ana', EVIL.assignedTo, '']);
            if (rng() < 0.8) inc.reportedBy = pick(['Luis', EVIL.reportedBy, '']);
            if (rng() < 0.8) inc.status = pick(['Abierto', 'Cerrado', 'x']);
            incs.push(inc);
        }
        assert.equal(buildIncidentsTableHtml(incs), legacyRenderIncidentsTable(incs));
    }
});

test('XSS: tipo, título, detalle, responsable y reportante se escapan (<script>, onerror=, javascript:)', () => {
    const html = buildIncidentsTableHtml([{ id: 'x', timestamp: 1790000000000, status: 'Abierto', ...EVIL }]);
    assert.ok(!html.includes('<script') && !html.includes('<img') && !html.includes('<svg') && !html.includes('<a href'));
    assert.ok(!/<[^>]*\sonerror\s*=/i.test(html) && !/<[^>]*\sonload\s*=/i.test(html));
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(html.includes('&quot;&gt;&lt;img src=x onerror=alert(2)&gt;'));
    assert.ok(html.includes('&lt;a href=&quot;javascript:alert(5)&quot;&gt;x&lt;/a&gt;'));
});

test('el escapeHTML puede inyectarse (app.js usa el suyo)', () => {
    const html = buildIncidentsTableHtml([{ id: 'x', title: 'T', detail: 'D', type: 'Y', reportedBy: 'R', assignedTo: 'A' }], { escapeHTML: (v) => `E(${v})` });
    assert.ok(html.includes('E(T)') && html.includes('E(D)') && html.includes('E(Y)') && html.includes('E(R)') && html.includes('E(A)'));
});

test('formatIncidentDate: N/A sin marca de tiempo; formato corto con ella', () => {
    assert.equal(formatIncidentDate(undefined), 'N/A');
    assert.equal(formatIncidentDate(0), 'N/A');
    assert.equal(formatIncidentDate(1790000000000), new Date(1790000000000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }));
});

test('formulario: tipo por omisión, recortes, responsable = nombre del usuario si queda vacío (app.js 8730-8733)', () => {
    const user = { name: 'Ana' };
    assert.deepEqual(parseIncidentForm({ type: '', title: '  Caída  ', assignee: '   ', detail: ' detalle ' }, user),
        { ok: true, type: INCIDENT_DEFAULT_TYPE, title: 'Caída', assignee: 'Ana', detail: 'detalle' });
    assert.deepEqual(parseIncidentForm({ type: 'Soporte', title: 'T', assignee: ' Luis ', detail: 'D' }, user),
        { ok: true, type: 'Soporte', title: 'T', assignee: 'Luis', detail: 'D' });
    assert.equal(parseIncidentForm({ title: '   ', detail: 'D' }, user).ok, false);
    assert.equal(parseIncidentForm({ title: 'T', detail: '' }, user).ok, false);
    assert.equal(parseIncidentForm({}, user).ok, false, 'campos ausentes en la página');
    assert.equal(parseIncidentForm({ title: 'T', detail: 'D' }, user).type, 'Novedad Operativa');
});

test('payload: forma exacta, estado "Abierto", marca de tiempo de `now` y cumple la regla de creación de logs (uid === auth.uid)', () => {
    const p = buildIncidentPayload({ type: 'Soporte', title: 'T', assignee: 'Ana', detail: 'D', currentUser: { name: 'Ana', email: 'a@v.tech' }, uid: 'u1', now: 1790000000000 });
    assert.deepEqual(p, { uid: 'u1', type: 'Soporte', title: 'T', assignedTo: 'Ana', detail: 'D', reportedBy: 'Ana', reportedByEmail: 'a@v.tech', timestamp: 1790000000000, status: 'Abierto' });
    assert.equal(buildIncidentPayload({ type: 't', title: 'T', assignee: 'a', detail: 'D', currentUser: { name: 'A' }, uid: 'u', now: 1 }).reportedByEmail, '');
    // regla: newData.child('uid').val() === auth.uid
    assert.equal(p.uid === 'u1', true);
});

testAsync('snapshotToIncidents: más reciente primero, con id; vacío y nulo dan lista vacía; diferencial vs app.js', async () => {
    const db = createFakeRtdb({ data: { logs: { a: { timestamp: 1, title: 'a' }, b: { timestamp: 3, title: 'b' }, c: { timestamp: 2, title: 'c' } } } });
    const snap = await db.ref('logs').orderByChild('timestamp').limitToLast(50).once('value');
    const got = snapshotToIncidents(snap);
    assert.deepEqual(got.map((i) => i.id), ['b', 'c', 'a']);
    assert.deepEqual(got, legacySnapshotToIncidents(snap));
    assert.ok(got.every((i) => typeof i.title === 'string'));
    const empty = await createFakeRtdb().ref('logs').once('value');
    assert.deepEqual(snapshotToIncidents(empty), []);
    assert.deepEqual(legacySnapshotToIncidents(empty), []);
});

test('límite de 50 y textos de alert', () => {
    assert.equal(INCIDENTS_LIMIT, 50);
    assert.equal(INCIDENT_MESSAGES.LOGIN_REQUIRED, 'Debes iniciar sesión para registrar una novedad.');
    assert.equal(INCIDENT_MESSAGES.MISSING_FIELDS, 'Por favor completa el título y el detalle de la novedad.');
    assert.equal(INCIDENT_MESSAGES.REGISTERED, '¡Novedad/Incidente registrada exitosamente!');
    assert.equal(INCIDENT_MESSAGES.REGISTER_ERROR, 'Ocurrió un error al registrar la novedad.');
});

test('D2 revisión: marca de tiempo y estado manipulados, y comillas en los textos, no inyectan HTML en la tabla de novedades', () => {
    const EVIL = `"'><img src=x onerror=alert(1)><script>alert(2)</script>`;
    const html = buildIncidentsTableHtml([
        { title: EVIL, detail: EVIL, type: EVIL, assignedTo: EVIL, reportedBy: EVIL, status: EVIL, timestamp: EVIL },
        { title: `O'Brien "Bob"`, detail: 'd', status: 'Cerrado', timestamp: 1700000000000 }
    ]);
    assert.ok(!/<script/i.test(html) && !/<img/i.test(html) && !/<[^>]*\sonerror\s*=/i.test(html));
    assert.ok(html.includes('Invalid Date'), 'una marca de tiempo de texto sale de new Date(), nunca cruda');
    assert.ok(html.includes('>Abierto</span>'), 'un estado desconocido cae en la insignia fija "Abierto"');
    assert.ok(html.includes('O&#039;Brien &quot;Bob&quot;'));
});

await summarizeAsync();
