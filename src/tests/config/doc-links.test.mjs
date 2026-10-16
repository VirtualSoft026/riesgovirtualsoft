import { createRunner, assert } from '../test-harness.mjs';
import { getDocUrl, getManualUrl, MANUAL_URL_MAP } from '../../config/doc-links.js';

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

// ── W-12 (NOTA_2): lista de manuales de `main` ───────────────────────────────

test('W-12: la lista de manuales es la de main (17), con Playson y las URL corregidas', () => {
    assert.equal(Object.keys(MANUAL_URL_MAP).length, 17);
    assert.ok(getManualUrl('Playson').includes('IQBhSbX5zfApSrkM8kbx40OCAczup6lOC1k9v19dyssPyfc'));
    assert.ok(getManualUrl('PragmaticplaySlot').includes('IQBed0oHqboZRabYqQnGJMxUATLlSdPshzsD7pnAsl8JxdM'), 'PragmaticplaySlot corregida');
    assert.ok(getManualUrl('Redrakegaming').includes('IQCmcIAXj_tLRZKJx2dpTMyZAQP18AdXeKvHLc1PtnVBhd4'), 'Redrakegaming corregida');
    assert.ok(getManualUrl('Belatra').includes('IQBPSE6f50toQ5-dN47fDzPOAXqhCkyx02toLxiTcics57o'));
    assert.ok(getManualUrl('Egt').includes('IQDPREAJmsY_Roey_HAIsjnDAVboOIr8TspQEggMd_VdQkQ'));
    assert.ok(getManualUrl('Evolution').endsWith('?e=uBw53Y'));
    assert.equal(new Set(Object.values(MANUAL_URL_MAP)).size, 17, 'sin URL repetidas (antes Belatra y Egt repetían la de Aviatrix)');
});

summarize();
