/**
 * Pruebas unitarias para multi-select.js.
 *
 * El módulo depende de DOM (document, element.innerHTML, querySelector, etc.).
 * Se crea un mock mínimo de document para cubrir las rutas de código
 * testables sin instalar jsdom.
 */
import { createRunner, assert } from '../../test-harness.mjs';
import {
    setupCustomMultiSelect,
    getSelectedMultiSelectValues,
    resetCustomMultiSelect,
    setCustomMultiSelectValues
} from '../../../ui/components/multi-select.js';

const { test, summarize } = createRunner('multi-select');

// ══════════════════════════════════════════════════════════════════════════
// Mock DOM mínimo
// ══════════════════════════════════════════════════════════════════════════

let _elCounter = 0;

function makeEl(tag = 'div') {
    const el = {
        _tag: tag,
        _classes: new Set(),
        _listeners: {},
        _children: [],
        _queryMap: {},
        _textContent: '',
        _value: '',
        _html: '',
        type: '',
        checked: false,
        tabIndex: 0,
        value: '',
        name: '',
        placeholder: '',
        style: {},
        dataset: {},
        classList: {
            add(c) { el._classes.add(c); },
            remove(c) { el._classes.delete(c); },
            contains(c) { return el._classes.has(c); }
        },
        addEventListener(ev, fn) {
            el._listeners[ev] = el._listeners[ev] || [];
            el._listeners[ev].push(fn);
        },
        _trigger(ev, data = {}) {
            (el._listeners[ev] || []).forEach((fn) => fn({ target: el, stopPropagation() {}, ...data }));
        },
        set innerHTML(html) {
            el._html = html;
            // Semillas de queryMap para los selectores que setupCustomMultiSelect usa
            const btn    = makeEl('div');
            const label  = makeEl('span');
            const opts   = makeEl('div');
            const search = makeEl('input');
            search.value = '';
            const selAll = makeEl('button');
            const clrAll = makeEl('button');

            el._queryMap = {
                '.custom-multiselect-btn':   btn,
                '.multiselect-label':         label,
                '.multiselect-options-list':  opts,
                '.multiselect-search-input':  search,
                '.btn-select-all':            selAll,
                '.btn-clear-all':             clrAll
            };
        },
        get innerHTML() { return el._html; },
        querySelector(sel) { return el._queryMap[sel] ?? null; },
        querySelectorAll()  { return []; },
        appendChild(child)  { el._children.push(child); },
        closest()           { return null; },
        contains(other)     { return other === el; },
        focus()             {},
        get textContent()   { return el._textContent; },
        set textContent(v)  { el._textContent = v; },
        id: `el-${_elCounter++}`
    };
    return el;
}

function buildMockDocument() {
    const store = {};
    return {
        _store: store,
        getElementById(id) {
            if (!store[id]) store[id] = makeEl('div');
            store[id].id = id;
            return store[id];
        },
        createElement(tag) { return makeEl(tag); },
        addEventListener() {}   // registro del listener externo
    };
}

// ══════════════════════════════════════════════════════════════════════════
// setupCustomMultiSelect: caso sin contenedor
// ══════════════════════════════════════════════════════════════════════════

test('retorna noop cuando containerId no existe en el DOM', () => {
    // Sin DOM global, getElementById devolverá null
    const savedDoc = global.document;
    global.document = { getElementById: () => null, createElement: makeEl, addEventListener() {} };

    const api = setupCustomMultiSelect('contenedor-inexistente', ['A', 'B']);

    global.document = savedDoc;

    assert.ok(typeof api.getValues === 'function');
    assert.ok(typeof api.reset    === 'function');
    assert.ok(typeof api.setValues === 'function');
    assert.deepStrictEqual(api.getValues(), []);
});

// ══════════════════════════════════════════════════════════════════════════
// setupCustomMultiSelect con mock DOM completo
// ══════════════════════════════════════════════════════════════════════════

let mockDoc;

function withMockDoc(fn) {
    const saved = global.document;
    global.document = mockDoc;
    try { fn(); } finally { global.document = saved; }
}

// Recrea el mock antes de las pruebas que necesitan DOM
mockDoc = buildMockDocument();

