# QA — Ajuste de autorización de Comunicados (Supervisor) — 2026-08-24

Rama: `feature/comunicados-supervisor-authz`
Base: `origin/main` @ `bb63345fd7439ceac916700e6b59b89c48f41613`

Estado de las Rules: **DESPLEGADAS**. El co-lead publicó las Realtime Database Rules
correspondientes en el proyecto Firebase `riskops-75637`. `database.rules.json` en este
repositorio se actualizó con el texto **literal** de la regla desplegada, tras confirmación
del co-lead tras comparar contra `riskops-75637` (ver sección "Regla desplegada" abajo),
evitando drift entre GitHub y Firebase. No se volvió a desplegar nada desde este cambio;
el despliegue lo hizo el co-lead directamente.

Entorno de este dispositivo: **sin Java instalado**. El Firebase Realtime Database
Emulator no puede ejecutarse localmente. No se instaló Java ni se modificó el entorno
del dispositivo para evitar esto.

## Clasificación de resultados

- `PASS`: ejecutado localmente y aprobado.
- `FAIL`: ejecutado localmente y fallido.
- `NOT EXECUTED – JAVA UNAVAILABLE`: requiere Firebase Emulator (Java), no disponible en este dispositivo.
- `PENDING CI`: preparado para ejecutarse en GitHub Actions o en otro entorno con Java.

## Regla desplegada (texto literal en `database.rules.json`)

```json
"$announcement_id": {
  ".write": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || (root.child('users').child(auth.uid).child('role').val() === 'Supervisor' && !data.exists() && newData.exists() && !newData.hasChild('readBy') && newData.hasChildren(['title', 'content', 'date', 'author', 'authorUid']) && newData.child('title').isString() && newData.child('content').isString() && newData.child('date').isString() && newData.child('author').isString() && newData.child('authorUid').isString() && newData.child('authorUid').val() === auth.uid))",
  "readBy": { "$reader_uid": { ".write": "auth != null && ...approved... && auth.uid === $reader_uid && !data.exists() && newData.exists()", ".validate": "newData.hasChildren(['readAt']) && newData.child('readAt').isString()" } }
}
```

Copiada literalmente de la regla que el co-lead confirmó, tras comparar contra el export
real de `riskops-75637`, que reemplaza la versión reconstruida por Claude en la iteración
anterior de este cambio. **No hay `.validate` en `$announcement_id`**: toda la validación
de forma de creación (campos requeridos como strings, `authorUid === auth.uid`, ausencia
de `readBy`) vive dentro de la rama `Supervisor` de la propia cláusula `.write` — no en una
regla separada. La rama `Admin` de `.write` sigue sin restricciones adicionales de forma
(Admin conserva escritura completa, incluida edición/eliminación). `readBy/$reader_uid` no
se tocó.

## Validaciones locales ejecutadas (sin Java)

| # | Validación | Comando | Resultado |
|---|---|---|---|
| L1 | Sintaxis de `app.js` | `node -c app.js` | `PASS` |
| L2 | `database.rules.json` es JSON válido | `node -e "JSON.parse(require('fs').readFileSync('database.rules.json','utf8'))"` | `PASS` |
| L3 | Sintaxis de los scripts de QA (`qa_matrix.js`, `migration_rehearsal.js`, `frontend_security_smoke.js`, `supervisor_comunicados_rules.spec.js`) | `node --check <archivo>` | `PASS` |
| L4 | Suite estática `frontend_security_smoke.js` (XSS, roles, cierre de turno atómico, contrato de comunicados, capacidades explícitas y `authorUid`/fallback de autor) | `cd .github/qa-infra && npm run check` | `PASS` (9/9 checks) |
| L5 | Revisión estática de que la sanitización de Fase 1 no se debilitó | `sanitizeAnnouncementHTML(c.content)` sigue apareciendo exactamente 3 veces en `app.js`, más el wrap en `saveNewComunicado()`; verificado por `testAnnouncementContract()` en L4 | `PASS` |
| L6 | Revisión estática de que ningún caso de seguridad existente fue eliminado/debilitado | `git diff` revisado manualmente: solo se agregó código (capacidades explícitas, guardas, `authorUid`, campos de Rules) y se corrigieron aserciones/payloads desactualizados para reflejar la nueva política vigente | `PASS` |

## Capacidades explícitas en `app.js`

Por pedido explícito, `canManageComunicados()` se separó en capacidades por acción:

