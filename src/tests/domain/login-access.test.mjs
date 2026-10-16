/**
 * Reglas de acceso de la página de login (paso 3.4, W-29): `evaluateLoginAccess`, `validateRegistrationInput` y
 * `normalizeRegistrationRole` de auth-service.js. Son las mismas que usa login-controller.js.
 *
 * Se ejecuta con: node src/tests/domain/login-access.test.mjs
 */
import { createRunner, assert } from '../test-harness.mjs';
import {
    evaluateLoginAccess,
    validateRegistrationInput,
    normalizeRegistrationRole,
    LOGIN_ACCESS,
    REGISTER_MESSAGES
} from '../../domain/auth/auth-service.js';

const { test, summarize } = createRunner('reglas de acceso del login (paso 3.4)');

test('un usuario rechazado con approved "Rechazado" NO entra (defecto W-29 b)', () => {
    const result = evaluateLoginAccess({ approved: 'Rechazado', rejectionReason: 'Datos incompletos' }, false);
    assert.equal(result.status, LOGIN_ACCESS.REJECTED);
    assert.equal(result.reason, 'Datos incompletos');
});

test('rejected === true también rechaza', () => {
    assert.equal(evaluateLoginAccess({ approved: true, rejected: true }, false).status, LOGIN_ACCESS.REJECTED);
});

test('approved false o sin valor queda pendiente', () => {
    assert.equal(evaluateLoginAccess({ approved: false }, false).status, LOGIN_ACCESS.PENDING);
    assert.equal(evaluateLoginAccess({}, false).status, LOGIN_ACCESS.PENDING);
});

test('perfil aprobado con turno vencido → SHIFT_EXPIRED; sin vencer → ALLOWED', () => {
    assert.equal(evaluateLoginAccess({ approved: true }, true).status, LOGIN_ACCESS.SHIFT_EXPIRED);
    assert.equal(evaluateLoginAccess({ approved: true }, false).status, LOGIN_ACCESS.ALLOWED);
});

test('sin perfil se trata como rechazado (fail-closed)', () => {
    assert.equal(evaluateLoginAccess(null, false).status, LOGIN_ACCESS.REJECTED);
});

test('registro: las contraseñas se comparan antes que el nombre (como login.js)', () => {
    assert.equal(validateRegistrationInput({ name: 'A', password: 'x', confirmPassword: 'y' }), REGISTER_MESSAGES.PASSWORDS_MISMATCH);
});

test('registro: el nombre necesita dos palabras de dos o más letras', () => {
    const ok = { password: 'abcdef', confirmPassword: 'abcdef' };
    assert.equal(validateRegistrationInput({ ...ok, name: 'Ana' }), REGISTER_MESSAGES.NAME_MIN_WORDS);
    assert.equal(validateRegistrationInput({ ...ok, name: 'Ana B' }), REGISTER_MESSAGES.NAME_MIN_WORDS);
    assert.equal(validateRegistrationInput({ ...ok, name: '  Ana   Pérez ' }), null);
});

test('registro: el mensaje de nombre es el de login.js', () => {
    assert.equal(REGISTER_MESSAGES.NAME_MIN_WORDS, 'Por favor, ingresa tu nombre y apellido completo (mínimo dos palabras).');
});

test('rol de registro: solo Supervisor se respeta; cualquier otro valor es Gestor', () => {
    assert.equal(normalizeRegistrationRole('Supervisor'), 'Supervisor');
    assert.equal(normalizeRegistrationRole('Gestor'), 'Gestor');
    assert.equal(normalizeRegistrationRole('Admin'), 'Gestor');
    assert.equal(normalizeRegistrationRole(''), 'Gestor');
});

summarize();
