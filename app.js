// Auth Check
const currentUserObj = localStorage.getItem('riskOps_currentUser');
if (!currentUserObj && !window.location.href.includes('login.html')) {
    window.location.href = 'login.html';
}

let currentUser = null;
try {
    currentUser = currentUserObj ? JSON.parse(currentUserObj) : null;
} catch(e) {
    localStorage.removeItem('riskOps_currentUser');
    window.location.href = 'login.html';
}
// Helper to remove accents and normalize names for comparison and file paths
function normalizeName(name) {
    if (!name) return "";
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

// Robust comparison: checks if all words of one name are present in the other
function namesMatch(name1, name2) {
    if (!name1 || !name2) return false;
    const n1 = normalizeName(name1);
    const n2 = normalizeName(name2);
    
    // Split into words and filter out very short ones (like 'de', 'la')
    const words1 = n1.split(/\s+/).filter(w => w.length > 2);
    const words2 = n2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return n1.includes(n2) || n2.includes(n1);

    // Check if all words of the shorter name are in the longer name
    const [shorter, longer] = words1.length <= words2.length ? [words1, n2] : [words2, n1];
    return shorter.every(word => longer.includes(word));
}

// Mapeo de URLs para documentos (especialmente videos pesados alojados en Google Drive)
const documentUrls = {
    "Revisión de Eventos Deportivos.mp4": "https://drive.google.com/file/d/1UqccsnUwTG6tgPcDYdUeLnf9XqvGzSoc/view?usp=sharing",
    "Revisión de Eventos.mp4": "https://drive.google.com/file/d/1SB9ePi1EOJU05hzOsxOyl7BeNvCN1hOh/view?usp=sharing",
    "Validación SEON.mp4": "https://drive.google.com/file/d/1JFf5basGD0gmrAVIy5AlMK1DBHYgE6JC/view?usp=sharing"
};

function getDocUrl(fileName) {
    if (documentUrls[fileName]) {
        return documentUrls[fileName];
    }
    return "Procesos/" + fileName;
}

let taskStateCache = {};
try {
    const cached = localStorage.getItem('riskOps_cache');
    if(cached) taskStateCache = JSON.parse(cached);
} catch(e) {}

let currentActiveTaskId = null;

// Live Clock Logic
function updateClock() {
    const clockElement = document.getElementById('liveClock');
    if (!clockElement) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    clockElement.textContent = `${hours}:${minutes}:${seconds}`;
}

// Update clock every second
setInterval(updateClock, 1000);
updateClock(); // Initial call

// Data source real
let allTasks = [];
let currentSelectedTask = null;

// Initialize Excel fetching
async function loadExcelTasks() {
    const container = document.querySelector('.tree-container');
    if(container) container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);"><i class="bx bx-loader-alt bx-spin"></i> Cargando Tareas...</div>';
    
    try {
        const url = encodeURI('Tareas Riesgo/Tareas de Riesgo.xlsx') + '?t=' + new Date().getTime();
        const response = await fetch(url);
        if(!response.ok) throw new Error("Error HTTP " + response.status);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        // Transform the data, group by Set
        const tasksBySet = {};
        
        json.forEach((row, index) => {
            const set = row['Set '] || row['Set'] || 'Otros';
            const taskName = row['Tarea'];
            
            if (!tasksBySet[set]) tasksBySet[set] = [];
            
            // Check for duplicates in the visual tree
            const isDuplicate = tasksBySet[set].some(t => t.name === taskName);
            
            if (!isDuplicate) {
                tasksBySet[set].push({
                    id: index,
                    name: taskName,
                    detail: row['Detalle de Tarea'],
                    time: row['Horario'],
                    day: row['Día']
                });
            }
            allTasks.push({ ...row, id: index });
        });
        // Populate Set Selector
        const select = document.getElementById('activeSetSelect');
        if(select) {
            select.innerHTML = '<option value="" disabled selected>Selecciona tu SET a trabajar...</option><option value="Todos">Mostrar Todos</option>';
            const setsKeys = Object.keys(tasksBySet).sort();
            setsKeys.forEach(set => {
                select.innerHTML += `<option value="${set}">${set}</option>`;
            });
            
            select.addEventListener('change', (e) => {
                const val = e.target.value;
                if(val === 'Todos') {
                    renderTree(tasksBySet);
                } else {
                    const filtered = {};
                    filtered[val] = tasksBySet[val];
                    renderTree(filtered);
                }
            });
        }
        
        // No renderizar todos por defecto, esperar selección
        const container = document.querySelector('.tree-container');
        if(container) container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">Selecciona un SET en el menú desplegable para ver las tareas.</div>';
        
    } catch(err) {
        console.error("Error loading tasks:", err);
        const container = document.querySelector('.tree-container');
        if(container) container.innerHTML = `<div style="padding: 20px; color: var(--danger);"><i class="bx bx-error-circle"></i> Error cargando tareas: ${err.message}</div>`;
    }
}

