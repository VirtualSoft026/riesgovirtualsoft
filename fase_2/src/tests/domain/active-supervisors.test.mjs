/**
 * Insignia de supervisor activo. Decisión D9b (2026-10-06): los supervisores se derivan de `users` (rol exacto
 * 'Supervisor' | 'Admin'); la lista fija original (`LEGACY_BADGE_SUPERVISORS`) solo se usa en el diferencial con la
 * opción EXPLÍCITA `legacySupervisors: true` (o en el modo transitorio sin `getSupervisorUsers`, documentado).
 */
import { createRunner, assert } from '../test-harness.mjs';
import { createFakeDocument } from '../helpers/fake-dom-comunicados.mjs';
import {
    LEGACY_BADGE_SUPERVISORS,
    buildBadgeSupervisors,
    buildSupervisorBadgeHtml,
    computeActiveSupervisors,
    formatSupervisorNames,
    isSupervisorShiftActive
} from '../../domain/schedules/active-supervisors.js';
import { createSupervisorBadgeController } from '../../controllers/supervisor-badge-controller.js';
import { getShiftForDate } from '../../domain/schedules/schedule-service.js';

const { test, testAsync, summarizeAsync } = createRunner('active-supervisors (insignia de supervisor activo; diferencial vs app.js 8329-8396)');

/** Nodo `users` de prueba (D9b): roles exactos; Oriana y Mariana son Gestoras. */
const USERS = {
    s1: { name: 'Maria Sanchez', role: 'Supervisor', approved: true },
    s2: { name: 'Sara Santamaría', role: 'Supervisor', approved: true },
    s3: { name: 'Camilo Espinosa', role: 'Admin', approved: true },
    g1: { name: 'Oriana Borja', role: 'Gestor', approved: true },
    g2: { name: 'Mariana Ruiz', role: 'Gestor', approved: true },
    g3: { name: 'Maria Fernanda Gil', role: 'Gestor', approved: true },
    x: null, y: { name: 'Sin rol' }, z: { name: 'Rol en minúsculas', role: 'supervisor' }
};

/** Copia LITERAL de app.js 8333-8396 con globales como parámetros. Devuelve {innerHTML, display} del badge. */
function legacyUpdateActiveSupervisorBadge({ globalScheduleRows, globalScheduleBlocks, getShiftForDate, badge, now }) {
    if (typeof globalScheduleRows === 'undefined' || !globalScheduleRows || globalScheduleRows.length === 0) return;

    if (!badge) return;

    let activeSups = [];
    let currentHour = now.getHours();
    let currentMin = now.getMinutes();
    let timeFloat = currentHour + (currentMin / 60);

    const supervisors = [
        {name: 'Maria', full: 'Maria Sanchez'}, 
        {name: 'Sara', full: 'Sara Santamaría'},
        {name: 'Oriana', full: 'Oriana Borja'}
    ];

    for (let sup of supervisors) {
        let shiftStr = typeof getShiftForDate === 'function' ? getShiftForDate(globalScheduleRows, globalScheduleBlocks, sup.name, now) : null;
        
        if (shiftStr && typeof shiftStr === 'string' && shiftStr !== 'Descansa' && shiftStr !== 'Por Asignar' && shiftStr !== 'Vacaciones') {
            let match = shiftStr.match(/(\d+)(am|pm|a\.m\.|p\.m\.)\s*-\s*(\d+)(am|pm|a\.m\.|p\.m\.)/i);
            if (match) {
                let startH = parseInt(match[1]);
                let startMeridiem = match[2].toLowerCase().replace(/\./g, '');
                if (startMeridiem === 'pm' && startH !== 12) startH += 12;
                if (startMeridiem === 'am' && startH === 12) startH = 0;
                
                let endH = parseInt(match[3]);
                let endMeridiem = match[4].toLowerCase().replace(/\./g, '');
                if (endMeridiem === 'pm' && endH !== 12) endH += 12;
                if (endMeridiem === 'am' && endH === 12) endH = 0;
                
                let startFloat = startH;
                let endFloat = endH;
                
                let isActive = false;
                if (endFloat <= startFloat) {
                    if (timeFloat >= startFloat || timeFloat < endFloat) isActive = true;
                } else {
                    if (timeFloat >= startFloat && timeFloat < endFloat) isActive = true;
                }
                
                if (isActive) {
                    if (!activeSups.includes(sup.name)) activeSups.push(sup.name);
                }
            } else if (shiftStr.toLowerCase().includes('turno')) {
                if (!activeSups.includes(sup.name)) activeSups.push(sup.name);
            }
        }
    }
    
    if (activeSups.length > 0) {
        let formattedSups = '';
if (activeSups.length === 1) formattedSups = activeSups[0];
else if (activeSups.length === 2) formattedSups = activeSups.join(' y ');
else formattedSups = activeSups.slice(0, -1).join(', ') + ' y ' + activeSups[activeSups.length - 1];
badge.innerHTML = `<i class='bx bx-support'></i> Sup: ${formattedSups}`;
    } else {
        badge.innerHTML = `<i class='bx bx-support'></i> Sup: Ninguna (Fuera de turno)`;
    }
    badge.style.display = 'inline-flex';
}

