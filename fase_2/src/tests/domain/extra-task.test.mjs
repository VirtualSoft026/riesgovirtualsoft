import { createRunner, assert } from '../test-harness.mjs';
import {
    EXTRA_TASK_DEFAULT_STATUS,
    EXTRA_TASK_MESSAGES,
    EXTRA_TASK_NAME_PREFIX,
    buildExtraTaskRecord,
    isExtraTaskKey,
    isKnownExtraTaskStatus,
    isPermissionDeniedError,
    normalizeExtraTaskInput,
    resolveExtraTaskId,
    resolveExtraTaskSaveErrorMessage,
    validateExtraTaskIdentity,
    validateExtraTaskInput
} from '../../domain/tasks/extra-task.js';
import { EXCEPTION_MESSAGES, buildExceptionObservation, validateExceptionInput } from '../../domain/tasks/exception-justification.js';
import { EXTRA_TASK_KEY_PREFIX, TASK_STATUS } from '../../utils/constants.js';
import { createRng } from '../controllers/approvals-fakes.mjs';

const { test, summarize } = createRunner('extra-task.js + exception-justification.js (diferencial vs app.js 4001-4109)');

// ---------------------------------------------------------------------------------------------
// COPIAS LITERALES (app.js)
// ---------------------------------------------------------------------------------------------
/** app.js 4098-4100 + 4096-4097: clasificación del error de guardado. */
function originalErrorMessage(error) {
    const errorCode = error && error.code ? error.code : '';
    const isPermissionDenied = errorCode === 'PERMISSION_DENIED' || /permission[_ ]denied/i.test((error && error.message) || '');
    return isPermissionDenied
        ? "No tienes permiso para guardar esta tarea extra. Contacta a tu supervisor."
        : "No se pudo guardar la tarea extra en el servidor. El cambio quedó respaldado localmente; intenta guardar de nuevo.";
}

/** app.js 4068 y 4072-4077: llave y registro. */
function originalIdAndRecord(pendingExtraTaskId, name, status, obs, now1, now2) {
    const extraId = pendingExtraTaskId || ('extra_' + now1);
    const taskRecord = {
        name: "[EXTRA] " + name,
        status: status,
        observation: obs,
        updatedAt: now2
    };
    return { extraId, taskRecord };
}

/** app.js 4018: texto de la observación. */
function originalObservation(reasonText, details) {
    return `Excepción: ${reasonText}${details ? ' - ' + details : ''}`;
}

// ---------------------------------------------------------------------------------------------
test('textos de la tarea extra idénticos a los literales de app.js', () => {
    assert.equal(EXTRA_TASK_MESSAGES.NAME_REQUIRED, "OBLIGATORIO: Debes ingresar el nombre de la tarea extra."); // 4041
    assert.equal(EXTRA_TASK_MESSAGES.OBSERVATION_REQUIRED, "OBLIGATORIO: Debes detallar la gestión realizada en las Notas Técnicas."); // 4045
    assert.equal(EXTRA_TASK_MESSAGES.SESSION_EXPIRED, "Tu sesión expiró. Vuelve a iniciar sesión para guardar la tarea extra."); // 4049
    assert.equal(EXTRA_TASK_MESSAGES.IDENTITY_MISMATCH, "No se pudo verificar tu identidad. Vuelve a iniciar sesión para guardar la tarea extra."); // 4053
    assert.equal(EXTRA_TASK_MESSAGES.saved('Revisión'), `Tarea Adicional "${'Revisión'}" agregada exitosamente y se incluirá en tu reporte de turno.`); // 4092
    assert.equal(EXTRA_TASK_NAME_PREFIX, '[EXTRA] ');
    assert.equal(EXTRA_TASK_DEFAULT_STATUS, 'Finalizada'); // 4025
});

test('textos de la justificación idénticos a app.js 4009 y 4014', () => {
    assert.equal(EXCEPTION_MESSAGES.REASON_REQUIRED, 'Por favor seleccione una razón principal.');
    assert.equal(EXCEPTION_MESSAGES.DETAILS_REQUIRED, 'Por favor detalle el problema obligatoriamente.');
});

test('normalizeExtraTaskInput recorta nombre y observación; el estado pasa tal cual', () => {
    assert.deepEqual(normalizeExtraTaskInput({ name: '  A  ', status: 'En Proceso', obs: '\n B \t' }), { name: 'A', status: 'En Proceso', obs: 'B' });
    assert.deepEqual(normalizeExtraTaskInput({ name: null, status: undefined, obs: undefined }), { name: '', status: undefined, obs: '' });
});

test('validateExtraTaskInput: primero el nombre, luego la observación', () => {
    assert.deepEqual(validateExtraTaskInput({ name: '', obs: '' }), { ok: false, message: EXTRA_TASK_MESSAGES.NAME_REQUIRED });
    assert.deepEqual(validateExtraTaskInput({ name: 'x', obs: '' }), { ok: false, message: EXTRA_TASK_MESSAGES.OBSERVATION_REQUIRED });
    assert.deepEqual(validateExtraTaskInput({ name: 'x', obs: 'y' }), { ok: true });
});

