// W-11 / CF-1.1: prueba diferencial ampliada de sanitizeAnnouncementHTML.
// Compara src/utils/sanitization.js con la copia de app.js corriendo sobre el parser HTML de jsdom
// (el mismo papel que cumple el navegador). Casos fijos + fragmentos aleatorios armados con piezas reales.
import { loadAppFunctions } from './lib-app.mjs';
import * as san from '../../../src/utils/sanitization.js';

const A = loadAppFunctions(['sanitizeAnnouncementHTML']);
const PIECES = ['<p>', '</p>', '<b>', '</b>', '<i>', '</i>', '<div>', '</div>', '<ul>', '</ul>', '<ol>', '</ol>', '<li>', '</li>',
    '<br>', '<br/>', '</br>', '<a href="https://x.co/?a=1&amp;b=2">', '<a href=mailto:a@b.co>', '<a href="javascript:x">', '</a>',
    '<span>', '</span>', '<strong>', '</strong>', '<em>', '</em>', '<script>', '</script>', '<style>', '</style>', '<template>', '</template>',
    '<noscript>', '</noscript>', '<!-- c -->', '<img src=x onerror=1>', '<svg>', '</svg>', 'texto', ' ', '\n', '&nbsp;', '&amp;', '&lt;',
    '&gt;', '&quot;', '&aacute;', '&ntilde;', '&#233;', '&#x1F600;', '&amp', '&nbsp', '&desconocida;', '<', '>', '&', '"', "'", 'ñ', 'é',
    '<P>', '<custom>', '</custom>', '<h1>', '</h1>', '<table>', '<td>', '<object>', '</object>', '<textarea>', '</textarea>'];

let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const cases = [];
for (let i = 0; i < 3000; i++) {
    const n = 1 + Math.floor(rnd() * 8);
    let s = '';
    for (let k = 0; k < n; k++) s += PIECES[Math.floor(rnd() * PIECES.length)];
    cases.push(s);
}

import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><body><div id=r></div></body>');
const r = dom.window.document.getElementById('r');
function danger(html) {
    r.innerHTML = html;
    for (const el of r.querySelectorAll('*')) {
        if (!['P', 'BR', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'A'].includes(el.tagName)) return `<${el.tagName}>`;
        for (const at of el.attributes) if (at.name !== 'href' || /^\s*(javascript|data|vbscript):/i.test(at.value)) return at.name;
    }
    return '';
}
let unsafe = 0;
const diffs = [];
for (const c of cases) {
    const a = A.sanitizeAnnouncementHTML(c);
    const b = san.sanitizeAnnouncementHTML(c);
    if (danger(b)) unsafe++;
    if (a !== b) diffs.push({ c, a, b });
}
console.log(`sanitizeAnnouncementHTML (fragmentos aleatorios): casos=${cases.length} diferencias=${diffs.length} salidas_inseguras_src=${unsafe}`);
for (const d of diffs.slice(0, 15)) console.log(`  entrada=${JSON.stringify(d.c)}\n    app=${JSON.stringify(d.a)}\n    src=${JSON.stringify(d.b)}`);
if (unsafe) process.exitCode = 1;
