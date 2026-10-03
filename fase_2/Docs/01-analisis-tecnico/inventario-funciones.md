***
# Inventario y Desglose de Funciones

## 1. Módulo / Archivo Analizado

- **Ruta del archivo:** `app.js`
- **Propósito general:** Núcleo monolítico de la SPA Risk Manager. Coordina autenticación de sesión, tareas, turnos, presencia, permisos, comunicados, monitoreo, indicadores, gráficas y exportaciones, mezclando DOM, Firebase, `localStorage`, archivos XLSX/JSON y servicios HTTP.
- **Alcance del inventario:** aproximadamente 8.700 líneas; 161 funciones nombradas o expuestas detectables, además de callbacks anónimos internos. JavaScript no declara tipos estáticos; los tipos indicados como `inferido` se deducen del uso.

## 2. Detalle de Funciones

### Seguridad, sanitización y capacidades
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `appendFormSubmitCc()` (aprox. línea 5)
- **Firma / Parámetros de entrada:** `(formData: FormData)`; agrega campos al formulario.
- **Salida / Retorno:** `undefined`; muta `formData` agregando destinatarios en copia.
- **Comportamiento esperado vs. Real:** Debería centralizar la copia de notificaciones; realmente inserta un correo fijo en solicitudes externas.
- **Nivel de Relevancia:** Secundaria.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `escapeHTML()` (aprox. línea 10)
- **Firma / Parámetros de entrada:** `(str: unknown)`; valor que se insertará como texto HTML.
- **Salida / Retorno:** `string`; cadena con caracteres HTML escapados.
- **Comportamiento esperado vs. Real:** Debería impedir interpretación de markup; realmente convierte valores nulos a vacío y escapa cinco caracteres.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `encodeInlineHandlerArg()` (aprox. línea 23)
- **Firma / Parámetros de entrada:** `(value: unknown)`; argumento para un handler inline.
- **Salida / Retorno:** `string`; valor codificado para URL y apóstrofes.
- **Comportamiento esperado vs. Real:** Debería transportar argumentos sin romper el HTML; realmente prepara valores para `decodeURIComponent` dentro de `onclick`.
- **Nivel de Relevancia:** Secundaria.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `sanitizeAnnouncementHref()` (aprox. línea 32)
- **Firma / Parámetros de entrada:** `(value: unknown)`; atributo `href` de un comunicado.
- **Salida / Retorno:** `string`; URL original o cadena vacía.
- **Comportamiento esperado vs. Real:** Debería permitir solo enlaces seguros; realmente bloquea esquemas distintos de HTTP, HTTPS y mailto, además de URLs relativas peligrosas.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `sanitizeAnnouncementHTML()` (aprox. línea 47)
- **Firma / Parámetros de entrada:** `(value: unknown)`; contenido HTML almacenado.
- **Salida / Retorno:** `string`; HTML reconstruido desde una allowlist.
- **Comportamiento esperado vs. Real:** Debería limpiar contenido enriquecido; realmente parsea un template, elimina tags peligrosos y conserva un subconjunto de nodos.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `appendSanitizedNode()` (interna, aprox. línea 55)
- **Firma / Parámetros de entrada:** `(sourceNode: Node, targetParent: Element)`.
- **Salida / Retorno:** `undefined`; agrega nodos limpios al destino.
- **Comportamiento esperado vs. Real:** Debería recorrer el árbol de forma segura; realmente copia texto, normaliza alias de tags y descarta contenido no permitido.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `canPublishComunicados()` (aprox. línea 95)
- **Firma / Parámetros de entrada:** `(role: string)`; rol del usuario.
- **Salida / Retorno:** `boolean`.
- **Comportamiento esperado vs. Real:** Debería decidir capacidad de publicación; realmente consulta un `Set` local de roles.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `canViewComunicadoLecturas()` (aprox. línea 99)
- **Firma / Parámetros de entrada:** `(role: string)`.
- **Salida / Retorno:** `boolean`.
- **Comportamiento esperado vs. Real:** Debería decidir acceso a lecturas; realmente autoriza solo Admin y Supervisor en la interfaz.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `canDeleteComunicados()` (aprox. línea 103)
- **Firma / Parámetros de entrada:** `(role: string)`.
- **Salida / Retorno:** `boolean`.
- **Comportamiento esperado vs. Real:** Debería decidir eliminación; realmente limita la capacidad local al rol Admin.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `canManageComunicados()` (aprox. línea 109)
- **Firma / Parámetros de entrada:** `(role: string)`.
- **Salida / Retorno:** `boolean`.
- **Comportamiento esperado vs. Real:** Debería decidir visibilidad general del módulo; realmente combina publicación y lectura de estadísticas.
- **Nivel de Relevancia:** Secundaria.

### Multi-select, sesión local y presencia

