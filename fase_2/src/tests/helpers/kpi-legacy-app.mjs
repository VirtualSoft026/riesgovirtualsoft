/**
 * COPIA LITERAL de las funciones originales de app.js (producción, copia LF) del corte "KPIs, analítica y gráficas",
 * para pruebas DIFERENCIALES. El texto de cada función es idéntico al de app.js; solo se envuelve en una fábrica
 * para inyectar lo que en app.js son globales (window, document, Chart, Date, database, fetch...).
 * Cada bloque indica sus líneas en app.js. NO se modifica la lógica: si app.js cambia, hay que regenerar este archivo.
 *
 * Variables que en app.js son globales y aquí llegan por `env`:
 *   window, document, Chart, ChartDataLabels, Date, database, fetch, alert, console, setTimeout,
 *   SUPERVISORES_NOMBRES, escapeHTML, getSelectedMultiSelectValues, setCustomMultiSelectValues,
 *   setupCustomMultiSelect, calcularIndicadores
 */
export function createLegacyKpi(env) {
    const {
        window, document, Chart, ChartDataLabels, Date, database, fetch, alert, console, setTimeout,
        SUPERVISORES_NOMBRES, escapeHTML, getSelectedMultiSelectValues, setCustomMultiSelectValues,
        setupCustomMultiSelect, calcularIndicadores
    } = env;
    let controlOperativoCharts = env.controlOperativoCharts || {};
    // NOTA: las funciones se copian SIN reindentar (las plantillas de varias líneas deben quedar idénticas).

// ---- app.js 5676-5701: fetchKpiOperativosData
async function fetchKpiOperativosData() {
    const isLocal = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.protocol === 'file:'
    );

    if (isLocal) {
        try {
            const seedResp = await fetch('kpi_operativos_seed.json?v=' + new Date().getTime());
            if (seedResp.ok) {
                const seedData = await seedResp.json();
                if (seedData && Object.keys(seedData).length > 0) {
                    console.log("[Laboratorio Local] Datos semilla cargados con éxito desde kpi_operativos_seed.json");
                    return seedData;
                }
            }
        } catch (e) {
            console.warn("[Laboratorio Local] kpi_operativos_seed.json no disponible, usando archivo estándar", e);
        }
    }

    const response = await fetch('kpi_operativos_v2.json?v=' + new Date().getTime());
    if (!response.ok) throw new Error("No se pudo cargar kpi_operativos_v2.json");
    return await response.json();
}

// ---- app.js 5704-5714: loadRetirosData
async function loadRetirosData() {
    try {
        const data = await fetchKpiOperativosData();
        window.retirosGlobalData = data;
        window.controlOperativoRawData = data;
        console.log("Data de retiros cargada automáticamente:", Object.keys(data).length, "gestores");
    } catch (err) {
        console.warn("No hay data de retiros automatizada o hubo un error:", err);
        window.retirosGlobalData = null;
    }
}

// ---- app.js 5716-5775: loadGestoresForKPIs
function loadGestoresForKPIs() {
    const selectEl = document.getElementById('kpiGestorSelect');
    if (!selectEl) return;
    
    if (selectEl.options.length > 2) {
        // If already loaded, just return. We don't want to overwrite and re-trigger calculation
        return;
    }
    
    selectEl.innerHTML = '<option value="todos" selected>Todos los gestores</option><option value="">Selecciona un gestor...</option>';
    
    database.ref('users').once('value').then(snapshot => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            window.kpiUsersData = {};
            
            const targetGestores = [
                "oriana borja",
                "marilyn",
                "sebastian hincapie",
                "sebastian arango",
                "sebastiana",
                "juan jose diaz",
                "yefferson",
                "alexander villada",
                "daniel",
                "josue alvarez",
                "luis"
            ];
            
            const gestores = Object.keys(data)
                .map(k => {
                    const u = data[k];
                    if (u && u.email && u.name) {
                        window.kpiUsersData[u.email.toLowerCase()] = u.name.trim();
                    }
                    return u;
                })
                .filter(u => {
                    if (!u || u.role !== 'Gestor' || u.approved !== true) return false;
                    const nameLower = u.name.toLowerCase();
                    return targetGestores.some(t => nameLower.includes(t));
                })
                .map(u => u.name.trim())
                .sort((a, b) => a.localeCompare(b));
            
            const uniqueGestores = [...new Set(gestores)];
            
            uniqueGestores.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                selectEl.appendChild(opt);
            });
            
            // Auto-trigger KPI calculation once loaded to map the global view
            calcularIndicadores();
        }
    }).catch(err => console.error("Error populating KPI gestores dropdown:", err));
}

// ---- app.js 6419-6473: openKpiTaskDetails
function openKpiTaskDetails(tipo) {
    const modal = document.getElementById('kpiTaskDetailsModal');
    const title = document.getElementById('kpiModalTitle');
    const icon = document.getElementById('kpiModalIcon');
    const list = document.getElementById('kpiModalTaskList');
    
    if (!window.kpiTaskLists) return;
    
    const tasks = window.kpiTaskLists[tipo] || [];
    
    // Configurar cabecera
    if (tipo === 'finalizadas') {
        title.textContent = 'Tareas Finalizadas';
        icon.className = 'bx bx-check-double';
        icon.style.color = 'var(--success)';
    } else if (tipo === 'no_realizadas') {
        title.textContent = 'Tareas No Realizadas';
        icon.className = 'bx bx-x-circle';
        icon.style.color = 'var(--danger)';
    } else if (tipo === 'pendientes') {
        title.textContent = 'Tareas Pendientes';
        icon.className = 'bx bx-time';
        icon.style.color = 'var(--warning)';
    }
    
    list.innerHTML = '';
    
    if (tasks.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay tareas en este estado.</div>';
    } else {
        tasks.forEach(t => {
            const tTypeColor = t.type === 'adicional' ? 'var(--warning)' : 'var(--accent-primary)';
            const tTypeBadge = `<span style="font-size: 10px; background: ${tTypeColor}20; color: ${tTypeColor}; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">${t.type === 'adicional' ? 'Adicional' : 'Set'}</span>`;
            
            list.innerHTML += `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); padding: 10px 15px; border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">
                            ${escapeHTML(t.name)}
                            ${tTypeBadge}
                        </div>
                        <div style="font-size: 11px; color: var(--text-secondary);">
                            <i class='bx bx-calendar'></i> ${escapeHTML(t.date)}
                        </div>
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary); background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 4px; border-left: 2px solid ${tTypeColor};">
                        <strong>Nota:</strong> ${escapeHTML(t.observation)}
                    </div>
                </div>
            `;
        });
    }
    
    modal.classList.add('active');
}

// ---- app.js 6475-6477: closeKpiTaskDetails
function closeKpiTaskDetails() {
    document.getElementById('kpiTaskDetailsModal').classList.remove('active');
}

// ---- app.js 7003-7008: destroyChart
function destroyChart(id) {
    if (controlOperativoCharts[id]) {
        controlOperativoCharts[id].destroy();
        delete controlOperativoCharts[id];
    }
}

// ---- app.js 7012-7020: toggleOperativoCustomDates
function toggleOperativoCustomDates() {
    const val = document.getElementById('filtroFechaOperativo').value;
    const container = document.getElementById('operativoCustomDateContainer');
    if (val === 'custom') {
        container.style.display = 'flex';
    } else {
        container.style.display = 'none';
    }
}

