import { createRunner, assert } from '../test-harness.mjs';
import { getBreakButtonView, applyBreakButtonView, BREAK_BUTTON_IDS } from '../../ui/components/break-button.js';

/** Los textos y colores esperados son copias LITERALES de app.js 3512-3582, 3627-3657 y 6489-6517. */
const { test, summarize } = createRunner('break-button.js (puerto 1:1 de los estilos de app.js)');

const LEGACY = {
    breakfast: {
        activeHtml: "<i class='bx bx-check-circle'></i> Volver del Desayuno", inactiveHtml: "<i class='bx bx-coffee'></i> Tomar Desayuno",
        bg: 'rgba(255, 152, 0, 0.15)', color: '#ff9800', border: 'rgba(255, 152, 0, 0.5)', shadow: '0 0 15px rgba(255, 152, 0, 0.2)'
    },
    lunch: {
        activeHtml: "<i class='bx bx-check-circle'></i> Volver del Almuerzo/Cena", inactiveHtml: "<i class='bx bx-restaurant'></i> Tomar Almuerzo/Cena",
        bg: 'rgba(0, 188, 212, 0.15)', color: '#00bcd4', border: 'rgba(0, 188, 212, 0.5)', shadow: '0 0 15px rgba(0, 188, 212, 0.2)'
    },
    split: {
        activeHtml: "<i class='bx bx-check-circle'></i> Retomar Turno", inactiveHtml: "<i class='bx bx-pause-circle'></i> Pausa de Turno",
        bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.5)', shadow: '0 0 15px rgba(139, 92, 246, 0.2)'
    }
};

function fakeButton() {
    const classes = new Set(['btn-outline']);
    return { innerHTML: '', style: {}, classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) }, has: (c) => classes.has(c) };
}

for (const kind of Object.keys(LEGACY)) {
    const L = LEGACY[kind];

    test(`${kind}: pausa en curso = texto, colores y sombra idénticos a app.js, sin btn-outline`, () => {
        const b = fakeButton();
        applyBreakButtonView(b, kind, true);
        assert.equal(b.innerHTML, L.activeHtml);
        assert.equal(b.style.backgroundColor, L.bg);
        assert.equal(b.style.color, L.color);
        assert.equal(b.style.borderColor, L.border);
        assert.equal(b.style.boxShadow, L.shadow);
        assert.equal(b.has('btn-outline'), false);
    });

    test(`${kind}: sin pausa = texto por defecto, estilo limpio y btn-outline`, () => {
        const b = fakeButton();
        applyBreakButtonView(b, kind, true);
        applyBreakButtonView(b, kind, false);
        assert.equal(b.innerHTML, L.inactiveHtml);
        assert.equal(b.style.backgroundColor, '');
        assert.equal(b.style.color, 'var(--text-primary)');
        assert.equal(b.style.borderColor, 'rgba(255,255,255,0.2)');
        assert.equal(b.style.boxShadow, '');
        assert.equal(b.has('btn-outline'), true);
    });
}

test('un botón inexistente (null) no lanza, igual que los `if (btn)` de app.js', () => {
    applyBreakButtonView(null, 'lunch', true);
    applyBreakButtonView(undefined, 'split', false);
});

test('tipo de pausa desconocido lanza error', () => {
    assert.throws(() => getBreakButtonView('siesta', true), /desconocido/);
});

test('IDs de botones = los de index.html', () => {
    assert.deepEqual({ ...BREAK_BUTTON_IDS }, { breakfast: 'toggleBreakfastBtn', lunch: 'toggleLunchBtn', split: 'toggleSplitShiftBtn' });
});

summarize();
