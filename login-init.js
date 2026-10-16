/*
 * Arranque de login.html (paso 3.4: W-29 y DE-3 = a; W-54 (c): sustituye el script en línea y login.js).
 *
 * Carga después de riskops.bundle.js y firebase-config.js. Toda la lógica de acceso está en
 * RiskOps.loginController (src/app/login-controller.js); este archivo solo conecta el entorno real:
 * Firebase Auth y Realtime Database, localStorage, el Excel de horarios y el envío a FormSubmit.
 */
(function () {
    'use strict';

    /** Lee el Excel de horarios de hoy. Devuelve null si no está disponible (el login no bloquea por eso). */
    async function loadShiftRows() {
        if (typeof XLSX === 'undefined') return null;

        var url = encodeURI('Horario/Horario 2026.xlsx') + '?t=' + Date.now();
        var response = await fetch(url);
        if (!response.ok) return null;

        var arrayBuffer = await response.arrayBuffer();
        var workbook = XLSX.read(arrayBuffer, { type: 'array' });
        var worksheet = workbook.Sheets[workbook.SheetNames[0]];

        return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    }

    /** Envía el aviso de registro pendiente a FormSubmit con un formulario POST oculto (mismo flujo que login.js). */
    function notifySupervisor(fields) {
        var form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://formsubmit.co/maria.sanchez@virtualsoft.tech';
        form.target = '_blank';

        Object.keys(fields).forEach(function (key) {
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = fields[key];
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }

    var controller = RiskOps.loginController.createLoginController({
        doc: document,
        win: window,
        auth: firebase.auth(),
        database: database,
        storage: window.localStorage,
        alert: function (message) { window.alert(message); },
        now: function () { return new Date(); },
        logger: console,
        loadShiftRows: loadShiftRows,
        notifySupervisor: notifySupervisor,
        setTimer: function (fn, ms) { return window.setTimeout(fn, ms); }
    });

    controller.init();
})();
