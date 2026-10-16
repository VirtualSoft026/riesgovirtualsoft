import { createRunner, assert } from '../test-harness.mjs';
import { createFakeDocument, snapshotDocument, createRng, FakeElement } from '../controllers/tareas-fake-dom.mjs';
import { createTaskWorkspaceController, countDomTasks } from '../../controllers/task-controller.js';
import { getTaskStatusClass, buildTaskKpiHTML, buildTreeSetHTML, sortedSetKeys, shouldAutoExpandTree } from '../../ui/views/task-tree-view.js';
import { buildQuickDocsHTML } from '../../ui/views/quick-docs-view.js';
import { toggleTreeElement } from '../../ui/components/tree-toggle.js';
import {
    buildAdminPermissionNotifications, buildGestorPermissionNotifications, NOTIFICATIONS_EMPTY_HTML,
    resolvePermissionsQueryUid, selectVisiblePermissions, resolvePermissionCreatedText,
    buildPermissionHistoryItemHTML, buildPermissionDetailHTML
} from '../../ui/views/permission-history-view.js';
import { escapeHTML, encodeInlineHandlerArg } from '../../utils/sanitization.js';
import { normalizeLegacyHtml } from '../helpers/w50-delegation.mjs';
import { getDocUrl } from '../../config/doc-links.js';
import { computeKpiFigures, computeSyncPercentage } from '../../domain/tasks/task-progress.js';

const shotText = (d) => JSON.stringify(snapshotDocument(d));

const { test, summarize } = createRunner('vistas de tareas y permisos (árbol, KPI, documentos rápidos, notificaciones; diferencial vs app.js)');

// ======================================================================================================
// Entorno simulado para el código LITERAL de app.js
// ======================================================================================================
let document = null;
let taskStateCache = {};
let currentUser = null;
let syncCalls = 0;
let allLoadedPermissions = [];
function syncActiveSessionToFirebase() { syncCalls += 1; }
const console = { error() {}, log() {}, warn() {} };


// --- copia LITERAL de app.js líneas 2123-2125 (canonicalTaskId) ---
function canonicalTaskId(id) {
    return String(id);
}

