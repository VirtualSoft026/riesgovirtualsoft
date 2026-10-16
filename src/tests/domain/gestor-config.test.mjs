import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRunner, assert } from '../test-harness.mjs';
import {
    EMPTY_GESTORES_ROW_HTML,
    GESTOR_ROW_BORDER,
    buildGestorConfigRowHtml,
    buildSplitShiftConfirmMessage,
    canUseSplitShiftConfig,
    canWriteHasSplitShift,
    hasSplitShiftEnabled,
    isConfigGestorCandidate,
    selectConfigGestores
} from '../../domain/users/gestor-config.js';
import { escapeHTML } from '../../utils/sanitization.js';
import { normalizeLegacyHtml } from '../helpers/w50-delegation.mjs';

const { test, summarize } = createRunner('gestor-config (configuración de gestores y flag hasSplitShift; diferencial vs app.js 6757-6834)');

// --------------------------------------------------------------------------------------------
// Copia LITERAL de la selección/orden de app.js 6766-6797 (renderConfigGestores, dentro del .then).
// `snap.forEach` se reemplaza por un recorrido de las entradas; devuelve el arreglo `users`.
// --------------------------------------------------------------------------------------------
function legacySelect(entries) {
    const usersMap = {};
    entries.forEach(({ key, value }) => {
        const child = { key, val: () => JSON.parse(JSON.stringify(value)) };
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
    // Ordenar alfabéticamente
    users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return users;
}

/** Copia LITERAL de la plantilla de fila de app.js 6803-6820 (con `escapeHTML` de utils). */
function legacyRow(u) {
    const hasSplitShift = u.hasSplitShift === true;
    return `
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
}

/**
 * W-52: el escape ya no se puede apagar. La paridad con la plantilla original se compara con datos SIN caracteres
 * especiales; la única diferencia permitida es la forma del argumento del `onchange` (uid codificado, mismo valor) y
 * que un campo ausente se pinta vacío en vez de "undefined".
 */
const SPECIAL_CHARS = /[&<>"']/;
function legacyComparable(u) {
    return { ...u, role: u.role ?? '', email: u.email ?? '' };
}
/** El original (literal) y la versión delegada se comparan con el normalizador general de manejadores. */
function delegatedLegacyRow(u) {
    return normalizeLegacyHtml(legacyRow(legacyComparable(u)));
}

function makeRng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

const ENTRIES = [
    { key: 'u1', value: { name: 'Zoe', role: 'Gestor', email: 'zoe@virtualsoft.tech', hasSplitShift: true, loginTime: '2026-10-01T10:00:00.000Z' } },
    { key: 'u2', value: { name: 'Ana', role: 'Gestor', email: 'ANA@virtualsoft.tech', hasSplitShift: false } },
    { key: 'u2b', value: { name: 'Ana', role: 'Gestor', email: 'ana@virtualsoft.tech', loginTime: '2026-10-05T10:00:00.000Z' } }, // duplicado: gana por loginTime
    { key: 'u3', value: { name: 'Sara', role: 'Supervisor', email: 'sara@virtualsoft.tech' } },
    { key: 'u4', value: { name: 'QA', role: 'Gestor', email: 'gestor.pruebas@virtualsoft.tech' } },
    { key: 'u5', value: { name: 'Sin correo', role: 'Gestor' } },
    { key: 'u6', value: { role: 'Gestor', email: 'noname@virtualsoft.tech', hasSplitShift: 'true' } }, // flag no booleano: NO cuenta
    { key: 'u7', value: { name: 'Eva', role: 'Gestor', email: 'eva@virtualsoft.tech', hasSplitShift: 1 } },
    { key: 'u8', value: { name: 'Álvaro', role: 'Gestor', email: 'alvaro@virtualsoft.tech' } }
];

test('diferencial: selección, deduplicado por correo y orden alfabético idénticos a app.js (fijo)', () => {
    assert.deepEqual(selectConfigGestores(ENTRIES), legacySelect(ENTRIES));
    const names = selectConfigGestores(ENTRIES).map((u) => u.uid);
    assert.deepEqual(names, legacySelect(ENTRIES).map((u) => u.uid), 'mismo orden');
    assert.ok(!names.includes('u3') && !names.includes('u4') && !names.includes('u5'), 'excluye supervisores, pruebas y sin correo');
    assert.equal(selectConfigGestores(ENTRIES).find((u) => u.uid === 'u2b').name, 'Ana');
});

test('diferencial aleatorio: 300 conjuntos con duplicados, fechas rotas y campos ausentes', () => {
    const rng = makeRng(777);
    const names = ['Ana', 'ana', 'Álvaro', 'Zoe', '', undefined, 'Beto'];
    const emails = ['a@v.tech', 'A@v.tech', 'b@v.tech', 'pruebas1@v.tech', undefined, 'c@v.tech'];
    const times = [undefined, '2026-10-01T00:00:00.000Z', '2026-10-09T00:00:00.000Z', 'rota'];
    for (let i = 0; i < 300; i += 1) {
        const entries = [];
        const n = Math.floor(rng() * 8);
        for (let j = 0; j < n; j += 1) {
            const value = { role: rng() < 0.8 ? 'Gestor' : 'Supervisor' };
            const nm = names[Math.floor(rng() * names.length)]; if (nm !== undefined) value.name = nm;
            const em = emails[Math.floor(rng() * emails.length)]; if (em !== undefined) value.email = em;
            const tm = times[Math.floor(rng() * times.length)]; if (tm !== undefined) value.loginTime = tm;
            if (rng() < 0.4) value.hasSplitShift = [true, false, 'true', 1][Math.floor(rng() * 4)];
            entries.push({ key: `k${j}`, value });
        }
        assert.deepEqual(selectConfigGestores(entries), legacySelect(entries));
    }
});

test('selectConfigGestores no modifica las entradas de entrada (copias)', () => {
    const entries = [{ key: 'u1', value: { name: 'A', role: 'Gestor', email: 'a@v.tech' } }];
    const out = selectConfigGestores(entries);
    assert.equal(out[0].uid, 'u1');
    assert.equal(entries[0].value.uid, undefined);
});

test('diferencial (datos sin caracteres especiales): la fila (HTML) es idéntica a app.js para cada caso, incluido el flag (estricto === true)', () => {
    for (const u of selectConfigGestores(ENTRIES)) {
        assert.ok(![u.name, u.role, u.email, u.uid].some((v) => SPECIAL_CHARS.test(String(v ?? ''))), 'fixture sin caracteres especiales');
        assert.equal(buildGestorConfigRowHtml(u), delegatedLegacyRow(u));
    }
    const on = buildGestorConfigRowHtml({ uid: 'x', name: 'N', role: 'Gestor', email: 'e', hasSplitShift: true });
    const off = buildGestorConfigRowHtml({ uid: 'x', name: 'N', role: 'Gestor', email: 'e', hasSplitShift: 'true' });
    assert.ok(on.includes(' checked ') && on.includes('background-color: var(--success)') && on.includes('left: 24px'));
    assert.ok(!off.includes(' checked ') && off.includes('background-color: var(--glass-border)') && off.includes('left: 3px'), '"true" (texto) NO cuenta como habilitado');
    assert.equal(GESTOR_ROW_BORDER, '1px solid rgba(255,255,255,0.05)');
});

test('W-52: un gestor sin correo se pinta con la celda vacía (app.js pintaba "undefined")', () => {
    const html = buildGestorConfigRowHtml({ uid: 'u5', name: 'Sin correo', role: 'Gestor' });
    assert.ok(!html.includes('undefined'));
    assert.ok(legacyRow({ uid: 'u5', name: 'Sin correo', role: 'Gestor' }).includes('>undefined</td>'), 'comportamiento de app.js');
});

test('W-52: buildGestorConfigRowHtml no acepta opciones para apagar el escape', () => {
    const evil = { uid: 'u', name: '<img src=x onerror=alert(1)>', role: 'Gestor', email: 'a@v.tech' };
    for (const options of [undefined, {}, { escapeUserFields: false }]) {
        assert.ok(!buildGestorConfigRowHtml(evil, /** @type {any} */ (options)).includes('<img'));
    }
    assert.equal(buildGestorConfigRowHtml.length, 1, 'un solo parámetro');
});

test('el interruptor conserva su texto y estilo: toggleGestorSplitShift(uid, this.checked), aria-label y colores', () => {
    const html = buildGestorConfigRowHtml({ uid: 'abc', name: 'Ana', role: 'Gestor', email: 'a@v.tech' });
    assert.ok(html.includes(`data-action="toggle-gestor-split-shift" data-uid="abc"`), 'el uid va escapado en data-uid (sin onchange)');
    assert.ok(!html.includes('onchange'), 'ningún onchange inline');
    assert.ok(legacyRow({ uid: 'abc', name: 'Ana', role: 'Gestor', email: 'a@v.tech' }).includes(`onchange="toggleGestorSplitShift('abc', this.checked)"`), 'plantilla original');
    assert.ok(delegatedLegacyRow({ uid: 'abc', name: 'Ana', role: 'Gestor', email: 'a@v.tech' }).includes(`data-action="toggle-gestor-split-shift" data-uid="abc"`), 'la plantilla original normalizada');
    assert.ok(html.includes('aria-label="Turno Partido para Ana"'));
    assert.ok(html.includes('id="splitShiftToggle_abc"') && html.includes('name="splitShiftToggle_abc"'));
    assert.ok(buildGestorConfigRowHtml({ uid: 'abc', role: 'Gestor', email: 'a' }).includes('aria-label="Turno Partido para Gestor"'));
    assert.ok(buildGestorConfigRowHtml({ uid: 'abc', role: 'Gestor', email: 'a' }).includes('Desconocido'));
});

test('D2 / W-52: nombre/rol/correo con <script>, <img onerror> y comillas se escapan SIEMPRE (app.js los insertaba crudos)', () => {
    const evil = { uid: 'u', name: '<img src=x onerror=alert(1)>', role: '<script>alert(3)</script>', email: '"><script>alert(2)</script>' };
    const legacy = legacyRow(evil);
    assert.ok(legacy.includes('<img src=x onerror=alert(1)>'), 'HALLAZGO de app.js: el nombre se inserta sin escapar');
    assert.ok(legacy.includes('"><script>alert(2)</script>'), 'HALLAZGO de app.js: el correo se inserta sin escapar');
    const safe = buildGestorConfigRowHtml(evil);
    assert.ok(safe.includes('aria-label="Turno Partido para &lt;img src=x onerror=alert(1)&gt;"'));
    assert.ok(!safe.includes('<img') && !safe.includes('<script'));
    assert.ok(safe.includes('&lt;img src=x onerror=alert(1)&gt;') && safe.includes('&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;') && safe.includes('&lt;script&gt;alert(3)&lt;/script&gt;'));
    const quotes = buildGestorConfigRowHtml({ uid: 'u', name: `O'Brien "Bob"`, role: 'Gestor', email: `o'b"@v.tech` });
    assert.ok(quotes.includes('O&#039;Brien &quot;Bob&quot;') && quotes.includes('o&#039;b&quot;@v.tech'));
});

test('D2: un uid con comillas o etiquetas no rompe los atributos ni el onchange (escapado en id/for/name; codificado en el manejador)', () => {
    const uid = `x'),alert(1),('"<b>`;
    const html = buildGestorConfigRowHtml({ uid, name: 'Ana', role: 'Gestor', email: 'a@v.tech' });
    assert.ok(!html.includes("x'),alert(1)"), 'la comilla simple no cierra el argumento');
    assert.ok(!html.includes('<b>'));
    assert.ok(html.includes('id="splitShiftToggle_x&#039;),alert(1),(&#039;&quot;&lt;b&gt;"'));
    const arg = /data-action="toggle-gestor-split-shift" data-uid="([^"]*)"/.exec(html);
    assert.ok(arg, 'el interruptor delega en toggle-gestor-split-shift con el uid en data-uid');
    assert.equal(arg[1], escapeHTML(uid), 'el uid va escapado (ningún carácter cierra el atributo)');
    // fuera de nombre/rol/correo/uid, la fila no cambia respecto del original
    const plain = { uid: 'u', name: 'Ana', role: 'Gestor', email: 'a@v.tech', hasSplitShift: true };
    assert.equal(buildGestorConfigRowHtml(plain), normalizeLegacyHtml(legacyRow(plain)));
});

