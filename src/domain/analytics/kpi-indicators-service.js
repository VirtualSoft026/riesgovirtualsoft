/**
 * Funciones puras de cómputo para los KPI de turnos y retiros.
 *
 * Extraídas de `calcularIndicadores()` (app.js 5898–6321). Sin DOM, sin `window.*`,
 * sin Firebase. Todas las entradas llegan por parámetros; las dependencias de
 * resolución de nombres de tareas se inyectan como funciones.
 *
 * Decisiones (plan maestro §4 / P2):
 *  - `computeRetirosKpiStats` recibe `targetDates` pre-computadas por el controlador:
 *    la lectura del DOM para el rango personalizado queda en el llamador.
 *  - La resolución de nombres de tareas (`resolveDisplayName`) se inyecta para no
 *    crear dependencia con `resolveTaskDisplayName`/`isLegacyGenericTaskName` de app.js.
 *  - El parseo de tareas desde `report.reporte` (legacy) se mantiene aquí porque
 *    es lógica de dominio, no de presentación.
 */

// ─────────────────────────── parseShiftTime (helper interno) ────────────────────────────────

/**
 * Convierte un string/timestamp de hora de turno a milisegundos epoch (app.js 5910-5928).
 * Soporta Date ISO, "HH:MM AM/PM" y formatos similares.
 *
 * @param {string|number} timeStr
 * @param {number}        baseDateMs  Epoch del día base para strings de hora sola
 * @returns {number}  ms epoch, o NaN si no se puede parsear
 */
export function parseShiftTime(timeStr, baseDateMs) {
    if (typeof timeStr === 'string') {
        timeStr = timeStr
            .replace(/a\.\s*m\./i, 'AM')
            .replace(/p\.\s*m\./i, 'PM');
    }

    const direct = new Date(timeStr);
    if (!isNaN(direct.getTime())) return direct.getTime();

    if (typeof timeStr === 'string' && timeStr.includes(':')) {
        const parts = timeStr.match(/(\d+):(\d+)/);
        if (parts) {
            const base = new Date(baseDateMs);
            let hours = parseInt(parts[1], 10);
            if (timeStr.toUpperCase().includes('PM') && hours < 12) hours += 12;
            if (timeStr.toUpperCase().includes('AM') && hours === 12) hours = 0;
            base.setHours(hours, parseInt(parts[2], 10), 0, 0);
            return base.getTime();
        }
    }

    return NaN;
}

// ─────────────────────────── Duraciones de turno ────────────────────────────────────────────

/**
 * Tiempo efectivo total conectado y conteo de turnos válidos (app.js 5905-5948).
 *
 * "Efectivo" = duración bruta − almuerzo − desayuno − pausas programadas.
 * Solo se incluyen turnos con `horaInicio` Y `horaFin` parseables, con duración
 * entre 1 y 1440 minutos.
 *
 * @param {Array<{
 *   horaInicio?: string|null,
 *   horaFin?:    string|null,
 *   timestamp?:  number|string|null,
 *   loginTime?:  number|string|null,
 *   tiempoAlmuerzoMins?:   number,
 *   tiempoDesayunoMins?:   number,
 *   tiempoPausaTurnoMins?: number,
 * }>} shiftReports
 * @returns {{ totalMinutosConectados: number, turnosValidosParaTiempo: number }}
 */
export function computeShiftDurations(shiftReports) {
    let totalMinutosConectados = 0;
    let turnosValidosParaTiempo = 0;

    shiftReports.forEach(report => {
        if (!report.horaInicio || !report.horaFin) return;

        const baseMs = report.timestamp || report.loginTime || Date.now();
        const startMs = parseShiftTime(report.horaInicio, baseMs);
        const endMs   = parseShiftTime(report.horaFin,    baseMs);

        if (isNaN(startMs) || isNaN(endMs)) return;

        let diffMins = (endMs - startMs) / 60000;
        if (diffMins < 0) diffMins += 1440; // Cruzó la medianoche

        if (diffMins <= 0 || diffMins > 1440) return;

        const almuerzo  = report.tiempoAlmuerzoMins    || 0;
        const desayuno  = report.tiempoDesayunoMins    || 0;
        const pausaTurno = report.tiempoPausaTurnoMins || 0;
        const efectivo  = Math.max(0, diffMins - almuerzo - desayuno - pausaTurno);

        totalMinutosConectados += efectivo;
        turnosValidosParaTiempo++;
    });

    return { totalMinutosConectados, turnosValidosParaTiempo };
}

