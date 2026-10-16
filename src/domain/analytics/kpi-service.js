/**
 * Servicio de datos de KPIs y Control Operativo: lógica de negocio sin DOM ni Firebase.
 *
 * Extraído de `app.js`:
 *  - `loadRetirosData()`            5704-5714
 *  - `loadGestoresForKPIs()`        5716-5775 (selección de gestores y mapa email -> nombre)
 *  - `loadControlOperativoData()`   7292-7478 (mapa de usuarios y fusión de `shift_reports` en el JSON operativo)
 *
 * La lectura de Firebase vive en `services/firebase/firebase-kpi-repository.js`; la carga del JSON en
 * `services/external/kpi-operativos-source.js`; la orquestación con DOM en `controllers/kpi-controller.js`.
 */

import { normalizeForMatch } from './metrics-calculator.js';

/** Gestores que muestra el selector de KPIs (lista fija de app.js 5738-5750). */
export const KPI_TARGET_GESTORES = Object.freeze([
    'oriana borja',
    'marilyn',
    'sebastian hincapie',
    'sebastian arango',
    'sebastiana',
    'juan jose diaz',
    'yefferson',
    'alexander villada',
    'daniel',
    'josue alvarez',
    'luis'
]);

/** Tope de inactividad por turno al fusionar (minutos), app.js 7432. */
export const MAX_INACTIVITY_MINS_PER_REPORT = 480;
/** Ventana máxima de turno para contar inactividad (ms), app.js 7385. */
export const MAX_SHIFT_WINDOW_MS = 10 * 60 * 60 * 1000;

/**
 * Mapa email (minúsculas) -> nombre limpio, para todos los usuarios con email y nombre
 * (app.js 7304-7308 y 5755-5757).
 *
 * @param {object|null} usersObj Nodo `users`.
 * @returns {Object<string, string>}
 */
export function buildKpiUsersMap(usersObj) {
    const map = {};
    Object.values(usersObj || {}).forEach(u => {
        if (u && u.email && u.name) {
            map[u.email.toLowerCase()] = u.name.trim();
        }
    });
    return map;
}

/**
 * Opciones del selector de gestores de KPIs (app.js 5731-5767): gestores aprobados cuyo nombre contiene
 * alguno de `KPI_TARGET_GESTORES`, sin duplicados y ordenados.
 *
 * Fiel al original: un usuario Gestor aprobado SIN `name` lanza TypeError (`u.name.toLowerCase()`), y el
 * original lo atrapa en el `.catch` del `.then` sin pintar opciones. Aquí el error se propaga igual.
 *
 * @param {object} usersObj Nodo `users`.
 * @returns {{usersByEmail: Object<string, string>, gestorNames: string[]}}
 */
export function selectKpiGestores(usersObj) {
    const usersByEmail = {};

    const gestores = Object.keys(usersObj)
        .map(k => {
            const u = usersObj[k];
            if (u && u.email && u.name) {
                usersByEmail[u.email.toLowerCase()] = u.name.trim();
            }
            return u;
        })
        .filter(u => {
            if (!u || u.role !== 'Gestor' || u.approved !== true) return false;
            const nameLower = u.name.toLowerCase();
            return KPI_TARGET_GESTORES.some(t => nameLower.includes(t));
        })
        .map(u => u.name.trim())
        .sort((a, b) => a.localeCompare(b));

    return { usersByEmail, gestorNames: [...new Set(gestores)] };
}

/**
 * Carga los datos de retiros y los publica en el destino (app.js 5704-5714). El original escribe en
 * `window.retirosGlobalData` y `window.controlOperativoRawData`; aquí `target` es ese objeto (`window`).
 *
 * @param {{fetchData: () => Promise<object>, target: object, logger?: {log: Function, warn: Function}}} deps
 * @returns {Promise<void>}
 */
