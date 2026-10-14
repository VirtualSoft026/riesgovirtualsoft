/**
 * Pruebas de `metrics-calculator.js` (KPIs y Control Operativo): `parseTime` (crítica) y la agregación por
 * gestor/periodo, con pruebas DIFERENCIALES contra copias LITERALES del código de app.js.
 *
 * Se ejecuta con: node src/tests/domain/kpi-metrics-calculator.test.mjs (también con TZ=UTC o TZ=America/New_York).
 */
import { createRunner, assert } from '../test-harness.mjs';
import * as M from '../../domain/analytics/metrics-calculator.js';
import { parseTimeToMs, parseClockTime } from '../../utils/date-time.js';
import { makeRng, makeFixedDate, makeRawData } from '../helpers/kpi-test-env.mjs';
import { buildSupervisorDirectory } from '../../domain/schedules/supervisor-directory.js';

const { test, summarize } = createRunner('metrics-calculator (KPIs y Control Operativo)');

// ---------------------------------------------------------------------------------------------------------
// Copia LITERAL de app.js 5910-5929: `parseTime` anidada en calcularIndicadores()
function makeLegacyParseTime() {
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
    return parseTime;
}
const legacyParseTime = makeLegacyParseTime();

// Copia LITERAL de app.js 7486-7641 (agregación de renderControlOperativoFiltered). Solo se reemplazan, por
// parámetros, las 3 lecturas del DOM/estado de las líneas 7482-7484 y `Date` por un reloj fijo.
function legacyAggregate(rawData, selectedGestores, selectedFecha, customStartValue, customEndValue, Date) {
    const window = { controlOperativoRawData: rawData };
    const document = { getElementById: (id) => ({ value: id === 'operativoDateStart' ? customStartValue : customEndValue }) };
    
    const getLocalYYYYMMDD = (d) => {
        const tzOffset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
    };
    
    const todayStr = getLocalYYYYMMDD(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalYYYYMMDD(yesterday);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = getLocalYYYYMMDD(sevenDaysAgo);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = getLocalYYYYMMDD(thirtyDaysAgo);
    
    const thisMonth = todayStr.substring(0, 7);
    
    const nowD = new Date();
    const lastMonthDate = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1);
    const lastMonth = getLocalYYYYMMDD(lastMonthDate).substring(0, 7);

    const customStart = document.getElementById('operativoDateStart')?.value;
    const customEnd = document.getElementById('operativoDateEnd')?.value;
    
    // Aggregation logic
    let aggregatedData = {};
    let aggregatedDataGlobal = {};
    let dailyData = {};
    
    const checkGestorMatch = (mstrGestor) => {
        if (selectedGestores.length === 0) return true;
        if (selectedGestores.includes(mstrGestor)) return true;
        const normMstr = mstrGestor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return selectedGestores.some(sel => {
            const normSel = sel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (normMstr === normSel) return true;
            const parts = normSel.split(' ').filter(Boolean);
            if (parts.every(p => normMstr.includes(p))) return true;
            const mstrParts = normMstr.split(' ').filter(Boolean);
            if (parts.length >= 2 && mstrParts.length >= 2) {
                return normMstr.includes(parts[0]) && normMstr.includes(parts[1]);
            }
            return false;
        });
    };
    
    for (const gestor in window.controlOperativoRawData) {
        
        aggregatedDataGlobal[gestor] = {
            Retiros_Aprobados: 0,
            Retiros_Rechazados: 0,
            Tiempo_Total_Desde_Creacion_Segundos: 0,
            Dias_Tarde: 0,
            Minutos_Tarde_Total: 0,
            Minutos_Inactividad_Total: 0,
            Dias_Laborados: 0
        };

        if (checkGestorMatch(gestor)) {
            aggregatedData[gestor] = {
                Retiros_Aprobados: 0,
                Retiros_Rechazados: 0,
                Tiempo_Total_Desde_Creacion_Segundos: 0,
                Dias_Tarde: 0,
                Minutos_Tarde_Total: 0,
                Minutos_Inactividad_Total: 0,
                Dias_Laborados: 0
            };
        }
        
        for (const fecha in window.controlOperativoRawData[gestor]) {
            let inRange = false;
            if (selectedFecha === 'Todas') {
                inRange = true;
            } else if (selectedFecha === 'today' && fecha === todayStr) {
                inRange = true;
            } else if (selectedFecha === 'yesterday' && fecha === yesterdayStr) {
                inRange = true;
            } else if (selectedFecha === '7' && fecha >= sevenDaysAgoStr && fecha <= todayStr) {
                inRange = true;
            } else if (selectedFecha === '30' && fecha >= thirtyDaysAgoStr && fecha <= todayStr) {
                inRange = true;
            } else if (selectedFecha === 'thisMonth' && fecha.substring(0, 7) === thisMonth) {
                inRange = true;
            } else if (selectedFecha === 'lastMonth' && fecha.substring(0, 7) === lastMonth) {
                inRange = true;
            } else if (selectedFecha === 'custom' && customStart && customEnd && fecha >= customStart && fecha <= customEnd) {
                inRange = true;
            }
            
            if (inRange) {
                const d = window.controlOperativoRawData[gestor][fecha];
                const procesadosEnDia = (d.Retiros_Procesados !== undefined)
                    ? d.Retiros_Procesados
                    : ((d.Retiros_Aprobados || 0) + (d.Retiros_Rechazados || 0));
                const esDiaActivo = (d.Dias_Laborados && d.Dias_Laborados > 0) ? d.Dias_Laborados : (procesadosEnDia > 0 ? 1 : 0);
                
                // Add to Global Data
                aggregatedDataGlobal[gestor].Retiros_Aprobados += d.Retiros_Aprobados || 0;
                aggregatedDataGlobal[gestor].Retiros_Rechazados += d.Retiros_Rechazados || 0;
                aggregatedDataGlobal[gestor].Tiempo_Total_Desde_Creacion_Segundos += d.Tiempo_Total_Desde_Creacion_Segundos || 0;
                aggregatedDataGlobal[gestor].Dias_Tarde += d.Dias_Tarde || 0;
                aggregatedDataGlobal[gestor].Minutos_Tarde_Total += d.Minutos_Tarde_Total || 0;
                aggregatedDataGlobal[gestor].Minutos_Inactividad_Total += d.Minutos_Inactividad_Total || 0;
                aggregatedDataGlobal[gestor].Dias_Laborados += esDiaActivo;

                // Add to Filtered Data (only if this gestor is selected)
                if (checkGestorMatch(gestor)) {
                    if (!dailyData[fecha]) {
                        dailyData[fecha] = { Aprobados: 0, Rechazados: 0 };
                    }
                    dailyData[fecha].Aprobados += d.Retiros_Aprobados || 0;
                    dailyData[fecha].Rechazados += d.Retiros_Rechazados || 0;
                    
                    aggregatedData[gestor].Retiros_Aprobados += d.Retiros_Aprobados || 0;
                    aggregatedData[gestor].Retiros_Rechazados += d.Retiros_Rechazados || 0;
                    aggregatedData[gestor].Tiempo_Total_Desde_Creacion_Segundos += d.Tiempo_Total_Desde_Creacion_Segundos || 0;
                    aggregatedData[gestor].Dias_Tarde += d.Dias_Tarde || 0;
                    aggregatedData[gestor].Minutos_Tarde_Total += d.Minutos_Tarde_Total || 0;
                    aggregatedData[gestor].Minutos_Inactividad_Total += d.Minutos_Inactividad_Total || 0;
                    aggregatedData[gestor].Dias_Laborados += esDiaActivo;
                }
            }
        }
    }
    
    // Calculate final metrics per gestor
    for (const gestor in aggregatedData) {
        const d = aggregatedData[gestor];
        const dl = d.Dias_Laborados > 0 ? d.Dias_Laborados : 1;
        
        d.Prom_Minutos_Tarde = Math.round((d.Minutos_Tarde_Total / dl) * 100) / 100;
        d.Prom_Inactividad_Diaria = Math.round((d.Minutos_Inactividad_Total / dl) * 100) / 100;
        d.Retiros_Procesados = d.Retiros_Aprobados + d.Retiros_Rechazados;
        d.ART_Desde_Creacion_Minutos = d.Retiros_Procesados > 0 ? Math.round((d.Tiempo_Total_Desde_Creacion_Segundos / d.Retiros_Procesados) / 60 * 100) / 100 : 0;
        d.Porcentaje_Rechazos = d.Retiros_Procesados > 0 ? Math.round((d.Retiros_Rechazados / d.Retiros_Procesados) * 100 * 100) / 100 : 0;
        d.Tasa_Aprobacion_Dia = Math.round((d.Retiros_Aprobados / dl) * 100) / 100;
    }

    // Calculate final metrics per gestor GLOBAL
    for (const gestor in aggregatedDataGlobal) {
        const d = aggregatedDataGlobal[gestor];
        const dl = d.Dias_Laborados > 0 ? d.Dias_Laborados : 1;
        
        d.Prom_Minutos_Tarde = Math.round((d.Minutos_Tarde_Total / dl) * 100) / 100;
        d.Prom_Inactividad_Diaria = Math.round((d.Minutos_Inactividad_Total / dl) * 100) / 100;
        d.Retiros_Procesados = d.Retiros_Aprobados + d.Retiros_Rechazados;
        d.ART_Desde_Creacion_Minutos = d.Retiros_Procesados > 0 ? Math.round((d.Tiempo_Total_Desde_Creacion_Segundos / d.Retiros_Procesados) / 60 * 100) / 100 : 0;
        d.Porcentaje_Rechazos = d.Retiros_Procesados > 0 ? Math.round((d.Retiros_Rechazados / d.Retiros_Procesados) * 100 * 100) / 100 : 0;
        d.Tasa_Aprobacion_Dia = Math.round((d.Retiros_Aprobados / dl) * 100) / 100;
    }
    
    return { aggregatedData, aggregatedDataGlobal, dailyData };
}
// ---------------------------------------------------------------------------------------------------------

