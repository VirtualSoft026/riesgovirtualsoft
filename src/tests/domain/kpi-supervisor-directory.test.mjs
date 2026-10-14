/**
 * Pruebas del directorio de supervisores por ROL (`domain/schedules/supervisor-directory.js`), decisión D9b
 * (plan maestro §4 ter): supervisor = `users/{uid}/role` exactamente 'Supervisor' o 'Admin' (los mismos valores que
 * valida `database.rules.json`); identificación por UID o, si el dato solo trae nombre, por nombre completo EXACTO
 * normalizado; nunca por subcadena.
 */
import { createRunner, assert } from '../test-harness.mjs';
import {
    SUPERVISOR_ROLES, isSupervisorRole, normalizeFullName, buildSupervisorDirectory, EMPTY_SUPERVISOR_DIRECTORY,
    isSupervisorDirectory, assertSupervisorDirectory, isSupervisorEntry, isSupervisorName, legacySubstringMatch
} from '../../domain/schedules/supervisor-directory.js';
import { ROLES } from '../../config/roles.js';

const { test, summarize } = createRunner('supervisor-directory (D9b: supervisores por rol en users, sin lista fija)');

/** La lista fija original de app.js (línea 2), solo para mostrar la diferencia. */
const SUPERVISORES_NOMBRES = ['Sara Santamaría', 'Sara Santamaria', 'Maria Sanchez', 'Camilo Espinosa', 'Oriana Borja', 'Sara', 'Maria', 'Camilo', 'Oriana'];

const USERS = {
    s1: { name: 'Maria Sanchez', role: 'Supervisor', approved: true, email: 'maria@virtualsoft.tech' },
    s2: { name: '  Sara   Santamaría ', role: 'Supervisor', approved: true },
    a1: { name: 'Camilo Espinosa', role: 'Admin', approved: true },
    g1: { name: 'Mariana Ruiz', role: 'Gestor', approved: true },
    g2: { name: 'Oriana Borja', role: 'Gestor', approved: true },
    g3: { name: 'Sara', role: 'Gestor', approved: true },
    p1: { name: 'Pendiente', role: 'Gestor', approved: false },
    r1: { name: 'Rol raro', role: 'supervisor' },
    r2: { name: 'Rol con espacios', role: ' Admin' },
    n1: null,
    n2: 'texto',
    n3: { role: 'Supervisor' }
};

test('campo y valores reales: users/{uid}/role con "Supervisor" o "Admin" (config/roles.js, database.rules.json, login.js)', () => {
    assert.deepEqual([...SUPERVISOR_ROLES], [ROLES.SUPERVISOR, ROLES.ADMIN]);
    assert.deepEqual([...SUPERVISOR_ROLES], ['Supervisor', 'Admin']);
    for (const r of ['Supervisor', 'Admin']) assert.equal(isSupervisorRole(r), true, r);
    for (const r of ['Gestor', 'supervisor', 'ADMIN', ' Admin', '', null, undefined, 1, {}]) assert.equal(isSupervisorRole(r), false, String(r));
});

test('normalizeFullName: minúsculas, sin acentos, espacios recortados y colapsados', () => {
    assert.equal(normalizeFullName('  María   SÁNCHEZ '), 'maria sanchez');
    assert.equal(normalizeFullName('Josué Álvarez'), 'josue alvarez');
    assert.equal(normalizeFullName(null), '');
    assert.equal(normalizeFullName(42), '');
});

