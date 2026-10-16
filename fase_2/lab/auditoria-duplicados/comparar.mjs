// Comparación diferencial: función REAL de app.js (rama del refactor) vs su módulo en src/.
// Mismas entradas -> ¿mismo resultado? Solo lee archivos.
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { loadAppFunctions, APP_FILE } from './lib-app.mjs';

import * as san from '../../../src/utils/sanitization.js';
import * as caps from '../../../src/domain/announcements/announcement-capabilities.js';
import * as norm from '../../../src/utils/normalize.js';
import * as excel from '../../../src/utils/excel.js';
import * as schedParser from '../../../src/domain/schedules/schedule-parser.js';
import * as cron from '../../../src/domain/schedules/cronogram-parser.js';
import * as sched from '../../../src/domain/schedules/schedule-service.js';
import * as docs from '../../../src/config/doc-links.js';
import * as report from '../../../src/domain/tasks/task-report.js';
import * as recon from '../../../src/domain/tasks/task-reconciler.js';
import * as closure from '../../../src/domain/shifts/shift-closure-rules.js';
import * as endBtn from '../../../src/ui/components/end-shift-button.js';
import * as withdraw from '../../../src/domain/analytics/withdrawal-metrics.js';
import * as timeline from '../../../src/domain/shifts/timeline-service.js';
import * as formsubmit from '../../../src/services/external/formsubmit-notification-adapter.js';
import { fileURLToPath as __f2p } from 'node:url';
import __path from 'node:path';
import __fs from 'node:fs';
const __HERE = __path.dirname(__f2p(import.meta.url));
process.chdir(__path.resolve(__HERE, '../../..')); // raíz del repo
const __OUT = __path.join(__HERE, 'salida'); __fs.mkdirSync(__OUT, { recursive: true });


const results = [];
const ser = (v) => {
    if (v instanceof Date) return 'Date(' + (isNaN(v.getTime()) ? 'Invalid' : v.toISOString()) + ')';
    if (v === undefined) return 'undefined';
    try { return JSON.stringify(v, (k, x) => (x instanceof Date ? 'Date(' + (isNaN(x.getTime()) ? 'Invalid' : x.toISOString()) + ')' : x === undefined ? '__undef' : x)); } catch (e) { return String(v); }
};
const run = (fn) => { try { return { ok: true, v: fn() } } catch (e) { return { ok: false, v: 'THROW ' + e.message } } };

function compare(name, cases, appCall, modCall, nota = '') {
    let diffs = []; let n = 0;
    for (const c of cases) {
        n++;
        const a = run(() => appCall(c)); const m = run(() => modCall(c));
        const sa = ser(a.v), sm = ser(m.v);
        if (sa !== sm || a.ok !== m.ok) diffs.push({ entrada: ser(c).slice(0, 160), app: sa.slice(0, 200), modulo: sm.slice(0, 200) });
    }
    results.push({ name, casos: n, diferencias: diffs.length, ejemplos: diffs.slice(0, 3), todas: diffs, nota });
}

// ------------------------------------------------------------------ generador determinista
let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const STR = ['', ' ', 'Ana', 'ana', 'José Pérez', '  María  Sánchez ', 'ñandú', 'Ñ', '<b>"x"</b> & \'y\'', '<script>alert(1)</script>', 'a\'b', 'https://x.y/z?a=1&b=2', 'javascript:alert(1)', '//evil.com', 'mailto:a@b.co', 'ftp://x', ' JaVaScRiPt:x', 'data:text/html,1', 'Tarea 12', 'Tarea   7', 'tarea 3', '[EXTRA] Revisión', 'Set 1', 'SET 2 - Casino', 'Revisión de retiros (manual)', 'Revision de Retiros Manual', '¿Qué?', '100%', 'a  b\tc\nd', '😀', 'Luis Fuentes', 'Luis Alfredo Fuentes Martinez', 'Fuentes Luis', 'Sara', 'Sara Santamaría', 'Sebastian Arango', 'Sebastián Hincapié'];
const VALS = [...STR, null, undefined, 0, 1, 12, -3, 3.5, NaN, true, false, {}, [], ['a']];
const fuzzStr = (k) => Array.from({ length: k }, () => { let s = ''; const L = Math.floor(rnd() * 25); for (let i = 0; i < L; i++) s += pick(['a', 'á', 'B', ' ', '<', '>', '&', '"', "'", '/', ':', 'é', 'ñ', 'Ñ', '1', '-', '.', '(', ')', 'Ü', '\t']); return s; });
const ALL_STR = [...STR, ...fuzzStr(300)];
const ALL_VALS = [...VALS, ...fuzzStr(200)];

