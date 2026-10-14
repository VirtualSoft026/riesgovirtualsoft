/**
 * Pruebas de `kpi-service.js`: fusión de `shift_reports` en el JSON operativo (`loadControlOperativoData`),
 * selección de gestores de KPIs (`loadGestoresForKPIs`) y `loadRetirosData`, con pruebas DIFERENCIALES contra
 * las funciones LITERALES de app.js (copiadas en `tests/helpers/kpi-legacy-app.mjs`).
 */
import { spawnSync } from 'node:child_process';
import { createRunner, assert } from '../test-harness.mjs';
import * as S from '../../domain/analytics/kpi-service.js';
import { makeSide } from '../helpers/kpi-harness.mjs';
import { makeRng, makeRawData } from '../helpers/kpi-test-env.mjs';

const { test, testAsync, summarizeAsync } = createRunner('kpi-service (fusión de reportes, gestores de KPIs, retiros)');

const NOW = new Date(2026, 9, 6, 15, 0, 0).getTime();
const clone = (o) => JSON.parse(JSON.stringify(o));
/** Las fechas internas (`_earliestLogin`) son de clases distintas (reloj fijo vs. Date): se comparan por valor. */
const plain = (o) => JSON.parse(JSON.stringify(o, function (k, v) { const raw = this[k]; return raw instanceof Date ? { __date: Number.isNaN(raw.getTime()) ? 'Invalid' : raw.getTime() } : v; }));

/** Reportes de turno sintéticos con todas las variantes que el original contempla. */
function makeReports(rng, nombresRaw, n) {
    const pick = (a) => a[Math.floor(rng() * a.length)];
    const turnos = ['8am - 4pm', '6:00 am - 2:00 pm', '2pm - 10pm', '10 pm', '12 am', '12:30 pm', 'Descansa', undefined, 'Por Asignar', '7 a. m.'];
    const reports = {};
    for (let i = 0; i < n; i++) {
        const base = NOW - Math.floor(rng() * 20) * 86400000 - Math.floor(rng() * 86400000);
        const nombre = rng() < 0.15 ? 'Gestor Nuevo ' + Math.floor(rng() * 3) : pick(nombresRaw);
        const variante = pick([nombre, nombre.toUpperCase(), nombre.normalize('NFD').replace(/[̀-ͯ]/g, ''), nombre.split(' ')[0] + ' ' + (nombre.split(' ')[1] || '') + ' Extra']);
        const r = { rol: rng() < 0.9 ? 'Gestor' : 'Admin', gestor: rng() < 0.05 ? undefined : variante };
        if (rng() < 0.85) r.timestamp = base;
        if (rng() < 0.7) r.loginTime = rng() < 0.5 ? base - Math.floor(rng() * 7200000) : new Date(base - Math.floor(rng() * 7200000)).toISOString();
        if (!r.loginTime && rng() < 0.6) {
            const d = new Date(base);
            r.horaInicio = pick([
                `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}, ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:00 ${rng() < 0.5 ? 'a. m.' : 'p. m.'}`,
                `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}, 9:15:00 a. m.`, `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`, 'sin formato', '2026-10-05T08:00:00'
            ]);
        }
        const turno = pick(turnos);
        if (turno) r.turnoProgramado = turno;
        if (rng() < 0.3) r.tardanzaMins = pick([0, 3, 12, 45]);
        const login = r.loginTime ? new Date(r.loginTime).getTime() : base;
        if (rng() < 0.7) {
            r.timeline = [];
            const m = Math.floor(rng() * 5);
            for (let k = 0; k < m; k++) {
                const start = login + Math.floor(rng() * 12) * 3600000 + Math.floor(rng() * 3600000);
                const ev = { type: pick(['Inactividad', 'Inactividad', 'Almuerzo', 'Desayuno']), start };
                if (rng() < 0.8) ev.end = start + Math.floor(rng() * 5400000);
                r.timeline.push(ev);
            }
        } else if (rng() < 0.6) r.inactividadTotalMins = Math.floor(rng() * 700);
        reports['-N' + String(i).padStart(4, '0')] = r;
    }
    return reports;
}

