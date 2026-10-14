import { createRunner, assert } from '../test-harness.mjs';
import {
    ANNOUNCEMENT_MESSAGES,
    EMPTY_ADMIN_TABLE_HTML,
    EMPTY_GESTOR_LIST_HTML,
    UNKNOWN_UID,
    buildAdminComunicadosRowsHtml,
    buildAnnouncementPayload,
    buildAnnouncementView,
    buildGestorComunicadosHtml,
    buildReadReceipt,
    buildReadersListHtml,
    buildUnreadersListHtml,
    canDeleteComunicados,
    canManageComunicados,
    canPublishComunicados,
    canViewComunicadoLecturas,
    computeUnreadBadge,
    countUnreadAnnouncements,
    findNextUnreadUrgent,
    formatAnnouncementDate,
    isAnnouncementRead,
    isPendingReaderCandidate,
    parseNewAnnouncementForm,
    resolveAnnouncementAuthor,
    resolveReaderUid,
    sortAnnouncementKeys,
    READ_FAILURE_KINDS,
    URGENT_ANNOUNCEMENT_ROLE_POLICY,
    URGENT_MODAL_MANDATORY,
    applyAssumedReads,
    classifyReadWriteError,
    requiresUrgentConfirmation,
    resolveUrgentAnnouncementPolicy
} from '../../domain/announcements/announcement-service.js';
import { escapeHTML, encodeInlineHandlerArg, sanitizeAnnouncementHTML } from '../../utils/sanitization.js';

const { test, summarize } = createRunner('announcement-service (comunicados: lógica pura, diferencial vs app.js 6555-6965)');

// ---------------------------------------------------------------------------------------------
// Copias LITERALES del algoritmo original de app.js (el DOM se reemplaza por un objeto con
// `innerHTML`; escapeHTML/encodeInlineHandlerArg/sanitizeAnnouncementHTML son los de utils/).
// ---------------------------------------------------------------------------------------------

/** app.js 6651-6690 (renderGestorComunicados). */
function legacyRenderGestor(globalComunicados, currentUser, authUser) {
    const list = { innerHTML: '' };
    list.innerHTML = '';
    const keys = Object.keys(globalComunicados).sort((a,b) => {
        return new Date(globalComunicados[b].date) - new Date(globalComunicados[a].date);
    });

    if (keys.length === 0) {
        list.innerHTML = `<div class="glass-panel" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay comunicados activos.</div>`;
        return list.innerHTML;
    }

    const uid = (currentUser && currentUser.uid) ? currentUser.uid : (authUser ? authUser.uid : 'unknown');

    keys.forEach(key => {
        const c = globalComunicados[key];
        const isRead = c.readBy && c.readBy[uid];
        const formattedDate = new Date(c.date).toLocaleString('es-CO');

        let actionsHtml = '';
        if (isRead) {
            actionsHtml = `<div style="color: var(--success); font-size: 13px; margin-top: 15px; font-weight: 500;"><i class='bx bx-check-double'></i> Leído el ${new Date(c.readBy[uid].readAt).toLocaleString('es-CO')}</div>`;
        } else {
            actionsHtml = `<button class="btn btn-primary" style="margin-top: 15px; width: 100%; max-width: 300px; background: var(--success); border-color: var(--success);" onclick="markComunicadoAsRead(decodeURIComponent('${encodeInlineHandlerArg(key)}'))"><i class='bx bx-check'></i> Marcar como Leído y Entendido</button>`;
        }

        list.innerHTML += `
            <div class="glass-panel" style="padding: 20px; border-left: 4px solid ${isRead ? 'var(--glass-border)' : 'var(--danger)'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <h3 style="color: ${isRead ? 'var(--text-primary)' : 'var(--danger)'}; margin: 0; font-size: 18px;">${escapeHTML(c.title)}</h3>
                    <span style="font-size: 11px; color: var(--text-secondary); background: rgba(0,0,0,0.1); padding: 3px 8px; border-radius: 10px;">${formattedDate} por ${escapeHTML(c.author)}</span>
                </div>
                <div class="rich-text" style="font-size: 14px; color: var(--text-secondary); margin-top: 10px; line-height: 1.5; overflow-wrap: break-word; white-space: pre-wrap;">${sanitizeAnnouncementHTML(c.content)}</div>
                ${actionsHtml}
            </div>
        `;
    });
    return list.innerHTML;
}