// ================================================================== 1. sanitización
{
    const A = loadAppFunctions(['escapeHTML', 'encodeInlineHandlerArg', 'sanitizeAnnouncementHref', 'sanitizeAnnouncementHTML']);
    compare('escapeHTML', ALL_VALS, (v) => A.escapeHTML(v), (v) => san.escapeHTML(v));
    compare('encodeInlineHandlerArg', ALL_VALS, (v) => A.encodeInlineHandlerArg(v), (v) => san.encodeInlineHandlerArg(v));
    compare('sanitizeAnnouncementHref', ALL_VALS, (v) => A.sanitizeAnnouncementHref(v), (v) => san.sanitizeAnnouncementHref(v));
    const HTML = [null, undefined, '', 'texto', '<p>Hola <b>mundo</b></p>', '<div>a</div><i>b</i>', '<a href="https://x.co" onclick="x()">l</a>', '<a href="javascript:alert(1)">x</a>',
        '<script>alert(1)</script>ok', '<style>p{}</style><p>z</p>', '<img src=x onerror=alert(1)>', '<ul><li>1</li><li>2<br>3</li></ul>', '<p>sin cerrar', '<b><i>anidado</b></i>',
        '<a href="mailto:a@b.co" title="t">m</a>', '<iframe src=x></iframe>after', '&lt;p&gt; &amp; &quot;', '<p>a & b < c > d</p>', '<svg><script>1</script></svg>', '<!-- c --><p>c</p>',
        '<P>Mayús</P>', '<a href=" https://x.co ">e</a>', '<a href="//evil">e</a>', '<strong>s</strong><em>e</em>', '<template><p>t</p></template>x', '<noscript>n</noscript>y',
        '<p style="color:red" class="c">st</p>', '<a href="/rel">r</a>', '<a href="#f">h</a>', '<br/><br>', '<object data=x></object>o', '<p>1</p>\n<p>2</p>', '<div><div>x</div></div>',
        '<a href="https://x.co"><b>neg</b></a>', '<em>&nbsp;</em>', '<p>emoji 😀</p>', '<a href="HTTPS://X.CO">u</a>', '<a href="java\nscript:x">nl</a>', '<a>sin href</a>', '<custom>c</custom>'];
    compare('sanitizeAnnouncementHTML', HTML, (v) => A.sanitizeAnnouncementHTML(v), (v) => san.sanitizeAnnouncementHTML(v), 'app.js usa el parser del navegador (<template>); el módulo usa un parser propio sin DOM. Aquí app.js corre con jsdom.');
}

// ================================================================== 2. capacidades de comunicados
{
    const A = loadAppFunctions(['canPublishComunicados', 'canViewComunicadoLecturas', 'canDeleteComunicados', 'canManageComunicados']);
    const ROLES = ['Admin', 'Supervisor', 'Gestor', 'Lider', 'admin', 'SUPERVISOR', '', null, undefined, 'Coordinador', 'Analista', 0, {}];
    for (const n of ['canPublishComunicados', 'canViewComunicadoLecturas', 'canDeleteComunicados', 'canManageComunicados']) compare(n, ROLES, (r) => A[n](r), (r) => caps[n](r));
}

