# Propuesta de reglas de Firebase para D3 y D7 (SOLO PROPUESTA — producción)

- **Fecha:** 2026-10-06
- **Decisiones:** D3 (a) y (b) y la parte de reglas de D7, según el plan maestro §4 ter (`../03-plan-migracion/plan-maestro-ejecucion.md`).
- **Estado:** propuesta. `database.rules.json` **NO se modificó**. Para aplicarla hace falta autorización explícita (plan §7) y pasar antes las pruebas del emulador de la sección 6.
- **Fuentes leídas (solo lectura):** `database.rules.json`, `login.js` (alta de usuario 195-213, login 293-310), `app.js` (escrituras a `users` 525/532/581/613/4225/4255/6825; alta de permisos 3453-3476; `markAllAsRead` 4860-4897; `updatePermissionStatus` 4433-4446) y `emulator_data/database_export` (forma real de los nodos `users`).
- **Verificación hecha aquí:** un evaluador local simplificado de expresiones de reglas (cascada de `.write`, `.validate` en los nodos que cambian, `data.parent()`, `hasChildren`, `isBoolean`, `isString`, `matches`) corrió 40 casos contra las reglas ACTUALES y contra las PROPUESTAS (tabla de la sección 5). **No sustituye al emulador**: el evaluador no reproduce todos los matices del motor de Firebase.

## 1. Nombres reales verificados (no supuestos)

| Concepto | Nombre real | Dónde se comprobó |
|---|---|---|
| Rol del usuario | `users/{uid}/role`, valores `'Admin'`, `'Supervisor'`, `'Gestor'` (distingue mayúsculas) | `login.js` 195/207, `src/config/roles.js`, reglas actuales |
| Aprobación de la cuenta | `users/{uid}/approved`: `false` (alta, pendiente), `true` (aprobada, app.js 4225), `'Rechazado'` (app.js 4256) | `login.js` 208/300/307, app.js |
| Estado inicial | `users/{uid}/status: "pending"` (alta); luego el propio usuario escribe `'Activo'`/`'Inactivo'` (app.js 525-613) | `login.js` 209, app.js |
| Campos que escribe el alta | `name`, `email`, `shift` (`"Por Asignar"`), `role`, `approved`, `status`, `registrationDate` — exactamente los que tiene `emulator_data` | `login.js` 203-213 |
| Flag sensible | `users/{uid}/hasSplitShift` (booleano; solo lo escribe `toggleGestorSplitShift`, vista Config. Gestores, solo Admin) | app.js 6825, 5092 |
| Solicitante de un permiso | **`permissions/{id}/uid`** (uid de Firebase Auth del solicitante). También existen `email` y `gestor` (nombre), pero el campo que las reglas ya usan como dueño es `uid`. **No existe `requestedBy`.** | app.js 3455, reglas actuales (`newData.child('uid').val() === auth.uid`, `notified/.write`) |
| Estados de un permiso | `status`: `'Pendiente'`, `'Aprobado'`, `'Rechazado'`; `approved` del permiso se crea en `false` y app.js no lo vuelve a escribir | app.js 3466-3467, 4430, 4408 |

## 2. Diagnóstico de las reglas actuales

- **D3 (a):** el alta propia (`auth.uid === $uid && !data.exists()`) ya obliga `role === 'Gestor'` y `approved === false`, pero **no** controla `hasSplitShift` (no tiene `.validate`), acepta `status` `'Activo'`/`'Inactivo'` en el alta (o ninguno) y acepta cualquier campo extra (p. ej. `isAdmin`). Casos A2, A5, A6, A7 y A10.
- **D3 (b):** `permissions/$perm_id/.write` deja a cualquier Admin/Supervisor aprobado escribir `status` en **cualquier** permiso, incluido el suyo (B2-B4). Además puede **cambiar el `uid`** de su permiso o crear uno a nombre de otro uid (B6, B11) y crearlo ya `'Aprobado'` (B12): sin cerrar eso, una regla "aprobador ≠ solicitante" se esquiva.
- **D7 (c):** la exigencia de rol leída de `root.child('users').child(auth.uid)` **ya existe** en los `.write`: `users/$uid` solo Admin aprobado; `permissions/$perm_id` Admin o Supervisor aprobados (B13, B17, C4, C5 lo confirman). Lo que falta es que los `.validate` de los campos de aprobación también lo exijan (hoy comprueban el rol pero NO `approved === true`, y aceptan cualquier valor de un Admin: C6, A15). La propuesta repite la condición completa en los `.validate` de `approved`/`status`, para que una futura ampliación de un `.write` (como el de `notified`) no abra la aprobación por accidente. Para `users` se mantiene **solo Admin** (la decisión dice "supervisor/admin", pero hoy la escritura de `users` y la sección de la interfaz son solo de Admin; ampliarla a Supervisor sería una regla de negocio nueva no decidida).