/** app.js 6837-6877 (renderAdminComunicados). */
function legacyRenderAdmin(globalComunicados, role, canDeleteComunicadosFn) {
    const tbody = { innerHTML: '' };
    tbody.innerHTML = '';
    const keys = Object.keys(globalComunicados).sort((a,b) => {
        return new Date(globalComunicados[b].date) - new Date(globalComunicados[a].date);
    });

    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay comunicados creados.</td></tr>`;
        return tbody.innerHTML;
    }

    const showDelete = canDeleteComunicadosFn(role);

    keys.forEach(key => {
        const c = globalComunicados[key];
        const formattedDate = new Date(c.date).toLocaleString('es-CO');
        const readCount = c.readBy ? Object.keys(c.readBy).length : 0;
        const deleteBtnHtml = showDelete
            ? `<button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px; margin-left: 5px;" onclick="deleteComunicado(decodeURIComponent('${encodeInlineHandlerArg(key)}'))"><i class='bx bx-trash'></i></button>`
            : '';

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-size: 13px;">${formattedDate}</td>
                <td style="padding: 12px; font-weight: 500;">
                    <a href="javascript:void(0)" onclick="viewComunicadoContent(decodeURIComponent('${encodeInlineHandlerArg(key)}'))" style="color: var(--accent-primary); text-decoration: none; cursor: pointer; transition: color 0.2s;" onmouseover="this.style.textDecoration='underline'; this.style.color='var(--text-primary)'" onmouseout="this.style.textDecoration='none'; this.style.color='var(--accent-primary)'">${escapeHTML(c.title)}</a>
                </td>
                <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">${escapeHTML(c.author)}</td>
                <td style="padding: 12px; text-align: center;"><span class="badge" style="background: var(--success);">${readCount} lecturas</span></td>
                <td style="padding: 12px; text-align: center;">
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" onclick="viewComunicadoContent(decodeURIComponent('${encodeInlineHandlerArg(key)}'))"><i class='bx bx-book-open'></i> Leer</button>
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px; margin-left: 5px;" onclick="viewComunicadoLecturas(decodeURIComponent('${encodeInlineHandlerArg(key)}'))"><i class='bx bx-user-check'></i> Lecturas</button>
                    ${deleteBtnHtml}
                </td>
            </tr>
        `;
    });
    return tbody.innerHTML;
}

/** app.js 6623-6649 (updateUnreadBadge) -> {visible, count}. */
function legacyUnreadBadge(currentUser, authUser, globalComunicados) {
    if (!currentUser || currentUser.role === 'Admin' || currentUser.role === 'Supervisor') {
        return { visible: false, count: 0 };
    }

    let unreadCount = 0;
    const uid = (currentUser && currentUser.uid) ? currentUser.uid : (authUser ? authUser.uid : 'unknown');

    Object.keys(globalComunicados).forEach(key => {
        const c = globalComunicados[key];
        if (!c.readBy || !c.readBy[uid]) {
            unreadCount++;
        }
    });

    if (unreadCount > 0) return { visible: true, count: unreadCount };
    return { visible: false, count: 0 };
}

/** app.js 6705-6730 (checkUnreadUrgentAnnouncements): clave que mostraría el modal urgente. */
function legacyNextUrgentKey(globalComunicados, uid) {
    const keys = Object.keys(globalComunicados).sort((a,b) => {
        return new Date(globalComunicados[a].date) - new Date(globalComunicados[b].date);
    });

    for (let key of keys) {
        const c = globalComunicados[key];
        const isRead = c.readBy && c.readBy[uid];

        if (!isRead) {
            return key;
        }
    }
    return null;
}

/** app.js 6903-6957 (viewComunicadoLecturas, partes de lista) -> {readHtml, unreadHtml}. */
function legacyLecturas(c, allUsers) {
    const readList = { innerHTML: '' };
    const unreadList = { innerHTML: '' };
    readList.innerHTML = '';

    // Poblar leídos
    const readers = c.readBy || {};
    const readerUids = Object.keys(readers).sort((a,b) => new Date(readers[b].readAt) - new Date(readers[a].readAt));

    const readNames = new Set();
    if (readerUids.length === 0) {
        readList.innerHTML = '<li style="color: var(--text-secondary); margin-bottom: 5px;">Nadie ha leído esto aún.</li>';
    } else {
        readerUids.forEach(uid => {
            const r = readers[uid];
            if (r.name) readNames.add(r.name.trim().toLowerCase());
            readList.innerHTML += `<li style="margin-bottom: 8px; border-bottom: 1px solid var(--glass-border); padding-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 500; font-size: 13px;">${escapeHTML(r.name)}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${new Date(r.readAt).toLocaleString('es-CO')}</div>
            </li>`;
        });
    }

    {
        unreadList.innerHTML = '';

        let unreadCount = 0;
        Object.keys(allUsers).forEach(uKey => {
            const u = allUsers[uKey];
            // Solo listamos como pendientes a los gestores aprobados
            if (u.approved === true && (u.role === 'Gestor' || u.role === undefined)) {
                const uName = (u.name || '').trim().toLowerCase();
                // Verificar que el UID no haya leído Y que el nombre no esté en la lista de los que ya leyeron (evita duplicados de cuentas)
                if (!readers[uKey] && !readNames.has(uName)) {
                    unreadCount++;
                    unreadList.innerHTML += `<li style="margin-bottom: 8px; border-bottom: 1px solid var(--glass-border); padding-bottom: 5px;">
                            <div style="font-weight: 500; color: var(--danger); font-size: 13px;"><i class='bx bx-x'></i> ${escapeHTML(u.name || 'Sin nombre')}</div>
                        </li>`;
                    // Añadimos el nombre al set para evitar imprimir al mismo usuario varias veces si tiene múltiples cuentas viejas
                    if (uName) readNames.add(uName);
                }
            }
        });

        if (unreadCount === 0) {
            unreadList.innerHTML = '<li style="color: var(--success); margin-bottom: 5px; text-align: center; font-weight: 500;"><i class="bx bx-check-double"></i> ¡Todos han leído!</li>';
        }
    }
    return { readHtml: readList.innerHTML, unreadHtml: unreadList.innerHTML };
}

// ---------------------------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------------------------

function makeRng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

const MALICIOUS = {
    title: '<script>alert(1)</script>Titulo "q" & \'s\'',
    author: '"><img src=x onerror=alert(2)>',
    content: '<p onclick="steal()">Hola</p><script>alert(3)</script><a href="javascript:alert(4)">clic</a><img src=x onerror=alert(5)><a href="https://ok.example/x?a=1&b=2">ok</a>',
    key: `-N"k'<x>/..`,
    readerName: '<img src=x onerror=alert(6)>',
    userName: '</li><script>alert(7)</script>'
};

