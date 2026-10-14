import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '../..'); // fase_2/lab -> fase_2 -> raiz del repo (riesgovirtualsoft)
const LAB_ROOT = path.resolve(process.env.RISKOPS_LAB_ROOT || 'C:\\riskops-lab-fase2');
const INJECT_BUNDLE = process.env.RISKOPS_LAB_INJECT_BUNDLE !== '0';
// Integración del refactor de turno (pausas/Pausa de Turno/cierre) SOLO en la copia de staging de app.js.
const INTEGRATE = INJECT_BUNDLE && process.env.RISKOPS_LAB_INTEGRATE !== '0';
const SITE = path.join(LAB_ROOT, 'site');
const BUNDLE = path.resolve(here, '../../build/dist/riskops.bundle.js');

// Misma allowlist que .github/workflows/deploy-pages.yml (mantener sincronizadas).
const ROOT_FILES = ['index.html', 'login.html', 'app.js', 'login.js', 'styles.css', 'login.css', 'firebase-config.js', 'procesos_list.json', 'kpi_operativos_v2.json'];
const LOCAL_ONLY_FILES = ['kpi_operativos_seed.json'];
const DIRECTORIES = ['js', 'assets'];
const OPTIONAL_FILES = ['Procesos/Manual_Usuario_Penka.html', 'Retiros/retiros_data.json'];
const OPERATIONAL_XLSX = [
    'Tareas Riesgo/Tareas de Riesgo.xlsx',
    'Cronograma de Tareas/Cronograma Mayo.xlsx',
    'Cronograma de Tareas/Cronograma Junio.xlsx',
    'Cronograma de Tareas/Cronograma Julio.xlsx',
    'Cronograma de Tareas/Cronograma Agosto.xlsx',
    'Cronograma de Tareas/Cronograma Septiembre.xlsx',
    'Cronograma de Tareas/Cronograma Octubre.xlsx',
    'Horario/Horario 2026.xlsx',
    'Teletrabajo/Teletrabajo.xlsx'
];

const say = (level, message) => console.log(`[${level}] ${message}`);
const copyInto = (relative) => {
    const from = path.join(REPO, relative);
    if (!fs.existsSync(from)) return false;
    const to = path.join(SITE, relative);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(from, to, { recursive: true });
    return true;
};

if (/[&%^!]/.test(LAB_ROOT)) {
    say('FALLA', `La ruta del laboratorio contiene caracteres que rompen cmd.exe: ${LAB_ROOT}`);
    process.exit(1);
}

// Solo se regenera site/: el estado del emulador (emulator_data) nunca se toca.
if (fs.existsSync(SITE)) {
    if (path.basename(SITE) !== 'site' || path.dirname(SITE) !== LAB_ROOT) throw new Error('Ruta de staging inesperada');
    fs.rmSync(SITE, { recursive: true, force: true });
}
fs.mkdirSync(SITE, { recursive: true });

let copied = 0;
for (const file of [...ROOT_FILES, ...LOCAL_ONLY_FILES, ...OPTIONAL_FILES, ...OPERATIONAL_XLSX, ...DIRECTORIES]) {
    if (copyInto(file)) copied += 1;
    else if (ROOT_FILES.includes(file) || OPERATIONAL_XLSX.includes(file)) say('AVISO', `No existe en el repo: ${file}`);
}
say('OK', `${copied} elementos copiados a ${SITE}`);

if (!fs.existsSync(BUNDLE)) {
    say('FALLA', `Falta el bundle (${BUNDLE}). Ejecuta "npm run build" en build/.`);
    process.exit(1);
}
fs.copyFileSync(BUNDLE, path.join(SITE, 'riskops.bundle.js'));

const smoke = fs.readFileSync(path.resolve(here, '../../build/smoke.html'), 'utf8').replace('dist/riskops.bundle.js', 'riskops.bundle.js');
fs.writeFileSync(path.join(SITE, 'smoke.html'), smoke);

