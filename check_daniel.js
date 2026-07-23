const https = require('https');

https.get('https://riskops-75637-default-rtdb.firebaseio.com/shift_reports.json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const reports = JSON.parse(data);
            console.log("=== SHIFT REPORTS FOR DANIEL OR JULY 18 ===");
            for (let id in reports) {
                const r = reports[id];
                const name = r.gestor || r.name || r.userName || '';
                const date = r.reportDate || r.startTime || r.loginTime || r.timestamp || '';
                if (name.toLowerCase().includes('daniel') || String(date).includes('2026-07-18') || String(date).includes('18/07') || String(date).includes('07/18')) {
                    console.log(`ID: ${id}`);
                    console.log(`  Gestor: ${name}`);
                    console.log(`  Report Date: ${r.reportDate}`);
                    console.log(`  Start Time: ${r.startTime}`);
                    console.log(`  End Time: ${r.endTime}`);
                    console.log(`  Login Time: ${r.loginTime}`);
                    console.log(`  Shift: ${r.shift}`);
                    console.log(`  Timeline:`, JSON.stringify(r.timeline || []));
                    console.log(`  Timestamp: ${r.timestamp}`);
                    console.log('--------------------------------------------------');
                }
            }
        } catch(e) {
            console.error(e);
        }
    });
});