// ---- app.js 7025-7211: generarAnalisisTextual
function generarAnalisisTextual() {
    if (!window.controlOperativoRawData) {
        alert("Aún no se han cargado los datos. Por favor, espera un momento o haz clic en Actualizar Datos.");
        return;
    }
    
    const excludedGestores = SUPERVISORES_NOMBRES;
    const selectedGestoresPDF = getSelectedMultiSelectValues('operativoGestorMultiSelect');
    const filtroGestor = selectedGestoresPDF.length === 1 ? selectedGestoresPDF[0] : (selectedGestoresPDF.length === 0 ? 'Todos' : 'Varios');
    
    // Calcular fechas del filtro actual (reutilizando la lógica existente o leyendo las fechas)
    const filtroFecha = document.getElementById('filtroFechaOperativo').value;
    const isCustom = filtroFecha === 'custom';
    const dateStart = isCustom ? document.getElementById('operativoDateStart').value : null;
    const dateEnd = isCustom ? document.getElementById('operativoDateEnd').value : null;

    let totalProcesados = 0;
    let totalAprobados = 0;
    let totalRechazados = 0;
    let gestoresStats = {};
    let excludedCount = 0;

    // First pass: aggregate data
    for (const gestor in window.controlOperativoRawData) {
        if (selectedGestoresPDF.length > 0 && !selectedGestoresPDF.includes(gestor)) continue;
        
        // Exclude specific users if we are looking at "Todos"
        if (selectedGestoresPDF.length === 0 && excludedGestores.some(ex => gestor.includes(ex))) {
            excludedCount++;
            continue;
        }

        let gProcesados = 0;
        let gAprobados = 0;
        let gRechazados = 0;
        let gARTTotal = 0;
        let gARTCount = 0;

        for (const date in window.controlOperativoRawData[gestor]) {
            // Apply date filter logic (simplified for the analysis generator)
            let includeDate = true;
            const itemDate = new Date(date + 'T00:00:00');
            const today = new Date();
            today.setHours(0,0,0,0);
            
            if (filtroFecha === 'today') {
                if (itemDate.getTime() !== today.getTime()) includeDate = false;
            } else if (filtroFecha === 'yesterday') {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                if (itemDate.getTime() !== yesterday.getTime()) includeDate = false;
            } else if (filtroFecha === '7') {
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                if (itemDate < sevenDaysAgo) includeDate = false;
            } else if (filtroFecha === '30') {
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                if (itemDate < thirtyDaysAgo) includeDate = false;
            } else if (filtroFecha === 'thisMonth') {
                if (itemDate.getMonth() !== today.getMonth() || itemDate.getFullYear() !== today.getFullYear()) includeDate = false;
            } else if (filtroFecha === 'lastMonth') {
                const lastMonth = new Date(today);
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                if (itemDate.getMonth() !== lastMonth.getMonth() || itemDate.getFullYear() !== lastMonth.getFullYear()) includeDate = false;
            } else if (isCustom && dateStart && dateEnd) {
                const startObj = new Date(dateStart + 'T00:00:00');
                const endObj = new Date(dateEnd + 'T23:59:59');
                if (itemDate < startObj || itemDate > endObj) includeDate = false;
            }

            if (!includeDate) continue;

            const dayData = window.controlOperativoRawData[gestor][date];
            gProcesados += dayData.Retiros_Procesados || 0;
            gAprobados += dayData.Retiros_Aprobados || 0;
            gRechazados += dayData.Retiros_Rechazados || 0;
            if (dayData.ART_Desde_Creacion_Minutos > 0) {
                gARTTotal += dayData.ART_Desde_Creacion_Minutos;
                gARTCount++;
            }
        }

        if (gProcesados > 0) {
            totalProcesados += gProcesados;
            totalAprobados += gAprobados;
            totalRechazados += gRechazados;
            gestoresStats[gestor] = {
                procesados: gProcesados,
                aprobados: gAprobados,
                rechazados: gRechazados,
                artPromedio: gARTCount > 0 ? (gARTTotal / gARTCount) : 0
            };
        }
    }

    let html = ``;
    
    if (Object.keys(gestoresStats).length === 0) {
        html = `<p>No hay suficientes datos procesados para el periodo o gestor seleccionado para generar un análisis.</p>`;
    } else if (filtroGestor !== 'Todos') {
        const stats = gestoresStats[filtroGestor];
        const tasaAprobacion = stats.procesados > 0 ? ((stats.aprobados / stats.procesados) * 100).toFixed(1) : 0;
        const tasaRechazo = stats.procesados > 0 ? ((stats.rechazados / stats.procesados) * 100).toFixed(1) : 0;

        html += `<h3 style="color: var(--accent-primary); border-bottom: 2px solid var(--accent-primary); padding-bottom: 5px; margin-bottom: 15px;">Reporte Individual: ${filtroGestor}</h3>`;
        html += `<p>Resumen de rendimiento operativo para el periodo seleccionado. A continuación se presentan las métricas clave evaluadas:</p>`;
        
        html += `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: var(--accent-primary); color: white;">
                    <th style="padding: 10px; border: 1px solid #ddd;">Métrica</th>
                    <th style="padding: 10px; border: 1px solid #ddd;">Valor Alcanzado</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Retiros Procesados</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 16px;">${stats.procesados}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">Retiros Aprobados</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: var(--success);">${stats.aprobados} (${tasaAprobacion}%)</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">Retiros Rechazados</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: var(--danger);">${stats.rechazados} (${tasaRechazo}%)</td>
                </tr>
                <tr style="background-color: #f9f9f9;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Tiempo Promedio de Resolución (ART)</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 16px;">${stats.artPromedio.toFixed(2)} min</td>
                </tr>
            </tbody>
        </table>`;

        if (stats.artPromedio > 1200) {
            html += `<div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger); padding: 15px; margin-top: 15px;">
                <strong>⚠️ Área de Oportunidad:</strong> El tiempo de resolución es significativamente alto (más de 20 horas). Se sugiere revisar si hay bloqueos o si los casos asignados son de alta complejidad.
            </div>`;
        } else if (stats.artPromedio < 900) {
            html += `<div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid var(--success); padding: 15px; margin-top: 15px;">
                <strong>🏆 Excelente Velocidad:</strong> El gestor mantiene tiempos de respuesta altamente competitivos, por debajo del estándar de 15 horas.
            </div>`;
        } else {
            html += `<div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid var(--accent-primary); padding: 15px; margin-top: 15px;">
                <strong>📊 Rendimiento Estable:</strong> El gestor mantiene tiempos de respuesta dentro de los promedios esperados de la operación.
            </div>`;
        }
    } else {
        html += `<h3 style="color: var(--accent-primary);">Resumen Ejecutivo del Equipo</h3>`;
        html += `<p>El equipo procesó un volumen total de <strong>${totalProcesados} solicitudes</strong> en el periodo evaluado. La tasa global de aprobación es altísima (${((totalAprobados/totalProcesados)*100).toFixed(1)}%), sugiriendo flujos estables y predecibles.</p>`;
        
        const sortedByVol = Object.entries(gestoresStats).sort((a,b) => b[1].procesados - a[1].procesados);
        const sortedByART = Object.entries(gestoresStats).filter(a => a[1].artPromedio > 0).sort((a,b) => a[1].artPromedio - b[1].artPromedio);
        
        if (sortedByVol.length > 0) {
            html += `<h4>🏆 Liderazgo en Volumen</h4>`;
            html += `<p>El gestor con mayor carga operativa es <strong>${escapeHTML(sortedByVol[0][0])}</strong> con ${sortedByVol[0][1].procesados} procesados.`;
            if (sortedByVol.length > 1) {
                html += ` Le sigue <strong>${escapeHTML(sortedByVol[1][0])}</strong> con ${sortedByVol[1][1].procesados}.</p>`;
            } else {
                html += `</p>`;
            }
        }

        if (sortedByART.length > 0) {
            html += `<h4>⚡ Rendimiento en Velocidad (ART)</h4>`;
            html += `<p>El gestor más ágil en resolución es <strong>${escapeHTML(sortedByART[0][0])}</strong> con un tiempo promedio de <strong>${sortedByART[0][1].artPromedio.toFixed(2)} minutos</strong>.`;
            if (sortedByART.length > 1) {
                html += ` En segundo lugar destaca <strong>${escapeHTML(sortedByART[1][0])}</strong> con ${sortedByART[1][1].artPromedio.toFixed(2)} mins.</p>`;
            } else {
                html += `</p>`;
            }

            const slowest = sortedByART[sortedByART.length - 1];
            if (slowest[1].artPromedio > 1200) {
                html += `<div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger); padding: 15px; margin-top: 15px;">
                    <strong>⚠️ Cuello de Botella Detectado:</strong> <strong>${escapeHTML(slowest[0])}</strong> registra un tiempo promedio elevado (${slowest[1].artPromedio.toFixed(2)} min). Se recomienda una intervención para revisar bloqueos operativos o desbalance de cargas.
                </div>`;
            }
        }
    }

    document.getElementById('analysisModalBody').innerHTML = html;
    document.getElementById('analysisModal').classList.add('active');
}

