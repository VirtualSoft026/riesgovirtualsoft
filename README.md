# Risk Manager

Aplicación interna para la gestión operativa de turnos, permisos y control de riesgo del equipo de operaciones. Es una aplicación web (frontend estático + Firebase como backend) publicada en producción para uso diario de Gestores, Supervisores y Administradores.

## Estado del proyecto

Fase 1 de endurecimiento de seguridad **completada y desplegada en producción**. El detalle completo — qué se corrigió, qué se probó y qué sigue pendiente — está en [`release-docs/`](release-docs/README.md), empezando por la [guía end-to-end](release-docs/RISK_MANAGER_GUIA_END_TO_END_Y_DELEGACION_2026-08-13.md).

Fases posteriores en curso o planeadas:

| Fase | Objetivo | Estado |
|---|---|---|
| 1.1 | Adaptación de la interfaz a distintas resoluciones de escritorio/laptop (el acceso móvil sigue bloqueado a propósito por seguridad/política, ver RM-20; esta fase no lo toca) | En inventario |
| 1.5 | Higiene de secretos e historial de Git | Inventario cerrado; rotación de una credencial en curso |
| 2 | Mover datos operativos (horarios, cronogramas) a una fuente autenticada y modularizar el frontend | Sin iniciar |

## Qué es esta aplicación

- **Frontend:** HTML/CSS/JavaScript plano (`index.html`, `login.html`, `app.js`, `login.js`, `styles.css`), sin framework ni build step. Publicado vía GitHub Pages sobre un dominio propio (ver `CNAME`).
- **Backend:** Firebase (Realtime Database + Authentication). Las reglas de autorización viven en `database.rules.json` y son la única fuente real de control de acceso — el frontend no debe asumirse como una capa de seguridad.
- **Automatización de datos:** scripts de Python (`motor_operativo.py`, `build_docs.py`, `build_retiros.py`) que generan y actualizan datos operativos (KPIs, cronogramas) a partir de fuentes externas (MicroStrategy) y archivos Excel versionados en el repositorio (`Cronograma de Tareas/`, `Horario/`, `Teletrabajo/`, `Tareas Riesgo/`).
- **Scripts de despliegue** (`Subir_Cambios.bat`, `Actualizar_Tablero_Robot.bat`, `Desplegar_Firebase.bat`): automatizan la actualización de datos y la publicación. Están diseñados para no permitir push directo a `main` sin pasar por una rama intermedia de revisión.

## Roles de usuario

- **Gestor:** opera su turno, gestiona sus propios permisos y reportes.
- **Supervisor:** supervisión de turno, acceso a reportes y permisos de su equipo.
- **Admin:** aprobación de cuentas, gestión de roles y comunicados, acceso administrativo completo.

El control real de qué puede hacer cada rol está definido en `database.rules.json`, no en la interfaz.

## Seguridad

Antes de modificar cualquier lógica de autorización, roles, o scripts de despliegue, leer:

- [`README_SECURITY.md`](README_SECURITY.md) — resumen del alcance de seguridad de Fase 1.
- [`release-docs/`](release-docs/README.md) — historial completo de hallazgos, correcciones, pruebas y decisiones (incluye el modelo de fases, estados oficiales y paquetes de trabajo delegables).

Ningún cambio a `database.rules.json`, a los scripts de despliegue, o al flujo de autenticación/roles debe hacerse sin revisar ese historial primero — varias fallas ya corregidas fueron reintroducidas accidentalmente más de una vez por cambios que no tenían ese contexto.

## Estructura del repositorio

```
index.html, login.html, app.js, login.js, styles.css   → frontend
firebase-config.js, firebase.json, database.rules.json  → configuración e integración con Firebase
motor_operativo.py, build_docs.py, build_retiros.py     → automatización de datos operativos
Subir_Cambios.bat, Actualizar_Tablero_Robot.bat,
Desplegar_Firebase.bat                                  → scripts de actualización y despliegue
Cronograma de Tareas/, Horario/, Teletrabajo/,
Tareas Riesgo/                                          → datos operativos (Excel)
.github/qa-infra/                                       → arnés de pruebas automatizadas (Firebase Emulator)
.github/workflows/                                      → CI/CD (QA de compatibilidad, publicación de Pages)
release-docs/                                           → historial de remediación de seguridad y planeación de fases
```
