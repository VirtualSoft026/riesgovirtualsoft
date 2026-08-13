# Risk Manager — Runbook de promoción controlada a producción

Fecha de corte: 2026-08-13  
Repositorio productivo: `VirtualSoft026/riesgovirtualsoft`  
Rama productiva: `main`  
Estado: `PREPARACIÓN; SIN AUTORIZACIÓN DE DEPLOY`

## 0. Alcance, repositorios y relación con las fases

Este runbook ejecuta únicamente la promoción productiva de **Fase 1**. La [guía end-to-end y modelo de delegación](RISK_MANAGER_GUIA_END_TO_END_Y_DELEGACION_2026-08-13.md) define el programa completo, los estados oficiales, las Fases 1, 1.1, 1.5 y 2, y los paquetes de trabajo D1–D11.

Mapa mínimo:

| Elemento | Repositorio/rama o entorno | Función en este runbook |
|---|---|---|
| Producción vigente | `VirtualSoft026/riesgovirtualsoft/main` | base desde la cual se crea el release limpio y destino del PR productivo |
| Candidato limpio | `phase1-security-release` del clon de `VirtualSoft026/riesgovirtualsoft` | rama aislada creada desde `main`; futuro origen del PR productivo |
| Fuente acumulada histórica | rama local `staging-qa` | fuente de correcciones y evidencia; nunca se fusiona completa |
| Staging independiente | `daniel-puentes109/riskmanager-security-staging/main` | evidencia y arnés QA; no es el `main` productivo |
| Pruebas automáticas | Firebase Emulator | validación aislada con datos sintéticos |
| Backend real | Firebase producción | destino del PATCH UID y Rules R1, cada uno con autorización propia |

En este runbook, las letras A–D son **etapas internas de despliegue de Fase 1**; no son nuevas fases del programa:

```text
Etapa A = respaldo y recálculo
Etapa B = migración UID compatible
Etapa C = frontend compatible
Etapa D = Rules R1
```

Estados relevantes:

- `VALIDADO EN EMULATOR` no implica despliegue real.
- `PUBLICADO/VALIDADO EN STAGING` no implica que el cambio esté en `VirtualSoft026/riesgovirtualsoft/main`.
- `DESPLEGADO EN PRODUCCIÓN` sólo se registra después de ejecutar y verificar la acción aplicable en Pages productivo o Firebase real.

## 1. Objetivo

Promover la remediación de seguridad de Fase 1 con el menor riesgo operativo posible, sin asumir que el repositorio de staging es un sustituto de Firebase producción y sin copiar indiscriminadamente la rama local completa.

La estrategia busca una transición de disponibilidad casi continua. No promete cero interrupciones: GitHub Pages, caché del navegador y el cambio de Firebase Rules no forman una transacción atómica. La mitigación es una ventana corta de baja actividad, pasos reversibles y puntos de parada claros.

## 2. Estado verificado

```text
PRODUCT_MAIN_SHA                  = 43537a043dc9548d4066aca670f26209b9e77430
RELEASE_BRANCH                    = phase1-security-release
RELEASE_BASE_SHA                  = 43537a043dc9548d4066aca670f26209b9e77430
RELEASE_BRANCH_PUBLICATION        = AUTHORIZED; VERIFY_REMOTE_SHA_AFTER_PUSH
TRACKED_FILES_BEFORE_CLEANUP      = 20607
TRACKED_FILES_AFTER_CLEANUP       = 77
FILES_REMOVED_IN_CLEANUP          = 20530
STAGING_MAIN_MERGE_SHA            = fd95875176ee769519fe2059cb7e34dcfe3bd70e
STAGING_QA_HEAD_SHA               = b53bf1169753fa2f6f2a9af8406e1320998ef248
PRIVATE_UID_PATCH_BASE_COUNT      = 687
HISTORICAL_RECORDS_EXCLUDED       = 7
FIREBASE_REAL_WRITES_PERFORMED    = 0
FIREBASE_RULES_PRODUCTION_DEPLOY  = NO
PRODUCT_MAIN_MODIFIED             = NO
```

La web publicada en staging apunta al Firebase real. Por ello no debe usarse para pruebas funcionales mutantes antes de la ventana productiva. El arnés automatizado sí usa Emulator y bloquea solicitudes de red hacia producción.

## 3. Decisión de empaquetado

No se debe fusionar la rama local `staging-qa` completa en producción. Su diferencia frente a `main` contiene 57 archivos, incluidos experimentos, fixtures, scripts auxiliares y eliminaciones de temporales.