// ---- app.js 7216-7288: generarReporteEjecutivoPDF
function generarReporteEjecutivoPDF() {
    const selectedGestoresPDF = getSelectedMultiSelectValues('operativoGestorMultiSelect');
    const gestorText = selectedGestoresPDF.length > 0 ? selectedGestoresPDF.join(', ') : 'Todos los gestores';
    
    const periodoSelect = document.getElementById('filtroFechaOperativo');
    let periodoText = periodoSelect.options[periodoSelect.selectedIndex].text;
    
    if (periodoSelect.value === 'custom') {
        const start = document.getElementById('operativoDateStart').value;
        const end = document.getElementById('operativoDateEnd').value;
        periodoText = `Personalizado (${start || 'Inicio'} a ${end || 'Fin'})`;
    }

    const now = new Date();
    document.getElementById('printReportMeta').innerText = `Fecha de generación: ${now.toLocaleString()} | Gestor(es): ${gestorText} | Periodo: ${periodoText}`;

    // 2. Copiar el análisis de IA
    const analisisHtml = document.getElementById('analysisModalBody').innerHTML;
    document.getElementById('printAnalysisText').innerHTML = analisisHtml;

    // 3. Capturar gráficas como imágenes
    const chartExcelencia = controlOperativoCharts['chartTardanzasMejores'];
    const chartPeores = controlOperativoCharts['chartTardanzasPeores'];
    const chartAprobaciones = controlOperativoCharts['chartAprobacionesDia'];
    const chartInactividad = controlOperativoCharts['chartInactividad'];
    const chartEficiencia = controlOperativoCharts['chartEficiencia'];

    const imgChart1 = document.getElementById('printChart1'); // Excelencia
    const imgChart2 = document.getElementById('printChart2'); // Aprobaciones
    const imgChart3 = document.getElementById('printChart3'); // Inactividad
    const imgChart4 = document.getElementById('printChart4'); // Eficiencia
    const imgChart5 = document.getElementById('printChart5'); // Peores

    // Función auxiliar para imprimir chart
    const renderPrintChart = (chartObj, imgEl, titleText) => {
        if (chartObj && imgEl) {
            try {
                imgEl.src = chartObj.toBase64Image();
                imgEl.style.display = 'block';
                if (imgEl.previousElementSibling) {
                    imgEl.previousElementSibling.innerText = titleText;
                    imgEl.previousElementSibling.style.display = 'block';
                }
                imgEl.parentElement.style.display = 'block';
            } catch (e) {
                console.error("Error capturando chart:", titleText, e);
            }
        } else if (imgEl) {
            imgEl.style.display = 'none';
            if (imgEl.previousElementSibling) imgEl.previousElementSibling.style.display = 'none';
            imgEl.parentElement.style.display = 'none';
        }
    };

    renderPrintChart(chartPeores, imgChart5, "Top Alerta Tardanzas (Peores)");
    renderPrintChart(chartExcelencia, imgChart1, "Top Excelencia Puntualidad (Mejores)");
    renderPrintChart(chartAprobaciones, imgChart2, "Evolución Diaria de Retiros");
    renderPrintChart(chartInactividad, imgChart3, "Promedio Inactividad Diaria (Min)");
    renderPrintChart(chartEficiencia, imgChart4, "Eficiencia y Volumen de Retiros");

    // 3.5. Tabla de Resumen
    const printTableContainer = document.getElementById('printTableContainer');
    if (printTableContainer) {
        const tableDiv = document.getElementById('tablaResumenOperativo').parentElement;
        printTableContainer.innerHTML = `<h3 style="color: #000; text-align: center; margin-bottom: 10px; font-size: 14pt; font-weight: bold; page-break-after: avoid;">Resumen de Retiros por Gestor</h3>` + tableDiv.outerHTML;
        printTableContainer.style.display = 'block';
    }

    // 4. Llamar a imprimir
    setTimeout(() => {
        window.print();
    }, 800);
}