// Initializar parseo del Horario Personal
async function loadSchedule() {
    try {
        const url = encodeURI('Horario/Horario 2026.xlsx') + '?t=' + Date.now();
        const response = await fetch(url);
        if(!response.ok) throw new Error("Fallo red");
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        const tableHead = document.getElementById('scheduleTableHead');
        const tableBody = document.getElementById('scheduleTableBody');
        
        if(tableHead && tableBody && rows.length > 2) {
            
            // Función helper para parsear fechas de Excel a JS
            function formatExcelDate(serial) {
                if(!serial || isNaN(serial)) return "";
                // Usar UTC para evitar problemas de zonas horarias e historia de DST
                const epochUTC = Date.UTC(1899, 11, 30);
                const d = new Date(epochUTC + serial * 86400000);
                const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                return `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`;
            }
            
            let allScheduleBlocks = [];
            
            // Buscar en todas las filas TODOS los bloques de fechas disponibles
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
            
            if (allScheduleBlocks.length === 0) return; // No hay datos válidos
            
            const weekSelector = document.getElementById('weekSelector');
            
            // Siempre el último bloque por defecto
            let defaultBlockRow = allScheduleBlocks[allScheduleBlocks.length - 1].startRow; 
            
            if (weekSelector) {
                weekSelector.innerHTML = '';
                allScheduleBlocks.forEach(block => {
                    weekSelector.innerHTML += `<option value="${block.startRow}">${block.label}</option>`;
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
                    headHTML += `<th style="padding: 12px; color: var(--accent-primary); text-align: center;">${dayName}${subText}</th>`;
                }
                headHTML += '</tr>';
                tableHead.innerHTML = headHTML;
                
                tableBody.innerHTML = '';
                for(let rowIndex = blockStartRow + 2; rowIndex < rows.length; rowIndex++) {
                    const r = rows[rowIndex];
                    if (!r || !r[0] || String(r[0]).trim() === '' || String(r[0]).trim().toUpperCase() === 'GESTOR') break;
                    
                    let isCurrentUser = (currentUser && namesMatch(r[0], currentUser.name));
                    
                    if (currentUser && currentUser.role === 'Gestor' && !isCurrentUser) continue;

                    let bgClass = isCurrentUser ? 'rgba(59,130,246,0.1)' : 'transparent';
                    
                    let trHTML = `<tr class="hover-highlight" style="border-bottom: 1px solid var(--glass-border); background: ${bgClass};">`;
                    trHTML += `<td style="padding: 12px; font-weight: 600; text-align: left; color: ${isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)'}; position: sticky; left: 0; background: ${isCurrentUser ? 'var(--bg-dark)' : 'var(--bg-panel)'}; z-index: 1;">${r[0]}</td>`;
                    
                    // Encontrar el turno para mostrar en el badge principal
                    let badgeShift = null;
                    
                    for(let i = 1; i <= numCols; i++) {
                        const shift = r[i] || 'Descansa';
                        
                        if (isCurrentUser) {
                            if (!badgeShift && shift && !shift.includes('Descansa')) {
                                badgeShift = shift;
                            } else if (!badgeShift && i === numCols) {
                                badgeShift = shift; // fallback
                            }
                        }
                        
                        let badgeClass = 'pending';
                        const sLower = normalizeName(shift);
                        if(/\d\s*(am|pm)/i.test(shift)) badgeClass = 'in-progress';
                        else if(sLower.includes('vacacion')) badgeClass = 'vacaciones-badge';
                        else if(sLower.includes('descansa')) badgeClass = 'descanso-badge';
                        else if(sLower.includes('familia')) badgeClass = 'familia-badge';
                        
                        trHTML += `<td style="padding: 12px; text-align: center; white-space: nowrap;"><span class="badge ${badgeClass}">${shift}</span></td>`;
                    }
                    
                    if (isCurrentUser && badgeShift) {
                        const userRoleEl = document.getElementById('userRole');
                        if (userRoleEl) userRoleEl.textContent = `${currentUser.role} | Turno: ${badgeShift}`;
                        const headerShiftBadge = document.querySelector('.shift-badge');
                        if (headerShiftBadge) headerShiftBadge.textContent = `TURNO: ${badgeShift}`;
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

function loadTeletrabajo() {
    fetch('Teletrabajo/Teletrabajo.xlsx?v=' + Date.now())
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
            
            if(weekSelector) {
                weekSelector.innerHTML = '';
                allBlocks.forEach((block, idx) => {
                    weekSelector.innerHTML += `<option value="${idx}">${block.label}</option>`;
                });
                
                // Mostrar siempre la última semana disponible al inicio
                let defaultBlockIdx = allBlocks.length - 1;
                
                weekSelector.value = defaultBlockIdx;
                
                weekSelector.addEventListener('change', (e) => {
                    renderTeletrabajoBlock(allBlocks[e.target.value]);
                });
                
                renderTeletrabajoBlock(allBlocks[defaultBlockIdx]);
            }
            
            function renderTeletrabajoBlock(block) {
                tableHead.innerHTML = `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <th style="padding: 12px; color: var(--accent-primary); text-align: left; position: sticky; left: 0; background: var(--bg-panel); z-index: 2;">GESTOR <i class='bx bx-refresh' style='cursor:pointer; margin-left:5px;' onclick='loadTeletrabajo()' title='Refrescar Teletrabajo'></i></th>
                        <th style="padding: 12px; color: var(--accent-primary); text-align: center;">DÍA</th>
                        <th style="padding: 12px; color: var(--accent-primary); text-align: center;">MODALIDAD</th>
                    </tr>
                `;
                
                tableBody.innerHTML = '';
                block.data.forEach(row => {
                    let isCurrentUser = (currentUser && namesMatch(row.gestor, currentUser.name));
                    
                    if (currentUser && currentUser.role === 'Gestor' && !isCurrentUser) return;

                    let bgClass = isCurrentUser ? 'rgba(59,130,246,0.1)' : 'transparent';
                    
                    let isTeletrabajo = row.dia && row.dia.toLowerCase() !== 'nan';
                    let estadoHtml = isTeletrabajo ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">HOME OFFICE</span>` : `<span class="badge pending">PRESENCIAL</span>`;
                    
                    tableBody.innerHTML += `
                        <tr class="hover-highlight" style="border-bottom: 1px solid var(--glass-border); background: ${bgClass};">
                            <td style="padding: 12px; font-weight: 600; text-align: left; color: ${isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)'}; position: sticky; left: 0; background: ${isCurrentUser ? 'var(--bg-dark)' : 'var(--bg-panel)'}; z-index: 1;">${row.gestor}</td>
                            <td style="padding: 12px; text-align: center;">${isTeletrabajo ? row.dia : '-'}</td>
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

// Cargar Histórico de Permisos desde Firebase
async function loadPermisos() {
    try {
        const snapshot = await database.ref('permissions').once('value');
        const historicoContainer = document.getElementById('historicoPermisosList');
        if(!historicoContainer) return;
        
        historicoContainer.innerHTML = '';
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            let permisos = Object.keys(data).map(k => ({...data[k], fb_id: k}));
            
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
                
                let rejectionHtml = p.rejectionReason ? `<br><small style="color:var(--danger)">Razón: ${p.rejectionReason}</small>` : '';

                historicoContainer.innerHTML += `
                    <div class="tree-item" style="margin-top: 10px;">
                        <div class="tree-header">
                            <i class='bx ${icon}'></i>
                            <div style="display:flex; flex-direction:column;">
                                <span>${p.tipo}</span>
                                <small style="font-size:11px; opacity:0.7">${p.gestor} | ${p.fecha} (${p.horaInicio} a ${p.horaFin})${rejectionHtml}</small>
                            </div>
                            <span class="badge ${badgeClass}" style="margin-left: auto;">${p.status}</span>
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

function renderTree(tasksBySet) {
    const container = document.querySelector('.tree-container');
    if(!container) return;
    
    container.innerHTML = ''; // clear mock
    
    // Sort keys logically
    const sets = Object.keys(tasksBySet).sort();
    
    sets.forEach(set => {
        const setDiv = document.createElement('div');
        setDiv.className = 'tree-item';
        
        const total = tasksBySet[set].length;
        
        setDiv.innerHTML = `
            <div class="tree-header" onclick="toggleTree(this)">
                <i class='bx bx-chevron-right'></i>
                <span>${set}</span>
                <span class="badge pending">${total} Tareas</span>
            </div>
            <div class="tree-children">
                ${tasksBySet[set].map(task => {
                    let statusClass = 'status-pending';
                    if (taskStateCache[task.id]) {
                        const statusText = taskStateCache[task.id].status;
                        if (statusText === 'Finalizada') statusClass = 'status-completed';
                        else if (statusText === 'En Proceso') statusClass = 'status-in-progress';
                        else if (statusText === 'No Realizada') statusClass = 'status-not-done';
                    }
                    return `
                    <div class="task-item" onclick="selectTask(${task.id})">
                        <i class='bx bx-file-blank'></i> ${task.name}
                        <div class="task-status ${statusClass}"></div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(setDiv);
    });
    
    // Update KPI whenever tree is rendered
    updateKPI();
}

function updateKPI() {
    const totalTasks = document.querySelectorAll('.task-item').length;
    const completedTasks = document.querySelectorAll('.task-item .status-completed').length;
    const notDoneTasks = document.querySelectorAll('.task-item .status-not-done').length;
    
    // Finalizadas = completed + not-done
    const finalized = completedTasks + notDoneTasks; 
    const pending = totalTasks - finalized;
    
    let percentage = 0;
    if (totalTasks > 0) {
        percentage = Math.round((finalized / totalTasks) * 100);
    }
    
    const kpiContainer = document.querySelector('.kpi-card');
    if (kpiContainer) {
        kpiContainer.innerHTML = `
            <div class="kpi-circle">
                <svg viewBox="0 0 36 36" class="circular-chart" style="width: 100%; height: 100%;">
                    <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke: var(--glass-border); stroke-width: 3.8;"/>
                    <path class="circle" stroke-dasharray="${percentage}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke-width: 3.8; stroke-linecap: round; stroke: var(--success); transition: stroke-dasharray 1s ease-out;"/>
                    <text x="18" y="20.35" class="percentage" style="fill: var(--text-primary); font-family: 'Inter'; font-size: 8px; font-weight: bold; text-anchor: middle;">${percentage}%</text>
                </svg>
            </div>
            <div class="kpi-stats">
                <p><strong>${totalTasks}</strong> Tareas Asignadas</p>
                <p><strong>${finalized}</strong> Finalizadas</p>
                <p><strong>${pending}</strong> Pendientes</p>
            </div>
        `;
    }
}

function toggleTree(element) {
    element.classList.toggle('open');
    const childrenContainer = element.nextElementSibling;
    if (childrenContainer) {
        childrenContainer.classList.toggle('show');
    }
}

// Renderizar documentos en el panel de accesos rápidos
function renderQuickDocs(selectedTaskName) {
    const container = document.getElementById('quickDocsList');
    if (!container) return;

    const archivos = [
        "Instructivo de revisión de apuestas casino.pdf",
        "Instructivo de validación de GGR Casino.pdf",
        "Política Procedimiento De Aprobación De Retiros.pdf",
        "Procedimiento Identificación de jineteo.pdf",
        "Proceso de Eliminación de Cuentas - Implementaciones.pdf",
        "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf",
        "Revisión de Eventos Deportivos.mp4",
        "Revisión de Eventos.mp4",
        "Validación SEON.mp4"
    ];

    let matchedDoc = null;
    if (selectedTaskName) {
        const taskNameLower = selectedTaskName.toLowerCase();
        if (taskNameLower.includes('ggr')) matchedDoc = "Instructivo de validación de GGR Casino.pdf";
        else if (taskNameLower.includes('apuesta')) matchedDoc = "Instructivo de revisión de apuestas casino.pdf";
        else if (taskNameLower.includes('retiro')) matchedDoc = "Política Procedimiento De Aprobación De Retiros.pdf";
        else if (taskNameLower.includes('jineteo') || taskNameLower.includes('jineteo')) matchedDoc = "Procedimiento Identificación de jineteo.pdf";
        else if (taskNameLower.includes('eliminaci')) matchedDoc = "Proceso de Eliminación de Cuentas - Implementaciones.pdf";
        else if (taskNameLower.includes('bonos')) matchedDoc = "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf";
        else if (taskNameLower.includes('deportiv')) matchedDoc = "Revisión de Eventos Deportivos.mp4";
        else if (taskNameLower.includes('evento')) matchedDoc = "Revisión de Eventos.mp4";
        else if (taskNameLower.includes('seon')) matchedDoc = "Validación SEON.mp4";
    }

    container.innerHTML = '';

    // Si hay un documento que coincide, mostrarlo destacado arriba
    if (matchedDoc) {
        const isVideo = matchedDoc.toLowerCase().endsWith('.mp4');
        const isWord = matchedDoc.toLowerCase().endsWith('.docx') || matchedDoc.toLowerCase().endsWith('.doc');
        const isExcel = matchedDoc.toLowerCase().endsWith('.xlsx') || matchedDoc.toLowerCase().endsWith('.xls');
        
        let icon = 'bx-file-pdf';
        let color = '#FF5A5A'; // PDF red
        
        if (isVideo) { icon = 'bx-video'; color = '#3B82F6'; }
        else if (isWord) { icon = 'bx-file-blank'; color = '#2563EB'; } // Word blue
        else if (isExcel) { icon = 'bx-table'; color = '#10B981'; } // Excel green

        container.innerHTML += `
            <div style="margin-bottom: 12px; background: rgba(0, 180, 216, 0.1); padding: 10px; border-radius: var(--radius-md); border: 1px dashed var(--accent-primary);">
                <span style="font-size: 10px; color: var(--accent-primary); font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                    <i class='bx bxs-star'></i> Sugerido para esta tarea
                </span>
                <a href="${getDocUrl(matchedDoc)}" target="_blank" class="doc-link" style="background: transparent; padding: 0; display: flex; align-items: center; gap: 10px;">
                    <i class='bx ${icon}' style="font-size: 20px; color: ${color};"></i>
                    <span style="color: var(--text-primary); font-weight: 500; font-size: 13px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${matchedDoc.replace(/\.[^/.]+$/, "")}</span>
                </a>
            </div>
            <div style="height: 1px; background: var(--glass-border); margin: 10px 0;"></div>
        `;
    }

    // Listar todos los demás documentos
    archivos.forEach(file => {
        if (file === matchedDoc) return; // Omitir el destacado ya listado

        const isVideo = file.toLowerCase().endsWith('.mp4');
        const isWord = file.toLowerCase().endsWith('.docx') || file.toLowerCase().endsWith('.doc');
        const isExcel = file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls');
        
        let icon = 'bx-file-pdf';
        let color = '#FF5A5A'; // PDF red
        
        if (isVideo) { icon = 'bx-video'; color = '#3B82F6'; }
        else if (isWord) { icon = 'bx-file-blank'; color = '#2563EB'; } // Word blue
        else if (isExcel) { icon = 'bx-table'; color = '#10B981'; } // Excel green

        container.innerHTML += `
            <a href="${getDocUrl(file)}" target="_blank" class="doc-link" style="margin-bottom: 8px;">
                <i class='bx ${icon}' style="font-size: 18px; color: ${color};"></i>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">${file.replace(/\.[^/.]+$/, "")}</span>
            </a>
        `;
    });
}

// Global scope logic for onclick elements
window.selectTask = function(taskId) {
    currentActiveTaskId = taskId;
    // Remove active
    document.querySelectorAll('.task-item').forEach(el => el.classList.remove('active'));
    // Add active
    const eventTarget = window.event && window.event.currentTarget;
    if(eventTarget) eventTarget.classList.add('active');
    
    const task = allTasks.find(t => t.id === taskId);
    if(task) {
        const titleElement = document.getElementById('currentTaskTitle');
        if (titleElement) titleElement.textContent = task['Tarea'];
        currentSelectedTask = task;
        
        // Renderizar accesos rápidos destacando el documento de esta tarea
        renderQuickDocs(task['Tarea']);
        
        // Populate instructions text area if we want to
        const textArea = document.getElementById('taskObservation');
        if(textArea) {
           textArea.value = task['Detalle de Tarea'] || "";
        }

        // Restore from cache if exists
        document.querySelectorAll('.btn-status').forEach(el => el.classList.remove('active'));
        if(taskStateCache[taskId]) {
            if(textArea) textArea.value = taskStateCache[taskId].observation;
            
            const cachedStatus = taskStateCache[taskId].status;
            let found = false;
            document.querySelectorAll('.btn-status').forEach(el => {
                if(el.textContent.trim() === cachedStatus) {
                    el.classList.add('active');
                    found = true;
                }
            });
            if(!found) document.querySelector('.btn-status.pending').classList.add('active');
        } else {
            if(textArea) textArea.value = ""; // Limpiar nota de otras tareas
            document.querySelector('.btn-status.pending').classList.add('active');
        }
    }
}

// Task Status Buttons Interaction
function initApp() {
    // Carga de Excel Inicial
    loadExcelTasks();
    loadSchedule();
    loadTeletrabajo();
    loadPermisos();
    renderQuickDocs(null);

    // Theme logic
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        const savedTheme = localStorage.getItem('riskOps_theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        themeToggleBtn.innerHTML = savedTheme === 'dark' ? "<i class='bx bx-moon'></i>" : "<i class='bx bx-sun'></i>";
        
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('riskOps_theme', newTheme);
            themeToggleBtn.innerHTML = newTheme === 'dark' ? "<i class='bx bx-moon'></i>" : "<i class='bx bx-sun'></i>";
        });
    }

    // Populate user UI
    if (currentUser) {
        const userNameEl = document.querySelector('.user-name');
        const roleEl = document.querySelector('.user-role');
        const shiftBadgeEl = document.querySelector('.shift-badge');
        
        if (userNameEl) userNameEl.textContent = currentUser.name;
        if (roleEl) roleEl.textContent = currentUser.role;
        if (shiftBadgeEl) shiftBadgeEl.textContent = 'Turno ' + currentUser.shift;
        
        const avatarEl = document.querySelector('.avatar');
        if (avatarEl && currentUser.name) {
            const availableAvatars = [
                "Alexander Villada.png",
                "Camilo Espinosa.png",
                "Daniel Benavidez.png",
                "Josue Alvarez.png",
                "Juan Jose Diaz.png",
                "Maria Sanchez.png",
                "Marilyn Jimenez.png",
                "Oriana Borja.png",
                "Samuel Cruz.png",
                "Sara Santamaria.png",
                "Sebastian Arango.png",
                "Sebastian Hincapie.png",
                "Yefferson Giraldo.png"
            ];
            
            const fullName = currentUser.name.trim();
            // Buscar una imagen que coincida con el nombre registrado
            let matchedAvatar = availableAvatars.find(img => namesMatch(fullName, img.replace('.png', '')));
            console.log("DEBUG_AVATAR: fullName =", fullName, "matchedAvatar =", matchedAvatar);
            
            if (matchedAvatar) {
                avatarEl.src = `assets/src/img/${matchedAvatar}`;
                // Fallback por si la imagen se borra o falla
                avatarEl.onerror = function() {
                    this.onerror = null;
                    this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
                };
            } else {
                avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
            }
        }

        // Show Aprobaciones tab for Supervisor/Admin
        if (currentUser.role === 'Admin' || currentUser.role === 'Supervisor') {
            const navAprobaciones = document.getElementById('navAprobaciones');
            const navTurnos = document.getElementById('navTurnos');
            const navWorkspace = document.getElementById('navWorkspace');
            const viewWorkspace = document.getElementById('view-workspace');
            const viewAprobaciones = document.getElementById('view-aprobaciones');
            const viewTurnos = document.getElementById('view-turnos');
            const permissionForm = document.getElementById('permissionForm');
            const endShiftBtn = document.getElementById('endShiftBtn');

            if(navAprobaciones) navAprobaciones.style.display = 'flex';
            if(navTurnos) navTurnos.style.display = 'flex';
            if(navWorkspace) navWorkspace.style.display = 'none';
            if(viewWorkspace) viewWorkspace.style.display = 'none';
            
            // Forzar vista de Aprobaciones como inicial
            if(viewAprobaciones) {
                document.querySelectorAll('.view-panel').forEach(v => v.style.display = 'none');
                viewAprobaciones.style.display = 'block';
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                navAprobaciones.classList.add('active');
            }
            
            // Ocultar formulario de pedir permiso
            const crearPermisoPanel = document.getElementById('crearPermisoPanel');
            const permisosLayout = document.getElementById('permisosLayout');
            if(crearPermisoPanel) crearPermisoPanel.style.display = 'none';
            if(permisosLayout) permisosLayout.style.gridTemplateColumns = '1fr';
            if(permissionForm) permissionForm.style.display = 'none';
            
            // Cambiar Finalizar Turno por Cerrar Sesión
            if(endShiftBtn) {
                endShiftBtn.innerHTML = "<i class='bx bx-log-out'></i> Cerrar Sesión";
                endShiftBtn.onclick = function(e) {
                    e.preventDefault();
                    if(confirm("¿Seguro que deseas cerrar sesión?")) {
                        localStorage.removeItem('riskOps_currentUser');
                        firebase.auth().signOut().catch(err => console.error(err));
                        window.location.href = 'login.html';
                    }
                };
            }
            
            // Ocultar el badge del turno para Admin/Supervisor
            const headerShiftBadgeAdmin = document.querySelector('.shift-badge');
            if (headerShiftBadgeAdmin) headerShiftBadgeAdmin.style.display = 'none';

            renderPendingUsers();
            
            const notifList = document.getElementById('notificationList');
            const notifCount = document.getElementById('notificationCount');

            database.ref('permissions').on('value', (snapshot) => {
                let unreadCount = 0;
                let notifsHtml = '';
                
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const perms = Object.keys(data).map(k => ({...data[k], fb_id: k}));
                    const pending = perms.filter(p => p.status === 'Pendiente');
                    pending.sort((a,b) => b.id - a.id);
                    
                    pending.forEach(p => {
                        if (p.notified_admin === false) unreadCount++;
                        let bg = p.notified_admin === false ? 'rgba(59,130,246,0.1)' : 'transparent';
                        
                        notifsHtml += `
                            <div style="background: ${bg}; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); display: flex; gap: 10px; align-items: start; cursor: pointer; transition: background 0.2s;" onclick="document.getElementById('navAprobaciones').click(); document.getElementById('notificationDropdown').style.display = 'none';">
                                <i class='bx bx-time' style="color: var(--warning); font-size: 18px; margin-top: 2px;"></i>
                                <div style="flex-grow: 1;">
                                    <div style="font-size: 12px; font-weight: 500; color: var(--text-primary);">Nuevo Permiso Solicitado</div>
                                    <div style="font-size: 11px; color: var(--text-secondary);">${p.gestor} - ${p.tipo}</div>
                                </div>
                            </div>
                        `;
                    });
                }
                
                if (notifsHtml === '') {
                    notifList.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px;">No tienes notificaciones nuevas.</p>';
                } else {
                    notifList.innerHTML = notifsHtml;
                }
                
                if (unreadCount > 0) {
                    notifCount.textContent = unreadCount;
                    notifCount.style.display = 'block';
                } else {
                    notifCount.style.display = 'none';
                }
            });
            
        } else {
            // Escuchar notificaciones en tiempo real para el Gestor
            const notifList = document.getElementById('notificationList');
            const notifCount = document.getElementById('notificationCount');

            database.ref('permissions').orderByChild('gestor').equalTo(currentUser.name).on('value', (snapshot) => {
                let unreadCount = 0;
                let notifsHtml = '';
                
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const perms = Object.keys(data).map(k => ({...data[k], fb_id: k}));
                    // Solo finalizados
                    const finished = perms.filter(p => p.status !== 'Pendiente');
                    finished.sort((a,b) => b.id - a.id);
                    
                    finished.forEach(p => {
                        if (p.notified === false) unreadCount++;
                        let bg = p.notified === false ? 'rgba(59,130,246,0.1)' : 'transparent';
                        let iconColor = p.status === 'Aprobado' ? 'var(--success)' : 'var(--danger)';
                        let icon = p.status === 'Aprobado' ? 'bx-check-double' : 'bx-x';
                        let reasonHtml = p.rejectionReason ? `<div style="font-size:11px; color:var(--danger); margin-top:2px;">Razón: ${p.rejectionReason}</div>` : '';
                        
                        notifsHtml += `
                            <div style="background: ${bg}; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); display: flex; gap: 10px; align-items: start; cursor: pointer; transition: background 0.2s;" onclick="document.getElementById('navPermisos').click(); document.getElementById('notificationDropdown').style.display = 'none';">
                                <i class='bx ${icon}' style="color: ${iconColor}; font-size: 18px; margin-top: 2px;"></i>
                                <div style="flex-grow: 1;">
                                    <div style="font-size: 12px; font-weight: 500; color: var(--text-primary);">Permiso ${p.status}</div>
                                    <div style="font-size: 11px; color: var(--text-secondary);">${p.fecha} (${p.horaInicio} a ${p.horaFin})</div>
                                    ${reasonHtml}
                                </div>
                            </div>
                        `;
                    });
                }
                
                if (notifsHtml === '') {
                    notifList.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px;">No tienes notificaciones nuevas.</p>';
                } else {
                    notifList.innerHTML = notifsHtml;
                }
                
                if (unreadCount > 0) {
                    notifCount.textContent = unreadCount;
                    notifCount.style.display = 'block';
                } else {
                    notifCount.style.display = 'none';
                }
            });
        }
    }

    const statusBtns = document.querySelectorAll('.btn-status');
    statusBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Only toggle if it's not the 'No Realizada', as it opens a modal
            if(!this.classList.contains('not-done')) {
                statusBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    // Help Button (Instructivo)
    const helpBtn = document.getElementById('helpBtn');
    if(helpBtn) {
        helpBtn.addEventListener('click', () => {
            if(!currentSelectedTask) {
                alert("Selecciona una tarea primero.");
                return;
            }
            
            const taskName = (currentSelectedTask['Tarea'] || currentSelectedTask.name || '').toLowerCase();
            const archivos = [
                "Instructivo de revisión de apuestas casino.pdf",
                "Instructivo de validación de GGR Casino.pdf",
                "Política Procedimiento De Aprobación De Retiros.pdf",
                "Procedimiento Identificación de jineteo.pdf",
                "Proceso de Eliminación de Cuentas - Implementaciones.pdf",
                "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf",
                "Revisión de Eventos Deportivos.mp4",
                "Revisión de Eventos.mp4",
                "Validación SEON.mp4"
            ];
            
            let matchedDoc = null;
            if (taskName.includes('ggr')) matchedDoc = "Instructivo de validación de GGR Casino.pdf";
            else if (taskName.includes('apuesta')) matchedDoc = "Instructivo de revisión de apuestas casino.pdf";
            else if (taskName.includes('retiro')) matchedDoc = "Política Procedimiento De Aprobación De Retiros.pdf";
            else if (taskName.includes('jineteo')) matchedDoc = "Procedimiento Identificación de jineteo.pdf";
            else if (taskName.includes('eliminaci')) matchedDoc = "Proceso de Eliminación de Cuentas - Implementaciones.pdf";
            else if (taskName.includes('bonos')) matchedDoc = "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf";
            else if (taskName.includes('deportiv')) matchedDoc = "Revisión de Eventos Deportivos.mp4";
            else if (taskName.includes('evento')) matchedDoc = "Revisión de Eventos.mp4";
            else if (taskName.includes('seon')) matchedDoc = "Validación SEON.mp4";
            
            if (matchedDoc) {
                window.open(getDocUrl(matchedDoc), "_blank");
            } else {
                alert("No se encontró un documento específico para esta tarea. Por favor, búscalo en la pestaña Documentación.");
            }
        });
    }

    // Navegación de Vistas (Tabs)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Evitar redirigir erróneamente en el botón soporte real
            if(item.textContent.includes('Soporte')) {
                alert("Redirigiendo al IT HelpDesk...");
                return;
            }

            // UI
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Ocultar todas las vistas
            document.querySelectorAll('.view-panel').forEach(v => v.style.display = 'none');

            // Mostrar la correcta
            if(item.textContent.includes('Mis Tareas') || item.textContent.includes('Workspace')) document.getElementById('view-workspace').style.display = 'block';
            if(item.textContent.includes('Horario')) document.getElementById('view-horario').style.display = 'block';
            if(item.textContent.includes('Teletrabajo')) document.getElementById('view-teletrabajo').style.display = 'block';
            if(item.textContent.includes('Documentación')) document.getElementById('view-docs').style.display = 'block';
            if(item.textContent.includes('Permisos')) document.getElementById('view-permisos').style.display = 'block';
            if(item.textContent.includes('Historial Turnos')) {
                document.getElementById('view-turnos').style.display = 'block';
                renderShiftReports();
            }
            if(item.textContent.includes('Aprobaciones')) {
                document.getElementById('view-aprobaciones').style.display = 'block';
                renderPendingUsers();
                renderPendingPermissions();
            }
        });
    });

    // Inyectar documentos reales de la carpeta "Procesos" en el Módulo de Docs
    const docsGrid = document.querySelector('.docs-grid');
    if(docsGrid) {
        const archivos = [
            "Instructivo de revisión de apuestas casino.pdf",
            "Instructivo de validación de GGR Casino.pdf",
            "Política Procedimiento De Aprobación De Retiros.pdf",
            "Procedimiento Identificación de jineteo.pdf",
            "Proceso de Eliminación de Cuentas - Implementaciones.pdf",
            "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf",
            "Revisión de Eventos Deportivos.mp4",
            "Revisión de Eventos.mp4",
            "Validación SEON.mp4"
        ];

        archivos.forEach(file => {
            const isVideo = file.toLowerCase().endsWith('.mp4');
            const isWord = file.toLowerCase().endsWith('.docx') || file.toLowerCase().endsWith('.doc');
            const isExcel = file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls');
            
            let icon = 'bx-file-pdf';
            let color = '#FF5A5A'; // PDF red
            
            if(isVideo) { icon = 'bx-video'; color = '#3B82F6'; }
            else if(isWord) { icon = 'bx-file-blank'; color = '#2563EB'; } // Word blue
            else if(isExcel) { icon = 'bx-table'; color = '#10B981'; } // Excel green

            docsGrid.innerHTML += `
                <a href="${getDocUrl(file)}" target="_blank" class="glass-panel" style="padding: 20px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; transition: transform 0.2s;">
                    <i class='bx ${icon}' style="font-size: 40px; color: ${color};"></i>
                    <span style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${file.replace(/\.[^/.]+$/, "")}</span>
                </a>
            `;
        });
    }

    // Poblar nombre en form de permisos y manejar envío por AJAX
    if(currentUser) {
        const pName = document.getElementById('permisoGestorName');
        if(pName) pName.value = currentUser.name;
    }
    
    // Botón de guardar progreso en tarea
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    if(saveTaskBtn) {
        saveTaskBtn.addEventListener('click', () => {
            const selectedStatusBtn = document.querySelector('.btn-status.active');
            
            // Validación obligatoria para todas las tareas
            const obsField = document.getElementById('taskObservation');
            if(!obsField || !obsField.value.trim()) {
                alert("OBLIGATORIO: Debes detallar la gestión realizada en las Notas Técnicas antes de guardar.");
                return;
            }

            const btn = saveTaskBtn;
            const prevText = btn.innerHTML;
            btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = "<i class='bx bx-check'></i> Guardado Exitosamente";
                btn.classList.add('btn-success');
                
                // Actualizar estado visual de la tarea activa en el árbol
                const activeTask = document.querySelector('.task-item.active .task-status');
                const selectedStatusBtn = document.querySelector('.btn-status.active');
                
                if(activeTask && selectedStatusBtn) {
                    // Limpiar clases anteriores
                    activeTask.classList.remove('status-pending', 'status-completed', 'status-not-done', 'status-in-progress');
                    
                    if(selectedStatusBtn.classList.contains('completed')) {
                        activeTask.classList.add('status-completed');
                    } else if(selectedStatusBtn.classList.contains('in-progress')) {
                        activeTask.classList.add('status-in-progress');
                    } else if(selectedStatusBtn.classList.contains('not-done')) {
                        activeTask.classList.add('status-not-done');
                    } else {
                        activeTask.classList.add('status-pending');
                    }
                    
                    // Save to cache
                    const obsValue = document.getElementById('taskObservation') ? document.getElementById('taskObservation').value : '';
                    if(currentActiveTaskId !== null) {
                        taskStateCache[currentActiveTaskId] = {
                            name: currentSelectedTask ? currentSelectedTask['Tarea'] : 'Tarea ' + currentActiveTaskId,
                            status: selectedStatusBtn.textContent.trim(),
                            observation: obsValue
                        };
                        localStorage.setItem('riskOps_cache', JSON.stringify(taskStateCache));
                    }
                    
                    updateKPI();
                }

                setTimeout(() => {
                    btn.innerHTML = prevText;
                    btn.disabled = false;
                    btn.classList.remove('btn-success');
                }, 2000);
            }, 800);
        });
    }

    const pForm = document.getElementById('permisosForm');
    
    // Toggle para la opción "Otro"
    const pSelect = document.getElementById('tipoPermisoSelect');
    const pOtroCont = document.getElementById('otroPermisoContainer');
    const pOtroInp = document.getElementById('otroPermisoInput');
    if(pSelect && pOtroCont && pOtroInp) {
        pSelect.addEventListener('change', (e) => {
            if(e.target.value === 'Otro') {
                pOtroCont.style.display = 'block';
                pOtroInp.required = true;
            } else {
                pOtroCont.style.display = 'none';
                pOtroInp.required = false;
                pOtroInp.value = '';
            }
        });
    }

    if(pForm) {
        pForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Evitar recarga
            
            const formData = new FormData(pForm);
            
            const tipo = formData.get("Tipo_Permiso");
            const especifico = formData.get("Especificacion_Otro");
            const finalTipo = tipo === 'Otro' ? `Otro (${especifico})` : tipo;

            const newPermiso = {
                id: Date.now(),
                gestor: formData.get("Gestor"),
                tipo: finalTipo,
                fecha: formData.get("Fecha"),
                horaInicio: formData.get("Hora_Inicio"),
                horaFin: formData.get("Hora_Fin"),
                motivo: formData.get("Justificacion"),
                status: 'Pendiente',
                notified: false,
                notified_admin: false
            };
            
            const btn = pForm.querySelector('button[type="submit"]');
            const prevText = btn.innerHTML;
            btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Enviando solicitud...";
            btn.disabled = true;

            try {
                await database.ref('permissions').push(newPermiso);
            } catch(e) {
                console.error("Error Firebase local", e);
            }

            fetch(pForm.action, {
                method: pForm.method,
                body: formData,
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if(response.ok) {
                    alert('¡Permiso solicitado exitosamente! Está pendiente de aprobación.');
                    pForm.reset();
                    if(currentUser) pForm.querySelector('#permisoGestorName').value = currentUser.name;
                    loadPermisos(); // Refresh local permissions UI if they are an admin looking at it
                } else {
                    alert('Hubo un error contactando el servidor de correos.');
                }
            }).catch(err => {
                alert('No hay Internet. Se simula envío exitoso.');
            }).finally(() => {
                btn.innerHTML = prevText;
                btn.disabled = false;
            });
        });
    }
}

