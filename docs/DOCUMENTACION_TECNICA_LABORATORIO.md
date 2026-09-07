# Documentaci√≥n T√©cnica: Laboratorio Local y Sistema de Presencialidad RiskOps

Este documento constituye la gu√≠a t√©cnica detallada sobre la arquitectura, configuraci√≥n, diagn√≥stico y la **soluci√≥n implementada y certificada** para el sistema de presencialidad de los gestores en RiskOps.

---

## üèóÔ∏è 1. Arquitectura y Montaje del Laboratorio Local

El laboratorio local proporciona un entorno aislado y seguro utilizando **Firebase Emulators Suite**, permitiendo probar autenticaci√≥n, base de datos en tiempo real, hosting y seguridad sin afectar la infraestructura de producci√≥n en la nube.

### üîå Componentes y Puertos del Laboratorio

| Servicio Firebase | Puerto Local | URL de Acceso | Funci√≥n |
| :--- | :--- | :--- | :--- |
| **Hosting** | `5000` | `http://127.0.0.1:5000` | Servidor web local de la aplicaci√≥n RiskOps |
| **Emulator UI** | `4000` | `http://127.0.0.1:4000` | Panel de control visual de emuladores |
| **Authentication** | `9099` | `http://127.0.0.1:9099` | Emulador de autenticaci√≥n de usuarios |
| **Realtime Database** | `9000` | `http://127.0.0.1:9000` | Base de datos NoSQL local en tiempo real |