- `canPublishComunicados(role)` — Admin, Supervisor. Usada en `openNewComunicadoModal()` y `saveNewComunicado()`.
- `canViewComunicadoLecturas(role)` — Admin, Supervisor. Usada en `viewComunicadoLecturas()`.
- `canDeleteComunicados(role)` — solo Admin. Usada en `deleteComunicado()`, en el listener de `confirmDeleteBtn`, y para decidir si se renderiza el botón de eliminar.
- `canManageComunicados(role)` se conserva como `canPublishComunicados(role) || canViewComunicadoLecturas(role)`, usada únicamente para la visibilidad del nav/vista "Gestión Comunicados" (no para decisiones de acción individuales).

## Casos obligatorios (los 12 solicitados)

| # | Caso | Capa | Clasificación | Detalle |
|---|---|---|---|---|
| 1 | Admin puede crear un comunicado | Frontend + Rules | `PASS` (frontend) / `PENDING CI` (rules) | `saveNewComunicado()` permite Admin y envía `authorUid`. Rules: caso `admin_can_create` (spec) y `admin_announcement_write` (qa_matrix.js) preparados; deben pasar contra la regla desplegada, no ejecutados aún por falta de Java. |
| 2 | Supervisor puede crear un comunicado | Frontend + Rules | `PASS` (frontend) / `PENDING CI` (rules) | Frontend: `saveNewComunicado()`/`openNewComunicadoModal()` permiten Supervisor. Rules: caso `supervisor_can_create` (spec) y `supervisor_valid_announcement_create` (qa_matrix.js, `MUST_ALLOW`, R0 y R1) preparados; ya no está bloqueado por Rules (la regla ya está desplegada), solo pendiente de ejecución por falta de Java. |
| 3 | Gestor no puede crear un comunicado | Frontend + Rules | `PASS` (frontend) / `PENDING CI` (rules) | Frontend: guardas rechazan cualquier rol fuera de `{Admin, Supervisor}`. Rules: caso `gestor_cannot_create` (spec) y `gestor_announcement_admin_write` (qa_matrix.js) preparados. |
| 4 | Supervisor puede consultar las lecturas | Frontend + Rules | `PASS` (frontend) / `PENDING CI` (rules) | Frontend: `viewComunicadoLecturas()` usa `canViewComunicadoLecturas`. Rules: `.read` de `announcements` no depende del rol; caso `supervisor_can_read_lecturas` preparado. |
| 5 | Supervisor no puede actualizar un comunicado existente | Frontend + Rules | `PASS` (frontend, no existe ruta de edición en la UI para ningún rol) / `PENDING CI` (rules) | Rules: `.write` en `$announcement_id` exige `!data.exists()` para Supervisor, por lo que un `update()`/`set()` directo sobre un registro existente queda denegado. Casos `supervisor_cannot_update_existing` (spec) y `supervisor_cannot_update_existing_announcement` (qa_matrix.js) preparados. |
| 6 | Supervisor no puede eliminar un comunicado | Frontend + Rules | `PASS` (frontend) / `PENDING CI` (rules) | Frontend: `deleteComunicado()`/`confirmDeleteBtn` rechazan a cualquiera que no sea Admin; el botón ni se renderiza para Supervisor. Rules: casos `supervisor_cannot_delete` (spec) y `supervisor_cannot_delete_existing_announcement` (qa_matrix.js) preparados. |
| 7 | Admin sí puede eliminarlo | Frontend + Rules | `PASS` (frontend) / `PENDING CI` (rules) | Frontend: `deleteComunicado()` permite Admin. Rules: Admin conserva `.write` incondicional; caso `admin_can_delete` (spec) preparado. |
| 8 | Gestor solo puede registrar su propia lectura | Frontend + Rules | `PASS` (frontend) / `PENDING CI` (rules) | `markComunicadoAsRead()` siempre escribe en `readBy/{uid propio}`. Rules: `readBy/$reader_uid` exige `auth.uid === $reader_uid`. Caso `gestor_can_mark_own_read` preparado. |
| 9 | Ningún usuario puede registrar una lectura a nombre de otro | Rules | `PENDING CI` | Cubierto por `readBy/$reader_uid.write`. Casos `gestor_cannot_mark_others_read` y `supervisor_cannot_mark_others_read` preparados. Adicionalmente, `supervisor_cannot_prefab_readby_on_create` y `supervisor_cannot_spoof_authorUid_on_create` cubren la variante "prefabricar lecturas/autor al momento de crear". |
| 10 | La publicación sigue sanitizando contenido peligroso | Frontend | `PASS` | `saveNewComunicado()` sigue envolviendo el contenido con `sanitizeAnnouncementHTML(...)` antes de guardar; los 3 puntos de renderizado también sanitizan. Sin cambios respecto a Fase 1 (L4/L5). |
| 11 | La interfaz de Supervisor muestra publicar y lecturas, pero no eliminar | Frontend | `PASS` | `renderAdminComunicados()` genera siempre "Leer"/"Lecturas"; el botón eliminar solo se genera si `canDeleteComunicados(currentUser.role)` (solo Admin). Verificado estáticamente (L4). |
| 12 | Invocar manualmente una función restringida desde consola también debe ser rechazado | Frontend + Rules | `PASS` (frontend) / `PENDING CI` (rules) | Frontend: las cuatro funciones y el listener `confirmDeleteBtn` verifican el rol al inicio, no solo el botón. Rules: caso `console_update_supervisor_delete_denied` (spec) cubre la invocación directa vía SDK, bypaseando la UI. |