// Lógica explícita para el botón (llamado desde onclick en html)
function handleEndShift() {
    if(confirm("¿Estás seguro que deseas finalizar tu turno actual? Se enviará un resumen al supervisor.")) {
        
        let currentUser = null;
        try { currentUser = JSON.parse(localStorage.getItem('riskOps_currentUser')); } catch(e) {}
        
        if (currentUser) {
            // Build task report
            const setSelect = document.getElementById('activeSetSelect');
            if(setSelect && setSelect.value === 'Todos') {
                alert("OBLIGATORIO: Debes seleccionar el SET específico en el que trabajaste antes de finalizar el turno (Arriba a la derecha).");
                return;
            }

            const formData = new FormData();
            
            // Format login time
            const loginDate = new Date(currentUser.loginTime);
            
            formData.append("Usuario", currentUser.name);
            formData.append("Rol", currentUser.role);
            formData.append("Reporte", "CIERRE DE TURNO Y RESUMEN DE TAREAS");
            formData.append("Hora_Inicio_Turno", loginDate.toLocaleString());
            formData.append("Hora_Fin_Turno", new Date().toLocaleString());
            
            if(setSelect) {
                formData.append("SET_Principal_Trabajado", setSelect.value);
            }
            
            formData.append("_subject", `Reporte de Turno: ${currentUser.name}`);
            formData.append("_captcha", "false");
            
            // Build task report
            let report = "";
            let keys = Object.keys(taskStateCache);
            if(keys.length === 0) {
                report = "El gestor no marcó ninguna tarea explícitamente durante este turno.";
            } else {
                keys.forEach(id => {
                    let t = taskStateCache[id];
                    report += `\n[ ${t.status.toUpperCase()} ] - ${t.name}\nObservación: ${t.observation || 'N/A'}\n`;
                });
            }
            formData.append("Resumen_de_Tareas", report);
            
            // Reemplazar texto del botón para feedback visual
            const btn = document.getElementById('endShiftBtn');
            const prevHtml = btn ? btn.innerHTML : '';
            if(btn) {
                btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Notificando...";
                btn.disabled = true;
            }

            // --- RESPALDO SEGURO EN FIREBASE ---
            const shiftReportObject = {
                gestor: currentUser.name,
                rol: currentUser.role,
                horaInicio: loginDate.toLocaleString(),
                horaFin: new Date().toLocaleString(),
                setTrabajado: setSelect ? setSelect.value : 'N/A',
                reporte: report,
                timestamp: Date.now()
            };

            // Intentamos guardar en firebase pero no bloqueamos el flujo si hay error
            database.ref('shift_reports').push(shiftReportObject).catch(e => console.error("Firebase backup failed", e));

            // Antes de enviar, limpiamos la sesión y el caché
            localStorage.removeItem('riskOps_currentUser');
            localStorage.removeItem('riskOps_cache');
            firebase.auth().signOut().catch(err => console.error(err));
            
            // Enviar de forma silenciosa para que un error 522 de Cloudflare no bloquee la pantalla
            fetch('https://formsubmit.co/ajax/maria.sanchez@virtualsoft.tech', {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if(response.ok) {
                    alert('Turno finalizado y reporte enviado al supervisor.');
                } else {
                    alert('Turno finalizado localmente. Nota: El servidor de correos está inactivo temporalmente.');
                }
            }).catch(err => {
                alert('Turno finalizado. (Error de red al intentar enviar el correo).');
            }).finally(() => {
                window.location.href = 'login.html';
            });
        } else {
            alert("Turno finalizado.");
            localStorage.removeItem('riskOps_currentUser');
            localStorage.removeItem('riskOps_cache');
            firebase.auth().signOut().catch(err => console.error(err));
            window.location.href = 'login.html';
        }
    }
}