- **Nombre de la función:** `setupCustomMultiSelect()` (aprox. línea 129)
- **Firma / Parámetros de entrada:** `(containerId: string, optionsList: string[], onChangeCallback?: Function)`.
- **Salida / Retorno:** `undefined`; construye HTML, estado interno y listeners.
- **Comportamiento esperado vs. Real:** Debería inicializar un selector reutilizable; realmente muta el DOM, registra un listener global de cierre y expone estado privado en propiedades del elemento.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `updateLabel()` (interna, aprox. línea 160)
- **Firma / Parámetros de entrada:** `()`; usa el `Set` local de seleccionados.
- **Salida / Retorno:** `undefined`; modifica texto del selector.
- **Comportamiento esperado vs. Real:** Debería reflejar la selección; realmente decide entre “todos”, un nombre o un contador.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `renderOptions()` (interna, aprox. línea 170)
- **Firma / Parámetros de entrada:** `(filter?: string)`.
- **Salida / Retorno:** `undefined`; reconstruye opciones y listeners.
- **Comportamiento esperado vs. Real:** Debería renderizar opciones filtradas; realmente vacía `innerHTML` y crea checkboxes con efectos sobre el callback.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `getSelectedMultiSelectValues()` (aprox. línea 274)
- **Firma / Parámetros de entrada:** `(containerId: string)`.
- **Salida / Retorno:** `string[]`; valores seleccionados o lista vacía.
- **Comportamiento esperado vs. Real:** Debería consultar selección; realmente lee una propiedad privada adjunta al DOM.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `resetCustomMultiSelect()` (aprox. línea 280)
- **Firma / Parámetros de entrada:** `(containerId: string)`.
- **Salida / Retorno:** `undefined`; limpia selección y re-renderiza.
- **Comportamiento esperado vs. Real:** Debería reiniciar el componente; realmente depende de `_selectedValuesRef` y `_setValues` no tipados.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `setCustomMultiSelectValues()` (aprox. línea 288)
- **Firma / Parámetros de entrada:** `(containerId: string, newValuesArray: string[])`.
- **Salida / Retorno:** `undefined`; modifica selección visual.
- **Comportamiento esperado vs. Real:** Debería establecer valores; realmente invoca una función privada almacenada en el elemento.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `saveBreakState()` (aprox. línea 315)
- **Firma / Parámetros de entrada:** `()`; usa variables globales de pausas.
- **Salida / Retorno:** `undefined`; escribe `riskOps_breakState` en `localStorage`.
- **Comportamiento esperado vs. Real:** Debería persistir el estado de pausas; realmente serializa varios globals sin validación de esquema.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `loadBreakState()` (aprox. línea 323)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; muta globals de pausas.
- **Comportamiento esperado vs. Real:** Debería restaurar pausas; realmente parsea `localStorage`, aplica valores por defecto y silencia errores.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `pushTimelineEvent()` (aprox. línea 388)
- **Firma / Parámetros de entrada:** `(type: string, action: 'start'|'end')`.
- **Salida / Retorno:** `undefined`; muta `shiftTimeline` y lo persiste.
- **Comportamiento esperado vs. Real:** Debería abrir o cerrar eventos; realmente cierra eventos previos sin fin, añade el evento y escribe en caché.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `setIdleDetectorWarning()` (aprox. línea 409)
- **Firma / Parámetros de entrada:** `(visible: boolean, message?: string)`.
- **Salida / Retorno:** `undefined`; cambia elementos del DOM.
- **Comportamiento esperado vs. Real:** Debería informar estado del detector; realmente actualiza banner y texto si existen.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `checkAndStartIdleDetector()` (aprox. línea 416)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<boolean>`.
- **Comportamiento esperado vs. Real:** Debería activar detección nativa; realmente consulta permisos, intenta iniciar el detector y muestra advertencias.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `requestIdlePermission()` (aprox. línea 440)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<boolean>`.
- **Comportamiento esperado vs. Real:** Debería solicitar permiso explícito; realmente llama `IdleDetector.requestPermission()` y arranca la lógica.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `startIdleDetectorLogic()` (aprox. línea 466)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<boolean>`.
- **Comportamiento esperado vs. Real:** Debería observar bloqueo/inactividad; realmente crea `IdleDetector`, registra `change`, usa temporizador y cambia globals.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `applyIdleStateChange()` (aprox. línea 517)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; modifica usuario, timeline, DOM y Firebase.
- **Comportamiento esperado vs. Real:** Debería sincronizar presencia; realmente cambia entre Activo/Inactivo y dispara varias escrituras y sincronizaciones.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `requestIdlePermissionManual()` (exportada, aprox. línea 541)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>` inferido.
- **Comportamiento esperado vs. Real:** Debería ser acción manual de habilitación; realmente deshabilita botón, solicita permiso y muestra `alert`.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `shouldApplyDomIdleFallback()` (aprox. línea 557)
- **Firma / Parámetros de entrada:** `(now?: number)`.
- **Salida / Retorno:** `boolean`; decisión basada en foco, visibilidad y tiempo.
- **Comportamiento esperado vs. Real:** Debería evitar falsos positivos; realmente bloquea fallback cuando existe detector nativo o la página no está visible/enfocada.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `updateActivity()` (aprox. línea 564)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; actualiza presencia y sincroniza Firebase.
- **Comportamiento esperado vs. Real:** Debería marcar actividad; realmente restaura Activo, cierra inactividad y dispara efectos secundarios.
- **Nivel de Relevancia:** Crítica.

### Normalización, calendarios y cronogramas

