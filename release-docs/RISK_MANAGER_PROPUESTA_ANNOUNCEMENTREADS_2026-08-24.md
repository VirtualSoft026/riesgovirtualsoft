# Propuesta (NO implementada) — Mover `readBy` a `announcementReads/{announcementId}/{uid}`

Estado: **propuesta de diseño únicamente**. No se modificó `database.rules.json`, `app.js`
ni ningún dato en Firebase para esta propuesta. Requiere decisión de alcance y de
compatibilidad de datos por parte del co-lead antes de implementarse.

## Problema que resuelve

Hoy, `readBy` vive anidado dentro de cada comunicado: `announcements/$announcement_id/readBy/$reader_uid`.
La regla `.read` de `announcements` es:

```json
".read": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true"
```

Esta regla se aplica a **todo el subárbol** de `announcements`, incluido `readBy`. En la
práctica, esto significa que **cualquier usuario aprobado — incluido un Gestor — puede leer
el `readBy` completo de cualquier comunicado** (todos los UID que lo han leído, sus nombres
y `readAt`) simplemente leyendo el nodo del comunicado, aunque la UI nunca le muestre esa
información. Esto no coincide con el requisito funcional de que **solo Admin/Supervisor
puedan consultar quién ha leído y quién no** — hoy esa restricción existe solo en la capa
de UI (`viewComunicadoLecturas()` gateada por `canViewComunicadoLecturas()`), no en Rules.
Un Gestor con acceso a la consola del navegador o al SDK de Firebase podría consultar esos
datos directamente, sin que la UI se lo impida a nivel de datos.

Separar `readBy` en su propio nodo de nivel superior permite aplicarle una regla `.read`
independiente de la de `announcements` (que debe seguir siendo legible por todos los
aprobados, para que cualquiera pueda leer el contenido del comunicado).

## Esquema propuesto

```
announcementReads/
  {announcementId}/
    {uid}/
      readAt: string (ISO 8601)
      name: string   (igual que hoy en readBy/$reader_uid)
```

Mismo shape que el actual `readBy/$reader_uid`, solo que en un nodo raíz separado en vez de
anidado bajo `announcements/$announcement_id`.

## Reglas propuestas (borrador, NO aplicado)

```json
"announcementReads": {
  "$announcement_id": {
    ".read": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor')",
    "$reader_uid": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && auth.uid === $reader_uid",
      ".write": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && auth.uid === $reader_uid && !data.exists() && newData.exists()",
      ".validate": "newData.hasChildren(['readAt']) && newData.child('readAt').isString()"
    }
  }
}
```

- `.read` a nivel `$announcement_id` (todo el mapa de lectores de un comunicado): solo
  Admin/Supervisor — esto es lo que hoy falta.
- `.read` a nivel `$reader_uid` (un recibo individual): el propio dueño, aunque no sea
  Admin/Supervisor — necesario para que `renderGestorComunicados()`/`updateUnreadBadge()`
  puedan seguir consultando "¿ya leí esto?" sin ser Admin/Supervisor. En Realtime Database
  las reglas `.read` cascadean hacia abajo (si el padre concede lectura, se hereda), así que
  un Admin/Supervisor ya puede leer `$reader_uid` vía la regla del padre; la regla en
  `$reader_uid` solo añade el caso adicional del propio dueño.
- `.write` y `.validate` sin cambios respecto al `readBy/$reader_uid` actual (solo el propio
  usuario, solo una vez, `readAt` como string).
- Se retira `readBy` de `announcements/$announcement_id` (deja de existir esa subrama en la
  regla).

## Cambios de `app.js` que implicaría (NO implementados)

Todos los sitios que hoy leen/escriben `c.readBy` o `announcements/.../readBy/...` pasarían
a usar `announcementReads/{id}/...`:

