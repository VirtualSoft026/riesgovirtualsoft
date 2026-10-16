/**
 * W-52 (paso 3.1): los sumideros de texto libre que app.js insertaba sin escapar ahora se escapan siempre.
 * Cada prueba usa los payloads de XSS de referencia y comprueba que no llega ninguna etiqueta ni atributo al HTML,
 * y que con datos normales el HTML no cambia.
 */
import { createRunner, assert } from '../test-harness.mjs';
import { buildTimelineRowHtml, buildSessionCardHtml } from '../../domain/analytics/monitoring-view.js';
import { buildBitacoraCardHtml } from '../../ui/views/kpi-indicators-view.js';
import { buildSupervisorBadgeHtml } from '../../domain/schedules/active-supervisors.js';
import { buildQuickDocsHTML } from '../../ui/views/quick-docs-view.js';
import { getDocUrl } from '../../config/doc-links.js';

const { test, summarize } = createRunner('W-52: sumideros de texto libre escapados');

const PAYLOADS = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '"><svg onload=alert(1)>',
    `' onfocus='alert(1)`,
    '</td><iframe src=javascript:alert(1)>'
];

function assertInert(html, payload) {
    assert.ok(!html.includes(payload), 'el payload crudo no aparece: ' + payload);
    assert.ok(!/<script|<img|<svg|<iframe/i.test(html), 'sin etiquetas inyectadas: ' + payload);
}

test('monitoreo: el tipo de evento de la bitácora (timeline del gestor) se escapa', () => {
    for (const type of PAYLOADS) {
        assertInert(buildTimelineRowHtml({ type, start: 0, end: 60000 }), type);
    }
    const normal = buildTimelineRowHtml({ type: 'Almuerzo', start: 0, end: 60000 });
    assert.ok(normal.includes("<i class='bx bx-restaurant' style='color: var(--success)'></i> Almuerzo</td>"), 'tipos del catálogo sin cambios');
});

test('monitoreo: el estado de la tarjeta se escapa (hoy sale de un catálogo fijo; defensa en profundidad)', () => {
    const model = {
        uid: 'u', fullName: 'Ana', isOnline: true, displayStatus: '<img src=x onerror=alert(1)>', loginTimeStr: '10:00',
        shift: 'Mañana', email: 'a@v.tech', delayBadge: '', tasksHtml: '',
        progress: { completedCount: 0, notDoneCount: 0, totalTasks: 0, compPct: 0, notDonePct: 0, totalPct: 0 }
    };
    const card = buildSessionCardHtml(model);
    assert.ok(!card.includes(model.displayStatus) && !/<img[^>]*onerror/.test(card), 'la tarjeta solo trae su propio <img class="monitoreo-avatar">');
    assert.ok(card.includes('&lt;img src=x onerror=alert(1)&gt;'));
    assert.ok(buildSessionCardHtml({ ...model, displayStatus: 'En Almuerzo/Cena 🍽️' }).includes('En Almuerzo/Cena 🍽️'));
});

test('KPI / bitácora: horaInicio y horaFin del reporte se escapan; los respaldos propios ("En Curso") siguen siendo marcado', () => {
    for (const payload of PAYLOADS) {
        assertInert(buildBitacoraCardHtml({ timestamp: 0, gestor: 'Ana', horaInicio: payload, horaFin: payload }), payload);
    }
    const ok = buildBitacoraCardHtml({ timestamp: 0, gestor: 'Ana', horaInicio: '08:00 a. m.', horaFin: '04:00 p. m.' });
    assert.ok(ok.includes('>08:00 a. m.</span>') && ok.includes('>04:00 p. m.</span>'));
    const live = buildBitacoraCardHtml({ timestamp: 0, gestor: 'Ana', status: 'En Línea' });
    assert.ok(live.includes("<span style='color:var(--success)'><i class='bx bx-radio-circle-marked bx-flashing'></i> En Curso</span>"));
});

test('supervisores activos: los nombres del cronograma se escapan', () => {
    for (const payload of PAYLOADS) {
        assertInert(buildSupervisorBadgeHtml([payload]), payload);
    }
    assert.equal(buildSupervisorBadgeHtml(['Oriana Borja']), "<i class='bx bx-support'></i> Sup: Oriana Borja");
});

test('documentos rápidos: URL y nombre escapados; con los documentos actuales el HTML no cambia', () => {
    const evilUrl = () => '"><img src=x onerror=alert(1)>';
    assertInert(buildQuickDocsHTML('GGR', evilUrl), evilUrl());
    const html = buildQuickDocsHTML('GGR', getDocUrl);
    assert.ok(html.includes('rel="noopener noreferrer"'));
    assert.ok(!/&amp;|&lt;|&quot;|&#039;/.test(html), 'los nombres y URL actuales no tienen caracteres que cambien al escapar');
});

summarize();