function makeRng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const SHIFTS = ['8am - 4pm', '6am - 2pm', '2pm - 10pm', '10pm - 6am', '12pm - 8pm', '12am - 8am', '8 a.m. - 4 p.m.', '8a.m. - 4p.m.', '7:30am - 3:30pm', 'Turno Mañana', 'turno noche', 'Descansa', 'Por Asignar', 'Vacaciones', 'Libre', '', null, undefined, 42];

test('diferencial (lista fija EXPLÍCITA legacySupervisors:true): la insignia es idéntica a app.js para 600 combinaciones de turnos y horas (con semilla)', () => {
    const rng = makeRng(123);
    for (let i = 0; i < 600; i += 1) {
        const shifts = { Maria: SHIFTS[Math.floor(rng() * SHIFTS.length)], Sara: SHIFTS[Math.floor(rng() * SHIFTS.length)], Oriana: SHIFTS[Math.floor(rng() * SHIFTS.length)] };
        const now = new Date(2026, 9, 6, Math.floor(rng() * 24), Math.floor(rng() * 60));
        const lookup = (rows, blocks, name) => shifts[name];
        const mk = () => createFakeDocument().el('activeSupervisorBadge');
        const b1 = mk(); const b2 = mk();
        legacyUpdateActiveSupervisorBadge({ globalScheduleRows: [[1]], globalScheduleBlocks: [{}], getShiftForDate: lookup, badge: b1, now });
        const doc = { getElementById: () => b2 };
        createSupervisorBadgeController({ document: doc, getScheduleRows: () => [[1]], getScheduleBlocks: () => [{}], getShiftForDate: lookup, now: () => now, legacySupervisors: true }).update();
        assert.equal(b2.innerHTML, b1.innerHTML, JSON.stringify([shifts, now]));
        assert.equal(b2.style.display, b1.style.display);
    }
});

test('guardas: sin cronograma cargado o sin elemento no hace nada (el badge queda como estaba)', () => {
    for (const rows of [null, undefined, []]) {
        const b = createFakeDocument().el('activeSupervisorBadge');
        createSupervisorBadgeController({ document: { getElementById: () => b }, getScheduleRows: () => rows, getScheduleBlocks: () => [], getShiftForDate: () => '8am - 4pm' }).update();
        assert.equal(b.innerHTML, '');
        assert.equal(b.style.display, undefined);
    }
    createSupervisorBadgeController({ document: { getElementById: () => null }, getScheduleRows: () => [[1]], getScheduleBlocks: () => [], getShiftForDate: () => '' }).update();
});

test('sin función getShiftForDate (no disponible) equivale a "Ninguna"', () => {
    const b = createFakeDocument().el('activeSupervisorBadge');
    createSupervisorBadgeController({ document: { getElementById: () => b }, getScheduleRows: () => [[1]], getScheduleBlocks: () => [], getShiftForDate: undefined, getSupervisorUsers: () => USERS }).update();
    assert.ok(b.innerHTML.includes('Sup: Ninguna (Fuera de turno)'));
    assert.equal(b.style.display, 'inline-flex');
});

