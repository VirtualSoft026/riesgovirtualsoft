import { createRunner, assert } from '../test-harness.mjs';
import {
    LOGIN_HISTORY_EMPTY_HTML,
    buildDelayBadgeHtml,
    buildLoginHistoryRecords,
    buildLoginHistoryTableHtml,
    computeLoginDelay,
    filterLoginHistoryRecords
} from '../../domain/auth/login-history.js';
import { escapeHTML } from '../../utils/sanitization.js';

const { test, summarize } = createRunner('login-history (historial de accesos; diferencial vs app.js 8402-8628)');

const NOW = Date.UTC(2026, 9, 6, 20, 0, 0); // 6/oct/2026 15:00 en Colombia (UTC-5)

// ---------------------------------------------------------------------------------------------
// Copias LITERALES de app.js. `database`/`snap` se reducen a los valores; Date.now() -> NOW.
// ---------------------------------------------------------------------------------------------

/** app.js 8416-8512 (cuerpo del try de openLoginHistoryModal) -> arreglo ordenado. */
function legacyBuild(activeData, logData, reportsData, nowMs = NOW) {
    const allLoginHistoryRecords = [];
    const seenKeys = new Set();
    const RealDate = Date;
    // El original llama new Date() / Date.now() / new Date(x): se fija la hora actual.
    const Date_ = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(nowMs); } static now() { return nowMs; } };

    return ((Date) => {
        // 1. Current Active Sessions
        if (activeData) {
            for (let uid in activeData) {
                const s = activeData[uid];
                if (!s || !s.name) continue;
                const loginTimeStr = s.loginTime || s.startTime || (s.lastActive ? new Date(s.lastActive).toISOString() : new Date().toISOString());
                const key = `${s.name.trim().toLowerCase()}_${loginTimeStr.substring(0, 16)}`;
                seenKeys.add(key);

                let isOnline = s.lastActive ? ((Date.now() - s.lastActive) < 120000) : false;
                if (s.status === 'En Almuerzo' || s.status === 'En Desayuno' || s.status === 'En Pausa de Turno' || s.status === 'Inactivo') isOnline = false;

                allLoginHistoryRecords.push({
                    name: s.name,
                    email: s.email || '',
                    shift: s.shift || 'Mañana',
                    loginTime: loginTimeStr,
                    lastActive: s.lastActive ? new Date(s.lastActive).toLocaleString('es-CO') : 'Reciente',
                    isOnline: isOnline,
                    status: s.status || (isOnline ? 'En Línea' : 'Inactivo'),
                    source: 'En Vivo'
                });
            }
        }

        // 2. Login History Logs
        if (logData) {
            for (let id in logData) {
                const l = logData[id];
                if (!l || !l.name) continue;
                const key = `${l.name.trim().toLowerCase()}_${(l.loginTime||'').substring(0, 16)}`;
                if (seenKeys.has(key)) continue;
                seenKeys.add(key);

                allLoginHistoryRecords.push({
                    name: l.name,
                    email: l.email || '',
                    shift: l.shift || 'General',
                    loginTime: l.loginTime || l.timestamp,
                    lastActive: l.lastActive ? new Date(l.lastActive).toLocaleString('es-CO') : 'Finalizado',
                    isOnline: false,
                    status: l.status || 'Finalizado',
                    source: 'Historial'
                });
            }
        }

        // 3. Past Shift Reports (Bitácoras)
        if (reportsData) {
            for (let id in reportsData) {
                const r = reportsData[id];
                if (!r) continue;
                const gestorName = (r.gestor || r.name || r.userName || '').trim();
                if (!gestorName) continue;

                const shiftStr = r.turnoProgramado || r.shift || 'General';
                const loginTimeStr = r.horaInicio || r.loginTime || r.startTime || r.reportDate || (r.timestamp ? new Date(r.timestamp).toISOString() : '');
                const endTimeStr = r.horaFin || r.endTime || (r.timestamp ? new Date(r.timestamp).toLocaleString('es-CO') : 'Turno Finalizado');

                const key = `${gestorName.toLowerCase()}_${loginTimeStr.substring(0, 16)}`;
                if (seenKeys.has(key)) continue;
                seenKeys.add(key);

                let statusLabel = 'Turno Completado';
                if (shiftStr.toLowerCase().includes('descansa')) {
                    statusLabel = 'Ingreso en Día de Descanso';
                }

                allLoginHistoryRecords.push({
                    name: gestorName,
                    email: r.email || '',
                    shift: shiftStr,
                    loginTime: loginTimeStr,
                    lastActive: endTimeStr,
                    isOnline: false,
                    status: statusLabel,
                    source: 'Bitácora'
                });
            }
        }

        // Sort descending by loginTime
        allLoginHistoryRecords.sort((a, b) => new Date(b.loginTime || 0) - new Date(a.loginTime || 0));
        return allLoginHistoryRecords;
    })(Date_);
}

