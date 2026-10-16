/**
 * Pruebas unitarias del paso 3.4 (navegación y modales) sobre DOM falso:
 *  - `bindModalDismissal` (ui/components/modal.js, W-22/W-23): clic en el fondo cierra solo el modal registrado;
 *    Escape quita `active` de todos los overlays; el desregistro retira ambos listeners.
 *  - `filterTasksByAssignee` (ui/views/task-tree-view.js, W-22): "Todos" muestra todo; un responsable filtra sin
 *    acentos ni mayúsculas.
 *  - `unifyHorarioAndTeletrabajo` (app/app-router.js, W-20): fusiona una sola vez y deja la pestaña única.
 *
 * Se ejecuta con: node src/tests/ui/navigation-dismissal.test.mjs
 */
import { createRunner, assert } from '../test-harness.mjs';
import { bindModalDismissal } from '../../ui/components/modal.js';
import { filterTasksByAssignee } from '../../ui/views/task-tree-view.js';
import { unifyHorarioAndTeletrabajo } from '../../app/app-router.js';

const { test, summarize } = createRunner('navegación y modales (paso 3.4)');

/** Elemento falso con classList, style y listas de hijos mínimas. */
function fakeEl(id = '', extra = {}) {
    const classes = new Set();
    return {
        id, style: {}, innerHTML: '', innerText: '', textContent: '', className: '', children: [],
        classList: {
            add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c),
            _set: classes
        },
        getAttribute(name) { return this[`__attr_${name}`] ?? null; },
        setAttribute(name, value) { this[`__attr_${name}`] = value; },
        querySelector: () => null,
        querySelectorAll: () => [],
        ...extra
    };
}

/** Ventana falsa con registro de listeners. */
function fakeWindow() {
    const handlers = {};
    return {
        handlers,
        addEventListener(type, fn) { (handlers[type] ||= []).push(fn); },
        removeEventListener(type, fn) { handlers[type] = (handlers[type] || []).filter((f) => f !== fn); },
        emit(type, event) { (handlers[type] || []).slice().forEach((fn) => fn(event)); }
    };
}

test('bindModalDismissal: clic en el fondo de un modal registrado lo cierra; clic dentro no', () => {
    const overlay = fakeEl('kpiTaskDetailsModal');
    const inside = fakeEl('contenido');
    const doc = { getElementById: (id) => (id === 'kpiTaskDetailsModal' ? overlay : null), querySelectorAll: () => [] };
    const win = fakeWindow();
    let cerrados = 0;
    bindModalDismissal({ win, doc, backdrops: [{ id: 'kpiTaskDetailsModal', close: () => { cerrados++; } }] });

    win.emit('click', { target: inside });
    assert.equal(cerrados, 0, 'un clic dentro del contenido no cierra');
    win.emit('click', { target: overlay });
    assert.equal(cerrados, 1, 'un clic en el fondo sí cierra');
});

test('bindModalDismissal: Escape quita active de todos los overlays abiertos; otras teclas no', () => {
    const a = fakeEl('a'); const b = fakeEl('b');
    a.classList.add('active'); b.classList.add('active');
    const doc = { getElementById: () => null, querySelectorAll: (sel) => (sel === '.modal-overlay.active' ? [a, b].filter((m) => m.classList.contains('active')) : []) };
    const win = fakeWindow();
    bindModalDismissal({ win, doc });

    win.emit('keydown', { key: 'Enter' });
    assert.equal(a.classList.contains('active'), true, 'Enter no cierra');
    win.emit('keydown', { key: 'Escape' });
    assert.equal(a.classList.contains('active'), false);
    assert.equal(b.classList.contains('active'), false);
});

test('bindModalDismissal: el desregistro retira ambos listeners y devuelve la función de limpieza', () => {
    const win = fakeWindow();
    const doc = { getElementById: () => null, querySelectorAll: () => [] };
    const unbind = bindModalDismissal({ win, doc, backdrops: [{ id: 'x', close: () => {} }] });
    assert.equal(win.handlers.click.length, 1);
    assert.equal(win.handlers.keydown.length, 1);
    assert.equal(typeof unbind, 'function');
    unbind();
    assert.equal(win.handlers.click.length, 0, 'sin listener de clic');
    assert.equal(win.handlers.keydown.length, 0, 'sin listener de teclado');
});

test('filterTasksByAssignee: "Todos" muestra todas; un responsable oculta el resto sin importar acentos', () => {
    const t1 = fakeEl('t1'); t1.setAttribute('data-assignee', 'Ana Pérez');
    const t2 = fakeEl('t2'); t2.setAttribute('data-assignee', 'Luis Gómez');
    const t3 = fakeEl('t3'); // sin data-assignee
    const doc = { querySelectorAll: (sel) => (sel === '.task-item' ? [t1, t2, t3] : []) };

    filterTasksByAssignee(doc, 'Todos');
    assert.deepEqual([t1.style.display, t2.style.display, t3.style.display], ['', '', '']);

    filterTasksByAssignee(doc, 'ana perez');
    assert.deepEqual([t1.style.display, t2.style.display, t3.style.display], ['', 'none', 'none']);
});

test('unifyHorarioAndTeletrabajo: deja una sola pestaña y fusiona la vista una vez (idempotente)', () => {
    const navHorario = fakeEl('navHorario');
    const navTeletrabajo = fakeEl('navTeletrabajo');
    const panelTele = fakeEl('panelTele', { querySelector: () => null, insertBefore() {} });
    const viewTeletrabajo = fakeEl('view-teletrabajo', { querySelector: (s) => (s === '.glass-panel' ? panelTele : null) });
    const hrPanel = fakeEl('hrPanel', { querySelector: () => null, firstChild: null, insertBefore() {} });
    const viewHorario = fakeEl('view-horario', {
        querySelector: (s) => (s === '.glass-panel' ? hrPanel : (s === '.panel-title' ? fakeEl('title') : null)),
        appendChild(node) { this.appended = node; }
    });
    const created = [];
    const porId = { navHorario, navTeletrabajo, 'view-horario': viewHorario, 'view-teletrabajo': viewTeletrabajo };
    const doc = {
        getElementById: (id) => porId[id] || null,
        createElement: () => { const h = fakeEl('h3'); created.push(h); return h; }
    };
    unifyHorarioAndTeletrabajo(doc);
    assert.equal(panelTele.id, 'mergedTeletrabajoPanel');
    porId.mergedTeletrabajoPanel = panelTele; // tras la primera fusión, el panel ya tiene ese id
    unifyHorarioAndTeletrabajo(doc);
    assert.equal(created.length, 2, 'la segunda llamada no crea más encabezados');
    assert.equal(viewHorario.appended, panelTele);
    assert.equal(navHorario.style.display, 'flex');
    assert.equal(navTeletrabajo.style.display, 'none');
    assert.equal(navHorario.innerHTML.includes('Horario y Teletrabajo'), true);
    assert.equal(viewHorario.appended, panelTele, 'el panel de teletrabajo pasa a la vista de horario');
});

summarize();