// ---- app.js 7292-7479: loadControlOperativoData
async function loadControlOperativoData() {
    try {
        const data = await fetchKpiOperativosData();
        window.controlOperativoRawData = data;
        
        // Merge Inactividad from Firebase shift_reports
        try {
            if (database) {
                // Ensure kpiUsersData is populated
                if (!window.kpiUsersData || Object.keys(window.kpiUsersData).length === 0) {
                    const usersSnap = await database.ref('users').once('value');
                    if (usersSnap.exists()) {
                        window.kpiUsersData = {};
                        Object.values(usersSnap.val()).forEach(u => {
                            if (u && u.email && u.name) {
                                window.kpiUsersData[u.email.toLowerCase()] = u.name.trim();
                            }
                        });
                    }
                }
                
                const snapshot = await database.ref('shift_reports').once('value');
                if (snapshot.exists()) {
                    const shifts = snapshot.val();
                    Object.values(shifts).forEach(report => {
                        if (report.rol !== 'Gestor') return;
                        const gestorName = report.gestor;
                        if (!gestorName) return;
                        
                        const reportDate = report.timestamp ? new Date(report.timestamp) : new Date();
                        const reportDateStr = reportDate.toISOString().split('T')[0];
                        
                        // Encontrar el nombre real en controlOperativoRawData ignorando mayúsculas y acentos
                        const rawKeys = Object.keys(window.controlOperativoRawData);
                        const searchName = gestorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        let realGestor = rawKeys.find(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === searchName);
                        
                        // Fallback: Si no coincide exacto, buscar si contiene al menos el primer nombre y apellido
                        if (!realGestor) {
                            const parts = searchName.split(' ');
                            if (parts.length >= 2) {
                                realGestor = rawKeys.find(k => {
                                    const normK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                    return normK.includes(parts[0]) && normK.includes(parts[1]);
                                });
                            }
                        }
                        
                        if (!realGestor) {
                            realGestor = gestorName;
                            window.controlOperativoRawData[realGestor] = {};
                        }

                        if (realGestor) {
                            // Ensure date object exists
                            if (!window.controlOperativoRawData[realGestor][reportDateStr]) {
                                window.controlOperativoRawData[realGestor][reportDateStr] = {
                                    Dias_Laborados: 0,
                                    Minutos_Inactividad_Total: 0,
                                    Retiros_Procesados: 0,
                                    Retiros_Aprobados: 0,
                                    Retiros_Rechazados: 0,
                                    ART_Desde_Creacion_Minutos: 0
                                };
                            }
                            
                            // Calculate inactivity for this report using timeline directly to enforce 10-hour max shift
                            let inactMins = 0;
                            let shiftLoginDate = report.loginTime ? new Date(report.loginTime) : (report.timestamp ? new Date(report.timestamp) : null);
                            const maxEndTime = shiftLoginDate ? shiftLoginDate.getTime() + (10 * 60 * 60 * 1000) : Date.now() + 99999999;
                            
                            if (report.timeline && report.timeline.length > 0) {
                                const now = Date.now();
                                report.timeline.forEach(ev => {
                                    if (ev.type === 'Inactividad') {
                                        if (shiftLoginDate && ev.start > maxEndTime) return; // Skip if after 10h
                                        let eTime = ev.end ? ev.end : now;
                                        if (shiftLoginDate && eTime > maxEndTime) eTime = maxEndTime; // Cap if overlaps 10h limit
                                        let mins = (eTime - ev.start) / (1000 * 60);
                                        if (mins > 0) inactMins += mins;
                                    }
                                });
                            } else if (report.inactividadTotalMins !== undefined) {
                                inactMins = report.inactividadTotalMins; // Fallback only if no timeline
                            }
                            
                            // Calculate tardanza
                            // Calculate tardanza
                            let tardMins = 0;
                            let isFueraDeHorario = false;
                            let loginDate = report.loginTime ? new Date(report.loginTime) : null;
                            if (report.tardanzaMins !== undefined) {
                                tardMins = report.tardanzaMins;
                            } else {
                                if (!loginDate && report.horaInicio) {
                                    try {
                                        let parts = report.horaInicio.split(',');
                                        if (parts.length > 0) {
                                            let dParts = parts[0].trim().split('/');
                                            if (dParts.length === 3) {
                                                let day = parseInt(dParts[0]);
                                                let month = parseInt(dParts[1]);
                                                let year = parseInt(dParts[2]);
                                                if (month > 12) { let t = day; day = month; month = t; }
                                                let tStr = parts.length > 1 ? parts[1].trim().replace(/\./g, '').replace(/a\s*m/i, 'AM').replace(/p\s*m/i, 'PM') : "00:00:00";
                                                loginDate = new Date(`${month}/${day}/${year} ${tStr}`);
                                            } else {
                                                loginDate = new Date(report.horaInicio);
                                            }
                                        }
                                    } catch(e) {}
                                }
                                
                                if (loginDate && !isNaN(loginDate.getTime()) && report.turnoProgramado) {
                                    const shiftStr = report.turnoProgramado.toLowerCase().trim();
                                    const match = shiftStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
                                    if (match) {
                                        let hour = parseInt(match[1], 10);
                                        let minute = match[2] ? parseInt(match[2], 10) : 0;
                                        const ampm = match[3].toLowerCase();
                                        
                                        if (ampm === 'pm' && hour < 12) hour += 12;
                                        if (ampm === 'am' && hour === 12) hour = 0;
                                        
                                        const expected = new Date(loginDate);
                                        expected.setHours(hour, minute, 0, 0);
                                        
                                        let diffMinutes = (loginDate - expected) / 60000;
                                        
                                        if (diffMinutes < -12 * 60) {
                                            expected.setDate(expected.getDate() - 1);
                                            diffMinutes = (loginDate - expected) / 60000;
                                        } else if (diffMinutes > 12 * 60) {
                                            expected.setDate(expected.getDate() + 1);
                                            diffMinutes = (loginDate - expected) / 60000;
                                        }
                                        
                                        if (diffMinutes > 240) {
                                            isFueraDeHorario = true;
                                        }
                                        
                                        if (diffMinutes > 5 && !isFueraDeHorario) {
                                            tardMins = Math.round(diffMinutes);
                                        }
                                    }
                                }
                            }
                            
                            // Add to raw data
                            if (!isFueraDeHorario) {
                                // Cap inactivity to max 8 hours (480 mins) per shift to prevent infinite sessions from exploding stats
                                let cappedInactMins = Math.min(inactMins, 480);
                                window.controlOperativoRawData[realGestor][reportDateStr].Minutos_Inactividad_Total = (window.controlOperativoRawData[realGestor][reportDateStr].Minutos_Inactividad_Total || 0) + cappedInactMins;
                            }
                            
                            // Guardar la tardanza considerando el primer ingreso del día (o si reporta tardanza mayor a 0)
                            const currentStoredTard = window.controlOperativoRawData[realGestor][reportDateStr].Minutos_Tarde_Total;
                            if (currentStoredTard === undefined || (tardMins > 0 && currentStoredTard === 0)) {
                                window.controlOperativoRawData[realGestor][reportDateStr].Minutos_Tarde_Total = tardMins;
                                window.controlOperativoRawData[realGestor][reportDateStr].Dias_Tarde = tardMins > 0 ? 1 : 0;
                                if (loginDate) window.controlOperativoRawData[realGestor][reportDateStr]._earliestLogin = loginDate;
                            } else if (loginDate && window.controlOperativoRawData[realGestor][reportDateStr]._earliestLogin && loginDate < window.controlOperativoRawData[realGestor][reportDateStr]._earliestLogin) {
                                window.controlOperativoRawData[realGestor][reportDateStr].Minutos_Tarde_Total = tardMins;
                                window.controlOperativoRawData[realGestor][reportDateStr].Dias_Tarde = tardMins > 0 ? 1 : 0;
                                window.controlOperativoRawData[realGestor][reportDateStr]._earliestLogin = loginDate;
                            }
                            
                            window.controlOperativoRawData[realGestor][reportDateStr].Dias_Laborados = 1; // Un turno reportado = 1 día laborado
                        }
                    });
                }
            }
        } catch (fbErr) {
            console.error("Error fetching shift_reports for inactivity:", fbErr);
        }
        
        // Populate dropdowns
        const gestores = Object.keys(window.controlOperativoRawData).sort();
        setupCustomMultiSelect('operativoGestorMultiSelect', gestores, () => {
            renderControlOperativoFiltered();
        });
        
        renderControlOperativoFiltered();
    } catch (error) {
        console.error("Error loading Control Operativo:", error);
        alert("Error cargando datos operativos. Detalle: " + error.message);
    }
}

