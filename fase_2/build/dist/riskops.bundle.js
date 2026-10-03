var RiskOps = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../src/entry.js
  var entry_exports = {};
  __export(entry_exports, {
    announcementCapabilities: () => announcement_capabilities_exports,
    constants: () => constants_exports,
    cronogramParser: () => cronogram_parser_exports,
    dateTime: () => date_time_exports,
    docLinks: () => doc_links_exports,
    excel: () => excel_exports,
    formSubmit: () => formsubmit_notification_adapter_exports,
    idleDetector: () => idle_detector_adapter_exports,
    localSessionStorage: () => local_session_storage_exports,
    multiSelect: () => multi_select_exports,
    normalize: () => normalize_exports,
    result: () => result_exports,
    roles: () => roles_exports,
    routes: () => routes_exports,
    sanitization: () => sanitization_exports,
    scheduleService: () => schedule_service_exports,
    shiftCalculator: () => shift_calculator_exports,
    shiftExpiration: () => shift_expiration_exports,
    taskReconciler: () => task_reconciler_exports,
    taskReport: () => task_report_exports,
    taskService: () => task_service_exports,
    timeMetrics: () => time_metrics_exports,
    timelineService: () => timeline_service_exports,
    validation: () => validation_exports,
    withdrawalMetrics: () => withdrawal_metrics_exports
  });

  // ../src/domain/announcements/announcement-capabilities.js
  var announcement_capabilities_exports = {};
  __export(announcement_capabilities_exports, {
    COMUNICADOS_DELETE_ROLES: () => COMUNICADOS_DELETE_ROLES,
    COMUNICADOS_PUBLISH_ROLES: () => COMUNICADOS_PUBLISH_ROLES,
    COMUNICADOS_VIEW_LECTURAS_ROLES: () => COMUNICADOS_VIEW_LECTURAS_ROLES,
    canDeleteComunicados: () => canDeleteComunicados,
    canManageComunicados: () => canManageComunicados,
    canPublishComunicados: () => canPublishComunicados,
    canViewComunicadoLecturas: () => canViewComunicadoLecturas
  });
  var COMUNICADOS_PUBLISH_ROLES = /* @__PURE__ */ new Set([
    "Admin",
    "Supervisor"
  ]);
  var COMUNICADOS_VIEW_LECTURAS_ROLES = /* @__PURE__ */ new Set([
    "Admin",
    "Supervisor"
  ]);
  var COMUNICADOS_DELETE_ROLES = /* @__PURE__ */ new Set([
    "Admin"
  ]);
  var canPublishComunicados = (role) => COMUNICADOS_PUBLISH_ROLES.has(role);
  var canViewComunicadoLecturas = (role) => COMUNICADOS_VIEW_LECTURAS_ROLES.has(role);
  var canDeleteComunicados = (role) => COMUNICADOS_DELETE_ROLES.has(role);
  var canManageComunicados = (role) => canPublishComunicados(role) || canViewComunicadoLecturas(role);

  // ../src/domain/auth/shift-expiration.js
  var shift_expiration_exports = {};
  __export(shift_expiration_exports, {
    evaluateShiftExpiration: () => evaluateShiftExpiration
  });

  // ../src/utils/date-time.js
  var date_time_exports = {};
  __export(date_time_exports, {
    minutesBetweenWrappingMidnight: () => minutesBetweenWrappingMidnight,
    normalizeMeridiem: () => normalizeMeridiem,
    parseClockTime: () => parseClockTime,
    parseShiftRange: () => parseShiftRange,
    parseShiftStart: () => parseShiftStart,
    parseTimeFromLocaleString: () => parseTimeFromLocaleString,
    parseTimeToMs: () => parseTimeToMs,
    to24Hour: () => to24Hour,
    toMinutesOfDay: () => toMinutesOfDay
  });
  var CLOCK_TIME_PATTERN = /(\d{1,2})(?::(\d{2}))?\s*([ap]\.?\s*m\.?)?/i;
  var LOCALE_TIME_PATTERN = /(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?\s*m\.?)?/i;
  var SHIFT_START_PATTERN = /(\d{1,2}):(\d{2})\s*([ap]\.?\s*m\.?)?/i;
  var MINUTES_PER_DAY = 1440;
  function normalizeMeridiem(rawMeridiem) {
    if (!rawMeridiem) {
      return null;
    }
    const token = rawMeridiem.toLowerCase().replace(/[^apm]/g, "");
    return token === "am" || token === "pm" ? token : null;
  }
  function to24Hour(hour, meridiem) {
    if (meridiem === "pm" && hour < 12) {
      return hour + 12;
    }
    if (meridiem === "am" && hour === 12) {
      return 0;
    }
    return hour;
  }
  function parseClockTime(value) {
    if (!value) {
      return null;
    }
    const match = String(value).match(CLOCK_TIME_PATTERN);
    if (!match) {
      return null;
    }
    return {
      h: to24Hour(parseInt(match[1], 10), normalizeMeridiem(match[3])),
      min: match[2] ? parseInt(match[2], 10) : 0
    };
  }
  function parseTimeFromLocaleString(timeStr) {
    if (!timeStr) {
      return null;
    }
    const match = timeStr.match(LOCALE_TIME_PATTERN);
    if (!match) {
      return null;
    }
    return {
      h: to24Hour(parseInt(match[1], 10), normalizeMeridiem(match[3])),
      min: parseInt(match[2], 10)
    };
  }
  function parseShiftStart(shiftStr) {
    if (!shiftStr) {
      return null;
    }
    const s = shiftStr.toLowerCase();
    const explicit = shiftStr.match(SHIFT_START_PATTERN);
    if (explicit) {
      return {
        h: to24Hour(parseInt(explicit[1], 10), normalizeMeridiem(explicit[3])),
        min: parseInt(explicit[2], 10)
      };
    }
    if (s.includes("tarde")) {
      if (s.includes("set 1") || s.includes("soporte 1")) return { h: 15, min: 0 };
      if (s.includes("set 2") || s.includes("soporte 2")) return { h: 19, min: 0 };
    } else if (s.includes("s\xE1bado") || s.includes("sabado") || s.includes("domingo")) {
      if (s.includes("set 1")) return { h: 8, min: 0 };
      if (s.includes("set 2")) return { h: 15, min: 0 };
      if (s.includes("set 3")) return { h: 19, min: 0 };
    } else if (s.includes("ma\xF1ana") || s.includes("manana")) {
      return { h: 8, min: 0 };
    }
    if (s.includes("set 1") || s.includes("soporte 1")) return { h: 8, min: 0 };
    if (s.includes("set 2") || s.includes("soporte 2")) return { h: 14, min: 0 };
    if (s.includes("set 3")) return { h: 15, min: 0 };
    if (s.includes("set 4")) return { h: 22, min: 0 };
    return null;
  }
  function parseShiftRange(shiftStr) {
    const parts = String(shiftStr || "").split("-");
    const endStr = parts.length > 1 ? parts[1].trim() : "";
    if (!endStr) {
      return null;
    }
    const end = parseClockTime(endStr);
    if (!end) {
      return null;
    }
    return {
      start: parseClockTime(parts[0].trim()),
      end
    };
  }
  function toMinutesOfDay(time) {
    return time.h * 60 + time.min;
  }
  function minutesBetweenWrappingMidnight(startMs, endMs) {
    const diff = (endMs - startMs) / 6e4;
    return diff < 0 ? diff + MINUTES_PER_DAY : diff;
  }
  function parseTimeToMs(timeStr, baseDateMs) {
    let value = timeStr;
    if (typeof value === "string") {
      value = value.replace(/a\.\s*m\./i, "AM").replace(/p\.\s*m\./i, "PM");
    }
    const direct = new Date(value);
    if (!isNaN(direct.getTime())) {
      return direct.getTime();
    }
    if (typeof value === "string" && value.includes(":")) {
      const parts = value.match(/(\d+):(\d+)/);
      if (parts) {
        const base = new Date(baseDateMs);
        let hours = parseInt(parts[1], 10);
        if (value.toUpperCase().includes("PM") && hours < 12) hours += 12;
        if (value.toUpperCase().includes("AM") && hours === 12) hours = 0;
        base.setHours(hours, parseInt(parts[2], 10), 0, 0);
        return base.getTime();
      }
    }
    return NaN;
  }

  // ../src/domain/auth/shift-expiration.js
  var NON_WORKING_SHIFTS = /* @__PURE__ */ new Set(["", "Descansa", "Por Asignar"]);
  function evaluateShiftExpiration(shiftStr, now = /* @__PURE__ */ new Date()) {
    if (!shiftStr || NON_WORKING_SHIFTS.has(shiftStr)) {
      return { expired: false };
    }
    const range = parseShiftRange(shiftStr);
    if (!range) {
      return { expired: false };
    }
    const shiftEndTime = new Date(now);
    shiftEndTime.setHours(range.end.h, range.end.min, 0, 0);
    if (range.start && range.end.h < range.start.h) {
      shiftEndTime.setDate(shiftEndTime.getDate() + 1);
    }
    if (now > shiftEndTime) {
      return { expired: true, shiftStr, shiftEndTime };
    }
    return { expired: false };
  }

  // ../src/domain/analytics/time-metrics.js
  var time_metrics_exports = {};
  __export(time_metrics_exports, {
    evaluateReportLateness: () => evaluateReportLateness,
    getTardiness: () => getTardiness,
    parseReportStartDate: () => parseReportStartDate,
    sumInactivityMinutes: () => sumInactivityMinutes,
    sumInactivityMinutesWithinShiftWindow: () => sumInactivityMinutesWithinShiftWindow
  });

  // ../src/utils/constants.js
  var constants_exports = {};
  __export(constants_exports, {
    ALLOWED_BREAKFAST_MINUTES: () => ALLOWED_BREAKFAST_MINUTES,
    ALLOWED_LUNCH_MINUTES: () => ALLOWED_LUNCH_MINUTES,
    DOM_IDLE_FALLBACK_THRESHOLD_MS: () => DOM_IDLE_FALLBACK_THRESHOLD_MS,
    EXPECTED_SHIFT_MINUTES: () => EXPECTED_SHIFT_MINUTES,
    EXTRA_TASK_KEY_PREFIX: () => EXTRA_TASK_KEY_PREFIX,
    MAX_INACTIVITY_MINUTES_PER_SHIFT: () => MAX_INACTIVITY_MINUTES_PER_SHIFT,
    MAX_SHIFT_DURATION_MS: () => MAX_SHIFT_DURATION_MS,
    MAX_TARDINESS_MINUTES: () => MAX_TARDINESS_MINUTES,
    MINUTES_PER_DAY: () => MINUTES_PER_DAY2,
    MIN_INACTIVITY_EVENT_MS: () => MIN_INACTIVITY_EVENT_MS,
    MIN_REPORTED_TARDINESS_MINUTES: () => MIN_REPORTED_TARDINESS_MINUTES,
    NATIVE_IDLE_THRESHOLD_MS: () => NATIVE_IDLE_THRESHOLD_MS,
    OUT_OF_SCHEDULE_MINUTES: () => OUT_OF_SCHEDULE_MINUTES,
    PERMISSION_STATUS: () => PERMISSION_STATUS,
    SCREEN_LOCK_GRACE_PERIOD_MS: () => SCREEN_LOCK_GRACE_PERIOD_MS,
    STORAGE_KEYS: () => STORAGE_KEYS,
    TASK_STATUS: () => TASK_STATUS,
    TIMELINE_EVENT: () => TIMELINE_EVENT,
    TIMELINE_MERGE_GAP_MS: () => TIMELINE_MERGE_GAP_MS,
    USER_STATUS: () => USER_STATUS
  });
  var STORAGE_KEYS = Object.freeze({
    CURRENT_USER: "riskOps_currentUser",
    CACHE: "riskOps_cache",
    BREAK_STATE: "riskOps_breakState",
    TIMELINE: "riskOps_timeline",
    THEME: "riskOps_theme",
    USERS_DATA: "riskOps_usersData"
  });
  var USER_STATUS = Object.freeze({
    ACTIVE: "Activo",
    INACTIVE: "Inactivo"
  });
  var PERMISSION_STATUS = Object.freeze({
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado"
  });
  var TASK_STATUS = Object.freeze({
    PENDING: "Pendiente",
    IN_PROGRESS: "En Proceso",
    DONE: "Finalizada",
    NOT_DONE: "No Realizada"
  });
  var NATIVE_IDLE_THRESHOLD_MS = 3 * 60 * 1e3;
  var SCREEN_LOCK_GRACE_PERIOD_MS = 10 * 1e3;
  var DOM_IDLE_FALLBACK_THRESHOLD_MS = 5 * 60 * 1e3;
  var MINUTES_PER_DAY2 = 24 * 60;
  var MAX_TARDINESS_MINUTES = 12 * 60;
  var TIMELINE_EVENT = Object.freeze({
    INACTIVITY: "Inactividad",
    LUNCH: "Almuerzo",
    BREAKFAST: "Desayuno",
    SHIFT_BREAK: "Pausa de Turno"
  });
  var ALLOWED_LUNCH_MINUTES = 60;
  var ALLOWED_BREAKFAST_MINUTES = 15;
  var MIN_INACTIVITY_EVENT_MS = 30 * 1e3;
  var TIMELINE_MERGE_GAP_MS = 60 * 1e3;
  var MAX_SHIFT_DURATION_MS = 10 * 60 * 60 * 1e3;
  var MAX_INACTIVITY_MINUTES_PER_SHIFT = 480;
  var EXPECTED_SHIFT_MINUTES = 405;
  var OUT_OF_SCHEDULE_MINUTES = 240;
  var MIN_REPORTED_TARDINESS_MINUTES = 5;
  var EXTRA_TASK_KEY_PREFIX = "extra_";

  // ../src/domain/analytics/time-metrics.js
  var NO_TARDINESS_SHIFTS = /* @__PURE__ */ new Set(["Por Asignar", "Descansa", "N/A"]);
  var FULL_DAY_PERMISSION_TYPES = /* @__PURE__ */ new Set(["Vacaciones", "Falta Justificada", "Calamidad"]);
  function getTardiness(loginLocaleStr, shiftStr, permisos = []) {
    if (!shiftStr || NO_TARDINESS_SHIFTS.has(shiftStr)) {
      return 0;
    }
    let sched = parseShiftStart(shiftStr);
    const actual = parseTimeFromLocaleString(loginLocaleStr);
    if (!sched || !actual) {
      return 0;
    }
    if (permisos && permisos.length > 0) {
      for (const permiso of permisos) {
        const horaFin = permiso.horaFin || permiso.Hora_Fin;
        if (horaFin) {
          const parts = horaFin.split(":");
          if (parts.length >= 2) {
            const permissionHour = parseInt(parts[0], 10);
            const permissionMinute = parseInt(parts[1], 10);
            if (!isNaN(permissionHour) && !isNaN(permissionMinute)) {
              const permissionTotal = permissionHour * 60 + permissionMinute;
              if (permissionTotal > toMinutesOfDay(sched)) {
                sched = { h: permissionHour, min: permissionMinute };
              }
            }
          }
        } else if (FULL_DAY_PERMISSION_TYPES.has(permiso.tipo)) {
          return 0;
        }
      }
    }
    let diff = toMinutesOfDay(actual) - toMinutesOfDay(sched);
    if (diff < -MAX_TARDINESS_MINUTES) {
      diff += MINUTES_PER_DAY2;
    }
    if (diff > 0 && diff < MAX_TARDINESS_MINUTES) {
      return diff;
    }
    return 0;
  }
  function sumInactivityMinutes(timeline, nowMs = Date.now()) {
    let minutes = 0;
    if (Array.isArray(timeline)) {
      timeline.forEach((event) => {
        if (event.type === TIMELINE_EVENT.INACTIVITY) {
          const eventEnd = event.end ? event.end : nowMs;
          minutes += (eventEnd - event.start) / (1e3 * 60);
        }
      });
    }
    return minutes;
  }
  function sumInactivityMinutesWithinShiftWindow(timeline, options = {}) {
    const { loginMs = null, nowMs = Date.now() } = options;
    const hasLogin = loginMs !== null && loginMs !== void 0;
    const maxEndMs = hasLogin ? loginMs + MAX_SHIFT_DURATION_MS : nowMs + 99999999;
    let minutes = 0;
    if (Array.isArray(timeline)) {
      timeline.forEach((event) => {
        if (event.type !== TIMELINE_EVENT.INACTIVITY) {
          return;
        }
        if (hasLogin && event.start > maxEndMs) {
          return;
        }
        let eventEnd = event.end ? event.end : nowMs;
        if (hasLogin && eventEnd > maxEndMs) {
          eventEnd = maxEndMs;
        }
        const eventMinutes = (eventEnd - event.start) / (1e3 * 60);
        if (eventMinutes > 0) {
          minutes += eventMinutes;
        }
      });
    }
    return minutes;
  }
  function parseReportStartDate(horaInicio, options = {}) {
    try {
      const parts = horaInicio.split(",");
      if (parts.length > 0) {
        const dateParts = parts[0].trim().split("/");
        if (dateParts.length === 3) {
          let day = parseInt(dateParts[0]);
          let month = parseInt(dateParts[1]);
          const year = parseInt(dateParts[2]);
          if (month > 12) {
            const swap = day;
            day = month;
            month = swap;
          }
          const timePart = parts.length > 1 ? parts[1].trim().replace(/\./g, "").replace(/a\s*m/i, "AM").replace(/p\s*m/i, "PM") : "00:00:00";
          return /* @__PURE__ */ new Date(`${month}/${day}/${year} ${timePart}`);
        }
        if (options.fallbackToNativeDate) {
          return new Date(horaInicio);
        }
      }
    } catch (error) {
      return null;
    }
    return null;
  }
  function evaluateReportLateness(loginDate, turnoProgramado) {
    const noMatch = { matched: false, diffMinutes: null, isOutOfSchedule: false, tardinessMins: 0 };
    if (!loginDate || Number.isNaN(loginDate.getTime()) || !turnoProgramado) {
      return noMatch;
    }
    const shiftStr = turnoProgramado.toLowerCase().trim();
    const match = shiftStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (!match) {
      return noMatch;
    }
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3].toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    const expected = new Date(loginDate);
    expected.setHours(hour, minute, 0, 0);
    let diffMinutes = (loginDate - expected) / 6e4;
    if (diffMinutes < -12 * 60) {
      expected.setDate(expected.getDate() - 1);
      diffMinutes = (loginDate - expected) / 6e4;
    } else if (diffMinutes > 12 * 60) {
      expected.setDate(expected.getDate() + 1);
      diffMinutes = (loginDate - expected) / 6e4;
    }
    const isOutOfSchedule = diffMinutes > OUT_OF_SCHEDULE_MINUTES;
    const tardinessMins = diffMinutes > MIN_REPORTED_TARDINESS_MINUTES && !isOutOfSchedule ? Math.round(diffMinutes) : 0;
    return { matched: true, diffMinutes, isOutOfSchedule, tardinessMins };
  }

  // ../src/domain/analytics/withdrawal-metrics.js
  var withdrawal_metrics_exports = {};
  __export(withdrawal_metrics_exports, {
    calculateEffectiveApprovalTime: () => calculateEffectiveApprovalTime
  });
  function calculateEffectiveApprovalTime(creacionTime, aprobacionTime, inicioTurnoTime) {
    if (!aprobacionTime) {
      return 0;
    }
    const creacionMs = new Date(creacionTime).getTime();
    const aprobacionMs = new Date(aprobacionTime).getTime();
    let inicioTurnoMs = inicioTurnoTime ? new Date(inicioTurnoTime).getTime() : 0;
    if (isNaN(creacionMs) || isNaN(aprobacionMs)) {
      return 0;
    }
    if (isNaN(inicioTurnoMs)) {
      inicioTurnoMs = 0;
    }
    const horaInicioCalculoMs = Math.max(creacionMs, inicioTurnoMs);
    const diffMins = (aprobacionMs - horaInicioCalculoMs) / 6e4;
    return Math.max(0, Math.round(diffMins * 100) / 100);
  }

  // ../src/domain/schedules/cronogram-parser.js
  var cronogram_parser_exports = {};
  __export(cronogram_parser_exports, {
    fetchCronogramaRowsForDate: () => fetchCronogramaRowsForDate,
    getAssignedTasksForGestor: () => getAssignedTasksForGestor,
    getCronogramaColumnsForToday: () => getCronogramaColumnsForToday,
    getWeekSheet: () => getWeekSheet,
    loadCronogramaAssignments: () => loadCronogramaAssignments,
    parseSheetRange: () => parseSheetRange,
    preloadCronograma: () => preloadCronograma
  });

  // ../src/utils/normalize.js
  var normalize_exports = {};
  __export(normalize_exports, {
    MONTH_NAME_ALIASES: () => MONTH_NAME_ALIASES,
    cleanText: () => cleanText,
    namesMatch: () => namesMatch,
    normalizeName: () => normalizeName,
    normalizeTaskName: () => normalizeTaskName,
    setNamesMatch: () => setNamesMatch,
    taskNamesMatch: () => taskNamesMatch
  });
  var MONTH_NAME_ALIASES = Object.freeze({
    ene: "enero",
    feb: "febrero",
    mar: "marzo",
    abr: "abril",
    may: "mayo",
    jun: "junio",
    jul: "julio",
    ago: "agosto",
    sep: "septiembre",
    set: "septiembre",
    oct: "octubre",
    nov: "noviembre",
    dic: "diciembre"
  });
  function normalizeName(name) {
    if (!name) {
      return "";
    }
    return String(name).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  }
  function namesMatch(name1, name2) {
    if (!name1 || !name2) {
      return false;
    }
    const parts1 = normalizeName(name1).split(" ").filter((part) => part.length > 2);
    const parts2 = normalizeName(name2).split(" ").filter((part) => part.length > 2);
    if (parts1.length === 0 || parts2.length === 0) {
      return false;
    }
    const [shorter, longer] = parts1.length <= parts2.length ? [parts1, parts2] : [parts2, parts1];
    if (shorter.length > 1) {
      return shorter.every((part) => longer.includes(part));
    }
    const shortPart = shorter[0];
    if (shortPart === "daniel" && longer.includes("josue")) {
      return false;
    }
    if (longer[0] === shortPart) {
      return true;
    }
    return longer.includes(shortPart);
  }
  function cleanText(text) {
    if (!text || typeof text !== "string") {
      return "";
    }
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).join(" ").trim();
  }
  function normalizeTaskName(name) {
    const cleaned = cleanText(name);
    if (cleaned.includes("conciliacion de pasarelas")) {
      return "conciliacion de pasarelas";
    }
    if (cleaned.includes("revision de billetera") || cleaned.includes("billetera usuarios")) {
      return "revision de billetera usuarios pdv";
    }
    if (cleaned.includes("revision de eventos") || cleaned.includes("revision de evento")) {
      return "revision de eventos";
    }
    return cleaned;
  }
  function taskNamesMatch(cronTask, masterTask) {
    if (!cronTask || !masterTask) {
      return false;
    }
    const normalizedCronTask = normalizeTaskName(cronTask);
    const normalizedMasterTask = normalizeTaskName(masterTask);
    if (normalizedCronTask === normalizedMasterTask) {
      return true;
    }
    const minimumLength = Math.min(
      normalizedCronTask.length,
      normalizedMasterTask.length
    );
    if (minimumLength >= 15 && (normalizedMasterTask.includes(normalizedCronTask) || normalizedCronTask.includes(normalizedMasterTask))) {
      const lengthDifference = Math.abs(
        normalizedCronTask.length - normalizedMasterTask.length
      );
      return lengthDifference <= 6;
    }
    return false;
  }
  function setNamesMatch(set1, set2) {
    if (!set1 || !set2) {
      return false;
    }
    const normalizedSet1 = cleanText(set1);
    const normalizedSet2 = cleanText(set2);
    return normalizedSet1 === normalizedSet2 || normalizedSet1.includes(normalizedSet2) || normalizedSet2.includes(normalizedSet1);
  }

  // ../src/domain/schedules/cronogram-parser.js
  var MONTH_NAMES = Object.freeze([
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"
  ]);
  var MONTHS_MAP = Object.freeze({
    ene: 0,
    enero: 0,
    feb: 1,
    febrero: 1,
    mar: 2,
    marzo: 2,
    abr: 3,
    abril: 3,
    may: 4,
    mayo: 4,
    jun: 5,
    junio: 5,
    jul: 6,
    julio: 6,
    ago: 7,
    agosto: 7,
    sep: 8,
    set: 8,
    septiembre: 8,
    oct: 9,
    octubre: 9,
    nov: 10,
    noviembre: 10,
    dic: 11,
    diciembre: 11
  });
  function parseSheetRange(sheetName, year = 2026, fallbackMonth = 0) {
    var _a, _b, _c;
    if (!sheetName) {
      return null;
    }
    const cleanName = String(sheetName).normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    let match = cleanName.match(
      /Semana\s+\d+\s*-\s*(\d+)\s+(?:de\s+)?(\w+)\s+(?:al|a|-)\s+(\d+)\s+(?:de\s+)?(\w+)/i
    );
    if (match) {
      const startDay = parseInt(match[1], 10);
      const startMonthKey = match[2].substring(0, 3).toLowerCase();
      const endDay = parseInt(match[3], 10);
      const endMonthKey = match[4].substring(0, 3).toLowerCase();
      const startMonth = (_a = MONTHS_MAP[startMonthKey]) != null ? _a : fallbackMonth;
      const endMonth = (_b = MONTHS_MAP[endMonthKey]) != null ? _b : fallbackMonth;
      return {
        start: new Date(year, startMonth, startDay, 0, 0, 0),
        end: new Date(year, endMonth, endDay, 23, 59, 59)
      };
    }
    match = cleanName.match(
      /Semana\s+\d+\s*-\s*(\d+)\s+(?:al|a|-)\s+(\d+)\s+(?:de\s+)?(\w+)/i
    );
    if (match) {
      const startDay = parseInt(match[1], 10);
      const endDay = parseInt(match[2], 10);
      const monthKey = match[3].substring(0, 3).toLowerCase();
      const month = (_c = MONTHS_MAP[monthKey]) != null ? _c : fallbackMonth;
      return {
        start: new Date(year, month, startDay, 0, 0, 0),
        end: new Date(year, month, endDay, 23, 59, 59)
      };
    }
    match = cleanName.match(
      /Semana\s+\d+\s*-\s*(\d+)\s+al\s+(\d+)/i
    );
    if (match) {
      const startDay = parseInt(match[1], 10);
      const endDay = parseInt(match[2], 10);
      const startMonth = fallbackMonth;
      const endMonth = endDay < startDay ? startMonth + 1 : startMonth;
      return {
        start: new Date(year, startMonth, startDay, 0, 0, 0),
        end: new Date(year, endMonth, endDay, 23, 59, 59)
      };
    }
    return null;
  }
  function getWeekSheet(sheetNames, targetDate) {
    if (!Array.isArray(sheetNames) || sheetNames.length === 0) {
      return null;
    }
    const year = targetDate.getFullYear();
    const fallbackMonth = targetDate.getMonth();
    let hasDatedSheet = false;
    for (const sheetName of sheetNames) {
      const range = parseSheetRange(
        sheetName,
        year,
        fallbackMonth
      );
      if (!range) {
        continue;
      }
      hasDatedSheet = true;
      if (targetDate >= range.start && targetDate <= range.end) {
        return sheetName;
      }
    }
    if (!hasDatedSheet) {
      return sheetNames.find(
        (sheetName) => sheetName.toLowerCase().includes("semana")
      ) || sheetNames[0];
    }
    return null;
  }
  async function fetchCronogramaRowsForDate(targetDate, dependencies) {
    const {
      baseUrl,
      fetchImpl,
      xlsx,
      cacheBust = true
    } = dependencies || {};
    if (!baseUrl || typeof fetchImpl !== "function" || !xlsx || typeof xlsx.read !== "function" || !xlsx.utils || typeof xlsx.utils.sheet_to_json !== "function") {
      throw new TypeError(
        "baseUrl, fetchImpl and xlsx parser are required"
      );
    }
    const dayOfWeek = targetDate.getDay();
    const monday = new Date(targetDate);
    monday.setDate(
      targetDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    );
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const candidateMonths = [
      targetDate.getMonth(),
      monday.getMonth(),
      sunday.getMonth()
    ];
    const uniqueMonths = [...new Set(candidateMonths)];
    for (const monthIndex of uniqueMonths) {
      const monthName = MONTH_NAMES[monthIndex];
      const fileName = `Cronograma ${monthName}.xlsx`;
      const encodedPath = encodeURI(
        `${baseUrl.replace(/\/$/, "")}/${fileName}`
      );
      const url = cacheBust ? `${encodedPath}?t=${Date.now()}` : encodedPath;
      try {
        const response = await fetchImpl(url);
        if (!response.ok) {
          continue;
        }
        const arrayBuffer = await response.arrayBuffer();
        const workbook = xlsx.read(arrayBuffer, {
          type: "array"
        });
        const sheetName = getWeekSheet(
          workbook.SheetNames,
          targetDate
        );
        if (sheetName) {
          return xlsx.utils.sheet_to_json(
            workbook.Sheets[sheetName],
            {
              header: 1,
              defval: ""
            }
          );
        }
      } catch (error) {
        console.warn(
          `Error procesando ${fileName}:`,
          error
        );
      }
    }
    return null;
  }
  function getCronogramaColumnsForToday(targetDate, shiftText, rows = []) {
    void shiftText;
    const day = targetDate.getDay();
    const columns = {
      manana: [],
      tarde: [],
      sabado: [],
      domingo: []
    };
    for (let rowIndex = 0; rowIndex < Math.min(5, rows.length); rowIndex += 1) {
      const row = rows[rowIndex];
      if (!Array.isArray(row)) {
        continue;
      }
      for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
        const value = String(row[columnIndex] || "").trim().toLowerCase();
        if (value.includes("ma\xF1ana") && !value.includes("sabado") && !value.includes("s\xE1bado") && !value.includes("domingo") && columns.manana.length === 0 && columnIndex + 1 < row.length) {
          columns.manana = [
            columnIndex,
            columnIndex + 1
          ];
        }
        if (value.includes("tarde") && columns.tarde.length === 0 && columnIndex + 1 < row.length) {
          columns.tarde = [
            columnIndex,
            columnIndex + 1
          ];
        }
        if ((value.includes("s\xE1bado") || value.includes("sabado")) && columns.sabado.length === 0 && columnIndex + 1 < row.length) {
          columns.sabado = [
            columnIndex,
            columnIndex + 1
          ];
        }
        if (value.includes("domingo") && columns.domingo.length === 0 && columnIndex + 1 < row.length) {
          columns.domingo = [
            columnIndex,
            columnIndex + 1
          ];
        }
      }
    }
    if (columns.manana.length === 0) {
      columns.manana = [1, 2];
    }
    if (columns.tarde.length === 0) {
      columns.tarde = [4, 5];
    }
    if (columns.sabado.length === 0) {
      columns.sabado = [7, 8];
    }
    if (columns.domingo.length === 0) {
      columns.domingo = [10, 11];
    }
    if (day === 0) {
      return [columns.domingo];
    }
    if (day === 6) {
      return [columns.sabado];
    }
    return [columns.manana, columns.tarde];
  }
  async function preloadCronograma(options) {
    const {
      targetDate = /* @__PURE__ */ new Date(),
      fetchDependencies,
      onLoaded
    } = options || {};
    const rows = await fetchCronogramaRowsForDate(
      targetDate,
      fetchDependencies
    );
    if (rows && typeof onLoaded === "function") {
      onLoaded(rows);
    }
    return rows;
  }
  function getAssignedTasksForGestor(gestorName, shiftText, rows, targetDate = /* @__PURE__ */ new Date()) {
    if (!Array.isArray(rows)) {
      return [];
    }
    const assignments = [];
    const columnGroups = getCronogramaColumnsForToday(
      targetDate,
      shiftText,
      rows
    );
    for (const [taskColumn, gestorColumn] of columnGroups) {
      for (const row of rows) {
        if (!Array.isArray(row)) {
          continue;
        }
        const taskValue = row[taskColumn];
        const gestorValue = row[gestorColumn];
        if (taskValue === void 0 || taskValue === null || String(taskValue).trim() === "") {
          continue;
        }
        const taskText = String(taskValue).trim();
        const taskTextLower = taskText.toLowerCase();
        if (taskTextLower.startsWith("set ") || taskTextLower.includes("cronograma") || gestorValue === "Gestor") {
          continue;
        }
        if (gestorValue !== void 0 && gestorValue !== null && namesMatch(String(gestorValue).trim(), gestorName)) {
          assignments.push(taskText);
        }
      }
    }
    return assignments;
  }
  async function loadCronogramaAssignments(gestorName, gestorShift, options) {
    const {
      targetDate = /* @__PURE__ */ new Date(),
      fetchDependencies
    } = options || {};
    try {
      const rows = await fetchCronogramaRowsForDate(
        targetDate,
        fetchDependencies
      );
      if (!rows) {
        return [];
      }
      const columnGroups = getCronogramaColumnsForToday(
        targetDate,
        gestorShift,
        rows
      );
      const assignments = [];
      for (const [taskColumn, gestorColumn] of columnGroups) {
        let currentSet = "";
        for (const row of rows) {
          if (!Array.isArray(row)) {
            continue;
          }
          const taskValue = row[taskColumn];
          const gestorValue = row[gestorColumn];
          if (taskValue !== void 0 && taskValue !== null && String(taskValue).trim().toLowerCase().startsWith("set ")) {
            currentSet = String(taskValue).trim();
          }
          if (taskValue === void 0 || taskValue === null || String(taskValue).trim() === "") {
            continue;
          }
          const taskText = String(taskValue).trim();
          const taskTextLower = taskText.toLowerCase();
          if (taskTextLower.startsWith("set ") || taskTextLower.includes("cronograma") || gestorValue === "Gestor") {
            continue;
          }
          if (gestorValue !== void 0 && gestorValue !== null && namesMatch(String(gestorValue).trim(), gestorName)) {
            assignments.push({
              set: currentSet || "Otros",
              task: taskText
            });
          }
        }
      }
      return assignments;
    } catch (error) {
      console.error(
        "Error al cargar Cronograma de Tareas:",
        error
      );
      return [];
    }
  }

  // ../src/domain/schedules/schedule-service.js
  var schedule_service_exports = {};
  __export(schedule_service_exports, {
    getScheduledGestoresCountForShift: () => getScheduledGestoresCountForShift,
    getShiftForDate: () => getShiftForDate
  });
  function getScheduledGestoresCountForShift(shiftName, rows, scheduleBlocks, getShiftCategory, targetDate = /* @__PURE__ */ new Date()) {
    if (!Array.isArray(rows) || !Array.isArray(scheduleBlocks) || scheduleBlocks.length === 0 || typeof getShiftCategory !== "function") {
      return 0;
    }
    let targetBlock = null;
    let targetColumnIndex = -1;
    for (const block of scheduleBlocks) {
      const dateRow = rows[block.startRow];
      if (!Array.isArray(dateRow)) {
        continue;
      }
      for (let columnIndex = 1; columnIndex < dateRow.length; columnIndex += 1) {
        const cellValue = dateRow[columnIndex];
        if (cellValue && !Number.isNaN(Number(cellValue))) {
          const cellDate = new Date(
            Date.UTC(
              1899,
              11,
              30
            ) + Number(cellValue) * 864e5
          );
          if (cellDate.getUTCDate() === targetDate.getDate() && cellDate.getUTCMonth() === targetDate.getMonth() && cellDate.getUTCFullYear() === targetDate.getFullYear()) {
            targetBlock = block;
            targetColumnIndex = columnIndex;
            break;
          }
        }
      }
      if (targetBlock) {
        break;
      }
    }
    if (!targetBlock) {
      targetBlock = scheduleBlocks[scheduleBlocks.length - 1];
      const dayRow = rows[targetBlock.startRow + 1];
      const dayNames = [
        "Domingo",
        "Lunes",
        "Martes",
        "Mi\xE9rcoles",
        "Jueves",
        "Viernes",
        "S\xE1bado"
      ];
      const targetDayName = dayNames[targetDate.getDay()];
      if (Array.isArray(dayRow)) {
        for (let columnIndex = 1; columnIndex < dayRow.length; columnIndex += 1) {
          if (normalizeName(dayRow[columnIndex]) === normalizeName(targetDayName)) {
            targetColumnIndex = columnIndex;
            break;
          }
        }
      }
      if (targetColumnIndex === -1) {
        targetColumnIndex = targetDate.getDay() === 0 ? 7 : targetDate.getDay();
      }
    }
    let count = 0;
    const startRow = targetBlock.startRow;
    for (let rowIndex = startRow + 2; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      if (!Array.isArray(row) || !row[0] || String(row[0]).trim() === "" || String(row[0]).trim().toUpperCase() === "GESTOR") {
        break;
      }
      const rawShift = row[targetColumnIndex] || "Descansa";
      if (getShiftCategory(rawShift) === shiftName) {
        count += 1;
      }
    }
    return count;
  }
  function getShiftForDate(rows, scheduleBlocks, gestorName, date) {
    if (!Array.isArray(rows) || rows.length === 0 || !Array.isArray(scheduleBlocks) || scheduleBlocks.length === 0) {
      return "Por Asignar";
    }
    let targetBlock = null;
    let targetColumnIndex = -1;
    for (const block of scheduleBlocks) {
      const dateRow = rows[block.startRow];
      if (!Array.isArray(dateRow)) {
        continue;
      }
      for (let columnIndex = 1; columnIndex < dateRow.length; columnIndex += 1) {
        const serial = dateRow[columnIndex];
        let cellDate = null;
        if (!Number.isNaN(Number(serial)) && serial) {
          cellDate = new Date(
            Date.UTC(1899, 11, 30) + Number(serial) * 864e5
          );
        } else if (typeof serial === "string" && (serial.includes("-") || serial.includes("/"))) {
          const parsed = new Date(serial);
          if (!Number.isNaN(parsed.getTime())) {
            cellDate = parsed;
          }
        }
        if (cellDate && cellDate.getUTCDate() === date.getDate() && cellDate.getUTCMonth() === date.getMonth() && cellDate.getUTCFullYear() === date.getFullYear()) {
          targetBlock = block;
          targetColumnIndex = columnIndex;
          break;
        }
      }
      if (targetBlock) {
        break;
      }
    }
    if (!targetBlock) {
      targetBlock = scheduleBlocks[scheduleBlocks.length - 1];
      const dayRow = rows[targetBlock.startRow + 1];
      const dayNames = [
        "Domingo",
        "Lunes",
        "Martes",
        "Mi\xE9rcoles",
        "Jueves",
        "Viernes",
        "S\xE1bado"
      ];
      const targetDayName = dayNames[date.getDay()];
      if (Array.isArray(dayRow)) {
        for (let columnIndex = 1; columnIndex < dayRow.length; columnIndex += 1) {
          if (normalizeName(dayRow[columnIndex]) === normalizeName(targetDayName)) {
            targetColumnIndex = columnIndex;
            break;
          }
        }
      }
      if (targetColumnIndex === -1) {
        targetColumnIndex = date.getDay() === 0 ? 7 : date.getDay();
      }
    }
    const startRow = targetBlock.startRow;
    for (let rowIndex = startRow + 2; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      if (!Array.isArray(row) || !row[0] || String(row[0]).trim() === "" || String(row[0]).trim().toUpperCase() === "GESTOR") {
        break;
      }
      if (namesMatch(row[0], gestorName)) {
        return row[targetColumnIndex] || "Descansa";
      }
    }
    return "Por Asignar";
  }

  // ../src/domain/shifts/shift-calculator.js
  var shift_calculator_exports = {};
  __export(shift_calculator_exports, {
    calculateConnectivityPenalty: () => calculateConnectivityPenalty,
    calculateEffectiveHours: () => calculateEffectiveHours,
    defaultState: () => defaultState,
    normalizeState: () => normalizeState
  });
  function calculateConnectivityPenalty({ lunchMs, breakfastMs, inactivityMins }) {
    const lunchMinutes = parseFloat((lunchMs / (1e3 * 60)).toFixed(1));
    const breakfastMinutes = parseFloat((breakfastMs / (1e3 * 60)).toFixed(1));
    const extraLunch = Math.max(0, lunchMinutes - ALLOWED_LUNCH_MINUTES);
    const extraBreakfast = Math.max(0, breakfastMinutes - ALLOWED_BREAKFAST_MINUTES);
    const penaltyMins = parseFloat((extraLunch + extraBreakfast + inactivityMins).toFixed(1));
    return { lunchMinutes, breakfastMinutes, extraLunch, extraBreakfast, penaltyMins };
  }
  function calculateEffectiveHours({ loginMs, endMs, lunchMs, breakfastMs, penaltyMins }) {
    const effectiveShiftMs = endMs - loginMs - lunchMs - breakfastMs - penaltyMins * 60 * 1e3;
    return Math.max(0, effectiveShiftMs / (1e3 * 60 * 60)).toFixed(2);
  }
  function defaultState() {
    return {
      isLunchBreak: false,
      lunchStartTime: null,
      totalLunchTimeMs: 0,
      isBreakfastBreak: false,
      breakfastStartTime: null,
      totalBreakfastTimeMs: 0,
      isSplitShiftBreak: false,
      splitShiftStartTime: null,
      totalSplitShiftTimeMs: 0,
      shiftTimeline: []
    };
  }
  function normalizeState(value) {
    const defaults = defaultState();
    if (!value || typeof value !== "object") return defaults;
    return {
      isLunchBreak: value.isLunchBreak === true,
      lunchStartTime: Number.isFinite(value.lunchStartTime) ? value.lunchStartTime : null,
      totalLunchTimeMs: Number.isFinite(value.totalLunchTimeMs) ? value.totalLunchTimeMs : 0,
      isBreakfastBreak: value.isBreakfastBreak === true,
      breakfastStartTime: Number.isFinite(value.breakfastStartTime) ? value.breakfastStartTime : null,
      totalBreakfastTimeMs: Number.isFinite(value.totalBreakfastTimeMs) ? value.totalBreakfastTimeMs : 0,
      isSplitShiftBreak: value.isSplitShiftBreak === true,
      splitShiftStartTime: Number.isFinite(value.splitShiftStartTime) ? value.splitShiftStartTime : null,
      totalSplitShiftTimeMs: Number.isFinite(value.totalSplitShiftTimeMs) ? value.totalSplitShiftTimeMs : 0,
      shiftTimeline: Array.isArray(value.shiftTimeline) ? value.shiftTimeline.map((event) => ({ ...event })) : []
    };
  }

  // ../src/domain/shifts/timeline-service.js
  var timeline_service_exports = {};
  __export(timeline_service_exports, {
    cleanupStoredTimeline: () => cleanupStoredTimeline,
    consolidateTimeline: () => consolidateTimeline,
    pushTimelineEvent: () => pushTimelineEvent
  });
  var STORED_TIMELINE_BREAK_TYPES = /* @__PURE__ */ new Set([
    TIMELINE_EVENT.LUNCH,
    TIMELINE_EVENT.BREAKFAST,
    TIMELINE_EVENT.SHIFT_BREAK
  ]);
  function cleanupStoredTimeline(events, nowMs = Date.now()) {
    const list = Array.isArray(events) ? events : [];
    const breaks = list.filter((event) => STORED_TIMELINE_BREAK_TYPES.has(event.type));
    const kept = list.filter((event) => {
      if (event.type !== TIMELINE_EVENT.INACTIVITY) {
        return true;
      }
      const eventStart = event.start;
      const eventEnd = event.end || nowMs;
      if (eventEnd - eventStart < MIN_INACTIVITY_EVENT_MS) {
        return false;
      }
      const overlaps = breaks.some((breakEvent) => {
        const breakEnd = breakEvent.end || nowMs;
        return eventStart < breakEnd && eventEnd > breakEvent.start;
      });
      return !overlaps;
    });
    let changed = kept.length !== list.length;
    const timeline = kept.map((event) => {
      if (event.type === TIMELINE_EVENT.INACTIVITY && event.end === null) {
        changed = true;
        return { ...event, end: nowMs };
      }
      return { ...event };
    });
    return { timeline, changed };
  }
  function consolidateTimeline(events, options) {
    const { defaultEndMs } = options;
    const breakTypes = new Set(
      options.breakTypes || [
        TIMELINE_EVENT.BREAKFAST,
        TIMELINE_EVENT.LUNCH,
        TIMELINE_EVENT.SHIFT_BREAK
      ]
    );
    const cleanTimeline = [];
    if (!Array.isArray(events) || events.length === 0) {
      return cleanTimeline;
    }
    const breaks = events.filter((event) => breakTypes.has(event.type));
    const sortedEvents = [...events].sort((a, b) => a.start - b.start);
    sortedEvents.forEach((event) => {
      let eventStart = event.start;
      const eventEnd = event.end || defaultEndMs;
      if (eventEnd <= eventStart) {
        return;
      }
      if (event.type === TIMELINE_EVENT.INACTIVITY) {
        if (eventEnd - eventStart < MIN_INACTIVITY_EVENT_MS) {
          return;
        }
        const insideBreak = breaks.some((breakEvent) => {
          const breakEnd = breakEvent.end || defaultEndMs;
          return eventStart >= breakEvent.start && eventEnd <= breakEnd;
        });
        if (insideBreak) {
          return;
        }
      }
      if (cleanTimeline.length === 0) {
        cleanTimeline.push({ type: event.type, start: eventStart, end: eventEnd });
        return;
      }
      const previous = cleanTimeline[cleanTimeline.length - 1];
      if (previous.type === event.type && eventStart <= previous.end + TIMELINE_MERGE_GAP_MS) {
        previous.end = Math.max(previous.end, eventEnd);
      } else if (eventStart < previous.end) {
        if (event.type === TIMELINE_EVENT.INACTIVITY) {
          if (eventEnd > previous.end) {
            eventStart = previous.end;
            if (eventEnd - eventStart >= MIN_INACTIVITY_EVENT_MS) {
              cleanTimeline.push({ type: event.type, start: eventStart, end: eventEnd });
            }
          }
        } else {
          cleanTimeline.push({ type: event.type, start: eventStart, end: eventEnd });
        }
      } else {
        cleanTimeline.push({ type: event.type, start: eventStart, end: eventEnd });
      }
    });
    return cleanTimeline;
  }
  function pushTimelineEvent(timeline, type, action, now = Date.now()) {
    const nextTimeline = Array.isArray(timeline) ? timeline.map((event) => ({ ...event })) : [];
    if (action === "start") {
      nextTimeline.forEach((event) => {
        if (event.end === null) event.end = now;
      });
      nextTimeline.push({ type, start: now, end: null });
    } else if (action === "end") {
      for (let index = nextTimeline.length - 1; index >= 0; index -= 1) {
        if (nextTimeline[index].type === type && nextTimeline[index].end === null) {
          nextTimeline[index].end = now;
          break;
        }
      }
    }
    return nextTimeline;
  }

  // ../src/domain/tasks/task-reconciler.js
  var task_reconciler_exports = {};
  __export(task_reconciler_exports, {
    computeLocalTaskMigrations: () => computeLocalTaskMigrations,
    mergeTaskCaches: () => mergeTaskCaches,
    reconcileScheduledTaskWithSession: () => reconcileScheduledTaskWithSession
  });

  // ../src/domain/tasks/task-report.js
  var task_report_exports = {};
  __export(task_report_exports, {
    buildTaskReportSummaryText: () => buildTaskReportSummaryText,
    canonicalTaskId: () => canonicalTaskId,
    isLegacyGenericTaskName: () => isLegacyGenericTaskName,
    resolveTaskDisplayName: () => resolveTaskDisplayName
  });
  var EMPTY_REPORT_TEXT = "El gestor no marc\xF3 ninguna tarea expl\xEDcitamente durante este turno.";
  var TIMELINE_MARKER = "=== BIT\xC1CORA DE TIEMPOS ===";
  function canonicalTaskId(id) {
    return String(id);
  }
  function isLegacyGenericTaskName(name) {
    return typeof name === "string" && /^Tarea\s+\d+$/i.test(name.trim());
  }
  function resolveTaskDisplayName(key, entry, catalog = null, onWarn = () => {
  }) {
    const rawName = entry && entry.name;
    if (rawName && !isLegacyGenericTaskName(rawName)) {
      return rawName;
    }
    if (Array.isArray(catalog) && catalog.length > 0) {
      const canonicalKey = canonicalTaskId(key);
      const match = catalog.find((task) => canonicalTaskId(task.id) === canonicalKey);
      if (match && match["Tarea"]) {
        return match["Tarea"];
      }
    }
    onWarn("No se pudo resolver el nombre visible de una tarea normal; ID t\xE9cnico:", key);
    return "Tarea programada (nombre no disponible)";
  }
  function buildTaskReportSummaryText(report, options = {}) {
    const { catalog = null, onWarn = () => {
    } } = options;
    const tasks = report && report.tasks;
    if (tasks && Object.keys(tasks).length > 0) {
      let text = "";
      Object.keys(tasks).forEach((key) => {
        const entry = tasks[key];
        if (!entry) {
          return;
        }
        const isExtra = key.startsWith(EXTRA_TASK_KEY_PREFIX);
        const displayName = isExtra ? entry.name || "Tarea adicional" : resolveTaskDisplayName(key, entry, catalog, onWarn);
        const status = (entry.status || "Pendiente").toString().toUpperCase();
        text += `
[ ${status} ] - ${displayName}
Observaci\xF3n: ${entry.observation || "N/A"}
`;
      });
      return text.trim() ? text : EMPTY_REPORT_TEXT;
    }
    if (report && report.reporte) {
      let legacyText = report.reporte;
      if (legacyText.includes(TIMELINE_MARKER)) {
        legacyText = legacyText.split(TIMELINE_MARKER)[0];
      }
      legacyText = legacyText.trim();
      if (legacyText) {
        const processedLines = [];
        for (const line of legacyText.split("\n")) {
          const match = line.match(/^\[\s*([^\]]+?)\s*\]\s*-\s*(.+)$/);
          if (match) {
            const status = match[1];
            let name = match[2];
            if (isLegacyGenericTaskName(name)) {
              const taskId = name.replace(/Tarea\s*/i, "").trim();
              name = resolveTaskDisplayName(taskId, { name }, catalog, onWarn);
            }
            processedLines.push(`[ ${status} ] - ${name}`);
          } else {
            processedLines.push(line);
          }
        }
        return processedLines.join("\n") || EMPTY_REPORT_TEXT;
      }
      return EMPTY_REPORT_TEXT;
    }
    return EMPTY_REPORT_TEXT;
  }

  // ../src/domain/tasks/task-reconciler.js
  function reconcileScheduledTaskWithSession(taskName, sessionTasks, catalog = null, onWarn = () => {
  }) {
    const tasks = sessionTasks || {};
    for (const key in tasks) {
      if (key.startsWith(EXTRA_TASK_KEY_PREFIX)) {
        continue;
      }
      const entry = tasks[key];
      if (!entry) {
        continue;
      }
      const resolvedName = resolveTaskDisplayName(key, entry, catalog, onWarn);
      if (taskNamesMatch(taskName, resolvedName) || taskNamesMatch(taskName, entry.name)) {
        return {
          status: entry.status || TASK_STATUS.PENDING,
          observation: entry.observation || ""
        };
      }
    }
    return { status: TASK_STATUS.PENDING, observation: "" };
  }
  function mergeTaskCaches(localCache, remoteCache) {
    const merged = { ...localCache || {} };
    Object.keys(remoteCache || {}).forEach((taskId) => {
      const remoteEntry = remoteCache[taskId];
      const localEntry = merged[taskId];
      if (!localEntry) {
        merged[taskId] = remoteEntry;
        return;
      }
      const remoteUpdatedAt = typeof remoteEntry.updatedAt === "number" ? remoteEntry.updatedAt : null;
      const localUpdatedAt = typeof localEntry.updatedAt === "number" ? localEntry.updatedAt : null;
      if (remoteUpdatedAt !== null && localUpdatedAt !== null && remoteUpdatedAt > localUpdatedAt) {
        merged[taskId] = remoteEntry;
      }
    });
    return merged;
  }
  function computeLocalTaskMigrations(mergedCache, remoteCache, now) {
    const remote = remoteCache || {};
    const migrations = [];
    Object.keys(mergedCache || {}).forEach((taskId) => {
      const mergedEntry = mergedCache[taskId];
      const remoteEntry = remote[taskId];
      const alreadyInSync = !!remoteEntry && mergedEntry.name === remoteEntry.name && mergedEntry.status === remoteEntry.status && mergedEntry.observation === remoteEntry.observation && mergedEntry.updatedAt === remoteEntry.updatedAt;
      if (alreadyInSync) {
        return;
      }
      const record = typeof mergedEntry.updatedAt === "number" ? mergedEntry : { ...mergedEntry, updatedAt: now };
      migrations.push({ taskId, record });
    });
    return migrations;
  }

  // ../src/domain/tasks/task-service.js
  var task_service_exports = {};
  __export(task_service_exports, {
    findUnmanagedTasks: () => findUnmanagedTasks
  });
  function findUnmanagedTasks(taskStateCache) {
    const unmanaged = [];
    if (!taskStateCache) {
      return unmanaged;
    }
    for (const taskId in taskStateCache) {
      const entry = taskStateCache[taskId];
      if (entry && (entry.status === TASK_STATUS.IN_PROGRESS || entry.status === TASK_STATUS.PENDING)) {
        unmanaged.push(entry.name || taskId);
      }
    }
    return unmanaged;
  }

  // ../src/config/doc-links.js
  var doc_links_exports = {};
  __export(doc_links_exports, {
    DOC_URL_MAP: () => DOC_URL_MAP,
    MANUAL_URL_MAP: () => MANUAL_URL_MAP,
    getDocUrl: () => getDocUrl,
    getManualUrl: () => getManualUrl
  });
  var DOC_URL_MAP = Object.freeze({
    "Guia Jira EGT - Proveedor de Casino.pdf": "https://virtualsoftserv.sharepoint.com/:b:/s/GestindeRiesgo/IQAN4F3bHU1fQLV0q-zHiZ22AcaHMxxApoL7T_v7J1fTfyU?e=msaPhD",
    "Instructivo de revisi\xF3n de apuestas casino.pdf": "https://github.com/RiesgoVirtualsoft/riskmanager-internal-docs/blob/main/Procedimientos/Instructivo%20de%20revisi%C3%B3n%20de%20apuestas%20casino.pdf",
    "Instructivo de validaci\xF3n de GGR Casino.pdf": "https://github.com/RiesgoVirtualsoft/riskmanager-internal-docs/blob/main/Procedimientos/Instructivo%20de%20validaci%C3%B3n%20de%20GGR%20Casino.pdf",
    "Pol\xEDtica Procedimiento De Aprobaci\xF3n De Retiros.pdf": "https://github.com/RiesgoVirtualsoft/riskmanager-internal-docs/blob/main/Procedimientos/Pol%C3%ADtica%20Procedimiento%20De%20Aprobaci%C3%B3n%20De%20Retiros.pdf",
    "Procedimiento Identificaci\xF3n de jineteo.pdf": "https://github.com/RiesgoVirtualsoft/riskmanager-internal-docs/blob/main/Procedimientos/Procedimiento%20Identificaci%C3%B3n%20de%20jineteo.pdf",
    "Proceso de Eliminaci\xF3n de Cuentas - Implementaciones.pdf": "https://github.com/RiesgoVirtualsoft/riskmanager-internal-docs/blob/main/Procedimientos/Proceso%20de%20Eliminaci%C3%B3n%20de%20Cuentas%20-%20Implementaciones.pdf",
    "VALIDACI\xD3N DE ABUSO DE BONOS EN CAMPA\xD1AS DE CRM.pdf": "https://github.com/RiesgoVirtualsoft/riskmanager-internal-docs/blob/main/Procedimientos/VALIDACI%C3%93N%20DE%20ABUSO%20DE%20BONOS%20EN%20CAMPA%C3%91AS%20DE%20CRM.pdf",
    "Revisi\xF3n de Eventos Deportivos.mp4": "https://drive.google.com/file/d/1UqccsnUwTG6tgPcDYdUeLnf9XqvGzSoc/view?usp=sharing",
    "Revisi\xF3n de Eventos.mp4": "https://drive.google.com/file/d/1SB9ePi1EOJU05hzOsxOyl7BeNvCN1hOh/view?usp=sharing",
    "Validaci\xF3n SEON.mp4": "https://drive.google.com/file/d/1JFf5basGD0gmrAVIy5AlMK1DBHYgE6JC/view?usp=sharing"
  });
  var MANUAL_URL_MAP = Object.freeze({
    "3oaks.pdf": "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQDKFNjEjbkHRqwX17cHrcuQAca3E58JknfNg1voWyPmYlg?e=beWE2e",
    "Airdice.pdf": "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQAOz1vWcvgbQYTDxPDwsJj3AWV0PHfqSKOKpe9ZpXsdHXE?e=tqWW4B",
    Amigogaming: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQBy_TFBmiXtRIRBLM17t1GLAbpTqwvREudyaj3svco7E88?e=KhePZM",
    Amusnet: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQCBJoKWY5FfS7etdPZfnxzpAflSu1BD8XqdMI2_7uBIsPg?e=Xd2Gvv",
    Aviatrix: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQBfvgW5WaX6TII45Petp95PAa5POqG8BQzWcy9yo92KkpI?e=TWSCB42",
    Belatra: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQBfvgW5WaX6TII45Petp95PAa5POqG8BQzWcy9yo92KkpI?e=TWSCB4",
    Egt: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQBfvgW5WaX6TII45Petp95PAa5POqG8BQzWcy9yo92KkpI?e=TWSCB4",
    Evolution: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQDlFklX__OXRr5D7HHkhTxNAUA5QCL87QdDe3u7ngX-rUg?e=BtCIFL",
    Mancala: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQASeOCMQcuoR4um2ha_bUcsAVPNezVck9cXaS30gC5JYik?e=HQDduM",
    Manual: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQAlqJvOPdb1Q5yLeAK5hSpHAeGml7SGGGhPtHj52ExkWJA?e=D821Dz",
    Pariplay: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQC_VU-AHEJhRKGK8Qfw1Hh2AQSzWxI4FWDT3AYovt01TaE?e=VOJ7nx",
    playnGo: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQCC_qzPuTOXQqcoqika6LLrAfM9yZKteZJ0kMPAoY9e3fw?e=RZuKKd",
    PlaytechLive: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQBNmdba5xoAS6gdkPxkpJmdAZyiMaIgRMITPVl17kTxxNk?e=Cehg9s",
    Pragmatic: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQAt0TYGB8kkQ7Du3JNnd9XfAe69Mxr5Yga2S_AVlZKUsoo?e=yz932I",
    PragmaticplaySlot: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQBed0oHqboZRabYQnGJMxUATLlSdPshzsD7pnAsl8JxdM?e=wIyTFp",
    Redrakegaming: "https://virtualsoftserv.sharepoint.com/:b:/s/ManualesProveedoresCasino/IQCmcIAXj_tLRZKJ2dpTMyZAQP18AdXeKvHLc1PtnVBhd4?e=e6ltHs"
  });
  function getDocUrl(fileName) {
    if (DOC_URL_MAP[fileName]) {
      return DOC_URL_MAP[fileName];
    }
    if (typeof fileName === "string" && fileName.endsWith(".mp4")) {
      return "#PENDING_PRIVATE_DOCUMENT_MIGRATION";
    }
    return `Procesos/${fileName}`;
  }
  function getManualUrl(fileName) {
    return MANUAL_URL_MAP[fileName] || `Manuales/${fileName}`;
  }

  // ../src/config/roles.js
  var roles_exports = {};
  __export(roles_exports, {
    ROLES: () => ROLES,
    ROLES_WITHOUT_SHIFT: () => ROLES_WITHOUT_SHIFT
  });
  var ROLES = Object.freeze({
    GESTOR: "Gestor",
    SUPERVISOR: "Supervisor",
    ADMIN: "Admin"
  });
  var ROLES_WITHOUT_SHIFT = /* @__PURE__ */ new Set([ROLES.ADMIN, ROLES.SUPERVISOR]);

  // ../src/config/routes.js
  var routes_exports = {};
  __export(routes_exports, {
    DATA_FILES: () => DATA_FILES,
    DB_ROOTS: () => DB_ROOTS,
    activeSessionPath: () => activeSessionPath,
    cronogramFileName: () => cronogramFileName,
    userPath: () => userPath
  });
  var DB_ROOTS = Object.freeze({
    USERS: "users",
    ACTIVE_SESSIONS: "active_sessions",
    SHIFT_REPORTS: "shift_reports",
    PERMISSIONS: "permissions",
    ANNOUNCEMENTS: "announcements",
    LOGIN_LOGS: "login_logs",
    LOGIN_HISTORY: "login_history",
    METRICS: "metrics",
    LOGS: "logs"
  });
  var DATA_FILES = Object.freeze({
    SCHEDULE_WORKBOOK: "Horario/Horario 2026.xlsx",
    TASK_CATALOG_WORKBOOK: "Tareas Riesgo/Tareas de Riesgo.xlsx",
    TELEWORK_WORKBOOK: "Teletrabajo/Teletrabajo.xlsx",
    CRONOGRAM_DIRECTORY: "Cronograma de Tareas",
    KPI_HISTORY: "kpi_operativos_v2.json",
    KPI_SEED: "kpi_operativos_seed.json"
  });
  var cronogramFileName = (monthName) => `Cronograma ${monthName}.xlsx`;
  var activeSessionPath = (uid) => `${DB_ROOTS.ACTIVE_SESSIONS}/${uid}`;
  var userPath = (uid) => `${DB_ROOTS.USERS}/${uid}`;

  // ../src/services/browser/idle-detector-adapter.js
  var idle_detector_adapter_exports = {};
  __export(idle_detector_adapter_exports, {
    initIdleDetector: () => initIdleDetector,
    requestIdlePermissionManual: () => requestIdlePermissionManual,
    shouldApplyDomIdleFallback: () => shouldApplyDomIdleFallback
  });
  var NATIVE_IDLE_THRESHOLD_MS2 = 3 * 60 * 1e3;
  var SCREEN_LOCK_GRACE_PERIOD_MS2 = 10 * 1e3;
  var DOM_IDLE_FALLBACK_THRESHOLD_MS2 = 5 * 60 * 1e3;
  var idleDetectorInstance = null;
  var idleDetectorStartPromise = null;
  var screenLockTimer = null;
  var idleDetectorGranted = false;
  var idleDetectorStarted = false;
  var onIdleChange = () => {
  };
  var onWarning = () => {
  };
  var getLastActivityTimestamp = () => Date.now();
  function configureCallbacks(callbacks = {}) {
    onIdleChange = typeof callbacks.onIdleChange === "function" ? callbacks.onIdleChange : () => {
    };
    onWarning = typeof callbacks.onWarning === "function" ? callbacks.onWarning : () => {
    };
    getLastActivityTimestamp = typeof callbacks.getLastActivityTimestamp === "function" ? callbacks.getLastActivityTimestamp : () => Date.now();
  }
  function setDetectorStatus(granted, started) {
    idleDetectorGranted = granted;
    idleDetectorStarted = started;
  }
  function clearScreenLockTimer() {
    if (screenLockTimer !== null) {
      clearTimeout(screenLockTimer);
      screenLockTimer = null;
    }
  }
  function showWarning(message) {
    onWarning(true, message);
  }
  function handleDetectorChange() {
    if (!idleDetectorInstance) {
      return;
    }
    const isLocked = idleDetectorInstance.screenState === "locked";
    const isIdle = idleDetectorInstance.userState === "idle";
    if (isLocked) {
      if (screenLockTimer === null) {
        screenLockTimer = setTimeout(() => {
          screenLockTimer = null;
          onIdleChange(true);
        }, SCREEN_LOCK_GRACE_PERIOD_MS2);
      }
      return;
    }
    if (isIdle) {
      clearScreenLockTimer();
      onIdleChange(true);
      return;
    }
    clearScreenLockTimer();
    onIdleChange(false);
  }
  async function startIdleDetectorLogic() {
    if (idleDetectorStarted && idleDetectorInstance) {
      return true;
    }
    if (idleDetectorStartPromise) {
      return idleDetectorStartPromise;
    }
    if (typeof window === "undefined" || !("IdleDetector" in window)) {
      setDetectorStatus(false, false);
      return false;
    }
    idleDetectorStartPromise = (async () => {
      try {
        const detector = new window.IdleDetector();
        detector.addEventListener(
          "change",
          handleDetectorChange
        );
        await detector.start({
          threshold: NATIVE_IDLE_THRESHOLD_MS2
        });
        idleDetectorInstance = detector;
        setDetectorStatus(true, true);
        onWarning(false);
        return true;
      } catch (error) {
        idleDetectorInstance = null;
        setDetectorStatus(false, false);
        clearScreenLockTimer();
        console.error(
          "IdleDetector start failed:",
          error
        );
        return false;
      } finally {
        idleDetectorStartPromise = null;
      }
    })();
    return idleDetectorStartPromise;
  }
  async function checkAndStartIdleDetector() {
    if (typeof window === "undefined" || !("IdleDetector" in window)) {
      setDetectorStatus(false, false);
      showWarning(
        "Tu navegador no admite el permiso de inactividad. Esto no impide finalizar el turno."
      );
      return false;
    }
    if (typeof navigator === "undefined" || !navigator.permissions || typeof navigator.permissions.query !== "function") {
      setDetectorStatus(false, false);
      showWarning(
        "No fue posible verificar el permiso de inactividad. Esto no impide finalizar el turno."
      );
      return false;
    }
    try {
      const permissionStatus = await navigator.permissions.query({
        name: "idle-detection"
      });
      if (permissionStatus.state === "granted") {
        const started = await startIdleDetectorLogic();
        if (!started) {
          showWarning(
            "El permiso est\xE1 otorgado, pero el detector de inactividad no pudo iniciarse. Usa el bot\xF3n para reintentar."
          );
        }
        return started;
      }
      setDetectorStatus(false, false);
      showWarning(
        "Permiso de inactividad pendiente o denegado. RiskOps no podr\xE1 registrar autom\xE1ticamente cuando bloquees la pantalla. Esto no impide finalizar el turno."
      );
    } catch (error) {
      setDetectorStatus(false, false);
      console.error(
        "Permission query error:",
        error
      );
      showWarning(
        "No fue posible verificar el permiso de inactividad. Esto no impide finalizar el turno."
      );
    }
    return false;
  }
  async function initIdleDetector(callbacks = {}) {
    configureCallbacks(callbacks);
    if (callbacks.autoStart === false) {
      return false;
    }
    return checkAndStartIdleDetector();
  }
  async function requestIdlePermissionManual() {
    if (typeof window === "undefined" || !("IdleDetector" in window)) {
      setDetectorStatus(false, false);
      showWarning(
        "Tu navegador no admite el permiso de inactividad. Esto no impide finalizar el turno."
      );
      return false;
    }
    if (typeof window.IdleDetector.requestPermission !== "function") {
      setDetectorStatus(false, false);
      showWarning(
        "Tu navegador no permite solicitar el permiso de inactividad. Esto no impide finalizar el turno."
      );
      return false;
    }
    try {
      const permissionState = await window.IdleDetector.requestPermission();
      if (permissionState === "granted") {
        const started = await startIdleDetectorLogic();
        if (!started) {
          showWarning(
            "El permiso fue otorgado, pero el detector de inactividad no pudo iniciarse. Esto no impide finalizar el turno."
          );
        }
        return started;
      }
      setDetectorStatus(false, false);
      showWarning(
        "Permiso de inactividad denegado. Esto no impide finalizar el turno."
      );
    } catch (error) {
      setDetectorStatus(false, false);
      console.error(
        "Request permission error:",
        error
      );
      showWarning(
        "No fue posible activar el permiso de inactividad. Esto no impide finalizar el turno."
      );
    }
    return false;
  }
  function shouldApplyDomIdleFallback(now = Date.now()) {
    if (idleDetectorGranted) {
      return false;
    }
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return false;
    }
    if (typeof document !== "undefined" && typeof document.hasFocus === "function" && !document.hasFocus()) {
      return false;
    }
    const lastActivityTimestamp = Number(getLastActivityTimestamp());
    if (!Number.isFinite(lastActivityTimestamp)) {
      return false;
    }
    return now - lastActivityTimestamp > DOM_IDLE_FALLBACK_THRESHOLD_MS2;
  }

  // ../src/services/external/formsubmit-notification-adapter.js
  var formsubmit_notification_adapter_exports = {};
  __export(formsubmit_notification_adapter_exports, {
    appendFormSubmitCc: () => appendFormSubmitCc
  });
  var FORM_SUBMIT_CC = "sara.santamaria@virtualsoft.tech,oriana.borja@virtualsoft.tech";
  function appendFormSubmitCc(formData, carbonCopy = FORM_SUBMIT_CC) {
    if (!(formData instanceof FormData)) {
      throw new TypeError("formData must be an instance of FormData");
    }
    const result = new FormData();
    for (const [key, value] of formData.entries()) {
      result.append(key, value);
    }
    result.append("_cc", carbonCopy);
    return result;
  }

  // ../src/services/storage/local-session-storage.js
  var local_session_storage_exports = {};
  __export(local_session_storage_exports, {
    loadBreakState: () => loadBreakState,
    saveBreakState: () => saveBreakState
  });
  var BREAK_STATE_STORAGE_KEY = "riskOps_breakState";
  function saveBreakState(state) {
    const normalized = normalizeState(state);
    try {
      localStorage.setItem(BREAK_STATE_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.warn("No se pudo guardar el estado de pausas:", error);
    }
    return normalized;
  }
  function loadBreakState() {
    try {
      const serialized = localStorage.getItem(BREAK_STATE_STORAGE_KEY);
      return serialized ? normalizeState(JSON.parse(serialized)) : defaultState();
    } catch (error) {
      console.warn("No se pudo cargar el estado de pausas:", error);
      return defaultState();
    }
  }

  // ../src/ui/components/multi-select.js
  var multi_select_exports = {};
  __export(multi_select_exports, {
    getSelectedMultiSelectValues: () => getSelectedMultiSelectValues,
    resetCustomMultiSelect: () => resetCustomMultiSelect,
    setCustomMultiSelectValues: () => setCustomMultiSelectValues,
    setupCustomMultiSelect: () => setupCustomMultiSelect
  });
  var MULTISELECT_REGISTRY = /* @__PURE__ */ new Map();
  var outsideClickListenerRegistered = false;
  function closeOpenMultiSelects(excludedContainer = null) {
    for (const entry of MULTISELECT_REGISTRY.values()) {
      if (entry.container !== excludedContainer) {
        entry.container.classList.remove("open");
        const parentPanel = entry.container.closest(".glass-panel");
        if (parentPanel) {
          parentPanel.style.zIndex = parentPanel.dataset.origZIndex || "";
        }
      }
    }
  }
  function registerOutsideClickListener() {
    if (outsideClickListenerRegistered || typeof document === "undefined") {
      return;
    }
    document.addEventListener("click", (event) => {
      for (const entry of MULTISELECT_REGISTRY.values()) {
        if (!entry.container.contains(event.target)) {
          entry.container.classList.remove("open");
          const parentPanel = entry.container.closest(".glass-panel");
          if (parentPanel) {
            parentPanel.style.zIndex = parentPanel.dataset.origZIndex || "";
          }
        }
      }
    });
    outsideClickListenerRegistered = true;
  }
  function updateLabel(labelElement, selectedValues, optionsList) {
    if (selectedValues.size === 0 || selectedValues.size === optionsList.length) {
      labelElement.textContent = "Todos los gestores";
      return;
    }
    if (selectedValues.size === 1) {
      labelElement.textContent = Array.from(selectedValues)[0];
      return;
    }
    labelElement.textContent = `${selectedValues.size} gestores seleccionados`;
  }
  function renderOptions(optionsListElement, optionsList, selectedValues, filter, notifyChange) {
    optionsListElement.innerHTML = "";
    const cleanFilter = String(filter || "").toLowerCase().trim();
    optionsList.forEach((optionValue) => {
      if (cleanFilter && !optionValue.toLowerCase().includes(cleanFilter)) {
        return;
      }
      const item = document.createElement("label");
      item.className = "custom-multiselect-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = optionValue;
      checkbox.checked = selectedValues.has(optionValue);
      checkbox.addEventListener("change", (event) => {
        if (event.target.checked) {
          selectedValues.add(optionValue);
        } else {
          selectedValues.delete(optionValue);
        }
        notifyChange();
      });
      const label = document.createElement("span");
      label.textContent = optionValue;
      item.appendChild(checkbox);
      item.appendChild(label);
      optionsListElement.appendChild(item);
    });
  }
  function setupCustomMultiSelect(containerId, optionsList, onChangeCallback) {
    const container = document.getElementById(containerId);
    if (!container) {
      return {
        getValues: () => [],
        reset: () => {
        },
        setValues: () => {
        }
      };
    }
    const normalizedOptions = Array.isArray(optionsList) ? [...optionsList] : [];
    const selectedValues = /* @__PURE__ */ new Set();
    container.innerHTML = `
        <div class="custom-multiselect-btn" tabindex="0">
            <span class="multiselect-label">
                Todos los gestores
            </span>
            <i class="bx bx-chevron-down"></i>
        </div>
        <div class="custom-multiselect-dropdown">
            <div class="custom-multiselect-actions">
                <button
                    type="button"
                    class="btn-select-all"
                >
                    Seleccionar Todos
                </button>
                <button
                    type="button"
                    class="btn-clear-all"
                >
                    Desmarcar Todos
                </button>
            </div>
            <div
                style="padding: 4px 6px; margin-bottom: 6px;"
            >
                <input
                    type="text"
                    id="${containerId}-search"
                    name="${containerId}-search"
                    aria-label="Buscar gestor"
                    placeholder="Buscar gestor..."
                    class="multiselect-search-input modern-input"
                    style="width: 100%; height: 32px; font-size: 12px; padding: 4px 10px; background: rgba(255,255,255,0.05); border-radius: 8px;"
                >
            </div>
            <div class="multiselect-options-list"></div>
        </div>
    `;
    const trigger = container.querySelector(
      ".custom-multiselect-btn"
    );
    const labelElement = container.querySelector(
      ".multiselect-label"
    );
    const optionsListElement = container.querySelector(
      ".multiselect-options-list"
    );
    const searchInput = container.querySelector(
      ".multiselect-search-input"
    );
    const selectAllButton = container.querySelector(
      ".btn-select-all"
    );
    const clearAllButton = container.querySelector(
      ".btn-clear-all"
    );
    const notifyChange = () => {
      updateLabel(
        labelElement,
        selectedValues,
        normalizedOptions
      );
      renderOptions(
        optionsListElement,
        normalizedOptions,
        selectedValues,
        searchInput ? searchInput.value : "",
        notifyChange
      );
      if (typeof onChangeCallback === "function") {
        onChangeCallback(Array.from(selectedValues));
      }
    };
    const getValues = () => Array.from(selectedValues);
    const reset = () => {
      selectedValues.clear();
      updateLabel(
        labelElement,
        selectedValues,
        normalizedOptions
      );
      renderOptions(
        optionsListElement,
        normalizedOptions,
        selectedValues,
        searchInput ? searchInput.value : "",
        notifyChange
      );
    };
    const setValues = (values) => {
      selectedValues.clear();
      if (Array.isArray(values)) {
        const allowedValues = new Set(normalizedOptions);
        values.forEach((value) => {
          if (allowedValues.has(value)) {
            selectedValues.add(value);
          }
        });
      }
      updateLabel(
        labelElement,
        selectedValues,
        normalizedOptions
      );
      renderOptions(
        optionsListElement,
        normalizedOptions,
        selectedValues,
        searchInput ? searchInput.value : "",
        notifyChange
      );
    };
    const entry = {
      container,
      getValues,
      reset,
      setValues
    };
    MULTISELECT_REGISTRY.set(containerId, entry);
    registerOutsideClickListener();
    renderOptions(
      optionsListElement,
      normalizedOptions,
      selectedValues,
      "",
      notifyChange
    );
    updateLabel(
      labelElement,
      selectedValues,
      normalizedOptions
    );
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = container.classList.contains("open");
      closeOpenMultiSelects(container);
      if (isOpen) {
        return;
      }
      container.classList.add("open");
      const parentPanel = container.closest(".glass-panel");
      if (parentPanel) {
        if (parentPanel.dataset.origZIndex === void 0) {
          parentPanel.dataset.origZIndex = parentPanel.style.zIndex || "";
        }
        parentPanel.style.zIndex = "99999";
      }
      if (searchInput) {
        searchInput.focus();
      }
    });
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        renderOptions(
          optionsListElement,
          normalizedOptions,
          selectedValues,
          searchInput.value,
          notifyChange
        );
      });
      searchInput.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    }
    selectAllButton.addEventListener("click", (event) => {
      event.stopPropagation();
      normalizedOptions.forEach((optionValue) => {
        selectedValues.add(optionValue);
      });
      notifyChange();
    });
    clearAllButton.addEventListener("click", (event) => {
      event.stopPropagation();
      selectedValues.clear();
      notifyChange();
    });
    return {
      getValues,
      reset,
      setValues
    };
  }
  function getSelectedMultiSelectValues(containerId) {
    const entry = MULTISELECT_REGISTRY.get(containerId);
    if (!entry) {
      return [];
    }
    return entry.getValues();
  }
  function resetCustomMultiSelect(containerId) {
    const entry = MULTISELECT_REGISTRY.get(containerId);
    if (entry) {
      entry.reset();
    }
  }
  function setCustomMultiSelectValues(containerId, newValuesArray) {
    const entry = MULTISELECT_REGISTRY.get(containerId);
    if (entry) {
      entry.setValues(newValuesArray);
    }
  }

  // ../src/utils/excel.js
  var excel_exports = {};
  __export(excel_exports, {
    excelToJSDate: () => excelToJSDate,
    getCell: () => getCell,
    hasMinimumRows: () => hasMinimumRows,
    isSameDate: () => isSameDate,
    parseExcelDate: () => parseExcelDate,
    readFirstSheetRows: () => readFirstSheetRows
  });
  function excelToJSDate(serial) {
    if (!serial || Number.isNaN(Number(serial))) {
      return null;
    }
    const epochUTC = Date.UTC(1899, 11, 30);
    return new Date(
      epochUTC + Number(serial) * 864e5
    );
  }
  function parseExcelDate(value) {
    if (!value) {
      return null;
    }
    if (typeof value === "string" && (value.includes("-") || value.includes("/"))) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (!Number.isNaN(Number(value))) {
      return new Date(Date.UTC(1899, 11, 30) + parseFloat(value) * 864e5);
    }
    return null;
  }
  function readFirstSheetRows(workbook, xlsx, options = {}) {
    if (!workbook || !Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
      return null;
    }
    const worksheet = workbook.Sheets && workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) {
      return null;
    }
    const config = options.asObjects ? { defval: "" } : { header: 1, defval: "" };
    return xlsx.utils.sheet_to_json(worksheet, config);
  }
  function hasMinimumRows(rows, minimumRows = 3) {
    return Array.isArray(rows) && rows.length >= minimumRows;
  }
  function getCell(rows, rowIndex, columnIndex, fallback = "") {
    const row = Array.isArray(rows) ? rows[rowIndex] : void 0;
    if (!Array.isArray(row) || columnIndex < 0 || columnIndex >= row.length) {
      return fallback;
    }
    return row[columnIndex];
  }
  function isSameDate(excelDate, jsDate) {
    if (!excelDate || !jsDate) {
      return false;
    }
    return excelDate.getUTCDate() === jsDate.getDate() && excelDate.getUTCMonth() === jsDate.getMonth() && excelDate.getUTCFullYear() === jsDate.getFullYear();
  }

  // ../src/utils/result.js
  var result_exports = {};
  __export(result_exports, {
    ERROR_CODES: () => ERROR_CODES,
    fail: () => fail,
    ok: () => ok
  });
  var ERROR_CODES = Object.freeze({
    AUTH_REQUIRED: "AUTH_REQUIRED",
    PERMISSION_DENIED: "PERMISSION_DENIED",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    NETWORK_ERROR: "NETWORK_ERROR",
    SOURCE_FORMAT_ERROR: "SOURCE_FORMAT_ERROR",
    PERSISTENCE_ERROR: "PERSISTENCE_ERROR"
  });
  function ok(value) {
    return Object.freeze({ ok: true, value });
  }
  function fail(code, message = "", cause = null) {
    return Object.freeze({
      ok: false,
      error: Object.freeze({ code, message, cause })
    });
  }

  // ../src/utils/sanitization.js
  var sanitization_exports = {};
  __export(sanitization_exports, {
    appendSanitizedNode: () => appendSanitizedNode,
    encodeInlineHandlerArg: () => encodeInlineHandlerArg,
    escapeHTML: () => escapeHTML,
    sanitizeAnnouncementHTML: () => sanitizeAnnouncementHTML,
    sanitizeAnnouncementHref: () => sanitizeAnnouncementHref
  });
  var ANNOUNCEMENT_ALLOWED_TAGS = /* @__PURE__ */ new Set([
    "p",
    "br",
    "strong",
    "em",
    "ul",
    "ol",
    "li",
    "a"
  ]);
  var ANNOUNCEMENT_DROP_CONTENT_TAGS = /* @__PURE__ */ new Set([
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "template",
    "noscript"
  ]);
  var ANNOUNCEMENT_TAG_ALIASES = Object.freeze({
    b: "strong",
    i: "em",
    div: "p"
  });
  function escapeHTML(value) {
    if (value === null || value === void 0) {
      return "";
    }
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function encodeInlineHandlerArg(value) {
    return encodeURIComponent(String(value)).replace(/'/g, "%27");
  }
  function sanitizeAnnouncementHref(value) {
    if (!value) {
      return "";
    }
    const trimmed = String(value).trim();
    const normalized = trimmed.replace(/[\u0000- \u007F]+/g, "");
    if (!normalized || normalized.startsWith("//")) {
      return "";
    }
    const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/i);
    if (schemeMatch && !["http", "https", "mailto"].includes(
      schemeMatch[1].toLowerCase()
    )) {
      return "";
    }
    return trimmed;
  }
  function escapeAttributeValue(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#039;");
  }
  function escapeName(value) {
    return String(value).replace(/[^a-zA-Z0-9:_-]/g, "");
  }
  function parseAnnouncementFragment(html) {
    var _a, _b, _c;
    const root = {
      type: "root",
      children: []
    };
    const stack = [root];
    const tokenPattern = /<!--[\s\S]*?-->|<\/?[a-z][^>]*>|[^<]+/gi;
    const tokens = String(html).match(tokenPattern) || [];
    for (const token of tokens) {
      if (token.startsWith("<!--")) {
        continue;
      }
      if (token.startsWith("</")) {
        const closingMatch = token.match(
          /^<\/\s*([a-z0-9-]+)/i
        );
        if (!closingMatch) {
          continue;
        }
        const closingTag = closingMatch[1].toLowerCase();
        for (let index = stack.length - 1; index > 0; index -= 1) {
          if (stack[index].tagName === closingTag) {
            stack.length = index;
            break;
          }
        }
        continue;
      }
      if (!token.startsWith("<")) {
        stack[stack.length - 1].children.push({
          type: "text",
          value: token
        });
        continue;
      }
      const openingMatch = token.match(
        /^<\s*([a-z0-9-]+)([^>]*)>/i
      );
      if (!openingMatch) {
        continue;
      }
      const tagName = openingMatch[1].toLowerCase();
      const rawAttributes = openingMatch[2] || "";
      const attributes = {};
      const attributePattern = /([a-z_:][a-z0-9:._-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gi;
      let attributeMatch;
      while ((attributeMatch = attributePattern.exec(rawAttributes)) !== null) {
        const attributeName = attributeMatch[1].toLowerCase();
        if (attributeName === "href") {
          attributes.href = (_c = (_b = (_a = attributeMatch[2]) != null ? _a : attributeMatch[3]) != null ? _b : attributeMatch[4]) != null ? _c : "";
        }
      }
      const element = {
        type: "element",
        tagName,
        attributes,
        children: []
      };
      stack[stack.length - 1].children.push(element);
      const isSelfClosing = /\/\s*>$/.test(token) || tagName === "br" || ANNOUNCEMENT_DROP_CONTENT_TAGS.has(tagName);
      if (!isSelfClosing) {
        stack.push(element);
      }
    }
    return root;
  }
  function appendSanitizedNode(sourceNode) {
    if (!sourceNode || typeof sourceNode !== "object") {
      return "";
    }
    if (sourceNode.type === "text") {
      return escapeHTML(sourceNode.value || "");
    }
    if (sourceNode.type === "root") {
      return (sourceNode.children || []).map((child) => appendSanitizedNode(child)).join("");
    }
    if (sourceNode.type !== "element") {
      return "";
    }
    const sourceTag = String(
      sourceNode.tagName || ""
    ).toLowerCase();
    if (ANNOUNCEMENT_DROP_CONTENT_TAGS.has(sourceTag)) {
      return "";
    }
    const cleanTag = ANNOUNCEMENT_TAG_ALIASES[sourceTag] || sourceTag;
    const children = (sourceNode.children || []).map((child) => appendSanitizedNode(child)).join("");
    if (!ANNOUNCEMENT_ALLOWED_TAGS.has(cleanTag)) {
      return children;
    }
    let attributes = "";
    if (cleanTag === "a" && sourceNode.attributes) {
      const safeHref = sanitizeAnnouncementHref(
        sourceNode.attributes.href
      );
      if (safeHref) {
        attributes = ` href="${escapeAttributeValue(safeHref)}"`;
      }
    }
    const safeTag = escapeName(cleanTag);
    if (safeTag === "br") {
      return `<br${attributes}>`;
    }
    return `<${safeTag}${attributes}>${children}</${safeTag}>`;
  }
  function sanitizeAnnouncementHTML(value) {
    if (value === null || value === void 0) {
      return "";
    }
    const parsedTree = parseAnnouncementFragment(String(value));
    return appendSanitizedNode(parsedTree);
  }

  // ../src/utils/validation.js
  var validation_exports = {};
  __export(validation_exports, {
    findMissingFields: () => findMissingFields,
    isFiniteNumber: () => isFiniteNumber,
    isNonEmptyString: () => isNonEmptyString,
    isOneOf: () => isOneOf,
    isValidDate: () => isValidDate
  });
  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
  }
  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }
  function isValidDate(value) {
    return value instanceof Date && !Number.isNaN(value.getTime());
  }
  function isOneOf(value, allowed) {
    return new Set(allowed).has(value);
  }
  function findMissingFields(source, requiredFields) {
    const target = source && typeof source === "object" ? source : {};
    return requiredFields.filter((field) => {
      const value = target[field];
      return value === void 0 || value === null || value === "";
    });
  }
  return __toCommonJS(entry_exports);
})();
