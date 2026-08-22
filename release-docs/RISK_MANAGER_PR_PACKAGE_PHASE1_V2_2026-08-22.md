# Risk Manager — Paquete de PR Productivo, Fase 1 (Candidato v2)

Fecha: 2026-08-22
Estado: `LISTO PARA PR PRODUCTIVO` (D1 y D2 completos y verificados)
Este documento **no autoriza** fusionar el PR, aplicar el PATCH de migración, desplegar Rules R1, ni ejecutar ningún rollback. Cada una de esas acciones requiere autorización separada del Lead, según el modelo de la guía end-to-end.

> Nota de alcance: este es un repositorio público y `main` sigue en producción activa. Este documento describe las correcciones y su validación a nivel de mecánica y resultado. El detalle técnico explotable (commits específicos revertidos, mecanismo exacto de cada falla) se mantiene en el registro confidencial interno del equipo, no en este repositorio, hasta que la corrección esté desplegada en producción.

## 1. Identificación

| Campo | Valor |
|---|---|
| Repositorio | `VirtualSoft026/riesgovirtualsoft` |
| Rama candidata | `phase1-security-release-v2` |
| SHA candidato final | `910ffbc934fd5db2dbff8404df97b667492322d7` |
| PR destino | `phase1-security-release-v2` → `main` |

## 2. Qué resuelve este candidato

`phase1-security-release` (el primer candidato) se cortó de `main` el 2026-08-13. Desde entonces, `main` recibió funcionalidad legítima adicional (mejoras de turno, ajustes visuales) que este candidato incorpora, evaluada individualmente antes de portarla. Como parte de esa evaluación se identificaron y corrigieron patrones que reintroducían justo el tipo de exposición que Fase 1 existe para cerrar.

## 3. Resumen de correcciones

- Se consolidó y corrigió la lógica de asignación de rol para asegurar que la autorización se resuelve del lado del servidor (Firebase Rules por UID/rol/aprobación), no de datos que el navegador pueda controlar.
- Se removió código de frontend que podía modificar el rol de un usuario en la base de datos de forma automática y no auditada.
- Se endurecieron los scripts de despliegue/actualización local: allowlist explícita de archivos, manejo de errores, y eliminación de rutas que permitían publicar cambios a producción sin una revisión previa.
- Se corrigió una ruta de script con datos de una persona específica hardcodeados, reemplazada por una ruta autolocalizable.
- Se consolidó lógica duplicada de identificación de supervisores de turno en un único punto del código (antes repetida en 4+ lugares, con una inconsistencia que se corrigió de paso).
- Se agregó un panel administrativo (gestión de disponibilidad de "Pausa de Turno" por gestor), protegido por rol de Admin verificado en servidor.

Funcionalidad ya incorporada previamente en este candidato (heredada de la primera versión): Firebase Rules por UID/rol/aprobación, mitigación de Stored XSS, cierre de turno con persistencia atómica, artefacto de Pages por allowlist.

## 4. Pruebas ejecutadas (D2 — QA aislado, Firebase Emulator)

- **Matriz de autorización por rol/UID**: 85 operaciones verificadas contra el motor de reglas real, cubriendo los 4 roles del sistema y accesos propios/ajenos por UID. Cero fallas de autorización.
- **Aislamiento de red**: verificado con guardia activa — cero solicitudes salieron hacia el proyecto de producción durante toda la suite.
- **Smoke de frontend**: mitigación de contenido dinámico inseguro, cierre de turno atómico, límites de interfaz por rol — todo en verde.
- **Smoke manual en navegador**: verificado por el Lead contra el Emulator, en los tres roles principales.
- Evidencia técnica completa disponible internamente, no adjunta a este PR por contener metadatos de la corrida.

## 5. Riesgos aceptados / deuda de fase posterior

| Riesgo | Fase que lo resuelve |
|---|---|
| Registros históricos sin identificador de usuario estable pierden acceso bajo las Rules nuevas hasta migrar | Paquete de migración de datos, previo a desplegar las Rules nuevas en producción |
| XLSX operativos siguen públicos en el artefacto | Fase 2 (rediseño de datos), riesgo ya aceptado desde el candidato original |
| Responsive incompleto | Fase 1.1, no bloquea Fase 1 |
| Rotación de secretos e higiene de historial Git | Fase 1.5, separada intencionalmente |
| Lógica de badge de supervisor conserva una estructura de datos propia, no unificada del todo con la consolidación general | Deuda menor, no bloqueante |

## 6. Plan de rollback

- **Frontend/Pages**: revertir es un solo commit de revert sobre el merge a `main` (rama candidata lineal, sin merges intermedios) + esperar el workflow de Pages. Se guarda el hash del frontend pre-merge para comparación rápida.
- **Firebase Rules**: respaldo de las Rules actuales antes de desplegar las nuevas. El orden de reversión debe ser el inverso exacto al de despliegue (el frontend nuevo depende de las Rules nuevas).
- **Datos**: el paquete de migración trae su propio rollback exacto, calculado con datos frescos en el momento de la ventana real — no se predefine aquí.
- Ninguna acción de rollback se ejecuta sin el mismo nivel de autorización que su despliegue original.

## 7. Cambios de uso para público no técnico

- **Ingreso**: sin cambios — cuenta pendiente/rechazada no entra a los datos hasta aprobación de Admin.
- **Supervisores de turno**: la lista de personas reflejadas en el indicador de turno se actualizó y quedó centralizada en un solo lugar del código, facilitando futuros ajustes.
- **Pausa de Turno Partido**: función para gestores con turno partido, activable por gestor desde un panel exclusivo de Admin.
- **Paneles administrativos**: sin cambios de comportamiento visible para Gestor.
- Resto de mecánicas sin cambios respecto a lo ya documentado en `README_SECURITY.md`.

## 8. Responsables

| Rol | Persona |
|---|---|
| Release Manager / Autorizador | Daniel Puentes (Lead) |
| Desarrollo y QA aislado | Sesión delegada, validada por revisor técnico independiente |
| Operador de datos / Git-Pages / Firebase Rules | Por asignar |

## 9. Criterios de continuar / detener

**Continuar** si: la matriz de autorización sigue en verde al re-ejecutarse contra el SHA final antes del merge, el paquete de migración de datos pasa validación independiente, y hay dos personas disponibles para la ventana de despliegue.

**Detener** si: aparece cualquier hallazgo bloqueante nuevo en la revisión final, la migración no es idempotente, o no hay segunda persona disponible para validar.

## 10. Autorizaciones pendientes

Este documento y la apertura de este PR **no autorizan**:
- fusionarlo a `main`;
- aplicar ningún PATCH de datos en producción;
- desplegar Rules nuevas en producción;
- ejecutar un rollback material.

Cada una requiere autorización explícita y separada del Lead, en el momento correspondiente. El detalle técnico completo de las fallas corregidas está disponible para el equipo por canal interno.
