# Informe — Fase 3, paso 3.4 (parcial): login y Control de Tiempos

**Fecha:** 2026-10-16
**Rama:** `backup/fase2-refactor-2026-10-03` (sin commit, push, merge ni rebase; el commit lo hace el responsable)
**Log detallado:** `2026-10-16-log-fase3-paso-3-4.txt`

## Estado del paso

El paso 3.4 no está cerrado. En esta entrega quedan terminados dos de sus frentes: el login (W-29, DE-3 = a) y Control de Tiempos (W-28, DE-4 = a). Quedan pendientes la migración de los `onclick` de `index.html` y de los generados por JavaScript a delegación (W-54 b, DE-5 = a, el mayor trabajo que queda), el script en línea de detección de navegador de `index.html` (W-54 c), vaciar `legacy-bridge.js` (W-03), los validadores y claves restantes (W-47 y W-48), la guardia de auditoría, la verificación de persistencia de sesión (DE-20) y la actualización del plan. Todo lo que se entregó al dispositivo está probado en la suite de laboratorio.

## Login (W-29)

La lógica de acceso sale de `login.js` y queda en `src/app/login-controller.js`, con la búsqueda del turno del Gestor en `src/domain/auth/login-shift-lookup.js`. La búsqueda es un puerto puro del chequeo original y se prueba contra el original en 120 casos. El controlador tiene pruebas con un DOM, Firebase, base de datos y almacenamiento falsos (21 pruebas); el acceso (9 pruebas) y la búsqueda del turno (5 pruebas) tienen sus propias pruebas.

Dos defectos del original se corrigieron en el camino. Un rechazo intentaba leer una variable que no existía (`ReferenceError`) y dejaba al usuario sin el motivo; ahora el motivo se muestra como texto. Además, el rechazo se reconocía por `approved === 'Rechazado'` pero no por `rejected === true`, y ahora se reconocen ambos. El script en línea de detección de navegador y el `onclick` de los cambios de panel se retiraron de `login.html`: el cambio de panel ya usa delegación, y la detección de navegador queda en `login-init.js`.

Hay dos cambios de comportamiento que necesitan tu confirmación antes de dar el paso por cerrado. El primero: un perfil sin el campo `approved` se trata ahora como pendiente, y el original lo dejaba entrar. Es un cierre más estricto, y con el original cualquier perfil incompleto podía iniciar sesión. El segundo: el registro valida primero que las contraseñas coincidan y después que el nombre tenga dos palabras de dos o más letras, como lo hacía `login.js`; el mensaje de nombre cambió a «Por favor, ingresa tu nombre y apellido completo (mínimo dos palabras).». Si prefieres que el perfil sin `approved` siga entrando, dímelo y lo ajusto.

Hay un comportamiento que conservé a propósito del original y que conviene revisar aparte: si la escritura en `login_logs` falla, `currentUser` no se guarda en el almacenamiento local. Es un defecto de consistencia, no lo arreglé en esta migración.

## Control de Tiempos (W-28)

La lógica del reporte sale de `js/tiempos.js` hacia `src/domain/analytics/tiempos-report.js`, la vista hacia `src/ui/views/tiempos-view.js` y el controlador hacia `src/controllers/tiempos-controller.js`. La tardanza usa `getTardiness` del dominio. La prueba de paridad de la tardanza compara esa función con la del original en una matriz de 3.168 casos, incluidos los de cruce de medianoche y de permisos que mueven el inicio del turno, y los umbrales de los puntajes coinciden con los del original.

El arnés de paridad de la vista ejecuta el `js/tiempos.js` original y el controlador nuevo sobre el mismo DOM, base de datos, reloj y Chart.js falsos. Compara 27 escenarios (ocho filtros de fecha por tres gestores, sin reportes, horario ya cargado y rango personalizado sin fechas) y cuatro cambios del filtro de fecha. Se comparan el DOM, la configuración de las cuatro gráficas (incluido el código de sus funciones), las lecturas de la base de datos y las cargas del horario. Dos normalizaciones se aplican, y no cambian lo que se ve: los espacios entre etiquetas de los `innerHTML` y las comillas dobles de las funciones. Para comprobar que el arnés sí detecta regresiones, se cambió en una copia del bundle un umbral observable; el arnés falló 6 de 27 escenarios.

Hay un defecto que el original ya tenía y que conservé en la migración: en la vista de un solo gestor, el desglose por día lee un campo (`Detalle_Dias`) que nunca se produce, así que siempre muestra «No hay datos suficientes». Lo dejo registrado para decidir si se corrige en un paso aparte.

## Verificación

La suite de laboratorio pasa completa: bundle 71 de 71, unitarias 90 archivos con 1.439 pruebas, integración 1, E2E 14 archivos con 677 pruebas, motor 4 de 4, y cero intentos de red bloqueados. El bundle tiene 134 módulos.

La entrega al dispositivo se hizo con marcas de tiempo. Antes de escribir se revisó que `app.js` e `index.html` del dispositivo coincidan con la base en la que se editó, y los ocho archivos existentes se escribieron con su `expectedMtimeMs`. Los 23 archivos se volvieron a leer del dispositivo y coinciden byte a byte con el paquete y con la copia de trabajo.

## Lo que necesito de ti

Primero, revisa y decide los dos cambios de comportamiento del login descritos arriba. Segundo, una prueba manual en el navegador real de los dos flujos, porque la suite no puede reemplazar Firebase: el login (rechazado, pendiente, turno vencido, recarga en medio de una pausa y de un turno) y el Control de Tiempos (filtros, rango personalizado, tablero y selector de gestor). Tercero, cuando lo autorices, borra a mano los archivos que ya no se cargan: `login.js`, `js/tiempos.js` y los huérfanos de inactividad (`src/controllers/idle-state-controller.js`, `src/tests/controllers/idle-state-controller.test.mjs` y `fase_2/src/controllers/idle-state-controller.js`). Esta sesión no puede borrar archivos.

El plan (`plan-fase-3.md`) no se actualizó en esta entrega; las filas de W-28, W-29, W-03, W-47, W-48 y W-54 y el avance del paso quedan para el siguiente tramo, para no tocar el documento de control hasta que el resto del paso esté listo.