// ================================================================== 3. normalización y nombres
{
    const A = loadAppFunctions(['normalizeName', 'namesMatch', 'cleanText', 'normalizeTaskName', 'taskNamesMatch', 'setNamesMatch', 'getShiftCategory']);
    compare('normalizeName', ALL_VALS, (v) => A.normalizeName(v), (v) => norm.normalizeName(v));
    compare('cleanText', ALL_VALS, (v) => A.cleanText(v), (v) => norm.cleanText(v));
    compare('normalizeTaskName', ALL_VALS, (v) => A.normalizeTaskName(v), (v) => norm.normalizeTaskName(v));
    const pairs = []; for (let i = 0; i < 1500; i++) pairs.push([pick(ALL_STR.concat([null, undefined])), pick(ALL_STR.concat([null, undefined]))]);
    const NAMES = ['Luis Fuentes', 'Luis Alfredo Fuentes Martinez', 'luis fuentes', 'Fuentes Luis', 'Luis', 'Sara Santamaría', 'Sara Santamaria', 'Sara', 'Sebastian Arango', 'Sebastian Hincapie', 'Sebastián', 'Juan Jose Diaz', 'Juan José Díaz Pérez', 'Maria Sanchez', 'María Sánchez.png', 'Ana Prueba', 'Al', 'Oriana Borja', 'oriana borja'];
    for (const a of NAMES) for (const b of NAMES) pairs.push([a, b]);
    compare('namesMatch', pairs, ([a, b]) => A.namesMatch(a, b), ([a, b]) => norm.namesMatch(a, b));
    const TASKS = ['Revisión de retiros', 'Revision de Retiros', 'Revisión de retiros (manual)', 'Monitoreo casino', 'Monitoreo de casino en vivo', 'Set 1', 'SET 1', 'Set 1 - Casino', 'Reporte diario', 'Reporte', 'Tarea 12', '', null, 'Validación KYC', 'Validacion kyc', 'Bonos', 'Abuso de bonos'];
    const tp = []; for (const a of TASKS) for (const b of TASKS) tp.push([a, b]); for (let i = 0; i < 800; i++) tp.push([pick(ALL_STR), pick(ALL_STR)]);
    compare('taskNamesMatch', tp, ([a, b]) => A.taskNamesMatch(a, b), ([a, b]) => norm.taskNamesMatch(a, b));
    compare('setNamesMatch', tp, ([a, b]) => A.setNamesMatch(a, b), ([a, b]) => norm.setNamesMatch(a, b));
    const SHIFTS = ['8am - 4pm', '3pm - 11pm', '7pm - 2am', '11pm - 7am', '08:00 - 16:00', '14:00 - 22:00', '22:00 - 06:00', 'Por Asignar', '', null, undefined, '6am - 2pm', '2pm - 10pm', '10pm - 6am', 'Descansa', 'DESCANSO', 'Vacaciones', 'Incapacidad', '7am-3pm', '9am - 5pm', '12pm - 8pm', 'Mañana', 'Tarde', 'Noche', 'madrugada', 'Teletrabajo 8am - 4pm', 5, '1pm - 9pm', '4pm - 12am'];
    compare('getShiftCategory', [...SHIFTS, ...fuzzStr(100)], (v) => A.getShiftCategory(v), (v) => schedParser.getShiftCategory(v));
}

// ================================================================== 4. fechas Excel
{
    const A = loadAppFunctions(['excelToJSDate', 'isSameDate']);
    const SER = [45000, 45678, 45678.5, 46000.999, 1, 0, -1, 60, 61, '45678', 'x', null, undefined, NaN, 46300, 25569, 45930];
    compare('excelToJSDate', SER, (v) => A.excelToJSDate(v), (v) => excel.excelToJSDate(v));
    const D = [new Date(2026, 9, 15), new Date(2026, 9, 15, 23, 59), new Date(2026, 0, 1), new Date('invalid'), new Date(2025, 11, 31)];
    const p = []; for (const s of SER) for (const d of D) p.push([s, d]);
    compare('isSameDate', p, ([s, d]) => A.isSameDate(s, d), ([s, d]) => excel.isSameDate(s, d));
}

