/**
 * Pruebas unitarias de la delegación por `data-action` (W-50, sin `onclick` inline) sobre DOM falso:
 *  - `findActionTarget`: encuentra el ancestro (o el propio nodo) con la acción; ignora otras acciones.
 *  - `bindActionDelegation`: un clic dentro del elemento con la acción llama al manejador con ese elemento; un clic
 *    fuera no; desenlazar retira el listener; enlazar de nuevo la misma acción sustituye al anterior.
 *  - `bindApproveUserDelegation`/`bindTreeToggleDelegation`: el enlace de cada acción de la app funciona sobre el
 *    marcado que generan los componentes.
 *
 * Se ejecuta con: node src/tests/ui/action-delegation.test.mjs
 */
import { createRunner, assert } from '../test-harness.mjs';
import { createApprovalsController } from '../../controllers/approvals-controller.js';
import { findActionTarget, bindActionDelegation } from '../../utils/action-delegation.js';
import { APPROVE_USER_ACTION, buildUserActionHtml } from '../../ui/components/pending-users-table.js';
import { TOGGLE_TREE_ACTION, bindTreeToggleDelegation } from '../../ui/components/tree-toggle.js';

const { test, testAsync, summarizeAsync } = createRunner('delegación data-action (W-50)');

/** Nodo falso con padre, atributos y `closest` real sobre la cadena de padres. */
function node(tag, attrs = {}, parent = null) {
    const n = {
        tagName: tag, attrs, parentNode: parent, classList: { toggle() {}, contains: () => false },
        getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; },
        closest(selector) {
            const m = /^\[data-action="([^"]+)"\]$/.exec(selector);
            let cur = this;
            while (cur) {
                if (m && cur.attrs['data-action'] === m[1]) return cur;
                cur = cur.parentNode;
            }
            return null;
        }
    };
    return n;
}

/** Documento falso con listeners de `click` y despacho síncrono. */
function fakeDoc() {
    const listeners = new Map();
    return {
        addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
        removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
        click(target) { [...(listeners.get('click') || [])].forEach((fn) => fn({ target })); },
        count() { return listeners.get('click')?.size || 0; }
    };
}

test('findActionTarget: el propio nodo o un ancestro con la acción; otras acciones y nulos -> null', () => {
    const header = node('div', { 'data-action': 'toggle-tree' });
    const icon = node('i', {}, header);
    assert.equal(findActionTarget(header, 'toggle-tree'), header);
    assert.equal(findActionTarget(icon, 'toggle-tree'), header);
    assert.equal(findActionTarget(icon, 'approve-user'), null);
    assert.equal(findActionTarget(null, 'toggle-tree'), null);
    assert.equal(findActionTarget({}, 'toggle-tree'), null);
});

test('bindActionDelegation: clic dentro del elemento -> manejador con ese elemento; clic fuera -> nada', () => {
    const doc = fakeDoc();
    const row = node('div', { 'data-action': 'x', 'data-id': '7' });
    const inner = node('span', {}, row);
    const outside = node('p');
    const seen = [];
    bindActionDelegation(doc, 'x', (el) => seen.push(el.getAttribute('data-id')));

    doc.click(inner);
    doc.click(outside);
    assert.deepEqual(seen, ['7']);
});

test('bindActionDelegation: desenlazar retira el listener; no vuelve a llamar', () => {
    const doc = fakeDoc();
    let calls = 0;
    const unbind = bindActionDelegation(doc, 'x', () => { calls += 1; });
    doc.click(node('div', { 'data-action': 'x' }));
    unbind();
    doc.click(node('div', { 'data-action': 'x' }));
    assert.equal(calls, 1);
    assert.equal(doc.count(), 0);
});

test('bindActionDelegation: enlazar de nuevo la misma acción sustituye al anterior (sin doble llamada)', () => {
    const doc = fakeDoc();
    const llamadas = [];
    bindActionDelegation(doc, 'x', () => llamadas.push('primero'));
    const unbindSegundo = bindActionDelegation(doc, 'x', () => llamadas.push('segundo'));
    doc.click(node('div', { 'data-action': 'x' }));
    assert.deepEqual(llamadas, ['segundo']);
    assert.equal(doc.count(), 1);
    unbindSegundo();
    assert.equal(doc.count(), 0);
});

test('bindActionDelegation: sin addEventListener en el documento no hace nada y devuelve desenlace inocuo', () => {
    const unbind = bindActionDelegation({}, 'x', () => { throw new Error('no debe llamarse'); });
    assert.equal(typeof unbind, 'function');
    unbind();
});

test('marcado de "Aprobar usuario": data-action y id escapado, sin onclick', () => {
    const html = buildUserActionHtml({ id: 'a\'b"c', approved: false });
    assert.ok(html.includes(`data-action="${APPROVE_USER_ACTION}" data-user-id="a&#039;b&quot;c"`));
    assert.ok(!html.includes('onclick="approveUser('));
    assert.ok(html.includes('data-action="show-user-reject-box" data-user-id="a&#039;b&quot;c"'), 'Rechazar también delegado (paso 3.4)');
    assert.ok(!html.includes('onclick='), 'ningún onclick inline');
});

test('bindTreeToggleDelegation: clic en el encabezado alterna "open" y el hermano "show"', () => {
    const doc = fakeDoc();
    const classes = (initial) => {
        const set = new Set(initial);
        return { set, classList: { toggle(c) { set.has(c) ? set.delete(c) : set.add(c); }, contains: (c) => set.has(c) } };
    };
    const header = { ...node('div', { 'data-action': TOGGLE_TREE_ACTION }), ...classes([]) };
    const children = classes([]);
    header.nextElementSibling = children;

    bindTreeToggleDelegation(doc);
    doc.click(header);
    assert.ok(header.set.has('open'));
    assert.ok(children.set.has('show'));
    doc.click(header);
    assert.ok(!header.set.has('open'));
    assert.ok(!children.set.has('show'));
});

testAsync('controlador de aprobaciones: el clic en "Aprobar" (data-action) escribe la aprobación del usuario indicado', async () => {
    const doc = fakeDoc();
    const escrituras = [];
    const repository = {
        fetchUsers: async () => [],
        approveUser: async (id, fecha) => { escrituras.push([id, typeof fecha]); }
    };
    createApprovalsController({
        doc: { ...doc, getElementById: () => null, querySelectorAll: () => [] },
        repository,
        alert: () => {},
        confirm: () => true,
        getUser: () => ({ role: 'Admin', approved: true })
    });
    const boton = node('button', { 'data-action': APPROVE_USER_ACTION, 'data-user-id': 'u 1' });
    doc.click(node('span', {}, boton));

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(escrituras, [['u 1', 'string']]);
});

await summarizeAsync();
