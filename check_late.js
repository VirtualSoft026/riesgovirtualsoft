const https = require('https');
https.get('https://riskops-75637-default-rtdb.firebaseio.com/shift_reports.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
        const json = JSON.parse(data);
        let lateCount = 0;
        let highestTardanza = 0;
        for(let key in json) {
            let report = json[key];
            let loginDate = report.loginTime ? new Date(report.loginTime) : null;
            if (!loginDate && report.horaInicio) {
                try {
                    let parts = report.horaInicio.split(',');
                    if (parts.length > 0) {
                        let dParts = parts[0].trim().split('/');
                        if (dParts.length === 3) {
                            let day = parseInt(dParts[0]);
                            let month = parseInt(dParts[1]);
                            let year = parseInt(dParts[2]);
                            if (month > 12) { let t = day; day = month; month = t; }
                            let tStr = parts.length > 1 ? parts[1].trim().replace(/\./g, '').replace(/a\s*m/i, 'AM').replace(/p\s*m/i, 'PM') : "00:00:00";
                            loginDate = new Date(`${month}/${day}/${year} ${tStr}`);
                        } else {
                            loginDate = new Date(report.horaInicio);
                        }
                    }
                } catch(e) {}
            }
            if (loginDate && !isNaN(loginDate.getTime()) && report.turnoProgramado && report.turnoProgramado !== 'Por Asignar' && report.turnoProgramado !== 'Descansa') {
                const shiftStr = report.turnoProgramado.toLowerCase().trim();
                const match = shiftStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
                if (match) {
                    let hour = parseInt(match[1], 10);
                    let minute = match[2] ? parseInt(match[2], 10) : 0;
                    const ampm = match[3].toLowerCase();
                    if (ampm === 'pm' && hour < 12) hour += 12;
                    if (ampm === 'am' && hour === 12) hour = 0;
                    const expected = new Date(loginDate);
                    expected.setHours(hour, minute, 0, 0);
                    let diffMinutes = (loginDate - expected) / 60000;
                    if (diffMinutes < -12 * 60) {
                        expected.setDate(expected.getDate() + 1);
                        diffMinutes = (loginDate - expected) / 60000;
                    } else if (diffMinutes > 12 * 60) {
                        expected.setDate(expected.getDate() - 1);
                        diffMinutes = (loginDate - expected) / 60000;
                    }
                    if (diffMinutes > 5) {
                        lateCount++;
                        if (diffMinutes > highestTardanza) highestTardanza = diffMinutes;
                        // console.log(report.gestor, report.horaInicio, report.turnoProgramado, Math.round(diffMinutes));
                    }
                }
            }
        }
        console.log(`Found ${lateCount} late shifts. Highest tardanza: ${highestTardanza}`);
    } catch(e) {}
  });
});