// ================================================================== 5. cronograma (hojas, columnas, asignaciones)
{
    const A = loadAppFunctions(['parseSheetRange', 'getWeekSheet', 'getCronogramaColumnsForToday', 'getAssignedTasksForGestor']);
    const SHEETS = ['Semana 1 - 28 de Marzo al 3 de Abril', 'Semana 2 - 7 de Enero al 13 de Enero', 'Semana 3 - 14 de Feb al 20 de Feb', 'Semana 2 - 14 al 20 de Febrero', 'Semana 1 - 1 de Abril al 7 de Abril',
        'Semana 5 - 29 de Septiembre al 5 de Octubre', 'Semana 2 - 6 al 12 de Octubre', 'Semana 3 - 13 al 19 de octubre', 'Semana 4 - 20 al 26 de Oct', 'Semana 1 - 1 al 7 de Septiembre', 'Semana 6 - 27 de Oct al 2 de Nov',
        'GeneralData', '', null, 'Hoja1', 'Semana 2', 'semana 2 - 6 al 12 de octubre', 'Semana 2 – 6 al 12 de Octubre', 'Semana 2 - 6 al 12 de Setiembre', 'Semana 1 - 30 de Diciembre al 5 de Enero', 'Semana 10 - 1 al 7 de Mayo'];
    const sr = []; for (const s of SHEETS) for (const y of [2026, 2025]) for (const fm of [0, 9]) sr.push([s, y, fm]);
    compare('parseSheetRange', sr, ([s, y, fm]) => A.parseSheetRange(s, y, fm), ([s, y, fm]) => cron.parseSheetRange(s, y, fm));
    const DATES = [new Date(2026, 9, 15), new Date(2026, 9, 6), new Date(2026, 9, 12, 23), new Date(2026, 9, 26), new Date(2026, 3, 1), new Date(2026, 0, 13), new Date(2026, 11, 31), new Date(2026, 9, 30)];
    const ws = []; for (const d of DATES) { ws.push([SHEETS.filter(Boolean), d]); ws.push([['GeneralData', 'Hoja1'], d]); ws.push([[], d]); ws.push([SHEETS.slice(5, 11), d]); }
    compare('getWeekSheet', ws, ([s, d]) => A.getWeekSheet(s, d), ([s, d]) => cron.getWeekSheet(s, d));
    const ROWS = [
        [['Cronograma'], ['', 'Mañana', '', '', 'Tarde', '', '', 'Sábado', '', '', 'Domingo', ''], ['', 'Tarea', 'Gestor', '', 'Tarea', 'Gestor', '', 'Tarea', 'Gestor', '', 'Tarea', 'Gestor'],
            ['', 'Revisión de retiros', 'Luis Fuentes', '', 'Monitoreo casino', 'Sara Santamaría', '', 'Bonos', 'Luis Fuentes', '', 'KYC', 'Ana Prueba'],
            ['', 'Set 1', 'Luis Fuentes', '', 'Reporte diario', 'Luis', '', 'Cronograma x', 'Luis Fuentes', '', 'Abuso de bonos', 'Luis Fuentes'],
            ['', 'Validación KYC', 'Gestor', '', '  ', 'Luis Fuentes', '', 'Retiros', null, '', 'Bonos', 'luis fuentes']],
        [['x', 'y'], ['a', 'b', 'c']], [], [[null, undefined, 'TARDE'], ['mañana sabado', 'z', 'q']],
        [['', 'Domingo', 'g', 'Sábado', 'g2', 'Tarde', 'g3', 'Mañana', 'g4'], ['', 'T1', 'Luis Fuentes', 'T2', 'Luis Fuentes', 'T3', 'Luis Fuentes', 'T4', 'Luis Fuentes']]
    ];
    const cc = []; for (const r of ROWS) for (const d of DATES.concat([new Date(2026, 9, 17), new Date(2026, 9, 18)])) for (const s of ['8am - 4pm', '3pm - 11pm', null]) cc.push([d, s, r]);
    compare('getCronogramaColumnsForToday', cc, ([d, s, r]) => A.getCronogramaColumnsForToday(d, s, r), ([d, s, r]) => cron.getCronogramaColumnsForToday(d, s, r));
    // getAssignedTasksForGestor: app.js lee la global globalCronogramaData y la fecha de HOY; el módulo recibe rows y targetDate.
    const ga = []; for (const r of ROWS.concat([null])) for (const g of ['Luis Fuentes', 'Sara Santamaria', 'Ana Prueba', 'Nadie', '']) ga.push([g, '8am - 4pm', r]);
    compare('getAssignedTasksForGestor', ga, ([g, s, r]) => { A.__ctx.__set('globalCronogramaData', r); return A.getAssignedTasksForGestor(g, s); },
        ([g, s, r]) => cron.getAssignedTasksForGestor(g, s, r, new Date()), 'app.js usa la global globalCronogramaData y la fecha actual; el módulo las recibe como parámetros (rows, targetDate). Mismos datos inyectados.');
}

