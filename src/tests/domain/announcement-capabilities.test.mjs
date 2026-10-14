import { createRunner, assert } from '../test-harness.mjs';
import {
    canPublishComunicados,
    canViewComunicadoLecturas,
    canDeleteComunicados,
    canManageComunicados,
    COMUNICADOS_PUBLISH_ROLES,
    COMUNICADOS_VIEW_LECTURAS_ROLES,
    COMUNICADOS_DELETE_ROLES,
} from '../../domain/announcements/announcement-capabilities.js';

const { test, summarize } = createRunner('announcement-capabilities');

// ── canPublishComunicados ─────────────────────────────────────────────────────

test('Admin puede publicar comunicados', () => {
    assert.equal(canPublishComunicados('Admin'), true);
});

test('Supervisor puede publicar comunicados', () => {
    assert.equal(canPublishComunicados('Supervisor'), true);
});

test('Gestor no puede publicar comunicados', () => {
    assert.equal(canPublishComunicados('Gestor'), false);
});

test('rol vacío no puede publicar', () => {
    assert.equal(canPublishComunicados(''), false);
});

test('rol undefined no puede publicar', () => {
    assert.equal(canPublishComunicados(undefined), false);
});

test('rol null no puede publicar', () => {
    assert.equal(canPublishComunicados(null), false);
});

test('comparación es sensible a mayúsculas ("admin" no es Admin)', () => {
    assert.equal(canPublishComunicados('admin'), false);
    assert.equal(canPublishComunicados('SUPERVISOR'), false);
});

// ── canViewComunicadoLecturas ─────────────────────────────────────────────────

test('Admin puede ver lecturas', () => {
    assert.equal(canViewComunicadoLecturas('Admin'), true);
});

test('Supervisor puede ver lecturas', () => {
    assert.equal(canViewComunicadoLecturas('Supervisor'), true);
});

test('Gestor no puede ver lecturas', () => {
    assert.equal(canViewComunicadoLecturas('Gestor'), false);
});

test('rol desconocido no puede ver lecturas', () => {
    assert.equal(canViewComunicadoLecturas('Auditor'), false);
});

// ── canDeleteComunicados ──────────────────────────────────────────────────────

test('Admin puede eliminar comunicados', () => {
    assert.equal(canDeleteComunicados('Admin'), true);
});

test('Supervisor NO puede eliminar comunicados', () => {
    assert.equal(canDeleteComunicados('Supervisor'), false);
});

test('Gestor no puede eliminar comunicados', () => {
    assert.equal(canDeleteComunicados('Gestor'), false);
});

test('rol vacío no puede eliminar', () => {
    assert.equal(canDeleteComunicados(''), false);
});

// ── canManageComunicados (= publish OR viewLecturas) ─────────────────────────

test('Admin puede gestionar comunicados', () => {
    assert.equal(canManageComunicados('Admin'), true);
});

test('Supervisor puede gestionar comunicados', () => {
    assert.equal(canManageComunicados('Supervisor'), true);
});

test('Gestor no puede gestionar comunicados', () => {
    assert.equal(canManageComunicados('Gestor'), false);
});

test('canManageComunicados es publish OR viewLecturas', () => {
    // Todo rol que puede publicar también puede gestionar
    for (const role of COMUNICADOS_PUBLISH_ROLES) {
        assert.equal(canManageComunicados(role), true, `${role} debe poder gestionar (puede publicar)`);
    }
    // Todo rol que puede ver lecturas también puede gestionar
    for (const role of COMUNICADOS_VIEW_LECTURAS_ROLES) {
        assert.equal(canManageComunicados(role), true, `${role} debe poder gestionar (puede ver lecturas)`);
    }
});

test('canDeleteComunicados es subconjunto de canManageComunicados', () => {
    for (const role of COMUNICADOS_DELETE_ROLES) {
        assert.equal(
            canManageComunicados(role),
            true,
            `${role} puede eliminar → también debe poder gestionar`
        );
    }
});

// ── Sets exportados ───────────────────────────────────────────────────────────

test('COMUNICADOS_PUBLISH_ROLES contiene Admin y Supervisor', () => {
    assert.ok(COMUNICADOS_PUBLISH_ROLES.has('Admin'));
    assert.ok(COMUNICADOS_PUBLISH_ROLES.has('Supervisor'));
});

test('COMUNICADOS_DELETE_ROLES solo contiene Admin', () => {
    assert.equal(COMUNICADOS_DELETE_ROLES.size, 1);
    assert.ok(COMUNICADOS_DELETE_ROLES.has('Admin'));
});

summarize();