function fixture() {
    return {
        '-A1': { title: 'Reunion', content: '<p>Hola <b>equipo</b></p>', date: '2026-10-01T10:00:00.000Z', author: 'Sara', authorUid: 's1', readBy: { g1: { name: 'Ana', readAt: '2026-10-01T12:00:00.000Z' } } },
        '-A2': { title: 'Cambio de turno', content: '<p>Mañana</p>', date: '2026-10-03T09:30:00.000Z', author: 'Admin', authorUid: 'a1' },
        '-A3': { title: 'Sin fecha valida', content: 'texto plano', date: 'no-es-fecha', author: 'Maria', authorUid: 'm1' },
        [MALICIOUS.key]: { title: MALICIOUS.title, content: MALICIOUS.content, date: '2026-10-02T08:00:00.000Z', author: MALICIOUS.author, authorUid: 'x',
            readBy: { g1: { name: MALICIOUS.readerName, readAt: '2026-10-02T09:00:00.000Z' }, g2: { name: 'Luis', readAt: '2026-10-02T09:05:00.000Z' } } }
    };
}

function randomAnnouncements(rng) {
    const n = Math.floor(rng() * 6);
    const out = {};
    const texts = ['Hola', '<b>x</b>', '<script>alert(1)</script>', 'a & b', `"'<>`, '<a href="javascript:x()">l</a>', ''];
    for (let i = 0; i < n; i += 1) {
        const day = 1 + Math.floor(rng() * 28);
        const readBy = {};
        ['g1', 'g2', 'g3'].forEach((u) => { if (rng() < 0.4) readBy[u] = { name: texts[Math.floor(rng() * texts.length)] || 'N', readAt: `2026-10-${String(1 + Math.floor(rng() * 28)).padStart(2, '0')}T0${Math.floor(rng() * 9)}:00:00.000Z` }; });
        const item = {
            title: texts[Math.floor(rng() * texts.length)],
            content: texts[Math.floor(rng() * texts.length)],
            date: rng() < 0.1 ? 'fecha-rota' : `2026-10-${String(day).padStart(2, '0')}T1${Math.floor(rng() * 9)}:00:00.000Z`,
            author: texts[Math.floor(rng() * texts.length)]
        };
        if (Object.keys(readBy).length) item.readBy = readBy;
        out[`-k${i}${rng() < 0.3 ? "'\"<" : ''}`] = item;
    }
    return out;
}

// ---------------------------------------------------------------------------------------------
// Pruebas
// ---------------------------------------------------------------------------------------------

test('resolveReaderUid: usuario local > sesión de Firebase > "unknown" (app.js 6627)', () => {
    assert.equal(resolveReaderUid({ uid: 'u1' }, { uid: 'f1' }), 'u1');
    assert.equal(resolveReaderUid({}, { uid: 'f1' }), 'f1');
    assert.equal(resolveReaderUid(null, { uid: 'f1' }), 'f1');
    assert.equal(resolveReaderUid({ uid: '' }, null), UNKNOWN_UID);
    assert.equal(resolveReaderUid(undefined, undefined), 'unknown');
});

test('formatAnnouncementDate usa es-CO', () => {
    const d = '2026-10-03T09:30:00.000Z';
    assert.equal(formatAnnouncementDate(d), new Date(d).toLocaleString('es-CO'));
});

test('diferencial: orden por fecha desc/asc idéntico al sort original (fijo + 300 aleatorios)', () => {
    const f = fixture();
    const desc = Object.keys(f).sort((a, b) => new Date(f[b].date) - new Date(f[a].date));
    const asc = Object.keys(f).sort((a, b) => new Date(f[a].date) - new Date(f[b].date));
    assert.deepEqual(sortAnnouncementKeys(f, 'desc'), desc);
    assert.deepEqual(sortAnnouncementKeys(f, 'asc'), asc);
    assert.deepEqual(sortAnnouncementKeys(f), desc);
    assert.deepEqual(sortAnnouncementKeys(null), []);

    const rng = makeRng(42);
    for (let i = 0; i < 300; i += 1) {
        const m = randomAnnouncements(rng);
        assert.deepEqual(sortAnnouncementKeys(m, 'desc'), Object.keys(m).sort((a, b) => new Date(m[b].date) - new Date(m[a].date)));
        assert.deepEqual(sortAnnouncementKeys(m, 'asc'), Object.keys(m).sort((a, b) => new Date(m[a].date) - new Date(m[b].date)));
    }
});