/** Ejecuta `loadControlOperativoData` ORIGINAL (app.js 7292-7479) en un entorno simulado y devuelve el JSON resultante. */
async function legacyMerged(raw, reports, users) {
    const side = makeSide('legacy', { nowMs: NOW, raw, users, shiftReports: reports });
    await side.api.loadControlOperativoData();
    return { raw: plain(side.window.controlOperativoRawData), kpiUsersData: side.window.kpiUsersData, logs: side.logs, alerts: side.alerts };
}

testAsync('diferencial vs app.js 7312-7447: fusión de 60 reportes aleatorios sobre el JSON operativo (8 semillas)', async () => {
    for (let seed = 1; seed <= 8; seed++) {
        const rng = makeRng(seed * 7919);
        const raw = makeRawData(rng, { gestores: 6, dias: 25, baseMs: NOW });
        const reports = makeReports(rng, Object.keys(raw), 60);
        const esperado = await legacyMerged(clone(raw), reports, null);
        const nuevo = clone(raw);
        S.mergeShiftReportsIntoOperativoData(nuevo, reports, { nowMs: NOW, fechaLocal: false }); // original explícito (D5)
        assert.deepEqual(plain(nuevo), esperado.raw, `semilla ${seed}`);
        assert.deepEqual(esperado.logs.filter(l => l[0] === 'error'), [], 'el original no debió fallar');
    }
});

testAsync('diferencial vs app.js: acepta también un arreglo de reportes y un nodo vacío/null', async () => {
    const rng = makeRng(11);
    const raw = makeRawData(rng, { gestores: 3, dias: 10, baseMs: NOW });
    const reports = makeReports(rng, Object.keys(raw), 12);
    const a = clone(raw); S.mergeShiftReportsIntoOperativoData(a, reports, { nowMs: NOW });
    const b = clone(raw); S.mergeShiftReportsIntoOperativoData(b, Object.values(reports), { nowMs: NOW });
    assert.deepEqual(a, b);
    const c = clone(raw); S.mergeShiftReportsIntoOperativoData(c, null, { nowMs: NOW });
    assert.deepEqual(c, raw);
});

test('fusión: solo cuentan reportes de rol Gestor con nombre; un turno = un día laborado', () => {
    const raw = { 'Ana Pérez': {} };
    S.mergeShiftReportsIntoOperativoData(raw, [
        { rol: 'Admin', gestor: 'Ana Pérez', timestamp: NOW },
        { rol: 'Gestor', timestamp: NOW },
        { rol: 'Gestor', gestor: 'ana perez', timestamp: NOW, tardanzaMins: 0 }
    ], { nowMs: NOW });
    const dias = Object.values(raw['Ana Pérez']);
    assert.equal(dias.length, 1);
    assert.equal(dias[0].Dias_Laborados, 1);
    assert.equal(dias[0].Minutos_Tarde_Total, 0);
});

test('fusión: un gestor desconocido crea su propia llave; coincidencia por acentos/mayúsculas y por nombre+apellido', () => {
    const raw = { 'María López Gómez': {}, 'Sebastian Hincapie': {} };
    S.mergeShiftReportsIntoOperativoData(raw, [
        { rol: 'Gestor', gestor: 'MARIA LOPEZ GOMEZ', timestamp: NOW, tardanzaMins: 0 },
        { rol: 'Gestor', gestor: 'Maria Lopez', timestamp: NOW, tardanzaMins: 0 },
        { rol: 'Gestor', gestor: 'Nuevo Gestor', timestamp: NOW, tardanzaMins: 0 }
    ], { nowMs: NOW });
    assert.deepEqual(Object.keys(raw).sort(), ['María López Gómez', 'Nuevo Gestor', 'Sebastian Hincapie']);
    assert.equal(S.findRealGestorKey('Maria Lopez', ['María López Gómez']), 'María López Gómez');
    assert.equal(S.findRealGestorKey('Maria', ['María López Gómez']), undefined, 'un solo nombre no alcanza');
});