test('reglas del turno: dentro, fuera, cruce de medianoche, 12am/12pm, "turno" sin horas, no laborables', () => {
    assert.equal(isSupervisorShiftActive('8am - 4pm', 8), true);
    assert.equal(isSupervisorShiftActive('8am - 4pm', 15.99), true);
    assert.equal(isSupervisorShiftActive('8am - 4pm', 16), false);
    assert.equal(isSupervisorShiftActive('8am - 4pm', 7.5), false);
    assert.equal(isSupervisorShiftActive('10pm - 6am', 23), true);
    assert.equal(isSupervisorShiftActive('10pm - 6am', 3), true);
    assert.equal(isSupervisorShiftActive('10pm - 6am', 12), false);
    assert.equal(isSupervisorShiftActive('12pm - 8pm', 12), true);
    assert.equal(isSupervisorShiftActive('12am - 8am', 0), true);
    assert.equal(isSupervisorShiftActive('Turno Mañana', 3), true);
    for (const s of ['Descansa', 'Por Asignar', 'Vacaciones', '', null, undefined, 42, 'Libre']) assert.equal(isSupervisorShiftActive(s, 10), false, String(s));
    // HALLAZGO: solo horas enteras; "7:30am - 3:30pm" no se reconoce como rango (cae en "turno" y da falso)
    assert.equal(isSupervisorShiftActive('7:30am - 3:30pm', 10), false);
});

test('texto de la insignia: una, dos y tres personas; ninguna', () => {
    assert.equal(formatSupervisorNames(['Maria']), 'Maria');
    assert.equal(formatSupervisorNames(['Maria', 'Sara']), 'Maria y Sara');
    assert.equal(formatSupervisorNames(['Maria', 'Sara', 'Oriana']), 'Maria, Sara y Oriana');
    assert.equal(buildSupervisorBadgeHtml([]), "<i class='bx bx-support'></i> Sup: Ninguna (Fuera de turno)");
    assert.equal(buildSupervisorBadgeHtml(['Sara']), "<i class='bx bx-support'></i> Sup: Sara");
});

test('lista fija ORIGINAL (solo modo heredado): Maria, Sara, Oriana (HALLAZGO: Camilo no está)', () => {
    assert.deepEqual(LEGACY_BADGE_SUPERVISORS.map((s) => s.name), ['Maria', 'Sara', 'Oriana']);
    assert.deepEqual(computeActiveSupervisors(() => '8am - 4pm', new Date(2026, 9, 6, 9, 0), LEGACY_BADGE_SUPERVISORS), ['Maria', 'Sara', 'Oriana']);
    assert.deepEqual(computeActiveSupervisors((n) => (n === 'Sara' ? 'Turno' : 'Descansa'), new Date(2026, 9, 6, 9, 0), LEGACY_BADGE_SUPERVISORS), ['Sara']);
});

test('integración con getShiftForDate real del módulo schedule-service (sin cronograma: "Por Asignar" => Ninguna)', () => {
    const b = createFakeDocument().el('activeSupervisorBadge');
    createSupervisorBadgeController({ document: { getElementById: () => b }, getScheduleRows: () => [['x']], getScheduleBlocks: () => [], getShiftForDate, getSupervisorUsers: () => USERS }).update();
    assert.ok(b.innerHTML.includes('Ninguna'));
});

// ------------------------------------------------------------------ D9b: supervisores derivados de users

test('D9b: buildBadgeSupervisors toma SOLO rol exacto Supervisor/Admin de users, en orden alfabético; muestra el primer nombre', () => {
    const list = buildBadgeSupervisors(USERS);
    assert.deepEqual(list.map((s) => [s.uid, s.name, s.lookupName]), [['s3', 'Camilo', 'Camilo Espinosa'], ['s1', 'Maria', 'Maria Sanchez'], ['s2', 'Sara', 'Sara Santamaría']]);
    const dup = buildBadgeSupervisors({ a: { name: 'Maria Sanchez', role: 'Supervisor' }, b: { name: 'María López', role: 'Admin' } });
    assert.deepEqual(dup.map((s) => s.name), ['Maria Sanchez', 'María López'].sort((x, y) => x.localeCompare(y, 'es')), 'primer nombre repetido -> nombre completo');
    assert.deepEqual(buildBadgeSupervisors(null), []);
    assert.throws(() => computeActiveSupervisors(() => 'Turno', new Date()), /D9b/, 'sin lista ya no hay predeterminado fijo');
});

