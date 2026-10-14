import { createRunner, assert } from '../test-harness.mjs';
import {
    BITACORA_MARKER,
    extractBitacoraLines,
    getDefaultWindowStartMs,
    toLocalDateKey,
    filterShiftReports,
    buildShiftReportsEmptyMessage,
    buildShiftReportsFooterMessage,
    collectGestorOptions,
    buildShiftReportPdfFileName,
    buildPdfOptions,
    parseShiftReportTime,
    computeReportEffectiveMinutes
} from '../../domain/shifts/shift-report-view.js';
import { calculateShiftClosureTimes } from '../../domain/shifts/shift-calculator.js';

const { test, summarize } = createRunner('shift-report-view (filtros, bitácora, PDF y tiempo efectivo del panel de reportes)');

// Generador pseudoaleatorio con semilla (mulberry32): pruebas reproducibles.
function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Copia LITERAL de app.js 723-726 (normalizeName). */
function normalizeName(name) {
    if (!name) return "";
    return name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/**
 * Copia LITERAL de app.js 4617-4690 (applyShiftReportsFilters: filtros y orden), con las entradas como
 * parámetros (`allShiftReports`, `selectedGestores`, `fechaQuery`, `now`) en lugar de leerlas del DOM / `new Date()`.
 */
function legacyFilter(allShiftReports, selectedGestores, fechaQuery, now) {
    let filtered = [...allShiftReports];

    const hasExplicitFilter = selectedGestores.length > 0 || fechaQuery;

    // Filter by Gestor name
    if (selectedGestores.length > 0) {
        filtered = filtered.filter(r => selectedGestores.some(g => normalizeName(r.gestor) === normalizeName(g)));
    }

    // Filter by Date (comparing local YYYY-MM-DD format)
    if (fechaQuery) {
        filtered = filtered.filter(r => {
            if (r.timestamp) {
                const d = new Date(r.timestamp);
                const localYear = d.getFullYear();
                const localMonth = String(d.getMonth() + 1).padStart(2, '0');
                const localDay = String(d.getDate()).padStart(2, '0');
                const localDateStr = `${localYear}-${localMonth}-${localDay}`;
                if (localDateStr === fechaQuery) return true;
            }
            if (r.horaInicio && r.horaInicio.includes(fechaQuery)) return true;
            if (r.horaFin && r.horaFin.includes(fechaQuery)) return true;
            return false;
        });
    } else if (!hasExplicitFilter) {
        // Si no hay filtro de fecha ni gestor, limitar por defecto a los últimos 2 días para máxima velocidad
        const twoDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0).getTime(); // inicio de ayer
        filtered = filtered.filter(r => {
            const reportTime = r.timestamp || (r.horaInicio ? new Date(r.horaInicio).getTime() : 0);
            return reportTime >= twoDaysAgo;
        });
    }

    // Sort descending by timestamp
    filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return { filtered, hasExplicitFilter: Boolean(hasExplicitFilter) };
}

/** Copia LITERAL de app.js 4461-4474 (exportShiftReport: bitácora del PDF) — misma lógica que 4659-4678 y 4747-4758. */
function legacyBitacoraLines(reportObj) {
    let bitacoraLines = [];
    const rawReporte = reportObj.reporte || '';
    if (rawReporte.includes('=== BITÁCORA DE TIEMPOS ===')) {
        const parts = rawReporte.split('=== BITÁCORA DE TIEMPOS ===');
        const rawBitacora = (parts[1] || '').trim();
        if (rawBitacora) {
            const lines = rawBitacora.split('\n').map(l => l.trim()).filter(Boolean);
            lines.forEach(l => {
                if (!bitacoraLines.includes(l)) bitacoraLines.push(l);
            });
        }
    }
    return bitacoraLines;
}

