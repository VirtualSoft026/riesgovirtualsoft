/**
 * Pruebas unitarias del parche "Pausa de Turno" aplicado a app.js (2026-10-04).
 *
 * Cada una de las 6 ediciones del parche tiene al menos una prueba que ejecuta la FUNCIÓN REAL
 * extraída de app.js dentro de un `vm` con un DOM simulado (no se copia lógica a mano):
 *
 *   (a) renderActiveSessionsDashboard  -> filtro En línea / Fuera de línea
 *   (b) renderActiveSessionsDashboard  -> no degradar a 'Inactivo' al perder latido
 *   (c) renderActiveSessionsDashboard  -> rama de presentación propia (texto 'En Pausa de Turno ⏸️', paridad con Almuerzo)
 *   (d) viewTimelineInMonitoreo        -> no inyectar 'Inactividad' falsa
 *   (e) viewTimelineInMonitoreo        -> ícono del evento 'Pausa de Turno'
 *   (f) openLoginHistoryModal          -> isOnline=false y estado conservado
 *
 * Además verifica la integridad del archivo (sintaxis, CRLF, número de menciones).
 *
 * Verificación de la propia prueba (mutación): el mismo juego de pruebas se ejecuta también sobre
 * el app.js ORIGINAL, reconstruido en memoria revirtiendo las 6 ediciones. Las pruebas marcadas
 * como [BUG] deben FALLAR en el original (reproducen el defecto) y las demás deben PASAR en ambos
 * (no hay regresión en Almuerzo, Desayuno, Inactivo ni En Línea).
 *
 * Uso:  node fase_2/src/tests/e2e/parche-pausa-turno.unit.cjs app.js
 * No modifica ningún archivo. Sale con código 1 si algo no se cumple.
 */
const fs = require('fs');
const vm = require('vm');

const APP = process.argv[2];
if (!APP) { console.error('Uso: node parche-pausa-turno.unit.cjs <ruta a app.js>'); process.exit(2); }
const RAW = fs.readFileSync(APP, 'utf8');
const PATCHED = RAW.replace(/\r\n/g, '\n');

// ---------------------------------------------------------------- original reconstruido en memoria
const REVERTS = [
    ["session.status === 'En Desayuno' || session.status === 'En Pausa de Turno' || session.status === 'Inactivo'", "session.status === 'En Desayuno' || session.status === 'Inactivo'"],
    ["session.status !== 'En Desayuno' && session.status !== 'En Pausa de Turno') {\n            session.status = 'Inactivo';", "session.status !== 'En Desayuno') {\n            session.status = 'Inactivo';"],
    [/        \} else if \(session\.status === 'En Pausa de Turno'\) \{\n[^\n]*\n[^\n]*\n[^\n]*\n/, '']
];
function buildOriginal(src) {
    let out = src;
    out = out.replace(REVERTS[0][0], REVERTS[0][1]);
    out = out.replace(REVERTS[1][0], REVERTS[1][1]);
    out = out.replace(REVERTS[2][0], REVERTS[2][1]);
    out = out.replace("session.status !== 'En Desayuno' && session.status !== 'En Pausa de Turno') { // más de 2", "session.status !== 'En Desayuno') { // más de 2");
    out = out.replace(/\n            if \(ev\.type === 'Pausa de Turno'\) icon = [^\n]*/, '');
    out = out.replace("s.status === 'En Desayuno' || s.status === 'En Pausa de Turno' || s.status === 'Inactivo'", "s.status === 'En Desayuno' || s.status === 'Inactivo'");
    return out;
}
const ORIGINAL = buildOriginal(PATCHED);

// ---------------------------------------------------------------- extracción de funciones reales
function extract(src, header) {
    const start = src.indexOf(header);
    if (start < 0) throw new Error('No se encontró: ' + header);
    const end = src.indexOf('\n}\n', start) + 3;
    return src.slice(start, end);
}

