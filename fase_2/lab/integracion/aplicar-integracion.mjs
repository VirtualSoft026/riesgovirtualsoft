/**
 * Integración SOLO-LABORATORIO del refactor de turno (pausas, Pausa de Turno, cierre) en la copia de
 * staging de app.js. NO modifica el app.js del repositorio: `stage.mjs` lo aplica sobre
 * `C:\riskops-lab-fase2\site\app.js`, después de copiarlo.
 *
 * Cada sustitución exige que el texto de anclaje exista EXACTAMENTE UNA vez; si app.js cambia y un
 * ancla deja de coincidir, el laboratorio no arranca (falla ruidosa, nunca una integración a medias).
 * Todo lo agregado queda marcado con `[LAB-INTEGRACION]`.
 *
 * Requiere que el bundle (`RiskOps`) esté cargado ANTES de app.js (lo hace stage.mjs).
 *
 * Uso: import { integrateApp } from './aplicar-integracion.mjs'; const { source, applied } = integrateApp(texto);
 */

export const MARK = '[LAB-INTEGRACION]';
export const BLOCK_START = '// [LAB-INTEGRACION:INICIO]';
export const BLOCK_END = '// [LAB-INTEGRACION:FIN]';

const HELPER_BLOCK = `${BLOCK_START}
// Puente entre app.js (estado global de pausas) y RiskOps.shiftController (src/controllers/shift-controller.js).
function __labCurrentUid() {
    try {
        const u = JSON.parse(localStorage.getItem('riskOps_currentUser'));
        return u && u.uid ? u.uid : null;
    } catch (e) { return null; }
}

function __labSetSyncWarning(failed) {
    try {
        let el = document.getElementById('riskOpsSyncWarning');
        if (!el && failed) {
            el = document.createElement('div');
            el.id = 'riskOpsSyncWarning';
            el.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:99999;background:#b45309;color:#fff;padding:8px 12px;border-radius:8px;font-size:13px;';
            el.textContent = 'Sin sincronizar con el supervisor. Reintentando...';
            document.body.appendChild(el);
        }
        if (el) el.style.display = failed ? 'block' : 'none';
    } catch (e) {}
}

let __labShiftController = null;
function __shiftController() {
    if (__labShiftController) return __labShiftController;
    __labShiftController = RiskOps.shiftController.createShiftController({
        getUser: () => currentUser,
        getState: () => ({
            isLunchBreak, lunchStartTime, totalLunchTimeMs,
            isBreakfastBreak, breakfastStartTime, totalBreakfastTimeMs,
            isSplitShiftBreak, splitShiftStartTime, totalSplitShiftTimeMs
        }),
        applyState: (f) => {
            isLunchBreak = f.isLunchBreak; lunchStartTime = f.lunchStartTime; totalLunchTimeMs = f.totalLunchTimeMs;
            isBreakfastBreak = f.isBreakfastBreak; breakfastStartTime = f.breakfastStartTime; totalBreakfastTimeMs = f.totalBreakfastTimeMs;
            isSplitShiftBreak = f.isSplitShiftBreak; splitShiftStartTime = f.splitShiftStartTime; totalSplitShiftTimeMs = f.totalSplitShiftTimeMs;
        },
        reloadState: () => loadBreakState(),
        setUserFlag: (v) => {
            currentUser.hasSplitShift = v;
            localStorage.setItem('riskOps_currentUser', JSON.stringify(currentUser));
        },
        now: () => Date.now(),
        timeline: { push: (type, action) => pushTimelineEvent(type, action) },
        storage: { saveBreakState: () => saveBreakState() },
        sync: () => syncActiveSessionToFirebase(),
        onActivity: () => updateActivity(),
        ui: {
            getButton: (id) => document.getElementById(id),
            setSplitShiftVisible: (visible) => {
                const b = document.getElementById('toggleSplitShiftBtn');
                if (b) b.style.display = visible ? 'flex' : 'none';
            },
            notifyBlocked: (reason, message) => { if (message) alert(message); },
            setSyncWarning: (failed) => __labSetSyncWarning(failed),
            refreshSidebar: () => { if (typeof setupSidebar === 'function') setupSidebar(); }
        },
        logger: console
    });
    return __labShiftController;
}
${BLOCK_END}

`;

