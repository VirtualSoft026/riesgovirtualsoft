import codecs

with codecs.open('app.js', 'r', 'utf-8') as f:
    content = f.read()

old_code = """                        const email = report.email.toLowerCase();
                        const gestorName = window.kpiUsersData && window.kpiUsersData[email] ? window.kpiUsersData[email] : null;
                        
                        if (gestorName && window.controlOperativoRawData[gestorName]) {
                            // Ensure date object exists
                            if (!window.controlOperativoRawData[gestorName][report.date]) {"""

new_code = """                        const email = report.email.toLowerCase();
                        const gestorName = window.kpiUsersData && window.kpiUsersData[email] ? window.kpiUsersData[email] : null;
                        
                        if (gestorName) {
                            // Encontrar el nombre real en controlOperativoRawData ignorando mayúsculas y acentos
                            const rawKeys = Object.keys(window.controlOperativoRawData);
                            const searchName = gestorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            let realGestor = rawKeys.find(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === searchName);
                            
                            // Fallback: Si no coincide exacto, buscar si contiene al menos el primer nombre y apellido
                            if (!realGestor) {
                                const parts = searchName.split(' ');
                                if (parts.length >= 2) {
                                    realGestor = rawKeys.find(k => {
                                        const normK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                        return normK.includes(parts[0]) && normK.includes(parts[1]);
                                    });
                                }
                            }
                            
                            if (realGestor && window.controlOperativoRawData[realGestor]) {
                                // Ensure date object exists
                                if (!window.controlOperativoRawData[realGestor][report.date]) {"""

if old_code in content:
    content = content.replace(old_code, new_code)
    
old_code_2 = """                            // Add to raw data
                            window.controlOperativoRawData[gestorName][report.date].Minutos_Inactividad_Total = (window.controlOperativoRawData[gestorName][report.date].Minutos_Inactividad_Total || 0) + inactMins;
                        }"""

new_code_2 = """                            // Add to raw data
                            window.controlOperativoRawData[realGestor][report.date].Minutos_Inactividad_Total = (window.controlOperativoRawData[realGestor][report.date].Minutos_Inactividad_Total || 0) + inactMins;
                            }
                        }"""

if old_code_2 in content:
    content = content.replace(old_code_2, new_code_2)
    
with codecs.open('app.js', 'w', 'utf-8') as f:
    f.write(content)