/** Copia LITERAL de app.js 5899-5949 (calcularIndicadores: tiempo efectivo por reporte), devolviendo el valor sumado en lugar de acumularlo. */
function legacyPanelEffectiveMinutes(report, nowMs) {
    if (report.horaInicio && report.horaFin) {
        const baseMs = report.timestamp || report.loginTime || nowMs;

        const parseTime = (timeStr, baseDateMs) => {
            if (typeof timeStr === 'string') {
                timeStr = timeStr.replace(/a\.\s*m\./i, 'AM').replace(/p\.\s*m\./i, 'PM');
            }
            let d = new Date(timeStr);
            if (!isNaN(d.getTime())) return d.getTime();

            if (typeof timeStr === 'string' && timeStr.includes(':')) {
                const parts = timeStr.match(/(\d+):(\d+)/);
                if (parts) {
                    const base = new Date(baseDateMs);
                    let hours = parseInt(parts[1], 10);
                    if (timeStr.toUpperCase().includes('PM') && hours < 12) hours += 12;
                    if (timeStr.toUpperCase().includes('AM') && hours === 12) hours = 0;
                    base.setHours(hours, parseInt(parts[2], 10), 0, 0);
                    return base.getTime();
                }
            }
            return NaN;
        };

        const startMs = parseTime(report.horaInicio, baseMs);
        const endMs = parseTime(report.horaFin, baseMs);

        if (!isNaN(startMs) && !isNaN(endMs)) {
            let diffMins = (endMs - startMs) / 60000;
            if (diffMins < 0) diffMins += 1440; // Cruzó la medianoche

            if (diffMins > 0 && diffMins <= 1440) {
                let almuerzo = report.tiempoAlmuerzoMins || 0;
                let desayuno = report.tiempoDesayunoMins || 0;
                let pausaTurno = report.tiempoPausaTurnoMins || 0;
                let tiempoEfectivo = diffMins - almuerzo - desayuno - pausaTurno;
                if (tiempoEfectivo < 0) tiempoEfectivo = 0;

                return tiempoEfectivo; // (original: totalMinutosConectados += tiempoEfectivo; turnosValidosParaTiempo++)
            }
        }
    }
    return null;
}

const NOW = new Date(2026, 9, 6, 15, 30, 0); // 6/oct/2026 15:30 local
const DAY = 86400000;
const NAMES = ['Ana Pérez', 'Luis Fuentes', 'María Sánchez', 'Óscar Díaz', 'Sara Santamaría'];

function randomReports(seed, n) {
    const r = rng(seed);
    const out = [];
    for (let i = 0; i < n; i++) {
        const ts = r() < 0.12 ? undefined : NOW.getTime() - Math.floor(r() * 6 * DAY);
        const d = new Date(ts || NOW.getTime() - Math.floor(r() * 6 * DAY));
        const rep = { fb_id: 'k' + i, gestor: NAMES[Math.floor(r() * NAMES.length)] };
        if (ts !== undefined) rep.timestamp = ts;
        if (r() < 0.85) rep.horaInicio = d.toLocaleString('en-US'); // contiene M/D/YYYY, no YYYY-MM-DD
        if (r() < 0.7) rep.horaFin = r() < 0.5 ? d.toLocaleString('en-US') : `${toLocalDateKey(d)} 17:00`;
        if (r() < 0.1) rep.gestor = undefined;
        out.push(rep);
    }
    return out;
}

test('diferencial vs app.js: filtrar por gestor/fecha/ventana por defecto da las mismas filas en el mismo orden (400 casos con semilla)', () => {
    const r = rng(2026);
    let compared = 0;
    for (let seed = 1; seed <= 40; seed++) {
        const reports = randomReports(seed, 30);
        for (let k = 0; k < 10; k++) {
            const sel = [];
            if (r() < 0.4) sel.push(NAMES[Math.floor(r() * NAMES.length)].toUpperCase());
            if (r() < 0.15) sel.push('osCar diaz');
            let fecha = '';
            if (r() < 0.4) fecha = toLocalDateKey(NOW.getTime() - Math.floor(r() * 6) * DAY);
            const a = legacyFilter(reports, sel, fecha, NOW);
            const b = filterShiftReports(reports, { selectedGestores: sel, fechaQuery: fecha, now: NOW });
            assert.deepEqual(b.rows.map((x) => x.fb_id), a.filtered.map((x) => x.fb_id), `seed ${seed} k ${k}`);
            assert.equal(b.hasExplicitFilter, a.hasExplicitFilter);
            compared++;
        }
    }
    assert.equal(compared, 400);
});