## 3. Cambio (a) + (c) en `users/$uid` — antes / después

**Antes** (`database.rules.json`, nodo `users`, tal cual):

```json
{
  "users": {
    ".read": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor')",
    ".indexOn": [
      "role",
      "status",
      "approved",
      "email"
    ],
    "$uid": {
      ".read": "auth != null && (auth.uid === $uid || (root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor')))",
      ".write": "auth != null && ((root.child('users').child(auth.uid).child('approved').val() === true && root.child('users').child(auth.uid).child('role').val() === 'Admin') || (auth.uid === $uid && !data.exists() && newData.exists()))",
      "role": {
        ".validate": "root.child('users').child(auth.uid).child('role').val() === 'Admin' || newData.val() === 'Gestor'"
      },
      "approved": {
        ".validate": "root.child('users').child(auth.uid).child('role').val() === 'Admin' || newData.val() === false"
      },
      "email": {
        ".validate": "root.child('users').child(auth.uid).child('role').val() === 'Admin' || newData.val().matches(/^[A-Za-z0-9._%+-]+@virtualsoft\\.tech$/i)"
      },
      "status": {
        ".validate": "root.child('users').child(auth.uid).child('role').val() === 'Admin' || newData.val() === 'pending' || newData.val() === 'Activo' || newData.val() === 'Inactivo'",
        ".write": "auth != null && auth.uid === $uid && root.child('users').child(auth.uid).child('approved').val() === true && data.exists() && (newData.val() === 'Activo' || newData.val() === 'Inactivo')"
      }
    }
  }
}
```

**Después** (propuesto; `.read`, `.indexOn`, `.write`, `email` y `status/.write` quedan IGUAL):

```json
{
  "users": {
    ".read": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor')",
    ".indexOn": [
      "role",
      "status",
      "approved",
      "email"
    ],
    "$uid": {
      ".read": "auth != null && (auth.uid === $uid || (root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor')))",
      ".write": "auth != null && ((root.child('users').child(auth.uid).child('approved').val() === true && root.child('users').child(auth.uid).child('role').val() === 'Admin') || (auth.uid === $uid && !data.exists() && newData.exists()))",
      ".validate": "(root.child('users').child(auth.uid).child('approved').val() === true && root.child('users').child(auth.uid).child('role').val() === 'Admin') || data.exists() || newData.hasChildren(['name', 'email', 'role', 'approved', 'status', 'registrationDate'])",
      "role": {
        ".validate": "((root.child('users').child(auth.uid).child('approved').val() === true && root.child('users').child(auth.uid).child('role').val() === 'Admin') && (newData.val() === 'Gestor' || newData.val() === 'Supervisor' || newData.val() === 'Admin')) || (!data.exists() && newData.val() === 'Gestor')"
      },
      "approved": {
        ".validate": "((root.child('users').child(auth.uid).child('approved').val() === true && root.child('users').child(auth.uid).child('role').val() === 'Admin') && (newData.val() === true || newData.val() === false || newData.val() === 'Rechazado')) || (!data.exists() && newData.val() === false)"
      },
      "email": {
        ".validate": "root.child('users').child(auth.uid).child('role').val() === 'Admin' || newData.val().matches(/^[A-Za-z0-9._%+-]+@virtualsoft\\.tech$/i)"
      },
      "status": {
        ".write": "auth != null && auth.uid === $uid && root.child('users').child(auth.uid).child('approved').val() === true && data.exists() && (newData.val() === 'Activo' || newData.val() === 'Inactivo')",
        ".validate": "(root.child('users').child(auth.uid).child('approved').val() === true && root.child('users').child(auth.uid).child('role').val() === 'Admin') || (!data.exists() && newData.val() === 'pending') || (data.exists() && (newData.val() === 'Activo' || newData.val() === 'Inactivo'))"
      },
      "hasSplitShift": {
        ".validate": "(root.child('users').child(auth.uid).child('approved').val() === true && root.child('users').child(auth.uid).child('role').val() === 'Admin') && newData.isBoolean()"
      },
      "name": {
        ".validate": "(root.child('users').child(auth.uid).child('approved').val() === true && root.child('users').child(auth.uid).child('role').val() === 'Admin') || newData.isString()"
      },
      "shift": {
        ".validate": "(root.child('users').child(auth.uid).child('approved').val() === true && root.child('users').child(auth.uid).child('role').val() === 'Admin') || newData.isString()"
      },
      "registrationDate": {
        ".validate": "(root.child('users').child(auth.uid).child('approved').val() === true && root.child('users').child(auth.uid).child('role').val() === 'Admin') || newData.isString()"
      },
      "$other": {
        ".validate": "(root.child('users').child(auth.uid).child('approved').val() === true && root.child('users').child(auth.uid).child('role').val() === 'Admin')"
      }
    }
  }
}
```