/** Mismo instante (ms), o ambos NaN. */
function sameMs(a, b) {
    return (Number.isNaN(a) && Number.isNaN(b)) || a === b;
}

const BASE = new Date(2026, 9, 6, 9, 0, 0).getTime(); // 6-oct-2026 09:00 local

function at(h, m, s = 0) {
    return new Date(2026, 9, 6, h, m, s, 0).getTime();
}

// ============================================================ parseTime
test('parseTime: "H:MM" con AM/PM en todas las variantes de escritura de es-CO y en-US', () => {
    assert.equal(M.parseTime('2:15 PM', BASE), at(14, 15));
    assert.equal(M.parseTime('2:15 pm', BASE), at(14, 15));
    assert.equal(M.parseTime('2:15 p. m.', BASE), at(14, 15));
    assert.equal(M.parseTime('2:15 p.m.', BASE), at(14, 15));
    assert.equal(M.parseTime('10:30 a. m.', BASE), at(10, 30));
    assert.equal(M.parseTime('10:30 AM', BASE), at(10, 30));
    assert.equal(M.parseTime('10:30 a.m.', BASE), at(10, 30));
    assert.equal(M.parseTime('11:59 p. m.', BASE), at(23, 59));
});

test('parseTime: horas 12:xx (12 a. m. = 0, 12 p. m. = 12) y 1:xx p. m.', () => {
    assert.equal(M.parseTime('12:00 a. m.', BASE), at(0, 0));
    assert.equal(M.parseTime('12:15 AM', BASE), at(0, 15));
    assert.equal(M.parseTime('12:30 p. m.', BASE), at(12, 30));
    assert.equal(M.parseTime('12:45 PM', BASE), at(12, 45));
    assert.equal(M.parseTime('1:05 p. m.', BASE), at(13, 5));
    assert.equal(M.parseTime('12:00', BASE), at(12, 0));
});

