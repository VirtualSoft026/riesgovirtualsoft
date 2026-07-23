const https = require('https');

https.get('https://riskops-75637-default-rtdb.firebaseio.com/shift_reports.json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const reports = JSON.parse(data);
            console.log("=== SHIFT REPORTS FOR JOSUE ===");
            for (let id in reports) {
                const r = reports[id];
                const name = r.gestor || r.name || r.userName || '';
                if (name.toLowerCase().includes('josue')) {
                    console.log(`ID: ${id}`);
                    console.log(`  Gestor: ${name}`);
                    console.log(`  horaInicio: ${r.horaInicio}`);
                    console.log(`  horaFin: ${r.horaFin}`);
                    console.log(`  turnoProgramado: ${r.turnoProgramado}`);
                    console.log(`  setTrabajado: ${r.setTrabajado}`);
                    console.log(`  timestamp: ${r.timestamp} (${new Date(r.timestamp).toLocaleString('es-CO')})`);
                    console.log(`  Timeline events count: ${(r.timeline || []).length}`);
                    console.log(`  Timeline sample:`, JSON.stringify((r.timeline || []).slice(0, 5)));
                    console.log('--------------------------------------------------');
                }
            }
        } catch(e) {
            console.error(e);
        }
    });
});