test('confirmación: texto exacto de habilitar y deshabilitar (app.js 6824)', () => {
    assert.equal(buildSplitShiftConfirmMessage(true), '¿Estás segura de que quieres habilitar la Pausa de Turno para este usuario?');
    assert.equal(buildSplitShiftConfirmMessage(false), '¿Estás segura de que quieres deshabilitar la Pausa de Turno para este usuario?');
});

test('contrato estricto del flag: solo el booleano true cuenta', () => {
    for (const [v, expected] of [[true, true], [false, false], ['true', false], [1, false], [undefined, false], [null, false]]) {
        assert.equal(hasSplitShiftEnabled({ hasSplitShift: v }), expected, String(v));
    }
    assert.equal(hasSplitShiftEnabled(null), false);
});

test('isConfigGestorCandidate / canUseSplitShiftConfig', () => {
    assert.equal(isConfigGestorCandidate({ role: 'Gestor', email: 'a@v.tech' }), true);
    assert.equal(isConfigGestorCandidate({ role: 'Gestor', email: 'QA.PRUEBAS@v.tech' }), false);
    assert.equal(isConfigGestorCandidate({ role: 'Supervisor', email: 'a@v.tech' }), false);
    assert.equal(isConfigGestorCandidate({ role: 'Gestor' }), false);
    assert.equal(canUseSplitShiftConfig({ role: 'Admin' }), true);
    assert.equal(canUseSplitShiftConfig({ role: 'Supervisor' }), false);
    assert.equal(canUseSplitShiftConfig({ role: 'Gestor' }), false);
    assert.equal(canUseSplitShiftConfig(null), false);
    assert.ok(EMPTY_GESTORES_ROW_HTML.includes('No hay gestores registrados.'));
});

