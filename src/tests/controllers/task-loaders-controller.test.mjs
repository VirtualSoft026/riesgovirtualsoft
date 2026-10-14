import { createRunner, assert } from '../test-harness.mjs';
import { createFakeDocument, snapshotDocument, createRng, createFakeDatabase, createSerialTestAsync } from './tareas-fake-dom.mjs';
import { createTaskLoadersController } from '../../controllers/task-loaders-controller.js';
import { createTaskRepository } from '../../services/firebase/firebase-task-repository.js';
import { getShiftForDate } from '../../domain/schedules/schedule-service.js';
import { taskNamesMatch, setNamesMatch } from '../../utils/normalize.js';
import { escapeHTML, encodeInlineHandlerArg } from '../../utils/sanitization.js';

const { test, testAsync: rawTestAsync, summarizeAsync } = createRunner('task-loaders-controller.js (loadExcelTasks, loadSchedule, loadTeletrabajo, loadPermisos, detalle de permiso; diferencial vs app.js)');
const testAsync = createSerialTestAsync(rawTestAsync); // las pruebas comparten el estado global simulado: van en serie

// ======================================================================================================
// Entorno simulado para el código LITERAL de app.js
// ======================================================================================================
const RealDate = globalThis.Date;
const FIXED_NOW = RealDate.UTC(2026, 9, 6, 15, 0, 0);
class FakeDate extends RealDate {
    constructor(...args) { if (args.length) super(...args); else super(FIXED_NOW); }
    static now() { return FIXED_NOW; }
    getTime() { return super.getTime(); }
}
const Date = FakeDate;
let database = null;
let storage = new Map();
const localStorage = {
    setItem(k, v) { storage.set(k, String(v)); },
    getItem(k) { return storage.has(k) ? storage.get(k) : null; }
};
let consoleErrors = [];
let consoleLogs = [];
const console = { error: (...a) => consoleErrors.push(a.map(String).join(' ')), log: (...a) => consoleLogs.push(a.map(String).join(' ')), warn() {} };
let alerts = [];
const alert = (m) => alerts.push(m);
let authUid = 'g1';
const firebase = { auth: () => ({ currentUser: authUid ? { uid: authUid } : null }) };
let document = null;
const window = { idleDetectorGranted: false };

// estado global de app.js
let currentUser = null;
let taskStateCache = {};
let allTasks = [];
let globalScheduleRows = null;
let globalScheduleBlocks = null;
let gestorCronogramaAssignments = null;
let allLoadedPermissions = [];
let syncCalls = 0;
let renderTreeCalls = [];
let assignmentCalls = [];
let multiSelectSetups = [];
let multiSelectSelected = {};
let scenarioAssignments = [];
let fetchCalls = [];
let fetchPlan = {};

function syncActiveSessionToFirebase() { syncCalls += 1; }
function renderTree(tasksBySet) { renderTreeCalls.push(JSON.parse(JSON.stringify(tasksBySet))); }
async function loadCronogramaAssignments(name, shift) {
    assignmentCalls.push([name, shift]);
    gestorCronogramaAssignments = JSON.parse(JSON.stringify(scenarioAssignments));
}
function setupCustomMultiSelect(id, options, cb) { multiSelectSetups.push({ id, options: [...options] }); multiSelectSetups.last = cb; multiSelectSetups[id] = cb; }
function getSelectedMultiSelectValues(id) { return multiSelectSelected[id] || []; }

/** `fetch` simulado: responde según `fetchPlan` por prefijo de URL. */
async function fetch(url) {
    fetchCalls.push(url);
    const key = Object.keys(fetchPlan).find((k) => url.startsWith(k));
    const plan = fetchPlan[key] || { ok: false, status: 404 };

    if (plan.throws) throw new Error(plan.throws);

    return { ok: plan.ok, status: plan.status === undefined ? (plan.ok ? 200 : 500) : plan.status, arrayBuffer: async () => plan.payload };
}

/** SheetJS simulado: `read` devuelve el payload; `sheet_to_json` entrega copias de las filas. */
const XLSX = {
    read(payload) {
        if (payload && payload.readThrows) throw new Error('XLSX corrupto');
        return { SheetNames: ['Hoja1'], Sheets: { Hoja1: payload } };
    },
    utils: { sheet_to_json(ws) { return JSON.parse(JSON.stringify(ws.rows)); } }
};

function resetEnv() {
    storage = new Map();
    consoleErrors = [];
    consoleLogs = [];
    alerts = [];
    syncCalls = 0;
    renderTreeCalls = [];
    assignmentCalls = [];
    multiSelectSetups = [];
    multiSelectSelected = {};
    fetchCalls = [];
    allTasks = [];
    globalScheduleRows = null;
    globalScheduleBlocks = null;
    gestorCronogramaAssignments = null;
    allLoadedPermissions = [];
}


// --- copia LITERAL de app.js líneas 2123-2125 ---
function canonicalTaskId(id) {
    return String(id);
}

// --- copia LITERAL de app.js líneas 2301-2321 ---
function computeLocalTaskMigrations(mergedCache, remoteCache, now) {
    const remote = remoteCache || {};
    const migrations = [];
    Object.keys(mergedCache || {}).forEach((taskId) => {
        const mergedEntry = mergedCache[taskId];
        const remoteEntry = remote[taskId];
        const alreadyInSync = !!remoteEntry
            && mergedEntry.name === remoteEntry.name
            && mergedEntry.status === remoteEntry.status
            && mergedEntry.observation === remoteEntry.observation
            && mergedEntry.updatedAt === remoteEntry.updatedAt;
        if (alreadyInSync) return;

        // Registro legado sin updatedAt: se estampa ANTES de guardarlo.
        const record = typeof mergedEntry.updatedAt === 'number'
            ? mergedEntry
            : { ...mergedEntry, updatedAt: now };
        migrations.push({ taskId, record });
    });
    return migrations;
}

// --- copia LITERAL de app.js líneas 2332-2346 ---
function persistTaskIfNotNewerRemote(uid, taskId, record) {
    if (!uid) return Promise.reject(new Error('MISSING_UID'));
    if (!taskId) return Promise.reject(new Error('MISSING_TASK_ID'));
    return database.ref(`active_sessions/${uid}/tasks/${taskId}`).transaction((currentValue) => {
        if (
            currentValue
            && typeof currentValue.updatedAt === 'number'
            && typeof record.updatedAt === 'number'
            && currentValue.updatedAt > record.updatedAt
        ) {
            return undefined; // Abortar: conservar la versión remota más reciente.
        }
        return record;
    });
}

// --- copia LITERAL de app.js líneas 2359-2384 ---
async function migrateLocalTasksToActiveSession(uid, mergedCache, remoteCache) {
    if (!uid || !mergedCache) return { migrated: [], failed: [], skipped: [] };
    const migrations = computeLocalTaskMigrations(mergedCache, remoteCache, Date.now());
    const migrated = [];
    const failed = [];
    const skipped = [];
    for (const { taskId, record } of migrations) {
        mergedCache[taskId] = record;
        try {
            localStorage.setItem('riskOps_cache', JSON.stringify(mergedCache));
        } catch (e) { /* localStorage no disponible: el respaldo local es best-effort */ }

        try {
            const result = await persistTaskIfNotNewerRemote(uid, taskId, record);
            if (result && result.committed === false) {
                skipped.push(taskId);
            } else {
                migrated.push(taskId);
            }
        } catch (error) {
            console.error('Error al migrar una tarea local a Firebase durante la recuperación de sesión:', taskId, error);
            failed.push(taskId);
        }
    }
    return { migrated, failed, skipped };
}

// --- copia LITERAL de app.js líneas 758-762 ---
function excelToJSDate(serial) {
    if(!serial || isNaN(serial)) return null;
    const epochUTC = Date.UTC(1899, 11, 30);
    return new Date(epochUTC + serial * 86400000);
}

// --- copia LITERAL de app.js líneas 764-770 ---
function isSameDate(excelDate, jsDate) {
    if (!excelDate || !jsDate) return false;
    // Compare the UTC date from Excel (which is timezone-naive) with the browser's local date
    return excelDate.getUTCDate()   === jsDate.getDate() &&
           excelDate.getUTCMonth()  === jsDate.getMonth() &&
           excelDate.getUTCFullYear() === jsDate.getFullYear();
}

