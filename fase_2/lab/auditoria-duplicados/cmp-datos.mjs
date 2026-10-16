import { loadAppFunctions } from './lib-app.mjs';
import * as docs from '../../../src/config/doc-links.js';
import fs from 'node:fs';
import { fileURLToPath as __f2p } from 'node:url';
import __path from 'node:path';
import __fs from 'node:fs';
const __HERE = __path.dirname(__f2p(import.meta.url));
process.chdir(__path.resolve(__HERE, '../../..')); // raíz del repo
const __OUT = __path.join(__HERE, 'salida'); __fs.mkdirSync(__OUT, { recursive: true });

const A = loadAppFunctions(['privateGitHubDocs','documentUrls','privateTeamsManuals']);
const appDocs = { ...A.privateGitHubDocs, ...A.documentUrls };
const cmp = (label, a, b, na, nb) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]); const out = [];
  for (const k of keys) { if (!(k in a)) out.push(['solo en ' + nb, k]); else if (!(k in b)) out.push(['solo en ' + na, k]); else if (a[k] !== b[k]) out.push(['URL distinta', k, na + ': ' + a[k], nb + ': ' + b[k]]); }
  console.log(`${label}: ${na} ${Object.keys(a).length} claves, ${nb} ${Object.keys(b).length} claves, diferencias ${out.length}`); out.forEach(o => console.log('   ', o.join(' | ')));
};
cmp('Documentos', appDocs, docs.DOC_URL_MAP, 'app.js', 'src');
cmp('Manuales', A.privateTeamsManuals, docs.MANUAL_URL_MAP, 'app.js', 'src');
// main
const __g = (await import('node:child_process')).spawnSync('git', ['show', 'origin/main:app.js'], { encoding: 'utf8', maxBuffer: 64*1024*1024 });
const main = process.env.MAIN_APP ? fs.readFileSync(process.env.MAIN_APP, 'utf8') : (__g.status === 0 ? __g.stdout : null);
if (!main) { console.log('origin/main no disponible: se omite la comparación con main'); process.exit(0); }
const m = main.match(/const privateTeamsManuals = \{[\s\S]*?\n\};/)[0];
const mainMan = new Function(m.replace('const privateTeamsManuals =','return'))();
cmp('Manuales', A.privateTeamsManuals, mainMan, 'app.js', 'main');
cmp('Manuales', docs.MANUAL_URL_MAP, mainMan, 'src', 'main');
