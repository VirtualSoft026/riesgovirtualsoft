const XLSX = require('xlsx');
const wb = XLSX.readFile('Horario/Horario 2026.xlsx');
const firstSheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1, defval: ""});

function formatExcelDate(serial) {
    if(!serial || isNaN(serial)) return "";
    const epochUTC = Date.UTC(1899, 11, 30);
    const d = new Date(epochUTC + serial * 86400000);
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`;
}

let allScheduleBlocks = [];
if (rows && rows.length > 2) {
    for(let rIdx = 0; rIdx < rows.length; rIdx++) {
        const testRow = rows[rIdx];
        if (!testRow || testRow.length < 2) continue;
        
        if (formatExcelDate(testRow[1]) !== "") {
            const nextR = rows[rIdx+1];
            if (nextR && nextR.length > 1 && (nextR[1] === 'Lunes' || nextR[1] === 'Martes')) {
                let firstDate = formatExcelDate(testRow[1]);
                let lastDate = firstDate;
                for(let c = 1; c < testRow.length; c++) {
                    if(formatExcelDate(testRow[c])) lastDate = formatExcelDate(testRow[c]);
                }
                
                allScheduleBlocks.push({
                    startRow: rIdx,
                    label: `Semana del ${firstDate} al ${lastDate}`
                });
                rIdx++; // Saltar la fila de días
            }
        }
    }
}
console.log(allScheduleBlocks);
