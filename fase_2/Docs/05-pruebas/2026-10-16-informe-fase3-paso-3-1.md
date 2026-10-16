# Informe — Fase 3, paso 3.1: retiro de duplicados, seguridad y catálogos

## 1. Encabezado

- **Fecha:** 2026-10-16
- **Rama de trabajo:** `backup/fase2-refactor-2026-10-03` 
- **Paso del plan:** 3.1 de `plan-fase-3.md` (sección 8)
- **Alcance autorizado:** `app.js`, `js/tiempos.js`, `login.js`, `index.html` y `login.html`, más `src/`, `fase_2/lab/` y la documentación del paso.
- **Estado:** trabajo técnico terminado en el espacio de trabajo. **No se escribió nada en la carpeta del equipo.** Ver la sección 9.

## 2. Qué se hizo

El paso cubre los ítems W-07 a W-14, W-40, W-41, más la parte de seguridad (W-52, W-55, W-56), W-49 a y los catálogos W-44 y W-48, que se incluyó en el alcance del 3.1.

**Seguridad (W-52).** Se corrigió el sanitizador de anuncios en `src/utils/sanitization.js` hasta igualar el de `app.js` en las pruebas diferenciales. Después se escapó todo dato que llega a una plantilla HTML sin pasar por escape: en `app.js` el texto del reporte de bitácora, `displayStatus` y `ev.type` de la línea de tiempo, y en `js/tiempos.js` el gestor y la fecha. En `src/` se escaparon el rol, el correo y el nombre de gestor, la hora de inicio y de fin de los KPI, el gestor de supervisores activos, los enlaces y nombres de documentos rápidos, el motivo de rechazo y el registro de inicio de sesión. Además se añadió `noopener` a `window.open`.

**Sumideros y revisión de interpolaciones.** `cmp-interpolaciones.mjs` ahora lee una lista revisada (`fase_2/lab/auditoria-duplicados/interpolaciones-revisadas.json`) con el motivo de cada expresión segura: numérica, fecha formateada, constante, o escapada en su origen. Quedan 0 sin revisar (107 ocurrencias de 89 expresiones únicas). La herramienta también escribe `salida/sin-revisar.txt` y avisa de entradas de revisión que ya no existen en el código. `cmp-sumideros.mjs` no marca escrituras directas (0); las 11 concatenaciones que marca se revisaron y son seguras: notificaciones con datos ya escapados, texto fijo y el contenido de `kpiBitacoraHTML`, que sale del módulo escapado.

**Sesión y login (W-55).** Se creó `clearRiskOpsSessionStorage()` en `app.js` con la lista `RISKOPS_SESSION_STORAGE_KEYS`, y lo usan los cuatro caminos de cierre de sesión (CF-4.4). Se retiró el parche del 17 de junio (W-49 a). En `evaluateLoginAccess` (`src/domain/auth/auth-service.js`) un usuario con `approved === 'Rechazado'` queda rechazado; antes ese valor, por ser cadena, pasaba como aprobado. En `login.js` el mensaje de rechazo se construye con la API DOM (`textContent`), porque antes llamaba a una función `escapeHTML` que no estaba definida en esa página.

**Recursos de terceros (W-56).** Se fijaron versiones exactas y `integrity` (sha384) con `crossorigin` en boxicons, jsPDF 4.2.1, html2pdf 0.14.0, Chart.js 4.5.1 y chartjs-plugin-datalabels 2.0.0. Los hashes se calcularon desde los tarballs de npm, porque los CDN no responden desde el entorno. **Pendientes:** xlsx 0.20.0 y Firebase 8.10.1 (gstatic) siguen sin `integrity`.

**Duplicados (W-07 a W-14, W-40, W-41, W-10).** Se delegaron 57 funciones de `app.js` al bundle `RiskOps`, conservando el nombre global que usan `index.html` y `js/tiempos.js`. Se retiraron los respaldos `[Fase 2]` y las constantes duplicadas (`FORM_SUBMIT_CC`, `ANNOUNCEMENT_*`, `COMUNICADOS_*`, los umbrales de inactividad, etc.). `appendFormSubmitCc` es idempotente (W-13). La lista de manuales de `doc-links.js` es la de `main`, con 17 entradas (W-12).

