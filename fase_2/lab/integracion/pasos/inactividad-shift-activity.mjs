/**
 * Paso de integración SOLO-LABORATORIO del corte "Detector de inactividad".
 *
 * Sustituye, en la copia de staging de app.js (nunca en el original), los cuerpos de:
 *   - `applyIdleStateChange()`   → `__shiftActivityController().onIdleChange(globalIdleState)`
 *   - `updateActivity()`         → `__shiftActivityController().onActivity()`
 *   - `setInterval` (poller DOM) → `__shiftActivityController().onIdleChange(true)` si `shouldApplyDomIdleFallback()`
 *
 * Corresponde a plan-maestro §4.3 decisión D_SAC-T: dentro del scope de app.js las funciones de
 * sincronización (`pushTimelineEvent`, `updateStatusDisplay`, `syncActiveSessionToFirebase`) no
 * son stubs — están disponibles directamente como closures de app.js.
 *
 * Anclas (únicas en app.js, no se solapan con el corte del controlador de turno):
 *   1. `function applyIdleStateChange() {`
 *      — fin: `\ncheckAndStartIdleDetector();` (no inclusivo)
 *   2. `function updateActivity() {`
 *      — fin: `\ndocument.addEventListener('mousemove', updateActivity);` (no inclusivo)
 *   3. `// Fast checker loop to apply 10s inactivity exactly on time\nsetInterval(() => {`
 *      — fin: `}, 1000);\n\ntry {` (inclusivo, preserva el `try {` que sigue)
 *
 * Todo lo agregado lleva la marca `[LAB-INTEGRACION]`.
 */

const MARK = '[LAB-INTEGRACION]';

const HELPER_ACTIVIDAD = `// [LAB-INTEGRACION:ACTIVIDAD-INICIO]
// ${MARK} Detector de inactividad: RiskOps.shiftActivityController (src/controllers/shift-activity-controller.js)
// Singleton lazy — se crea la primera vez que cualquiera de las tres funciones lo llama.
let __labShiftActivityCtrl = null;
function __shiftActivityController() {
    if (__labShiftActivityCtrl) return __labShiftActivityCtrl;
    __labShiftActivityCtrl = RiskOps.shiftActivityController.createShiftActivityController({
        getUser: () => currentUser,
        isOnBreak: () => Boolean(isLunchBreak || isBreakfastBreak || isSplitShiftBreak),
        setUserStatus: (uid, status) => {
            if (typeof database !== 'undefined') database.ref('users/' + uid + '/status').set(status);
        },
        pushTimelineEvent: (type, action) => {
            // En el scope de app.js (a diferencia de bootstrap.js) esta función sí está disponible.
            if (typeof pushTimelineEvent === 'function') pushTimelineEvent(type, action);
        },
        onStatusDisplay: () => {
            if (typeof updateStatusDisplay === 'function') updateStatusDisplay();
        },
        syncSession: () => {
            if (typeof syncActiveSessionToFirebase === 'function') syncActiveSessionToFirebase();
        },
        now: Date.now,
        logger: console,
    });
    return __labShiftActivityCtrl;
}
// [LAB-INTEGRACION:ACTIVIDAD-FIN]

`;

export const STEPS = [
    {
        // Inserta el singleton helper + sustituye el cuerpo de applyIdleStateChange().
        // El ancla de inicio es la firma de la función (única en app.js).
        // El ancla de fin es la línea que sigue al bloque (no inclusiva).
        name: 'applyIdleStateChange → onIdleChange (con helper __shiftActivityController)',
        start: 'function applyIdleStateChange() {',
        end: '\ncheckAndStartIdleDetector();',
        endInclusive: false,
        replace: () => `${HELPER_ACTIVIDAD}function applyIdleStateChange() {
    // ${MARK} delega en RiskOps.shiftActivityController
    // Conserva lastLocalActivityTimestamp cuando vuelve a Activo (igual que app.js original)
    if (!globalIdleState) lastLocalActivityTimestamp = Date.now();
    __shiftActivityController().onIdleChange(globalIdleState);
}

`
    },
    {
        // Sustituye updateActivity(): mantiene lastLocalActivityTimestamp en sync con
        // shouldApplyDomIdleFallback (que usa esa variable local), delega el resto al controlador.
        name: 'updateActivity → onActivity',
        start: 'function updateActivity() {',
        end: '\ndocument.addEventListener(\'mousemove\', updateActivity);',
        endInclusive: false,
        replace: () => `function updateActivity() {
    // ${MARK} delega en RiskOps.shiftActivityController
    lastLocalActivityTimestamp = Date.now(); // mantiene la variable para shouldApplyDomIdleFallback
    if (typeof globalIdleState !== 'undefined') globalIdleState = false;
    __shiftActivityController().onActivity();
}
`
    },
    {
        // Sustituye el setInterval de 1 s: los guards (rol, pausa, globalIdleState) pasan al controlador.
        // shouldApplyDomIdleFallback() sigue usando lastLocalActivityTimestamp (actualizado por updateActivity).
        name: 'setInterval DOM fallback → onIdleChange(true)',
        start: '// Fast checker loop to apply 10s inactivity exactly on time\nsetInterval(() => {',
        end: '}, 1000);\n\ntry {',
        endInclusive: true,
        replace: () => `// Fast checker loop to apply 10s inactivity exactly on time — ${MARK}
setInterval(() => {
    // ${MARK} los guards de rol, pausa y estado los maneja el controlador internamente
    if (shouldApplyDomIdleFallback()) {
        __shiftActivityController().onIdleChange(true);
    }
}, 1000);

try {`
    }
];