test('fusión: tardanza (>5 min y <=240), fuera de horario (>240) y primer ingreso del día', () => {
    const d = (h, m) => new Date(2026, 9, 5, h, m, 0).getTime();
    const raw = { Ana: {} };
    S.mergeShiftReportsIntoOperativoData(raw, [
        { rol: 'Gestor', gestor: 'Ana', timestamp: d(8, 30), loginTime: d(8, 30), turnoProgramado: '8am - 4pm', inactividadTotalMins: 10 }, // 30 min tarde
        { rol: 'Gestor', gestor: 'Ana', timestamp: d(8, 3), loginTime: d(8, 3), turnoProgramado: '8am - 4pm', inactividadTotalMins: 5 }      // 3 min: no es tarde, pero es el primer ingreso
    ], { nowMs: NOW });
    const dia = Object.values(raw.Ana)[0];
    assert.equal(dia.Minutos_Tarde_Total, 0, 'el ingreso más temprano del día manda');
    assert.equal(dia.Dias_Tarde, 0);
    assert.equal(dia.Minutos_Inactividad_Total, 15, 'la inactividad de ambos turnos se suma');

    const raw2 = { Ana: {} };
    S.mergeShiftReportsIntoOperativoData(raw2, [
        { rol: 'Gestor', gestor: 'Ana', timestamp: d(14, 0), loginTime: d(14, 0), turnoProgramado: '8am - 4pm', inactividadTotalMins: 99 }  // 6 h tarde: fuera de horario
    ], { nowMs: NOW });
    const f = Object.values(raw2.Ana)[0];
    assert.equal(f.Minutos_Tarde_Total, 0);
    assert.equal(f.Minutos_Inactividad_Total, 0, 'fuera de horario no suma inactividad');
    assert.equal(f.Dias_Laborados, 1);
});

test('fusión: la inactividad se topa a 480 min por turno y a 10 h desde el ingreso; eventos abiertos corren hasta "ahora"', () => {
    const login = NOW - 20 * 3600000;
    const raw = { Ana: {} };
    S.mergeShiftReportsIntoOperativoData(raw, [{
        rol: 'Gestor', gestor: 'Ana', timestamp: login, loginTime: login, tardanzaMins: 0,
        timeline: [
            { type: 'Inactividad', start: login + 3600000, end: login + 2 * 3600000 },                // 60 min
            { type: 'Inactividad', start: login + 9 * 3600000 },                                       // abierto: se corta a las 10 h => 60 min
            { type: 'Inactividad', start: login + 11 * 3600000, end: login + 12 * 3600000 },          // después de las 10 h: se ignora
            { type: 'Almuerzo', start: login + 4 * 3600000, end: login + 5 * 3600000 }                  // no es inactividad
        ]
    }], { nowMs: NOW });
    assert.equal(Object.values(raw.Ana)[0].Minutos_Inactividad_Total, 120);

    const raw2 = { Ana: {} };
    S.mergeShiftReportsIntoOperativoData(raw2, [{ rol: 'Gestor', gestor: 'Ana', timestamp: NOW, loginTime: NOW, tardanzaMins: 0, inactividadTotalMins: 5000 }], { nowMs: NOW });
    assert.equal(Object.values(raw2.Ana)[0].Minutos_Inactividad_Total, 480);
});

test('ORIGINAL explícito (fechaLocal:false): la fecha del reporte es la UTC del cierre; por defecto (D5) es la local', () => {
    // 6-oct-2026 21:30 hora local (si la zona es UTC-5, en UTC ya es 7-oct 02:30)
    const ts = new Date(2026, 9, 6, 21, 30, 0).getTime();
    const utcDay = new Date(ts).toISOString().split('T')[0];
    const localDay = '2026-10-06';
    const a = { Ana: {} }; S.mergeShiftReportsIntoOperativoData(a, [{ rol: 'Gestor', gestor: 'Ana', timestamp: ts, tardanzaMins: 0 }], { nowMs: NOW, fechaLocal: false });
    const b = { Ana: {} }; S.mergeShiftReportsIntoOperativoData(b, [{ rol: 'Gestor', gestor: 'Ana', timestamp: ts, tardanzaMins: 0 }], { nowMs: NOW });
    assert.deepEqual(Object.keys(a.Ana), [utcDay], 'fechaLocal:false = comportamiento de app.js (UTC)');
    assert.deepEqual(Object.keys(b.Ana), [localDay], 'predeterminado (D5) = fecha local');
});

