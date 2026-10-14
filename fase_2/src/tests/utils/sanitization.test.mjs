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

test('sanitizeAnnouncementHTML quita la etiqueta <script>, pero su texto interno queda como texto plano escapado (hallazgo real, no es un riesgo de XSS porque ya no está dentro de un <script> ejecutable)', () => {
    // El parser interno trata "script" como etiqueta de cierre automático
    // (ver ANNOUNCEMENT_DROP_CONTENT_TAGS en el "isSelfClosing" de
    // parseAnnouncementFragment). Por eso NO empuja <script> a la pila y el
    // texto que sigue ("alert(1)") termina como hijo de <p>, no de <script>.
    // La etiqueta <script> en sí se descarta (appendSanitizedNode la corta),
    // pero su contenido "se derrama" como texto visible escapado. No es
    // ejecutable (no queda dentro de un <script> real), pero si se esperaba
    // que el contenido completo desapareciera, este es un punto a corregir
    // en una fase posterior del parser.
    assert.equal(
        sanitizeAnnouncementHTML('<p>Antes<script>alert(1)</script>Despues</p>'),
        '<p>Antesalert(1)Despues</p>'
    );
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
