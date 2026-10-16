import { createRunner, assert } from '../test-harness.mjs';
import {
    escapeHTML,
    encodeInlineHandlerArg,
    sanitizeAnnouncementHref,
    sanitizeAnnouncementHTML
} from '../../utils/sanitization.js';

const { test, summarize } = createRunner('sanitization.js');

test('escapeHTML escapa las cinco entidades básicas', () => {
    assert.equal(
        escapeHTML(`"it's" & <b>`),
        '&quot;it&#039;s&quot; &amp; &lt;b&gt;'
    );
});

test('escapeHTML devuelve "" para null y undefined', () => {
    assert.equal(escapeHTML(null), '');
    assert.equal(escapeHTML(undefined), '');
});

test('encodeInlineHandlerArg codifica la cadena y además escapa comillas simples', () => {
    assert.equal(encodeInlineHandlerArg("O'Brien"), 'O%27Brien');
    assert.equal(encodeInlineHandlerArg('a b'), 'a%20b');
});

test('sanitizeAnnouncementHref acepta http(s) y mailto', () => {
    assert.equal(sanitizeAnnouncementHref('https://example.com/pagina'), 'https://example.com/pagina');
    assert.equal(sanitizeAnnouncementHref('mailto:a@b.com'), 'mailto:a@b.com');
});

test('sanitizeAnnouncementHref rechaza esquemas peligrosos y rutas "//" (protocol-relative)', () => {
    assert.equal(sanitizeAnnouncementHref('javascript:alert(1)'), '');
    assert.equal(sanitizeAnnouncementHref('//evil.com/robar-sesion'), '');
});

test('sanitizeAnnouncementHref acepta una ruta relativa sin esquema', () => {
    assert.equal(sanitizeAnnouncementHref('/dashboard'), '/dashboard');
});

test('sanitizeAnnouncementHref devuelve "" con valores vacíos', () => {
    assert.equal(sanitizeAnnouncementHref(''), '');
    assert.equal(sanitizeAnnouncementHref(null), '');
});

test('sanitizeAnnouncementHTML conserva las etiquetas permitidas', () => {
    assert.equal(
        sanitizeAnnouncementHTML('<p>Hola <strong>mundo</strong></p>'),
        '<p>Hola <strong>mundo</strong></p>'
    );
});

test('sanitizeAnnouncementHTML descarta <script>, <style>, <template>, <noscript> e <iframe> CON su contenido (W-11, igual que app.js)', () => {
    assert.equal(sanitizeAnnouncementHTML('<p>Antes<script>alert(1)</script>Despues</p>'), '<p>AntesDespues</p>');
    assert.equal(sanitizeAnnouncementHTML('<style>p{}</style><p>z</p>'), '<p>z</p>');
    assert.equal(sanitizeAnnouncementHTML('<template><p>t</p></template>x'), 'x');
    assert.equal(sanitizeAnnouncementHTML('<noscript>n</noscript>y'), 'y');
    assert.equal(sanitizeAnnouncementHTML('<iframe src=x></iframe>after'), 'after');
    assert.equal(sanitizeAnnouncementHTML('<script>a</p>b</script>c'), 'c', 'un cierre dentro del script no escapa');
});

test('sanitizeAnnouncementHTML no codifica dos veces las entidades y conserva un "<" suelto (W-11)', () => {
    assert.equal(sanitizeAnnouncementHTML('<em>&nbsp;</em>'), '<em>&nbsp;</em>');
    assert.equal(sanitizeAnnouncementHTML('&lt;p&gt; &amp; &quot;'), '&lt;p&gt; &amp; "');
    assert.equal(sanitizeAnnouncementHTML('<p>a & b < c > d</p>'), '<p>a &amp; b &lt; c &gt; d</p>');
    assert.equal(sanitizeAnnouncementHTML('Ma&ntilde;ana &aacute;rea &#233; &#x1F600;'), 'Mañana área é 😀');
    assert.equal(sanitizeAnnouncementHTML('&desconocida;'), '&amp;desconocida;');
    assert.equal(sanitizeAnnouncementHTML('<a href="https://x.co/?a=1&amp;b=2">q</a>'), '<a href="https://x.co/?a=1&amp;b=2">q</a>');
});

test('sanitizeAnnouncementHTML aplica los cierres implícitos del navegador (<p>, <li>, <a> dentro de <a>)', () => {
    assert.equal(sanitizeAnnouncementHTML('<p>a<p>b'), '<p>a</p><p>b</p>');
    assert.equal(sanitizeAnnouncementHTML('<ul><li>1<li>2</ul>'), '<ul><li>1</li><li>2</li></ul>');
    assert.equal(sanitizeAnnouncementHTML('<p>x</p></p>'), '<p>x</p><p></p>');
    assert.equal(sanitizeAnnouncementHTML('<a href="https://a.co">1<a href="https://b.co">2</a>'), '<a href="https://a.co">1</a><a href="https://b.co">2</a>');
});

test('sanitizeAnnouncementHTML traduce alias de etiquetas (b→strong, i→em, div→p)', () => {
    assert.equal(
        sanitizeAnnouncementHTML('<b>fuerte</b> <i>cursiva</i> <div>bloque</div>'),
        '<strong>fuerte</strong> <em>cursiva</em> <p>bloque</p>'
    );
});

test('sanitizeAnnouncementHTML desenvuelve etiquetas no permitidas pero conserva su texto', () => {
    assert.equal(sanitizeAnnouncementHTML('<span>texto</span>'), 'texto');
});

test('sanitizeAnnouncementHTML quita un href peligroso pero conserva el enlace y su texto', () => {
    assert.equal(
        sanitizeAnnouncementHTML('<a href="javascript:alert(1)">click</a>'),
        '<a>click</a>'
    );
});

test('sanitizeAnnouncementHTML conserva un href legítimo', () => {
    assert.equal(
        sanitizeAnnouncementHTML('<a href="https://x.com">click</a>'),
        '<a href="https://x.com">click</a>'
    );
});

test('sanitizeAnnouncementHTML devuelve "" con null o undefined', () => {
    assert.equal(sanitizeAnnouncementHTML(null), '');
    assert.equal(sanitizeAnnouncementHTML(undefined), '');
});

summarize();