test('diferencial: insignia de no leídos (roles, uid local, sesión de Firebase, sin usuario) vs app.js (fijo + 300 aleatorios)', () => {
    const f = fixture();
    const users = [null, undefined, { role: 'Admin', uid: 'g1' }, { role: 'Supervisor', uid: 'g1' }, { role: 'Gestor', uid: 'g1' },
        { role: 'Gestor', uid: 'g2' }, { role: 'Gestor' }, { role: 'Gestor', uid: '' }, { name: 'sin rol', uid: 'g3' }];
    const auths = [null, { uid: 'g1' }, { uid: 'nadie' }];

    for (const u of users) for (const a of auths) {
        assert.deepEqual(computeUnreadBadge(u, a, f), legacyUnreadBadge(u, a, f), JSON.stringify([u, a]));
    }

    const rng = makeRng(7);
    for (let i = 0; i < 300; i += 1) {
        const m = randomAnnouncements(rng);
        const u = users[Math.floor(rng() * users.length)];
        const a = auths[Math.floor(rng() * auths.length)];
        assert.deepEqual(computeUnreadBadge(u, a, m), legacyUnreadBadge(u, a, m));
    }
});

test('"no leído": conteo, lectura por uid y estado vacío', () => {
    const f = fixture();
    assert.equal(countUnreadAnnouncements(f, 'g1'), 2); // g1 leyó -A1 y el malicioso; faltan -A2 y -A3
    assert.equal(countUnreadAnnouncements(f, 'g2'), 3); // g2 solo leyó el malicioso
    assert.equal(countUnreadAnnouncements({}, 'g1'), 0);
    assert.equal(countUnreadAnnouncements(null, 'g1'), 0);
    assert.equal(isAnnouncementRead(f['-A1'], 'g1'), true);
    assert.equal(isAnnouncementRead(f['-A1'], 'g9'), false);
    assert.equal(isAnnouncementRead(f['-A2'], 'g1'), false);
});

test('diferencial: siguiente comunicado urgente = el no leído más ANTIGUO, igual que app.js (fijo + 300 aleatorios)', () => {
    const f = fixture();
    for (const uid of ['g1', 'g2', 'g3', 'nadie']) {
        const got = findNextUnreadUrgent(f, uid);
        assert.equal(got ? got.key : null, legacyNextUrgentKey(f, uid));
    }
    assert.equal(findNextUnreadUrgent({}, 'g1'), null);

    const rng = makeRng(99);
    for (let i = 0; i < 300; i += 1) {
        const m = randomAnnouncements(rng);
        const uid = ['g1', 'g2', 'g3'][Math.floor(rng() * 3)];
        const got = findNextUnreadUrgent(m, uid);
        assert.equal(got ? got.key : null, legacyNextUrgentKey(m, uid));
    }
});

test('urgentes: tras leer el más antiguo, la cola avanza al siguiente y al leerlos todos queda vacía', () => {
    const m = {
        a: { title: 'A', content: 'a', date: '2026-10-01T00:00:00.000Z', author: 'x' },
        b: { title: 'B', content: 'b', date: '2026-10-02T00:00:00.000Z', author: 'x' },
        c: { title: 'C', content: 'c', date: '2026-10-03T00:00:00.000Z', author: 'x' }
    };
    const order = [];
    let next;
    while ((next = findNextUnreadUrgent(m, 'g1'))) {
        order.push(next.key);
        m[next.key].readBy = { ...(m[next.key].readBy || {}), g1: buildReadReceipt({ name: 'Ana' }, Date.UTC(2026, 9, 6)) };
    }
    assert.deepEqual(order, ['a', 'b', 'c']);
    assert.equal(findNextUnreadUrgent(m, 'g1'), null);
    // otro usuario sigue viendo todo pendiente
    assert.equal(findNextUnreadUrgent(m, 'g2').key, 'a');
});

test('idempotencia de la lectura: registrar dos veces el mismo recibo no duplica al lector ni cambia el conteo', () => {
    const m = { a: { title: 'A', content: 'a', date: '2026-10-01T00:00:00.000Z', author: 'x' } };
    const apply = (uid, receipt) => { m.a.readBy = { ...(m.a.readBy || {}), [uid]: receipt }; }; // lo que hace set(readBy/{uid})
    const receipt = buildReadReceipt({ name: 'Ana' }, Date.UTC(2026, 9, 6, 12));
    apply('g1', receipt);
    apply('g1', receipt);
    assert.equal(Object.keys(m.a.readBy).length, 1);
    assert.equal(countUnreadAnnouncements(m, 'g1'), 0);
    assert.equal(buildReadersListHtml(m.a.readBy).html.split('<li ').length - 1, 1);
});

test('buildReadReceipt: nombre del usuario y fecha ISO a partir de `now` (sin Date.now implícito)', () => {
    assert.deepEqual(buildReadReceipt({ name: 'Ana' }, Date.UTC(2026, 9, 6, 12, 0, 0)), { name: 'Ana', readAt: '2026-10-06T12:00:00.000Z' });
    assert.deepEqual(buildReadReceipt({ name: 'Ana' }, new Date('2026-10-06T12:00:00.000Z')), { name: 'Ana', readAt: '2026-10-06T12:00:00.000Z' });
    // hallazgo: sin nombre, `name` queda undefined y el SDK de Firebase rechaza `undefined` (el original falla igual)
    assert.equal(buildReadReceipt({}, 0).name, undefined);
});

