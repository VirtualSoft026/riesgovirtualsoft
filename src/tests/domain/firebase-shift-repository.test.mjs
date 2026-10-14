import { createRunner, assert } from '../test-harness.mjs';
import { createShiftRepository } from '../../services/firebase/firebase-shift-repository.js';
import { restoreEndShiftButton } from '../../ui/components/end-shift-button.js';

const { test, summarize } = createRunner('firebase-shift-repository.js + end-shift-button.js');

const TS = { '.sv': 'timestamp' };

function createFakeDatabase({ key = 'KEY1', failUpdate = false } = {}) {
    const calls = { updates: [], pushes: 0 };
    const database = {
        ref(path) {
            if (path === 'shift_reports') {
                return { push() { calls.pushes += 1; return { key }; } };
            }
            return {
                async update(updates) {
                    if (failUpdate) throw new Error('permission_denied');
                    calls.updates.push(updates);
                }
            };
        }
    };
    return { database, calls };
}

// Los escenarios asíncronos se resuelven antes de las pruebas (el arnés no espera promesas).
const ok = createFakeDatabase();
const okRepo = createShiftRepository({ database: ok.database, serverTimestamp: TS });
const okKey = await okRepo.persistShiftClosureCore('uid1', 'log1', { gestor: 'Ana' });

const noUid = createFakeDatabase();
const noUidErr = await createShiftRepository({ database: noUid.database, serverTimestamp: TS })
    .persistShiftClosureCore('', 'log1', {}).then(() => null, (e) => e);

const noLog = createFakeDatabase();
const noLogErr = await createShiftRepository({ database: noLog.database, serverTimestamp: TS })
    .persistShiftClosureCore('uid1', '', {}).then(() => null, (e) => e);

const noKey = createFakeDatabase({ key: null });
const noKeyErr = await createShiftRepository({ database: noKey.database, serverTimestamp: TS })
    .persistShiftClosureCore('uid1', 'log1', {}).then(() => null, (e) => e);

const failing = createFakeDatabase({ failUpdate: true });
const failErr = await createShiftRepository({ database: failing.database, serverTimestamp: TS })
    .persistShiftClosureCore('uid1', 'log1', {}).then(() => null, (e) => e);

test('persistShiftClosureCore devuelve la llave del reporte', () => {
    assert.equal(okKey, 'KEY1');
});

test('persistShiftClosureCore hace UNA sola escritura multi-ruta con las 3 rutas esperadas', () => {
    assert.equal(ok.calls.updates.length, 1);
    assert.deepEqual(ok.calls.updates[0], {
        'shift_reports/KEY1': { gestor: 'Ana' },
        'active_sessions/uid1': null,
        'login_logs/log1/logoutTime': TS
    });
});

test('persistShiftClosureCore exige UID', () => {
    assert.match(noUidErr.message, /Missing authenticated UID/);
    assert.equal(noUid.calls.pushes, 0);
    assert.equal(noUid.calls.updates.length, 0);
});

test('persistShiftClosureCore exige loginLogId (sin escribir nada)', () => {
    assert.match(noLogErr.message, /Missing login log ID/);
    assert.equal(noLog.calls.updates.length, 0);
});

test('persistShiftClosureCore falla si no se puede asignar la llave del reporte', () => {
    assert.match(noKeyErr.message, /Unable to allocate/);
    assert.equal(noKey.calls.updates.length, 0);
});

test('persistShiftClosureCore propaga el error de Firebase sin escrituras parciales', () => {
    assert.match(failErr.message, /permission_denied/);
    assert.equal(failing.calls.updates.length, 0);
});

test('restoreEndShiftButton restaura el HTML previo y rehabilita el botón', () => {
    const btn = { innerHTML: 'Notificando...', disabled: true };
    restoreEndShiftButton(btn, '<b>Finalizar</b>');
    assert.equal(btn.innerHTML, '<b>Finalizar</b>');
    assert.equal(btn.disabled, false);
});

test('restoreEndShiftButton usa el texto por defecto si no hay HTML previo', () => {
    const btn = { innerHTML: 'x', disabled: true };
    restoreEndShiftButton(btn, '');
    assert.equal(btn.innerHTML, "<i class='bx bx-log-out-circle'></i> Finalizar Turno");
    assert.equal(btn.disabled, false);
});

test('restoreEndShiftButton no falla con botón nulo', () => {
    assert.doesNotThrow(() => restoreEndShiftButton(null, 'x'));
});

summarize();