test('parseTime: sin AM/PM se toma como 24 h; los segundos se descartan', () => {
    assert.equal(M.parseTime('8:30', BASE), at(8, 30));
    assert.equal(M.parseTime('14:05', BASE), at(14, 5));
    assert.equal(M.parseTime('0:00', BASE), at(0, 0));
    assert.equal(M.parseTime('10:30:15 PM', BASE), at(22, 30, 0));
});

test('parseTime: la hora se aplica sobre el DÍA de la fecha base (no sobre hoy)', () => {
    const otro = new Date(2026, 0, 15, 22, 0, 0).getTime();
    assert.equal(M.parseTime('7:20 a. m.', otro), new Date(2026, 0, 15, 7, 20, 0, 0).getTime());
});

test('parseTime: fechas completas se interpretan directamente (ISO, "m/d/aaaa, h:mm:ss PM", Date.toString)', () => {
    assert.equal(M.parseTime('2026-01-15T10:30:00', BASE), new Date(2026, 0, 15, 10, 30, 0).getTime());
    assert.equal(M.parseTime('6/16/2026, 2:05:00 p. m.', BASE), new Date(2026, 5, 16, 14, 5, 0).getTime());
    assert.equal(M.parseTime('2026-10-06T14:00:00Z', BASE), Date.UTC(2026, 9, 6, 14, 0, 0));
    assert.equal(M.parseTime('Tue Oct 06 2026 10:00:00', BASE), new Date(2026, 9, 6, 10, 0, 0).getTime());
});

test('parseTime: vacíos y formatos inesperados devuelven NaN', () => {
    for (const v of ['', ' ', 'abc', 'sin hora', undefined, 'N/A', '::', 'a: b', 'AM', 'p. m.', {}, [], NaN]) {
        assert.ok(Number.isNaN(M.parseTime(v, BASE)), `esperaba NaN para ${JSON.stringify(v)}`);
    }
});

test('parseTime: particularidades heredadas (null -> 0, números tal cual, "5"/"12" son fechas del 2001)', () => {
    assert.equal(M.parseTime(null, BASE), 0, 'new Date(null) es el epoch');
    assert.equal(M.parseTime(1781636700000, BASE), 1781636700000, 'un número se devuelve tal cual');
    assert.equal(M.parseTime(true, BASE), 1, 'true -> 1 ms');
    // "5" y "12" no son horas: V8 los toma como mes de 2001 (hallazgo documentado)
    assert.equal(M.parseTime('5', BASE), new Date(2001, 4, 1).getTime());
    assert.equal(M.parseTime('12', BASE), new Date(2001, 11, 1).getTime());
    assert.ok(Number.isNaN(M.parseTime('13', BASE)));
});