// ================================================================== 6. horario (Horario 2026.xlsx)
{
    const A = loadAppFunctions(['getShiftForDate', 'getScheduledGestoresCountForShift']);
    const serial = (y, m, d) => Math.round((Date.UTC(y, m, d) - Date.UTC(1899, 11, 30)) / 86400000);
    const week = (y, m, d0) => [0, 1, 2, 3, 4, 5, 6].map((i) => serial(y, m, d0 + i));
    const rows = [
        ['Semana', ...week(2026, 9, 12)], ['GESTOR', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
        ['Luis Fuentes', '8am - 4pm', '8am - 4pm', '3pm - 11pm', 'Descansa', '7pm - 2am', '', '8am - 4pm'],
        ['Sara Santamaría', '3pm - 11pm', '3pm - 11pm', '8am - 4pm', '8am - 4pm', null, 'Vacaciones', '3pm - 11pm'],
        ['Ana Prueba', '7pm - 2am', '11pm - 7am', '7pm - 2am', '7pm - 2am', '8am - 4pm', '8am - 4pm', ''],
        ['', '', ''],
        ['Semana', ...week(2026, 9, 19)], ['GESTOR', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
        ['Luis Fuentes', '3pm - 11pm', '3pm - 11pm', '3pm - 11pm', '3pm - 11pm', '3pm - 11pm', 'Descansa', 'Descansa'],
        ['Sara Santamaria', '8am - 4pm', '8am - 4pm', '8am - 4pm', '8am - 4pm', '8am - 4pm', 'Descansa', 'Descansa'],
        ['GESTOR', 'x']
    ];
    const strRows = [['Semana', '2026-10-12', '2026/10/13', 'x'], ['GESTOR', 'Lunes', 'Martes', 'Miércoles'], ['Luis Fuentes', 'A', 'B', 'C']];
    const blocks = [{ startRow: 0 }, { startRow: 6 }];
    const DATES = [new Date(2026, 9, 12), new Date(2026, 9, 15), new Date(2026, 9, 18), new Date(2026, 9, 20), new Date(2026, 9, 25), new Date(2026, 10, 3), new Date(2026, 10, 8), new Date(2026, 9, 13)];
    const gs = []; for (const d of DATES) for (const g of ['Luis Fuentes', 'Sara Santamaria', 'Ana Prueba', 'Nadie', 'Luis']) { gs.push([rows, blocks, g, d]); gs.push([strRows, [{ startRow: 0 }], g, d]); }
    gs.push([[], blocks, 'Luis Fuentes', DATES[0]]); gs.push([rows, [], 'Luis Fuentes', DATES[0]]); gs.push([null, null, 'x', DATES[0]]);
    compare('getShiftForDate', gs, (a) => A.getShiftForDate(...a), (a) => sched.getShiftForDate(...a));
    const sc = []; for (const d of DATES) for (const s of ['Mañana', 'Tarde', 'Noche', 'Madrugada', 'Descanso', 'Otro']) sc.push([s, d, rows, blocks]);
    sc.push(['Mañana', DATES[0], null, null]); sc.push(['Mañana', DATES[0], rows, []]);
    compare('getScheduledGestoresCountForShift', sc,
        ([s, d, r, b]) => { A.__ctx.__set('globalScheduleRows', r); A.__ctx.__set('globalScheduleBlocks', b); return A.getScheduledGestoresCountForShift(s, d); },
        ([s, d, r, b]) => sched.getScheduledGestoresCountForShift(s, r, b, schedParser.getShiftCategory, d),
        'app.js usa las globales globalScheduleRows/globalScheduleBlocks; el módulo las recibe como parámetros junto con getShiftCategory.');
}

// ================================================================== 7. enlaces de documentos
{
    const A = loadAppFunctions(['getDocUrl', 'getManualUrl']);
    const src = fs.readFileSync(APP_FILE, 'utf8');
    const keys = [...new Set((src.match(/"([^"\n]{2,80})"\s*:\s*"https:\/\/virtualsoftserv/g) || []).map((s) => s.split('"')[1]))];
    const files = [...keys, ...keys.map((k) => k.toLowerCase()), ...keys.map((k) => k + '.pdf'), 'no-existe.pdf', '', null, undefined, 'Manual Penka', 'Procesos/Manual_Usuario_Penka.html', 'Belatra', 'Playson', 'Egt.mp4'];
    compare('getDocUrl', files, (v) => A.getDocUrl(v), (v) => docs.getDocUrl(v), `${keys.length} claves leídas del propio app.js`);
    compare('getManualUrl', files, (v) => A.getManualUrl(v), (v) => docs.getManualUrl(v));
}