// ------------------------------------------------------------------ D5: día operativo LOCAL (zona fijada)
/** Instante de una hora de pared en UTC-5 (Colombia no tiene horario de verano). */
const bogota = (y, mo, d, h, mi = 0) => Date.UTC(y, mo - 1, d, h + 5, mi);
const TZ = 'America/Bogota';
const dayOf = (report, opts = {}) => {
    const raw = { Ana: {} };
    S.mergeShiftReportsIntoOperativoData(raw, [{ rol: 'Gestor', gestor: 'Ana', tardanzaMins: 0, ...report }], { nowMs: NOW, timeZone: TZ, ...opts });
    return Object.keys(raw.Ana);
};

test('D5: turno nocturno 22:00-06:00 en UTC-5 (zona inyectada) queda en el día en que EMPEZÓ; el original lo pasaba al siguiente', () => {
    const inicio = bogota(2026, 10, 5, 22, 0);   // 5-oct 22:00 local = 6-oct 03:00 UTC
    const cierre = bogota(2026, 10, 6, 6, 0);    // 6-oct 06:00 local = 6-oct 11:00 UTC
    assert.deepEqual(dayOf({ loginTime: inicio, timestamp: cierre }), ['2026-10-05'], 'con loginTime (instante de ingreso)');
    assert.deepEqual(dayOf({ loginTime: new Date(inicio).toISOString(), timestamp: cierre }), ['2026-10-05'], 'loginTime ISO');
    assert.deepEqual(dayOf({ horaInicio: '5/10/2026, 10:00:00 p. m.', timestamp: cierre }), ['2026-10-05'], 'solo horaInicio es-CO (d/m/aaaa)');
    assert.deepEqual(dayOf({ horaInicio: '10/5/2026, 10:00:00 PM', timestamp: cierre }), ['2026-10-05'], 'horaInicio en-US (m/d/aaaa) se desambigua con el cierre');
    assert.deepEqual(dayOf({ loginTime: inicio, timestamp: cierre }, { fechaLocal: false }), ['2026-10-06'], 'original: UTC del cierre = día siguiente');
    // cierre ANTES de medianoche local pero después de las 19:00: en UTC ya es el día siguiente
    assert.deepEqual(dayOf({ timestamp: bogota(2026, 10, 5, 23, 50) }), ['2026-10-05'], 'solo timestamp: fecha local del cierre');
    assert.deepEqual(dayOf({ timestamp: bogota(2026, 10, 5, 23, 50) }, { fechaLocal: false }), ['2026-10-06'], 'original: UTC');
});

test('D5: turno de día y cambios de mes/año en hora local; la zona inyectada manda sobre la del proceso', () => {
    assert.deepEqual(dayOf({ loginTime: bogota(2026, 10, 6, 8), timestamp: bogota(2026, 10, 6, 16) }), ['2026-10-06']);
    assert.deepEqual(dayOf({ loginTime: bogota(2026, 10, 31, 22), timestamp: bogota(2026, 11, 1, 6) }), ['2026-10-31'], 'nocturno de fin de mes');
    assert.deepEqual(dayOf({ loginTime: bogota(2026, 12, 31, 22), timestamp: bogota(2027, 1, 1, 6) }), ['2026-12-31'], 'nocturno de fin de año');
    assert.deepEqual(dayOf({ loginTime: bogota(2028, 2, 29, 22), timestamp: bogota(2028, 3, 1, 6) }), ['2028-02-29'], 'nocturno del 29-feb bisiesto');
    assert.equal(S.toLocalDateKey(new Date(Date.UTC(2026, 9, 6, 3)), TZ), '2026-10-05');
    assert.equal(S.toLocalDateKey(new Date(Date.UTC(2026, 9, 6, 3)), 'UTC'), '2026-10-06');
});