Qué cambia y por qué:

| Regla | Cambio | Efecto |
|---|---|---|
| `$uid/.validate` (nueva) | Si quien escribe no es Admin aprobado y el nodo NO existe (alta propia), exige `name`, `email`, `role`, `approved`, `status` y `registrationDate`. | El alta siempre trae estado inicial explícito. |
| `role/.validate` | Admin aprobado: solo `'Gestor'`, `'Supervisor'` o `'Admin'`. Resto: solo en el alta y solo `'Gestor'`. | Ningún rol privilegiado en el alta (igual que hoy) y ningún valor de rol inventado. |
| `approved/.validate` | Admin aprobado: solo `true`, `false` o `'Rechazado'`. Resto: solo en el alta y solo `false`. | Estado inicial pendiente; la revisión de D9a (`false`) y el rechazo (`'Rechazado'`) siguen permitidos al Admin. |
| `status/.validate` | Alta: solo `'pending'`. Después, el propio usuario: `'Activo'`/`'Inactivo'` (lo que ya permite `status/.write`). Admin: sin cambio. | Estado inicial pendiente obligatorio (D3 a). |
| `hasSplitShift/.validate` (nueva) | Solo Admin aprobado y solo booleano. | Nadie puede crearse el nodo con `hasSplitShift: true` (D3 a, RN-1). |
| `name`, `shift`, `registrationDate` (nuevas) | Texto, salvo Admin. | Lista blanca del alta. |
| `$other/.validate` (nueva) | Cualquier otro campo (`approvalDate`, `rejectionReason`, `isAdmin`, ...) solo lo escribe un Admin aprobado. | Sin campos sensibles inventados en el alta; aprobar/rechazar/revertir (Admin) siguen funcionando. |

## 4. Cambio (b) + (c) en `permissions/$perm_id` — antes / después

**Antes** (`database.rules.json`, nodo `permissions`, tal cual):

```json
{
  "permissions": {
    ".read": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor' || (query.orderByChild === 'uid' && query.equalTo === auth.uid))",
    ".indexOn": [
      "status",
      "gestor",
      "uid",
      "fecha",
      "tipo"
    ],
    "$perm_id": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor' || data.child('uid').val() === auth.uid)",
      ".write": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor' || (!data.exists() && newData.exists() && newData.child('uid').val() === auth.uid))",
      "uid": {
        ".validate": "root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor' || newData.val() === auth.uid"
      },
      "status": {
        ".validate": "root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor' || (!data.exists() && newData.val() === 'Pendiente')"
      },
      "approved": {
        ".validate": "root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor' || (!data.exists() && newData.val() === false)"
      },
      "notified": {
        ".write": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && root.child('permissions').child($perm_id).child('uid').val() === auth.uid && data.val() === false && newData.val() === true"
      }
    }
  }
}
```