- **Nombre de la función:** `normalizeName()` (aprox. línea 723)
- **Firma / Parámetros de entrada:** `(name: unknown)`.
- **Salida / Retorno:** `string`; nombre sin acentos y en minúsculas.
- **Comportamiento esperado vs. Real:** Debería producir una clave comparable; realmente normaliza Unicode y espacios, devolviendo vacío para falsy.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `namesMatch()` (aprox. línea 729)
- **Firma / Parámetros de entrada:** `(name1: string, name2: string)`.
- **Salida / Retorno:** `boolean`.
- **Comportamiento esperado vs. Real:** Debería resolver identidades entre fuentes; realmente usa tokens, coincidencia parcial y excepciones como Daniel/Josue.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `excelToJSDate()` (aprox. línea 758)
- **Firma / Parámetros de entrada:** `(serial: number)`.
- **Salida / Retorno:** `Date|null`.
- **Comportamiento esperado vs. Real:** Debería convertir serial Excel; realmente calcula desde el epoch 1899-12-30.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `isSameDate()` (aprox. línea 764)
- **Firma / Parámetros de entrada:** `(excelDate: Date, jsDate: Date)`.
- **Salida / Retorno:** `boolean`; compara componentes de fecha.
- **Comportamiento esperado vs. Real:** Debería resolver fecha Excel contra fecha local; realmente compara UTC del Excel con fecha local del navegador.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `getShiftCategory()` (aprox. línea 772)
- **Firma / Parámetros de entrada:** `(shiftText: string)`.
- **Salida / Retorno:** `string`; categoría de turno o vacío.
- **Comportamiento esperado vs. Real:** Debería clasificar horarios; realmente aplica palabras clave, rangos horarios y categorías fijas.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `cleanText()` (aprox. línea 800)
- **Firma / Parámetros de entrada:** `(text: unknown)`.
- **Salida / Retorno:** `string`; texto normalizado.
- **Comportamiento esperado vs. Real:** Debería limpiar etiquetas comparables; realmente remueve acentos, símbolos y espacios repetidos.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `normalizeTaskName()` (aprox. línea 809)
- **Firma / Parámetros de entrada:** `(name: string)`.
- **Salida / Retorno:** `string`; nombre canónico con excepciones de negocio.
- **Comportamiento esperado vs. Real:** Debería unificar nombres de tareas; realmente aplica alias específicos para tareas históricas.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `taskNamesMatch()` (aprox. línea 823)
- **Firma / Parámetros de entrada:** `(cronTask: string, masterTask: string)`.
- **Salida / Retorno:** `boolean`.
- **Comportamiento esperado vs. Real:** Debería relacionar cronograma y catálogo; realmente permite igualdad o inclusión con límites de longitud.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `setNamesMatch()` (aprox. línea 839)
- **Firma / Parámetros de entrada:** `(set1: string, set2: string)`.
- **Salida / Retorno:** `boolean`.
- **Comportamiento esperado vs. Real:** Debería comparar SETs; realmente acepta igualdad o inclusión tras limpiar texto.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `parseSheetRange()` (aprox. línea 861)
- **Firma / Parámetros de entrada:** `(sheetName: string, year?: number, fallbackMonth?: number)`.
- **Salida / Retorno:** `{start: Date, end: Date}|null`.
- **Comportamiento esperado vs. Real:** Debería interpretar nombre de hoja semanal; realmente soporta tres patrones de rangos y usa mes fallback.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `getWeekSheet()` (aprox. línea 911)
- **Firma / Parámetros de entrada:** `(sheetNames: string[], targetDate: Date)`.
- **Salida / Retorno:** `string|null`.
- **Comportamiento esperado vs. Real:** Debería escoger hoja aplicable; realmente prueba rangos y, si no hay fechas, retorna una hoja heurística.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `fetchCronogramaRowsForDate()` (aprox. línea 939)
- **Firma / Parámetros de entrada:** `(targetDate: Date)`.
- **Salida / Retorno:** `Promise<unknown[][]|null>`.
- **Comportamiento esperado vs. Real:** Debería obtener filas del cronograma; realmente prueba meses candidatos, descarga XLSX y convierte la hoja elegida.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `getCronogramaColumnsForToday()` (aprox. línea 981)
- **Firma / Parámetros de entrada:** `(targetDate: Date, shiftText: string, rows?: unknown[][])`.
- **Salida / Retorno:** `number[][]`; pares de columnas por jornada.
- **Comportamiento esperado vs. Real:** Debería localizar columnas del día/turno; realmente busca encabezados y usa columnas fijas como fallback.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `preloadCronograma()` (aprox. línea 1022)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`.
- **Comportamiento esperado vs. Real:** Debería precargar datos; realmente descarga el cronograma y refresca monitoreo si está visible.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `getAssignedTasksForGestor()` (aprox. línea 1041)
- **Firma / Parámetros de entrada:** `(gestorName: string, shiftText: string)`.
- **Salida / Retorno:** `string[]`; tareas asignadas.
- **Comportamiento esperado vs. Real:** Debería filtrar tareas del gestor; realmente recorre columnas globales y usa `namesMatch`.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `loadCronogramaAssignments()` (aprox. línea 1070)
- **Firma / Parámetros de entrada:** `(gestorName: string, gestorShift: string)`.
- **Salida / Retorno:** `Promise<void>`; muta `gestorCronogramaAssignments`.
- **Comportamiento esperado vs. Real:** Debería cargar asignaciones; realmente descarga, recorre bloques y crea objetos `{set, task}`.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `getScheduledGestoresCountForShift()` (aprox. línea 1124)
- **Firma / Parámetros de entrada:** `(shiftName: string, targetDate?: Date)`.
- **Salida / Retorno:** `number`.
- **Comportamiento esperado vs. Real:** Debería contar gestores programados; realmente localiza columna por fecha/día y clasifica turnos.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `getShiftForDate()` (aprox. línea 1184)
- **Firma / Parámetros de entrada:** `(rows: unknown[][], allScheduleBlocks: object[], gestorName: string, date: Date)`.
- **Salida / Retorno:** `string`; turno o `Por Asignar`/`Descansa`.
- **Comportamiento esperado vs. Real:** Debería resolver turno histórico; realmente busca bloque, columna y gestor con múltiples fallbacks.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `getDocUrl()` (aprox. línea 1267)
- **Firma / Parámetros de entrada:** `(fileName: string)`.
- **Salida / Retorno:** `string`; URL externa, marcador pendiente o ruta local.
- **Comportamiento esperado vs. Real:** Debería resolver documentos; realmente aplica mapas hardcodeados y fallback `Procesos/`.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `getManualUrl()` (aprox. línea 1299)
- **Firma / Parámetros de entrada:** `(fileName: string)`.
- **Salida / Retorno:** `string`; URL SharePoint o ruta `Manuales/`.
- **Comportamiento esperado vs. Real:** Debería resolver manuales; realmente consulta un mapa estático de enlaces.
- **Nivel de Relevancia:** Secundaria.

### Tareas, persistencia y ciclo de aplicación

- **Nombre de la función:** `updateClock()` (aprox. línea 1322)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; actualiza reloj del DOM.
- **Comportamiento esperado vs. Real:** Debería mostrar hora actual; realmente escribe HH:mm:ss y se invoca cada segundo.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `loadExcelTasks()` (aprox. línea 1343)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; carga, filtra, cachea y renderiza tareas.
- **Comportamiento esperado vs. Real:** Debería cargar catálogo; realmente descarga XLSX, cruza cronograma, genera mocks, sincroniza estado y crea controles DOM.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `formatExcelDate()` (interna, aprox. línea 1533)
- **Firma / Parámetros de entrada:** `(serial: unknown)`.
- **Salida / Retorno:** `string`; fecha abreviada o vacío.
- **Comportamiento esperado vs. Real:** Debería presentar fecha Excel; realmente soporta strings parseables y seriales numéricos.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `loadSchedule()` (aprox. línea 1522)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; carga y renderiza horario.
- **Comportamiento esperado vs. Real:** Debería mostrar horario; realmente descarga XLSX, detecta bloques, crea filtros, renderiza tabla y sincroniza el turno actual con Firebase.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `renderScheduleBlock()` (interna, aprox. línea 1658)
- **Firma / Parámetros de entrada:** `(blockStartRow: number)`.
- **Salida / Retorno:** `undefined`; reconstruye cabecera y filas de horario.
- **Comportamiento esperado vs. Real:** Debería representar un bloque; realmente genera HTML inline, filtra gestores y puede disparar carga de tareas y sincronización.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `loadTeletrabajo()` (aprox. línea 1742)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; inicia una cadena de Promises.
- **Comportamiento esperado vs. Real:** Debería cargar teletrabajo; realmente descarga XLSX, detecta bloques, configura filtros y renderiza tabla sin devolver la Promise.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `renderTeletrabajoBlock()` (interna, aprox. línea 1823)
- **Firma / Parámetros de entrada:** `(block: object)`.
- **Salida / Retorno:** `undefined`; renderiza filas.
- **Comportamiento esperado vs. Real:** Debería mostrar modalidad; realmente filtra gestores y concatena HTML con escape parcial.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `loadPermisos()` (aprox. línea 1868)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; consulta y renderiza permisos.
- **Comportamiento esperado vs. Real:** Debería mostrar historial autorizado; realmente filtra por UID/rol, ordena y construye HTML inline.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `openPermisoDetailModal()` (exportada, aprox. línea 1944)
- **Firma / Parámetros de entrada:** `(fb_id: string)`.
- **Salida / Retorno:** `Promise<void>`; carga permiso y abre modal.
- **Comportamiento esperado vs. Real:** Debería mostrar detalle; realmente busca caché o Firebase y escribe HTML sanitizado al modal.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `renderTree()` (aprox. línea 2037)
- **Firma / Parámetros de entrada:** `(tasksBySet: Record<string, object[]>)`.
- **Salida / Retorno:** `undefined`; renderiza árbol y actualiza KPI.
- **Comportamiento esperado vs. Real:** Debería mostrar tareas por SET; realmente crea handlers inline, consulta caché global y dispara sincronización indirecta.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `canonicalTaskId()` (aprox. línea 2097)
- **Firma / Parámetros de entrada:** `(id: unknown)`.
- **Salida / Retorno:** `string`.
- **Comportamiento esperado vs. Real:** Debería unificar identidad de tarea; realmente convierte cualquier ID a string.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `isLegacyGenericTaskName()` (aprox. línea 2105)
- **Firma / Parámetros de entrada:** `(name: unknown)`.
- **Salida / Retorno:** `boolean`.
- **Comportamiento esperado vs. Real:** Debería detectar nombres heredados; realmente reconoce solo el patrón `Tarea <dígitos>`.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `resolveTaskDisplayName()` (aprox. línea 2120)
- **Firma / Parámetros de entrada:** `(key: string, entry: object, tasksCatalog?: object[])`.
- **Salida / Retorno:** `string`; nombre visible o fallback.
- **Comportamiento esperado vs. Real:** Debería ocultar IDs técnicos; realmente prioriza nombre guardado, busca catálogo y registra advertencia si falla.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `reconcileScheduledTaskWithSession()` (aprox. línea 2144)
- **Firma / Parámetros de entrada:** `(taskName: string, sessionTasks: object, tasksCatalog?: object[])`.
- **Salida / Retorno:** `{status: string, observation: string}`.
- **Comportamiento esperado vs. Real:** Debería reconciliar cronograma y sesión; realmente excluye extras y compara nombres normalizados.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `buildTaskReportSummaryText()` (aprox. línea 2165)
- **Firma / Parámetros de entrada:** `(report: object)`.
- **Salida / Retorno:** `string`; resumen de tareas.
- **Comportamiento esperado vs. Real:** Debería generar reporte estable; realmente prioriza `report.tasks` y cae a parsing de texto legacy.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `persistTaskToActiveSession()` (aprox. línea 2215)
- **Firma / Parámetros de entrada:** `(uid: string, taskId: string, taskData: object)`.
- **Salida / Retorno:** `Promise`; escritura Firebase por tarea.
- **Comportamiento esperado vs. Real:** Debería persistir una tarea; realmente valida UID/ID y ejecuta `update` sobre una ruta específica.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `fetchOwnActiveSessionTasks()` (aprox. línea 2230)
- **Firma / Parámetros de entrada:** `(uid: string)`.
- **Salida / Retorno:** `Promise<{ok: boolean, tasks: object}>`.
- **Comportamiento esperado vs. Real:** Debería recuperar progreso propio; realmente distingue lectura válida de fallo y no convierte error en ausencia.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `mergeTaskCaches()` (aprox. línea 2247)
- **Firma / Parámetros de entrada:** `(localCache: object, remoteCache: object)`.
- **Salida / Retorno:** `object`; caché combinado.
- **Comportamiento esperado vs. Real:** Debería resolver conflictos por versión; realmente prioriza remoto solo si `updatedAt` es estrictamente mayor.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `computeLocalTaskMigrations()` (aprox. línea 2275)
- **Firma / Parámetros de entrada:** `(mergedCache: object, remoteCache: object, now: number)`.
- **Salida / Retorno:** `object[]`; registros a migrar.
- **Comportamiento esperado vs. Real:** Debería planificar migración idempotente; realmente detecta diferencias y estampa fecha en legacy.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `persistTaskIfNotNewerRemote()` (aprox. línea 2306)
- **Firma / Parámetros de entrada:** `(uid: string, taskId: string, record: object)`.
- **Salida / Retorno:** `Promise`; transacción Firebase.
- **Comportamiento esperado vs. Real:** Debería evitar sobrescribir remoto nuevo; realmente aborta la transacción cuando `updatedAt` remoto es superior.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `migrateLocalTasksToActiveSession()` (aprox. línea 2333)
- **Firma / Parámetros de entrada:** `(uid: string, mergedCache: object, remoteCache: object)`.
- **Salida / Retorno:** `Promise<{migrated: string[], failed: string[], skipped: string[]}>`.
- **Comportamiento esperado vs. Real:** Debería recuperar tareas localmente; realmente migra una por una, persiste respaldo y clasifica resultados.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `syncActiveSessionToFirebase()` (aprox. línea 2360)
- **Firma / Parámetros de entrada:** `()`; consume usuario, DOM, pausas y timeline globales.
- **Salida / Retorno:** `Promise`; actualización de metadatos de sesión.
- **Comportamiento esperado vs. Real:** Debería sincronizar presencia; realmente calcula KPIs desde DOM, estado de inactividad y escribe `active_sessions`.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `updateKPI()` (aprox. línea 2448)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; re-renderiza KPI y sincroniza sesión.
- **Comportamiento esperado vs. Real:** Debería mostrar progreso; realmente cuenta clases DOM, genera SVG inline y tiene efecto remoto indirecto.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `toggleTree()` (aprox. línea 2493)
- **Firma / Parámetros de entrada:** `(element: HTMLElement)`.
- **Salida / Retorno:** `undefined`; alterna clases CSS.
- **Comportamiento esperado vs. Real:** Debería abrir/cerrar SET; realmente modifica el elemento y su hermano inmediato.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `renderQuickDocs()` (aprox. línea 2502)
- **Firma / Parámetros de entrada:** `(selectedTaskName?: string)`.
- **Salida / Retorno:** `undefined`; renderiza enlaces de documentación.
- **Comportamiento esperado vs. Real:** Debería sugerir documentos por tarea; realmente usa reglas de palabras clave y genera HTML con URLs resueltas.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `selectTask()` (exportada, aprox. línea 2586)
- **Firma / Parámetros de entrada:** `(taskId: string|number, evt?: Event)`.
- **Salida / Retorno:** `undefined`; cambia tarea seleccionada y formulario.
- **Comportamiento esperado vs. Real:** Debería seleccionar una tarea; realmente cruza catálogo, caché, rol, botones, observación y documentos.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `recoverGestorTaskProgress()` (aprox. línea 2668)
- **Firma / Parámetros de entrada:** `(uid: string)`.
- **Salida / Retorno:** `Promise<{status: string, failedMigrationsCount: number}>`.
- **Comportamiento esperado vs. Real:** Debería restaurar progreso; realmente lee remoto, fusiona local, verifica identidad y migra faltantes.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `initApp()` (aprox. línea 2696)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>` inferido.
- **Comportamiento esperado vs. Real:** Debería arrancar la aplicación; realmente orquesta recuperación, Excel, permisos, tema, roles, presencia, listeners, navegación y formularios.
- **Nivel de Relevancia:** Crítica.