// ─────────────────────────── Conteo de tareas KPI ───────────────────────────────────────────

/**
 * Parsea tareas legacy desde el campo `reporte` de texto libre (app.js 6003-6015).
 *
 * @param {string} reporte
 * @returns {Record<string, { status: string, name: string, observation: string }>}
 */
function parseLegacyTasks(reporte) {
    const tasks = {};
    const regex = /\[\s*([A-Za-z_]+)\s*\]\s*-\s*([^\n]+)(?:\nObservación:\s*([^\n]+))?/g;
    let match;
    let i = 0;
    while ((match = regex.exec(reporte)) !== null) {
        tasks[`parsed_${i++}`] = {
            status:      match[1].toLowerCase(),
            name:        match[2].trim(),
            observation: match[3] ? match[3].trim() : 'N/A',
        };
    }
    return tasks;
}

/**
 * Conteo de tareas por estado y listas de detalle para el modal (app.js 6002-6050).
 *
 * @param {Array<{
 *   tasks?:      Record<string, { status: string, name?: string, type?: string, observation?: string }>,
 *   reporte?:    string|null,
 *   timestamp?:  number|string|null,
 *   loginTime?:  number|string|null,
 * }>} shiftReports
 * @param {{
 *   resolveDisplayName?: (taskId: string, task: object) => string,
 * }} [opts]
 * @returns {{
 *   totalFinalizadas:  number,
 *   totalNoRealizadas: number,
 *   totalPendientes:   number,
 *   kpiTaskLists: {
 *     finalizadas:  Array<object>,
 *     no_realizadas: Array<object>,
 *     pendientes:   Array<object>,
 *   },
 * }}
 */
export function computeKpiTaskCounts(shiftReports, { resolveDisplayName } = {}) {
    const defaultResolve = (_taskId, task) => task.name || '';
    const getName = resolveDisplayName || defaultResolve;

    let totalFinalizadas  = 0;
    let totalNoRealizadas = 0;
    let totalPendientes   = 0;
    const kpiTaskLists = { finalizadas: [], no_realizadas: [], pendientes: [] };

    shiftReports.forEach(report => {
        let tasks = report.tasks;
        if (!tasks && report.reporte) {
            tasks = parseLegacyTasks(report.reporte);
        }
        if (!tasks) return;

        const shiftDateStr = new Date(report.timestamp || report.loginTime || Date.now())
            .toLocaleDateString();

        for (const taskId in tasks) {
            const task = tasks[taskId];
            if (!task.status) continue;

            const displayName = getName(taskId, task);
            const taskObj = {
                name:        displayName,
                date:        shiftDateStr,
                type:        task.type || 'N/A',
                observation: task.observation || 'N/A',
            };

            const tStatus = task.status.toLowerCase().trim();

            if (tStatus === 'finalizada') {
                totalFinalizadas++;
                kpiTaskLists.finalizadas.push(taskObj);
            } else if (tStatus === 'no_realizada' || tStatus === 'no realizada') {
                totalNoRealizadas++;
                kpiTaskLists.no_realizadas.push(taskObj);
            } else if (tStatus === 'pendiente' || tStatus === 'en_proceso' || tStatus === 'en proceso') {
                totalPendientes++;
                kpiTaskLists.pendientes.push(taskObj);
            }
        }
    });

    return { totalFinalizadas, totalNoRealizadas, totalPendientes, kpiTaskLists };
}

// ─────────────────────────── % Actividades ──────────────────────────────────────────────────

/**
 * Porcentaje de actividades = finalizadas / total (app.js 6053-6062).
 * Regla confirmada: 0% si no se marcó ninguna tarea.
 *
 * @param {number} totalFinalizadas
 * @param {number} totalNoRealizadas
 * @param {number} totalPendientes
 * @returns {number}  0-100, entero
 */
export function computeActividadesPercentage(totalFinalizadas, totalNoRealizadas, totalPendientes) {
    const totalTareas = totalFinalizadas + totalNoRealizadas + totalPendientes;
    if (totalTareas === 0) return 0;
    return Math.round((totalFinalizadas / totalTareas) * 100);
}

