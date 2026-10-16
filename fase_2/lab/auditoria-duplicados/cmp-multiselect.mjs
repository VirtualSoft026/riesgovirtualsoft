import { JSDOM } from 'jsdom';
import vm from 'node:vm';
import { loadAppFunctions } from './lib-app.mjs';
import { fileURLToPath as __f2p } from 'node:url';
import __path from 'node:path';
import __fs from 'node:fs';
const __HERE = __path.dirname(__f2p(import.meta.url));
process.chdir(__path.resolve(__HERE, '../../..')); // raíz del repo
const __OUT = __path.join(__HERE, 'salida'); __fs.mkdirSync(__OUT, { recursive: true });

const HTML = '<!doctype html><body><div class="glass-panel"><div id="ms" class="custom-multiselect"></div></div><div id="out">x</div></body>';
const OPTS = ['Luis Fuentes', 'Sara Santamaría', 'Ana Prueba', 'Oriana Borja'];
function snapshot(doc) {
  const c = doc.getElementById('ms');
  return { label: c.querySelector('.multiselect-label')?.textContent, open: c.classList.contains('open'),
    opciones: [...c.querySelectorAll('.multiselect-options-list input')].map(i => i.value + (i.checked ? '[x]' : '[ ]')).join(', '),
    z: c.closest('.glass-panel').style.zIndex };
}
async function scenario(impl) {
  const dom = new JSDOM(HTML); const doc = dom.window.document; const calls = []; const steps = [];
  let api;
  if (impl === 'app') {
    const A = loadAppFunctions(['setupCustomMultiSelect', 'getSelectedMultiSelectValues', 'resetCustomMultiSelect', 'setCustomMultiSelectValues'], { globals: { document: doc } });
    api = { setup: (...a) => A.setupCustomMultiSelect(...a), get: (id) => A.getSelectedMultiSelectValues(id), reset: (id) => A.resetCustomMultiSelect(id), set: (id, v) => A.setCustomMultiSelectValues(id, v) };
  } else {
    globalThis.document = doc; globalThis.window = dom.window;
    const M = await import('../../../src/ui/components/multi-select.js?' + Math.random());
    api = { setup: (...a) => M.setupCustomMultiSelect(...a), get: (id) => M.getSelectedMultiSelectValues(id), reset: (id) => M.resetCustomMultiSelect(id), set: (id, v) => M.setCustomMultiSelectValues(id, v) };
  }
  const ev = (el, type) => el.dispatchEvent(new dom.window.Event(type, { bubbles: true }));
  const click = (el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const c = () => doc.getElementById('ms');
  api.setup('ms', OPTS, (v) => calls.push(v.join('|')));
  steps.push(['inicial', snapshot(doc), api.get('ms')]);
  click(c().querySelector('.custom-multiselect-btn')); steps.push(['abrir', snapshot(doc)]);
  const boxes = () => [...c().querySelectorAll('.multiselect-options-list input')];
  boxes()[1].checked = true; ev(boxes()[1], 'change'); steps.push(['marcar 2ª', snapshot(doc), api.get('ms')]);
  boxes()[2].checked = true; ev(boxes()[2], 'change'); steps.push(['marcar 3ª', snapshot(doc), api.get('ms')]);
  const s = c().querySelector('.multiselect-search-input'); s.value = 'luis'; ev(s, 'input'); steps.push(['buscar luis', snapshot(doc)]);
  s.value = ''; ev(s, 'input');
  click(c().querySelector('.btn-select-all')); steps.push(['todos', snapshot(doc), api.get('ms')]);
  click(c().querySelector('.btn-clear-all')); steps.push(['ninguno', snapshot(doc), api.get('ms')]);
  api.set('ms', ['Ana Prueba']); steps.push(['setValues', snapshot(doc), api.get('ms')]);
  api.reset('ms'); steps.push(['reset', snapshot(doc), api.get('ms')]);
  click(doc.getElementById('out')); steps.push(['clic fuera', snapshot(doc)]);
  steps.push(['sin contenedor', api.setup('noexiste', OPTS) === undefined ? 'undefined' : 'objeto', api.get('noexiste')]);
  steps.push(['callbacks', calls]);
  return steps;
}
const a = await scenario('app'); const m = await scenario('mod');
let d = 0;
for (let i = 0; i < a.length; i++) { const sa = JSON.stringify(a[i]), sm = JSON.stringify(m[i]); if (sa !== sm) { d++; console.log('DIF', a[i][0], '\n  app', sa, '\n  mod', sm); } }
console.log('pasos', a.length, 'diferencias', d);
