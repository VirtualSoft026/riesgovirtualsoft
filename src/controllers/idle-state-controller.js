import { TIMELINE_EVENT, DOM_IDLE_FALLBACK_THRESHOLD_MS } from '../utils/constants.js';

/**
 * @file idle-state-controller.js
 *
 * Funciones puras que DECIDEN los efectos cuando cambia el estado de inactividad
 * o cuando se detecta actividad del usuario. Ninguna función toca el DOM ni Firebase
 * directamente: devuelven un descriptor de efectos que el caller aplica.
 *
 * Estas funciones reemplazan `applyIdleStateChange()` y `updateActivity()` de app.js
 * con una versión testeable e inyectable.
 *
 * Reglas de negocio (verificadas contra app.js líneas 517-587):
 *   - Solo el rol 'Gestor' es afectado por el detector de inactividad.
 *   - Si el gestor está en pausa (Almuerzo, Desayuno o Pausa de Turno), el cambio
 *     de inactividad se ignora.
 *   - Al volverse Inactivo:  status Activo → Inactivo, evento 'Inactividad' 'start'.
 *   - Al volverse Activo:    status Inactivo → Activo, evento 'Inactividad' 'end'.
 *   - `updateActivity` también transiciona Inactivo → Activo cuando recibe actividad
 *     real, o cuando pasó más tiempo del umbral DOM (browser throttling).
 */

/**
 * Resuelve los efectos que deben aplicarse cuando el detector de inactividad
 * notifica un cambio de estado.
 *
 * @param {boolean} isIdle - Nuevo estado del detector (true = el usuario está inactivo)
 * @param {{
 *   userRole: string,
 *   userStatus: string,
 *   isOnBreak: boolean,
 *   now?: number
 * }} context
 * @returns {{
 *   timelineAction: 'start' | 'end' | null,
 *   nextUserStatus: string | null,
 *   syncFirebase: boolean
 * }}
 */
export function resolveIdleStateChange(isIdle, {
    userRole,
    userStatus,
    isOnBreak,
    now = Date.now(),
}) {
    const noEffect = { timelineAction: null, nextUserStatus: null, syncFirebase: false };

    // Solo afecta a Gestores
    if (userRole !== 'Gestor') {
        return noEffect;
    }

    // Si está en pausa activa, la inactividad no se registra
    if (isOnBreak) {
        return noEffect;
    }

    // Activo → Inactivo
    if (isIdle && userStatus === 'Activo') {
        return {
            timelineAction: 'start',
            nextUserStatus: 'Inactivo',
            syncFirebase: true,
        };
    }

    // Inactivo → Activo (recuperación desde el detector)
    if (!isIdle && userStatus === 'Inactivo') {
        return {
            timelineAction: 'end',
            nextUserStatus: 'Activo',
            syncFirebase: true,
        };
    }

    return noEffect;
}

/**
 * Resuelve los efectos cuando se detecta actividad real del usuario
 * (mousemove, keydown, click, scroll, visibilitychange, focus).
 *
 * Si el gestor estaba marcado Inactivo, o si el tiempo transcurrido desde la
 * última actividad supera el umbral DOM (browser throttling), la función indica
 * que se debe transicionar a Activo y cerrar el evento de inactividad.
 *
 * @param {{
 *   userRole: string,
 *   userStatus: string,
 *   lastTimestamp: number,
 *   now?: number,
 *   idleThresholdMs?: number
 * }} context
 * @returns {{
 *   nextTimestamp: number,
 *   nextUserStatus: string | null,
 *   timelineAction: 'end' | null,
 *   syncFirebase: boolean
 * }}
 */
export function resolveActivityUpdate({
    userRole,
    userStatus,
    lastTimestamp,
    now = Date.now(),
    idleThresholdMs = DOM_IDLE_FALLBACK_THRESHOLD_MS,
}) {
    const timeSinceLast = now - lastTimestamp;

    // Solo actúa sobre Gestores
    if (userRole !== 'Gestor') {
        return { nextTimestamp: now, nextUserStatus: null, timelineAction: null, syncFirebase: false };
    }

    // Condición de transición: ya estaba marcado Inactivo, O pasó más tiempo del umbral
    const wasEffectivelyIdle =
        userStatus === 'Inactivo' ||
        timeSinceLast > idleThresholdMs;

    if (wasEffectivelyIdle) {
        return {
            nextTimestamp: now,
            nextUserStatus: 'Activo',
            timelineAction: 'end',
            syncFirebase: true,
        };
    }

    return {
        nextTimestamp: now,
        nextUserStatus: null,
        timelineAction: null,
        syncFirebase: false,
    };
}