export async function loadRetirosData({ fetchData, target, logger = console }) {
    try {
        const data = await fetchData();
        target.retirosGlobalData = data;
        target.controlOperativoRawData = data;
        logger.log('Data de retiros cargada automáticamente:', Object.keys(data).length, 'gestores');
    } catch (err) {
        logger.warn('No hay data de retiros automatizada o hubo un error:', err);
        target.retirosGlobalData = null;
    }
}

/**
 * Encuentra la llave real del gestor en el JSON operativo ignorando mayúsculas y acentos; si no hay
 * coincidencia exacta, busca por primer nombre + apellido (app.js 7324-7341, sin la creación de la llave).
 *
 * @param {string} gestorName
 * @param {string[]} rawKeys
 * @returns {string|undefined}
 */
export function findRealGestorKey(gestorName, rawKeys) {
    const searchName = normalizeForMatch(gestorName);
    let realGestor = rawKeys.find(k => normalizeForMatch(k) === searchName);

    if (!realGestor) {
        const parts = searchName.split(' ');
        if (parts.length >= 2) {
            realGestor = rawKeys.find(k => {
                const normK = normalizeForMatch(k);
                return normK.includes(parts[0]) && normK.includes(parts[1]);
            });
        }
    }
    return realGestor;
}

/**
 * Interpreta `horaInicio` con formato local ("d/m/aaaa, h:mm:ss a. m.") cuando el reporte no trae `loginTime`
 * (app.js 7405-7420). Devuelve `undefined` si no se pudo armar fecha (el original deja `loginDate` en null).
 */
function loginDateFromHoraInicio(horaInicio) {
    let loginDate = null;
    try {
        const parts = horaInicio.split(',');
        if (parts.length > 0) {
            const dParts = parts[0].trim().split('/');
            if (dParts.length === 3) {
                let day = parseInt(dParts[0]);
                let month = parseInt(dParts[1]);
                const year = parseInt(dParts[2]);
                if (month > 12) { const t = day; day = month; month = t; }
                const tStr = parts.length > 1 ? parts[1].trim().replace(/\./g, '').replace(/a\s*m/i, 'AM').replace(/p\s*m/i, 'PM') : '00:00:00';
                loginDate = new Date(`${month}/${day}/${year} ${tStr}`);
            } else {
                loginDate = new Date(horaInicio);
            }
        }
    } catch (e) { /* igual que el original: se ignora */ }
    return loginDate;
}

// W-41: `toLocalDateKey` vive en `utils/date-time.js` (antes había dos versiones); se reexporta por compatibilidad.
import { toLocalDateKey } from '../../utils/date-time.js';
export { toLocalDateKey };

/** Día anterior de una clave "YYYY-MM-DD" (aritmética de calendario, sin zona). */
function previousDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/** Clave "YYYY-MM-DD" válida (mes 1-12 y día existente en ese mes, bisiestos incluidos) o null. */
function calendarKey(year, month, day) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || year < 1000 || month < 1 || month > 12 || day < 1) return null;
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (probe.getUTCMonth() !== month - 1) return null;
    return probe.toISOString().slice(0, 10);
}

/**
 * Fechas de calendario posibles del texto `horaInicio` (hora de pared LOCAL del gestor, escrita con
 * `toLocaleString()`): "d/m/aaaa, ..." (es-CO, primera opción) o "m/d/aaaa, ..." (en-US); "aaaa-mm-dd..." directo.
 */
function horaInicioDateCandidates(horaInicio) {
    if (typeof horaInicio !== 'string') return [];
    const iso = horaInicio.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return [calendarKey(+iso[1], +iso[2], +iso[3])].filter(Boolean);
    const m = horaInicio.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return [];
    const a = +m[1], b = +m[2], y = +m[3];
    return [...new Set([calendarKey(y, b, a), calendarKey(y, a, b)].filter(Boolean))];
}