test('parseTime: horas fuera de rango no se validan (se desbordan al día siguiente), igual que el original', () => {
    assert.equal(M.parseTime('25:61', BASE), new Date(2026, 9, 6, 25, 61, 0, 0).getTime());
    assert.equal(M.parseTime('13:00 PM', BASE), at(13, 0), '13 PM no se suma 12 (hours < 12 falso)');
});

test('parseTime: día>12 en "d/m/aaaa, HH:MM" cae a la rama manual y toma la fecha BASE (hallazgo)', () => {
    // new Date('16/6/2026, 14:05:00') es inválida => se usa solo "14:05" sobre baseDateMs
    assert.equal(M.parseTime('16/6/2026, 14:05:00', BASE), at(14, 5));
});

test('parseTime: variante "p.m" sin punto final no se reconoce como PM (el original tampoco): 2:15 p.m -> 02:15', () => {
    assert.equal(M.parseTime('2:15 p.m', BASE), at(2, 15));
    assert.equal(legacyParseTime('2:15 p.m', BASE), at(2, 15));
    // parseClockTime sí lo normaliza: DIFERENCIA documentada entre ambos
    assert.deepEqual(parseClockTime('2:15 p.m'), { h: 14, min: 15 });
});

test('diferencial vs app.js 5910-5929: 12 x 4 x 10 combinaciones de hora, minuto y escritura de AM/PM', () => {
    const tokens = ['', ' AM', ' PM', ' am', ' pm', ' a. m.', ' p. m.', ' a.m.', ' p.m.', ' A. M.', ' P. M.', ' a.m', ' p.m', 'AM', 'pm'];
    let n = 0;
    for (let h = 0; h <= 24; h++) {
        for (const m of [0, 5, 30, 59]) {
            for (const tk of tokens) {
                const s = `${h}:${String(m).padStart(2, '0')}${tk}`;
                assert.ok(sameMs(M.parseTime(s, BASE), legacyParseTime(s, BASE)), `difiere para "${s}"`);
                n += 1;
            }
        }
    }
    assert.equal(n, 25 * 4 * 15);
});

test('diferencial vs app.js 5910-5929: entradas raras fijas', () => {
    const inputs = [
        '', ' ', null, undefined, 0, 1, -1, 1e15, NaN, true, false, {}, [], [1], 'abc', '5', '12', '13', '1', '2026-01-15',
        '2026-01-15T10:30:00', '2026-01-15T10:30:00Z', '6/16/2026, 2:05:00 p. m.', '16/6/2026, 14:05:00', '1/2/2026',
        '8:30 AM Colombia', 'Tue Oct 06 2026 10:00:00', '10:30:15 PM', '  9:05  ', '9:5', '09:05', ':30', '9:', '12:00 a. m.',
        '12:00 p. m.', 'a. m.', 'p. m.', '11:00 PM y 12:00 AM', 'hora: 7:45', '7:45-8:15', '１２:３０', '١٢:٣٠'
    ];
    for (const s of inputs) assert.ok(sameMs(M.parseTime(s, BASE), legacyParseTime(s, BASE)), `difiere para ${JSON.stringify(s)}`);
});

test('diferencial vs app.js 5910-5929: 3000 cadenas aleatorias con semilla (hora/minuto/meridiano/ruido) y 3 fechas base', () => {
    const rng = makeRng(20261006);
    const pick = (a) => a[Math.floor(rng() * a.length)];
    const bases = [BASE, new Date(2026, 2, 8, 23, 30).getTime(), new Date(2026, 10, 1, 0, 5).getTime()];
    const prefijos = ['', '', '', 'Hora ', '6/16/2026, ', '16/6/2026, ', '2026-10-06T', '  '];
    const sufijos = ['', ':00', ' AM', ' PM', ' a. m.', ' p. m.', ' am', ' pm', ' a.m.', ' p.m.', ' hrs', '  '];
    for (let i = 0; i < 3000; i++) {
        const s = pick(prefijos) + Math.floor(rng() * 27) + (rng() < 0.9 ? ':' + String(Math.floor(rng() * 62)).padStart(2, '0') : '') + pick(sufijos);
        const b = pick(bases);
        assert.ok(sameMs(M.parseTime(s, b), legacyParseTime(s, b)), `difiere para ${JSON.stringify(s)}`);
    }
});

test('equivalencia con parseTimeToMs de utils/date-time.js (misma lógica, copia independiente)', () => {
    const rng = makeRng(7);
    const tokens = ['', ' AM', ' PM', ' a. m.', ' p. m.', ' a.m.', ' pm'];
    for (let i = 0; i < 2000; i++) {
        const s = `${Math.floor(rng() * 14)}:${String(Math.floor(rng() * 60)).padStart(2, '0')}${tokens[Math.floor(rng() * tokens.length)]}`;
        assert.ok(sameMs(M.parseTime(s, BASE), parseTimeToMs(s, BASE)), `difiere de parseTimeToMs para "${s}"`);
    }
    for (const s of ['', null, undefined, 'abc', '5', '2026-01-15T10:30:00']) {
        assert.ok(sameMs(M.parseTime(s, BASE), parseTimeToMs(s, BASE)));
    }
});