// ================================================================== 8. tareas: nombres, reportes, reconciliación, cachés
{
    const catalog = [{ id: 0, Tarea: 'Revisión de retiros', 'Set ': 'Set 1' }, { id: 1, Tarea: 'Monitoreo casino' }, { id: 12, Tarea: 'Validación KYC' }, { id: '7', Tarea: 'Bonos' }, { id: 15 }];
    const A = loadAppFunctions(['canonicalTaskId', 'isLegacyGenericTaskName', 'resolveTaskDisplayName', 'reconcileScheduledTaskWithSession', 'buildTaskReportSummaryText', 'mergeTaskCaches', 'computeLocalTaskMigrations'],
);
    A.__ctx.__set('allTasks', catalog);
    compare('canonicalTaskId', ALL_VALS, (v) => A.canonicalTaskId(v), (v) => report.canonicalTaskId(v));
    compare('isLegacyGenericTaskName', ALL_VALS.concat(['Tarea 1', ' Tarea 99 ', 'TAREA 5', 'Tarea 5a', 'Tarea', 'Tarea -1']), (v) => A.isLegacyGenericTaskName(v), (v) => report.isLegacyGenericTaskName(v));
    const ENT = [null, undefined, {}, { name: 'Revisión' }, { name: 'Tarea 12' }, { name: 'Tarea 99' }, { name: '' }, { name: 'Tarea 0' }, { name: 'Tarea 7' }, { name: 'Tarea 15' }];
    const KEYS = [0, '0', 12, '12', 99, '7', 7, 15, 'extra_1', null];
    const rd = []; for (const k of KEYS) for (const e of ENT) for (const useCat of [true, false]) rd.push([k, e, useCat]);
    compare('resolveTaskDisplayName', rd, ([k, e, u]) => A.resolveTaskDisplayName(k, e, u ? catalog : undefined), ([k, e, u]) => report.resolveTaskDisplayName(k, e, catalog),
        'app.js sin catálogo usa la global allTasks; al módulo se le pasa el mismo catálogo.');
    const sessions = [null, {}, { 0: { name: 'Tarea 0', status: 'Finalizada', observation: 'ok' }, extra_1: { name: '[EXTRA] Revisión de retiros', status: 'No Realizada' } },
        { a: { name: 'Monitoreo casino', status: 'En Proceso' } }, { 12: { name: 'Tarea 12', status: 'Finalizada' }, 13: null }, { x: { name: 'Validacion KYC' } }];
    const rc = []; for (const t of ['Revisión de retiros', 'Monitoreo casino', 'Validación KYC', 'Bonos', 'Nada', '']) for (const s of sessions) rc.push([t, s]);
    compare('reconcileScheduledTaskWithSession', rc, ([t, s]) => A.reconcileScheduledTaskWithSession(t, s, catalog), ([t, s]) => recon.reconcileScheduledTaskWithSession(t, s, catalog));
    const reports = [null, {}, { tasks: {} }, { tasks: { 0: { name: 'Tarea 0', status: 'finalizada', observation: 'x' }, extra_9: { name: '[EXTRA] Algo', status: 'No Realizada' }, 99: { status: 'Pendiente' } } },
        { reporte: '[ FINALIZADA ] - Tarea 12\nObservación: N/A\n\n=== BITÁCORA DE TIEMPOS ===\n- Almuerzo: inicio 1 fin 2' }, { reporte: 'texto libre' }, { tasks: { 12: null } },
        { reporte: '[ PENDIENTE ] - Tarea 7\nObservación: x\n[ FINALIZADA ] - Tarea 99\nObservación: y' }, { tasks: { extra_2: { status: 'Finalizada' } } }];
    compare('buildTaskReportSummaryText', reports, (r) => A.buildTaskReportSummaryText(r), (r) => report.buildTaskReportSummaryText(r, { catalog }),
        'app.js resuelve nombres con la global allTasks; al módulo se le pasa options.catalog.');
    const caches = [[null, null], [{}, {}], [{ 1: { status: 'Finalizada', updatedAt: 5 } }, { 1: { status: 'Pendiente', updatedAt: 9 } }],
        [{ 1: { status: 'Finalizada', updatedAt: 9 } }, { 1: { status: 'Pendiente', updatedAt: 5 } }], [{ 1: { status: 'Finalizada' } }, { 2: { status: 'Pendiente' } }],
        [{ 1: { status: 'En Proceso', updatedAt: 5 } }, { 1: { status: 'Finalizada', updatedAt: 5 } }], [{ extra_1: { name: 'x' } }, null], [null, { 3: { status: 'No Realizada', updatedAt: 1 } }],
        [{ 1: { status: 'Finalizada', lastUpdated: 9 } }, { 1: { status: 'Pendiente', lastUpdated: 5 } }]];
    compare('mergeTaskCaches', caches, ([l, r]) => A.mergeTaskCaches(l, r), ([l, r]) => recon.mergeTaskCaches(l, r));
    const mig = caches.map(([l, r]) => [A.mergeTaskCaches(l, r), r, 1000]);
    compare('computeLocalTaskMigrations', mig, ([m, r, n]) => A.computeLocalTaskMigrations(m, r, n), ([m, r, n]) => recon.computeLocalTaskMigrations(m, r, n));
}

