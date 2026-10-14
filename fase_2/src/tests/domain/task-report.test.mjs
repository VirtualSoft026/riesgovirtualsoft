import { createRunner, assert } from '../test-harness.mjs';
import {
    canonicalTaskId,
    isLegacyGenericTaskName,
    resolveTaskDisplayName,
    buildTaskReportSummaryText,
} from '../../domain/tasks/task-report.js';

const { test, summarize } = createRunner('task-report');

// ── canonicalTaskId ───────────────────────────────────────────────────────────

test('convierte número a string', () => {
    assert.equal(canonicalTaskId(42), '42');
});

test('mantiene string como string', () => {
    assert.equal(canonicalTaskId('42'), '42');
});

test('convierte null a "null"', () => {
    assert.equal(canonicalTaskId(null), 'null');
});

test('convierte undefined a "undefined"', () => {
    assert.equal(canonicalTaskId(undefined), 'undefined');
});

test('convierte 0 a "0"', () => {
    assert.equal(canonicalTaskId(0), '0');
});

// ── isLegacyGenericTaskName ───────────────────────────────────────────────────

test('detecta "Tarea 1" como legacy', () => {
    assert.equal(isLegacyGenericTaskName('Tarea 1'), true);
});

test('detecta "Tarea 123" como legacy', () => {
    assert.equal(isLegacyGenericTaskName('Tarea 123'), true);
});

test('detecta "tarea 5" (minúscula) como legacy (regex insensible)', () => {
    assert.equal(isLegacyGenericTaskName('tarea 5'), true);
});

test('detecta "TAREA 99" como legacy', () => {
    assert.equal(isLegacyGenericTaskName('TAREA 99'), true);
});

test('"Tarea Extra 1" NO es legacy (tiene texto extra)', () => {
    assert.equal(isLegacyGenericTaskName('Tarea Extra 1'), false);
});

test('"Revisar informes" no es legacy', () => {
    assert.equal(isLegacyGenericTaskName('Revisar informes'), false);
});

test('string vacío no es legacy', () => {
    assert.equal(isLegacyGenericTaskName(''), false);
});

test('número no es legacy', () => {
    assert.equal(isLegacyGenericTaskName(42), false);
});

test('null no es legacy', () => {
    assert.equal(isLegacyGenericTaskName(null), false);
});

test('"Tarea " (sin número) no es legacy', () => {
    assert.equal(isLegacyGenericTaskName('Tarea '), false);
});

test('"Tarea abc" (letras en lugar de dígitos) no es legacy', () => {
    assert.equal(isLegacyGenericTaskName('Tarea abc'), false);
});

// ── resolveTaskDisplayName ────────────────────────────────────────────────────

test('devuelve el nombre del entry si no es legacy', () => {
    const result = resolveTaskDisplayName('1', { name: 'Revisar logs' }, null);
    assert.equal(result, 'Revisar logs');
});

test('busca en catálogo cuando el nombre del entry es legacy', () => {
    const catalog = [{ id: 1, Tarea: 'Gestión de permisos' }];
    const result  = resolveTaskDisplayName('1', { name: 'Tarea 1' }, catalog);
    assert.equal(result, 'Gestión de permisos');
});

test('busca en catálogo cuando entry.name no existe (undefined)', () => {
    const catalog = [{ id: 5, Tarea: 'Monitoreo' }];
    const result  = resolveTaskDisplayName(5, {}, catalog);
    assert.equal(result, 'Monitoreo');
});

test('compara id del catálogo con canonicalTaskId (number vs string)', () => {
    const catalog = [{ id: '7', Tarea: 'Auditoría' }];
    const result  = resolveTaskDisplayName(7, { name: 'Tarea 7' }, catalog);
    assert.equal(result, 'Auditoría');
});

test('retorna texto neutral si no está en catálogo', () => {
    const warnings = [];
    const result = resolveTaskDisplayName('99', { name: 'Tarea 99' }, [], (msg) => warnings.push(msg));
    assert.ok(result.length > 0);
    assert.ok(result.includes('Tarea') || result.includes('nombre'), 'texto neutral esperado');
    assert.equal(warnings.length, 1);
});