// --- copia LITERAL de app.js líneas 723-726 ---
function normalizeName(name) {
    if (!name) return "";
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

// --- copia LITERAL de app.js líneas 729-755 ---
function namesMatch(name1, name2) {
    if (!name1 || !name2) return false;
    let parts1 = normalizeName(name1).split(' ').filter(p => p.length > 2);
    let parts2 = normalizeName(name2).split(' ').filter(p => p.length > 2);
    
    if (parts1.length === 0 || parts2.length === 0) return false;

    // Identificar cuál es el nombre corto y cuál es el largo
    const [shorter, longer] = parts1.length <= parts2.length ? [parts1, parts2] : [parts2, parts1];

    // Si el nombre corto tiene varias palabras (Ej: "Sebastian Arango"), el largo debe tenerlas TODAS.
    if (shorter.length > 1) {
        return shorter.every(p => longer.includes(p));
    }
    
    // Si el nombre corto es una sola palabra ("Daniel", "Alejandra"):
    const pShort = shorter[0];
    
    // Prevenir que Josue (Josue Daniel) herede lo de Daniel
    if (pShort === 'daniel' && longer.includes('josue')) return false;
    
    // Si la única palabra del corto coincide con la primera palabra del largo, es un match seguro
    if (longer[0] === pShort) return true;
    
    // De lo contrario, permitimos coincidencia si está en otra parte (ej: "Alejandra" en "Marilyn Alejandra")
    return longer.includes(pShort);
}

// --- copia LITERAL de app.js líneas 1343-1545 ---
async function loadExcelTasks() {
    const container = document.querySelector('.tree-container');
    if(container) container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);"><i class="bx bx-loader-alt bx-spin"></i> Cargando Tareas...</div>';
    
    try {
        const url = encodeURI('Tareas Riesgo/Tareas de Riesgo.xlsx') + '?t=' + new Date().getTime();
        const response = await fetch(url);
        console.log(`XLSX_FETCH url=${url} status=${response.status}`);
        if(!response.ok) throw new Error("Error HTTP " + response.status);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        // Assign ID to all master tasks in json
        json.forEach((row, idx) => {
            row.id = idx;
        });
        
        let processedRows = [];
        
        if (currentUser && currentUser.role === 'Gestor') {
            // Resolve today's real shift from the parsed schedule (globalScheduleRows/globalScheduleBlocks)
            // This ensures the filter uses the actual shift for today, not a stale value from localStorage
            let resolvedShift = currentUser.shift || 'Por Asignar';
            if (globalScheduleRows && globalScheduleBlocks && globalScheduleBlocks.length > 0) {
                const todayShift = getShiftForDate(globalScheduleRows, globalScheduleBlocks, currentUser.name, new Date());
                if (todayShift && todayShift !== 'Por Asignar' && todayShift !== 'Descansa') {
                    resolvedShift = todayShift;
                }
            }
            // Load cronograma assignments using the resolved real shift
            await loadCronogramaAssignments(currentUser.name, resolvedShift);
            
            if (gestorCronogramaAssignments && gestorCronogramaAssignments.length > 0) {
                // Filter the master json rows
                const filteredMasterRows = json.filter(row => {
                    const set = row['Set '] || row['Set'] || 'Otros';
                    const taskName = row['Tarea'];
                    return gestorCronogramaAssignments.some(assign => 
                        taskNamesMatch(assign.task, taskName) && setNamesMatch(assign.set, set)
                    );
                });
                
                // Generate mock tasks for assignments that aren't in the master sheet
                const generatedMocks = [];
                const usedMockIds = new Set();
                const generateDeterministicMockTaskId = (taskName, set) => {
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

                gestorCronogramaAssignments.forEach(assign => {
                    const hasMasterMatch = json.some(row => 
                        taskNamesMatch(assign.task, row['Tarea']) && setNamesMatch(assign.set, row['Set '] || row['Set'] || 'Otros')
                    );
                    
                    if (!hasMasterMatch) {
                        const mockRow = {
                            'Set ': assign.set,
                            'Tarea': assign.task,
                            'Detalle de Tarea': `Tarea de control rutinario: ${assign.task}. Realizar las verificaciones correspondientes según los lineamientos de Riesgo.`,
                            'Horario': 'Durante el turno',
                            'Día': 'Diario',
                            'Instrucciones': '1. Realizar la validación de la tarea de acuerdo con el procedimiento estándar.\n2. Registrar cualquier anomalía en los canales oficiales.\n3. Marcar como completada en esta plataforma al finalizar.',
                            'Documento / Video de Apoyo': '',
                            id: generateDeterministicMockTaskId(assign.task, assign.set)
                        };
                        generatedMocks.push(mockRow);
                    }
                });
                
                processedRows = [...filteredMasterRows, ...generatedMocks];
            } else {
                processedRows = [];
            }
        } else {
            // Admin/Supervisor or other roles see everything
            processedRows = json;
        }
        
        // Transform the data, group by Set
        const tasksBySet = {};
        allTasks = []; // Clear global allTasks
        
        processedRows.forEach((row, index) => {
            const set = row['Set '] || row['Set'] || 'Otros';
            const taskName = row['Tarea'];
            const taskId = row.id !== undefined ? row.id : index;
            
            if (!tasksBySet[set]) tasksBySet[set] = [];
            
            // Check for duplicates in the visual tree
            const isDuplicate = tasksBySet[set].some(t => t.name === taskName);
            
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
        
        // Inicializar estado 'En Proceso' para las tareas asignadas del gestor y purgar huérfanas
        if (currentUser && currentUser.role === 'Gestor' && Array.isArray(processedRows)) {
            let hasNewTasksToSync = false;
            const validAssignedIds = new Set(processedRows.map((row, index) => canonicalTaskId(row.id !== undefined ? row.id : index)));

            // Purgar tareas huérfanas o desactualizadas del caché local (evita que tareas de turnos pasados bloqueen el cierre)
            let cacheWasPurged = false;
            for (const cachedId in taskStateCache) {
                if (!validAssignedIds.has(cachedId) && !cachedId.startsWith('extra_')) {
                    delete taskStateCache[cachedId];
                    cacheWasPurged = true;
                }
            }

            processedRows.forEach((row, index) => {
                const taskId = canonicalTaskId(row.id !== undefined ? row.id : index);
                const taskName = row['Tarea'];
                if (!taskStateCache[taskId]) {
                    taskStateCache[taskId] = {
                        name: taskName,
                        status: 'En Proceso',
                        observation: '',
                        updatedAt: Date.now()
                    };
                    hasNewTasksToSync = true;
                }
            });
            if (hasNewTasksToSync || cacheWasPurged) {
                try {
                    localStorage.setItem('riskOps_cache', JSON.stringify(taskStateCache));
                } catch (e) {}
                if (currentUser.uid && hasNewTasksToSync) {
                    try {
                        await migrateLocalTasksToActiveSession(currentUser.uid, taskStateCache, {});
                    } catch (syncErr) {
                        console.error("Error al sincronizar tareas iniciales En Proceso:", syncErr);
                    }
                }
            }
        }
        
        // Populate Set Selector
        const select = document.getElementById('activeSetSelect');
        if(select) {
            select.innerHTML = '<option value="" disabled selected>Selecciona tu SET a trabajar...</option><option value="Todos">Mostrar Todos</option>';
            const setsKeys = Object.keys(tasksBySet).sort();
            setsKeys.forEach(set => {
                select.innerHTML += `<option value="${escapeHTML(set)}">${escapeHTML(set)}</option>`;
            });
            
            // Clone select to remove old event listeners
            const newSelect = select.cloneNode(true);
            select.parentNode.replaceChild(newSelect, select);
            
            newSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if(val === 'Todos') {
                    renderTree(tasksBySet);
                } else {
                    const filtered = {};
                    filtered[val] = tasksBySet[val];
                    renderTree(filtered);
                }
            });

            if (setsKeys.length === 1) {
                newSelect.value = setsKeys[0];
                const filtered = {};
                filtered[setsKeys[0]] = tasksBySet[setsKeys[0]];
                renderTree(filtered);
            } else if (setsKeys.length === 0) {
                const container = document.querySelector('.tree-container');
                if(container) container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">No hay tareas asignadas en tu cronograma para el día de hoy.</div>';
            } else {
                // No renderizar todos por defecto, esperar selección
                const container = document.querySelector('.tree-container');
                if(container) container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">Selecciona un SET en el menú desplegable para ver las tareas.</div>';
            }
        }
        
    } catch(err) {
        console.error("Error loading tasks:", err);
        const container = document.querySelector('.tree-container');
        if(container) container.innerHTML = `<div style="padding: 20px; color: var(--danger);"><i class="bx bx-error-circle"></i> Error cargando tareas: ${escapeHTML(err.message)}</div>`;
    }
}

// --- copia LITERAL de app.js líneas 1548-1766 ---
async function loadSchedule() {
    try {
        const url = encodeURI('Horario/Horario 2026.xlsx') + '?t=' + Date.now();
        const response = await fetch(url);
        console.log(`XLSX_FETCH url=${url} status=${response.status}`);
        if(!response.ok) throw new Error("Fallo red");
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        function formatExcelDate(serial) {
            if(!serial) return "";
            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            
            // Si ya es un string que parece fecha (ej: "2026-06-08" o "2026-06-08T00:00...")
            if (typeof serial === 'string' && (serial.includes('-') || serial.includes('/'))) {
                const d = new Date(serial);
                if (!isNaN(d.getTime())) {
                    return `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`;
                }
            }
            
            // Si es un número (serial de Excel)
            if (!isNaN(serial)) {
                const epochUTC = Date.UTC(1899, 11, 30);
                const d = new Date(epochUTC + parseFloat(serial) * 86400000);
                return `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`;
            }
            
            return "";
        }
        
        let allScheduleBlocks = [];
        if (rows && rows.length > 2) {
            for(let rIdx = 0; rIdx < rows.length; rIdx++) {
                const testRow = rows[rIdx];
                if (!testRow || testRow.length < 2) continue;
                
                if (formatExcelDate(testRow[1]) !== "") {
                    const nextR = rows[rIdx+1];
                    if (nextR && nextR.length > 1 && (nextR[1] === 'Lunes' || nextR[1] === 'Martes')) {
                        // Encontramos un bloque, vamos a ver la fecha inicial y final
                        let firstDate = formatExcelDate(testRow[1]);
                        let lastDate = firstDate;
                        for(let c = 1; c < testRow.length; c++) {
                            if(formatExcelDate(testRow[c])) lastDate = formatExcelDate(testRow[c]);
                        }
                        
                        allScheduleBlocks.push({
                            startRow: rIdx,
                            label: `Semana del ${firstDate} al ${lastDate}`
                        });
                        rIdx++; // Saltar la fila de días
                    }
                }
            }
        }

        globalScheduleRows = rows;
        globalScheduleBlocks = allScheduleBlocks;
        
        if (allScheduleBlocks.length === 0) return; // No hay datos válidos

        const tableHead = document.getElementById('scheduleTableHead');
        const tableBody = document.getElementById('scheduleTableBody');
        
        if(tableHead && tableBody && rows.length > 2) {
            
            const weekSelector = document.getElementById('weekSelector');
            
            // Encontrar el bloque correspondiente a hoy
            let defaultBlockRow = null;
            const today = new Date();
            for (let block of allScheduleBlocks) {
                const dateRow = rows[block.startRow];
                for (let c = 1; c < dateRow.length; c++) {
                    const serial = dateRow[c];
                    if (serial) {
                        let cellDate = null;
                        if (!isNaN(serial)) {
                            cellDate = excelToJSDate(serial);
                        } else if (typeof serial === 'string' && (serial.includes('-') || serial.includes('/'))) {
                            const parsed = new Date(serial);
                            if (!isNaN(parsed.getTime())) {
                                cellDate = parsed;
                            }
                        }
                        
                        if (cellDate && isSameDate(cellDate, today)) {
                            defaultBlockRow = block.startRow;
                            break;
                        }
                    }
                }
                if (defaultBlockRow !== null) break;
            }
            
            if (defaultBlockRow === null) {
                defaultBlockRow = allScheduleBlocks[allScheduleBlocks.length - 1].startRow;
            }
            
            const scheduleGestorFilter = document.getElementById('scheduleGestorFilter');
            let selectedGestor = '';

            // Extraer lista única de gestores de la hoja de cálculo
            const allGestoresSet = new Set();
            allScheduleBlocks.forEach(block => {
                for (let rIdx = block.startRow + 2; rIdx < rows.length; rIdx++) {
                    const row = rows[rIdx];
                    if (!row || !row[0] || String(row[0]).trim() === '' || String(row[0]).trim().toUpperCase() === 'GESTOR') break;
                    allGestoresSet.add(String(row[0]).trim());
                }
            });
            const sortedGestores = Array.from(allGestoresSet).sort((a, b) => a.localeCompare(b));

            setupCustomMultiSelect('scheduleGestorMultiSelect', sortedGestores, (selectedList) => {
                renderScheduleBlock(parseInt(weekSelector ? weekSelector.value : defaultBlockRow));
            });

            if (weekSelector) {
                weekSelector.innerHTML = '';
                allScheduleBlocks.forEach(block => {
                    weekSelector.innerHTML += `<option value="${escapeHTML(String(block.startRow))}">${escapeHTML(block.label)}</option>`;
                });
                
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
                const selectedList = getSelectedMultiSelectValues('scheduleGestorMultiSelect');
                
                let numCols = 0;
                for(let i=1; i<dateRow.length; i++) {
                    if(formatExcelDate(dateRow[i])) numCols = i;
                }
                if(numCols === 0) numCols = 7; // fallback
                
                let headHTML = '<tr style="border-bottom: 1px solid var(--glass-border);">';
                headHTML += `<th style="padding: 12px; color: var(--accent-primary); text-align: left; position: sticky; left: 0; background: var(--bg-panel); z-index: 2;">GESTOR <i class='bx bx-refresh' style='cursor:pointer; margin-left:5px;' onclick='loadSchedule()' title='Refrescar Horario'></i></th>`;
                for(let i = 1; i <= numCols; i++) {
                    const dayName = dayRow[i] || `Día ${i}`;
                    const dateParsed = formatExcelDate(dateRow[i]);
                    const subText = dateParsed ? `<br><span style="font-size: 11px; font-weight: normal; color: var(--text-secondary);">${dateParsed}</span>` : '';
                    headHTML += `<th style="padding: 12px; color: var(--accent-primary); text-align: center;">${escapeHTML(String(dayName))}${subText}</th>`;
                }
                headHTML += '</tr>';
                tableHead.innerHTML = headHTML;
                
                tableBody.innerHTML = '';
                for(let rowIndex = blockStartRow + 2; rowIndex < rows.length; rowIndex++) {
                    const r = rows[rowIndex];
                    if (!r || !r[0] || String(r[0]).trim() === '' || String(r[0]).trim().toUpperCase() === 'GESTOR') break;
                    
                    const gestorName = String(r[0]).trim();
                    if (selectedList.length > 0 && !selectedList.some(sel => normalizeName(gestorName) === normalizeName(sel))) {
                        continue;
                    }

                    let isCurrentUser = (currentUser && namesMatch(gestorName, currentUser.name));
                    if (isCurrentUser) console.log('current user matched = true');
                    
                    if (currentUser && currentUser.role === 'Gestor' && !isCurrentUser) continue;

                    let bgClass = isCurrentUser ? 'rgba(59,130,246,0.1)' : 'transparent';
                    
                    let trHTML = `<tr class="hover-highlight" style="border-bottom: 1px solid var(--glass-border); background: ${bgClass};">`;
                    trHTML += `<td style="padding: 12px; font-weight: 600; text-align: left; color: ${isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)'}; position: sticky; left: 0; background: ${isCurrentUser ? 'var(--bg-dark)' : 'var(--bg-panel)'}; z-index: 1;">${escapeHTML(gestorName)}</td>`;
                    
                    // Encontrar el turno para mostrar en el badge principal (corresponde a hoy)
                    let badgeShift = getShiftForDate(rows, allScheduleBlocks, gestorName, new Date());
                    
                    for(let i = 1; i <= numCols; i++) {
                        const shift = r[i] || 'Descansa';
                        
                        let badgeClass = 'pending';
                        const sLower = normalizeName(shift);
                        if(/\d\s*(am|pm)/i.test(shift)) badgeClass = 'in-progress';
                        else if(sLower.includes('vacacion')) badgeClass = 'vacaciones-badge';
                        else if(sLower.includes('descansa')) badgeClass = 'descanso-badge';
                        else if(sLower.includes('familia')) badgeClass = 'familia-badge';
                        else if(sLower.includes('incapacidad')) badgeClass = 'incapacidad-badge';
                        else if(sLower.includes('disponible') || sLower.includes('dosponible')) badgeClass = 'disponible-badge';
                        
                        trHTML += `<td style="padding: 12px; text-align: center; white-space: nowrap;"><span class="badge ${badgeClass}">${escapeHTML(String(shift))}</span></td>`;
                    }
                    
                    if (isCurrentUser && badgeShift) {
                        const userRoleEl = document.getElementById('userRole');
                        if (userRoleEl) userRoleEl.textContent = `${currentUser.role} | Turno: ${badgeShift}`;
                        const headerShiftBadge = document.querySelector('.shift-badge');
                        if (headerShiftBadge) headerShiftBadge.textContent = `TURNO: ${badgeShift}`;
                        
                        // Guardar el turno en currentUser y sincronizar a Firebase
                        if (currentUser.shift !== badgeShift) {
                            currentUser.shift = badgeShift;
                            localStorage.setItem('riskOps_currentUser', JSON.stringify(currentUser));
                            syncActiveSessionToFirebase();
                            loadExcelTasks();
                        }
                    }
                    trHTML += '</tr>';
                    tableBody.innerHTML += trHTML;
                }
            }
        }
    } catch(e) {
        console.log("No se pudo cargar el horario", e);
    }
}

// --- copia LITERAL de app.js líneas 1768-1889 ---
function loadTeletrabajo() {
    fetch('Teletrabajo/Teletrabajo.xlsx?v=' + Date.now())
        .then(res => { console.log(`XLSX_TELEWORK_FETCH status=${res.status}`); return res; })
        .then(res => {
            if(!res.ok) throw new Error("No se encontró el archivo de Teletrabajo");
            return res.arrayBuffer();
        })
        .then(data => {
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1, defval: ""});
            
            let allBlocks = [];
            
            for(let r = 0; r < rows.length; r++) {
                for(let c = 0; c < rows[r].length; c++) {
                    // Bloque mejorado: busca etiquetas claras de calendario
                    const cellVal = String(rows[r][c]).trim();
                    const lowCell = cellVal.toLowerCase();
                    if(lowCell.includes('semana') || lowCell.includes('teletrabajo') || /^\d{1,2}\/\d{1,2}/.test(cellVal)) {
                        let block = {
                            label: cellVal,
                            startRow: r,
                            colIndex: c,
                            data: []
                        };
                        
                        // Buscamos filas debajo de este título que tengan nombres
                        for(let i = r + 1; i < rows.length; i++) {
                            const gestor = rows[i] ? rows[i][c] : null;
                            const dia = rows[i] ? rows[i][c+1] : null;
                            
                            if(!gestor || String(gestor).trim() === '') break;
                            if(String(gestor).trim().toUpperCase() === 'GESTOR') continue; 
                            
                            block.data.push({
                                gestor: String(gestor).trim(),
                                dia: String(dia || '').trim()
                            });
                        }
                        
                        if(block.data.length > 0) allBlocks.push(block);
                    }
                }
            }
            
            if(allBlocks.length === 0) return;
            
            const weekSelector = document.getElementById('teletrabajoWeekSelector');
            const tableHead = document.getElementById('teletrabajoTableHead');
            const tableBody = document.getElementById('teletrabajoTableBody');
            
            const allTeleGestores = new Set();
            allBlocks.forEach(b => {
                b.data.forEach(r => {
                    if (r.gestor) allTeleGestores.add(String(r.gestor).trim());
                });
            });
            const sortedTeleGestores = Array.from(allTeleGestores).sort((a,b) => a.localeCompare(b));

            let defaultBlockIdx = allBlocks.length - 1;

            setupCustomMultiSelect('teletrabajoGestorMultiSelect', sortedTeleGestores, () => {
                renderTeletrabajoBlock(allBlocks[weekSelector ? weekSelector.value : defaultBlockIdx]);
            });

            if(weekSelector) {
                weekSelector.innerHTML = '';
                allBlocks.forEach((block, idx) => {
                    weekSelector.innerHTML += `<option value="${escapeHTML(String(idx))}">${escapeHTML(block.label)}</option>`;
                });
                
                weekSelector.value = defaultBlockIdx;
                
                weekSelector.addEventListener('change', (e) => {
                    renderTeletrabajoBlock(allBlocks[e.target.value]);
                });
                
                renderTeletrabajoBlock(allBlocks[defaultBlockIdx]);
            }
            
            function renderTeletrabajoBlock(block) {
                const selectedList = getSelectedMultiSelectValues('teletrabajoGestorMultiSelect');
                tableHead.innerHTML = `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <th style="padding: 12px; color: var(--accent-primary); text-align: left; position: sticky; left: 0; background: var(--bg-panel); z-index: 2;">GESTOR <i class='bx bx-refresh' style='cursor:pointer; margin-left:5px;' onclick='loadTeletrabajo()' title='Refrescar Teletrabajo'></i></th>
                        <th style="padding: 12px; color: var(--accent-primary); text-align: center;">DÍA</th>
                        <th style="padding: 12px; color: var(--accent-primary); text-align: center;">MODALIDAD</th>
                    </tr>
                `;
                
                tableBody.innerHTML = '';
                block.data.forEach(row => {
                    if (selectedList.length > 0 && !selectedList.some(sel => normalizeName(row.gestor) === normalizeName(sel))) {
                        return;
                    }

                    let isCurrentUser = (currentUser && namesMatch(row.gestor, currentUser.name));
                    
                    if (currentUser && currentUser.role === 'Gestor' && !isCurrentUser) return;

                    let bgClass = isCurrentUser ? 'rgba(59,130,246,0.1)' : 'transparent';
                    
                    let isTeletrabajo = row.dia && row.dia.toLowerCase() !== 'nan';
                    let estadoHtml = isTeletrabajo ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">HOME OFFICE</span>` : `<span class="badge pending">PRESENCIAL</span>`;
                    
                    tableBody.innerHTML += `
                        <tr class="hover-highlight" style="border-bottom: 1px solid var(--glass-border); background: ${bgClass};">
                            <td style="padding: 12px; font-weight: 600; text-align: left; color: ${isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)'}; position: sticky; left: 0; background: ${isCurrentUser ? 'var(--bg-dark)' : 'var(--bg-panel)'}; z-index: 1;">${escapeHTML(row.gestor)}</td>
                            <td style="padding: 12px; text-align: center;">${isTeletrabajo ? escapeHTML(row.dia) : '-'}</td>
                            <td style="padding: 12px; text-align: center;">${estadoHtml}</td>
                        </tr>
                    `;
                });
            }
        })
        .catch(err => {
            console.error("Error cargando Teletrabajo:", err);
            const tb = document.getElementById('teletrabajoTableBody');
            if(tb) tb.innerHTML = `<tr><td colspan="3" style="padding: 20px; color: var(--danger); text-align: center;">No se pudo cargar Teletrabajo.xlsx o no existe.</td></tr>`;
        });
}