// Inicializar inmediatamente ya que el script está al final del DOM
initApp();

// Modal Logic
function openExceptionModal() {
    // Set 'not-done' active visually
    document.querySelectorAll('.btn-status').forEach(b => b.classList.remove('active'));
    document.querySelector('.btn-status.not-done').classList.add('active');
    
    // Clear previous exception inputs!
    const exReason = document.getElementById('exceptionReason');
    if(exReason) exReason.value = "";
    const exDetails = document.getElementById('exceptionDetails');
    if(exDetails) exDetails.value = "";
    
    // Open Modal
    const modal = document.getElementById('exceptionModal');
    if(modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.remove('active');
    }
}

function confirmException() {
    const select = document.getElementById('exceptionReason');
    const reasonText = select.options[select.selectedIndex].text;
    const details = document.getElementById('exceptionDetails').value.trim();
    
    if(!select.value) {
        alert('Por favor seleccione una razón principal.');
        return;
    }
    
    if(!details) {
        alert('Por favor detalle el problema obligatoriamente.');
        return;
    }
    
    const obsText = `Excepción: ${reasonText}${details ? ' - ' + details : ''}`;
    document.getElementById('taskObservation').value = obsText;
    closeModal('exceptionModal');
}

// Logic for Approving Users
async function renderPendingUsers() {
    const tbody = document.getElementById('pendingUsersTableBody');
    if (!tbody) return;
    
    let users = [];
    try { 
        const snapshot = await database.ref('users').once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            users = Object.keys(data).map(k => ({...data[k], id: k}));
        }
    } catch(e) {
        console.error(e);
    }
    
    const pending = users.filter(u => u.approved === false);
    const approved = users.filter(u => u.approved === true && u.email !== 'maria.sanchez@virtualsoft.tech');
    
    tbody.innerHTML = '';
    
    // Mostramos primero los pendientes, luego los aprobados
    const allDisplayUsers = [...pending, ...approved];
    
    if (allDisplayUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay usuarios registrados en el sistema.</td></tr>`;
        return;
    }
    
    allDisplayUsers.forEach(user => {
        let actionHtml = '';
        if (user.approved === true) {
            actionHtml = `<span style="color: var(--success); font-weight: bold;"><i class='bx bx-check'></i> Aprobado</span>`;
        } else if (user.approved === 'Rechazado') {
            actionHtml = `<span style="color: var(--danger); font-weight: bold;"><i class='bx bx-x'></i> Rechazado</span>`;
        } else {
            actionHtml = `
                <div id="user-action-btns-${user.id}" style="display:flex; justify-content:center; gap:5px;">
                    <button class="btn btn-success" style="padding: 5px 10px; font-size: 12px;" onclick="approveUser('${user.id}')">Aprobar</button>
                    <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="showUserRejectBox('${user.id}')">Rechazar</button>
                </div>
                <div id="user-reject-box-${user.id}" style="display:none; flex-direction:column; gap:5px; margin-top:5px;">
                    <input type="text" id="user-reason-${user.id}" placeholder="Motivo de rechazo" class="modern-input" style="padding:4px; font-size:11px; width:100%;">
                    <div style="display:flex; gap:5px; justify-content:center;">
                        <button class="btn btn-danger" style="padding: 2px 5px; font-size: 10px;" onclick="confirmRejectUser('${user.id}')">Confirmar</button>
                        <button class="btn btn-outline" style="padding: 2px 5px; font-size: 10px;" onclick="cancelRejectUser('${user.id}')">Cancelar</button>
                    </div>
                </div>
            `;
        }
        
        let statusBadge = user.approved ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">${user.role}</span>` : `<span class="badge pending">${user.role}</span>`;

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px;">${user.name}</td>
                <td style="padding: 12px; color: var(--text-secondary);">${user.email}</td>
                <td style="padding: 12px;">${statusBadge}</td>
                <td style="padding: 12px; text-align: center;">
                    ${actionHtml}
                </td>
            </tr>
        `;
    });
}

async function approveUser(userId) {
    if(!confirm(`¿Estás seguro de aprobar el acceso para este usuario?`)) return;
    
    try {
        await database.ref('users/' + userId).update({
            approved: true
        });
        alert('Usuario aprobado exitosamente. Ahora puede iniciar sesión.');
        renderPendingUsers(); // Reload table
    } catch(e) {
        alert('Error al contactar al servidor');
    }
}

function showUserRejectBox(id) {
    document.getElementById('user-action-btns-' + id).style.display = 'none';
    document.getElementById('user-reject-box-' + id).style.display = 'flex';
}

function cancelRejectUser(id) {
    document.getElementById('user-reject-box-' + id).style.display = 'none';
    document.getElementById('user-action-btns-' + id).style.display = 'flex';
    document.getElementById('user-reason-' + id).value = '';
}

async function confirmRejectUser(userId) {
    const reason = document.getElementById('user-reason-' + userId).value.trim();
    if (!reason) {
        alert("Debes escribir un motivo de rechazo.");
        return;
    }
    
    try {
        await database.ref('users/' + userId).update({
            approved: 'Rechazado',
            rejectionReason: reason
        });
        alert('Usuario rechazado exitosamente.');
        renderPendingUsers(); // Reload table
    } catch(e) {
        alert('Error al contactar al servidor');
    }
}

// Logic for Approving Permissions
async function renderPendingPermissions() {
    const tbody = document.getElementById('pendingPermissionsTableBody');
    if (!tbody) return;
    
    let permisos = [];
    try { 
        const snapshot = await database.ref('permissions').once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            permisos = Object.keys(data).map(k => ({...data[k], fb_id: k}));
        }
    } catch(e) {
        console.error(e);
    }
    
    const pending = permisos.filter(p => p.status === 'Pendiente');
    
    tbody.innerHTML = '';
    
    if (pending.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay permisos pendientes de aprobación.</td></tr>`;
        return;
    }
    
    pending.forEach(p => {
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-weight: 500;">${p.gestor}</td>
                <td style="padding: 12px;"><span class="badge pending">${p.tipo}</span></td>
                <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">${p.fecha}<br>${p.horaInicio} a ${p.horaFin}</td>
                <td style="padding: 12px; font-size: 13px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.motivo}">${p.motivo}</td>
                <td style="padding: 12px; text-align: center;">
                    <div id="perm-action-btns-${p.fb_id}">
                        <button class="btn btn-success" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;" onclick="showPermApproveBox('${p.fb_id}')"><i class='bx bx-check'></i></button>
                        <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="showPermRejectBox('${p.fb_id}')"><i class='bx bx-x'></i></button>
                    </div>
                    <div id="perm-approve-box-${p.fb_id}" style="display:none; flex-direction:column; gap:5px; margin-top:5px;">
                        <input type="text" id="perm-approve-reason-${p.fb_id}" placeholder="Motivo de aprobación" class="modern-input" style="padding:4px; font-size:11px; width:100%;">
                        <div style="display:flex; gap:5px;">
                            <button class="btn btn-success" style="padding: 2px 5px; font-size: 10px;" onclick="confirmApprovePerm('${p.fb_id}')">Confirmar</button>
                            <button class="btn btn-outline" style="padding: 2px 5px; font-size: 10px;" onclick="cancelApprovePerm('${p.fb_id}')">Cancelar</button>
                        </div>
                    </div>
                    <div id="perm-reject-box-${p.fb_id}" style="display:none; flex-direction:column; gap:5px; margin-top:5px;">
                        <input type="text" id="perm-reason-${p.fb_id}" placeholder="Motivo de rechazo" class="modern-input" style="padding:4px; font-size:11px; width:100%;">
                        <div style="display:flex; gap:5px;">
                            <button class="btn btn-danger" style="padding: 2px 5px; font-size: 10px;" onclick="confirmRejectPerm('${p.fb_id}')">Confirmar</button>
                            <button class="btn btn-outline" style="padding: 2px 5px; font-size: 10px;" onclick="cancelRejectPerm('${p.fb_id}')">Cancelar</button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    const historyBody = document.getElementById('historyPermissionsTableBody');
    if(historyBody) {
        historyBody.innerHTML = '';
        const history = permisos.filter(p => p.status !== 'Pendiente');
        
        if (history.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay historial de permisos procesados.</td></tr>`;
        } else {
            // Ordenar los más recientes primero
            history.sort((a, b) => b.id - a.id);
            history.forEach(p => {
                let statusBadge = p.status === 'Aprobado' ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);"><i class='bx bx-check'></i> Aprobado</span>` : `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: var(--danger);"><i class='bx bx-x'></i> Rechazado</span>`;
                historyBody.innerHTML += `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <td style="padding: 12px; font-weight: 500;">${p.gestor}</td>
                        <td style="padding: 12px;">${p.tipo}</td>
                        <td style="padding: 12px;">${statusBadge}</td>
                        <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">${p.fecha}</td>
                        <td style="padding: 12px; font-size: 13px; color: var(--text-secondary);">${p.rejectionReason || '-'}</td>
                    </tr>
                `;
            });
        }
    }
}

