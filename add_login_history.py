import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

history_js = """

// ==========================================
// HISTORIAL DE ACCESOS LOGIC
// ==========================================
let allLoginHistoryRecords = [];

async function openLoginHistoryModal() {
    const modal = document.getElementById('loginHistoryModal');
    if (!modal) return;

    modal.classList.add('active');
    const tbody = document.getElementById('loginHistoryTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-secondary);"><i class='bx bx-loader-alt bx-spin' style="font-size: 24px; margin-bottom: 8px;"></i><br>Cargando historial de accesos...</td></tr>`;
    }

    try {
        const snapActive = await database.ref('active_sessions').once('value');
        const snapReports = await database.ref('shift_reports').once('value');
        const snapLogs = await database.ref('login_history').once('value');

        allLoginHistoryRecords = [];
        const seenKeys = new Set();

        // 1. Current Active Sessions
        if (snapActive.exists()) {
            const activeData = snapActive.val();
            for (let uid in activeData) {
                const s = activeData[uid];
                if (!s || !s.name) continue;
                const loginTimeStr = s.loginTime || s.startTime || (s.lastActive ? new Date(s.lastActive).toISOString() : new Date().toISOString());
                const key = `${s.name.trim().toLowerCase()}_${loginTimeStr.substring(0, 16)}`;
                seenKeys.add(key);

                let isOnline = s.lastActive ? ((Date.now() - s.lastActive) < 120000) : false;
                if (s.status === 'En Almuerzo' || s.status === 'En Desayuno' || s.status === 'Inactivo') isOnline = false;

                allLoginHistoryRecords.push({
                    name: s.name,
                    email: s.email || '',
                    shift: s.shift || 'Mañana',
                    loginTime: loginTimeStr,
                    lastActive: s.lastActive ? new Date(s.lastActive).toLocaleString('es-CO') : 'Reciente',
                    isOnline: isOnline,
                    status: s.status || (isOnline ? 'En Línea' : 'Inactivo'),
                    source: 'En Vivo'
                });
            }
        }

        // 2. Login History Logs
        if (snapLogs.exists()) {
            const logData = snapLogs.val();
            for (let id in logData) {
                const l = logData[id];
                if (!l || !l.name) continue;
                const key = `${l.name.trim().toLowerCase()}_${(l.loginTime||'').substring(0, 16)}`;
                if (seenKeys.has(key)) continue;
                seenKeys.add(key);

                allLoginHistoryRecords.push({
                    name: l.name,
                    email: l.email || '',
                    shift: l.shift || 'General',
                    loginTime: l.loginTime || l.timestamp,
                    lastActive: l.lastActive ? new Date(l.lastActive).toLocaleString('es-CO') : 'Finalizado',
                    isOnline: false,
                    status: l.status || 'Finalizado',
                    source: 'Historial'
                });
            }
        }

        // 3. Past Shift Reports (Bitácoras)
        if (snapReports.exists()) {
            const reportsData = snapReports.val();
            for (let id in reportsData) {
                const r = reportsData[id];
                if (!r || !r.name) continue;
                const loginTimeStr = r.loginTime || r.startTime || r.reportDate || (r.timestamp ? new Date(r.timestamp).toISOString() : '');
                const key = `${r.name.trim().toLowerCase()}_${loginTimeStr.substring(0, 16)}`;
                if (seenKeys.has(key)) continue;
                seenKeys.add(key);

                allLoginHistoryRecords.push({
                    name: r.name,
                    email: r.email || '',
                    shift: r.shift || 'General',
                    loginTime: loginTimeStr,
                    lastActive: r.endTime ? new Date(r.endTime).toLocaleString('es-CO') : 'Turno Finalizado',
                    isOnline: false,
                    status: 'Turno Completado',
                    source: 'Bitácora'
                });
            }
        }

        // Sort descending by loginTime
        allLoginHistoryRecords.sort((a, b) => new Date(b.loginTime || 0) - new Date(a.loginTime || 0));

        renderLoginHistoryTable(allLoginHistoryRecords);

    } catch (e) {
        console.error("Error cargando historial de accesos:", e);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--danger);">Error cargando los accesos. Por favor intenta de nuevo.</td></tr>`;
        }
    }
}

function renderLoginHistoryTable(records) {
    const tbody = document.getElementById('loginHistoryTableBody');
    if (!tbody) return;

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-secondary);">No se encontraron registros de accesos.</td></tr>`;
        return;
    }

    let html = '';
    records.forEach(r => {
        const loginDateObj = r.loginTime ? new Date(r.loginTime) : null;
        const formattedLogin = loginDateObj && !isNaN(loginDateObj) ? loginDateObj.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'medium' }) : (r.loginTime || 'N/A');
        
        let delayBadge = '';
        if (loginDateObj && !isNaN(loginDateObj) && r.shift) {
            const shiftStr = r.shift.toLowerCase().trim();
            const match = shiftStr.match(/^(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)/i);
            if (match) {
                let hour = parseInt(match[1], 10);
                let minute = match[2] ? parseInt(match[2], 10) : 0;
                const ampm = match[3].toLowerCase();
                if (ampm === 'pm' && hour < 12) hour += 12;
                if (ampm === 'am' && hour === 12) hour = 0;
                
                const expected = new Date(loginDateObj);
                expected.setHours(hour, minute, 0, 0);
                const diffMin = (loginDateObj - expected) / (1000 * 60);

                if (diffMin <= 5) {
                    delayBadge = `<span style="background: rgba(16,185,129,0.15); color: var(--success); padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">A tiempo</span>`;
                } else {
                    const tardanza = Math.round(diffMin);
                    delayBadge = `<span style="background: rgba(239,68,68,0.15); color: var(--danger); padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">+${tardanza}m Tarde</span>`;
                }
            }
        }

        let statusBadge = `<span style="background: rgba(59,130,246,0.15); color: var(--accent-primary); padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">${r.status}</span>`;
        if (r.isOnline) {
            statusBadge = `<span style="background: rgba(16,185,129,0.15); color: var(--success); padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;"><i class='bx bx-radio-circle-marked'></i> En Línea</span>`;
        }

        html += `
            <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                <td style="padding: 12px 16px; font-weight: 600; color: var(--text-primary);">
                    ${r.name}
                    ${r.email ? `<div style="font-size: 11px; color: var(--text-secondary); font-weight: 400;">${r.email}</div>` : ''}
                </td>
                <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 13px;">${r.shift}</td>
                <td style="padding: 12px 16px; color: var(--text-primary); font-size: 13px; font-weight: 500;">
                    ${formattedLogin} ${delayBadge}
                </td>
                <td style="padding: 12px 16px;">${statusBadge}</td>
                <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 12px;">${r.lastActive}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function filterLoginHistoryTable() {
    const searchInput = document.getElementById('loginHistorySearch');
    const dateFilter = document.getElementById('loginHistoryDateFilter');
    
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const dateVal = dateFilter ? dateFilter.value : 'todos';

    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    const filtered = allLoginHistoryRecords.filter(r => {
        if (query && !r.name.toLowerCase().includes(query) && !(r.email && r.email.toLowerCase().includes(query))) {
            return false;
        }

        if (dateVal !== 'todos' && r.loginTime) {
            const rDate = new Date(r.loginTime);
            const rDateStr = rDate.toISOString().substring(0, 10);
            if (dateVal === 'hoy' && rDateStr !== todayStr) return false;
            if (dateVal === '7d' && rDate < sevenDaysAgo) return false;
            if (dateVal === '30d' && rDate < thirtyDaysAgo) return false;
        }

        return true;
    });

    renderLoginHistoryTable(filtered);
}
"""

js += history_js

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
