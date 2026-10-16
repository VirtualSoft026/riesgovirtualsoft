// Batería de cargas XSS contra las dos copias de sanitizeAnnouncementHTML (app.js en jsdom y src/utils/sanitization.js).
// "Peligroso" = la salida, insertada con innerHTML en jsdom, produce un elemento ejecutable, un atributo on*,
// un href/src javascript:/data:/vbscript:, o etiquetas script/iframe/object/embed/svg/math/style/form/base/meta/link.
import { JSDOM } from 'jsdom';
import { loadAppFunctions } from './lib-app.mjs';
import * as san from '../../../src/utils/sanitization.js';

const PAYLOADS = [
  '<script>alert(1)</script>ok',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '<svg><script>alert(1)</script></svg>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<a href="javascript:alert(1)">x</a>',
  '<a href="JaVaScRiPt:alert(1)">x</a>',
  '<a href=" javascript:alert(1)">x</a>',
  '<a href="jav&#x09;ascript:alert(1)">x</a>',
  '<a href="jav&#09;ascript:alert(1)">x</a>',
  '<a href="&#106;avascript:alert(1)">x</a>',
  '<a href="data:text/html,<script>alert(1)</script>">x</a>',
  '<a href="vbscript:msgbox(1)">x</a>',
  '<a href="//evil.example/x">x</a>',
  '<p style="background:url(javascript:alert(1))">x</p>',
  '<p onclick="alert(1)">x</p>',
  '<details open ontoggle=alert(1)>x</details>',
  '<body onload=alert(1)>',
  '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
  '<template><img src=x onerror=alert(1)></template>',
  '<form action="javascript:alert(1)"><button>x</button></form>',
  '<object data="javascript:alert(1)"></object>',
  '<embed src="javascript:alert(1)">',
  '<base href="javascript:alert(1)//">',
  '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
  '<link rel=stylesheet href="javascript:alert(1)">',
  '<style>@import "javascript:alert(1)";</style>',
  '<p>"><img src=x onerror=alert(1)></p>',
  '<a title="x" href="https://ok.example" onmouseover="alert(1)">x</a>',
  '<<script>script>alert(1)<</script>/script>',
  '<img src="x` `<script>alert(1)</script>"` `>',
  '<p>&lt;img src=x onerror=alert(1)&gt;</p>',
  '<a href="https://ok.example" target="_blank">x</a>',
];
const BAD_TAGS = /^(script|iframe|object|embed|svg|math|style|form|base|meta|link|template|noscript|img|body)$/i;

function danger(html) {
  const dom = new JSDOM('<!doctype html><body><div id=r></div></body>');
  const r = dom.window.document.getElementById('r');
  r.innerHTML = html;
  const why = [];
  for (const el of r.querySelectorAll('*')) {
    if (BAD_TAGS.test(el.tagName)) why.push(`<${el.tagName.toLowerCase()}>`);
    for (const a of el.attributes) {
      if (/^on/i.test(a.name)) why.push(`${a.name}=`);
      if (/^(href|src|action|data|formaction|xlink:href|style)$/i.test(a.name) && /(java|vb)script:|data:/i.test(a.value.replace(/[\s\u0000-\u001f]/g, ''))) why.push(`${a.name}=${a.value.slice(0, 25)}`);
      if (a.name === 'target' && a.value === '_blank' && !/noopener/.test(el.getAttribute('rel') || '')) why.push('target=_blank sin rel=noopener');
    }
  }
  return why;
}

const A = loadAppFunctions(['sanitizeAnnouncementHTML']);
let badApp = 0, badSrc = 0;
for (const p of PAYLOADS) {
  let oa, os;
  try { oa = A.sanitizeAnnouncementHTML(p); } catch (e) { oa = 'ERROR ' + e.message; }
  try { os = san.sanitizeAnnouncementHTML(p); } catch (e) { os = 'ERROR ' + e.message; }
  const da = danger(oa), ds = danger(os);
  if (da.length) badApp++; if (ds.length) badSrc++;
  console.log(`${da.length ? 'PELIGRO' : 'ok     '} app | ${ds.length ? 'PELIGRO' : 'ok     '} src | ${p.slice(0, 60)}`);
  if (da.length) console.log(`        app → ${JSON.stringify(oa).slice(0, 140)}  [${da.join(', ')}]`);
  if (ds.length) console.log(`        src → ${JSON.stringify(os).slice(0, 140)}  [${ds.join(', ')}]`);
}
console.log(`\nResumen: ${PAYLOADS.length} cargas · app.js peligrosas: ${badApp} · src peligrosas: ${badSrc}`);