const NEW_SAVE_LOAD = `function saveBreakState() {
    // ${MARK} el estado se guarda con ownerUid (RiskOps.breakStateOwnership)
    localStorage.setItem('riskOps_breakState', JSON.stringify(RiskOps.breakStateOwnership.serializeBreakState({
        isLunchBreak, lunchStartTime, totalLunchTimeMs,
        isBreakfastBreak, breakfastStartTime, totalBreakfastTimeMs,
        isSplitShiftBreak, splitShiftStartTime, totalSplitShiftTimeMs
    }, __labCurrentUid())));
}

function loadBreakState() {
    try {
        // ${MARK} un estado de pausas guardado por OTRO usuario se descarta (no se hereda)
        const restored = RiskOps.breakStateOwnership.restoreBreakState(localStorage.getItem('riskOps_breakState'), __labCurrentUid());
        if (restored.status === RiskOps.breakStateOwnership.BREAK_STATE_RESTORE.OTHER_OWNER) {
            localStorage.removeItem('riskOps_breakState');
        } else if (!restored.discarded && restored.status !== RiskOps.breakStateOwnership.BREAK_STATE_RESTORE.EMPTY) {
            const parsed = restored.state;
            isLunchBreak = parsed.isLunchBreak || false;
            lunchStartTime = parsed.lunchStartTime || null;
            totalLunchTimeMs = parsed.totalLunchTimeMs || 0;
            isBreakfastBreak = parsed.isBreakfastBreak || false;
            breakfastStartTime = parsed.breakfastStartTime || null;
            totalBreakfastTimeMs = parsed.totalBreakfastTimeMs || 0;
            isSplitShiftBreak = parsed.isSplitShiftBreak || false;
            splitShiftStartTime = parsed.splitShiftStartTime || null;
            totalSplitShiftTimeMs = parsed.totalSplitShiftTimeMs || 0;
        }
    } catch(e) {}
}
`;

const TOGGLE_BREAKFAST_LUNCH = `// Lógica de Desayuno y Almuerzo — ${MARK} delega en RiskOps.shiftController
function toggleBreakfastBreak() { return __shiftController().toggleBreakfast(); }

function toggleLunchBreak() { return __shiftController().toggleLunch(); }

`;

const TOGGLE_SPLIT = `// Lógica de Pausa Turno Partido — ${MARK} delega en RiskOps.shiftController
// (iniciar exige users/{uid}/hasSplitShift === true; retomar siempre se permite)
function toggleSplitShiftBreak() { return __shiftController().toggleSplitShift(); }

`;