- `markComunicadoAsRead(id)` — escribe en `announcementReads/${id}/${uid}` en vez de `announcements/${id}/readBy/${uid}`.
- `renderGestorComunicados()` — necesita el mapa de lecturas propias para pintar "Leído"/botón de confirmación; requeriría cargar `announcementReads/{id}/{propio uid}` (o mantener un listener agregado del propio usuario) en vez de leer `c.readBy[uid]` directamente del objeto del comunicado.
- `checkUnreadUrgentAnnouncements()` — misma dependencia que arriba.
- `updateUnreadBadge()` — igual.
- `viewComunicadoLecturas(id)` — pasaría a leer `announcementReads/{id}` completo (ahora permitido solo para Admin/Supervisor también a nivel de Rules, no solo de UI).
- `renderAdminComunicados()` — el conteo `readCount = Object.keys(c.readBy).length` necesitaría una lectura/listener separado a `announcementReads/{id}` (o mantener un contador denormalizado, ver "Alternativas" abajo).

Esto convierte una lectura hoy "gratis" (venía incluida en el objeto del comunicado) en N
lecturas/listeners adicionales — impacto de rendimiento y de complejidad de código a
evaluar, no solo de Rules.

## Migración de datos (necesaria, no trivial)

Los comunicados existentes ya tienen `readBy` embebido. Se necesitaría:

1. Un script de migración (patrón similar a `migration_rehearsal.js`, que ya existe en este
   repo para el caso UID-only de `permissions`/`login_logs`) que copie
   `announcements/{id}/readBy/*` → `announcementReads/{id}/*` para cada comunicado existente.
2. Decidir si `readBy` se elimina de `announcements` en el mismo paso, o se deja como
   respaldo de solo-lectura por un período de transición (más seguro para rollback, pero
   mantiene la superficie de exposición original mientras tanto).
3. Ensayo en Firebase Emulator con datos sintéticos antes de tocar `riskops-75637`, siguiendo
   el mismo patrón de `runMigrationRehearsal()` en `qa_matrix.js` (plan idempotente,
   verificable, con conteo esperado de registros migrados).

## Riesgo de ventana de despliegue (doble escritura)

Si el despliegue de Rules + `app.js` no es atómico, hay una ventana donde una versión de la
app en el navegador de un usuario aún escribe/lee `readBy` bajo `announcements` mientras
otra ya usa `announcementReads` — los "leídos" registrados durante esa ventana podrían
divergir entre ambos esquemas. Mitigaciones posibles a decidir con el co-lead:
- Escribir en ambos nodos durante una fase de transición (dual-write) y solo cortar el nodo
  legado una vez confirmado que todos los clientes activos usan la versión nueva.
- Forzar refresco de sesión/versión de `app.js` coordinado con el despliegue de Rules.

## Alternativas consideradas (no descartadas, solo anotadas)

- **Denormalizar solo el conteo** (`announcements/{id}/readCount`) en vez de mover todo
  `readBy`, y mantener el listado detallado en `announcementReads`. Reduce el impacto en
  `renderAdminComunicados()` (conteo sigue "gratis") a costa de mantener el conteo
  sincronizado (Cloud Function o escritura doble en el cliente).
- **Dejar `readBy` donde está pero mover la lectura agregada detrás de un endpoint/función**
  (Cloud Function callable) en vez de una regla de Realtime Database — más control, pero
  requiere infraestructura de Cloud Functions que hoy no está en uso en este proyecto (ver
  `backend.py`/scripts locales existentes, no hay Functions desplegadas).

## Qué decisión falta antes de implementar

1. **Alcance:** ¿migrar todos los comunicados existentes, o solo los que se creen desde la
   fecha de corte (dejando los antiguos con `readBy` legado y aceptando la exposición actual
   para esos registros)?
2. **Ventana de corte:** ¿dual-write temporal o despliegue coordinado de Rules + `app.js` en
   una sola ventana?
3. **Prioridad:** ¿esto se aborda antes o después de otras piezas pendientes de Fase 1.x?

No se tocó código ni Rules para esta propuesta; queda a la espera de esa decisión.