test('ventana por defecto: desde las 00:00 de AYER (hora local); incluye ayer y hoy, excluye antier', () => {
    const start = getDefaultWindowStartMs(NOW);
    assert.equal(start, new Date(2026, 9, 5, 0, 0, 0).getTime());
    const rows = [
        { fb_id: 'hoy', timestamp: NOW.getTime() },
        { fb_id: 'ayer-00-00', timestamp: new Date(2026, 9, 5, 0, 0, 0).getTime() },
        { fb_id: 'antier-23-59', timestamp: new Date(2026, 9, 4, 23, 59, 59).getTime() },
        { fb_id: 'sin-datos' }
    ];
    assert.deepEqual(filterShiftReports(rows, { now: NOW }).rows.map((x) => x.fb_id), ['hoy', 'ayer-00-00']);
});

test('filtro de fecha: coincide por la fecha LOCAL del timestamp o porque horaInicio/horaFin contienen el texto', () => {
    const reports = [
        { fb_id: 'a', timestamp: new Date(2026, 9, 3, 23, 30).getTime() },
        { fb_id: 'b', horaInicio: '2026-10-03 08:00' },
        { fb_id: 'c', horaFin: 'fin 2026-10-03' },
        { fb_id: 'd', timestamp: new Date(2026, 9, 4, 0, 5).getTime() }
    ];
    assert.deepEqual(filterShiftReports(reports, { fechaQuery: '2026-10-03', now: NOW }).rows.map((x) => x.fb_id), ['a', 'b', 'c']);
    assert.equal(toLocalDateKey(new Date(2026, 0, 5, 12).getTime()), '2026-01-05');
});

test('filtro de gestor: sin tildes ni mayúsculas; con filtro explícito no se aplica la ventana de 2 días; orden descendente', () => {
    const reports = [
        { fb_id: '1', gestor: 'María Sánchez', timestamp: 1000 },
        { fb_id: '2', gestor: 'maria sanchez', timestamp: 3000 },
        { fb_id: '3', gestor: 'Otro', timestamp: 2000 },
        { fb_id: '4', gestor: 'MARÍA SÁNCHEZ' }
    ];
    const { rows, hasExplicitFilter } = filterShiftReports(reports, { selectedGestores: ['Maria Sanchez'], now: NOW });
    assert.deepEqual(rows.map((x) => x.fb_id), ['2', '1', '4']);
    assert.equal(hasExplicitFilter, true);
    assert.equal(filterShiftReports(reports, { now: NOW }).hasExplicitFilter, false);
    // no muta la entrada
    assert.deepEqual(reports.map((x) => x.fb_id), ['1', '2', '3', '4']);
});

test('mensajes: vacío con/sin filtros y pie informativo (textos idénticos al original, incluida la palabra "complete")', () => {
    assert.equal(buildShiftReportsEmptyMessage(true), 'No hay historial de turnos registrados con los filtros seleccionados.');
    assert.equal(buildShiftReportsEmptyMessage(false), 'No hay turnos registrados en los últimos 2 días. Selecciona una fecha o escribe un gestor para consultar turnos anteriores.');
    assert.equal(buildShiftReportsFooterMessage(7), 'Mostrando turnos de los últimos 2 días (7 turnos). Selecciona una fecha o escribe un gestor para consultar el historial antiguo complete.');
});