// --- copia LITERAL de app.js líneas 2063-2112 (renderTree) ---
function renderTree(tasksBySet) {
    const container = document.querySelector('.tree-container');
    if(!container) return;
    
    container.innerHTML = ''; // clear mock
    
    // Sort keys logically
    const sets = Object.keys(tasksBySet).sort();
    const shouldAutoExpand = sets.length === 1;
    
    sets.forEach(set => {
        const setDiv = document.createElement('div');
        setDiv.className = 'tree-item';
        
        const total = tasksBySet[set].length;
        const headerClass = shouldAutoExpand ? 'tree-header open' : 'tree-header';
        const childrenClass = shouldAutoExpand ? 'tree-children show' : 'tree-children';
        
        setDiv.innerHTML = `
            <div class="${headerClass}" data-action="toggle-tree">
                <i class='bx bx-chevron-right'></i>
                <span>${escapeHTML(set)}</span>
                <span class="badge pending">${total} Tareas</span>
            </div>
            <div class="${childrenClass}">
                ${tasksBySet[set].map(task => {
                    const cId = canonicalTaskId(task.id);
                    const taskEntry = taskStateCache[cId] || taskStateCache[task.id];
                    let statusClass = 'status-pending';
                    if (taskEntry) {
                        const statusText = taskEntry.status;
                        if (statusText === 'Finalizada') statusClass = 'status-completed';
                        else if (statusText === 'En Proceso') statusClass = 'status-in-progress';
                        else if (statusText === 'No Realizada') statusClass = 'status-not-done';
                    }
                    return `
                    <div class="task-item" onclick="selectTask(decodeURIComponent('${encodeInlineHandlerArg(task.id)}'), event)">
                        <i class='bx bx-file-blank'></i> ${escapeHTML(task.name)}
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

// --- copia LITERAL de app.js líneas 2474-2517 (updateKPI) ---
function updateKPI() {
    const totalTasks = document.querySelectorAll('.task-item').length;
    const completedTasks = document.querySelectorAll('.task-item .status-completed').length;
    const notDoneTasks = document.querySelectorAll('.task-item .status-not-done').length;
    
    // Finalizadas = completed + not-done
    const finalized = completedTasks + notDoneTasks; 
    const pending = totalTasks - finalized;
    
    let completedPercentage = 0;
    let notDonePercentage = 0;
    let totalPercentage = 0;
    
    if (totalTasks > 0) {
        completedPercentage = Math.round((completedTasks / totalTasks) * 100);
        notDonePercentage = Math.round((notDoneTasks / totalTasks) * 100);
        totalPercentage = completedPercentage + notDonePercentage;
    }
    
    const kpiContainer = document.querySelector('.kpi-card');
    if (kpiContainer) {
        kpiContainer.innerHTML = `
            <div class="kpi-circle">
                <svg viewBox="0 0 36 36" class="circular-chart" style="width: 100%; height: 100%;">
                    <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke: var(--glass-border); stroke-width: 3.8;"/>
                    <path class="circle" stroke-dasharray="${completedPercentage}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke-width: 3.8; stroke-linecap: round; stroke: var(--success); transition: stroke-dasharray 1s ease-out;"/>
                    <path class="circle-not-done" stroke-dasharray="${notDonePercentage}, 100" stroke-dashoffset="-${completedPercentage}" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke-width: 3.8; stroke-linecap: round; stroke: var(--danger); transition: stroke-dasharray 1s ease-out, stroke-dashoffset 1s ease-out;"/>
                    <text x="18" y="20.35" class="percentage" style="fill: var(--text-primary); font-family: 'Inter'; font-size: 8px; font-weight: bold; text-anchor: middle;">${totalPercentage}%</text>
                </svg>
            </div>
            <div class="kpi-stats">
                <p><strong>${totalTasks}</strong> Asignadas</p>
                <p><strong style="color: var(--success);">${completedTasks}</strong> Realizadas</p>
                <p><strong style="color: var(--danger);">${notDoneTasks}</strong> No Realizadas</p>
                <p><strong>${pending}</strong> Pendientes</p>
            </div>
        `;
    }

    // Sincronizar sesión activa si es gestor
    if (currentUser && currentUser.role === 'Gestor') {
        syncActiveSessionToFirebase();
    }
}

// --- copia LITERAL de app.js líneas 2519-2525 (toggleTree) ---
function toggleTree(element) {
    element.classList.toggle('open');
    const childrenContainer = element.nextElementSibling;
    if (childrenContainer) {
        childrenContainer.classList.toggle('show');
    }
}

// --- copia LITERAL de app.js líneas 2528-2609 (renderQuickDocs) ---
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
                <a href="${getDocUrl(matchedDoc)}" target="_blank" rel="noopener noreferrer" class="doc-link" style="background: transparent; padding: 0; display: flex; align-items: center; gap: 10px;">
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
            <a href="${getDocUrl(file)}" target="_blank" rel="noopener noreferrer" class="doc-link" style="margin-bottom: 8px;">
                <i class='bx ${icon}' style="font-size: 18px; color: ${color};"></i>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">${file.replace(/\.[^/.]+$/, "")}</span>
            </a>
        `;
    });
}

function legacyAdminNotifications(snapshot, notifList, notifCount) {
// --- copia LITERAL de app.js líneas 2967-3003 (listener de notificaciones Admin/Supervisor) ---
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
                                    <div style="font-size: 11px; color: var(--text-secondary);">${escapeHTML(p.gestor)} - ${escapeHTML(p.tipo)}</div>
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
}

function legacyGestorNotifications(snapshot, notifList, notifCount) {
// --- copia LITERAL de app.js líneas 3014-3055 (listener de notificaciones del Gestor) ---
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
                        let reasonHtml = p.rejectionReason ? `<div style="font-size:11px; color:var(--danger); margin-top:2px;">Razón: ${escapeHTML(p.rejectionReason)}</div>` : '';
                        
                        notifsHtml += `
                            <div style="background: ${bg}; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); display: flex; gap: 10px; align-items: start; cursor: pointer; transition: background 0.2s;" onclick="document.getElementById('navPermisos').click(); document.getElementById('notificationDropdown').style.display = 'none';">
                                <i class='bx ${icon}' style="color: ${iconColor}; font-size: 18px; margin-top: 2px;"></i>
                                <div style="flex-grow: 1;">
                                    <div style="font-size: 12px; font-weight: 500; color: var(--text-primary);">Permiso ${escapeHTML(p.status)}</div>
                                    <div style="font-size: 11px; color: var(--text-secondary);">${escapeHTML(p.fecha)} (${escapeHTML(p.horaInicio)} a ${escapeHTML(p.horaFin)})</div>
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
}

function legacyVisiblePermissions(data, currentUser) {
// --- copia LITERAL de app.js líneas 1910-1919 (loadPermisos: lista visible) ---
            let permisos = Object.keys(data).map(k => ({...data[k], fb_id: k}));
            allLoadedPermissions = permisos;
            
            // Filtro de privacidad: Gestor solo ve lo suyo. Admin ve todo.
            if (currentUser && currentUser.role !== 'Admin' && currentUser.role !== 'Supervisor') {
                permisos = permisos.filter(p => p.gestor === currentUser.name);
            }
            
            // Ordenar por ID descendente (más nuevos primero)
            permisos.sort((a,b) => b.id - a.id);
    return permisos;
}

function legacyHistoryItem(historicoContainer, p) {
// --- copia LITERAL de app.js líneas 1927-1959 (loadPermisos: elemento del historial) ---
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
}

function legacyDetailBody(body, perm) {
// --- copia LITERAL de app.js líneas 1987-2055 (openPermisoDetailModal: cuerpo) ---
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
}

// ======================================================================================================
// Utilidades
// ======================================================================================================
function makeTaskItems(statuses) {
    return statuses.map((s) => {
        const el = new FakeElement('div');
        el.statusClass = s;
        return el;
    });
}

/** Registra en el documento simulado las listas que usan updateKPI()/syncActiveSessionToFirebase(). */
function setDomCounts(doc, { total, completed, notDone }) {
    doc.setAll('.task-item', new Array(total).fill(0));
    doc.setAll('.task-item .status-completed', new Array(completed).fill(0));
    doc.setAll('.task-item .status-not-done', new Array(notDone).fill(0));
}

/**
 * `legacyProgress: true` (por defecto en ESTE helper): las pruebas diferenciales comparan contra la copia literal de
 * app.js, que pinta el % de la tarjeta KPI como suma de dos porcentajes redondeados. El comportamiento DECIDIDO (D8,
 * mismo % que el latido) se prueba aparte con `legacyProgress: false`.
 */
function newWorkspace(doc, user, cache, { legacyProgress = true } = {}) {
    return createTaskWorkspaceController({
        legacyProgress,
        doc,
        getUser: () => user,
        getTaskCache: () => cache,
        getAllTasks: () => [],
        setActiveTaskId: () => {},
        setSelectedTask: () => {},
        getDocUrl,
        syncActiveSession: () => { syncCalls += 1; },
        escape: escapeHTML,
        encodeArg: encodeInlineHandlerArg
    });
}

function randomTasksBySet(rng) {
    const sets = ['Casino', 'Deportes', 'Pagos & "Bonos"', "Retiros d'oro", 'Otros'];
    const tasksBySet = {};
    const n = 1 + Math.floor(rng() * 4);

    for (let i = 0; i < n; i++) {
        const set = sets[Math.floor(rng() * sets.length)];
        tasksBySet[set] = tasksBySet[set] || [];

        for (let k = 0; k < Math.floor(rng() * 4); k++) {
            tasksBySet[set].push({ id: rng() < 0.5 ? Math.floor(rng() * 8) : 10000 + Math.floor(rng() * 50), name: ['Revisar <GGR>', "Validar d'apuestas", 'Tarea & más', 'Ñandú'][Math.floor(rng() * 4)] });
        }
    }

    return tasksBySet;
}

function randomCache(rng) {
    const statuses = ['Finalizada', 'En Proceso', 'No Realizada', 'Pendiente', 'raro', undefined];
    const cache = {};

    for (let id = 0; id < 8; id++) if (rng() < 0.6) cache[String(id)] = { status: statuses[Math.floor(rng() * statuses.length)] };
    for (let id = 10000; id < 10050; id++) if (rng() < 0.2) cache[String(id)] = { status: statuses[Math.floor(rng() * statuses.length)] };

    return cache;
}

// ======================================================================================================
// renderTree + updateKPI
// ======================================================================================================
test('renderTree: mismo DOM que app.js (200 escenarios aleatorios: 0..4 Sets, ids number/string, estados, caracteres especiales)', () => {
    const rng = createRng(4242);
    let autoExpanded = 0;

    for (let i = 0; i < 200; i++) {
        const tasksBySet = randomTasksBySet(rng);
        const cache = randomCache(rng);
        const user = rng() < 0.5 ? { role: 'Gestor', uid: 'g1' } : { role: 'Admin' };
        const counts = { total: Math.floor(rng() * 8), completed: 0, notDone: 0 };
        counts.completed = Math.floor(rng() * (counts.total + 1));
        counts.notDone = Math.floor(rng() * (counts.total - counts.completed + 1));

        // original
        document = createFakeDocument();
        setDomCounts(document, counts);
        taskStateCache = JSON.parse(JSON.stringify(cache));
        currentUser = user;
        syncCalls = 0;
        renderTree(tasksBySet);
        const legacyShot = snapshotDocument(document);
        const legacySync = syncCalls;

        // módulo nuevo
        const doc = createFakeDocument();
        setDomCounts(doc, counts);
        syncCalls = 0;
        newWorkspace(doc, user, JSON.parse(JSON.stringify(cache))).renderTree(tasksBySet);

        assert.deepEqual(snapshotDocument(doc), normalizeLegacyHtml(legacyShot), `escenario ${i}`);
        assert.equal(syncCalls, legacySync);
        assert.equal(doc.created.length, document.created.length);
        if (Object.keys(tasksBySet).length === 1) autoExpanded += 1;
    }

    assert.ok(autoExpanded > 10, 'la muestra incluye árboles de un solo Set (auto-expandido)');
});

test('renderTree: sin contenedor no hace nada; un Set se auto-expande y varios no', () => {
    document = createFakeDocument({ missingSelectors: ['.tree-container'] });
    renderTree({ A: [] });
    assert.equal(document.created.length, 0);

    const doc = createFakeDocument({ missingSelectors: ['.tree-container'] });
    newWorkspace(doc, null, {}).renderTree({ A: [] });
    assert.equal(doc.created.length, 0);

    assert.equal(shouldAutoExpandTree(['A']), true);
    assert.equal(shouldAutoExpandTree(['A', 'B']), false);
    assert.equal(shouldAutoExpandTree([]), false);
    assert.deepEqual(sortedSetKeys({ b: 1, B: 2, a: 3 }), ['B', 'a', 'b']);
    assert.match(buildTreeSetHTML({ set: 'S', tasks: [{ id: 1, name: 'n' }], taskStateCache: {}, shouldAutoExpand: true }), /tree-header open/);
    assert.match(buildTreeSetHTML({ set: 'S', tasks: [{ id: 1, name: 'n' }], taskStateCache: {}, shouldAutoExpand: false }), /class="tree-header" /);
});

test('getTaskStatusClass: Finalizada/En Proceso/No Realizada/otro → clase del indicador (igual que app.js)', () => {
    const rows = [
        [{ status: 'Finalizada' }, 'status-completed'], [{ status: 'En Proceso' }, 'status-in-progress'], [{ status: 'No Realizada' }, 'status-not-done'],
        [{ status: 'Pendiente' }, 'status-pending'], [{ status: 'x' }, 'status-pending'], [undefined, 'status-pending'], [null, 'status-pending']
    ];

    rows.forEach(([entry, expected]) => assert.equal(getTaskStatusClass(entry), expected));
});

test('updateKPI: misma tarjeta que app.js para TODAS las combinaciones 0..12 y misma regla de latido (solo Gestor)', () => {
    let n = 0;

    for (let total = 0; total <= 12; total++) {
        for (let completed = 0; completed <= total; completed++) {
            for (let notDone = 0; notDone <= total - completed; notDone++) {
                for (const user of [{ role: 'Gestor' }, { role: 'Admin' }, null]) {
                    const counts = { total, completed, notDone };

                    document = createFakeDocument();
                    setDomCounts(document, counts);
                    currentUser = user;
                    syncCalls = 0;
                    updateKPI();
                    const legacyShot = snapshotDocument(document);
                    const legacySync = syncCalls;

                    const doc = createFakeDocument();
                    setDomCounts(doc, counts);
                    syncCalls = 0;
                    newWorkspace(doc, user, {}).updateKPI();

                    assert.deepEqual(snapshotDocument(doc), normalizeLegacyHtml(legacyShot));
                    assert.equal(syncCalls, legacySync);
                    n += 1;
                }
            }
        }
    }

    assert.ok(n > 1000);
    assert.equal(buildTaskKpiHTML(computeKpiFigures({ total: 4, completed: 2, notDone: 1 })).includes('75%'), true);
});

// ------------------------------------------------------------------------------------------------------
// D8 (decisión 2026-10-06): la tarjeta KPI muestra el MISMO entero que el latido (formatProgress)
// ------------------------------------------------------------------------------------------------------
test('D8: updateKPI por defecto pinta 67 % con 1 realizada + 1 no realizada de 3 (app.js pintaba 66 %), y el latido envía 67', () => {
    const counts = { total: 3, completed: 1, notDone: 1 };

    document = createFakeDocument();
    setDomCounts(document, counts);
    currentUser = { role: 'Gestor' };
    updateKPI();
    assert.ok(shotText(document).includes('>66%</text>'), 'app.js (copia literal) pinta 66 %');

    const doc = createFakeDocument();
    setDomCounts(doc, counts);
    newWorkspace(doc, { role: 'Gestor' }, {}, { legacyProgress: false }).updateKPI();
    const shot = shotText(doc);
    assert.ok(shot.includes('>67%</text>'), 'la tarjeta decidida pinta 67 %');
    assert.ok(!shot.includes('>66%</text>'));
    assert.equal(computeSyncPercentage(countDomTasks(doc)).percentage, 67, 'el latido calcula 67 % con el mismo DOM');
});

test('D8: para TODAS las combinaciones 0..12 el % de la tarjeta (por defecto) es el del latido; 0 tareas -> 0 %', () => {
    let distintosApp = 0;

    for (let total = 0; total <= 12; total++) {
        for (let completed = 0; completed <= total; completed++) {
            for (let notDone = 0; notDone <= total - completed; notDone++) {
                const doc = createFakeDocument();
                setDomCounts(doc, { total, completed, notDone });
                newWorkspace(doc, { role: 'Admin' }, {}, { legacyProgress: false }).updateKPI();
                const expected = computeSyncPercentage({ total, completed, notDone }).percentage;
                assert.ok(shotText(doc).includes(`>${expected}%</text>`), `${completed}+${notDone}/${total} -> ${expected}%`);
                if (computeKpiFigures({ total, completed, notDone }, { legacy: true }).totalPercentage !== expected) distintosApp += 1;
            }
        }
    }

    assert.ok(distintosApp > 0, 'hay combinaciones en las que app.js mostraba otro número (' + distintosApp + ')');
    const empty = createFakeDocument();
    setDomCounts(empty, { total: 0, completed: 0, notDone: 0 });
    newWorkspace(empty, null, {}, { legacyProgress: false }).updateKPI();
    assert.ok(shotText(empty).includes('>0%</text>'));
});

test('updateKPI: sin .kpi-card igual no revienta y sigue sincronizando al Gestor', () => {
    document = createFakeDocument({ missingSelectors: ['.kpi-card'] });
    setDomCounts(document, { total: 1, completed: 0, notDone: 0 });
    currentUser = { role: 'Gestor' };
    syncCalls = 0;
    updateKPI();
    const legacySync = syncCalls;

    const doc = createFakeDocument({ missingSelectors: ['.kpi-card'] });
    setDomCounts(doc, { total: 1, completed: 0, notDone: 0 });
    syncCalls = 0;
    newWorkspace(doc, { role: 'Gestor' }, {}).updateKPI();

    assert.equal(syncCalls, legacySync);
    assert.equal(syncCalls, 1);
});

// ======================================================================================================
// renderQuickDocs, toggleTree
// ======================================================================================================
test('renderQuickDocs: mismo HTML que app.js sin tarea, con cada palabra clave y con nombres sin coincidencia', () => {
    const names = [null, undefined, '', 'Revisión GGR', 'Validar apuestas', 'Retiros', 'Jineteo', 'Eliminación de cuentas', 'Bonos CRM', 'Eventos deportivos', 'Revisión de eventos', 'SEON', 'nada que ver'];

    names.forEach((name) => {
        document = createFakeDocument();
        renderQuickDocs(name);
        const legacyShot = snapshotDocument(document);

        const doc = createFakeDocument();
        newWorkspace(doc, null, {}).renderQuickDocs(name);

        assert.deepEqual(snapshotDocument(doc), normalizeLegacyHtml(legacyShot), String(name));
        assert.equal(buildQuickDocsHTML(name, getDocUrl), doc.getElementById('quickDocsList').innerHTML);
    });

    document = createFakeDocument({ missingIds: ['quickDocsList'] });
    renderQuickDocs('ggr');
    const doc = createFakeDocument({ missingIds: ['quickDocsList'] });
    newWorkspace(doc, null, {}).renderQuickDocs('ggr');
    assert.equal(doc.byId.size, 0);
});

test('toggleTree: alterna open en el encabezado y show en su hermano, igual que app.js; sin hermano solo el encabezado', () => {
    const make = (withSibling) => {
        const header = new FakeElement('div');
        const children = new FakeElement('div');
        if (withSibling) header.nextElementSibling = children;
        return { header, children };
    };

    for (const withSibling of [true, false]) {
        const a = make(withSibling);
        const b = make(withSibling);
        const c = make(withSibling);

        for (let i = 0; i < 3; i++) {
            toggleTree(a.header);
            toggleTreeElement(b.header);
            newWorkspace(createFakeDocument(), null, {}).toggleTree(c.header);

            assert.equal(b.header.classList.toString(), a.header.classList.toString());
            assert.equal(b.children.classList.toString(), a.children.classList.toString());
            assert.equal(c.header.classList.toString(), a.header.classList.toString());
        }
    }
});

// ======================================================================================================
// Notificaciones de permisos (listeners de initApp) y vistas de historial/detalle
// ======================================================================================================
function randomPermissions(rng) {
    const statuses = ['Pendiente', 'Aprobado', 'Rechazado'];
    const data = {};

    for (let i = 0; i < Math.floor(rng() * 6); i++) {
        data['-key' + i] = {
            id: 1_700_000_000_000 + Math.floor(rng() * 1e9),
            uid: 'g1',
            gestor: ['Ana <b>', "Luis O'Neil", 'María'][Math.floor(rng() * 3)],
            tipo: ['Cita médica', 'Vacaciones', 'Otro (x & y)'][Math.floor(rng() * 3)],
            fecha: '2026-10-0' + (1 + Math.floor(rng() * 8)),
            horaInicio: '08:00',
            horaFin: '10:00',
            status: statuses[Math.floor(rng() * 3)],
            notified: rng() < 0.5 ? false : true,
            notified_admin: rng() < 0.5 ? false : undefined,
            rejectionReason: rng() < 0.4 ? 'Motivo <script>' : undefined
        };
    }

    return data;
}

test('notificaciones de Admin/Supervisor y de Gestor: mismo HTML y no leídos que los listeners de initApp (200 escenarios)', () => {
    const rng = createRng(909);

    for (let i = 0; i < 200; i++) {
        const data = randomPermissions(rng);
        const exists = Object.keys(data).length > 0;
        const snapshot = { exists: () => exists, val: () => data };

        for (const [legacyFn, builder] of [[legacyAdminNotifications, buildAdminPermissionNotifications], [legacyGestorNotifications, buildGestorPermissionNotifications]]) {
            const notifList = { innerHTML: '' };
            const notifCount = { textContent: '', style: {} };
            legacyFn(snapshot, notifList, notifCount);
            const built = builder(exists ? data : null);

            assert.equal(built.html, normalizeLegacyHtml(notifList.innerHTML), `escenario ${i}`);
            assert.equal(built.unreadCount > 0 ? String(built.unreadCount) : '', String(notifCount.textContent));
            assert.equal(built.unreadCount > 0, notifCount.style.display === 'block');
        }
    }

    assert.equal(buildAdminPermissionNotifications(null).html, NOTIFICATIONS_EMPTY_HTML);
});

test('historial de permisos: visibilidad por rol, orden, uid de consulta y HTML (diferencial con las plantillas de loadPermisos)', () => {
    const rng = createRng(31337);
    const gestor = { role: 'Gestor', name: 'Ana <b>', uid: 'g1' };

    for (let i = 0; i < 100; i++) {
        const data = randomPermissions(rng);

        for (const user of [gestor, { role: 'Admin' }, { role: 'Supervisor' }, null]) {
            const { all, visible } = selectVisiblePermissions(data, user);
            const legacyVisible = legacyVisiblePermissions(data, user);

            assert.deepEqual(visible, legacyVisible);
            assert.equal(all.length, Object.keys(data).length);
        }

        selectVisiblePermissions(data, { role: 'Admin' }).visible.forEach((p) => {
            const container = { innerHTML: '' };
            legacyHistoryItem(container, p);

            assert.equal(buildPermissionHistoryItemHTML(p), normalizeLegacyHtml(container.innerHTML));
        });
    }

    assert.equal(resolvePermissionsQueryUid({ role: 'Gestor', uid: 'g1' }, 'authX'), 'g1');
    assert.equal(resolvePermissionsQueryUid({ role: 'Gestor' }, 'authX'), 'authX');
    assert.equal(resolvePermissionsQueryUid({ role: 'Admin' }, 'authX'), null);
    assert.equal(resolvePermissionsQueryUid(null, null), null);
    assert.throws(() => resolvePermissionsQueryUid({ role: 'Gestor' }, null), /No se pudo determinar el UID/);

    // el uid autenticado puede entregarse como función y se evalúa SOLO si hace falta (como `firebase.auth()` en app.js)
    let calls = 0;
    const lazy = () => { calls += 1; return 'authX'; };
    assert.equal(resolvePermissionsQueryUid({ role: 'Gestor', uid: 'g1' }, lazy), 'g1');
    assert.equal(resolvePermissionsQueryUid({ role: 'Admin' }, lazy), null);
    assert.equal(resolvePermissionsQueryUid(null, lazy), null);
    assert.equal(calls, 0, 'no debe consultar la autenticación si no la necesita');
    assert.equal(resolvePermissionsQueryUid({ role: 'Gestor' }, lazy), 'authX');
    assert.equal(calls, 1);
});

test('detalle de permiso: mismo HTML que openPermisoDetailModal (estados, rango de fechas, motivo, rechazo)', () => {
    const base = { fb_id: 'k1', id: 1_760_000_000_000, gestor: 'Ana', tipo: 'Cita', fecha: '2026-10-06', horaInicio: '08:00', horaFin: '10:00', motivo: 'Motivo <i>', status: 'Pendiente' };
    const variants = [
        base,
        { ...base, status: 'Aprobado' },
        { ...base, status: 'Rechazado', rejectionReason: 'No procede & punto' },
        { ...base, fechaDesde: '2026-10-01', fechaHasta: '2026-10-09', tipo: 'Vacaciones' },
        { ...base, fechaDesde: '2026-10-01', fechaHasta: '2026-10-01' },
        { ...base, horaSolicitud: '06/10/2026 08:00:00 a. m.' },
        { ...base, motivo: '', horaInicio: '', horaFin: '' },
        { ...base, id: undefined }
    ];

    variants.forEach((perm, i) => {
        const body = { innerHTML: '' };
        legacyDetailBody(body, perm);
        assert.equal(buildPermissionDetailHTML(perm), normalizeLegacyHtml(body.innerHTML), `variante ${i}`);
    });

    assert.equal(resolvePermissionCreatedText({ horaSolicitud: 'X', id: 5 }), 'X');
    assert.equal(resolvePermissionCreatedText({}), undefined);
});

summarize();