**Después** (propuesto; `.read`, `.indexOn`, `.write` y `notified` quedan IGUAL):

```json
{
  "permissions": {
    ".read": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor' || (query.orderByChild === 'uid' && query.equalTo === auth.uid))",
    ".indexOn": [
      "status",
      "gestor",
      "uid",
      "fecha",
      "tipo"
    ],
    "$perm_id": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor' || data.child('uid').val() === auth.uid)",
      ".write": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor' || (!data.exists() && newData.exists() && newData.child('uid').val() === auth.uid))",
      ".validate": "data.exists() || newData.hasChildren(['uid', 'status'])",
      "uid": {
        ".validate": "(!data.exists() && newData.val() === auth.uid) || (data.exists() && newData.val() === data.val())"
      },
      "status": {
        ".validate": "(!data.exists() && newData.val() === 'Pendiente') || (data.exists() && (root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor')) && (newData.val() === data.val() || ((newData.val() === 'Pendiente' || newData.val() === 'Aprobado' || newData.val() === 'Rechazado') && data.parent().child('uid').val() !== auth.uid)))"
      },
      "approved": {
        ".validate": "(!data.exists() && newData.val() === false) || (data.exists() && (root.child('users').child(auth.uid).child('approved').val() === true && (root.child('users').child(auth.uid).child('role').val() === 'Admin' || root.child('users').child(auth.uid).child('role').val() === 'Supervisor')) && (newData.val() === data.val() || data.parent().child('uid').val() !== auth.uid))"
      },
      "notified": {
        ".write": "auth != null && root.child('users').child(auth.uid).child('approved').val() === true && root.child('permissions').child($perm_id).child('uid').val() === auth.uid && data.val() === false && newData.val() === true"
      }
    }
  }
}
```

Qué cambia y por qué:

| Regla | Cambio | Efecto |
|---|---|---|
| `$perm_id/.validate` (nueva) | Al CREAR un permiso, `uid` y `status` son obligatorios. | No hay permisos nuevos sin solicitante (la regla anti-autoaprobación depende de `uid`). |
| `uid/.validate` | Al crear: `uid === auth.uid` para TODOS (hoy un Admin/Supervisor podía poner cualquier uid). Después: inmutable. | No se puede "regalar" la solicitud a otro uid para luego aprobarla (B6, B11). |
| `status/.validate` | Al crear: solo `'Pendiente'` (para todos). Después: solo Admin/Supervisor **aprobados**, solo valores conocidos y, si el valor cambia, **`data.parent().child('uid').val() !== auth.uid`** (quien aprueba o rechaza no es quien solicitó). | D3 (b): un Supervisor (o Admin) no puede aprobar ni rechazar su propia solicitud. D7 (c): rol leído de `root.child('users').child(auth.uid)` también en el `.validate`. |
| `approved/.validate` | Misma lógica que `status` (en el alta `false`; después solo gestores aprobados y nunca sobre la propia solicitud). | Cierra la variante con el campo `approved` del permiso (B16). |

Se compara contra `data.parent().child('uid')` (el `uid` YA guardado) y no contra `newData`, para que un `update` que cambie `uid` y `status` a la vez no burle la comprobación (además `uid` queda inmutable).

## 5. Resultado del evaluador local (actual vs propuesta)

`OK` = el resultado coincide con lo esperado en ambas columnas. Entre paréntesis, la regla que deniega.