// Solo la copia de staging: el index.html del repo no se modifica.
if (INJECT_BUNDLE) {
    const indexPath = path.join(SITE, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');
    const marker = /<script src="app\.js[^"]*"><\/script>/;
    // 2026-10-14: el index.html de la rama ya carga el bundle antes de app.js; no se inyecta dos veces.
    const yaCargaBundle = /<script src="riskops\.bundle\.js[^"]*"><\/script>/.test(html);
    if (yaCargaBundle) {
        say('OK', 'index.html de la rama ya carga riskops.bundle.js antes de app.js: se sirve tal cual.');
    } else {
        if (!marker.test(html)) {
            say('FALLA', 'No se encontró la etiqueta <script src="app.js"> para inyectar el bundle.');
            process.exit(1);
        }
        fs.writeFileSync(indexPath, html.replace(marker, (tag) => `<script src="riskops.bundle.js"></script>\n    ${tag}`));
        say('OK', 'Bundle inyectado ANTES de app.js solo en la copia de staging (RISKOPS_LAB_INJECT_BUNDLE=0 lo desactiva).');
    }
}

// 2026-10-14: si el app.js de la rama YA trae la integración (marcas [LAB-INTEGRACION]), se prueba tal cual:
// el laboratorio sirve exactamente lo que se va a subir.
const APP_YA_INTEGRADO = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8').includes('[LAB-INTEGRACION]');
if (APP_YA_INTEGRADO) {
    say('OK', 'app.js de la rama ya está conectado a src: se sirve tal cual, sin parches del laboratorio.');
} else if (INTEGRATE) {
    const { integrateApp, loadExtraSteps } = await import('./integracion/aplicar-integracion.mjs');
    const extraSteps = await loadExtraSteps(path.join(here, 'integracion', 'pasos'));
    const appPath = path.join(SITE, 'app.js');
    try {
        const result = integrateApp(fs.readFileSync(appPath, 'utf8'), extraSteps);
        fs.writeFileSync(appPath, result.source);
        say('OK', `Integración del refactor de turno aplicada SOLO en la copia de staging de app.js (${result.applied.length} cambios; RISKOPS_LAB_INTEGRATE=0 la desactiva).`);
    } catch (error) {
        say('FALLA', `No se pudo integrar el refactor en la copia de app.js: ${error.message}`);
        process.exit(1);
    }
} else {
    say('AVISO', 'Sin integración del refactor: el laboratorio corre el app.js del repo tal cual.');
}

fs.copyFileSync(path.join(REPO, 'database.rules.json'), path.join(LAB_ROOT, 'database.rules.json'));
fs.copyFileSync(path.join(REPO, '.firebaserc'), path.join(LAB_ROOT, '.firebaserc'));
fs.writeFileSync(path.join(LAB_ROOT, 'firebase.json'), JSON.stringify({
    database: { rules: 'database.rules.json' },
    hosting: {
        public: 'site',
        ignore: ['**/.*', '**/node_modules/**'],
        headers: [{ source: '**/*.@(html|json|js|css|xlsx)', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] }]
    },
    emulators: {
        auth: { host: '127.0.0.1', port: 9099 },
        database: { host: '127.0.0.1', port: 9000 },
        hosting: { host: '127.0.0.1', port: 5000 },
        ui: { enabled: true, host: '127.0.0.1', port: 4000 }
    }
}, null, 2));

const seedTarget = path.join(LAB_ROOT, 'emulator_data');
const seedSource = path.join(REPO, 'emulator_data');
if (!fs.existsSync(path.join(seedTarget, 'firebase-export-metadata.json'))) {
    if (fs.existsSync(path.join(seedSource, 'firebase-export-metadata.json'))) {
        fs.cpSync(seedSource, seedTarget, { recursive: true });
        say('OK', 'Semilla inicial copiada desde emulator_data del repo (solo la primera vez).');
    } else {
        say('AVISO', 'No hay semilla en el repo: el laboratorio arrancará vacío (crea usuarios desde el registro o la UI del emulador).');
    }
} else {
    say('OK', 'Se conserva el estado previo de emulator_data del laboratorio.');
}

say('OK', `Laboratorio preparado en ${LAB_ROOT}`);