test('comparación con parseClockTime: mismas horas del día cuando hay "H:MM" + meridiano estándar', () => {
    const tokens = [' AM', ' PM', ' am', ' pm', ' a. m.', ' p. m.', ' a.m.', ' p.m.'];
    for (let h = 1; h <= 12; h++) {
        for (const m of [0, 15, 59]) {
            for (const tk of tokens) {
                const s = `${h}:${String(m).padStart(2, '0')}${tk}`;
                const d = new Date(M.parseTime(s, BASE));
                const c = parseClockTime(s);
                assert.deepEqual({ h: d.getHours(), min: d.getMinutes() }, c, `difiere para "${s}"`);
            }
        }
    }
});

test('DIFERENCIAS documentadas parseTime vs parseClockTime (no se unifican)', () => {
    // 1) Resultado: instante (ms) vs {h, min}
    assert.equal(typeof M.parseTime('8:30', BASE), 'number');
    assert.deepEqual(parseClockTime('8:30'), { h: 8, min: 30 });
    // 2) "8" solo: parseClockTime lo lee como 8:00; parseTime lo toma como fecha (agosto de 2001)
    assert.deepEqual(parseClockTime('8'), { h: 8, min: 0 });
    assert.equal(M.parseTime('8', BASE), new Date(2001, 7, 1).getTime());
    // 3) Fecha completa: parseClockTime toma los primeros dígitos ("20" de 2026) como hora; parseTime la interpreta bien
    assert.deepEqual(parseClockTime('2026-01-15T10:30:00'), { h: 20, min: 0 });
    assert.equal(M.parseTime('2026-01-15T10:30:00', BASE), new Date(2026, 0, 15, 10, 30).getTime());
    // 4) null/vacío: parseClockTime -> null; parseTime(null) -> 0 y '' -> NaN
    assert.equal(parseClockTime(null), null);
    assert.equal(M.parseTime(null, BASE), 0);
    assert.ok(Number.isNaN(M.parseTime('', BASE)));
    // 5) Sin hora reconocible: null vs NaN
    assert.equal(parseClockTime('abc'), null);
    assert.ok(Number.isNaN(M.parseTime('abc', BASE)));
    // 6) "p.m" sin punto: ver prueba anterior
    // 7) 12 AM/PM cuando new Date() ya interpreta el texto: no hay diferencia observable en los formatos soportados
});

// ============================================================ helpers de nombres / fechas
test('normalizeForMatch quita acentos y pasa a minúsculas', () => {
    assert.equal(M.normalizeForMatch('María Sánchez'), 'maria sanchez');
    assert.equal(M.normalizeForMatch('ÁÉÍÓÚ ñ'), 'aeiou n');
});

test('matchesGestorSelection: sin selección coincide; exacta, por palabras y por nombre+apellido', () => {
    assert.equal(M.matchesGestorSelection('Ana Pérez', []), true);
    assert.equal(M.matchesGestorSelection('Ana Pérez', ['Ana Pérez']), true);
    assert.equal(M.matchesGestorSelection('Ana Pérez', ['ana perez']), true);
    assert.equal(M.matchesGestorSelection('Ana María Pérez Gómez', ['Ana Pérez']), true);
    assert.equal(M.matchesGestorSelection('Ana Pérez', ['Luis Gómez']), false);
    assert.equal(M.matchesGestorSelection('Ana Pérez', ['Luis Gómez', 'Ana']), true);
    assert.equal(M.matchesGestorSelection('Ana', ['Ana Pérez']), false, 'solo 1 palabra no alcanza para la regla nombre+apellido');
});

test('getLocalYYYYMMDD devuelve la fecha LOCAL aunque en UTC sea otro día', () => {
    assert.equal(M.getLocalYYYYMMDD(new Date(2026, 9, 6, 23, 59, 59)), '2026-10-06');
    assert.equal(M.getLocalYYYYMMDD(new Date(2026, 9, 6, 0, 0, 1)), '2026-10-06');
    assert.equal(M.getLocalYYYYMMDD(new Date(2026, 0, 1, 0, 0, 0)), '2026-01-01');
});

test('resolveOperativoRanges: cortes de hoy/ayer/7/30/mes/mes anterior (incl. cambios de mes y de año)', () => {
    const r = M.resolveOperativoRanges(new Date(2026, 9, 6, 15, 0));
    assert.deepEqual(r, { todayStr: '2026-10-06', yesterdayStr: '2026-10-05', sevenDaysAgoStr: '2026-09-29', thirtyDaysAgoStr: '2026-09-06', thisMonth: '2026-10', lastMonth: '2026-09' });
    const e = M.resolveOperativoRanges(new Date(2026, 0, 1, 0, 30));
    assert.deepEqual(e, { todayStr: '2026-01-01', yesterdayStr: '2025-12-31', sevenDaysAgoStr: '2025-12-25', thirtyDaysAgoStr: '2025-12-02', thisMonth: '2026-01', lastMonth: '2025-12' });
    const m = M.resolveOperativoRanges(new Date(2026, 2, 31, 12, 0));
    assert.equal(m.lastMonth, '2026-02', 'aquí "mes anterior" usa el día 1: no sufre el desborde de generarAnalisisTextual');
});