test('D9b: el turno se busca con el NOMBRE COMPLETO; "Maria Fernanda" (gestora) ya no se confunde con "Maria Sanchez"', () => {
    const rows = [['', '2026-10-06'], ['', 'Martes'], ['Maria Fernanda Gil', '8am - 4pm'], ['Maria Sanchez', 'Descansa'], ['Sara Santamaria', '6am - 2pm'], ['Camilo Espinosa', 'Vacaciones']];
    const blocks = [{ startRow: 0 }];
    const now = new Date(2026, 9, 6, 9, 0);
    const lookup = (r, b, name, d) => getShiftForDate(r, b, name, d);
    const nuevo = computeActiveSupervisors((n) => lookup(rows, blocks, n, now), now, buildBadgeSupervisors(USERS));
    assert.deepEqual(nuevo, ['Sara'], 'Maria descansa; Sara de turno');
    const original = computeActiveSupervisors((n) => lookup(rows, blocks, n, now), now, LEGACY_BADGE_SUPERVISORS);
    assert.deepEqual(original, ['Maria', 'Sara'], 'original: "Maria" encajaba con la fila de la gestora Maria Fernanda');
});

testAsync('D9b: controlador con getSupervisorUsers (síncrono, Promesa, null) y modo heredado explícito', async () => {
    const mk = (deps) => {
        const b = createFakeDocument().el('activeSupervisorBadge');
        const shifts = { 'Maria Sanchez': '8am - 4pm', Maria: '8am - 4pm', 'Camilo Espinosa': '8am - 4pm', 'Sara Santamaría': 'Descansa', Sara: 'Descansa', Oriana: '8am - 4pm', 'Mariana Ruiz': '8am - 4pm' };
        const ctl = createSupervisorBadgeController({ document: { getElementById: () => b }, getScheduleRows: () => [[1]], getScheduleBlocks: () => [{}], getShiftForDate: (r, bl, n) => shifts[n], now: () => new Date(2026, 9, 6, 9, 0), logger: { error() {} }, ...deps });
        return { b, ctl };
    };
    const sync = mk({ getSupervisorUsers: () => USERS }); sync.ctl.update();
    assert.equal(sync.b.innerHTML, "<i class='bx bx-support'></i> Sup: Camilo y Maria", 'Camilo (Admin) aparece; Oriana (Gestor) y Mariana no');

    const gestor = mk({ getSupervisorUsers: () => null }); gestor.ctl.update();
    assert.equal(gestor.b.innerHTML, '', 'sin acceso a users (Gestor) la insignia no se toca: no afirma "Ninguna"');
    assert.equal(gestor.b.style.display, undefined);

    let calls = 0;
    const asinc = mk({ getSupervisorUsers: () => { calls += 1; return Promise.resolve(USERS); } });
    asinc.ctl.update();
    assert.equal(asinc.b.innerHTML, '', 'mientras llega la Promesa no se pinta');
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(asinc.b.innerHTML, "<i class='bx bx-support'></i> Sup: Camilo y Maria", 'al llegar se repinta sola');
    asinc.ctl.update();
    assert.equal(calls, 1, 'la lista derivada se cachea');
    asinc.ctl.invalidateSupervisors(); asinc.ctl.update();
    assert.equal(calls, 2, 'invalidateSupervisors fuerza una nueva lectura');

    const fallo = mk({ getSupervisorUsers: () => Promise.reject(new Error('permiso denegado ficticio')) });
    fallo.ctl.update(); await new Promise((r) => setTimeout(r, 0));
    assert.equal(fallo.b.innerHTML, '');

    const legacy = mk({ getSupervisorUsers: () => USERS, legacySupervisors: true }); legacy.ctl.update();
    assert.equal(legacy.b.innerHTML, "<i class='bx bx-support'></i> Sup: Maria y Oriana", 'heredado explícito: lista fija');
    const transitorio = mk({}); transitorio.ctl.update();
    assert.equal(transitorio.b.innerHTML, legacy.b.innerHTML, 'modo transitorio (sin getSupervisorUsers): lista fija, documentado como pendiente');
});

await summarizeAsync();