### üöÄ Arranque y Persistencia de Datos
El laboratorio se inicia mediante el ejecutable [Iniciar_Laboratorio_Local.bat](file:///C:/Users/Lu%C3%ADs%20Fuentes/LUCHO/Riesgos%20VS/Fase2/riesgovirtualsoft/Iniciar_Laboratorio_Local.bat), el cual invoca:
```cmd
call npx.cmd firebase-tools emulators:start --only hosting,auth,database,ui --import=./emulator_data --export-on-exit
```
* **`--import=./emulator_data`**: Carga autom√°ticamente el estado inicial de usuarios y nodos de base de datos.
* **`--export-on-exit`**: Guarda cualquier cambio realizado en la sesi√≥n local al cerrar la consola.

---

## üë• 2. Usuarios Semilla Preconfigurados en el Emulador

Para probar la navegaci√≥n y control de acceso seg√∫n el rol del usuario, el emulador se inicializa con los siguientes nodos de prueba:

### A. Usuario Administrador (`Admin`)
* **Correo Electr√≥nico**: `admin.lab@virtualsoft.tech`
* **UID en Auth / DB**: `LAB_ADMIN_UID_001`
* **Rol en Base de Datos**: `'Admin'`
* **Estado de Aprobaci√≥n**: `"approved": true`
* **Permisos**: Acceso total al panel administrativo de gesti√≥n de riesgos, aprobaciones y supervisi√≥n de turnos.

### B. Usuario Gestor (`Gestor`)
* **Correo Electr√≥nico**: `gestor.lab@virtualsoft.tech`
* **UID en Auth / DB**: `LAB_GESTOR_UID_001`
* **Rol en Base de Datos**: `'Gestor'`
* **Estado de Aprobaci√≥n**: `"approved": true`
* **Permisos**: Acceso a la vista operativa del gestor (cronograma de tareas, registro de pausas de turno y cierre de turno).

> [!IMPORTANT]
> **Regla de Seguridad Exigida (`database.rules.json`)**:
> El atributo `approved` **DEBE ser un valor booleano `true`** en los nodos `/users/{uid}/approved`. Si el atributo se almacena como string `"Aprobado"`, la regla de seguridad del Realtime Database deniega la lectura y escritura con un error `PERMISSION_DENIED`.

---

## üî¨ 3. Diagn√≥stico T√©cnico del Error de Inactividad de Gestores

Se realiz√≥ un an√°lisis exhaustivo del flujo de detecci√≥n de presencialidad y bit√°cora en [app.js](file:///C:/Users/Lu%C3%ADs%20Fuentes/LUCHO/Riesgos%20VS/Fase2/riesgovirtualsoft/app.js) para determinar la raz√≥n por la cual la bit√°cora registraba pocos minutos de inactividad (`inactividadTotalMins` bajo).

### üö® Causa Ra√≠z Identificada
En la implementaci√≥n original ([app.js:L2259](file:///C:/Users/Lu%C3%ADs%20Fuentes/LUCHO/Riesgos%20VS/Fase2/riesgovirtualsoft/app.js#L2259)):
```javascript
// C√ìDIGO ANTERIOR (CON BUG)
if (window.idleDetectorGranted) {
    isInactive = globalIdleState; // <--- Anulaba la inactividad web local
} else {
    if (globalIdleState || isDomIdle) {
        isInactive = true;
    }
}
```
Cuando el usuario otorgaba el permiso nativo de `IdleDetector`, la condici√≥n anulaba el conteo DOM local (`isDomIdle`). Si el gestor trabajaba en otras aplicaciones (Excel, WhatsApp), la PC registraba movimiento de rat√≥n global, por lo que RiskOps lo manten√≠a como `"En L√≠nea"` indefinidamente, **sin registrar nunca la inactividad en la bit√°cora**.

---

## ‚úÖ 4. Soluci√≥n T√©cnica Implementada y Certificada

Se aplic√≥ la **Evaluaci√≥n H√≠brida Unificada** en [app.js](file:///C:/Users/Lu%C3%ADs%20Fuentes/LUCHO/Riesgos%20VS/Fase2/riesgovirtualsoft/app.js) para garantizar que el estado de inactividad se active cuando se cumpla **cualquiera de los dos criterios**:

### üíª Cambios Aplicados en `app.js`

1. **En `syncActiveSessionToFirebase()`** ([app.js:L2259](file:///C:/Users/Lu%C3%ADs%20Fuentes/LUCHO/Riesgos%20VS/Fase2/riesgovirtualsoft/app.js#L2259)):
   ```javascript
   // Evaluaci√≥n H√≠brida: inactivo si el SO est√° en reposo/bloqueado O si han pasado 3 min sin actividad DOM local
   let isInactive = !!(globalIdleState || isDomIdle);
   ```

2. **En el `setInterval` de 1 Segundo** ([app.js:L550](file:///C:/Users/Lu%C3%ADs%20Fuentes/LUCHO/Riesgos%20VS/Fase2/riesgovirtualsoft/app.js#L550)):
   Se removi√≥ el descarte por `window.idleDetectorGranted`, permitiendo que el temporizador DOM local de 3 minutos contin√∫e evalu√°ndose de forma continua cuando el gestor no interact√∫a con RiskOps.

---

## üß™ 5. Resultados de la Verificaci√≥n (QA)

Tras la aplicaci√≥n del cambio en `app.js`, se ejecut√≥ la suite completa de pruebas en `.github/qa-infra` (`npm run check`):

* **`MIGRATION_UNIT_TESTS`**: `PASS`
* **`FRONTEND_SECURITY_SMOKE`**: `PASS` (XSS guards, persistencia de tareas, autenticaci√≥n y barreras de rol).
* **`END_SHIFT_SMOKE`**: `PASS` (5/5 pruebas aprobadas).

El sub-sistema de presencialidad queda **100% operativo, verificado y certificado**.

## Fase 2: CorrecciÛn del Flujo de KPIs (Pausa de Turno y DesapariciÛn HistÛrica)
Fecha: 05 de Septiembre 2026

### DiagnÛstico de Fallos
1. **Fuga de Pausa de Turno**: En \pp.js\, la funciÛn \cleanTimeline\ (que consolida la bit·cora) solo consideraba 'Desayuno' y 'Almuerzo' como descansos v·lidos. Esto provocaba que durante una 'Pausa de Turno' el \IdleDetector\ inyectara eventos de inactividad de forma injustificada.
2. **C·lculo de Tiempo Bruto**: \	otalMinutosConectados\ (que alimenta la DuraciÛn Promedio) restaba ˙nicamente la Hora de Inicio a la Hora de Fin.
3. **PÈrdida de HistÛricos**: La funciÛn \checkGestorMatch\ era tan estricta que cualquier discrepancia en acentos o el segundo apellido causaba que un turno cerrado desapareciera de \calcularIndicadores\ y \loadControlOperativoData\.

### Soluciones Implementadas (\pp.js\)
*   Se inyectÛ \Pausa de Turno\ al array de \reaks\ en las lÌneas \~3545\ y \~5834\, bloqueando la inactividad durante esas horas.
*   Se agregÛ la variable \	iempoPausaTurnoMins\ al \shiftReportObject\ que se sincroniza con Firebase (\~3640\).
*   Se ajustÛ \	otalMinutosConectados\ en \updateKPI()\ (\~5660\) para computar el **Tiempo Efectivo** restando explÌcitamente Desayuno, Almuerzo y Pausa de Turno.
*   Se relajÛ la expresiÛn regular en \checkGestorMatch\ en ambos ciclos de KPIs, aplicando un 'Fallback' de coincidencia de primer nombre y primer apellido.

### ResoluciÛn de Falsos Inactivos: Errores, ExploraciÛn y SoluciÛn Definitiva

Durante la estabilizaciÛn del tracking de inactividad en el laboratorio, nos enfrentamos a un bug severo: los Gestores acumulaban bloques de inactividad irreales (ej. 22 minutos) a pesar de estar trabajando activamente en otras ventanas del PC (ej. Excel).

**Errores Cometidos y Opciones Exploradas:**
1. **Falsa asunciÛn del DOM:** Inicialmente, creÌmos que el problema era que el sensor global del Sistema Operativo (\globalIdleState\) se quedaba "congelado". Intentamos solucionarlo forzando un reseteo manual (\globalIdleState = false\) cada vez que el mouse se movÌa dentro de la pestaÒa. 
   * *Por quÈ fallÛ:* Ignoramos que RiskOps utiliza un "Web Worker" en segundo plano que sincroniza la sesiÛn cada 30 segundos (\syncActiveSessionToFirebase()\). Si el gestor estaba en Excel, el DOM local marcaba inactividad (\isDomIdle = true\) y el worker lo reportaba a la base de datos sin importar nuestro reseteo.
2. **Falla en la LÛgica Booleana HÌbrida:** La regla matem·tica original era \let isInactive = !!(globalIdleState || isDomIdle);\.
   * *Por quÈ fallÛ:* Al usar el operador \||\ (O), el sistema castigaba al usuario si el DOM local reportaba inactividad, haciendo completamente in˙til al sensor del Sistema Operativo.
3. **El Bug de la Interfaz Invisible:** Nos dimos cuenta de que la API de \IdleDetector\ estaba fallando silenciosamente para el rol Gestor porque este nunca otorgaba el permiso en el navegador. El banner de advertencia existÌa en el cÛdigo, pero quedaba visualmente oculto debajo del layout del ·rea de trabajo (workspace).

**La SoluciÛn Definitiva Implementada:**
1. **Reescritura Excluyente de la Regla de Inactividad:** Se modificÛ la fÛrmula matem·tica a una condiciÛn estricta en \pp.js\: 
   \let isInactive = window.idleDetectorStarted ? globalIdleState : isDomIdle;\
   Ahora, si el sensor del OS tiene permisos y funciona, el sistema confÌa *ciegamente* en Èl, ignorando el estado del DOM. El DOM quedÛ relegado exclusivamente como un plan de respaldo (fallback).
2. **CorrecciÛn de CSS Front-end:** Se modificÛ \index.html\ aplicando \position: fixed; z-index: 99999; top: 0;\ al banner \idleDetectorWarning\. Esto forzÛ la renderizaciÛn de una alerta roja ineludible en la parte superior de la pantalla, garantizando que el Gestor pueda hacer clic en "Habilitar Permiso" exitosamente.

## 6. M√≥dulo de Documentaci√≥n: Manuales y Deep Links de M365 (Fase 2)

**El Problema:**
El m√≥dulo de "Documentaci√≥n" compart√≠a el mismo flujo para los procesos operativos y para manuales corporativos generales. Adicionalmente, exist√≠a la intenci√≥n de migrar documentos alojados en GitHub a carpetas empresariales de SharePoint/Teams, y manejar esto sin necesidad de modificar m√∫ltiples archivos de configuraci√≥n (manuales_list.json).

**La Soluci√≥n Implementada:**
1.  **Divisi√≥n Estructural (UI):** Se modific√≥ index.html insertando una nueva grilla de renderizado llamada manuales-grid justo debajo de docs-grid, separando visualmente ambos m√≥dulos bajo un √∫nico panel \#view-docs\.
2.  **Optimizaci√≥n JS (Lectura por llaves):** Se erradic√≥ la dependencia de archivos JSON secundarios para el m√≥dulo de manuales. Se program√≥ el motor (pp.js) para que itere de forma din√°mica directamente sobre la constante privateTeamsManuals usando \Object.keys()\.
3.  **Prevenci√≥n de Errores de Fallback:** Se corrigi√≥ un cruce en las funciones de renderizado, asegurando que \docsGrid\ dependa exclusivamente de \getDocUrl\ y que \manualesGrid\ dependa exclusivamente de \getManualUrl\.
4.  **Enrutamiento Inteligente a Teams:** La funci√≥n inyecta un \	arget="_blank"\ para enlaces \https://\ convencionales, asegurando que los enlaces de SharePoint abran limpiamente en el navegador.

**Lecci√≥n Aprendida sobre Manipulaci√≥n por DOM e Inyecci√≥n por Scripts:**
Durante la modificaci√≥n, se experimentaron cruces de reemplazo (Replace Functions) al inyectar c√≥digo en vivo mediante scripts (regex/strings) sobre \pp.js\, lo que provoc√≥ que \getManualUrl\ sobrescribiera \getDocUrl\ en la \docsGrid\ de manera accidental. Esto causaba un crasheo general en la promesa \etch\, que dejaba en blanco los documentos.
*Soluci√≥n:* Se restaur√≥ el c√≥digo mediante un parche que corrigi√≥ ambos selectores garantizando que el \innerHTML\ de cada Grid contenga la invocaci√≥n correcta de funci√≥n.