### Pausas y cierre de turno

- **Nombre de la función:** `toggleBreakfastBreak()` (aprox. línea 3479)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; cambia pausa, timeline, DOM y sesión.
- **Comportamiento esperado vs. Real:** Debería iniciar/finalizar desayuno; realmente aplica exclusión con otras pausas, persiste y sincroniza.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `toggleLunchBreak()` (aprox. línea 3520)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; cambia pausa, tiempos y Firebase.
- **Comportamiento esperado vs. Real:** Debería controlar almuerzo; realmente mide duración, actualiza estilos, timeline y presencia.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `persistShiftClosureCore()` (aprox. línea 3560)
- **Firma / Parámetros de entrada:** `(reportUid: string, loginLogId: string, shiftReportObject: object)`.
- **Salida / Retorno:** `Promise<string>`; ID del reporte.
- **Comportamiento esperado vs. Real:** Debería persistir cierre atómico; realmente hace update multi-ruta de reporte, sesión activa y logout.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `hasRealSetOptions()` (aprox. línea 3576)
- **Firma / Parámetros de entrada:** `(setSelect: HTMLSelectElement)`.
- **Salida / Retorno:** `boolean`.
- **Comportamiento esperado vs. Real:** Debería detectar SETs reales; realmente ignora opciones deshabilitadas, vacías y `Todos`.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `requiresSpecificSetSelection()` (aprox. línea 3583)
- **Firma / Parámetros de entrada:** `(setSelect: HTMLSelectElement)`.
- **Salida / Retorno:** `boolean`.
- **Comportamiento esperado vs. Real:** Debería validar selección obligatoria; realmente exige valor específico solo si hay opciones reales.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `restoreEndShiftButton()` (aprox. línea 3588)
- **Firma / Parámetros de entrada:** `(button: HTMLElement, previousHtml: string)`.
- **Salida / Retorno:** `undefined`; restaura botón.
- **Comportamiento esperado vs. Real:** Debería permitir reintento; realmente restaura HTML y habilita control.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `toggleSplitShiftBreak()` (aprox. línea 3595)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; controla pausa de turno partido.
- **Comportamiento esperado vs. Real:** Debería abrir/cerrar pausa; realmente actualiza contador, timeline, estilos y sesión.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `handleEndShift()` (aprox. línea 3635)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; cierre de turno y navegación.
- **Comportamiento esperado vs. Real:** Debería cerrar turno una sola vez; realmente valida tareas/SET, calcula métricas, limpia timeline, persiste Firebase, hace logout, envía FormSubmit y redirige.
- **Nivel de Relevancia:** Crítica.