/** Cada paso: nombre, qué buscar (texto exacto o [inicio, fin) entre marcadores) y con qué reemplazar. */
const STEPS = [
    {
        name: 'estado de pausas por usuario (save/load)',
        start: 'function saveBreakState() {',
        end: '\nloadBreakState();\n',
        endInclusive: false,
        replace: () => HELPER_BLOCK + NEW_SAVE_LOAD
    },
    {
        name: 'listener storage repinta botones',
        exact: `window.addEventListener('storage', (e) => {
    if (e.key === 'riskOps_breakState') {
        loadBreakState();
    }
});`,
        replace: () => `window.addEventListener('storage', (e) => {
    if (e.key === 'riskOps_breakState') {
        // ${MARK} recarga el estado Y repinta botones/visibilidad (antes solo actualizaba variables)
        __shiftController().handleStorageChange(e.key);
    }
});`
    },
    {
        name: 'listener en vivo de hasSplitShift',
        start: '                if (currentUser.hasSplitShift !== newVal) {',
        end: '                        setupSidebar();\n                    }\n                }\n',
        endInclusive: true,
        replace: () => `                // ${MARK} si se revoca con la pausa en curso, "Retomar Turno" sigue visible
                __shiftController().handleFlagChange(newVal);
`
    },
    {
        name: 'latido: estado y campos de la Pausa de Turno',
        start: '    if (isSplitShiftBreak) {\n        currentStatus = \'En Pausa de Turno\';',
        end: "        currentStatus = 'En Línea';\n    }\n",
        endInclusive: true,
        replace: () => `    // ${MARK} estado y campos de la Pausa de Turno desde RiskOps.shiftController
    const __live = __shiftController().describeLiveSession(isInactive);
    currentStatus = __live.status;
`
    },
    {
        // 2026-10-14: app.js delega sessionMetadata a RiskOps.taskSessionSync.buildSessionMetadata (con fallback
        // inline), así que el ancla ya no es el literal del objeto. Los dos campos de la Pausa de Turno se agregan
        // al objeto ya construido, justo antes de enviarlo: cubren la ruta delegada y la de respaldo por igual.
        name: 'latido: payload con splitShiftStartTime y total',
        exact: '    const syncPromise = database.ref(`active_sessions/${uid}`).update(sessionMetadata);',
        replace: () => `    sessionMetadata.splitShiftStartTime = __live.splitShiftStartTime; // ${MARK}
    sessionMetadata.totalSplitShiftTimeMs = __live.totalSplitShiftTimeMs; // ${MARK}
    const syncPromise = database.ref(\`active_sessions/\${uid}\`).update(sessionMetadata);`
    },
    {
        name: 'latido: aviso visible si no se pudo sincronizar',
        exact: '    syncPromise.catch(e => console.error("Error syncing active session via SDK:", e));',
        replace: () => `    syncPromise.catch(e => console.error("Error syncing active session via SDK:", e));
    syncPromise.then(() => __labSetSyncWarning(false), () => __labSetSyncWarning(true)); // ${MARK}`
    },
    {
        name: 'botones de desayuno y almuerzo',
        start: '// Lógica de Desayuno\nfunction toggleBreakfastBreak() {',
        end: 'async function persistShiftClosureCore(',
        endInclusive: false,
        replace: () => TOGGLE_BREAKFAST_LUNCH
    },
    {
        name: 'botón de Pausa de Turno',
        start: '// Lógica de Pausa Turno Partido\nfunction toggleSplitShiftBreak() {',
        end: 'async function handleEndShift() {',
        endInclusive: false,
        replace: () => TOGGLE_SPLIT
    },
    {
        name: 'cierre: cerrar pausas abiertas',
        exact: `        if (isLunchBreak) toggleLunchBreak();
        if (isBreakfastBreak) toggleBreakfastBreak();
        if (isSplitShiftBreak) toggleSplitShiftBreak();`,
        replace: () => `        // ${MARK} cierra almuerzo, desayuno y Pausa de Turno abiertos (retomar siempre se permite)
        __shiftController().closeOpenBreaks();`
    },
    {
        name: 'cierre: cálculo de tiempos con la pausa descontada',
        start: '            // Calculo de tiempos tomados\n',
        end: '            const effectiveHours = Math.max(0, (effectiveShiftMs / (1000 * 60 * 60))).toFixed(2);\n',
        endInclusive: true,
        replace: () => `            // ${MARK} tiempos de cierre desde RiskOps.shiftController (la Pausa de Turno NO es tiempo trabajado)
            // D1: horas efectivas = turno - almuerzo - desayuno - Pausa de Turno - inactividad (fórmula única,
            // la misma del panel); la penalidad se calcula igual que antes y solo se informa.
            let inactividadMins = 0;
            if (shiftTimeline && shiftTimeline.length > 0) {
                shiftTimeline.forEach(ev => {
                    if (ev.type === 'Inactividad') {
                        let eTime = ev.end ? ev.end : Date.now();
                        inactividadMins += (eTime - ev.start) / (1000 * 60);
                    }
                });
            }
            // Inactividad que se RESTA: la de la bitácora consolidada (= inactividadTotalMins del reporte guardado)
            const __inactividadLimpiaMins = RiskOps.shiftReportBuilder.sumCleanInactivityMinutes(
                RiskOps.timelineService.consolidateTimeline(shiftTimeline, { defaultEndMs: endDate.getTime() }),
                endDate.getTime()
            );
            const __closure = __shiftController().computeShiftClosure({
                loginMs: loginDate.getTime(),
                endMs: endDate.getTime(),
                inactivityMins: inactividadMins,
                cleanInactivityMins: __inactividadLimpiaMins
            });
            const lunchMinutes = __closure.times.lunchMinutes;
            const breakfastMinutes = __closure.times.breakfastMinutes;
            let penalidadConectividadMins = __closure.times.penaltyMins;
`
    },
    {
        // 2026-10-14: app.js delega los campos del correo a RiskOps.shiftReportBuilder.buildClosureEmailTimeFields
        // (bloque [Fase 2] con fallback). En el laboratorio los campos salen de __closure (shiftController, D1), que
        // ya incluye la Pausa de Turno; el bloque completo se sustituye porque su respaldo usa `effectiveHours`, que
        // el paso anterior reemplaza por el cálculo de __closure.
        name: 'cierre: campos de tiempos del correo',
        start: '            // [Fase 2] Delegado a shiftReportBuilder.buildClosureEmailTimeFields\n',
        end: '            _emailFields.forEach(([k, v]) => formData.append(k, v));\n',
        endInclusive: true,
        replace: () => `            __closure.emailFields.forEach(([campo, valor]) => formData.append(campo, valor)); // ${MARK}
`
    },
    {
        name: 'barra lateral: visibilidad del botón de Pausa de Turno',
        exact: `        if (toggleSplitShiftBtn && currentUser.hasSplitShift === true) {
            toggleSplitShiftBtn.style.display = 'flex';
        }`,
        replace: () => `        if (toggleSplitShiftBtn) {
            __shiftController().refreshSplitShiftButton(); // ${MARK} visible con flag o con pausa en curso
        }`
    },
    {
        name: 'navegación: visibilidad del botón de Pausa de Turno',
        exact: `        toggleSplitShiftBtn.style.display = (currentUser.hasSplitShift === true) ? 'flex' : 'none';`,
        replace: () => `        __shiftController().refreshSplitShiftButton(); // ${MARK} visible con flag o con pausa en curso`
    },
    {
        name: 'carga de página: restaurar botones de pausa',
        start: '    // Restaurar botones de pausas\n    const btnLunch',
        end: '    const periodoSelect = document.getElementById(\'kpiPeriodoSelect\');',
        endInclusive: false,
        replace: () => `    // Restaurar botones de pausas — ${MARK}
    __shiftController().restoreOnLoad();

`
    }
];