function makeEnv(src) {
    const NOW = Date.now();
    const env = {};
    // ---- Monitoreo (tarjetas)
    env.render = (session, { statusFilter = '' } = {}) => {
        const cards = []; const grid = { innerHTML: '', appendChild(c) { cards.push(c); } };
        const sessions = { u1: JSON.parse(JSON.stringify(session)) };
        const ctx = {
            document: {
                getElementById: (id) => id === 'monitoreoGrid' ? grid : id === 'filterStatusSelect' ? { value: statusFilter } : null,
                createElement: () => ({ className: '', innerHTML: '', querySelector: () => null })
            },
            allActiveSessions: sessions, SUPERVISORES_NOMBRES: [], availableAvatars: [], globalCronogramaData: null, Date,
            normalizeName: (s) => String(s || '').toLowerCase(), namesMatch: () => false, getShiftCategory: () => 'Mañana',
            calculateShiftDelay: () => '', escapeHTML: (s) => String(s), encodeInlineHandlerArg: (s) => String(s),
            reconcileScheduledTaskWithSession: () => ({ status: 'Pendiente' }), getAssignedTasksForGestor: () => [], encodeURIComponent
        };
        vm.createContext(ctx);
        vm.runInContext(extract(src, 'function renderActiveSessionsDashboard()') + '\nthis.fn = renderActiveSessionsDashboard;', ctx);
        ctx.fn();
        const html = cards.length ? cards[0].innerHTML : '';
        const m = html.match(/status-indicator-badge[^>]*>\s*<div[^>]*><\/div>\s*([^\n<]+)/);
        return { rendered: cards.length > 0, html, label: m ? m[1].trim() : '(sin tarjeta)', statusAfter: sessions.u1.status };
    };
    // ---- Modal de timeline
    env.timeline = (session) => {
        const tbody = { innerHTML: '' }; const modal = { classList: { add() { this.added = true; }, added: false } };
        const ctx = {
            document: { getElementById: (id) => id === 'timelineModal' ? modal : id === 'timelineTableBody' ? tbody : id === 'timelineModalName' ? {} : null },
            allActiveSessions: { u1: JSON.parse(JSON.stringify(session)) }, Date, Math
        };
        vm.createContext(ctx);
        vm.runInContext(extract(src, 'function viewTimelineInMonitoreo(uid)') + '\nthis.fn = viewTimelineInMonitoreo;', ctx);
        ctx.fn('u1');
        return { html: tbody.innerHTML, opened: modal.classList.added };
    };
    // ---- Historial de accesos
    env.history = async (activeSessions) => {
        let captured = null;
        const snap = (v) => ({ exists: () => v != null, val: () => v });
        const ctx = {
            document: { getElementById: (id) => id === 'loginHistoryModal' ? { classList: { add() {} } } : id === 'loginHistoryTableBody' ? { innerHTML: '' } : null },
            database: { ref: (p) => ({ once: async () => snap(p === 'active_sessions' ? activeSessions : null) }) },
            renderLoginHistoryTable: (r) => { captured = r; }, console, Date
        };
        vm.createContext(ctx);
        vm.runInContext('let allLoginHistoryRecords = [];\n' + extract(src, 'async function openLoginHistoryModal()') + '\nthis.fn = openLoginHistoryModal;', ctx);
        await ctx.fn();
        return captured;
    };
    env.NOW = NOW;
    return env;
}

// ---------------------------------------------------------------- definición de pruebas
const tests = [];
const T = (id, edit, name, bug, fn) => tests.push({ id, edit, name, bug, fn });
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg || 'valor distinto'}: esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); };
const ok = (c, msg) => { if (!c) throw new Error(msg || 'condición falsa'); };
const base = (extra) => Object.assign({ name: 'Ana Prueba', email: 'ana@virtualsoft.tech', shift: '8am - 4pm' }, extra);

// (a) filtro
T('A1', 'a', "Filtro 'En línea' EXCLUYE a quien está en Pausa de Turno (igual que Almuerzo)", true, (e) => {
    const s = base({ status: 'En Pausa de Turno', lastActive: e.NOW - 5000 });
    eq(e.render(s, { statusFilter: 'online' }).rendered, false, "Pausa de Turno no debe aparecer como 'en línea'");
    eq(e.render(base({ status: 'En Almuerzo', lastActive: e.NOW - 5000 }), { statusFilter: 'online' }).rendered, false, 'referencia Almuerzo');
});
T('A2', 'a', "Filtro 'Fuera de línea' INCLUYE a quien está en Pausa de Turno", true, (e) => {
    eq(e.render(base({ status: 'En Pausa de Turno', lastActive: e.NOW - 5000 }), { statusFilter: 'offline' }).rendered, true);
});
T('A3', 'a', "Filtro 'En línea' sigue incluyendo a 'En Línea' con latido reciente (sin regresión)", false, (e) => {
    eq(e.render(base({ status: 'En Línea', lastActive: e.NOW - 5000 }), { statusFilter: 'online' }).rendered, true);
});
T('A4', 'a', "Sin filtro, la Pausa de Turno aparece en el listado", false, (e) => {
    eq(e.render(base({ status: 'En Pausa de Turno', lastActive: e.NOW - 5000 })).rendered, true);
});