test('getValues retorna [] inmediatamente después de setup', () => {
    withMockDoc(() => {
        const api = setupCustomMultiSelect('ms-1', ['Alfa', 'Beta', 'Gamma']);
        assert.deepStrictEqual(api.getValues(), []);
    });
});

test('setValues selecciona solo los valores que existen en la lista', () => {
    withMockDoc(() => {
        const api = setupCustomMultiSelect('ms-2', ['Alfa', 'Beta', 'Gamma']);
        api.setValues(['Alfa', 'Delta']); // Delta no está en la lista
        const values = api.getValues();
        assert.ok(values.includes('Alfa'));
        assert.ok(!values.includes('Delta'));
    });
});

test('setValues con lista completa selecciona todos los válidos', () => {
    withMockDoc(() => {
        const api = setupCustomMultiSelect('ms-3', ['X', 'Y', 'Z']);
        api.setValues(['X', 'Y', 'Z']);
        const values = api.getValues();
        assert.strictEqual(values.length, 3);
    });
});

test('reset limpia todos los valores seleccionados', () => {
    withMockDoc(() => {
        const api = setupCustomMultiSelect('ms-4', ['A', 'B', 'C']);
        api.setValues(['A', 'B']);
        api.reset();
        assert.deepStrictEqual(api.getValues(), []);
    });
});

test('setValues con array vacío deja selección vacía', () => {
    withMockDoc(() => {
        const api = setupCustomMultiSelect('ms-5', ['A', 'B']);
        api.setValues(['A']);
        api.setValues([]);
        assert.deepStrictEqual(api.getValues(), []);
    });
});

test('setValues con argumento no-array no lanza error', () => {
    withMockDoc(() => {
        const api = setupCustomMultiSelect('ms-6', ['A', 'B']);
        assert.doesNotThrow(() => api.setValues(null));
        assert.deepStrictEqual(api.getValues(), []);
    });
});

test('setValues es un setter silencioso: no dispara onChangeCallback', () => {
    // setValues solo actualiza el estado interno; el callback se dispara
    // solo cuando el usuario interactúa con los checkboxes.
    withMockDoc(() => {
        let callCount = 0;
        const api = setupCustomMultiSelect('ms-7', ['A', 'B', 'C'], () => {
            callCount += 1;
        });
        api.setValues(['A', 'C']);
        // Verifica que los valores sí quedaron seleccionados
        const values = api.getValues();
        assert.ok(values.includes('A'));
        assert.ok(values.includes('C'));
        // El callback NO se llama en setValues (es silencioso)
        assert.strictEqual(callCount, 0);
    });
});

// ══════════════════════════════════════════════════════════════════════════
// Funciones de registro: getSelectedMultiSelectValues, reset, set
// ══════════════════════════════════════════════════════════════════════════

test('getSelectedMultiSelectValues retorna [] para ID no registrado', () => {
    const values = getSelectedMultiSelectValues('id-no-registrado-xyz');
    assert.deepStrictEqual(values, []);
});

test('getSelectedMultiSelectValues devuelve valores actuales del registro', () => {
    withMockDoc(() => {
        setupCustomMultiSelect('ms-reg-1', ['P', 'Q', 'R']);
        setCustomMultiSelectValues('ms-reg-1', ['P', 'R']);
        const values = getSelectedMultiSelectValues('ms-reg-1');
        assert.ok(values.includes('P'));
        assert.ok(values.includes('R'));
        assert.ok(!values.includes('Q'));
    });
});

test('resetCustomMultiSelect no lanza para ID no registrado', () => {
    assert.doesNotThrow(() => resetCustomMultiSelect('id-inexistente-abc'));
});

test('resetCustomMultiSelect limpia valores en el registro', () => {
    withMockDoc(() => {
        setupCustomMultiSelect('ms-reset-1', ['M', 'N']);
        setCustomMultiSelectValues('ms-reset-1', ['M', 'N']);
        resetCustomMultiSelect('ms-reset-1');
        assert.deepStrictEqual(getSelectedMultiSelectValues('ms-reset-1'), []);
    });
});

test('setCustomMultiSelectValues no lanza para ID no registrado', () => {
    assert.doesNotThrow(() =>
        setCustomMultiSelectValues('id-inexistente-def', ['X'])
    );
});

summarize();
