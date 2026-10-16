const ANNOUNCEMENT_ALLOWED_TAGS = new Set([
    'p',
    'br',
    'strong',
    'em',
    'ul',
    'ol',
    'li',
    'a'
]);

const ANNOUNCEMENT_DROP_CONTENT_TAGS = new Set([
    'script',
    'style',
    'iframe',
    'object',
    'embed',
    'template',
    'noscript'
]);

const ANNOUNCEMENT_TAG_ALIASES = Object.freeze({
    b: 'strong',
    i: 'em',
    div: 'p'
});

/**
 * Escapes text for safe insertion into HTML.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHTML(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Encodes a value for use inside a quoted inline event-handler argument.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function encodeInlineHandlerArg(value) {
    return encodeURIComponent(String(value)).replace(/'/g, '%27');
}

/**
 * Validates an announcement hyperlink.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeAnnouncementHref(value) {
    if (!value) {
        return '';
    }

    const trimmed = String(value).trim();
    const normalized = trimmed.replace(/[\u0000- \u007F]+/g, '');

    if (!normalized || normalized.startsWith('//')) {
        return '';
    }

    const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/i);

    if (
        schemeMatch &&
        !['http', 'https', 'mailto'].includes(
            schemeMatch[1].toLowerCase()
        )
    ) {
        return '';
    }

    return trimmed;
}

// ---------------------------------------------------------------------------------------------------------
// HTML de comunicados (W-11, NOTA_1: rige el comportamiento de app.js, que usa el parser del navegador).
//
// Este módulo no usa el DOM: reproduce, para el subconjunto que importa en un comunicado, lo que hace el
// parser HTML del navegador (`<template>.innerHTML`) y lo que hace la serialización (`innerHTML`):
// - las entidades del texto se decodifican y al serializar solo se vuelven a escapar &, <, > y el espacio
//   de no separación (`&nbsp;` no se codifica dos veces);
// - el contenido de <script>, <style>, <iframe>, <noscript>, <template>, <object> y <embed> se descarta
//   completo (nunca queda como texto visible);
// - un "<" que no abre una etiqueta se conserva como texto;
// - <p>, <li> y </p> sin abrir siguen las reglas de cierre implícito del navegador.
// La seguridad no depende de igualar al navegador en todo: la salida solo contiene etiquetas de la lista
// blanca, un único atributo (href, validado) y texto escapado. Prueba diferencial: comparar.mjs y
// cmp-sanitizador.mjs (laboratorio).
// ---------------------------------------------------------------------------------------------------------

/** Entidades con nombre que se decodifican (las de uso real en comunicados en español). */
const NAMED_ENTITIES = Object.freeze({
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    copy: '©', reg: '®', trade: '™', euro: '€', cent: '¢', pound: '£', yen: '¥',
    sect: '§', deg: '°', plusmn: '±', middot: '·', laquo: '«', raquo: '»',
    ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', ndash: '–', mdash: '—',
    hellip: '…', bull: '•', iexcl: '¡', iquest: '¿', ordf: 'ª', ordm: 'º',
    sup1: '¹', sup2: '²', sup3: '³', frac12: '½', frac14: '¼', frac34: '¾',
    times: '×', divide: '÷',
    aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
    Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
    agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò', ugrave: 'ù',
    acirc: 'â', ecirc: 'ê', icirc: 'î', ocirc: 'ô', ucirc: 'û',
    atilde: 'ã', otilde: 'õ', auml: 'ä', euml: 'ë', iuml: 'ï', ouml: 'ö',
    uuml: 'ü', Uuml: 'Ü', ntilde: 'ñ', Ntilde: 'Ñ', ccedil: 'ç', Ccedil: 'Ç'
});

/** Entidades que el navegador también decodifica sin punto y coma. */
const LEGACY_NO_SEMICOLON = new Set(['amp', 'lt', 'gt', 'quot', 'nbsp', 'copy', 'reg']);

/** Elementos cuyo contenido es texto crudo y se descarta entero. */
const RAW_TEXT_DROPPED = new Set(['script', 'style', 'iframe', 'noscript', 'noembed', 'noframes']);
/** Elementos de texto crudo cuyo contenido queda como texto (la etiqueta se desenvuelve). */
const RAW_TEXT_KEPT = new Set(['xmp']);
/** Elementos cuyo texto es RCDATA: se decodifican entidades, pero no hay etiquetas dentro. */
const RCDATA_ELEMENTS = new Set(['textarea', 'title']);
/** Elementos vacíos (no tienen contenido ni etiqueta de cierre). */
const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]);
/** Límites de ámbito: un cierre o un cierre implícito no los atraviesa. */
const SCOPE_BOUNDARIES = new Set(['template', 'object', 'button', 'table', 'td', 'th', 'caption', 'applet', 'marquee']);
/** Etiquetas de inicio que en el modo "in template" no lo cambian (se tratan como contenido de <head>). */
const HEAD_LEVEL_TAGS = new Set(['base', 'basefont', 'bgsound', 'link', 'meta', 'noframes', 'script', 'style', 'template', 'title']);
/** Etiquetas de inicio que cierran un <p> abierto (reglas del parser del navegador). */
const CLOSES_P = new Set([
    'address', 'article', 'aside', 'blockquote', 'center', 'details', 'dialog', 'dir', 'div', 'dl', 'fieldset',
    'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li',
    'listing', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'search', 'section', 'summary', 'table', 'ul', 'dd', 'dt'
]);