// (b) no degradar
T('B1', 'b', "Pausa de Turno sin latido por 5 min NO se degrada a 'Inactivo'", true, (e) => {
    const r = e.render(base({ status: 'En Pausa de Turno', lastActive: e.NOW - 300000 }));
    eq(r.statusAfter, 'En Pausa de Turno', 'estado tras renderizar');
});
T('B2', 'b', "Control: 'En Línea' sin latido por 5 min SÍ se degrada a 'Inactivo' (regla original intacta)", false, (e) => {
    eq(e.render(base({ status: 'En Línea', lastActive: e.NOW - 300000 })).statusAfter, 'Inactivo');
});
T('B3', 'b', "Control: Almuerzo y Desayuno sin latido conservan su estado", false, (e) => {
    eq(e.render(base({ status: 'En Almuerzo', lastActive: e.NOW - 300000 })).statusAfter, 'En Almuerzo');
    eq(e.render(base({ status: 'En Desayuno', lastActive: e.NOW - 300000 })).statusAfter, 'En Desayuno');
});

// (c) presentación
T('C1', 'c', "Texto de estado 'En Pausa de Turno ⏸️' con latido reciente", true, (e) => {
    eq(e.render(base({ status: 'En Pausa de Turno', lastActive: e.NOW - 5000 })).label, 'En Pausa de Turno ⏸️');
});
T('C2', 'c', "Texto de estado 'En Pausa de Turno ⏸️' aun sin latido (el gestor no pinguea en pausa larga)", true, (e) => {
    eq(e.render(base({ status: 'En Pausa de Turno', lastActive: e.NOW - 300000 })).label, 'En Pausa de Turno ⏸️');
});
T('C3', 'c', "Paridad con Almuerzo: el indicador de la tarjeta usa la misma clase CSS que los otros descansos", false, (e) => {
    // Nota: statusBadge y statusDot se asignan en app.js pero la tarjeta no los pinta (también ocurre con Almuerzo/Desayuno);
    // lo que ve el supervisor es la clase del indicador + displayStatus. Se verifica que Pausa se comporte como Almuerzo.
    const cls = (h) => (h.match(/status-indicator-badge (status-\w+)/) || [])[1];
    for (const ms of [5000, 300000]) {
        const p = cls(e.render(base({ status: 'En Pausa de Turno', lastActive: e.NOW - ms })).html);
        const a = cls(e.render(base({ status: 'En Almuerzo', lastActive: e.NOW - ms })).html);
        ok(p !== undefined, 'no se encontró la clase del indicador');
        eq(p, a, 'clase del indicador (Pausa vs Almuerzo) con latido hace ' + ms + ' ms');
    }
});
T('C4', 'c', "Sin regresión de texto: Almuerzo, Desayuno, Inactivo y En Línea", false, (e) => {
    eq(e.render(base({ status: 'En Almuerzo', lastActive: e.NOW - 5000 })).label, 'En Almuerzo/Cena 🍽️');
    eq(e.render(base({ status: 'En Desayuno', lastActive: e.NOW - 5000 })).label, 'En Desayuno ☕');
    eq(e.render(base({ status: 'Inactivo', lastActive: e.NOW - 5000 })).label, 'Inactivo 💤');
    eq(e.render(base({ status: 'En Línea', lastActive: e.NOW - 5000 })).label, 'En Línea');
});
T('C5', 'c', "Sin regresión de HTML: las tarjetas de los estados que no son Pausa son idénticas al original", false, (e, eOrig) => {
    for (const st of ['En Almuerzo', 'En Desayuno', 'Inactivo', 'En Línea']) {
        const s = base({ status: st, lastActive: e.NOW - 5000 });
        eq(e.render(s).html.replace(/\s+/g, ' '), eOrig.render(s).html.replace(/\s+/g, ' '), 'HTML distinto en ' + st);
    }
});

