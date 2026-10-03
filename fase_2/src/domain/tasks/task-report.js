import { EXTRA_TASK_KEY_PREFIX } from '../../utils/constants.js';

const EMPTY_REPORT_TEXT = 'El gestor no marcó ninguna tarea explícitamente durante este turno.';
const TIMELINE_MARKER = '=== BITÁCORA DE TIEMPOS ===';

/**
 * Single conversion point for task identifiers: ids arrive as numbers or as
 * decoded strings and must never be compared with weak equality.
 *
 * @param {unknown} id
 * @returns {string}
 */
export function canonicalTaskId(id) {
    return String(id);
}

/**
 * Detects the legacy fallback name "Tarea <id>" (exact pattern only).
 *
 * @param {unknown} name
 * @returns {boolean}
 */
export function isLegacyGenericTaskName(name) {
    return typeof name === 'string' && /^Tarea\s+\d+$/i.test(name.trim());
}

/**
 * Resolves the visible name of a NORMAL task. Prefers the stored name unless
 * it is the legacy "Tarea <id>" pattern (or missing), then looks the task up
 * in the catalog by canonical id. Never exposes the technical id: on failure
 * it returns a neutral text and reports through `onWarn`.
 *
 * @param {string|number} key
 * @param {{name?: string}|null|undefined} entry
 * @param {Array<Record<string, unknown>>|null} [catalog]
 * @param {(message: string, key: unknown) => void} [onWarn]
 * @returns {string}
 */
export function resolveTaskDisplayName(key, entry, catalog = null, onWarn = () => {}) {
    const rawName = entry && entry.name;

    if (rawName && !isLegacyGenericTaskName(rawName)) {
        return rawName;
    }

    if (Array.isArray(catalog) && catalog.length > 0) {
        const canonicalKey = canonicalTaskId(key);
        const match = catalog.find((task) => canonicalTaskId(task.id) === canonicalKey);

        if (match && match['Tarea']) {
            return match['Tarea'];
        }
    }

    onWarn('No se pudo resolver el nombre visible de una tarea normal; ID técnico:', key);

    return 'Tarea programada (nombre no disponible)';
}

/**
 * Builds the tasks section of a shift-closure report. The structured
 * `report.tasks` object always wins over the legacy `report.reporte` text;
 * the legacy text is only used for reports that have no `tasks`.
 *
 * @param {{tasks?: Record<string, {name?: string, status?: string, observation?: string}>, reporte?: string}|null} report
 * @param {{catalog?: Array<Record<string, unknown>>|null, onWarn?: (message: string, key: unknown) => void}} [options]
 * @returns {string}
 */
export function buildTaskReportSummaryText(report, options = {}) {
    const { catalog = null, onWarn = () => {} } = options;
    const tasks = report && report.tasks;

    if (tasks && Object.keys(tasks).length > 0) {
        let text = '';

        Object.keys(tasks).forEach((key) => {
            const entry = tasks[key];

            if (!entry) {
                return;
            }

            const isExtra = key.startsWith(EXTRA_TASK_KEY_PREFIX);
            const displayName = isExtra
                ? (entry.name || 'Tarea adicional')
                : resolveTaskDisplayName(key, entry, catalog, onWarn);
            const status = (entry.status || 'Pendiente').toString().toUpperCase();

            text += `\n[ ${status} ] - ${displayName}\nObservación: ${entry.observation || 'N/A'}\n`;
        });

        return text.trim() ? text : EMPTY_REPORT_TEXT;
    }

    if (report && report.reporte) {
        let legacyText = report.reporte;

        if (legacyText.includes(TIMELINE_MARKER)) {
            legacyText = legacyText.split(TIMELINE_MARKER)[0];
        }

        legacyText = legacyText.trim();

        if (legacyText) {
            const processedLines = [];

            for (const line of legacyText.split('\n')) {
                const match = line.match(/^\[\s*([^\]]+?)\s*\]\s*-\s*(.+)$/);

                if (match) {
                    const status = match[1];
                    let name = match[2];

                    if (isLegacyGenericTaskName(name)) {
                        const taskId = name.replace(/Tarea\s*/i, '').trim();

                        name = resolveTaskDisplayName(taskId, { name }, catalog, onWarn);
                    }

                    processedLines.push(`[ ${status} ] - ${name}`);
                } else {
                    processedLines.push(line);
                }
            }

            return processedLines.join('\n') || EMPTY_REPORT_TEXT;
        }

        return EMPTY_REPORT_TEXT;
    }

    return EMPTY_REPORT_TEXT;
}