// ─────────────────────────── Inactividad y Conectividad ─────────────────────────────────────

/**
 * Calcula minutos de inactividad, sesiones válidas y porcentaje de conectividad
 * con clean-timeline (app.js 6064-6182).
 *
 * El clean-timeline:
 *  - Ordena eventos por `start`
 *  - Descarta eventos con duración ≤ 0
 *  - Descarta inactividades < 30 s
 *  - Descarta inactividades contenidas dentro de un break (Desayuno/Almuerzo)
 *  - Fusiona eventos contiguos del mismo tipo (gap ≤ 60 s)
 *  - Recorta la inactividad superpuesta con el evento anterior
 *  - Limita el conteo de inactividad a max 10 h de turno y max 480 min/turno
 *
 * @param {Array<{
 *   timeline?:              Array<{type:string, start:number, end?:number|null}>,
 *   inactividadTotalMins?:  number,
 *   penalidadConectividadMins?: number,
 *   loginTime?:             number|string|null,
 *   timestamp?:             number|string|null,
 *   turnoProgramado?:       string|null,
 *   horaInicio?:            string|null,
 * }>} shiftReports
 * @param {{ nowMs?: number }} [opts]
 * @returns {{
 *   totalInactividadMins:  number,
 *   validInactivitySessions: number,
 *   diasTrabajados:        number,
 *   porcentajeConectividad: number,
 * }}
 */