/**
 * DÍA OPERATIVO de un reporte de turno (decisión D5: siempre fecha LOCAL, y el turno pertenece al día en que EMPEZÓ).
 *
 * `shift_reports/{id}.timestamp` es el instante del CIERRE (`Date.now()` al finalizar, app.js 3887), así que un turno
 * 22:00-06:00 cerrado a las 06:00 caería en el día siguiente aunque se tomara en hora local. Orden de preferencia:
 *  1. `loginTime` (instante de ingreso) -> su fecha local;
 *  2. `horaInicio` (texto local) -> su fecha de calendario; si es ambiguo d/m vs m/d, la que coincide con el día local
 *     del cierre o con el anterior (un turno no dura más de 24 h); sin cierre, la lectura d/m (es-CO);
 *  3. `timestamp` (cierre) -> su fecha local;  4. "ahora" -> su fecha local.
 *
 * @param {{loginTime?: (string|number), horaInicio?: string, timestamp?: (string|number)}} report
 * @param {{nowMs: number, timeZone?: string}} ctx
 * @returns {string} "YYYY-MM-DD"
 */
export function resolveOperativeDayKey(report, { nowMs, timeZone } = {}) {
    if (report.loginTime) {
        const login = new Date(report.loginTime);
        if (!Number.isNaN(login.getTime())) return toLocalDateKey(login, timeZone);
    }
    const closure = report.timestamp ? new Date(report.timestamp) : null;
    const closureKey = closure && !Number.isNaN(closure.getTime()) ? toLocalDateKey(closure, timeZone) : null;

    const candidates = horaInicioDateCandidates(report.horaInicio);
    if (candidates.length > 0) {
        if (!closureKey) return candidates[0];
        const prev = previousDateKey(closureKey);
        const hit = candidates.find((c) => c === closureKey || c === prev);
        if (hit) return hit;
    }
    if (closureKey) return closureKey;
    return toLocalDateKey(new Date(nowMs), timeZone);
}

/**
 * Fusiona los reportes de turno (inactividad, tardanza, día laborado) dentro del JSON operativo. MUTA `rawData`.
 * Copia del bucle de `loadControlOperativoData()` (app.js 7312-7447), salvo la fecha (ver `fechaLocal`).
 *
 * Reglas conservadas: solo `rol === 'Gestor'`; un turno = un día laborado; inactividad desde el `timeline`
 * (tope de 10 h desde el ingreso y de 480 min por turno) o `inactividadTotalMins` si no hay timeline;
 * tardanza = `tardanzaMins` o, si falta, minutos sobre `turnoProgramado` (> 5 min y <= 240); los ingresos a
 * más de 240 min del turno cuentan como "fuera de horario" y no suman inactividad; en el mismo día
 * prevalece el primer ingreso.
 *
 * Fiel al original, un `timestamp` inválido hace lanzar `RangeError` y aborta el resto de reportes (hallazgo H-4, no
 * decidido): el llamador lo captura (el original lo registra como "Error fetching shift_reports...").
 *
 * @param {Object<string, Object<string, object>>} rawData JSON operativo (gestor -> fecha -> métricas).
 * @param {object|object[]} shiftReports Nodo `shift_reports` (objeto) o arreglo de reportes.
 * @param {{nowMs: number, fechaLocal?: boolean, timeZone?: string}} options
 *   `nowMs`: reemplaza `Date.now()` / `new Date()` del original.
 *   `fechaLocal` (ENCENDIDO por defecto, decisión D5): el reporte se agrupa en su DÍA OPERATIVO LOCAL
 *   (`resolveOperativeDayKey`: fecha local de inicio del turno). Con `false` (solo pruebas diferenciales) se reproduce el
 *   original: fecha UTC del cierre (`toISOString`), que en UTC-5 manda al día siguiente todo cierre posterior a las 19:00.
 *   `timeZone` (opcional, IANA): zona en la que se calcula la fecha local; por defecto la del navegador/proceso.
 * @returns {void}
 */
