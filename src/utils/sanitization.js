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

/**
 * Escapes an HTML attribute value.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeAttributeValue(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&#039;');
}

/**
 * Escapes a tag or attribute name.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeName(value) {
    return String(value).replace(/[^a-zA-Z0-9:_-]/g, '');
}

/**
 * Represents a parsed announcement node.
 *
 * @typedef {Object} AnnouncementNode
 * @property {'root'|'element'|'text'} type
 * @property {string} [tagName]
 * @property {Record<string, string>} [attributes]
 * @property {AnnouncementNode[]} [children]
 * @property {string} [value]
 */

/**
 * Parses a limited HTML fragment without using the DOM.
 *
 * @param {string} html
 * @returns {AnnouncementNode}
 */
function parseAnnouncementFragment(html) {
    const root = {
        type: 'root',
        children: []
    };

    const stack = [root];
    const tokenPattern = /<!--[\s\S]*?-->|<\/?[a-z][^>]*>|[^<]+/gi;
    const tokens = String(html).match(tokenPattern) || [];

    for (const token of tokens) {
        if (token.startsWith('<!--')) {
            continue;
        }

        if (token.startsWith('</')) {
            const closingMatch = token.match(
                /^<\/\s*([a-z0-9-]+)/i
            );

            if (!closingMatch) {
                continue;
            }

            const closingTag = closingMatch[1].toLowerCase();

            for (
                let index = stack.length - 1;
                index > 0;
                index -= 1
            ) {
                if (stack[index].tagName === closingTag) {
                    stack.length = index;
                    break;
                }
            }

            continue;
        }

        if (!token.startsWith('<')) {
            stack[stack.length - 1].children.push({
                type: 'text',
                value: token
            });
            continue;
        }

        const openingMatch = token.match(
            /^<\s*([a-z0-9-]+)([^>]*)>/i
        );

        if (!openingMatch) {
            continue;
        }

        const tagName = openingMatch[1].toLowerCase();
        const rawAttributes = openingMatch[2] || '';
        const attributes = {};

        const attributePattern =
            /([a-z_:][a-z0-9:._-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gi;

        let attributeMatch;

        while (
            (attributeMatch = attributePattern.exec(rawAttributes)) !== null
        ) {
            const attributeName = attributeMatch[1].toLowerCase();

            if (attributeName === 'href') {
                attributes.href =
                    attributeMatch[2] ??
                    attributeMatch[3] ??
                    attributeMatch[4] ??
                    '';
            }
        }

        const element = {
            type: 'element',
            tagName,
            attributes,
            children: []
        };

        stack[stack.length - 1].children.push(element);

        const isSelfClosing =
            /\/\s*>$/.test(token) ||
            tagName === 'br' ||
            ANNOUNCEMENT_DROP_CONTENT_TAGS.has(tagName);

        if (!isSelfClosing) {
            stack.push(element);
        }
    }

    return root;
}

/**
 * Sanitizes and serializes one announcement node recursively.
 *
 * @param {AnnouncementNode} sourceNode
 * @returns {string}
 */
export function appendSanitizedNode(sourceNode) {
    if (!sourceNode || typeof sourceNode !== 'object') {
        return '';
    }

    if (sourceNode.type === 'text') {
        return escapeHTML(sourceNode.value || '');
    }

    if (sourceNode.type === 'root') {
        return (sourceNode.children || [])
            .map((child) => appendSanitizedNode(child))
            .join('');
    }

    if (sourceNode.type !== 'element') {
        return '';
    }

    const sourceTag = String(
        sourceNode.tagName || ''
    ).toLowerCase();

    if (ANNOUNCEMENT_DROP_CONTENT_TAGS.has(sourceTag)) {
        return '';
    }

    const cleanTag =
        ANNOUNCEMENT_TAG_ALIASES[sourceTag] || sourceTag;

    const children = (sourceNode.children || [])
        .map((child) => appendSanitizedNode(child))
        .join('');

    if (!ANNOUNCEMENT_ALLOWED_TAGS.has(cleanTag)) {
        return children;
    }

    let attributes = '';

    if (cleanTag === 'a' && sourceNode.attributes) {
        const safeHref = sanitizeAnnouncementHref(
            sourceNode.attributes.href
        );

        if (safeHref) {
            attributes =
                ` href="${escapeAttributeValue(safeHref)}"`;
        }
    }

    const safeTag = escapeName(cleanTag);

    if (safeTag === 'br') {
        return `<br${attributes}>`;
    }

    return `<${safeTag}${attributes}>${children}</${safeTag}>`;
}

/**
 * Sanitizes announcement HTML using an allowlist of tags and attributes.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeAnnouncementHTML(value) {
    if (value === null || value === undefined) {
        return '';
    }

    const parsedTree = parseAnnouncementFragment(String(value));

    return appendSanitizedNode(parsedTree);
}
