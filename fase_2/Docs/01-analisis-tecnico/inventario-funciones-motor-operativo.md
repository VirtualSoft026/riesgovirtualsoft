***
# Inventario y Desglose de Funciones — `motor_operativo.py`

## 1. Módulo / Archivo Analizado

- **Ruta del archivo:** `motor_operativo.py`
- **Propósito general:** script Python independiente (no se ejecuta en el navegador ni forma parte de `fase_2/src/`) que extrae el histórico de retiros desde MicroStrategy, lo cruza con la lista de Gestores aprobados en Firebase, calcula métricas agregadas por Gestor/fecha y escribe el resultado en `kpi_operativos_v2.json` — el archivo que `app.js` (`loadRetirosData()`/KPIs) consume como fuente de datos operativos. Se ejecuta por fuera de la aplicación web, probablemente por tarea programada o manualmente (`Actualizar_Tablero_Robot.bat` en la raíz del repositorio lo invoca).
- **Alcance del inventario:** 333 líneas; 1 función de módulo (`get_firebase_gestores`) y 2 clases (`MicroStrategyConnector`, `MotorOperativo`) con 11 métodos en total.
- **Nota de alcance cerrada (2026-10-03):** este inventario responde al vacío señalado en `../03-plan-migracion/plan-maestro-ejecucion.md` §2 y §4 punto 5 ("scope incompleto en... `motor_operativo.py`"). Ninguna de sus funciones está en la tabla de 164 funciones de `app.js` (es un archivo distinto, en Python) ni tiene contraparte en `fase_2/src/` — ese árbol es JavaScript puro. No se modificó `motor_operativo.py` para producir este documento.

## 2. Detalle de Funciones

### Función de módulo

----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `get_firebase_gestores()` (línea 40)
- **Firma / Parámetros de entrada:** `()`; sin parámetros, usa el endpoint fijo `https://riskops-75637-default-rtdb.firebaseio.com/users.json`.
- **Salida / Retorno:** `dict[str, str]`; mapa de múltiples variantes de clave (correo completo, usuario del correo, nombre completo en minúsculas, combinaciones de nombre+apellido) hacia el nombre "canónico" del Gestor tal como está en Firebase.
- **Comportamiento esperado vs. Real:** Debería traducir cómo MicroStrategy identifica a un agente hacia el nombre real del Gestor en Firebase; realmente hace una llamada HTTP sin autenticación a la Realtime Database (el endpoint es público de solo lectura según las reglas del proyecto, pero igual queda un correo-usuario-contraseña implícito en la URL del proyecto) y luego aplica **tres parches de nombre codificados a mano** (líneas 66-68: `'oriana borjs'`, `'luis fuentes'`, `'jose.diaz@virtualsoft.tech'`) para casos donde MicroStrategy registra al agente con un nombre o correo distinto al de Firebase. Si la llamada HTTP falla, atrapa la excepción, imprime el error y devuelve `{}` — **todo el motor sigue corriendo con cero Gestores reconocidos**, no se detiene ni avisa de forma distinta a un `print()` en consola. Se ejecuta una sola vez, al importar el módulo (línea 74, fuera de cualquier función), no en cada corrida de `run()` — si el script vive en un proceso de larga duración, esta lista de Gestores podría quedar desactualizada.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------

### Clase `MicroStrategyConnector` (línea 80)

