/**
 * Plan de prueba manual de ESTE inicio del laboratorio (lo llama Iniciar_Laboratorio_Fase2.bat
 * justo después de la suite automática).
 *
 * Cruza el resultado de la suite (ultimo-resultado.json) con las áreas funcionales de Risk Manager y
 * con los puntos de app.js marcados `[Fase 2]` (código delegado al bundle), y dice qué probar a mano
 * en Chrome y en qué orden: primero lo que falló o no se pudo probar automáticamente.
 *
 * Solo lee archivos; escribe el plan en %RISKOPS_LAB_ROOT%\pruebas\plan-prueba-manual.txt.
 * Uso: node plan-prueba-manual.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '..', '..', '..');
const LAB_ROOT = path.resolve(process.env.RISKOPS_LAB_ROOT || 'C:\\riskops-lab-fase2');
const OUT = path.join(LAB_ROOT, 'pruebas');
const RESULT = path.join(OUT, 'ultimo-resultado.json');

// Áreas de la prueba manual (laboratorio-local-fase2.md §4 e informe de cierre 2026-10-13 §7) y las
// pruebas automáticas que las cubren (por nombre de archivo).
const AREAS = [
    {
        area: 'Arranque y bundle',
        match: /verify-bundle|doc-links|constants|validation|sanitization|normalize|result\.test|date-time|excel\.test/,
        manual: ['Abrir http://127.0.0.1:5000/smoke.html: RiskOps carga y lista sus espacios de nombres.', 'Consola de Chrome (F12) sin errores nuevos al cargar index.html.']
    },
    {
        area: 'Inicio de sesión, navegación por rol, tema y avatar',
        match: /auth-service|app-router|login-history|historial-navegacion|profile-notifications|notification|local-session-storage/,
        manual: ['Entrar como Gestor y como Supervisor (ventanas distintas): menú correcto para cada rol.', 'Cambiar tema claro/oscuro y recargar: se conserva. El avatar del usuario aparece (o el genérico).', 'Historial de accesos del supervisor se abre y lista el ingreso recién hecho.']
    },
    {
        area: 'Tareas del gestor (cronograma, guardado, recuperación)',
        match: /task-|tareas-|extra-task|cronogram|schedule|teletrabajo|xlsx-schedule|multi-select/,
        manual: ['Las tareas del cronograma del día aparecen para el gestor.', 'Marcar tareas, recargar la página y abrir otra pestaña: el avance se conserva.', 'Agregar una tarea extra y una excepción con justificación.']
    },
    {
        area: 'Pausas, Pausa de Turno e inactividad',
        match: /break-|split-shift|shift-activity|idle-|shift-controller|active-session-payload|timeline/,
        manual: ['En la Emulator UI (http://127.0.0.1:4000) poner users/<uid>/hasSplitShift = true para el gestor.', 'Entrar y salir de Almuerzo, Desayuno y Pausa de Turno; revocar el flag con la pausa activa.', 'Dejar la pestaña sin actividad: la bitácora registra inactividad, salvo si está en pausa.']
    },
    {
        area: 'Monitoreo del supervisor y presencia',
        match: /monitoring|monitoreo|active-session-status|presence|active-supervisors|supervisor-directory/,
        manual: ['El supervisor ve al gestor en Monitoreo con su estado real (Activo, Inactivo, en pausa).', 'La Pausa de Turno del gestor es visible para el supervisor.', 'Contador de aprobados e insignia de supervisor activo se actualizan.']
    },
    {
        area: 'Aprobaciones, permisos y configuración de gestores',
        match: /approval|permission|user-approval|modales-permisos|gestor-config|config-gestores|incident/,
        manual: ['Aprobar un usuario nuevo y una solicitud de permiso.', 'Activar/desactivar Pausa de Turno de un gestor desde Configuración.', 'Registrar una novedad.']
    },
    {
        area: 'Reportes e historial de turnos',
        match: /shift-report|shift-reports|executive-report/,
        manual: ['Abrir el historial de turnos, filtrar, "Ver todo" y exportar PDF.']
    },
    {
        area: 'KPIs y Control Operativo',
        match: /kpi|metrics-calculator|operativo|withdrawal|turno-avance/,
        manual: ['Abrir KPIs: las gráficas (Chart.js) se dibujan con datos reales de kpi_operativos_v2.json.', 'Panel de avance del turno muestra horas efectivas coherentes.']
    },
    {
        area: 'Comunicados',
        match: /announcement|comunicados/,
        manual: ['Publicar un comunicado urgente como supervisor.', 'Leerlo como gestor: el modal se cierra y no reaparece; doble lectura sin error.']
    },
    {
        area: 'Cierre de turno (correo, bitácora, horas efectivas)',
        match: /cierre|shift-closure|shift-effective|shift-report-builder|end-shift|shift-calculator/,
        manual: ['Cerrar un turno que tuvo Pausa de Turno: revisar el resumen/correo (almuerzo, desayuno, pausa, horas efectivas) y la bitácora.', 'El reporte del turno aparece en el historial del supervisor.']
    },
    {
        area: 'Motor operativo (datos de KPIs, Python)',
        match: /test_motor_operativo/,
        manual: ['No se prueba en el navegador: solo la suite automática (sin red ni credenciales).']
    }
];

const ICON = { OK: 'OK      ', FALLA: 'FALLA   ', OMITIDA: 'OMITIDA ', 'SIN DATOS': 'SIN DATO', 'SIN PRUEBA': 'SIN AUTO' };
const lines = [];
const out = (t = '') => { console.log(t); lines.push(t); };

let data = null;
if (!process.argv.includes('--sin-suite')) {
    try { data = JSON.parse(fs.readFileSync(RESULT, 'utf8')); } catch { /* suite sin resultados */ }
}
const rows = data?.rows || [];