function showPermRejectBox(id) {
    document.getElementById('perm-action-btns-' + id).style.display = 'none';
    document.getElementById('perm-reject-box-' + id).style.display = 'flex';
}

function cancelRejectPerm(id) {
    document.getElementById('perm-reject-box-' + id).style.display = 'none';
    document.getElementById('perm-action-btns-' + id).style.display = 'block';
    document.getElementById('perm-reason-' + id).value = '';
}

async function confirmRejectPerm(id) {
    const reason = document.getElementById('perm-reason-' + id).value.trim();
    if (!reason) {
        alert("Debes escribir un motivo de rechazo.");
        return;
    }
    await updatePermissionStatus(id, 'Rechazado', reason);
}

function showPermApproveBox(id) {
    document.getElementById('perm-action-btns-' + id).style.display = 'none';
    document.getElementById('perm-approve-box-' + id).style.display = 'flex';
}

function cancelApprovePerm(id) {
    document.getElementById('perm-approve-box-' + id).style.display = 'none';
    document.getElementById('perm-action-btns-' + id).style.display = 'block';
    document.getElementById('perm-approve-reason-' + id).value = '';
}

async function confirmApprovePerm(id) {
    const reason = document.getElementById('perm-approve-reason-' + id).value.trim();
    if (!reason) {
        alert("Debes escribir una observación para aprobar el permiso.");
        return;
    }
    await updatePermissionStatus(id, 'Aprobado', reason);
}