test('isFechaInRange: cada periodo y los bordes', () => {
    const r = M.resolveOperativoRanges(new Date(2026, 9, 6, 15, 0));
    assert.equal(M.isFechaInRange('2020-01-01', 'Todas', r), true);
    assert.equal(M.isFechaInRange('2026-10-06', 'today', r), true);
    assert.equal(M.isFechaInRange('2026-10-05', 'today', r), false);
    assert.equal(M.isFechaInRange('2026-10-05', 'yesterday', r), true);
    assert.equal(M.isFechaInRange('2026-09-29', '7', r), true);
    assert.equal(M.isFechaInRange('2026-09-28', '7', r), false);
    assert.equal(M.isFechaInRange('2026-10-07', '7', r), false, 'el futuro no cuenta');
    assert.equal(M.isFechaInRange('2026-09-06', '30', r), true);
    assert.equal(M.isFechaInRange('2026-10-01', 'thisMonth', r), true);
    assert.equal(M.isFechaInRange('2026-09-30', 'lastMonth', r), true);
    assert.equal(M.isFechaInRange('2026-10-15', 'custom', r, '2026-10-01', '2026-10-20'), true);
    assert.equal(M.isFechaInRange('2026-10-15', 'custom', r, '', '2026-10-20'), false, 'custom sin una de las fechas no incluye nada');
    assert.equal(M.isFechaInRange('2026-10-15', 'otro', r), false);
});

// ============================================================ agregación
const NOWS = [
    new Date(2026, 9, 6, 15, 0).getTime(), new Date(2026, 2, 31, 23, 50).getTime(), new Date(2026, 0, 1, 0, 10).getTime(),
    new Date(2026, 11, 31, 23, 59).getTime(), new Date(2026, 1, 28, 12, 0).getTime(), new Date(2024, 1, 29, 8, 0).getTime(),
    new Date(2026, 9, 25, 0, 0).getTime()
];
const PERIODOS = ['Todas', 'today', 'yesterday', '7', '30', 'thisMonth', 'lastMonth', 'custom', 'desconocido'];

test('diferencial vs app.js 7486-7641: agregación completa, 7 fechas "ahora" x 9 periodos x 6 selecciones con datos aleatorios', () => {
    let casos = 0;
    NOWS.forEach((nowMs, idx) => {
        const rng = makeRng(1000 + idx);
        const raw = makeRawData(rng, { gestores: 6, dias: 75, baseMs: nowMs });
        const nombres = Object.keys(raw);
        const selecciones = [[], [nombres[0]], [nombres[0], nombres[1]], [nombres[1].toLowerCase()], ['Inexistente'], nombres.slice(0, 3)];
        const FixedDate = makeFixedDate(nowMs);
        for (const periodo of PERIODOS) {
            for (const sel of selecciones) {
                const now = new FixedDate();
                const customStart = M.getLocalYYYYMMDD(new Date(nowMs - 20 * 86400000));
                const customEnd = M.getLocalYYYYMMDD(new Date(nowMs - 3 * 86400000));
                const esperado = legacyAggregate(JSON.parse(JSON.stringify(raw)), sel, periodo, customStart, customEnd, FixedDate);
                const obtenido = M.aggregateOperativoData(JSON.parse(JSON.stringify(raw)), { selectedGestores: sel, selectedFecha: periodo, customStart, customEnd, now });
                assert.deepEqual(obtenido, esperado, `difiere: now#${idx} periodo=${periodo} sel=${JSON.stringify(sel)}`);
                casos += 1;
            }
        }
    });
    assert.equal(casos, 7 * 9 * 6);
});

test('diferencial vs app.js 7486-7641: periodo "custom" con fechas vacías, invertidas y de un día', () => {
    const nowMs = NOWS[0];
    const FixedDate = makeFixedDate(nowMs);
    const raw = makeRawData(makeRng(5), { gestores: 4, dias: 60, baseMs: nowMs });
    for (const [s, e] of [['', ''], [undefined, undefined], ['2026-10-01', ''], ['2026-10-10', '2026-10-01'], ['2026-10-03', '2026-10-03']]) {
        const esperado = legacyAggregate(JSON.parse(JSON.stringify(raw)), [], 'custom', s, e, FixedDate);
        const obtenido = M.aggregateOperativoData(JSON.parse(JSON.stringify(raw)), { selectedGestores: [], selectedFecha: 'custom', customStart: s, customEnd: e, now: new FixedDate() });
        assert.deepEqual(obtenido, esperado);
    }
});