test('diferencial: lista del gestor idéntica byte a byte a app.js (fijo, vacío y 300 aleatorios)', () => {
    const f = fixture();
    for (const [u, a] of [[{ uid: 'g1' }, null], [{ uid: 'g2' }, null], [{ uid: 'zzz' }, null], [{}, { uid: 'g1' }], [null, null]]) {
        assert.equal(buildGestorComunicadosHtml(f, resolveReaderUid(u, a)), legacyRenderGestor(f, u, a));
    }
    assert.equal(buildGestorComunicadosHtml({}, 'g1'), legacyRenderGestor({}, { uid: 'g1' }, null));
    assert.equal(buildGestorComunicadosHtml({}, 'g1'), EMPTY_GESTOR_LIST_HTML);

    const rng = makeRng(2026);
    for (let i = 0; i < 300; i += 1) {
        const m = randomAnnouncements(rng);
        const uid = ['g1', 'g2', 'g3'][Math.floor(rng() * 3)];
        assert.equal(buildGestorComunicadosHtml(m, uid), legacyRenderGestor(m, { uid }, null));
    }
});

test('diferencial: tabla del administrador idéntica byte a byte (con y sin botón de eliminar; fijo y 300 aleatorios)', () => {
    const f = fixture();
    for (const role of ['Admin', 'Supervisor', 'Gestor', undefined]) {
        assert.equal(buildAdminComunicadosRowsHtml(f, canDeleteComunicados(role)), legacyRenderAdmin(f, role, canDeleteComunicados));
    }
    assert.equal(buildAdminComunicadosRowsHtml({}, true), legacyRenderAdmin({}, 'Admin', canDeleteComunicados));
    assert.equal(buildAdminComunicadosRowsHtml({}, true), EMPTY_ADMIN_TABLE_HTML);

    const rng = makeRng(555);
    for (let i = 0; i < 300; i += 1) {
        const m = randomAnnouncements(rng);
        const role = ['Admin', 'Supervisor'][Math.floor(rng() * 2)];
        assert.equal(buildAdminComunicadosRowsHtml(m, canDeleteComunicados(role)), legacyRenderAdmin(m, role, canDeleteComunicados));
    }
});

test('el botón de eliminar solo aparece para Admin; Supervisor ve Leer y Lecturas', () => {
    const f = fixture();
    const admin = buildAdminComunicadosRowsHtml(f, canDeleteComunicados('Admin'));
    const sup = buildAdminComunicadosRowsHtml(f, canDeleteComunicados('Supervisor'));
    assert.ok(admin.includes('deleteComunicado('));
    assert.ok(!sup.includes('deleteComunicado('));
    assert.ok(sup.includes('viewComunicadoLecturas(') && sup.includes('viewComunicadoContent('));
});

test('XSS lista del gestor: título, autor y contenido malicioso no producen etiquetas ni manejadores activos', () => {
    const html = buildGestorComunicadosHtml(fixture(), 'g9');
    assert.ok(!html.includes('<script'), 'sin <script');
    assert.ok(!html.includes('<img'), 'sin <img (onerror)');
    assert.ok(!/<[^>]*\sonerror\s*=/i.test(html), 'ninguna etiqueta real lleva onerror=');
    assert.ok(!/href="javascript:alert/i.test(html), 'sin href javascript:alert');
    assert.ok(!html.includes('onclick="steal()"'), 'se quitó el onclick del contenido');
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'el título se muestra escapado');
    assert.ok(html.includes('&quot;&gt;&lt;img src=x onerror=alert(2)&gt;'), 'el autor se muestra escapado');
    assert.ok(html.includes('href="https://ok.example/x?a=1&amp;b=2"'), 'un enlace https legítimo se conserva');
});

test('XSS: la clave de Firebase con comillas queda codificada dentro del onclick (no rompe el atributo)', () => {
    const html = buildGestorComunicadosHtml(fixture(), 'g9');
    const encoded = encodeInlineHandlerArg(MALICIOUS.key);
    assert.ok(encoded.includes('%22') && encoded.includes('%27') && encoded.includes('%3C'));
    assert.ok(html.includes(`decodeURIComponent('${encoded}')`));
    assert.ok(!html.includes(`decodeURIComponent('${MALICIOUS.key}')`));
    const admin = buildAdminComunicadosRowsHtml(fixture(), true);
    assert.ok(admin.includes(`deleteComunicado(decodeURIComponent('${encoded}'))`));
    assert.ok(!admin.includes('<script') && !admin.includes('<img'));
});

test('XSS tabla del administrador: título y autor siempre escapados', () => {
    const html = buildAdminComunicadosRowsHtml(fixture(), true);
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;Titulo'));
    assert.ok(html.includes('&quot;&gt;&lt;img src=x onerror=alert(2)&gt;'));
});