test('opciones del multiselect: gestores únicos recortados y ordenados (app.js 4602-4607)', () => {
    assert.deepEqual(collectGestorOptions([{ gestor: ' Zoe ' }, { gestor: 'Ana' }, { gestor: 'Zoe' }, {}, { gestor: '' }]), ['Ana', 'Zoe']);
});

test('diferencial vs app.js: líneas de bitácora (recortadas, sin vacías, sin repetidas) en 200 textos con semilla', () => {
    const r = rng(7);
    const pieces = ['Almuerzo 12:00 - 12:30', '  Desayuno 09:00 - 09:10  ', '', 'Inactividad 10:00 - 10:05', '\r', 'Almuerzo 12:00 - 12:30'];
    for (let i = 0; i < 200; i++) {
        let body = '';
        const n = Math.floor(r() * 8);
        for (let k = 0; k < n; k++) body += pieces[Math.floor(r() * pieces.length)] + '\n';
        const variants = [
            'Resumen\n' + BITACORA_MARKER + '\n' + body,
            BITACORA_MARKER,
            'sin marcador\n' + body,
            undefined,
            null,
            '=== BITÁCORA DE TIEMPOS ===\n' + body + '=== BITÁCORA DE TIEMPOS ===\notro'
        ];
        for (const reporte of variants) {
            assert.deepEqual(extractBitacoraLines(reporte), legacyBitacoraLines({ reporte }), JSON.stringify(reporte));
        }
    }
});

test('nombre de archivo y opciones del PDF (app.js 4543-4554)', () => {
    const rep = { gestor: 'María Sánchez', timestamp: new Date(2026, 9, 6, 10).getTime() };
    const dateStr = new Date(rep.timestamp).toLocaleDateString('es-CO').replace(/[^a-z0-9]/gi, '_');
    assert.equal(buildShiftReportPdfFileName(rep), `Reporte_Turno_mar_a_s_nchez_${dateStr}.pdf`);
    assert.equal(buildShiftReportPdfFileName({}), 'Reporte_Turno_gestor_fecha.pdf');
    assert.deepEqual(buildPdfOptions('x.pdf'), {
        margin: 10, filename: 'x.pdf', image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    });
});

// ---------------------------------------------------------------- tiempo efectivo del panel de reportes
function randomPanelReport(r, base) {
    const fmt = (ms) => new Date(ms).toLocaleString('es-CO');
    const start = base - Math.floor(r() * 3 * 3600000) - 5 * 3600000;
    const dur = Math.floor(r() * 12 * 3600000) + 600000;
    const kinds = Math.floor(r() * 5);
    const rep = { timestamp: base };
    if (kinds === 0) { rep.horaInicio = fmt(start); rep.horaFin = fmt(start + dur); }
    else if (kinds === 1) { rep.horaInicio = new Date(start).toISOString(); rep.horaFin = new Date(start + dur).toISOString(); }
    else if (kinds === 2) { rep.horaInicio = '08:00 a. m.'; rep.horaFin = '05:30 p. m.'; }
    else if (kinds === 3) { rep.horaInicio = '10:00 PM'; rep.horaFin = '06:00 AM'; } // cruza medianoche
    else { rep.horaInicio = 'texto raro'; rep.horaFin = fmt(start); }
    if (r() < 0.8) rep.tiempoAlmuerzoMins = Math.round(r() * 90);
    if (r() < 0.6) rep.tiempoDesayunoMins = Math.round(r() * 30);
    if (r() < 0.5) rep.tiempoPausaTurnoMins = Math.round(r() * 240);
    if (r() < 0.5) rep.penalidadConectividadMins = Math.round(r() * 60 * 10) / 10;
    if (r() < 0.1) delete rep.horaFin;
    return rep;
}