## Casos nuevos derivados de la regla desplegada (más allá de los 12 originales)

| Caso | Objetivo | Clasificación |
|---|---|---|
| `supervisor_cannot_spoof_authorUid_on_create` (spec y qa_matrix.js) | Supervisor no puede crear un comunicado atribuyéndolo a otro `authorUid` (p. ej. `QA_ADMIN`) | `PENDING CI` |
| Validación de campos requeridos como strings (`title`/`content`/`date`/`author`/`authorUid`) | Un `set()` de Supervisor sin alguno de estos campos, o con un tipo incorrecto, debe ser denegado | Cubierto implícitamente por `supervisor_announcement_admin_write` (payload legado sin estos campos, sigue denegado) en qa_matrix.js |

## Comando exacto para ejecutar la suite completa cuando haya Java disponible

```bash
cd .github/qa-infra
npm ci --ignore-scripts
npx firebase setup:emulators:database

# Suite de compatibilidad Fase 1 (pinneada por SHA256 de Rules/app.js) — incluye
# los nuevos casos de Supervisor/Comunicados dentro de la matriz F0/F1 x R0/R1:
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9199 FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9100 \
  npm run qa

# Suite independiente, específica de Supervisor/Comunicados (ahora bloqueante en CI,
# ver .github/workflows/phase1-compatibility-qa.yml "Run Supervisor comunicados rules cases"):
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9199 FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9100 \
  npm run test:supervisor-comunicados-rules
```

`npm run test:supervisor-comunicados-rules` está agregado en `package.json` como script
independiente y aditivo; no modifica ni reemplaza `check`/`qa`.

## SHA256 (app.js / R1) — regenerados

Calculados con `crypto.createHash('sha256').update(content.replace(/\r\n/g,'\n'),'utf8')`,
la misma normalización que usan `qa_matrix.js` y `verify_frontend_contract.js`:

- `EXPECTED_R1_SHA256` (`database.rules.json`, actualizado en `qa_matrix.js` y en
  `phase1-compatibility-qa.yml`): `778bc484601640e034fcedea44a13cda2e3f6ffb067d26ada7500f7dab0b722b`
  — recalculado **después** de reemplazar la regla reconstruida por el texto literal que
  confirmó el co-lead (sin `.validate` en `$announcement_id`).
- `app.js` (`F1`, actualizado en `verify_frontend_contract.js`): `876049dfce42455256c3eae59f37a5d087fbbab24ca29f1ad09d4eba38a8b683`
  — sin cambios respecto al cierre anterior; `app.js` no se tocó en esta corrección de Rules.

Ambos valores están congelados en el diff pendiente de revisión del co-lead; no se ha
hecho commit ni push.

## Validación funcional con los tres roles

No se pudo ejecutar en un navegador real ni contra el emulador (sin Java disponible en
este dispositivo). Queda **PENDING CI / manual** contra `riskops-75637` (o un proyecto de
staging equivalente) una vez que se disponga de Java o de un entorno con Firebase real:

- [ ] Login como Admin: ver "Gestión Comunicados", crear, leer, ver lecturas, eliminar — todo debe funcionar.
- [ ] Login como Supervisor: ver "Gestión Comunicados", crear, leer, ver lecturas — debe funcionar; el botón eliminar no debe aparecer en ninguna fila; intentar editar/eliminar vía consola debe ser rechazado por Rules.
- [ ] Login como Gestor: no debe ver "Gestión Comunicados" en el sidebar; solo la vista normal de lectura (`Comunicados`), con confirmación de lectura propia; intentar crear vía consola debe ser rechazado por Rules.
