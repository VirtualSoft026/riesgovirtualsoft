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
    activeSessionPayload: () => active_session_payload_exports,
    activeSessionStatus: () => active_session_status_exports,
    activeSupervisors: () => active_supervisors_exports,
    announcementCapabilities: () => announcement_capabilities_exports,
    announcementRepository: () => firebase_announcement_repository_exports,
    announcementService: () => announcement_service_exports,
    announcementsController: () => announcements_controller_exports,
    appInitRules: () => app_init_rules_exports,
    appRouter: () => app_router_exports,
    approvalBoxes: () => approval_boxes_exports,
    approvalPolicy: () => approval_policy_exports,
    approvalsController: () => approvals_controller_exports,
    approvalsRepository: () => firebase_approvals_repository_exports,
    approvedCountView: () => approved_count_view_exports,
    approvedCounter: () => approved_counter_exports,
    approvedCounterService: () => approved_counter_service_exports,
    authService: () => auth_service_exports,
    breakButton: () => break_button_exports,
    breakStateOwnership: () => break_state_ownership_exports,
    breakTransitions: () => break_transitions_exports,
    clockFormat: () => clock_format_exports,
    configGestoresController: () => config_gestores_controller_exports,
    configRepository: () => firebase_config_repository_exports,
    constants: () => constants_exports,
    cronogramParser: () => cronogram_parser_exports,
    dateTime: () => date_time_exports,
    docLinks: () => doc_links_exports,
    effectiveTime: () => effective_time_exports,
    excel: () => excel_exports,
    exceptionJustification: () => exception_justification_exports,
    extraTask: () => extra_task_exports,
    formSubmit: () => formsubmit_notification_adapter_exports,
    gestorConfig: () => gestor_config_exports,
    idleDetector: () => idle_detector_adapter_exports,
    incidentRepository: () => firebase_incident_repository_exports,
    incidentService: () => incident_service_exports,
    incidentsController: () => incidents_controller_exports,
    incidentsView: () => incidents_view_exports,
    kpiAnalysisView: () => operativo_analysis_view_exports,
    kpiChartConfigs: () => operativo_chart_configs_exports,
    kpiChartPlan: () => operativo_chart_plan_exports,
    kpiController: () => kpi_controller_exports,
    kpiExecutiveReport: () => executive_report_exports,
    kpiMetrics: () => metrics_calculator_exports,
    kpiOperativoAnalysis: () => operativo_analysis_exports,
    kpiOperativoTableView: () => operativo_table_view_exports,
    kpiOperativosSource: () => kpi_operativos_source_exports,
    kpiRepository: () => firebase_kpi_repository_exports,
    kpiService: () => kpi_service_exports,
    kpiSupervisorDirectory: () => supervisor_directory_exports,
    kpiTaskDetails: () => kpi_task_details_exports,
    listNotice: () => list_notice_exports,
    localSessionStorage: () => local_session_storage_exports,
    loginHistory: () => login_history_exports,
    loginHistoryController: () => login_history_controller_exports,
    loginHistoryRepository: () => firebase_login_history_repository_exports,
    modalView: () => modal_exports,
    monitoringController: () => monitoring_controller_exports,
    monitoringRepository: () => firebase_monitoring_repository_exports,
    monitoringView: () => monitoring_view_exports,
    multiSelect: () => multi_select_exports,
    normalize: () => normalize_exports,
    notificationRules: () => notification_rules_exports,
    notificationsController: () => notifications_controller_exports,
    notificationsRepository: () => firebase_notifications_repository_exports,
    pendingPermissionsTable: () => pending_permissions_table_exports,
    pendingUsersTable: () => pending_users_table_exports,
    permissionHistoryView: () => permission_history_view_exports,
    permissionService: () => permission_service_exports,
    presenceService: () => presence_service_exports,
    profileController: () => profile_controller_exports,
    quickDocs: () => quick_docs_exports,
    quickDocsView: () => quick_docs_view_exports,
    result: () => result_exports,
    roles: () => roles_exports,
    routes: () => routes_exports,
    sanitization: () => sanitization_exports,
    scheduleService: () => schedule_service_exports,
    scheduleSheet: () => schedule_sheet_exports,
    shiftActivityController: () => shift_activity_controller_exports,
    shiftCalculator: () => shift_calculator_exports,
    shiftClosureRules: () => shift_closure_rules_exports,
    shiftController: () => shift_controller_exports,
    shiftExpiration: () => shift_expiration_exports,
    shiftReportBuilder: () => shift_report_builder_exports,
    shiftReportView: () => shift_report_view_exports,
    shiftReportsController: () => shift_reports_controller_exports,
    shiftReportsHtml: () => shift_reports_view_exports,
    shiftReportsRepository: () => firebase_shift_reports_repository_exports,
    splitShiftPolicy: () => split_shift_policy_exports,
    supervisorBadgeController: () => supervisor_badge_controller_exports,
    taskCatalog: () => task_catalog_exports,
    taskController: () => task_controller_exports,
    taskLoadersController: () => task_loaders_controller_exports,
    taskProgress: () => task_progress_exports,
    taskReconciler: () => task_reconciler_exports,
    taskRecovery: () => task_recovery_exports,
    taskReport: () => task_report_exports,
    taskRepository: () => firebase_task_repository_exports,
    taskSaveRules: () => task_save_rules_exports,
    taskSelection: () => task_selection_exports,
    taskService: () => task_service_exports,
    taskSessionSync: () => task_session_sync_exports,
    taskTreeView: () => task_tree_view_exports,
    teletrabajoSheet: () => teletrabajo_sheet_exports,
    timeMetrics: () => time_metrics_exports,
    timelineService: () => timeline_service_exports,
    treeToggle: () => tree_toggle_exports,
    userApprovalList: () => user_approval_list_exports,
    validation: () => validation_exports,
    withdrawalMetrics: () => withdrawal_metrics_exports
  });

  // ../src/controllers/shift-controller.js
  var shift_controller_exports = {};
  __export(shift_controller_exports, {
    BLOCK_MESSAGE: () => BLOCK_MESSAGE,
    BREAK_STATE_FIELDS: () => BREAK_STATE_FIELDS,
    createShiftController: () => createShiftController
  });

  // ../src/domain/shifts/break-transitions.js
  var break_transitions_exports = {};
  __export(break_transitions_exports, {
    toggleBreak: () => toggleBreak
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
    MINUTES_PER_DAY: () => MINUTES_PER_DAY,
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
  var MINUTES_PER_DAY = 24 * 60;
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

  // ../src/domain/shifts/split-shift-policy.js
  var split_shift_policy_exports = {};
  __export(split_shift_policy_exports, {
    SPLIT_SHIFT_BLOCK_REASON: () => SPLIT_SHIFT_BLOCK_REASON,
    canToggleSplitShiftBreak: () => canToggleSplitShiftBreak,
    isSplitShiftEnabled: () => isSplitShiftEnabled,
    shouldShowSplitShiftButton: () => shouldShowSplitShiftButton
  });
  var SPLIT_SHIFT_BLOCK_REASON = Object.freeze({
    OTHER_BREAK_ACTIVE: "OTHER_BREAK_ACTIVE",
    SPLIT_SHIFT_NOT_ENABLED: "SPLIT_SHIFT_NOT_ENABLED"
  });
  function isSplitShiftEnabled(user) {
    return Boolean(user) && user.hasSplitShift === true;
  }
  function shouldShowSplitShiftButton(user, state = {}) {
    if (!user || user.role !== "Gestor") return false;
    return user.hasSplitShift === true || state.isSplitShiftBreak === true;
  }
  function canToggleSplitShiftBreak(user, state = {}) {
    if (!user) return false;
    if (state.isSplitShiftBreak === true) return true;
    return user.hasSplitShift === true;
  }

  // ../src/domain/shifts/break-transitions.js
  var BREAK_KINDS = Object.freeze({
    breakfast: {
      activeField: "isBreakfastBreak",
      startField: "breakfastStartTime",
      totalField: "totalBreakfastTimeMs",
      eventType: TIMELINE_EVENT.BREAKFAST,
      others: ["isLunchBreak", "isSplitShiftBreak"]
    },
    lunch: {
      activeField: "isLunchBreak",
      startField: "lunchStartTime",
      totalField: "totalLunchTimeMs",
      eventType: TIMELINE_EVENT.LUNCH,
      others: ["isBreakfastBreak", "isSplitShiftBreak"]
    },
    split: {
      activeField: "isSplitShiftBreak",
      startField: "splitShiftStartTime",
      totalField: "totalSplitShiftTimeMs",
      eventType: TIMELINE_EVENT.SHIFT_BREAK,
      others: ["isBreakfastBreak", "isLunchBreak"]
    }
  });
  function toggleBreak(state, kind, now = Date.now(), options = {}) {
    const config = BREAK_KINDS[kind];
    if (!config) {
      throw new Error(`Tipo de pausa desconocido: ${kind}`);
    }
    const current = state || {};
    if (!current[config.activeField]) {
      if (kind === "split" && !(options && options.splitShiftEnabled === true)) {
        return {
          blocked: true,
          blockedReason: SPLIT_SHIFT_BLOCK_REASON.SPLIT_SHIFT_NOT_ENABLED,
          action: null,
          state: { ...current },
          timelineEvent: null,
          effects: { saveState: false, syncFirebase: false, updateActivity: false }
        };
      }
      if (config.others.some((field) => current[field])) {
        return {
          blocked: true,
          blockedReason: SPLIT_SHIFT_BLOCK_REASON.OTHER_BREAK_ACTIVE,
          action: null,
          state: { ...current },
          timelineEvent: null,
          effects: { saveState: false, syncFirebase: false, updateActivity: false }
        };
      }
      return {
        blocked: false,
        blockedReason: null,
        action: "start",
        state: {
          ...current,
          [config.activeField]: true,
          [config.startField]: now
        },
        timelineEvent: { type: config.eventType, action: "start" },
        effects: { saveState: true, syncFirebase: true, updateActivity: false }
      };
    }
    const startedAt = current[config.startField];
    const total = current[config.totalField] || 0;
    return {
      blocked: false,
      blockedReason: null,
      action: "end",
      state: {
        ...current,
        [config.activeField]: false,
        [config.totalField]: startedAt ? total + (now - startedAt) : total,
        [config.startField]: null
      },
      timelineEvent: { type: config.eventType, action: "end" },
      effects: { saveState: true, syncFirebase: true, updateActivity: true }
    };
  }

  // ../src/domain/shifts/shift-calculator.js
  var shift_calculator_exports = {};
  __export(shift_calculator_exports, {
    calculateConnectivityPenalty: () => calculateConnectivityPenalty,
    calculateEffectiveHours: () => calculateEffectiveHours,
    calculateShiftClosureTimes: () => calculateShiftClosureTimes,
    defaultState: () => defaultState,
    normalizeState: () => normalizeState
  });

  // ../src/domain/shifts/effective-time.js
  var effective_time_exports = {};
  __export(effective_time_exports, {
    REPORT_INACTIVITY_SOURCE: () => REPORT_INACTIVITY_SOURCE,
    computeEffectiveMinutes: () => computeEffectiveMinutes,
    computeSavedReportEffectiveMinutes: () => computeSavedReportEffectiveMinutes,
    formatEffectiveHours: () => formatEffectiveHours,
    resolveReportInactivityMinutes: () => resolveReportInactivityMinutes
  });
  var REPORT_INACTIVITY_SOURCE = Object.freeze({
    /** Campo `inactividadTotalMins` del reporte (inactividad de la bitácora consolidada, 1 decimal). */
    STORED: "inactividadTotalMins",
    /** Reporte antiguo sin `inactividadTotalMins`: penalidad − exceso de almuerzo − exceso de desayuno. */
    DERIVED_FROM_PENALTY: "penalidad-menos-excesos",
    /** Sin ninguno de los dos datos: se toma 0. */
    NONE: "sin-dato"
  });
  function finiteOrZero(value) {
    const n = typeof value === "string" ? parseFloat(value) : value;
    return typeof n === "number" && Number.isFinite(n) ? n : 0;
  }
  function computeEffectiveMinutes({
    shiftMinutes,
    lunchMinutes = 0,
    breakfastMinutes = 0,
    splitShiftMinutes = 0,
    inactivityMinutes = 0
  }) {
    const effective = finiteOrZero(shiftMinutes) - finiteOrZero(lunchMinutes) - finiteOrZero(breakfastMinutes) - finiteOrZero(splitShiftMinutes) - finiteOrZero(inactivityMinutes);
    return Math.max(0, effective);
  }
  function formatEffectiveHours(minutes) {
    return Math.max(0, finiteOrZero(minutes) / 60).toFixed(2);
  }
  function resolveReportInactivityMinutes(report) {
    const r = report || {};
    const stored = r.inactividadTotalMins;
    if (typeof stored === "number" && Number.isFinite(stored)) {
      return { minutes: Math.max(0, stored), source: REPORT_INACTIVITY_SOURCE.STORED };
    }
    const penalty = r.penalidadConectividadMins;
    if (typeof penalty === "number" && Number.isFinite(penalty)) {
      const extraLunch = Math.max(0, finiteOrZero(r.tiempoAlmuerzoMins) - ALLOWED_LUNCH_MINUTES);
      const extraBreakfast = Math.max(0, finiteOrZero(r.tiempoDesayunoMins) - ALLOWED_BREAKFAST_MINUTES);
      const derived = Math.max(0, parseFloat((penalty - extraLunch - extraBreakfast).toFixed(1)));
      return { minutes: derived, source: REPORT_INACTIVITY_SOURCE.DERIVED_FROM_PENALTY };
    }
    return { minutes: 0, source: REPORT_INACTIVITY_SOURCE.NONE };
  }
  function computeSavedReportEffectiveMinutes(report, shiftMinutes) {
    const r = report || {};
    return computeEffectiveMinutes({
      shiftMinutes,
      lunchMinutes: r.tiempoAlmuerzoMins,
      breakfastMinutes: r.tiempoDesayunoMins,
      splitShiftMinutes: r.tiempoPausaTurnoMins,
      inactivityMinutes: resolveReportInactivityMinutes(r).minutes
    });
  }

  // ../src/domain/shifts/shift-calculator.js
  function calculateConnectivityPenalty({ lunchMs, breakfastMs, inactivityMins }) {
    const lunchMinutes = parseFloat((lunchMs / (1e3 * 60)).toFixed(1));
    const breakfastMinutes = parseFloat((breakfastMs / (1e3 * 60)).toFixed(1));
    const extraLunch = Math.max(0, lunchMinutes - ALLOWED_LUNCH_MINUTES);
    const extraBreakfast = Math.max(0, breakfastMinutes - ALLOWED_BREAKFAST_MINUTES);
    const penaltyMins = parseFloat((extraLunch + extraBreakfast + inactivityMins).toFixed(1));
    return { lunchMinutes, breakfastMinutes, extraLunch, extraBreakfast, penaltyMins };
  }
  function calculateEffectiveHours({ loginMs, endMs, lunchMs, breakfastMs, splitShiftMs = 0, penaltyMins }) {
    const effectiveShiftMs = endMs - loginMs - lunchMs - breakfastMs - splitShiftMs - penaltyMins * 60 * 1e3;
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
  function calculateShiftClosureTimes({
    loginMs,
    endMs,
    lunchMs,
    breakfastMs,
    splitShiftMs = 0,
    inactivityMins,
    effectiveInactivityMins
  }) {
    const penalty = calculateConnectivityPenalty({ lunchMs, breakfastMs, inactivityMins });
    const splitShiftMinutes = parseFloat(((splitShiftMs || 0) / (1e3 * 60)).toFixed(1));
    const deducted = Number.isFinite(effectiveInactivityMins) ? effectiveInactivityMins : Number.isFinite(inactivityMins) ? inactivityMins : 0;
    const effectiveMinutes = computeEffectiveMinutes({
      shiftMinutes: (endMs - loginMs) / (1e3 * 60),
      lunchMinutes: (lunchMs || 0) / (1e3 * 60),
      breakfastMinutes: (breakfastMs || 0) / (1e3 * 60),
      splitShiftMinutes: (splitShiftMs || 0) / (1e3 * 60),
      inactivityMinutes: deducted
    });
    return { ...penalty, splitShiftMinutes, inactivityDeductedMins: deducted, effectiveHours: formatEffectiveHours(effectiveMinutes) };
  }

  // ../src/domain/shifts/shift-report-builder.js
  var shift_report_builder_exports = {};
  __export(shift_report_builder_exports, {
    buildBitacoraText: () => buildBitacoraText,
    buildClosureEmailTimeFields: () => buildClosureEmailTimeFields,
    buildShiftReportObject: () => buildShiftReportObject,
    sumCleanInactivityMinutes: () => sumCleanInactivityMinutes,
    sumInactivityMinutes: () => sumInactivityMinutes
  });
  function sumInactivityMinutes(events, fallbackEndMs) {
    let minutes = 0;
    if (Array.isArray(events)) {
      events.forEach((event) => {
        if (event.type === "Inactividad") {
          const eventEnd = event.end ? event.end : fallbackEndMs;
          minutes += (eventEnd - event.start) / (1e3 * 60);
        }
      });
    }
    return minutes;
  }
  function sumCleanInactivityMinutes(events, fallbackEndMs) {
    return parseFloat(sumInactivityMinutes(events, fallbackEndMs).toFixed(1));
  }
  function defaultFormatClock(ms) {
    return new Date(ms).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  }
  function buildBitacoraText(cleanTimeline, formatClock = defaultFormatClock) {
    if (!Array.isArray(cleanTimeline) || cleanTimeline.length === 0) {
      return "No se registraron pausas o inactividades.";
    }
    let text = "";
    cleanTimeline.forEach((event) => {
      const start = formatClock(event.start);
      const end = event.end ? formatClock(event.end) : "No regres\xF3";
      text += `- ${event.type}: inicio ${start} fin ${end}
`;
    });
    return text;
  }
  function buildShiftReportObject(input) {
    const {
      uid,
      localUser,
      loginDate,
      now,
      setSelectValue,
      report,
      tasks,
      cleanTimeline,
      penaltyMins,
      cleanInactivityMins,
      lunchMinutes,
      breakfastMinutes,
      totalSplitShiftTimeMs
    } = input;
    return {
      uid,
      gestor: localUser.name,
      rol: localUser.role,
      horaInicio: loginDate.toLocaleString(),
      horaFin: now.toLocaleString(),
      turnoProgramado: localUser.shift || "Por Asignar",
      setTrabajado: setSelectValue === null || setSelectValue === void 0 ? "N/A" : setSelectValue,
      reporte: report,
      tasks,
      timeline: cleanTimeline,
      penalidadConectividadMins: penaltyMins,
      inactividadTotalMins: cleanInactivityMins,
      tiempoAlmuerzoMins: lunchMinutes,
      tiempoDesayunoMins: breakfastMinutes,
      tiempoPausaTurnoMins: totalSplitShiftTimeMs ? parseFloat((totalSplitShiftTimeMs / 6e4).toFixed(1)) : 0,
      timestamp: now.getTime()
    };
  }
  function buildClosureEmailTimeFields(times, totalSplitShiftTimeMs = 0) {
    const fields = [
      ["Tiempo_Almuerzo_Descontado", `${times.lunchMinutes} minutos`],
      ["Tiempo_Desayuno_Descontado", `${times.breakfastMinutes} minutos`]
    ];
    if (totalSplitShiftTimeMs > 0) {
      fields.push(["Tiempo_Pausa_Turno_Descontado", `${times.splitShiftMinutes} minutos`]);
    }
    fields.push(["Exceso_Pausas_Penalidad", `${times.penaltyMins} minutos`]);
    fields.push(["Horas_Efectivas_Trabajadas", `${times.effectiveHours} hrs`]);
    return fields;
  }

  // ../src/domain/shifts/active-session-payload.js
  var active_session_payload_exports = {};
  __export(active_session_payload_exports, {
    buildBreakPayloadFields: () => buildBreakPayloadFields,
    resolveLiveStatus: () => resolveLiveStatus
  });

  // ../src/domain/analytics/active-session-status.js
  var active_session_status_exports = {};
  __export(active_session_status_exports, {
    SESSION_HEARTBEAT_TIMEOUT_MS: () => SESSION_HEARTBEAT_TIMEOUT_MS,
    SESSION_STATUS: () => SESSION_STATUS,
    isSessionOnlineForFilter: () => isSessionOnlineForFilter,
    resolveSessionDisplay: () => resolveSessionDisplay
  });
  var SESSION_STATUS = Object.freeze({
    ONLINE: "En L\xEDnea",
    INACTIVE: "Inactivo",
    LUNCH: "En Almuerzo",
    BREAKFAST: "En Desayuno",
    SHIFT_BREAK: "En Pausa de Turno"
  });
  var SESSION_HEARTBEAT_TIMEOUT_MS = 12e4;
  var BREAK_STATUSES = /* @__PURE__ */ new Set([
    SESSION_STATUS.LUNCH,
    SESSION_STATUS.BREAKFAST,
    SESSION_STATUS.SHIFT_BREAK
  ]);
  function hasRecentHeartbeat(session, nowMs) {
    return session && session.lastActive ? nowMs - session.lastActive < SESSION_HEARTBEAT_TIMEOUT_MS : false;
  }
  function isSessionOnlineForFilter(session, nowMs = Date.now()) {
    if (!hasRecentHeartbeat(session, nowMs)) return false;
    if (BREAK_STATUSES.has(session.status) || session.status === SESSION_STATUS.INACTIVE) return false;
    return true;
  }
  function resolveSessionDisplay(session, nowMs = Date.now()) {
    let isOnline = hasRecentHeartbeat(session, nowMs);
    let status = session ? session.status : void 0;
    if (!isOnline && !BREAK_STATUSES.has(status)) {
      status = SESSION_STATUS.INACTIVE;
    }
    let displayStatus = isOnline ? "En L\xEDnea" : "Inactivo";
    if (status === SESSION_STATUS.LUNCH) {
      displayStatus = "En Almuerzo/Cena \u{1F37D}\uFE0F";
    } else if (status === SESSION_STATUS.BREAKFAST) {
      displayStatus = "En Desayuno \u2615";
    } else if (status === SESSION_STATUS.SHIFT_BREAK) {
      displayStatus = "En Pausa de Turno \u23F8\uFE0F";
    } else if (status === SESSION_STATUS.INACTIVE) {
      isOnline = false;
      displayStatus = "Inactivo \u{1F4A4}";
    } else if (status === SESSION_STATUS.ONLINE) {
      displayStatus = "En L\xEDnea";
    }
    return { status, displayStatus, isOnline, isBreak: BREAK_STATUSES.has(status) };
  }

  // ../src/domain/shifts/active-session-payload.js
  function resolveLiveStatus(state, isInactive) {
    const current = state || {};
    if (current.isSplitShiftBreak) return SESSION_STATUS.SHIFT_BREAK;
    if (current.isLunchBreak) return SESSION_STATUS.LUNCH;
    if (current.isBreakfastBreak) return SESSION_STATUS.BREAKFAST;
    if (isInactive) return SESSION_STATUS.INACTIVE;
    return SESSION_STATUS.ONLINE;
  }
  function buildBreakPayloadFields(state) {
    const current = state || {};
    const inPause = current.isSplitShiftBreak === true && Number.isFinite(current.splitShiftStartTime);
    return {
      splitShiftStartTime: inPause ? current.splitShiftStartTime : null,
      totalSplitShiftTimeMs: Number.isFinite(current.totalSplitShiftTimeMs) ? current.totalSplitShiftTimeMs : 0
    };
  }

  // ../src/ui/components/break-button.js
  var break_button_exports = {};
  __export(break_button_exports, {
    BREAK_BUTTON_IDS: () => BREAK_BUTTON_IDS,
    applyBreakButtonView: () => applyBreakButtonView,
    getBreakButtonView: () => getBreakButtonView
  });
  var INACTIVE_STYLE = Object.freeze({
    backgroundColor: "",
    color: "var(--text-primary)",
    borderColor: "rgba(255,255,255,0.2)",
    boxShadow: ""
  });
  var BUTTON_VIEWS = Object.freeze({
    breakfast: Object.freeze({
      activeHtml: "<i class='bx bx-check-circle'></i> Volver del Desayuno",
      inactiveHtml: "<i class='bx bx-coffee'></i> Tomar Desayuno",
      active: Object.freeze({
        backgroundColor: "rgba(255, 152, 0, 0.15)",
        color: "#ff9800",
        borderColor: "rgba(255, 152, 0, 0.5)",
        boxShadow: "0 0 15px rgba(255, 152, 0, 0.2)"
      })
    }),
    lunch: Object.freeze({
      activeHtml: "<i class='bx bx-check-circle'></i> Volver del Almuerzo/Cena",
      inactiveHtml: "<i class='bx bx-restaurant'></i> Tomar Almuerzo/Cena",
      active: Object.freeze({
        backgroundColor: "rgba(0, 188, 212, 0.15)",
        color: "#00bcd4",
        borderColor: "rgba(0, 188, 212, 0.5)",
        boxShadow: "0 0 15px rgba(0, 188, 212, 0.2)"
      })
    }),
    split: Object.freeze({
      activeHtml: "<i class='bx bx-check-circle'></i> Retomar Turno",
      inactiveHtml: "<i class='bx bx-pause-circle'></i> Pausa de Turno",
      active: Object.freeze({
        backgroundColor: "rgba(139, 92, 246, 0.15)",
        color: "#8b5cf6",
        borderColor: "rgba(139, 92, 246, 0.5)",
        boxShadow: "0 0 15px rgba(139, 92, 246, 0.2)"
      })
    })
  });
  var BREAK_BUTTON_IDS = Object.freeze({
    breakfast: "toggleBreakfastBtn",
    lunch: "toggleLunchBtn",
    split: "toggleSplitShiftBtn"
  });
  function getBreakButtonView(kind, active) {
    const config = BUTTON_VIEWS[kind];
    if (!config) {
      throw new Error(`Tipo de pausa desconocido: ${kind}`);
    }
    return active ? { innerHTML: config.activeHtml, outline: false, ...config.active } : { innerHTML: config.inactiveHtml, outline: true, ...INACTIVE_STYLE };
  }
  function applyBreakButtonView(button, kind, active) {
    if (!button) return;
    const view = getBreakButtonView(kind, active);
    button.innerHTML = view.innerHTML;
    if (view.outline) {
      button.classList.add("btn-outline");
    } else {
      button.classList.remove("btn-outline");
    }
    button.style.backgroundColor = view.backgroundColor;
    button.style.color = view.color;
    button.style.borderColor = view.borderColor;
    button.style.boxShadow = view.boxShadow;
  }

  // ../src/controllers/shift-controller.js
  var BREAK_STATE_FIELDS = Object.freeze([
    "isLunchBreak",
    "lunchStartTime",
    "totalLunchTimeMs",
    "isBreakfastBreak",
    "breakfastStartTime",
    "totalBreakfastTimeMs",
    "isSplitShiftBreak",
    "splitShiftStartTime",
    "totalSplitShiftTimeMs"
  ]);
  var ACTIVE_FIELD = Object.freeze({
    breakfast: "isBreakfastBreak",
    lunch: "isLunchBreak",
    split: "isSplitShiftBreak"
  });
  var END_SHIFT_CLOSE_ORDER = Object.freeze(["lunch", "breakfast", "split"]);
  var BLOCK_MESSAGE = Object.freeze({
    [SPLIT_SHIFT_BLOCK_REASON.OTHER_BREAK_ACTIVE]: "Debes volver del descanso actual primero.",
    [SPLIT_SHIFT_BLOCK_REASON.SPLIT_SHIFT_NOT_ENABLED]: "La Pausa de Turno no est\xE1 habilitada para tu usuario. P\xEDdele a tu supervisor que la active.",
    NO_USER: ""
  });
  function pickBreakFields(state) {
    const picked = {};
    BREAK_STATE_FIELDS.forEach((field) => {
      picked[field] = state[field];
    });
    return picked;
  }
  function createShiftController(deps) {
    const {
      getUser,
      getState,
      applyState,
      reloadState,
      setUserFlag,
      now = Date.now,
      timeline,
      storage,
      sync,
      onActivity,
      ui,
      logger = console
    } = deps;
    function readState() {
      return pickBreakFields(getState() || {});
    }
    function syncAndTrack() {
      let pending;
      try {
        pending = sync();
      } catch (error) {
        if (ui.setSyncWarning) ui.setSyncWarning(true, error);
        logger.warn("Fallo al sincronizar la sesi\xF3n activa:", error);
        return Promise.resolve({ ok: false, error });
      }
      if (!pending || typeof pending.then !== "function") {
        return Promise.resolve({ ok: true });
      }
      return pending.then(
        () => {
          if (ui.setSyncWarning) ui.setSyncWarning(false);
          return { ok: true };
        },
        (error) => {
          if (ui.setSyncWarning) ui.setSyncWarning(true, error);
          logger.warn("Fallo al sincronizar la sesi\xF3n activa:", error);
          return { ok: false, error };
        }
      );
    }
    function isSplitShiftButtonVisible() {
      return shouldShowSplitShiftButton(getUser(), { isSplitShiftBreak: readState().isSplitShiftBreak });
    }
    function refreshSplitShiftButton() {
      const visible = isSplitShiftButtonVisible();
      ui.setSplitShiftVisible(visible);
      return visible;
    }
    function renderBreakButtons({ onlyActive = false } = {}) {
      const state = readState();
      Object.keys(ACTIVE_FIELD).forEach((kind) => {
        const active = state[ACTIVE_FIELD[kind]] === true;
        if (onlyActive && !active) return;
        applyBreakButtonView(ui.getButton(BREAK_BUTTON_IDS[kind]), kind, active);
      });
    }
    function toggle(kind) {
      const user = getUser();
      if (!user) {
        return { blocked: true, blockedReason: "NO_USER", action: null, syncPromise: Promise.resolve({ ok: true }) };
      }
      const state = readState();
      const result = toggleBreak(state, kind, now(), { splitShiftEnabled: isSplitShiftEnabled(user) });
      if (result.blocked) {
        if (ui.notifyBlocked) ui.notifyBlocked(result.blockedReason, BLOCK_MESSAGE[result.blockedReason] || "");
        if (kind === "split") refreshSplitShiftButton();
        return { ...result, syncPromise: Promise.resolve({ ok: true }) };
      }
      applyState(pickBreakFields(result.state));
      timeline.push(result.timelineEvent.type, result.timelineEvent.action);
      storage.saveBreakState();
      applyBreakButtonView(ui.getButton(BREAK_BUTTON_IDS[kind]), kind, result.action === "start");
      if (result.effects.updateActivity && onActivity) onActivity();
      if (kind === "split") refreshSplitShiftButton();
      return { ...result, syncPromise: syncAndTrack() };
    }
    function handleFlagChange(rawValue) {
      const user = getUser();
      if (!user) return { changed: false, visible: false };
      const value = rawValue === true;
      if (user.hasSplitShift === value) {
        return { changed: false, visible: isSplitShiftButtonVisible() };
      }
      if (setUserFlag) setUserFlag(value);
      const visible = refreshSplitShiftButton();
      if (ui.refreshSidebar) ui.refreshSidebar();
      return { changed: true, visible };
    }
    function handleStorageChange(key) {
      if (key !== STORAGE_KEYS.BREAK_STATE) return false;
      if (reloadState) reloadState();
      renderBreakButtons();
      refreshSplitShiftButton();
      return true;
    }
    function restoreOnLoad() {
      renderBreakButtons({ onlyActive: true });
      refreshSplitShiftButton();
    }
    function closeOpenBreaks() {
      const closed = [];
      END_SHIFT_CLOSE_ORDER.forEach((kind) => {
        if (readState()[ACTIVE_FIELD[kind]]) {
          const result = toggle(kind);
          if (!result.blocked) closed.push(kind);
        }
      });
      return closed;
    }
    function computeShiftClosure({ loginMs, endMs, inactivityMins, cleanInactivityMins }) {
      const state = readState();
      const times = calculateShiftClosureTimes({
        loginMs,
        endMs,
        lunchMs: state.totalLunchTimeMs,
        breakfastMs: state.totalBreakfastTimeMs,
        splitShiftMs: state.totalSplitShiftTimeMs,
        inactivityMins,
        effectiveInactivityMins: cleanInactivityMins
      });
      return { times, emailFields: buildClosureEmailTimeFields(times, state.totalSplitShiftTimeMs) };
    }
    function describeLiveSession(isInactive) {
      const state = readState();
      return { status: resolveLiveStatus(state, isInactive === true), ...buildBreakPayloadFields(state) };
    }
    return {
      toggle,
      toggleBreakfast: () => toggle("breakfast"),
      toggleLunch: () => toggle("lunch"),
      toggleSplitShift: () => toggle("split"),
      isSplitShiftButtonVisible,
      refreshSplitShiftButton,
      renderBreakButtons,
      handleFlagChange,
      handleStorageChange,
      restoreOnLoad,
      closeOpenBreaks,
      computeShiftClosure,
      describeLiveSession
    };
  }

  // ../src/controllers/shift-activity-controller.js
  var shift_activity_controller_exports = {};
  __export(shift_activity_controller_exports, {
    createShiftActivityController: () => createShiftActivityController
  });
  function createShiftActivityController({
    getUser,
    isOnBreak,
    setUserStatus,
    pushTimelineEvent: pushTimelineEvent2,
    onStatusDisplay,
    syncSession,
    now = Date.now,
    logger = console
  }) {
    let _lastActivityTimestamp = now();
    function _applyActive(user) {
      user.status = "Activo";
      pushTimelineEvent2("Inactividad", "end");
      _lastActivityTimestamp = now();
      setUserStatus(user.uid, "Activo");
      onStatusDisplay();
      syncSession();
    }
    function _applyInactive(user) {
      user.status = "Inactivo";
      pushTimelineEvent2("Inactividad", "start");
      setUserStatus(user.uid, "Inactivo");
      onStatusDisplay();
      syncSession();
    }
    function onIdleChange2(isIdle) {
      const user = getUser();
      if (!user || user.role !== "Gestor") return;
      if (isOnBreak()) return;
      if (isIdle && user.status === "Activo") {
        _applyInactive(user);
      } else if (!isIdle && user.status === "Inactivo") {
        _applyActive(user);
      }
    }
    function onActivity() {
      _lastActivityTimestamp = now();
      const user = getUser();
      if (!user || user.role !== "Gestor") return;
      if (user.status === "Inactivo") {
        _applyActive(user);
      }
    }
    function getLastActivityTimestamp2() {
      return _lastActivityTimestamp;
    }
    return { onIdleChange: onIdleChange2, onActivity, getLastActivityTimestamp: getLastActivityTimestamp2 };
  }

  // ../src/controllers/task-controller.js
  var task_controller_exports = {};
  __export(task_controller_exports, {
    countDomTasks: () => countDomTasks,
    createSessionSyncController: () => createSessionSyncController,
    createTaskRecoveryController: () => createTaskRecoveryController,
    createTaskSaveController: () => createTaskSaveController,
    createTaskWorkspaceController: () => createTaskWorkspaceController,
    runStartupDataSequence: () => runStartupDataSequence
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
  var task_reconciler_exports = {};
  __export(task_reconciler_exports, {
    computeLocalTaskMigrations: () => computeLocalTaskMigrations,
    mergeTaskCaches: () => mergeTaskCaches,
    reconcileScheduledTaskWithSession: () => reconcileScheduledTaskWithSession
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

  // ../src/domain/tasks/task-recovery.js
  var task_recovery_exports = {};
  __export(task_recovery_exports, {
    RECOVERY_REMOTE_READ_FAILED_MESSAGE: () => RECOVERY_REMOTE_READ_FAILED_MESSAGE,
    RECOVERY_STATUS: () => RECOVERY_STATUS,
    describeRecoveryAlert: () => describeRecoveryAlert,
    shouldRecoverTaskProgress: () => shouldRecoverTaskProgress
  });
  var RECOVERY_STATUS = Object.freeze({
    OK: "OK",
    REMOTE_READ_FAILED: "REMOTE_READ_FAILED",
    IDENTITY_MISMATCH: "IDENTITY_MISMATCH"
  });
  var RECOVERY_REMOTE_READ_FAILED_MESSAGE = "No se pudo verificar el progreso remoto de tareas en el servidor. Se conserva el respaldo local de este dispositivo; se reintentar\xE1 m\xE1s adelante.";
  function describeRecoveryAlert(recovery) {
    if (recovery.status === RECOVERY_STATUS.REMOTE_READ_FAILED) {
      return RECOVERY_REMOTE_READ_FAILED_MESSAGE;
    }
    if (recovery.failedMigrationsCount > 0) {
      return `No se pudo sincronizar con el servidor el progreso local de ${recovery.failedMigrationsCount} tarea(s). Se conserv\xF3 el respaldo local en este dispositivo; vuelve a guardar esas tareas cuando tengas conexi\xF3n.`;
    }
    return null;
  }
  function shouldRecoverTaskProgress(user) {
    return !!(user && user.role === "Gestor" && user.uid);
  }

  // ../src/domain/tasks/task-session-sync.js
  var task_session_sync_exports = {};
  __export(task_session_sync_exports, {
    APP_VERSION: () => APP_VERSION,
    buildSessionMetadata: () => buildSessionMetadata,
    buildSessionMetadataTail: () => buildSessionMetadataTail,
    decideInactivityTimelineAction: () => decideInactivityTimelineAction,
    isSessionClosedElsewhere: () => isSessionClosedElsewhere,
    resolveIsInactive: () => resolveIsInactive,
    resolveLoginTime: () => resolveLoginTime,
    shouldSyncActiveSession: () => shouldSyncActiveSession
  });
  var APP_VERSION = "v104";
  var GESTOR_ROLE = "Gestor";
  function shouldSyncActiveSession(user) {
    if (!user || user.role !== GESTOR_ROLE) return false;
    return !!user.uid;
  }
  function isSessionClosedElsewhere(storedUserRaw) {
    return !storedUserRaw;
  }
  function resolveLoginTime(user, nowIso) {
    return user.loginTime || nowIso();
  }
  function resolveIsInactive({ idleDetectorGranted: idleDetectorGranted2, globalIdleState, domIdleFallback }) {
    if (idleDetectorGranted2) return globalIdleState;
    return domIdleFallback() ? true : false;
  }
  function decideInactivityTimelineAction(currentStatus, previousStatus) {
    if (currentStatus === "Inactivo" && previousStatus !== "Inactivo") return "start";
    if (currentStatus !== "Inactivo" && previousStatus === "Inactivo") return "end";
    return null;
  }
  function buildSessionMetadata({ user, loginTime, lastActive, status, counters, timeline, appVersion = APP_VERSION }) {
    return {
      name: user.name,
      email: user.email,
      shift: user.shift || "Por Asignar",
      loginTime,
      lastActive,
      status,
      totalTasks: counters.totalTasks,
      finalizedTasks: counters.finalized,
      completedTasks: counters.completedTasks,
      notDoneTasks: counters.notDoneTasks,
      percentage: counters.percentage,
      timeline: timeline || [],
      appVersion
    };
  }
  function buildSessionMetadataTail(counters, timeline, appVersion = APP_VERSION) {
    return {
      finalizedTasks: counters.finalized,
      completedTasks: counters.completedTasks,
      notDoneTasks: counters.notDoneTasks,
      percentage: counters.percentage,
      timeline: timeline || [],
      appVersion
    };
  }

  // ../src/domain/tasks/task-progress.js
  var task_progress_exports = {};
  __export(task_progress_exports, {
    computeKpiFigures: () => computeKpiFigures,
    computeSyncPercentage: () => computeSyncPercentage,
    formatProgress: () => formatProgress
  });
  function formatProgress(current, total) {
    if (!(typeof total === "number" && Number.isFinite(total) && total > 0)) return 0;
    if (!(typeof current === "number" && Number.isFinite(current))) return 0;
    return Math.round(current / total * 100);
  }
  function computeSyncPercentage(counts) {
    const totalTasks = counts.total;
    const completedTasks = counts.completed;
    const notDoneTasks = counts.notDone;
    const finalized = completedTasks + notDoneTasks;
    const percentage = formatProgress(finalized, totalTasks);
    return { totalTasks, completedTasks, notDoneTasks, finalized, percentage };
  }
  function computeKpiFigures(counts, { legacy = false } = {}) {
    const totalTasks = counts.total;
    const completedTasks = counts.completed;
    const notDoneTasks = counts.notDone;
    const finalized = completedTasks + notDoneTasks;
    const pending = totalTasks - finalized;
    let completedPercentage = 0;
    let notDonePercentage = 0;
    let totalPercentage = 0;
    if (totalTasks > 0) {
      completedPercentage = formatProgress(completedTasks, totalTasks);
      notDonePercentage = formatProgress(notDoneTasks, totalTasks);
      totalPercentage = legacy ? completedPercentage + notDonePercentage : formatProgress(finalized, totalTasks);
    }
    return {
      totalTasks,
      completedTasks,
      notDoneTasks,
      finalized,
      pending,
      completedPercentage,
      notDonePercentage,
      totalPercentage
    };
  }

  // ../src/domain/tasks/task-save-rules.js
  var task_save_rules_exports = {};
  __export(task_save_rules_exports, {
    buildTaskRecord: () => buildTaskRecord,
    describeTaskSaveError: () => describeTaskSaveError,
    resolveStatusClassForButton: () => resolveStatusClassForButton,
    validateTaskSaveInput: () => validateTaskSaveInput
  });
  var INVALID_TASK_KEY_PATTERN = /[.#$\[\]/]/;
  function validateTaskSaveInput(input) {
    const { currentActiveTaskId, selectedStatusText, authUser, currentUser, currentSelectedTask } = input;
    if (currentActiveTaskId === null || currentActiveTaskId === void 0) {
      return { ok: false, message: "Selecciona una tarea antes de guardar el progreso." };
    }
    if (selectedStatusText === null || selectedStatusText === void 0) {
      return { ok: false, message: "Selecciona un estado antes de guardar el progreso." };
    }
    const observation = input.observation === null || input.observation === void 0 ? "" : input.observation.trim();
    if (!observation) {
      return { ok: false, message: "OBLIGATORIO: Debes detallar la gesti\xF3n realizada en las Notas T\xE9cnicas antes de guardar." };
    }
    if (!authUser) {
      return { ok: false, message: "Tu sesi\xF3n expir\xF3. Vuelve a iniciar sesi\xF3n para guardar el progreso." };
    }
    if (!currentUser || currentUser.uid !== authUser.uid) {
      return { ok: false, message: "No se pudo verificar tu identidad. Vuelve a iniciar sesi\xF3n para guardar el progreso." };
    }
    const taskId = canonicalTaskId(currentActiveTaskId);
    if (!taskId || INVALID_TASK_KEY_PATTERN.test(taskId)) {
      return { ok: false, message: "La tarea seleccionada tiene un identificador inv\xE1lido y no puede guardarse." };
    }
    if (!currentSelectedTask || canonicalTaskId(currentSelectedTask.id) !== taskId) {
      return { ok: false, message: "No se pudo confirmar la tarea seleccionada. Vuelve a seleccionarla antes de guardar." };
    }
    return { ok: true, taskId, observation };
  }
  function buildTaskRecord(selectedTask, statusText, observation, now) {
    return {
      name: selectedTask["Tarea"],
      status: statusText.trim(),
      observation,
      updatedAt: now
    };
  }
  function resolveStatusClassForButton(buttonClassList) {
    if (buttonClassList.contains("completed")) return "status-completed";
    if (buttonClassList.contains("in-progress")) return "status-in-progress";
    if (buttonClassList.contains("not-done")) return "status-not-done";
    return "status-pending";
  }
  function describeTaskSaveError(error) {
    const errorCode = error && error.code ? error.code : "";
    const isPermissionDenied = errorCode === "PERMISSION_DENIED" || /permission[_ ]denied/i.test(error && error.message || "");
    return {
      isPermissionDenied,
      message: isPermissionDenied ? "No tienes permiso para guardar esta tarea. Contacta a tu supervisor." : "No se pudo guardar el progreso en el servidor. El cambio qued\xF3 respaldado localmente; intenta guardar de nuevo."
    };
  }

  // ../src/domain/tasks/task-selection.js
  var task_selection_exports = {};
  __export(task_selection_exports, {
    buildReviewerTaskDetailText: () => buildReviewerTaskDetailText,
    findCatalogTask: () => findCatalogTask,
    isTaskReviewerRole: () => isTaskReviewerRole
  });
  function isTaskReviewerRole(user) {
    return !!(user && (user.role === "Admin" || user.role === "Supervisor"));
  }
  function findCatalogTask(allTasks, taskId) {
    const canonicalId = canonicalTaskId(taskId);
    return allTasks.find((t) => canonicalTaskId(t.id) === canonicalId);
  }
  function buildReviewerTaskDetailText(task) {
    let detailText = `Detalle: ${task["Detalle de Tarea"] || "Sin detalle"}

`;
    detailText += `Horario: ${task["Horario"] || "No especificado"}
`;
    detailText += `D\xEDa: ${task["D\xEDa"] || "No especificado"}

`;
    detailText += `Instrucciones:
${task["Instrucciones"] || "Sin instrucciones"}`;
    return detailText;
  }

  // ../src/domain/tasks/clock-format.js
  var clock_format_exports = {};
  __export(clock_format_exports, {
    formatClockTime: () => formatClockTime
  });
  function formatClockTime(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  // ../src/ui/views/task-tree-view.js
  var task_tree_view_exports = {};
  __export(task_tree_view_exports, {
    buildTaskKpiHTML: () => buildTaskKpiHTML,
    buildTreeSetHTML: () => buildTreeSetHTML,
    getTaskStatusClass: () => getTaskStatusClass,
    shouldAutoExpandTree: () => shouldAutoExpandTree,
    sortedSetKeys: () => sortedSetKeys
  });

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

  // ../src/ui/views/task-tree-view.js
  function getTaskStatusClass(taskEntry) {
    let statusClass = "status-pending";
    if (taskEntry) {
      const statusText = taskEntry.status;
      if (statusText === TASK_STATUS.DONE) statusClass = "status-completed";
      else if (statusText === TASK_STATUS.IN_PROGRESS) statusClass = "status-in-progress";
      else if (statusText === TASK_STATUS.NOT_DONE) statusClass = "status-not-done";
    }
    return statusClass;
  }
  function sortedSetKeys(tasksBySet) {
    return Object.keys(tasksBySet).sort();
  }
  function shouldAutoExpandTree(sets) {
    return sets.length === 1;
  }
  function buildTreeSetHTML(input) {
    const {
      set,
      tasks,
      taskStateCache,
      shouldAutoExpand,
      escape = escapeHTML,
      encodeArg = encodeInlineHandlerArg
    } = input;
    const total = tasks.length;
    const headerClass = shouldAutoExpand ? "tree-header open" : "tree-header";
    const childrenClass = shouldAutoExpand ? "tree-children show" : "tree-children";
    return `
            <div class="${headerClass}" onclick="toggleTree(this)">
                <i class='bx bx-chevron-right'></i>
                <span>${escape(set)}</span>
                <span class="badge pending">${total} Tareas</span>
            </div>
            <div class="${childrenClass}">
                ${tasks.map((task) => {
      const cId = canonicalTaskId(task.id);
      const taskEntry = taskStateCache[cId] || taskStateCache[task.id];
      const statusClass = getTaskStatusClass(taskEntry);
      return `
                    <div class="task-item" onclick="selectTask(decodeURIComponent('${encodeArg(task.id)}'), event)">
                        <i class='bx bx-file-blank'></i> ${escape(task.name)}
                        <div class="task-status ${statusClass}"></div>
                    </div>
                    `;
    }).join("")}
            </div>
        `;
  }
  function buildTaskKpiHTML(figures) {
    const { totalTasks, completedTasks, notDoneTasks, pending, completedPercentage, notDonePercentage, totalPercentage } = figures;
    return `
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

  // ../src/ui/views/quick-docs-view.js
  var quick_docs_view_exports = {};
  __export(quick_docs_view_exports, {
    buildQuickDocsHTML: () => buildQuickDocsHTML
  });

  // ../src/domain/tasks/quick-docs.js
  var quick_docs_exports = {};
  __export(quick_docs_exports, {
    QUICK_DOC_FILES: () => QUICK_DOC_FILES,
    getQuickDocIconMeta: () => getQuickDocIconMeta,
    matchQuickDoc: () => matchQuickDoc,
    stripDocExtension: () => stripDocExtension
  });
  var QUICK_DOC_FILES = Object.freeze([
    "Instructivo de revisi\xF3n de apuestas casino.pdf",
    "Instructivo de validaci\xF3n de GGR Casino.pdf",
    "Pol\xEDtica Procedimiento De Aprobaci\xF3n De Retiros.pdf",
    "Procedimiento Identificaci\xF3n de jineteo.pdf",
    "Proceso de Eliminaci\xF3n de Cuentas - Implementaciones.pdf",
    "VALIDACI\xD3N DE ABUSO DE BONOS EN CAMPA\xD1AS DE CRM.pdf",
    "Revisi\xF3n de Eventos Deportivos.mp4",
    "Revisi\xF3n de Eventos.mp4",
    "Validaci\xF3n SEON.mp4"
  ]);
  function matchQuickDoc(taskName) {
    if (!taskName) return null;
    const taskNameLower = taskName.toLowerCase();
    if (taskNameLower.includes("ggr")) return "Instructivo de validaci\xF3n de GGR Casino.pdf";
    if (taskNameLower.includes("apuesta")) return "Instructivo de revisi\xF3n de apuestas casino.pdf";
    if (taskNameLower.includes("retiro")) return "Pol\xEDtica Procedimiento De Aprobaci\xF3n De Retiros.pdf";
    if (taskNameLower.includes("jineteo") || taskNameLower.includes("jineteo")) return "Procedimiento Identificaci\xF3n de jineteo.pdf";
    if (taskNameLower.includes("eliminaci")) return "Proceso de Eliminaci\xF3n de Cuentas - Implementaciones.pdf";
    if (taskNameLower.includes("bonos")) return "VALIDACI\xD3N DE ABUSO DE BONOS EN CAMPA\xD1AS DE CRM.pdf";
    if (taskNameLower.includes("deportiv")) return "Revisi\xF3n de Eventos Deportivos.mp4";
    if (taskNameLower.includes("evento")) return "Revisi\xF3n de Eventos.mp4";
    if (taskNameLower.includes("seon")) return "Validaci\xF3n SEON.mp4";
    return null;
  }
  function getQuickDocIconMeta(file) {
    const lower = file.toLowerCase();
    const isVideo = lower.endsWith(".mp4");
    const isWord = lower.endsWith(".docx") || lower.endsWith(".doc");
    const isExcel = lower.endsWith(".xlsx") || lower.endsWith(".xls");
    let icon = "bx-file-pdf";
    let color = "#FF5A5A";
    if (isVideo) {
      icon = "bx-video";
      color = "#3B82F6";
    } else if (isWord) {
      icon = "bx-file-blank";
      color = "#2563EB";
    } else if (isExcel) {
      icon = "bx-table";
      color = "#10B981";
    }
    return { icon, color };
  }
  function stripDocExtension(file) {
    return file.replace(/\.[^/.]+$/, "");
  }

  // ../src/ui/views/quick-docs-view.js
  function buildQuickDocsHTML(selectedTaskName, getDocUrl2) {
    const matchedDoc = matchQuickDoc(selectedTaskName);
    let html = "";
    if (matchedDoc) {
      const { icon, color } = getQuickDocIconMeta(matchedDoc);
      html += `
            <div style="margin-bottom: 12px; background: rgba(0, 180, 216, 0.1); padding: 10px; border-radius: var(--radius-md); border: 1px dashed var(--accent-primary);">
                <span style="font-size: 10px; color: var(--accent-primary); font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                    <i class='bx bxs-star'></i> Sugerido para esta tarea
                </span>
                <a href="${getDocUrl2(matchedDoc)}" target="_blank" rel="noopener noreferrer" class="doc-link" style="background: transparent; padding: 0; display: flex; align-items: center; gap: 10px;">
                    <i class='bx ${icon}' style="font-size: 20px; color: ${color};"></i>
                    <span style="color: var(--text-primary); font-weight: 500; font-size: 13px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${stripDocExtension(matchedDoc)}</span>
                </a>
            </div>
            <div style="height: 1px; background: var(--glass-border); margin: 10px 0;"></div>
        `;
    }
    QUICK_DOC_FILES.forEach((file) => {
      if (file === matchedDoc) return;
      const { icon, color } = getQuickDocIconMeta(file);
      html += `
            <a href="${getDocUrl2(file)}" target="_blank" rel="noopener noreferrer" class="doc-link" style="margin-bottom: 8px;">
                <i class='bx ${icon}' style="font-size: 18px; color: ${color};"></i>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">${stripDocExtension(file)}</span>
            </a>
        `;
    });
    return html;
  }

  // ../src/ui/components/tree-toggle.js
  var tree_toggle_exports = {};
  __export(tree_toggle_exports, {
    toggleTreeElement: () => toggleTreeElement
  });
  function toggleTreeElement(element) {
    element.classList.toggle("open");
    const childrenContainer = element.nextElementSibling;
    if (childrenContainer) {
      childrenContainer.classList.toggle("show");
    }
  }

  // ../src/controllers/task-controller.js
  function countDomTasks(doc) {
    return {
      total: doc.querySelectorAll(".task-item").length,
      completed: doc.querySelectorAll(".task-item .status-completed").length,
      notDone: doc.querySelectorAll(".task-item .status-not-done").length
    };
  }
  function createTaskRecoveryController(deps) {
    const { repository, getTaskCache, setTaskCache, saveTaskCache = () => {
    }, getAuthUser, logger = console } = deps;
    const alertFn = deps.alert || (() => {
    });
    async function recoverGestorTaskProgress(uid) {
      const remoteResult = await repository.fetchOwnActiveSessionTasks(uid);
      if (!remoteResult.ok) {
        return { status: RECOVERY_STATUS.REMOTE_READ_FAILED, failedMigrationsCount: 0 };
      }
      setTaskCache(mergeTaskCaches(getTaskCache(), remoteResult.tasks));
      try {
        saveTaskCache(getTaskCache());
      } catch (e) {
      }
      const authUser = getAuthUser();
      if (!authUser || authUser.uid !== uid) {
        logger.error("No se pudo verificar la identidad autenticada antes de migrar el progreso local; se omite la migraci\xF3n.");
        return { status: RECOVERY_STATUS.IDENTITY_MISMATCH, failedMigrationsCount: 0 };
      }
      const { failed } = await repository.migrateLocalTasksToActiveSession(uid, getTaskCache(), remoteResult.tasks);
      return { status: RECOVERY_STATUS.OK, failedMigrationsCount: failed.length };
    }
    async function runStartupRecovery(user) {
      if (!shouldRecoverTaskProgress(user)) return { ran: false };
      try {
        const recovery = await recoverGestorTaskProgress(user.uid);
        const message = describeRecoveryAlert(recovery);
        if (message) alertFn(message);
        return { ran: true, recovery, alerted: message };
      } catch (e) {
        logger.error("No se pudo recuperar el progreso remoto de tareas al iniciar:", e);
        return { ran: true, error: e };
      }
    }
    return { recoverGestorTaskProgress, runStartupRecovery };
  }
  function createSessionSyncController(deps) {
    const {
      getUser,
      clearUser,
      getStoredUserRaw,
      redirectToLogin,
      doc,
      now = Date.now,
      nowIso = () => (/* @__PURE__ */ new Date()).toISOString(),
      markSyncLoop = () => {
      },
      loadBreakState: loadBreakState2 = () => {
      },
      idle,
      describeLiveSession,
      getLocalStatus,
      setLocalStatus,
      pushTimelineEvent: pushTimelineEvent2,
      getTimeline,
      repository
    } = deps;
    function syncActiveSession() {
      const currentUser = getUser();
      if (!shouldSyncActiveSession(currentUser)) return Promise.resolve();
      const uid = currentUser.uid;
      if (isSessionClosedElsewhere(getStoredUserRaw())) {
        clearUser();
        redirectToLogin();
        return Promise.resolve();
      }
      const counters = computeSyncPercentage(countDomTasks(doc));
      const loginTime = resolveLoginTime(currentUser, nowIso);
      const nowMs = now();
      markSyncLoop(nowMs);
      loadBreakState2();
      const newLastActive = now();
      const isInactive = resolveIsInactive({
        idleDetectorGranted: idle.isGranted(),
        globalIdleState: idle.getGlobalIdleState(),
        domIdleFallback: () => idle.domFallback(nowMs)
      });
      const live = describeLiveSession(isInactive);
      const currentStatus = live.status;
      const action = decideInactivityTimelineAction(currentStatus, getLocalStatus());
      if (action) pushTimelineEvent2("Inactividad", action);
      setLocalStatus(currentStatus);
      const sessionMetadata = {
        ...buildSessionMetadata({
          user: currentUser,
          loginTime,
          lastActive: newLastActive,
          status: currentStatus,
          counters,
          timeline: getTimeline()
        }),
        splitShiftStartTime: live.splitShiftStartTime,
        totalSplitShiftTimeMs: live.totalSplitShiftTimeMs
      };
      return repository.syncSessionMetadata(uid, sessionMetadata);
    }
    return { syncActiveSession };
  }
  function createTaskSaveController(deps) {
    const {
      doc,
      saveButton,
      getAuthUser,
      getUser,
      getActiveTaskId,
      getSelectedTask,
      getTaskCache,
      saveTaskCache = () => {
      },
      repository,
      updateKPI,
      alert: alertFn,
      now = Date.now,
      logger = console
    } = deps;
    const schedule = deps.setTimeout || ((fn, ms) => setTimeout(fn, ms));
    let isSavingTask = false;
    async function saveTaskProgress() {
      if (isSavingTask) return { saved: false, reason: "IN_PROGRESS" };
      const selectedStatusBtn = doc.querySelector(".btn-status.active");
      const obsField = doc.getElementById("taskObservation");
      const validation = validateTaskSaveInput({
        currentActiveTaskId: getActiveTaskId(),
        selectedStatusText: selectedStatusBtn ? selectedStatusBtn.textContent : null,
        observation: obsField ? obsField.value : "",
        authUser: getAuthUser(),
        currentUser: getUser(),
        currentSelectedTask: getSelectedTask()
      });
      if (!validation.ok) {
        alertFn(validation.message);
        return { saved: false, reason: "INVALID" };
      }
      const authUser = getAuthUser();
      const taskIdStr = validation.taskId;
      const btn = saveButton;
      const prevText = btn.innerHTML;
      isSavingTask = true;
      btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";
      btn.disabled = true;
      btn.classList.remove("btn-success", "btn-error");
      const taskRecord = buildTaskRecord(getSelectedTask(), selectedStatusBtn.textContent, validation.observation, now());
      const cache = getTaskCache();
      cache[taskIdStr] = taskRecord;
      try {
        saveTaskCache(cache);
      } catch (e) {
      }
      try {
        const visualTaskElement = doc.querySelector(".task-item.active .task-status");
        const statusClassToAdd = resolveStatusClassForButton(selectedStatusBtn.classList);
        await repository.persistTaskToActiveSession(authUser.uid, taskIdStr, taskRecord);
        btn.innerHTML = "<i class='bx bx-check'></i> Guardado Exitosamente";
        btn.classList.add("btn-success");
        if (obsField) {
          obsField.value = "";
        }
        if (visualTaskElement) {
          visualTaskElement.classList.remove("status-pending", "status-completed", "status-not-done", "status-in-progress");
          visualTaskElement.classList.add(statusClassToAdd);
        }
        updateKPI();
        schedule(() => {
          btn.innerHTML = prevText;
          btn.classList.remove("btn-success");
        }, 2e3);
        return { saved: true };
      } catch (error) {
        logger.error("Error al guardar el progreso de la tarea:", error);
        btn.innerHTML = "<i class='bx bx-error'></i> Error al guardar";
        btn.classList.add("btn-error");
        alertFn(describeTaskSaveError(error).message);
        schedule(() => {
          btn.innerHTML = prevText;
          btn.classList.remove("btn-error");
        }, 2500);
        return { saved: false, reason: "REMOTE_FAILED", error };
      } finally {
        btn.disabled = false;
        isSavingTask = false;
      }
    }
    return { saveTaskProgress };
  }
  function createTaskWorkspaceController(deps) {
    const {
      doc,
      getUser,
      getTaskCache,
      getAllTasks,
      setActiveTaskId,
      setSelectedTask,
      getDocUrl: getDocUrl2,
      syncActiveSession = () => {
      },
      escape,
      encodeArg,
      newDate = () => /* @__PURE__ */ new Date(),
      legacyProgress = false
    } = deps;
    function updateClock() {
      const clockElement = doc.getElementById("liveClock");
      if (!clockElement) return;
      clockElement.textContent = formatClockTime(newDate());
    }
    function updateKPI() {
      const figures = computeKpiFigures(countDomTasks(doc), { legacy: legacyProgress === true });
      const kpiContainer = doc.querySelector(".kpi-card");
      if (kpiContainer) {
        kpiContainer.innerHTML = buildTaskKpiHTML(figures);
      }
      const currentUser = getUser();
      if (currentUser && currentUser.role === "Gestor") {
        syncActiveSession();
      }
    }
    function renderTree(tasksBySet) {
      const container = doc.querySelector(".tree-container");
      if (!container) return;
      container.innerHTML = "";
      const sets = sortedSetKeys(tasksBySet);
      const shouldAutoExpand = shouldAutoExpandTree(sets);
      sets.forEach((set) => {
        const setDiv = doc.createElement("div");
        setDiv.className = "tree-item";
        setDiv.innerHTML = buildTreeSetHTML({
          set,
          tasks: tasksBySet[set],
          taskStateCache: getTaskCache(),
          shouldAutoExpand,
          escape,
          encodeArg
        });
        container.appendChild(setDiv);
      });
      updateKPI();
    }
    function toggleTree(element) {
      toggleTreeElement(element);
    }
    function renderQuickDocs(selectedTaskName) {
      const container = doc.getElementById("quickDocsList");
      if (!container) return;
      container.innerHTML = buildQuickDocsHTML(selectedTaskName, getDocUrl2);
    }
    function selectTask(taskId, evt) {
      const canonicalId = canonicalTaskId(taskId);
      setActiveTaskId(canonicalId);
      doc.querySelectorAll(".task-item").forEach((el) => el.classList.remove("active"));
      const eventTarget = evt && evt.currentTarget;
      if (eventTarget) eventTarget.classList.add("active");
      const task = findCatalogTask(getAllTasks(), taskId);
      if (task) {
        const titleElement = doc.getElementById("currentTaskTitle");
        if (titleElement) titleElement.textContent = task["Tarea"];
        setSelectedTask(task);
        renderQuickDocs(task["Tarea"]);
        const textArea = doc.getElementById("taskObservation");
        if (isTaskReviewerRole(getUser())) {
          if (textArea) {
            textArea.value = buildReviewerTaskDetailText(task);
          }
        } else {
          const taskStateCache = getTaskCache();
          doc.querySelectorAll(".btn-status").forEach((el) => el.classList.remove("active"));
          if (taskStateCache[canonicalId]) {
            if (textArea) textArea.value = taskStateCache[canonicalId].observation || "";
            const cachedStatus = taskStateCache[canonicalId].status;
            let found = false;
            doc.querySelectorAll(".btn-status").forEach((el) => {
              if (el.textContent.trim() === cachedStatus) {
                el.classList.add("active");
                found = true;
              }
            });
            if (!found) doc.querySelector(".btn-status.pending").classList.add("active");
          } else {
            if (textArea) textArea.value = "";
            doc.querySelector(".btn-status.pending").classList.add("active");
          }
        }
      } else {
        setSelectedTask(null);
        setActiveTaskId(null);
        if (eventTarget) eventTarget.classList.remove("active");
        const titleElement = doc.getElementById("currentTaskTitle");
        if (titleElement) titleElement.textContent = "Selecciona una tarea";
        const textArea = doc.getElementById("taskObservation");
        if (textArea) textArea.value = "";
        doc.querySelectorAll(".btn-status").forEach((el) => el.classList.remove("active"));
      }
    }
    return { updateClock, updateKPI, renderTree, toggleTree, renderQuickDocs, selectTask };
  }
  async function runStartupDataSequence(deps) {
    const { user, runStartupRecovery, loadSchedule, loadExcelTasks, loadTeletrabajo, loadPermisos, renderQuickDocs, logger = console } = deps;
    const steps = [];
    await runStartupRecovery(user);
    steps.push("recovery");
    try {
      await loadSchedule();
    } catch (e) {
      logger.error("Error al cargar el horario en la inicializaci\xF3n:", e);
    }
    steps.push("schedule");
    try {
      await loadExcelTasks();
    } catch (e) {
      logger.error("Error al cargar las tareas en la inicializaci\xF3n:", e);
    }
    steps.push("tasks");
    loadTeletrabajo();
    steps.push("teletrabajo");
    loadPermisos();
    steps.push("permisos");
    renderQuickDocs(null);
    steps.push("quickDocs");
    return steps;
  }

  // ../src/domain/auth/auth-service.js
  var auth_service_exports = {};
  __export(auth_service_exports, {
    GESTOR_BREAK_BUTTON_IDS: () => GESTOR_BREAK_BUTTON_IDS,
    LOGIN_ACCESS: () => LOGIN_ACCESS,
    NAV_PARENT: () => NAV_PARENT,
    PASSWORD_MESSAGES: () => PASSWORD_MESSAGES,
    PASSWORD_SUCCESS_CLOSE_DELAY_MS: () => PASSWORD_SUCCESS_CLOSE_DELAY_MS,
    PASSWORD_TONE: () => PASSWORD_TONE,
    PASSWORD_TONE_COLOR: () => PASSWORD_TONE_COLOR,
    REGISTER_MESSAGES: () => REGISTER_MESSAGES,
    buildAdministrativeControlsPolicy: () => buildAdministrativeControlsPolicy,
    buildBreakButtonsPolicy: () => buildBreakButtonsPolicy,
    buildSidebarPolicy: () => buildSidebarPolicy,
    changeUserPassword: () => changeUserPassword,
    evaluateLoginAccess: () => evaluateLoginAccess,
    isPasswordInputAcceptable: () => isPasswordInputAcceptable,
    isPrivilegedNavRole: () => isPrivilegedNavRole,
    mapPasswordChangeError: () => mapPasswordChangeError,
    normalizeRegistrationRole: () => normalizeRegistrationRole,
    validateRegistrationInput: () => validateRegistrationInput
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

  // ../src/domain/auth/auth-service.js
  var NAV_PARENT = Object.freeze({
    SIDEBAR: "sidebar",
    ADMIN_GROUP: "adminGroup"
  });
  function isPrivilegedNavRole(user) {
    return Boolean(user && (user.role === "Admin" || user.role === "Supervisor"));
  }
  function op(id, display, appendTo) {
    const operation = { id };
    if (display !== void 0) operation.display = display;
    if (appendTo !== void 0) operation.appendTo = appendTo;
    return operation;
  }
  function buildSidebarPolicy(user) {
    const privileged = isPrivilegedNavRole(user);
    const S = NAV_PARENT.SIDEBAR;
    const A = NAV_PARENT.ADMIN_GROUP;
    if (privileged) {
      const isSupervisor = user.role === "Supervisor";
      const operations = [
        op("horarioGestorFilterContainer", "flex"),
        op("teletrabajoGestorFilterContainer", "flex"),
        op("navWorkspace", "none"),
        // Mis Tareas: oculta para Admin y Supervisor
        isSupervisor ? op("navComunicados", "flex", S) : op("navComunicados", "none"),
        op("adminNavGroup", "block", S),
        op("navMonitoreo", "flex", A),
        op("navTiempos", "none"),
        // Admin y Supervisor gestionan comunicados; eliminar sigue restringido a Admin (en su vista).
        canManageComunicados(user.role) ? op("navAdminComunicados", "flex", A) : op("navAdminComunicados", "none"),
        op("navTurnos", "flex", A),
        op("navAprobaciones", "flex", A),
        op("navHorario", void 0, S),
        op("navDocs", "flex", S),
        op("navPermisos", "flex", S)
      ];
      if (user.role === "Admin") operations.push(op("navConfigGestores", "flex", S));
      return { privileged, operations };
    }
    return {
      privileged,
      operations: [
        op("horarioGestorFilterContainer", "none"),
        op("teletrabajoGestorFilterContainer", "none"),
        op("navWorkspace", "flex", S),
        op("navComunicados", "flex", S),
        op("navHorario", void 0, S),
        op("navDocs", "flex", S),
        op("navPermisos", "flex", S),
        op("adminNavGroup", "none")
        // las pestañas de Administración se ocultan para el Gestor
      ]
    };
  }
  var GESTOR_BREAK_BUTTON_IDS = Object.freeze(["toggleLunchBtn", "toggleBreakfastBtn"]);
  function buildBreakButtonsPolicy(user) {
    if (isPrivilegedNavRole(user)) return [];
    return GESTOR_BREAK_BUTTON_IDS.map((id) => ({ id, display: "flex" }));
  }
  function buildAdministrativeControlsPolicy(user) {
    if (!user) return null;
    return {
      showUserApprovalSection: user.role === "Admin",
      hideAdminAnnouncementsView: !canManageComunicados(user.role)
    };
  }
  var PASSWORD_TONE = Object.freeze({
    NEUTRAL: "neutral",
    DANGER: "danger",
    SUCCESS: "success"
  });
  var PASSWORD_TONE_COLOR = Object.freeze({
    [PASSWORD_TONE.NEUTRAL]: "var(--text-primary)",
    [PASSWORD_TONE.DANGER]: "var(--danger)",
    [PASSWORD_TONE.SUCCESS]: "var(--success)"
  });
  var PASSWORD_MESSAGES = Object.freeze({
    EMPTY: "Por favor ingresa una contrase\xF1a v\xE1lida.",
    PENDING: "Actualizando...",
    SUCCESS: "\xA1Contrase\xF1a actualizada exitosamente en Firebase Auth!",
    NO_SESSION: "Error: No hay sesi\xF3n activa en Firebase Auth. Por favor, vuelve a iniciar sesi\xF3n.",
    GENERIC_ERROR: "Error al actualizar contrase\xF1a.",
    REQUIRES_RECENT_LOGIN: "Por seguridad, debes cerrar sesi\xF3n e iniciar sesi\xF3n nuevamente para cambiar tu contrase\xF1a.",
    WEAK_PASSWORD: "La contrase\xF1a debe tener al menos 6 caracteres."
  });
  var PASSWORD_SUCCESS_CLOSE_DELAY_MS = 2e3;
  function isPasswordInputAcceptable(newPassword) {
    return !(!newPassword || String(newPassword).trim() === "");
  }
  function mapPasswordChangeError(error) {
    const code = error && error.code;
    if (code === "auth/requires-recent-login") return PASSWORD_MESSAGES.REQUIRES_RECENT_LOGIN;
    if (code === "auth/weak-password") return PASSWORD_MESSAGES.WEAK_PASSWORD;
    return PASSWORD_MESSAGES.GENERIC_ERROR;
  }
  async function changeUserPassword({ newPassword, getAuthUser }) {
    if (!isPasswordInputAcceptable(newPassword)) {
      return { status: "invalid", message: PASSWORD_MESSAGES.EMPTY, tone: PASSWORD_TONE.DANGER, closeModalAfterMs: null };
    }
    try {
      const user = getAuthUser();
      if (user) {
        await user.updatePassword(newPassword);
        return {
          status: "updated",
          message: PASSWORD_MESSAGES.SUCCESS,
          tone: PASSWORD_TONE.SUCCESS,
          closeModalAfterMs: PASSWORD_SUCCESS_CLOSE_DELAY_MS
        };
      }
      return { status: "no-session", message: PASSWORD_MESSAGES.NO_SESSION, tone: PASSWORD_TONE.DANGER, closeModalAfterMs: null };
    } catch (error) {
      return { status: "error", message: mapPasswordChangeError(error), tone: PASSWORD_TONE.DANGER, closeModalAfterMs: null, error };
    }
  }
  var LOGIN_ACCESS = Object.freeze({
    ALLOWED: "allowed",
    // acceso permitido → redirigir a index.html
    REJECTED: "rejected",
    // cuenta rechazada por un Admin (puede tener `reason`)
    PENDING: "pending",
    // cuenta pendiente de aprobación
    SHIFT_EXPIRED: "shift-expired"
    // turno del Gestor ya venció (ver shift-expiration.js)
  });
  function evaluateLoginAccess(dbUser, shiftExpired = false) {
    if (!dbUser) return { status: LOGIN_ACCESS.REJECTED };
    if (dbUser.rejected) {
      return { status: LOGIN_ACCESS.REJECTED, reason: dbUser.rejectionReason };
    }
    if (!dbUser.approved) return { status: LOGIN_ACCESS.PENDING };
    if (shiftExpired) return { status: LOGIN_ACCESS.SHIFT_EXPIRED };
    return { status: LOGIN_ACCESS.ALLOWED };
  }
  var REGISTER_MESSAGES = Object.freeze({
    NAME_MIN_WORDS: "Por favor ingresa tu nombre completo (al menos dos palabras).",
    PASSWORDS_MISMATCH: "Las contrase\xF1as no coinciden."
  });
  function validateRegistrationInput({ name, password, confirmPassword }) {
    const words = String(name != null ? name : "").trim().split(/\s+/).filter(Boolean);
    if (words.length < 2) return REGISTER_MESSAGES.NAME_MIN_WORDS;
    if (password !== confirmPassword) return REGISTER_MESSAGES.PASSWORDS_MISMATCH;
    return null;
  }
  function normalizeRegistrationRole(rawRole) {
    return rawRole === "Supervisor" ? "Supervisor" : "Gestor";
  }

  // ../src/app/app-router.js
  var app_router_exports = {};
  __export(app_router_exports, {
    createAppRouter: () => createAppRouter
  });
  function createAppRouter({ document: document2, getUser }) {
    function applyRoleNavigation(sidebarNav) {
      const policy = buildSidebarPolicy(getUser());
      const applied = [];
      policy.operations.forEach((operation) => {
        const el = document2.getElementById(operation.id);
        if (!el) return;
        if (operation.display !== void 0) el.style.display = operation.display;
        if (operation.appendTo === NAV_PARENT.SIDEBAR) {
          sidebarNav.appendChild(el);
        } else if (operation.appendTo === NAV_PARENT.ADMIN_GROUP) {
          const adminGroup = document2.getElementById("adminNavGroup");
          if (adminGroup) adminGroup.appendChild(el);
        }
        applied.push(operation.id);
      });
      return { privileged: policy.privileged, applied };
    }
    function applyBreakButtonsVisibility() {
      buildBreakButtonsPolicy(getUser()).forEach(({ id, display }) => {
        const el = document2.getElementById(id);
        if (el) el.style.display = display;
      });
    }
    function alignAdministrativeControlsByRole() {
      const policy = buildAdministrativeControlsPolicy(getUser());
      if (!policy) return;
      const pendingUsersBody = document2.getElementById("pendingUsersTableBody");
      const userTablePanel = pendingUsersBody ? pendingUsersBody.closest(".glass-panel") : null;
      const userSearch = document2.getElementById("filterAprobacionesSearch");
      const userFilterPanel = userSearch ? userSearch.closest(".glass-panel") : null;
      const userSectionTitle = userFilterPanel ? userFilterPanel.previousElementSibling : null;
      [userSectionTitle, userFilterPanel, userTablePanel].forEach((element) => {
        if (element) element.style.display = policy.showUserApprovalSection ? "" : "none";
      });
      const adminAnnouncementsView = document2.getElementById("view-gestion-comunicados");
      if (adminAnnouncementsView && policy.hideAdminAnnouncementsView) adminAnnouncementsView.style.display = "none";
    }
    function updateNavigation({ refreshSplitShiftButton, setupSidebar } = {}) {
      if (refreshSplitShiftButton) refreshSplitShiftButton();
      if (typeof setupSidebar === "function") setupSidebar();
    }
    return { applyRoleNavigation, applyBreakButtonsVisibility, alignAdministrativeControlsByRole, updateNavigation };
  }

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
  var MINUTES_PER_DAY2 = 1440;
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
    return diff < 0 ? diff + MINUTES_PER_DAY2 : diff;
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
    sumInactivityMinutes: () => sumInactivityMinutes2,
    sumInactivityMinutesWithinShiftWindow: () => sumInactivityMinutesWithinShiftWindow
  });
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
      diff += MINUTES_PER_DAY;
    }
    if (diff > 0 && diff < MAX_TARDINESS_MINUTES) {
      return diff;
    }
    return 0;
  }
  function sumInactivityMinutes2(timeline, nowMs = Date.now()) {
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

  // ../src/domain/shifts/break-state-ownership.js
  var break_state_ownership_exports = {};
  __export(break_state_ownership_exports, {
    BREAK_STATE_RESTORE: () => BREAK_STATE_RESTORE,
    restoreBreakState: () => restoreBreakState,
    serializeBreakState: () => serializeBreakState
  });
  var BREAK_STATE_RESTORE = Object.freeze({
    EMPTY: "EMPTY",
    OWNED: "OWNED",
    LEGACY: "LEGACY",
    OTHER_OWNER: "OTHER_OWNER",
    INVALID: "INVALID"
  });
  function serializeBreakState(state, uid) {
    const normalized = normalizeState(state);
    const { shiftTimeline, ...breakFields } = normalized;
    void shiftTimeline;
    return uid ? { ...breakFields, ownerUid: uid } : { ...breakFields };
  }
  function restoreBreakState(raw, uid) {
    if (raw === null || raw === void 0 || raw === "") {
      return { state: defaultState(), status: BREAK_STATE_RESTORE.EMPTY, discarded: false };
    }
    let parsed = raw;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        return { state: defaultState(), status: BREAK_STATE_RESTORE.INVALID, discarded: true };
      }
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { state: defaultState(), status: BREAK_STATE_RESTORE.INVALID, discarded: true };
    }
    if (parsed.ownerUid && uid && parsed.ownerUid !== uid) {
      return { state: defaultState(), status: BREAK_STATE_RESTORE.OTHER_OWNER, discarded: true };
    }
    return {
      state: normalizeState(parsed),
      status: parsed.ownerUid ? BREAK_STATE_RESTORE.OWNED : BREAK_STATE_RESTORE.LEGACY,
      discarded: false
    };
  }

  // ../src/domain/shifts/shift-closure-rules.js
  var shift_closure_rules_exports = {};
  __export(shift_closure_rules_exports, {
    hasRealSetOptions: () => hasRealSetOptions,
    listUnmanagedTasks: () => listUnmanagedTasks,
    requiresSpecificSetSelection: () => requiresSpecificSetSelection,
    shouldValidateManagedTasks: () => shouldValidateManagedTasks
  });
  function hasRealSetOptions(setSelect) {
    if (!setSelect || !setSelect.options) return false;
    return Array.from(setSelect.options).some((option) => !option.disabled && option.value !== "" && option.value !== "Todos");
  }
  function requiresSpecificSetSelection(setSelect) {
    if (!hasRealSetOptions(setSelect)) return false;
    return setSelect.value === "" || setSelect.value === "Todos";
  }
  function isManagedStatus(entry) {
    const statusNorm = (entry && entry.status ? String(entry.status) : "").toLowerCase().replace(/_/g, " ").trim();
    return statusNorm === "finalizada" || statusNorm === "no realizada";
  }
  function listUnmanagedTasks({ allTasks, taskStateCache }) {
    const unmanaged = [];
    const cache = taskStateCache || {};
    if (Array.isArray(allTasks)) {
      for (const task of allTasks) {
        const cId = canonicalTaskId(task.id);
        const entry = cache[cId];
        if (!isManagedStatus(entry)) {
          unmanaged.push(task["Tarea"] || entry && entry.name || cId);
        }
      }
    } else {
      for (const tId in cache) {
        if (!tId.startsWith(EXTRA_TASK_KEY_PREFIX)) {
          const entry = cache[tId];
          if (!isManagedStatus(entry)) {
            unmanaged.push(entry && entry.name || tId);
          }
        }
      }
    }
    for (const tId in cache) {
      if (tId.startsWith(EXTRA_TASK_KEY_PREFIX)) {
        const entry = cache[tId];
        if (!isManagedStatus(entry)) {
          unmanaged.push(entry && entry.name || tId);
        }
      }
    }
    return unmanaged;
  }
  function shouldValidateManagedTasks(localUser, taskStateCache) {
    return Boolean(localUser && localUser.role === "Gestor" && taskStateCache);
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

  // ../src/domain/tasks/app-init-rules.js
  var app_init_rules_exports = {};
  __export(app_init_rules_exports, {
    AVAILABLE_AVATARS: () => AVAILABLE_AVATARS,
    PING_INTERVAL_MS: () => PING_INTERVAL_MS,
    buildAvatarSrc: () => buildAvatarSrc,
    buildFallbackAvatarUrl: () => buildFallbackAvatarUrl,
    buildPingWorkerCode: () => buildPingWorkerCode,
    findAvatarFile: () => findAvatarFile,
    nextTheme: () => nextTheme,
    resolveSavedTheme: () => resolveSavedTheme,
    themeIconHTML: () => themeIconHTML
  });
  var AVAILABLE_AVATARS = Object.freeze([
    "Alexander Villada.png",
    "Camilo Espinosa.png",
    "Daniel Benavides.png",
    "Josue Alvarez.png",
    "Juan Jose Diaz.png",
    "Luis Fuentes.png",
    "Maria Sanchez.png",
    "Marilyn Jimenez.png",
    "Oriana Borja.png",
    "Samuel Cruz.png",
    "Sara Santamaria.png",
    "Sebastian Arango.png",
    "Sebastian Hincapie.png",
    "Yefferson Giraldo.png"
  ]);
  function findAvatarFile(fullName, namesMatch2, avatars = AVAILABLE_AVATARS) {
    return avatars.find((img) => namesMatch2(fullName, img.replace(".png", "")));
  }
  function buildFallbackAvatarUrl(fullName) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
  }
  function buildAvatarSrc(matchedAvatar, fullName) {
    return matchedAvatar ? `assets/src/img/${matchedAvatar}` : buildFallbackAvatarUrl(fullName);
  }
  function resolveSavedTheme(stored) {
    return stored || "dark";
  }
  function nextTheme(currentTheme) {
    return currentTheme === "dark" ? "light" : "dark";
  }
  function themeIconHTML(theme) {
    return theme === "dark" ? "<i class='bx bx-moon'></i>" : "<i class='bx bx-sun'></i>";
  }
  var PING_INTERVAL_MS = 3e4;
  function buildPingWorkerCode() {
    return `
                setInterval(() => {
                    postMessage('ping');
                }, 30000);
            `;
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
    if (typeof window !== "undefined") {
      window.idleDetectorGranted = granted;
      window.idleDetectorStarted = started;
    }
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
    loadTimeline: () => loadTimeline,
    migrateFromLegacyStorage: () => migrateFromLegacyStorage,
    saveBreakState: () => saveBreakState,
    saveTimeline: () => saveTimeline
  });
  var BREAK_STATE_STORAGE_KEY = "riskOps_breakState";
  var TIMELINE_KEY = "riskOps_timeline";
  function saveBreakState(state) {
    const normalized = normalizeState(state);
    const { shiftTimeline, ...pauseFields } = normalized;
    try {
      localStorage.setItem(BREAK_STATE_STORAGE_KEY, JSON.stringify(pauseFields));
    } catch (error) {
      console.warn("No se pudo guardar el estado de pausas:", error);
    }
    saveTimeline(shiftTimeline);
    return normalized;
  }
  function loadBreakState() {
    try {
      const serialized = localStorage.getItem(BREAK_STATE_STORAGE_KEY);
      const pauseFields = serialized ? normalizeState(JSON.parse(serialized)) : defaultState();
      const timeline = loadTimeline();
      return { ...pauseFields, shiftTimeline: timeline };
    } catch (error) {
      console.warn("No se pudo cargar el estado de pausas:", error);
      return defaultState();
    }
  }
  function saveTimeline(events) {
    try {
      const safe = Array.isArray(events) ? events : [];
      localStorage.setItem(TIMELINE_KEY, JSON.stringify(safe));
    } catch (error) {
      console.warn("No se pudo guardar la l\xEDnea de tiempo del turno:", error);
    }
  }
  function loadTimeline() {
    try {
      const raw = localStorage.getItem(TIMELINE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("No se pudo cargar la l\xEDnea de tiempo del turno:", error);
      return [];
    }
  }
  function migrateFromLegacyStorage() {
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

  // ../src/domain/tasks/task-catalog.js
  var task_catalog_exports = {};
  __export(task_catalog_exports, {
    SET_SELECTOR_BASE_OPTIONS_HTML: () => SET_SELECTOR_BASE_OPTIONS_HTML,
    TASKS_EXCEL_PATH: () => TASKS_EXCEL_PATH,
    TASKS_LOADING_HTML: () => TASKS_LOADING_HTML,
    TASKS_NO_ASSIGNMENTS_HTML: () => TASKS_NO_ASSIGNMENTS_HTML,
    TASKS_SELECT_SET_HTML: () => TASKS_SELECT_SET_HTML,
    assignMasterRowIds: () => assignMasterRowIds,
    buildGestorTaskRows: () => buildGestorTaskRows,
    buildSetSelectorOptionsHTML: () => buildSetSelectorOptionsHTML,
    buildTasksExcelUrl: () => buildTasksExcelUrl,
    buildTasksLoadErrorHTML: () => buildTasksLoadErrorHTML,
    createMockTaskIdGenerator: () => createMockTaskIdGenerator,
    decideSetSelectorView: () => decideSetSelectorView,
    getRowSet: () => getRowSet,
    groupTasksBySet: () => groupTasksBySet,
    reconcileGestorTaskCache: () => reconcileGestorTaskCache,
    resolveGestorShift: () => resolveGestorShift,
    selectTasksForSet: () => selectTasksForSet
  });
  var TASKS_EXCEL_PATH = "Tareas Riesgo/Tareas de Riesgo.xlsx";
  var TASKS_LOADING_HTML = '<div style="padding: 20px; color: var(--text-secondary);"><i class="bx bx-loader-alt bx-spin"></i> Cargando Tareas...</div>';
  var TASKS_NO_ASSIGNMENTS_HTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">No hay tareas asignadas en tu cronograma para el d\xEDa de hoy.</div>';
  var TASKS_SELECT_SET_HTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">Selecciona un SET en el men\xFA desplegable para ver las tareas.</div>';
  var SET_SELECTOR_BASE_OPTIONS_HTML = '<option value="" disabled selected>Selecciona tu SET a trabajar...</option><option value="Todos">Mostrar Todos</option>';
  function buildTasksExcelUrl(nowMs) {
    return encodeURI(TASKS_EXCEL_PATH) + "?t=" + nowMs;
  }
  function buildTasksLoadErrorHTML(message, escape) {
    return `<div style="padding: 20px; color: var(--danger);"><i class="bx bx-error-circle"></i> Error cargando tareas: ${escape(message)}</div>`;
  }
  function assignMasterRowIds(rows) {
    rows.forEach((row, idx) => {
      row.id = idx;
    });
    return rows;
  }
  function getRowSet(row) {
    return row["Set "] || row["Set"] || "Otros";
  }
  function resolveGestorShift(userShift, todayShift) {
    let resolvedShift = userShift || "Por Asignar";
    if (todayShift && todayShift !== "Por Asignar" && todayShift !== "Descansa") {
      resolvedShift = todayShift;
    }
    return resolvedShift;
  }
  function createMockTaskIdGenerator(usedMockIds = /* @__PURE__ */ new Set()) {
    return (taskName, set) => {
      const raw = `${(set || "Otros").trim().toLowerCase()}::${(taskName || "").trim().toLowerCase()}`;
      let hash = 0;
      for (let i = 0; i < raw.length; i++) {
        hash = (hash << 5) - hash + raw.charCodeAt(i);
        hash |= 0;
      }
      let candidate = 1e4 + Math.abs(hash) % 89999;
      while (usedMockIds.has(candidate)) {
        candidate++;
      }
      usedMockIds.add(candidate);
      return candidate;
    };
  }
  function buildGestorTaskRows(masterRows, assignments, { taskNamesMatch: taskNamesMatch2, setNamesMatch: setNamesMatch2 }) {
    if (!(assignments && assignments.length > 0)) return [];
    const filteredMasterRows = masterRows.filter((row) => {
      const set = getRowSet(row);
      const taskName = row["Tarea"];
      return assignments.some(
        (assign) => taskNamesMatch2(assign.task, taskName) && setNamesMatch2(assign.set, set)
      );
    });
    const generatedMocks = [];
    const generateDeterministicMockTaskId = createMockTaskIdGenerator(/* @__PURE__ */ new Set());
    assignments.forEach((assign) => {
      const hasMasterMatch = masterRows.some(
        (row) => taskNamesMatch2(assign.task, row["Tarea"]) && setNamesMatch2(assign.set, getRowSet(row))
      );
      if (!hasMasterMatch) {
        generatedMocks.push({
          "Set ": assign.set,
          "Tarea": assign.task,
          "Detalle de Tarea": `Tarea de control rutinario: ${assign.task}. Realizar las verificaciones correspondientes seg\xFAn los lineamientos de Riesgo.`,
          "Horario": "Durante el turno",
          "D\xEDa": "Diario",
          "Instrucciones": "1. Realizar la validaci\xF3n de la tarea de acuerdo con el procedimiento est\xE1ndar.\n2. Registrar cualquier anomal\xEDa en los canales oficiales.\n3. Marcar como completada en esta plataforma al finalizar.",
          "Documento / Video de Apoyo": "",
          id: generateDeterministicMockTaskId(assign.task, assign.set)
        });
      }
    });
    return [...filteredMasterRows, ...generatedMocks];
  }
  function groupTasksBySet(processedRows) {
    const tasksBySet = {};
    const allTasks = [];
    processedRows.forEach((row, index) => {
      const set = getRowSet(row);
      const taskName = row["Tarea"];
      const taskId = row.id !== void 0 ? row.id : index;
      if (!tasksBySet[set]) tasksBySet[set] = [];
      const isDuplicate = tasksBySet[set].some((t) => t.name === taskName);
      if (!isDuplicate) {
        tasksBySet[set].push({
          id: taskId,
          name: taskName,
          detail: row["Detalle de Tarea"],
          time: row["Horario"],
          day: row["D\xEDa"]
        });
      }
      allTasks.push({ ...row, id: taskId });
    });
    return { tasksBySet, allTasks };
  }
  function reconcileGestorTaskCache(cache, processedRows, now) {
    let hasNewTasksToSync = false;
    const validAssignedIds = new Set(processedRows.map((row, index) => canonicalTaskId(row.id !== void 0 ? row.id : index)));
    let cacheWasPurged = false;
    for (const cachedId in cache) {
      if (!validAssignedIds.has(cachedId) && !cachedId.startsWith(EXTRA_TASK_KEY_PREFIX)) {
        delete cache[cachedId];
        cacheWasPurged = true;
      }
    }
    processedRows.forEach((row, index) => {
      const taskId = canonicalTaskId(row.id !== void 0 ? row.id : index);
      const taskName = row["Tarea"];
      if (!cache[taskId]) {
        cache[taskId] = {
          name: taskName,
          status: TASK_STATUS.IN_PROGRESS,
          observation: "",
          updatedAt: now
        };
        hasNewTasksToSync = true;
      }
    });
    return { hasNewTasksToSync, cacheWasPurged };
  }
  function buildSetSelectorOptionsHTML(setsKeys, escape) {
    let html = SET_SELECTOR_BASE_OPTIONS_HTML;
    setsKeys.forEach((set) => {
      html += `<option value="${escape(set)}">${escape(set)}</option>`;
    });
    return html;
  }
  function decideSetSelectorView(setsKeys) {
    if (setsKeys.length === 1) return { mode: "single", set: setsKeys[0] };
    if (setsKeys.length === 0) return { mode: "none", html: TASKS_NO_ASSIGNMENTS_HTML };
    return { mode: "choose", html: TASKS_SELECT_SET_HTML };
  }
  function selectTasksForSet(tasksBySet, value) {
    if (value === "Todos") return tasksBySet;
    const filtered = {};
    filtered[value] = tasksBySet[value];
    return filtered;
  }

  // ../src/domain/tasks/schedule-sheet.js
  var schedule_sheet_exports = {};
  __export(schedule_sheet_exports, {
    SCHEDULE_EXCEL_PATH: () => SCHEDULE_EXCEL_PATH,
    buildScheduleExcelUrl: () => buildScheduleExcelUrl,
    buildScheduleHeadHTML: () => buildScheduleHeadHTML,
    buildScheduleRowsHTML: () => buildScheduleRowsHTML,
    buildWeekSelectorOptionsHTML: () => buildWeekSelectorOptionsHTML,
    findDefaultScheduleBlockRow: () => findDefaultScheduleBlockRow,
    findScheduleBlocks: () => findScheduleBlocks,
    formatExcelDate: () => formatExcelDate,
    getScheduleBadgeClass: () => getScheduleBadgeClass,
    listScheduleGestores: () => listScheduleGestores,
    resolveScheduleColumnCount: () => resolveScheduleColumnCount
  });
  var SCHEDULE_EXCEL_PATH = "Horario/Horario 2026.xlsx";
  var MONTH_NAMES2 = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  function buildScheduleExcelUrl(nowMs) {
    return encodeURI(SCHEDULE_EXCEL_PATH) + "?t=" + nowMs;
  }
  function formatExcelDate(serial) {
    if (!serial) return "";
    if (typeof serial === "string" && (serial.includes("-") || serial.includes("/"))) {
      const d = new Date(serial);
      if (!isNaN(d.getTime())) {
        return `${d.getUTCDate()} ${MONTH_NAMES2[d.getUTCMonth()]}`;
      }
    }
    if (!isNaN(serial)) {
      const epochUTC = Date.UTC(1899, 11, 30);
      const d = new Date(epochUTC + parseFloat(serial) * 864e5);
      return `${d.getUTCDate()} ${MONTH_NAMES2[d.getUTCMonth()]}`;
    }
    return "";
  }
  function findScheduleBlocks(rows) {
    const allScheduleBlocks = [];
    if (rows && rows.length > 2) {
      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const testRow = rows[rIdx];
        if (!testRow || testRow.length < 2) continue;
        if (formatExcelDate(testRow[1]) !== "") {
          const nextR = rows[rIdx + 1];
          if (nextR && nextR.length > 1 && (nextR[1] === "Lunes" || nextR[1] === "Martes")) {
            const firstDate = formatExcelDate(testRow[1]);
            let lastDate = firstDate;
            for (let c = 1; c < testRow.length; c++) {
              if (formatExcelDate(testRow[c])) lastDate = formatExcelDate(testRow[c]);
            }
            allScheduleBlocks.push({
              startRow: rIdx,
              label: `Semana del ${firstDate} al ${lastDate}`
            });
            rIdx++;
          }
        }
      }
    }
    return allScheduleBlocks;
  }
  function findDefaultScheduleBlockRow(rows, blocks, today) {
    let defaultBlockRow = null;
    for (const block of blocks) {
      const dateRow = rows[block.startRow];
      for (let c = 1; c < dateRow.length; c++) {
        const serial = dateRow[c];
        if (serial) {
          let cellDate = null;
          if (!isNaN(serial)) {
            cellDate = excelToJSDate(serial);
          } else if (typeof serial === "string" && (serial.includes("-") || serial.includes("/"))) {
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
      defaultBlockRow = blocks[blocks.length - 1].startRow;
    }
    return defaultBlockRow;
  }
  function isEndOfGestorList(row) {
    return !row || !row[0] || String(row[0]).trim() === "" || String(row[0]).trim().toUpperCase() === "GESTOR";
  }
  function listScheduleGestores(rows, blocks) {
    const allGestoresSet = /* @__PURE__ */ new Set();
    blocks.forEach((block) => {
      for (let rIdx = block.startRow + 2; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];
        if (isEndOfGestorList(row)) break;
        allGestoresSet.add(String(row[0]).trim());
      }
    });
    return Array.from(allGestoresSet).sort((a, b) => a.localeCompare(b));
  }
  function buildWeekSelectorOptionsHTML(blocks, escape = escapeHTML) {
    let html = "";
    blocks.forEach((block) => {
      html += `<option value="${escape(String(block.startRow))}">${escape(block.label)}</option>`;
    });
    return html;
  }
  function resolveScheduleColumnCount(dateRow) {
    let numCols = 0;
    for (let i = 1; i < dateRow.length; i++) {
      if (formatExcelDate(dateRow[i])) numCols = i;
    }
    if (numCols === 0) numCols = 7;
    return numCols;
  }
  function buildScheduleHeadHTML(dateRow, dayRow, numCols, escape = escapeHTML) {
    let headHTML = '<tr style="border-bottom: 1px solid var(--glass-border);">';
    headHTML += `<th style="padding: 12px; color: var(--accent-primary); text-align: left; position: sticky; left: 0; background: var(--bg-panel); z-index: 2;">GESTOR <i class='bx bx-refresh' style='cursor:pointer; margin-left:5px;' onclick='loadSchedule()' title='Refrescar Horario'></i></th>`;
    for (let i = 1; i <= numCols; i++) {
      const dayName = dayRow[i] || `D\xEDa ${i}`;
      const dateParsed = formatExcelDate(dateRow[i]);
      const subText = dateParsed ? `<br><span style="font-size: 11px; font-weight: normal; color: var(--text-secondary);">${dateParsed}</span>` : "";
      headHTML += `<th style="padding: 12px; color: var(--accent-primary); text-align: center;">${escape(String(dayName))}${subText}</th>`;
    }
    headHTML += "</tr>";
    return headHTML;
  }
  function getScheduleBadgeClass(shift, normalizeName2 = normalizeName) {
    let badgeClass = "pending";
    const sLower = normalizeName2(shift);
    if (/\d\s*(am|pm)/i.test(shift)) badgeClass = "in-progress";
    else if (sLower.includes("vacacion")) badgeClass = "vacaciones-badge";
    else if (sLower.includes("descansa")) badgeClass = "descanso-badge";
    else if (sLower.includes("familia")) badgeClass = "familia-badge";
    else if (sLower.includes("incapacidad")) badgeClass = "incapacidad-badge";
    else if (sLower.includes("disponible") || sLower.includes("dosponible")) badgeClass = "disponible-badge";
    return badgeClass;
  }
  function buildScheduleRowsHTML(input) {
    const {
      rows,
      blockStartRow,
      numCols,
      selectedList,
      currentUser,
      getShiftForToday,
      escape = escapeHTML,
      normalizeName: normalizeName2 = normalizeName,
      namesMatch: namesMatch2 = namesMatch,
      onCurrentUserShift,
      sink
    } = input;
    let html = "";
    const currentUserShifts = [];
    for (let rowIndex = blockStartRow + 2; rowIndex < rows.length; rowIndex++) {
      const r = rows[rowIndex];
      if (isEndOfGestorList(r)) break;
      const gestorName = String(r[0]).trim();
      if (selectedList.length > 0 && !selectedList.some((sel) => normalizeName2(gestorName) === normalizeName2(sel))) {
        continue;
      }
      const isCurrentUser = currentUser && namesMatch2(gestorName, currentUser.name);
      if (currentUser && currentUser.role === "Gestor" && !isCurrentUser) continue;
      const bgClass = isCurrentUser ? "rgba(59,130,246,0.1)" : "transparent";
      let trHTML = `<tr class="hover-highlight" style="border-bottom: 1px solid var(--glass-border); background: ${bgClass};">`;
      trHTML += `<td style="padding: 12px; font-weight: 600; text-align: left; color: ${isCurrentUser ? "var(--accent-primary)" : "var(--text-primary)"}; position: sticky; left: 0; background: ${isCurrentUser ? "var(--bg-dark)" : "var(--bg-panel)"}; z-index: 1;">${escape(gestorName)}</td>`;
      const badgeShift = getShiftForToday(gestorName);
      for (let i = 1; i <= numCols; i++) {
        const shift = r[i] || "Descansa";
        const badgeClass = getScheduleBadgeClass(shift, normalizeName2);
        trHTML += `<td style="padding: 12px; text-align: center; white-space: nowrap;"><span class="badge ${badgeClass}">${escape(String(shift))}</span></td>`;
      }
      if (isCurrentUser && badgeShift) {
        currentUserShifts.push(badgeShift);
        if (onCurrentUserShift) onCurrentUserShift(badgeShift);
      }
      trHTML += "</tr>";
      html += trHTML;
      if (sink) sink.html = html;
    }
    return { html, currentUserShifts };
  }

  // ../src/domain/tasks/teletrabajo-sheet.js
  var teletrabajo_sheet_exports = {};
  __export(teletrabajo_sheet_exports, {
    TELEWORK_EXCEL_PATH: () => TELEWORK_EXCEL_PATH,
    TELEWORK_LOAD_ERROR_ROW_HTML: () => TELEWORK_LOAD_ERROR_ROW_HTML,
    TELEWORK_TABLE_HEAD_HTML: () => TELEWORK_TABLE_HEAD_HTML,
    buildTeleworkExcelUrl: () => buildTeleworkExcelUrl,
    buildTeleworkRowsHTML: () => buildTeleworkRowsHTML,
    buildTeleworkWeekOptionsHTML: () => buildTeleworkWeekOptionsHTML,
    findTeleworkBlocks: () => findTeleworkBlocks,
    listTeleworkGestores: () => listTeleworkGestores
  });
  var TELEWORK_EXCEL_PATH = "Teletrabajo/Teletrabajo.xlsx";
  var TELEWORK_LOAD_ERROR_ROW_HTML = '<tr><td colspan="3" style="padding: 20px; color: var(--danger); text-align: center;">No se pudo cargar Teletrabajo.xlsx o no existe.</td></tr>';
  function buildTeleworkExcelUrl(nowMs) {
    return TELEWORK_EXCEL_PATH + "?v=" + nowMs;
  }
  function findTeleworkBlocks(rows) {
    const allBlocks = [];
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const cellVal = String(rows[r][c]).trim();
        const lowCell = cellVal.toLowerCase();
        if (lowCell.includes("semana") || lowCell.includes("teletrabajo") || /^\d{1,2}\/\d{1,2}/.test(cellVal)) {
          const block = {
            label: cellVal,
            startRow: r,
            colIndex: c,
            data: []
          };
          for (let i = r + 1; i < rows.length; i++) {
            const gestor = rows[i] ? rows[i][c] : null;
            const dia = rows[i] ? rows[i][c + 1] : null;
            if (!gestor || String(gestor).trim() === "") break;
            if (String(gestor).trim().toUpperCase() === "GESTOR") continue;
            block.data.push({
              gestor: String(gestor).trim(),
              dia: String(dia || "").trim()
            });
          }
          if (block.data.length > 0) allBlocks.push(block);
        }
      }
    }
    return allBlocks;
  }
  function listTeleworkGestores(blocks) {
    const allTeleGestores = /* @__PURE__ */ new Set();
    blocks.forEach((b) => {
      b.data.forEach((r) => {
        if (r.gestor) allTeleGestores.add(String(r.gestor).trim());
      });
    });
    return Array.from(allTeleGestores).sort((a, b) => a.localeCompare(b));
  }
  function buildTeleworkWeekOptionsHTML(blocks, escape = escapeHTML) {
    let html = "";
    blocks.forEach((block, idx) => {
      html += `<option value="${escape(String(idx))}">${escape(block.label)}</option>`;
    });
    return html;
  }
  var TELEWORK_TABLE_HEAD_HTML = `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <th style="padding: 12px; color: var(--accent-primary); text-align: left; position: sticky; left: 0; background: var(--bg-panel); z-index: 2;">GESTOR <i class='bx bx-refresh' style='cursor:pointer; margin-left:5px;' onclick='loadTeletrabajo()' title='Refrescar Teletrabajo'></i></th>
                        <th style="padding: 12px; color: var(--accent-primary); text-align: center;">D\xCDA</th>
                        <th style="padding: 12px; color: var(--accent-primary); text-align: center;">MODALIDAD</th>
                    </tr>
                `;
  function buildTeleworkRowsHTML(input) {
    const {
      block,
      selectedList,
      currentUser,
      escape = escapeHTML,
      normalizeName: normalizeName2 = normalizeName,
      namesMatch: namesMatch2 = namesMatch
    } = input;
    let html = "";
    block.data.forEach((row) => {
      if (selectedList.length > 0 && !selectedList.some((sel) => normalizeName2(row.gestor) === normalizeName2(sel))) {
        return;
      }
      const isCurrentUser = currentUser && namesMatch2(row.gestor, currentUser.name);
      if (currentUser && currentUser.role === "Gestor" && !isCurrentUser) return;
      const bgClass = isCurrentUser ? "rgba(59,130,246,0.1)" : "transparent";
      const isTeletrabajo = row.dia && row.dia.toLowerCase() !== "nan";
      const estadoHtml = isTeletrabajo ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">HOME OFFICE</span>` : `<span class="badge pending">PRESENCIAL</span>`;
      html += `
                        <tr class="hover-highlight" style="border-bottom: 1px solid var(--glass-border); background: ${bgClass};">
                            <td style="padding: 12px; font-weight: 600; text-align: left; color: ${isCurrentUser ? "var(--accent-primary)" : "var(--text-primary)"}; position: sticky; left: 0; background: ${isCurrentUser ? "var(--bg-dark)" : "var(--bg-panel)"}; z-index: 1;">${escape(row.gestor)}</td>
                            <td style="padding: 12px; text-align: center;">${isTeletrabajo ? escape(row.dia) : "-"}</td>
                            <td style="padding: 12px; text-align: center;">${estadoHtml}</td>
                        </tr>
                    `;
    });
    return html;
  }

  // ../src/ui/views/permission-history-view.js
  var permission_history_view_exports = {};
  __export(permission_history_view_exports, {
    NOTIFICATIONS_EMPTY_HTML: () => NOTIFICATIONS_EMPTY_HTML,
    PERMISSIONS_HISTORY_EMPTY_HTML: () => PERMISSIONS_HISTORY_EMPTY_HTML,
    PERMISSIONS_NONE_REGISTERED_HTML: () => PERMISSIONS_NONE_REGISTERED_HTML,
    buildAdminPermissionNotifications: () => buildAdminPermissionNotifications,
    buildGestorPermissionNotifications: () => buildGestorPermissionNotifications,
    buildPermissionDetailHTML: () => buildPermissionDetailHTML,
    buildPermissionHistoryItemHTML: () => buildPermissionHistoryItemHTML,
    resolvePermissionCreatedText: () => resolvePermissionCreatedText,
    resolvePermissionsQueryUid: () => resolvePermissionsQueryUid,
    selectVisiblePermissions: () => selectVisiblePermissions
  });
  var PERMISSIONS_HISTORY_EMPTY_HTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay permisos en el historial.</p>';
  var PERMISSIONS_NONE_REGISTERED_HTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay permisos registrados.</p>';
  var NOTIFICATIONS_EMPTY_HTML = '<p style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px;">No tienes notificaciones nuevas.</p>';
  function resolvePermissionsQueryUid(user, authUid) {
    if (user && user.role !== "Admin" && user.role !== "Supervisor") {
      const uid = user.uid || (typeof authUid === "function" ? authUid() : authUid);
      if (!uid) throw new Error("No se pudo determinar el UID del usuario autenticado");
      return uid;
    }
    return null;
  }
  function selectVisiblePermissions(data, user) {
    let permisos = Object.keys(data).map((k) => ({ ...data[k], fb_id: k }));
    const all = permisos;
    if (user && user.role !== "Admin" && user.role !== "Supervisor") {
      permisos = permisos.filter((p) => p.gestor === user.name);
    }
    permisos.sort((a, b) => b.id - a.id);
    return { all, visible: permisos };
  }
  function resolvePermissionCreatedText(permiso) {
    let createdTimeText = permiso.horaSolicitud;
    if (!createdTimeText && permiso.id) {
      try {
        const d = new Date(permiso.id);
        createdTimeText = `${d.toLocaleDateString("es-CO")} ${d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
      } catch (err) {
        createdTimeText = "N/A";
      }
    }
    return createdTimeText;
  }
  function buildPermissionHistoryItemHTML(p) {
    let icon = "bx-time";
    let badgeClass = "pending";
    if (p.status === "Aprobado") {
      badgeClass = "in-progress";
      icon = "bx-check-double";
    }
    if (p.status === "Rechazado") {
      badgeClass = "not-done";
      icon = "bx-x";
    }
    const rejectionHtml = p.rejectionReason ? `<br><small style="color:var(--danger)">Raz\xF3n/Obs: ${escapeHTML(p.rejectionReason)}</small>` : "";
    const createdTimeText = resolvePermissionCreatedText(p);
    return `
                    <div class="tree-item" style="margin-top: 10px; cursor: pointer; transition: all 0.2s ease; border-radius: 8px;" onclick="openPermisoDetailModal(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))" title="Haz clic para ver el detalle completo de este permiso">
                        <div class="tree-header" style="padding: 12px; display: flex; align-items: center; gap: 10px;">
                            <i class='bx ${icon}' style="font-size: 20px;"></i>
                            <div style="display:flex; flex-direction:column; flex: 1;">
                                <strong style="font-size: 14px; color: var(--text-primary);">${escapeHTML(p.tipo)}</strong>
                                <small style="font-size:11px; opacity:0.8; color: var(--text-secondary); margin-top: 2px;">
                                    ${escapeHTML(p.gestor)} | ${escapeHTML(p.fecha)} (${escapeHTML(p.horaInicio)} a ${escapeHTML(p.horaFin)})${rejectionHtml}
                                </small>
                                <small style="font-size:10px; color: var(--accent-primary); margin-top: 2px; font-weight: 500;">
                                    <i class='bx bx-calendar-event'></i> Solicitado el: ${escapeHTML(createdTimeText || "N/A")}
                                </small>
                            </div>
                            <span class="badge ${badgeClass}" style="margin-left: auto; padding: 4px 10px; font-size: 11px;">${escapeHTML(p.status)}</span>
                            <i class='bx bx-chevron-right' style="font-size: 18px; color: var(--text-secondary); opacity: 0.6;"></i>
                        </div>
                    </div>
                `;
  }
  function buildPermissionDetailHTML(perm) {
    let statusColor = "var(--warning)";
    let statusIcon = "bx-time";
    if (perm.status === "Aprobado") {
      statusColor = "var(--success)";
      statusIcon = "bx-check-circle";
    }
    if (perm.status === "Rechazado") {
      statusColor = "var(--danger)";
      statusIcon = "bx-x-circle";
    }
    let fechaRange = perm.fecha;
    if (perm.fechaDesde && perm.fechaHasta && perm.fechaDesde !== perm.fechaHasta) {
      fechaRange = `Desde ${perm.fechaDesde} hasta ${perm.fechaHasta}`;
    }
    const createdTimeText = resolvePermissionCreatedText(perm);
    return `
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
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Fecha de Solicitud (Creaci\xF3n)</small>
                    <strong style="font-size: 13px; color: var(--accent-primary); margin-top: 3px; display: block;">${escapeHTML(createdTimeText || "N/A")}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Fecha del Permiso</small>
                    <strong style="font-size: 13px; color: var(--text-primary); margin-top: 3px; display: block;">${escapeHTML(fechaRange)}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Horario Solicitado</small>
                    <strong style="font-size: 13px; color: var(--text-primary); margin-top: 3px; display: block;">${escapeHTML(perm.horaInicio || "N/A")} a ${escapeHTML(perm.horaFin || "N/A")}</strong>
                </div>
            </div>

            <div style="background: rgba(255,255,255,0.03); padding: 12px 15px; border-radius: 10px; border: 1px solid var(--glass-border);">
                <small style="color: var(--accent-primary); display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Motivo / Justificaci\xF3n del Gestor:</small>
                <div style="font-size: 13px; color: var(--text-primary); line-height: 1.5; white-space: pre-wrap; word-break: break-word;">
                    ${escapeHTML(perm.motivo || "Sin justificaci\xF3n detallada.")}
                </div>
            </div>

            ${perm.rejectionReason ? `
                <div style="background: rgba(239, 68, 68, 0.08); padding: 12px 15px; border-radius: 10px; border: 1px solid rgba(239, 68, 68, 0.3);">
                    <small style="color: var(--danger); display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Observaci\xF3n / Raz\xF3n de Respuesta:</small>
                    <div style="font-size: 13px; color: var(--text-primary); line-height: 1.5; white-space: pre-wrap; word-break: break-word;">
                        ${escapeHTML(perm.rejectionReason)}
                    </div>
                </div>
            ` : ""}
        </div>
    `;
  }
  function buildAdminPermissionNotifications(data) {
    let unreadCount = 0;
    let notifsHtml = "";
    if (data) {
      const perms = Object.keys(data).map((k) => ({ ...data[k], fb_id: k }));
      const pending = perms.filter((p) => p.status === "Pendiente");
      pending.sort((a, b) => b.id - a.id);
      pending.forEach((p) => {
        if (p.notified_admin === false) unreadCount++;
        const bg = p.notified_admin === false ? "rgba(59,130,246,0.1)" : "transparent";
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
    return { html: notifsHtml === "" ? NOTIFICATIONS_EMPTY_HTML : notifsHtml, unreadCount };
  }
  function buildGestorPermissionNotifications(data) {
    let unreadCount = 0;
    let notifsHtml = "";
    if (data) {
      const perms = Object.keys(data).map((k) => ({ ...data[k], fb_id: k }));
      const finished = perms.filter((p) => p.status !== "Pendiente");
      finished.sort((a, b) => b.id - a.id);
      finished.forEach((p) => {
        if (p.notified === false) unreadCount++;
        const bg = p.notified === false ? "rgba(59,130,246,0.1)" : "transparent";
        const iconColor = p.status === "Aprobado" ? "var(--success)" : "var(--danger)";
        const icon = p.status === "Aprobado" ? "bx-check-double" : "bx-x";
        const reasonHtml = p.rejectionReason ? `<div style="font-size:11px; color:var(--danger); margin-top:2px;">Raz\xF3n: ${escapeHTML(p.rejectionReason)}</div>` : "";
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
    return { html: notifsHtml === "" ? NOTIFICATIONS_EMPTY_HTML : notifsHtml, unreadCount };
  }

  // ../src/services/firebase/firebase-task-repository.js
  var firebase_task_repository_exports = {};
  __export(firebase_task_repository_exports, {
    createTaskRepository: () => createTaskRepository,
    resolveTaskTransaction: () => resolveTaskTransaction
  });
  function resolveTaskTransaction(currentValue, record) {
    if (currentValue && typeof currentValue.updatedAt === "number" && typeof record.updatedAt === "number" && currentValue.updatedAt > record.updatedAt) {
      return void 0;
    }
    return record;
  }
  function createTaskRepository({ database, now = Date.now, saveCache = () => {
  }, logger = console }) {
    function persistTaskToActiveSession(uid, taskId, taskData) {
      if (!uid) return Promise.reject(new Error("MISSING_UID"));
      if (!taskId) return Promise.reject(new Error("MISSING_TASK_ID"));
      return database.ref(`active_sessions/${uid}/tasks/${taskId}`).update(taskData);
    }
    async function fetchOwnActiveSessionTasks(uid) {
      if (!uid) return { ok: false, tasks: {} };
      try {
        const snapshot = await database.ref(`active_sessions/${uid}/tasks`).once("value");
        return { ok: true, tasks: snapshot.exists() ? snapshot.val() : {} };
      } catch (e) {
        logger.error("Error al recuperar el progreso remoto de tareas:", e);
        return { ok: false, tasks: {} };
      }
    }
    function persistTaskIfNotNewerRemote(uid, taskId, record) {
      if (!uid) return Promise.reject(new Error("MISSING_UID"));
      if (!taskId) return Promise.reject(new Error("MISSING_TASK_ID"));
      return database.ref(`active_sessions/${uid}/tasks/${taskId}`).transaction(
        (currentValue) => resolveTaskTransaction(currentValue, record)
      );
    }
    async function migrateLocalTasksToActiveSession(uid, mergedCache, remoteCache) {
      if (!uid || !mergedCache) return { migrated: [], failed: [], skipped: [] };
      const migrations = computeLocalTaskMigrations(mergedCache, remoteCache, now());
      const migrated = [];
      const failed = [];
      const skipped = [];
      for (const { taskId, record } of migrations) {
        mergedCache[taskId] = record;
        try {
          saveCache(mergedCache);
        } catch (e) {
        }
        try {
          const result = await persistTaskIfNotNewerRemote(uid, taskId, record);
          if (result && result.committed === false) {
            skipped.push(taskId);
          } else {
            migrated.push(taskId);
          }
        } catch (error) {
          logger.error("Error al migrar una tarea local a Firebase durante la recuperaci\xF3n de sesi\xF3n:", taskId, error);
          failed.push(taskId);
        }
      }
      return { migrated, failed, skipped };
    }
    function syncSessionMetadata(uid, metadata) {
      const syncPromise = database.ref(`active_sessions/${uid}`).update(metadata);
      syncPromise.catch((e) => logger.error("Error syncing active session via SDK:", e));
      return syncPromise;
    }
    return {
      persistTaskToActiveSession,
      fetchOwnActiveSessionTasks,
      persistTaskIfNotNewerRemote,
      migrateLocalTasksToActiveSession,
      syncSessionMetadata
    };
  }

  // ../src/controllers/task-loaders-controller.js
  var task_loaders_controller_exports = {};
  __export(task_loaders_controller_exports, {
    createTaskLoadersController: () => createTaskLoadersController
  });
  function createTaskLoadersController(deps) {
    const {
      fetchFn,
      XLSX,
      doc,
      now = Date.now,
      newDate = () => /* @__PURE__ */ new Date(),
      getUser,
      persistUser,
      getScheduleRows,
      getScheduleBlocks,
      setSchedule,
      getShiftForDate: getShiftForDate2,
      normalizeName: normalizeName2,
      namesMatch: namesMatch2,
      taskNamesMatch: taskNamesMatch2,
      setNamesMatch: setNamesMatch2,
      escape,
      encodeArg,
      multiSelect,
      loadCronogramaAssignments: loadCronogramaAssignments2,
      getCronogramaAssignments,
      getTaskCache,
      saveTaskCache = () => {
      },
      repository,
      setAllTasks,
      renderTree,
      syncActiveSession,
      database,
      getAuthUid,
      logger = console
    } = deps;
    const alertFn = deps.alert || (() => {
    });
    let allLoadedPermissions = [];
    async function loadExcelTasks() {
      const treeContainer = doc.querySelector(".tree-container");
      if (treeContainer) treeContainer.innerHTML = TASKS_LOADING_HTML;
      try {
        const url = buildTasksExcelUrl(now());
        const response = await fetchFn(url);
        logger.log(`XLSX_FETCH url=${url} status=${response.status}`);
        if (!response.ok) throw new Error("Error HTTP " + response.status);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        assignMasterRowIds(json);
        const currentUser = getUser();
        let processedRows = [];
        if (currentUser && currentUser.role === "Gestor") {
          const scheduleRows = getScheduleRows();
          const scheduleBlocks = getScheduleBlocks();
          let todayShift = null;
          if (scheduleRows && scheduleBlocks && scheduleBlocks.length > 0) {
            todayShift = getShiftForDate2(scheduleRows, scheduleBlocks, currentUser.name, newDate());
          }
          const resolvedShift = resolveGestorShift(currentUser.shift, todayShift);
          await loadCronogramaAssignments2(currentUser.name, resolvedShift);
          processedRows = buildGestorTaskRows(json, getCronogramaAssignments(), { taskNamesMatch: taskNamesMatch2, setNamesMatch: setNamesMatch2 });
        } else {
          processedRows = json;
        }
        const { tasksBySet, allTasks } = groupTasksBySet(processedRows);
        setAllTasks(allTasks);
        if (currentUser && currentUser.role === "Gestor" && Array.isArray(processedRows)) {
          const taskStateCache = getTaskCache();
          const { hasNewTasksToSync, cacheWasPurged } = reconcileGestorTaskCache(taskStateCache, processedRows, now());
          if (hasNewTasksToSync || cacheWasPurged) {
            try {
              saveTaskCache(taskStateCache);
            } catch (e) {
            }
            if (currentUser.uid && hasNewTasksToSync) {
              try {
                await repository.migrateLocalTasksToActiveSession(currentUser.uid, taskStateCache, {});
              } catch (syncErr) {
                logger.error("Error al sincronizar tareas iniciales En Proceso:", syncErr);
              }
            }
          }
        }
        const select = doc.getElementById("activeSetSelect");
        if (select) {
          const setsKeys = Object.keys(tasksBySet).sort();
          select.innerHTML = buildSetSelectorOptionsHTML(setsKeys, escape);
          const newSelect = select.cloneNode(true);
          select.parentNode.replaceChild(newSelect, select);
          newSelect.addEventListener("change", (e) => {
            renderTree(selectTasksForSet(tasksBySet, e.target.value));
          });
          const view = decideSetSelectorView(setsKeys);
          if (view.mode === "single") {
            newSelect.value = view.set;
            renderTree(selectTasksForSet(tasksBySet, view.set));
          } else {
            const container = doc.querySelector(".tree-container");
            if (container) container.innerHTML = view.html;
          }
        }
      } catch (err) {
        logger.error("Error loading tasks:", err);
        const container = doc.querySelector(".tree-container");
        if (container) container.innerHTML = buildTasksLoadErrorHTML(err.message, escape);
      }
    }
    async function loadSchedule() {
      try {
        const url = buildScheduleExcelUrl(now());
        const response = await fetchFn(url);
        logger.log(`XLSX_FETCH url=${url} status=${response.status}`);
        if (!response.ok) throw new Error("Fallo red");
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        const allScheduleBlocks = findScheduleBlocks(rows);
        setSchedule(rows, allScheduleBlocks);
        if (allScheduleBlocks.length === 0) return;
        const tableHead = doc.getElementById("scheduleTableHead");
        const tableBody = doc.getElementById("scheduleTableBody");
        if (tableHead && tableBody && rows.length > 2) {
          let renderScheduleBlock = function(blockStartRow) {
            const dateRow = rows[blockStartRow];
            const dayRow = rows[blockStartRow + 1];
            const selectedList = multiSelect.getValues("scheduleGestorMultiSelect");
            const numCols = resolveScheduleColumnCount(dateRow);
            tableHead.innerHTML = buildScheduleHeadHTML(dateRow, dayRow, numCols, escape);
            tableBody.innerHTML = "";
            const currentUser = getUser();
            const sink = { html: "" };
            try {
              buildScheduleRowsHTML({
                rows,
                blockStartRow,
                numCols,
                selectedList,
                currentUser,
                getShiftForToday: (gestorName) => getShiftForDate2(rows, allScheduleBlocks, gestorName, newDate()),
                escape,
                normalizeName: normalizeName2,
                namesMatch: namesMatch2,
                sink,
                // Efectos de la fila del usuario actual: en el original ocurren dentro del bucle
                onCurrentUserShift: (badgeShift) => {
                  const userRoleEl = doc.getElementById("userRole");
                  if (userRoleEl) userRoleEl.textContent = `${currentUser.role} | Turno: ${badgeShift}`;
                  const headerShiftBadge = doc.querySelector(".shift-badge");
                  if (headerShiftBadge) headerShiftBadge.textContent = `TURNO: ${badgeShift}`;
                  if (currentUser.shift !== badgeShift) {
                    currentUser.shift = badgeShift;
                    persistUser(currentUser);
                    syncActiveSession();
                    loadExcelTasks();
                  }
                }
              });
            } finally {
              tableBody.innerHTML = sink.html;
            }
          };
          const weekSelector = doc.getElementById("weekSelector");
          const defaultBlockRow = findDefaultScheduleBlockRow(rows, allScheduleBlocks, newDate());
          const sortedGestores = listScheduleGestores(rows, allScheduleBlocks);
          multiSelect.setup("scheduleGestorMultiSelect", sortedGestores, () => {
            renderScheduleBlock(parseInt(weekSelector ? weekSelector.value : defaultBlockRow));
          });
          if (weekSelector) {
            weekSelector.innerHTML = buildWeekSelectorOptionsHTML(allScheduleBlocks, escape);
            weekSelector.value = defaultBlockRow;
            weekSelector.addEventListener("change", (e) => {
              renderScheduleBlock(parseInt(e.target.value));
            });
          }
          renderScheduleBlock(defaultBlockRow);
        }
      } catch (e) {
        logger.log("No se pudo cargar el horario", e);
      }
    }
    function loadTeletrabajo() {
      return fetchFn(buildTeleworkExcelUrl(now())).then((res) => {
        logger.log(`XLSX_TELEWORK_FETCH status=${res.status}`);
        return res;
      }).then((res) => {
        if (!res.ok) throw new Error("No se encontr\xF3 el archivo de Teletrabajo");
        return res.arrayBuffer();
      }).then((data) => {
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
        const allBlocks = findTeleworkBlocks(rows);
        if (allBlocks.length === 0) return;
        const weekSelector = doc.getElementById("teletrabajoWeekSelector");
        const tableHead = doc.getElementById("teletrabajoTableHead");
        const tableBody = doc.getElementById("teletrabajoTableBody");
        const sortedTeleGestores = listTeleworkGestores(allBlocks);
        const defaultBlockIdx = allBlocks.length - 1;
        multiSelect.setup("teletrabajoGestorMultiSelect", sortedTeleGestores, () => {
          renderTeletrabajoBlock(allBlocks[weekSelector ? weekSelector.value : defaultBlockIdx]);
        });
        if (weekSelector) {
          weekSelector.innerHTML = buildTeleworkWeekOptionsHTML(allBlocks, escape);
          weekSelector.value = defaultBlockIdx;
          weekSelector.addEventListener("change", (e) => {
            renderTeletrabajoBlock(allBlocks[e.target.value]);
          });
          renderTeletrabajoBlock(allBlocks[defaultBlockIdx]);
        }
        function renderTeletrabajoBlock(block) {
          const selectedList = multiSelect.getValues("teletrabajoGestorMultiSelect");
          tableHead.innerHTML = TELEWORK_TABLE_HEAD_HTML;
          tableBody.innerHTML = "";
          tableBody.innerHTML = buildTeleworkRowsHTML({
            block,
            selectedList,
            currentUser: getUser(),
            escape,
            normalizeName: normalizeName2,
            namesMatch: namesMatch2
          });
        }
      }).catch((err) => {
        logger.error("Error cargando Teletrabajo:", err);
        const tb = doc.getElementById("teletrabajoTableBody");
        if (tb) tb.innerHTML = TELEWORK_LOAD_ERROR_ROW_HTML;
      });
    }
    async function loadPermisos() {
      try {
        const currentUser = getUser();
        let permissionsRef = database.ref("permissions");
        const queryUid = resolvePermissionsQueryUid(currentUser, getAuthUid);
        if (queryUid) permissionsRef = permissionsRef.orderByChild("uid").equalTo(queryUid);
        const snapshot = await permissionsRef.once("value");
        const historicoContainer = doc.getElementById("historicoPermisosList");
        if (!historicoContainer) return;
        historicoContainer.innerHTML = "";
        if (snapshot.exists()) {
          const { all, visible } = selectVisiblePermissions(snapshot.val(), currentUser);
          allLoadedPermissions = all;
          if (visible.length === 0) {
            historicoContainer.innerHTML = PERMISSIONS_HISTORY_EMPTY_HTML;
            return;
          }
          visible.forEach((p) => {
            historicoContainer.innerHTML += buildPermissionHistoryItemHTML(p);
          });
        } else {
          historicoContainer.innerHTML = PERMISSIONS_NONE_REGISTERED_HTML;
        }
      } catch (e) {
        logger.error("No se pudo cargar permisos desde Firebase", e);
      }
    }
    async function openPermisoDetailModal(fbId) {
      let perm = allLoadedPermissions.find((p) => p.fb_id === fbId);
      if (!perm) {
        try {
          const snap = await database.ref("permissions/" + fbId).once("value");
          if (snap.exists()) perm = { ...snap.val(), fb_id: fbId };
        } catch (e) {
          logger.error(e);
        }
      }
      if (!perm) {
        alertFn("No se encontr\xF3 informaci\xF3n del permiso.");
        return;
      }
      const body = doc.getElementById("permDetailModalBody");
      if (!body) return;
      body.innerHTML = buildPermissionDetailHTML(perm);
      const modal = doc.getElementById("permDetailModal");
      if (modal) {
        modal.classList.add("active");
      }
    }
    return { loadExcelTasks, loadSchedule, loadTeletrabajo, loadPermisos, openPermisoDetailModal };
  }

  // ../src/domain/auth/approval-policy.js
  var approval_policy_exports = {};
  __export(approval_policy_exports, {
    APPROVALS_LIST_LIMIT: () => APPROVALS_LIST_LIMIT,
    APPROVAL_MESSAGES: () => APPROVAL_MESSAGES,
    DEFAULT_PERMISSION_APPROVAL_REASON: () => DEFAULT_PERMISSION_APPROVAL_REASON,
    HIDDEN_APPROVED_USER_EMAIL: () => HIDDEN_APPROVED_USER_EMAIL,
    SOLO_ADMIN_AUTO_APPROVAL_REASON: () => SOLO_ADMIN_AUTO_APPROVAL_REASON,
    USER_REJECTED_VALUE: () => USER_REJECTED_VALUE,
    buildUserApprovalUpdate: () => buildUserApprovalUpdate,
    buildUserRejectionUpdate: () => buildUserRejectionUpdate,
    buildUserRevertToPendingUpdate: () => buildUserRevertToPendingUpdate,
    canApproveUsers: () => canApproveUsers,
    canManagePermissionApprovals: () => canManagePermissionApprovals,
    canReadUsersList: () => canReadUsersList,
    canRejectUsers: () => canRejectUsers,
    canRevertUserRejection: () => canRevertUserRejection,
    canViewApprovalsView: () => canViewApprovalsView,
    canViewUsersApprovalSection: () => canViewUsersApprovalSection,
    isSoloAdminAutoApproved: () => isSoloAdminAutoApproved,
    isUserApproved: () => isUserApproved,
    isUserPending: () => isUserPending,
    isUserRejected: () => isUserRejected,
    validateRejectionReason: () => validateRejectionReason
  });
  var USER_REJECTED_VALUE = "Rechazado";
  var HIDDEN_APPROVED_USER_EMAIL = "maria.sanchez@virtualsoft.tech";
  var APPROVALS_LIST_LIMIT = 5;
  var DEFAULT_PERMISSION_APPROVAL_REASON = "Aprobado sin observaciones adicionales";
  var APPROVAL_MESSAGES = Object.freeze({
    CONFIRM_APPROVE_USER: "\xBFEst\xE1s seguro de aprobar el acceso para este usuario?",
    USER_APPROVED: "Usuario aprobado exitosamente. Ahora puede iniciar sesi\xF3n.",
    USER_REJECTED: "Usuario rechazado exitosamente.",
    REJECTION_REASON_REQUIRED: "Debes escribir un motivo de rechazo.",
    SERVER_ERROR: "Error al contactar al servidor",
    /**
     * Rol insuficiente (decisión D7: el controlador valida el rol en el cliente por defecto, `enforcePolicy`).
     * app.js no tiene este texto: sin la validación, Firebase rechaza y se ve SERVER_ERROR.
     */
    NOT_ALLOWED: "No tienes permiso para realizar esta acci\xF3n.",
    /** Decisión D9a (no existe en app.js): confirmar la reversión de un rechazo. */
    CONFIRM_REVERT_USER: '\xBFDeseas revertir el rechazo y devolver este usuario a "Pendiente de aprobaci\xF3n"?',
    /** Decisión D9a (no existe en app.js): reversión exitosa. */
    USER_REVERTED: 'Rechazo revertido: el usuario volvi\xF3 a "Pendiente de aprobaci\xF3n".',
    permissionUpdated: (newStatus) => `Permiso ${newStatus} exitosamente.`
  });
  function isApprovedActor(approved) {
    return approved === true;
  }
  function canApproveUsers(role, approved = true) {
    return role === ROLES.ADMIN && isApprovedActor(approved);
  }
  function canRejectUsers(role, approved = true) {
    return canApproveUsers(role, approved);
  }
  function canRevertUserRejection(role, approved = true) {
    return canApproveUsers(role, approved);
  }
  function canViewUsersApprovalSection(role) {
    return role === ROLES.ADMIN;
  }
  function canReadUsersList(role, approved = true) {
    return (role === ROLES.ADMIN || role === ROLES.SUPERVISOR) && isApprovedActor(approved);
  }
  function canViewApprovalsView(role) {
    return role === ROLES.ADMIN || role === ROLES.SUPERVISOR;
  }
  function canManagePermissionApprovals(role, approved = true) {
    return (role === ROLES.ADMIN || role === ROLES.SUPERVISOR) && isApprovedActor(approved);
  }
  function isUserPending(user) {
    return Boolean(user) && user.approved === false;
  }
  function isUserApproved(user) {
    return Boolean(user) && user.approved === true;
  }
  function isUserRejected(user) {
    return Boolean(user) && user.approved === USER_REJECTED_VALUE;
  }
  function validateRejectionReason(rawReason) {
    const reason = String(rawReason === null || rawReason === void 0 ? "" : rawReason).trim();
    if (!reason) {
      return { ok: false, message: APPROVAL_MESSAGES.REJECTION_REASON_REQUIRED };
    }
    return { ok: true, reason };
  }
  function buildUserApprovalUpdate(approvalDateIso) {
    return { approved: true, approvalDate: approvalDateIso };
  }
  function buildUserRejectionUpdate(reason) {
    return { approved: USER_REJECTED_VALUE, rejectionReason: reason };
  }
  function buildUserRevertToPendingUpdate() {
    return { approved: false, rejectionReason: null };
  }
  function isSoloAdminAutoApproved(user, approvedAdminCount) {
    if (!user || user.role !== ROLES.ADMIN) return false;
    return Number(approvedAdminCount) === 0;
  }
  var SOLO_ADMIN_AUTO_APPROVAL_REASON = "Auto-aprobado: primer Admin del sistema (D3-b, 2026-10-07)";

  // ../src/domain/permissions/permission-service.js
  var permission_service_exports = {};
  __export(permission_service_exports, {
    buildApproveDecision: () => buildApproveDecision,
    buildPermissionStatusUpdate: () => buildPermissionStatusUpdate,
    buildRejectDecision: () => buildRejectDecision,
    getPermissionUpdatedMessage: () => getPermissionUpdatedMessage,
    mapSnapshotEntries: () => mapSnapshotEntries,
    preparePermissionsView: () => preparePermissionsView,
    resolveApprovalReason: () => resolveApprovalReason,
    resolvePermissionCreatedTimeText: () => resolvePermissionCreatedTimeText
  });
  function mapSnapshotEntries(data, idField) {
    if (!data) return [];
    return Object.keys(data).map((key) => ({ ...data[key], [idField]: key }));
  }
  function resolvePermissionCreatedTimeText(permission) {
    let createdTimeText = permission.horaSolicitud;
    if (!createdTimeText && permission.id) {
      try {
        const d = new Date(permission.id);
        createdTimeText = `${d.toLocaleDateString("es-CO")} ${d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
      } catch (err) {
        createdTimeText = "N/A";
      }
    }
    return createdTimeText;
  }
  function preparePermissionsView(permisos) {
    let pending = permisos.filter((p) => p.status === PERMISSION_STATUS.PENDING);
    pending.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    let truncated = false;
    let noticeText = null;
    let total = pending.length;
    if (pending.length > APPROVALS_LIST_LIMIT) {
      total = pending.length;
      pending = pending.slice(0, APPROVALS_LIST_LIMIT);
      truncated = true;
      noticeText = `Mostrando los 5 permisos m\xE1s recientes de ${total} pendientes.`;
    }
    const history = permisos.filter((p) => p.status !== PERMISSION_STATUS.PENDING);
    history.sort((a, b) => b.id - a.id);
    return { pending, total, truncated, noticeText, history };
  }
  function buildPermissionStatusUpdate(newStatus, reason = null) {
    const updates = { status: newStatus, notified: false };
    if (reason) {
      updates.rejectionReason = reason;
    }
    return updates;
  }
  function resolveApprovalReason(rawReason) {
    const reason = String(rawReason === null || rawReason === void 0 ? "" : rawReason).trim();
    return reason || DEFAULT_PERMISSION_APPROVAL_REASON;
  }
  function buildApproveDecision(rawReason) {
    return { status: PERMISSION_STATUS.APPROVED, reason: resolveApprovalReason(rawReason) };
  }
  function buildRejectDecision(rawReason) {
    const check = validateRejectionReason(rawReason);
    if (!check.ok) return check;
    return { ok: true, status: PERMISSION_STATUS.REJECTED, reason: check.reason };
  }
  function getPermissionUpdatedMessage(newStatus) {
    return APPROVAL_MESSAGES.permissionUpdated(newStatus);
  }

  // ../src/domain/permissions/user-approval-list.js
  var user_approval_list_exports = {};
  __export(user_approval_list_exports, {
    REJECTED_FILTER_OPTION: () => REJECTED_FILTER_OPTION,
    USER_DATE_FORMAT_OPTIONS: () => USER_DATE_FORMAT_OPTIONS,
    USER_STATUS_FILTER: () => USER_STATUS_FILTER,
    formatApprovalDate: () => formatApprovalDate,
    formatRegistrationDate: () => formatRegistrationDate,
    prepareUsersApprovalList: () => prepareUsersApprovalList,
    selectRejectedUsers: () => selectRejectedUsers
  });
  var USER_STATUS_FILTER = Object.freeze({
    ALL: "Todos",
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    /** Decisión D9a: no existe en el `<select>` de index.html; el controlador agrega la opción. */
    REJECTED: "Rechazado"
  });
  var REJECTED_FILTER_OPTION = Object.freeze({ value: USER_STATUS_FILTER.REJECTED, text: "Rechazados" });
  function byRegistrationDateDesc(a, b) {
    const dateA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
    const dateB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
    return dateB - dateA;
  }
  function matchesSearch(user, searchVal) {
    return searchVal === "" || normalizeName(user.name || "").includes(searchVal) || normalizeName(user.email || "").includes(searchVal);
  }
  function selectRejectedUsers(users, search = "") {
    const searchVal = search ? normalizeName(search) : "";
    return users.filter((u) => u && u.approved === USER_REJECTED_VALUE).sort(byRegistrationDateDesc).filter((u) => matchesSearch(u, searchVal));
  }
  var USER_DATE_FORMAT_OPTIONS = Object.freeze({ year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  function prepareUsersApprovalList(users, filters = {}, { includeRejected = true } = {}) {
    const searchVal = filters.search ? normalizeName(filters.search) : "";
    const statusVal = filters.status ? filters.status : USER_STATUS_FILTER.ALL;
    if (includeRejected && statusVal === USER_STATUS_FILTER.REJECTED) {
      const rejected = selectRejectedUsers(users, filters.search || "");
      return { rows: rejected, total: rejected.length, hasFilter: true, truncated: false, noticeText: null };
    }
    const pending = users.filter((u) => u.approved === false);
    const approved = users.filter((u) => u.approved === true && u.email !== HIDDEN_APPROVED_USER_EMAIL);
    let rows = [...pending, ...approved].sort((a, b) => {
      const dateA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
      const dateB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
      return dateB - dateA;
    });
    const hasFilter = searchVal !== "" || statusVal !== USER_STATUS_FILTER.ALL;
    rows = rows.filter((u) => {
      const matchSearch = searchVal === "" || normalizeName(u.name || "").includes(searchVal) || normalizeName(u.email || "").includes(searchVal);
      let matchStatus = true;
      if (statusVal === USER_STATUS_FILTER.PENDING) matchStatus = u.approved === false;
      if (statusVal === USER_STATUS_FILTER.APPROVED) matchStatus = u.approved === true;
      return matchSearch && matchStatus;
    });
    const total = [...pending, ...approved].length;
    let truncated = false;
    let noticeText = null;
    if (!hasFilter && rows.length > APPROVALS_LIST_LIMIT) {
      rows = rows.slice(0, APPROVALS_LIST_LIMIT);
      truncated = true;
      noticeText = `Mostrando los 5 registros m\xE1s recientes de ${total} en total. Usa los filtros arriba para buscar m\xE1s.`;
    }
    return { rows, total, hasFilter, truncated, noticeText };
  }
  function formatRegistrationDate(user, formatDate = defaultFormatDate) {
    return user.registrationDate ? formatDate(new Date(user.registrationDate)) : "Desconocida";
  }
  function formatApprovalDate(user, formatDate = defaultFormatDate) {
    if (user.approvalDate) return formatDate(new Date(user.approvalDate));
    return user.approved === true ? "Desconocida" : "-";
  }
  function defaultFormatDate(date) {
    return date.toLocaleString([], USER_DATE_FORMAT_OPTIONS);
  }

  // ../src/domain/tasks/extra-task.js
  var extra_task_exports = {};
  __export(extra_task_exports, {
    EXTRA_TASK_DEFAULT_STATUS: () => EXTRA_TASK_DEFAULT_STATUS,
    EXTRA_TASK_MESSAGES: () => EXTRA_TASK_MESSAGES,
    EXTRA_TASK_NAME_PREFIX: () => EXTRA_TASK_NAME_PREFIX,
    EXTRA_TASK_SAVING_BUTTON_HTML: () => EXTRA_TASK_SAVING_BUTTON_HTML,
    buildExtraTaskRecord: () => buildExtraTaskRecord,
    isExtraTaskKey: () => isExtraTaskKey,
    isKnownExtraTaskStatus: () => isKnownExtraTaskStatus,
    isPermissionDeniedError: () => isPermissionDeniedError,
    normalizeExtraTaskInput: () => normalizeExtraTaskInput,
    resolveExtraTaskId: () => resolveExtraTaskId,
    resolveExtraTaskSaveErrorMessage: () => resolveExtraTaskSaveErrorMessage,
    validateExtraTaskIdentity: () => validateExtraTaskIdentity,
    validateExtraTaskInput: () => validateExtraTaskInput
  });
  var EXTRA_TASK_NAME_PREFIX = "[EXTRA] ";
  var EXTRA_TASK_MESSAGES = Object.freeze({
    NAME_REQUIRED: "OBLIGATORIO: Debes ingresar el nombre de la tarea extra.",
    OBSERVATION_REQUIRED: "OBLIGATORIO: Debes detallar la gesti\xF3n realizada en las Notas T\xE9cnicas.",
    SESSION_EXPIRED: "Tu sesi\xF3n expir\xF3. Vuelve a iniciar sesi\xF3n para guardar la tarea extra.",
    IDENTITY_MISMATCH: "No se pudo verificar tu identidad. Vuelve a iniciar sesi\xF3n para guardar la tarea extra.",
    PERMISSION_DENIED: "No tienes permiso para guardar esta tarea extra. Contacta a tu supervisor.",
    SAVE_FAILED: "No se pudo guardar la tarea extra en el servidor. El cambio qued\xF3 respaldado localmente; intenta guardar de nuevo.",
    saved: (name) => `Tarea Adicional "${name}" agregada exitosamente y se incluir\xE1 en tu reporte de turno.`
  });
  var EXTRA_TASK_SAVING_BUTTON_HTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";
  var EXTRA_TASK_DEFAULT_STATUS = TASK_STATUS.DONE;
  function normalizeExtraTaskInput(raw) {
    return {
      name: String(raw.name === null || raw.name === void 0 ? "" : raw.name).trim(),
      status: raw.status,
      obs: String(raw.obs === null || raw.obs === void 0 ? "" : raw.obs).trim()
    };
  }
  function validateExtraTaskInput(input) {
    if (!input.name) return { ok: false, message: EXTRA_TASK_MESSAGES.NAME_REQUIRED };
    if (!input.obs) return { ok: false, message: EXTRA_TASK_MESSAGES.OBSERVATION_REQUIRED };
    return { ok: true };
  }
  function validateExtraTaskIdentity(authUser, currentUser) {
    if (!authUser) return { ok: false, message: EXTRA_TASK_MESSAGES.SESSION_EXPIRED };
    if (!currentUser || currentUser.uid !== authUser.uid) return { ok: false, message: EXTRA_TASK_MESSAGES.IDENTITY_MISMATCH };
    return { ok: true };
  }
  function resolveExtraTaskId(pendingId, nowMs) {
    return pendingId || EXTRA_TASK_KEY_PREFIX + nowMs;
  }
  function buildExtraTaskRecord(input, nowMs) {
    return {
      name: EXTRA_TASK_NAME_PREFIX + input.name,
      status: input.status,
      observation: input.obs,
      updatedAt: nowMs
    };
  }
  function isExtraTaskKey(taskId) {
    return typeof taskId === "string" && taskId.startsWith(EXTRA_TASK_KEY_PREFIX);
  }
  function isKnownExtraTaskStatus(status) {
    return Object.values(TASK_STATUS).includes(status);
  }
  function isPermissionDeniedError(error) {
    const errorCode = error && error.code ? error.code : "";
    return errorCode === "PERMISSION_DENIED" || /permission[_ ]denied/i.test(error && error.message || "");
  }
  function resolveExtraTaskSaveErrorMessage(error) {
    return isPermissionDeniedError(error) ? EXTRA_TASK_MESSAGES.PERMISSION_DENIED : EXTRA_TASK_MESSAGES.SAVE_FAILED;
  }

  // ../src/domain/tasks/exception-justification.js
  var exception_justification_exports = {};
  __export(exception_justification_exports, {
    EXCEPTION_MESSAGES: () => EXCEPTION_MESSAGES,
    buildExceptionObservation: () => buildExceptionObservation,
    validateExceptionInput: () => validateExceptionInput
  });
  var EXCEPTION_MESSAGES = Object.freeze({
    REASON_REQUIRED: "Por favor seleccione una raz\xF3n principal.",
    DETAILS_REQUIRED: "Por favor detalle el problema obligatoriamente."
  });
  function validateExceptionInput({ reasonValue, details }) {
    const trimmed = String(details === null || details === void 0 ? "" : details).trim();
    if (!reasonValue) return { ok: false, message: EXCEPTION_MESSAGES.REASON_REQUIRED };
    if (!trimmed) return { ok: false, message: EXCEPTION_MESSAGES.DETAILS_REQUIRED };
    return { ok: true, details: trimmed };
  }
  function buildExceptionObservation(reasonText, details) {
    return `Excepci\xF3n: ${reasonText}${details ? " - " + details : ""}`;
  }

  // ../src/services/firebase/firebase-approvals-repository.js
  var firebase_approvals_repository_exports = {};
  __export(firebase_approvals_repository_exports, {
    createApprovalsRepository: () => createApprovalsRepository
  });
  function assertKey(value, errorCode) {
    if (typeof value !== "string" || value === "") throw new Error(errorCode);
  }
  function createApprovalsRepository({ database }) {
    async function fetchUsers() {
      const snapshot = await database.ref("users").once("value");
      return snapshot.exists() ? mapSnapshotEntries(snapshot.val(), "id") : [];
    }
    async function fetchPermissions() {
      const snapshot = await database.ref("permissions").once("value");
      return snapshot.exists() ? mapSnapshotEntries(snapshot.val(), "fb_id") : [];
    }
    async function approveUser(userId, approvalDateIso) {
      assertKey(userId, "MISSING_USER_ID");
      await database.ref("users/" + userId).update(buildUserApprovalUpdate(approvalDateIso));
    }
    async function rejectUser(userId, reason) {
      assertKey(userId, "MISSING_USER_ID");
      await database.ref("users/" + userId).update(buildUserRejectionUpdate(reason));
    }
    async function revertUserToPending(userId) {
      assertKey(userId, "MISSING_USER_ID");
      await database.ref("users/" + userId).update(buildUserRevertToPendingUpdate());
    }
    async function updatePermissionStatus(permissionId, newStatus, reason = null) {
      assertKey(permissionId, "MISSING_PERMISSION_ID");
      await database.ref("permissions/" + permissionId).update(buildPermissionStatusUpdate(newStatus, reason));
    }
    return { fetchUsers, fetchPermissions, approveUser, rejectUser, revertUserToPending, updatePermissionStatus };
  }

  // ../src/controllers/approvals-controller.js
  var approvals_controller_exports = {};
  __export(approvals_controller_exports, {
    APPROVALS_LEGACY_OPTIONS: () => APPROVALS_LEGACY_OPTIONS,
    createApprovalsController: () => createApprovalsController,
    createModalsController: () => createModalsController
  });

  // ../src/ui/components/approval-boxes.js
  var approval_boxes_exports = {};
  __export(approval_boxes_exports, {
    APPROVAL_BOX: () => APPROVAL_BOX,
    cancelApprovalBox: () => cancelApprovalBox,
    permissionActionContainerIds: () => permissionActionContainerIds,
    readApprovalReason: () => readApprovalReason,
    setApprovalButtonsDisabled: () => setApprovalButtonsDisabled,
    showApprovalBox: () => showApprovalBox,
    userActionContainerIds: () => userActionContainerIds
  });

  // ../src/ui/components/pending-users-table.js
  var pending_users_table_exports = {};
  __export(pending_users_table_exports, {
    NO_USERS_ROW_HTML: () => NO_USERS_ROW_HTML,
    USER_REJECTED_ACTIONS_PREFIX: () => USER_REJECTED_ACTIONS_PREFIX,
    buildRejectedUserActionHtml: () => buildRejectedUserActionHtml,
    buildUserActionHtml: () => buildUserActionHtml,
    buildUserRoleBadgeHtml: () => buildUserRoleBadgeHtml,
    buildUserRowHtml: () => buildUserRowHtml,
    ensureRejectedFilterOption: () => ensureRejectedFilterOption
  });
  var USER_REJECTED_ACTIONS_PREFIX = "user-rejected-actions-";
  var NO_USERS_ROW_HTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay usuarios que coincidan con los filtros.</td></tr>`;
  function buildRejectedUserActionHtml(user) {
    const reason = user.rejectionReason === void 0 || user.rejectionReason === null || user.rejectionReason === "" ? "No especificado" : user.rejectionReason;
    return `
                <span style="color: var(--danger); font-weight: bold;"><i class='bx bx-x'></i> Rechazado</span>
                <br><small style="color: var(--text-secondary);">Motivo: ${escapeHTML(reason)}</small>
                <div id="${USER_REJECTED_ACTIONS_PREFIX}${escapeHTML(user.id)}" style="display:flex; justify-content:center; gap:5px; margin-top:5px;">
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" title="Devolver a Pendiente de aprobaci\xF3n" onclick="revertRejectedUser(decodeURIComponent('${encodeInlineHandlerArg(user.id)}'))">Revertir</button>
                    <button class="btn btn-success" style="padding: 5px 10px; font-size: 12px;" onclick="approveUser(decodeURIComponent('${encodeInlineHandlerArg(user.id)}'))">Aprobar</button>
                </div>
            `;
  }
  function buildUserActionHtml(user, { rejectedActions = true } = {}) {
    let actionHtml = "";
    if (user.approved === true) {
      actionHtml = `<span style="color: var(--success); font-weight: bold;"><i class='bx bx-check'></i> Aprobado</span>`;
    } else if (user.approved === "Rechazado" && rejectedActions) {
      actionHtml = buildRejectedUserActionHtml(user);
    } else if (user.approved === "Rechazado") {
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
    return actionHtml;
  }
  function buildUserRoleBadgeHtml(user, { escapeRole = true } = {}) {
    const role = escapeRole ? escapeHTML(user.role) : user.role;
    const statusBadge = user.approved ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">${role}</span>` : `<span class="badge pending">${role}</span>`;
    return statusBadge;
  }
  function buildUserRowHtml(user, { regDateStr, appDateStr, escapeRole = true, rejectedActions = true }) {
    const actionHtml = buildUserActionHtml(user, { rejectedActions });
    const statusBadge = buildUserRoleBadgeHtml(user, { escapeRole });
    return `
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
  }
  function ensureRejectedFilterOption(doc, select) {
    if (!select || !select.options || typeof select.appendChild !== "function") return false;
    const exists = Array.prototype.some.call(select.options, (o) => o && o.value === REJECTED_FILTER_OPTION.value);
    if (exists) return true;
    const option = doc.createElement("option");
    option.value = REJECTED_FILTER_OPTION.value;
    option.textContent = REJECTED_FILTER_OPTION.text;
    if (option.style) option.style.color = "black";
    select.appendChild(option);
    return true;
  }

  // ../src/ui/components/approval-boxes.js
  var APPROVAL_BOX = Object.freeze({
    USER_REJECT: Object.freeze({ actionsPrefix: "user-action-btns-", boxPrefix: "user-reject-box-", reasonPrefix: "user-reason-" }),
    PERMISSION_REJECT: Object.freeze({ actionsPrefix: "perm-action-btns-", boxPrefix: "perm-reject-box-", reasonPrefix: "perm-reason-" }),
    PERMISSION_APPROVE: Object.freeze({ actionsPrefix: "perm-action-btns-", boxPrefix: "perm-approve-box-", reasonPrefix: "perm-approve-reason-" })
  });
  function showApprovalBox(doc, box, id) {
    doc.getElementById(box.actionsPrefix + id).style.display = "none";
    doc.getElementById(box.boxPrefix + id).style.display = "flex";
  }
  function cancelApprovalBox(doc, box, id) {
    doc.getElementById(box.boxPrefix + id).style.display = "none";
    doc.getElementById(box.actionsPrefix + id).style.display = "flex";
    doc.getElementById(box.reasonPrefix + id).value = "";
  }
  function readApprovalReason(doc, box, id) {
    return doc.getElementById(box.reasonPrefix + id).value.trim();
  }
  function setApprovalButtonsDisabled(doc, containerIds, disabled) {
    for (const id of containerIds) {
      const container = doc.getElementById(id);
      if (!container || typeof container.querySelectorAll !== "function") continue;
      Array.prototype.forEach.call(container.querySelectorAll("button"), (button) => {
        button.disabled = disabled;
      });
    }
  }
  function userActionContainerIds(id) {
    return [
      APPROVAL_BOX.USER_REJECT.actionsPrefix + id,
      APPROVAL_BOX.USER_REJECT.boxPrefix + id,
      USER_REJECTED_ACTIONS_PREFIX + id
    ];
  }
  function permissionActionContainerIds(id) {
    return [
      APPROVAL_BOX.PERMISSION_REJECT.actionsPrefix + id,
      APPROVAL_BOX.PERMISSION_APPROVE.boxPrefix + id,
      APPROVAL_BOX.PERMISSION_REJECT.boxPrefix + id
    ];
  }

  // ../src/ui/components/list-notice.js
  var list_notice_exports = {};
  __export(list_notice_exports, {
    LIST_NOTICE_IDS: () => LIST_NOTICE_IDS,
    LIST_NOTICE_STYLE: () => LIST_NOTICE_STYLE,
    removeListNotice: () => removeListNotice,
    showListNotice: () => showListNotice
  });
  var LIST_NOTICE_STYLE = "text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 10px; margin-bottom: 15px; font-style: italic;";
  var LIST_NOTICE_IDS = Object.freeze({
    USERS: "pendingMostrandoMsg",
    PERMISSIONS: "pendingPermsMostrandoMsg"
  });
  function removeListNotice(doc, noticeId) {
    const existing = doc.getElementById(noticeId);
    if (existing) existing.remove();
  }
  function showListNotice(doc, { tbodyId, noticeId, text, requireTable = false }) {
    if (requireTable && !doc.getElementById(tbodyId)) return;
    removeListNotice(doc, noticeId);
    const msg = doc.createElement("div");
    msg.id = noticeId;
    msg.style = LIST_NOTICE_STYLE;
    msg.innerText = text;
    doc.getElementById(tbodyId).parentElement.parentElement.appendChild(msg);
  }

  // ../src/ui/components/modal.js
  var modal_exports = {};
  __export(modal_exports, {
    closeModal: () => closeModal,
    openExceptionModal: () => openExceptionModal,
    openExtraTaskModal: () => openExtraTaskModal,
    openModal: () => openModal
  });
  function openModal(doc, modalId) {
    const modal = doc.getElementById(modalId);
    if (modal) modal.classList.add("active");
  }
  function closeModal(doc, modalId) {
    const modal = doc.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
    }
  }
  function openExceptionModal(doc) {
    doc.querySelectorAll(".btn-status").forEach((b) => b.classList.remove("active"));
    doc.querySelector(".btn-status.not-done").classList.add("active");
    const exReason = doc.getElementById("exceptionReason");
    if (exReason) exReason.value = "";
    const exDetails = doc.getElementById("exceptionDetails");
    if (exDetails) exDetails.value = "";
    const modal = doc.getElementById("exceptionModal");
    if (modal) {
      modal.classList.add("active");
    }
  }
  function openExtraTaskModal(doc, defaultStatus) {
    const modal = doc.getElementById("extraTaskModal");
    if (!modal) return false;
    doc.getElementById("extraTaskName").value = "";
    doc.getElementById("extraTaskStatus").value = defaultStatus;
    doc.getElementById("extraTaskObs").value = "";
    modal.classList.add("active");
    return true;
  }

  // ../src/ui/components/pending-permissions-table.js
  var pending_permissions_table_exports = {};
  __export(pending_permissions_table_exports, {
    NO_PENDING_PERMISSIONS_ROW_HTML: () => NO_PENDING_PERMISSIONS_ROW_HTML,
    NO_PERMISSION_HISTORY_ROW_HTML: () => NO_PERMISSION_HISTORY_ROW_HTML,
    buildPendingPermissionRowHtml: () => buildPendingPermissionRowHtml,
    buildPermissionHistoryRowHtml: () => buildPermissionHistoryRowHtml
  });
  var NO_PENDING_PERMISSIONS_ROW_HTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay permisos pendientes de aprobaci\xF3n.</td></tr>`;
  var NO_PERMISSION_HISTORY_ROW_HTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay historial de permisos procesados.</td></tr>`;
  function buildPendingPermissionRowHtml(p, createdTimeText) {
    return `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-weight: 600; color: var(--text-primary);">${escapeHTML(p.gestor)}</td>
                <td style="padding: 12px;">
                    <span class="badge pending">${escapeHTML(p.tipo)}</span>
                    <br><small style="font-size:10px; color:var(--accent-primary); font-weight:500;"><i class='bx bx-time-five'></i> ${escapeHTML(createdTimeText)}</small>
                </td>
                <td style="padding: 12px; color: var(--text-secondary); font-size: 12px; white-space: nowrap;"><strong>${escapeHTML(p.fecha)}</strong><br><span style="opacity: 0.85;">${escapeHTML(p.horaInicio)} a ${escapeHTML(p.horaFin)}</span></td>
                <td style="padding: 12px; font-size: 13px; min-width: 250px;">
                    <div style="background: rgba(255, 255, 255, 0.04); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--glass-border); color: var(--text-primary); line-height: 1.45; word-break: break-word; white-space: pre-wrap;">
                        ${escapeHTML(p.motivo || "Sin observaci\xF3n")}
                    </div>
                </td>
                <td style="padding: 12px; text-align: center; min-width: 220px;">
                    <div id="perm-action-btns-${escapeHTML(p.fb_id)}" style="display:flex; justify-content:center; gap:8px;">
                        <button class="btn btn-success" style="padding: 6px 14px; font-size: 12px; display:inline-flex; align-items:center; gap:4px;" onclick="showPermApproveBox(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))"><i class='bx bx-check' style="font-size:16px;"></i> Aprobar</button>
                        <button class="btn btn-danger" style="padding: 6px 14px; font-size: 12px; display:inline-flex; align-items:center; gap:4px;" onclick="showPermRejectBox(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))"><i class='bx bx-x' style="font-size:16px;"></i> Rechazar</button>
                    </div>
                    <div id="perm-approve-box-${escapeHTML(p.fb_id)}" style="display:none; flex-direction:column; gap:8px; margin-top:5px; background: rgba(16, 185, 129, 0.08); padding: 10px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
                        <label for="perm-approve-reason-${escapeHTML(p.fb_id)}" style="font-size:11px; font-weight:600; color:var(--success); text-align:left;">Observaci\xF3n de aprobaci\xF3n:</label>
                        <textarea id="perm-approve-reason-${escapeHTML(p.fb_id)}" name="perm-approve-reason-${escapeHTML(p.fb_id)}" placeholder="Escribe un comentario u observaci\xF3n para el gestor..." class="modern-input" style="padding:8px; font-size:12px; width:100%; min-height:60px; resize:vertical; box-sizing:border-box; border-radius:6px; font-family:inherit;"></textarea>
                        <div style="display:flex; gap:6px; justify-content:flex-end;">
                            <button class="btn btn-success" style="padding: 5px 12px; font-size: 11px;" onclick="confirmApprovePerm(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))">Confirmar Aprobar</button>
                            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 11px;" onclick="cancelApprovePerm(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))">Cancelar</button>
                        </div>
                    </div>
                    <div id="perm-reject-box-${escapeHTML(p.fb_id)}" style="display:none; flex-direction:column; gap:8px; margin-top:5px; background: rgba(239, 68, 68, 0.08); padding: 10px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
                        <label for="perm-reason-${escapeHTML(p.fb_id)}" style="font-size:11px; font-weight:600; color:var(--danger); text-align:left;">Motivo de rechazo:</label>
                        <textarea id="perm-reason-${escapeHTML(p.fb_id)}" name="perm-reason-${escapeHTML(p.fb_id)}" placeholder="Escribe la raz\xF3n por la cual se rechaza..." class="modern-input" style="padding:8px; font-size:12px; width:100%; min-height:60px; resize:vertical; box-sizing:border-box; border-radius:6px; font-family:inherit;"></textarea>
                        <div style="display:flex; gap:6px; justify-content:flex-end;">
                            <button class="btn btn-danger" style="padding: 5px 12px; font-size: 11px;" onclick="confirmRejectPerm(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))">Confirmar Rechazo</button>
                            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 11px;" onclick="cancelRejectPerm(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))">Cancelar</button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
  }
  function buildPermissionHistoryRowHtml(p) {
    const statusBadge = p.status === PERMISSION_STATUS.APPROVED ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);"><i class='bx bx-check'></i> Aprobado</span>` : `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: var(--danger);"><i class='bx bx-x'></i> Rechazado</span>`;
    return `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <td style="padding: 12px; font-weight: 500;">${escapeHTML(p.gestor)}</td>
                        <td style="padding: 12px;">${escapeHTML(p.tipo)}</td>
                        <td style="padding: 12px;">${statusBadge}</td>
                        <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">${escapeHTML(p.fecha)}</td>
                        <td style="padding: 12px; font-size: 13px; color: var(--text-secondary);">${escapeHTML(p.rejectionReason || "-")}</td>
                    </tr>
                `;
  }

  // ../src/controllers/approvals-controller.js
  var NOTICE_DELAY_MS = 100;
  var APPROVALS_LEGACY_OPTIONS = Object.freeze({
    preventDuplicates: false,
    enforcePolicy: false,
    escapeRole: false,
    showRejectedUsers: false
  });
  function createApprovalsController(deps) {
    const {
      doc,
      repository,
      alert: showAlert,
      confirm: askConfirm,
      now = () => /* @__PURE__ */ new Date(),
      schedule = (fn, ms) => setTimeout(fn, ms),
      logger = console,
      onPermissionUpdated,
      getUser,
      enforcePolicy = true,
      preventDuplicates = true,
      escapeRole = true,
      showRejectedUsers = true,
      formatDate
    } = deps;
    const inFlight = /* @__PURE__ */ new Set();
    async function guarded(key, containerIds, action) {
      if (preventDuplicates) {
        if (inFlight.has(key)) return void 0;
        inFlight.add(key);
        setApprovalButtonsDisabled(doc, containerIds, true);
      }
      try {
        return await action();
      } finally {
        if (preventDuplicates) {
          inFlight.delete(key);
          setApprovalButtonsDisabled(doc, containerIds, false);
        }
      }
    }
    function isAllowed(check) {
      if (!enforcePolicy) return true;
      const user = getUser && getUser() || {};
      if (check(user.role, user.approved === void 0 ? true : user.approved)) return true;
      showAlert(APPROVAL_MESSAGES.NOT_ALLOWED);
      return false;
    }
    function fireAndLog(promise) {
      if (promise && typeof promise.catch === "function") promise.catch((error) => logger.error(error));
    }
    async function renderPendingUsers() {
      const tbody = doc.getElementById("pendingUsersTableBody");
      if (!tbody) return;
      let users = [];
      try {
        users = await repository.fetchUsers();
      } catch (e) {
        logger.error(e);
      }
      tbody.innerHTML = "";
      const searchInput = doc.getElementById("filterAprobacionesSearch");
      const statusSelect = doc.getElementById("filterAprobacionesStatus");
      const filters = {
        search: searchInput ? searchInput.value : "",
        status: statusSelect ? statusSelect.value : "Todos"
      };
      if (showRejectedUsers) ensureRejectedFilterOption(doc, statusSelect);
      const view = prepareUsersApprovalList(users, filters, { includeRejected: showRejectedUsers });
      if (view.truncated) {
        schedule(() => {
          showListNotice(doc, { tbodyId: "pendingUsersTableBody", noticeId: LIST_NOTICE_IDS.USERS, text: view.noticeText, requireTable: true });
        }, NOTICE_DELAY_MS);
      } else {
        schedule(() => removeListNotice(doc, LIST_NOTICE_IDS.USERS), NOTICE_DELAY_MS);
      }
      if (view.rows.length === 0) {
        tbody.innerHTML = NO_USERS_ROW_HTML;
        return;
      }
      const html = view.rows.map((user) => buildUserRowHtml(user, {
        regDateStr: formatRegistrationDate(user, formatDate),
        appDateStr: formatApprovalDate(user, formatDate),
        escapeRole,
        rejectedActions: showRejectedUsers
      })).join("");
      tbody.innerHTML += html;
    }
    async function approveUser(userId) {
      return guarded("user:" + userId, userActionContainerIds(userId), async () => {
        if (!isAllowed(canApproveUsers)) return;
        if (!askConfirm(APPROVAL_MESSAGES.CONFIRM_APPROVE_USER)) return;
        try {
          await repository.approveUser(userId, now().toISOString());
          showAlert(APPROVAL_MESSAGES.USER_APPROVED);
          fireAndLog(renderPendingUsers());
        } catch (e) {
          showAlert(APPROVAL_MESSAGES.SERVER_ERROR);
        }
      });
    }
    function showUserRejectBox(id) {
      showApprovalBox(doc, APPROVAL_BOX.USER_REJECT, id);
    }
    function cancelRejectUser(id) {
      cancelApprovalBox(doc, APPROVAL_BOX.USER_REJECT, id);
    }
    async function confirmRejectUser(userId) {
      return guarded("user:" + userId, userActionContainerIds(userId), async () => {
        if (!isAllowed(canApproveUsers)) return;
        const check = validateRejectionReason(readApprovalReason(doc, APPROVAL_BOX.USER_REJECT, userId));
        if (!check.ok) {
          showAlert(check.message);
          return;
        }
        try {
          await repository.rejectUser(userId, check.reason);
          showAlert(APPROVAL_MESSAGES.USER_REJECTED);
          fireAndLog(renderPendingUsers());
        } catch (e) {
          showAlert(APPROVAL_MESSAGES.SERVER_ERROR);
        }
      });
    }
    async function revertRejectedUser(userId) {
      if (!showRejectedUsers) return void 0;
      return guarded("user:" + userId, userActionContainerIds(userId), async () => {
        if (!isAllowed(canRevertUserRejection)) return;
        if (!askConfirm(APPROVAL_MESSAGES.CONFIRM_REVERT_USER)) return;
        try {
          await repository.revertUserToPending(userId);
          showAlert(APPROVAL_MESSAGES.USER_REVERTED);
          fireAndLog(renderPendingUsers());
        } catch (e) {
          showAlert(APPROVAL_MESSAGES.SERVER_ERROR);
        }
      });
    }
    async function renderPendingPermissions() {
      const tbody = doc.getElementById("pendingPermissionsTableBody");
      if (!tbody) return;
      let permisos = [];
      try {
        permisos = await repository.fetchPermissions();
      } catch (e) {
        logger.error(e);
      }
      const view = preparePermissionsView(permisos);
      if (view.truncated) {
        schedule(() => {
          showListNotice(doc, { tbodyId: "pendingPermissionsTableBody", noticeId: LIST_NOTICE_IDS.PERMISSIONS, text: view.noticeText });
        }, NOTICE_DELAY_MS);
      } else {
        schedule(() => removeListNotice(doc, LIST_NOTICE_IDS.PERMISSIONS), NOTICE_DELAY_MS);
      }
      tbody.innerHTML = "";
      if (view.pending.length === 0) {
        tbody.innerHTML = NO_PENDING_PERMISSIONS_ROW_HTML;
        return;
      }
      tbody.innerHTML += view.pending.map((p) => buildPendingPermissionRowHtml(p, resolvePermissionCreatedTimeText(p))).join("");
      const historyBody = doc.getElementById("historyPermissionsTableBody");
      if (historyBody) {
        historyBody.innerHTML = "";
        if (view.history.length === 0) {
          historyBody.innerHTML = NO_PERMISSION_HISTORY_ROW_HTML;
        } else {
          historyBody.innerHTML += view.history.map((p) => buildPermissionHistoryRowHtml(p)).join("");
        }
      }
    }
    function showPermRejectBox(id) {
      showApprovalBox(doc, APPROVAL_BOX.PERMISSION_REJECT, id);
    }
    function cancelRejectPerm(id) {
      cancelApprovalBox(doc, APPROVAL_BOX.PERMISSION_REJECT, id);
    }
    function showPermApproveBox(id) {
      showApprovalBox(doc, APPROVAL_BOX.PERMISSION_APPROVE, id);
    }
    function cancelApprovePerm(id) {
      cancelApprovalBox(doc, APPROVAL_BOX.PERMISSION_APPROVE, id);
    }
    async function updatePermissionStatus(fbId, newStatus, reason = null) {
      return guarded("permission:" + fbId, permissionActionContainerIds(fbId), async () => {
        if (!isAllowed(canManagePermissionApprovals)) return;
        try {
          await repository.updatePermissionStatus(fbId, newStatus, reason);
          showAlert(APPROVAL_MESSAGES.permissionUpdated(newStatus));
          fireAndLog(renderPendingPermissions());
          if (onPermissionUpdated) fireAndLog(onPermissionUpdated());
        } catch (e) {
          showAlert(APPROVAL_MESSAGES.SERVER_ERROR);
        }
      });
    }
    async function confirmRejectPerm(id) {
      const decision = buildRejectDecision(readApprovalReason(doc, APPROVAL_BOX.PERMISSION_REJECT, id));
      if (!decision.ok) {
        showAlert(decision.message);
        return;
      }
      await updatePermissionStatus(id, decision.status, decision.reason);
    }
    async function confirmApprovePerm(id) {
      const decision = buildApproveDecision(readApprovalReason(doc, APPROVAL_BOX.PERMISSION_APPROVE, id));
      await updatePermissionStatus(id, decision.status, decision.reason);
    }
    return {
      renderPendingUsers,
      approveUser,
      showUserRejectBox,
      cancelRejectUser,
      confirmRejectUser,
      revertRejectedUser,
      renderPendingPermissions,
      showPermRejectBox,
      cancelRejectPerm,
      showPermApproveBox,
      cancelApprovePerm,
      confirmRejectPerm,
      confirmApprovePerm,
      updatePermissionStatus,
      /** Solo para pruebas y diagnóstico: ¿hay alguna escritura de aprobación en vuelo? (D7) */
      isSubmitting: () => inFlight.size > 0
    };
  }
  function createModalsController(deps) {
    const {
      doc,
      alert: showAlert,
      now = Date.now,
      logger = console,
      getAuthUser,
      getCurrentUser,
      persistTask,
      getTaskCache,
      storage,
      updateKPI
    } = deps;
    let pendingExtraTaskId = null;
    let isSavingExtraTask = false;
    function openExceptionModal2() {
      openExceptionModal(doc);
    }
    function closeModal2(modalId) {
      closeModal(doc, modalId);
    }
    function confirmException() {
      const select = doc.getElementById("exceptionReason");
      const reasonText = select.options[select.selectedIndex].text;
      const rawDetails = doc.getElementById("exceptionDetails").value;
      const check = validateExceptionInput({ reasonValue: select.value, details: rawDetails });
      if (!check.ok) {
        showAlert(check.message);
        return;
      }
      doc.getElementById("taskObservation").value = buildExceptionObservation(reasonText, check.details);
      closeModal2("exceptionModal");
    }
    function openExtraTaskModal2() {
      if (openExtraTaskModal(doc, EXTRA_TASK_DEFAULT_STATUS)) pendingExtraTaskId = null;
    }
    async function saveExtraTask() {
      if (isSavingExtraTask) return;
      const input = normalizeExtraTaskInput({
        name: doc.getElementById("extraTaskName").value,
        status: doc.getElementById("extraTaskStatus").value,
        obs: doc.getElementById("extraTaskObs").value
      });
      const inputCheck = validateExtraTaskInput(input);
      if (!inputCheck.ok) {
        showAlert(inputCheck.message);
        return;
      }
      const authUser = getAuthUser();
      const identityCheck = validateExtraTaskIdentity(authUser, getCurrentUser());
      if (!identityCheck.ok) {
        showAlert(identityCheck.message);
        return;
      }
      const btn = doc.getElementById("saveExtraTaskBtn");
      const prevText = btn ? btn.innerHTML : "";
      isSavingExtraTask = true;
      if (btn) {
        btn.innerHTML = EXTRA_TASK_SAVING_BUTTON_HTML;
        btn.disabled = true;
      }
      const extraId = pendingExtraTaskId || resolveExtraTaskId(null, now());
      pendingExtraTaskId = extraId;
      const taskRecord = buildExtraTaskRecord(input, now());
      const cache = getTaskCache();
      cache[extraId] = taskRecord;
      try {
        if (storage) storage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
      } catch (e) {
      }
      try {
        await persistTask(authUser.uid, extraId, taskRecord);
        pendingExtraTaskId = null;
        if (updateKPI) updateKPI();
        closeModal2("extraTaskModal");
        showAlert(EXTRA_TASK_MESSAGES.saved(input.name));
      } catch (error) {
        logger.error("Error al guardar la tarea extra:", error);
        showAlert(resolveExtraTaskSaveErrorMessage(error));
      } finally {
        if (btn) {
          btn.innerHTML = prevText;
          btn.disabled = false;
        }
        isSavingExtraTask = false;
      }
    }
    return {
      openExceptionModal: openExceptionModal2,
      closeModal: closeModal2,
      confirmException,
      openExtraTaskModal: openExtraTaskModal2,
      saveExtraTask,
      /** Solo para pruebas y diagnóstico. */
      getPendingExtraTaskId: () => pendingExtraTaskId,
      isSaving: () => isSavingExtraTask
    };
  }

  // ../src/domain/auth/notification-rules.js
  var notification_rules_exports = {};
  __export(notification_rules_exports, {
    PERMISSION_PENDING_STATUS: () => PERMISSION_PENDING_STATUS,
    buildAdminReadUpdates: () => buildAdminReadUpdates,
    buildGestorReadUpdates: () => buildGestorReadUpdates,
    isAdminNotificationScope: () => isAdminNotificationScope
  });
  var PERMISSION_PENDING_STATUS = "Pendiente";
  function isAdminNotificationScope(user) {
    return Boolean(user && (user.role === "Admin" || user.role === "Supervisor"));
  }
  function buildAdminReadUpdates(permissions) {
    const updates = {};
    const data = permissions || {};
    for (const key in data) {
      if (data[key].notified_admin === false && data[key].status === PERMISSION_PENDING_STATUS) {
        updates[key + "/notified_admin"] = true;
      }
    }
    return updates;
  }
  function buildGestorReadUpdates(permissions) {
    const updates = {};
    const data = permissions || {};
    for (const key in data) {
      if (data[key].notified === false && data[key].status !== PERMISSION_PENDING_STATUS) {
        updates[key + "/notified"] = true;
      }
    }
    return updates;
  }

  // ../src/domain/shifts/shift-report-view.js
  var shift_report_view_exports = {};
  __export(shift_report_view_exports, {
    BITACORA_MARKER: () => BITACORA_MARKER,
    buildPdfOptions: () => buildPdfOptions,
    buildShiftReportPdfFileName: () => buildShiftReportPdfFileName,
    buildShiftReportsEmptyMessage: () => buildShiftReportsEmptyMessage,
    buildShiftReportsFooterMessage: () => buildShiftReportsFooterMessage,
    collectGestorOptions: () => collectGestorOptions,
    computeReportEffectiveMinutes: () => computeReportEffectiveMinutes,
    extractBitacoraLines: () => extractBitacoraLines,
    filterShiftReports: () => filterShiftReports,
    getDefaultWindowStartMs: () => getDefaultWindowStartMs,
    parseShiftReportTime: () => parseShiftReportTime,
    toLocalDateKey: () => toLocalDateKey
  });
  var BITACORA_MARKER = "=== BIT\xC1CORA DE TIEMPOS ===";
  function extractBitacoraLines(rawReporte) {
    const raw = rawReporte || "";
    const lines = [];
    if (raw.includes(BITACORA_MARKER)) {
      const parts = raw.split(BITACORA_MARKER);
      const rawBitacora = (parts[1] || "").trim();
      if (rawBitacora) {
        rawBitacora.split("\n").map((l) => l.trim()).filter(Boolean).forEach((l) => {
          if (!lines.includes(l)) lines.push(l);
        });
      }
    }
    return lines;
  }
  function getDefaultWindowStartMs(now) {
    const d = new Date(now);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 0, 0, 0).getTime();
  }
  function toLocalDateKey(timestamp) {
    const d = new Date(timestamp);
    const localMonth = String(d.getMonth() + 1).padStart(2, "0");
    const localDay = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${localMonth}-${localDay}`;
  }
  function filterShiftReports(reports, { selectedGestores = [], fechaQuery = "", now }) {
    let filtered = [...reports];
    const hasExplicitFilter = Boolean(selectedGestores.length > 0 || fechaQuery);
    if (selectedGestores.length > 0) {
      filtered = filtered.filter((r) => selectedGestores.some((g) => normalizeName(r.gestor) === normalizeName(g)));
    }
    if (fechaQuery) {
      filtered = filtered.filter((r) => {
        if (r.timestamp) {
          if (toLocalDateKey(r.timestamp) === fechaQuery) return true;
        }
        if (r.horaInicio && r.horaInicio.includes(fechaQuery)) return true;
        if (r.horaFin && r.horaFin.includes(fechaQuery)) return true;
        return false;
      });
    } else if (!hasExplicitFilter) {
      const windowStart = getDefaultWindowStartMs(now);
      filtered = filtered.filter((r) => {
        const reportTime = r.timestamp || (r.horaInicio ? new Date(r.horaInicio).getTime() : 0);
        return reportTime >= windowStart;
      });
    }
    filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return { rows: filtered, hasExplicitFilter };
  }
  function buildShiftReportsEmptyMessage(hasExplicitFilter) {
    return hasExplicitFilter ? "No hay historial de turnos registrados con los filtros seleccionados." : "No hay turnos registrados en los \xFAltimos 2 d\xEDas. Selecciona una fecha o escribe un gestor para consultar turnos anteriores.";
  }
  function buildShiftReportsFooterMessage(count) {
    return `Mostrando turnos de los \xFAltimos 2 d\xEDas (${count} turnos). Selecciona una fecha o escribe un gestor para consultar el historial antiguo complete.`;
  }
  function collectGestorOptions(reports) {
    const set = /* @__PURE__ */ new Set();
    reports.forEach((r) => {
      if (r.gestor) set.add(String(r.gestor).trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }
  function buildShiftReportPdfFileName(reportObj) {
    const safeName = (reportObj.gestor || "Gestor").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const dateStr = (reportObj.timestamp ? new Date(reportObj.timestamp).toLocaleDateString("es-CO") : "fecha").replace(/[^a-z0-9]/gi, "_");
    return `Reporte_Turno_${safeName}_${dateStr}.pdf`;
  }
  function buildPdfOptions(filename) {
    return {
      margin: 10,
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };
  }
  function parseShiftReportTime(timeStr, baseDateMs) {
    if (typeof timeStr === "string") {
      timeStr = timeStr.replace(/a\.\s*m\./i, "AM").replace(/p\.\s*m\./i, "PM");
    }
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d.getTime();
    if (typeof timeStr === "string" && timeStr.includes(":")) {
      const parts = timeStr.match(/(\d+):(\d+)/);
      if (parts) {
        const base = new Date(baseDateMs);
        let hours = parseInt(parts[1], 10);
        if (timeStr.toUpperCase().includes("PM") && hours < 12) hours += 12;
        if (timeStr.toUpperCase().includes("AM") && hours === 12) hours = 0;
        base.setHours(hours, parseInt(parts[2], 10), 0, 0);
        return base.getTime();
      }
    }
    return NaN;
  }
  function computeReportEffectiveMinutes(report, { nowMs, legacy = false }) {
    if (!(report.horaInicio && report.horaFin)) return null;
    const baseMs = report.timestamp || report.loginTime || nowMs;
    const startMs = parseShiftReportTime(report.horaInicio, baseMs);
    const endMs = parseShiftReportTime(report.horaFin, baseMs);
    if (isNaN(startMs) || isNaN(endMs)) return null;
    let diffMins = (endMs - startMs) / 6e4;
    if (diffMins < 0) diffMins += 1440;
    if (!(diffMins > 0 && diffMins <= 1440)) return null;
    if (!legacy) return computeSavedReportEffectiveMinutes(report, diffMins);
    const almuerzo = report.tiempoAlmuerzoMins || 0;
    const desayuno = report.tiempoDesayunoMins || 0;
    const pausaTurno = report.tiempoPausaTurnoMins || 0;
    let tiempoEfectivo = diffMins - almuerzo - desayuno - pausaTurno;
    if (tiempoEfectivo < 0) tiempoEfectivo = 0;
    return tiempoEfectivo;
  }

  // ../src/domain/analytics/monitoring-view.js
  var monitoring_view_exports = {};
  __export(monitoring_view_exports, {
    AVAILABLE_AVATARS: () => AVAILABLE_AVATARS2,
    DELAY_ON_TIME_MAX_MINUTES: () => DELAY_ON_TIME_MAX_MINUTES,
    DELAY_OUT_OF_SCHEDULE_MINUTES: () => DELAY_OUT_OF_SCHEDULE_MINUTES,
    EMPTY_TIMELINE_ROW_HTML: () => EMPTY_TIMELINE_ROW_HTML,
    TIMELINE_MIN_EVENT_MS: () => TIMELINE_MIN_EVENT_MS,
    buildCardDisplayTasks: () => buildCardDisplayTasks,
    buildDetailDisplayTasks: () => buildDetailDisplayTasks,
    buildDetailTaskCardHtml: () => buildDetailTaskCardHtml,
    buildEmptyMonitoringHtml: () => buildEmptyMonitoringHtml,
    buildFallbackAvatarSrc: () => buildFallbackAvatarSrc,
    buildMonitoreoInfoText: () => buildMonitoreoInfoText,
    buildNoTasksHtml: () => buildNoTasksHtml,
    buildSessionCardHtml: () => buildSessionCardHtml,
    buildSessionCardModel: () => buildSessionCardModel,
    buildShiftDelayBadgeHtml: () => buildShiftDelayBadgeHtml,
    buildTasksListHtml: () => buildTasksListHtml,
    buildTimelineRowHtml: () => buildTimelineRowHtml,
    buildTimelineRowsHtml: () => buildTimelineRowsHtml,
    buildVisibleTimeline: () => buildVisibleTimeline,
    computeTaskProgress: () => computeTaskProgress,
    filterActiveSessionUids: () => filterActiveSessionUids,
    resolveAvatarSrc: () => resolveAvatarSrc,
    resolveTaskBadge: () => resolveTaskBadge
  });

  // ../src/domain/schedules/supervisor-directory.js
  var supervisor_directory_exports = {};
  __export(supervisor_directory_exports, {
    EMPTY_SUPERVISOR_DIRECTORY: () => EMPTY_SUPERVISOR_DIRECTORY,
    SUPERVISOR_ROLES: () => SUPERVISOR_ROLES,
    assertSupervisorDirectory: () => assertSupervisorDirectory,
    buildSupervisorDirectory: () => buildSupervisorDirectory,
    isSupervisorDirectory: () => isSupervisorDirectory,
    isSupervisorEntry: () => isSupervisorEntry,
    isSupervisorName: () => isSupervisorName,
    isSupervisorRole: () => isSupervisorRole,
    legacySubstringMatch: () => legacySubstringMatch,
    normalizeFullName: () => normalizeFullName
  });
  var SUPERVISOR_ROLES = Object.freeze([ROLES.SUPERVISOR, ROLES.ADMIN]);
  function isSupervisorRole(role) {
    return typeof role === "string" && SUPERVISOR_ROLES.includes(role);
  }
  function normalizeFullName(name) {
    if (typeof name !== "string") return "";
    return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
  }
  function buildSupervisorDirectory(users) {
    const entries = Array.isArray(users) ? users.map((u) => [u && u.uid != null ? String(u.uid) : null, u]) : Object.entries(users || {});
    const uids = /* @__PURE__ */ new Set();
    const names = /* @__PURE__ */ new Set();
    const list = [];
    for (const [uid, user] of entries) {
      if (!user || typeof user !== "object" || !isSupervisorRole(user.role)) continue;
      const name = typeof user.name === "string" ? user.name.trim() : "";
      if (uid) uids.add(uid);
      const norm = normalizeFullName(name);
      if (norm) names.add(norm);
      list.push(Object.freeze({ uid: uid || null, name, role: user.role }));
    }
    list.sort((a, b) => a.name.localeCompare(b.name, "es") || String(a.uid).localeCompare(String(b.uid)));
    return Object.freeze({ uids, names, list: Object.freeze(list) });
  }
  var EMPTY_SUPERVISOR_DIRECTORY = buildSupervisorDirectory(null);
  function isSupervisorDirectory(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value) && value.uids instanceof Set && value.names instanceof Set && Array.isArray(value.list);
  }
  function assertSupervisorDirectory(value, where) {
    if (value === null || value === void 0) return null;
    if (isSupervisorDirectory(value)) return value;
    throw new TypeError(`${where}: se esperaba un directorio de supervisores (buildSupervisorDirectory(users)); la lista fija de nombres (SUPERVISORES_NOMBRES) ya no se admite (decisi\xF3n D9b). Para reproducir el comportamiento original en una prueba diferencial use la opci\xF3n expl\xEDcita legacyExcludedNames.`);
  }
  function isSupervisorEntry(directory, { uid = null, name = null } = {}) {
    if (!directory) return false;
    if (uid !== null && uid !== void 0 && uid !== "") return directory.uids.has(String(uid));
    const norm = normalizeFullName(name);
    return norm !== "" && directory.names.has(norm);
  }
  function isSupervisorName(directory, name) {
    return isSupervisorEntry(directory, { name: typeof name === "string" ? name : null });
  }
  function legacySubstringMatch(legacyExcludedNames, name) {
    return legacyExcludedNames.some((ex) => name.includes(ex));
  }

  // ../src/domain/analytics/monitoring-view.js
  var AVAILABLE_AVATARS2 = Object.freeze([
    "Alexander Villada.png",
    "Camilo Espinosa.png",
    "Daniel Benavides.png",
    "Josue Alvarez.png",
    "Juan Jose Diaz.png",
    "Luis Fuentes.png",
    "Maria Sanchez.png",
    "Marilyn Jimenez.png",
    "Oriana Borja.png",
    "Samuel Cruz.png",
    "Sara Santamaria.png",
    "Sebastian Arango.png",
    "Sebastian Hincapie.png",
    "Yefferson Giraldo.png"
  ]);
  function buildFallbackAvatarSrc(fullName) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
  }
  function resolveAvatarSrc(fullName, avatars = AVAILABLE_AVATARS2, match = namesMatch) {
    const matchedAvatar = avatars.find((img) => match(fullName, img.replace(".png", "")));
    return matchedAvatar ? `assets/src/img/${matchedAvatar}` : buildFallbackAvatarSrc(fullName);
  }
  var DELAY_ON_TIME_MAX_MINUTES = 5;
  var DELAY_OUT_OF_SCHEDULE_MINUTES = 240;
  function buildShiftDelayBadgeHtml(session) {
    if (!session.loginTime || !session.shift) return "";
    const shiftStr = session.shift.toLowerCase().trim();
    const match = shiftStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (!match) return "";
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3].toLowerCase();
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    const loginDate = new Date(session.loginTime);
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
    const limit = expected.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffMinutes <= DELAY_ON_TIME_MAX_MINUTES) {
      return `<span style="background: var(--success); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 5px;" title="L\xEDmite: ${limit}">A tiempo</span>`;
    } else if (diffMinutes > DELAY_OUT_OF_SCHEDULE_MINUTES) {
      return `<span style="background: rgba(139,92,246,0.15); color: #8b5cf6; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 5px;" title="L\xEDmite: ${limit}">Fuera de Horario</span>`;
    }
    const tardanza = Math.round(diffMinutes);
    return `<span style="background: var(--danger); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 5px;" title="L\xEDmite: ${limit}">+${tardanza}m Tarde</span>`;
  }
  function filterActiveSessionUids(sessions, filters, deps) {
    const { searchText = "", shiftQuery = "", statusQuery = "" } = filters;
    if (Object.prototype.hasOwnProperty.call(deps, "excludedNames")) {
      throw new TypeError("filterActiveSessionUids: excludedNames (SUPERVISORES_NOMBRES) ya no se admite (decisi\xF3n D9b); use supervisorDirectory o, solo en pruebas diferenciales, legacyExcludedNames.");
    }
    const { nowMs, legacyExcludedNames, getShiftCategory } = deps;
    const directory = legacyExcludedNames ? null : assertSupervisorDirectory(deps.supervisorDirectory, "filterActiveSessionUids");
    const isSupervisorSession = legacyExcludedNames ? (uid, fullName) => legacyExcludedNames.some((ex) => fullName.toLowerCase().includes(ex.toLowerCase())) : (uid) => isSupervisorEntry(directory, { uid });
    const searchQuery = normalizeName(searchText);
    return Object.keys(sessions).filter((uid) => {
      const session = sessions[uid];
      if (!session || !session.name) return false;
      const fullName = (session.name || "").trim();
      const email = session.email || "";
      const shift = session.shift || "Ma\xF1ana";
      if (isSupervisorSession(uid, fullName)) return false;
      const isOnline = isSessionOnlineForFilter(session, nowMs);
      if (searchQuery && !normalizeName(fullName).includes(searchQuery) && !normalizeName(email).includes(searchQuery)) {
        return false;
      }
      const sessionShiftCat = getShiftCategory(shift);
      if (shiftQuery && sessionShiftCat !== shiftQuery) {
        return false;
      }
      if (statusQuery) {
        if (statusQuery === "online" && !isOnline) return false;
        if (statusQuery === "offline" && isOnline) return false;
      }
      return true;
    });
  }
  function computeTaskProgress(session, { legacy = false } = {}) {
    let completedCount = session.completedTasks !== void 0 ? session.completedTasks : 0;
    let notDoneCount = session.notDoneTasks !== void 0 ? session.notDoneTasks : 0;
    const totalTasks = session.totalTasks || 0;
    if (session.completedTasks === void 0 && session.tasks) {
      completedCount = Object.values(session.tasks).filter((t) => t.status === "Finalizada").length;
      notDoneCount = Object.values(session.tasks).filter((t) => t.status === "No Realizada").length;
    }
    const compPct = totalTasks > 0 ? Math.round(completedCount / totalTasks * 100) : 0;
    const notDonePct = totalTasks > 0 ? Math.round(notDoneCount / totalTasks * 100) : 0;
    const totalPct = legacy ? compPct + notDonePct : formatProgress(completedCount + notDoneCount, totalTasks);
    return { completedCount, notDoneCount, totalTasks, compPct, notDonePct, totalPct };
  }
  function buildCardDisplayTasks(session, { assignedTasks, reconcileTask }) {
    const tasks = session.tasks || {};
    const displayTasks = [];
    if (assignedTasks && assignedTasks.length > 0) {
      assignedTasks.forEach((taskName) => {
        const reconciled = reconcileTask(taskName, tasks);
        displayTasks.push({ name: taskName, status: reconciled.status });
      });
    }
    for (const key in tasks) {
      if (key.startsWith("extra_") && tasks[key]) {
        displayTasks.push({ name: tasks[key].name, status: tasks[key].status });
      }
    }
    return displayTasks;
  }
  function buildTasksListHtml(displayTasks, hasCronograma) {
    let tasksHtml = "";
    if (displayTasks.length > 0) {
      tasksHtml = '<div style="margin-top: 15px; max-height: 80px; overflow-y: auto; font-size: 11px; border: 1px solid var(--glass-border); border-radius: 4px; padding: 5px; background: rgba(0,0,0,0.02);">';
      displayTasks.forEach((t) => {
        let icon = "<i class='bx bx-radio-circle' style='color: var(--text-secondary)'></i>";
        let textStyle = "";
        if (t.status === "Finalizada") {
          icon = "<i class='bx bx-check-circle' style='color: var(--success)'></i>";
          textStyle = "color: var(--success); font-weight: bold;";
        } else if (t.status === "En Proceso") {
          icon = "<i class='bx bx-time-five' style='color: var(--warning)'></i>";
          textStyle = "color: var(--warning);";
        } else if (t.status === "No Realizada") {
          icon = "<i class='bx bx-x-circle' style='color: var(--danger)'></i>";
          textStyle = "color: var(--danger); text-decoration: line-through;";
        }
        tasksHtml += `<div style="display: flex; align-items: center; gap: 5px; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: ${t.status === "Pendiente" ? 0.7 : 1};">${icon} <span title="${escapeHTML(t.name)}" style="${textStyle}">${escapeHTML(t.name)}</span></div>`;
      });
      tasksHtml += "</div>";
    } else {
      tasksHtml = '<div style="margin-top: 15px; font-size: 11px; color: var(--text-secondary); text-align: center; font-style: italic;">' + (hasCronograma ? "No tiene tareas asignadas en este turno" : "Cargando cronograma...") + "</div>";
    }
    return tasksHtml;
  }
  function buildEmptyMonitoringHtml() {
    return `
            <div style="grid-column: 1 / -1; padding: 60px; text-align: center; color: var(--text-secondary);">
                <i class='bx bx-devices' style="font-size: 48px; margin-bottom: 15px; color: var(--text-secondary); opacity: 0.5;"></i>
                <p style="font-size: 16px; font-weight: 500;">No se encontraron gestores en el turno con los filtros aplicados.</p>
                <p style="font-size: 12px; margin-top: 5px; opacity: 0.7;">Los gestores activos se listar\xE1n aqu\xED autom\xE1ticamente al ingresar.</p>
            </div>
        `;
  }
  function buildSessionCardModel(uid, session, deps) {
    const { nowMs, hasCronograma, getAssignedTasks, reconcileTask, avatars = AVAILABLE_AVATARS2 } = deps;
    const display = resolveSessionDisplay(session, nowMs);
    const fullName = (session.name || "").trim();
    const assignedTasks = hasCronograma ? getAssignedTasks(fullName, session.shift || "Ma\xF1ana") : [];
    const displayTasks = buildCardDisplayTasks(session, { assignedTasks, reconcileTask });
    return {
      uid,
      fullName,
      isOnline: display.isOnline,
      displayStatus: display.displayStatus,
      loginTimeStr: session.loginTime ? new Date(session.loginTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Pendiente (Falta actualizar)",
      shift: session.shift,
      email: session.email,
      delayBadge: buildShiftDelayBadgeHtml(session),
      avatarSrc: resolveAvatarSrc(fullName, avatars),
      fallbackAvatarSrc: buildFallbackAvatarSrc(fullName),
      progress: computeTaskProgress(session),
      tasksHtml: buildTasksListHtml(displayTasks, hasCronograma)
    };
  }
  function buildSessionCardHtml(model) {
    const { uid, fullName, isOnline, displayStatus, loginTimeStr, delayBadge, tasksHtml } = model;
    const { completedCount, notDoneCount, totalTasks, compPct, notDonePct, totalPct } = model.progress;
    const session = { shift: model.shift, email: model.email };
    return `
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
                <div class="monitoreo-user-info">
                    <img class="monitoreo-avatar">
                    <div class="monitoreo-details">
                        <span class="monitoreo-name">${escapeHTML(fullName)}</span>
                        <span class="monitoreo-meta">${escapeHTML(session.email || "")}</span>
                    </div>
                </div>
                <div class="status-indicator-badge ${isOnline ? "status-online" : "status-offline"}">
                    <div class="pulse-dot ${isOnline ? "" : "offline"}"></div>
                    ${displayStatus}
                </div>
            </div>
            
            <div style="margin-top: 10px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: var(--text-secondary);"><i class='bx bx-calendar-check'></i> Turno:</span>
                    <strong style="color: var(--text-primary);">${escapeHTML(session.shift || "Ma\xF1ana")}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: var(--text-secondary);"><i class='bx bx-time'></i> Inicio de Turno:</span>
                    <div style="display: flex; align-items: center;">
                        <span style="color: var(--text-primary); font-size: 12px;">${loginTimeStr}</span>
                        ${delayBadge}
                    </div>
                </div>
            </div>

            <div class="progress-container">
                <div class="progress-label-row">
                    <span>Avance de Tareas</span>
                    <div style="display: flex; gap: 6px; font-size: 11px;">
                        <strong style="color: var(--success);" title="Realizadas">${completedCount} <i class='bx bx-check'></i></strong>
                        <strong style="color: var(--danger);" title="No Realizadas">${notDoneCount} <i class='bx bx-x'></i></strong>
                        <strong style="color: var(--text-secondary); margin-left: 4px;">/ ${totalTasks} (${totalPct}%)</strong>
                    </div>
                </div>
                <div class="progress-bar-bg" style="display: flex; overflow: hidden; background: rgba(255,255,255,0.05);">
                    <div class="progress-bar-fill" style="width: ${compPct}%; border-radius: 0; background: linear-gradient(90deg, var(--success), #34d399); transition: width 0.5s;"></div>
                    <div style="width: ${notDonePct}%; background: linear-gradient(90deg, var(--danger), #fb7185); transition: width 0.5s;"></div>
                </div>
            </div>

            ${tasksHtml}

            <div style="margin-top: 15px; display: flex; gap: 5px; justify-content: flex-end;">
                <button class="btn btn-outline" style="flex: 1; padding: 6px 10px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px;" onclick="openMonitoreoDetails(decodeURIComponent('${encodeInlineHandlerArg(uid)}'))">
                    <i class='bx bx-search-alt-2'></i> Detalles
                </button>
                <button class="btn btn-outline" style="flex: 1; padding: 6px 10px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px; border-color: var(--warning); color: var(--warning);" onclick="viewTimelineInMonitoreo(decodeURIComponent('${encodeInlineHandlerArg(uid)}'))">
                    <i class='bx bx-time'></i> Bit\xE1cora
                </button>
            </div>
        `;
  }
  var TIMELINE_MIN_EVENT_MS = 6e4;
  function buildVisibleTimeline(session, nowMs) {
    const timeline = session.timeline || [];
    const validTimeline = timeline.filter((ev) => {
      if (ev.end && ev.end - ev.start < TIMELINE_MIN_EVENT_MS) return false;
      return true;
    });
    const lastPing = session.lastActive ? new Date(session.lastActive).getTime() : 0;
    if (lastPing && nowMs - lastPing > 12e4 && session.status !== "En Almuerzo" && session.status !== "En Desayuno" && session.status !== "En Pausa de Turno") {
      const hasOngoingInactividad = validTimeline.some((ev) => ev.type === "Inactividad" && !ev.end);
      if (!hasOngoingInactividad) {
        validTimeline.push({ type: "Inactividad", start: lastPing, end: null });
      }
    }
    return validTimeline;
  }
  var EMPTY_TIMELINE_ROW_HTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">No hay pausas ni inactividades registradas en este turno.</td></tr>';
  function buildTimelineRowHtml(ev) {
    const s = new Date(ev.start).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    let eTime = "No regres\xF3";
    let durationStr = "En curso...";
    if (ev.end) {
      eTime = new Date(ev.end).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
      const mins = Math.max(1, Math.round((ev.end - ev.start) / 6e4));
      durationStr = `${mins} min`;
    }
    let icon = "<i class='bx bx-time'></i>";
    if (ev.type === "Almuerzo") icon = "<i class='bx bx-restaurant' style='color: var(--success)'></i>";
    if (ev.type === "Desayuno") icon = "<i class='bx bx-coffee' style='color: var(--warning)'></i>";
    if (ev.type === "Inactividad") icon = "<i class='bx bx-sleepy' style='color: var(--danger)'></i>";
    if (ev.type === "Pausa de Turno") icon = "<i class='bx bx-pause-circle' style='color: #8b5cf6'></i>";
    return `
                <tr style="border-bottom: 1px solid var(--glass-border);">
                    <td style="padding: 10px; font-weight: 500;">${icon} ${ev.type}</td>
                    <td style="padding: 10px; font-size: 13px;">${s} - ${eTime}</td>
                    <td style="padding: 10px; text-align: center;"><span class="badge" style="background: rgba(255,255,255,0.05);">${durationStr}</span></td>
                </tr>
            `;
  }
  function buildTimelineRowsHtml(events) {
    if (events.length === 0) return EMPTY_TIMELINE_ROW_HTML;
    return events.map(buildTimelineRowHtml).join("");
  }
  function buildMonitoreoInfoText(session) {
    const lastActiveTime = session.lastActive ? new Date(session.lastActive).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Nunca";
    const loginTimeStr = session.loginTime ? new Date(session.loginTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Pendiente";
    return `Turno: ${session.shift || "Ma\xF1ana"} | Inicio: ${loginTimeStr} | Actividad: ${lastActiveTime}`;
  }
  function buildDetailDisplayTasks(session, { assignedTasks, reconcileTask, resolveTaskName }) {
    const tasks = session.tasks || {};
    const displayTasks = [];
    if (assignedTasks && assignedTasks.length > 0) {
      assignedTasks.forEach((taskName) => {
        const reconciled = reconcileTask(taskName, tasks);
        displayTasks.push({ name: taskName, status: reconciled.status, observation: reconciled.observation });
      });
    }
    for (const key in tasks) {
      if (key.startsWith("extra_") && tasks[key]) {
        displayTasks.push({
          name: tasks[key].name,
          status: tasks[key].status || "Pendiente",
          observation: tasks[key].observation || "Tarea extra agregada durante el turno."
        });
      }
    }
    if (displayTasks.length === 0 && Object.keys(tasks).length > 0) {
      for (const key in tasks) {
        if (!tasks[key]) continue;
        const isExtra = key.startsWith("extra_");
        displayTasks.push({
          name: isExtra ? tasks[key].name || key : resolveTaskName(key, tasks[key]),
          status: tasks[key].status || "Pendiente",
          observation: tasks[key].observation || ""
        });
      }
    }
    return displayTasks;
  }
  function buildNoTasksHtml() {
    return `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    Este gestor a\xFAn no tiene tareas asignadas en este turno.
                </div>
            `;
  }
  function resolveTaskBadge(status) {
    let badgeClass = "pending";
    let badgeStyle = "background: rgba(148,163,184,0.15); color: #94a3b8;";
    if (status === "Finalizada") {
      badgeClass = "completed";
      badgeStyle = "background: rgba(16,185,129,0.15); color: var(--success);";
    } else if (status === "En Proceso") {
      badgeClass = "in-progress";
      badgeStyle = "background: rgba(245,158,11,0.15); color: var(--warning);";
    } else if (status === "No Realizada") {
      badgeClass = "not-done";
      badgeStyle = "background: rgba(239,68,68,0.15); color: var(--danger);";
    }
    return { badgeClass, badgeStyle };
  }
  function buildDetailTaskCardHtml(t) {
    const { badgeClass, badgeStyle } = resolveTaskBadge(t.status);
    const observationText = t.observation ? escapeHTML(t.observation.trim()) : "Sin observaciones cargadas.";
    return `
                    <div style="background: rgba(0,0,0,0.02); border: 1px solid var(--glass-border); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px;">
                            <span style="font-weight: 600; font-size: 13.5px; color: var(--text-primary);">${escapeHTML(t.name)}</span>
                            <span class="monitoreo-task-badge ${badgeClass}" style="padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; ${badgeStyle}">${escapeHTML(t.status)}</span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); background: rgba(0,0,0,0.03); padding: 8px 10px; border-radius: 6px; border-left: 3px solid var(--accent-primary);">
                            <strong>Notas u Observaciones:</strong> ${observationText}
                        </div>
                    </div>
                `;
  }

  // ../src/services/firebase/firebase-notifications-repository.js
  var firebase_notifications_repository_exports = {};
  __export(firebase_notifications_repository_exports, {
    createNotificationsRepository: () => createNotificationsRepository
  });
  function createNotificationsRepository({ database, getAuthUid = () => null }) {
    async function markAllAsRead(user) {
      if (!user) return { updated: 0 };
      const permissionsRef = database.ref(DB_ROOTS.PERMISSIONS);
      if (isAdminNotificationScope(user)) {
        const snapshot2 = await permissionsRef.once("value");
        if (!snapshot2.exists()) return { updated: 0 };
        const updates2 = buildAdminReadUpdates(snapshot2.val());
        if (Object.keys(updates2).length > 0) await permissionsRef.update(updates2);
        return { updated: Object.keys(updates2).length };
      }
      const authUid = user.uid || getAuthUid();
      if (!authUid) return { updated: 0 };
      const snapshot = await database.ref(DB_ROOTS.PERMISSIONS).orderByChild("uid").equalTo(authUid).once("value");
      if (!snapshot.exists()) return { updated: 0 };
      const updates = buildGestorReadUpdates(snapshot.val());
      if (Object.keys(updates).length > 0) await database.ref(DB_ROOTS.PERMISSIONS).update(updates);
      return { updated: Object.keys(updates).length };
    }
    return { markAllAsRead };
  }

  // ../src/services/firebase/firebase-shift-reports-repository.js
  var firebase_shift_reports_repository_exports = {};
  __export(firebase_shift_reports_repository_exports, {
    createShiftReportsRepository: () => createShiftReportsRepository
  });
  function createShiftReportsRepository({ database }) {
    async function fetchAllShiftReports() {
      const snapshot = await database.ref(DB_ROOTS.SHIFT_REPORTS).once("value");
      if (!snapshot.exists()) return [];
      const data = snapshot.val();
      return Object.keys(data).map((k) => ({ ...data[k], fb_id: k }));
    }
    async function fetchShiftReportById(fbId) {
      const snapshot = await database.ref(DB_ROOTS.SHIFT_REPORTS + "/" + fbId).once("value");
      return snapshot.exists() ? snapshot.val() : null;
    }
    return { fetchAllShiftReports, fetchShiftReportById };
  }

  // ../src/services/firebase/firebase-monitoring-repository.js
  var firebase_monitoring_repository_exports = {};
  __export(firebase_monitoring_repository_exports, {
    createMonitoringRepository: () => createMonitoringRepository,
    extractApprovedGestorNames: () => extractApprovedGestorNames
  });
  function extractApprovedGestorNames(users) {
    if (!users) return [];
    const gestores = Object.keys(users).map((k) => users[k]).filter((u) => u && u.role === "Gestor" && u.approved === true).map((u) => u.name.trim()).sort((a, b) => a.localeCompare(b));
    return [...new Set(gestores)];
  }
  function createMonitoringRepository({ database }) {
    function listenActiveSessions(onSessions, onError = () => {
    }) {
      const ref = database.ref(DB_ROOTS.ACTIVE_SESSIONS);
      const handler = (snapshot) => {
        onSessions(snapshot.exists() ? snapshot.val() : {});
      };
      ref.on("value", handler, onError);
      return () => ref.off("value", handler);
    }
    async function fetchApprovedGestorNames() {
      const snapshot = await database.ref(DB_ROOTS.USERS).once("value");
      return snapshot.exists() ? extractApprovedGestorNames(snapshot.val()) : [];
    }
    async function fetchSupervisorUsers() {
      const merged = {};
      for (const role of SUPERVISOR_ROLES) {
        const snapshot = await database.ref(DB_ROOTS.USERS).orderByChild("role").equalTo(role).once("value");
        if (snapshot && snapshot.exists()) Object.assign(merged, snapshot.val());
      }
      return merged;
    }
    return { listenActiveSessions, fetchApprovedGestorNames, fetchSupervisorUsers };
  }

  // ../src/ui/views/shift-reports-view.js
  var shift_reports_view_exports = {};
  __export(shift_reports_view_exports, {
    HIGHLIGHT_STYLE: () => HIGHLIGHT_STYLE,
    PDF_CONTAINER_STYLE: () => PDF_CONTAINER_STYLE,
    buildBitacoraDetailsHtml: () => buildBitacoraDetailsHtml,
    buildDetailBitacoraHtml: () => buildDetailBitacoraHtml,
    buildPdfBitacoraHtml: () => buildPdfBitacoraHtml,
    buildShiftDetailHtml: () => buildShiftDetailHtml,
    buildShiftReportPdfHtml: () => buildShiftReportPdfHtml,
    buildShiftReportRowHtml: () => buildShiftReportRowHtml,
    buildShiftReportsEmptyRowHtml: () => buildShiftReportsEmptyRowHtml,
    buildShiftReportsLoadingRowHtml: () => buildShiftReportsLoadingRowHtml,
    formatReportTextHtml: () => formatReportTextHtml
  });
  var HIGHLIGHT_STYLE = Object.freeze({
    TABLE: "table",
    MODAL: "modal",
    PDF: "pdf"
  });
  function formatReportTextHtml(reportText, style) {
    const escaped = escapeHTML(reportText).replace(/\n/g, "<br>");
    if (style === HIGHLIGHT_STYLE.TABLE) {
      return escaped.replace(/\[(.*?)\]/g, "<strong>[$1]</strong>");
    }
    if (style === HIGHLIGHT_STYLE.MODAL) {
      return escaped.replace(/\[(.*?)\]/g, '<span style="background: rgba(139, 92, 246, 0.15); color: var(--accent-primary); padding: 2px 6px; border-radius: 4px; font-weight: 600;">$1</span>');
    }
    return escaped.replace(/\[(.*?)\]/g, '<span style="background: #E0E7FF; color: #3730A3; padding: 2px 6px; border-radius: 4px; font-weight: 600;">$1</span>');
  }
  function buildShiftReportsLoadingRowHtml() {
    return `<tr><td colspan="6" style="padding: 30px; text-align: center; color: var(--accent-primary);"><i class='bx bx-loader-alt bx-spin' style='font-size: 24px;'></i><br><span style='font-size:12px; margin-top:5px; display:inline-block;'>Cargando historial de turnos...</span></td></tr>`;
  }
  function buildShiftReportsEmptyRowHtml(emptyMsg) {
    return `<tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-secondary);">${escapeHTML(emptyMsg)}</td></tr>`;
  }
  function buildBitacoraDetailsHtml(rawReporte) {
    const uniqueLines = extractBitacoraLines(rawReporte);
    if (uniqueLines.length === 0) return "";
    const bitacoraContent = uniqueLines.map((l) => escapeHTML(l)).join("<br>");
    return `
                    <details style="margin-top: 8px; border-top: 1px dashed var(--glass-border); padding-top: 6px;">
                        <summary style="cursor: pointer; color: var(--accent-primary); font-weight: 600; font-size: 11px; outline: none; list-style: none; display: flex; align-items: center; gap: 4px;">
                            <i class='bx bx-chevron-down'></i> Ver Bit\xE1cora de Tiempos
                        </summary>
                        <div style="font-size: 11px; margin-top: 5px; color: var(--text-secondary); line-height: 1.5; background: rgba(0,0,0,0.15); padding: 6px; border-radius: 4px;">
                            ${bitacoraContent}
                        </div>
                    </details>
                `;
  }
  function buildShiftReportRowHtml(r, reportText) {
    const safeReport = formatReportTextHtml(reportText, HIGHLIGHT_STYLE.TABLE) + buildBitacoraDetailsHtml(r.reporte);
    return `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-weight: 500;">
                    ${escapeHTML(r.gestor)}
                    <div style="font-size: 11px; color: var(--text-secondary);">${escapeHTML(r.rol)}</div>
                </td>
                <td style="padding: 12px; color: var(--accent-primary);">${escapeHTML(r.setTrabajado)}</td>
                <td style="padding: 12px; font-size: 13px;">${escapeHTML(r.horaInicio)}</td>
                <td style="padding: 12px; font-size: 13px;">${escapeHTML(r.horaFin)}</td>
                <td style="padding: 12px; font-size: 12px; color: var(--text-secondary); max-width: 350px; text-align: left;">
                    <div style="max-height: 120px; overflow-y: auto; background: var(--bg-dark); padding: 8px; border-radius: 6px;">
                        ${safeReport}
                    </div>
                </td>
                <td style="padding: 12px; text-align: center; white-space: nowrap;">
                    <div style="display: flex; gap: 6px; justify-content: center;">
                        <button class="btn btn-primary" style="padding: 5px 10px; font-size: 12px;" onclick="openShiftDetailModal(decodeURIComponent('${encodeInlineHandlerArg(r.fb_id)}'))" title="Ver todo el informe igual al correo">
                            <i class='bx bx-show'></i> Ver Todo
                        </button>
                        <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" onclick="exportShiftReport(decodeURIComponent('${encodeInlineHandlerArg(r.fb_id)}'))" title="Exportar PDF">
                            <i class='bx bx-file-blank'></i> PDF
                        </button>
                    </div>
                </td>
            </tr>
        `;
  }
  function buildDetailBitacoraHtml(bitacoraLines) {
    if (bitacoraLines.length > 0) {
      return bitacoraLines.map((l) => `<div style="padding: 4px 8px; background: rgba(0,0,0,0.2); border-radius: 4px; font-family: monospace; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;"><i class='bx bx-time-five' style="color: var(--accent-primary);"></i> ${escapeHTML(l)}</div>`).join("");
    }
    return '<div style="color: var(--text-secondary); font-size: 12px; font-style: italic;">No se registraron pausas o inactividades en este turno.</div>';
  }
  function buildShiftDetailHtml(reportObj, reportText) {
    const bitacoraHtml = buildDetailBitacoraHtml(extractBitacoraLines(reportObj.reporte));
    const formattedReportText = formatReportTextHtml(reportText, HIGHLIGHT_STYLE.MODAL);
    return `
        <div style="display: flex; flex-direction: column; gap: 15px;">
            <!-- Encabezado Gestor y Rol -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 14px 18px; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); display: block;">Gestor</span>
                    <strong style="font-size: 18px; color: var(--text-primary); margin-top: 2px; display: block;">${escapeHTML(reportObj.gestor)}</strong>
                    <span style="font-size: 12px; color: var(--accent-primary); font-weight: 500;">Rol: ${escapeHTML(reportObj.rol || "Gestor")}</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); display: block;">SET Principal Trabajado</span>
                    <strong style="font-size: 15px; color: var(--success); margin-top: 2px; display: block;"><i class='bx bx-layer'></i> ${escapeHTML(reportObj.setTrabajado || "N/A")}</strong>
                </div>
            </div>

            <!-- Tiempos de Turno e Indicadores (Igual al correo) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 10px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Hora Inicio Turno</small>
                    <strong style="font-size: 13px; color: var(--text-primary); margin-top: 4px; display: block;"><i class='bx bx-log-in-circle' style="color: var(--accent-primary);"></i> ${escapeHTML(reportObj.horaInicio || "N/A")}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 10px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Hora Fin Turno</small>
                    <strong style="font-size: 13px; color: var(--text-primary); margin-top: 4px; display: block;"><i class='bx bx-log-out-circle' style="color: var(--warning);"></i> ${escapeHTML(reportObj.horaFin || "N/A")}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 10px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Tiempo Almuerzo Descontado</small>
                    <strong style="font-size: 13px; color: var(--success); margin-top: 4px; display: block;"><i class='bx bx-restaurant'></i> ${escapeHTML(reportObj.tiempoAlmuerzoMins != null ? reportObj.tiempoAlmuerzoMins + " minutos" : "N/A")}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 10px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Tiempo Desayuno Descontado</small>
                    <strong style="font-size: 13px; color: var(--warning); margin-top: 4px; display: block;"><i class='bx bx-coffee'></i> ${escapeHTML(reportObj.tiempoDesayunoMins != null ? reportObj.tiempoDesayunoMins + " minutos" : "N/A")}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 10px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Inactividad / Exceso Pausas</small>
                    <strong style="font-size: 13px; color: var(--danger); margin-top: 4px; display: block;"><i class='bx bx-stopwatch'></i> ${escapeHTML(reportObj.inactividadTotalMins != null ? reportObj.inactividadTotalMins + " minutos" : "N/A")}</strong>
                </div>
            </div>

            <!-- Bit\xE1cora de Tiempos -->
            <div style="background: rgba(0,0,0,0.15); padding: 14px; border-radius: 10px; border: 1px solid var(--glass-border);">
                <h4 style="font-size: 13px; color: var(--accent-primary); margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px;">
                    <i class='bx bx-list-ul'></i> Bit\xE1cora de Tiempos
                </h4>
                <div style="max-height: 180px; overflow-y: auto; padding-right: 5px;">
                    ${bitacoraHtml}
                </div>
            </div>

            <!-- Resumen de Tareas y Observaciones -->
            <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: 10px; border: 1px solid var(--glass-border);">
                <h4 style="font-size: 13px; color: var(--accent-primary); margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px;">
                    <i class='bx bx-task'></i> Resumen de Tareas y Observaciones
                </h4>
                <div style="font-size: 13px; color: var(--text-primary); line-height: 1.6; white-space: pre-wrap; word-break: break-word; font-family: inherit;">
                    ${formattedReportText}
                </div>
            </div>
        </div>
    `;
  }
  function buildPdfBitacoraHtml(bitacoraLines) {
    if (bitacoraLines.length > 0) {
      return bitacoraLines.map((l) => `<div style="padding: 6px 10px; background: #F1F5F9; border-radius: 4px; font-family: monospace; font-size: 11px; color: #334155; margin-bottom: 4px; border-left: 3px solid #3B82F6;">${escapeHTML(l)}</div>`).join("");
    }
    return '<div style="color: #64748B; font-size: 12px; font-style: italic;">No se registraron pausas o inactividades en este turno.</div>';
  }
  function buildShiftReportPdfHtml(reportObj, reportText, now) {
    const bitacoraHtml = buildPdfBitacoraHtml(extractBitacoraLines(reportObj.reporte));
    const formattedReportText = formatReportTextHtml(reportText, HIGHLIGHT_STYLE.PDF);
    const generatedOn = new Date(now).toLocaleDateString("es-CO");
    return `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3B82F6; padding-bottom: 12px; margin-bottom: 20px;">
                <div>
                    <h1 style="margin: 0; font-size: 22px; color: #1E293B; font-weight: 700;">RISK MANAGER</h1>
                    <span style="font-size: 12px; color: #64748B;">Detalle de Turno y Control Operativo</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 11px; color: #64748B; display: block;">Fecha de Generaci\xF3n</span>
                    <strong style="font-size: 12px; color: #0F172A;">${generatedOn}</strong>
                </div>
            </div>

            <!-- Encabezado Gestor y Rol -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; padding: 16px; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 15px;">
                <div>
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748B; display: block;">GESTOR</span>
                    <strong style="font-size: 18px; color: #0F172A; margin-top: 2px; display: block;">${escapeHTML(reportObj.gestor)}</strong>
                    <span style="font-size: 12px; color: #2563EB; font-weight: 600;">Rol: ${escapeHTML(reportObj.rol || "Gestor")}</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748B; display: block;">SET PRINCIPAL TRABAJADO</span>
                    <strong style="font-size: 15px; color: #059669; margin-top: 2px; display: block;">${escapeHTML(reportObj.setTrabajado || "N/A")}</strong>
                </div>
            </div>

            <!-- Tiempos e Indicadores -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;">
                <div style="background: #F8FAFC; padding: 10px 12px; border-radius: 6px; border: 1px solid #E2E8F0;">
                    <small style="color: #64748B; display: block; font-size: 10px;">Hora Inicio Turno</small>
                    <strong style="font-size: 12px; color: #0F172A; margin-top: 2px; display: block;">${escapeHTML(reportObj.horaInicio || "N/A")}</strong>
                </div>
                <div style="background: #F8FAFC; padding: 10px 12px; border-radius: 6px; border: 1px solid #E2E8F0;">
                    <small style="color: #64748B; display: block; font-size: 10px;">Hora Fin Turno</small>
                    <strong style="font-size: 12px; color: #0F172A; margin-top: 2px; display: block;">${escapeHTML(reportObj.horaFin || "N/A")}</strong>
                </div>
                <div style="background: #F8FAFC; padding: 10px 12px; border-radius: 6px; border: 1px solid #E2E8F0;">
                    <small style="color: #64748B; display: block; font-size: 10px;">Almuerzo Descontado</small>
                    <strong style="font-size: 12px; color: #059669; margin-top: 2px; display: block;">${escapeHTML(reportObj.tiempoAlmuerzoMins != null ? reportObj.tiempoAlmuerzoMins + " minutos" : "N/A")}</strong>
                </div>
                <div style="background: #F8FAFC; padding: 10px 12px; border-radius: 6px; border: 1px solid #E2E8F0;">
                    <small style="color: #64748B; display: block; font-size: 10px;">Desayuno Descontado</small>
                    <strong style="font-size: 12px; color: #D97706; margin-top: 2px; display: block;">${escapeHTML(reportObj.tiempoDesayunoMins != null ? reportObj.tiempoDesayunoMins + " minutos" : "N/A")}</strong>
                </div>
                <div style="background: #F8FAFC; padding: 10px 12px; border-radius: 6px; border: 1px solid #E2E8F0; grid-column: span 2;">
                    <small style="color: #64748B; display: block; font-size: 10px;">Inactividad / Exceso Pausas</small>
                    <strong style="font-size: 12px; color: #DC2626; margin-top: 2px; display: block;">${escapeHTML(reportObj.inactividadTotalMins != null ? reportObj.inactividadTotalMins + " minutos" : "N/A")}</strong>
                </div>
            </div>

            <!-- Bit\xE1cora de Tiempos -->
            <div style="background: #F8FAFC; padding: 12px 14px; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 15px;">
                <h4 style="font-size: 12px; color: #2563EB; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Bit\xE1cora de Tiempos</h4>
                <div>${bitacoraHtml}</div>
            </div>

            <!-- Resumen de Tareas -->
            <div style="background: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0;">
                <h4 style="font-size: 12px; color: #2563EB; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Resumen de Tareas y Observaciones</h4>
                <div style="font-size: 12px; color: #1E293B; line-height: 1.6; white-space: pre-wrap; word-break: break-word;">${formattedReportText}</div>
            </div>
        `;
  }
  var PDF_CONTAINER_STYLE = "width: 750px; padding: 25px; background: #FFFFFF; font-family: 'Inter', sans-serif; color: #0F172A;";

  // ../src/controllers/monitoring-controller.js
  var monitoring_controller_exports = {};
  __export(monitoring_controller_exports, {
    createMonitoringController: () => createMonitoringController
  });
  function createMonitoringController(deps) {
    if (Object.prototype.hasOwnProperty.call(deps, "excludedNames")) {
      throw new TypeError("createMonitoringController: excludedNames (SUPERVISORES_NOMBRES) ya no se admite (decisi\xF3n D9b); el directorio de supervisores se deriva de users (supervisorDirectory o repository.fetchSupervisorUsers).");
    }
    const {
      document: document2,
      repository,
      getSessions,
      setSessions,
      hasCronograma,
      getAssignedTasksForGestor: getAssignedTasksForGestor2,
      reconcileTask,
      resolveTaskName,
      getShiftCategory,
      legacyExcludedNames,
      avatars = AVAILABLE_AVATARS2,
      now = Date.now,
      logger = console
    } = deps;
    let supervisorDirectory = assertSupervisorDirectory(deps.supervisorDirectory, "createMonitoringController");
    let directoryRequest = null;
    let directoryFailed = false;
    function ensureSupervisorDirectory({ retry = false } = {}) {
      if (retry) directoryFailed = false;
      if (legacyExcludedNames || supervisorDirectory || directoryFailed) return Promise.resolve();
      if (directoryRequest) return directoryRequest;
      if (!repository || typeof repository.fetchSupervisorUsers !== "function") return Promise.resolve();
      directoryRequest = Promise.resolve().then(() => repository.fetchSupervisorUsers()).then((users) => {
        supervisorDirectory = buildSupervisorDirectory(users);
        return true;
      }, (error) => {
        logger.error("No se pudo leer el directorio de supervisores (users):", error);
        directoryRequest = null;
        directoryFailed = true;
        return false;
      }).then((loaded) => {
        if (loaded) renderActiveSessionsDashboard();
      });
      return directoryRequest;
    }
    function exclusionDeps() {
      return legacyExcludedNames ? { legacyExcludedNames } : { supervisorDirectory };
    }
    function startActiveSessionsListener() {
      ensureSupervisorDirectory({ retry: true });
      return repository.listenActiveSessions((sessions) => {
        setSessions(sessions);
        renderActiveSessionsDashboard();
      }, (error) => {
        logger.error("Error cargando monitoreo en tiempo real:", error);
      });
    }
    function renderActiveSessionsDashboard() {
      const grid = document2.getElementById("monitoreoGrid");
      if (!grid) return;
      grid.innerHTML = "";
      const searchInputEl = document2.getElementById("monitoreoSearchInput");
      const shiftSelectEl = document2.getElementById("filterShiftSelect");
      const statusSelectEl = document2.getElementById("filterStatusSelect");
      const nowMs = now();
      const sessions = getSessions();
      const filteredUids = filterActiveSessionUids(sessions, {
        searchText: searchInputEl ? searchInputEl.value : "",
        shiftQuery: shiftSelectEl ? shiftSelectEl.value : "",
        statusQuery: statusSelectEl ? statusSelectEl.value : ""
      }, { nowMs, ...exclusionDeps(), getShiftCategory });
      ensureSupervisorDirectory();
      if (filteredUids.length === 0) {
        grid.innerHTML = buildEmptyMonitoringHtml();
        return;
      }
      filteredUids.forEach((uid) => {
        const session = sessions[uid];
        if (!session) return;
        const model = buildSessionCardModel(uid, session, {
          nowMs,
          hasCronograma: Boolean(hasCronograma()),
          getAssignedTasks: getAssignedTasksForGestor2,
          reconcileTask,
          avatars
        });
        const card = document2.createElement("div");
        card.className = "monitoreo-card";
        card.innerHTML = buildSessionCardHtml(model);
        const avatarElement = card.querySelector(".monitoreo-avatar");
        if (avatarElement) {
          avatarElement.alt = model.fullName;
          avatarElement.addEventListener("error", () => {
            avatarElement.src = model.fallbackAvatarSrc;
          }, { once: true });
          avatarElement.src = model.avatarSrc;
        }
        grid.appendChild(card);
      });
    }
    function viewTimelineInMonitoreo(uid) {
      const session = getSessions()[uid];
      if (!session) return;
      const modal = document2.getElementById("timelineModal");
      const tbody = document2.getElementById("timelineTableBody");
      if (!modal || !tbody) return;
      document2.getElementById("timelineModalName").innerText = session.name || "Gestor";
      tbody.innerHTML = buildTimelineRowsHtml(buildVisibleTimeline(session, now()));
      modal.classList.add("active");
    }
    function openMonitoreoDetails(uid) {
      const session = getSessions()[uid];
      if (!session) return;
      const fullName = (session.name || "").trim();
      const avatarEl = document2.getElementById("monitoreoModalAvatar");
      if (avatarEl) {
        avatarEl.src = resolveAvatarSrc(fullName, avatars);
        avatarEl.onerror = function() {
          this.onerror = null;
          this.src = buildFallbackAvatarSrc(fullName);
        };
      }
      const nameEl = document2.getElementById("monitoreoModalName");
      if (nameEl) nameEl.textContent = "Detalle de Tareas: " + fullName;
      const infoEl = document2.getElementById("monitoreoModalInfo");
      if (infoEl) infoEl.textContent = buildMonitoreoInfoText(session);
      const tasksList = document2.getElementById("monitoreoModalTasksList");
      if (tasksList) {
        tasksList.innerHTML = "";
        const assignedTasks = hasCronograma() ? getAssignedTasksForGestor2(fullName, session.shift || "Ma\xF1ana") : [];
        const displayTasks = buildDetailDisplayTasks(session, { assignedTasks, reconcileTask, resolveTaskName });
        if (displayTasks.length === 0) {
          tasksList.innerHTML = buildNoTasksHtml();
        } else {
          tasksList.innerHTML = displayTasks.map(buildDetailTaskCardHtml).join("");
        }
      }
      const modal = document2.getElementById("monitoreoModal");
      if (modal) modal.classList.add("active");
    }
    function populateGestoresDropdown() {
      const selectEl = document2.getElementById("monitoreoSearchInput");
      if (!selectEl) return Promise.resolve();
      selectEl.innerHTML = '<option value="">Todos los Gestores</option>';
      return repository.fetchApprovedGestorNames().then((names) => {
        names.forEach((name) => {
          const opt = document2.createElement("option");
          opt.value = name;
          opt.textContent = name;
          selectEl.appendChild(opt);
        });
      }).catch((err) => {
        logger.error("Error populating gestores dropdown:", err);
      });
    }
    return {
      ensureSupervisorDirectory,
      getSupervisorDirectory: () => supervisorDirectory,
      startActiveSessionsListener,
      renderActiveSessionsDashboard,
      viewTimelineInMonitoreo,
      openMonitoreoDetails,
      populateGestoresDropdown
    };
  }

  // ../src/controllers/shift-reports-controller.js
  var shift_reports_controller_exports = {};
  __export(shift_reports_controller_exports, {
    SHIFT_REPORTS_MESSAGES: () => SHIFT_REPORTS_MESSAGES,
    createShiftReportsController: () => createShiftReportsController
  });
  var SHIFT_REPORTS_MESSAGES = Object.freeze({
    NOT_FOUND_DB: "No se encontr\xF3 el reporte en la base de datos.",
    NOT_FOUND_LOCAL: "No se encontr\xF3 la informaci\xF3n del turno.",
    PDF_ENGINE_LOADING: "Cargando motor de generaci\xF3n PDF, por favor intenta en unos segundos.",
    EXPORT_ERROR: "Hubo un error al intentar exportar el reporte."
  });
  function createShiftReportsController(deps) {
    const {
      document: document2,
      repository,
      setupCustomMultiSelect: setupCustomMultiSelect2,
      getSelectedMultiSelectValues: getSelectedMultiSelectValues2,
      summarizeTasks,
      getPdfWorker = () => null,
      alert = () => {
      },
      now = Date.now,
      setTimeout: schedule = (fn, ms) => setTimeout(fn, ms),
      logger = console
    } = deps;
    let allShiftReports = [];
    async function exportShiftReport(fbId) {
      try {
        let reportObj = allShiftReports.find((r) => r.fb_id === fbId);
        if (!reportObj) {
          const fetched = await repository.fetchShiftReportById(fbId);
          if (fetched) reportObj = fetched;
        }
        if (!reportObj) return alert(SHIFT_REPORTS_MESSAGES.NOT_FOUND_DB);
        const reportText = summarizeTasks(reportObj);
        const pdfContainer = document2.createElement("div");
        pdfContainer.style = PDF_CONTAINER_STYLE;
        pdfContainer.innerHTML = buildShiftReportPdfHtml(reportObj, reportText, now());
        document2.body.appendChild(pdfContainer);
        const opt = buildPdfOptions(buildShiftReportPdfFileName(reportObj));
        const worker = getPdfWorker();
        if (worker) {
          await worker.set(opt).from(pdfContainer).save();
        } else {
          alert(SHIFT_REPORTS_MESSAGES.PDF_ENGINE_LOADING);
        }
        document2.body.removeChild(pdfContainer);
      } catch (e) {
        alert(SHIFT_REPORTS_MESSAGES.EXPORT_ERROR);
        logger.error(e);
      }
    }
    function applyShiftReportsFilters() {
      const tbody = document2.getElementById("shiftReportsTableBody");
      if (!tbody) return;
      const selectedGestores = getSelectedMultiSelectValues2("turnosGestorMultiSelect");
      const fechaInput = document2.getElementById("filterFechaInput");
      const fechaQuery = fechaInput ? fechaInput.value : "";
      const { rows, hasExplicitFilter } = filterShiftReports(allShiftReports, { selectedGestores, fechaQuery, now: now() });
      tbody.innerHTML = "";
      if (rows.length === 0) {
        tbody.innerHTML = buildShiftReportsEmptyRowHtml(buildShiftReportsEmptyMessage(hasExplicitFilter));
        return;
      }
      tbody.innerHTML = rows.map((r) => buildShiftReportRowHtml(r, summarizeTasks(r))).join("");
      const removeFooter = () => {
        const existing = document2.getElementById("shiftReportsMostrandoMsg");
        if (existing) existing.remove();
      };
      if (!hasExplicitFilter) {
        schedule(() => {
          removeFooter();
          const msg = document2.createElement("div");
          msg.id = "shiftReportsMostrandoMsg";
          msg.style = "text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 10px; font-style: italic;";
          msg.innerText = buildShiftReportsFooterMessage(rows.length);
          tbody.parentElement.parentElement.appendChild(msg);
        }, 50);
      } else {
        schedule(removeFooter, 50);
      }
    }
    async function renderShiftReports() {
      const tbody = document2.getElementById("shiftReportsTableBody");
      if (!tbody) return;
      if (allShiftReports.length > 0) {
        applyShiftReportsFilters();
      } else {
        tbody.innerHTML = buildShiftReportsLoadingRowHtml();
      }
      try {
        allShiftReports = await repository.fetchAllShiftReports();
        setupCustomMultiSelect2("turnosGestorMultiSelect", collectGestorOptions(allShiftReports), () => {
          applyShiftReportsFilters();
        });
      } catch (e) {
        logger.error("Error cargando historial de turnos:", e);
      }
      applyShiftReportsFilters();
    }
    function openShiftDetailModal(fbId) {
      const reportObj = allShiftReports.find((r) => r.fb_id === fbId);
      if (!reportObj) return alert(SHIFT_REPORTS_MESSAGES.NOT_FOUND_LOCAL);
      const body = document2.getElementById("shiftDetailModalBody");
      const exportBtn = document2.getElementById("exportPdfModalBtn");
      if (exportBtn) {
        exportBtn.onclick = function() {
          exportShiftReport(fbId);
        };
      }
      body.innerHTML = buildShiftDetailHtml(reportObj, summarizeTasks(reportObj));
      document2.getElementById("shiftDetailModal").classList.add("active");
    }
    return {
      exportShiftReport,
      renderShiftReports,
      applyShiftReportsFilters,
      openShiftDetailModal,
      getLoadedReports: () => allShiftReports,
      // Solo pruebas / diagnóstico: reemplaza los reportes cargados sin ir a Firebase.
      setLoadedReports: (reports) => {
        allShiftReports = reports;
      }
    };
  }

  // ../src/controllers/profile-controller.js
  var profile_controller_exports = {};
  __export(profile_controller_exports, {
    createProfileController: () => createProfileController
  });
  function createProfileController(deps) {
    const {
      document: document2,
      getUser,
      getAuthUser,
      closeModal: closeModal2,
      setTimeout: schedule = (fn, ms) => setTimeout(fn, ms),
      logger = console
    } = deps;
    function openProfileModal() {
      const avatarEl = document2.querySelector(".user-profile .avatar");
      const modalImg = document2.getElementById("modalProfileAvatar");
      if (avatarEl && modalImg) {
        modalImg.src = avatarEl.src;
      }
      const currentUser = getUser();
      if (currentUser) {
        const modalName = document2.getElementById("modalProfileName");
        if (modalName) modalName.textContent = currentUser.name || "Usuario";
        const modalRole = document2.getElementById("modalProfileRole");
        if (modalRole) modalRole.textContent = currentUser.role || "Rol";
      }
      document2.getElementById("profileModal").classList.add("active");
      document2.getElementById("newPasswordInput").value = "";
      const msg = document2.getElementById("passwordChangeMsg");
      if (msg) msg.style.display = "none";
    }
    function toggleProfilePassword(iconElement) {
      const input = document2.getElementById("newPasswordInput");
      if (input.type === "password") {
        input.type = "text";
        iconElement.classList.remove("bx-show");
        iconElement.classList.add("bx-hide");
      } else {
        input.type = "password";
        iconElement.classList.remove("bx-hide");
        iconElement.classList.add("bx-show");
      }
    }
    function showMessage(msg, text, tone) {
      msg.textContent = text;
      msg.style.color = PASSWORD_TONE_COLOR[tone];
      msg.style.display = "block";
    }
    async function changePassword() {
      const newPass = document2.getElementById("newPasswordInput").value;
      const msg = document2.getElementById("passwordChangeMsg");
      if (!isPasswordInputAcceptable(newPass)) {
        showMessage(msg, PASSWORD_MESSAGES.EMPTY, PASSWORD_TONE.DANGER);
        return;
      }
      showMessage(msg, PASSWORD_MESSAGES.PENDING, PASSWORD_TONE.NEUTRAL);
      const result = await changeUserPassword({ newPassword: newPass, getAuthUser });
      msg.textContent = result.message;
      msg.style.color = PASSWORD_TONE_COLOR[result.tone];
      if (result.closeModalAfterMs !== null) {
        schedule(() => closeModal2("profileModal"), result.closeModalAfterMs);
      }
      if (result.status === "error") {
        logger.error("Error al actualizar la contrase\xF1a:", result.error);
      }
      return result.status;
    }
    return { openProfileModal, toggleProfilePassword, changePassword };
  }

  // ../src/controllers/notifications-controller.js
  var notifications_controller_exports = {};
  __export(notifications_controller_exports, {
    createNotificationsController: () => createNotificationsController
  });
  function createNotificationsController({ document: document2, getUser, repository, logger = console }) {
    function toggleNotifications() {
      const drop = document2.getElementById("notificationDropdown");
      if (drop) {
        if (drop.style.display === "none" || drop.style.display === "") {
          drop.style.display = "block";
        } else {
          drop.style.display = "none";
        }
      }
    }
    async function markAllAsRead() {
      const user = getUser();
      if (!user) return;
      try {
        await repository.markAllAsRead(user);
      } catch (e) {
        logger.error(e);
      }
    }
    return { toggleNotifications, markAllAsRead };
  }

  // ../src/domain/analytics/metrics-calculator.js
  var metrics_calculator_exports = {};
  __export(metrics_calculator_exports, {
    aggregateOperativoData: () => aggregateOperativoData,
    finalizeGestorMetrics: () => finalizeGestorMetrics,
    getLocalYYYYMMDD: () => getLocalYYYYMMDD,
    isFechaInRange: () => isFechaInRange,
    matchesGestorSelection: () => matchesGestorSelection,
    normalizeForMatch: () => normalizeForMatch,
    parseTime: () => parseTime,
    resolveOperativoRanges: () => resolveOperativoRanges,
    resolveSelectedGestorLabel: () => resolveSelectedGestorLabel,
    selectGlobalForCharts: () => selectGlobalForCharts,
    summarizeOperativoRows: () => summarizeOperativoRows
  });
  function normalizeForMatch(text) {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function parseTime(timeStr, baseDateMs) {
    if (typeof timeStr === "string") {
      timeStr = timeStr.replace(/a\.\s*m\./i, "AM").replace(/p\.\s*m\./i, "PM");
    }
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d.getTime();
    if (typeof timeStr === "string" && timeStr.includes(":")) {
      const parts = timeStr.match(/(\d+):(\d+)/);
      if (parts) {
        const base = new Date(baseDateMs);
        let hours = parseInt(parts[1], 10);
        if (timeStr.toUpperCase().includes("PM") && hours < 12) hours += 12;
        if (timeStr.toUpperCase().includes("AM") && hours === 12) hours = 0;
        base.setHours(hours, parseInt(parts[2], 10), 0, 0);
        return base.getTime();
      }
    }
    return NaN;
  }
  function matchesGestorSelection(mstrGestor, selectedGestores) {
    if (selectedGestores.length === 0) return true;
    if (selectedGestores.includes(mstrGestor)) return true;
    const normMstr = normalizeForMatch(mstrGestor);
    return selectedGestores.some((sel) => {
      const normSel = normalizeForMatch(sel);
      if (normMstr === normSel) return true;
      const parts = normSel.split(" ").filter(Boolean);
      if (parts.every((p) => normMstr.includes(p))) return true;
      const mstrParts = normMstr.split(" ").filter(Boolean);
      if (parts.length >= 2 && mstrParts.length >= 2) {
        return normMstr.includes(parts[0]) && normMstr.includes(parts[1]);
      }
      return false;
    });
  }
  function getLocalYYYYMMDD(d) {
    const tzOffset = d.getTimezoneOffset() * 6e4;
    return new Date(d.getTime() - tzOffset).toISOString().split("T")[0];
  }
  function resolveOperativoRanges(now) {
    const todayStr = getLocalYYYYMMDD(now);
    const yesterday = new Date(now.getTime());
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalYYYYMMDD(yesterday);
    const sevenDaysAgo = new Date(now.getTime());
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = getLocalYYYYMMDD(sevenDaysAgo);
    const thirtyDaysAgo = new Date(now.getTime());
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = getLocalYYYYMMDD(thirtyDaysAgo);
    const thisMonth = todayStr.substring(0, 7);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = getLocalYYYYMMDD(lastMonthDate).substring(0, 7);
    return { todayStr, yesterdayStr, sevenDaysAgoStr, thirtyDaysAgoStr, thisMonth, lastMonth };
  }
  function isFechaInRange(fecha, selectedFecha, ranges, customStart, customEnd) {
    if (selectedFecha === "Todas") return true;
    if (selectedFecha === "today" && fecha === ranges.todayStr) return true;
    if (selectedFecha === "yesterday" && fecha === ranges.yesterdayStr) return true;
    if (selectedFecha === "7" && fecha >= ranges.sevenDaysAgoStr && fecha <= ranges.todayStr) return true;
    if (selectedFecha === "30" && fecha >= ranges.thirtyDaysAgoStr && fecha <= ranges.todayStr) return true;
    if (selectedFecha === "thisMonth" && fecha.substring(0, 7) === ranges.thisMonth) return true;
    if (selectedFecha === "lastMonth" && fecha.substring(0, 7) === ranges.lastMonth) return true;
    if (selectedFecha === "custom" && customStart && customEnd && fecha >= customStart && fecha <= customEnd) return true;
    return false;
  }
  function emptyAggregate() {
    return {
      Retiros_Aprobados: 0,
      Retiros_Rechazados: 0,
      Tiempo_Total_Desde_Creacion_Segundos: 0,
      Dias_Tarde: 0,
      Minutos_Tarde_Total: 0,
      Minutos_Inactividad_Total: 0,
      Dias_Laborados: 0
    };
  }
  function finalizeGestorMetrics(d) {
    const dl = d.Dias_Laborados > 0 ? d.Dias_Laborados : 1;
    d.Prom_Minutos_Tarde = Math.round(d.Minutos_Tarde_Total / dl * 100) / 100;
    d.Prom_Inactividad_Diaria = Math.round(d.Minutos_Inactividad_Total / dl * 100) / 100;
    d.Retiros_Procesados = d.Retiros_Aprobados + d.Retiros_Rechazados;
    d.ART_Desde_Creacion_Minutos = d.Retiros_Procesados > 0 ? Math.round(d.Tiempo_Total_Desde_Creacion_Segundos / d.Retiros_Procesados / 60 * 100) / 100 : 0;
    d.Porcentaje_Rechazos = d.Retiros_Procesados > 0 ? Math.round(d.Retiros_Rechazados / d.Retiros_Procesados * 100 * 100) / 100 : 0;
    d.Tasa_Aprobacion_Dia = Math.round(d.Retiros_Aprobados / dl * 100) / 100;
    return d;
  }
  function aggregateOperativoData(rawData, options) {
    const { selectedGestores = [], selectedFecha, customStart, customEnd, now } = options;
    const ranges = resolveOperativoRanges(now);
    const aggregatedData = {};
    const aggregatedDataGlobal = {};
    const dailyData = {};
    for (const gestor in rawData) {
      aggregatedDataGlobal[gestor] = emptyAggregate();
      if (matchesGestorSelection(gestor, selectedGestores)) {
        aggregatedData[gestor] = emptyAggregate();
      }
      for (const fecha in rawData[gestor]) {
        if (!isFechaInRange(fecha, selectedFecha, ranges, customStart, customEnd)) continue;
        const d = rawData[gestor][fecha];
        const procesadosEnDia = d.Retiros_Procesados !== void 0 ? d.Retiros_Procesados : (d.Retiros_Aprobados || 0) + (d.Retiros_Rechazados || 0);
        const esDiaActivo = d.Dias_Laborados && d.Dias_Laborados > 0 ? d.Dias_Laborados : procesadosEnDia > 0 ? 1 : 0;
        const g = aggregatedDataGlobal[gestor];
        g.Retiros_Aprobados += d.Retiros_Aprobados || 0;
        g.Retiros_Rechazados += d.Retiros_Rechazados || 0;
        g.Tiempo_Total_Desde_Creacion_Segundos += d.Tiempo_Total_Desde_Creacion_Segundos || 0;
        g.Dias_Tarde += d.Dias_Tarde || 0;
        g.Minutos_Tarde_Total += d.Minutos_Tarde_Total || 0;
        g.Minutos_Inactividad_Total += d.Minutos_Inactividad_Total || 0;
        g.Dias_Laborados += esDiaActivo;
        if (matchesGestorSelection(gestor, selectedGestores)) {
          if (!dailyData[fecha]) {
            dailyData[fecha] = { Aprobados: 0, Rechazados: 0 };
          }
          dailyData[fecha].Aprobados += d.Retiros_Aprobados || 0;
          dailyData[fecha].Rechazados += d.Retiros_Rechazados || 0;
          const a = aggregatedData[gestor];
          a.Retiros_Aprobados += d.Retiros_Aprobados || 0;
          a.Retiros_Rechazados += d.Retiros_Rechazados || 0;
          a.Tiempo_Total_Desde_Creacion_Segundos += d.Tiempo_Total_Desde_Creacion_Segundos || 0;
          a.Dias_Tarde += d.Dias_Tarde || 0;
          a.Minutos_Tarde_Total += d.Minutos_Tarde_Total || 0;
          a.Minutos_Inactividad_Total += d.Minutos_Inactividad_Total || 0;
          a.Dias_Laborados += esDiaActivo;
        }
      }
    }
    for (const gestor in aggregatedData) finalizeGestorMetrics(aggregatedData[gestor]);
    for (const gestor in aggregatedDataGlobal) finalizeGestorMetrics(aggregatedDataGlobal[gestor]);
    return { aggregatedData, aggregatedDataGlobal, dailyData };
  }
  function summarizeOperativoRows(aggregatedData) {
    let globalProcesados = 0;
    let globalAprobados = 0;
    let globalRechazados = 0;
    let globalARTTotal = 0;
    let gestoresContados = 0;
    const rows = [];
    const gestoresArray = Object.keys(aggregatedData).map((gestor) => ({ gestor, ...aggregatedData[gestor] }));
    gestoresArray.sort((a, b) => b.Retiros_Aprobados - a.Retiros_Aprobados);
    for (const d of gestoresArray) {
      if (d.Retiros_Procesados === 0 && d.Dias_Laborados === 0) continue;
      globalProcesados += d.Retiros_Procesados;
      globalAprobados += d.Retiros_Aprobados;
      globalRechazados += d.Retiros_Rechazados;
      globalARTTotal += d.ART_Desde_Creacion_Minutos;
      if (d.Retiros_Procesados > 0) gestoresContados++;
      rows.push(d);
    }
    const avgArt = gestoresContados > 0 ? (globalARTTotal / gestoresContados).toFixed(1) : 0;
    return { rows, globalProcesados, globalAprobados, globalRechazados, avgArt };
  }
  function selectGlobalForCharts(aggregatedDataGlobal, supervisorDirectory, options = {}) {
    const { legacyExcludedNames } = options;
    const directory = legacyExcludedNames ? null : assertSupervisorDirectory(supervisorDirectory, "selectGlobalForCharts");
    const isExcluded = legacyExcludedNames ? (gestor) => legacyExcludedNames.some((ex) => gestor.includes(ex) || gestor.includes("Sara Santamar")) : (gestor) => isSupervisorName(directory, gestor);
    const globalForCharts = {};
    for (const gestor in aggregatedDataGlobal) {
      if (isExcluded(gestor)) continue;
      if (aggregatedDataGlobal[gestor].Retiros_Procesados > 0 || aggregatedDataGlobal[gestor].Dias_Laborados > 0) {
        globalForCharts[gestor] = aggregatedDataGlobal[gestor];
      }
    }
    return globalForCharts;
  }
  function resolveSelectedGestorLabel(selectedGestores) {
    return selectedGestores.length === 1 ? selectedGestores[0] : selectedGestores.length === 0 ? "Todos" : `${selectedGestores.length} Gestores`;
  }

  // ../src/domain/analytics/kpi-service.js
  var kpi_service_exports = {};
  __export(kpi_service_exports, {
    KPI_TARGET_GESTORES: () => KPI_TARGET_GESTORES,
    MAX_INACTIVITY_MINS_PER_REPORT: () => MAX_INACTIVITY_MINS_PER_REPORT,
    MAX_SHIFT_WINDOW_MS: () => MAX_SHIFT_WINDOW_MS,
    buildKpiUsersMap: () => buildKpiUsersMap,
    findRealGestorKey: () => findRealGestorKey,
    loadRetirosData: () => loadRetirosData,
    mergeShiftReportsIntoOperativoData: () => mergeShiftReportsIntoOperativoData,
    resolveOperativeDayKey: () => resolveOperativeDayKey,
    selectKpiGestores: () => selectKpiGestores,
    toLocalDateKey: () => toLocalDateKey2
  });
  var KPI_TARGET_GESTORES = Object.freeze([
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
  ]);
  var MAX_INACTIVITY_MINS_PER_REPORT = 480;
  var MAX_SHIFT_WINDOW_MS = 10 * 60 * 60 * 1e3;
  function buildKpiUsersMap(usersObj) {
    const map = {};
    Object.values(usersObj || {}).forEach((u) => {
      if (u && u.email && u.name) {
        map[u.email.toLowerCase()] = u.name.trim();
      }
    });
    return map;
  }
  function selectKpiGestores(usersObj) {
    const usersByEmail = {};
    const gestores = Object.keys(usersObj).map((k) => {
      const u = usersObj[k];
      if (u && u.email && u.name) {
        usersByEmail[u.email.toLowerCase()] = u.name.trim();
      }
      return u;
    }).filter((u) => {
      if (!u || u.role !== "Gestor" || u.approved !== true) return false;
      const nameLower = u.name.toLowerCase();
      return KPI_TARGET_GESTORES.some((t) => nameLower.includes(t));
    }).map((u) => u.name.trim()).sort((a, b) => a.localeCompare(b));
    return { usersByEmail, gestorNames: [...new Set(gestores)] };
  }
  async function loadRetirosData({ fetchData, target, logger = console }) {
    try {
      const data = await fetchData();
      target.retirosGlobalData = data;
      target.controlOperativoRawData = data;
      logger.log("Data de retiros cargada autom\xE1ticamente:", Object.keys(data).length, "gestores");
    } catch (err) {
      logger.warn("No hay data de retiros automatizada o hubo un error:", err);
      target.retirosGlobalData = null;
    }
  }
  function findRealGestorKey(gestorName, rawKeys) {
    const searchName = normalizeForMatch(gestorName);
    let realGestor = rawKeys.find((k) => normalizeForMatch(k) === searchName);
    if (!realGestor) {
      const parts = searchName.split(" ");
      if (parts.length >= 2) {
        realGestor = rawKeys.find((k) => {
          const normK = normalizeForMatch(k);
          return normK.includes(parts[0]) && normK.includes(parts[1]);
        });
      }
    }
    return realGestor;
  }
  function loginDateFromHoraInicio(horaInicio) {
    let loginDate = null;
    try {
      const parts = horaInicio.split(",");
      if (parts.length > 0) {
        const dParts = parts[0].trim().split("/");
        if (dParts.length === 3) {
          let day = parseInt(dParts[0]);
          let month = parseInt(dParts[1]);
          const year = parseInt(dParts[2]);
          if (month > 12) {
            const t = day;
            day = month;
            month = t;
          }
          const tStr = parts.length > 1 ? parts[1].trim().replace(/\./g, "").replace(/a\s*m/i, "AM").replace(/p\s*m/i, "PM") : "00:00:00";
          loginDate = /* @__PURE__ */ new Date(`${month}/${day}/${year} ${tStr}`);
        } else {
          loginDate = new Date(horaInicio);
        }
      }
    } catch (e) {
    }
    return loginDate;
  }
  function toLocalDateKey2(date, timeZone) {
    if (timeZone) {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
      const get = (type) => parts.find((p) => p.type === type).value;
      return `${get("year")}-${get("month")}-${get("day")}`;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function previousDateKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  }
  function calendarKey(year, month, day) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || year < 1e3 || month < 1 || month > 12 || day < 1) return null;
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (probe.getUTCMonth() !== month - 1) return null;
    return probe.toISOString().slice(0, 10);
  }
  function horaInicioDateCandidates(horaInicio) {
    if (typeof horaInicio !== "string") return [];
    const iso = horaInicio.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return [calendarKey(+iso[1], +iso[2], +iso[3])].filter(Boolean);
    const m = horaInicio.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return [];
    const a = +m[1], b = +m[2], y = +m[3];
    return [...new Set([calendarKey(y, b, a), calendarKey(y, a, b)].filter(Boolean))];
  }
  function resolveOperativeDayKey(report, { nowMs, timeZone } = {}) {
    if (report.loginTime) {
      const login = new Date(report.loginTime);
      if (!Number.isNaN(login.getTime())) return toLocalDateKey2(login, timeZone);
    }
    const closure = report.timestamp ? new Date(report.timestamp) : null;
    const closureKey = closure && !Number.isNaN(closure.getTime()) ? toLocalDateKey2(closure, timeZone) : null;
    const candidates = horaInicioDateCandidates(report.horaInicio);
    if (candidates.length > 0) {
      if (!closureKey) return candidates[0];
      const prev = previousDateKey(closureKey);
      const hit = candidates.find((c) => c === closureKey || c === prev);
      if (hit) return hit;
    }
    if (closureKey) return closureKey;
    return toLocalDateKey2(new Date(nowMs), timeZone);
  }
  function mergeShiftReportsIntoOperativoData(rawData, shiftReports, options) {
    const { nowMs, fechaLocal = true, timeZone } = options;
    const reports = Array.isArray(shiftReports) ? shiftReports : Object.values(shiftReports || {});
    reports.forEach((report) => {
      if (report.rol !== "Gestor") return;
      const gestorName = report.gestor;
      if (!gestorName) return;
      const reportDate = report.timestamp ? new Date(report.timestamp) : new Date(nowMs);
      let reportDateStr;
      if (fechaLocal) {
        if (Number.isNaN(reportDate.getTime())) throw new RangeError("Invalid time value");
        reportDateStr = resolveOperativeDayKey(report, { nowMs, timeZone });
      } else {
        reportDateStr = reportDate.toISOString().split("T")[0];
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
        let inactMins = 0;
        const shiftLoginDate = report.loginTime ? new Date(report.loginTime) : report.timestamp ? new Date(report.timestamp) : null;
        const maxEndTime = shiftLoginDate ? shiftLoginDate.getTime() + MAX_SHIFT_WINDOW_MS : nowMs + 99999999;
        if (report.timeline && report.timeline.length > 0) {
          report.timeline.forEach((ev) => {
            if (ev.type === "Inactividad") {
              if (shiftLoginDate && ev.start > maxEndTime) return;
              let eTime = ev.end ? ev.end : nowMs;
              if (shiftLoginDate && eTime > maxEndTime) eTime = maxEndTime;
              const mins = (eTime - ev.start) / (1e3 * 60);
              if (mins > 0) inactMins += mins;
            }
          });
        } else if (report.inactividadTotalMins !== void 0) {
          inactMins = report.inactividadTotalMins;
        }
        let tardMins = 0;
        let isFueraDeHorario = false;
        let loginDate = report.loginTime ? new Date(report.loginTime) : null;
        if (report.tardanzaMins !== void 0) {
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
              if (ampm === "pm" && hour < 12) hour += 12;
              if (ampm === "am" && hour === 12) hour = 0;
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
        if (currentStoredTard === void 0 || tardMins > 0 && currentStoredTard === 0) {
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

  // ../src/domain/analytics/operativo-analysis.js
  var operativo_analysis_exports = {};
  __export(operativo_analysis_exports, {
    computeAnalysisStats: () => computeAnalysisStats,
    isDateIncludedInAnalysis: () => isDateIncludedInAnalysis,
    resolveFiltroGestor: () => resolveFiltroGestor
  });
  function resolveFiltroGestor(selectedGestores) {
    return selectedGestores.length === 1 ? selectedGestores[0] : selectedGestores.length === 0 ? "Todos" : "Varios";
  }
  function isDateIncludedInAnalysis(date, ctx) {
    const { filtroFecha, isCustom, dateStart, dateEnd, today, corregirBugs = true } = ctx;
    if (corregirBugs) {
      return isFechaInRange(date, filtroFecha, resolveOperativoRanges(today), dateStart, dateEnd);
    }
    const itemDate = /* @__PURE__ */ new Date(date + "T00:00:00");
    let includeDate = true;
    if (filtroFecha === "today") {
      if (itemDate.getTime() !== today.getTime()) includeDate = false;
    } else if (filtroFecha === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (itemDate.getTime() !== yesterday.getTime()) includeDate = false;
    } else if (filtroFecha === "7") {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (itemDate < sevenDaysAgo) includeDate = false;
    } else if (filtroFecha === "30") {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (itemDate < thirtyDaysAgo) includeDate = false;
    } else if (filtroFecha === "thisMonth") {
      if (itemDate.getMonth() !== today.getMonth() || itemDate.getFullYear() !== today.getFullYear()) includeDate = false;
    } else if (filtroFecha === "lastMonth") {
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      if (itemDate.getMonth() !== lastMonth.getMonth() || itemDate.getFullYear() !== lastMonth.getFullYear()) includeDate = false;
    } else if (isCustom && dateStart && dateEnd) {
      const startObj = /* @__PURE__ */ new Date(dateStart + "T00:00:00");
      const endObj = /* @__PURE__ */ new Date(dateEnd + "T23:59:59");
      if (itemDate < startObj || itemDate > endObj) includeDate = false;
    }
    return includeDate;
  }
  function computeAnalysisStats(rawData, options) {
    if (Object.prototype.hasOwnProperty.call(options, "excludedNames")) {
      throw new TypeError("computeAnalysisStats: la opci\xF3n excludedNames ya no se admite (decisi\xF3n D9b); use supervisorDirectory (derivado de users) o, solo en pruebas diferenciales, legacyExcludedNames.");
    }
    const {
      selectedGestores,
      filtroFecha,
      dateStart = null,
      dateEnd = null,
      now,
      corregirBugs = true,
      supervisorDirectory = null,
      legacyExcludedNames
    } = options;
    const directory = legacyExcludedNames ? null : assertSupervisorDirectory(supervisorDirectory, "computeAnalysisStats");
    const isExcluded = legacyExcludedNames ? (gestor) => legacyExcludedNames.some((ex) => gestor.includes(ex)) : (gestor) => isSupervisorName(directory, gestor);
    const isCustom = filtroFecha === "custom";
    let totalProcesados = 0;
    let totalAprobados = 0;
    let totalRechazados = 0;
    const gestoresStats = {};
    let excludedCount = 0;
    for (const gestor in rawData) {
      if (selectedGestores.length > 0 && !selectedGestores.includes(gestor)) continue;
      if (selectedGestores.length === 0 && isExcluded(gestor)) {
        excludedCount++;
        continue;
      }
      let gProcesados = 0;
      let gAprobados = 0;
      let gRechazados = 0;
      let gARTTotal = 0;
      let gARTCount = 0;
      const today = new Date(now.getTime());
      today.setHours(0, 0, 0, 0);
      for (const date in rawData[gestor]) {
        if (!isDateIncludedInAnalysis(date, { filtroFecha, isCustom, dateStart, dateEnd, today, corregirBugs })) continue;
        const dayData = rawData[gestor][date];
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
          artPromedio: gARTCount > 0 ? gARTTotal / gARTCount : 0
        };
      }
    }
    return { totalProcesados, totalAprobados, totalRechazados, excludedCount, gestoresStats };
  }

  // ../src/domain/analytics/executive-report.js
  var executive_report_exports = {};
  __export(executive_report_exports, {
    PRINT_DELAY_MS: () => PRINT_DELAY_MS,
    REPORT_CHARTS: () => REPORT_CHARTS,
    REPORT_CUSTOM_END_FALLBACK: () => REPORT_CUSTOM_END_FALLBACK,
    REPORT_CUSTOM_START_FALLBACK: () => REPORT_CUSTOM_START_FALLBACK,
    REPORT_TABLE_TITLE_HTML: () => REPORT_TABLE_TITLE_HTML,
    buildReportGestorText: () => buildReportGestorText,
    buildReportMetaText: () => buildReportMetaText,
    buildReportPeriodoText: () => buildReportPeriodoText,
    buildReportTableHtml: () => buildReportTableHtml,
    planReportCharts: () => planReportCharts
  });
  var PRINT_DELAY_MS = 800;
  var REPORT_CUSTOM_START_FALLBACK = "Inicio";
  var REPORT_CUSTOM_END_FALLBACK = "Fin";
  var REPORT_CHARTS = Object.freeze([
    Object.freeze({ chartKey: "chartTardanzasPeores", imgId: "printChart5", title: "Top Alerta Tardanzas (Peores)" }),
    Object.freeze({ chartKey: "chartTardanzasMejores", imgId: "printChart1", title: "Top Excelencia Puntualidad (Mejores)" }),
    Object.freeze({ chartKey: "chartAprobacionesDia", imgId: "printChart2", title: "Evoluci\xF3n Diaria de Retiros" }),
    Object.freeze({ chartKey: "chartInactividad", imgId: "printChart3", title: "Promedio Inactividad Diaria (Min)" }),
    Object.freeze({ chartKey: "chartEficiencia", imgId: "printChart4", title: "Eficiencia y Volumen de Retiros" })
  ]);
  var REPORT_TABLE_TITLE_HTML = `<h3 style="color: #000; text-align: center; margin-bottom: 10px; font-size: 14pt; font-weight: bold; page-break-after: avoid;">Resumen de Retiros por Gestor</h3>`;
  function buildReportGestorText(selectedGestores) {
    return selectedGestores.length > 0 ? selectedGestores.join(", ") : "Todos los gestores";
  }
  function buildReportPeriodoText({ selectedOptionText, value, customStart, customEnd }) {
    if (value === "custom") {
      return `Personalizado (${customStart || REPORT_CUSTOM_START_FALLBACK} a ${customEnd || REPORT_CUSTOM_END_FALLBACK})`;
    }
    return selectedOptionText;
  }
  function buildReportMetaText({ generatedAtText, gestorText, periodoText }) {
    return `Fecha de generaci\xF3n: ${generatedAtText} | Gestor(es): ${gestorText} | Periodo: ${periodoText}`;
  }
  function buildReportTableHtml(tableOuterHtml) {
    return REPORT_TABLE_TITLE_HTML + tableOuterHtml;
  }
  function planReportCharts(chartRegistry, hasImage) {
    return REPORT_CHARTS.map((c) => {
      const chartObj = chartRegistry[c.chartKey];
      const img = hasImage(c.imgId);
      let action = "skip";
      if (chartObj && img) action = "capture";
      else if (img) action = "hide";
      return { ...c, action };
    });
  }

  // ../src/services/external/kpi-operativos-source.js
  var kpi_operativos_source_exports = {};
  __export(kpi_operativos_source_exports, {
    KPI_OPERATIVOS_DATA_FILE: () => KPI_OPERATIVOS_DATA_FILE,
    KPI_OPERATIVOS_SEED_FILE: () => KPI_OPERATIVOS_SEED_FILE,
    detectLocalEnvironment: () => detectLocalEnvironment,
    fetchKpiOperativosData: () => fetchKpiOperativosData
  });
  var KPI_OPERATIVOS_SEED_FILE = "kpi_operativos_seed.json";
  var KPI_OPERATIVOS_DATA_FILE = "kpi_operativos_v2.json";
  function detectLocalEnvironment(win) {
    return typeof win !== "undefined" && win !== null && !!win.location && (win.location.hostname === "localhost" || win.location.hostname === "127.0.0.1" || win.location.protocol === "file:");
  }
  async function fetchKpiOperativosData({ fetchFn, isLocal, now = () => (/* @__PURE__ */ new Date()).getTime(), logger = console }) {
    if (isLocal) {
      try {
        const seedResp = await fetchFn(KPI_OPERATIVOS_SEED_FILE + "?v=" + now());
        if (seedResp.ok) {
          const seedData = await seedResp.json();
          if (seedData && Object.keys(seedData).length > 0) {
            logger.log("[Laboratorio Local] Datos semilla cargados con \xE9xito desde kpi_operativos_seed.json");
            return seedData;
          }
        }
      } catch (e) {
        logger.warn("[Laboratorio Local] kpi_operativos_seed.json no disponible, usando archivo est\xE1ndar", e);
      }
    }
    const response = await fetchFn(KPI_OPERATIVOS_DATA_FILE + "?v=" + now());
    if (!response.ok) throw new Error("No se pudo cargar kpi_operativos_v2.json");
    return await response.json();
  }

  // ../src/services/firebase/firebase-kpi-repository.js
  var firebase_kpi_repository_exports = {};
  __export(firebase_kpi_repository_exports, {
    KPI_SHIFT_REPORTS_PATH: () => KPI_SHIFT_REPORTS_PATH,
    KPI_USERS_PATH: () => KPI_USERS_PATH,
    readShiftReports: () => readShiftReports,
    readUsers: () => readUsers
  });
  var KPI_USERS_PATH = "users";
  var KPI_SHIFT_REPORTS_PATH = "shift_reports";
  async function readNode(database, path) {
    const snapshot = await database.ref(path).once("value");
    return snapshot && snapshot.exists() ? snapshot.val() : null;
  }
  function readUsers(database) {
    return readNode(database, KPI_USERS_PATH);
  }
  function readShiftReports(database) {
    return readNode(database, KPI_SHIFT_REPORTS_PATH);
  }

  // ../src/ui/components/kpi-task-details.js
  var kpi_task_details_exports = {};
  __export(kpi_task_details_exports, {
    KPI_TASKS_EMPTY_HTML: () => KPI_TASKS_EMPTY_HTML,
    buildKpiTaskCardHtml: () => buildKpiTaskCardHtml,
    buildKpiTaskListHtml: () => buildKpiTaskListHtml,
    getKpiTaskDetailsHeader: () => getKpiTaskDetailsHeader
  });
  var HEADERS = Object.freeze({
    finalizadas: Object.freeze({ title: "Tareas Finalizadas", iconClass: "bx bx-check-double", iconColor: "var(--success)" }),
    no_realizadas: Object.freeze({ title: "Tareas No Realizadas", iconClass: "bx bx-x-circle", iconColor: "var(--danger)" }),
    pendientes: Object.freeze({ title: "Tareas Pendientes", iconClass: "bx bx-time", iconColor: "var(--warning)" })
  });
  var KPI_TASKS_EMPTY_HTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay tareas en este estado.</div>';
  function getKpiTaskDetailsHeader(tipo) {
    return Object.prototype.hasOwnProperty.call(HEADERS, tipo) ? HEADERS[tipo] : null;
  }
  function buildKpiTaskCardHtml(t) {
    const tTypeColor = t.type === "adicional" ? "var(--warning)" : "var(--accent-primary)";
    const tTypeBadge = `<span style="font-size: 10px; background: ${tTypeColor}20; color: ${tTypeColor}; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">${t.type === "adicional" ? "Adicional" : "Set"}</span>`;
    return `
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
  }
  function buildKpiTaskListHtml(tasks) {
    if (!tasks || tasks.length === 0) return KPI_TASKS_EMPTY_HTML;
    return tasks.map(buildKpiTaskCardHtml).join("");
  }

  // ../src/ui/views/operativo-analysis-view.js
  var operativo_analysis_view_exports = {};
  __export(operativo_analysis_view_exports, {
    ANALYSIS_NO_DATA_HTML: () => ANALYSIS_NO_DATA_HTML,
    buildAnalysisHtml: () => buildAnalysisHtml
  });
  var ANALYSIS_NO_DATA_HTML = `<p>No hay suficientes datos procesados para el periodo o gestor seleccionado para generar un an\xE1lisis.</p>`;
  function buildAnalysisHtml(analysis, filtroGestor, options = {}) {
    const { corregirBugs = true } = options;
    const { totalProcesados, totalAprobados, gestoresStats } = analysis;
    let html = ``;
    const hasOwnStats = (name) => Object.prototype.hasOwnProperty.call(gestoresStats, name);
    if (corregirBugs && filtroGestor !== "Todos" && filtroGestor !== "Varios" && Object.keys(gestoresStats).length > 0 && !hasOwnStats(filtroGestor)) {
      return ANALYSIS_NO_DATA_HTML;
    }
    const modo = corregirBugs && filtroGestor === "Varios" ? "Todos" : filtroGestor;
    if (Object.keys(gestoresStats).length === 0) {
      html = `<p>No hay suficientes datos procesados para el periodo o gestor seleccionado para generar un an\xE1lisis.</p>`;
    } else if (modo !== "Todos") {
      const stats = gestoresStats[filtroGestor];
      const tasaAprobacion = stats.procesados > 0 ? (stats.aprobados / stats.procesados * 100).toFixed(1) : 0;
      const tasaRechazo = stats.procesados > 0 ? (stats.rechazados / stats.procesados * 100).toFixed(1) : 0;
      html += `<h3 style="color: var(--accent-primary); border-bottom: 2px solid var(--accent-primary); padding-bottom: 5px; margin-bottom: 15px;">Reporte Individual: ${corregirBugs ? escapeHTML(filtroGestor) : filtroGestor}</h3>`;
      html += `<p>Resumen de rendimiento operativo para el periodo seleccionado. A continuaci\xF3n se presentan las m\xE9tricas clave evaluadas:</p>`;
      html += `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: var(--accent-primary); color: white;">
                    <th style="padding: 10px; border: 1px solid #ddd;">M\xE9trica</th>
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
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Tiempo Promedio de Resoluci\xF3n (ART)</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 16px;">${stats.artPromedio.toFixed(2)} min</td>
                </tr>
            </tbody>
        </table>`;
      if (stats.artPromedio > 1200) {
        html += `<div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger); padding: 15px; margin-top: 15px;">
                <strong>\u26A0\uFE0F \xC1rea de Oportunidad:</strong> El tiempo de resoluci\xF3n es significativamente alto (m\xE1s de 20 horas). Se sugiere revisar si hay bloqueos o si los casos asignados son de alta complejidad.
            </div>`;
      } else if (stats.artPromedio < 900) {
        html += `<div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid var(--success); padding: 15px; margin-top: 15px;">
                <strong>\u{1F3C6} Excelente Velocidad:</strong> El gestor mantiene tiempos de respuesta altamente competitivos, por debajo del est\xE1ndar de 15 horas.
            </div>`;
      } else {
        html += `<div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid var(--accent-primary); padding: 15px; margin-top: 15px;">
                <strong>\u{1F4CA} Rendimiento Estable:</strong> El gestor mantiene tiempos de respuesta dentro de los promedios esperados de la operaci\xF3n.
            </div>`;
      }
    } else {
      html += `<h3 style="color: var(--accent-primary);">Resumen Ejecutivo del Equipo</h3>`;
      html += `<p>El equipo proces\xF3 un volumen total de <strong>${totalProcesados} solicitudes</strong> en el periodo evaluado. La tasa global de aprobaci\xF3n es alt\xEDsima (${(totalAprobados / totalProcesados * 100).toFixed(1)}%), sugiriendo flujos estables y predecibles.</p>`;
      const sortedByVol = Object.entries(gestoresStats).sort((a, b) => b[1].procesados - a[1].procesados);
      const sortedByART = Object.entries(gestoresStats).filter((a) => a[1].artPromedio > 0).sort((a, b) => a[1].artPromedio - b[1].artPromedio);
      if (sortedByVol.length > 0) {
        html += `<h4>\u{1F3C6} Liderazgo en Volumen</h4>`;
        html += `<p>El gestor con mayor carga operativa es <strong>${escapeHTML(sortedByVol[0][0])}</strong> con ${sortedByVol[0][1].procesados} procesados.`;
        if (sortedByVol.length > 1) {
          html += ` Le sigue <strong>${escapeHTML(sortedByVol[1][0])}</strong> con ${sortedByVol[1][1].procesados}.</p>`;
        } else {
          html += `</p>`;
        }
      }
      if (sortedByART.length > 0) {
        html += `<h4>\u26A1 Rendimiento en Velocidad (ART)</h4>`;
        html += `<p>El gestor m\xE1s \xE1gil en resoluci\xF3n es <strong>${escapeHTML(sortedByART[0][0])}</strong> con un tiempo promedio de <strong>${sortedByART[0][1].artPromedio.toFixed(2)} minutos</strong>.`;
        if (sortedByART.length > 1) {
          html += ` En segundo lugar destaca <strong>${escapeHTML(sortedByART[1][0])}</strong> con ${sortedByART[1][1].artPromedio.toFixed(2)} mins.</p>`;
        } else {
          html += `</p>`;
        }
        const slowest = sortedByART[sortedByART.length - 1];
        if (slowest[1].artPromedio > 1200) {
          html += `<div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger); padding: 15px; margin-top: 15px;">
                    <strong>\u26A0\uFE0F Cuello de Botella Detectado:</strong> <strong>${escapeHTML(slowest[0])}</strong> registra un tiempo promedio elevado (${slowest[1].artPromedio.toFixed(2)} min). Se recomienda una intervenci\xF3n para revisar bloqueos operativos o desbalance de cargas.
                </div>`;
        }
      }
    }
    return html;
  }

  // ../src/ui/views/operativo-table-view.js
  var operativo_table_view_exports = {};
  __export(operativo_table_view_exports, {
    buildOperativoArtWidgetHtml: () => buildOperativoArtWidgetHtml,
    buildOperativoRowHtml: () => buildOperativoRowHtml
  });
  function buildOperativoRowHtml(d) {
    const gestor = d.gestor;
    const badgeAprobados = `<span style="background: rgba(16, 185, 129, 0.15); color: var(--success); padding: 4px 10px; border-radius: 20px; font-weight: 700;">${d.Retiros_Aprobados}</span>`;
    const badgeRechazados = `<span style="background: rgba(239, 68, 68, 0.15); color: var(--danger); padding: 4px 10px; border-radius: 20px; font-weight: 700;">${d.Retiros_Rechazados}</span>`;
    return `
            <td style="padding: 16px 20px; font-weight: 600; color: var(--text-primary);">${escapeHTML(gestor)}</td>
            <td style="padding: 16px 20px;">${badgeAprobados}</td>
            <td style="padding: 16px 20px;">${badgeRechazados}</td>
            <td style="padding: 16px 20px; font-weight: 600; color: var(--text-secondary);">${d.Retiros_Procesados}</td>
            <td style="padding: 16px 20px; font-weight: 600; color: var(--text-secondary);">${d.Porcentaje_Rechazos}%</td>
            <td style="padding: 16px 20px; font-weight: 600; color: var(--text-secondary);">${d.Tasa_Aprobacion_Dia}</td>
        `;
  }
  function buildOperativoArtWidgetHtml(avgArt) {
    return `${escapeHTML(String(avgArt))}<span style="font-size: 16px; font-weight: 600; margin-left: 4px;">min</span>`;
  }

  // ../src/ui/charts/operativo-chart-configs.js
  var operativo_chart_configs_exports = {};
  __export(operativo_chart_configs_exports, {
    CHART_COLORS: () => CHART_COLORS,
    buildAprobacionesDiaConfig: () => buildAprobacionesDiaConfig,
    buildBarChartConfig: () => buildBarChartConfig,
    buildCombinedChartConfig: () => buildCombinedChartConfig,
    buildCombinedChartDailyConfig: () => buildCombinedChartDailyConfig,
    buildCombinedDailySeries: () => buildCombinedDailySeries,
    buildPunctualDatesChartConfig: () => buildPunctualDatesChartConfig,
    buildScatterMatrizConfig: () => buildScatterMatrizConfig,
    buildScatterPoint: () => buildScatterPoint,
    formatBarValue: () => formatBarValue,
    formatCombinedValue: () => formatCombinedValue,
    formatDailyValue: () => formatDailyValue,
    rechazosColor: () => rechazosColor
  });
  var CHART_COLORS = Object.freeze({
    green70: "rgba(103, 194, 58, 0.7)",
    green100: "rgba(103, 194, 58, 1)",
    red70: "rgba(245, 108, 108, 0.7)",
    red85: "rgba(245, 108, 108, 0.85)",
    red100: "rgba(245, 108, 108, 1)",
    amber70: "rgba(230, 162, 60, 0.7)",
    transparent: "rgba(0,0,0,0)"
  });
  function plugins(datalabelsPlugin) {
    return [datalabelsPlugin === void 0 || datalabelsPlugin === null ? {} : datalabelsPlugin];
  }
  function formatNumberEsCO(value) {
    const num = Number(value);
    const isInt = Number.isInteger(num);
    return num.toLocaleString("es-CO", {
      minimumFractionDigits: isInt ? 0 : 2,
      maximumFractionDigits: isInt ? 0 : 2
    });
  }
  function formatBarValue(value) {
    if (value === 0 || value === "0") return "0 min";
    return formatNumberEsCO(value);
  }
  function formatCombinedValue(value) {
    if (value === 0 || value === "0") return "";
    return formatNumberEsCO(value);
  }
  function formatDailyValue(value) {
    if (value === 0 || value === "0") return "";
    return Number(value).toLocaleString("es-CO");
  }
  function buildBarChartConfig({ type, labels, dataArr, labelStr, bgColor, borderColor, extraOptions = {}, datalabelsPlugin }) {
    const isHorizontal = extraOptions.indexAxis === "y";
    const datalabelsConfig = {
      formatter: formatBarValue,
      anchor: "end",
      align: isHorizontal ? "right" : "top",
      color: "#666",
      font: { size: 10, weight: "bold" }
    };
    const extra = { ...extraOptions, plugins: { ...extraOptions.plugins || {} } };
    if (!extra.plugins.datalabels) extra.plugins.datalabels = datalabelsConfig;
    return {
      type,
      plugins: plugins(datalabelsPlugin),
      data: {
        labels,
        datasets: [{
          label: labelStr,
          data: dataArr,
          backgroundColor: bgColor,
          borderColor,
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
        ...extra
      }
    };
  }
  function buildPunctualDatesChartConfig({ dates, datalabelsPlugin }) {
    const datalabelsConfig = {
      formatter: function() {
        return "\u2713 0 min";
      },
      anchor: "center",
      align: "center",
      color: "#ffffff",
      font: { size: 10, weight: "bold" }
    };
    return {
      type: "bar",
      plugins: plugins(datalabelsPlugin),
      data: {
        labels: dates,
        datasets: [{
          label: "Conexi\xF3n a Tiempo",
          data: dates.map(() => 100),
          backgroundColor: "rgba(103, 194, 58, 0.8)",
          borderColor: "rgba(103, 194, 58, 1)",
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
                return `${ctx.label}: Conexi\xF3n a Tiempo (0 min tarde)`;
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
              callback: function(v) {
                return v === 100 ? "A tiempo" : "";
              }
            }
          }
        }
      }
    };
  }
  function stackedComboOptions(datalabelsConfig) {
    return {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 30 } },
      plugins: {
        datalabels: datalabelsConfig,
        tooltip: { mode: "index", intersect: false }
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, position: "left", grace: "10%" },
        y1: { position: "right", grid: { drawOnChartArea: false }, grace: "15%" }
      }
    };
  }
  function comboDatasets(aprobados, rechazados, tasaLabel, tasaData) {
    return [
      {
        label: "Aprobados",
        data: aprobados,
        backgroundColor: "rgba(103, 194, 58, 0.7)",
        datalabels: { align: "center", anchor: "center", color: "#fff", textStrokeColor: "rgba(0,0,0,0.5)", textStrokeWidth: 3 }
      },
      {
        label: "Rechazados",
        data: rechazados,
        backgroundColor: "rgba(245, 108, 108, 0.7)",
        datalabels: { align: "center", anchor: "center", color: "#fff", textStrokeColor: "rgba(0,0,0,0.6)", textStrokeWidth: 3 }
      },
      {
        label: tasaLabel,
        data: tasaData,
        type: "line",
        borderColor: "rgba(64, 158, 255, 1)",
        backgroundColor: "rgba(64, 158, 255, 1)",
        yAxisID: "y1",
        datalabels: { align: "top", anchor: "end", color: "#fff", textStrokeColor: "rgba(64, 158, 255, 1)", textStrokeWidth: 3 }
      }
    ];
  }
  function buildCombinedChartConfig({ labels, data, datalabelsPlugin }) {
    const datalabelsConfig = {
      formatter: formatCombinedValue,
      anchor: "end",
      align: "top",
      color: "#666",
      font: { size: 11, weight: "bold" }
    };
    return {
      type: "bar",
      plugins: plugins(datalabelsPlugin),
      data: {
        labels,
        datasets: comboDatasets(
          labels.map((g) => data[g].Retiros_Aprobados),
          labels.map((g) => data[g].Retiros_Rechazados),
          "Tasa Aprobaci\xF3n / D\xEDa",
          labels.map((g) => data[g].Tasa_Aprobacion_Dia)
        )
      },
      options: stackedComboOptions(datalabelsConfig)
    };
  }
  function buildCombinedDailySeries(sortedDates, rawData, gestor) {
    return {
      aprobadosData: sortedDates.map((d) => {
        var _a, _b;
        return ((_b = (_a = rawData[gestor]) == null ? void 0 : _a[d]) == null ? void 0 : _b.Retiros_Aprobados) || 0;
      }),
      rechazadosData: sortedDates.map((d) => {
        var _a, _b;
        return ((_b = (_a = rawData[gestor]) == null ? void 0 : _a[d]) == null ? void 0 : _b.Retiros_Rechazados) || 0;
      }),
      tasaData: sortedDates.map((d) => {
        var _a, _b;
        return ((_b = (_a = rawData[gestor]) == null ? void 0 : _a[d]) == null ? void 0 : _b.Retiros_Aprobados) || 0;
      })
    };
  }
  function buildCombinedChartDailyConfig({ sortedDates, rawData, selectedGestor, datalabelsPlugin }) {
    const { aprobadosData, rechazadosData, tasaData } = buildCombinedDailySeries(sortedDates, rawData, selectedGestor);
    const datalabelsConfig = {
      formatter: formatDailyValue,
      anchor: "end",
      align: "top",
      color: "#666",
      font: { size: 11, weight: "bold" }
    };
    return {
      type: "bar",
      plugins: plugins(datalabelsPlugin),
      data: {
        labels: sortedDates,
        datasets: comboDatasets(aprobadosData, rechazadosData, "Aprobaciones del D\xEDa", tasaData)
      },
      options: stackedComboOptions(datalabelsConfig)
    };
  }
  function rechazosColor(v) {
    return v > 5 ? "rgba(245, 108, 108, 0.8)" : v > 2 ? "rgba(230, 162, 60, 0.8)" : "rgba(103, 194, 58, 0.8)";
  }
  function buildScatterPoint(gestores, data) {
    const gestor = gestores[0];
    const gData = data[gestor];
    const rawTasa = gData ? typeof gData.Tasa_Aprobacion_Dia === "string" ? parseFloat(gData.Tasa_Aprobacion_Dia.replace("%", "")) : gData.Tasa_Aprobacion_Dia || 0 : 0;
    const rawRechazos = gData ? typeof gData.Porcentaje_Rechazos === "string" ? parseFloat(gData.Porcentaje_Rechazos.replace("%", "")) : gData.Porcentaje_Rechazos || 0 : 0;
    const scatterPoint = gData ? [{
      x: isNaN(rawTasa) ? 0 : rawTasa,
      y: isNaN(rawRechazos) ? 0 : rawRechazos,
      name: gestor
    }] : [];
    return { gestor, scatterPoint };
  }
  function buildScatterMatrizConfig({ gestores, data, isGlobal = true, datalabelsPlugin }) {
    if (isGlobal) {
      const sortedGestores = [...gestores].sort((a, b) => (data[b].Porcentaje_Rechazos || 0) - (data[a].Porcentaje_Rechazos || 0));
      const rechazosData = sortedGestores.map((g) => data[g].Porcentaje_Rechazos || 0);
      const colors = rechazosData.map(rechazosColor);
      const datalabelsConfig2 = {
        formatter: function(value) {
          return `${value}%`;
        },
        anchor: "end",
        align: "top",
        color: "#666",
        font: { size: 11, weight: "bold" }
      };
      return {
        type: "bar",
        plugins: plugins(datalabelsPlugin),
        data: {
          labels: sortedGestores,
          datasets: [{
            label: "Porcentaje de Rechazos (%)",
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
            datalabels: datalabelsConfig2,
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  return `% Rechazos: ${ctx.raw}%`;
                }
              }
            }
          },
          scales: {
            y: { beginAtZero: true, grace: "15%", title: { display: true, text: "% Rechazos" } }
          }
        }
      };
    }
    const { gestor, scatterPoint } = buildScatterPoint(gestores, data);
    const datalabelsConfig = {
      formatter: function(value) {
        return `${value.name}
(Tasa: ${value.x}/d\xEDa, Rechazos: ${value.y}%)`;
      },
      anchor: "center",
      align: "top",
      color: "#409EFF",
      font: { size: 11, weight: "bold" }
    };
    return {
      type: "scatter",
      plugins: plugins(datalabelsPlugin),
      data: {
        datasets: [{
          label: gestor || "Gestor",
          data: scatterPoint,
          backgroundColor: "rgba(64, 158, 255, 0.9)",
          borderColor: "rgba(64, 158, 255, 1)",
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
                const item = ctx.raw;
                return `${item.name}: Tasa Aprob.= ${item.x}/d\xEDa, % Rechazos= ${item.y}%`;
              }
            }
          }
        },
        scales: {
          x: { beginAtZero: true, title: { display: true, text: "Tasa Aprobaci\xF3n / D\xEDa" }, grace: "25%" },
          y: { beginAtZero: true, title: { display: true, text: "Porcentaje Rechazos (%)" }, grace: "25%" }
        }
      }
    };
  }
  function buildAprobacionesDiaConfig({ sortedDates, dailyData, datalabelsPlugin }) {
    const dailyAprobados = sortedDates.map((date) => dailyData[date].Aprobados);
    const dailyRechazados = sortedDates.map((date) => dailyData[date].Rechazados);
    const datalabelsDaily = {
      formatter: function(value) {
        if (value === 0 || value === "0") return "";
        return value.toLocaleString("es-CO");
      },
      anchor: "end",
      align: "top",
      color: "#666",
      font: { size: 10, weight: "bold" }
    };
    return {
      type: "line",
      plugins: plugins(datalabelsPlugin),
      data: {
        labels: sortedDates,
        datasets: [
          {
            label: "Aprobados",
            data: dailyAprobados,
            borderColor: "rgba(103, 194, 58, 1)",
            backgroundColor: "rgba(103, 194, 58, 0.2)",
            fill: true,
            tension: 0.3,
            datalabels: { align: "top", anchor: "end", color: "#fff", textStrokeColor: "rgba(103, 194, 58, 1)", textStrokeWidth: 3 }
          },
          {
            label: "Rechazados",
            data: dailyRechazados,
            borderColor: "rgba(245, 108, 108, 1)",
            backgroundColor: "rgba(245, 108, 108, 0.2)",
            fill: true,
            tension: 0.3,
            datalabels: { align: "top", anchor: "end", color: "#fff", textStrokeColor: "rgba(245, 108, 108, 1)", textStrokeWidth: 3 }
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
          tooltip: { mode: "index", intersect: false }
        },
        scales: {
          x: { ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 45, minRotation: 0, font: { size: 10 } } },
          y: { beginAtZero: true, grace: "15%" }
        }
      }
    };
  }

  // ../src/ui/charts/operativo-chart-plan.js
  var operativo_chart_plan_exports = {};
  __export(operativo_chart_plan_exports, {
    buildControlOperativoChartPlan: () => buildControlOperativoChartPlan,
    buildOperativoChartTitles: () => buildOperativoChartTitles,
    findGestorKeyByWords: () => findGestorKeyByWords,
    formatLlegadaTarde: () => formatLlegadaTarde,
    formatSinTardanzas: () => formatSinTardanzas,
    inactividadColor: () => inactividadColor
  });
  function xAutoSkipScales() {
    return { x: { ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 45, minRotation: 0, font: { size: 10 } } } };
  }
  function inactividadColor(v) {
    return v > 45 ? CHART_COLORS.red70 : v > 20 ? CHART_COLORS.amber70 : CHART_COLORS.green70;
  }
  function formatSinTardanzas() {
    return "\u{1F389} \xA1Sin tardanzas!";
  }
  function formatLlegadaTarde(val) {
    return val > 0 ? `+${val}m` : "";
  }
  function findGestorKeyByWords(name, keys) {
    let real = keys.find((k) => k === name);
    if (!real) {
      const parts = normalizeForMatch(name).split(" ");
      real = keys.find((k) => {
        const normK = normalizeForMatch(k);
        return parts.every((p) => normK.includes(p));
      });
    }
    return real;
  }
  function buildOperativoChartTitles(isGlobal, selectedGestor) {
    if (isGlobal) {
      return {
        peores: `<i class='bx bx-alarm-exclamation'></i> Top Alerta Tardanzas (Peores 5)`,
        mejores: `<i class='bx bx-medal'></i> Top Excelencia Puntualidad (Mejores 5)`,
        inactividad: `<i class='bx bx-coffee-togo'></i> Promedio Inactividad Diaria (Min)`,
        eficiencia: `<i class='bx bx-layer'></i> Eficiencia y Volumen de Retiros`,
        matriz: `<i class='bx bx-bar-chart-alt-2'></i> Ranking de Porcentaje de Rechazos`
      };
    }
    return {
      peores: `<i class='bx bx-alarm-exclamation'></i> Fechas con Llegada Tarde - ${escapeHTML(selectedGestor)}`,
      mejores: `<i class='bx bx-check-double'></i> Fechas de Conexi\xF3n a Tiempo - ${escapeHTML(selectedGestor)}`,
      inactividad: `<i class='bx bx-coffee-togo'></i> Inactividad Diaria por Fecha - ${escapeHTML(selectedGestor)}`,
      eficiencia: `<i class='bx bx-layer'></i> Evoluci\xF3n Diaria de Retiros - ${escapeHTML(selectedGestor)}`,
      matriz: `<i class='bx bx-target-lock'></i> % Rechazos: ${escapeHTML(selectedGestor)}`
    };
  }
  function buildControlOperativoChartPlan({ data, dailyData, selectedGestor, selectedGestoresList, rawData }) {
    const isGlobal = selectedGestor === "Todos" || selectedGestor.includes("Gestores");
    let realSelectedGestor = null;
    if (!isGlobal && selectedGestor) {
      const rawKeys = Object.keys(rawData || {});
      realSelectedGestor = findGestorKeyByWords(selectedGestor, rawKeys);
      if (!realSelectedGestor) realSelectedGestor = selectedGestor;
    }
    const titles = buildOperativoChartTitles(isGlobal, selectedGestor);
    let activeData = {};
    if (isGlobal || selectedGestoresList.length === 0) {
      activeData = data;
    } else {
      const rawKeys = Object.keys(data);
      selectedGestoresList.forEach((g) => {
        const realGestor = findGestorKeyByWords(g, rawKeys);
        if (realGestor && data[realGestor]) {
          activeData[realGestor] = data[realGestor];
        } else if (data[g]) {
          activeData[g] = data[g];
        }
      });
    }
    const gestores = Object.keys(activeData);
    const sortedDates = Object.keys(dailyData).sort();
    const sortBy = (key, asc = false) => [...gestores].sort((a, b) => asc ? activeData[a][key] - activeData[b][key] : activeData[b][key] - activeData[a][key]);
    const charts = [];
    if (isGlobal) {
      let peoresTardanzas = sortBy("Prom_Minutos_Tarde").filter((g) => activeData[g].Prom_Minutos_Tarde > 0).slice(0, 5);
      let peoresColors, peoresBorders, peoresData;
      if (peoresTardanzas.length === 0) {
        peoresTardanzas = ["Equipo 100% Puntual"];
        peoresData = [0];
        peoresColors = [CHART_COLORS.green70];
        peoresBorders = [CHART_COLORS.green100];
      } else {
        peoresData = peoresTardanzas.map((g) => activeData[g].Prom_Minutos_Tarde);
        peoresColors = peoresTardanzas.map(() => CHART_COLORS.red70);
        peoresBorders = peoresTardanzas.map(() => CHART_COLORS.red100);
      }
      charts.push({ kind: "bar", id: "chartTardanzasPeores", type: "bar", labels: peoresTardanzas, dataArr: peoresData, labelStr: "Minutos Tarde (Promedio)", bgColor: peoresColors, borderColor: peoresBorders, extraOptions: { indexAxis: "y" } });
      const mejoresTardanzas = sortBy("Prom_Minutos_Tarde", true).slice(0, 5).reverse();
      const mejoresColors = mejoresTardanzas.map(() => CHART_COLORS.green70);
      const mejoresBorders = mejoresTardanzas.map(() => CHART_COLORS.green100);
      charts.push({ kind: "bar", id: "chartTardanzasMejores", type: "bar", labels: mejoresTardanzas, dataArr: mejoresTardanzas.map((g) => activeData[g].Prom_Minutos_Tarde), labelStr: "Minutos Tarde (Promedio)", bgColor: mejoresColors, borderColor: mejoresBorders, extraOptions: { indexAxis: "y" } });
      const inactividadTop = sortBy("Prom_Inactividad_Diaria").slice(0, 10);
      const bgColors = inactividadTop.map((g) => inactividadColor(activeData[g].Prom_Inactividad_Diaria));
      charts.push({ kind: "bar", id: "chartInactividad", type: "bar", labels: inactividadTop, dataArr: inactividadTop.map((g) => activeData[g].Prom_Inactividad_Diaria), labelStr: "Minutos Inactividad", bgColor: bgColors, borderColor: bgColors, extraOptions: {} });
    } else {
      if (!realSelectedGestor) realSelectedGestor = selectedGestor;
      const dailyLateMins = sortedDates.map((date) => {
        var _a;
        const raw = (_a = rawData[realSelectedGestor]) == null ? void 0 : _a[date];
        return raw && (raw.Minutos_Tarde_Total || 0) > 0 ? raw.Minutos_Tarde_Total : 0;
      });
      const hasLate = dailyLateMins.some((v) => v > 0);
      if (!hasLate) {
        charts.push({
          kind: "bar",
          id: "chartTardanzasPeores",
          type: "bar",
          labels: ["Sin Llegadas Tardes en el Periodo"],
          dataArr: [0],
          labelStr: "Minutos Tarde",
          bgColor: [CHART_COLORS.green70],
          borderColor: [CHART_COLORS.green100],
          extraOptions: {
            maxBarThickness: 36,
            plugins: {
              datalabels: {
                formatter: formatSinTardanzas,
                anchor: "center",
                align: "center",
                color: "var(--success)",
                font: { size: 12, weight: "bold" }
              }
            }
          }
        });
      } else {
        const lateColors = dailyLateMins.map((v) => v > 0 ? CHART_COLORS.red85 : CHART_COLORS.transparent);
        charts.push({
          kind: "bar",
          id: "chartTardanzasPeores",
          type: "bar",
          labels: sortedDates,
          dataArr: dailyLateMins,
          labelStr: "Minutos Tarde",
          bgColor: lateColors,
          borderColor: lateColors,
          extraOptions: {
            maxBarThickness: 36,
            plugins: {
              datalabels: {
                formatter: formatLlegadaTarde,
                anchor: "end",
                align: "top",
                color: "var(--danger)",
                font: { size: 10, weight: "bold" }
              }
            },
            scales: {
              x: { ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 45, minRotation: 0, font: { size: 10 } } },
              y: { beginAtZero: true, grace: "20%" }
            }
          }
        });
      }
      const punctualDates = [];
      sortedDates.forEach((date) => {
        var _a;
        const raw = (_a = rawData[realSelectedGestor]) == null ? void 0 : _a[date];
        if (raw && raw.Dias_Laborados > 0 && (raw.Minutos_Tarde_Total || 0) === 0) {
          punctualDates.push(date);
        }
      });
      if (punctualDates.length === 0) {
        charts.push({ kind: "bar", id: "chartTardanzasMejores", type: "bar", labels: ["Sin Conexiones a Tiempo en el Periodo"], dataArr: [0], labelStr: "Conexi\xF3n a Tiempo", bgColor: [CHART_COLORS.red70], borderColor: [CHART_COLORS.red100], extraOptions: { maxBarThickness: 36 } });
      } else {
        const punctualData = punctualDates.map(() => 0);
        const punctualColors = punctualDates.map(() => "rgba(103, 194, 58, 0.8)");
        charts.push({ kind: "punctual", id: "chartTardanzasMejores", dates: punctualDates, dataArr: punctualData, bgColors: punctualColors });
      }
      const dailyInactivityValues = sortedDates.map((date) => {
        var _a, _b;
        return ((_b = (_a = rawData[realSelectedGestor]) == null ? void 0 : _a[date]) == null ? void 0 : _b.Minutos_Inactividad_Total) || 0;
      });
      const dailyBgColors = dailyInactivityValues.map(inactividadColor);
      charts.push({ kind: "bar", id: "chartInactividad", type: "bar", labels: sortedDates, dataArr: dailyInactivityValues, labelStr: `Inactividad (Min)`, bgColor: dailyBgColors, borderColor: dailyBgColors, extraOptions: { maxBarThickness: 36, scales: xAutoSkipScales() } });
    }
    charts.push({ kind: "aprobacionesDia", id: "chartAprobacionesDia", sortedDates, dailyData });
    if (isGlobal) {
      const volTop = sortBy("Retiros_Procesados");
      charts.push({ kind: "combined", id: "chartEficiencia", labels: volTop, data: activeData });
    } else {
      charts.push({ kind: "combinedDaily", id: "chartEficiencia", sortedDates, selectedGestor: realSelectedGestor, rawData });
    }
    charts.push({ kind: "scatter", id: "chartMatrizFuga", gestores, data: activeData, isGlobal });
    return { isGlobal, realSelectedGestor, titles, gestores, sortedDates, activeData, charts };
  }

  // ../src/controllers/kpi-controller.js
  var kpi_controller_exports = {};
  __export(kpi_controller_exports, {
    createKpiController: () => createKpiController
  });
  var MULTISELECT_ID = "operativoGestorMultiSelect";
  function createKpiController(deps) {
    if (Object.prototype.hasOwnProperty.call(deps, "excludedNames")) {
      throw new TypeError("createKpiController: excludedNames (SUPERVISORES_NOMBRES) ya no se admite (decisi\xF3n D9b): el directorio de supervisores se deriva de users; para pruebas diferenciales use legacyExcludedNames.");
    }
    const {
      getEl,
      querySelector,
      createElement,
      state,
      chartRegistry,
      ChartClass,
      datalabelsPlugin,
      fetchKpiData,
      database,
      getSelectedGestores,
      setSelectedGestores,
      setupMultiSelect,
      recalcularIndicadores,
      legacyExcludedNames,
      corregirBugs = true,
      fechaLocal = true,
      timeZone,
      now = () => /* @__PURE__ */ new Date(),
      alert: notify = () => {
      },
      print = () => {
      },
      setTimeout: delay = (fn) => fn(),
      scrollToTop = () => {
      },
      logger = console
    } = deps;
    let supervisorDirectory = assertSupervisorDirectory(deps.supervisorDirectory, "createKpiController");
    function rememberUsers(users) {
      if (users && !deps.supervisorDirectory) supervisorDirectory = buildSupervisorDirectory(users);
    }
    function exclusionOptions() {
      return legacyExcludedNames ? { legacyExcludedNames } : { supervisorDirectory };
    }
    function destroyChart(id) {
      if (chartRegistry[id]) {
        chartRegistry[id].destroy();
        delete chartRegistry[id];
      }
    }
    function createChart(id, buildConfig) {
      const ctxEl = getEl(id).getContext("2d");
      chartRegistry[id] = new ChartClass(ctxEl, buildConfig());
    }
    function drawChart(id, type, labels, dataArr, labelStr, bgColor, borderColor, extraOptions = {}) {
      destroyChart(id);
      const ctxEl = getEl(id).getContext("2d");
      chartRegistry[id] = new ChartClass(ctxEl, buildBarChartConfig({ type, labels, dataArr, labelStr, bgColor, borderColor, extraOptions, datalabelsPlugin }));
    }
    function drawPunctualDatesChart(id, dates) {
      destroyChart(id);
      createChart(id, () => buildPunctualDatesChartConfig({ dates, datalabelsPlugin }));
    }
    function drawCombinedChart(id, labels, data) {
      destroyChart(id);
      createChart(id, () => buildCombinedChartConfig({ labels, data, datalabelsPlugin }));
    }
    function drawCombinedChartDaily(id, sortedDates, selectedGestor) {
      destroyChart(id);
      createChart(id, () => buildCombinedChartDailyConfig({ sortedDates, rawData: state.controlOperativoRawData, selectedGestor, datalabelsPlugin }));
    }
    function drawScatterMatriz(id, gestores, data, isGlobal = true) {
      destroyChart(id);
      createChart(id, () => buildScatterMatrizConfig({ gestores, data, isGlobal, datalabelsPlugin }));
    }
    function executeChartPlan(plan) {
      plan.charts.forEach((job) => {
        switch (job.kind) {
          case "bar":
            drawChart(job.id, job.type, job.labels, job.dataArr, job.labelStr, job.bgColor, job.borderColor, job.extraOptions);
            break;
          case "punctual":
            drawPunctualDatesChart(job.id, job.dates);
            break;
          case "aprobacionesDia":
            destroyChart(job.id);
            createChart(job.id, () => buildAprobacionesDiaConfig({ sortedDates: job.sortedDates, dailyData: job.dailyData, datalabelsPlugin }));
            break;
          case "combined":
            drawCombinedChart(job.id, job.labels, job.data);
            break;
          case "combinedDaily":
            drawCombinedChartDaily(job.id, job.sortedDates, job.selectedGestor);
            break;
          case "scatter":
            drawScatterMatriz(job.id, job.gestores, job.data, job.isGlobal);
            break;
          default:
            throw new Error("Tipo de gr\xE1fica desconocido: " + job.kind);
        }
      });
    }
    const TITLE_ELEMENT_IDS = Object.freeze({
      peores: "titleTardanzasPeores",
      mejores: "titleTardanzasMejores",
      inactividad: "titleInactividad",
      eficiencia: "titleEficiencia",
      matriz: "titleMatrizFuga"
    });
    function renderControlOperativoCharts(data, dailyData, selectedGestor) {
      const plan = buildControlOperativoChartPlan({
        data,
        dailyData,
        selectedGestor,
        selectedGestoresList: getSelectedGestores(MULTISELECT_ID),
        rawData: state.controlOperativoRawData
      });
      Object.keys(TITLE_ELEMENT_IDS).forEach((key) => {
        const el = getEl(TITLE_ELEMENT_IDS[key]);
        if (el) el.innerHTML = plan.titles[key];
      });
      executeChartPlan(plan);
    }
    function toggleOperativoCustomDates() {
      const val = getEl("filtroFechaOperativo").value;
      getEl("operativoCustomDateContainer").style.display = val === "custom" ? "flex" : "none";
    }
    function renderControlOperativoFiltered() {
      if (!state.controlOperativoRawData) return;
      const selectedGestores = getSelectedGestores(MULTISELECT_ID);
      const selectedFecha = getEl("filtroFechaOperativo").value;
      const customStartEl = getEl("operativoDateStart");
      const customEndEl = getEl("operativoDateEnd");
      const { aggregatedData, aggregatedDataGlobal, dailyData } = aggregateOperativoData(state.controlOperativoRawData, {
        selectedGestores,
        selectedFecha,
        customStart: customStartEl ? customStartEl.value : void 0,
        customEnd: customEndEl ? customEndEl.value : void 0,
        now: now()
      });
      const tbody = querySelector("#tablaResumenOperativo tbody");
      tbody.innerHTML = "";
      const summary = summarizeOperativoRows(aggregatedData);
      for (const d of summary.rows) {
        const gestor = d.gestor;
        const tr = createElement("tr");
        tr.style.borderBottom = "1px solid rgba(0,0,0,0.05)";
        tr.style.transition = "background 0.2s ease, transform 0.1s ease";
        tr.style.cursor = "pointer";
        tr.title = "Haz clic para filtrar o quitar filtro de este gestor";
        tr.onmouseover = () => tr.style.background = "var(--bg-secondary, #f8f9fa)";
        tr.onmouseout = () => tr.style.background = "transparent";
        tr.onclick = () => {
          const currentSelected = getSelectedGestores(MULTISELECT_ID);
          if (currentSelected.length === 1 && currentSelected[0] === gestor) {
            setSelectedGestores(MULTISELECT_ID, []);
          } else {
            setSelectedGestores(MULTISELECT_ID, [gestor]);
          }
          renderControlOperativoFiltered();
          scrollToTop();
        };
        tr.innerHTML = buildOperativoRowHtml(d);
        tbody.appendChild(tr);
      }
      const wTotal = getEl("operativoWidgetTotal");
      const wAprob = getEl("operativoWidgetAprobados");
      const wRech = getEl("operativoWidgetRechazados");
      const wArt = getEl("operativoWidgetART");
      if (wTotal) wTotal.textContent = summary.globalProcesados;
      if (wAprob) wAprob.textContent = summary.globalAprobados;
      if (wRech) wRech.textContent = summary.globalRechazados;
      if (wArt) wArt.innerHTML = buildOperativoArtWidgetHtml(summary.avgArt);
      const globalForCharts = legacyExcludedNames ? selectGlobalForCharts(aggregatedDataGlobal, null, { legacyExcludedNames }) : selectGlobalForCharts(aggregatedDataGlobal, supervisorDirectory);
      renderControlOperativoCharts(globalForCharts, dailyData, resolveSelectedGestorLabel(selectedGestores));
      if (recalcularIndicadores) recalcularIndicadores();
    }
    function loadRetirosData2() {
      return loadRetirosData({ fetchData: fetchKpiData, target: state, logger });
    }
    async function loadControlOperativoData() {
      try {
        const data = await fetchKpiData();
        state.controlOperativoRawData = data;
        try {
          if (database) {
            const needsUsersMap = !state.kpiUsersData || Object.keys(state.kpiUsersData).length === 0;
            const needsDirectory = !legacyExcludedNames && !supervisorDirectory;
            if (needsUsersMap || needsDirectory) {
              const users = await readUsers(database);
              rememberUsers(users);
              if (users && needsUsersMap) {
                state.kpiUsersData = buildKpiUsersMap(users);
              }
            }
            const shifts = await readShiftReports(database);
            if (shifts) {
              mergeShiftReportsIntoOperativoData(state.controlOperativoRawData, shifts, { nowMs: now().getTime(), fechaLocal, timeZone });
            }
          }
        } catch (fbErr) {
          logger.error("Error fetching shift_reports for inactivity:", fbErr);
        }
        const gestores = Object.keys(state.controlOperativoRawData).sort();
        setupMultiSelect(MULTISELECT_ID, gestores, () => {
          renderControlOperativoFiltered();
        });
        renderControlOperativoFiltered();
      } catch (error) {
        logger.error("Error loading Control Operativo:", error);
        notify("Error cargando datos operativos. Detalle: " + error.message);
      }
    }
    function loadGestoresForKPIs() {
      const selectEl = getEl("kpiGestorSelect");
      if (!selectEl) return Promise.resolve();
      if (selectEl.options.length > 2) {
        return Promise.resolve();
      }
      selectEl.innerHTML = '<option value="todos" selected>Todos los gestores</option><option value="">Selecciona un gestor...</option>';
      return readUsers(database).then((users) => {
        if (users) {
          const { usersByEmail, gestorNames } = selectKpiGestores(users);
          rememberUsers(users);
          state.kpiUsersData = usersByEmail;
          gestorNames.forEach((name) => {
            const opt = createElement("option");
            opt.value = name;
            opt.textContent = name;
            selectEl.appendChild(opt);
          });
          if (recalcularIndicadores) recalcularIndicadores();
        }
      }).catch((err) => logger.error("Error populating KPI gestores dropdown:", err));
    }
    function openKpiTaskDetails(tipo) {
      const modal = getEl("kpiTaskDetailsModal");
      const title = getEl("kpiModalTitle");
      const icon = getEl("kpiModalIcon");
      const list = getEl("kpiModalTaskList");
      if (!state.kpiTaskLists) return;
      const tasks = state.kpiTaskLists[tipo] || [];
      const header = getKpiTaskDetailsHeader(tipo);
      if (header) {
        title.textContent = header.title;
        icon.className = header.iconClass;
        icon.style.color = header.iconColor;
      }
      list.innerHTML = buildKpiTaskListHtml(tasks);
      modal.classList.add("active");
    }
    function closeKpiTaskDetails() {
      getEl("kpiTaskDetailsModal").classList.remove("active");
    }
    function generarAnalisisTextual() {
      if (!state.controlOperativoRawData) {
        notify("A\xFAn no se han cargado los datos. Por favor, espera un momento o haz clic en Actualizar Datos.");
        return;
      }
      const selectedGestores = getSelectedGestores(MULTISELECT_ID);
      const filtroGestor = resolveFiltroGestor(selectedGestores);
      const filtroFecha = getEl("filtroFechaOperativo").value;
      const isCustom = filtroFecha === "custom";
      const analysis = computeAnalysisStats(state.controlOperativoRawData, {
        ...exclusionOptions(),
        selectedGestores,
        filtroFecha,
        dateStart: isCustom ? getEl("operativoDateStart").value : null,
        dateEnd: isCustom ? getEl("operativoDateEnd").value : null,
        now: now(),
        corregirBugs
      });
      const html = buildAnalysisHtml(analysis, filtroGestor, { corregirBugs });
      getEl("analysisModalBody").innerHTML = html;
      getEl("analysisModal").classList.add("active");
    }
    function generarReporteEjecutivoPDF() {
      const gestorText = buildReportGestorText(getSelectedGestores(MULTISELECT_ID));
      const periodoSelect = getEl("filtroFechaOperativo");
      const periodoText = buildReportPeriodoText({
        selectedOptionText: periodoSelect.options[periodoSelect.selectedIndex].text,
        value: periodoSelect.value,
        customStart: periodoSelect.value === "custom" ? getEl("operativoDateStart").value : void 0,
        customEnd: periodoSelect.value === "custom" ? getEl("operativoDateEnd").value : void 0
      });
      getEl("printReportMeta").innerText = buildReportMetaText({ generatedAtText: now().toLocaleString(), gestorText, periodoText });
      getEl("printAnalysisText").innerHTML = getEl("analysisModalBody").innerHTML;
      planReportCharts(chartRegistry, (imgId) => !!getEl(imgId)).forEach((item) => {
        const chartObj = chartRegistry[item.chartKey];
        const imgEl = getEl(item.imgId);
        if (item.action === "capture") {
          try {
            imgEl.src = chartObj.toBase64Image();
            imgEl.style.display = "block";
            if (imgEl.previousElementSibling) {
              imgEl.previousElementSibling.innerText = item.title;
              imgEl.previousElementSibling.style.display = "block";
            }
            imgEl.parentElement.style.display = "block";
          } catch (e) {
            logger.error("Error capturando chart:", item.title, e);
          }
        } else if (item.action === "hide") {
          imgEl.style.display = "none";
          if (imgEl.previousElementSibling) imgEl.previousElementSibling.style.display = "none";
          imgEl.parentElement.style.display = "none";
        }
      });
      const printTableContainer = getEl("printTableContainer");
      if (printTableContainer) {
        const tableDiv = getEl("tablaResumenOperativo").parentElement;
        printTableContainer.innerHTML = buildReportTableHtml(tableDiv.outerHTML);
        printTableContainer.style.display = "block";
      }
      delay(() => {
        print();
      }, PRINT_DELAY_MS);
    }
    return {
      /** Directorio de supervisores vigente (D9b) o null si aún no se leyó `users`. */
      getSupervisorDirectory: () => supervisorDirectory,
      destroyChart,
      drawChart,
      drawPunctualDatesChart,
      drawCombinedChart,
      drawCombinedChartDaily,
      drawScatterMatriz,
      renderControlOperativoCharts,
      toggleOperativoCustomDates,
      renderControlOperativoFiltered,
      loadRetirosData: loadRetirosData2,
      loadControlOperativoData,
      loadGestoresForKPIs,
      openKpiTaskDetails,
      closeKpiTaskDetails,
      generarAnalisisTextual,
      generarReporteEjecutivoPDF
    };
  }

  // ../src/domain/announcements/announcement-service.js
  var announcement_service_exports = {};
  __export(announcement_service_exports, {
    ALL_READ_HTML: () => ALL_READ_HTML,
    ANNOUNCEMENT_MESSAGES: () => ANNOUNCEMENT_MESSAGES,
    EMPTY_ADMIN_TABLE_HTML: () => EMPTY_ADMIN_TABLE_HTML,
    EMPTY_GESTOR_LIST_HTML: () => EMPTY_GESTOR_LIST_HTML,
    EMPTY_READERS_HTML: () => EMPTY_READERS_HTML,
    LOADING_USERS_HTML: () => LOADING_USERS_HTML,
    READ_FAILURE_KINDS: () => READ_FAILURE_KINDS,
    UNKNOWN_UID: () => UNKNOWN_UID,
    URGENT_ANNOUNCEMENT_ROLE_POLICY: () => URGENT_ANNOUNCEMENT_ROLE_POLICY,
    URGENT_MODAL_MANDATORY: () => URGENT_MODAL_MANDATORY,
    USERS_ERROR_HTML: () => USERS_ERROR_HTML,
    applyAssumedReads: () => applyAssumedReads,
    buildAdminComunicadosRowsHtml: () => buildAdminComunicadosRowsHtml,
    buildAnnouncementPayload: () => buildAnnouncementPayload,
    buildAnnouncementView: () => buildAnnouncementView,
    buildGestorComunicadosHtml: () => buildGestorComunicadosHtml,
    buildReadReceipt: () => buildReadReceipt,
    buildReadersListHtml: () => buildReadersListHtml,
    buildUnreadersListHtml: () => buildUnreadersListHtml,
    canDeleteComunicados: () => canDeleteComunicados,
    canManageComunicados: () => canManageComunicados,
    canPublishComunicados: () => canPublishComunicados,
    canViewComunicadoLecturas: () => canViewComunicadoLecturas,
    classifyReadWriteError: () => classifyReadWriteError,
    computeUnreadBadge: () => computeUnreadBadge,
    countUnreadAnnouncements: () => countUnreadAnnouncements,
    findNextUnreadUrgent: () => findNextUnreadUrgent,
    formatAnnouncementDate: () => formatAnnouncementDate,
    isAnnouncementRead: () => isAnnouncementRead,
    isPendingReaderCandidate: () => isPendingReaderCandidate,
    parseNewAnnouncementForm: () => parseNewAnnouncementForm,
    requiresUrgentConfirmation: () => requiresUrgentConfirmation,
    resolveAnnouncementAuthor: () => resolveAnnouncementAuthor,
    resolveReaderUid: () => resolveReaderUid,
    resolveUrgentAnnouncementPolicy: () => resolveUrgentAnnouncementPolicy,
    sortAnnouncementKeys: () => sortAnnouncementKeys
  });
  var UNKNOWN_UID = "unknown";
  var DEFAULT_HELPERS = Object.freeze({ escapeHTML, encodeInlineHandlerArg, sanitizeAnnouncementHTML });
  function resolveHelpers(helpers) {
    return helpers ? { ...DEFAULT_HELPERS, ...helpers } : DEFAULT_HELPERS;
  }
  var EMPTY_GESTOR_LIST_HTML = '<div class="glass-panel" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay comunicados activos.</div>';
  var EMPTY_ADMIN_TABLE_HTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay comunicados creados.</td></tr>';
  var EMPTY_READERS_HTML = '<li style="color: var(--text-secondary); margin-bottom: 5px;">Nadie ha le\xEDdo esto a\xFAn.</li>';
  var LOADING_USERS_HTML = '<li style="color: var(--text-secondary);">Cargando usuarios...</li>';
  var USERS_ERROR_HTML = '<li style="color: var(--danger);">Error al cargar usuarios.</li>';
  var ALL_READ_HTML = '<li style="color: var(--success); margin-bottom: 5px; text-align: center; font-weight: 500;"><i class="bx bx-check-double"></i> \xA1Todos han le\xEDdo!</li>';
  var ANNOUNCEMENT_MESSAGES = Object.freeze({
    NOT_ALLOWED_PUBLISH: "No tienes permiso para publicar comunicados.",
    MISSING_FIELDS: "Por favor llena todos los campos.",
    PUBLISHED: "Comunicado publicado exitosamente.",
    PUBLISH_ERROR: "Error al publicar.",
    READ_ERROR: "Error al marcar como le\xEDdo.",
    NOT_ALLOWED_DELETE: "No tienes permiso para eliminar comunicados.",
    DELETE_ERROR: "No se pudo eliminar."
  });
  function formatAnnouncementDate(value) {
    return new Date(value).toLocaleString("es-CO");
  }
  function resolveReaderUid(currentUser, authUser) {
    return currentUser && currentUser.uid ? currentUser.uid : authUser ? authUser.uid : UNKNOWN_UID;
  }
  function sortAnnouncementKeys(announcements, direction = "desc") {
    const map = announcements || {};
    return Object.keys(map).sort((a, b) => direction === "asc" ? new Date(map[a].date) - new Date(map[b].date) : new Date(map[b].date) - new Date(map[a].date));
  }
  function isAnnouncementRead(announcement, uid) {
    return Boolean(announcement.readBy && announcement.readBy[uid]);
  }
  var READ_FAILURE_KINDS = Object.freeze({
    PERMISSION_DENIED: "permission-denied",
    NETWORK: "network",
    OTHER: "other"
  });
  function classifyReadWriteError(error) {
    const code = String(error && error.code || "").toUpperCase().replace(/[\s-]/g, "_");
    const message = String(error && error.message || error || "");
    if (code === "PERMISSION_DENIED" || /permission[_ ]denied/i.test(message)) {
      return READ_FAILURE_KINDS.PERMISSION_DENIED;
    }
    if (["NETWORK_ERROR", "DISCONNECTED", "UNAVAILABLE", "OPERATION_FAILED", "WRITE_CANCELED", "MAX_RETRIES", "DEADLINE_EXCEEDED", "TIMEOUT"].includes(code) || /network|disconnect|offline|unavailable|timed? ?out|failed to fetch/i.test(message)) {
      return READ_FAILURE_KINDS.NETWORK;
    }
    return READ_FAILURE_KINDS.OTHER;
  }
  function applyAssumedReads(announcements, uid, assumedReceipts) {
    const map = announcements || {};
    const assumed = assumedReceipts || {};
    const ids = Object.keys(assumed);
    if (ids.length === 0) return map;
    const out = { ...map };
    ids.forEach((id) => {
      if (out[id]) {
        const readBy = out[id].readBy || {};
        out[id] = { ...out[id], readBy: { ...readBy, [uid]: readBy[uid] ? readBy[uid] : assumed[id] } };
      }
    });
    return out;
  }
  var URGENT_MODAL_MANDATORY = "modal-bloqueante-con-confirmacion";
  var URGENT_ANNOUNCEMENT_ROLE_POLICY = Object.freeze({
    Admin: URGENT_MODAL_MANDATORY,
    Supervisor: URGENT_MODAL_MANDATORY,
    Gestor: URGENT_MODAL_MANDATORY
  });
  function resolveUrgentAnnouncementPolicy(role) {
    return Object.prototype.hasOwnProperty.call(URGENT_ANNOUNCEMENT_ROLE_POLICY, String(role)) ? URGENT_ANNOUNCEMENT_ROLE_POLICY[String(role)] : URGENT_ANNOUNCEMENT_ROLE_POLICY.Gestor;
  }
  function requiresUrgentConfirmation(role) {
    return resolveUrgentAnnouncementPolicy(role) === URGENT_MODAL_MANDATORY;
  }
  function countUnreadAnnouncements(announcements, uid) {
    let unreadCount = 0;
    Object.keys(announcements || {}).forEach((key) => {
      const c = announcements[key];
      if (!c.readBy || !c.readBy[uid]) {
        unreadCount += 1;
      }
    });
    return unreadCount;
  }
  function computeUnreadBadge(currentUser, authUser, announcements) {
    if (!currentUser || currentUser.role === "Admin" || currentUser.role === "Supervisor") {
      return { visible: false, count: 0 };
    }
    const uid = resolveReaderUid(currentUser, authUser);
    const count = countUnreadAnnouncements(announcements, uid);
    return { visible: count > 0, count };
  }
  function findNextUnreadUrgent(announcements, uid) {
    const keys = sortAnnouncementKeys(announcements, "asc");
    for (const key of keys) {
      const c = announcements[key];
      if (!isAnnouncementRead(c, uid)) {
        return { key, announcement: c };
      }
    }
    return null;
  }
  function buildAnnouncementView(c, helpers) {
    const { sanitizeAnnouncementHTML: sanitize } = resolveHelpers(helpers);
    return {
      title: c.title || "",
      author: c.author || "",
      dateText: formatAnnouncementDate(c.date),
      bodyHtml: sanitize(c.content)
    };
  }
  function buildReadReceipt(currentUser, now) {
    return {
      name: currentUser.name,
      readAt: new Date(now).toISOString()
    };
  }
  function parseNewAnnouncementForm(form, helpers) {
    const { sanitizeAnnouncementHTML: sanitize } = resolveHelpers(helpers);
    const title = String(form.title).trim();
    const content = sanitize(form.rawContentHtml).trim();
    return { ok: Boolean(title && content), title, content };
  }
  function resolveAnnouncementAuthor(currentUser) {
    return currentUser.name || currentUser.email || currentUser.role || "Usuario";
  }
  function buildAnnouncementPayload({ title, content, currentUser, authUid, now }) {
    return {
      title,
      content,
      date: new Date(now).toISOString(),
      author: resolveAnnouncementAuthor(currentUser),
      authorUid: authUid
    };
  }
  function buildGestorComunicadosHtml(announcements, uid, helpers) {
    const { escapeHTML: esc, encodeInlineHandlerArg: encode, sanitizeAnnouncementHTML: sanitize } = resolveHelpers(helpers);
    const keys = sortAnnouncementKeys(announcements, "desc");
    if (keys.length === 0) {
      return EMPTY_GESTOR_LIST_HTML;
    }
    let html = "";
    keys.forEach((key) => {
      const c = announcements[key];
      const isRead = c.readBy && c.readBy[uid];
      const formattedDate = new Date(c.date).toLocaleString("es-CO");
      let actionsHtml = "";
      if (isRead) {
        actionsHtml = `<div style="color: var(--success); font-size: 13px; margin-top: 15px; font-weight: 500;"><i class='bx bx-check-double'></i> Le\xEDdo el ${new Date(c.readBy[uid].readAt).toLocaleString("es-CO")}</div>`;
      } else {
        actionsHtml = `<button class="btn btn-primary" style="margin-top: 15px; width: 100%; max-width: 300px; background: var(--success); border-color: var(--success);" onclick="markComunicadoAsRead(decodeURIComponent('${encode(key)}'))"><i class='bx bx-check'></i> Marcar como Le\xEDdo y Entendido</button>`;
      }
      html += `
            <div class="glass-panel" style="padding: 20px; border-left: 4px solid ${isRead ? "var(--glass-border)" : "var(--danger)"};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <h3 style="color: ${isRead ? "var(--text-primary)" : "var(--danger)"}; margin: 0; font-size: 18px;">${esc(c.title)}</h3>
                    <span style="font-size: 11px; color: var(--text-secondary); background: rgba(0,0,0,0.1); padding: 3px 8px; border-radius: 10px;">${formattedDate} por ${esc(c.author)}</span>
                </div>
                <div class="rich-text" style="font-size: 14px; color: var(--text-secondary); margin-top: 10px; line-height: 1.5; overflow-wrap: break-word; white-space: pre-wrap;">${sanitize(c.content)}</div>
                ${actionsHtml}
            </div>
        `;
    });
    return html;
  }
  function buildAdminComunicadosRowsHtml(announcements, showDelete, helpers) {
    const { escapeHTML: esc, encodeInlineHandlerArg: encode } = resolveHelpers(helpers);
    const keys = sortAnnouncementKeys(announcements, "desc");
    if (keys.length === 0) {
      return EMPTY_ADMIN_TABLE_HTML;
    }
    let html = "";
    keys.forEach((key) => {
      const c = announcements[key];
      const formattedDate = new Date(c.date).toLocaleString("es-CO");
      const readCount = c.readBy ? Object.keys(c.readBy).length : 0;
      const deleteBtnHtml = showDelete ? `<button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px; margin-left: 5px;" onclick="deleteComunicado(decodeURIComponent('${encode(key)}'))"><i class='bx bx-trash'></i></button>` : "";
      html += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-size: 13px;">${formattedDate}</td>
                <td style="padding: 12px; font-weight: 500;">
                    <a href="javascript:void(0)" onclick="viewComunicadoContent(decodeURIComponent('${encode(key)}'))" style="color: var(--accent-primary); text-decoration: none; cursor: pointer; transition: color 0.2s;" onmouseover="this.style.textDecoration='underline'; this.style.color='var(--text-primary)'" onmouseout="this.style.textDecoration='none'; this.style.color='var(--accent-primary)'">${esc(c.title)}</a>
                </td>
                <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">${esc(c.author)}</td>
                <td style="padding: 12px; text-align: center;"><span class="badge" style="background: var(--success);">${readCount} lecturas</span></td>
                <td style="padding: 12px; text-align: center;">
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" onclick="viewComunicadoContent(decodeURIComponent('${encode(key)}'))"><i class='bx bx-book-open'></i> Leer</button>
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px; margin-left: 5px;" onclick="viewComunicadoLecturas(decodeURIComponent('${encode(key)}'))"><i class='bx bx-user-check'></i> Lecturas</button>
                    ${deleteBtnHtml}
                </td>
            </tr>
        `;
    });
    return html;
  }
  function buildReadersListHtml(readers, helpers) {
    const { escapeHTML: esc } = resolveHelpers(helpers);
    const map = readers || {};
    const readerUids = Object.keys(map).sort((a, b) => new Date(map[b].readAt) - new Date(map[a].readAt));
    const readNames = /* @__PURE__ */ new Set();
    if (readerUids.length === 0) {
      return { html: EMPTY_READERS_HTML, readNames, isEmpty: true };
    }
    let html = "";
    readerUids.forEach((uid) => {
      const r = map[uid];
      if (r.name) readNames.add(r.name.trim().toLowerCase());
      html += `<li style="margin-bottom: 8px; border-bottom: 1px solid var(--glass-border); padding-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 500; font-size: 13px;">${esc(r.name)}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${new Date(r.readAt).toLocaleString("es-CO")}</div>
            </li>`;
    });
    return { html, readNames, isEmpty: false };
  }
  function isPendingReaderCandidate(user) {
    return user.approved === true && (user.role === "Gestor" || user.role === void 0);
  }
  function buildUnreadersListHtml(allUsers, readers, readNames, helpers) {
    const { escapeHTML: esc } = resolveHelpers(helpers);
    const seen = new Set(readNames);
    const map = readers || {};
    let html = "";
    let unreadCount = 0;
    Object.keys(allUsers).forEach((uKey) => {
      const u = allUsers[uKey];
      if (isPendingReaderCandidate(u)) {
        const uName = (u.name || "").trim().toLowerCase();
        if (!map[uKey] && !seen.has(uName)) {
          unreadCount += 1;
          html += `<li style="margin-bottom: 8px; border-bottom: 1px solid var(--glass-border); padding-bottom: 5px;">
                            <div style="font-weight: 500; color: var(--danger); font-size: 13px;"><i class='bx bx-x'></i> ${esc(u.name || "Sin nombre")}</div>
                        </li>`;
          if (uName) seen.add(uName);
        }
      }
    });
    if (unreadCount === 0) {
      html = ALL_READ_HTML;
    }
    return { html, unreadCount };
  }

  // ../src/services/firebase/firebase-announcement-repository.js
  var firebase_announcement_repository_exports = {};
  __export(firebase_announcement_repository_exports, {
    createAnnouncementRepository: () => createAnnouncementRepository
  });
  function createAnnouncementRepository({ database }) {
    return {
      /**
       * Suscripción en vivo a todos los comunicados.
       *
       * @param {(announcements: Record<string, object>) => void} onChange recibe `snapshot.val() || {}`
       * @param {(error: unknown) => void} [onError] opcional; `app.js` hoy no pasa ninguno
       * @returns {() => void} función para cancelar la suscripción
       */
      subscribe(onChange, onError) {
        const ref = database.ref("announcements");
        const handler = (snapshot) => onChange(snapshot.val() || {});
        if (onError) {
          ref.on("value", handler, onError);
        } else {
          ref.on("value", handler);
        }
        return () => {
          if (typeof ref.off === "function") ref.off("value", handler);
        };
      },
      /** Crea un comunicado con clave nueva (`push` + `set`). Devuelve la clave. */
      async publish(payload) {
        const newRef = database.ref("announcements").push();
        await newRef.set(payload);
        return newRef.key;
      },
      /** Marca `announcements/{id}/readBy/{uid}` con el recibo de lectura. */
      async markAsRead(id, uid, receipt) {
        await database.ref(`announcements/${id}/readBy/${uid}`).set(receipt);
      },
      /**
       * D4 (2026-10-14, restaurado): lee una vez `announcements/{id}/readBy/{uid}` para distinguir, tras un
       * PERMISSION_DENIED al marcar como leído, una duplicidad (la lectura ya existe) de un permiso real.
       * Devuelve el recibo o `null`. El propio usuario puede leer su lectura (regla de `announcements`).
       */
      async fetchReadReceipt(id, uid) {
        const snapshot = await database.ref(`announcements/${id}/readBy/${uid}`).once("value");
        const value = snapshot && typeof snapshot.val === "function" ? snapshot.val() : null;
        return value === void 0 ? null : value;
      },
      /** Elimina un comunicado completo. */
      async remove(id) {
        await database.ref("announcements/" + id).remove();
      },
      /** Lee el nodo `users` una vez (Admin/Supervisor). Devuelve el snapshot sin tocarlo. */
      fetchUsersSnapshot() {
        return database.ref("users").once("value");
      }
    };
  }

  // ../src/controllers/announcements-controller.js
  var announcements_controller_exports = {};
  __export(announcements_controller_exports, {
    DEFAULT_OPTIONS: () => DEFAULT_OPTIONS,
    DELETE_BUTTON_BUSY_HTML: () => DELETE_BUTTON_BUSY_HTML,
    LEGACY_OPTIONS: () => LEGACY_OPTIONS,
    URGENT_BUTTON_BUSY_HTML: () => URGENT_BUTTON_BUSY_HTML,
    URGENT_BUTTON_IDLE_HTML: () => URGENT_BUTTON_IDLE_HTML,
    createAnnouncementsController: () => createAnnouncementsController,
    resolveAnnouncementOptions: () => resolveAnnouncementOptions
  });
  var URGENT_BUTTON_IDLE_HTML = "<i class='bx bx-check-double'></i> He le\xEDdo y entendido este comunicado";
  var URGENT_BUTTON_BUSY_HTML = "<i class='bx bx-loader-alt bx-spin'></i> Registrando...";
  var DELETE_BUTTON_BUSY_HTML = "<i class='bx bx-loader-alt bx-spin'></i> Eliminando...";
  var DEFAULT_OPTIONS = Object.freeze({ skipIfAlreadyRead: true, keepUrgentModalOpenOnFailure: true });
  var LEGACY_OPTIONS = Object.freeze({ skipIfAlreadyRead: false, keepUrgentModalOpenOnFailure: false });
  function resolveAnnouncementOptions(options = {}) {
    const base = options.legacy ? LEGACY_OPTIONS : DEFAULT_OPTIONS;
    return {
      skipIfAlreadyRead: options.skipIfAlreadyRead === void 0 ? base.skipIfAlreadyRead : Boolean(options.skipIfAlreadyRead),
      keepUrgentModalOpenOnFailure: options.keepUrgentModalOpenOnFailure === void 0 ? base.keepUrgentModalOpenOnFailure : Boolean(options.keepUrgentModalOpenOnFailure)
    };
  }
  function createAnnouncementsController(deps) {
    const {
      repository,
      document: doc,
      getUser,
      getAuthUser = () => null,
      now = Date.now,
      alert: notify = () => {
      },
      closeModal: closeModal2 = () => {
      },
      setTimeout: schedule = (fn, ms) => setTimeout(fn, ms),
      logger = console,
      helpers
    } = deps;
    const options = resolveAnnouncementOptions(deps.options);
    let internalAnnouncements = {};
    const rawAnnouncements = deps.getAnnouncements || (() => internalAnnouncements);
    const setAnnouncements = deps.setAnnouncements || ((map) => {
      internalAnnouncements = map;
    });
    let pendingDeleteId = null;
    const assumedReads = /* @__PURE__ */ new Map();
    function getAnnouncements() {
      let map = rawAnnouncements();
      assumedReads.forEach((receipts, uid) => {
        map = applyAssumedReads(map, uid, receipts);
      });
      return map;
    }
    function rememberAssumedRead(uid, id, receipt) {
      const receipts = assumedReads.get(uid) || {};
      receipts[id] = receipt || { readAt: "" };
      assumedReads.set(uid, receipts);
    }
    async function isReadOnServer(id, uid) {
      if (typeof repository.fetchReadReceipt !== "function") return null;
      try {
        return await repository.fetchReadReceipt(id, uid);
      } catch (verifyError) {
        logger.error(verifyError);
        return null;
      }
    }
    function readerUid() {
      const user = getUser();
      return user && user.uid ? user.uid : resolveReaderUid(user, getAuthUser());
    }
    function initListener(onError) {
      return repository.subscribe((map) => {
        setAnnouncements(map);
        updateUnreadBadge();
        checkUnreadUrgent();
        const viewGestor = doc.getElementById("view-comunicados");
        if (viewGestor && viewGestor.style.display === "block") {
          renderGestor();
        }
        const viewAdmin = doc.getElementById("view-gestion-comunicados");
        if (viewAdmin && viewAdmin.style.display === "block") {
          renderAdmin();
        }
      }, onError);
    }
    function openNewModal() {
      const user = getUser();
      if (!user || !canPublishComunicados(user.role)) {
        logger.warn("openNewComunicadoModal: rol no autorizado", user && user.role);
        return;
      }
      doc.getElementById("comunicadoTitle").value = "";
      doc.getElementById("comunicadoContent").innerHTML = "";
      doc.getElementById("newComunicadoModal").classList.add("active");
    }
    async function save() {
      const user = getUser();
      if (!user || !canPublishComunicados(user.role)) {
        logger.warn("saveNewComunicado: rol no autorizado", user && user.role);
        notify(ANNOUNCEMENT_MESSAGES.NOT_ALLOWED_PUBLISH);
        return;
      }
      const form = parseNewAnnouncementForm({
        title: doc.getElementById("comunicadoTitle").value,
        rawContentHtml: doc.getElementById("comunicadoContent").innerHTML
      }, helpers);
      if (!form.ok) {
        notify(ANNOUNCEMENT_MESSAGES.MISSING_FIELDS);
        return;
      }
      try {
        await repository.publish(buildAnnouncementPayload({
          title: form.title,
          content: form.content,
          currentUser: user,
          authUid: getAuthUser().uid,
          now: now()
        }));
        notify(ANNOUNCEMENT_MESSAGES.PUBLISHED);
        closeModal2("newComunicadoModal");
      } catch (e) {
        logger.error(e);
        notify(ANNOUNCEMENT_MESSAGES.PUBLISH_ERROR);
      }
    }
    function updateUnreadBadge() {
      const user = getUser();
      const badge = doc.getElementById("unreadAnnouncementsBadge");
      const needsAuthUser = user && user.role !== "Admin" && user.role !== "Supervisor" && !user.uid;
      const view = computeUnreadBadge(user, needsAuthUser ? getAuthUser() : null, getAnnouncements());
      if (!badge) return;
      if (view.visible) {
        badge.textContent = view.count;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    }
    function renderGestor() {
      const list = doc.getElementById("gestorComunicadosList");
      if (!list) return;
      list.innerHTML = buildGestorComunicadosHtml(getAnnouncements(), readerUid(), helpers);
    }
    async function markAsRead(id) {
      let uid;
      try {
        uid = readerUid();
        const user = getUser();
        if (options.skipIfAlreadyRead) {
          const current = getAnnouncements()[id];
          if (current && isAnnouncementRead(current, uid)) {
            return true;
          }
        }
        const receipt = buildReadReceipt(user, now());
        await repository.markAsRead(id, uid, receipt);
        if (options.skipIfAlreadyRead) {
          rememberAssumedRead(uid, id, receipt);
        }
        return true;
      } catch (e) {
        if (options.skipIfAlreadyRead && uid && classifyReadWriteError(e) === READ_FAILURE_KINDS.PERMISSION_DENIED) {
          const receipt = await isReadOnServer(id, uid);
          if (receipt) {
            rememberAssumedRead(uid, id, receipt);
            updateUnreadBadge();
            return true;
          }
        }
        logger.error(e);
        notify(ANNOUNCEMENT_MESSAGES.READ_ERROR);
        return false;
      }
    }
    function checkUnreadUrgent() {
      const user = getUser();
      if (!user || !user.uid) return;
      if (!requiresUrgentConfirmation(user.role)) return;
      const modal = doc.getElementById("urgentAnnouncementModal");
      if (modal && modal.classList.contains("active")) return;
      const next = findNextUnreadUrgent(getAnnouncements(), user.uid);
      if (!next) return;
      const view = buildAnnouncementView(next.announcement, helpers);
      doc.getElementById("urgentAnnouncementTitle").innerText = view.title;
      doc.getElementById("urgentAnnouncementAuthor").innerText = view.author;
      doc.getElementById("urgentAnnouncementDate").innerText = view.dateText;
      doc.getElementById("urgentAnnouncementBody").innerHTML = view.bodyHtml;
      const btn = doc.getElementById("btnUrgentUnderstand");
      btn.onclick = () => markUrgentAsRead(next.key);
      modal.classList.add("active");
    }
    async function markUrgentAsRead(id) {
      const btn = doc.getElementById("btnUrgentUnderstand");
      btn.innerHTML = URGENT_BUTTON_BUSY_HTML;
      btn.disabled = true;
      try {
        const ok2 = await markAsRead(id);
        if (options.keepUrgentModalOpenOnFailure && ok2 === false) {
          btn.innerHTML = URGENT_BUTTON_IDLE_HTML;
          btn.disabled = false;
          return;
        }
        doc.getElementById("urgentAnnouncementModal").classList.remove("active");
        btn.innerHTML = URGENT_BUTTON_IDLE_HTML;
        btn.disabled = false;
        schedule(() => {
          checkUnreadUrgent();
        }, 500);
      } catch (e) {
        btn.innerHTML = URGENT_BUTTON_IDLE_HTML;
        btn.disabled = false;
      }
    }
    function renderAdmin() {
      const tbody = doc.getElementById("adminComunicadosTableBody");
      if (!tbody) return;
      const user = getUser();
      const showDelete = canDeleteComunicados(user && user.role);
      tbody.innerHTML = buildAdminComunicadosRowsHtml(getAnnouncements(), showDelete, helpers);
    }
    function viewContent(id) {
      const c = getAnnouncements()[id];
      if (!c) return;
      const view = buildAnnouncementView(c, helpers);
      doc.getElementById("viewComunicadoContentTitle").innerText = view.title;
      doc.getElementById("viewComunicadoContentAuthor").innerText = view.author;
      doc.getElementById("viewComunicadoContentDate").innerText = view.dateText;
      doc.getElementById("viewComunicadoContentBody").innerHTML = view.bodyHtml;
      doc.getElementById("viewComunicadoContentModal").classList.add("active");
    }
    async function viewLecturas(id) {
      const user = getUser();
      if (!user || !canViewComunicadoLecturas(user.role)) {
        logger.warn("viewComunicadoLecturas: rol no autorizado", user && user.role);
        return;
      }
      const c = getAnnouncements()[id];
      if (!c) return;
      doc.getElementById("comunicadoLecturasModal").classList.add("active");
      const readList = doc.getElementById("comunicadoReadList");
      const unreadList = doc.getElementById("comunicadoUnreadList");
      readList.innerHTML = "";
      unreadList.innerHTML = LOADING_USERS_HTML;
      const readers = c.readBy || {};
      const readView = buildReadersListHtml(readers, helpers);
      readList.innerHTML = readView.html;
      try {
        const snap = await repository.fetchUsersSnapshot();
        if (snap.exists()) {
          const allUsers = snap.val();
          unreadList.innerHTML = "";
          unreadList.innerHTML = buildUnreadersListHtml(allUsers, readers, readView.readNames, helpers).html;
        }
      } catch (e) {
        logger.error(e);
        unreadList.innerHTML = USERS_ERROR_HTML;
      }
    }
    function requestDelete(id) {
      const user = getUser();
      if (!user || !canDeleteComunicados(user.role)) {
        logger.warn("deleteComunicado: rol no autorizado", user && user.role);
        notify(ANNOUNCEMENT_MESSAGES.NOT_ALLOWED_DELETE);
        return;
      }
      pendingDeleteId = id;
      doc.getElementById("confirmDeleteModal").classList.add("active");
    }
    async function confirmDelete() {
      if (!pendingDeleteId) return;
      const user = getUser();
      if (!user || !canDeleteComunicados(user.role)) {
        logger.warn("confirmDeleteBtn: rol no autorizado", user && user.role);
        pendingDeleteId = null;
        closeModal2("confirmDeleteModal");
        return;
      }
      const btn = doc.getElementById("confirmDeleteBtn");
      const prevText = btn.innerHTML;
      btn.innerHTML = DELETE_BUTTON_BUSY_HTML;
      btn.disabled = true;
      try {
        await repository.remove(pendingDeleteId);
        closeModal2("confirmDeleteModal");
      } catch (e) {
        logger.error(e);
        notify(ANNOUNCEMENT_MESSAGES.DELETE_ERROR);
      } finally {
        btn.innerHTML = prevText;
        btn.disabled = false;
        pendingDeleteId = null;
      }
    }
    return {
      initListener,
      openNewModal,
      save,
      updateUnreadBadge,
      renderGestor,
      markAsRead,
      checkUnreadUrgent,
      markUrgentAsRead,
      renderAdmin,
      viewContent,
      viewLecturas,
      requestDelete,
      confirmDelete,
      getPendingDeleteId: () => pendingDeleteId
    };
  }

  // ../src/domain/incidents/incident-service.js
  var incident_service_exports = {};
  __export(incident_service_exports, {
    INCIDENTS_LIMIT: () => INCIDENTS_LIMIT,
    INCIDENT_DEFAULT_TYPE: () => INCIDENT_DEFAULT_TYPE,
    INCIDENT_MESSAGES: () => INCIDENT_MESSAGES,
    INCIDENT_STATUS_CLOSED: () => INCIDENT_STATUS_CLOSED,
    INCIDENT_STATUS_OPEN: () => INCIDENT_STATUS_OPEN,
    buildIncidentPayload: () => buildIncidentPayload,
    parseIncidentForm: () => parseIncidentForm,
    snapshotToIncidents: () => snapshotToIncidents
  });
  var INCIDENT_DEFAULT_TYPE = "Novedad Operativa";
  var INCIDENT_STATUS_OPEN = "Abierto";
  var INCIDENT_STATUS_CLOSED = "Cerrado";
  var INCIDENTS_LIMIT = 50;
  var INCIDENT_MESSAGES = Object.freeze({
    LOGIN_REQUIRED: "Debes iniciar sesi\xF3n para registrar una novedad.",
    MISSING_FIELDS: "Por favor completa el t\xEDtulo y el detalle de la novedad.",
    REGISTERED: "\xA1Novedad/Incidente registrada exitosamente!",
    REGISTER_ERROR: "Ocurri\xF3 un error al registrar la novedad."
  });
  function parseIncidentForm(raw, currentUser) {
    var _a, _b, _c;
    const type = raw.type || INCIDENT_DEFAULT_TYPE;
    const title = (_a = raw.title) == null ? void 0 : _a.trim();
    const assignee = ((_b = raw.assignee) == null ? void 0 : _b.trim()) || currentUser.name;
    const detail = (_c = raw.detail) == null ? void 0 : _c.trim();
    return { ok: Boolean(title && detail), type, title, assignee, detail };
  }
  function buildIncidentPayload({ type, title, assignee, detail, currentUser, uid, now }) {
    return {
      uid,
      type,
      title,
      assignedTo: assignee,
      detail,
      reportedBy: currentUser.name,
      reportedByEmail: currentUser.email || "",
      timestamp: now,
      status: INCIDENT_STATUS_OPEN
    };
  }
  function snapshotToIncidents(snapshot) {
    const incidents = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnap) => {
        incidents.unshift({ id: childSnap.key, ...childSnap.val() });
      });
    }
    return incidents;
  }

  // ../src/services/firebase/firebase-incident-repository.js
  var firebase_incident_repository_exports = {};
  __export(firebase_incident_repository_exports, {
    createIncidentRepository: () => createIncidentRepository
  });
  function createIncidentRepository({ database }) {
    return {
      /** Crea la novedad con clave nueva (`push` + `set`). Devuelve la clave. */
      async create(payload) {
        const newLogRef = database.ref("logs").push();
        await newLogRef.set(payload);
        return newLogRef.key;
      },
      /**
       * Suscripción en vivo a las últimas 50 novedades (más reciente primero).
       *
       * @param {(incidents: Array<object>) => void} onChange
       * @param {(error: unknown) => void} [onError] opcional; `app.js` hoy no pasa ninguno
       * @returns {() => void} función para cancelar
       */
      subscribeRecent(onChange, onError) {
        const query = database.ref("logs").orderByChild("timestamp").limitToLast(INCIDENTS_LIMIT);
        const handler = (snapshot) => onChange(snapshotToIncidents(snapshot));
        if (onError) {
          query.on("value", handler, onError);
        } else {
          query.on("value", handler);
        }
        return () => {
          if (typeof query.off === "function") query.off("value", handler);
        };
      }
    };
  }

  // ../src/ui/views/incidents-view.js
  var incidents_view_exports = {};
  __export(incidents_view_exports, {
    EMPTY_INCIDENTS_HTML: () => EMPTY_INCIDENTS_HTML,
    buildIncidentsTableHtml: () => buildIncidentsTableHtml,
    formatIncidentDate: () => formatIncidentDate
  });
  var EMPTY_INCIDENTS_HTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">No hay novedades ni incidentes registrados.</td></tr>';
  function formatIncidentDate(timestamp) {
    return timestamp ? new Date(timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "N/A";
  }
  function buildIncidentsTableHtml(incidents, helpers) {
    const esc = helpers && helpers.escapeHTML || escapeHTML;
    if (!incidents || incidents.length === 0) {
      return EMPTY_INCIDENTS_HTML;
    }
    let html = "";
    incidents.forEach((inc) => {
      const dateStr = formatIncidentDate(inc.timestamp);
      const typeBadge = `<span class="badge pending" style="font-size: 10px;">${esc(inc.type || "Soporte")}</span>`;
      const statusBadge = inc.status === "Cerrado" ? `<span class="badge status-completed" style="font-size: 10px; background: var(--success); color: white;">Cerrado</span>` : `<span class="badge in-progress" style="font-size: 10px; background: var(--warning); color: white;">Abierto</span>`;
      html += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 10px; font-size: 12px; color: var(--text-secondary);">${dateStr}</td>
                <td style="padding: 10px;">${typeBadge}</td>
                <td style="padding: 10px;">
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 13px;">${esc(inc.title || "")}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${esc(inc.detail || "")}</div>
                    ${inc.assignedTo ? `<div style="font-size: 10px; color: var(--accent-primary); margin-top: 2px;">Resp: ${esc(inc.assignedTo)}</div>` : ""}
                </td>
                <td style="padding: 10px; font-size: 12px; color: var(--text-primary);">${esc(inc.reportedBy || "An\xF3nimo")}</td>
                <td style="padding: 10px; text-align: center;">${statusBadge}</td>
            </tr>
        `;
    });
    return html;
  }

  // ../src/controllers/incidents-controller.js
  var incidents_controller_exports = {};
  __export(incidents_controller_exports, {
    createIncidentsController: () => createIncidentsController
  });
  function createIncidentsController(deps) {
    const {
      repository,
      document: doc,
      getUser,
      getAuthUser = () => null,
      now = Date.now,
      alert: notify = () => {
      },
      logger = console,
      helpers
    } = deps;
    function renderTable(incidents) {
      const tbody = doc.getElementById("incidentsTableBody");
      if (!tbody) return;
      tbody.innerHTML = buildIncidentsTableHtml(incidents, helpers);
    }
    async function handleSubmit(event) {
      var _a, _b, _c, _d;
      event.preventDefault();
      const user = getUser();
      if (!user) {
        notify(INCIDENT_MESSAGES.LOGIN_REQUIRED);
        return;
      }
      const form = parseIncidentForm({
        type: (_a = doc.getElementById("incidentType")) == null ? void 0 : _a.value,
        title: (_b = doc.getElementById("incidentTitle")) == null ? void 0 : _b.value,
        assignee: (_c = doc.getElementById("incidentAssignee")) == null ? void 0 : _c.value,
        detail: (_d = doc.getElementById("incidentDetail")) == null ? void 0 : _d.value
      }, user);
      if (!form.ok) {
        notify(INCIDENT_MESSAGES.MISSING_FIELDS);
        return;
      }
      try {
        await repository.create(buildIncidentPayload({
          type: form.type,
          title: form.title,
          assignee: form.assignee,
          detail: form.detail,
          currentUser: user,
          uid: user.uid || getAuthUser().uid,
          now: now()
        }));
        const formEl = doc.getElementById("incidentForm");
        if (formEl) formEl.reset();
        notify(INCIDENT_MESSAGES.REGISTERED);
      } catch (err) {
        logger.error("Error registrando novedad en /logs:", err);
        notify(INCIDENT_MESSAGES.REGISTER_ERROR);
      }
    }
    function startListener(onError) {
      return repository.subscribeRecent((incidents) => renderTable(incidents), onError);
    }
    return { handleSubmit, startListener, renderTable };
  }

  // ../src/domain/users/gestor-config.js
  var gestor_config_exports = {};
  __export(gestor_config_exports, {
    EMPTY_GESTORES_ROW_HTML: () => EMPTY_GESTORES_ROW_HTML,
    ERROR_GESTORES_ROW_HTML: () => ERROR_GESTORES_ROW_HTML,
    GESTOR_ROW_BORDER: () => GESTOR_ROW_BORDER,
    SPLIT_SHIFT_FIELD: () => SPLIT_SHIFT_FIELD,
    SPLIT_SHIFT_SAVE_ERROR: () => SPLIT_SHIFT_SAVE_ERROR,
    buildGestorConfigRowHtml: () => buildGestorConfigRowHtml,
    buildSplitShiftConfirmMessage: () => buildSplitShiftConfirmMessage,
    canUseSplitShiftConfig: () => canUseSplitShiftConfig,
    canWriteHasSplitShift: () => canWriteHasSplitShift,
    hasSplitShiftEnabled: () => hasSplitShiftEnabled,
    isConfigGestorCandidate: () => isConfigGestorCandidate,
    selectConfigGestores: () => selectConfigGestores
  });
  var SPLIT_SHIFT_FIELD = "hasSplitShift";
  var EMPTY_GESTORES_ROW_HTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay gestores registrados.</td></tr>';
  var ERROR_GESTORES_ROW_HTML = '<tr><td colspan="3" style="text-align: center; color: var(--danger); padding: 20px;">Error al cargar datos.</td></tr>';
  var GESTOR_ROW_BORDER = "1px solid rgba(255,255,255,0.05)";
  var SPLIT_SHIFT_SAVE_ERROR = "Hubo un error al guardar. Intenta de nuevo.";
  function canUseSplitShiftConfig(user) {
    return Boolean(user) && user.role === "Admin";
  }
  function canWriteHasSplitShift({ actor, targetUid, targetExists, newValue }) {
    if (!actor || !actor.uid) return false;
    const isApprovedAdmin = actor.approved === true && actor.role === "Admin";
    const isOwnCreation = actor.uid === targetUid && targetExists === false && newValue !== null && newValue !== void 0;
    return isApprovedAdmin || isOwnCreation;
  }
  function hasSplitShiftEnabled(user) {
    return isSplitShiftEnabled(user);
  }
  function buildSplitShiftConfirmMessage(isChecked) {
    return `\xBFEst\xE1s segura de que quieres ${isChecked ? "habilitar" : "deshabilitar"} la Pausa de Turno para este usuario?`;
  }
  function isConfigGestorCandidate(user) {
    return Boolean(user.role === "Gestor" && user.email && !user.email.toLowerCase().includes("pruebas"));
  }
  function selectConfigGestores(entries) {
    const usersMap = /* @__PURE__ */ new Map();
    entries.forEach(({ key, value }) => {
      const u = { ...value };
      if (isConfigGestorCandidate(u)) {
        const email = u.email.toLowerCase();
        if (!usersMap.has(email) || u.loginTime && (!usersMap.get(email).loginTime || new Date(u.loginTime) > new Date(usersMap.get(email).loginTime))) {
          u.uid = key;
          usersMap.set(email, u);
        }
      }
    });
    const users = Array.from(usersMap.values());
    users.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return users;
  }
  function buildGestorConfigRowHtml(u, { escapeUserFields = true } = {}) {
    const hasSplitShift = u.hasSplitShift === true;
    const name = escapeUserFields ? escapeHTML(u.name || "Desconocido") : u.name || "Desconocido";
    const role = escapeUserFields ? escapeHTML(u.role) : u.role;
    const email = escapeUserFields ? escapeHTML(u.email) : u.email;
    const uidAttr = escapeUserFields ? escapeHTML(u.uid) : u.uid;
    const uidArg = escapeUserFields ? `decodeURIComponent('${encodeInlineHandlerArg(u.uid)}')` : `'${u.uid}'`;
    return `
                <td style="padding: 15px; display: flex; align-items: center; gap: 10px;">
                    <div style="width: 30px; height: 30px; background: var(--glass-border); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--accent-primary);"><i class='bx bx-user'></i></div>
                    <div>
                        <div style="font-weight: 500; color: var(--text-primary);">${name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">${role}</div>
                    </div>
                </td>
                <td style="padding: 15px; color: var(--text-secondary); font-size: 13px;">${email}</td>
                <td style="padding: 15px; text-align: center;">
                    <label for="splitShiftToggle_${uidAttr}" class="switch" style="position: relative; display: inline-block; width: 44px; height: 22px;">
                        <input type="checkbox" id="splitShiftToggle_${uidAttr}" name="splitShiftToggle_${uidAttr}" aria-label="Turno Partido para ${escapeHTML(u.name || "Gestor")}" onchange="toggleGestorSplitShift(${uidArg}, this.checked)" ${hasSplitShift ? "checked" : ""} style="opacity: 0; width: 0; height: 0;">
                        <span class="slider round" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${hasSplitShift ? "var(--success)" : "var(--glass-border)"}; transition: .4s; border-radius: 22px;">
                            <span style="position: absolute; height: 16px; width: 16px; left: ${hasSplitShift ? "24px" : "3px"}; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%;"></span>
                        </span>
                    </label>
                </td>
            `;
  }

  // ../src/services/firebase/firebase-config-repository.js
  var firebase_config_repository_exports = {};
  __export(firebase_config_repository_exports, {
    createConfigRepository: () => createConfigRepository
  });
  function createConfigRepository({ database }) {
    return {
      /** Lee el nodo `users` una vez. Devuelve el snapshot sin tocarlo. */
      fetchUsersSnapshot() {
        return database.ref("users").once("value");
      },
      /** Escribe el flag de Pausa de Turno de un usuario. Devuelve la promesa de la escritura. */
      setHasSplitShift(uid, value) {
        return database.ref("users/" + uid + "/hasSplitShift").set(value);
      }
    };
  }

  // ../src/controllers/config-gestores-controller.js
  var config_gestores_controller_exports = {};
  __export(config_gestores_controller_exports, {
    createConfigGestoresController: () => createConfigGestoresController
  });
  function createConfigGestoresController(deps) {
    const { repository, document: doc, confirm: ask, alert: notify = () => {
    }, logger = console, options = {} } = deps;
    function render() {
      const tbody = doc.getElementById("configGestoresTableBody");
      if (!tbody) return void 0;
      return repository.fetchUsersSnapshot().then((snap) => {
        tbody.innerHTML = "";
        if (!snap.exists()) {
          tbody.innerHTML = EMPTY_GESTORES_ROW_HTML;
          return;
        }
        const entries = [];
        snap.forEach((child) => {
          entries.push({ key: child.key, value: child.val() });
        });
        const users = selectConfigGestores(entries);
        if (users.length === 0) {
          tbody.innerHTML = EMPTY_GESTORES_ROW_HTML;
          return;
        }
        users.forEach((u) => {
          const row = doc.createElement("tr");
          row.style.borderBottom = GESTOR_ROW_BORDER;
          row.innerHTML = buildGestorConfigRowHtml(u, { escapeUserFields: options.escapeUserFields !== false });
          tbody.appendChild(row);
        });
      }).catch((err) => {
        logger.error("Error cargando gestores:", err);
        tbody.innerHTML = ERROR_GESTORES_ROW_HTML;
      });
    }
    function toggle(uid, isChecked) {
      if (ask(buildSplitShiftConfirmMessage(isChecked))) {
        return repository.setHasSplitShift(uid, isChecked).then(() => {
          render();
        }).catch((err) => {
          logger.error("Error actualizando permiso de turno partido:", err);
          notify(SPLIT_SHIFT_SAVE_ERROR);
          render();
        });
      }
      render();
      return void 0;
    }
    return { render, toggle };
  }

  // ../src/domain/auth/login-history.js
  var login_history_exports = {};
  __export(login_history_exports, {
    LOGIN_HISTORY_EMPTY_HTML: () => LOGIN_HISTORY_EMPTY_HTML,
    LOGIN_HISTORY_ERROR_HTML: () => LOGIN_HISTORY_ERROR_HTML,
    LOGIN_HISTORY_LOADING_HTML: () => LOGIN_HISTORY_LOADING_HTML,
    NOT_ONLINE_STATUSES: () => NOT_ONLINE_STATUSES,
    ONLINE_THRESHOLD_MS: () => ONLINE_THRESHOLD_MS,
    buildDelayBadgeHtml: () => buildDelayBadgeHtml,
    buildLoginHistoryRecords: () => buildLoginHistoryRecords,
    buildLoginHistoryTableHtml: () => buildLoginHistoryTableHtml,
    computeLoginDelay: () => computeLoginDelay,
    filterLoginHistoryRecords: () => filterLoginHistoryRecords
  });
  var LOGIN_HISTORY_LOADING_HTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-secondary);"><i class='bx bx-loader-alt bx-spin' style="font-size: 24px; margin-bottom: 8px;"></i><br>Cargando historial de accesos...</td></tr>`;
  var LOGIN_HISTORY_ERROR_HTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--danger);">Error cargando los accesos. Por favor intenta de nuevo.</td></tr>`;
  var LOGIN_HISTORY_EMPTY_HTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-secondary);">No se encontraron registros de accesos.</td></tr>`;
  var ONLINE_THRESHOLD_MS = 12e4;
  var NOT_ONLINE_STATUSES = Object.freeze(["En Almuerzo", "En Desayuno", "En Pausa de Turno", "Inactivo"]);
  function buildLoginHistoryRecords({ activeSessions, loginLogs, shiftReports }, nowMs, sink = []) {
    const allLoginHistoryRecords = sink;
    const seenKeys = /* @__PURE__ */ new Set();
    if (activeSessions) {
      const activeData = activeSessions;
      for (let uid in activeData) {
        const s = activeData[uid];
        if (!s || !s.name) continue;
        const loginTimeStr = s.loginTime || s.startTime || (s.lastActive ? new Date(s.lastActive).toISOString() : new Date(nowMs).toISOString());
        const key = `${s.name.trim().toLowerCase()}_${loginTimeStr.substring(0, 16)}`;
        seenKeys.add(key);
        let isOnline = s.lastActive ? nowMs - s.lastActive < ONLINE_THRESHOLD_MS : false;
        if (s.status === "En Almuerzo" || s.status === "En Desayuno" || s.status === "En Pausa de Turno" || s.status === "Inactivo") isOnline = false;
        allLoginHistoryRecords.push({
          name: s.name,
          email: s.email || "",
          shift: s.shift || "Ma\xF1ana",
          loginTime: loginTimeStr,
          lastActive: s.lastActive ? new Date(s.lastActive).toLocaleString("es-CO") : "Reciente",
          isOnline,
          status: s.status || (isOnline ? "En L\xEDnea" : "Inactivo"),
          source: "En Vivo"
        });
      }
    }
    if (loginLogs) {
      const logData = loginLogs;
      for (let id in logData) {
        const l = logData[id];
        if (!l || !l.name) continue;
        const key = `${l.name.trim().toLowerCase()}_${(l.loginTime || "").substring(0, 16)}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        allLoginHistoryRecords.push({
          name: l.name,
          email: l.email || "",
          shift: l.shift || "General",
          loginTime: l.loginTime || l.timestamp,
          lastActive: l.lastActive ? new Date(l.lastActive).toLocaleString("es-CO") : "Finalizado",
          isOnline: false,
          status: l.status || "Finalizado",
          source: "Historial"
        });
      }
    }
    if (shiftReports) {
      const reportsData = shiftReports;
      for (let id in reportsData) {
        const r = reportsData[id];
        if (!r) continue;
        const gestorName = (r.gestor || r.name || r.userName || "").trim();
        if (!gestorName) continue;
        const shiftStr = r.turnoProgramado || r.shift || "General";
        const loginTimeStr = r.horaInicio || r.loginTime || r.startTime || r.reportDate || (r.timestamp ? new Date(r.timestamp).toISOString() : "");
        const endTimeStr = r.horaFin || r.endTime || (r.timestamp ? new Date(r.timestamp).toLocaleString("es-CO") : "Turno Finalizado");
        const key = `${gestorName.toLowerCase()}_${loginTimeStr.substring(0, 16)}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        let statusLabel = "Turno Completado";
        if (shiftStr.toLowerCase().includes("descansa")) {
          statusLabel = "Ingreso en D\xEDa de Descanso";
        }
        allLoginHistoryRecords.push({
          name: gestorName,
          email: r.email || "",
          shift: shiftStr,
          loginTime: loginTimeStr,
          lastActive: endTimeStr,
          isOnline: false,
          status: statusLabel,
          source: "Bit\xE1cora"
        });
      }
    }
    allLoginHistoryRecords.sort((a, b) => new Date(b.loginTime || 0) - new Date(a.loginTime || 0));
    return allLoginHistoryRecords;
  }
  function computeLoginDelay(shift, loginTime) {
    const loginDateObj = loginTime ? new Date(loginTime) : null;
    if (shift && shift.toLowerCase().includes("descansa")) {
      return { kind: "rest" };
    }
    if (loginDateObj && !isNaN(loginDateObj) && shift) {
      const shiftStr = shift.toLowerCase().trim();
      const match = shiftStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
      if (match) {
        let hour = parseInt(match[1], 10);
        let minute = match[2] ? parseInt(match[2], 10) : 0;
        const ampm = match[3].toLowerCase();
        if (ampm === "pm" && hour < 12) hour += 12;
        if (ampm === "am" && hour === 12) hour = 0;
        const expected = new Date(loginDateObj);
        expected.setHours(hour, minute, 0, 0);
        let diffMin = (loginDateObj - expected) / (1e3 * 60);
        if (diffMin < -12 * 60) {
          expected.setDate(expected.getDate() - 1);
          diffMin = (loginDateObj - expected) / (1e3 * 60);
        } else if (diffMin > 12 * 60) {
          expected.setDate(expected.getDate() + 1);
          diffMin = (loginDateObj - expected) / (1e3 * 60);
        }
        if (diffMin <= 5) {
          return { kind: "on_time" };
        } else if (diffMin > 240) {
          return { kind: "off_hours" };
        }
        return { kind: "late", minutes: Math.round(diffMin) };
      }
    }
    return null;
  }
  function buildDelayBadgeHtml(delay) {
    if (!delay) return "";
    switch (delay.kind) {
      case "rest":
        return `<span style="background: rgba(139,92,246,0.15); color: #8b5cf6; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">Descanso</span>`;
      case "on_time":
        return `<span style="background: rgba(16,185,129,0.15); color: var(--success); padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">A tiempo</span>`;
      case "off_hours":
        return `<span style="background: rgba(139,92,246,0.15); color: #8b5cf6; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">Fuera de Horario</span>`;
      default:
        return `<span style="background: rgba(239,68,68,0.15); color: var(--danger); padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 6px;">+${delay.minutes}m Tarde</span>`;
    }
  }
  function buildLoginHistoryTableHtml(records, options = {}) {
    const esc = options.escapeHTML || escapeHTML;
    const escapeRaw = options.escapeRawLoginTime !== false;
    if (records.length === 0) {
      return LOGIN_HISTORY_EMPTY_HTML;
    }
    let html = "";
    records.forEach((r) => {
      const loginDateObj = r.loginTime ? new Date(r.loginTime) : null;
      const rawLogin = r.loginTime || "N/A";
      const formattedLogin = loginDateObj && !isNaN(loginDateObj) ? loginDateObj.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "medium" }) : escapeRaw ? esc(rawLogin) : rawLogin;
      const delayBadge = buildDelayBadgeHtml(computeLoginDelay(r.shift, r.loginTime));
      let statusBadge = `<span style="background: rgba(59,130,246,0.15); color: var(--accent-primary); padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">${esc(r.status)}</span>`;
      if (r.isOnline) {
        statusBadge = `<span style="background: rgba(16,185,129,0.15); color: var(--success); padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;"><i class='bx bx-radio-circle-marked'></i> En L\xEDnea</span>`;
      } else if (r.status === "Ingreso en D\xEDa de Descanso") {
        statusBadge = `<span style="background: rgba(139,92,246,0.15); color: #8b5cf6; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">Ingreso en Descanso</span>`;
      }
      html += `
            <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                <td style="padding: 12px 16px; font-weight: 600; color: var(--text-primary);">
                    ${esc(r.name)}
                    ${r.email ? `<div style="font-size: 11px; color: var(--text-secondary); font-weight: 400;">${esc(r.email)}</div>` : ""}
                </td>
                <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 13px;">${esc(r.shift)}</td>
                <td style="padding: 12px 16px; color: var(--text-primary); font-size: 13px; font-weight: 500;">
                    ${formattedLogin} ${delayBadge}
                </td>
                <td style="padding: 12px 16px;">${statusBadge}</td>
                <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 12px;">${esc(r.lastActive)}</td>
            </tr>
        `;
    });
    return html;
  }
  function filterLoginHistoryRecords(records, { query = "", dateVal = "todos" } = {}, now = /* @__PURE__ */ new Date(), options = {}) {
    const todayStr = now.toISOString().substring(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
    return records.filter((r) => {
      if (query && !r.name.toLowerCase().includes(query) && !(r.email && r.email.toLowerCase().includes(query))) {
        return false;
      }
      if (dateVal !== "todos" && r.loginTime) {
        const rDate = new Date(r.loginTime);
        if (options.tolerateInvalidDates && isNaN(rDate)) return false;
        const rDateStr = rDate.toISOString().substring(0, 10);
        if (dateVal === "hoy" && rDateStr !== todayStr) return false;
        if (dateVal === "7d" && rDate < sevenDaysAgo) return false;
        if (dateVal === "30d" && rDate < thirtyDaysAgo) return false;
      }
      return true;
    });
  }

  // ../src/services/firebase/firebase-login-history-repository.js
  var firebase_login_history_repository_exports = {};
  __export(firebase_login_history_repository_exports, {
    createLoginHistoryRepository: () => createLoginHistoryRepository
  });
  function createLoginHistoryRepository({ database }) {
    return {
      /**
       * @returns {Promise<{active: object, reports: object, logs: object}>} snapshots sin tocar
       */
      async fetchSources() {
        const active = await database.ref("active_sessions").once("value");
        const reports = await database.ref("shift_reports").once("value");
        const logs = await database.ref("login_history").once("value");
        return { active, reports, logs };
      }
    };
  }

  // ../src/controllers/login-history-controller.js
  var login_history_controller_exports = {};
  __export(login_history_controller_exports, {
    createLoginHistoryController: () => createLoginHistoryController
  });
  function createLoginHistoryController(deps) {
    const { repository, document: doc, now = Date.now, logger = console, helpers, options = {} } = deps;
    let allLoginHistoryRecords = [];
    function render(records) {
      const tbody = doc.getElementById("loginHistoryTableBody");
      if (!tbody) return;
      tbody.innerHTML = buildLoginHistoryTableHtml(records, {
        escapeHTML: helpers && helpers.escapeHTML,
        escapeRawLoginTime: options.escapeRawLoginTime !== false
      });
    }
    async function open() {
      const modal = doc.getElementById("loginHistoryModal");
      if (!modal) return;
      modal.classList.add("active");
      const tbody = doc.getElementById("loginHistoryTableBody");
      if (tbody) {
        tbody.innerHTML = LOGIN_HISTORY_LOADING_HTML;
      }
      try {
        const { active, reports, logs } = await repository.fetchSources();
        allLoginHistoryRecords = [];
        buildLoginHistoryRecords({
          activeSessions: active.exists() ? active.val() : null,
          loginLogs: logs.exists() ? logs.val() : null,
          shiftReports: reports.exists() ? reports.val() : null
        }, now(), allLoginHistoryRecords);
        render(allLoginHistoryRecords);
      } catch (e) {
        logger.error("Error cargando historial de accesos:", e);
        if (tbody) {
          tbody.innerHTML = LOGIN_HISTORY_ERROR_HTML;
        }
      }
    }
    function filter() {
      const searchInput = doc.getElementById("loginHistorySearch");
      const dateFilter = doc.getElementById("loginHistoryDateFilter");
      const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
      const dateVal = dateFilter ? dateFilter.value : "todos";
      render(filterLoginHistoryRecords(allLoginHistoryRecords, { query, dateVal }, new Date(now()), {
        tolerateInvalidDates: options.tolerateInvalidDates === true
      }));
    }
    return { open, render, filter, getRecords: () => allLoginHistoryRecords };
  }

  // ../src/services/firebase/presence-service.js
  var presence_service_exports = {};
  __export(presence_service_exports, {
    PRESENCE_ENABLED_BY_DEFAULT: () => PRESENCE_ENABLED_BY_DEFAULT,
    createPresenceService: () => createPresenceService
  });
  var PRESENCE_ENABLED_BY_DEFAULT = false;
  function createPresenceService({ database, serverTimestamp, onSessionsChanged, onError, enabled = PRESENCE_ENABLED_BY_DEFAULT }) {
    const active = enabled === true;
    return {
      /** `true` solo si se pasó `enabled: true` explícito. */
      enabled: active,
      /**
       * @param {string} uid
       * @returns {(() => void)|undefined} función para dejar de escuchar `.info/connected` (`undefined` si está inactivo)
       */
      setupUserPresence(uid) {
        if (!active) return void 0;
        if (!uid || !database) return void 0;
        const connectedRef = database.ref(".info/connected");
        const userSessionRef = database.ref(`active_sessions/${uid}`);
        const handler = (snap) => {
          if (snap.val() === true) {
            const chain = userSessionRef.onDisconnect().update({
              status: "offline",
              lastHeartbeat: serverTimestamp
            }).then(() => userSessionRef.update({
              status: "online",
              lastHeartbeat: serverTimestamp
            }));
            if (onError) chain.catch(onError);
          }
        };
        connectedRef.on("value", handler);
        return () => {
          if (typeof connectedRef.off === "function") connectedRef.off("value", handler);
        };
      },
      /** @returns {(() => void)|undefined} función para dejar de escuchar `active_sessions` (`undefined` si está inactivo) */
      startMonitoringPresence() {
        if (!active) return void 0;
        if (!database) return void 0;
        const ref = database.ref("active_sessions");
        const handler = () => {
          if (typeof onSessionsChanged === "function") {
            onSessionsChanged();
          }
        };
        ref.on("value", handler);
        return () => {
          if (typeof ref.off === "function") ref.off("value", handler);
        };
      }
    };
  }

  // ../src/domain/analytics/approved-counter.js
  var approved_counter_exports = {};
  __export(approved_counter_exports, {
    APPROVED_COUNTER_ENABLED_BY_DEFAULT: () => APPROVED_COUNTER_ENABLED_BY_DEFAULT,
    APPROVED_COUNTER_PATH: () => APPROVED_COUNTER_PATH,
    nextApprovedCount: () => nextApprovedCount
  });
  var APPROVED_COUNTER_ENABLED_BY_DEFAULT = false;
  var APPROVED_COUNTER_PATH = "metrics/approvedCount";
  function nextApprovedCount(currentValue, amount = 1) {
    return (currentValue || 0) + amount;
  }

  // ../src/services/firebase/approved-counter-service.js
  var approved_counter_service_exports = {};
  __export(approved_counter_service_exports, {
    createApprovedCounterService: () => createApprovedCounterService
  });
  function createApprovedCounterService({ database, onCount, enabled = APPROVED_COUNTER_ENABLED_BY_DEFAULT }) {
    const active = enabled === true;
    return {
      /** `true` solo si se pasó `enabled: true` explícito. */
      enabled: active,
      /** Suma `amount` (1 por omisión) de forma atómica. */
      incrementApprovedWithdrawal(uid, amount = 1) {
        if (!active) return;
        if (!database) return;
        const counterRef = database.ref(APPROVED_COUNTER_PATH);
        counterRef.transaction((currentValue) => {
          return nextApprovedCount(currentValue, amount);
        }, (error, committed, snapshot) => {
          if (!error && committed) {
            onCount(snapshot.val());
          }
        });
      },
      /** Escucha el contador en vivo. Devuelve la función de cancelación (`undefined` si está inactivo). */
      initAtomicApprovedCounterListener() {
        if (!active) return void 0;
        if (!database) return void 0;
        const ref = database.ref(APPROVED_COUNTER_PATH);
        const handler = (snapshot) => {
          if (snapshot.exists()) {
            onCount(snapshot.val());
          }
        };
        ref.on("value", handler);
        return () => {
          if (typeof ref.off === "function") ref.off("value", handler);
        };
      }
    };
  }

  // ../src/ui/views/approved-count-view.js
  var approved_count_view_exports = {};
  __export(approved_count_view_exports, {
    renderApprovedCount: () => renderApprovedCount
  });
  function renderApprovedCount({ count, isFiltered, element, schedule = (fn, ms) => setTimeout(fn, ms) }) {
    if (isFiltered) return false;
    if (element) {
      element.textContent = count || 0;
      element.style.transform = "scale(1.25)";
      schedule(() => {
        element.style.transform = "scale(1)";
      }, 300);
      return true;
    }
    return false;
  }

  // ../src/domain/schedules/active-supervisors.js
  var active_supervisors_exports = {};
  __export(active_supervisors_exports, {
    LEGACY_BADGE_SUPERVISORS: () => LEGACY_BADGE_SUPERVISORS,
    SHIFT_RANGE_PATTERN: () => SHIFT_RANGE_PATTERN,
    buildBadgeSupervisors: () => buildBadgeSupervisors,
    buildSupervisorBadgeHtml: () => buildSupervisorBadgeHtml,
    computeActiveSupervisors: () => computeActiveSupervisors,
    formatSupervisorNames: () => formatSupervisorNames,
    isSupervisorShiftActive: () => isSupervisorShiftActive
  });
  var LEGACY_BADGE_SUPERVISORS = Object.freeze([
    Object.freeze({ name: "Maria", full: "Maria Sanchez" }),
    Object.freeze({ name: "Sara", full: "Sara Santamar\xEDa" }),
    Object.freeze({ name: "Oriana", full: "Oriana Borja" })
  ]);
  var SHIFT_RANGE_PATTERN = /(\d+)(am|pm|a\.m\.|p\.m\.)\s*-\s*(\d+)(am|pm|a\.m\.|p\.m\.)/i;
  function isSupervisorShiftActive(shiftStr, timeFloat) {
    if (!(shiftStr && typeof shiftStr === "string" && shiftStr !== "Descansa" && shiftStr !== "Por Asignar" && shiftStr !== "Vacaciones")) {
      return false;
    }
    const match = shiftStr.match(SHIFT_RANGE_PATTERN);
    if (match) {
      let startH = parseInt(match[1]);
      const startMeridiem = match[2].toLowerCase().replace(/\./g, "");
      if (startMeridiem === "pm" && startH !== 12) startH += 12;
      if (startMeridiem === "am" && startH === 12) startH = 0;
      let endH = parseInt(match[3]);
      const endMeridiem = match[4].toLowerCase().replace(/\./g, "");
      if (endMeridiem === "pm" && endH !== 12) endH += 12;
      if (endMeridiem === "am" && endH === 12) endH = 0;
      const startFloat = startH;
      const endFloat = endH;
      if (endFloat <= startFloat) {
        return timeFloat >= startFloat || timeFloat < endFloat;
      }
      return timeFloat >= startFloat && timeFloat < endFloat;
    }
    return shiftStr.toLowerCase().includes("turno");
  }
  function buildBadgeSupervisors(directoryOrUsers) {
    const directory = isSupervisorDirectory(directoryOrUsers) ? directoryOrUsers : buildSupervisorDirectory(directoryOrUsers);
    const withName = directory.list.filter((s) => s.name);
    const firstName = (full) => full.split(/\s+/)[0];
    const counts = /* @__PURE__ */ new Map();
    const key = (full) => normalizeFullName(firstName(full));
    withName.forEach((s) => counts.set(key(s.name), (counts.get(key(s.name)) || 0) + 1));
    return Object.freeze(withName.map((s) => Object.freeze({
      uid: s.uid,
      name: counts.get(key(s.name)) > 1 ? s.name : firstName(s.name),
      full: s.name,
      lookupName: s.name
    })));
  }
  function computeActiveSupervisors(getShiftFor, now, supervisors) {
    if (!Array.isArray(supervisors)) {
      throw new TypeError("computeActiveSupervisors: falta la lista de supervisores (decisi\xF3n D9b: derivarla de users con buildBadgeSupervisors).");
    }
    const timeFloat = now.getHours() + now.getMinutes() / 60;
    const activeSups = [];
    for (const sup of supervisors) {
      if (isSupervisorShiftActive(getShiftFor(sup.lookupName || sup.name), timeFloat)) {
        if (!activeSups.includes(sup.name)) activeSups.push(sup.name);
      }
    }
    return activeSups;
  }
  function formatSupervisorNames(names) {
    if (names.length === 1) return names[0];
    if (names.length === 2) return names.join(" y ");
    return names.slice(0, -1).join(", ") + " y " + names[names.length - 1];
  }
  function buildSupervisorBadgeHtml(activeSups) {
    if (activeSups.length > 0) {
      return `<i class='bx bx-support'></i> Sup: ${formatSupervisorNames(activeSups)}`;
    }
    return `<i class='bx bx-support'></i> Sup: Ninguna (Fuera de turno)`;
  }

  // ../src/controllers/supervisor-badge-controller.js
  var supervisor_badge_controller_exports = {};
  __export(supervisor_badge_controller_exports, {
    createSupervisorBadgeController: () => createSupervisorBadgeController
  });
  function createSupervisorBadgeController({
    document: doc,
    getScheduleRows,
    getScheduleBlocks,
    getShiftForDate: getShiftForDate2,
    getSupervisorUsers,
    legacySupervisors = false,
    now = () => /* @__PURE__ */ new Date(),
    logger = console
  }) {
    const useLegacyList = legacySupervisors === true || typeof getSupervisorUsers !== "function";
    let cachedSupervisors = null;
    let pending = null;
    function resolveSupervisors() {
      if (useLegacyList) return LEGACY_BADGE_SUPERVISORS;
      if (cachedSupervisors) return cachedSupervisors;
      if (pending) return null;
      const result = getSupervisorUsers();
      if (result && typeof result.then === "function") {
        pending = Promise.resolve(result).then((users) => {
          pending = null;
          if (users) {
            cachedSupervisors = buildBadgeSupervisors(users);
            update();
          }
        }, (error) => {
          pending = null;
          logger.error("No se pudo leer el directorio de supervisores para la insignia:", error);
        });
        return null;
      }
      if (!result) return null;
      cachedSupervisors = buildBadgeSupervisors(result);
      return cachedSupervisors;
    }
    function update() {
      const rows = getScheduleRows();
      if (!rows || rows.length === 0) return;
      const badge = doc.getElementById("activeSupervisorBadge");
      if (!badge) return;
      const supervisors = resolveSupervisors();
      if (!supervisors) return;
      const current = now();
      const activeSups = computeActiveSupervisors(
        (name) => typeof getShiftForDate2 === "function" ? getShiftForDate2(rows, getScheduleBlocks(), name, current) : null,
        current,
        supervisors
      );
      badge.innerHTML = buildSupervisorBadgeHtml(activeSups);
      badge.style.display = "inline-flex";
    }
    function invalidateSupervisors() {
      cachedSupervisors = null;
    }
    return { update, invalidateSupervisors };
  }
  return __toCommonJS(entry_exports);
})();