test('buildSupervisorDirectory: uids y nombres SOLO de los roles exactos; lista ordenada; ignora nulos y roles mal escritos', () => {
    const d = buildSupervisorDirectory(USERS);
    assert.deepEqual([...d.uids].sort(), ['a1', 'n3', 's1', 's2']);
    assert.deepEqual([...d.names].sort(), ['camilo espinosa', 'maria sanchez', 'sara santamaria']);
    assert.deepEqual(d.list.map((x) => x.uid), ['n3', 'a1', 's1', 's2'], 'ordenada por nombre (el sin nombre primero)');
    assert.equal(Object.isFrozen(d) && Object.isFrozen(d.list), true);
    // también acepta un arreglo con uid
    const arr = buildSupervisorDirectory([{ uid: 'x', name: 'Ana', role: 'Admin' }, { name: 'Sin uid', role: 'Supervisor' }, null]);
    assert.deepEqual([...arr.uids], ['x']);
    assert.deepEqual([...arr.names].sort(), ['ana', 'sin uid']);
    assert.equal(EMPTY_SUPERVISOR_DIRECTORY.uids.size + EMPTY_SUPERVISOR_DIRECTORY.names.size, 0);
    assert.equal(buildSupervisorDirectory(undefined).list.length, 0);
});

test('isSupervisorEntry: con uid decide SOLO el uid (homónimos con otro uid no se ocultan); sin uid, nombre completo EXACTO', () => {
    const d = buildSupervisorDirectory(USERS);
    assert.equal(isSupervisorEntry(d, { uid: 's1', name: 'Cualquiera' }), true);
    assert.equal(isSupervisorEntry(d, { uid: 'g3', name: 'Maria Sanchez' }), false, 'uid de Gestor: no importa el nombre');
    assert.equal(isSupervisorEntry(d, { name: 'MARÍA  sánchez' }), true, 'sin uid: nombre normalizado exacto');
    assert.equal(isSupervisorEntry(d, { name: 'Maria' }), false, 'una palabra suelta no basta');
    assert.equal(isSupervisorEntry(d, { name: 'Maria Sanchez Pérez' }), false, 'nombre más largo: no es exacto');
    assert.equal(isSupervisorEntry(d, { name: '' }), false);
    assert.equal(isSupervisorEntry(null, { uid: 's1' }), false, 'sin directorio nadie es supervisor');
    assert.equal(isSupervisorEntry(d), false);
});

test('"Mariana" ya NO queda oculta por coincidir con parte del nombre de una supervisora (antes: subcadena "Maria")', () => {
    const d = buildSupervisorDirectory(USERS);
    for (const nombre of ['Mariana Ruiz', 'Mariana', 'Marianela Sánchez', 'Oriana Borja', 'Sara', 'Camila Espinosa', 'Sarai Pérez']) {
        assert.equal(isSupervisorName(d, nombre), false, `${nombre}: decidido = visible`);
    }
    assert.equal(legacySubstringMatch(SUPERVISORES_NOMBRES, 'Mariana Ruiz'), true, 'original: oculta a Mariana');
    assert.equal(legacySubstringMatch(SUPERVISORES_NOMBRES, 'Marianela Sánchez'), true, 'original: oculta a Marianela');
    assert.equal(legacySubstringMatch(SUPERVISORES_NOMBRES, 'Sarai Pérez'), true, 'original: oculta a Sarai');
    assert.equal(isSupervisorName(d, 'Sara Santamaria'), true, 'la supervisora real sí');
    assert.equal(isSupervisorName(d, 'Camilo Espinosa'), true, 'Admin también cuenta como supervisor');
});

test('assertSupervisorDirectory: acepta directorio o null; rechaza la lista fija (arreglo) y objetos sueltos con un error claro', () => {
    const d = buildSupervisorDirectory(USERS);
    assert.equal(assertSupervisorDirectory(d, 'x'), d);
    assert.equal(assertSupervisorDirectory(null, 'x'), null);
    assert.equal(assertSupervisorDirectory(undefined, 'x'), null);
    assert.throws(() => assertSupervisorDirectory(SUPERVISORES_NOMBRES, 'consumidor'), /consumidor: .*D9b.*legacyExcludedNames/);
    assert.throws(() => assertSupervisorDirectory({ s1: USERS.s1 }, 'consumidor'), TypeError, 'el nodo users crudo no es un directorio');
    assert.equal(isSupervisorDirectory(d), true);
    assert.equal(isSupervisorDirectory([]), false);
});

summarize();