```
OK  A1 alta login.js (Gestor)                                              hoy=true | propuesta=true
OK  A2 alta con hasSplitShift:true                                         hoy=true | propuesta=false (validate users/nuevo/hasSplitShift)
OK  A3 alta con role Admin                                                 hoy=false (validate users/nuevo/role) | propuesta=false (validate users/nuevo/role)
OK  A4 alta con role Supervisor (login.js lo permite en el formulario)     hoy=false (validate users/nuevo/role) | propuesta=false (validate users/nuevo/role)
OK  A5 alta con status Activo                                              hoy=true | propuesta=false (validate users/nuevo/status)
OK  A6 alta sin status                                                     hoy=true | propuesta=false (validate users/nuevo)
OK  A7 alta con campo extra isAdmin                                        hoy=true | propuesta=false (validate users/nuevo/isAdmin)
OK  A8 alta con approved true                                              hoy=false (validate users/nuevo/approved) | propuesta=false (validate users/nuevo/approved)
OK  A9 alta de OTRO uid                                                    hoy=false (write users/otro) | propuesta=false (write users/otro)
OK  A10 alta multi-ruta: nodo + hasSplitShift                              hoy=true | propuesta=false (validate users/nuevo/hasSplitShift)
OK  A11 gestor aprobado: status Activo (app.js 532)                        hoy=true | propuesta=true
OK  A12 gestor aprobado: status Inactivo                                   hoy=true | propuesta=true
OK  A13 gestor: se pone hasSplitShift                                      hoy=false (write users/gest1/hasSplitShift) | propuesta=false (write users/gest1/hasSplitShift)
OK  A14 Admin: toggleGestorSplitShift true (app.js 6825)                   hoy=true | propuesta=true
OK  A15 Admin: hasSplitShift no booleano                                   hoy=true | propuesta=false (validate users/gest1/hasSplitShift)
OK  A16 Supervisor: hasSplitShift                                          hoy=false (write users/gest1/hasSplitShift) | propuesta=false (write users/gest1/hasSplitShift)
OK  C1 Admin aprueba usuario (app.js 4225)                                 hoy=true | propuesta=true
OK  C2 Admin rechaza usuario (app.js 4255)                                 hoy=true | propuesta=true
OK  C3 Admin revierte rechazo (D9a)                                        hoy=true | propuesta=true
OK  C4 Supervisor aprueba usuario                                          hoy=false (write users/target/approved) | propuesta=false (write users/target/approved)
OK  C5 Gestor aprueba usuario                                              hoy=false (write users/target/approved) | propuesta=false (write users/target/approved)
OK  C6 Admin escribe approved "si"                                         hoy=true | propuesta=false (validate users/target/approved)
OK  B1 Supervisor aprueba permiso de un gestor                             hoy=true | propuesta=true
OK  B2 Supervisor aprueba SU PROPIO permiso                                hoy=true | propuesta=false (validate permissions/ps/status)
OK  B3 Supervisor rechaza SU PROPIO permiso                                hoy=true | propuesta=false (validate permissions/ps/status)
OK  B4 Admin aprueba SU PROPIO permiso                                     hoy=true | propuesta=false (validate permissions/pa/status)
OK  B5 Admin aprueba permiso del Supervisor                                hoy=true | propuesta=true
OK  B6 Supervisor cambia uid de su permiso y lo aprueba                    hoy=true | propuesta=false (validate permissions/ps/uid)
OK  B7 Supervisor marca notified_admin de su propio permiso (markAllAsRead 4874) hoy=true | propuesta=true
OK  B8 Gestor marca notified de su permiso resuelto (4890)                 hoy=true | propuesta=true
OK  B9 Gestor crea su permiso (app.js 3476)                                hoy=true | propuesta=true
OK  B10 Supervisor crea su propio permiso                                  hoy=true | propuesta=true
OK  B11 Supervisor crea permiso a nombre de otro uid                       hoy=true | propuesta=false (validate permissions/nuevo/uid)
OK  B12 Supervisor crea permiso ya Aprobado                                hoy=true | propuesta=false (validate permissions/nuevo/status)
OK  B13 Gestor aprueba su permiso                                          hoy=false (write permissions/pg/status) | propuesta=false (write permissions/pg/status)
OK  B14 Gestor crea permiso ya Aprobado                                    hoy=false (validate permissions/nuevo/status) | propuesta=false (validate permissions/nuevo/status)
OK  B15 Supervisor aprueba permiso legacy sin uid                          hoy=true | propuesta=true
OK  B16 Supervisor pone approved:true en su propio permiso                 hoy=true | propuesta=false (validate permissions/ps/approved)
OK  B17 Supervisor NO aprobado aprueba permiso                             hoy=false (write permissions/pg/status) | propuesta=false (write permissions/pg/status)

Todos los casos coinciden con lo esperado
```