export function computeInactivityScore(shiftReports, { nowMs = Date.now() } = {}) {
    let totalInactividadMins    = 0;
    let totalPenalidadConectividad = 0; // se acumula pero no se usa en cómputo final (ver app.js)
    let validInactivitySessions = 0;

    shiftReports.forEach(report => {
        // ── Detectar turno fuera de horario ───────────────────────────────────────
        let isFueraDeHorario = false;
        if (report.turnoProgramado) {
            let loginDateObj = report.loginTime
                ? new Date(report.loginTime)
                : (report.timestamp ? new Date(report.timestamp) : null);

            if ((!loginDateObj || isNaN(loginDateObj)) && report.horaInicio) {
                try {
                    const parts = report.horaInicio.split(',');
                    if (parts.length > 0) {
                        const dParts = parts[0].trim().split('/');
                        if (dParts.length === 3) {
                            let day   = parseInt(dParts[0]);
                            let month = parseInt(dParts[1]);
                            const year = parseInt(dParts[2]);
                            if (month > 12) { const t = day; day = month; month = t; }
                            const tStr = parts.length > 1
                                ? parts[1].trim().replace(/\./g, '').replace(/a\s*m/i, 'AM').replace(/p\s*m/i, 'PM')
                                : '00:00:00';
                            loginDateObj = new Date(`${month}/${day}/${year} ${tStr}`);
                        }
                    }
                } catch (_) { /* ignorar */ }
            }

            if (loginDateObj && !isNaN(loginDateObj)) {
                const shiftStr = report.turnoProgramado.toLowerCase().trim();
                const match = shiftStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
                if (match) {
                    let h = parseInt(match[1]);
                    const m = match[2] ? parseInt(match[2]) : 0;
                    const ampm = match[3];
                    if (ampm === 'pm' && h < 12) h += 12;
                    if (ampm === 'am' && h === 12) h = 0;
                    const exp = new Date(loginDateObj);
                    exp.setHours(h, m, 0, 0);
                    let diffMin = (loginDateObj.getTime() - exp.getTime()) / 60000;
                    if (diffMin < -720) { exp.setDate(exp.getDate() - 1); diffMin = (loginDateObj.getTime() - exp.getTime()) / 60000; }
                    else if (diffMin > 720) { exp.setDate(exp.getDate() + 1); diffMin = (loginDateObj.getTime() - exp.getTime()) / 60000; }
                    if (diffMin > 240) isFueraDeHorario = true;
                }
            }
        }

        if (isFueraDeHorario) return;
        validInactivitySessions++;

        if (report.penalidadConectividadMins) {
            totalPenalidadConectividad += report.penalidadConectividadMins;
        }

        // ── Clean-timeline ────────────────────────────────────────────────────────
        if (report.timeline && report.timeline.length > 0) {
            const breaks = report.timeline.filter(b => b.type === 'Desayuno' || b.type === 'Almuerzo');
            const sortedEvs = [...report.timeline].sort((a, b) => a.start - b.start);
            const reportEndTs = report.timestamp || nowMs;
            const cleanTimeline = [];

            sortedEvs.forEach(ev => {
                let evStart = ev.start;
                let evEnd   = ev.end || reportEndTs;
                if (evEnd <= evStart) return;

                if (ev.type === 'Inactividad') {
                    if (evEnd - evStart < 30000) return; // < 30 s → ignorar
                    const insideBreak = breaks.some(b => {
                        const bStart = b.start;
                        const bEnd   = b.end || reportEndTs;
                        return evStart >= bStart && evEnd <= bEnd;
                    });
                    if (insideBreak) return;
                }

                if (cleanTimeline.length === 0) {
                    cleanTimeline.push({ type: ev.type, start: evStart, end: evEnd });
                } else {
                    const prev = cleanTimeline[cleanTimeline.length - 1];
                    if (prev.type === ev.type && evStart <= prev.end + 60000) {
                        // Fusionar
                        prev.end = Math.max(prev.end, evEnd);
                    } else if (evStart < prev.end) {
                        // Superposición
                        if (ev.type === 'Inactividad') {
                            if (evEnd > prev.end) {
                                evStart = prev.end;
                                if (evEnd - evStart >= 30000) {
                                    cleanTimeline.push({ type: ev.type, start: evStart, end: evEnd });
                                }
                            }
                        } else {
                            cleanTimeline.push({ type: ev.type, start: evStart, end: evEnd });
                        }
                    } else {
                        cleanTimeline.push({ type: ev.type, start: evStart, end: evEnd });
                    }
                }
            });

            const loginDate  = report.loginTime ? new Date(report.loginTime) : (report.timestamp ? new Date(report.timestamp) : null);
            const maxEndTime = loginDate ? loginDate.getTime() + (10 * 60 * 60 * 1000) : nowMs + 99999999;
            let fallbackMins = 0;

            cleanTimeline.forEach(ev => {
                if (ev.type !== 'Inactividad') return;
                if (loginDate && ev.start > maxEndTime) return;
                let eTime = ev.end ? ev.end : nowMs;
                if (loginDate && eTime > maxEndTime) eTime = maxEndTime;
                const mins = (eTime - ev.start) / (1000 * 60);
                if (mins > 0) fallbackMins += mins;
            });

            totalInactividadMins += Math.min(fallbackMins, 480);
        } else if (report.inactividadTotalMins !== undefined) {
            totalInactividadMins += Math.min(report.inactividadTotalMins, 480);
        }
    });

    const diasTrabajados = validInactivitySessions || (shiftReports.length ? 1 : 0);
    const totalMinutosEsperados = diasTrabajados * 405; // 6:45 h = 405 min/día
    const porcentajeInactividad = totalMinutosEsperados > 0
        ? (totalInactividadMins / totalMinutosEsperados) * 100
        : 0;

    let porcentajeConectividad = Number((100 - porcentajeInactividad).toFixed(2));
    porcentajeConectividad = Math.max(0, Math.min(100, porcentajeConectividad));

    return { totalInactividadMins, validInactivitySessions, diasTrabajados, porcentajeConectividad };
}

// ─────────────────────────── Retiros — agregación ───────────────────────────────────────────

/**
 * Agrega estadísticas de retiros desde `controlOperativoRawData` para el periodo dado
 * (app.js 6207-6281).
 *
 * El controlador es responsable de:
 *  - Cargar `rawData` (la referencia `window.controlOperativoRawData`)
 *  - Construir `targetDates` a partir del `periodo` y el DOM (rango custom)
 *  - Resolver `allGestorKeys` = Object.keys(rawData) cuando selectedGestores = []
 *
 * @param {Record<string, Record<string, {
 *   Retiros_Aprobados?:                  number,
 *   Retiros_Rechazados?:                 number,
 *   Tiempo_Total_Desde_Creacion_Segundos?: number,
 *   Retiros_Procesados?:                 number,
 * }>>} rawData
 * @param {{
 *   periodo:          string,
 *   targetDates:      string[],       // ['YYYY-MM-DD', ...]  vacío → incluir todo (periodo 'general')
 *   selectedGestores: string[],       // keys resueltas desde rawData; [] → todos
 * }} opts
 * @returns {{
 *   totalAprobados:       number,
 *   totalRechazados:      number,
 *   montoProcesado:       number,
 *   minutosDemoraTotales: number,
 *   retirosConTiempo:     number,
 * }}
 */
