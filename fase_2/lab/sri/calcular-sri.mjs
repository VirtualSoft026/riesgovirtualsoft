// Calcula el atributo integrity (sha384) de los scripts de CDN que aún no lo tienen (W-56).
// Uso (desde la raíz del repo):  node fase_2/lab/sri/calcular-sri.mjs
// Descarga cada URL exacta y muestra el valor listo para pegar en index.html / login.html.
// Solo lectura: no modifica ningún archivo. Si el CDN no responde, reintentar desde una red con acceso a cdn.sheetjs.com y gstatic.com.
import { createHash } from 'node:crypto';

const RECURSOS = [
    { nombre: 'xlsx 0.20.0', url: 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js' },
    { nombre: 'firebase-app 8.10.1', url: 'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js' },
    { nombre: 'firebase-auth 8.10.1', url: 'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js' },
    { nombre: 'firebase-database 8.10.1', url: 'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js' }
];

for (const r of RECURSOS) {
    try {
        const res = await fetch(r.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const hash = createHash('sha384').update(buf).digest('base64');
        console.log(`${r.nombre}\n  ${r.url}\n  integrity="sha384-${hash}" crossorigin="anonymous"  (${buf.length} bytes)`);
    } catch (e) {
        console.log(`${r.nombre}: NO DISPONIBLE (${e.message}) → ${r.url}`);
    }
}
