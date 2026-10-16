/**
 * Cargadores de datos de la pestaña de trabajo: tareas del Excel maestro (`loadExcelTasks()`, app.js
 * 1343-1546), horario (`loadSchedule()`, 1548-1766), teletrabajo (`loadTeletrabajo()`, 1768-1892),
 * historial de permisos (`loadPermisos()`, 1894-1963) y su modal de detalle (`openPermisoDetailModal()`,
 * 1966-2061).
 *
 * Toda la lógica pura (parseo de hojas, bloques, filtros, HTML) vive en `domain/tasks/*` y `ui/views/*`;
 * aquí queda la orquestación con efectos, con inyección de dependencias: `fetch`, SheetJS (`XLSX`),
 * DOM, Firebase, cachés y estado global de app.js entran por `deps`.
 */

import {
    buildScheduleExcelUrl, findScheduleBlocks, findDefaultScheduleBlockRow, listScheduleGestores,
    buildWeekSelectorOptionsHTML, resolveScheduleColumnCount, buildScheduleHeadHTML, buildScheduleRowsHTML
} from '../domain/tasks/schedule-sheet.js';
import {
    buildTeleworkExcelUrl, findTeleworkBlocks, listTeleworkGestores, buildTeleworkWeekOptionsHTML,
    TELEWORK_TABLE_HEAD_HTML, buildTeleworkRowsHTML, TELEWORK_LOAD_ERROR_ROW_HTML
} from '../domain/tasks/teletrabajo-sheet.js';
import {
    TASKS_LOADING_HTML, buildTasksExcelUrl, buildTasksLoadErrorHTML, assignMasterRowIds, resolveGestorShift,
    buildGestorTaskRows, groupTasksBySet, reconcileGestorTaskCache, buildSetSelectorOptionsHTML,
    decideSetSelectorView, selectTasksForSet
} from '../domain/tasks/task-catalog.js';
import {
    PERMISSIONS_HISTORY_EMPTY_HTML, PERMISSIONS_NONE_REGISTERED_HTML, resolvePermissionsQueryUid,
    selectVisiblePermissions, buildPermissionHistoryItemHTML, buildPermissionDetailHTML
} from '../ui/views/permission-history-view.js';

/**
 * @param {{
 *   fetchFn: (url: string) => Promise<{ok: boolean, status: number, arrayBuffer: () => Promise<ArrayBuffer>}>,
 *   XLSX: {read: Function, utils: {sheet_to_json: Function}},
 *   doc: {getElementById: Function, querySelector: Function},
 *   now?: () => number,
 *   newDate?: () => Date,
 *   getUser: () => (object|null),
 *   persistUser: (user: object) => void,
 *   getScheduleRows: () => (unknown[][]|null),
 *   getScheduleBlocks: () => (Array<object>|null),
 *   setSchedule: (rows: unknown[][], blocks: Array<object>) => void,
 *   getShiftForDate: (rows: unknown[][], blocks: Array<object>, name: string, date: Date) => string,
 *   normalizeName: Function, namesMatch: Function, taskNamesMatch: Function, setNamesMatch: Function,
 *   escape: (value: unknown) => string,
 *   encodeArg?: Function,
 *   multiSelect: {setup: (id: string, options: string[], onChange: Function) => void, getValues: (id: string) => string[]},
 *   loadCronogramaAssignments: (name: string, shift: string) => Promise<unknown>,
 *   getCronogramaAssignments: () => (Array<{task: string, set: string}>|null),
 *   getTaskCache: () => Record<string, object>,
 *   saveTaskCache?: (cache: object) => void,
 *   repository: {migrateLocalTasksToActiveSession: Function, removeActiveSessionTasks?: (uid: string, taskIds: string[]) => Promise<void>},
 *   setAllTasks: (tasks: Array<object>) => void,
 *   renderTree: (tasksBySet: object) => void,
 *   syncActiveSession: () => unknown,
 *   database: {ref: (path: string) => any},
 *   getAuthUid: () => (string|null|undefined),
 *   alert?: (message: string) => void,
 *   logger?: {log: Function, error: Function}
 * }} deps
 */
