/**
 * Catálogo de documentos de acceso rápido y la regla que sugiere uno según el nombre de la tarea.
 *
 * La misma regla (palabras clave → documento) existe DUPLICADA en app.js: en `renderQuickDocs()`
 * (2528-2570) y en el botón de ayuda `#helpBtn` dentro de `initApp()` (3071-3110). Aquí hay una sola
 * copia, `matchQuickDoc()`, que ambos pueden usar.
 *
 * Nota (portada fiel): el original compara `'jineteo'` dos veces en el mismo `if`
 * (`includes('jineteo') || includes('jineteo')`); es redundante pero inocuo.
 */

/** Documentos listados en el panel, en el orden del original (app.js 2532-2542). */
export const QUICK_DOC_FILES = Object.freeze([
    'Instructivo de revisión de apuestas casino.pdf',
    'Instructivo de validación de GGR Casino.pdf',
    'Política Procedimiento De Aprobación De Retiros.pdf',
    'Procedimiento Identificación de jineteo.pdf',
    'Proceso de Eliminación de Cuentas - Implementaciones.pdf',
    'VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf',
    'Revisión de Eventos Deportivos.mp4',
    'Revisión de Eventos.mp4',
    'Validación SEON.mp4'
]);

/**
 * Documento sugerido para una tarea (app.js 2546-2556). El orden de las reglas importa: la primera que
 * coincide gana (p. ej. "GGR" antes que "apuesta"; "deportiv" antes que "evento").
 *
 * @param {string|null|undefined} taskName
 * @returns {string|null}
 */
export function matchQuickDoc(taskName) {
    if (!taskName) return null;

    const taskNameLower = taskName.toLowerCase();

    if (taskNameLower.includes('ggr')) return 'Instructivo de validación de GGR Casino.pdf';
    if (taskNameLower.includes('apuesta')) return 'Instructivo de revisión de apuestas casino.pdf';
    if (taskNameLower.includes('retiro')) return 'Política Procedimiento De Aprobación De Retiros.pdf';
    if (taskNameLower.includes('jineteo') || taskNameLower.includes('jineteo')) return 'Procedimiento Identificación de jineteo.pdf';
    if (taskNameLower.includes('eliminaci')) return 'Proceso de Eliminación de Cuentas - Implementaciones.pdf';
    if (taskNameLower.includes('bonos')) return 'VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf';
    if (taskNameLower.includes('deportiv')) return 'Revisión de Eventos Deportivos.mp4';
    if (taskNameLower.includes('evento')) return 'Revisión de Eventos.mp4';
    if (taskNameLower.includes('seon')) return 'Validación SEON.mp4';

    return null;
}

/**
 * Ícono y color por tipo de archivo (app.js 2561-2568, 2585-2592): PDF rojo por defecto; video azul;
 * Word azul oscuro; Excel verde.
 *
 * @param {string} file
 * @returns {{icon: string, color: string}}
 */
export function getQuickDocIconMeta(file) {
    const lower = file.toLowerCase();
    const isVideo = lower.endsWith('.mp4');
    const isWord = lower.endsWith('.docx') || lower.endsWith('.doc');
    const isExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls');

    let icon = 'bx-file-pdf';
    let color = '#FF5A5A'; // PDF red

    if (isVideo) { icon = 'bx-video'; color = '#3B82F6'; }
    else if (isWord) { icon = 'bx-file-blank'; color = '#2563EB'; } // Word blue
    else if (isExcel) { icon = 'bx-table'; color = '#10B981'; } // Excel green

    return { icon, color };
}

/**
 * Nombre visible: el archivo sin su extensión (app.js 2577, 2599).
 *
 * @param {string} file
 * @returns {string}
 */
export function stripDocExtension(file) {
    return file.replace(/\.[^/.]+$/, '');
}