test('catalog null — retorna texto neutral para nombre legacy', () => {
    const result = resolveTaskDisplayName('1', { name: 'Tarea 1' }, null);
    assert.ok(result.length > 0);
});

test('entry null — busca en catálogo', () => {
    const catalog = [{ id: 3, Tarea: 'Cierre de turno' }];
    const result  = resolveTaskDisplayName(3, null, catalog);
    assert.equal(result, 'Cierre de turno');
});

test('no llama onWarn cuando resuelve bien sin catálogo', () => {
    const warnings = [];
    resolveTaskDisplayName('1', { name: 'Revisión' }, null, (msg) => warnings.push(msg));
    assert.equal(warnings.length, 0);
});

// ── buildTaskReportSummaryText ────────────────────────────────────────────────

test('report null → texto vacío estándar', () => {
    const result = buildTaskReportSummaryText(null);
    assert.ok(result.length > 0); // no debe ser string vacío
});

test('tasks vacío → texto vacío estándar', () => {
    const result = buildTaskReportSummaryText({ tasks: {} });
    assert.ok(result.length > 0);
});

test('genera línea por tarea con tareas estructuradas', () => {
    const report = {
        tasks: {
            '1': { name: 'Revisar logs', status: 'Finalizada', observation: 'OK' },
            '2': { name: 'Actualizar config', status: 'Pendiente', observation: '' },
        }
    };
    const result = buildTaskReportSummaryText(report);
    assert.ok(result.includes('FINALIZADA'));
    assert.ok(result.includes('Revisar logs'));
    assert.ok(result.includes('PENDIENTE'));
});

test('tarea con clave extra_ usa entry.name directamente', () => {
    const report = {
        tasks: {
            'extra_1': { name: 'Tarea especial', status: 'Finalizada', observation: '' },
        }
    };
    const result = buildTaskReportSummaryText(report);
    assert.ok(result.includes('Tarea especial'));
});

test('tarea extra_ sin nombre usa fallback "Tarea adicional"', () => {
    const report = {
        tasks: {
            'extra_2': { status: 'Pendiente', observation: '' },
        }
    };
    const result = buildTaskReportSummaryText(report);
    assert.ok(result.includes('adicional') || result.includes('Tarea adicional'));
});

test('usa legacy reporte si no hay tasks', () => {
    const report = {
        reporte: '[ Finalizada ] - Revisar alertas\nObservación: Sin novedades'
    };
    const result = buildTaskReportSummaryText(report);
    assert.ok(result.includes('Revisar alertas'));
});

test('legacy reporte: corta en el marcador de bitácora', () => {
    const report = {
        reporte: '[ Finalizada ] - Tarea 1\n=== BITÁCORA DE TIEMPOS ===\n[datos de tiempo]'
    };
    const result = buildTaskReportSummaryText(report);
    assert.ok(!result.includes('BITÁCORA DE TIEMPOS'));
});

test('legacy reporte: reemplaza "Tarea N" por nombre del catálogo', () => {
    const catalog = [{ id: 1, Tarea: 'Gestión de incidencias' }];
    const report  = { reporte: '[ Finalizada ] - Tarea 1' };
    const result  = buildTaskReportSummaryText(report, { catalog });
    assert.ok(result.includes('Gestión de incidencias'));
});

test('entry con null/undefined se omite sin romper el loop', () => {
    const report = {
        tasks: {
            '1': null,
            '2': { name: 'Válida', status: 'Finalizada', observation: '' },
        }
    };
    assert.doesNotThrow(() => buildTaskReportSummaryText(report));
    const result = buildTaskReportSummaryText(report);
    assert.ok(result.includes('Válida'));
});

test('status por defecto es "Pendiente" cuando falta en la entrada', () => {
    const report = {
        tasks: {
            '1': { name: 'Sin status', observation: 'ninguna' }
        }
    };
    const result = buildTaskReportSummaryText(report);
    assert.ok(result.includes('PENDIENTE'));
});

test('observation faltante aparece como N/A', () => {
    const report = {
        tasks: {
            '1': { name: 'Sin obs', status: 'Finalizada' }
        }
    };
    const result = buildTaskReportSummaryText(report);
    assert.ok(result.includes('N/A'));
});

summarize();