Se creó `phase1-security-release` desde el `main` productivo vigente y se portaron únicamente archivos aprobados mediante revisión de contenido. El conjunto preparado para evaluación incluye:

- frontend corregido: `app.js` y `login.js`;
- reglas y configuración de despliegue: `database.rules.json` y `firebase.json`;
- automatización MicroStrategy sin credenciales embebidas: `motor_operativo.py`, `.env.example` y `requirements.txt`;
- higiene y publicación: `.gitignore` y workflow de Pages con allowlist;
- archivos de soporte estrictamente necesarios para conservar las mecánicas actuales;
- pruebas de seguridad sin exports, reglas privadas, credenciales ni PII.

La lista final se decide por diff. No se autoriza `git add .`, `git add -A`, copia completa de staging ni incorporación de `scratch/`, exports, PATCH privados o fixtures con identidades reales.

La limpieza posterior eliminó `node_modules`, cachés, temporales, PDF internos y scripts ad hoc/directos a Firebase. Los archivos operativos incluidos en la allowlist de Pages permanecen presentes y se validan antes de publicar cada nuevo commit de la rama.

## 4. Artefactos privados preparados

El PATCH y el rollback UID-only ya fueron generados y ensayados fuera de repositorios. Sus referencias sanitizadas son:

```text
PATCH_SHA256     = 0d9f5b1fb6c9bc396534c9800271743984c9f3953ba30f364eca58b2e8268a8c
ROLLBACK_SHA256  = c10190d55e5b520315a5b5e3e7f1d4febdffd0b0c38c028e8aca7a8b21746e42
EVIDENCE_SHA256  = 22e5abaacfb69204e8a6431a4c3000bf21823983758033ad266a59e1e817ba23
```

Estos archivos son una referencia del corte analizado, no un paquete listo para aplicar en una fecha posterior. Antes del despliegue se deben obtener exports frescos y recalcular el PATCH delta porque el frontend productivo actual puede seguir creando permisos o logs sin UID.

## 5. Preparación previa, sin impacto productivo

1. Actualizar referencias remotas y confirmar el SHA de `origin/main`.
2. Detenerse si el SHA difiere del registrado y revisar el nuevo diff.
3. Confirmar que `phase1-security-release` continúa basada en ese `origin/main`.
4. Revisar y autorizar el commit local del conjunto aprobado.
5. Publicar solamente `phase1-security-release`; este `push` no actualiza `main` ni despliega Pages.
6. Ejecutar CI focalizado y verificar que el artefacto Pages contiene la aplicación necesaria y excluye laboratorio, reglas, paquetes, dumps y documentos privados.
7. Abrir un PR productivo en modo revisión, sin fusionarlo.
8. Registrar:

```text
PRE_RELEASE_MAIN_SHA
RELEASE_CANDIDATE_SHA
APP_JS_SHA256
R1_RULES_SHA256
R0_RULES_SHA256
```

## 6. Ventana controlada

Duración objetivo: 15–30 minutos de baja actividad.

Antes de empezar:

1. Informar a Gestores, Supervisores y Admin que no deben iniciar sesión, crear permisos ni finalizar turno durante la ventana.
2. Confirmar una persona técnica ejecutora y una persona validadora.
3. Confirmar acceso para restaurar Pages y Firebase Rules.
4. Tener abiertos los comandos de rollback, sin ejecutarlos.
5. Confirmar que no hay cambios no revisados en el PR.

Si no puede establecerse una pausa operativa mínima, detener el release. Sin congelar escrituras existe una carrera entre el export, el PATCH y nuevos registros heredados sin UID.

## 7. Etapa A de Fase 1 — respaldo y recálculo de migración

1. Exportar de forma privada el estado necesario de Firebase RTDB.
2. Guardar una copia exacta de las reglas productivas R0 y su SHA-256.
3. Registrar el SHA productivo previo y el artefacto Pages vigente.
4. Ejecutar el planificador UID-only sobre los exports frescos.
5. Comparar con la línea base de 687 seleccionados y 7 excluidos.
6. Si los conteos cambian, explicar la diferencia; no forzar el resultado a 687/7.
7. Generar un PATCH delta que sólo permita:

```text
permissions/*/uid
login_logs/*/uid
```

8. Bloquear el paso si aparece cualquiera de estas condiciones:

```text
overwrite de uid existente
ruta fuera de allowlist
valor null inesperado
escritura raíz
cambio de nombre, correo, rol, estado o timestamp
identidad ambigua asignada por inferencia
```

## 8. Etapa B de Fase 1 — migración compatible

