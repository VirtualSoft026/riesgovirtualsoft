const testDates = [
    "18/7/2026, 8:15:00 a. m.",
    "18/7/2026, 8:15:00",
    "7/18/2026, 8:15:00 AM"
];

for (const horaInicio of testDates) {
    let loginDate = null;
    try {
        let parts = horaInicio.split(',');
        if (parts.length > 0) {
            let dParts = parts[0].trim().split('/');
            if (dParts.length === 3) {
                let day = parseInt(dParts[0]);
                let month = parseInt(dParts[1]);
                let year = parseInt(dParts[2]);
                if (month > 12) { let t = day; day = month; month = t; }
                let tStr = parts.length > 1 ? parts[1].trim().replace(/\./g, '').replace(/a\s*m/i, 'AM').replace(/p\s*m/i, 'PM') : "00:00:00";
                console.log(`tStr: ${tStr}`);
                loginDate = new Date(`${month}/${day}/${year} ${tStr}`);
            } else {
                loginDate = new Date(horaInicio);
            }
        }
    } catch(e) {
        console.error(e);
    }
    console.log(`${horaInicio} -> ${loginDate}`);
}
