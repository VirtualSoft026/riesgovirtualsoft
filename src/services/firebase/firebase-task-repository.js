/**
 * Repositorio de tareas de la sesión activa sobre Firebase Realtime Database.
 *
 * Puerto 1:1 de `persistTaskToActiveSession()` (app.js 2241), `fetchOwnActiveSessionTasks()` (2256),
 * `persistTaskIfNotNewerRemote()` (2332), `migrateLocalTasksToActiveSession()` (2359) y de la escritura
 * del latido de `syncActiveSessionToFirebase()` (2472). Las originales usan el global `database`,
 * `localStorage` y `Date.now()`; aquí se inyectan para poder probarlas sin Firebase real.
 *
 * Garantías que se conservan (pérdida de datos de tareas del gestor si se rompen):
 *  1. Cada tarea se escribe en su propia ruta `active_sessions/{uid}/tasks/{taskId}`; jamás se reemplaza
 *     el nodo `tasks` completo.
 *  2. El latido (`syncSessionMetadata`) usa `update()` sobre `active_sessions/{uid}` con metadatos SIN
 *     `tasks`: `update()` solo toca las llaves que recibe, así que un latido con datos viejos nunca pisa
 *     una tarea recién guardada.
 *  3. `persistTaskToActiveSession` devuelve/rechaza la Promise REAL de Firebase: nunca convierte un fallo
 *     en éxito.
 *  4. `fetchOwnActiveSessionTasks` distingue "no hay tareas remotas" (`ok: true`, `{}`) de "no se pudo
 *     leer" (`ok: false`): un error de lectura jamás se disfraza de nodo vacío.
 *  5. `persistTaskIfNotNewerRemote` es una transacción que ABORTA (devuelve `undefined`) si en el
 *     servidor ya hay una versión con `updatedAt` estrictamente mayor.
 */

import { computeLocalTaskMigrations } from '../../domain/tasks/task-reconciler.js';

/**
 * Función de la transacción de `persistTaskIfNotNewerRemote()` (app.js 2338-2348): decide qué escribir
 * dado el valor actual en el servidor. Devuelve `undefined` para ABORTAR (conservar el remoto) o el
 * registro a escribir.
 *
 * @param {{updatedAt?: unknown}|null|undefined} currentValue
 * @param {{updatedAt?: unknown}} record
 * @returns {object|undefined}
 */
export function resolveTaskTransaction(currentValue, record) {
    if (
        currentValue
        && typeof currentValue.updatedAt === 'number'
        && typeof record.updatedAt === 'number'
        && currentValue.updatedAt > record.updatedAt
    ) {
        return undefined; // Abortar: conservar la versión remota más reciente.
    }

    return record;
}

/**
 * @param {{
 *   database: {ref: (path?: string) => any},
 *   now?: () => number,
 *   saveCache?: (cache: object) => void,
 *   logger?: {error: Function}
 * }} deps `saveCache` guarda el caché local (en app.js: `localStorage.setItem('riskOps_cache', ...)`);
 *   puede lanzar: el respaldo local es best-effort y el error se ignora.
 */