1. Aplicar el PATCH UID-only fresco mientras aún están activas las reglas y el frontend productivos anteriores.
2. Verificar conteo aplicado, ausencia de overwrites y exclusiones intactas.
3. Ejecutar el planificador una segunda vez; el resultado debe ser cero cambios para el mismo snapshot.
4. Conservar el rollback exacto de las rutas agregadas.

Agregar UID es compatible con el frontend anterior. Por ello esta fase se ejecuta antes del cambio de frontend y reglas.

Los siete registros excluidos no se modifican sin evidencia. Deben resolverse manualmente o aceptarse formalmente como históricos con acceso limitado; nunca se les asigna UID por aproximación.

## 9. Etapa C de Fase 1 — frontend compatible

1. Fusionar el PR productivo únicamente con autorización explícita.
2. Esperar el workflow de Pages y confirmar que terminó correctamente.
3. Verificar el SHA-256 público de `app.js` contra el candidato.
4. Ejecutar un smoke mínimo con cuentas reales autorizadas:

```text
LOGIN
CARGA DE TAREAS
HORARIO Y TELETRABAJO
LECTURA DE PERMISOS PROPIOS
MONITOREO PARA SUPERVISOR/ADMIN
SIN ERROR JS CRÍTICO
```

5. No ejecutar escrituras exploratorias. Toda aprobación, permiso o cierre utilizado en el smoke debe estar previamente acordado como transacción real controlada.

El frontend compatible debe desplegarse antes de R1 porque escribe UID en nuevos permisos y logs y consulta el historial del Gestor por UID.

## 10. Etapa D de Fase 1 — reglas R1

1. Desplegar el archivo R1 exacto previamente validado.
2. Confirmar el SHA y el proyecto Firebase objetivo antes del comando final.
3. Verificar inmediatamente:

```text
Gestor accede a su perfil y datos propios
Gestor no accede a datos de otro UID
Supervisor conserva lecturas y aprobación de permisos requeridas
Admin conserva administración de usuarios y comunicados
cierre de turno persiste reporte, sesión y logoutTime
```

4. Observar Console, Network y errores `PERMISSION_DENIED` durante al menos 30 minutos o durante el primer flujo operativo completo disponible.

## 11. Criterios de rollback inmediato

```text
login inutilizable
tareas principales no cargan
historial propio desaparece fuera de los siete excluidos
cierre de turno no persiste
PERMISSION_DENIED en una acción legítima
Supervisor/Admin pierde una función requerida
lectura o escritura de datos de otro UID
Stored XSS reproducible
archivo privado accesible públicamente
artefacto Pages distinto del candidato
error JavaScript crítico generalizado
```

No son rollback por sí solos:

```text
favicon 404
warning de índice sin fallo funcional
usuario legítimamente sin tareas
fallo del correo cuando Firebase confirmó el cierre
formato inseguro removido de un comunicado
```

## 12. Orden de rollback

Si el problema aparece después de R1:

1. Restaurar primero R0 para recuperar compatibilidad operativa.
2. Confirmar que login y flujo Gestor vuelven a funcionar.
3. Revertir el merge del frontend mediante `git revert`, sin force-push.
4. Esperar y verificar Pages.
5. Mantener los UID agregados si no causan daño; son compatibles con R0.
6. Aplicar el rollback de datos sólo si se demuestra una asociación incorrecta. Nunca borrar UID nuevos creados legítimamente por el frontend F1.

Si el problema aparece antes de desplegar R1:

1. Revertir el frontend.
2. Mantener R0.
3. Evaluar el PATCH por separado; no ejecutar rollback automático por una falla de UI.

## 13. Matriz de decisión

| Punto | Continuar | Detener |
|---|---|---|
| Diff productivo | Sólo archivos aprobados | Material auxiliar, privado o no explicado |
| Export fresco | Íntegro y con hash | Incompleto o cambiado durante el análisis |
| PATCH | UID-only, sin overwrite | Cualquier ruta/campo adicional |
| Frontend | Hash coincide y smoke principal pasa | Error crítico o mecánica central rota |
| R1 | Roles y operaciones legítimas pasan | Exposición de otro UID o denegación legítima |
| Observación | Sin errores críticos | Activador de rollback confirmado |

## 14. Autorizaciones separadas

Se requieren autorizaciones explícitas independientes para:

1. abrir el PR productivo;
2. aplicar el PATCH en Firebase real;
3. fusionar el PR a `main`;
4. desplegar R1;
5. ejecutar un rollback material.

La aprobación de una etapa no autoriza automáticamente las siguientes.
