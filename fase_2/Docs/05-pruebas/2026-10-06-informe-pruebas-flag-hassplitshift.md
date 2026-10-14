# Informe de pruebas — flag `hasSplitShift` y Pausa de Turno

**Fecha:** 2026-10-06 · **Responsable:** Luis Fuentes · **Fase de `hoja-de-ruta.md`:** Fase 4 (Pruebas de Regresión)
**Comando:** `node fase_2/src/tests/e2e/split-shift-flag.unit.cjs app.js --index index.html --rules database.rules.json [--strict]`
**Log completo:** [`2026-10-06-log-pruebas-flag-hassplitshift.txt`](2026-10-06-log-pruebas-flag-hassplitshift.txt) · **Parche candidato (NO aplicado):** [`2026-10-06-parche-candidato-hassplitshift.diff`](2026-10-06-parche-candidato-hassplitshift.diff)

## 1. Resumen ejecutivo

| Requisito | `app.js` actual | Con el parche candidato |
|---|---|---|
| 1. Sin `hasSplitShift` el gestor NO ve "Pausa de Turno" | Cumple (9 pruebas) | Cumple |
| 2. Con `hasSplitShift` SÍ la ve y cambia a "En Pausa de Turno" | Cumple en el flujo normal (6 pruebas); **2 brechas** | Cumple |
| 3. El supervisor refleja entrada y salida sin dañar Almuerzo/Desayuno | Cumple (4 pruebas) | Cumple |
| Brechas de borde (B1–B4) | **4 abiertas** | 0 |
| Total | 19 pasan, 0 fallan, 4 brechas | 23/23 en modo estricto |

Regresión del parche candidato: las 21 pruebas del parche anterior y los 7 casos de extremo a extremo siguen pasando.

## 2. Cómo se probó

Se ejecuta el código REAL de `app.js` (estado de pausas, `toggleSplitShiftBreak`, `toggleLunchBreak`, `toggleBreakfastBreak`, `syncActiveSessionToFirebase`, `setupSidebar`, `updateNavigation`, la suscripción en vivo al flag y `renderActiveSessionsDashboard`) en un `vm` con DOM, `localStorage` y Firebase simulados. La cadena completa se verifica de punta a punta: acción del gestor → lo que se escribe en `active_sessions/{uid}` → lo que dibuja la vista del supervisor. Además se verifica `index.html` (el botón nace con `display:none`) y `database.rules.json`.

## 3. Hallazgos

**Lo que ya funciona (flujo normal).**
- El botón nace oculto; solo se muestra si `currentUser.hasSplitShift === true` (booleano estricto: `"true"` en texto no lo activa). Se actualiza en vivo cuando el administrador cambia el flag, sin recargar.
- Admin y Supervisor nunca ven el botón.
- Quién activa el flag: el panel "Config. Gestores" solo lo ve el rol **Admin**, y `database.rules.json` también exige Admin para escribir `users/{uid}` (el gestor no puede activárselo solo; un Supervisor tampoco). Si el equipo espera que un Supervisor lo active, hoy fallaría con "Hubo un error al guardar"; es una decisión de negocio y de reglas, no se tocó.
- Prioridad del estado enviado al supervisor: Pausa de Turno > Almuerzo > Desayuno > Inactivo > En Línea. Pausa, Almuerzo y Desayuno son mutuamente excluyentes (avisos al intentar solaparlos) y cada uno se refleja con su texto propio.

**Brechas encontradas (4).**
- **B1.** `toggleSplitShiftBreak()` no valida el flag: solo lo protege que el botón esté oculto. Quien conozca la función puede iniciar una pausa desde la consola del navegador sin tener el flag.
- **B2.** Si el administrador **revoca** el flag mientras el gestor está en pausa, la suscripción en vivo oculta el botón "Retomar Turno".
- **B3.** Consecuencia de B2: con la pausa activa, Almuerzo y Desayuno están bloqueados ("Debes volver del descanso actual primero"), así que el gestor queda atrapado en "En Pausa de Turno" hasta finalizar el turno.
- **B4.** Lo mismo ocurre al recargar la página con la pausa restaurada desde `riskOps_breakState` y el flag ya en `false`.

## 4. Parche candidato (pendiente de implementacion)

4 puntos en `app.js`, +3 líneas netas, sin tocar `index.html` ni reglas:
1. Suscripción en vivo: `(newVal || isSplitShiftBreak) ? 'flex' : 'none'`.
2. `setupSidebar`: muestra el botón si `hasSplitShift === true || isSplitShiftBreak`.
3. `updateNavigation`: misma condición.
4. `toggleSplitShiftBreak`: `if (!isSplitShiftBreak && currentUser.hasSplitShift !== true) return;` (iniciar exige el flag; retomar siempre está permitido).

Resultado con el candidato: 23/23 en modo estricto, 21/21 del parche anterior y 7/7 extremo a extremo.

## 5. Límites y próximos pasos

Pruebas con simulación; falta la prueba manual en el laboratorio local (activar `hasSplitShift` en el emulador, probar con dos ventanas, y revocar el flag en plena pausa). En el laboratorio la cuenta `admin@` tiene rol Supervisor, por lo que no ve "Config. Gestores"; el flag se edita desde el panel del emulador. Para aplicar el candidato hace falta autorización explícita sobre `app.js`; commit, despliegue y subida de la versión `?v=` de `index.html` siguen siendo del responsable.
