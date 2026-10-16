/*
 * Aviso de navegador no compatible de index.html (paso 3.4, W-54 c): antes era un <script> en línea.
 */
(function checkBrowser() {
        var ua = navigator.userAgent;
        var isChrome = /Chrome|CriOS/i.test(ua) && !/Edg|OPR/i.test(ua);
        
        if (!isChrome) {
            document.addEventListener('DOMContentLoaded', function() {
                document.getElementById('browserBlocker').style.display = 'flex';
                var app = document.querySelector('.app-container');
                if (app) app.style.display = 'none';
                var mob = document.getElementById('mobileBlocker');
                if (mob) mob.style.display = 'none';
            });
        }
    })();