// (d) timeline: inactividad falsa
const PAUSA_EV = { type: 'Pausa de Turno', start: Date.now() - 1800000, end: Date.now() - 600000 };
T('D1', 'd', "Timeline de un gestor en Pausa (5 min sin latido) NO muestra 'Inactividad' en curso", true, (e) => {
    const r = e.timeline(base({ status: 'En Pausa de Turno', lastActive: e.NOW - 300000, timeline: [] }));
    ok(!r.html.includes('Inactividad'), 'se inyectó una Inactividad falsa');
    ok(r.html.includes('No hay pausas ni inactividades'), 'debería mostrar el mensaje de timeline vacío');
});
T('D2', 'd', "Control: gestor 'En Línea' con 5 min sin latido SÍ muestra 'Inactividad' en curso", false, (e) => {
    ok(e.timeline(base({ status: 'En Línea', lastActive: e.NOW - 300000, timeline: [] })).html.includes('Inactividad'));
});
T('D3', 'd', "Control: Almuerzo y Desayuno sin latido no inyectan 'Inactividad'", false, (e) => {
    for (const st of ['En Almuerzo', 'En Desayuno'])
        ok(!e.timeline(base({ status: st, lastActive: e.NOW - 300000, timeline: [] })).html.includes('Inactividad'), st);
});

// (e) ícono
T('E1', 'e', "Evento 'Pausa de Turno' se dibuja con ícono bx-pause-circle morado", true, (e) => {
    const r = e.timeline(base({ status: 'En Línea', lastActive: e.NOW - 5000, timeline: [PAUSA_EV] }));
    ok(r.html.includes('bx-pause-circle'), 'falta el ícono de pausa');
    ok(r.html.includes('#8b5cf6'), 'falta el color morado');
    ok(r.html.includes('Pausa de Turno'), 'falta el nombre del evento');
    ok(r.html.includes('20 min'), 'duración esperada 20 min');
});
T('E2', 'e', "Sin regresión: los eventos Almuerzo, Desayuno e Inactividad conservan su ícono", false, (e) => {
    const t = (type) => ({ type, start: Date.now() - 1800000, end: Date.now() - 600000 });
    const r = e.timeline(base({ status: 'En Línea', lastActive: e.NOW - 5000, timeline: [t('Almuerzo'), t('Desayuno'), t('Inactividad')] }));
    ok(r.html.includes('bx-restaurant') && r.html.includes('bx-coffee') && r.html.includes('bx-sleepy'));
    ok(!r.html.includes('bx-pause-circle'));
});
T('E3', 'e', "El modal se abre", false, (e) => { eq(e.timeline(base({ status: 'En Línea', lastActive: e.NOW, timeline: [] })).opened, true); });

// (f) historial de accesos
T('F1', 'f', "Historial: sesión en Pausa de Turno queda isOnline=false y conserva su estado", true, async (e) => {
    const rows = await e.history({ u1: base({ status: 'En Pausa de Turno', lastActive: e.NOW - 5000, loginTime: new Date(e.NOW - 3600000).toISOString() }) });
    eq(rows.length, 1); eq(rows[0].isOnline, false, 'isOnline'); eq(rows[0].status, 'En Pausa de Turno', 'status'); eq(rows[0].source, 'En Vivo');
});
T('F2', 'f', "Historial: control — sesión 'En Línea' reciente queda isOnline=true", false, async (e) => {
    const rows = await e.history({ u1: base({ status: 'En Línea', lastActive: e.NOW - 5000, loginTime: new Date(e.NOW - 3600000).toISOString() }) });
    eq(rows[0].isOnline, true);
});
T('F3', 'f', "Historial: control — Almuerzo, Desayuno e Inactivo quedan isOnline=false", false, async (e) => {
    for (const st of ['En Almuerzo', 'En Desayuno', 'Inactivo']) {
        const rows = await e.history({ u1: base({ status: st, lastActive: e.NOW - 5000, loginTime: new Date(e.NOW - 3600000).toISOString() }) });
        eq(rows[0].isOnline, false, st);
    }
});