export function createTaskLoadersController(deps) {
    const {
        fetchFn, XLSX, doc, now = Date.now, newDate = () => new Date(), getUser, persistUser,
        getScheduleRows, getScheduleBlocks, setSchedule, getShiftForDate,
        normalizeName, namesMatch, taskNamesMatch, setNamesMatch, escape, encodeArg, multiSelect,
        loadCronogramaAssignments, getCronogramaAssignments, getTaskCache, saveTaskCache = () => {}, repository,
        setAllTasks, renderTree, syncActiveSession, database, getAuthUid, logger = console
    } = deps;
    const alertFn = deps.alert || (() => {});
    let allLoadedPermissions = [];

    // ------------------------------------------------------------------ tareas del Excel maestro
    /** Carga el Excel maestro, filtra por el cronograma si es Gestor y dibuja el selector de Set. */
    async function loadExcelTasks() {
        const treeContainer = doc.querySelector('.tree-container');

        if (treeContainer) treeContainer.innerHTML = TASKS_LOADING_HTML;

        try {
            const url = buildTasksExcelUrl(now());
            const response = await fetchFn(url);

            logger.log(`XLSX_FETCH url=${url} status=${response.status}`);

            if (!response.ok) throw new Error('Error HTTP ' + response.status);

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            // Assign ID to all master tasks in json
            assignMasterRowIds(json);

            const currentUser = getUser();
            let processedRows = [];

            if (currentUser && currentUser.role === 'Gestor') {
                // Turno real de hoy desde el horario ya parseado (no el valor viejo de localStorage)
                const scheduleRows = getScheduleRows();
                const scheduleBlocks = getScheduleBlocks();
                let todayShift = null;

                if (scheduleRows && scheduleBlocks && scheduleBlocks.length > 0) {
                    todayShift = getShiftForDate(scheduleRows, scheduleBlocks, currentUser.name, newDate());
                }

                const resolvedShift = resolveGestorShift(currentUser.shift, todayShift);

                // Load cronograma assignments using the resolved real shift
                await loadCronogramaAssignments(currentUser.name, resolvedShift);

                processedRows = buildGestorTaskRows(json, getCronogramaAssignments(), { taskNamesMatch, setNamesMatch });
            } else {
                // Admin/Supervisor or other roles see everything
                processedRows = json;
            }

            // Transform the data, group by Set
            const { tasksBySet, allTasks } = groupTasksBySet(processedRows);
            setAllTasks(allTasks);

            // Inicializar estado 'En Proceso' para las tareas asignadas del gestor y purgar huérfanas
            if (currentUser && currentUser.role === 'Gestor' && Array.isArray(processedRows)) {
                const taskStateCache = getTaskCache();
                const { hasNewTasksToSync, cacheWasPurged, purgedTaskIds } = reconcileGestorTaskCache(taskStateCache, processedRows, now());

                if (hasNewTasksToSync || cacheWasPurged) {
                    try {
                        saveTaskCache(taskStateCache);
                    } catch (e) {}

                    if (currentUser.uid && hasNewTasksToSync) {
                        try {
                            await repository.migrateLocalTasksToActiveSession(currentUser.uid, taskStateCache, {});
                        } catch (syncErr) {
                            logger.error('Error al sincronizar tareas iniciales En Proceso:', syncErr);
                        }
                    }
                }

                // Reflejar la purga también en Firebase (W-26, como `main`): sin esto, active_sessions/{uid}/tasks
                // acumula las entradas huérfanas y una recarga posterior las trae de vuelta. Best-effort: un
                // fallo aquí no bloquea la carga de tareas.
                if (currentUser.uid && purgedTaskIds.length > 0 && typeof repository.removeActiveSessionTasks === 'function') {
                    try {
                        await repository.removeActiveSessionTasks(currentUser.uid, purgedTaskIds);
                    } catch (purgeErr) {
                        logger.error('Error al limpiar en Firebase las tareas huérfanas del caché:', purgeErr);
                    }
                }
            }

            // Populate Set Selector
            const select = doc.getElementById('activeSetSelect');

            if (select) {
                const setsKeys = Object.keys(tasksBySet).sort();
                select.innerHTML = buildSetSelectorOptionsHTML(setsKeys, escape);

                // Clone select to remove old event listeners
                const newSelect = select.cloneNode(true);
                select.parentNode.replaceChild(newSelect, select);

                newSelect.addEventListener('change', (e) => {
                    renderTree(selectTasksForSet(tasksBySet, e.target.value));
                });

                const view = decideSetSelectorView(setsKeys);

                if (view.mode === 'single') {
                    newSelect.value = view.set;
                    renderTree(selectTasksForSet(tasksBySet, view.set));
                } else {
                    const container = doc.querySelector('.tree-container');

                    if (container) container.innerHTML = view.html;
                }
            }
        } catch (err) {
            logger.error('Error loading tasks:', err);

            const container = doc.querySelector('.tree-container');

            if (container) container.innerHTML = buildTasksLoadErrorHTML(err.message, escape);
        }
    }

    // ------------------------------------------------------------------ horario
    /** Carga el horario personal, selector de semana/gestores y pinta el bloque de hoy. */
    async function loadSchedule() {
        try {
            const url = buildScheduleExcelUrl(now());
            const response = await fetchFn(url);

            logger.log(`XLSX_FETCH url=${url} status=${response.status}`);

            if (!response.ok) throw new Error('Fallo red');

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            const allScheduleBlocks = findScheduleBlocks(rows);

            setSchedule(rows, allScheduleBlocks);

            if (allScheduleBlocks.length === 0) return; // No hay datos válidos

            const tableHead = doc.getElementById('scheduleTableHead');
            const tableBody = doc.getElementById('scheduleTableBody');

            if (tableHead && tableBody && rows.length > 2) {
                const weekSelector = doc.getElementById('weekSelector');

                // Encontrar el bloque correspondiente a hoy (o el último)
                const defaultBlockRow = findDefaultScheduleBlockRow(rows, allScheduleBlocks, newDate());
                const sortedGestores = listScheduleGestores(rows, allScheduleBlocks);

                multiSelect.setup('scheduleGestorMultiSelect', sortedGestores, () => {
                    renderScheduleBlock(parseInt(weekSelector ? weekSelector.value : defaultBlockRow));
                });

                if (weekSelector) {
                    weekSelector.innerHTML = buildWeekSelectorOptionsHTML(allScheduleBlocks, escape);
                    weekSelector.value = defaultBlockRow;
                    weekSelector.addEventListener('change', (e) => {
                        renderScheduleBlock(parseInt(e.target.value));
                    });
                }

                // Renderizar el bloque inicial
                renderScheduleBlock(defaultBlockRow);

                function renderScheduleBlock(blockStartRow) {
                    const dateRow = rows[blockStartRow];
                    const dayRow = rows[blockStartRow + 1];
                    const selectedList = multiSelect.getValues('scheduleGestorMultiSelect');
                    const numCols = resolveScheduleColumnCount(dateRow);

                    tableHead.innerHTML = buildScheduleHeadHTML(dateRow, dayRow, numCols, escape);

                    tableBody.innerHTML = '';

                    const currentUser = getUser();
                    const sink = { html: '' };

                    try {
                        buildScheduleRowsHTML({
                            rows,
                            blockStartRow,
                            numCols,
                            selectedList,
                            currentUser,
                            getShiftForToday: (gestorName) => getShiftForDate(rows, allScheduleBlocks, gestorName, newDate()),
                            escape,
                            normalizeName,
                            namesMatch,
                            sink,
                            // Efectos de la fila del usuario actual: en el original ocurren dentro del bucle
                            onCurrentUserShift: (badgeShift) => {
                                const userRoleEl = doc.getElementById('userRole');

                                if (userRoleEl) userRoleEl.textContent = `${currentUser.role} | Turno: ${badgeShift}`;

                                const headerShiftBadge = doc.querySelector('.shift-badge');

                                if (headerShiftBadge) headerShiftBadge.textContent = `TURNO: ${badgeShift}`;

                                // Guardar el turno en currentUser y sincronizar a Firebase
                                if (currentUser.shift !== badgeShift) {
                                    currentUser.shift = badgeShift;
                                    persistUser(currentUser);
                                    syncActiveSession();
                                    loadExcelTasks();
                                }
                            }
                        });
                    } finally {
                        tableBody.innerHTML = sink.html; // las filas ya construidas quedan visibles aunque una posterior falle
                    }
                }
            }
        } catch (e) {
            logger.log('No se pudo cargar el horario', e);
        }
    }

    // ------------------------------------------------------------------ teletrabajo
    /** Carga el Excel de teletrabajo; devuelve la promesa para poder esperarla en pruebas. */
    function loadTeletrabajo() {
        return fetchFn(buildTeleworkExcelUrl(now()))
            .then((res) => { logger.log(`XLSX_TELEWORK_FETCH status=${res.status}`); return res; })
            .then((res) => {
                if (!res.ok) throw new Error('No se encontró el archivo de Teletrabajo');

                return res.arrayBuffer();
            })
            .then((data) => {
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

                const allBlocks = findTeleworkBlocks(rows);

                if (allBlocks.length === 0) return;

                const weekSelector = doc.getElementById('teletrabajoWeekSelector');
                const tableHead = doc.getElementById('teletrabajoTableHead');
                const tableBody = doc.getElementById('teletrabajoTableBody');

                const sortedTeleGestores = listTeleworkGestores(allBlocks);
                const defaultBlockIdx = allBlocks.length - 1;

                multiSelect.setup('teletrabajoGestorMultiSelect', sortedTeleGestores, () => {
                    renderTeletrabajoBlock(allBlocks[weekSelector ? weekSelector.value : defaultBlockIdx]);
                });

                if (weekSelector) {
                    weekSelector.innerHTML = buildTeleworkWeekOptionsHTML(allBlocks, escape);
                    weekSelector.value = defaultBlockIdx;
                    weekSelector.addEventListener('change', (e) => {
                        renderTeletrabajoBlock(allBlocks[e.target.value]);
                    });

                    renderTeletrabajoBlock(allBlocks[defaultBlockIdx]);
                }

                function renderTeletrabajoBlock(block) {
                    const selectedList = multiSelect.getValues('teletrabajoGestorMultiSelect');

                    tableHead.innerHTML = TELEWORK_TABLE_HEAD_HTML;
                    tableBody.innerHTML = '';
                    tableBody.innerHTML = buildTeleworkRowsHTML({
                        block, selectedList, currentUser: getUser(), escape, normalizeName, namesMatch
                    });
                }
            })
            .catch((err) => {
                logger.error('Error cargando Teletrabajo:', err);

                const tb = doc.getElementById('teletrabajoTableBody');

                if (tb) tb.innerHTML = TELEWORK_LOAD_ERROR_ROW_HTML;
            });
    }

    // ------------------------------------------------------------------ permisos
    /** Historial de permisos desde Firebase (Admin/Supervisor ven todos; el resto, solo los suyos). */
    async function loadPermisos() {
        try {
            const currentUser = getUser();
            let permissionsRef = database.ref('permissions');
            const queryUid = resolvePermissionsQueryUid(currentUser, getAuthUid); // getAuthUid se evalúa solo si el usuario no trae uid (como el original)

            if (queryUid) permissionsRef = permissionsRef.orderByChild('uid').equalTo(queryUid);

            const snapshot = await permissionsRef.once('value');
            const historicoContainer = doc.getElementById('historicoPermisosList');

            if (!historicoContainer) return;

            historicoContainer.innerHTML = '';

            if (snapshot.exists()) {
                const { all, visible } = selectVisiblePermissions(snapshot.val(), currentUser);
                allLoadedPermissions = all;

                if (visible.length === 0) {
                    historicoContainer.innerHTML = PERMISSIONS_HISTORY_EMPTY_HTML;

                    return;
                }

                visible.forEach((p) => {
                    historicoContainer.innerHTML += buildPermissionHistoryItemHTML(p);
                });
            } else {
                historicoContainer.innerHTML = PERMISSIONS_NONE_REGISTERED_HTML;
            }
        } catch (e) {
            logger.error('No se pudo cargar permisos desde Firebase', e);
        }
    }

    /** Modal de detalle completo de un permiso (usa el caché del historial o lee de Firebase). */
    async function openPermisoDetailModal(fbId) {
        let perm = allLoadedPermissions.find((p) => p.fb_id === fbId);

        if (!perm) {
            try {
                const snap = await database.ref('permissions/' + fbId).once('value');

                if (snap.exists()) perm = { ...snap.val(), fb_id: fbId };
            } catch (e) { logger.error(e); }
        }

        if (!perm) {
            alertFn('No se encontró información del permiso.');

            return;
        }

        const body = doc.getElementById('permDetailModalBody');

        if (!body) return;

        body.innerHTML = buildPermissionDetailHTML(perm);

        const modal = doc.getElementById('permDetailModal');

        if (modal) {
            modal.classList.add('active');
        }
    }

    return { loadExcelTasks, loadSchedule, loadTeletrabajo, loadPermisos, openPermisoDetailModal };
}
