# Pasos de integración por corte

Cada archivo `<corte>.mjs` de esta carpeta exporta `STEPS` (mismo formato que `aplicar-integracion.mjs`: `{ name, exact | start+end(+endInclusive), replace() }`).
`stage.mjs` los aplica, en orden alfabético, sobre la copia de staging de `app.js` DESPUÉS de los pasos del controlador de turno. Reglas:

- Ancla única: cada `exact`/`start` debe aparecer EXACTAMENTE una vez en el texto ya integrado; si no, el laboratorio no arranca.
- No solaparse con anclas de otros cortes ni con las del controlador de turno.
- Todo lo agregado lleva la marca `[LAB-INTEGRACION]`.
- Solo se conectan fragmentos cuyo comportamiento se haya demostrado idéntico con una prueba diferencial.
