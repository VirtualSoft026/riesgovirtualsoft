const https = require('https');

https.get('https://riskops-75637-default-rtdb.firebaseio.com/shift_reports.json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const reports = JSON.parse(data);
            for (let id in reports) {
                const r = reports[id];
                if (id === '-OxqadwH42cY4jWFsyXS') {
                    console.log("=== FULL RECORD FOR -OxqadwH42cY4jWFsyXS ===");
                    console.log(JSON.stringify(r, null, 2));
                }
            }
        } catch(e) {
            console.error(e);
        }
    });
});
