/**
 * Lógica pura de `loadExcelTasks()` (app.js 1343-1546): ids del catálogo maestro, filtro por asignaciones
 * del cronograma, tareas "mock" para asignaciones que no están en el maestro, agrupación por Set,
 * purga/inicialización del caché del Gestor y los textos del selector.
 *
 * Los efectos (fetch del XLSX, DOM, localStorage, migración a Firebase) quedan en
 * `controllers/task-loaders-controller.js`; las funciones de comparación de nombres se inyectan
 * (`taskNamesMatch`, `setNamesMatch` de `utils/normalize.js`) para no atar el módulo a un origen.
 */

import { canonicalTaskId } from './task-report.js';
import { EXTRA_TASK_KEY_PREFIX, TASK_STATUS } from '../../utils/constants.js';

/** Ruta del Excel maestro de tareas (app.js 1349). */
export const TASKS_EXCEL_PATH = 'Tareas Riesgo/Tareas de Riesgo.xlsx';

export const TASKS_LOADING_HTML =
    '<div style="padding: 20px; color: var(--text-secondary);"><i class="bx bx-loader-alt bx-spin"></i> Cargando Tareas...</div>';

export const TASKS_NO_ASSIGNMENTS_HTML =
    '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">No hay tareas asignadas en tu cronograma para el día de hoy.</div>';

export const TASKS_SELECT_SET_HTML =
    '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">Selecciona un SET en el menú desplegable para ver las tareas.</div>';

export const SET_SELECTOR_BASE_OPTIONS_HTML =
    '<option value="" disabled selected>Selecciona tu SET a trabajar...</option><option value="Todos">Mostrar Todos</option>';

/**
 * URL del Excel con parámetro anti-caché (app.js 1349).
 *
 * @param {number} nowMs
 * @returns {string}
 */
export function buildTasksExcelUrl(nowMs) {
    return encodeURI(TASKS_EXCEL_PATH) + '?t=' + nowMs;
}

/**
 * HTML del error de carga (app.js 1541-1544). `escape` es `escapeHTML`.
 *
 * @param {string} message
 * @param {(value: unknown) => string} escape
 * @returns {string}
 */
export function buildTasksLoadErrorHTML(message, escape) {
    return `<div style="padding: 20px; color: var(--danger);"><i class="bx bx-error-circle"></i> Error cargando tareas: ${escape(message)}</div>`;
}

/**
 * Asigna `id = índice` a cada fila del maestro (app.js 1356-1358). Muta las filas, como el original.
 *
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Array<Record<string, unknown>>} las mismas filas
 */
export function assignMasterRowIds(rows) {
    rows.forEach((row, idx) => {
        row.id = idx;
    });

    return rows;
}

/**
 * Set de una fila del maestro: columna "Set " (con espacio), "Set" u "Otros" (app.js 1385, 1427, 1451).
 *
 * @param {Record<string, unknown>} row
 * @returns {string}
 */
export function getRowSet(row) {
    return row['Set '] || row['Set'] || 'Otros';
}

/**
 * Turno resuelto desde el cronograma (app.js 1366-1374): si hay un turno real para hoy
 * (no "Por Asignar" ni "Descansa") se usa ese; si no, el del usuario o "Por Asignar".
 *
 * @param {string|undefined} userShift
 * @param {string|null|undefined} todayShift resultado de getShiftForDate (o null si no hay horario)
 * @returns {string}
 */
export function resolveGestorShift(userShift, todayShift) {
    let resolvedShift = userShift || 'Por Asignar';

    if (todayShift && todayShift !== 'Por Asignar' && todayShift !== 'Descansa') {
        resolvedShift = todayShift;
    }

    return resolvedShift;
}

/**
 * Generador de ids deterministas para tareas "mock" (app.js 1393-1404): hash de 32 bits de
 * `set::tarea` en minúsculas, mapeado al rango 10000-99998 y desplazado si ya está en uso.
 *
 * @param {Set<number>} usedMockIds ids ya usados (se actualiza)
 * @returns {(taskName: string, set: string) => number}
 */
export function createMockTaskIdGenerator(usedMockIds = new Set()) {
    return (taskName, set) => {
        const raw = `${(set || 'Otros').trim().toLowerCase()}::${(taskName || '').trim().toLowerCase()}`;
        let hash = 0;

        for (let i = 0; i < raw.length; i++) {
            hash = ((hash << 5) - hash) + raw.charCodeAt(i);
            hash |= 0;
        }

        let candidate = 10000 + (Math.abs(hash) % 89999);

        while (usedMockIds.has(candidate)) {
            candidate++;
        }

        usedMockIds.add(candidate);

        return candidate;
    };
}

/**
 * Filas que ve un Gestor: las del maestro que coinciden con alguna asignación del cronograma más una fila
 * "mock" por cada asignación que no existe en el maestro (app.js 1377-1432). Sin asignaciones → [].
 *
 * @param {Array<Record<string, unknown>>} masterRows filas con `id` ya asignado
 * @param {Array<{task: string, set: string}>|null} assignments
 * @param {{taskNamesMatch: Function, setNamesMatch: Function}} matchers
 * @returns {Array<Record<string, unknown>>}
 */