**Catálogos (W-44 y W-48).** `src/services/storage/local-session-storage.js` usa `STORAGE_KEYS` de `utils/constants.js` en lugar de sus propias constantes. En ocho módulos se reemplazaron literales de rol y estado por sus constantes: `ROLES` (`gestor-config.js`, `auth-service.js`, `task-session-sync.js`), `TASK_STATUS` (`monitoring-view.js`), `SESSION_STATUS` (`login-history.js`, `kpi-indicators-view.js`), `USER_STATUS` (`task-session-sync.js`) y `APPROVED_REJECTED_VALUE` (`pending-users-table.js`). Quedan literales en comentarios y en `app.js`, que se retira en el paso 3.6.

## 3. Verificación

| Comprobación | Resultado |
|---|---|
| `build/build.mjs` + `verify-bundle.mjs` | PASS: 121 módulos, 114 espacios de nombres, 71 comprobaciones |
| `build/build-app.mjs` | OK: 8 módulos |
| Referencias `RiskOps.*` de `app.js`, `js/tiempos.js` y `login.js` | 125 únicas, 0 sin resolver en el bundle |
| Sintaxis de `app.js` y de los módulos cambiados | OK (`node --check`) |
| Suite unitaria (81 archivos `*.test.mjs` y `*.test.js`) | 81/81 PASS |
| `comparar.mjs` contra la referencia congelada (`referencia/app.pre-paso-3-1.js`) | 35 IGUAL; 4 DIFIERE, todos aceptados (ver 4) |
| `cmp-cron.mjs` contra la referencia | 0 diferencias (21 casos) |
| `cmp-extra.mjs` contra la referencia | `persistShiftClosureCore` 5/5 sin diferencias; `calculateShiftDelay` vs `buildShiftDelayBadgeHtml` 3456 casos sin diferencias |
| `cmp-multiselect.mjs` contra la referencia | 1 DIFIERE de 12 (ver 4) |
| `cmp-xss.mjs` | 34 cargas, 0 peligrosas en `app.js` y en `src/` |
| `cmp-sanitizador.mjs` (fuzz) | Diferencias residuales de anidamiento malformado, documentadas en el paso 3.0; 0 inseguras |
| `cmp-intra-src.mjs` | 0 cuerpos repetidos con otro nombre; 1 nombre repetido con contenido distinto (`MONTH_NAMES`) |
| `cmp-interpolaciones.mjs` | 0 sin revisar |
| `cmp-capas.mjs` | 2 elementos con `on*` en HTML y listener en JS (ver 5) |

La auditoría contra `app.js` actual no corre del todo: `comparar.mjs` busca `getScheduledGestoresCountForShift` en el `app.js` nuevo, y esa función ya no existe allí (W-10). Por eso la auditoría del paso se corre contra la referencia congelada, que es la que define qué se retiró.

## 4. Diferencias aceptadas (requieren confirmación del usuario)

Son cuatro diferencias de `comparar.mjs`, más una de `cmp-multiselect.mjs`:

- `normalizeName`: 8 de 250 casos, todos con entradas que no son texto. La versión de `src/` no lanza excepción; la de `app.js` sí.
- `getShiftCategory`: 1 de 129 casos, con una entrada que no es texto (mismo motivo).
- `getDocUrl`: 2 de 60 casos, con `null` y `undefined`. `src/` devuelve una ruta y `app.js` lanza excepción.
- `getManualUrl`: 5 de 60 casos. Es el cambio previsto por W-12: Belatra, Egt y Evolution apuntan ahora a los enlaces de `main`, y Playson se añade. **Esto cambia un enlace visible para el usuario.**
- `setupCustomMultiSelect` sin contenedor: `app.js` devuelve `undefined`; el módulo devuelve una API de no-op. Ningún llamador usa el valor devuelto (revisado en `src/`, `js/` y `app.js`), así que el cambio evita un `TypeError` sin efecto visible. Se propone aceptarlo.

## 5. Pendientes del paso y observaciones

