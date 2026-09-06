---
name: riskops-lab-and-connectivity-workflow
description: >-
  Guía y procedimiento reutilizable para configurar el Laboratorio Local con Firebase Emulators (Hosting, Auth, Realtime DB, UI) en RiskOps, gestionar usuarios semilla de prueba (Admin/Gestor), ejecutar la suite de QA y diagnosticar/corregir problemas de presencialidad e inactividad en el frontend.
---

# Flujo de Trabajo: Laboratorio Local y Diagnóstico de Presencialidad RiskOps

## Overview
Esta habilidad encapsula el procedimiento completo para inicializar y validar el entorno de pruebas local en RiskOps mediante Firebase Emulators, verificar usuarios semilla, auditar el sub-sistema de presencialidad/inactividad de gestores en `app.js` y aplicar soluciones sin alterar archivos de producción de manera no autorizada.

---

## Directivas y Restricciones Estrictas
1. **Preservación de Código de Producción**: No modificar los archivos `app.js`, `login.js`, `login.html`, `index.html` sin aprobación explícita y directa del usuario.
2. **Aprobación Estricta**: Todas las modificaciones deben ser presentadas primero en un plan de implementación y contar con la confirmación del usuario.
3. **Verificación Empírica**: Toda prueba debe validarse ejecutando la suite de QA antes de declarar éxito.

---

## Workflow del Laboratorio Local

### 1. Inicialización de Firebase Emulators
Ejecutar el laboratorio local mediante `Iniciar_Laboratorio_Local.bat`:
```cmd
call npx.cmd firebase-tools emulators:start --only hosting,auth,database,ui --import=./emulator_data --export-on-exit
```
- **Hosting**: `http://127.0.0.1:5000`
- **Emulator UI**: `http://127.0.0.1:4000`
- **Authentication**: `http://127.0.0.1:9099`
- **Realtime Database**: `http://127.0.0.1:9000`

### 2. Estructura de Usuarios Semilla en `./emulator_data`
Verificar que los usuarios de prueba contengan la propiedad booleana `"approved": true`:
- **Admin**: `admin.lab@virtualsoft.tech` (`LAB_ADMIN_UID_001`, `role: 'Admin'`, `approved: true`).
- **Gestor**: `gestor.lab@virtualsoft.tech` (`LAB_GESTOR_UID_001`, `role: 'Gestor'`, `approved: true`).

### 3. Ejecución de Pruebas Automatizadas QA
Navegar a `.github/qa-infra` y ejecutar:
```powershell
cd .github/qa-infra
npm.cmd run check
```
Verificar que todas las pruebas (`frontend_security_smoke`, `migration_rehearsal`, `end_shift_smoke`) devuelvan `PASS`.

---

## Diagnóstico y Solución de Inactividad en Gestores

### Problema Identificado
En `app.js`, cuando se concede el permiso de `IdleDetector`, la condición `if (window.idleDetectorGranted) isInactive = globalIdleState` anula el temporizador DOM local (`isDomIdle`). Si el gestor usa otras aplicaciones en el equipo (Excel, WhatsApp), la PC registra movimiento y RiskOps nunca marca al gestor como inactivo.

### Solución Técnica
1. **Evaluación Híbrida en `syncActiveSessionToFirebase()`** (`app.js` ~L2259):
   Reemplazar la condición exclusiva por una evaluación unificada:
   ```javascript
   let isInactive = globalIdleState || isDomIdle;
   ```
2. **Remoción de Bloqueo en `setInterval`** (`app.js` ~L550):
   Comentar o eliminar `if (window.idleDetectorGranted) return;` para permitir que el temporizador local de 3 minutos continúe contando cuando el gestor no interactúa con la aplicación RiskOps.

---

## Errores Comunes a Evitar
- **String `"Aprobado"` en lugar de `true`**: Provoca `PERMISSION_DENIED` según las reglas en `database.rules.json`.
- **Modificar archivos de producción sin confirmación**: Mantener `git status` limpio en `feature/Fase_2`.
