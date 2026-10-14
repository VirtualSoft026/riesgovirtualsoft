/**
 * COPIA LITERAL del código ORIGINAL de app.js que este corte reemplaza, para las pruebas diferenciales
 * (no es una suite: el nombre no termina en `.test.mjs`).
 *
 *   - app.js 3975-4448: "Modal Logic" (openExceptionModal, closeModal, confirmException, openExtraTaskModal,
 *     saveExtraTask) y "Logic for Approving Users/Permissions" (renderPendingUsers ... updatePermissionStatus,
 *     incluida `confirmRejectPerm` y el duplicado idéntico de `cancelRejectPerm`).
 *   - app.js 10-19 (escapeHTML), 23-25 (encodeInlineHandlerArg) y 723-726 (normalizeName): los ayudantes globales.
 *
 * El cuerpo de las funciones NO se modificó (solo se envolvió en `createOriginalApp(env)` para inyectar los
 * globales que app.js toma de `window`: `document`, `database`, `alert`, `confirm`, `setTimeout`, `Date`, `firebase`,
 * `localStorage`, `loadPermisos`, `persistTaskToActiveSession`, `updateKPI`, `currentUser`, `taskStateCache`).
 * Las variables `pendingExtraTaskId` e `isSavingExtraTask` (app.js 1318-1319) se redeclaran aquí como en el original.
 */