/**
 * Decodifica las entidades HTML de un texto o valor de atributo.
 *
 * @param {string} text
 * @param {boolean} inAttribute en atributos, una entidad heredada sin ";" seguida de letra, número o "=" no se decodifica
 * @returns {string}
 */
function decodeEntities(text, inAttribute) {
    return text.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*)(;?)/g, (match, body, semicolon, offset, whole) => {
        if (body[0] === '#') {
            const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
            if (!Number.isFinite(code) || code === 0 || code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) return '�';
            return String.fromCodePoint(code);
        }

        if (semicolon && Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body)) return NAMED_ENTITIES[body];

        if (!semicolon && LEGACY_NO_SEMICOLON.has(body)) {
            const next = whole.charAt(offset + match.length);
            if (inAttribute && /[a-zA-Z0-9=]/.test(next)) return match;
            return NAMED_ENTITIES[body];
        }

        return match;
    });
}

/**
 * Serializa texto como lo hace `innerHTML`: &, <, > y el espacio de no separación.
 *
 * @param {string} text
 * @returns {string}
 */
function serializeText(text) {
    return text.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Serializa un valor de atributo como lo hace `innerHTML`: &, el espacio de no separación y ".
 *
 * @param {string} value
 * @returns {string}
 */
function serializeAttribute(value) {
    return value.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/"/g, '&quot;');
}

/**
 * Nodo del árbol del comunicado.
 *
 * @typedef {Object} AnnouncementNode
 * @property {'root'|'element'|'text'} type
 * @property {string} [tagName]
 * @property {Record<string, string>} [attributes]
 * @property {AnnouncementNode[]} [children]
 * @property {string} [value] texto ya decodificado
 */

/**
 * Lee los atributos de una etiqueta de inicio. Solo se conserva `href` (el primero, como el navegador).
 *
 * @param {string} raw texto entre el nombre de la etiqueta y el ">"
 * @returns {Record<string, string>}
 */
function parseAttributes(raw) {
    /** @type {Record<string, string>} */
    const attributes = {};
    const pattern = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let match;

    while ((match = pattern.exec(raw)) !== null) {
        const name = match[1].toLowerCase();
        if (name === 'href' && !('href' in attributes)) {
            const value = match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : match[4] !== undefined ? match[4] : '';
            attributes.href = decodeEntities(value, true);
        }
    }

    return attributes;
}

/**
 * Convierte un fragmento HTML en un árbol, sin DOM, siguiendo las reglas del parser del navegador que
 * afectan a un comunicado.
 *
 * @param {string} html
 * @returns {AnnouncementNode}
 */
function parseAnnouncementFragment(html) {
    /** @type {AnnouncementNode} */
    const root = { type: 'root', children: [] };
    /** @type {AnnouncementNode[]} */
    const stack = [root];
    const length = html.length;
    let index = 0;
    // `<template>.innerHTML` empieza en el modo "in template": las etiquetas de cierre se ignoran hasta la
    // primera etiqueta de inicio que pasa al modo normal ("in body").
    let inBody = false;

    const current = () => stack[stack.length - 1];
    const pushText = (value) => {
        if (!value) return;
        const children = /** @type {AnnouncementNode[]} */ (current().children);
        const last = children[children.length - 1];
        if (last && last.type === 'text') last.value += value;
        else children.push({ type: 'text', value });
    };

    /**
     * Busca hacia abajo en la pila un elemento abierto sin cruzar un límite de ámbito.
     *
     * @param {(tag: string) => boolean} isTarget
     * @param {Set<string>} [extraBoundaries]
     * @returns {number} índice en la pila o -1
     */
    const findOpen = (isTarget, extraBoundaries) => {
        for (let i = stack.length - 1; i > 0; i -= 1) {
            const tag = /** @type {string} */ (stack[i].tagName);
            if (isTarget(tag)) return i;
            if (SCOPE_BOUNDARIES.has(tag) || (extraBoundaries && extraBoundaries.has(tag))) return -1;
        }
        return -1;
    };

    const closeP = () => {
        const at = findOpen((tag) => tag === 'p');
        if (at > 0) stack.length = at;
    };

    /**
     * Salta el contenido de un elemento de texto crudo hasta su etiqueta de cierre.
     *
     * @param {string} tagName
     * @param {number} from
     * @returns {{content: string, next: number}}
     */
    const readRawText = (tagName, from) => {
        const closer = new RegExp(`</${tagName}(?=[\\s/>])`, 'ig');
        closer.lastIndex = from;
        const found = closer.exec(html);
        if (!found) return { content: html.slice(from), next: length };
        const end = html.indexOf('>', found.index);
        return { content: html.slice(from, found.index), next: end < 0 ? length : end + 1 };
    };

    while (index < length) {
        const char = html[index];

        if (char !== '<') {
            const nextTag = html.indexOf('<', index);
            const end = nextTag < 0 ? length : nextTag;
            pushText(decodeEntities(html.slice(index, end), false));
            index = end;
            continue;
        }

        if (html.startsWith('<!--', index)) {
            const end = html.indexOf('-->', index + 4);
            index = end < 0 ? length : end + 3;
            continue;
        }

        const rest = html.slice(index);
        const closing = rest.match(/^<\/([a-zA-Z][^\s/>]*)[^>]*>/);

        if (closing) {
            const tag = closing[1].toLowerCase();
            index += closing[0].length;

            if (!inBody) continue;

            if (tag === 'br') {
                current().children.push({ type: 'element', tagName: 'br', attributes: {}, children: [] });
                continue;
            }

            if (tag === 'p') {
                const at = findOpen((t) => t === 'p');
                if (at > 0) stack.length = at;
                else current().children.push({ type: 'element', tagName: 'p', attributes: {}, children: [] });
                continue;
            }

            const at = findOpen((t) => t === tag);
            if (at > 0) stack.length = at;
            continue;
        }

        const opening = rest.match(/^<([a-zA-Z][^\s/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/);

        if (opening) {
            const tag = opening[1].toLowerCase();
            const attributes = parseAttributes(opening[2] || '');
            index += opening[0].length;

            if (!HEAD_LEVEL_TAGS.has(tag)) inBody = true;

            if (tag === 'a') {
                // Un <a> dentro de otro <a> cierra el primero (el navegador no anida enlaces).
                const at = findOpen((t) => t === 'a');
                if (at > 0) stack.length = at;
            }

            if (tag === 'li') {
                const at = findOpen((t) => t === 'li', new Set(['ul', 'ol']));
                if (at > 0) stack.length = at;
            }

            if (CLOSES_P.has(tag)) closeP();

            /** @type {AnnouncementNode} */
            const element = { type: 'element', tagName: tag, attributes, children: [] };
            current().children.push(element);

            if (RAW_TEXT_DROPPED.has(tag) || RAW_TEXT_KEPT.has(tag) || RCDATA_ELEMENTS.has(tag)) {
                const { content, next } = readRawText(tag, index);
                if (RAW_TEXT_KEPT.has(tag)) element.children.push({ type: 'text', value: content });
                if (RCDATA_ELEMENTS.has(tag)) element.children.push({ type: 'text', value: decodeEntities(content, false) });
                index = next;
                continue;
            }

            // "<p/>" no cierra nada en HTML: la barra final solo cuenta en los elementos vacíos.
            if (!VOID_ELEMENTS.has(tag)) stack.push(element);
            continue;
        }

        if (/^<[!?/]/.test(rest)) {
            // Comentario falso del navegador (<!x>, <?x>, </ x>): se ignora hasta el primer ">".
            const end = html.indexOf('>', index);
            index = end < 0 ? length : end + 1;
            continue;
        }

        pushText('<');
        index += 1;
    }

    return root;
}

/**
 * Sanea y serializa un nodo del árbol, recursivamente.
 *
 * @param {AnnouncementNode} sourceNode
 * @returns {string}
 */
export function appendSanitizedNode(sourceNode) {
    if (!sourceNode || typeof sourceNode !== 'object') return '';

    if (sourceNode.type === 'text') return serializeText(sourceNode.value || '');

    if (sourceNode.type === 'root') {
        return (sourceNode.children || []).map((child) => appendSanitizedNode(child)).join('');
    }

    if (sourceNode.type !== 'element') return '';

    const sourceTag = String(sourceNode.tagName || '').toLowerCase();

    if (ANNOUNCEMENT_DROP_CONTENT_TAGS.has(sourceTag)) return '';

    const cleanTag = ANNOUNCEMENT_TAG_ALIASES[sourceTag] || sourceTag;
    const children = (sourceNode.children || []).map((child) => appendSanitizedNode(child)).join('');

    if (!ANNOUNCEMENT_ALLOWED_TAGS.has(cleanTag)) return children;

    let attributes = '';

    if (cleanTag === 'a' && sourceNode.attributes) {
        const safeHref = sanitizeAnnouncementHref(sourceNode.attributes.href);
        if (safeHref) attributes = ` href="${serializeAttribute(safeHref)}"`;
    }

    if (cleanTag === 'br') return `<br${attributes}>`;

    return `<${cleanTag}${attributes}>${children}</${cleanTag}>`;
}

/**
 * Sanea el HTML de un comunicado con una lista blanca de etiquetas (p, br, strong, em, ul, ol, li, a) y un
 * solo atributo (href con http, https o mailto). Mismo resultado que la versión de app.js con el parser del
 * navegador (NOTA_1).
 *
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeAnnouncementHTML(value) {
    if (value === null || value === undefined) return '';

    return appendSanitizedNode(parseAnnouncementFragment(String(value)));
}
