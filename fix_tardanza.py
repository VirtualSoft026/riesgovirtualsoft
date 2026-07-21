import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacement_calc = """
                            // Calculate inactivity for this report
                            let inactMins = 0;
                            if (report.inactividadTotalMins !== undefined) {
                                inactMins = report.inactividadTotalMins;
                            } else if (report.timeline && report.timeline.length > 0) {
                                const now = Date.now();
                                report.timeline.forEach(ev => {
                                    if (ev.type === 'Inactividad') {
                                        let eTime = ev.end ? ev.end : now;
                                        inactMins += (eTime - ev.start) / (1000 * 60);
                                    }
                                });
                            }
                            
                            // Calculate tardanza
                            let tardMins = 0;
                            if (report.tardanzaMins !== undefined) {
                                tardMins = report.tardanzaMins;
                            } else {
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
                                                let tStr = parts.length > 1 ? parts[1].trim().replace(/\./g, '').replace(/a\\s*m/i, 'AM').replace(/p\\s*m/i, 'PM') : "00:00:00";
                                                loginDate = new Date(`${month}/${day}/${year} ${tStr}`);
                                            } else {
                                                loginDate = new Date(report.horaInicio);
                                            }
                                        }
                                    } catch(e) {}
                                }
                                
                                if (loginDate && !isNaN(loginDate.getTime()) && report.turnoProgramado) {
                                    const shiftStr = report.turnoProgramado.toLowerCase().trim();
                                    const match = shiftStr.match(/^(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)/i);
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
                                            tardMins = Math.round(diffMinutes);
                                        }
                                    }
                                }
                            }
                            
                            // Add to raw data
                            window.controlOperativoRawData[realGestor][reportDateStr].Minutos_Inactividad_Total = (window.controlOperativoRawData[realGestor][reportDateStr].Minutos_Inactividad_Total || 0) + inactMins;
                            window.controlOperativoRawData[realGestor][reportDateStr].Minutos_Tarde_Total = (window.controlOperativoRawData[realGestor][reportDateStr].Minutos_Tarde_Total || 0) + tardMins;
                            window.controlOperativoRawData[realGestor][reportDateStr].Dias_Tarde = (window.controlOperativoRawData[realGestor][reportDateStr].Dias_Tarde || 0) + (tardMins > 0 ? 1 : 0);
                            window.controlOperativoRawData[realGestor][reportDateStr].Dias_Laborados = 1; // Un turno reportado = 1 día laborado
"""

js = re.sub(
    r"// Calculate inactivity for this report\s*let inactMins = 0;.*?window\.controlOperativoRawData\[realGestor\]\[reportDateStr\]\.Dias_Laborados = 1; // Un turno reportado = 1 d.a laborado",
    replacement_calc.strip(),
    js,
    flags=re.DOTALL
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