async function updatePermissionStatus(fb_id, newStatus, reason = null) {
    try {
        const updates = { status: newStatus, notified: false };
        if (reason) {
            updates.rejectionReason = reason;
        }
        
        await database.ref('permissions/' + fb_id).update(updates);
        
        alert(`Permiso ${newStatus} exitosamente.`);
        renderPendingPermissions(); // Reload table
        loadPermisos(); // Reload historical permissions if looking at it
    } catch(e) {
        alert('Error al contactar al servidor');
    }
}

// Exportar Reporte a PDF
window.exportShiftReport = async function(fb_id) {
    try {
        const snapshot = await database.ref('shift_reports/' + fb_id).once('value');
        if(!snapshot.exists()) return alert("No se encontró el reporte en la base de datos.");
        
        const r = snapshot.val();
        
        // Inicializar jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(16);
        doc.setTextColor(13, 138, 188); // Accent color
        doc.text("REPORTE DE TURNO - RISK MANAGER", 15, 20);
        
        // Metadatos
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.text("Gestor: " + (r.gestor || 'N/A'), 15, 35);
        doc.text("Rol: " + (r.rol || 'N/A'), 15, 42);
        doc.text("SET Trabajado: " + (r.setTrabajado || 'N/A'), 15, 49);
        doc.text("Hora de Inicio: " + (r.horaInicio || 'N/A'), 15, 56);
        doc.text("Hora de Fin: " + (r.horaFin || 'N/A'), 15, 63);
        
        // Línea separadora
        doc.setLineWidth(0.5);
        doc.line(15, 70, 195, 70);
        
        // Resumen
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Resumen de Tareas:", 15, 80);
        
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        
        const reportText = r.reporte || 'Sin reporte detallado.';
        const splitText = doc.splitTextToSize(reportText, 180);
        
        doc.text(splitText, 15, 90);
        
        // Guardar
        const safeName = (r.gestor || 'Gestor').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateStr = new Date(r.timestamp || Date.now()).toISOString().split('T')[0];
        doc.save(`Reporte_${safeName}_${dateStr}.pdf`);
        
    } catch(e) {
        alert("Hubo un error al intentar exportar el reporte.");
        console.error(e);
    }
};