test('D5: resolveOperativeDayKey: precedencia loginTime > horaInicio > cierre > ahora; textos ambiguos o inválidos', () => {
    const ctx = { nowMs: bogota(2026, 10, 6, 15), timeZone: TZ };
    const cierre = bogota(2026, 10, 7, 6);
    assert.equal(S.resolveOperativeDayKey({ loginTime: bogota(2026, 10, 6, 22), horaInicio: '1/1/2020, 8:00:00 a. m.', timestamp: cierre }, ctx), '2026-10-06');
    assert.equal(S.resolveOperativeDayKey({ loginTime: 'no-es-fecha', horaInicio: '6/10/2026, 10:00:00 p. m.', timestamp: cierre }, ctx), '2026-10-06', 'loginTime inválido: sigue con horaInicio');
    assert.equal(S.resolveOperativeDayKey({ horaInicio: '7/10/2026, 6:00:00 a. m.', timestamp: cierre }, ctx), '2026-10-07', 'mismo día que el cierre');
    assert.equal(S.resolveOperativeDayKey({ horaInicio: '1/1/2020, 8:00:00 a. m.', timestamp: cierre }, ctx), '2026-10-07', 'horaInicio incoherente con el cierre: se usa el cierre');
    assert.equal(S.resolveOperativeDayKey({ horaInicio: '31/2/2026, 8:00', timestamp: cierre }, ctx), '2026-10-07', 'fecha imposible: se usa el cierre');
    assert.equal(S.resolveOperativeDayKey({ horaInicio: '2026-10-06 22:00', timestamp: cierre }, ctx), '2026-10-06', 'aaaa-mm-dd');
    assert.equal(S.resolveOperativeDayKey({ horaInicio: '6/10/2026, 10:00:00 p. m.' }, ctx), '2026-10-06', 'sin cierre: lectura d/m (es-CO)');
    assert.equal(S.resolveOperativeDayKey({}, ctx), '2026-10-06', 'sin nada: hoy local');
    assert.equal(S.resolveOperativeDayKey({}, { nowMs: bogota(2026, 10, 6, 21), timeZone: TZ }), '2026-10-06', '"ahora" 21:00 local sigue siendo hoy');
});

test('D5: con la zona del PROCESO fijada en UTC-5 (process.env.TZ en un proceso hijo, sin timeZone inyectado) el turno nocturno no salta de día', () => {
    const modUrl = new URL('../../domain/analytics/kpi-service.js', import.meta.url).href;
    const code = `
        const S = await import(${JSON.stringify(modUrl)});
        const at = (y, mo, d, h) => Date.UTC(y, mo - 1, d, h + 5);
        const raw = { Ana: {} }, rawUtc = { Ana: {} };
        const rep = [{ rol: 'Gestor', gestor: 'Ana', tardanzaMins: 0, loginTime: at(2026, 10, 5, 22), timestamp: at(2026, 10, 6, 6) },
                     { rol: 'Gestor', gestor: 'Luis', tardanzaMins: 0, horaInicio: '5/10/2026, 10:00:00 p. m.', timestamp: at(2026, 10, 6, 6) }];
        S.mergeShiftReportsIntoOperativoData(raw, rep, { nowMs: at(2026, 10, 6, 12) });
        S.mergeShiftReportsIntoOperativoData(rawUtc, rep, { nowMs: at(2026, 10, 6, 12), fechaLocal: false });
        console.log(JSON.stringify({ offset: new Date(at(2026, 10, 6, 12)).getTimezoneOffset(), tz: process.env.TZ,
            ana: Object.keys(raw.Ana), luis: Object.keys(raw.Luis), anaUtc: Object.keys(rawUtc.Ana) }));`;
    for (const tz of ['America/Bogota', 'America/Lima']) {
        const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, TZ: tz }, encoding: 'utf8' });
        assert.equal(r.status, 0, r.stderr);
        const out = JSON.parse(r.stdout.trim());
        assert.equal(out.tz, tz);
        assert.equal(out.offset, 300, 'el proceso hijo corre en UTC-5');
        assert.deepEqual(out.ana, ['2026-10-05'], 'loginTime 22:00 local -> 5-oct');
        assert.deepEqual(out.luis, ['2026-10-05'], 'horaInicio 22:00 local -> 5-oct');
        assert.deepEqual(out.anaUtc, ['2026-10-06'], 'original (UTC del cierre) -> 6-oct');
    }
});