function statusFor(regex) {
    const items = rows.filter((r) => regex.test(r.name));
    if (!data) return { status: 'SIN DATOS', items };
    if (!items.length) return { status: 'SIN PRUEBA', items };
    if (items.some((r) => r.status === 'FALLA' || r.status === 'TIEMPO')) return { status: 'FALLA', items };
    if (items.some((r) => r.status === 'OMITIDA')) return { status: 'OMITIDA', items };
    return { status: 'OK', items };
}

const evaluated = AREAS.map((a) => ({ ...a, ...statusFor(a.match) }));
const order = { FALLA: 0, OMITIDA: 1, 'SIN DATOS': 2, 'SIN PRUEBA': 3, OK: 4 };
evaluated.sort((a, b) => order[a.status] - order[b.status]);

out('=====================================================================');
out(' PLAN DE PRUEBA MANUAL DE ESTE INICIO');
out('=====================================================================');
if (data) {
    out(`Suite automática: ${new Date(data.fecha).toLocaleString('es-CO')} — ${rows.filter((r) => r.status === 'OK').length} de ${rows.length} archivos en verde.`);
} else {
    out('Suite automática: no hay resultados (se omitió o no pudo correr). Prueba todas las áreas a mano.');
}
const integration = rows.find((r) => r.group === 'Integración');
if (integration && integration.status !== 'OK') {
    out('');
    out('ATENCIÓN: la integración del laboratorio falló. stage.mjs se detendrá en el mismo punto.');
    out('  Para arrancar igualmente con el app.js de la rama tal cual (bundle inyectado, sin parches del lab):');
    out('    set RISKOPS_LAB_INTEGRATE=0  y vuelve a ejecutar Iniciar_Laboratorio_Fase2.bat');
}
out('');
out('Prioridad: primero las áreas en FALLA u OMITIDA (la suite no pudo garantizarlas).');
out('');
for (const a of evaluated) {
    out(`[${ICON[a.status]}] ${a.area}`);
    const bad = a.items.filter((r) => r.status !== 'OK').map((r) => `${r.name} (${r.status})`);
    if (bad.length) out(`           Automático con problemas: ${bad.slice(0, 4).join(', ')}${bad.length > 4 ? ` y ${bad.length - 4} más` : ''}`);
    for (const step of a.manual) out(`           - ${step}`);
}

// Código delegado al bundle en app.js: son los caminos nuevos que la prueba manual debe recorrer.
const appPath = path.join(REPO, 'app.js');
if (fs.existsSync(appPath)) {
    const marks = fs.readFileSync(appPath, 'utf8').split(/\r?\n/)
        .map((text, i) => ({ line: i + 1, text: text.trim() }))
        .filter((l) => l.text.includes('[Fase 2]'));
    out('');
    out(`Código de app.js delegado al bundle (${marks.length} puntos [Fase 2]) — recórrelos en la prueba manual:`);
    for (const m of marks) out(`  - línea ${m.line}: ${m.text.replace(/^\/\/\s*/, '').slice(0, 130)}`);
}
out('');
out('URLs: app http://127.0.0.1:5000  ·  smoke http://127.0.0.1:5000/smoke.html  ·  Emulator UI http://127.0.0.1:4000');
out('=====================================================================');

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'plan-prueba-manual.txt'), lines.join('\r\n'), 'utf8');
console.log(`Plan guardado en: ${path.join(OUT, 'plan-prueba-manual.txt')}`);
