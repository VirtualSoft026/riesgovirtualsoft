import { createRunner, assert } from '../test-harness.mjs';
import { getDocUrl, getManualUrl } from '../../config/doc-links.js';

const { test, summarize } = createRunner('doc-links');

// ── getDocUrl ──────────────────────────────────────────────────────────────

test('getDocUrl: devuelve URL para PDF conocido en DOC_URL_MAP', () => {
    const url = getDocUrl('Guia Jira EGT - Proveedor de Casino.pdf');
    assert.ok(
        url.startsWith('https://'),
        `Se esperaba URL https://, se obtuvo: ${url}`
    );
});

test('getDocUrl: devuelve URL para otro PDF conocido', () => {
    const url = getDocUrl('Instructivo de revisión de apuestas casino.pdf');
    assert.ok(url.startsWith('https://'));
});

test('getDocUrl: devuelve #PENDING para .mp4 desconocido', () => {
    const url = getDocUrl('video-desconocido.mp4');
    assert.strictEqual(url, '#PENDING_PRIVATE_DOCUMENT_MIGRATION');
});

test('getDocUrl: .mp4 en el mapa devuelve URL real (no PENDING)', () => {
    const url = getDocUrl('Revisión de Eventos Deportivos.mp4');
    assert.ok(
        url.startsWith('https://'),
        `Se esperaba URL real, se obtuvo: ${url}`
    );
    assert.notStrictEqual(url, '#PENDING_PRIVATE_DOCUMENT_MIGRATION');
});

test('getDocUrl: otro .mp4 conocido devuelve URL real', () => {
    const url = getDocUrl('Validación SEON.mp4');
    assert.ok(url.startsWith('https://'));
    assert.notStrictEqual(url, '#PENDING_PRIVATE_DOCUMENT_MIGRATION');
});

test('getDocUrl: archivo desconocido devuelve ruta local Procesos/', () => {
    const url = getDocUrl('archivo-inventado.pdf');
    assert.strictEqual(url, 'Procesos/archivo-inventado.pdf');
});

test('getDocUrl: archivo sin extensión devuelve ruta local Procesos/', () => {
    const url = getDocUrl('sinExtension');
    assert.strictEqual(url, 'Procesos/sinExtension');
});

// ── getManualUrl ───────────────────────────────────────────────────────────

test('getManualUrl: devuelve URL para proveedor conocido (Pragmatic)', () => {
    const url = getManualUrl('Pragmatic');
    assert.ok(url.startsWith('https://'));
});

test('getManualUrl: devuelve URL para proveedor con PDF (3oaks.pdf)', () => {
    const url = getManualUrl('3oaks.pdf');
    assert.ok(url.startsWith('https://'));
});

test('getManualUrl: devuelve URL para Evolution', () => {
    const url = getManualUrl('Evolution');
    assert.ok(url.startsWith('https://'));
});

test('getManualUrl: proveedor desconocido devuelve ruta local Manuales/', () => {
    const url = getManualUrl('ProveedorInventado');
    assert.strictEqual(url, 'Manuales/ProveedorInventado');
});

test('getManualUrl: string vacío devuelve ruta local Manuales/', () => {
    const url = getManualUrl('');
    assert.strictEqual(url, 'Manuales/');
});

summarize();