export function computeRetirosKpiStats(rawData, { periodo, targetDates, selectedGestores }) {
    const finalStats = {
        totalAprobados:       0,
        totalRechazados:      0,
        montoProcesado:       0,
        minutosDemoraTotales: 0,
        retirosConTiempo:     0,
    };

    if (!rawData) return finalStats;

    const gestoresToCheck = selectedGestores.length === 0
        ? Object.keys(rawData)
        : selectedGestores;

    for (const g of gestoresToCheck) {
        const gestorData = rawData[g];
        if (!gestorData) continue;

        for (const f in gestorData) {
            // Filtrar por fecha si no es 'general'
            if (periodo !== 'general' && !targetDates.includes(f)) continue;

            const dayData = gestorData[f];
            finalStats.totalAprobados       += dayData.Retiros_Aprobados                    || 0;
            finalStats.totalRechazados      += dayData.Retiros_Rechazados                   || 0;
            finalStats.minutosDemoraTotales += (dayData.Tiempo_Total_Desde_Creacion_Segundos || 0) / 60;
            finalStats.retirosConTiempo     += dayData.Retiros_Procesados                   || 0;
        }
    }

    return finalStats;
}

// ─────────────────────────── Retiros — penalidad y % ────────────────────────────────────────

/**
 * Calcula penalidad y porcentaje de retiros a partir de los stats agregados
 * (app.js 6291-6321).
 *
 * Regla:
 *  - Si promedio > 15 min → penalidad = floor(avgDemoraMins − 15), máximo 30 %
 *  - porcentajeRetiros = 100 − penalidadRetiros  (mínimo 0)
 *
 * @param {{
 *   minutosDemoraTotales: number,
 *   retirosConTiempo:     number,
 * }} finalStats
 * @returns {{
 *   penalidadRetiros:  number,
 *   avgDemoraMins:     number,
 *   porcentajeRetiros: number,
 *   hayDatos:          boolean,
 * }}
 */
export function computeRetirosKpiPenalty(finalStats) {
    if (finalStats.retirosConTiempo <= 0) {
        return { penalidadRetiros: 0, avgDemoraMins: 0, porcentajeRetiros: 100, hayDatos: false };
    }

    const avgDemoraMins = finalStats.minutosDemoraTotales / finalStats.retirosConTiempo;
    let penalidadRetiros = 0;

    if (avgDemoraMins > 15) {
        penalidadRetiros = Math.min(Math.floor(avgDemoraMins - 15), 30); // cap 30 %
    }

    const porcentajeRetiros = Math.max(0, 100 - penalidadRetiros);

    return { penalidadRetiros, avgDemoraMins, porcentajeRetiros, hayDatos: true };
}

// ─────────────────────────── Duración promedio formateada ───────────────────────────────────

/**
 * Convierte minutos conectados totales y turnos válidos en texto de duración promedio
 * (app.js 6324-6330).
 *
 * @param {number} totalMinutosConectados
 * @param {number} turnosValidosParaTiempo
 * @returns {{ promedioHoras: number, promedioMinutos: number, label: string }}
 */
export function computeAvgShiftDuration(totalMinutosConectados, turnosValidosParaTiempo) {
    if (turnosValidosParaTiempo <= 0) {
        return { promedioHoras: 0, promedioMinutos: 0, label: 'N/A' };
    }
    const avgMinutos      = totalMinutosConectados / turnosValidosParaTiempo;
    const promedioHoras   = Math.floor(avgMinutos / 60);
    const promedioMinutos = Math.round(avgMinutos % 60);
    return { promedioHoras, promedioMinutos, label: `${promedioHoras}h ${promedioMinutos}m` };
}

// ─────────────────────────── Inactividad formateada ─────────────────────────────────────────

/**
 * Formatea los minutos de inactividad total en "Xh Ym" (app.js 6340-6342).
 *
 * @param {number} totalInactividadMins
 * @returns {string}
 */
export function formatInactividadLabel(totalInactividadMins) {
    if (totalInactividadMins <= 0) return '0h 0m';
    const horas   = Math.floor(totalInactividadMins / 60);
    const minutos = Math.round(totalInactividadMins % 60);
    return `${horas}h ${minutos}m`;
}