test('HALLAZGO: un timestamp inválido lanza RangeError y aborta el resto de reportes (igual que el original)', () => {
    const raw = { Ana: {} };
    assert.throws(() => S.mergeShiftReportsIntoOperativoData(raw, [
        { rol: 'Gestor', gestor: 'Ana', timestamp: NOW, tardanzaMins: 0 },
        { rol: 'Gestor', gestor: 'Ana', timestamp: 'no-es-fecha', tardanzaMins: 0 },
        { rol: 'Gestor', gestor: 'Luis', timestamp: NOW, tardanzaMins: 0 }
    ], { nowMs: NOW }), RangeError);
    assert.deepEqual(Object.keys(raw), ['Ana'], 'los reportes posteriores no se procesan');
});

testAsync('diferencial vs app.js 7292-7479: un timestamp inválido en medio produce el MISMO estado parcial y el mismo log de error', async () => {
    const raw = { Ana: {} };
    const reports = {
        a: { rol: 'Gestor', gestor: 'Ana', timestamp: NOW, tardanzaMins: 0 },
        b: { rol: 'Gestor', gestor: 'Ana', timestamp: 'x', tardanzaMins: 0 },
        c: { rol: 'Gestor', gestor: 'Luis', timestamp: NOW, tardanzaMins: 0 }
    };
    const esperado = await legacyMerged(clone(raw), reports, null);
    const nuevo = clone(raw);
    try { S.mergeShiftReportsIntoOperativoData(nuevo, reports, { nowMs: NOW, fechaLocal: false }); } catch (e) { /* esperado */ }
    assert.deepEqual(plain(nuevo), esperado.raw);
    assert.ok(esperado.logs.some(l => l[0] === 'error' && String(l[1]).includes('Error fetching shift_reports')));
});

// ------------------------------------------------------------------ gestores de KPIs y mapa de usuarios
const USERS = {
    u1: { email: 'Oriana@x.com', name: ' Oriana Borja ', role: 'Gestor', approved: true },
    u2: { email: 'ana@x.com', name: 'Ana Pérez', role: 'Gestor', approved: true },
    u3: { email: 'daniel@x.com', name: 'Daniel Ríos', role: 'Gestor', approved: false },
    u4: { email: 'luis@x.com', name: 'Luis Alberto', role: 'Gestor', approved: true },
    u5: { email: 'sup@x.com', name: 'Marilyn Soto', role: 'Supervisor', approved: true },
    u6: { email: 'mari@x.com', name: 'Marilyn Soto', role: 'Gestor', approved: true },
    u7: { email: 'mari2@x.com', name: 'Marilyn Soto', role: 'Gestor', approved: true },
    u8: null,
    u9: { role: 'Gestor', approved: true, name: 'Yefferson Gil' },
    u10: { email: 'josue@x.com', name: 'JOSUE ALVAREZ', role: 'Gestor', approved: true }
};

testAsync('diferencial vs app.js 5716-5775: selectKpiGestores da las mismas opciones y el mismo mapa email->nombre', async () => {
    for (const users of [USERS, { a: { email: 'a@x.com', name: 'Zoe Daniel', role: 'Gestor', approved: true } }, {}]) {
        const side = makeSide('legacy', { nowMs: NOW, users: clone(users), kpiSelectOptions: [] });
        const sel = side.dom.getElementById('kpiGestorSelect');
        await side.api.loadGestoresForKPIs();
        await new Promise(r => setTimeout(r, 0));
        const { usersByEmail, gestorNames } = S.selectKpiGestores(clone(users));
        assert.deepEqual(sel.children.map(c => c.value), gestorNames);
        if (Object.keys(users).length > 0) assert.deepEqual(side.window.kpiUsersData, usersByEmail);
        assert.equal(sel.innerHTML, '<option value="todos" selected>Todos los gestores</option><option value="">Selecciona un gestor...</option>');
    }
});

