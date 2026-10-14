import { createRunner, assert } from '../../test-harness.mjs';
import { appendFormSubmitCc } from '../../../services/external/formsubmit-notification-adapter.js';

const { test, summarize } = createRunner('formsubmit-notification-adapter');

const DEFAULT_CC =
    'sara.santamaria@virtualsoft.tech,oriana.borja@virtualsoft.tech';

// ── Validación de tipo ─────────────────────────────────────────────────────

test('lanza TypeError si el argumento no es FormData', () => {
    assert.throws(
        () => appendFormSubmitCc({}),
        TypeError
    );
});

test('lanza TypeError para null', () => {
    assert.throws(
        () => appendFormSubmitCc(null),
        TypeError
    );
});

test('lanza TypeError para string', () => {
    assert.throws(
        () => appendFormSubmitCc('form-data'),
        TypeError
    );
});

// ── Copia de entradas ──────────────────────────────────────────────────────

test('copia todas las entradas del FormData original', () => {
    const original = new FormData();
    original.append('campo1', 'valor1');
    original.append('campo2', 'valor2');

    const result = appendFormSubmitCc(original);

    assert.strictEqual(result.get('campo1'), 'valor1');
    assert.strictEqual(result.get('campo2'), 'valor2');
});

test('agrega _cc con el valor por defecto', () => {
    const original = new FormData();
    original.append('campo', 'x');

    const result = appendFormSubmitCc(original);

    assert.strictEqual(result.get('_cc'), DEFAULT_CC);
});

test('agrega _cc con el valor de carbonCopy personalizado', () => {
    const original = new FormData();
    const customCc = 'otro@example.com';

    const result = appendFormSubmitCc(original, customCc);

    assert.strictEqual(result.get('_cc'), customCc);
});

test('no muta el FormData original', () => {
    const original = new FormData();
    original.append('campo', 'valor');

    appendFormSubmitCc(original);

    // El original no debe tener _cc
    assert.strictEqual(original.get('_cc'), null);
});

test('FormData vacío produce resultado solo con _cc', () => {
    const original = new FormData();
    const result = appendFormSubmitCc(original);

    const entries = [...result.entries()];
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0][0], '_cc');
    assert.strictEqual(entries[0][1], DEFAULT_CC);
});

test('preserva múltiples valores para la misma clave', () => {
    const original = new FormData();
    original.append('campo', 'v1');
    original.append('campo', 'v2');

    const result = appendFormSubmitCc(original);

    const values = result.getAll('campo');
    assert.strictEqual(values.length, 2);
    assert.strictEqual(values[0], 'v1');
    assert.strictEqual(values[1], 'v2');
});

summarize();
