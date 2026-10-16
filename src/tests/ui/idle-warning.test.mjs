/**
 * Pruebas unitarias del banner de inactividad (paso 3.3, W-24): `setIdleDetectorWarning` (ui/components/idle-warning.js).
 *  - Con mensaje y visible: escribe el texto y muestra el banner (display flex).
 *  - Sin mensaje: conserva el texto anterior.
 *  - Oculto: display none.
 *  - Sin los elementos del banner no lanza error.
 *
 * Se ejecuta con: node src/tests/ui/idle-warning.test.mjs
 */
import { createRunner, assert } from '../test-harness.mjs';
import { setIdleDetectorWarning } from '../../ui/components/idle-warning.js';

const { test, summarize } = createRunner('banner de inactividad (paso 3.3)');

/** Documento falso con los dos elementos del banner. */
function fakeDoc({ banner = true, text = true } = {}) {
    const elements = {};
    if (banner) elements.idleDetectorWarning = { style: { display: 'none' } };
    if (text) elements.idleDetectorWarningText = { textContent: 'texto inicial' };
    return { elements, getElementById: (id) => elements[id] || null };
}

test('mensaje y visible: escribe el texto y muestra el banner en flex', () => {
    const doc = fakeDoc();
    setIdleDetectorWarning(doc, true, 'Permiso pendiente.');
    assert.equal(doc.elements.idleDetectorWarningText.textContent, 'Permiso pendiente.');
    assert.equal(doc.elements.idleDetectorWarning.style.display, 'flex');
});

test('oculto: el banner queda en display none', () => {
    const doc = fakeDoc();
    doc.elements.idleDetectorWarning.style.display = 'flex';
    setIdleDetectorWarning(doc, false);
    assert.equal(doc.elements.idleDetectorWarning.style.display, 'none');
});

test('sin mensaje: conserva el texto anterior y solo cambia la visibilidad', () => {
    const doc = fakeDoc();
    setIdleDetectorWarning(doc, true);
    assert.equal(doc.elements.idleDetectorWarningText.textContent, 'texto inicial');
    assert.equal(doc.elements.idleDetectorWarning.style.display, 'flex');
});

test('mensaje vacío explícito: no sustituye el texto', () => {
    const doc = fakeDoc();
    setIdleDetectorWarning(doc, true, '');
    assert.equal(doc.elements.idleDetectorWarningText.textContent, 'texto inicial');
});

test('sin el banner en el documento: escribe el texto y no lanza error', () => {
    const doc = fakeDoc({ banner: false });
    setIdleDetectorWarning(doc, true, 'Aviso');
    assert.equal(doc.elements.idleDetectorWarningText.textContent, 'Aviso');
});

test('sin el texto en el documento: muestra el banner y no lanza error', () => {
    const doc = fakeDoc({ text: false });
    setIdleDetectorWarning(doc, true, 'Aviso');
    assert.equal(doc.elements.idleDetectorWarning.style.display, 'flex');
});

summarize();