test('XSS modal de lectura/urgente: título y autor van como TEXTO; el cuerpo sale sanitizado', () => {
    const c = fixture()[MALICIOUS.key];
    const view = buildAnnouncementView(c);
    assert.equal(view.title, c.title); // va a innerText: el texto crudo es seguro
    assert.equal(view.author, c.author);
    assert.equal(view.dateText, new Date(c.date).toLocaleString('es-CO'));
    assert.ok(!view.bodyHtml.includes('<script') && !view.bodyHtml.includes('<img') && !/\sonclick=/i.test(view.bodyHtml));
    assert.ok(!/href="javascript:/i.test(view.bodyHtml));
    assert.deepEqual(buildAnnouncementView({}), { title: '', author: '', dateText: new Date(undefined).toLocaleString('es-CO'), bodyHtml: '' });
});

test('los ayudantes son inyectables: app.js puede usar SU sanitizador (basado en DOM)', () => {
    const calls = [];
    const helpers = {
        escapeHTML: (v) => { calls.push(['esc', v]); return `E(${v})`; },
        encodeInlineHandlerArg: (v) => `K(${v})`,
        sanitizeAnnouncementHTML: (v) => `S(${v})`
    };
    const html = buildGestorComunicadosHtml({ k1: { title: 'T', content: 'C', author: 'A', date: '2026-10-01T00:00:00.000Z' } }, 'u', helpers);
    assert.ok(html.includes('E(T)') && html.includes('E(A)') && html.includes('S(C)') && html.includes("decodeURIComponent('K(k1)')"));
    assert.equal(buildAnnouncementView({ content: 'C' }, helpers).bodyHtml, 'S(C)');
});

test('diferencial: lecturas (quién leyó / quién falta) idénticas a app.js, con cuentas duplicadas, sin aprobar y no gestores', () => {
    const c = fixture()[MALICIOUS.key];
    const allUsers = {
        g1: { name: MALICIOUS.readerName, approved: true, role: 'Gestor' },
        g2: { name: 'Luis', approved: true, role: 'Gestor' },
        g3: { name: 'Pedro', approved: true, role: 'Gestor' },
        g3b: { name: ' pedro ', approved: true, role: 'Gestor' }, // cuenta vieja duplicada: no se repite
        g4: { name: 'Sin aprobar', approved: false, role: 'Gestor' },
        g5: { name: 'Marta', approved: true }, // sin rol: cuenta como gestor
        g6: { name: 'Sara', approved: true, role: 'Supervisor' },
        g7: { approved: true, role: 'Gestor' }, // sin nombre
        g8: { name: MALICIOUS.userName, approved: true, role: 'Gestor' },
        g9: { name: 'LUIS', approved: true, role: 'Gestor' } // mismo nombre que un lector, otra cuenta
    };
    const expected = legacyLecturas(c, allUsers);
    const r = buildReadersListHtml(c.readBy || {});
    const u = buildUnreadersListHtml(allUsers, c.readBy || {}, r.readNames);
    assert.equal(r.html, expected.readHtml);
    assert.equal(u.html, expected.unreadHtml);
    assert.equal(u.unreadCount, 4); // Pedro, Marta, Sin nombre, la cuenta maliciosa
    assert.ok(!u.html.includes('<script'));
    assert.ok(u.html.includes('&lt;/li&gt;&lt;script&gt;alert(7)&lt;/script&gt;'));
    assert.ok(r.html.includes('&lt;img src=x onerror=alert(6)&gt;') && !r.html.includes('<img'));

    // sin lecturas / todos leyeron
    const none = legacyLecturas({}, allUsers);
    assert.equal(buildReadersListHtml({}).html, none.readHtml);
    assert.equal(buildReadersListHtml({}).isEmpty, true);
    assert.equal(buildUnreadersListHtml({}, {}, new Set()).html, legacyLecturas({}, {}).unreadHtml);
    assert.equal(buildUnreadersListHtml({}, {}, new Set()).unreadCount, 0);
});

test('diferencial aleatorio: lecturas (200 casos con semilla)', () => {
    const rng = makeRng(31337);
    const names = ['Ana', 'ana ', 'Luis', '', undefined, '<b>x</b>', 'Marta'];
    for (let i = 0; i < 200; i += 1) {
        const readBy = {};
        for (let j = 0; j < 4; j += 1) if (rng() < 0.5) readBy[`u${j}`] = { name: names[Math.floor(rng() * names.length)], readAt: `2026-10-0${1 + Math.floor(rng() * 8)}T10:00:00.000Z` };
        const allUsers = {};
        for (let j = 0; j < 6; j += 1) allUsers[`u${j}`] = { name: names[Math.floor(rng() * names.length)], approved: rng() < 0.8 ? true : false, ...(rng() < 0.8 ? { role: ['Gestor', 'Supervisor', 'Admin'][Math.floor(rng() * 3)] } : {}) };
        const c = { readBy };
        const e = legacyLecturas(c, allUsers);
        const r = buildReadersListHtml(readBy);
        assert.equal(r.html, e.readHtml);
        assert.equal(buildUnreadersListHtml(allUsers, readBy, r.readNames).html, e.unreadHtml);
    }
});

test('isPendingReaderCandidate: aprobado === true y rol Gestor o sin rol', () => {
    assert.equal(isPendingReaderCandidate({ approved: true, role: 'Gestor' }), true);
    assert.equal(isPendingReaderCandidate({ approved: true }), true);
    assert.equal(isPendingReaderCandidate({ approved: 'true', role: 'Gestor' }), false);
    assert.equal(isPendingReaderCandidate({ approved: true, role: 'Admin' }), false);
    assert.equal(isPendingReaderCandidate({ approved: true, role: 'Supervisor' }), false);
});

test('autor: nombre > correo > rol > "Usuario"; nunca el nombre de otro rol (app.js 6606)', () => {
    assert.equal(resolveAnnouncementAuthor({ name: 'Sara', email: 'e', role: 'Supervisor' }), 'Sara');
    assert.equal(resolveAnnouncementAuthor({ email: 'e@x', role: 'Supervisor' }), 'e@x');
    assert.equal(resolveAnnouncementAuthor({ role: 'Supervisor' }), 'Supervisor');
    assert.equal(resolveAnnouncementAuthor({}), 'Usuario');
});

test('formulario nuevo: recorta el título, sanitiza el contenido y exige ambos', () => {
    const ok = parseNewAnnouncementForm({ title: '  Aviso  ', rawContentHtml: ' <p onclick="x()">Hola</p> ' });
    assert.deepEqual(ok, { ok: true, title: 'Aviso', content: '<p>Hola</p>' });
    assert.equal(parseNewAnnouncementForm({ title: '   ', rawContentHtml: '<p>x</p>' }).ok, false);
    assert.equal(parseNewAnnouncementForm({ title: 'T', rawContentHtml: '   ' }).ok, false);
    assert.equal(parseNewAnnouncementForm({ title: 'T', rawContentHtml: '' }).ok, false);
    const evil = parseNewAnnouncementForm({ title: 'T', rawContentHtml: '<img src=x onerror=alert(1)><a href="javascript:alert(2)">x</a>' });
    assert.ok(!evil.content.includes('<img') && !/javascript:/i.test(evil.content));
});

/** La regla de Firebase para que un Supervisor cree un comunicado (database.rules.json, announcements/$id). */
function supervisorMayCreate(payload, authUid) {
    return !('readBy' in payload)
        && ['title', 'content', 'date', 'author', 'authorUid'].every((k) => k in payload)
        && ['title', 'content', 'date', 'author', 'authorUid'].every((k) => typeof payload[k] === 'string')
        && payload.authorUid === authUid;
}

test('payload de publicación: forma exacta, fecha ISO de `now` y cumple la regla de creación del Supervisor', () => {
    const p = buildAnnouncementPayload({ title: 'T', content: '<p>c</p>', currentUser: { name: 'Sara', role: 'Supervisor' }, authUid: 's1', now: Date.UTC(2026, 9, 6, 15, 30) });
    assert.deepEqual(p, { title: 'T', content: '<p>c</p>', date: '2026-10-06T15:30:00.000Z', author: 'Sara', authorUid: 's1' });
    assert.equal(supervisorMayCreate(p, 's1'), true);
    assert.equal(supervisorMayCreate(p, 'otro'), false);
    assert.equal(supervisorMayCreate({ ...p, readBy: {} }, 's1'), false);
});

test('permisos: se reexportan las funciones existentes (Admin/Supervisor publican y ven lecturas; solo Admin elimina)', () => {
    assert.equal(canPublishComunicados('Admin'), true);
    assert.equal(canPublishComunicados('Supervisor'), true);
    assert.equal(canPublishComunicados('Gestor'), false);
    assert.equal(canViewComunicadoLecturas('Supervisor'), true);
    assert.equal(canViewComunicadoLecturas('Gestor'), false);
    assert.equal(canDeleteComunicados('Admin'), true);
    assert.equal(canDeleteComunicados('Supervisor'), false);
    assert.equal(canDeleteComunicados(undefined), false);
    assert.equal(canManageComunicados('Supervisor'), true);
    assert.equal(canManageComunicados('Gestor'), false);
});

test('textos visibles de los alert() se conservan', () => {
    assert.equal(ANNOUNCEMENT_MESSAGES.MISSING_FIELDS, 'Por favor llena todos los campos.');
    assert.equal(ANNOUNCEMENT_MESSAGES.PUBLISHED, 'Comunicado publicado exitosamente.');
    assert.equal(ANNOUNCEMENT_MESSAGES.PUBLISH_ERROR, 'Error al publicar.');
    assert.equal(ANNOUNCEMENT_MESSAGES.READ_ERROR, 'Error al marcar como leído.');
    assert.equal(ANNOUNCEMENT_MESSAGES.NOT_ALLOWED_PUBLISH, 'No tienes permiso para publicar comunicados.');
    assert.equal(ANNOUNCEMENT_MESSAGES.NOT_ALLOWED_DELETE, 'No tienes permiso para eliminar comunicados.');
    assert.equal(ANNOUNCEMENT_MESSAGES.DELETE_ERROR, 'No se pudo eliminar.');
});

// ---------------------------------------------------------------------------------------------
// D2 (revisión): ningún dato de usuario llega como HTML en los constructores de comunicados
// ---------------------------------------------------------------------------------------------

/** ¿Hay alguna etiqueta "real" que no sea de la plantilla? (busca etiquetas peligrosas o manejadores sin escapar) */
function hasActiveInjection(html) {
    return /<script/i.test(html) || /<img/i.test(html) || /<svg/i.test(html) || /<[^>]*\son(error|load)\s*=/i.test(html); // onmouseover/onclick son de la plantilla
}

test('D2 revisión: fechas, readAt, nombres y claves maliciosas (con <script>, <img onerror> y comillas) no inyectan HTML en lista, tabla y lecturas', () => {
    const EVIL = `"'><img src=x onerror=alert(1)><script>alert(2)</script>`;
    const ann = {
        [EVIL]: { title: EVIL, author: EVIL, content: EVIL, date: EVIL, readBy: { g1: { name: EVIL, readAt: EVIL } } },
        k2: { title: 'ok', author: 'ok', content: '<p>ok</p>', date: '2026-10-01T00:00:00.000Z' }
    };
    const gestor = buildGestorComunicadosHtml(ann, 'g1');
    const gestorUnread = buildGestorComunicadosHtml(ann, 'otro');
    const admin = buildAdminComunicadosRowsHtml(ann, true);
    const readers = buildReadersListHtml(ann[EVIL].readBy).html;
    const unreaders = buildUnreadersListHtml({ u1: { name: EVIL, approved: true, role: 'Gestor' } }, {}, new Set()).html;
    for (const [label, html] of [['gestor', gestor], ['gestor no leído', gestorUnread], ['admin', admin], ['lectores', readers], ['pendientes', unreaders]]) {
        assert.ok(!hasActiveInjection(html), label);
    }
    // la clave maliciosa dentro de los onclick va codificada (no cierra la comilla del argumento)
    assert.ok(!admin.includes(`decodeURIComponent('"'`) && admin.includes(`decodeURIComponent('${encodeInlineHandlerArg(EVIL)}')`));
    // fecha y readAt inválidos salen como "Invalid Date" (vienen de new Date(), nunca del texto crudo)
    assert.ok(gestor.includes('Invalid Date') && readers.includes('Invalid Date'));
    // el cuerpo del comunicado sigue pasando por sanitizeAnnouncementHTML (se respeta): <p> permitido, <script> fuera
    assert.ok(buildGestorComunicadosHtml({ k: { title: 't', author: 'a', content: '<p>Hola <strong>x</strong></p><script>y()</script>', date: '2026-10-01T00:00:00.000Z' } }, 'g').includes('<p>Hola <strong>x</strong></p>'));
});

// ---------------------------------------------------------------------------------------------
// D4: clasificación del fallo de escritura de readBy/{uid} y lecturas asumidas por duplicidad
// ---------------------------------------------------------------------------------------------

test('D4: classifyReadWriteError distingue PERMISSION_DENIED (posible duplicidad) de red y otros (nunca "ya leído")', () => {
    const denied = Object.assign(new Error('PERMISSION_DENIED: Permission denied'), { code: 'PERMISSION_DENIED' });
    assert.equal(classifyReadWriteError(denied), READ_FAILURE_KINDS.PERMISSION_DENIED);
    assert.equal(classifyReadWriteError({ code: 'permission-denied' }), READ_FAILURE_KINDS.PERMISSION_DENIED);
    assert.equal(classifyReadWriteError(new Error('permission_denied at /announcements')), READ_FAILURE_KINDS.PERMISSION_DENIED);
    for (const e of [Object.assign(new Error('x'), { code: 'NETWORK_ERROR' }), new Error('Client is offline.'), { code: 'disconnected' }, new Error('Request timed out')]) {
        assert.equal(classifyReadWriteError(e), READ_FAILURE_KINDS.NETWORK, String(e.message || e.code));
    }
    for (const e of [new Error("Firebase.set failed: First argument contains undefined in property 'name'"), null, undefined, 'raro', new TypeError('x')]) {
        assert.equal(classifyReadWriteError(e), READ_FAILURE_KINDS.OTHER, String(e));
    }
});

test('D4: applyAssumedReads marca como leído sin mutar el original; no inventa comunicados ni pisa un recibo real', () => {
    const map = { a: { title: 'A' }, b: { title: 'B', readBy: { u: { name: 'U', readAt: 'real' } } } };
    const frozen = JSON.stringify(map);
    const out = applyAssumedReads(map, 'u', { a: { readAt: 'srv' }, b: { readAt: 'otro' }, zz: { readAt: 'x' } });
    assert.equal(JSON.stringify(map), frozen, 'el mapa original no cambia');
    assert.ok(isAnnouncementRead(out.a, 'u'));
    assert.equal(out.b.readBy.u.readAt, 'real', 'el recibo que ya trae el caché manda');
    assert.equal(out.zz, undefined, 'no crea comunicados inexistentes (p. ej. borrados)');
    assert.equal(applyAssumedReads(map, 'u', {}), map, 'sin asumidas devuelve el MISMO mapa');
    assert.equal(findNextUnreadUrgent(out, 'u'), null, 'con la lectura asumida la cola de urgentes queda vacía');
});

// ---------------------------------------------------------------------------------------------
// D9(c): política de urgentes por rol = igual que gestores
// ---------------------------------------------------------------------------------------------

test('D9(c): Admin, Supervisor y Gestor (y roles vacíos/desconocidos) reciben el modal bloqueante con confirmación obligatoria', () => {
    assert.deepEqual(Object.keys(URGENT_ANNOUNCEMENT_ROLE_POLICY).sort(), ['Admin', 'Gestor', 'Supervisor']);
    for (const role of ['Admin', 'Supervisor', 'Gestor', undefined, '', 'Otro', 'constructor', '__proto__', 'toString']) {
        assert.equal(resolveUrgentAnnouncementPolicy(role), URGENT_MODAL_MANDATORY, String(role));
        assert.equal(requiresUrgentConfirmation(role), true, String(role));
    }
    assert.ok(Object.isFrozen(URGENT_ANNOUNCEMENT_ROLE_POLICY));
    // la insignia de "no leídos" sigue excluyendo a Admin/Supervisor (no cambia con D9 c)
    const ann = { k: { title: 't', date: '2026-10-01T00:00:00.000Z' } };
    assert.deepEqual(computeUnreadBadge({ uid: 'a', role: 'Admin' }, null, ann), { visible: false, count: 0 });
    assert.deepEqual(computeUnreadBadge({ uid: 's', role: 'Supervisor' }, null, ann), { visible: false, count: 0 });
    assert.equal(findNextUnreadUrgent(ann, 'a').key, 'k', 'pero la cola de urgentes sí les aplica');
});

summarize();