// ================================================================== 9. cierre de turno: SET y botón
{
    const A = loadAppFunctions(['hasRealSetOptions', 'requiresSpecificSetSelection', 'restoreEndShiftButton']);
    const dom = new JSDOM('<!doctype html><body></body>');
    const mk = (opts, value) => { const s = dom.window.document.createElement('select'); for (const [v, t] of opts) { const o = dom.window.document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); } if (value !== undefined) s.value = value; return s; };
    const SELS = () => [null, undefined, mk([]), mk([['', 'Selecciona']]), mk([['all', 'Todos']]), mk([['', 'Selecciona'], ['Set 1', 'Set 1']], ''), mk([['', 'Selecciona'], ['Set 1', 'Set 1']], 'Set 1'),
        mk([['Todos', 'Todos'], ['Set 2', 'Set 2']], 'Todos'), mk([['general', 'General']]), mk([['N/A', 'N/A']]), { value: 'x', options: [] }];
    compare('hasRealSetOptions', SELS().map((s, i) => i), (i) => A.hasRealSetOptions(SELS()[i]), (i) => closure.hasRealSetOptions(SELS()[i]));
    compare('requiresSpecificSetSelection', SELS().map((s, i) => i), (i) => A.requiresSpecificSetSelection(SELS()[i]), (i) => closure.requiresSpecificSetSelection(SELS()[i]));
    const btn = () => ({ innerHTML: 'x', disabled: true });
    compare('restoreEndShiftButton', [['<i>a</i>'], [''], [undefined], [null]], ([h]) => { const b = btn(); A.restoreEndShiftButton(b, h); return b; }, ([h]) => { const b = btn(); endBtn.restoreEndShiftButton(b, h); return b; });
    compare('restoreEndShiftButton(sin botón)', [[null], [undefined]], ([b]) => A.restoreEndShiftButton(b, 'x'), ([b]) => endBtn.restoreEndShiftButton(b, 'x'));
}