test('agregación: JSON vacío, gestor sin días y días con campos faltantes no rompen y dan ceros', () => {
    const now = new Date(2026, 9, 6, 12);
    assert.deepEqual(M.aggregateOperativoData({}, { selectedFecha: 'Todas', now }), { aggregatedData: {}, aggregatedDataGlobal: {}, dailyData: {} });
    const r = M.aggregateOperativoData({ 'Ana': {}, 'Luis': { '2026-10-05': {} } }, { selectedGestores: [], selectedFecha: 'Todas', now });
    assert.equal(r.aggregatedData.Ana.Retiros_Procesados, 0);
    assert.equal(r.aggregatedData.Ana.Dias_Laborados, 0);
    assert.equal(r.aggregatedData.Luis.Dias_Laborados, 0, 'un día vacío no cuenta como activo');
    assert.equal(r.aggregatedData.Luis.Porcentaje_Rechazos, 0);
    assert.equal(r.aggregatedData.Luis.Prom_Minutos_Tarde, 0);
    assert.deepEqual(r.dailyData, { '2026-10-05': { Aprobados: 0, Rechazados: 0 } });
});

test('agregación: un día con Retiros_Procesados>0 pero sin Dias_Laborados cuenta 1 día activo; Dias_Laborados manda si es >0', () => {
    const now = new Date(2026, 9, 6, 12);
    const raw = { Ana: { '2026-10-05': { Retiros_Aprobados: 3, Retiros_Rechazados: 1, Retiros_Procesados: 4 }, '2026-10-04': { Retiros_Aprobados: 2, Dias_Laborados: 2 } } };
    const a = M.aggregateOperativoData(raw, { selectedFecha: 'Todas', now }).aggregatedData.Ana;
    assert.equal(a.Dias_Laborados, 3);
    assert.equal(a.Retiros_Procesados, 6);
    assert.equal(a.Tasa_Aprobacion_Dia, 1.67);
    assert.equal(a.Porcentaje_Rechazos, 16.67);
});

test('agregación: los gestores no seleccionados quedan fuera de aggregatedData/dailyData pero SÍ en el global', () => {
    const now = new Date(2026, 9, 6, 12);
    const raw = { Ana: { '2026-10-05': { Retiros_Aprobados: 3 } }, Luis: { '2026-10-05': { Retiros_Aprobados: 5 } } };
    const r = M.aggregateOperativoData(raw, { selectedGestores: ['Ana'], selectedFecha: 'Todas', now });
    assert.deepEqual(Object.keys(r.aggregatedData), ['Ana']);
    assert.deepEqual(Object.keys(r.aggregatedDataGlobal), ['Ana', 'Luis']);
    assert.deepEqual(r.dailyData, { '2026-10-05': { Aprobados: 3, Rechazados: 0 } });
});

test('finalizeGestorMetrics: redondeos a 2 decimales y división segura entre cero', () => {
    const d = M.finalizeGestorMetrics({ Retiros_Aprobados: 7, Retiros_Rechazados: 2, Tiempo_Total_Desde_Creacion_Segundos: 5400, Dias_Tarde: 1, Minutos_Tarde_Total: 10, Minutos_Inactividad_Total: 25, Dias_Laborados: 3 });
    assert.equal(d.Retiros_Procesados, 9);
    assert.equal(d.ART_Desde_Creacion_Minutos, 10);
    assert.equal(d.Porcentaje_Rechazos, 22.22);
    assert.equal(d.Tasa_Aprobacion_Dia, 2.33);
    assert.equal(d.Prom_Minutos_Tarde, 3.33);
    assert.equal(d.Prom_Inactividad_Diaria, 8.33);
    const z = M.finalizeGestorMetrics({ Retiros_Aprobados: 0, Retiros_Rechazados: 0, Tiempo_Total_Desde_Creacion_Segundos: 0, Dias_Tarde: 0, Minutos_Tarde_Total: 0, Minutos_Inactividad_Total: 0, Dias_Laborados: 0 });
    assert.equal(z.ART_Desde_Creacion_Minutos, 0);
    assert.equal(z.Porcentaje_Rechazos, 0);
    assert.equal(z.Tasa_Aprobacion_Dia, 0);
});

