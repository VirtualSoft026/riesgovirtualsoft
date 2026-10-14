/**
 * Utilidades de prueba del corte "KPIs, analítica y gráficas": reloj fijo, DOM simulado, Chart simulado,
 * normalización de configuraciones de Chart.js (las funciones se comparan por lo que devuelven) y datos
 * pseudoaleatorios con semilla. Solo para pruebas; no se importa desde `src/`.
 */

/** Generador pseudoaleatorio determinista (mulberry32). */
export function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** `Date` con "ahora" fijo: `new Date()` y `Date.now()` devuelven `nowMs`. */
export function makeFixedDate(nowMs) {
    return class FixedDate extends Date {
        constructor(...args) {
            if (args.length === 0) super(nowMs); else super(...args);
        }
        static now() { return nowMs; }
    };
}

/** Elemento DOM mínimo que registra lo que el código le escribe. */
export function makeElement(id) {
    const el = {
        id, style: {}, innerHTML: '', textContent: '', innerText: '', value: '', className: '', title: '', src: '',
        children: [], options: [], selectedIndex: 0, parentElement: null, previousElementSibling: null,
        _classes: new Set(),
        classList: {
            add(c) { el._classes.add(c); }, remove(c) { el._classes.delete(c); }, contains(c) { return el._classes.has(c); }
        },
        appendChild(child) { el.children.push(child); return child; },
        getContext(kind) { return { canvasId: id, kind }; },
        get outerHTML() { return `<outer id="${id}">${el.innerHTML}</outer>`; }
    };
    return el;
}

/** DOM simulado: `getElementById` crea elementos al pedirlos, salvo los ids de `missing`. */
export function makeDom({ missing = [] } = {}) {
    const els = new Map();
    const missingSet = new Set(missing);
    const created = [];
    const dom = {
        els,
        getElementById(id) {
            if (missingSet.has(id)) return null;
            if (!els.has(id)) els.set(id, makeElement(id));
            return els.get(id);
        },
        querySelector(selector) {
            return dom.getElementById('qs:' + selector);
        },
        createElement(tag) {
            const e = makeElement('new:' + tag);
            e.tag = tag;
            created.push(e);
            return e;
        },
        created
    };
    return dom;
}

/** Fotografía comparable de los elementos tocados (sin funciones). */
export function snapshotDom(dom) {
    const snap = {};
    const pick = (e) => ({
        style: { ...e.style }, innerHTML: e.innerHTML, textContent: e.textContent, innerText: e.innerText,
        value: e.value, className: e.className, title: e.title, src: e.src, classes: [...e._classes].sort(),
        children: e.children.map(pick), tag: e.tag
    });
    for (const [id, e] of dom.els) snap[id] = pick(e);
    return JSON.parse(JSON.stringify(snap));
}

/** Chart simulado: registra (ctx, config) y las llamadas a destroy/toBase64Image. */
export function makeFakeChart() {
    const instances = [];
    const log = [];
    class FakeChart {
        constructor(ctx, config) {
            this.ctx = ctx;
            this.config = config;
            this.destroyed = false;
            instances.push(this);
            log.push({ op: 'new', canvasId: ctx.canvasId, type: config.type });
        }
        destroy() { this.destroyed = true; log.push({ op: 'destroy', canvasId: this.ctx.canvasId }); }
        toBase64Image() { return 'data:image/png;base64,' + this.ctx.canvasId; }
    }
    return { FakeChart, instances, log };
}

/** Valores con los que se "prueban" las funciones de formato/callbacks de una configuración. */
export const FORMAT_PROBES = [
    0, '0', 1, 1.5, 25, 1234, 1234.567, -3, '12', 100, 120, null, undefined, 'x',
    { name: 'Ana', x: 1.5, y: 2 }, { label: '2026-01-05', raw: 3 }, { raw: { name: 'Ana', x: 2, y: 3.5 } }
];

function probe(fn) {
    return FORMAT_PROBES.map(p => {
        try { return String(fn(p)); } catch (e) { return 'ERR:' + e.constructor.name; }
    });
}

/**
 * Convierte una configuración de Chart.js en datos comparables con deepEqual: cada función se sustituye por
 * `{__fn: [resultado con cada valor de prueba]}` y las clases/plugins por su nombre.
 */
export function normalizeConfig(value) {
    if (typeof value === 'function') return { __fn: probe(value) };
    if (Array.isArray(value)) return value.map(normalizeConfig);
    if (value && typeof value === 'object') {
        const out = {};
        for (const k of Object.keys(value)) out[k] = normalizeConfig(value[k]);
        return out;
    }
    return value;
}

const NAMES = ['Ana Pérez', 'Luis Gómez', 'María López', 'Sebastian Hincapie', 'Oriana Borja', 'Sara Santamaría', 'Josué Álvarez', 'Camilo Espinosa', 'Daniel Ríos'];

/** JSON operativo sintético (gestor -> fecha -> métricas) con huecos y valores límite. */
export function makeRawData(rng, { gestores = 5, dias = 40, baseMs = Date.UTC(2026, 9, 6, 12) } = {}) {
    const raw = {};
    for (let g = 0; g < gestores; g++) {
        const name = NAMES[Math.floor(rng() * NAMES.length)] + (g >= NAMES.length ? ' ' + g : '');
        raw[name] = raw[name] || {};
        for (let i = 0; i < dias; i++) {
            if (rng() < 0.3) continue;
            const d = new Date(baseMs - i * 86400000);
            const key = d.toISOString().split('T')[0];
            const day = {};
            if (rng() < 0.9) day.Retiros_Aprobados = Math.floor(rng() * 40);
            if (rng() < 0.9) day.Retiros_Rechazados = Math.floor(rng() * 6);
            if (rng() < 0.7) day.Retiros_Procesados = (day.Retiros_Aprobados || 0) + (day.Retiros_Rechazados || 0);
            if (rng() < 0.8) day.Tiempo_Total_Desde_Creacion_Segundos = Math.floor(rng() * 90000);
            if (rng() < 0.8) day.ART_Desde_Creacion_Minutos = rng() < 0.2 ? 0 : Math.round(rng() * 2400 * 100) / 100;
            if (rng() < 0.7) day.Dias_Laborados = rng() < 0.8 ? 1 : 0;
            if (rng() < 0.6) day.Minutos_Tarde_Total = rng() < 0.6 ? 0 : Math.floor(rng() * 60);
            if (rng() < 0.4) day.Dias_Tarde = day.Minutos_Tarde_Total > 0 ? 1 : 0;
            if (rng() < 0.7) day.Minutos_Inactividad_Total = Math.round(rng() * 90 * 100) / 100;
            raw[name][key] = day;
        }
    }
    return raw;
}