// Logic for Shift Reports History
async function renderShiftReports() {
    const tbody = document.getElementById('shiftReportsTableBody');
    if (!tbody) return;
    
    let reports = [];
    try { 
        const snapshot = await database.ref('shift_reports').once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            reports = Object.keys(data).map(k => ({...data[k], fb_id: k}));
        }
    } catch(e) {
        console.error("Error cargando historial de turnos:", e);
    }
    
    tbody.innerHTML = '';
    
    if (reports.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay historial de turnos registrados.</td></tr>`;
        return;
    }
    
    // Sort descending by timestamp
    reports.sort((a, b) => b.timestamp - a.timestamp);
    
    reports.forEach(r => {
        // Formatear el reporte de tareas para que sea legible en HTML
        const safeReport = (r.reporte || 'Sin reporte').replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<strong>[$1]</strong>');
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-weight: 500;">
                    ${r.gestor}
                    <div style="font-size: 11px; color: var(--text-secondary);">${r.rol}</div>
                </td>
                <td style="padding: 12px; color: var(--accent-primary);">${r.setTrabajado}</td>
                <td style="padding: 12px; font-size: 13px;">${r.horaInicio}</td>
                <td style="padding: 12px; font-size: 13px;">${r.horaFin}</td>
                <td style="padding: 12px; font-size: 12px; color: var(--text-secondary); max-width: 300px; text-align: left;">
                    <div style="max-height: 80px; overflow-y: auto; background: var(--bg-dark); padding: 5px; border-radius: 4px;">
                        ${safeReport}
                    </div>
                </td>
                <td style="padding: 12px; text-align: center;">
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" onclick="exportShiftReport('${r.fb_id}')">
                        <i class='bx bx-file-blank'></i> Exportar PDF
                    </button>
                </td>
            </tr>
        `;
    });
}

