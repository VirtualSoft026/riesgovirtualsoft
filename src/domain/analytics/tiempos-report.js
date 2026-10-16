/**
 * Agregado de la vista «Control de Tiempos» (paso 3.4, W-28 y DE-4 = a). Es la lógica de `loadTiemposMetrics()` de
 * js/tiempos.js, sin DOM, sin Firebase y sin Chart.js: recibe los reportes, los permisos, el horario y los filtros, y
 * devuelve las filas, los totales y los gestores para el selector.
 *
 * Reglas que se conservan tal cual (ver tiempos-integrado.e2e.cjs):
 *  - La lista de gestores se llena ANTES de aplicar los filtros de fecha y de gestor (como en el original).
 *  - Con un gestor elegido, la agrupación es por día (dd/mm) y no por gestor.
 *  - La tardanza usa `getTardiness` del dominio (analytics/time-metrics.js), que es la misma regla que el original;
 *    la paridad se prueba en tiempos-tardanza.test.mjs.
 */

import { getTardiness } from './time-metrics.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Puntajes de tardanza e inactividad (mismos umbrales que js/tiempos.js). */
export function scoreTardiness(avgLateMinutes) {
    if (avgLateMinutes <= 3) return 100;
    if (avgLateMinutes <= 10) return 70;
    return 40;
}

/** @param {number} avgInactivityMinutes */
export function scoreInactivity(avgInactivityMinutes) {
    if (avgInactivityMinutes <= 20) return 100;
    if (avgInactivityMinutes <= 45) return 60;
    return 20;
}

/**
 * Límites de fecha del filtro, calculados sobre `now`.
 *
 * @param {Date} now
 */
function dateBounds(now) {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return {
        startOfDay,
        startOfYesterday: startOfDay - DAY_MS,
        sevenDaysAgo: startOfDay - (7 * DAY_MS),
        thirtyDaysAgo: startOfDay - (30 * DAY_MS),
        startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        startOfLastMonth: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
        endOfLastMonth: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime()
    };
}

/**
 * ¿El reporte pasa el filtro de fecha?
 *
 * @param {number} reportTime
 * @param {string} dateFilter
 * @param {object} bounds
 * @param {{customStartTs: number|null, customEndTs: number|null}} custom
 */
function passesDateFilter(reportTime, dateFilter, bounds, custom) {
    if (dateFilter === 'today' && reportTime < bounds.startOfDay) return false;
    if (dateFilter === 'yesterday' && (reportTime < bounds.startOfYesterday || reportTime >= bounds.startOfDay)) return false;
    if (dateFilter === '7' && reportTime < bounds.sevenDaysAgo) return false;
    if (dateFilter === '30' && reportTime < bounds.thirtyDaysAgo) return false;
    if (dateFilter === 'thisMonth' && reportTime < bounds.startOfMonth) return false;
    if (dateFilter === 'lastMonth' && (reportTime < bounds.startOfLastMonth || reportTime > bounds.endOfLastMonth)) return false;

    if (dateFilter === 'custom') {
        if (custom.customStartTs && reportTime < custom.customStartTs) return false;
        if (custom.customEndTs && reportTime > custom.customEndTs) return false;
    }

    return true;
}

/**
 * Construye el agregado de «Control de Tiempos».
 *
 * @param {{
 *   reports: Record<string, any>|null|undefined,       `shift_reports`
 *   permissions: Record<string, any>|null|undefined,   `permissions`
 *   schedule: {rows: unknown, blocks: unknown},
 *   getShift: (rows: unknown, blocks: unknown, gestorName: string, date: Date) => string,
 *   filters: {dateFilter: string, gestorFilter: string, customStartStr?: string|null, customEndStr?: string|null},
 *   now: Date
 * }} input
 * @returns {{
 *   empty: boolean,
 *   gestores: string[],
 *   metrics: Array<Record<string, any>>,
 *   totals: {dias: number, tarde: number, inact: number}
 * }}
 */