export function createTaskRepository({ database, now = Date.now, saveCache = () => {}, logger = console }) {
    /**
     * Persistencia central del progreso de UNA tarea. Escribe solo en
     * `active_sessions/{uid}/tasks/{taskId}`; devuelve/rechaza la Promise real de Firebase.
     *
     * @param {string} uid
     * @param {string|number} taskId
     * @param {object} taskData
     * @returns {Promise<void>}
     */
    function persistTaskToActiveSession(uid, taskId, taskData) {
        if (!uid) return Promise.reject(new Error('MISSING_UID'));
        if (!taskId) return Promise.reject(new Error('MISSING_TASK_ID'));

        return database.ref(`active_sessions/${uid}/tasks/${taskId}`).update(taskData);
    }

    /**
     * Lee el progreso remoto de tareas del propio gestor. `ok: false` significa "lectura no confiable":
     * el llamador debe abortar en vez de fusionar o migrar contra un estado remoto desconocido.
     *
     * @param {string} uid
     * @returns {Promise<{ok: boolean, tasks: Record<string, object>}>}
     */
    async function fetchOwnActiveSessionTasks(uid) {
        if (!uid) return { ok: false, tasks: {} };

        try {
            const snapshot = await database.ref(`active_sessions/${uid}/tasks`).once('value');

            return { ok: true, tasks: snapshot.exists() ? snapshot.val() : {} };
        } catch (e) {
            logger.error('Error al recuperar el progreso remoto de tareas:', e);

            return { ok: false, tasks: {} };
        }
    }

    /**
     * Escritura condicional usada SOLO por la migración de recuperación: aplica el registro local salvo que
     * el servidor ya tenga uno con `updatedAt` mayor en el instante de escribir.
     *
     * @param {string} uid
     * @param {string|number} taskId
     * @param {object} record
     * @returns {Promise<{committed: boolean}>}
     */
    function persistTaskIfNotNewerRemote(uid, taskId, record) {
        if (!uid) return Promise.reject(new Error('MISSING_UID'));
        if (!taskId) return Promise.reject(new Error('MISSING_TASK_ID'));

        return database.ref(`active_sessions/${uid}/tasks/${taskId}`).transaction(
            (currentValue) => resolveTaskTransaction(currentValue, record)
        );
    }

    /**
     * Migración de recuperación puntual: persiste, tarea por tarea y con la transacción condicional, lo
     * que `computeLocalTaskMigrations()` marcó como pendiente. El registro estampado se refleja en
     * `mergedCache` y en el caché local ANTES de intentar la escritura remota, para que sobreviva aunque
     * esa escritura falle. Un fallo individual no aborta el resto. `skipped` = una versión remota más
     * reciente ganó (no es un fallo).
     *
     * @param {string} uid
     * @param {Record<string, object>} mergedCache (se muta: se estampa el registro migrado)
     * @param {Record<string, object>} remoteCache
     * @returns {Promise<{migrated: string[], failed: string[], skipped: string[]}>}
     */
    async function migrateLocalTasksToActiveSession(uid, mergedCache, remoteCache) {
        if (!uid || !mergedCache) return { migrated: [], failed: [], skipped: [] };

        const migrations = computeLocalTaskMigrations(mergedCache, remoteCache, now());
        const migrated = [];
        const failed = [];
        const skipped = [];

        for (const { taskId, record } of migrations) {
            mergedCache[taskId] = record;

            try {
                saveCache(mergedCache);
            } catch (e) { /* localStorage no disponible: el respaldo local es best-effort */ }

            try {
                const result = await persistTaskIfNotNewerRemote(uid, taskId, record);

                if (result && result.committed === false) {
                    skipped.push(taskId);
                } else {
                    migrated.push(taskId);
                }
            } catch (error) {
                logger.error('Error al migrar una tarea local a Firebase durante la recuperación de sesión:', taskId, error);
                failed.push(taskId);
            }
        }

        return { migrated, failed, skipped };
    }

    /**
     * Escribe los metadatos del latido en `active_sessions/{uid}` con `update()` (nunca `set()`): solo toca
     * las llaves recibidas. Devuelve la Promise REAL (rechazada si falla) y, aparte, registra el error.
     *
     * @param {string} uid
     * @param {Record<string, unknown>} metadata sin la llave `tasks`
     * @returns {Promise<void>}
     */
    function syncSessionMetadata(uid, metadata) {
        const syncPromise = database.ref(`active_sessions/${uid}`).update(metadata);

        syncPromise.catch((e) => logger.error('Error syncing active session via SDK:', e));

        return syncPromise;
    }

    /**
     * Borra de `active_sessions/{uid}/tasks` las tareas que el caché local acaba de purgar por huérfanas
     * (W-26, comportamiento de `main`). Una sola escritura multirruta. Best-effort: devuelve la Promise
     * real para que el llamador registre el error sin bloquear la carga de tareas.
     *
     * @param {string} uid
     * @param {string[]} taskIds
     * @returns {Promise<void>}
     */
    function removeActiveSessionTasks(uid, taskIds) {
        if (!uid || !Array.isArray(taskIds) || taskIds.length === 0) return Promise.resolve();

        const removals = {};

        taskIds.forEach((taskId) => {
            removals[`active_sessions/${uid}/tasks/${taskId}`] = null;
        });

        return database.ref().update(removals);
    }

    return {
        removeActiveSessionTasks,
        persistTaskToActiveSession,
        fetchOwnActiveSessionTasks,
        persistTaskIfNotNewerRemote,
        migrateLocalTasksToActiveSession,
        syncSessionMetadata
    };
}