// Helper Notification function
function toggleNotifications() {
    const drop = document.getElementById('notificationDropdown');
    if (drop) {
        if (drop.style.display === 'none' || drop.style.display === '') {
            drop.style.display = 'block';
        } else {
            drop.style.display = 'none';
        }
    }
}

async function markAllAsRead() {
    if (!currentUser) return;
    try {
        if (currentUser.role === 'Admin' || currentUser.role === 'Supervisor') {
            const snapshot = await database.ref('permissions').once('value');
            if (snapshot.exists()) {
                const data = snapshot.val();
                const updates = {};
                for (let key in data) {
                    if (data[key].notified_admin === false && data[key].status === 'Pendiente') {
                        updates[key + '/notified_admin'] = true;
                    }
                }
                if (Object.keys(updates).length > 0) {
                    await database.ref('permissions').update(updates);
                }
            }
        } else {
            const snapshot = await database.ref('permissions').orderByChild('gestor').equalTo(currentUser.name).once('value');
            if (snapshot.exists()) {
                const data = snapshot.val();
                const updates = {};
                for (let key in data) {
                    if (data[key].notified === false && data[key].status !== 'Pendiente') {
                        updates[key + '/notified'] = true;
                    }
                }
                if (Object.keys(updates).length > 0) {
                    await database.ref('permissions').update(updates);
                }
            }
        }
    } catch(e) {
        console.error(e);
    }
}

// Funciones del Modal de Perfil
function openProfileModal() {
    const avatarEl = document.querySelector('.user-profile .avatar');
    const modalImg = document.getElementById('modalProfileAvatar');
    if (avatarEl && modalImg) {
        modalImg.src = avatarEl.src;
    }
    
    if (currentUser) {
        const modalName = document.getElementById('modalProfileName');
        if (modalName) modalName.textContent = currentUser.name || 'Usuario';
        
        const modalRole = document.getElementById('modalProfileRole');
        if (modalRole) modalRole.textContent = currentUser.role || 'Rol';
    }

    document.getElementById('profileModal').classList.add('active');
    document.getElementById('newPasswordInput').value = '';
    const msg = document.getElementById('passwordChangeMsg');
    if (msg) msg.style.display = 'none';
}

function toggleProfilePassword(iconElement) {
    const input = document.getElementById('newPasswordInput');
    if (input.type === 'password') {
        input.type = 'text';
        iconElement.classList.remove('bx-show');
        iconElement.classList.add('bx-hide');
    } else {
        input.type = 'password';
        iconElement.classList.remove('bx-hide');
        iconElement.classList.add('bx-show');
    }
}

async function changePassword() {
    const newPass = document.getElementById('newPasswordInput').value;
    const msg = document.getElementById('passwordChangeMsg');
    
    if(!newPass || newPass.trim() === '') {
        msg.textContent = 'Por favor ingresa una contraseña válida.';
        msg.style.color = 'var(--danger)';
        msg.style.display = 'block';
        return;
    }
    
    msg.textContent = 'Actualizando...';
    msg.style.color = 'var(--text-primary)';
    msg.style.display = 'block';
    
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            await user.updatePassword(newPass);
            msg.textContent = '¡Contraseña actualizada exitosamente en Firebase Auth!';
            msg.style.color = 'var(--success)';
            setTimeout(() => closeModal('profileModal'), 2000);
        } else {
            msg.textContent = 'Error: No hay sesión activa en Firebase Auth. Por favor, vuelve a iniciar sesión.';
            msg.style.color = 'var(--danger)';
        }
    } catch(e) {
        msg.textContent = 'Error al actualizar contraseña.';
        if (e.code === 'auth/requires-recent-login') {
            msg.textContent = 'Por seguridad, debes cerrar sesión e iniciar sesión nuevamente para cambiar tu contraseña.';
        } else if (e.code === 'auth/weak-password') {
            msg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        }
        msg.style.color = 'var(--danger)';
        console.error("Error al actualizar la contraseña:", e);
    }
}