/** app.js 8522-8596 (renderLoginHistoryTable) -> html. */
function legacyRender(records) {
    const tbody = { innerHTML: '' };

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-secondary);">No se encontraron registros de accesos.</td></tr>`;
        return tbody.innerHTML;
    }

    let html = '';
    records.forEach(r => {
        const loginDateObj = r.loginTime ? new Date(r.loginTime) : null;
        const formattedLogin = loginDateObj && !isNaN(loginDateObj) ? loginDateObj.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'medium' }) : (r.loginTime || 'N/A');

        let delayBadge = '';
        if (r.shift && r.shift.toLowerCase().includes('descansa')) {
            delayBadge = `<span style="background: rgba(139,92,246,0.15); color: #8b5cf6; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">Descanso</span>`;
        } else if (loginDateObj && !isNaN(loginDateObj) && r.shift) {
            const shiftStr = r.shift.toLowerCase().trim();
            const match = shiftStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
            if (match) {
                let hour = parseInt(match[1], 10);
                let minute = match[2] ? parseInt(match[2], 10) : 0;
                const ampm = match[3].toLowerCase();
                if (ampm === 'pm' && hour < 12) hour += 12;
                if (ampm === 'am' && hour === 12) hour = 0;

                const expected = new Date(loginDateObj);
                expected.setHours(hour, minute, 0, 0);
                let diffMin = (loginDateObj - expected) / (1000 * 60);

                if (diffMin < -12 * 60) {
                    expected.setDate(expected.getDate() - 1);
                    diffMin = (loginDateObj - expected) / (1000 * 60);
                } else if (diffMin > 12 * 60) {
                    expected.setDate(expected.getDate() + 1);
                    diffMin = (loginDateObj - expected) / (1000 * 60);
                }

                if (diffMin <= 5) {
                    delayBadge = `<span style="background: rgba(16,185,129,0.15); color: var(--success); padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">A tiempo</span>`;
                } else if (diffMin > 240) {
                    delayBadge = `<span style="background: rgba(139,92,246,0.15); color: #8b5cf6; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">Fuera de Horario</span>`;
                } else {
                    const tardanza = Math.round(diffMin);
                    delayBadge = `<span style="background: rgba(239,68,68,0.15); color: var(--danger); padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">+${tardanza}m Tarde</span>`;
                }
            }
        }

        let statusBadge = `<span style="background: rgba(59,130,246,0.15); color: var(--accent-primary); padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">${escapeHTML(r.status)}</span>`;
        if (r.isOnline) {
            statusBadge = `<span style="background: rgba(16,185,129,0.15); color: var(--success); padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;"><i class='bx bx-radio-circle-marked'></i> En Línea</span>`;
        } else if (r.status === 'Ingreso en Día de Descanso') {
            statusBadge = `<span style="background: rgba(139,92,246,0.15); color: #8b5cf6; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">Ingreso en Descanso</span>`;
        }

        html += `
            <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                <td style="padding: 12px 16px; font-weight: 600; color: var(--text-primary);">
                    ${escapeHTML(r.name)}
                    ${r.email ? `<div style="font-size: 11px; color: var(--text-secondary); font-weight: 400;">${escapeHTML(r.email)}</div>` : ''}
                </td>
                <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 13px;">${escapeHTML(r.shift)}</td>
                <td style="padding: 12px 16px; color: var(--text-primary); font-size: 13px; font-weight: 500;">
                    ${formattedLogin} ${delayBadge}
                </td>
                <td style="padding: 12px 16px;">${statusBadge}</td>
                <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 12px;">${escapeHTML(r.lastActive)}</td>
            </tr>
        `;
    });

    return html;
}