// --------------------------------------------------------------------------------------------
// Política de escritura de users/{uid}/hasSplitShift contra database.rules.json (SOLO LECTURA)
// --------------------------------------------------------------------------------------------
function loadRules() {
    const candidates = [
        fileURLToPath(new URL('../../../database.rules.json', import.meta.url)),
        '/mnt/user-data/uploads/riesgovirtualsoft/database.rules.json'
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return { path: candidate, rules: JSON.parse(fs.readFileSync(candidate, 'utf8')) };
    }

    return null;
}

/** Evalúa el `.write` de users/$uid (expresión JavaScript válida) con un auth/root/data simulados. */
function evaluateRule(rule, { actor, targetUid, targetExists, newValue }) {
    const users = { [actor.uid]: { approved: actor.approved, role: actor.role } };
    const node = (value) => ({ val: () => value, exists: () => value !== null && value !== undefined });
    const root = { child: (name) => ({ child: (uid) => ({ child: (field) => node((users[uid] || {})[field]) }) }) };
    const fn = new Function('auth', 'root', 'data', 'newData', '$uid', `return (${rule});`);

    return Boolean(fn({ uid: actor.uid }, root, node(targetExists ? { exists: true } : null), node(newValue), targetUid));
}

const loaded = loadRules();

test('reglas reales: users/$uid.write no define regla propia para hasSplitShift y solo un Admin aprobado puede escribirlo (más la alta propia)', () => {
    if (!loaded) { console.log('         [OMITIDA] database.rules.json no encontrado en esta ubicación'); return; }
    const userNode = loaded.rules.rules.users.$uid;
    assert.ok(userNode['.write'], 'hay .write en users/$uid');
    assert.equal(userNode.hasSplitShift, undefined, 'hasSplitShift no tiene .validate ni .write propio (hereda el del padre)');
    assert.ok(userNode['.write'].includes("root.child('users').child(auth.uid).child('role').val() === 'Admin'"));
    assert.ok(userNode['.write'].includes('auth.uid === $uid && !data.exists() && newData.exists()'));
});

