# Risk Manager — documentación de promoción y remediación

Fecha de corte original: 2026-08-13
Actualización de cierre: 2026-08-22
Estado productivo: **Fase 1 desplegada en `main` y verificada.** Los documentos de esta carpeta se conservan como registro de planeación y ejecución; cada uno tiene una nota de cierre al inicio con el resultado final. Fase 1.5 (higiene de secretos) tiene su inventario cerrado y una acción de rotación en curso; Fase 1.1 (responsive) está en pausa — el acceso móvil está bloqueado a propósito por seguridad/política, no por falta de diseño responsive (ver RM-20). Fase 2 sigue sin iniciar.
Objetivo original: completar la remediación de Fase 1 mediante una promoción controlada y dejar el trabajo preparado para delegarse sin depender de contexto oral.

## Orden de lectura

1. [Guía end-to-end y modelo de delegación](RISK_MANAGER_GUIA_END_TO_END_Y_DELEGACION_2026-08-13.md): puerta de entrada. Explica repositorios, ramas, entornos, estados, fases, dependencias, responsables y paquetes delegables.
2. [Plan de implementación](RISK_MANAGER_PLAN_IMPLEMENTACION_2026-08-13.md): olas IMP-00 a IMP-12, trabajo paralelo, dependencias, esfuerzo orientativo y tablero inicial para delegación.
3. [Historial de remediación y guía operativa](RISK_MANAGER_HISTORIAL_REMEDIACION_Y_GUIA_OPERATIVA_2026-08-13.md): inventario RM-01 a RM-37, correcciones y explicación de las mecánicas afectadas para usuarios no técnicos.
4. [Runbook de promoción controlada](RISK_MANAGER_RUNBOOK_PROMOCION_CONTROLADA_PRODUCCION_2026-08-13.md): procedimiento técnico para preparar, migrar, desplegar, observar y revertir Fase 1.
5. [Paquete de PR de Fase 1 (candidato v2)](RISK_MANAGER_PR_PACKAGE_PHASE1_V2_2026-08-22.md): manifiesto del PR realmente fusionado, con el resumen de correcciones, pruebas y riesgos aceptados en su forma pública.

## Interpretación rápida (actualizada al cierre)

- `VirtualSoft026/riesgovirtualsoft/main` **ya contiene la Fase 1 fusionada** (candidato construido originalmente desde el SHA `43537a043dc9548d4066aca670f26209b9e77430`, actualizado luego para incorporar cambios posteriores de `main` antes de fusionar).
- `phase1-security-release` fue el candidato limpio; su contenido ya es idéntico al de `main` tras la fusión.
- Firebase Rules R1 (la estructura de permisos por UID/rol/aprobación) ya está desplegada en el proyecto real.
- La migración de datos históricos a UID ya se ejecutó.
- La rama local `staging-qa` conserva material acumulado e histórico; no debe fusionarse completa.
- `daniel-puentes109/riskmanager-security-staging` es un repositorio independiente de QA; su `main` no es el `main` productivo.
- La web de staging apunta al Firebase real; las pruebas mutantes automatizadas deben permanecer en Emulator.
- “Corregido” no equivale a “desplegado”. La guía end-to-end define todos los estados oficiales — pero para Fase 1, todos los estados relevantes ya llegaron a `DESPLEGADO EN PRODUCCIÓN`.

## Documentación técnica retirada (2026-08-14)

Se retiraron tres artefactos de documentación técnica obsoleta que contenían referencias internas y fragmentos desactualizados. El detalle de seguridad se conserva en el registro confidencial local.

## Límites

Estos documentos no autorizan por sí mismos:

- fusionar cambios en `VirtualSoft026/riesgovirtualsoft/main`;
- desplegar Firebase Rules;
- escribir, borrar o migrar datos en Firebase real;
- publicar exports, PATCH privados, UID, correos, PII o credenciales;
- reescribir historia Git o eliminar artefactos.

Cada operación productiva requiere una autorización explícita independiente y debe ejecutarse contra artefactos recalculados con datos frescos cuando corresponda.