export function buildGestorTaskRows(masterRows, assignments, { taskNamesMatch, setNamesMatch }) {
    if (!(assignments && assignments.length > 0)) return [];

    // Filter the master json rows
    const filteredMasterRows = masterRows.filter((row) => {
        const set = getRowSet(row);
        const taskName = row['Tarea'];

        return assignments.some((assign) =>
            taskNamesMatch(assign.task, taskName) && setNamesMatch(assign.set, set)
        );
    });

    // Generate mock tasks for assignments that aren't in the master sheet
    const generatedMocks = [];
    const generateDeterministicMockTaskId = createMockTaskIdGenerator(new Set());

    assignments.forEach((assign) => {
        const hasMasterMatch = masterRows.some((row) =>
            taskNamesMatch(assign.task, row['Tarea']) && setNamesMatch(assign.set, getRowSet(row))
        );

        if (!hasMasterMatch) {
            generatedMocks.push({
                'Set ': assign.set,
                'Tarea': assign.task,
                'Detalle de Tarea': `Tarea de control rutinario: ${assign.task}. Realizar las verificaciones correspondientes según los lineamientos de Riesgo.`,
                'Horario': 'Durante el turno',
                'Día': 'Diario',
                'Instrucciones': '1. Realizar la validación de la tarea de acuerdo con el procedimiento estándar.\n2. Registrar cualquier anomalía en los canales oficiales.\n3. Marcar como completada en esta plataforma al finalizar.',
                'Documento / Video de Apoyo': '',
                id: generateDeterministicMockTaskId(assign.task, assign.set)
            });
        }
    });

    return [...filteredMasterRows, ...generatedMocks];
}

/**
 * Agrupa por Set sin duplicar nombres dentro del mismo Set en el árbol visual, y arma `allTasks` con TODAS
 * las filas (app.js 1436-1463).
 *
 * @param {Array<Record<string, unknown>>} processedRows
 * @returns {{tasksBySet: Record<string, Array<{id: unknown, name: unknown, detail: unknown, time: unknown, day: unknown}>>, allTasks: Array<Record<string, unknown>>}}
 */
export function groupTasksBySet(processedRows) {
    const tasksBySet = {};
    const allTasks = [];

    processedRows.forEach((row, index) => {
        const set = getRowSet(row);
        const taskName = row['Tarea'];
        const taskId = row.id !== undefined ? row.id : index;

        if (!tasksBySet[set]) tasksBySet[set] = [];

        // Check for duplicates in the visual tree
        const isDuplicate = tasksBySet[set].some((t) => t.name === taskName);

        if (!isDuplicate) {
            tasksBySet[set].push({
                id: taskId,
                name: taskName,
                detail: row['Detalle de Tarea'],
                time: row['Horario'],
                day: row['Día']
            });
        }

        allTasks.push({ ...row, id: taskId });
    });

    return { tasksBySet, allTasks };
}

/**
 * Purga del caché local las tareas huérfanas y estampa "En Proceso" en las asignadas que no tienen
 * entrada (app.js 1466-1493). MUTA `cache` en el sitio, como el original (otras partes de app.js
 * conservan la referencia).
 *
 * Las entradas `extra_*` nunca se purgan. La purga es solo local: no borra nada en Firebase.
 *
 * @param {Record<string, object>} cache caché `taskStateCache`
 * @param {Array<Record<string, unknown>>} processedRows
 * @param {number} now
 * @returns {{hasNewTasksToSync: boolean, cacheWasPurged: boolean}}
 */
export function reconcileGestorTaskCache(cache, processedRows, now) {
    let hasNewTasksToSync = false;
    const validAssignedIds = new Set(processedRows.map((row, index) => canonicalTaskId(row.id !== undefined ? row.id : index)));

    // Purgar tareas huérfanas o desactualizadas del caché local (evita que tareas de turnos pasados bloqueen el cierre)
    let cacheWasPurged = false;

    for (const cachedId in cache) {
        if (!validAssignedIds.has(cachedId) && !cachedId.startsWith(EXTRA_TASK_KEY_PREFIX)) {
            delete cache[cachedId];
            cacheWasPurged = true;
        }
    }

    processedRows.forEach((row, index) => {
        const taskId = canonicalTaskId(row.id !== undefined ? row.id : index);
        const taskName = row['Tarea'];

        if (!cache[taskId]) {
            cache[taskId] = {
                name: taskName,
                status: TASK_STATUS.IN_PROGRESS,
                observation: '',
                updatedAt: now
            };
            hasNewTasksToSync = true;
        }
    });

    return { hasNewTasksToSync, cacheWasPurged };
}

/**
 * Opciones del selector de Set (app.js 1499-1503): las dos opciones base más una por Set, ordenadas.
 *
 * @param {string[]} setsKeys llaves ya ordenadas
 * @param {(value: unknown) => string} escape
 * @returns {string}
 */
export function buildSetSelectorOptionsHTML(setsKeys, escape) {
    let html = SET_SELECTOR_BASE_OPTIONS_HTML;

    setsKeys.forEach((set) => {
        html += `<option value="${escape(set)}">${escape(set)}</option>`;
    });

    return html;
}

/**
 * Qué mostrar tras cargar según cuántos Sets hay (app.js 1521-1535): uno → se selecciona solo y se
 * dibuja; ninguno → aviso; varios → pedir selección.
 *
 * @param {string[]} setsKeys
 * @returns {{mode: 'single', set: string}|{mode: 'none', html: string}|{mode: 'choose', html: string}}
 */
export function decideSetSelectorView(setsKeys) {
    if (setsKeys.length === 1) return { mode: 'single', set: setsKeys[0] };
    if (setsKeys.length === 0) return { mode: 'none', html: TASKS_NO_ASSIGNMENTS_HTML };

    return { mode: 'choose', html: TASKS_SELECT_SET_HTML };
}

/**
 * Subconjunto a dibujar al cambiar el selector (app.js 1509-1519): "Todos" → todo; otro valor → ese Set.
 *
 * @param {Record<string, Array<object>>} tasksBySet
 * @param {string} value
 * @returns {Record<string, Array<object>>}
 */
export function selectTasksForSet(tasksBySet, value) {
    if (value === 'Todos') return tasksBySet;

    const filtered = {};
    filtered[value] = tasksBySet[value];

    return filtered;
}