test('diferencial vs app.js: tiempo efectivo del panel ORIGINAL ({ legacy: true }) en 600 reportes con semilla', () => {
    const r = rng(99);
    let validos = 0;
    for (let i = 0; i < 600; i++) {
        const rep = randomPanelReport(r, NOW.getTime() - Math.floor(r() * 5 * DAY));
        const a = legacyPanelEffectiveMinutes(rep, NOW.getTime());
        const b = computeReportEffectiveMinutes(rep, { nowMs: NOW.getTime(), legacy: true });
        assert.equal(b, a, JSON.stringify(rep));
        if (a !== null) validos++;
    }
    assert.ok(validos > 300, 'la muestra debe incluir muchos reportes válidos (' + validos + ')');
});

test('parseShiftReportTime: fecha completa, "a. m./p. m." y hora suelta sobre el día base', () => {
    const base = new Date(2026, 9, 6, 9).getTime();
    assert.equal(parseShiftReportTime('2026-10-06T08:00:00', base), new Date('2026-10-06T08:00:00').getTime());
    assert.equal(parseShiftReportTime('05:30 p. m.', base), new Date(2026, 9, 6, 17, 30).getTime());
    assert.equal(parseShiftReportTime('12:15 a. m.', base), new Date(2026, 9, 6, 0, 15).getTime());
    assert.ok(Number.isNaN(parseShiftReportTime('sin hora', base)));
    assert.ok(Number.isNaN(parseShiftReportTime(undefined, base)));
});

test('el panel RESTA la Pausa de Turno (regla confirmada): 08:00-18:00, almuerzo 30, pausa 180 => 390 min (6,50 h)', () => {
    const rep = { timestamp: NOW.getTime(), horaInicio: '2026-10-06T08:00:00', horaFin: '2026-10-06T18:00:00', tiempoAlmuerzoMins: 30, tiempoPausaTurnoMins: 180 };
    assert.equal(computeReportEffectiveMinutes(rep, { nowMs: NOW.getTime() }), 390);
    assert.equal(computeReportEffectiveMinutes({ ...rep, tiempoPausaTurnoMins: undefined }, { nowMs: NOW.getTime() }), 570, 'sin pausa: 9,50 h');
});

test('reportes que no cuentan: sin horas, ilegibles, o duración fuera de (0, 1440]; nunca negativo', () => {
    const n = NOW.getTime();
    assert.equal(computeReportEffectiveMinutes({ horaInicio: '2026-10-06T08:00:00' }, { nowMs: n }), null);
    assert.equal(computeReportEffectiveMinutes({ horaInicio: 'x', horaFin: 'y' }, { nowMs: n }), null);
    assert.equal(computeReportEffectiveMinutes({ horaInicio: '2026-10-06T08:00:00', horaFin: '2026-10-06T08:00:00' }, { nowMs: n }), null);
    assert.equal(computeReportEffectiveMinutes({ horaInicio: '2026-10-06T08:00:00', horaFin: '2026-10-06T09:00:00', tiempoPausaTurnoMins: 500 }, { nowMs: n }), 0);
});

test('D1: panel por defecto = fórmula única (resta la inactividad, no la penalidad) y coincide con el correo de cierre', () => {
    const start = new Date(2026, 9, 6, 8, 0, 0).getTime();
    const end = new Date(2026, 9, 6, 18, 0, 0).getTime();
    // Cierre real: 10 h, almuerzo 75 (15 de exceso), desayuno 20 (5 de exceso), pausa 120, inactividad 10 => penalidad 30
    const closure = calculateShiftClosureTimes({ loginMs: start, endMs: end, lunchMs: 75 * 60000, breakfastMs: 20 * 60000, splitShiftMs: 120 * 60000, inactivityMins: 10 });
    assert.equal(closure.penaltyMins, 30, 'la penalidad se sigue calculando igual (informativa)');
    assert.equal(closure.effectiveHours, '6.25'); // 600-75-20-120-10 = 375 min

    // Reporte guardado tal como lo escribe handleEndShift (shift-report-builder)
    const saved = {
        timestamp: end, horaInicio: new Date(start).toISOString(), horaFin: new Date(end).toISOString(),
        tiempoAlmuerzoMins: closure.lunchMinutes, tiempoDesayunoMins: closure.breakfastMinutes,
        tiempoPausaTurnoMins: closure.splitShiftMinutes, penalidadConectividadMins: closure.penaltyMins,
        inactividadTotalMins: 10
    };
    const panel = computeReportEffectiveMinutes(saved, { nowMs: end });
    assert.equal(panel, 375);
    assert.equal((panel / 60).toFixed(2), closure.effectiveHours, 'panel y correo dan el mismo número');
    assert.equal(computeReportEffectiveMinutes(saved, { nowMs: end, legacy: true }), 385, 'panel original de app.js: no restaba la inactividad');
});

