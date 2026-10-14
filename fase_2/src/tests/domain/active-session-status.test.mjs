import { createRunner, assert } from '../test-harness.mjs';
import {
    isSessionOnlineForFilter,
    resolveSessionDisplay,
    SESSION_HEARTBEAT_TIMEOUT_MS
} from '../../domain/analytics/active-session-status.js';

const { test, summarize } = createRunner('active-session-status.js (bug: Pausa de Turno invisible al supervisor)');
const NOW = 10_000_000;
const FRESH = NOW - 10_000;
const STALE = NOW - SESSION_HEARTBEAT_TIMEOUT_MS - 1;

// Copia LITERAL de la lógica actual de app.js (5239-5247 y 5284-5310), sin la corrección.
function legacyFilterOnline(s, now) {
    let isOnline = s.lastActive ? ((now - s.lastActive) < 120000) : false;
    if (s.status === 'En Almuerzo' || s.status === 'En Desayuno' || s.status === 'Inactivo') isOnline = false;
    return isOnline;
}
function legacyCard(s, now) {
    const session = { ...s };
    let isOnline = session.lastActive ? ((now - session.lastActive) < 120000) : false;
    if (!isOnline && session.status !== 'En Almuerzo' && session.status !== 'En Desayuno') session.status = 'Inactivo';
    let displayStatus = isOnline ? 'En Línea' : 'Inactivo';
    if (session.status === 'En Almuerzo') displayStatus = 'En Almuerzo/Cena 🍽️';
    else if (session.status === 'En Desayuno') displayStatus = 'En Desayuno ☕';
    else if (session.status === 'Inactivo') { isOnline = false; displayStatus = 'Inactivo 💤'; }
    else if (session.status === 'En Línea') displayStatus = 'En Línea';
    return { displayStatus, isOnline };
}

test('REPRODUCCIÓN DEL BUG: el código actual muestra "En Línea" a un gestor en Pausa de Turno con latido reciente', () => {
    const session = { status: 'En Pausa de Turno', lastActive: FRESH };
    assert.equal(legacyCard(session, NOW).displayStatus, 'En Línea');
    assert.equal(legacyFilterOnline(session, NOW), true);
});

test('REPRODUCCIÓN DEL BUG: sin latido, el código actual rotula la Pausa de Turno como "Inactivo"', () => {
    assert.equal(legacyCard({ status: 'En Pausa de Turno', lastActive: STALE }, NOW).displayStatus, 'Inactivo 💤');
});

test('CORREGIDO: Pausa de Turno con latido reciente se muestra como pausa y no cuenta como En Línea en el filtro', () => {
    const session = { status: 'En Pausa de Turno', lastActive: FRESH };
    const r = resolveSessionDisplay(session, NOW);
    assert.equal(r.displayStatus, 'En Pausa de Turno ⏸️');
    assert.equal(r.isBreak, true);
    assert.equal(isSessionOnlineForFilter(session, NOW), false);
});

test('CORREGIDO: Pausa de Turno sin latido por más de 2 min sigue siendo pausa (no "Inactivo")', () => {
    const r = resolveSessionDisplay({ status: 'En Pausa de Turno', lastActive: STALE }, NOW);
    assert.equal(r.displayStatus, 'En Pausa de Turno ⏸️');
    assert.equal(r.status, 'En Pausa de Turno');
});

test('el resto de estados es IDÉNTICO al código actual (diferencial, 6 estados x 4 latidos)', () => {
    const statuses = ['En Línea', 'Inactivo', 'En Almuerzo', 'En Desayuno', undefined, 'Otro'];
    const beats = [FRESH, STALE, 0, undefined];
    for (const status of statuses) {
        for (const lastActive of beats) {
            const s = { status, lastActive };
            const legacy = legacyCard(s, NOW);
            const next = resolveSessionDisplay(s, NOW);
            assert.equal(next.displayStatus, legacy.displayStatus, `card ${status}/${lastActive}`);
            assert.equal(next.isOnline, legacy.isOnline, `online ${status}/${lastActive}`);
            assert.equal(isSessionOnlineForFilter(s, NOW), legacyFilterOnline(s, NOW), `filtro ${status}/${lastActive}`);
        }
    }
});

test('Inactivo con latido reciente se muestra Inactivo (la vista ya lo soportaba)', () => {
    const r = resolveSessionDisplay({ status: 'Inactivo', lastActive: FRESH }, NOW);
    assert.equal(r.displayStatus, 'Inactivo 💤');
    assert.equal(r.isOnline, false);
});

summarize();
