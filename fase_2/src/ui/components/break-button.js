/**
 * Vista de los botones de pausa (desayuno, almuerzo, pausa de turno).
 *
 * Puerto 1:1 de los bloques de estilo que `toggleBreakfastBreak()`, `toggleLunchBreak()` y
 * `toggleSplitShiftBreak()` (app.js 3512-3541, 3553-3582, 3627-3657) y la restauración de botones al
 * cargar la página (app.js 6489-6517) repiten seis veces. Aquí hay una sola descripción por tipo de
 * pausa y una función que la aplica a cualquier objeto con la forma de un botón del DOM.
 */

const INACTIVE_STYLE = Object.freeze({
    backgroundColor: '',
    color: 'var(--text-primary)',
    borderColor: 'rgba(255,255,255,0.2)',
    boxShadow: ''
});

const BUTTON_VIEWS = Object.freeze({
    breakfast: Object.freeze({
        activeHtml: "<i class='bx bx-check-circle'></i> Volver del Desayuno",
        inactiveHtml: "<i class='bx bx-coffee'></i> Tomar Desayuno",
        active: Object.freeze({
            backgroundColor: 'rgba(255, 152, 0, 0.15)',
            color: '#ff9800',
            borderColor: 'rgba(255, 152, 0, 0.5)',
            boxShadow: '0 0 15px rgba(255, 152, 0, 0.2)'
        })
    }),
    lunch: Object.freeze({
        activeHtml: "<i class='bx bx-check-circle'></i> Volver del Almuerzo/Cena",
        inactiveHtml: "<i class='bx bx-restaurant'></i> Tomar Almuerzo/Cena",
        active: Object.freeze({
            backgroundColor: 'rgba(0, 188, 212, 0.15)',
            color: '#00bcd4',
            borderColor: 'rgba(0, 188, 212, 0.5)',
            boxShadow: '0 0 15px rgba(0, 188, 212, 0.2)'
        })
    }),
    split: Object.freeze({
        activeHtml: "<i class='bx bx-check-circle'></i> Retomar Turno",
        inactiveHtml: "<i class='bx bx-pause-circle'></i> Pausa de Turno",
        active: Object.freeze({
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            color: '#8b5cf6',
            borderColor: 'rgba(139, 92, 246, 0.5)',
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.2)'
        })
    })
});

/** IDs de los botones en index.html. */
export const BREAK_BUTTON_IDS = Object.freeze({
    breakfast: 'toggleBreakfastBtn',
    lunch: 'toggleLunchBtn',
    split: 'toggleSplitShiftBtn'
});

/**
 * Descripción visual del botón de una pausa.
 *
 * @param {'breakfast'|'lunch'|'split'} kind
 * @param {boolean} active `true` si la pausa está en curso.
 * @returns {{innerHTML: string, outline: boolean, backgroundColor: string, color: string, borderColor: string, boxShadow: string}}
 */
export function getBreakButtonView(kind, active) {
    const config = BUTTON_VIEWS[kind];

    if (!config) {
        throw new Error(`Tipo de pausa desconocido: ${kind}`);
    }

    return active
        ? { innerHTML: config.activeHtml, outline: false, ...config.active }
        : { innerHTML: config.inactiveHtml, outline: true, ...INACTIVE_STYLE };
}

/**
 * Aplica la vista a un botón (real o simulado: `innerHTML`, `style`, `classList`).
 * No hace nada si el botón no existe, igual que los `if (btn)` de app.js.
 *
 * @param {{innerHTML: string, style: object, classList: {add: Function, remove: Function}}|null} button
 * @param {'breakfast'|'lunch'|'split'} kind
 * @param {boolean} active
 */
export function applyBreakButtonView(button, kind, active) {
    if (!button) return;

    const view = getBreakButtonView(kind, active);

    button.innerHTML = view.innerHTML;

    if (view.outline) {
        button.classList.add('btn-outline');
    } else {
        button.classList.remove('btn-outline');
    }

    button.style.backgroundColor = view.backgroundColor;
    button.style.color = view.color;
    button.style.borderColor = view.borderColor;
    button.style.boxShadow = view.boxShadow;
}
