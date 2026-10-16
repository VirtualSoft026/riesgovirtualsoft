/**
 * Controlador del cierre de turno: `handleEndShift()` (app.js, paso W-17 de la Fase 3).
 *
 * Reemplaza el cuerpo de `handleEndShift()` de app.js: validación de SET y de tareas gestionadas, cierre de
 * pausas abiertas, cálculo de tiempos y bitácora, respaldo atómico en Firebase, limpieza de la sesión local,
 * cierre de autenticación, notificación por correo (best-effort) y redirección al inicio de sesión.
 *
 * El orden de las operaciones y los mensajes son los del original: el cierre central se persiste ANTES de
 * limpiar la sesión y el correo nunca revierte el cierre persistido.
 *
 * No toca el DOM global, `localStorage`, `firebase`, `fetch`, `alert`, `confirm` ni `window` directamente:
 * recibe todo por `deps` (inyección de dependencias) para probarse sin navegador.
 */

import {
    requiresSpecificSetSelection, listUnmanagedTasks, shouldValidateManagedTasks
} from '../domain/shifts/shift-closure-rules.js';
import { consolidateTimeline } from '../domain/shifts/timeline-service.js';
import {
    sumCleanInactivityMinutes, buildBitacoraText, buildShiftReportObject
} from '../domain/shifts/shift-report-builder.js';
import { TIMELINE_EVENT } from '../utils/constants.js';

/** Destino del correo de cierre (FormSubmit AJAX). */
export const SHIFT_CLOSE_EMAIL_ENDPOINT = 'https://formsubmit.co/ajax/maria.sanchez@virtualsoft.tech';

/** Mensajes al usuario, exactos a los de app.js. */
export const SHIFT_CLOSE_MESSAGES = Object.freeze({
    CONFIRM: '¿Estás seguro que deseas finalizar tu turno actual? Se enviará un resumen al supervisor.',
    NO_LOCAL_SESSION: 'No se encontró la sesión local necesaria para generar el reporte.',
    SET_REQUIRED: 'OBLIGATORIO: Debes seleccionar el SET específico en el que trabajaste antes de finalizar el turno (Arriba a la derecha).',
    UNMANAGED_TASKS: (count) => `OBLIGATORIO: Tienes ${count} tarea(s) sin gestionar (En Proceso o Pendientes). Debes gestionar todas tus tareas asignadas (marcando Finalizada o No Realizada) antes de finalizar el turno.`,
    SAVE_FAILED: 'No fue posible finalizar el turno porque el reporte o el cierre de sesión no quedó guardado. Intenta nuevamente.',
    SIGNOUT_AFTER_SAVE_FAILED: 'El turno quedó guardado, pero no fue posible cerrar la autenticación. Recarga la página antes de volver a ingresar.',
    DONE_WITH_EMAIL: 'Turno finalizado correctamente y reporte enviado al supervisor.',
    DONE_WITHOUT_EMAIL: 'Turno finalizado correctamente. No fue posible enviar la notificación por correo.',
    EXIT_FAILED_AFTER_SAVE: 'El turno quedó guardado, pero ocurrió un error al completar la salida. Serás dirigido al inicio de sesión.',
    FATAL: (detail) => `No fue posible finalizar el turno: ${detail}\n\nLa sesión se mantiene activa para que puedas intentar nuevamente.`
});

/**
 * @param {{
 *   doc: {getElementById: (id: string) => (object|null)},
 *   confirm: (message: string) => boolean,
 *   alert: (message: string) => void,
 *   redirectToLogin: () => void,
 *   readStoredUserRaw: () => (string|null),
 *   getUser: () => (object|null),
 *   clearUser: () => void,
 *   getTaskCache: () => (object|null),
 *   getAllTasks: () => (Array<object>|null),
 *   getTimeline: () => (Array<object>|null),
 *   getSplitShiftTotalMs: () => number,
 *   shift: {
 *     closeOpenBreaks: () => unknown,
 *     computeShiftClosure: (input: {loginMs: number, endMs: number, inactivityMins: number, cleanInactivityMins: number}) =>
 *       {times: {lunchMinutes: number, breakfastMinutes: number, penaltyMins: number}, emailFields: Array<[string, string]>}
 *   },
 *   buildTaskReport: (report: {tasks: object}) => string,
 *   persistShiftClosure: (uid: string, loginLogId: string, shiftReport: object) => Promise<unknown>,
 *   restoreButton: (button: object|null, previousHtml: string) => void,
 *   clearSessionStorage: () => void,
 *   getAuthUid: () => (string|null),
 *   signOut: () => Promise<unknown>,
 *   appendFormSubmitCc: (formData: FormData) => FormData,
 *   createFormData: () => FormData,
 *   fetchFn: (url: string, init: object) => Promise<{status: number, ok: boolean}>,
 *   now?: () => number,
 *   logger?: {error: Function, warn: Function}
 * }} deps
 * @returns {{handleEndShift: () => Promise<void>}}
 */