### Modales, tareas extra, usuarios y permisos

- **Nombre de la función:** `openExceptionModal()` (aprox. línea 3920)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; prepara y abre modal.
- **Comportamiento esperado vs. Real:** Debería iniciar excepción de tarea; realmente limpia campos, activa estado visual y muestra modal.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `closeModal()` (aprox. línea 3938)
- **Firma / Parámetros de entrada:** `(modalId: string)`.
- **Salida / Retorno:** `undefined`; elimina clase activa.
- **Comportamiento esperado vs. Real:** Debería cerrar cualquier modal; realmente busca por ID y cambia CSS.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `confirmException()` (aprox. línea 3945)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; copia excepción a observación.
- **Comportamiento esperado vs. Real:** Debería validar motivo y detalle; realmente lee selects, muestra alerts y cierra modal.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `openExtraTaskModal()` (aprox. línea 3965)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; reinicia y abre modal.
- **Comportamiento esperado vs. Real:** Debería iniciar tarea extra; realmente limpia inputs y reinicia ID pendiente.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `saveExtraTask()` (aprox. línea 3977)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; persiste tarea extra.
- **Comportamiento esperado vs. Real:** Debería guardar tarea adicional validada; realmente valida identidad, actualiza caché, persiste Firebase y actualiza UI.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `renderPendingUsers()` (aprox. línea 4055)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; consulta y renderiza usuarios pendientes.
- **Comportamiento esperado vs. Real:** Debería mostrar aprobaciones; realmente lee `users`, filtra estados y genera acciones inline.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `approveUser()` (aprox. línea 4165)
- **Firma / Parámetros de entrada:** `(userId: string)`.
- **Salida / Retorno:** `Promise<void>`; actualiza usuario.
- **Comportamiento esperado vs. Real:** Debería aprobar una cuenta; realmente hace update y refresca la lista/notificación.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `showUserRejectBox()` (aprox. línea 4180)
- **Firma / Parámetros de entrada:** `(id: string)`.
- **Salida / Retorno:** `undefined`; muestra control de rechazo.
- **Comportamiento esperado vs. Real:** Debería abrir rechazo; realmente cambia visibilidad de un contenedor DOM.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `cancelRejectUser()` (aprox. línea 4185)
- **Firma / Parámetros de entrada:** `(id: string)`.
- **Salida / Retorno:** `undefined`; oculta rechazo.
- **Comportamiento esperado vs. Real:** Debería cancelar UI; realmente oculta el bloque por ID.
- **Nivel de Relevancia:** Redundante.

- **Nombre de la función:** `confirmRejectUser()` (aprox. línea 4191)
- **Firma / Parámetros de entrada:** `(userId: string)`.
- **Salida / Retorno:** `Promise<void>`; elimina/rechaza usuario.
- **Comportamiento esperado vs. Real:** Debería registrar rechazo; realmente valida motivo, ejecuta operación Firebase y refresca interfaz.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `renderPendingPermissions()` (aprox. línea 4211)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; renderiza permisos pendientes.
- **Comportamiento esperado vs. Real:** Debería presentar aprobaciones; realmente consulta, filtra y genera botones/modales inline.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `showPermRejectBox()` (aprox. línea 4335)
- **Firma / Parámetros de entrada:** `(id: string)`.
- **Salida / Retorno:** `undefined`; muestra UI de rechazo.
- **Comportamiento esperado vs. Real:** Debería abrir campo de razón; realmente altera display por ID.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `cancelRejectPerm()` (aprox. líneas 4340 y 4366)
- **Firma / Parámetros de entrada:** `(id: string)`.
- **Salida / Retorno:** `undefined`; oculta controles.
- **Comportamiento esperado vs. Real:** Debería cancelar rechazo; realmente existe duplicación de definición con comportamiento equivalente.
- **Nivel de Relevancia:** Redundante.

- **Nombre de la función:** `cancelApprovePerm()` (aprox. línea 4360)
- **Firma / Parámetros de entrada:** `(id: string)`.
- **Salida / Retorno:** `undefined`; oculta confirmación.
- **Comportamiento esperado vs. Real:** Debería cancelar aprobación; realmente modifica visibilidad del bloque.
- **Nivel de Relevancia:** Redundante.

- **Nombre de la función:** `showPermApproveBox()` (aprox. línea 4355)
- **Firma / Parámetros de entrada:** `(id: string)`.
- **Salida / Retorno:** `undefined`; muestra confirmación.
- **Comportamiento esperado vs. Real:** Debería preparar aprobación; realmente alterna un elemento DOM.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `confirmApprovePerm()` (aprox. línea 4372)
- **Firma / Parámetros de entrada:** `(id: string)`.
- **Salida / Retorno:** `Promise<void>`; aprueba permiso.
- **Comportamiento esperado vs. Real:** Debería confirmar cambio de estado; realmente llama `updatePermissionStatus` y refresca datos.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `updatePermissionStatus()` (aprox. línea 4377)
- **Firma / Parámetros de entrada:** `(fb_id: string, newStatus: string, reason?: string|null)`.
- **Salida / Retorno:** `Promise<void>`; actualiza Firebase y notifica.
- **Comportamiento esperado vs. Real:** Debería cambiar estado con auditoría; realmente escribe estado/razón, actualiza correo y recarga permisos.
- **Nivel de Relevancia:** Crítica.