// ---------------------------------------------------------------- integridad del archivo (solo sobre el app.js real)
const integrity = [];
const I = (name, fn) => integrity.push({ name, fn });
I('Sintaxis válida (equivale a node --check)', () => { new vm.Script(PATCHED, { filename: 'app.js' }); });
I("'En Pausa de Turno' aparece 7 veces (1 escritura previa + 6 del parche)", () => eq((PATCHED.match(/En Pausa de Turno/g) || []).length, 7));
I('Todas las líneas terminan en CRLF (no hay LF sueltos; app.js es CRLF)', () => {
    const lf = (RAW.match(/(?<!\r)\n/g) || []).length; eq(lf, 0, 'saltos LF sueltos');
});
I('El original reconstruido difiere del parchado y es sintácticamente válido', () => {
    ok(ORIGINAL !== PATCHED, 'la reversión no cambió nada'); new vm.Script(ORIGINAL, { filename: 'app.original.js' });
    eq((ORIGINAL.match(/En Pausa de Turno/g) || []).length, 1, 'menciones tras revertir');
});
I("Cobertura: todo sitio que compara 'En Desayuno' contra el estado también contempla 'En Pausa de Turno'", () => {
    const lines = PATCHED.split('\n'); const missing = [];
    lines.forEach((l, i) => { if (/status\s*[!=]==\s*'En Desayuno'/.test(l) && !/En Pausa de Turno/.test(l) && !/else if/.test(l)) missing.push(i + 1); });
    eq(missing.length, 0, 'líneas sin Pausa de Turno: ' + missing.join(','));
});

// ---------------------------------------------------------------- ejecución
(async () => {
    const eP = makeEnv(PATCHED), eO = makeEnv(ORIGINAL);
    let failedPatched = 0, wrongOriginal = 0;
    console.log('=== PARCHE "PAUSA DE TURNO" — PRUEBAS UNITARIAS ===');
    console.log('Archivo: ' + APP + ' | ' + new Date().toISOString());
    console.log('\n--- 1. Integridad del archivo');
    let integFail = 0;
    for (const t of integrity) {
        try { t.fn(); console.log('  [PASS] ' + t.name); } catch (err) { integFail++; console.log('  [FAIL] ' + t.name + ' -> ' + err.message); }
    }
    console.log('\n--- 2. Funciones reales de app.js PARCHADO (todas deben pasar)');
    const resP = {};
    for (const t of tests) {
        try { await t.fn(eP, eO); resP[t.id] = true; console.log(`  [PASS] (${t.edit}) ${t.id} ${t.name}`); }
        catch (err) { resP[t.id] = false; failedPatched++; console.log(`  [FAIL] (${t.edit}) ${t.id} ${t.name} -> ${err.message}`); }
    }
    console.log('\n--- 3. Mismas pruebas sobre el app.js ORIGINAL (verifica que las pruebas detectan el bug)');
    console.log('     Esperado: las marcadas [BUG] FALLAN; las demás PASAN (no hay regresión).');
    for (const t of tests) {
        let passed = true, msg = '';
        try { await t.fn(eO, eO); } catch (err) { passed = false; msg = err.message; }
        const expected = !t.bug; const good = passed === expected; if (!good) wrongOriginal++;
        console.log(`  [${good ? 'OK ' : 'MAL'}] ${t.id} ${t.bug ? '[BUG]' : '     '} original ${passed ? 'pasa' : 'FALLA'}${passed ? '' : ' -> ' + msg}`);
    }
    const bugTests = tests.filter((t) => t.bug).length;
    console.log('\n=== RESUMEN ===');
    console.log(`Integridad: ${integrity.length - integFail}/${integrity.length}`);
    console.log(`Parchado:   ${tests.length - failedPatched}/${tests.length} pruebas pasan`);
    console.log(`Original:   ${bugTests} pruebas [BUG] fallan como se esperaba; ${tests.length - bugTests} de control pasan -> ${wrongOriginal === 0 ? 'coherente' : wrongOriginal + ' inconsistencias'}`);
    const all = integFail === 0 && failedPatched === 0 && wrongOriginal === 0;
    console.log(all ? 'RESULTADO: PARCHE VERIFICADO' : 'RESULTADO: HAY FALLAS');
    process.exitCode = all ? 0 : 1;
})();