export function createShiftClosureController(deps) {
    const {
        doc, confirm, alert, redirectToLogin,
        readStoredUserRaw, getUser, clearUser,
        getTaskCache, getAllTasks, getTimeline, getSplitShiftTotalMs,
        shift, buildTaskReport, persistShiftClosure, restoreButton,
        clearSessionStorage, getAuthUid, signOut, appendFormSubmitCc, createFormData, fetchFn,
        now = Date.now, logger = console
    } = deps;

    function readLocalUser() {
        try {
            return JSON.parse(readStoredUserRaw());
        } catch (e) {
            return null;
        }
    }

    function errorInfo(error) {
        return {
            code: error && error.code ? error.code : 'unknown',
            message: error && error.message ? error.message : 'unknown'
        };
    }

    /** Suma de la inactividad en vivo (entra en la penalidad, igual que en app.js). */
    function liveInactivityMins(timeline) {
        let total = 0;

        if (timeline && timeline.length > 0) {
            timeline.forEach((ev) => {
                if (ev.type === TIMELINE_EVENT.INACTIVITY) {
                    const eTime = ev.end ? ev.end : now();

                    total += (eTime - ev.start) / (1000 * 60);
                }
            });
        }

        return total;
    }

    /** Respaldo de la sesión de Firebase: uid de la sesión local, de la sesión en memoria o de Auth. */
    function resolveReportUid(localUser) {
        const current = getUser();

        return localUser.uid || (current && current.uid) || getAuthUid();
    }

    async function handleEndShift() {
        if (!confirm(SHIFT_CLOSE_MESSAGES.CONFIRM)) return;

        const btn = doc.getElementById('endShiftBtn');
        const prevHtml = btn ? btn.innerHTML : '';
        let shiftClosurePersisted = false;

        try {
            const localUser = readLocalUser();

            if (!localUser) {
                throw new Error(SHIFT_CLOSE_MESSAGES.NO_LOCAL_SESSION);
            }

            const setSelect = doc.getElementById('activeSetSelect');

            if (requiresSpecificSetSelection(setSelect)) {
                alert(SHIFT_CLOSE_MESSAGES.SET_REQUIRED);

                return;
            }

            // Validación obligatoria: todas las tareas asignadas (y extra) deben estar Finalizada o No Realizada.
            const taskCache = getTaskCache();

            if (shouldValidateManagedTasks(localUser, taskCache)) {
                const unmanagedTasks = listUnmanagedTasks({ allTasks: getAllTasks(), taskStateCache: taskCache });

                if (unmanagedTasks.length > 0) {
                    alert(SHIFT_CLOSE_MESSAGES.UNMANAGED_TASKS(unmanagedTasks.length));

                    return;
                }
            }

            if (btn) {
                btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Notificando...";
                btn.disabled = true;
            }

            // Cerrar almuerzo, desayuno o Pausa de Turno abiertos solo después de validar la sesión y el SET.
            shift.closeOpenBreaks();

            const formData = createFormData();
            const loginDate = new Date(localUser.loginTime);
            const endDate = new Date(now());

            // D1: horas efectivas = turno − almuerzo − desayuno − Pausa de Turno − inactividad (fórmula única del correo y del panel).
            const timeline = getTimeline();
            const inactividadMins = liveInactivityMins(timeline);

            // Inactividad que se RESTA: la de la bitácora consolidada (= inactividadTotalMins del reporte guardado).
            const cleanTimeline = consolidateTimeline(timeline, { defaultEndMs: endDate.getTime() });
            const inactividadMinsLimpia = sumCleanInactivityMinutes(cleanTimeline, endDate.getTime());

            const closure = shift.computeShiftClosure({
                loginMs: loginDate.getTime(),
                endMs: endDate.getTime(),
                inactivityMins: inactividadMins,
                cleanInactivityMins: inactividadMinsLimpia
            });
            const { lunchMinutes, breakfastMinutes, penaltyMins: penalidadConectividadMins } = closure.times;

            formData.append('Usuario', localUser.name);
            formData.append('Rol', localUser.role);
            formData.append('Reporte', 'CIERRE DE TURNO Y RESUMEN DE TAREAS');
            formData.append('Hora_Inicio_Turno', loginDate.toLocaleString());
            formData.append('Hora_Fin_Turno', endDate.toLocaleString());
            closure.emailFields.forEach(([campo, valor]) => formData.append(campo, valor));

            const bitacoraTexto = buildBitacoraText(cleanTimeline);

            formData.append('Bitacora_de_Tiempos', bitacoraTexto);

            if (setSelect) {
                formData.append('SET_Principal_Trabajado', setSelect.value);
            }

            formData.append('_subject', `Reporte de Turno: ${localUser.name}`);
            formData.append('_captcha', 'false');
            appendFormSubmitCc(formData);

            let report = buildTaskReport({ tasks: taskCache });

            report += '\n\n=== BITÁCORA DE TIEMPOS ===\n' + bitacoraTexto;
            formData.append('Resumen_de_Tareas', report);

            // --- RESPALDO SEGURO EN FIREBASE ---
            const reportUid = resolveReportUid(localUser);
            const shiftReportObject = buildShiftReportObject({
                uid: reportUid,
                localUser,
                loginDate,
                now: endDate,
                setSelectValue: setSelect ? setSelect.value : null,
                report,
                tasks: taskCache,
                cleanTimeline,
                penaltyMins: penalidadConectividadMins,
                cleanInactivityMins: inactividadMinsLimpia,
                lunchMinutes,
                breakfastMinutes,
                totalSplitShiftTimeMs: getSplitShiftTotalMs() || 0
            });

            // Persistencia central atómica: reporte, cierre de sesión activa y logoutTime.
            // Si cualquiera falla, no se limpia la sesión local ni se intenta enviar correo.
            try {
                await persistShiftClosure(reportUid, localUser.loginLogId, shiftReportObject);
                shiftClosurePersisted = true;
            } catch (coreError) {
                logger.error('CORE_SHIFT_CLOSE_FAILED', errorInfo(coreError));
                restoreButton(btn, prevHtml);
                alert(SHIFT_CLOSE_MESSAGES.SAVE_FAILED);

                return;
            }

            // El cierre central ya quedó persistido; ahora se limpia la sesión local.
            clearSessionStorage();
            clearUser();

            try {
                await signOut();
            } catch (signOutError) {
                logger.error('SHIFT_SIGNOUT_FAILED', errorInfo(signOutError));
                alert(SHIFT_CLOSE_MESSAGES.SIGNOUT_AFTER_SAVE_FAILED);
                redirectToLogin();

                return;
            }

            // El correo es una notificación best-effort y nunca revierte el cierre persistido.
            let emailSent = false;
            let emailStatus = null;
            let emailErrorMessage = null;

            try {
                const emailResponse = await fetchFn(SHIFT_CLOSE_EMAIL_ENDPOINT, {
                    method: 'POST',
                    body: formData,
                    headers: { Accept: 'application/json' }
                });

                emailStatus = emailResponse.status;
                emailSent = emailResponse.ok;
            } catch (emailError) {
                emailErrorMessage = emailError && emailError.message ? emailError.message : 'network error';
            }

            if (emailSent) {
                alert(SHIFT_CLOSE_MESSAGES.DONE_WITH_EMAIL);
            } else {
                logger.warn('EMAIL_NOTIFICATION_FAILED', { status: emailStatus, message: emailErrorMessage });
                alert(SHIFT_CLOSE_MESSAGES.DONE_WITHOUT_EMAIL);
            }

            redirectToLogin();
        } catch (fatalError) {
            logger.error('FATAL END SHIFT ERROR:', fatalError);
            restoreButton(btn, prevHtml);

            if (shiftClosurePersisted) {
                clearUser();

                try {
                    await signOut();
                } catch (signOutError) {
                    logger.error('SHIFT_SIGNOUT_AFTER_PERSISTENCE_FAILED', signOutError);
                }

                alert(SHIFT_CLOSE_MESSAGES.EXIT_FAILED_AFTER_SAVE);
                redirectToLogin();

                return;
            }

            alert(SHIFT_CLOSE_MESSAGES.FATAL(fatalError.message));
        }
    }

    return { handleEndShift };
}