// ---- app.js 7481-7735: renderControlOperativoFiltered
function renderControlOperativoFiltered() {
    if (!window.controlOperativoRawData) return;
    
    const selectedGestores = getSelectedMultiSelectValues('operativoGestorMultiSelect');
    const selectedFecha = document.getElementById('filtroFechaOperativo').value;
    
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
    
    // Render table
    const tbody = document.querySelector('#tablaResumenOperativo tbody');
    tbody.innerHTML = '';
    
    let globalProcesados = 0;
    let globalAprobados = 0;
    let globalRechazados = 0;
    let globalARTTotal = 0;
    let gestoresContados = 0;

    const gestoresArray = Object.keys(aggregatedData).map(gestor => ({ gestor, ...aggregatedData[gestor] }));
    gestoresArray.sort((a, b) => b.Retiros_Aprobados - a.Retiros_Aprobados);

    for (const d of gestoresArray) {
        const gestor = d.gestor;
        if (d.Retiros_Procesados === 0 && d.Dias_Laborados === 0) continue; // Skip empty rows if filtered out
        
        globalProcesados += d.Retiros_Procesados;
        globalAprobados += d.Retiros_Aprobados;
        globalRechazados += d.Retiros_Rechazados;
        globalARTTotal += d.ART_Desde_Creacion_Minutos;
        if (d.Retiros_Procesados > 0) gestoresContados++;
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
        tr.style.transition = 'background 0.2s ease, transform 0.1s ease';
        tr.style.cursor = 'pointer';
        tr.title = 'Haz clic para filtrar o quitar filtro de este gestor';
        tr.onmouseover = () => tr.style.background = 'var(--bg-secondary, #f8f9fa)';
        tr.onmouseout = () => tr.style.background = 'transparent';
        
        tr.onclick = () => {
            const selectId = 'operativoGestorMultiSelect';
            const currentSelected = getSelectedMultiSelectValues(selectId);
            
            // Si el gestor ya está seleccionado de manera única, lo deseleccionamos (Filtro Todos)
            if (currentSelected.length === 1 && currentSelected[0] === gestor) {
                setCustomMultiSelectValues(selectId, []);
            } else {
                // De lo contrario, seleccionamos solo este gestor
                setCustomMultiSelectValues(selectId, [gestor]);
            }
            
            if (typeof renderControlOperativoFiltered === 'function') {
                renderControlOperativoFiltered();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
        
        const badgeAprobados = `<span style="background: rgba(16, 185, 129, 0.15); color: var(--success); padding: 4px 10px; border-radius: 20px; font-weight: 700;">${d.Retiros_Aprobados}</span>`;
        const badgeRechazados = `<span style="background: rgba(239, 68, 68, 0.15); color: var(--danger); padding: 4px 10px; border-radius: 20px; font-weight: 700;">${d.Retiros_Rechazados}</span>`;
        
        tr.innerHTML = `
            <td style="padding: 16px 20px; font-weight: 600; color: var(--text-primary);">${escapeHTML(gestor)}</td>
            <td style="padding: 16px 20px;">${badgeAprobados}</td>
            <td style="padding: 16px 20px;">${badgeRechazados}</td>
            <td style="padding: 16px 20px; font-weight: 600; color: var(--text-secondary);">${d.Retiros_Procesados}</td>
            <td style="padding: 16px 20px; font-weight: 600; color: var(--text-secondary);">${d.Porcentaje_Rechazos}%</td>
            <td style="padding: 16px 20px; font-weight: 600; color: var(--text-secondary);">${d.Tasa_Aprobacion_Dia}</td>
        `;
        tbody.appendChild(tr);
    }
    
    // Update summary widgets
    const avgArt = gestoresContados > 0 ? (globalARTTotal / gestoresContados).toFixed(1) : 0;
    const wTotal = document.getElementById('operativoWidgetTotal');
    const wAprob = document.getElementById('operativoWidgetAprobados');
    const wRech = document.getElementById('operativoWidgetRechazados');
    const wArt = document.getElementById('operativoWidgetART');
    
    if(wTotal) wTotal.textContent = globalProcesados;
    if(wAprob) wAprob.textContent = globalAprobados;
    if(wRech) wRech.textContent = globalRechazados;
    if(wArt) wArt.innerHTML = `${escapeHTML(String(avgArt))}<span style="font-size: 16px; font-weight: 600; margin-left: 4px;">min</span>`;
    
    // Render charts
    // Filter out empty gestores for global charts
    const globalForCharts = {};
    const excludedGestoresGlobal = SUPERVISORES_NOMBRES;
    for (const gestor in aggregatedDataGlobal) {
        if (excludedGestoresGlobal.some(ex => gestor.includes(ex) || gestor.includes('Sara Santamar'))) continue;
        if (aggregatedDataGlobal[gestor].Retiros_Procesados > 0 || aggregatedDataGlobal[gestor].Dias_Laborados > 0) {
            globalForCharts[gestor] = aggregatedDataGlobal[gestor];
        }
    }
    
    // We pass globalForCharts to the charts so rankings always compare the whole team.
    // However, we pass dailyData which is specific to the selected gestor so the line chart is filtered.
    const selectedGestor = selectedGestores.length === 1 ? selectedGestores[0] : (selectedGestores.length === 0 ? 'Todos' : `${selectedGestores.length} Gestores`);
    renderControlOperativoCharts(globalForCharts, dailyData, selectedGestor);
    
    // Auto-refresh KPI rings every time filters change
    calcularIndicadores();
}

// ---- app.js 7737-7970: renderControlOperativoCharts
function renderControlOperativoCharts(data, dailyData, selectedGestor) {
    const isGlobal = (selectedGestor === 'Todos' || selectedGestor.includes('Gestores'));
    
    let realSelectedGestor = null;
    if (!isGlobal && selectedGestor) {
        const rawKeys = Object.keys(window.controlOperativoRawData || {});
        realSelectedGestor = rawKeys.find(k => k === selectedGestor);
        if (!realSelectedGestor) {
            const parts = selectedGestor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ');
            realSelectedGestor = rawKeys.find(k => {
                const normK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return parts.every(p => normK.includes(p));
            });
        }
        if (!realSelectedGestor) realSelectedGestor = selectedGestor;
    }

    // UI titles update
    const elTitlePeores = document.getElementById('titleTardanzasPeores');
    const elTitleMejores = document.getElementById('titleTardanzasMejores');
    const elTitleInactividad = document.getElementById('titleInactividad');
    const elTitleEficiencia = document.getElementById('titleEficiencia');
    const elTitleMatriz = document.getElementById('titleMatrizFuga');

    if (isGlobal) {
        if (elTitlePeores) elTitlePeores.innerHTML = `<i class='bx bx-alarm-exclamation'></i> Top Alerta Tardanzas (Peores 5)`;
        if (elTitleMejores) elTitleMejores.innerHTML = `<i class='bx bx-medal'></i> Top Excelencia Puntualidad (Mejores 5)`;
        if (elTitleInactividad) elTitleInactividad.innerHTML = `<i class='bx bx-coffee-togo'></i> Promedio Inactividad Diaria (Min)`;
        if (elTitleEficiencia) elTitleEficiencia.innerHTML = `<i class='bx bx-layer'></i> Eficiencia y Volumen de Retiros`;
        if (elTitleMatriz) elTitleMatriz.innerHTML = `<i class='bx bx-bar-chart-alt-2'></i> Ranking de Porcentaje de Rechazos`;
    } else {
        if (elTitlePeores) elTitlePeores.innerHTML = `<i class='bx bx-alarm-exclamation'></i> Fechas con Llegada Tarde - ${escapeHTML(selectedGestor)}`;
        if (elTitleMejores) elTitleMejores.innerHTML = `<i class='bx bx-check-double'></i> Fechas de Conexión a Tiempo - ${escapeHTML(selectedGestor)}`;
        if (elTitleInactividad) elTitleInactividad.innerHTML = `<i class='bx bx-coffee-togo'></i> Inactividad Diaria por Fecha - ${escapeHTML(selectedGestor)}`;
        if (elTitleEficiencia) elTitleEficiencia.innerHTML = `<i class='bx bx-layer'></i> Evolución Diaria de Retiros - ${escapeHTML(selectedGestor)}`;
        if (elTitleMatriz) elTitleMatriz.innerHTML = `<i class='bx bx-target-lock'></i> % Rechazos: ${escapeHTML(selectedGestor)}`;
    }

    let activeData = {};
    const selectedGestoresList = getSelectedMultiSelectValues('operativoGestorMultiSelect');
    if (isGlobal || selectedGestoresList.length === 0) {
        activeData = data;
    } else {
        const rawKeys = Object.keys(data);
        selectedGestoresList.forEach(g => {
            let realGestor = rawKeys.find(k => k === g);
            if (!realGestor) {
                const parts = g.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ');
                realGestor = rawKeys.find(k => {
                    const normK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return parts.every(p => normK.includes(p));
                });
            }
            if (realGestor && data[realGestor]) {
                activeData[realGestor] = data[realGestor];
            } else if (data[g]) {
                activeData[g] = data[g];
            }
        });
    }
    
    const gestores = Object.keys(activeData);
    const sortedDates = Object.keys(dailyData).sort();
    const sortBy = (key, asc=false) => [...gestores].sort((a,b) => asc ? activeData[a][key] - activeData[b][key] : activeData[b][key] - activeData[a][key]);

    if (isGlobal) {
        // 1. Top Alerta Tardanzas (Peores 5)
        let peoresTardanzas = sortBy('Prom_Minutos_Tarde').filter(g => activeData[g].Prom_Minutos_Tarde > 0).slice(0, 5);
        let peoresColors, peoresBorders, peoresData;
        if (peoresTardanzas.length === 0) {
            peoresTardanzas = ['Equipo 100% Puntual'];
            peoresData = [0];
            peoresColors = ['rgba(103, 194, 58, 0.7)'];
            peoresBorders = ['rgba(103, 194, 58, 1)'];
        } else {
            peoresData = peoresTardanzas.map(g => activeData[g].Prom_Minutos_Tarde);
            peoresColors = peoresTardanzas.map(() => 'rgba(245, 108, 108, 0.7)');
            peoresBorders = peoresTardanzas.map(() => 'rgba(245, 108, 108, 1)');
        }
        drawChart('chartTardanzasPeores', 'bar', peoresTardanzas, peoresData, 'Minutos Tarde (Promedio)', peoresColors, peoresBorders, { indexAxis: 'y' });
        
        // 2. Top Excelencia Puntualidad (Mejores 5)
        let mejoresTardanzas = sortBy('Prom_Minutos_Tarde', true).slice(0, 5).reverse();
        const mejoresColors = mejoresTardanzas.map(() => 'rgba(103, 194, 58, 0.7)');
        const mejoresBorders = mejoresTardanzas.map(() => 'rgba(103, 194, 58, 1)');
        drawChart('chartTardanzasMejores', 'bar', mejoresTardanzas, mejoresTardanzas.map(g => activeData[g].Prom_Minutos_Tarde), 'Minutos Tarde (Promedio)', mejoresColors, mejoresBorders, { indexAxis: 'y' });

        // 3. Promedio Inactividad Diaria
        const inactividadTop = sortBy('Prom_Inactividad_Diaria').slice(0, 10);
        const bgColors = inactividadTop.map(g => {
            let v = activeData[g].Prom_Inactividad_Diaria;
            return v > 45 ? 'rgba(245, 108, 108, 0.7)' : (v > 20 ? 'rgba(230, 162, 60, 0.7)' : 'rgba(103, 194, 58, 0.7)');
        });
        drawChart('chartInactividad', 'bar', inactividadTop, inactividadTop.map(g => activeData[g].Prom_Inactividad_Diaria), 'Minutos Inactividad', bgColors, bgColors);
    
    } else {
        // SINGLE GESTOR:
        if (!realSelectedGestor) realSelectedGestor = selectedGestor;

        // 1. Fechas con Llegadas Tarde (Show all dates in sortedDates with red bars for late minutes)
        const dailyLateMins = sortedDates.map(date => {
            const raw = window.controlOperativoRawData[realSelectedGestor]?.[date];
            return (raw && (raw.Minutos_Tarde_Total || 0) > 0) ? raw.Minutos_Tarde_Total : 0;
        });

        const hasLate = dailyLateMins.some(v => v > 0);

        if (!hasLate) {
            drawChart('chartTardanzasPeores', 'bar', ['Sin Llegadas Tardes en el Periodo'], [0], 'Minutos Tarde', ['rgba(103, 194, 58, 0.7)'], ['rgba(103, 194, 58, 1)'], {
                maxBarThickness: 36,
                plugins: {
                    datalabels: {
                        formatter: function() { return "🎉 ¡Sin tardanzas!"; },
                        anchor: 'center', align: 'center', color: 'var(--success)', font: { size: 12, weight: 'bold' }
                    }
                }
            });
        } else {
            const lateColors = dailyLateMins.map(v => v > 0 ? 'rgba(245, 108, 108, 0.85)' : 'rgba(0,0,0,0)');
            drawChart('chartTardanzasPeores', 'bar', sortedDates, dailyLateMins, 'Minutos Tarde', lateColors, lateColors, {
                maxBarThickness: 36,
                plugins: {
                    datalabels: {
                        formatter: function(val) { return val > 0 ? `+${val}m` : ''; },
                        anchor: 'end', align: 'top', color: 'var(--danger)', font: { size: 10, weight: 'bold' }
                    }
                },
                scales: {
                    x: { ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 45, minRotation: 0, font: { size: 10 } } },
                    y: { beginAtZero: true, grace: '20%' }
                }
            });
        }

        // 2. Fechas de Conexión a Tiempo (Dates where Dias_Laborados > 0 AND Minutos_Tarde_Total === 0)
        const punctualDates = [];
        sortedDates.forEach(date => {
            const raw = window.controlOperativoRawData[realSelectedGestor]?.[date];
            if (raw && raw.Dias_Laborados > 0 && (raw.Minutos_Tarde_Total || 0) === 0) {
                punctualDates.push(date);
            }
        });

        if (punctualDates.length === 0) {
            drawChart('chartTardanzasMejores', 'bar', ['Sin Conexiones a Tiempo en el Periodo'], [0], 'Conexión a Tiempo', ['rgba(245, 108, 108, 0.7)'], ['rgba(245, 108, 108, 1)'], { maxBarThickness: 36 });
        } else {
            const punctualData = punctualDates.map(() => 0);
            const punctualColors = punctualDates.map(() => 'rgba(103, 194, 58, 0.8)');
            drawPunctualDatesChart('chartTardanzasMejores', punctualDates, punctualData, punctualColors);
        }

        // 3. Inactividad Diaria por Fecha
        const dailyInactivityValues = sortedDates.map(date => {
            return window.controlOperativoRawData[realSelectedGestor]?.[date]?.Minutos_Inactividad_Total || 0;
        });
        const dailyBgColors = dailyInactivityValues.map(v => {
            return v > 45 ? 'rgba(245, 108, 108, 0.7)' : (v > 20 ? 'rgba(230, 162, 60, 0.7)' : 'rgba(103, 194, 58, 0.7)');
        });
        drawChart('chartInactividad', 'bar', sortedDates, dailyInactivityValues, `Inactividad (Min)`, dailyBgColors, dailyBgColors, {
            maxBarThickness: 36,
            scales: {
                x: { ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 45, minRotation: 0, font: { size: 10 } } }
            }
        });
    }

    // 4. Aprobaciones por Día Chart
    const dailyAprobados = sortedDates.map(date => dailyData[date].Aprobados);
    const dailyRechazados = sortedDates.map(date => dailyData[date].Rechazados);
    
    destroyChart('chartAprobacionesDia');
    const ctxAprobDia = document.getElementById('chartAprobacionesDia').getContext('2d');
    
    const datalabelsDaily = {
        formatter: function(value) {
            if (value === 0 || value === "0") return "";
            return value.toLocaleString('es-CO');
        },
        anchor: 'end', align: 'top', color: '#666', font: { size: 10, weight: 'bold' }
    };

    controlOperativoCharts['chartAprobacionesDia'] = new Chart(ctxAprobDia, {
        type: 'line',
        plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
        data: {
            labels: sortedDates,
            datasets: [
                {
                    label: 'Aprobados',
                    data: dailyAprobados,
                    borderColor: 'rgba(103, 194, 58, 1)',
                    backgroundColor: 'rgba(103, 194, 58, 0.2)',
                    fill: true,
                    tension: 0.3,
                    datalabels: { align: 'top', anchor: 'end', color: '#fff', textStrokeColor: 'rgba(103, 194, 58, 1)', textStrokeWidth: 3 }
                },
                {
                    label: 'Rechazados',
                    data: dailyRechazados,
                    borderColor: 'rgba(245, 108, 108, 1)',
                    backgroundColor: 'rgba(245, 108, 108, 0.2)',
                    fill: true,
                    tension: 0.3,
                    datalabels: { align: 'top', anchor: 'end', color: '#fff', textStrokeColor: 'rgba(245, 108, 108, 1)', textStrokeWidth: 3 }
                }
            ]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 30 } },
            plugins: {
                datalabels: datalabelsDaily,
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 45, minRotation: 0, font: { size: 10 } } },
                y: { beginAtZero: true, grace: '15%' }
            }
        }
    });
    
    // 5. Eficiencia y Volumen de Retiros
    if (isGlobal) {
        const volTop = sortBy('Retiros_Procesados');
        drawCombinedChart('chartEficiencia', volTop, activeData);
    } else {
        drawCombinedChartDaily('chartEficiencia', sortedDates, realSelectedGestor);
    }
    
    // 6. Matriz de Riesgo: % Rechazos vs Tasa Aprobación
    drawScatterMatriz('chartMatrizFuga', gestores, activeData, isGlobal);
}