----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `MicroStrategyConnector.__init__(self)` (línea 81)
- **Firma / Parámetros de entrada:** `(self)`.
- **Salida / Retorno:** `None`; inicializa `auth_token`, `session_cookies`, `project_id` (desde `MSTR_PROJECT_ID`).
- **Comportamiento esperado vs. Real:** Constructor simple, sin sorpresas.
- **Nivel de Relevancia:** Secundaria.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `MicroStrategyConnector.authenticate(self)` (línea 86)
- **Firma / Parámetros de entrada:** `(self)`.
- **Salida / Retorno:** `bool`; `True` si obtuvo `auth_token`.
- **Comportamiento esperado vs. Real:** Debería autenticar contra la API REST de MicroStrategy; realmente lee usuario/contraseña de variables de entorno (`MSTR_USERNAME`/`MSTR_PASSWORD`, nunca codificadas en el archivo — correcto) y, si falta configuración, **no falla, solo imprime un aviso y devuelve `False`**, dejando que el resto del script siga ejecutándose con datos vacíos. Si `MSTR_BASE_URL` no está configurada, el salto es silencioso (ni siquiera es un aviso de seguridad, solo informativo). Descubre automáticamente `project_id` llamando a `discover_project_id()` cuando falta.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `MicroStrategyConnector.discover_project_id(self)` (línea 117)
- **Firma / Parámetros de entrada:** `(self)`.
- **Salida / Retorno:** `None`; muta `self.project_id`.
- **Comportamiento esperado vs. Real:** Busca, entre los proyectos visibles con el token actual, uno cuyo nombre coincida (sin distinguir mayúsculas) con `MSTR_PROJECT_NAME`; si no encuentra ninguno, solo imprime un mensaje — `self.project_id` queda `None` y las llamadas posteriores que lo necesitan simplemente no se ejecutan (ver `fetch_retiros_data`).
- **Nivel de Relevancia:** Secundaria.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `MicroStrategyConnector.extract_flat_data(self, node, current_row, all_rows)` (línea 133)
- **Firma / Parámetros de entrada:** `(self, node: dict, current_row: list, all_rows: list)`; recorre recursivamente el árbol JSON jerárquico que devuelve la API de reportes de MicroStrategy.
- **Salida / Retorno:** `None`; muta `all_rows` por referencia, agregando una fila plana por cada hoja del árbol.
- **Comportamiento esperado vs. Real:** Aplana un árbol de atributos anidados (cada nivel de `children` es un atributo distinto del reporte MSTR) en filas tabulares, tomando el primer valor de `formValues` de cada nodo con `element`. Es recursión clásica de "achatar un árbol"; sin memoria de índices de columna — el **orden posicional de los valores dentro de cada fila depende enteramente del orden en que MicroStrategy anida los atributos en el reporte**, no de un nombre de columna. Esto hace que `fetch_retiros_data()` (ver abajo) dependa de índices numéricos fijos (`row[2]`, `row[4]`, `row[6]`...) que se romperían en silencio si alguien reordena los atributos del reporte en MicroStrategy sin tocar este script.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `MicroStrategyConnector.fetch_retiros_data(self)` (línea 145)
- **Firma / Parámetros de entrada:** `(self)`.
- **Salida / Retorno:** `list[dict]`; cada elemento con `User_ID`, `Agent_ID`, `Estado` (`'aprobado'|'rechazado'|'ignorar'`, aunque `'ignorar'` nunca llega al resultado final — ver abajo), `Tiempo_Ciclo_Segundos`, `Fecha_Date`.
- **Comportamiento esperado vs. Real:** Es la función que `diagnostico-monolito.md` señala como la función crítica de este archivo. Pagina la API de MicroStrategy (hasta 500.000 filas, límite codificado), aplana cada página con `extract_flat_data()`, y por cada fila: (1) lee por **índice posicional fijo** `user_id=row[2]`, `estado_mstr=row[4]`, `fecha_cambio=row[6]`, `fecha_creacion=row[8]`, `agent_id=row[14]`, `banco=row[19]` — ningún nombre de columna, solo comentarios que documentan el mapeo (línea 198-199); (2) calcula el ciclo en segundos parseando fechas con el formato fijo `"%m/%d/%Y %I:%M:%S %p"`, y si falla el parseo, **usa `ciclo = 0` en vez de descartar la fila** (líneas 210-218) — una fila con fecha corrupta entra al resultado con tiempo de ciclo cero, no se excluye; (3) clasifica el estado: `rechazado`/`cancelado` → `"rechazado"`; `eliminado` o `activo` **con banco no vacío** → `"ignorar"`; cualquier otro caso → `"aprobado"` (el `else` es el camino por defecto — un estado de MicroStrategy no contemplado explícitamente cae en "aprobado", no en "desconocido" ni se descarta); (4) resuelve el nombre del agente contra `GESTORES_PERMITIDOS` (normalizado a minúsculas) y **descarta la fila por completo (`continue`) si el agente no está en el mapa** — un Gestor nuevo que `get_firebase_gestores()` no haya podido mapear pierde silenciosamente todos sus retiros de esa corrida; (5) el filtro final (línea 241) solo acepta `estado in ["aprobado", "rechazado"]` — las filas `"ignorar"` ya quedan fuera aquí, consistente con su nombre. Cualquier excepción por fila individual (`KeyError`, índice fuera de rango, etc.) se atrapa con `continue`, silenciosa, sin contarse ni registrarse — no hay ninguna métrica de "cuántas filas se descartaron y por qué" en todo el script.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------