// --- copia LITERAL de app.js líneas 1894-1967 ---
async function loadPermisos() {
    try {
        let permissionsRef = database.ref('permissions');
        if (currentUser && currentUser.role !== 'Admin' && currentUser.role !== 'Supervisor') {
            const authUid = currentUser.uid || (firebase.auth().currentUser && firebase.auth().currentUser.uid);
            if (!authUid) throw new Error('No se pudo determinar el UID del usuario autenticado');
            permissionsRef = permissionsRef.orderByChild('uid').equalTo(authUid);
        }
        const snapshot = await permissionsRef.once('value');
        const historicoContainer = document.getElementById('historicoPermisosList');
        if(!historicoContainer) return;
        
        historicoContainer.innerHTML = '';
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            let permisos = Object.keys(data).map(k => ({...data[k], fb_id: k}));
            allLoadedPermissions = permisos;
            
            // Filtro de privacidad: Gestor solo ve lo suyo. Admin ve todo.
            if (currentUser && currentUser.role !== 'Admin' && currentUser.role !== 'Supervisor') {
                permisos = permisos.filter(p => p.gestor === currentUser.name);
            }
            
            // Ordenar por ID descendente (más nuevos primero)
            permisos.sort((a,b) => b.id - a.id);
            
            if (permisos.length === 0) {
                historicoContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay permisos en el historial.</p>';
                return;
            }
            
            permisos.forEach(p => {
                let icon = 'bx-time';
                let badgeClass = 'pending';
                if(p.status === 'Aprobado') { badgeClass = 'in-progress'; icon = 'bx-check-double'; }
                if(p.status === 'Rechazado') { badgeClass = 'not-done'; icon = 'bx-x'; }
                
                let rejectionHtml = p.rejectionReason ? `<br><small style="color:var(--danger)">Razón/Obs: ${escapeHTML(p.rejectionReason)}</small>` : '';
                
                let createdTimeText = p.horaSolicitud;
                if (!createdTimeText && p.id) {
                    try {
                        const d = new Date(p.id);
                        createdTimeText = `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit', hour12:true})}`;
                    } catch(err) { createdTimeText = 'N/A'; }
                }

                historicoContainer.innerHTML += `
                    <div class="tree-item" style="margin-top: 10px; cursor: pointer; transition: all 0.2s ease; border-radius: 8px;" onclick="openPermisoDetailModal(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))" title="Haz clic para ver el detalle completo de este permiso">
                        <div class="tree-header" style="padding: 12px; display: flex; align-items: center; gap: 10px;">
                            <i class='bx ${icon}' style="font-size: 20px;"></i>
                            <div style="display:flex; flex-direction:column; flex: 1;">
                                <strong style="font-size: 14px; color: var(--text-primary);">${escapeHTML(p.tipo)}</strong>
                                <small style="font-size:11px; opacity:0.8; color: var(--text-secondary); margin-top: 2px;">
                                    ${escapeHTML(p.gestor)} | ${escapeHTML(p.fecha)} (${escapeHTML(p.horaInicio)} a ${escapeHTML(p.horaFin)})${rejectionHtml}
                                </small>
                                <small style="font-size:10px; color: var(--accent-primary); margin-top: 2px; font-weight: 500;">
                                    <i class='bx bx-calendar-event'></i> Solicitado el: ${escapeHTML(createdTimeText || 'N/A')}
                                </small>
                            </div>
                            <span class="badge ${badgeClass}" style="margin-left: auto; padding: 4px 10px; font-size: 11px;">${escapeHTML(p.status)}</span>
                            <i class='bx bx-chevron-right' style="font-size: 18px; color: var(--text-secondary); opacity: 0.6;"></i>
                        </div>
                    </div>
                `;
            });
        } else {
            historicoContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay permisos registrados.</p>';
        }
    } catch(e) {
        console.error("No se pudo cargar permisos desde Firebase", e);
    }
}