export function buildTiemposReport({ reports, permissions, schedule, getShift, filters, now }) {
    if (!reports) {
        return { empty: true, gestores: [], metrics: [], totals: { dias: 0, tarde: 0, inact: 0 } };
    }

    const permsData = permissions || {};
    const allPermisos = Object.values(permsData).filter((p) => p.status === 'Aprobado');
    const { dateFilter, gestorFilter } = filters;

    const bounds = dateBounds(now);
    const custom = {
        customStartTs: filters.customStartStr ? new Date(`${filters.customStartStr}T00:00:00`).getTime() : null,
        customEndTs: filters.customEndStr ? new Date(`${filters.customEndStr}T23:59:59`).getTime() : null
    };

    const gestorStats = {};
    const uniqueGestores = new Set();

    Object.values(reports).forEach((report) => {
        if (report.rol !== 'Gestor') return;

        const gestorName = report.gestor;
        uniqueGestores.add(gestorName);

        const reportDate = report.timestamp ? new Date(report.timestamp) : new Date();
        if (!passesDateFilter(reportDate.getTime(), dateFilter, bounds, custom)) return;

        if (gestorFilter !== 'all' && gestorName !== gestorFilter) return;

        const yyyy = reportDate.getFullYear();
        const mm = String(reportDate.getMonth() + 1).padStart(2, '0');
        const dd = String(reportDate.getDate()).padStart(2, '0');
        const reportDateStr = `${yyyy}-${mm}-${dd}`;

        const gestorPermisos = allPermisos.filter((p) => p.gestor === gestorName && p.fecha === reportDateStr);

        let groupKey = gestorName;
        if (gestorFilter !== 'all') {
            groupKey = new Date(reportDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        }

        if (!gestorStats[groupKey]) {
            gestorStats[groupKey] = {
                Dias_Laborados: 0,
                Dias_Tarde: 0,
                Minutos_Tarde_Total: 0,
                Minutos_Inactividad_Total: 0,
                gestorName
            };
        }

        let turno = report.turnoProgramado || report.setTrabajado;
        if (!turno || turno === 'Por Asignar') {
            turno = getShift(schedule.rows, schedule.blocks, gestorName, reportDate);
        }

        const tardiness = getTardiness(report.horaInicio, turno, gestorPermisos);

        gestorStats[groupKey].Dias_Laborados += 1;
        gestorStats[groupKey].Minutos_Inactividad_Total += (report.inactividadTotalMins || 0);

        if (tardiness > 0) {
            gestorStats[groupKey].Dias_Tarde += 1;
            gestorStats[groupKey].Minutos_Tarde_Total += tardiness;
        }
    });

    const metrics = [];
    const totals = { dias: 0, tarde: 0, inact: 0 };

    Object.keys(gestorStats).forEach((key) => {
        const stats = gestorStats[key];
        if (stats.Dias_Laborados === 0) return;

        const Prom_Minutos_Tarde = stats.Minutos_Tarde_Total / stats.Dias_Laborados;
        const Porcentaje_Frecuencia_Tarde = (stats.Dias_Tarde / stats.Dias_Laborados) * 100;
        const Prom_Inactividad_Diaria = stats.Minutos_Inactividad_Total / stats.Dias_Laborados;

        metrics.push({
            gestor: key,
            gestorName: stats.gestorName,
            ...stats,
            Prom_Minutos_Tarde,
            Porcentaje_Frecuencia_Tarde,
            Prom_Inactividad_Diaria,
            Score_Tardanza: scoreTardiness(Prom_Minutos_Tarde),
            Score_Inactividad: scoreInactivity(Prom_Inactividad_Diaria)
        });

        totals.dias += stats.Dias_Laborados;
        totals.tarde += stats.Minutos_Tarde_Total;
        totals.inact += stats.Minutos_Inactividad_Total;
    });

    return {
        empty: false,
        gestores: Array.from(uniqueGestores).sort(),
        metrics,
        totals
    };
}
