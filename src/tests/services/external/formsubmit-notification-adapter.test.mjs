import { createRunner, assert } from '../../test-harness.mjs';
import { appendFormSubmitCc, FORM_SUBMIT_CC } from '../../../services/external/formsubmit-notification-adapter.js';

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

test('conserva todas las entradas del FormData', () => {
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

test('W-13 (NOTA_3): muta y devuelve el MISMO FormData (contrato de app.js)', () => {
    const original = new FormData();
    original.append('campo', 'valor');

    const result = appendFormSubmitCc(original);

    assert.strictEqual(result, original, 'mismo objeto');
    assert.strictEqual(original.get('_cc'), DEFAULT_CC, 'el original lleva la copia aunque el llamador ignore el valor');
});

test('W-13: es idempotente (dos llamadas no duplican _cc); otra dirección sí se agrega', () => {
    const fd = new FormData();
    appendFormSubmitCc(fd);
    appendFormSubmitCc(fd);
    assert.deepStrictEqual(fd.getAll('_cc'), [DEFAULT_CC]);
    appendFormSubmitCc(fd, 'otro@example.com');
    assert.deepStrictEqual(fd.getAll('_cc'), [DEFAULT_CC, 'otro@example.com']);
});

test('W-13: mismo resultado que app.js (l. 5-7) para un llamador que ignora el valor devuelto', () => {
    const legacyAppend = (formData) => { formData.append('_cc', DEFAULT_CC); };
    const a = new FormData(); a.append('x', '1');
    const b = new FormData(); b.append('x', '1');
    legacyAppend(a);
    appendFormSubmitCc(b);
    assert.deepStrictEqual([...b.entries()], [...a.entries()]);
});

test('W-40: FORM_SUBMIT_CC es la única declaración y vale lo mismo que en app.js', () => {
    assert.strictEqual(FORM_SUBMIT_CC, 'sara.santamaria@virtualsoft.tech,oriana.borja@virtualsoft.tech');
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