// --- copia LITERAL de app.js líneas 1970-2061 ---
window.openPermisoDetailModal = async function(fb_id) {
    let perm = allLoadedPermissions.find(p => p.fb_id === fb_id);
    if (!perm) {
        try {
            const snap = await database.ref('permissions/' + fb_id).once('value');
            if (snap.exists()) perm = { ...snap.val(), fb_id };
        } catch(e) { console.error(e); }
    }
    
    if (!perm) {
        alert("No se encontró información del permiso.");
        return;
    }
    
    const body = document.getElementById('permDetailModalBody');
    if (!body) return;
    
    let statusColor = 'var(--warning)';
    let statusIcon = 'bx-time';
    if (perm.status === 'Aprobado') { statusColor = 'var(--success)'; statusIcon = 'bx-check-circle'; }
    if (perm.status === 'Rechazado') { statusColor = 'var(--danger)'; statusIcon = 'bx-x-circle'; }
    
    let fechaRange = perm.fecha;
    if (perm.fechaDesde && perm.fechaHasta && perm.fechaDesde !== perm.fechaHasta) {
        fechaRange = `Desde ${perm.fechaDesde} hasta ${perm.fechaHasta}`;
    }
    
    let createdTimeText = perm.horaSolicitud;
    if (!createdTimeText && perm.id) {
        try {
            const d = new Date(perm.id);
            createdTimeText = `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit', hour12:true})}`;
        } catch(err) { createdTimeText = 'N/A'; }
    }

    body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 12px 15px; border-radius: 10px; border: 1px solid var(--glass-border);">
                <div>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); display: block;">Estado de Solicitud</span>
                    <strong style="font-size: 16px; color: ${statusColor}; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                        <i class='bx ${statusIcon}'></i> ${escapeHTML(perm.status)}
                    </strong>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); display: block;">Tipo de Permiso</span>
                    <strong style="font-size: 14px; color: var(--accent-primary); margin-top: 2px; display: block;">${escapeHTML(perm.tipo)}</strong>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                <div style="background: rgba(255,255,255,0.02); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Gestor Solicitante</small>
                    <strong style="font-size: 13px; color: var(--text-primary); margin-top: 3px; display: block;">${escapeHTML(perm.gestor)}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Fecha de Solicitud (Creación)</small>
                    <strong style="font-size: 13px; color: var(--accent-primary); margin-top: 3px; display: block;">${escapeHTML(createdTimeText || 'N/A')}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Fecha del Permiso</small>
                    <strong style="font-size: 13px; color: var(--text-primary); margin-top: 3px; display: block;">${escapeHTML(fechaRange)}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Horario Solicitado</small>
                    <strong style="font-size: 13px; color: var(--text-primary); margin-top: 3px; display: block;">${escapeHTML(perm.horaInicio || 'N/A')} a ${escapeHTML(perm.horaFin || 'N/A')}</strong>
                </div>
            </div>

            <div style="background: rgba(255,255,255,0.03); padding: 12px 15px; border-radius: 10px; border: 1px solid var(--glass-border);">
                <small style="color: var(--accent-primary); display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Motivo / Justificación del Gestor:</small>
                <div style="font-size: 13px; color: var(--text-primary); line-height: 1.5; white-space: pre-wrap; word-break: break-word;">
                    ${escapeHTML(perm.motivo || 'Sin justificación detallada.')}
                </div>
            </div>

            ${perm.rejectionReason ? `
                <div style="background: rgba(239, 68, 68, 0.08); padding: 12px 15px; border-radius: 10px; border: 1px solid rgba(239, 68, 68, 0.3);">
                    <small style="color: var(--danger); display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Observación / Razón de Respuesta:</small>
                    <div style="font-size: 13px; color: var(--text-primary); line-height: 1.5; white-space: pre-wrap; word-break: break-word;">
                        ${escapeHTML(perm.rejectionReason)}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    const modal = document.getElementById('permDetailModal');
    if (modal) {
        modal.classList.add('active');
    }
};

// ======================================================================================================
// Utilidades
// ======================================================================================================
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
let uncaught = [];
const safe = (fn) => { try { fn(); } catch (e) { uncaught.push(String(e && e.message)); } };
const settle = async () => { for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve)); };
const serialOf = (y, m, d) => Math.round((RealDate.UTC(y, m - 1, d) - RealDate.UTC(1899, 11, 30)) / 86400000);

function newController(db) {
    return createTaskLoadersController({
        fetchFn: fetch, XLSX, doc: document, now: () => Date.now(), newDate: () => new Date(),
        getUser: () => currentUser, persistUser: (u) => localStorage.setItem('riskOps_currentUser', JSON.stringify(u)),
        getScheduleRows: () => globalScheduleRows, getScheduleBlocks: () => globalScheduleBlocks,
        setSchedule: (rows, blocks) => { globalScheduleRows = rows; globalScheduleBlocks = blocks; },
        getShiftForDate, normalizeName, namesMatch, taskNamesMatch, setNamesMatch, escape: escapeHTML, encodeArg: encodeInlineHandlerArg,
        multiSelect: { setup: setupCustomMultiSelect, getValues: getSelectedMultiSelectValues },
        loadCronogramaAssignments, getCronogramaAssignments: () => gestorCronogramaAssignments,
        getTaskCache: () => taskStateCache, saveTaskCache: (c) => localStorage.setItem('riskOps_cache', JSON.stringify(c)),
        repository: createTaskRepository({ database: db, now: () => Date.now(), saveCache: (c) => localStorage.setItem('riskOps_cache', JSON.stringify(c)), logger: console }),
        setAllTasks: (tasks) => { allTasks = tasks; }, renderTree, syncActiveSession: syncActiveSessionToFirebase,
        database: db, getAuthUid: () => { const u = firebase.auth().currentUser; return u && u.uid; }, alert, logger: console
    });
}

function setupScenario(sc) {
    resetEnv();
    uncaught = [];
    document = createFakeDocument(sc.docOpts || {});
    currentUser = clone(sc.user);
    taskStateCache = clone(sc.cache || {});
    fetchPlan = clone(sc.fetchPlan || {});
    scenarioAssignments = clone(sc.assignments || []);
    multiSelectSelected = clone(sc.selected || {});
    authUid = sc.authUid === undefined ? 'g1' : sc.authUid;
    if (sc.schedule) { globalScheduleRows = clone(sc.schedule.rows); globalScheduleBlocks = clone(sc.schedule.blocks); }
}

/**
 * Diferencias DOCUMENTADAS e inocuas, excluidas de la comparación:
 *  - app.js pide `#scheduleGestorFilter` y no lo usa (variable muerta);
 *  - app.js escribe `console.log('current user matched = true')` por cada fila del usuario.
 */
function normalizedDoc() {
    const shot = snapshotDocument(document);
    delete shot['#scheduleGestorFilter'];

    return shot;
}

function takeShot(db, extra = {}) {
    return {
        doc: normalizedDoc(), allTasks: clone(allTasks), cache: clone(taskStateCache), storage: [...storage.entries()],
        user: clone(currentUser), syncCalls, renderTreeCalls: clone(renderTreeCalls), assignmentCalls: clone(assignmentCalls),
        multiSelectSetups: clone(multiSelectSetups), fetchCalls: [...fetchCalls], errors: consoleErrors.length, logs: consoleLogs.filter((l) => l !== 'current user matched = true'),
        alerts: [...alerts], uncaught: [...uncaught], scheduleRows: clone(globalScheduleRows), scheduleBlocks: clone(globalScheduleBlocks),
        dbData: db ? clone(db.data) : null, dbOps: db ? db.log.map((o) => `${o.op}:${o.path}`) : [], ...extra
    };
}

/** Ejecuta `run(mode, controllerOrNull)` con el código literal y con el controlador nuevo. */
async function runBoth(sc, run, dbInitial = {}, dbOpts = {}) {
    const shots = {};

    for (const mode of ['legacy', 'nuevo']) {
        setupScenario(sc);
        const db = createFakeDatabase(dbInitial, dbOpts);
        database = db;
        const controller = mode === 'nuevo' ? newController(db) : null;

        await run(mode, controller);
        await settle();
        shots[mode] = takeShot(db);
    }

    return shots;
}

// ======================================================================================================
// loadExcelTasks
// ======================================================================================================
function randomMaster(rng) {
    const sets = ['Casino', 'Deportes', 'Pagos & "Bonos"', "Retiros d'oro", 'Otros'];
    const names = ['Revisar GGR casino', 'Validar apuestas deportivas', 'Revisión de retiros pendientes', 'Control de bonos <CRM>', 'Alertas SEON de cuentas', 'Verificación de eventos en vivo', 'Tarea ñandú'];
    const rows = [];

    for (let i = 0; i < 2 + Math.floor(rng() * 9); i++) {
        const row = { Tarea: names[Math.floor(rng() * names.length)], 'Detalle de Tarea': 'detalle ' + i, Horario: 'Durante el turno', 'Día': 'Diario', Instrucciones: 'ins ' + i };
        const set = sets[Math.floor(rng() * sets.length)];
        if (rng() < 0.15) row['Set'] = set; else if (rng() < 0.9) row['Set '] = set;
        rows.push(row);
    }

    return rows;
}

function excelScenario(rng, over = {}) {
    const rows = randomMaster(rng);
    const user = [{ role: 'Gestor', uid: 'g1', name: 'Ana Prueba', shift: '8am - 4pm' }, { role: 'Gestor', name: 'Ana Prueba', shift: 'Por Asignar' }, { role: 'Admin', uid: 'a1', name: 'Jefe' }, null][Math.floor(rng() * 4)];
    const assignments = [];

    rows.forEach((r) => { if (rng() < 0.5) assignments.push({ task: r['Tarea'], set: r['Set '] || r['Set'] || 'Otros' }); });
    if (rng() < 0.5) assignments.push({ task: 'Tarea que solo existe en cronograma', set: 'Casino' });
    if (rng() < 0.3) assignments.push({ task: 'Otra tarea nueva', set: 'Pagos & "Bonos"' });

    const cache = {};
    if (rng() < 0.7) cache['0'] = { name: 'x', status: 'Finalizada', observation: 'o', updatedAt: 5 };
    if (rng() < 0.5) cache['3'] = { name: 'y', status: 'En Proceso', observation: '', updatedAt: 6 };
    if (rng() < 0.5) cache['999'] = { name: 'huérfana', status: 'Finalizada', observation: '', updatedAt: 7 };
    if (rng() < 0.4) cache['extra_1'] = { name: '[EXTRA] z', status: 'Finalizada', observation: '', updatedAt: 8 };

    return {
        user, assignments, cache, fetchPlan: { 'Tareas%20Riesgo/': { ok: true, payload: { rows } } },
        schedule: rng() < 0.5 ? { rows: [[''], ['x']], blocks: [{ startRow: 0 }] } : null, ...over
    };
}

testAsync('loadExcelTasks: Admin, Gestor con cronograma y tareas mock, y selección de Set — idéntico a app.js (150 escenarios con semilla)', async () => {
    const rng = createRng(2468);
    let gestorRuns = 0;
    let singleSet = 0;

    for (let i = 0; i < 150; i++) {
        const sc = excelScenario(rng);
        const shots = await runBoth(sc, async (mode, controller) => {
            if (mode === 'legacy') await loadExcelTasks(); else await controller.loadExcelTasks();

            // al cambiar el selector se dibuja el Set elegido (o todos)
            const select = document.byId.get('activeSetSelect');
            const sets = Object.keys(allTasks.reduce((acc, t) => { acc[t['Set '] || t['Set'] || 'Otros'] = 1; return acc; }, {})).sort();

            if (select) {
                safe(() => select.fire('change', { target: { value: 'Todos' } }));
                if (sets[0]) safe(() => select.fire('change', { target: { value: sets[0] } }));
            }
        }, { active_sessions: { g1: { tasks: { 0: { name: 'x', status: 'Pendiente', observation: '', updatedAt: 99 } } } } });

        assert.deepEqual(shots.nuevo, shots.legacy, `escenario ${i}`);
        if (sc.user && sc.user.role === 'Gestor') gestorRuns += 1;
        if (shots.nuevo.renderTreeCalls.length && Object.keys(shots.nuevo.renderTreeCalls[0]).length === 1) singleSet += 1;
    }

    assert.ok(gestorRuns > 40 && singleSet > 10, `gestores=${gestorRuns}, un solo Set=${singleSet}`);
});

testAsync('loadExcelTasks: la migración inicial de "En Proceso" no pisa una versión remota más nueva (carrera con otra pestaña)', async () => {
    const rows = [{ 'Set ': 'Casino', Tarea: 'Revisar GGR casino' }];
    const sc = {
        user: { role: 'Gestor', uid: 'g1', name: 'Ana Prueba', shift: '8am - 4pm' }, cache: {},
        assignments: [{ task: 'Revisar GGR casino', set: 'Casino' }], fetchPlan: { 'Tareas%20Riesgo/': { ok: true, payload: { rows } } }
    };
    const newer = { name: 'Revisar GGR casino', status: 'Finalizada', observation: 'ya hecha en otra pestaña', updatedAt: FIXED_NOW + 5000 };
    const shots = await runBoth(sc, async (mode, controller) => { if (mode === 'legacy') await loadExcelTasks(); else await controller.loadExcelTasks(); }, { active_sessions: { g1: { tasks: { 0: newer } } } });

    assert.deepEqual(shots.nuevo, shots.legacy);
    assert.deepEqual(shots.nuevo.dbData.active_sessions.g1.tasks['0'], newer, 'la versión remota más nueva se conserva');
});

testAsync('loadExcelTasks: errores (HTTP, Excel corrupto, red caída, sin contenedor ni selector) — mismo mensaje y mismo DOM que app.js', async () => {
    const rows = [{ 'Set ': 'Casino', Tarea: 'Revisar GGR' }];
    const base = { user: { role: 'Admin', uid: 'a1' } };
    const cases = [
        { ...base, fetchPlan: { 'Tareas%20Riesgo/': { ok: false, status: 503 } } },
        { ...base, fetchPlan: { 'Tareas%20Riesgo/': { ok: true, payload: { readThrows: true } } } },
        { ...base, fetchPlan: { 'Tareas%20Riesgo/': { throws: 'Failed to fetch <red>' } } },
        { ...base, fetchPlan: { 'Tareas%20Riesgo/': { ok: true, payload: { rows } } }, docOpts: { missingSelectors: ['.tree-container'] } },
        { ...base, fetchPlan: { 'Tareas%20Riesgo/': { ok: true, payload: { rows } } }, docOpts: { missingIds: ['activeSetSelect'] } },
        { ...base, fetchPlan: { 'Tareas%20Riesgo/': { ok: true, payload: { rows: [] } } } },
        { user: { role: 'Gestor', uid: 'g1', name: 'Ana', shift: 'x' }, fetchPlan: { 'Tareas%20Riesgo/': { ok: true, payload: { rows } } }, assignments: [] }
    ];

    for (const sc of cases) {
        const shots = await runBoth(sc, async (mode, controller) => { if (mode === 'legacy') await loadExcelTasks(); else await controller.loadExcelTasks(); });

        assert.deepEqual(shots.nuevo, shots.legacy, JSON.stringify(sc.fetchPlan));
    }

    const error = await runBoth(cases[0], async (mode, controller) => { if (mode === 'legacy') await loadExcelTasks(); else await controller.loadExcelTasks(); });

    assert.match(error.nuevo.doc['.tree-container'].innerHTML, /Error cargando tareas: Error HTTP 503/);
});

// ======================================================================================================
// loadSchedule
// ======================================================================================================
function randomSchedule(rng, userName) {
    const rows = [['Horario 2026']];
    const gestores = [userName, 'Luis Fuentes', 'María López', "Pedro O'Neil", 'Sara <b>'];
    const shifts = ['8am - 4pm', '2pm - 10pm', 'Descansa', 'Vacaciones', 'Disponible', 'Dosponible', 'Familia', 'Incapacidad', 'Noche', '6am - 2pm', '', 'otra cosa'];
    const nBlocks = 1 + Math.floor(rng() * 3);
    const withToday = rng() < 0.6 ? Math.floor(rng() * nBlocks) : -1;

    for (let b = 0; b < nBlocks; b++) {
        const dateRow = [''];
        const dayRow = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

        for (let d = 0; d < 7; d++) {
            const serial = serialOf(2026, 10, b === withToday ? 3 + d : 14 + 7 * b + d);
            dateRow.push(rng() < 0.2 ? '2026-10-' + String(10 + b * 7 + d).padStart(2, '0') : serial);
        }

        rows.push(dateRow, dayRow);

        gestores.forEach((g) => {
            if (rng() < 0.85) {
                const row = [g];
                for (let d = 0; d < 7; d++) row.push(rng() < 0.05 ? 8 : shifts[Math.floor(rng() * shifts.length)]);
                rows.push(row);
            }
        });

        rows.push(rng() < 0.5 ? [''] : ['GESTOR']);
    }

    return rows;
}

testAsync('loadSchedule: bloques, semana por defecto, selectores, tabla y efectos sobre el usuario — idéntico a app.js (120 escenarios con semilla)', async () => {
    const rng = createRng(1357);
    let withEffects = 0;

    for (let i = 0; i < 120; i++) {
        const userName = ['Ana Prueba', 'Luis Fuentes', 'Nadie Conocido'][Math.floor(rng() * 3)];
        const user = [{ role: 'Gestor', uid: 'g1', name: userName, shift: 'Por Asignar' }, { role: 'Admin', uid: 'a1', name: userName }, { role: 'Gestor', uid: 'g1', name: userName, shift: '8am - 4pm' }, null][Math.floor(rng() * 4)];
        const rows = randomSchedule(rng, 'Ana Prueba');
        const sc = {
            user, selected: rng() < 0.3 ? { scheduleGestorMultiSelect: ['Luis Fuentes', 'ana prueba'] } : {}, assignments: [],
            fetchPlan: { 'Horario/': { ok: true, payload: { rows } }, 'Tareas%20Riesgo/': { ok: true, payload: { rows: [{ 'Set ': 'Casino', Tarea: 'T' }] } } },
            docOpts: rng() < 0.1 ? { missingIds: ['weekSelector'] } : {}
        };
        const shots = await runBoth(sc, async (mode, controller) => {
            if (mode === 'legacy') await loadSchedule(); else await controller.loadSchedule();

            // interacción posterior: cambio de semana y de filtro de gestores
            const weekSelector = document.byId.get('weekSelector');
            const nBlocks = globalScheduleBlocks ? globalScheduleBlocks.length : 0;

            if (weekSelector && nBlocks > 1) safe(() => weekSelector.fire('change', { target: { value: String(globalScheduleBlocks[0].startRow) } }));
            if (multiSelectSetups.length) {
                multiSelectSelected.scheduleGestorMultiSelect = ['María López'];
                safe(() => multiSelectSetups.scheduleGestorMultiSelect());
            }
        });

        assert.deepEqual(shots.nuevo, shots.legacy, `escenario ${i}`);
        if (shots.nuevo.user && shots.nuevo.user.shift !== (user && user.shift)) withEffects += 1;
    }

    assert.ok(withEffects > 10, `la muestra incluye cambios de turno del usuario (${withEffects})`);
});

testAsync('loadSchedule: hoja sin bloques válidos, falla de red y celda numérica de turno — mismo resultado que app.js', async () => {
    const today = serialOf(2026, 10, 6);
    const goodBlock = [[''], [''], ['', today, today + 1], ['', 'Lunes', 'Martes'], ['Ana Prueba', '8am - 4pm', 8], ['']];
    const cases = [
        { fetchPlan: { 'Horario/': { ok: true, payload: { rows: [['a'], ['b']] } } } },
        { fetchPlan: { 'Horario/': { ok: true, payload: { rows: [['x'], ['y'], ['z']] } } } },
        { fetchPlan: { 'Horario/': { ok: false, status: 404 } } },
        { fetchPlan: { 'Horario/': { throws: 'sin red' } } },
        { fetchPlan: { 'Horario/': { ok: true, payload: { rows: goodBlock } } }, user: { role: 'Gestor', uid: 'g1', name: 'Ana Prueba', shift: 'Por Asignar' } }
    ];

    for (const c of cases) {
        const sc = { user: c.user || { role: 'Admin', uid: 'a1', name: 'x' }, fetchPlan: { ...c.fetchPlan, 'Tareas%20Riesgo/': { ok: true, payload: { rows: [] } } } };
        const shots = await runBoth(sc, async (mode, controller) => { if (mode === 'legacy') await loadSchedule(); else await controller.loadSchedule(); });

        assert.deepEqual(shots.nuevo, shots.legacy, JSON.stringify(c.fetchPlan));
    }
});

// ======================================================================================================
// loadTeletrabajo
// ======================================================================================================
function randomTeleSheet(rng) {
    const rows = [];
    const gestores = ['Ana Prueba', 'Luis Fuentes', 'María López', 'Sara <b>', 'GESTOR'];

    for (let b = 0; b < 1 + Math.floor(rng() * 3); b++) {
        const col = rng() < 0.5 ? 0 : 3;
        const header = new Array(col).fill('');
        header.push(['Semana 1', 'Teletrabajo oct', '5/10', 'nada'][Math.floor(rng() * 4)], 'DÍA');
        rows.push(header);

        for (let r = 0; r < 1 + Math.floor(rng() * 5); r++) {
            const line = new Array(col).fill('');
            line.push(gestores[Math.floor(rng() * gestores.length)], rng() < 0.5 ? 'Lunes' : (rng() < 0.5 ? 'nan' : ''));
            rows.push(line);
        }

        rows.push(['']);
    }

    return rows;
}

testAsync('loadTeletrabajo: bloques, selector, tabla y errores — idéntico a app.js (120 escenarios con semilla)', async () => {
    const rng = createRng(8642);

    for (let i = 0; i < 120; i++) {
        const user = [{ role: 'Gestor', uid: 'g1', name: 'Ana Prueba' }, { role: 'Admin', uid: 'a1', name: 'Jefe' }, null][Math.floor(rng() * 3)];
        const plan = rng() < 0.1 ? { ok: false, status: 404 } : (rng() < 0.05 ? { throws: 'sin red' } : { ok: true, payload: { rows: randomTeleSheet(rng) } });
        const sc = {
            user, fetchPlan: { 'Teletrabajo/': plan }, selected: rng() < 0.3 ? { teletrabajoGestorMultiSelect: ['Luis Fuentes'] } : {},
            docOpts: rng() < 0.1 ? { missingIds: ['teletrabajoWeekSelector'] } : (rng() < 0.05 ? { missingIds: ['teletrabajoTableHead'] } : {})
        };
        const shots = await runBoth(sc, async (mode, controller) => {
            if (mode === 'legacy') loadTeletrabajo(); else controller.loadTeletrabajo();
            await settle();

            const weekSelector = document.byId.get('teletrabajoWeekSelector');
            if (weekSelector) safe(() => weekSelector.fire('change', { target: { value: '0' } }));
            if (multiSelectSetups.teletrabajoGestorMultiSelect) {
                multiSelectSelected.teletrabajoGestorMultiSelect = ['María López'];
                safe(() => multiSelectSetups.teletrabajoGestorMultiSelect());
            }
        });

        assert.deepEqual(shots.nuevo, shots.legacy, `escenario ${i}`);
    }
});

// ======================================================================================================
// loadPermisos y openPermisoDetailModal
// ======================================================================================================
function makePermissionsDb(data, { failOnce = false } = {}) {
    const all = data || {};
    const mk = (filter) => ({
        orderByChild(key) { return { equalTo(value) { return mk((k, v) => v[key] === value); } }; },
        async once() {
            if (failOnce) throw new Error('permission_denied');
            const picked = {};
            Object.keys(all).forEach((k) => { if (!filter || filter(k, all[k])) picked[k] = all[k]; });
            const empty = Object.keys(picked).length === 0;
            return { exists: () => !empty, val: () => JSON.parse(JSON.stringify(picked)) };
        }
    });

    return { ref(path) { if (path === 'permissions') return mk(null); const id = path.split('/')[1]; return { async once() { if (failOnce) throw new Error('x'); return { exists: () => !!all[id], val: () => JSON.parse(JSON.stringify(all[id])) }; } }; }, data: {}, log: [] };
}

function randomPermissionData(rng) {
    const data = {};
    const gestores = ['Ana Prueba', 'Luis Fuentes', "O'Neil <b>"];

    for (let i = 0; i < Math.floor(rng() * 7); i++) {
        data['-key' + i] = {
            id: 1_760_000_000_000 + Math.floor(rng() * 1e8), uid: rng() < 0.6 ? 'g1' : 'g2', gestor: gestores[Math.floor(rng() * 3)],
            tipo: 'Cita médica', fecha: '2026-10-07', horaInicio: '08:00', horaFin: '10:00', motivo: 'm <x>',
            status: ['Pendiente', 'Aprobado', 'Rechazado'][Math.floor(rng() * 3)], rejectionReason: rng() < 0.3 ? 'no & no' : undefined,
            fechaDesde: rng() < 0.2 ? '2026-10-01' : undefined, fechaHasta: rng() < 0.2 ? '2026-10-09' : undefined, horaSolicitud: rng() < 0.5 ? '06/10/2026 08:00:00' : undefined
        };
    }

    return data;
}

async function runPermissionsBoth(sc, data, opts, run) {
    const shots = {};

    for (const mode of ['legacy', 'nuevo']) {
        setupScenario(sc);
        const db = makePermissionsDb(data, opts);
        database = db;
        const controller = mode === 'nuevo' ? newController(db) : null;

        await run(mode, controller);
        await settle();
        shots[mode] = takeShot(null);
    }

    return shots;
}

testAsync('loadPermisos: consulta por rol, filtro de privacidad, orden y HTML — idéntico a app.js (150 escenarios con semilla)', async () => {
    const rng = createRng(97531);

    for (let i = 0; i < 150; i++) {
        const user = [{ role: 'Gestor', uid: 'g1', name: 'Ana Prueba' }, { role: 'Gestor', name: 'Luis Fuentes' }, { role: 'Admin', uid: 'a1', name: 'Jefe' }, { role: 'Supervisor', name: 'S' }, null][Math.floor(rng() * 5)];
        const sc = { user, authUid: rng() < 0.2 ? null : 'g1', docOpts: rng() < 0.08 ? { missingIds: ['historicoPermisosList'] } : {} };
        const shots = await runPermissionsBoth(sc, randomPermissionData(rng), { failOnce: rng() < 0.08 }, async (mode, controller) => {
            if (mode === 'legacy') await loadPermisos(); else await controller.loadPermisos();
        });

        assert.deepEqual(shots.nuevo, shots.legacy, `escenario ${i}`);
    }
});

testAsync('openPermisoDetailModal: usa el historial cargado o lee de Firebase; avisa si no existe — idéntico a app.js', async () => {
    const data = randomPermissionData(createRng(5));
    data['-solo-remoto'] = { id: 1_760_000_000_001, gestor: 'Ana Prueba', tipo: 'Vacaciones', fecha: 'x', status: 'Aprobado', motivo: 'm', fechaDesde: '2026-10-01', fechaHasta: '2026-10-09' };
    const user = { role: 'Admin', uid: 'a1', name: 'Jefe' };

    for (const [fbId, preload] of [['-key0', true], ['-solo-remoto', false], ['-solo-remoto', true], ['no-existe', true], ['no-existe', false]]) {
        for (const docOpts of [{}, { missingIds: ['permDetailModalBody'] }, { missingIds: ['permDetailModal'] }]) {
            const shots = await runPermissionsBoth({ user, docOpts }, data, {}, async (mode, controller) => {
                if (mode === 'legacy') {
                    if (preload) await loadPermisos();
                    await window.openPermisoDetailModal(fbId);
                } else {
                    if (preload) await controller.loadPermisos();
                    await controller.openPermisoDetailModal(fbId);
                }
            });

            assert.deepEqual(shots.nuevo, shots.legacy, `${fbId} preload=${preload} ${JSON.stringify(docOpts)}`);
        }
    }

    const found = await runPermissionsBoth({ user }, data, {}, async (mode, controller) => { if (mode === 'legacy') await window.openPermisoDetailModal('-solo-remoto'); else await controller.openPermisoDetailModal('-solo-remoto'); });

    assert.ok(found.nuevo.doc['#permDetailModal'].classes.includes('active'));
    assert.match(found.nuevo.doc['#permDetailModalBody'].innerHTML, /Desde 2026-10-01 hasta 2026-10-09/);

    const missing = await runPermissionsBoth({ user }, data, {}, async (mode, controller) => { if (mode === 'legacy') await window.openPermisoDetailModal('zzz'); else await controller.openPermisoDetailModal('zzz'); });

    assert.deepEqual(missing.nuevo.alerts, ['No se encontró información del permiso.']);
});

await summarizeAsync();
