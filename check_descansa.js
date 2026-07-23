const https = require('https');

https.get('https://riskops-75637-default-rtdb.firebaseio.com/shift_reports.json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const reports = JSON.parse(data);
            console.log("=== SHIFT REPORTS WITH 'Descansa' ===");
            for (let id in reports) {
                const r = reports[id];
                if (r.turnoProgramado === 'Descansa' || r.shift === 'Descansa') {
                    console.log(`Gestor: ${r.gestor || r.name} | Inicio: ${r.horaInicio} | Fin: ${r.horaFin} | Turno: ${r.turnoProgramado}`);
                }
            }
        } catch(e) {
            console.error(e);
        }
    });
});