- **W-56, hashes de xlsx 0.20.0 y Firebase 8.10.1.** Se creó `fase_2/lab/sri/calcular-sri.mjs`, que descarga cada URL exacta y muestra el `integrity` listo para pegar. Hay que ejecutarlo en una red con acceso a `cdn.sheetjs.com` y `gstatic.com`.
- **DE-22: Firebase 8.10.1.** La versión tiene avisos conocidos; la actualización a v10+ compat choca con la sección 6 del plan. Sigue abierta.
- **xlsx.** El plan sugiere 0.20.3; se mantuvo 0.20.0 hasta decidirlo.
- **W-49 b.** Mover `kpi_operativos_seed.json` a `fase_2/lab`, quitar la rama `isLocal` de `kpi-operativos-source.js` y publicar `kpi_operativos_v2.json` con estado vacío. **Requiere autorización en tiempo real; no se hizo.**
- **W-41, `MONTH_NAMES`.** `cronogram-parser.js` y `schedule-sheet.js` tienen el mismo nombre con contenido distinto. Hay que compararlos antes de unificar; no se tocaron.
- **`cmp-capas`.** `endShiftBtn` (el listener reemplaza al `onclick` del HTML) y `closeMonitoreoModalBtn` (el listener suma y el handler se ejecuta dos veces). Están en la portada de los pasos 3.2 y 3.4, no en el 3.1.
- **Prueba manual obligatoria.** Exportar e imprimir PDF con jsPDF 4.2.1 y html2pdf 0.14.0 (paso de CF-0.2), porque la versión mayor cambió de 2 a 4.
- **Bundle en la raíz.** `index.html` carga `riskops.bundle.js`, y en la carpeta del equipo ese archivo no existe en la raíz. Antes de la prueba manual hay que copiar `build/dist/riskops.bundle.js` a la raíz o confirmar que el pipeline de despliegue lo genera (W-06).
- **Carpeta `_hotfix/`.** La borra el usuario a mano.
- **Laboratorio e2e.** `src/tests/e2e/modales-permisos-integrado.e2e.cjs` (línea ~373) aún menciona `escapeRole: false`. Es un patrón de texto, sin efecto; se corrige después.
- **Plan §8 y W-34.** Pendiente el OK para renombrar la fila "Fase 4" y la nota de W-34.

## 6. Corrección pendiente en `criterios-de-finalizacion.md`

La fila CF-1.4 y el resumen de hallazgos citan `src/ui/views/kpi-indicators-view.js:76`, pero esa línea no es un sumidero. Los sumideros reales en ese archivo son `horaInicio` y `horaFin`, en las líneas 92 y 93; ya están escapados. El texto debe decir: "`src/ui/views/kpi-indicators-view.js` líneas 92-93 (`horaInicio`, `horaFin`)". Se aplica al escribir el documento en la carpeta del equipo.

## 7. Cambios visibles para el usuario

- Dos enlaces de manuales cambian (Belatra y Egt, y Evolution), y Playson aparece en la lista.
- Un usuario rechazado con `approved === 'Rechazado'` ya no puede entrar. Antes sí podía.
- Al cerrar sesión se borra también `riskOps_usersData` (CF-4.4). El login vuelve a leer los datos del servidor.
- Un usuario rechazado ve el motivo como texto, sin HTML.

## 8. Archivos

El paquete `paso-3-1-workspace.tar.gz` contiene el espacio de trabajo completo, sin `node_modules`, `salida` ni `build/dist`; `paso-3-1-cambios.txt` lista sus 271 archivos. Los archivos tocados en este paso son: `app.js`, `index.html`, `login.html`, `login.js`, `js/tiempos.js`, `src/**` (los módulos citados arriba, más `src/entry.js` y las pruebas de `src/tests/**`), `fase_2/lab/auditoria-duplicados/**` (herramientas, `interpolaciones-revisadas.json` y la referencia congelada) y `fase_2/lab/sri/calcular-sri.mjs`.

## 9. Lo que no se hizo

No hubo commit, push, merge ni rebase. Los cambios del paso 3.1 se escribieron en la carpeta local de la rama `backup/fase2-refactor-2026-10-03` (carpeta `riesgovirtualsoft`), con verificación de fecha de modificación (`expectedMtimeMs`) contra la copia del equipo en cada archivo que ya existía; los archivos nuevos se crearon sin comparación previa. Los cambios quedan sin confirmar en la rama; el commit lo realiza el usuario tras revisar. Tampoco se tocaron `database.rules.json`, `firebase.json`, `firebase-config.js` ni `.github/`.

## 10. Decisiones abiertas para el usuario

1. Aceptar las diferencias de la sección 4, en particular el cambio de enlaces de manuales.
2. DE-22: Firebase 8.10.1.
3. xlsx 0.20.0 o 0.20.3.
4. W-49 b, con autorización en tiempo real.
5. Revisar la carpeta local y decidir el commit (lo realiza el usuario).