// ---- app.js 7972-8031: drawPunctualDatesChart
function drawPunctualDatesChart(id, dates, dataArr, bgColors) {
    destroyChart(id);
    const ctx = document.getElementById(id).getContext('2d');
    
    const datalabelsConfig = {
        formatter: function() {
            return "✓ 0 min";
        },
        anchor: 'center',
        align: 'center',
        color: '#ffffff',
        font: { size: 10, weight: 'bold' }
    };

    controlOperativoCharts[id] = new Chart(ctx, {
        type: 'bar',
        plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
        data: {
            labels: dates,
            datasets: [{
                label: 'Conexión a Tiempo',
                data: dates.map(() => 100),
                backgroundColor: 'rgba(103, 194, 58, 0.8)',
                borderColor: 'rgba(103, 194, 58, 1)',
                borderWidth: 1,
                maxBarThickness: 36
            }]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 25 }
            },
            plugins: {
                datalabels: datalabelsConfig,
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return `${ctx.label}: Conexión a Tiempo (0 min tarde)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 45, minRotation: 0, font: { size: 10 } }
                },
                y: {
                    beginAtZero: true,
                    max: 120,
                    ticks: {
                        callback: function(v) { return v === 100 ? 'A tiempo' : ''; }
                    }
                }
            }
        }
    });
}

// ---- app.js 8033-8083: drawChart
function drawChart(id, type, labels, dataArr, labelStr, bgColor, borderColor, extraOptions = {}) {
    destroyChart(id);
    const ctx = document.getElementById(id).getContext('2d');
    
    const isHorizontal = extraOptions.indexAxis === 'y';
    const datalabelsConfig = {
        formatter: function(value) {
            if (value === 0 || value === "0") return "0 min";
            const num = Number(value);
            const isInt = Number.isInteger(num);
            return num.toLocaleString('es-CO', { 
                minimumFractionDigits: isInt ? 0 : 2, 
                maximumFractionDigits: isInt ? 0 : 2 
            });
        },
        anchor: 'end',
        align: isHorizontal ? 'right' : 'top',
        color: '#666',
        font: { size: 10, weight: 'bold' }
    };

    if (!extraOptions.plugins) extraOptions.plugins = {};
    if (!extraOptions.plugins.datalabels) extraOptions.plugins.datalabels = datalabelsConfig;

    controlOperativoCharts[id] = new Chart(ctx, {
        type: type,
        plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
        data: {
            labels: labels,
            datasets: [{
                label: labelStr,
                data: dataArr,
                backgroundColor: bgColor,
                borderColor: borderColor,
                borderWidth: 1
            }]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: isHorizontal ? 0 : 20,
                    right: isHorizontal ? 40 : 0
                }
            },
            ...extraOptions
        }
    });
}

// ---- app.js 8085-8150: drawCombinedChart
function drawCombinedChart(id, labels, data) {
    destroyChart(id);
    const ctx = document.getElementById(id).getContext('2d');
    
    const datalabelsConfig = {
        formatter: function(value) {
            if (value === 0 || value === "0") return "";
            const num = Number(value);
            const isInt = Number.isInteger(num);
            return num.toLocaleString('es-CO', { 
                minimumFractionDigits: isInt ? 0 : 2, 
                maximumFractionDigits: isInt ? 0 : 2 
            });
        },
        anchor: 'end',
        align: 'top',
        color: '#666',
        font: { size: 11, weight: 'bold' }
    };

    controlOperativoCharts[id] = new Chart(ctx, {
        type: 'bar',
        plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Aprobados',
                    data: labels.map(g => data[g].Retiros_Aprobados),
                    backgroundColor: 'rgba(103, 194, 58, 0.7)',
                    datalabels: { align: 'center', anchor: 'center', color: '#fff', textStrokeColor: 'rgba(0,0,0,0.5)', textStrokeWidth: 3 }
                },
                {
                    label: 'Rechazados',
                    data: labels.map(g => data[g].Retiros_Rechazados),
                    backgroundColor: 'rgba(245, 108, 108, 0.7)',
                    datalabels: { align: 'center', anchor: 'center', color: '#fff', textStrokeColor: 'rgba(0,0,0,0.6)', textStrokeWidth: 3 }
                },
                {
                    label: 'Tasa Aprobación / Día',
                    data: labels.map(g => data[g].Tasa_Aprobacion_Dia),
                    type: 'line',
                    borderColor: 'rgba(64, 158, 255, 1)',
                    backgroundColor: 'rgba(64, 158, 255, 1)',
                    yAxisID: 'y1',
                    datalabels: { align: 'top', anchor: 'end', color: '#fff', textStrokeColor: 'rgba(64, 158, 255, 1)', textStrokeWidth: 3 }
                }
            ]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 30 } },
            plugins: {
                datalabels: datalabelsConfig,
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, position: 'left', grace: '10%' },
                y1: { position: 'right', grid: { drawOnChartArea: false }, grace: '15%' }
            }
        }
    });
}

// ---- app.js 8152-8216: drawCombinedChartDaily
function drawCombinedChartDaily(id, sortedDates, selectedGestor) {
    destroyChart(id);
    const ctx = document.getElementById(id).getContext('2d');

    const aprobadosData = sortedDates.map(d => window.controlOperativoRawData[selectedGestor]?.[d]?.Retiros_Aprobados || 0);
    const rechazadosData = sortedDates.map(d => window.controlOperativoRawData[selectedGestor]?.[d]?.Retiros_Rechazados || 0);
    const tasaData = sortedDates.map(d => window.controlOperativoRawData[selectedGestor]?.[d]?.Retiros_Aprobados || 0);

    const datalabelsConfig = {
        formatter: function(value) {
            if (value === 0 || value === "0") return "";
            return Number(value).toLocaleString('es-CO');
        },
        anchor: 'end',
        align: 'top',
        color: '#666',
        font: { size: 11, weight: 'bold' }
    };

    controlOperativoCharts[id] = new Chart(ctx, {
        type: 'bar',
        plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
        data: {
            labels: sortedDates,
            datasets: [
                {
                    label: 'Aprobados',
                    data: aprobadosData,
                    backgroundColor: 'rgba(103, 194, 58, 0.7)',
                    datalabels: { align: 'center', anchor: 'center', color: '#fff', textStrokeColor: 'rgba(0,0,0,0.5)', textStrokeWidth: 3 }
                },
                {
                    label: 'Rechazados',
                    data: rechazadosData,
                    backgroundColor: 'rgba(245, 108, 108, 0.7)',
                    datalabels: { align: 'center', anchor: 'center', color: '#fff', textStrokeColor: 'rgba(0,0,0,0.6)', textStrokeWidth: 3 }
                },
                {
                    label: 'Aprobaciones del Día',
                    data: tasaData,
                    type: 'line',
                    borderColor: 'rgba(64, 158, 255, 1)',
                    backgroundColor: 'rgba(64, 158, 255, 1)',
                    yAxisID: 'y1',
                    datalabels: { align: 'top', anchor: 'end', color: '#fff', textStrokeColor: 'rgba(64, 158, 255, 1)', textStrokeWidth: 3 }
                }
            ]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 30 } },
            plugins: {
                datalabels: datalabelsConfig,
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, position: 'left', grace: '10%' },
                y1: { position: 'right', grid: { drawOnChartArea: false }, grace: '15%' }
            }
        }
    });
}

// ---- app.js 8218-8328: drawScatterMatriz
function drawScatterMatriz(id, gestores, data, isGlobal = true) {
    destroyChart(id);
    const ctx = document.getElementById(id).getContext('2d');
    
    if (isGlobal) {
        const sortedGestores = [...gestores].sort((a,b) => (data[b].Porcentaje_Rechazos || 0) - (data[a].Porcentaje_Rechazos || 0));
        const rechazosData = sortedGestores.map(g => data[g].Porcentaje_Rechazos || 0);
        const colors = rechazosData.map(v => v > 5 ? 'rgba(245, 108, 108, 0.8)' : (v > 2 ? 'rgba(230, 162, 60, 0.8)' : 'rgba(103, 194, 58, 0.8)'));

        const datalabelsConfig = {
            formatter: function(value) {
                return `${value}%`;
            },
            anchor: 'end',
            align: 'top',
            color: '#666',
            font: { size: 11, weight: 'bold' }
        };

        controlOperativoCharts[id] = new Chart(ctx, {
            type: 'bar',
            plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
            data: {
                labels: sortedGestores,
                datasets: [{
                    label: 'Porcentaje de Rechazos (%)',
                    data: rechazosData,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 30 } },
                plugins: {
                    datalabels: datalabelsConfig,
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return `% Rechazos: ${ctx.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, grace: '15%', title: { display: true, text: '% Rechazos' } }
                }
            }
        });
    } else {
        const gestor = gestores[0];
        const gData = data[gestor];
        const rawTasa = gData ? (typeof gData.Tasa_Aprobacion_Dia === 'string' ? parseFloat(gData.Tasa_Aprobacion_Dia.replace('%', '')) : (gData.Tasa_Aprobacion_Dia || 0)) : 0;
        const rawRechazos = gData ? (typeof gData.Porcentaje_Rechazos === 'string' ? parseFloat(gData.Porcentaje_Rechazos.replace('%', '')) : (gData.Porcentaje_Rechazos || 0)) : 0;
        const scatterPoint = gData ? [{
            x: isNaN(rawTasa) ? 0 : rawTasa,
            y: isNaN(rawRechazos) ? 0 : rawRechazos,
            name: gestor
        }] : [];

        const datalabelsConfig = {
            formatter: function(value) {
                return `${value.name}
(Tasa: ${value.x}/día, Rechazos: ${value.y}%)`;
            },
            anchor: 'center',
            align: 'top',
            color: '#409EFF',
            font: { size: 11, weight: 'bold' }
        };

        controlOperativoCharts[id] = new Chart(ctx, {
            type: 'scatter',
            plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
            data: {
                datasets: [{
                    label: gestor || 'Gestor',
                    data: scatterPoint,
                    backgroundColor: 'rgba(64, 158, 255, 0.9)',
                    borderColor: 'rgba(64, 158, 255, 1)',
                    pointRadius: 10,
                    pointHoverRadius: 12
                }]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 45, right: 45 } },
                plugins: {
                    datalabels: datalabelsConfig,
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                let item = ctx.raw;
                                return `${item.name}: Tasa Aprob.= ${item.x}/día, % Rechazos= ${item.y}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: { beginAtZero: true, title: { display: true, text: 'Tasa Aprobación / Día' }, grace: '25%' },
                    y: { beginAtZero: true, title: { display: true, text: 'Porcentaje Rechazos (%)' }, grace: '25%' }
                }
            }
        });
    }
}

    return {
        fetchKpiOperativosData, loadRetirosData, loadGestoresForKPIs, openKpiTaskDetails, closeKpiTaskDetails,
        destroyChart, toggleOperativoCustomDates, generarAnalisisTextual, generarReporteEjecutivoPDF,
        loadControlOperativoData, renderControlOperativoFiltered, renderControlOperativoCharts,
        drawPunctualDatesChart, drawChart, drawCombinedChart, drawCombinedChartDaily, drawScatterMatriz,
        getCharts: () => controlOperativoCharts
    };
}