export function mergeShiftReportsIntoOperativoData(rawData, shiftReports, options) {
    const { nowMs, fechaLocal = true, timeZone } = options;
    const reports = Array.isArray(shiftReports) ? shiftReports : Object.values(shiftReports || {});

    reports.forEach(report => {
        if (report.rol !== 'Gestor') return;
        const gestorName = report.gestor;
        if (!gestorName) return;

        const reportDate = report.timestamp ? new Date(report.timestamp) : new Date(nowMs);
        let reportDateStr;
        if (fechaLocal) {
            if (Number.isNaN(reportDate.getTime())) throw new RangeError('Invalid time value'); // H-4 conservado
            reportDateStr = resolveOperativeDayKey(report, { nowMs, timeZone });
        } else {
            reportDateStr = reportDate.toISOString().split('T')[0];
        }

        const rawKeys = Object.keys(rawData);
        let realGestor = findRealGestorKey(gestorName, rawKeys);

        if (!realGestor) {
            realGestor = gestorName;
            rawData[realGestor] = {};
        }

        if (realGestor) {
            if (!rawData[realGestor][reportDateStr]) {
                rawData[realGestor][reportDateStr] = {
                    Dias_Laborados: 0,
                    Minutos_Inactividad_Total: 0,
                    Retiros_Procesados: 0,
                    Retiros_Aprobados: 0,
                    Retiros_Rechazados: 0,
                    ART_Desde_Creacion_Minutos: 0
                };
            }

            // Inactividad desde el timeline respetando el máximo de 10 h de turno
            let inactMins = 0;
            const shiftLoginDate = report.loginTime ? new Date(report.loginTime) : (report.timestamp ? new Date(report.timestamp) : null);
            const maxEndTime = shiftLoginDate ? shiftLoginDate.getTime() + MAX_SHIFT_WINDOW_MS : nowMs + 99999999;

            if (report.timeline && report.timeline.length > 0) {
                report.timeline.forEach(ev => {
                    if (ev.type === 'Inactividad') {
                        if (shiftLoginDate && ev.start > maxEndTime) return;
                        let eTime = ev.end ? ev.end : nowMs;
                        if (shiftLoginDate && eTime > maxEndTime) eTime = maxEndTime;
                        const mins = (eTime - ev.start) / (1000 * 60);
                        if (mins > 0) inactMins += mins;
                    }
                });
            } else if (report.inactividadTotalMins !== undefined) {
                inactMins = report.inactividadTotalMins;
            }

            // Tardanza
            let tardMins = 0;
            let isFueraDeHorario = false;
            let loginDate = report.loginTime ? new Date(report.loginTime) : null;
            if (report.tardanzaMins !== undefined) {
                tardMins = report.tardanzaMins;
            } else {
                if (!loginDate && report.horaInicio) {
                    loginDate = loginDateFromHoraInicio(report.horaInicio);
                }

                if (loginDate && !isNaN(loginDate.getTime()) && report.turnoProgramado) {
                    const shiftStr = report.turnoProgramado.toLowerCase().trim();
                    const match = shiftStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
                    if (match) {
                        let hour = parseInt(match[1], 10);
                        const minute = match[2] ? parseInt(match[2], 10) : 0;
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

            const dayEntry = rawData[realGestor][reportDateStr];

            if (!isFueraDeHorario) {
                const cappedInactMins = Math.min(inactMins, MAX_INACTIVITY_MINS_PER_REPORT);
                dayEntry.Minutos_Inactividad_Total = (dayEntry.Minutos_Inactividad_Total || 0) + cappedInactMins;
            }

            const currentStoredTard = dayEntry.Minutos_Tarde_Total;
            if (currentStoredTard === undefined || (tardMins > 0 && currentStoredTard === 0)) {
                dayEntry.Minutos_Tarde_Total = tardMins;
                dayEntry.Dias_Tarde = tardMins > 0 ? 1 : 0;
                if (loginDate) dayEntry._earliestLogin = loginDate;
            } else if (loginDate && dayEntry._earliestLogin && loginDate < dayEntry._earliestLogin) {
                dayEntry.Minutos_Tarde_Total = tardMins;
                dayEntry.Dias_Tarde = tardMins > 0 ? 1 : 0;
                dayEntry._earliestLogin = loginDate;
            }

            dayEntry.Dias_Laborados = 1;
        }
    });
}