## 6. Flujos actuales que podrían romperse y cómo probarlo en el emulador

### 6.1 Riesgos por regla

| Regla | Flujo de app.js / login.js afectado | Riesgo | Mitigación |
|---|---|---|---|
| `users/$uid/.validate` + `$other` | Alta de `login.js` (203-213) | Si `login.js` agrega un campo nuevo al alta (p. ej. `phone`), el alta fallará con `PERMISSION_DENIED` y quedará una cuenta de Auth **sin nodo** en `users` (login.js no la borra). | Agregar el campo a la lista blanca al mismo tiempo que se cambie `login.js`. Caso A1 obligatorio en cada despliegue de reglas. |
| `role/.validate` | Registro eligiendo "Supervisor" en el formulario (`login.js` 173/195: `finalRole = 'Supervisor'`) | **Ya falla hoy** (la regla actual también exige `'Gestor'`, caso A4): el usuario ve "Error al crear la cuenta" y la cuenta de Auth queda creada sin nodo. La propuesta NO lo cambia. | Hallazgo para producción (fuera de este alcance): `login.js` debería registrar siempre `'Gestor'` y mandar el rol pedido solo en la notificación (`Rol_Solicitado`, que ya envía). El ascenso a Supervisor lo hace un Admin. |
| `status/.validate` | `users/{uid}/status` = `'Activo'`/`'Inactivo'` (app.js 525, 532, 581, 613) | Ninguno: requiere que `status` exista, igual que el `status/.write` actual (un nodo sin `status` ya no puede escribirlo hoy). | Casos A11/A12. |
| `hasSplitShift/.validate` | `toggleGestorSplitShift` (app.js 6825, Admin) | Ninguno mientras se escriba un booleano (`checkbox.checked`). Un Admin con `approved !== true` ya no podía escribir (`.write`). | Caso A14/A15. |
| `approved/.validate` (users) | `approveUser` (4225), `confirmRejectUser` (4255), `revertRejectedUser` (D9a, refactor) | Ninguno: escriben `true`, `'Rechazado'` y `false`. | Casos C1-C3. |
| `permissions/.../status` y `approved` | `confirmApprovePerm` / `confirmRejectPerm` → `updatePermissionStatus` (4433) | **Cambio visible:** un Supervisor o Admin que solicitó un permiso ya no puede resolverlo; hoy la interfaz le muestra los botones y recibiría "Error al contactar al servidor". Si solo hay un Admin y ningún Supervisor, nadie podrá resolver los permisos del Admin. | Antes de aplicar: decidir quién resuelve los permisos de Admin/Supervisor. En el refactor (no hecho todavía, depende de esta autorización): ocultar los botones o mostrar un mensaje claro cuando `p.uid === currentUser.uid`. |
| `permissions/$perm_id/.validate` y `uid/.validate` | Alta de permisos (app.js 3453-3476) | Si `userUid` es `null` (sin `currentUser.uid` ni sesión de Auth), hoy un Gestor ya falla (la `.write` exige `uid === auth.uid`); con la propuesta también falla para Admin/Supervisor. app.js atrapa el error y solo lo registra en consola (3477-3479) y aun así envía el correo de FormSubmit: la solicitud llegaría por correo pero no a Firebase. | Ya ocurre hoy para Gestores; documentado. Caso B9/B10. |
| `uid` inmutable | `markAllAsRead` (4860-4897), `notified` | Ninguno: solo escriben `notified_admin`/`notified`. | Casos B7/B8. |
| Permisos **legacy sin `uid`** | Aprobación de permisos antiguos | La comprobación anti-autoaprobación no aplica (no hay solicitante que comparar: caso B15, sigue permitido). | Consultar antes en el emulador/producción `permissions` sin `uid` (ver 6.3) y completarlos o resolverlos antes de aplicar. |

### 6.2 Pruebas en el emulador del laboratorio (`Iniciar_Laboratorio_Local.bat`: Auth 9099, Realtime DB 9000, UI 4000)