function occurrences(text, needle) {
    let n = 0;
    let i = text.indexOf(needle);
    while (i !== -1) { n += 1; i = text.indexOf(needle, i + needle.length); }
    return n;
}

/**
 * Aplica una lista de pasos sobre el texto (LF). Cada paso: `{ name, exact | start+end(+endInclusive), replace() }`.
 *
 * @param {string} text
 * @param {Array<object>} steps
 * @param {string[]} applied acumulador de nombres
 * @returns {string}
 */
export function applySteps(text, steps, applied = []) {
    for (const step of steps) {
        if (step.exact !== undefined) {
            const n = occurrences(text, step.exact);
            if (n !== 1) throw new Error(`Integración "${step.name}": el ancla aparece ${n} veces (se esperaba 1). app.js cambió; actualiza el paso en fase_2/lab/integracion/.`);
            text = text.replace(step.exact, () => step.replace());
        } else {
            const nStart = occurrences(text, step.start);
            if (nStart !== 1) throw new Error(`Integración "${step.name}": el ancla de inicio aparece ${nStart} veces (se esperaba 1).`);
            const s = text.indexOf(step.start);
            const e = text.indexOf(step.end, s);
            if (e < 0) throw new Error(`Integración "${step.name}": no se encontró el ancla de fin.`);
            const cut = step.endInclusive ? e + step.end.length : e;
            text = text.slice(0, s) + step.replace() + text.slice(cut);
        }
        applied.push(step.name);
    }

    return text;
}

/**
 * @param {string} source Texto de app.js (CRLF o LF).
 * @param {Array<object>} [extraSteps] Pasos de otros cortes (`fase_2/lab/integracion/pasos/*.mjs`), aplicados DESPUÉS
 *   de los del controlador de turno, sobre el texto ya integrado. Sus anclas no deben solaparse con las de otros pasos.
 * @returns {{source: string, applied: string[], eol: string}}
 */
export function integrateApp(source, extraSteps = []) {
    const eol = source.includes('\r\n') ? '\r\n' : '\n';
    let text = source.replace(/\r\n/g, '\n');
    const applied = [];

    if (text.includes(MARK)) throw new Error('app.js ya contiene la integración del laboratorio; parte siempre del app.js del repo.');

    text = applySteps(text, STEPS, applied);
    text = applySteps(text, extraSteps, applied);

    return { source: eol === '\r\n' ? text.replace(/\n/g, '\r\n') : text, applied, eol };
}

/**
 * Carga los pasos de cada archivo `pasos/*.mjs` (exportan `STEPS`), en orden alfabético.
 *
 * @param {string} dir Carpeta con los archivos de pasos.
 * @returns {Promise<Array<object>>}
 */
export async function loadExtraSteps(dir) {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const url = await import('node:url');

    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter((name) => name.endsWith('.mjs')).sort();
    const all = [];

    for (const file of files) {
        const mod = await import(url.pathToFileURL(path.join(dir, file)).href);
        if (Array.isArray(mod.STEPS)) all.push(...mod.STEPS);
    }

    return all;
}