// ============================================================ filas, totales y gráficas globales
test('summarizeOperativoRows: orden por aprobados, omite filas vacías, totales y avgArt', () => {
    const agg = {
        A: { Retiros_Aprobados: 10, Retiros_Rechazados: 2, Retiros_Procesados: 12, Dias_Laborados: 2, ART_Desde_Creacion_Minutos: 30 },
        B: { Retiros_Aprobados: 20, Retiros_Rechazados: 0, Retiros_Procesados: 20, Dias_Laborados: 3, ART_Desde_Creacion_Minutos: 15.55 },
        C: { Retiros_Aprobados: 0, Retiros_Rechazados: 0, Retiros_Procesados: 0, Dias_Laborados: 0, ART_Desde_Creacion_Minutos: 0 },
        D: { Retiros_Aprobados: 0, Retiros_Rechazados: 0, Retiros_Procesados: 0, Dias_Laborados: 1, ART_Desde_Creacion_Minutos: 0 }
    };
    const s = M.summarizeOperativoRows(agg);
    assert.deepEqual(s.rows.map(r => r.gestor), ['B', 'A', 'D']);
    assert.equal(s.globalProcesados, 32);
    assert.equal(s.globalAprobados, 30);
    assert.equal(s.globalRechazados, 2);
    assert.equal(s.avgArt, '22.8', '(30 + 15.55) / 2 gestores con retiros');
});

test('summarizeOperativoRows: sin retiros avgArt es el número 0 (no "0.0") y sin filas todo en cero', () => {
    const s = M.summarizeOperativoRows({});
    assert.deepEqual(s, { rows: [], globalProcesados: 0, globalAprobados: 0, globalRechazados: 0, avgArt: 0 });
    assert.strictEqual(M.summarizeOperativoRows({ A: { Retiros_Aprobados: 0, Retiros_Rechazados: 0, Retiros_Procesados: 0, Dias_Laborados: 2, ART_Desde_Creacion_Minutos: 0 } }).avgArt, 0);
});

test('ORIGINAL explícito (legacyExcludedNames): selectGlobalForCharts excluye por subcadena ("Sara Santamar" incluida) y filas vacías', () => {
    const g = {
        'Ana Pérez': { Retiros_Procesados: 5, Dias_Laborados: 0 },
        'Sara Santamaría': { Retiros_Procesados: 50, Dias_Laborados: 5 },
        'Sara Santamarina': { Retiros_Procesados: 3, Dias_Laborados: 1 },
        'Oriana Borja': { Retiros_Procesados: 9, Dias_Laborados: 3 },
        'Mariana Ruiz': { Retiros_Procesados: 4, Dias_Laborados: 1 },
        'Luis': { Retiros_Procesados: 0, Dias_Laborados: 2 },
        'Vacío': { Retiros_Procesados: 0, Dias_Laborados: 0 }
    };
    const r = M.selectGlobalForCharts(g, null, { legacyExcludedNames: ['Sara Santamaría', 'Oriana Borja', 'Sara', 'Maria'] });
    assert.deepEqual(Object.keys(r), ['Ana Pérez', 'Luis'], 'el original oculta también a "Mariana Ruiz" (contiene "Maria")');
});

test('D9b (predeterminado): selectGlobalForCharts excluye por ROL (nombre completo exacto); "Mariana" ya no se oculta', () => {
    const g = {
        'Ana Pérez': { Retiros_Procesados: 5, Dias_Laborados: 0 },
        'Sara Santamaría': { Retiros_Procesados: 50, Dias_Laborados: 5 },
        'Sara Santamarina': { Retiros_Procesados: 3, Dias_Laborados: 1 },
        'MARIA  SANCHEZ': { Retiros_Procesados: 7, Dias_Laborados: 1 },
        'Mariana Ruiz': { Retiros_Procesados: 4, Dias_Laborados: 1 },
        'Oriana Borja': { Retiros_Procesados: 9, Dias_Laborados: 3 },
        'Vacío': { Retiros_Procesados: 0, Dias_Laborados: 0 }
    };
    const dir = buildSupervisorDirectory({
        s1: { name: 'Sara Santamaria', role: 'Supervisor' }, s2: { name: 'María Sánchez', role: 'Admin' },
        g1: { name: 'Oriana Borja', role: 'Gestor' }, g2: { name: 'Mariana Ruiz', role: 'Gestor' }
    });
    assert.deepEqual(Object.keys(M.selectGlobalForCharts(g, dir)), ['Ana Pérez', 'Sara Santamarina', 'Mariana Ruiz', 'Oriana Borja'],
        'excluye solo a Sara Santamaría y María Sánchez (acentos/mayúsculas/espacios normalizados); Oriana es Gestor en users');
    assert.deepEqual(Object.keys(M.selectGlobalForCharts(g, null)), ['Ana Pérez', 'Sara Santamaría', 'Sara Santamarina', 'MARIA  SANCHEZ', 'Mariana Ruiz', 'Oriana Borja'], 'sin directorio no excluye a nadie');
    assert.throws(() => M.selectGlobalForCharts(g, ['Sara']), /legacyExcludedNames/, 'la lista fija como segundo argumento se rechaza');
});

test('resolveSelectedGestorLabel: Todos / nombre / "N Gestores"', () => {
    assert.equal(M.resolveSelectedGestorLabel([]), 'Todos');
    assert.equal(M.resolveSelectedGestorLabel(['Ana']), 'Ana');
    assert.equal(M.resolveSelectedGestorLabel(['Ana', 'Luis']), '2 Gestores');
});

summarize();