// ================================================================== 10. KPIs de retiros
{
    const A = loadAppFunctions(['calculateEffectiveApprovalTime']);
    const T = (h, m) => new Date(2026, 9, 15, h, m).getTime();
    const cs = []; const vals = [null, undefined, 0, T(7, 0), T(8, 0), T(8, 30), T(9, 15), T(14, 0), T(23, 50), T(7, 59), 'x', NaN, new Date(2026, 9, 15, 8).toISOString()];
    for (const a of vals) for (const b of vals) for (const c of [null, T(8, 0), T(7, 0), T(9, 0)]) cs.push([a, b, c]);
    compare('calculateEffectiveApprovalTime', cs, (a) => A.calculateEffectiveApprovalTime(...a), (a) => withdraw.calculateEffectiveApprovalTime(...a));
}

// ================================================================== 11. bitácora y correo (firmas distintas)
{
    // pushTimelineEvent: app.js MUTA la global shiftTimeline y guarda riskOps_timeline en localStorage; el módulo devuelve una línea nueva (pura).
    const seqs = [[['Almuerzo', 'start'], ['Almuerzo', 'end']], [['Desayuno', 'start'], ['Inactividad', 'start'], ['Inactividad', 'end'], ['Desayuno', 'end']], [['Pausa de Turno', 'end']],
        [['Almuerzo', 'start'], ['Almuerzo', 'start'], ['Almuerzo', 'end']], [['X', 'otro']], []];
    compare('pushTimelineEvent', seqs, (seq) => {
        const A = loadAppFunctions(['pushTimelineEvent']); A.__ctx.__set('shiftTimeline', []);
        let t = 1000; const RealNow = Date.now; Date.now = () => (t += 1000);
        try { for (const [ty, ac] of seq) A.pushTimelineEvent(ty, ac); } finally { Date.now = RealNow; }
        return { timeline: A.__ctx.__get('shiftTimeline'), guardado: A.__store.get('riskOps_timeline') || null };
    }, (seq) => {
        let tl = []; let t = 1000; for (const [ty, ac] of seq) tl = timeline.pushTimelineEvent(tl, ty, ac, (t += 1000));
        return { timeline: tl, guardado: seq.length ? JSON.stringify(tl) : null };
    }, 'Para comparar, al módulo se le suma la escritura en localStorage que hace app.js (el módulo no la hace).');
    // appendFormSubmitCc
    compare('appendFormSubmitCc', [1, 2], () => { const A = loadAppFunctions(['appendFormSubmitCc']); const fd = new FormData(); A.appendFormSubmitCc(fd); return [...fd.entries()]; },
        () => { const fd = new FormData(); formsubmit.appendFormSubmitCc(fd); return [...fd.entries()]; });
}

fs.writeFileSync(__path.join(__OUT,'resultado-comparacion.json'), JSON.stringify(results, null, 1));
for (const r of results) {
    console.log(`${r.diferencias === 0 ? 'IGUAL ' : 'DIFIERE'} ${r.name.padEnd(36)} casos=${String(r.casos).padStart(5)} diferencias=${r.diferencias}${r.nota ? '  · ' + r.nota.slice(0, 80) : ''}`);
    for (const e of (process.env.ALL ? r.todas || r.ejemplos : r.ejemplos)) console.log(`        entrada=${e.entrada}\n        app=${e.app}\n        mod=${e.modulo}`);
}