test('diferencial contra las REGLAS REALES: canWriteHasSplitShift coincide con la evaluación de users/$uid.write en 96 combinaciones', () => {
    if (!loaded) { console.log('         [OMITIDA] database.rules.json no encontrado en esta ubicación'); return; }
    const rule = loaded.rules.rules.users.$uid['.write'];
    let combos = 0;

    for (const role of ['Admin', 'Supervisor', 'Gestor', undefined]) {
        for (const approved of [true, false, 'true']) {
            for (const target of ['self', 'other']) {
                for (const targetExists of [true, false]) {
                    for (const newValue of [true, false]) {
                        const actor = { uid: 'actor1', role, approved };
                        const targetUid = target === 'self' ? 'actor1' : 'otro';
                        const expected = evaluateRule(rule, { actor, targetUid, targetExists, newValue });
                        assert.equal(canWriteHasSplitShift({ actor, targetUid, targetExists, newValue }), expected, JSON.stringify({ actor, targetUid, targetExists, newValue }));
                        combos += 1;
                    }
                }
            }
        }
    }

    assert.equal(combos, 96);
});

test('política: Admin aprobado escribe el flag de cualquiera; Supervisor y Gestor NO; sin sesión NO', () => {
    const base = { targetUid: 'g1', targetExists: true, newValue: true };
    assert.equal(canWriteHasSplitShift({ ...base, actor: { uid: 'a', role: 'Admin', approved: true } }), true);
    assert.equal(canWriteHasSplitShift({ ...base, actor: { uid: 'a', role: 'Admin', approved: false } }), false);
    assert.equal(canWriteHasSplitShift({ ...base, actor: { uid: 's', role: 'Supervisor', approved: true } }), false);
    assert.equal(canWriteHasSplitShift({ ...base, actor: { uid: 'g1', role: 'Gestor', approved: true } }), false, 'un gestor no se activa el flag a sí mismo');
    assert.equal(canWriteHasSplitShift({ ...base, actor: null }), false);
    assert.equal(canWriteHasSplitShift({ ...base, actor: {} }), false);
});

test('HALLAZGO de reglas: un usuario cuyo nodo AÚN no existe puede crear su propio nodo con hasSplitShift:true (el campo no se valida)', () => {
    assert.equal(canWriteHasSplitShift({ actor: { uid: 'nuevo', role: undefined, approved: undefined }, targetUid: 'nuevo', targetExists: false, newValue: true }), true);
    // con el nodo ya creado deja de poder
    assert.equal(canWriteHasSplitShift({ actor: { uid: 'nuevo', role: 'Gestor', approved: false }, targetUid: 'nuevo', targetExists: true, newValue: true }), false);
});

summarize();
