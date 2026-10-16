// Duplicados "no funcionales" entre app.js, index.html, login.*, js/tiempos.js, styles.css y src/:
// 1 catálogos y configuración · 2 plantillas HTML · 3 CSS · 4 validaciones · 5 claves de almacenamiento ·
// 6 mocks/fixtures en producción · 7 manejadores de eventos. Solo lee archivos.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(HERE, '../../..'));
const OUT = path.join(HERE, 'salida'); fs.mkdirSync(OUT, { recursive: true });

const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') : '');
const srcFiles = []; (function w(d) { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'tests') w(p); } else if (p.endsWith('.js')) srcFiles.push(p.replace(/\\/g, '/')); } })('src');
const LEGACY = ['app.js', 'login.js', 'js/tiempos.js'];
const PAGES = ['index.html', 'login.html'];
const ALL_JS = [...LEGACY, ...srcFiles];
const T = Object.fromEntries([...ALL_JS, ...PAGES, 'styles.css', 'login.css'].map((f) => [f, read(f)]));
const group = (f) => (f.startsWith('src/') ? 'src' : f);
const count = (text, re) => (text.match(re) || []).length;
const R = {};
const out = []; const log = (s = '') => { out.push(s); };
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

// ------------------------------------------------------------------ 1. Catálogos
{
  const CATS = {
    'Roles (Admin/Supervisor/Gestor)': /['"`](Admin|Supervisor|Gestor)['"`]/g,
    'Estados de sesión (En Línea, En Almuerzo, …)': /['"`](En Línea|En Almuerzo|En Desayuno|En Pausa de Turno)['"`]/g,
    'Estados de tarea (Pendiente, En Proceso, Finalizada, No Realizada)': /['"`](En Proceso|Finalizada|No Realizada)['"`]/gi,
    'Estados de permiso (Aprobado, Rechazado)': /['"`](Aprobado|Rechazado)['"`]/g,
    'Tipos de evento de bitácora (Almuerzo, Desayuno, Inactividad, Pausa de Turno)': /type\s*===?\s*['"`](Almuerzo|Desayuno|Inactividad|Pausa de Turno)['"`]/g,
    'Claves riskOps_* escritas a mano': /['"`]riskOps_[A-Za-z]+['"`]/g,
    'Textos de turno ("8am - 4pm", …)': /['"`]\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*-\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)['"`]/gi,
    'Correos @virtualsoft.tech': /[A-Za-z0-9._-]+@virtualsoft\.tech/g,
    'URLs de SharePoint/GitHub/Drive': /https:\/\/(?:virtualsoftserv\.sharepoint\.com|github\.com\/RiesgoVirtualsoft|drive\.google\.com)[^\s"'`]*/g,
    'Nombres de personas escritos a mano (Sara, Oriana, Maria, Camilo)': /['"`](?:Sara|Oriana|Maria|María|Camilo)[^'"`]{0,20}['"`]/g
  };
  R.catalogos = {};
  log('=== 1. Catálogos, mapeos y configuración escritos a mano (ocurrencias por archivo) ===');
  for (const [name, re] of Object.entries(CATS)) {
    const per = {};
    for (const f of [...ALL_JS, ...PAGES]) { const n = count(T[f], re); if (n) per[group(f)] = (per[group(f)] || 0) + n; }
    R.catalogos[name] = per;
    log(`  ${name}: ${Object.entries(per).map(([k, v]) => `${k}=${v}`).join(', ') || '0'}`);
  }
  // <select> con opciones fijas en el HTML que además se rellenan desde JS
  const selects = [...T['index.html'].matchAll(/<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)].map((m) => ({ id: m[1], opciones: count(m[2], /<option/g) }));
  const filled = selects.filter((s) => s.opciones > 1 && ALL_JS.some((f) => new RegExp(`['"\`]${s.id}['"\`]`).test(T[f])));
  R.selectsDobles = filled;
  log(`  <select> con opciones fijas en index.html que JS también toca: ${filled.length} → ${filled.map((s) => `${s.id}(${s.opciones})`).join(', ')}`);

  // Enlaces de documentos: mismo catálogo en app.js y src/config/doc-links.js. Una diferencia = enlace roto en una copia.
  const urls = (t) => new Set(t.match(/https:\/\/virtualsoftserv\.sharepoint\.com[^\s"'`]*/g) || []);
  const ua = urls(T['app.js']); const us = urls(T['src/config/doc-links.js'] || '');
  const soloApp = [...ua].filter((u) => !us.has(u)); const soloSrc = [...us].filter((u) => !ua.has(u));
  R.enlacesDistintos = { soloApp, soloSrc };
  log(`  enlaces de SharePoint distintos entre app.js y src/config/doc-links.js: ${soloApp.length + soloSrc.length}`);
  for (const u of soloApp) log(`    solo app.js: ${u}`);
  for (const u of soloSrc) log(`    solo src:    ${u}`);

  // Catálogos que ya existen en src/ y módulos que siguen escribiendo los valores a mano.
  const CATALOGOS_SRC = [
    { nombre: 'ROLES', archivo: 'config/roles', re: /['"`](Admin|Supervisor|Gestor)['"`]/ },
    { nombre: 'SESSION_STATUS', archivo: 'active-session-status', re: /['"`](En Línea|En Almuerzo|En Desayuno|En Pausa de Turno)['"`]/ },
    { nombre: 'STORAGE_KEYS', archivo: 'utils/constants', re: /['"`]riskOps_\w+['"`]/ }
  ];
  R.catalogosIgnorados = {};
  for (const c of CATALOGOS_SRC) {
    const usan = srcFiles.filter((f) => !f.includes(c.archivo) && new RegExp(`\\b${c.nombre}\\b`).test(T[f]));
    const aMano = srcFiles.filter((f) => !f.includes(c.archivo) && !f.endsWith('constants.js') && c.re.test(T[f]) && !usan.includes(f));
    R.catalogosIgnorados[c.nombre] = { usan, aMano };
    log(`  ${c.nombre}: lo usan ${usan.length} módulos; ${aMano.length} módulos escriben los valores a mano${aMano.length ? ' → ' + aMano.map((f) => f.replace('src/', '')).join(', ') : ''}`);
  }
}

// ------------------------------------------------------------------ 2. Plantillas HTML
{
  log(''); log('=== 2. Plantillas HTML en código ===');
  const tpl = [];
  for (const f of ALL_JS) {
    const re = /`([^`]*<\/?(?:div|span|tr|td|li|button|i|strong|p|table|label|small|img|a)\b[^`]*)`|'([^'\n]*<(?:div|span|tr|td|li|button|i)\b[^'\n]*)'|"([^"\n]*<(?:div|span|tr|td|li|button|i)\b[^"\n]*)"/g;
    let m; while ((m = re.exec(T[f]))) {
      const raw = m[1] || m[2] || m[3]; if (!raw || raw.length < 60) continue;
      const norm = raw.replace(/\$\{[^}]*\}/g, '§').replace(/\s+/g, ' ').trim();
      tpl.push({ f, line: lineOf(T[f], m.index), norm, len: raw.length });
    }
  }
  const innerHTML = {}; for (const f of ALL_JS) { const n = count(T[f], /\.innerHTML\s*[+]?=/g); if (n) innerHTML[group(f)] = (innerHTML[group(f)] || 0) + n; }
  const byNorm = {}; for (const t of tpl) (byNorm[t.norm] ||= []).push(t);
  const dupExact = Object.values(byNorm).filter((l) => new Set(l.map((x) => group(x.f))).size > 1);
  // similares (Jaccard de tokens >= 0.85) entre legacy y src
  const tok = (s) => new Set(s.split(/[\s<>"'=;:/]+/).filter((w) => w.length > 2));
  const legacyT = tpl.filter((t) => !t.f.startsWith('src/')), srcT = tpl.filter((t) => t.f.startsWith('src/'));
  const similar = [];
  for (const a of legacyT) { const ta = tok(a.norm); for (const b of srcT) { const tb = tok(b.norm); let i = 0; for (const x of ta) if (tb.has(x)) i++; const j = i / (ta.size + tb.size - i); if (j >= 0.85 && a.norm !== b.norm) similar.push({ a: `${a.f}:${a.line}`, b: `${b.f}:${b.line}`, j: +j.toFixed(2) }); } }
  // contenedores con HTML fijo en index.html que JS reescribe con innerHTML
  const ids = [...T['index.html'].matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>([^<]{0,0}<[^/][\s\S]{20,}?)<\/\1>/g)].map((m) => m[2]);
  const rewritten = [...new Set(ids)].filter((id) => ALL_JS.some((f) => new RegExp(`getElementById\\(['"\`]${id}['"\`]\\)\\.innerHTML\\s*=`).test(T[f])));
  R.plantillas = { innerHTML, plantillasJS: tpl.length, identicasEntreArchivos: dupExact.length, similaresLegacySrc: similar.length, contenedoresReescritos: rewritten };
  log(`  asignaciones innerHTML: ${Object.entries(innerHTML).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  log(`  plantillas HTML en JS (≥60 car.): ${tpl.length}; idénticas en más de un archivo: ${dupExact.length}; casi idénticas app.js/login.js/tiempos.js ↔ src (≥85 %): ${similar.length}`);
  for (const l of dupExact.slice(0, 8)) log(`    idéntica: ${l.map((x) => `${x.f}:${x.line}`).join(' | ')}  «${l[0].norm.slice(0, 70)}…»`);
  for (const s of similar.slice(0, 8)) log(`    similar ${s.j}: ${s.a} ↔ ${s.b}`);
  log(`  contenedores con HTML fijo en index.html que JS reescribe con innerHTML: ${rewritten.length} → ${rewritten.slice(0, 15).join(', ')}${rewritten.length > 15 ? ', …' : ''}`);
  R._similar = similar; R._dupExact = dupExact.map((l) => l.map((x) => `${x.f}:${x.line}`));
}

// ------------------------------------------------------------------ 3. CSS
{
  log(''); log('=== 3. Estilos ===');
  const inline = {}; const decls = {};
  for (const f of [...ALL_JS, ...PAGES]) {
    const ms = [...T[f].matchAll(/style\s*=\s*\\?["']([^"'\\]{3,})\\?["']/g)];
    if (ms.length) inline[group(f)] = (inline[group(f)] || 0) + ms.length;
    for (const m of ms) for (const d of m[1].split(';').map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean)) (decls[d] ||= new Set()).add(group(f));
    const js = count(T[f], /\.style\.[a-zA-Z]+\s*=|\.style\.cssText\s*=/g); if (js) inline[group(f) + ' (.style.x = en JS)'] = (inline[group(f) + ' (.style.x = en JS)'] || 0) + js;
  }
  const crossDecls = Object.entries(decls).filter(([, s]) => s.size > 1).length;
  // selectores repetidos dentro de cada hoja y entre hojas / <style> embebidos
  // Se compara selector + contexto (@media/@supports que lo envuelve): repetir un selector dentro de un @media es
  // una sobrescritura legítima; repetirlo en el MISMO contexto es una regla duplicada.
  const selectors = (raw) => {
    const css = raw.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
    const out = []; const ctx = []; let buf = '';
    for (let i = 0; i < css.length; i++) {
      const c = css[i];
      if (c === '{') { const sel = buf.trim(); buf = ''; ctx.push(sel);
        if (sel && !sel.startsWith('@') && !/^(\d|from$|to$)/.test(sel)) { const media = ctx.slice(0, -1).filter((x) => x.startsWith('@')).join(' ') || 'global';
          for (const x of sel.split(',').map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean)) out.push({ key: `${x} [${media}]`, line: css.slice(0, i).split('\n').length }); } }
      else if (c === '}') { ctx.pop(); buf = ''; } else if (c === ';' && !ctx.length) buf = ''; else buf += c;
    }
    return out;
  };
  const sheets = { 'styles.css': selectors(T['styles.css']), 'login.css': selectors(T['login.css']) };
  for (const p of PAGES) { const blocks = [...T[p].matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n'); if (blocks) sheets[`<style> de ${p}`] = selectors(blocks); }
  for (const f of ALL_JS) { const blocks = [...T[f].matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1].replace(/\$\{[^}]*\}/g, '')).join('\n'); if (blocks) sheets[`<style> generado en ${f}`] = selectors(blocks); }
  const repeatedWithin = Object.fromEntries(Object.entries(sheets).map(([k, l]) => { const c = {}; l.forEach((s) => (c[s.key] ||= []).push(s.line)); return [k, Object.entries(c).filter(([, n]) => n.length > 1).map(([s, n]) => `${s} (líneas ${n.join(', ')})`)]; }));
  for (const k of Object.keys(sheets)) sheets[k] = sheets[k].map((x) => x.key.replace(/ \[[^\]]*\]$/, ''));
  const owners = {}; for (const [k, l] of Object.entries(sheets)) for (const s of new Set(l)) (owners[s] ||= []).push(k);
  const across = Object.entries(owners).filter(([, l]) => l.length > 1);
  R.css = { inline, declaracionesInlineEnVariosArchivos: crossDecls, selectoresRepetidosDentro: repeatedWithin, selectoresEnVariasHojas: across };
  log(`  estilos en línea: ${Object.entries(inline).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  log(`  declaraciones en línea idénticas usadas en más de un archivo: ${crossDecls}`);
  for (const [k, l] of Object.entries(repeatedWithin)) log(`  selectores repetidos en el mismo contexto dentro de ${k}: ${l.length}${l.length ? ' → ' + l.slice(0, 10).join(', ') + (l.length > 10 ? ', …' : '') : ''}`);
  log(`  selectores definidos en más de una hoja/bloque: ${across.length}${across.length ? ' → ' + across.slice(0, 10).map(([s, l]) => `${s} [${l.join(' + ')}]`).join('; ') : ''}`);
}

// ------------------------------------------------------------------ 4. Validaciones
{
  log(''); log('=== 4. Validaciones y reglas de entrada ===');
  const VAL = /alert\(\s*[`'"][^`'"]*(OBLIGATORIO|Por favor|debe|Debes|inválid|requerid|complet|selecciona|no coinciden|al menos)[^`'"]*[`'"]/gi;
  const per = {}; const samples = [];
  for (const f of ALL_JS) { let m; const re = new RegExp(VAL.source, 'gi'); while ((m = re.exec(T[f]))) { per[group(f)] = (per[group(f)] || 0) + 1; samples.push(`${f}:${lineOf(T[f], m.index)} ${m[0].slice(7, 80)}`); } }
  const htmlRules = {}; for (const p of PAGES) htmlRules[p] = { required: count(T[p], /\srequired\b/g), pattern: count(T[p], /\spattern=/g), minlength: count(T[p], /\sminlength=/g), type_email: count(T[p], /type="email"/g) };
  const validators = srcFiles.flatMap((f) => [...T[f].matchAll(/export (?:function|const) (validate\w*|is\w*Valid\w*|\w*Validation\w*|evaluate\w*Access|normalize\w*Role)/g)].map((m) => `${m[1]} (${f})`));
  const rulesValidate = count(read('database.rules.json'), /"\.validate"/g);
  R.validaciones = { alertasDeValidacion: per, html: htmlRules, validadoresSrc: validators, reglasFirebaseValidate: rulesValidate };
  log(`  alert() de validación: ${Object.entries(per).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  for (const s of samples.slice(0, 12)) log(`    ${s}`);
  log(`  reglas HTML: ${Object.entries(htmlRules).map(([k, v]) => `${k} ${JSON.stringify(v)}`).join(' · ')}`);
  log(`  validadores en src/: ${validators.length} → ${validators.join(', ')}`);
  log(`  .validate en database.rules.json: ${rulesValidate} (tercera capa de validación, en el servidor)`);
}

// ------------------------------------------------------------------ 5. Claves de almacenamiento
{
  log(''); log('=== 5. Claves de localStorage / sessionStorage ===');
  const keys = {};
  for (const f of [...ALL_JS, ...PAGES]) for (const m of T[f].matchAll(/(localStorage|sessionStorage)\.(getItem|setItem|removeItem)\(\s*(['"`])([^'"`]+)\3/g)) (keys[`${m[1]}:${m[4]}`] ||= new Set()).add(group(f));
  const viaConst = srcFiles.filter((f) => /STORAGE_KEYS\./.test(T[f]));
  const constVals = [...read('src/utils/constants.js').matchAll(/(\w+):\s*'(riskOps_\w+)'/g)].map((m) => m[2]);
  const rows = Object.entries(keys).map(([k, s]) => ({ clave: k, usadaEn: [...s].sort(), enConstantes: constVals.includes(k.split(':')[1]) }));
  R.storage = { claves: rows, modulosQueUsanSTORAGE_KEYS: viaConst, STORAGE_KEYS: constVals };
  log(`  claves distintas: ${rows.length}; módulos de src que usan STORAGE_KEYS: ${viaConst.length}`);
  for (const r of rows) log(`    ${r.clave.padEnd(44)} ${r.usadaEn.join(', ').padEnd(38)} ${r.enConstantes ? 'en STORAGE_KEYS' : 'NO está en STORAGE_KEYS'}`);
  const unused = constVals.filter((v) => !rows.some((r) => r.clave.endsWith(':' + v)));
  if (unused.length) log(`    en STORAGE_KEYS pero nadie las usa con literal: ${unused.join(', ')}`);
}

// ------------------------------------------------------------------ 6. Mocks / fixtures / stubs en producción
{
  log(''); log('=== 6. Mocks, datos de ejemplo y stubs en código de producción ===');
  // Palabras en minúscula/mayúscula indistinta (inglés) + marcadores SOLO en mayúscula: "todo" en español no cuenta.
  const RE_I = /\b(mock\w*|fake\w*|dummy|stub\w*|seed\w*|sample\w*|lorem|hardcod\w*)\b/gi;
  const RE_U = /\b(TODO|FIXME|HACK|XXX|PATCH CLEAR)\b/g;
  const hits = [];
  for (const f of [...ALL_JS, ...PAGES]) for (const RE of [RE_I, RE_U]) { let m; const re = new RegExp(RE.source, RE.flags); while ((m = re.exec(T[f]))) hits.push(`${f}:${lineOf(T[f], m.index)} ${m[0]}`); }
  const perFile = {}; for (const h of hits) { const f = h.split(':')[0]; perFile[group(f)] = (perFile[group(f)] || 0) + 1; }
  const rootData = fs.readdirSync('.').filter((f) => /seed|mock|fixture|sample|dump|temp_|debug\.log/i.test(f));
  const testCopies = []; (function w(d) { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) w(p); else if (/legacy|original|referencia|pre-integracion/i.test(e.name)) testCopies.push(`${p.replace(/\\/g, '/')} (${fs.statSync(p).size} B)`); } })('src/tests');
  if (fs.existsSync('fase_2/lab/referencia')) for (const e of fs.readdirSync('fase_2/lab/referencia')) testCopies.push(`fase_2/lab/referencia/${e} (${fs.statSync('fase_2/lab/referencia/' + e).size} B)`);
  R.mocks = { porArchivo: perFile, coincidencias: hits, datosEnRaiz: rootData, copiasDeCodigoEnPruebas: testCopies };
  log(`  menciones en producción: ${Object.entries(perFile).map(([k, v]) => `${k}=${v}`).join(', ') || '0'}`);
  for (const h of hits.slice(0, 15)) log(`    ${h}`);
  log(`  archivos de datos/semilla/logs en la raíz: ${rootData.join(', ') || 'ninguno'}`);
  log(`  copias de código legado usadas por pruebas: ${testCopies.join('; ') || 'ninguna'}`);
}

// ------------------------------------------------------------------ 7. Manejadores de eventos
{
  log(''); log('=== 7. Manejadores de eventos ===');
  const inlineById = {}; let inlineTotal = 0;
  for (const p of PAGES) for (const m of T[p].matchAll(/<[^>]*\son(click|change|input|submit|keyup|keydown)="([^"]*)"[^>]*>/g)) {
    inlineTotal++; const id = (m[0].match(/\sid="([^"]+)"/) || [])[1]; if (id) (inlineById[id] ||= []).push(`${p} on${m[1]}`);
  }
  const jsById = {};
  for (const f of ALL_JS) {
    // "suma" = addEventListener (se ejecuta ADEMÁS del onclick del HTML); "reemplaza" = el.onX = … (pisa el onclick del HTML).
    const seen = new Set();
    const add = (id, pos, ev, kind) => { const key = `${f}|${pos}`; if (seen.has(key)) return; seen.add(key); (jsById[id] ||= []).push(`${f.startsWith('src/') ? f : group(f)}:${lineOf(T[f], pos)} ${ev} (${kind})`); };
    for (const m of T[f].matchAll(/getElementById\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\??\.(?:addEventListener\(\s*['"`](\w+)|on(\w+)\s*=)/g)) add(m[1], m.index, m[2] || m[3], m[2] ? 'suma' : 'reemplaza');
    // Variable local: solo se mira el tramo que sigue a la declaración (≈150 líneas) y hasta que otra
    // declaración reuse el mismo nombre, para no confundir variables homónimas de otras funciones.
    const decl = [...T[f].matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:\w+\.)?getElementById\(\s*['"`]([^'"`]+)['"`]\s*\)/g)];
    for (const m of decl) {
      const v = m[1], id = m[2]; const start = m.index + m[0].length;
      let end = Math.min(T[f].length, start + 9000);
      const redecl = new RegExp(`(?:const|let|var|function)\\s+${v}\\b`, 'g'); redecl.lastIndex = start; const r = redecl.exec(T[f]); if (r && r.index < end) end = r.index;
      const re = new RegExp(`\\b${v}\\s*\\??\\.(?:addEventListener\\(\\s*['"\`](\\w+)|on(\\w+)\\s*=)`, 'g'); re.lastIndex = start;
      let k; while ((k = re.exec(T[f])) && k.index < end) add(id, k.index, k[1] || k[2], k[1] ? 'suma' : 'reemplaza');
    }
  }
  const both = Object.keys(inlineById).filter((id) => jsById[id]);
  const multiJs = Object.entries(jsById).filter(([, l]) => new Set(l.map((x) => (x.startsWith('src/') ? 'src' : x.split(':')[0]))).size > 1);
  const docLevel = {}; for (const f of ALL_JS) { const n = count(T[f], /(document|window)\.addEventListener\(\s*['"`](click|keydown|storage|focus|visibilitychange|mousemove|scroll)/g) + count(T[f], /window\.on(click|keydown)\s*=/g); if (n) docLevel[group(f)] = (docLevel[group(f)] || 0) + n; }
  const fb = {}; for (const f of ALL_JS) for (const m of T[f].matchAll(/ref\(\s*[`'"]([^`'"$]+)[^)]*\)\s*\.on\(\s*['"]value/g)) (fb[m[1]] ||= new Set()).add(group(f));
  const fbDup = Object.entries(fb).filter(([, s]) => s.size > 1).map(([p, s]) => `${p} [${[...s].join(' + ')}]`);
  const removals = Object.fromEntries(ALL_JS.map((f) => [group(f), 0])); for (const f of ALL_JS) removals[group(f)] += count(T[f], /removeEventListener|\.off\(|clearInterval|clearTimeout/g);
  R.eventos = { inlineTotal, idsConInlineYListenerJS: both, idsConListenerEnVariosArchivos: multiJs, listenersDocumentoWindow: docLevel, suscripcionesFirebaseDuplicadas: fbDup, desmontajes: removals };
  log(`  atributos on* en HTML: ${inlineTotal}`);
  log(`  elementos con on* en el HTML Y listener en JS ("suma" = doble ejecución; "reemplaza" = el JS pisa al HTML): ${both.length}${both.length ? ' → ' + both.map((id) => `${id} [${inlineById[id].join(', ')} | ${jsById[id].join(', ')}]`).join('; ') : ''}`);
  log(`  elementos con listener en más de un archivo JS: ${multiJs.length}${multiJs.length ? ' → ' + multiJs.map(([id, l]) => `${id} [${l.join(', ')}]`).join('; ') : ''}`);
  log(`  listeners globales (document/window): ${Object.entries(docLevel).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  log(`  suscripciones Firebase .on('value') a la misma ruta desde más de un archivo: ${fbDup.length}${fbDup.length ? ' → ' + fbDup.join('; ') : ''}`);
  log(`  desmontajes (removeEventListener/.off/clear*): ${Object.entries(removals).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ') || '0'}`);
}

fs.writeFileSync(path.join(OUT, 'capas.json'), JSON.stringify(R, (k, v) => (v instanceof Set ? [...v] : v), 1));
console.log(out.join('\n'));