test('selectKpiGestores: solo gestores aprobados de la lista fija, sin duplicados y ordenados', () => {
    const r = S.selectKpiGestores(USERS);
    assert.deepEqual(r.gestorNames, ['JOSUE ALVAREZ', 'Luis Alberto', 'Marilyn Soto', 'Oriana Borja', 'Yefferson Gil']);
    assert.equal(r.usersByEmail['oriana@x.com'], 'Oriana Borja');
    assert.equal(Object.keys(r.usersByEmail).length, 8, 'solo usuarios con email y nombre');
});

test('HALLAZGO: un Gestor aprobado SIN nombre hace lanzar TypeError (el original lo captura y no pinta opciones)', () => {
    assert.throws(() => S.selectKpiGestores({ a: { email: 'a@x.com', role: 'Gestor', approved: true } }), TypeError);
});

test('buildKpiUsersMap: email en minúsculas -> nombre sin espacios; ignora nulos', () => {
    assert.deepEqual(S.buildKpiUsersMap({ a: { email: 'A@X.com', name: ' Ana ' }, b: null, c: { email: 'c@x.com' } }), { 'a@x.com': 'Ana' });
    assert.deepEqual(S.buildKpiUsersMap(null), {});
});

testAsync('diferencial vs app.js 7292-7330: el mapa de usuarios de loadControlOperativoData coincide con buildKpiUsersMap', async () => {
    const side = makeSide('legacy', { nowMs: NOW, raw: { Ana: {} }, users: clone(USERS), shiftReports: null });
    await side.api.loadControlOperativoData();
    assert.deepEqual(side.window.kpiUsersData, S.buildKpiUsersMap(USERS));
});

// ------------------------------------------------------------------ loadRetirosData
testAsync('loadRetirosData (app.js 5704): publica en retirosGlobalData y controlOperativoRawData; ante error deja retirosGlobalData en null', async () => {
    const logs = [];
    const logger = { log: (...a) => logs.push(['log', ...a]), warn: (...a) => logs.push(['warn', ...a]) };
    const target = {};
    await S.loadRetirosData({ fetchData: async () => ({ A: {}, B: {} }), target, logger });
    assert.deepEqual(target.retirosGlobalData, { A: {}, B: {} });
    assert.equal(target.controlOperativoRawData, target.retirosGlobalData);
    assert.deepEqual(logs[0], ['log', 'Data de retiros cargada automáticamente:', 2, 'gestores']);

    const t2 = { controlOperativoRawData: 'previo' };
    await S.loadRetirosData({ fetchData: async () => { throw new Error('x'); }, target: t2, logger });
    assert.equal(t2.retirosGlobalData, null);
    assert.equal(t2.controlOperativoRawData, 'previo', 'el original no toca controlOperativoRawData en el error');
    assert.equal(logs[1][0], 'warn');
});

testAsync('diferencial vs app.js 5704-5714: loadRetirosData original y nuevo dejan el mismo estado y logs (éxito y error)', async () => {
    for (const dataFail of [false, true]) {
        const raw = { A: { '2026-10-05': { Retiros_Aprobados: 1 } } };
        const a = makeSide('legacy', { nowMs: NOW, raw, dataFail });
        const b = makeSide('new', { nowMs: NOW, raw, dataFail });
        await a.api.loadRetirosData();
        await b.api.loadRetirosData();
        assert.deepEqual(b.window.retirosGlobalData, a.window.retirosGlobalData);
        assert.deepEqual(b.window.controlOperativoRawData, a.window.controlOperativoRawData);
        assert.deepEqual(b.logs.map(l => l[0]), a.logs.map(l => l[0]));
        assert.deepEqual(b.logs.map(l => String(l[1])), a.logs.map(l => String(l[1])));
    }
});

const r = await summarizeAsync();
if (r.failed > 0) process.exitCode = 1;