/* eslint-disable */
export function createOriginalApp(env) {
    const { document, database, alert, confirm, setTimeout, Date, firebase, localStorage, loadPermisos, persistTaskToActiveSession, updateKPI, console } = env;
    let currentUser = env.currentUser;
    let taskStateCache = env.taskStateCache;
    let pendingExtraTaskId = null;
    let isSavingExtraTask = false;

// ---- app.js 10-19 ----
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ---- app.js 23-25 ----
function encodeInlineHandlerArg(value) {
    return encodeURIComponent(String(value)).replace(/'/g, '%27');
}

// ---- app.js 723-726 ----
function normalizeName(name) {
    if (!name) return "";
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

// ---- app.js 3975-4448 ----
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

function openExtraTaskModal() {
    const modal = document.getElementById('extraTaskModal');
    if (modal) {
        document.getElementById('extraTaskName').value = '';
        document.getElementById('extraTaskStatus').value = 'Finalizada';
        document.getElementById('extraTaskObs').value = '';
        // Un modal recién abierto empieza una tarea extra lógicamente nueva.
        pendingExtraTaskId = null;
        modal.classList.add('active');
    }
}

async function saveExtraTask() {
    if (isSavingExtraTask) return; // Evitar dobles clics / escrituras simultáneas

    const name = document.getElementById('extraTaskName').value.trim();
    const status = document.getElementById('extraTaskStatus').value;
    const obs = document.getElementById('extraTaskObs').value.trim();

    if (!name) {
        alert("OBLIGATORIO: Debes ingresar el nombre de la tarea extra.");
        return;
    }
    if (!obs) {
        alert("OBLIGATORIO: Debes detallar la gestión realizada en las Notas Técnicas.");
        return;
    }
    const authUser = firebase.auth().currentUser;
    if (!authUser) {
        alert("Tu sesión expiró. Vuelve a iniciar sesión para guardar la tarea extra.");
        return;
    }
    if (!currentUser || currentUser.uid !== authUser.uid) {
        alert("No se pudo verificar tu identidad. Vuelve a iniciar sesión para guardar la tarea extra.");
        return;
    }

    const btn = document.getElementById('saveExtraTaskBtn');
    const prevText = btn ? btn.innerHTML : '';
    isSavingExtraTask = true;
    if (btn) {
        btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";
        btn.disabled = true;
    }

    // Reutilizar el mismo ID en un reintento tras un fallo previo, para no
    // duplicar la tarea extra con un nuevo Date.now() en cada intento.
    const extraId = pendingExtraTaskId || ('extra_' + Date.now());
    pendingExtraTaskId = extraId;

    const taskRecord = {
        name: "[EXTRA] " + name,
        status: status,
        observation: obs,
        updatedAt: Date.now()
    };

    // Respaldo local inmediato para permitir reintento visual; esto NO cuenta
    // como confirmación de persistencia (eso solo lo da Firebase).
    taskStateCache[extraId] = taskRecord;
    try {
        localStorage.setItem('riskOps_cache', JSON.stringify(taskStateCache));
    } catch (e) { /* localStorage no disponible: el respaldo local es best-effort */ }

    try {
        // Único punto de verdad para la persistencia: espera la Promise real
        // de Firebase antes de mostrar cualquier éxito.
        await persistTaskToActiveSession(authUser.uid, extraId, taskRecord);

        pendingExtraTaskId = null;
        updateKPI(); // Actualizar el anillo de progreso
        closeModal('extraTaskModal');
        alert(`Tarea Adicional "${name}" agregada exitosamente y se incluirá en tu reporte de turno.`);
    } catch (error) {
        console.error("Error al guardar la tarea extra:", error);
        const errorCode = error && error.code ? error.code : '';
        const isPermissionDenied = errorCode === 'PERMISSION_DENIED' || /permission[_ ]denied/i.test((error && error.message) || '');
        alert(isPermissionDenied
            ? "No tienes permiso para guardar esta tarea extra. Contacta a tu supervisor."
            : "No se pudo guardar la tarea extra en el servidor. El cambio quedó respaldado localmente; intenta guardar de nuevo.");
    } finally {
        if (btn) {
            btn.innerHTML = prevText;
            btn.disabled = false;
        }
        isSavingExtraTask = false;
    }
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
    
    const searchInput = document.getElementById('filterAprobacionesSearch');
    const statusSelect = document.getElementById('filterAprobacionesStatus');
    const searchVal = searchInput ? normalizeName(searchInput.value) : '';
    const statusVal = statusSelect ? statusSelect.value : 'Todos';

    // Mostramos primero los pendientes, luego los aprobados, ordenados por fecha de registro (más reciente a más antiguo)
    let allDisplayUsers = [...pending, ...approved].sort((a, b) => {
        const dateA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
        const dateB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
        return dateB - dateA;
    });
    
    // Apply filters
    const hasFilter = searchVal !== '' || statusVal !== 'Todos';
    allDisplayUsers = allDisplayUsers.filter(u => {
        const matchSearch = searchVal === '' || normalizeName(u.name || '').includes(searchVal) || normalizeName(u.email || '').includes(searchVal);
        let matchStatus = true;
        if (statusVal === 'Pendiente') matchStatus = (u.approved === false);
        if (statusVal === 'Aprobado') matchStatus = (u.approved === true);
        return matchSearch && matchStatus;
    });
    
    // Only show top 5 if no filters are active to keep UI clean
    if (!hasFilter && allDisplayUsers.length > 5) {
        allDisplayUsers = allDisplayUsers.slice(0, 5);
        // Add a fake row to indicate there are more
        const total = [...pending, ...approved].length;
        setTimeout(() => {
            if(document.getElementById('pendingUsersTableBody')) {
                document.getElementById('pendingMostrandoMsg') ? document.getElementById('pendingMostrandoMsg').remove() : null;
                const msg = document.createElement('div');
                msg.id = 'pendingMostrandoMsg';
                msg.style = 'text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 10px; margin-bottom: 15px; font-style: italic;';
                msg.innerText = `Mostrando los 5 registros más recientes de ${total} en total. Usa los filtros arriba para buscar más.`;
                document.getElementById('pendingUsersTableBody').parentElement.parentElement.appendChild(msg);
            }
        }, 100);
    } else {
        setTimeout(() => {
            if(document.getElementById('pendingMostrandoMsg')) document.getElementById('pendingMostrandoMsg').remove();
        }, 100);
    }
    
    if (allDisplayUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay usuarios que coincidan con los filtros.</td></tr>`;
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
                <div id="user-action-btns-${escapeHTML(user.id)}" style="display:flex; justify-content:center; gap:5px;">
                    <button class="btn btn-success" style="padding: 5px 10px; font-size: 12px;" onclick="approveUser(decodeURIComponent('${encodeInlineHandlerArg(user.id)}'))">Aprobar</button>
                    <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="showUserRejectBox(decodeURIComponent('${encodeInlineHandlerArg(user.id)}'))">Rechazar</button>
                </div>
                <div id="user-reject-box-${escapeHTML(user.id)}" style="display:none; flex-direction:column; gap:5px; margin-top:5px;">
                    <input type="text" id="user-reason-${escapeHTML(user.id)}" name="user-reason-${escapeHTML(user.id)}" aria-label="Motivo de rechazo" placeholder="Motivo de rechazo" class="modern-input" style="padding:4px; font-size:11px; width:100%;">
                    <div style="display:flex; gap:5px; justify-content:center;">
                        <button class="btn btn-danger" style="padding: 2px 5px; font-size: 10px;" onclick="confirmRejectUser(decodeURIComponent('${encodeInlineHandlerArg(user.id)}'))">Confirmar</button>
                        <button class="btn btn-outline" style="padding: 2px 5px; font-size: 10px;" onclick="cancelRejectUser(decodeURIComponent('${encodeInlineHandlerArg(user.id)}'))">Cancelar</button>
                    </div>
                </div>
            `;
        }
        
        let statusBadge = user.approved ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">${user.role}</span>` : `<span class="badge pending">${user.role}</span>`;

        const regDateStr = user.registrationDate ? new Date(user.registrationDate).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Desconocida';
        const appDateStr = user.approvalDate ? new Date(user.approvalDate).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : (user.approved === true ? 'Desconocida' : '-');
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px;">${escapeHTML(user.name)}</td>
                <td style="padding: 12px; color: var(--text-secondary);">${escapeHTML(user.email)}</td>
                <td style="padding: 12px;">${statusBadge}</td>
                <td style="padding: 12px; font-size: 12px;">${escapeHTML(regDateStr)}</td>
                <td style="padding: 12px; font-size: 12px;">${escapeHTML(appDateStr)}</td>
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
            approved: true,
            approvalDate: new Date().toISOString()
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
    
    const searchInput = document.getElementById('filterPermisosSearch');
    const searchVal = searchInput ? normalizeName(searchInput.value) : '';

    let pending = permisos.filter(p => p.status === 'Pendiente');
    
    // Sort so most recent is first
    pending.sort((a,b) => {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
    
    // Limit to 5
    if (pending.length > 5) {
        const total = pending.length;
        pending = pending.slice(0, 5);
        setTimeout(() => {
            if(document.getElementById('pendingPermsMostrandoMsg')) document.getElementById('pendingPermsMostrandoMsg').remove();
            const msg = document.createElement('div');
            msg.id = 'pendingPermsMostrandoMsg';
            msg.style = 'text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 10px; margin-bottom: 15px; font-style: italic;';
            msg.innerText = `Mostrando los 5 permisos más recientes de ${total} pendientes.`;
            document.getElementById('pendingPermissionsTableBody').parentElement.parentElement.appendChild(msg);
        }, 100);
    } else {
        setTimeout(() => {
            if(document.getElementById('pendingPermsMostrandoMsg')) document.getElementById('pendingPermsMostrandoMsg').remove();
        }, 100);
    }
    
    tbody.innerHTML = '';
    
    if (pending.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay permisos pendientes de aprobación.</td></tr>`;
        return;
    }
    
    pending.forEach(p => {
        let createdTimeText = p.horaSolicitud;
        if (!createdTimeText && p.id) {
            try {
                const d = new Date(p.id);
                createdTimeText = `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit', hour12:true})}`;
            } catch(err) { createdTimeText = 'N/A'; }
        }

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-weight: 600; color: var(--text-primary);">${escapeHTML(p.gestor)}</td>
                <td style="padding: 12px;">
                    <span class="badge pending">${escapeHTML(p.tipo)}</span>
                    <br><small style="font-size:10px; color:var(--accent-primary); font-weight:500;"><i class='bx bx-time-five'></i> ${escapeHTML(createdTimeText)}</small>
                </td>
                <td style="padding: 12px; color: var(--text-secondary); font-size: 12px; white-space: nowrap;"><strong>${escapeHTML(p.fecha)}</strong><br><span style="opacity: 0.85;">${escapeHTML(p.horaInicio)} a ${escapeHTML(p.horaFin)}</span></td>
                <td style="padding: 12px; font-size: 13px; min-width: 250px;">
                    <div style="background: rgba(255, 255, 255, 0.04); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--glass-border); color: var(--text-primary); line-height: 1.45; word-break: break-word; white-space: pre-wrap;">
                        ${escapeHTML(p.motivo || 'Sin observación')}
                    </div>
                </td>
                <td style="padding: 12px; text-align: center; min-width: 220px;">
                    <div id="perm-action-btns-${escapeHTML(p.fb_id)}" style="display:flex; justify-content:center; gap:8px;">
                        <button class="btn btn-success" style="padding: 6px 14px; font-size: 12px; display:inline-flex; align-items:center; gap:4px;" onclick="showPermApproveBox(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))"><i class='bx bx-check' style="font-size:16px;"></i> Aprobar</button>
                        <button class="btn btn-danger" style="padding: 6px 14px; font-size: 12px; display:inline-flex; align-items:center; gap:4px;" onclick="showPermRejectBox(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))"><i class='bx bx-x' style="font-size:16px;"></i> Rechazar</button>
                    </div>
                    <div id="perm-approve-box-${escapeHTML(p.fb_id)}" style="display:none; flex-direction:column; gap:8px; margin-top:5px; background: rgba(16, 185, 129, 0.08); padding: 10px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
                        <label for="perm-approve-reason-${escapeHTML(p.fb_id)}" style="font-size:11px; font-weight:600; color:var(--success); text-align:left;">Observación de aprobación:</label>
                        <textarea id="perm-approve-reason-${escapeHTML(p.fb_id)}" name="perm-approve-reason-${escapeHTML(p.fb_id)}" placeholder="Escribe un comentario u observación para el gestor..." class="modern-input" style="padding:8px; font-size:12px; width:100%; min-height:60px; resize:vertical; box-sizing:border-box; border-radius:6px; font-family:inherit;"></textarea>
                        <div style="display:flex; gap:6px; justify-content:flex-end;">
                            <button class="btn btn-success" style="padding: 5px 12px; font-size: 11px;" onclick="confirmApprovePerm(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))">Confirmar Aprobar</button>
                            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 11px;" onclick="cancelApprovePerm(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))">Cancelar</button>
                        </div>
                    </div>
                    <div id="perm-reject-box-${escapeHTML(p.fb_id)}" style="display:none; flex-direction:column; gap:8px; margin-top:5px; background: rgba(239, 68, 68, 0.08); padding: 10px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
                        <label for="perm-reason-${escapeHTML(p.fb_id)}" style="font-size:11px; font-weight:600; color:var(--danger); text-align:left;">Motivo de rechazo:</label>
                        <textarea id="perm-reason-${escapeHTML(p.fb_id)}" name="perm-reason-${escapeHTML(p.fb_id)}" placeholder="Escribe la razón por la cual se rechaza..." class="modern-input" style="padding:8px; font-size:12px; width:100%; min-height:60px; resize:vertical; box-sizing:border-box; border-radius:6px; font-family:inherit;"></textarea>
                        <div style="display:flex; gap:6px; justify-content:flex-end;">
                            <button class="btn btn-danger" style="padding: 5px 12px; font-size: 11px;" onclick="confirmRejectPerm(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))">Confirmar Rechazo</button>
                            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 11px;" onclick="cancelRejectPerm(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))">Cancelar</button>
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
                        <td style="padding: 12px; font-weight: 500;">${escapeHTML(p.gestor)}</td>
                        <td style="padding: 12px;">${escapeHTML(p.tipo)}</td>
                        <td style="padding: 12px;">${statusBadge}</td>
                        <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">${escapeHTML(p.fecha)}</td>
                        <td style="padding: 12px; font-size: 13px; color: var(--text-secondary);">${escapeHTML(p.rejectionReason || '-')}</td>
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
    document.getElementById('perm-action-btns-' + id).style.display = 'flex';
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
    document.getElementById('perm-action-btns-' + id).style.display = 'flex';
    document.getElementById('perm-approve-reason-' + id).value = '';
}

function cancelRejectPerm(id) {
    document.getElementById('perm-reject-box-' + id).style.display = 'none';
    document.getElementById('perm-action-btns-' + id).style.display = 'flex';
    document.getElementById('perm-reason-' + id).value = '';
}

async function confirmApprovePerm(id) {
    const reason = document.getElementById('perm-approve-reason-' + id).value.trim();
    await updatePermissionStatus(id, 'Aprobado', reason || 'Aprobado sin observaciones adicionales');
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

    return {
        escapeHTML, encodeInlineHandlerArg, normalizeName,
        openExceptionModal, closeModal, confirmException, openExtraTaskModal, saveExtraTask,
        renderPendingUsers, approveUser, showUserRejectBox, cancelRejectUser, confirmRejectUser,
        renderPendingPermissions, showPermRejectBox, cancelRejectPerm, confirmRejectPerm,
        showPermApproveBox, cancelApprovePerm, confirmApprovePerm, updatePermissionStatus,
        state: { getPendingExtraTaskId: () => pendingExtraTaskId, isSaving: () => isSavingExtraTask }
    };
}