test('D1: ejemplo del plan en el panel: 08:00-18:00, almuerzo 30, pausa 180, sin inactividad = 390 min (6,50 h)', () => {
    const rep = { timestamp: NOW.getTime(), horaInicio: '2026-10-06T08:00:00', horaFin: '2026-10-06T18:00:00', tiempoAlmuerzoMins: 30, tiempoPausaTurnoMins: 180, inactividadTotalMins: 0, penalidadConectividadMins: 0 };
    assert.equal(computeReportEffectiveMinutes(rep, { nowMs: NOW.getTime() }), 390);
});

test('D1: reporte ANTIGUO sin inactividadTotalMins -> inactividad derivada de la penalidad menos los excesos', () => {
    // almuerzo 75 (exceso 15), desayuno 20 (exceso 5), penalidad 30 => inactividad derivada 10
    const rep = { timestamp: NOW.getTime(), horaInicio: '2026-10-06T08:00:00', horaFin: '2026-10-06T18:00:00', tiempoAlmuerzoMins: 75, tiempoDesayunoMins: 20, penalidadConectividadMins: 30 };
    assert.equal(computeReportEffectiveMinutes(rep, { nowMs: NOW.getTime() }), 600 - 75 - 20 - 10);
    // sin penalidad ni inactividad: nada que restar (igual que el panel original)
    const viejo = { timestamp: NOW.getTime(), horaInicio: '2026-10-06T08:00:00', horaFin: '2026-10-06T18:00:00', tiempoAlmuerzoMins: 30 };
    assert.equal(computeReportEffectiveMinutes(viejo, { nowMs: NOW.getTime() }), 570);
    assert.equal(computeReportEffectiveMinutes(viejo, { nowMs: NOW.getTime(), legacy: true }), 570);
});

test('D1: por defecto = original de app.js MENOS la inactividad del reporte, en los mismos 600 reportes con semilla', () => {
    const r = rng(99);
    for (let i = 0; i < 600; i++) {
        const rep = randomPanelReport(r, NOW.getTime() - Math.floor(r() * 5 * DAY));
        if (r() < 0.6) rep.inactividadTotalMins = Math.round(r() * 90 * 10) / 10;
        const legacy = legacyPanelEffectiveMinutes(rep, NOW.getTime());
        const now = computeReportEffectiveMinutes(rep, { nowMs: NOW.getTime() });
        if (legacy === null) { assert.equal(now, null); continue; }
        let inact = 0;
        if (typeof rep.inactividadTotalMins === 'number') inact = rep.inactividadTotalMins;
        else if (typeof rep.penalidadConectividadMins === 'number') {
            inact = Math.max(0, parseFloat((rep.penalidadConectividadMins - Math.max(0, (rep.tiempoAlmuerzoMins || 0) - 60) - Math.max(0, (rep.tiempoDesayunoMins || 0) - 15)).toFixed(1)));
        }
        const base = legacy === 0 ? null : legacy; // el original recorta en 0 antes; si ya era 0, sigue 0
        if (base === null) assert.equal(now, 0);
        else assert.ok(Math.abs(now - Math.max(0, legacy - inact)) < 1e-9, JSON.stringify(rep));
    }
});

summarize();