### Clase `MotorOperativo` (línea 254)

----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `MotorOperativo.__init__(self)` (línea 255)
- **Firma / Parámetros de entrada:** `(self)`.
- **Salida / Retorno:** `None`; crea `self.mstr = MicroStrategyConnector()` y `self.datos_gestores = {}`.
- **Comportamiento esperado vs. Real:** Constructor simple.
- **Nivel de Relevancia:** Secundaria.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `MotorOperativo.procesar_retiros_mstr(self, retiros_data)` (línea 259)
- **Firma / Parámetros de entrada:** `(self, retiros_data: list[dict])` — la salida de `fetch_retiros_data()`.
- **Salida / Retorno:** `None`; construye `self.datos_gestores[agente][fecha] = {...}` con contadores en cero y los acumula.
- **Comportamiento esperado vs. Real:** Agrupa los retiros por Gestor y fecha, acumulando `Retiros_Aprobados`, `Retiros_Rechazados` y `Tiempo_Total_Desde_Creacion_Segundos`. **Inicializa también `Minutos_Inactividad_Total`, `Minutos_Tarde_Total`, `Dias_Tarde` y `Dias_Laborados` en cero (líneas 272-276), pero ninguna línea de esta función ni de ninguna otra en el archivo los incrementa jamás.** Quedan en cero para siempre — ver el hallazgo de `integrar_datos_firebase()` abajo, que es la causa.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `MotorOperativo.integrar_datos_firebase(self)` (línea 289)
- **Firma / Parámetros de entrada:** `(self)`.
- **Salida / Retorno:** `None`.
- **Comportamiento esperado vs. Real:** **Hallazgo confirmado, no inferido — es un `pass` literal, con un comentario propio que lo admite:** `# Todo: Integrate real firebase data for inactividad. Using 0s for now to keep the frontend clean.` (línea 290). Esta función es la única que podría llenar `Minutos_Inactividad_Total`, `Minutos_Tarde_Total`, `Dias_Tarde` y `Dias_Laborados` con datos reales de Firebase (turnos, tardanzas, inactividad ya calculados en `app.js`/`fase_2`), y hoy no hace nada. **Consecuencia verificada en `calcular_metricas_y_scores()` (ver abajo): `Prom_Minutos_Tarde`, `Porcentaje_Frecuencia_Tarde` y `Prom_Inactividad_Diaria` son matemáticamente siempre 0 en el JSON que consume el frontend hoy** — no es un valor raro ni un caso borde, es el resultado garantizado de dividir 0 entre cualquier cosa. Si el tablero operativo (`app.js`, KPIs) muestra estos campos como si tuvieran datos reales, está mostrando ceros de forma permanente y silenciosa.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `MotorOperativo.calcular_metricas_y_scores(self)` (línea 293)
- **Firma / Parámetros de entrada:** `(self)`.
- **Salida / Retorno:** `None`; agrega `Prom_Minutos_Tarde`, `Porcentaje_Frecuencia_Tarde`, `Prom_Inactividad_Diaria`, `Retiros_Procesados`, `ART_Desde_Creacion_Minutos`, `Porcentaje_Rechazos` a cada entrada `datos_gestores[agente][fecha]`.
- **Comportamiento esperado vs. Real:** Los promedios que dependen de `Dias_Laborados` usan `dl = Dias_Laborados if Dias_Laborados > 0 else 1` (línea 297) para evitar división entre cero — correcto como salvaguarda matemática, pero como `Dias_Laborados` nunca se incrementa (ver hallazgo anterior), `dl` siempre vale `1` en la práctica, no una cantidad real de días trabajados. `Porcentaje_Rechazos` tiene un error de condición confirmado: la línea 308 comprueba `if d["Retiros_Aprobados"] > 0`, pero el cálculo que sigue (línea 309) divide por `Retiros_Procesados` (aprobados + rechazados) — si un Gestor tiene **cero aprobados pero algún rechazado**, la condición es falsa y `Porcentaje_Rechazos` queda en `0`, cuando en realidad debería ser `100%` de rechazo. Es un caso borde real (un Gestor con retiros solo rechazados en un día), no hipotético.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `MotorOperativo.guardar_json(self)` (línea 313)
- **Firma / Parámetros de entrada:** `(self)`.
- **Salida / Retorno:** `None`; escribe `self.datos_gestores` en `kpi_operativos_v2.json` (ruta calculada junto al propio script, no configurable).
- **Comportamiento esperado vs. Real:** Escritura simple de JSON, sin manejo de error — si falla (permisos, disco lleno), la excepción se propaga sin atraparse, a diferencia de casi todo el resto del script, que prefiere silenciar errores y seguir.
- **Nivel de Relevancia:** Secundaria.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `MotorOperativo.run(self)` (línea 321)
- **Firma / Parámetros de entrada:** `(self)`.
- **Salida / Retorno:** `None`; orquesta `authenticate()` → `fetch_retiros_data()` → `procesar_retiros_mstr()` → `integrar_datos_firebase()` (no-op) → `calcular_metricas_y_scores()` → `guardar_json()`.
- **Comportamiento esperado vs. Real:** Punto de entrada único. Si `authenticate()` devuelve `False` (credenciales no configuradas), el flujo **sigue igual** hasta `guardar_json()` — `fetch_retiros_data()` simplemente no tendrá `auth_token` y devolverá una lista vacía (su propio guard, línea 148), y el script termina escribiendo un `kpi_operativos_v2.json` vacío o con los datos de la corrida anterior sin avisar que la extracción de MicroStrategy no ocurrió. No hay código de salida distinto de 0 en ningún escenario de fallo parcial.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------

### Notas sobre callbacks y duplicación

No aplica — es un script Python sin callbacks de UI ni temporizadores. No se encontró ninguna función duplicada.

### Conclusión del inventario

El hallazgo más importante de este inventario: **`integrar_datos_firebase()` es un `pass` vacío, y por eso `Prom_Minutos_Tarde`, `Porcentaje_Frecuencia_Tarde` y `Prom_Inactividad_Diaria` son siempre cero** en los datos que el tablero operativo consume hoy — no es un bug de cálculo, es una integración nunca terminada, admitida por el propio comentario del código. Junto con el error confirmado de `Porcentaje_Rechazos` cuando un Gestor solo tiene retiros rechazados, y la dependencia frágil de `fetch_retiros_data()` en índices posicionales fijos del reporte de MicroStrategy, estos son los tres puntos que cualquier trabajo futuro sobre KPIs operativos (sección 5 de `plan-maestro-ejecucion.md`, grupo "KPIs, analítica y gráficas") debería conocer antes de confiar en los números de `kpi_operativos_v2.json` como si fueran completos. Este archivo no tiene contraparte en `fase_2/src/` (es Python, no JavaScript) y no se propone una aquí — las funciones de `src/domain/analytics/` consumen el JSON ya producido, no reemplazan este script.