1. Copiar `database.rules.json` a un archivo de prueba (p. ej. `database.rules.propuesta.json`) y aplicar en él los bloques "Después". En una copia de `firebase.json` del laboratorio, apuntar `database.rules` a ese archivo (no tocar el `firebase.json` del repositorio). Arrancar el emulador con esa copia.
2. Datos semilla (importar con la UI del emulador o con `firebase database:set --instance <db> --project demo-...` contra el emulador): `users/admin1 {role:'Admin', approved:true, status:'Activo'}`, `users/sup1 {role:'Supervisor', approved:true, status:'Activo'}`, `users/gest1 {role:'Gestor', approved:true, status:'Activo'}`, `users/target {… approved:false, status:'pending'}`, `users/rej {… approved:'Rechazado', rejectionReason:'x'}`, y `permissions/pg {uid:'gest1', status:'Pendiente', approved:false, notified:false, notified_admin:false}`, `permissions/ps {uid:'sup1', …}`, `permissions/pa {uid:'admin1', …}`. **Ojo:** el `emulator_data` actual no tiene ningún usuario `Admin`; hay que crearlo para probar C1-C3 y A14.
3. Ejecutar los 40 casos de la sección 5 con identidades reales del emulador. La forma más directa es `@firebase/rules-unit-testing` (`initializeTestEnvironment({ projectId: 'demo-riskops', database: { rules, host: '127.0.0.1', port: 9000 } })`, `env.authenticatedContext('sup1').database().ref('permissions/ps').update({...})` con `assertFails`/`assertSucceeds`), o bien la app real en `http://127.0.0.1:5000` con usuarios del emulador de Auth:
   - **A1/A2/A4/A7** (alta): registrar desde `login.html` (A1 debe funcionar; para A2/A7 hacer el `set` desde la consola del navegador con la sesión recién creada) y comprobar `PERMISSION_DENIED`.
   - **A11/A12** (estado propio): iniciar sesión como Gestor y forzar inactividad / volver (cambia `status`).
   - **A14** (Config. Gestores): como Admin, activar/desactivar "Turno Partido".
   - **C1-C3** (Aprobaciones → Gestión de Usuarios): aprobar, rechazar y, con el refactor del laboratorio, filtrar "Rechazados" → "Revertir".
   - **B1-B5** (Aprobaciones → Permisos): solicitar un permiso como Supervisor (pestaña Permisos), entrar como el mismo Supervisor y aprobarlo → debe fallar; entrar como Admin u otro Supervisor y aprobarlo → debe funcionar.
   - **B7/B8** (campana): "marcar todo como leído" como Supervisor con un permiso propio pendiente, y como Gestor con un permiso resuelto.
4. Repetir los mismos casos con las reglas ACTUALES para confirmar la columna "hoy" (debe coincidir con la sección 5; cualquier diferencia indica un matiz del motor que el evaluador local no reproduce y obliga a revisar la propuesta).

### 6.3 Consultas previas recomendadas (solo lectura)

- Permisos sin `uid`: en la UI del emulador o con la consola, `permissions` ordenado por `uid` y filtrado por `null` (o un recorrido del export). Son los que quedan fuera de la regla anti-autoaprobación.
- Usuarios con `approved` distinto de `true`/`false`/`'Rechazado'`, o con `role` fuera de `Admin`/`Supervisor`/`Gestor`: no se bloquean al leer, pero cualquier escritura de un Admin sobre esos campos tendrá que usar un valor válido.

## 7. Qué queda pendiente

- Autorización explícita para aplicar en `database.rules.json` (plan §7) y prueba completa en el emulador (sección 6).
- Decidir quién resuelve los permisos solicitados por Admin/Supervisor (sección 6.1) y, tras aplicar la regla, la mejora de interfaz en `approvals-controller.js` (ocultar o explicar cuando el aprobador es el solicitante).
- Hallazgo de `login.js`: el formulario ofrece el rol "Supervisor" pero las reglas (actuales y propuestas) solo aceptan `'Gestor'` en el alta.

