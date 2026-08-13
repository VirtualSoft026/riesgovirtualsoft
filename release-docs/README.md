# Risk Manager — documentación de promoción y remediación

Fecha de corte: 2026-08-13  
Estado productivo: `NO DESPLEGADO`; publicación aislada de `phase1-security-release` autorizada  
Objetivo: completar la remediación de Fase 1 mediante una promoción controlada y dejar el trabajo preparado para delegarse sin depender de contexto oral.

## Orden de lectura

1. [Guía end-to-end y modelo de delegación](RISK_MANAGER_GUIA_END_TO_END_Y_DELEGACION_2026-08-13.md): puerta de entrada. Explica repositorios, ramas, entornos, estados, fases, dependencias, responsables y paquetes delegables.
2. [Plan de implementación](RISK_MANAGER_PLAN_IMPLEMENTACION_2026-08-13.md): olas IMP-00 a IMP-12, trabajo paralelo, dependencias, esfuerzo orientativo y tablero inicial para delegación.
3. [Historial de remediación y guía operativa](RISK_MANAGER_HISTORIAL_REMEDIACION_Y_GUIA_OPERATIVA_2026-08-13.md): inventario RM-01 a RM-34, correcciones y explicación de las mecánicas afectadas para usuarios no técnicos.
4. [Runbook de promoción controlada](RISK_MANAGER_RUNBOOK_PROMOCION_CONTROLADA_PRODUCCION_2026-08-13.md): procedimiento técnico para preparar, migrar, desplegar, observar y revertir Fase 1.

## Interpretación rápida

- `VirtualSoft026/riesgovirtualsoft/main` es la fuente productiva.
- `phase1-security-release` es el candidato limpio construido desde el `main` productivo SHA `43537a043dc9548d4066aca670f26209b9e77430`.
- La rama local `staging-qa` conserva material acumulado e histórico; no debe fusionarse completa.
- `daniel-puentes109/riskmanager-security-staging` es un repositorio independiente de QA; su `main` no es el `main` productivo.
- La web de staging apunta al Firebase real; las pruebas mutantes automatizadas deben permanecer en Emulator.
- “Corregido” no equivale a “desplegado”. La guía end-to-end define todos los estados oficiales.
- Publicar `phase1-security-release` no modifica `main` ni despliega Pages: el workflow productivo sólo despliega en un `push` a `main` o por ejecución manual expresamente autorizada.

## Límites

Estos documentos no autorizan por sí mismos:

- fusionar cambios en `VirtualSoft026/riesgovirtualsoft/main`;
- desplegar Firebase Rules;
- escribir, borrar o migrar datos en Firebase real;
- publicar exports, PATCH privados, UID, correos, PII o credenciales;
- reescribir historia Git o eliminar artefactos.

Cada operación productiva requiere una autorización explícita independiente y debe ejecutarse contra artefactos recalculados con datos frescos cuando corresponda.
