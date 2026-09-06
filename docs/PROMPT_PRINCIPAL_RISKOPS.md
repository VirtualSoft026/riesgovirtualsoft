# PROMPT PRINCIPAL DE PROYECTO: RISKOPS FASE 2

> **Instrucciones para la IA**: Este prompt contiene todos los requerimientos técnicos, reglas de negocio, directivas estrictas de desarrollo, configuración del laboratorio local y soluciones aplicadas para la rama `feature/Fase_2`. Debe consultarse y mantenerse actualizado en cada sesión.

---

## 📌 Directivas y Reglas de Oro

1. **CONTROL DE CAMBIOS AUTORIZADOS**:
   - Ninguna modificación de código o configuración se aplicará sin la **aprobación explícita y directa del usuario**.
   - Los cambios deben someterse a plan de implementación antes de ejecutarse.

2. **SIN BÚSQUEDAS WEB EXTERNAS INNECESARIAS**:
   - Toda investigación debe realizarse inspeccionando los archivos locales del repositorio.

3. **VERIFICACIÓN EMPÍRICA OBLIGATORIA**:
   - Todo cambio debe validarse ejecutando la suite de QA en `.github/qa-infra` (`npm run check`), confirmando la aprobación total (`100% PASS`).

4. **IDIOMA DE COMUNICACIÓN Y DOCUMENTACIÓN**:
   - Toda la documentación, reportes e informes deben generarse en **Español**, manteniendo estándares formales y modernos de TI.

---

## ⚙️ Configuración del Laboratorio Local (Firebase Emulators)

El entorno local se ejecuta mediante `Iniciar_Laboratorio_Local.bat` invocando:
```cmd
call npx.cmd firebase-tools emulators:start --only hosting,auth,database,ui --import=./emulator_data --export-on-exit
```

### Puertos de los Servicios Emulados
- **Hosting**: `http://127.0.0.1:5000`
- **Emulator UI**: `http://127.0.0.1:4000`
- **Authentication**: `http://127.0.0.1:9099`
- **Realtime Database**: `http://127.0.0.1:9000`

### Usuarios Semilla de Prueba en `./emulator_data`
- **Admin**: `admin.lab@virtualsoft.tech` (UID: `LAB_ADMIN_UID_001`, `approved: true`).
- **Gestor**: `gestor.lab@virtualsoft.tech` (UID: `LAB_GESTOR_UID_001`, `approved: true`).

> **Regla de Seguridad Crítica (`database.rules.json`)**:
> El atributo `/users/{uid}/approved` **DEBE ser booleano `true`**. Almacenar `"Aprobado"` genera error `PERMISSION_DENIED`.

---

## 🛠️ Solución de Presencialidad Implementada y Certificada

### 1. En `syncActiveSessionToFirebase()` ([app.js:L2259](file:///C:/Users/Lu%C3%ADs%20Fuentes/LUCHO/Riesgos%20VS/Fase2/riesgovirtualsoft/app.js#L2259))
Se aplicó la **Evaluación Híbrida Unificada**:
```javascript
// Evaluación Híbrida: inactivo si el SO está en reposo/bloqueado O si han pasado 3 min sin actividad DOM local
let isInactive = !!(globalIdleState || isDomIdle);
```

### 2. En el `setInterval` de 1s ([app.js:L550](file:///C:/Users/Lu%C3%ADs%20Fuentes/LUCHO/Riesgos%20VS/Fase2/riesgovirtualsoft/app.js#L550))
Se removió el descarte por `window.idleDetectorGranted` para permitir la evaluación continua de inactividad local.

### 3. Estado de Certificación
- Suite QA (`npm run check`): **100% PASS**.

---

## 📚 Estructura de Documentación del Proyecto

- **[docs/DOCUMENTACION_TECNICA_LABORATORIO.md](file:///C:/Users/Lu%C3%ADs%20Fuentes/LUCHO/Riesgos%20VS/Fase2/riesgovirtualsoft/docs/DOCUMENTACION_TECNICA_LABORATORIO.md)**: Manual interno exhaustivo con la arquitectura del laboratorio, usuarios semilla, diagnóstico técnico y solución implementada.
- **[docs/INFORME_EJECUTIVO_RISKOPS.md](file:///C:/Users/Lu%C3%ADs%20Fuentes/LUCHO/Riesgos%20VS/Fase2/riesgovirtualsoft/docs/INFORME_EJECUTIVO_RISKOPS.md)**: Informe ejecutivo formal para entrega de avances a compañeros y líderes en GitHub.
- **[docs/PROMPT_PRINCIPAL_RISKOPS.md](file:///C:/Users/Lu%C3%ADs%20Fuentes/LUCHO/Riesgos%20VS/Fase2/riesgovirtualsoft/docs/PROMPT_PRINCIPAL_RISKOPS.md)**: Prompt principal con todo el contexto del proyecto y requerimientos acumulados.