### Historial, perfil, navegación y monitoreo

- **Nombre de la función:** `exportShiftReport()` (exportada, aprox. línea 4395)
- **Firma / Parámetros de entrada:** `(fb_id: string)`.
- **Salida / Retorno:** `Promise<void>`; descarga PDF.
- **Comportamiento esperado vs. Real:** Debería exportar un turno; realmente lee Firebase, compone HTML temporal con estilos y usa html2pdf.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `renderShiftReports()` (aprox. línea 4526)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; carga y renderiza historial.
- **Comportamiento esperado vs. Real:** Debería listar reportes autorizados; realmente consulta todos los reportes disponibles, ordena y crea tarjetas HTML.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `applyShiftReportsFilters()` (aprox. línea 4561)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; oculta/muestra tarjetas.
- **Comportamiento esperado vs. Real:** Debería filtrar historial; realmente combina gestor, fecha y texto contra atributos DOM.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `openShiftDetailModal()` (exportada, aprox. línea 4674)
- **Firma / Parámetros de entrada:** `(fb_id: string)`.
- **Salida / Retorno:** `undefined` o `Promise<void>` inferido.
- **Comportamiento esperado vs. Real:** Debería abrir detalle; realmente prepara modal y enlaza contenido de reporte.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `toggleNotifications()` (aprox. línea 4793)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; alterna dropdown.
- **Comportamiento esperado vs. Real:** Debería mostrar notificaciones; realmente cambia `display` del menú.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `markAllAsRead()` (aprox. línea 4804)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; actualiza permisos/notificaciones.
- **Comportamiento esperado vs. Real:** Debería marcar pendientes como leídos; realmente carga permisos autorizados y actualiza flags en lote.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `openProfileModal()` (aprox. línea 4844)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; abre modal y carga perfil.
- **Comportamiento esperado vs. Real:** Debería mostrar perfil; realmente copia datos de `currentUser` al DOM.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `toggleProfilePassword()` (aprox. línea 4865)
- **Firma / Parámetros de entrada:** `(iconElement: HTMLElement)`.
- **Salida / Retorno:** `undefined`; cambia tipo de input y clases.
- **Comportamiento esperado vs. Real:** Debería alternar visibilidad de contraseña; realmente usa el hermano anterior del icono.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `changePassword()` (aprox. línea 4878)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; cambia contraseña mediante Firebase Auth.
- **Comportamiento esperado vs. Real:** Debería validar y actualizar credencial; realmente lee formulario, llama SDK y usa alerts.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `alignAdministrativeControlsByRole()` (aprox. línea 4918)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; muestra u oculta controles.
- **Comportamiento esperado vs. Real:** Debería aplicar capacidades de rol; realmente muta directamente varios elementos según `currentUser`.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `setupSidebar()` (aprox. línea 4936)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; ordena/configura navegación.
- **Comportamiento esperado vs. Real:** Debería preparar sidebar; realmente oculta, muestra y ordena nodos según rol y capacidades.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `updateNavigation()` (exportada, aprox. línea 5076)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; actualiza navegación.
- **Comportamiento esperado vs. Real:** Debería sincronizar vista y permisos; realmente delega en lógica DOM y estado global.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `startActiveSessionsListener()` (aprox. línea 5106)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; registra listener Firebase.
- **Comportamiento esperado vs. Real:** Debería observar sesiones; realmente escucha `active_sessions` y dispara renderizado.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `calculateShiftDelay()` (aprox. línea 5119)
- **Firma / Parámetros de entrada:** `(session: object)`.
- **Salida / Retorno:** `number`; minutos de retraso inferidos.
- **Comportamiento esperado vs. Real:** Debería calcular demora del gestor; realmente compara sesión con turno programado y datos de horario.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `renderActiveSessionsDashboard()` (aprox. línea 5159)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; renderiza monitoreo.
- **Comportamiento esperado vs. Real:** Debería mostrar sesiones actuales; realmente filtra estado, turno, tareas, cronograma y construye tarjetas HTML.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `viewTimelineInMonitoreo()` (aprox. línea 5400)
- **Firma / Parámetros de entrada:** `(uid: string)`.
- **Salida / Retorno:** `undefined`; abre timeline de sesión.
- **Comportamiento esperado vs. Real:** Debería inspeccionar actividad; realmente busca sesión global y llena modal con eventos.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `openMonitoreoDetails()` (exportada, aprox. línea 5466)
- **Firma / Parámetros de entrada:** `(uid: string)`.
- **Salida / Retorno:** `undefined`; abre detalle de gestor.
- **Comportamiento esperado vs. Real:** Debería mostrar sesión completa; realmente consulta/usa estado global, tareas y timeline para renderizar modal.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `populateGestoresDropdown()` (aprox. línea 5579)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>` inferido.
- **Comportamiento esperado vs. Real:** Debería poblar filtro de gestores; realmente lee usuarios Firebase y escribe opciones.
- **Nivel de Relevancia:** Secundaria.

### KPIs, analítica y gráficas

- **Nombre de la función:** `fetchKpiOperativosData()` (aprox. línea 5615)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<object|null>`; JSON histórico o datos vacíos.
- **Comportamiento esperado vs. Real:** Debería obtener fuente KPI; realmente selecciona endpoint local/producción, hace `fetch` y guarda datos globales.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `loadRetirosData()` (aprox. línea 5643)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; carga retiros en globals.
- **Comportamiento esperado vs. Real:** Debería preparar datos de retiros; realmente solicita endpoint/JSON y asigna `retirosGlobalData`.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `loadGestoresForKPIs()` (aprox. línea 5655)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined` o `Promise<void>` inferido.
- **Comportamiento esperado vs. Real:** Debería cargar catálogo de gestores; realmente consulta usuarios, filtra aprobados y llena `window.kpiUsersData`.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `calcularIndicadores()` (aprox. línea 5716)
- **Firma / Parámetros de entrada:** `()`; lee filtros y reportes globales.
- **Salida / Retorno:** `Promise<void>`; actualiza KPI, HTML y gráficas indirectamente.
- **Comportamiento esperado vs. Real:** Debería calcular indicadores; realmente consulta Firebase, interpreta legacy, calcula tareas/conectividad/retiros, crea HTML y muta varios globals.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `parseTime()` (interna, aprox. línea 5840)
- **Firma / Parámetros de entrada:** `(timeStr: string, baseDateMs: number)`.
- **Salida / Retorno:** `number` timestamp o `NaN`.
- **Comportamiento esperado vs. Real:** Debería normalizar hora de reporte; realmente prueba `Date` nativo y fallback regex AM/PM.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `openKpiTaskDetails()` (aprox. línea 6358)
- **Firma / Parámetros de entrada:** `(tipo: string)`.
- **Salida / Retorno:** `undefined`; abre modal de tareas.
- **Comportamiento esperado vs. Real:** Debería detallar KPI; realmente lee listas globales, crea HTML y muestra modal.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `closeKpiTaskDetails()` (aprox. línea 6414)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; oculta modal.
- **Comportamiento esperado vs. Real:** Debería cerrar detalle; realmente elimina clase activa.
- **Nivel de Relevancia:** Redundante.

- **Nombre de la función:** `destroyChart()` (aprox. línea 6942)
- **Firma / Parámetros de entrada:** `(id: string)`.
- **Salida / Retorno:** `undefined`; destruye instancia Chart.js.
- **Comportamiento esperado vs. Real:** Debería liberar gráfica; realmente busca instancia global por ID y llama `destroy`.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `toggleOperativoCustomDates()` (aprox. línea 6951)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; alterna controles de fecha.
- **Comportamiento esperado vs. Real:** Debería mostrar rango personalizado; realmente inspecciona select y cambia `display`.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `generarAnalisisTextual()` (aprox. línea 6964)
- **Firma / Parámetros de entrada:** `()`; consume `controlOperativoRawData` y filtros.
- **Salida / Retorno:** `undefined`; genera texto/HTML narrativo.
- **Comportamiento esperado vs. Real:** Debería resumir KPIs; realmente calcula rankings y recomendaciones con reglas locales, sin servicio de IA separado.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `generarReporteEjecutivoPDF()` (aprox. línea 7155)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; imprime el reporte.
- **Comportamiento esperado vs. Real:** Debería generar informe ejecutivo; realmente prepara contenedor y llama `window.print()` tras un timeout.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `loadControlOperativoData()` (aprox. línea 7231)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; fusiona fuentes y renderiza.
- **Comportamiento esperado vs. Real:** Debería cargar control operativo; realmente obtiene JSON/Firebase, cruza nombres, calcula inactividad/tardanza, muta datos globales y configura UI.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `renderControlOperativoFiltered()` (aprox. línea 7420)
- **Firma / Parámetros de entrada:** `()`; lee filtros y `window.controlOperativoRawData`.
- **Salida / Retorno:** `undefined`; actualiza tabla, widgets y gráficas.
- **Comportamiento esperado vs. Real:** Debería renderizar datos filtrados; realmente filtra, agrega, calcula métricas y dispara `calcularIndicadores()`.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `renderControlOperativoCharts()` (aprox. línea 7676)
- **Firma / Parámetros de entrada:** `(data: object, dailyData: object, selectedGestor: string)`.
- **Salida / Retorno:** `undefined`; configura varias gráficas.
- **Comportamiento esperado vs. Real:** Debería pintar visualizaciones; realmente filtra rankings, actualiza títulos y delega en múltiples funciones Chart.js.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `drawPunctualDatesChart()` (aprox. línea 7911)
- **Firma / Parámetros de entrada:** `(id: string, dates: string[], dataArr: number[], bgColors: string[])`.
- **Salida / Retorno:** `undefined`; crea gráfica de fechas.
- **Comportamiento esperado vs. Real:** Debería representar puntualidad; realmente destruye instancia previa y construye Chart.js.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `drawChart()` (aprox. línea 7972)
- **Firma / Parámetros de entrada:** `(id: string, type: string, labels: string[], dataArr: number[], labelStr: string, bgColor: string, borderColor: string, extraOptions?: object)`.
- **Salida / Retorno:** `undefined`; crea gráfica genérica.
- **Comportamiento esperado vs. Real:** Debería encapsular Chart.js; realmente combina defaults, opciones y estado global de gráficos.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `drawCombinedChart()` (aprox. línea 8024)
- **Firma / Parámetros de entrada:** `(id: string, labels: string[], data: object)`.
- **Salida / Retorno:** `undefined`; crea gráfica combinada.
- **Comportamiento esperado vs. Real:** Debería comparar métricas; realmente construye datasets de eficiencia y volumen.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `drawCombinedChartDaily()` (aprox. línea 8091)
- **Firma / Parámetros de entrada:** `(id: string, sortedDates: string[], selectedGestor: string)`.
- **Salida / Retorno:** `undefined`; crea evolución diaria.
- **Comportamiento esperado vs. Real:** Debería mostrar tendencia diaria; realmente consulta estado global y arma datos por fecha/gestor.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `drawScatterMatriz()` (aprox. línea 8157)
- **Firma / Parámetros de entrada:** `(id: string, gestores: string[], data: object, isGlobal?: boolean)`.
- **Salida / Retorno:** `undefined`; crea scatter de matriz.
- **Comportamiento esperado vs. Real:** Debería comparar ejes de desempeño; realmente calcula puntos y registra interacción Chart.js.
- **Nivel de Relevancia:** Secundaria.

### Comunicados, configuración e incidencias

- **Nombre de la función:** `updateActiveSupervisorBadge()` (aprox. línea 8272)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; actualiza badge del supervisor.
- **Comportamiento esperado vs. Real:** Debería mostrar supervisor activo; realmente consulta/usa información global y modifica DOM.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `openLoginHistoryModal()` (aprox. línea 8346)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; consulta y abre historial.
- **Comportamiento esperado vs. Real:** Debería mostrar auditoría; realmente lee `login_history`, filtra y renderiza tabla/modal.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `renderLoginHistoryTable()` (aprox. línea 8461)
- **Firma / Parámetros de entrada:** `(records: object[])`.
- **Salida / Retorno:** `undefined`; crea filas de historial.
- **Comportamiento esperado vs. Real:** Debería renderizar auditoría; realmente ordena/transforma registros y escribe HTML.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `filterLoginHistoryTable()` (aprox. línea 8537)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; filtra filas visibles.
- **Comportamiento esperado vs. Real:** Debería filtrar historial; realmente compara valores de inputs con celdas DOM.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `calculateEffectiveApprovalTime()` (aprox. línea 8580)
- **Firma / Parámetros de entrada:** `(creacionTime: string|number, aprobacionTime: string|number, inicioTurnoTime: string|number)`.
- **Salida / Retorno:** `number`; minutos efectivos inferidos.
- **Comportamiento esperado vs. Real:** Debería excluir periodos fuera de turno; realmente calcula duración ajustada mediante fechas y turnos.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `setupUserPresence()` (aprox. línea 8597)
- **Firma / Parámetros de entrada:** `(uid: string)`.
- **Salida / Retorno:** `undefined` o `Promise` inferido.
- **Comportamiento esperado vs. Real:** Debería preparar presencia de usuario; realmente registra referencias/listeners de estado Firebase.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `startMonitoringPresence()` (aprox. línea 8617)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; inicia monitoreo.
- **Comportamiento esperado vs. Real:** Debería activar presencia; realmente configura listeners y refresco de sesiones.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `incrementApprovedWithdrawal()` (aprox. línea 8629)
- **Firma / Parámetros de entrada:** `(uid: string, amount?: number)`.
- **Salida / Retorno:** `Promise` inferido; incrementa contador Firebase.
- **Comportamiento esperado vs. Real:** Debería registrar retiros aprobados; realmente usa una transacción o actualización sobre datos remotos.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `initAtomicApprovedCounterListener()` (aprox. línea 8641)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; registra listener de contador.
- **Comportamiento esperado vs. Real:** Debería observar contador atómico; realmente escucha cambios y actualiza UI.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `updateApprovedCountUI()` (aprox. línea 8650)
- **Firma / Parámetros de entrada:** `(count: number)`.
- **Salida / Retorno:** `undefined`; escribe contador en DOM.
- **Comportamiento esperado vs. Real:** Debería mostrar aprobaciones; realmente actualiza uno o más elementos de conteo.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `handleNewIncidentSubmit()` (aprox. línea 8663)
- **Firma / Parámetros de entrada:** `(event: SubmitEvent)`.
- **Salida / Retorno:** `Promise<void>`; crea incidente.
- **Comportamiento esperado vs. Real:** Debería validar y registrar incidente; realmente evita submit nativo, construye payload y escribe en Firebase.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `startIncidentsRealtimeListener()` (aprox. línea 8703)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; escucha incidentes.
- **Comportamiento esperado vs. Real:** Debería mantener panel actualizado; realmente registra listener Firebase y llama renderizado.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `renderIncidentsTable()` (aprox. línea 8716)
- **Firma / Parámetros de entrada:** `(incidents: object[])`.
- **Salida / Retorno:** `undefined`; renderiza tabla.
- **Comportamiento esperado vs. Real:** Debería mostrar incidentes; realmente ordena y concatena filas HTML.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `initComunicadosListener()` (aprox. línea 6498)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; registra listener de anuncios.
- **Comportamiento esperado vs. Real:** Debería sincronizar comunicados; realmente escucha `announcements` y actualiza globals/badge.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `openNewComunicadoModal()` (aprox. línea 6517)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; muestra formulario.
- **Comportamiento esperado vs. Real:** Debería iniciar publicación; realmente limpia y activa modal.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `saveNewComunicado()` (aprox. línea 6527)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `Promise<void>`; persiste comunicado y notifica.
- **Comportamiento esperado vs. Real:** Debería publicar autorizado; realmente valida rol, sanitiza contenido, escribe Firebase y envía correo.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `updateUnreadBadge()` (aprox. línea 6562)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; actualiza badge.
- **Comportamiento esperado vs. Real:** Debería contar no leídos; realmente inspecciona colección global y modifica DOM.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `renderGestorComunicados()` (aprox. línea 6590)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; lista comunicados para gestor.
- **Comportamiento esperado vs. Real:** Debería mostrar contenido autorizado; realmente filtra lectura, sanitiza y genera tarjetas HTML.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `markComunicadoAsRead()` (aprox. línea 6631)
- **Firma / Parámetros de entrada:** `(id: string)`.
- **Salida / Retorno:** `Promise<void>`; escribe `readBy`.
- **Comportamiento esperado vs. Real:** Debería registrar lectura propia; realmente actualiza ruta Firebase del usuario y refresca badge.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `checkUnreadUrgentAnnouncements()` (aprox. línea 6644)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined`; detecta urgentes no leídos.
- **Comportamiento esperado vs. Real:** Debería alertar urgencias; realmente revisa colección y muestra aviso/modal.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `markUrgentComunicadoAsRead()` (aprox. línea 6674)
- **Firma / Parámetros de entrada:** `(id: string)`.
- **Salida / Retorno:** `Promise<void>`; confirma lectura urgente.
- **Comportamiento esperado vs. Real:** Debería persistir confirmación; realmente escribe `readBy` y actualiza interfaz.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `renderConfigGestores()` (aprox. línea 6697)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined` o `Promise<void>` inferido.
- **Comportamiento esperado vs. Real:** Debería administrar configuración de gestores; realmente consulta usuarios y genera controles de turno partido.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `toggleGestorSplitShift()` (aprox. línea 6762)
- **Firma / Parámetros de entrada:** `(uid: string, isChecked: boolean)`.
- **Salida / Retorno:** `Promise<void>`; actualiza flag del usuario.
- **Comportamiento esperado vs. Real:** Debería habilitar pausa de turno partido; realmente escribe `hasSplitShift` en Firebase y refresca configuración.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `renderAdminComunicados()` (aprox. línea 6776)
- **Firma / Parámetros de entrada:** `()`.
- **Salida / Retorno:** `undefined` o `Promise<void>` inferido.
- **Comportamiento esperado vs. Real:** Debería mostrar gestión administrativa; realmente consulta, clasifica y genera acciones de comunicados.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `viewComunicadoContent()` (aprox. línea 6818)
- **Firma / Parámetros de entrada:** `(id: string)`.
- **Salida / Retorno:** `undefined`; abre contenido.
- **Comportamiento esperado vs. Real:** Debería visualizar comunicado; realmente busca dato global y escribe contenido sanitizado.
- **Nivel de Relevancia:** Secundaria.

- **Nombre de la función:** `viewComunicadoLecturas()` (aprox. línea 6830)
- **Firma / Parámetros de entrada:** `(id: string)`.
- **Salida / Retorno:** `Promise<void>`; consulta lecturas.
- **Comportamiento esperado vs. Real:** Debería mostrar auditoría de lectura; realmente valida capacidad, consulta usuarios y renderiza lista.
- **Nivel de Relevancia:** Crítica.

- **Nombre de la función:** `deleteComunicado()` (aprox. línea 6900)
- **Firma / Parámetros de entrada:** `(id: string)`.
- **Salida / Retorno:** `Promise<void>` inferido; elimina anuncio.
- **Comportamiento esperado vs. Real:** Debería eliminar solo con capacidad Admin; realmente confirma y borra la ruta Firebase.
- **Nivel de Relevancia:** Crítica.

### Notas sobre callbacks y duplicación

El archivo contiene además callbacks anónimos de `addEventListener`, Firebase `.on`, `setTimeout`, `setInterval`, Promises y handlers inline generados dinámicamente. Se consideran efectos internos de las funciones que los registran porque no tienen nombre estable ni contrato reutilizable. También se detecta `cancelRejectPerm()` definido dos veces; la segunda definición sobrescribe la primera, por lo que debe tratarse como deuda y no como dos operaciones independientes.

### Conclusión del inventario

La mayoría de las funciones son de tipo `Efectos secundarios`, aunque el código no lo declare: acceden al DOM, Firebase, almacenamiento, red, temporizadores o variables globales. Las funciones con mejor candidato a extracción pura son `normalizeName`, `namesMatch`, `excelToJSDate`, `isSameDate`, `getShiftCategory`, `cleanText`, `normalizeTaskName`, `taskNamesMatch`, `setNamesMatch`, `parseSheetRange`, `canonicalTaskId`, `isLegacyGenericTaskName`, `mergeTaskCaches`, `computeLocalTaskMigrations`, `calculateEffectiveApprovalTime` y los cálculos aislables de timeline/KPI. Las funciones críticas deben migrarse primero detrás de servicios y repositorios, conservando las fachadas actuales hasta completar la regresión.