/** app.js 8598-8627 (filterLoginHistoryTable) -> registros filtrados. `now` y los valores de los controles entran como parámetro. */
function legacyFilter(allLoginHistoryRecords, queryRaw, dateValRaw, nowDate) {
    const query = queryRaw === null ? '' : queryRaw.toLowerCase().trim();
    const dateVal = dateValRaw === null ? 'todos' : dateValRaw;

    const now = nowDate;
    const todayStr = now.toISOString().substring(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    const filtered = allLoginHistoryRecords.filter(r => {
        if (query && !r.name.toLowerCase().includes(query) && !(r.email && r.email.toLowerCase().includes(query))) {
            return false;
        }

        if (dateVal !== 'todos' && r.loginTime) {
            const rDate = new Date(r.loginTime);
            const rDateStr = rDate.toISOString().substring(0, 10);
            if (dateVal === 'hoy' && rDateStr !== todayStr) return false;
            if (dateVal === '7d' && rDate < sevenDaysAgo) return false;
            if (dateVal === '30d' && rDate < thirtyDaysAgo) return false;
        }

        return true;
    });
    return filtered;
}

function makeRng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

const EVIL_TIME = '<img src=x onerror=alert(1)>';

function fixtures() {
    const iso = (d) => new Date(d).toISOString();
    const active = {
        u1: { name: 'Ana Gómez', email: 'ana@virtualsoft.tech', shift: '8am - 4pm', loginTime: iso(NOW - 3 * 3600000), lastActive: NOW - 30000, status: 'En Línea' },
        u2: { name: 'Luis', shift: '6am - 2pm', loginTime: iso(NOW - 2 * 3600000), lastActive: NOW - 60000, status: 'En Almuerzo' },
        u3: { name: 'Inactivo Viejo', lastActive: NOW - 10 * 60000 },
        u4: { name: 'Sin latido' },
        u5: null,
        u6: { email: 'sin-nombre@virtualsoft.tech' },
        u7: { name: 'Pausa Turno', shift: '2pm - 10pm', loginTime: iso(NOW - 3600000), lastActive: NOW - 1000, status: 'En Pausa de Turno' }
    };
    const logs = {
        l1: { name: 'ana gómez', email: 'ana@virtualsoft.tech', shift: '8am - 4pm', loginTime: iso(NOW - 3 * 3600000) }, // duplicado de la sesión en vivo: se descarta
        l2: { name: 'Beto', loginTime: iso(NOW - 26 * 3600000), shift: '10pm - 6am', lastActive: NOW - 20 * 3600000, status: 'Cerrado' },
        l3: { name: 'Malicioso', shift: '8am - 4pm', loginTime: EVIL_TIME, email: '<b>x</b>', status: '<script>alert(2)</script>' },
        l4: { name: 'Sin fecha' },
        l5: { name: 'Con timestamp', timestamp: iso(NOW - 40 * 24 * 3600000) }
    };
    const reports = {
        r1: { gestor: 'Carla', turnoProgramado: 'Descansa', horaInicio: iso(NOW - 5 * 24 * 3600000), horaFin: 'fin', email: 'c@v.tech' },
        r2: { name: 'Dani', shift: '8am - 4pm', loginTime: iso(NOW - 6 * 24 * 3600000 + 3 * 60000), timestamp: NOW - 6 * 24 * 3600000 + 8 * 3600000 },
        r3: { userName: 'Eva', startTime: iso(NOW - 8 * 24 * 3600000), reportDate: 'x' },
        r4: { gestor: '   ' },
        r5: null,
        r6: { gestor: 'Fabi', shift: '7:30am - 3:30pm', reportDate: '2026-09-20T13:00:00.000Z' },
        r7: { gestor: 'Gus', timestamp: NOW - 2 * 24 * 3600000 },
        r8: { gestor: 'Hugo' }
    };
    return { active, logs, reports };
}

test('diferencial: la unión de las tres fuentes (en vivo, historial, bitácoras) es idéntica a app.js (fijo)', () => {
    const { active, logs, reports } = fixtures();
    const got = buildLoginHistoryRecords({ activeSessions: active, loginLogs: logs, shiftReports: reports }, NOW);
    assert.deepEqual(got, legacyBuild(active, logs, reports));
    assert.ok(!got.some((r) => r.source === 'Historial' && r.name === 'ana gómez'), 'el duplicado se descarta');
    assert.equal(got.filter((r) => r.source === 'En Vivo').length, 5);
});

test('diferencial: las fuentes nulas (nodo inexistente) dan lista vacía; el orden es por loginTime descendente', () => {
    assert.deepEqual(buildLoginHistoryRecords({ activeSessions: null, loginLogs: null, shiftReports: null }, NOW), []);
    assert.deepEqual(legacyBuild(null, null, null), []);
    const { active, logs, reports } = fixtures();
    const got = buildLoginHistoryRecords({ activeSessions: active, loginLogs: logs, shiftReports: reports }, NOW);
    const valid = got.filter((r) => !isNaN(new Date(r.loginTime || 0)));
    for (let i = 1; i < valid.length; i += 1) {
        assert.ok(new Date(valid[i - 1].loginTime || 0) >= new Date(valid[i].loginTime || 0));
    }
});

test('"En Línea": latido de menos de 2 min Y estado distinto de Almuerzo/Desayuno/Pausa de Turno/Inactivo', () => {
    const mk = (extra) => buildLoginHistoryRecords({ activeSessions: { u: { name: 'N', loginTime: '2026-10-06T10:00:00.000Z', ...extra } } }, NOW)[0];
    assert.equal(mk({ lastActive: NOW - 119999 }).isOnline, true);
    assert.equal(mk({ lastActive: NOW - 120000 }).isOnline, false);
    assert.equal(mk({}).isOnline, false);
    for (const status of ['En Almuerzo', 'En Desayuno', 'En Pausa de Turno', 'Inactivo']) assert.equal(mk({ lastActive: NOW - 1000, status }).isOnline, false, status);
    assert.equal(mk({ lastActive: NOW - 1000, status: 'En Línea' }).isOnline, true);
    assert.equal(mk({ lastActive: NOW - 1000 }).status, 'En Línea');
    assert.equal(mk({}).status, 'Inactivo');
});

test('sin Date.now() implícito: la hora actual solo entra por parámetro', () => {
    const rec = (now) => buildLoginHistoryRecords({ activeSessions: { u: { name: 'N' } } }, now)[0];
    assert.equal(rec(Date.UTC(2026, 0, 1)).loginTime, '2026-01-01T00:00:00.000Z');
    assert.equal(rec(Date.UTC(2026, 5, 1)).loginTime, '2026-06-01T00:00:00.000Z');
});

test('diferencial aleatorio: 300 conjuntos de las tres fuentes (con semilla), incluidos los que hacen lanzar al original', () => {
    const rng = makeRng(2024);
    const pick = (a) => a[Math.floor(rng() * a.length)];
    const names = ['Ana', 'ana', 'Beto', 'Eva ', '', undefined];
    const times = [undefined, '2026-10-05T08:00:00.000Z', '2026-10-05T08:00:30.000Z', '2026-10-06T13:00:00.000Z', '2026-09-01T13:00:00.000Z', 'rota'];
    const shifts = [undefined, '8am - 4pm', 'Descansa', '6:30am - 2pm', '10pm - 6am', 'Tarde'];
    for (let i = 0; i < 300; i += 1) {
        const mkNode = (kind) => {
            const n = Math.floor(rng() * 4);
            const out = {};
            for (let j = 0; j < n; j += 1) {
                const o = {};
                const nm = pick(names); if (nm !== undefined) { o[kind === 'r' ? 'gestor' : 'name'] = nm; }
                const t = pick(times); if (t !== undefined) { o[kind === 'r' ? 'horaInicio' : 'loginTime'] = t; }
                const sh = pick(shifts); if (sh !== undefined) { o[kind === 'r' ? 'turnoProgramado' : 'shift'] = sh; }
                if (rng() < 0.4) o.lastActive = NOW - Math.floor(rng() * 300000);
                if (rng() < 0.3) o.status = pick(['En Línea', 'En Almuerzo', 'Inactivo', 'X']);
                out[`k${j}`] = o;
            }
            return Object.keys(out).length ? out : null;
        };
        const a = mkNode('a'); const l = mkNode('l'); const r = mkNode('r');
        const outcome = (fn) => { try { return { ok: fn() }; } catch (e) { return { err: e.constructor.name }; } };
        const expected = outcome(() => legacyBuild(a, l, r));
        const actual = outcome(() => buildLoginHistoryRecords({ activeSessions: a, loginLogs: l, shiftReports: r }, NOW));
        assert.deepEqual(actual, expected);
    }
});

test('diferencial (escapeRawLoginTime: false explícito = plantilla original): la tabla (HTML) es idéntica byte a byte a app.js: vacía, fija y 200 aleatorias', () => {
    const LEGACY = { escapeRawLoginTime: false };
    const { active, logs, reports } = fixtures();
    const records = buildLoginHistoryRecords({ activeSessions: active, loginLogs: logs, shiftReports: reports }, NOW);
    assert.equal(buildLoginHistoryTableHtml(records, LEGACY), legacyRender(records));
    assert.equal(buildLoginHistoryTableHtml([], LEGACY), legacyRender([]));
    assert.equal(buildLoginHistoryTableHtml([]), LOGIN_HISTORY_EMPTY_HTML);

    const rng = makeRng(808);
    const pick = (a) => a[Math.floor(rng() * a.length)];
    for (let i = 0; i < 200; i += 1) {
        const recs = [];
        for (let j = 0, n = 1 + Math.floor(rng() * 4); j < n; j += 1) {
            const day = 1 + Math.floor(rng() * 28);
            const h = Math.floor(rng() * 24); const m = Math.floor(rng() * 60);
            recs.push({
                name: pick(['Ana', '<b>x</b>']), email: pick(['', 'a@v.tech', '"q"']),
                shift: pick(['8am - 4pm', '12pm - 8pm', '12am - 8am', '6:30am - 2pm', '10pm - 6am', 'Descansa', 'DESCANSA hoy', 'Tarde', '', 'x']),
                loginTime: pick([`2026-10-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`, 'rota', undefined, '']),
                lastActive: pick(['Reciente', 'Finalizado', '1/1/2026']),
                isOnline: rng() < 0.2,
                status: pick(['En Línea', 'Ingreso en Día de Descanso', 'Finalizado', '<i>']),
                source: 'En Vivo'
            });
        }
        assert.equal(buildLoginHistoryTableHtml(recs, LEGACY), legacyRender(recs));
        // D2: con el predeterminado solo cambia la celda de un loginTime inválido; aquí ('rota', '') no lleva
        // caracteres especiales, así que el HTML coincide también
        assert.equal(buildLoginHistoryTableHtml(recs), legacyRender(recs));
    }
});

test('puntualidad: A tiempo (<=5 min), tarde (+Nm), fuera de horario (>4 h), turno que cruza la medianoche y descanso', () => {
    // Los casos se construyen con hora LOCAL para no depender de la zona horaria de quien corre la prueba
    const at = (h, m) => new Date(2026, 9, 6, h, m, 0, 0).toISOString();
    assert.deepEqual(computeLoginDelay('8am - 4pm', at(8, 5)), { kind: 'on_time' });
    assert.deepEqual(computeLoginDelay('8am - 4pm', at(7, 30)), { kind: 'on_time' });
    assert.deepEqual(computeLoginDelay('8am - 4pm', at(8, 6)), { kind: 'late', minutes: 6 });
    assert.deepEqual(computeLoginDelay('8am - 4pm', at(11, 59)), { kind: 'late', minutes: 239 });
    assert.deepEqual(computeLoginDelay('8am - 4pm', at(12, 1)), { kind: 'off_hours' });
    assert.deepEqual(computeLoginDelay('10pm - 6am', at(22, 10)), { kind: 'late', minutes: 10 });
    assert.deepEqual(computeLoginDelay('12am - 8am', at(0, 3)), { kind: 'on_time' });
    assert.deepEqual(computeLoginDelay('12pm - 8pm', at(12, 20)), { kind: 'late', minutes: 20 });
    assert.deepEqual(computeLoginDelay('6:30am - 2pm', at(6, 45)), { kind: 'late', minutes: 15 });
    assert.deepEqual(computeLoginDelay('Descansa', at(9, 0)), { kind: 'rest' });
    assert.equal(computeLoginDelay('Tarde', at(9, 0)), null);
    assert.equal(computeLoginDelay('8am - 4pm', 'rota'), null);
    assert.equal(computeLoginDelay(undefined, at(9, 0)), null);
    assert.equal(buildDelayBadgeHtml(null), '');
    assert.ok(buildDelayBadgeHtml({ kind: 'late', minutes: 12 }).includes('+12m Tarde'));
});

test('diferencial: filtros por texto y fecha idénticos a app.js (todos los valores de fecha; consultas por nombre y correo)', () => {
    const { active, logs, reports } = fixtures();
    const records = buildLoginHistoryRecords({ activeSessions: active, loginLogs: logs, shiftReports: reports }, NOW)
        .filter((r) => !isNaN(new Date(r.loginTime || 0))); // el original lanza con fechas inválidas: se cubre aparte
    const now = new Date(NOW);
    for (const query of ['', 'ana', 'ANA ', 'virtualsoft', 'zzz', 'c@v']) {
        for (const dateVal of ['todos', 'hoy', '7d', '30d', 'otro']) {
            assert.deepEqual(
                filterLoginHistoryRecords(records, { query: query.toLowerCase().trim(), dateVal }, now),
                legacyFilter(records, query, dateVal, now),
                `${query}|${dateVal}`
            );
        }
    }
    assert.deepEqual(filterLoginHistoryRecords(records, undefined, now), records);
});

test('diferencial aleatorio: filtro con 300 listas y fechas de referencia distintas', () => {
    const rng = makeRng(4242);
    for (let i = 0; i < 300; i += 1) {
        const now = new Date(Date.UTC(2026, 9, 1 + Math.floor(rng() * 28), Math.floor(rng() * 24), Math.floor(rng() * 60)));
        const recs = [];
        for (let j = 0, n = Math.floor(rng() * 8); j < n; j += 1) {
            recs.push({
                name: ['Ana', 'Beto', 'Eva'][Math.floor(rng() * 3)],
                email: ['', 'a@v.tech', 'b@v.tech'][Math.floor(rng() * 3)],
                loginTime: rng() < 0.15 ? undefined : new Date(now.getTime() - Math.floor(rng() * 40 * 86400000)).toISOString()
            });
        }
        const query = ['', 'ana', 'b@'][Math.floor(rng() * 3)];
        const dateVal = ['todos', 'hoy', '7d', '30d'][Math.floor(rng() * 4)];
        assert.deepEqual(filterLoginHistoryRecords(recs, { query, dateVal }, now), legacyFilter(recs, query, dateVal, now));
    }
});

test('HALLAZGO: "Hoy" compara el día UTC, no el local (a las 19:00-23:59 de Colombia el registro de hoy ya no es "hoy")', () => {
    const nowLocal2030 = new Date(Date.UTC(2026, 9, 7, 1, 30)); // 6/oct 20:30 Colombia = 7/oct 01:30 UTC
    const recMorning = { name: 'A', loginTime: new Date(Date.UTC(2026, 9, 6, 13, 0)).toISOString() }; // 6/oct 08:00 Colombia
    assert.equal(filterLoginHistoryRecords([recMorning], { dateVal: 'hoy' }, nowLocal2030).length, 0, 'se excluye aunque sea el mismo día local');
    assert.equal(legacyFilter([recMorning], '', 'hoy', nowLocal2030).length, 0, 'igual que app.js');
});

test('HALLAZGO: una fecha inválida hace lanzar al filtro por fecha (RangeError, igual que app.js); con tolerateInvalidDates se excluye', () => {
    const recs = [{ name: 'A', loginTime: 'rota' }, { name: 'B', loginTime: '2026-10-06T12:00:00.000Z' }];
    const now = new Date(NOW);
    assert.throws(() => filterLoginHistoryRecords(recs, { dateVal: '7d' }, now), RangeError);
    assert.throws(() => legacyFilter(recs, '', '7d', now), RangeError);
    assert.deepEqual(filterLoginHistoryRecords(recs, { dateVal: '7d' }, now, { tolerateInvalidDates: true }).map((r) => r.name), ['B']);
    assert.equal(filterLoginHistoryRecords(recs, { dateVal: 'todos' }, now).length, 2, 'sin filtro de fecha no se evalúa');
});

test('XSS: nombre, correo, turno, estado y última actividad se escapan; D2: el loginTime inválido se escapa POR DEFECTO; el original solo con escapeRawLoginTime: false', () => {
    const rec = { name: '<script>alert(1)</script>', email: '"><svg onload=alert(2)>', shift: '<img src=x onerror=alert(3)>', loginTime: EVIL_TIME, lastActive: 'javascript:alert(4)<b>', isOnline: false, status: '<script>alert(5)</script>' };
    const legacy = buildLoginHistoryTableHtml([rec], { escapeRawLoginTime: false });
    assert.ok(!legacy.includes('<script') && !legacy.includes('<svg'));
    assert.ok(!legacy.includes('<img src=x onerror=alert(3)>'), 'el turno sí se escapa');
    assert.ok(legacy.includes(EVIL_TIME), 'HALLAZGO (solo con la opción legada): loginTime inválido sin escapar');
    assert.equal(legacy, legacyRender([rec]));
    for (const safe of [buildLoginHistoryTableHtml([rec]), buildLoginHistoryTableHtml([rec], {}), buildLoginHistoryTableHtml([rec], { escapeRawLoginTime: true })]) {
        assert.ok(!safe.includes('<img') && !safe.includes('<script') && !safe.includes('<svg'), 'ninguna etiqueta de usuario');
        assert.ok(safe.includes('&lt;img src=x onerror=alert(1)&gt;'));
    }
    // un loginTime válido no cambia con la decisión
    const ok = { ...rec, loginTime: '2026-10-06T13:00:00.000Z' };
    assert.equal(buildLoginHistoryTableHtml([ok]), buildLoginHistoryTableHtml([ok], { escapeRawLoginTime: false }));
});

test('D2: loginTime inválido con <script>, comillas simples/dobles o entidades queda como texto (escapeHTML de app.js o de utils)', () => {
    const cases = [
        ['<script>alert(1)</script>', '&lt;script&gt;alert(1)&lt;/script&gt;'],
        [`" onmouseover="alert(1)`, '&quot; onmouseover=&quot;alert(1)'],
        [`'><img src=x onerror=alert(1)>`, '&#039;&gt;&lt;img src=x onerror=alert(1)&gt;'],
        ['&lt;b&gt;', '&amp;lt;b&amp;gt;']
    ];
    for (const [loginTime, expected] of cases) {
        const html = buildLoginHistoryTableHtml([{ name: 'Mal', loginTime, status: 'Finalizado', lastActive: 'x' }]);
        assert.ok(html.includes(expected), loginTime);
        assert.ok(!html.includes(loginTime), `el valor crudo no aparece: ${loginTime}`);
    }
    // el escape inyectado (el de app.js en el laboratorio) también se usa para esta celda
    const calls = [];
    buildLoginHistoryTableHtml([{ name: 'n', loginTime: '<x>', status: 's', lastActive: 'l' }], { escapeHTML: (v) => { calls.push(v); return 'E'; } });
    assert.ok(calls.includes('<x>'));
});

summarize();