test('validateExtraTaskIdentity: sin sesión, usuario local ausente o distinto, y coincidente', () => {
    assert.deepEqual(validateExtraTaskIdentity(null, { uid: 'a' }), { ok: false, message: EXTRA_TASK_MESSAGES.SESSION_EXPIRED });
    assert.deepEqual(validateExtraTaskIdentity(undefined, { uid: 'a' }), { ok: false, message: EXTRA_TASK_MESSAGES.SESSION_EXPIRED });
    assert.deepEqual(validateExtraTaskIdentity({ uid: 'a' }, null), { ok: false, message: EXTRA_TASK_MESSAGES.IDENTITY_MISMATCH });
    assert.deepEqual(validateExtraTaskIdentity({ uid: 'a' }, { uid: 'b' }), { ok: false, message: EXTRA_TASK_MESSAGES.IDENTITY_MISMATCH });
    assert.deepEqual(validateExtraTaskIdentity({ uid: 'a' }, { uid: 'a' }), { ok: true });
});

test('llave y registro idénticos al original, con y sin llave pendiente (200 casos con semilla)', () => {
    const rng = createRng(31337);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];

    for (let n = 0; n < 200; n += 1) {
        const pending = pick([null, null, 'extra_1', 'extra_999']);
        const name = pick(['Revisión', 'A', 'Ñandú <b>']);
        const status = pick(['Finalizada', 'En Proceso', 'Pendiente', 'No Realizada']);
        const obs = pick(['x', 'línea1\nlínea2']);
        const t1 = 1760000000000 + Math.floor(rng() * 1e6);
        const t2 = t1 + Math.floor(rng() * 50);
        const expected = originalIdAndRecord(pending, name, status, obs, t1, t2);

        assert.equal(pending || resolveExtraTaskId(null, t1), expected.extraId);
        assert.equal(resolveExtraTaskId(pending, t1), expected.extraId);
        assert.deepEqual(buildExtraTaskRecord({ name, status, obs }, t2), expected.taskRecord);
        assert.deepEqual(Object.keys(buildExtraTaskRecord({ name, status, obs }, t2)), Object.keys(expected.taskRecord));
    }
});

test('la llave usa EXTRA_TASK_KEY_PREFIX ("extra_") y isExtraTaskKey la reconoce', () => {
    assert.equal(EXTRA_TASK_KEY_PREFIX, 'extra_');
    assert.equal(resolveExtraTaskId(null, 123), 'extra_123');
    assert.equal(isExtraTaskKey('extra_123'), true);
    assert.equal(isExtraTaskKey('task_1'), false);
    assert.equal(isExtraTaskKey(undefined), false);
});

test('clasificación del error de guardado idéntica al original', () => {
    const errors = [
        undefined, null, new Error('network down'), new Error('permission_denied'), new Error('Permission denied'), new Error('PERMISSION DENIED at x'),
        Object.assign(new Error('x'), { code: 'PERMISSION_DENIED' }), Object.assign(new Error('x'), { code: 'permission_denied' }),
        { code: 'PERMISSION_DENIED' }, { message: 'permission_denied' }, 'permission denied', { message: 'nope' }, Object.assign(new Error('timeout'), { code: 'NETWORK_ERROR' })
    ];

    for (const error of errors) {
        assert.equal(resolveExtraTaskSaveErrorMessage(error), originalErrorMessage(error), String(error && (error.code || error.message || error)));
    }
    assert.equal(isPermissionDeniedError(new Error('permission_denied')), true);
    assert.equal(isPermissionDeniedError(new Error('otra cosa')), false);
});

test('isKnownExtraTaskStatus acepta los 4 estados del selector (no se aplica en saveExtraTask: hallazgo)', () => {
    for (const status of Object.values(TASK_STATUS)) assert.equal(isKnownExtraTaskStatus(status), true);
    assert.equal(isKnownExtraTaskStatus('Cualquier cosa'), false);
    assert.equal(isKnownExtraTaskStatus(undefined), false);
});

test('validateExceptionInput: primero la razón, luego el detalle (recortado)', () => {
    assert.deepEqual(validateExceptionInput({ reasonValue: '', details: 'x' }), { ok: false, message: EXCEPTION_MESSAGES.REASON_REQUIRED });
    assert.deepEqual(validateExceptionInput({ reasonValue: '', details: '' }), { ok: false, message: EXCEPTION_MESSAGES.REASON_REQUIRED });
    assert.deepEqual(validateExceptionInput({ reasonValue: 'Otro', details: '   ' }), { ok: false, message: EXCEPTION_MESSAGES.DETAILS_REQUIRED });
    assert.deepEqual(validateExceptionInput({ reasonValue: 'Otro', details: null }), { ok: false, message: EXCEPTION_MESSAGES.DETAILS_REQUIRED });
    assert.deepEqual(validateExceptionInput({ reasonValue: 'Otro', details: '  VPN  ' }), { ok: true, details: 'VPN' });
});

test('buildExceptionObservation idéntico al original', () => {
    for (const [reason, details] of [['Sistema Caído', 'VPN caída'], ['Otro', 'x'], ['Reasignada por el Supervisor', 'detalle con - guion'], ['R', '']]) {
        assert.equal(buildExceptionObservation(reason, details), originalObservation(reason, details));
    }
});

summarize();
