console.log("Starting test script...");
const fs = require('fs');

global.fetch = async (url) => {
    const isAgosto = url.includes('Agosto');
    const isSeptiembre = url.includes('Septiembre');

    if (isAgosto) {
        return {
            ok: true,
            status: 200,
            arrayBuffer: async () => 'agosto_buffer'
        };
    } else if (isSeptiembre) {
        return {
            ok: true,
            status: 200,
            arrayBuffer: async () => 'sept_buffer'
        };
    } else {
        return { ok: false, status: 404 };
    }
};

global.XLSX = {
    read: (buffer) => {
        if (buffer === 'agosto_buffer') {
            return {
                SheetNames: ['Semana 1 - 5 al 11 Ago', 'Semana 2 - 12 al 18 Ago', 'Semana 3 - 19 al 25 Ago', 'Semana 4 - 24 al 30 Ago'],
                Sheets: {
                    'Semana 4 - 24 al 30 Ago': [['Agosto Data']]
                }
            };
        } else if (buffer === 'sept_buffer') {
            return {
                SheetNames: ['Semana 1 - 31 Ago al 6 Sep', 'Semana 2 - 7 al 13 Sep'],
                Sheets: {
                    'Semana 1 - 31 Ago al 6 Sep': [['Septiembre Data']]
                }
            };
        }
        return { SheetNames: [], Sheets: {} };
    },
    utils: {
        sheet_to_json: (sheet) => sheet
    }
};

console.log("Reading app.js...");
let appCode = fs.readFileSync(__dirname + '/../../app.js', 'utf8');
appCode = appCode.replace('const MONTHS_MAP = {', 'var MONTHS_MAP = {');

const vm = require('vm');
const context = {
    fetch: global.fetch,
    XLSX: global.XLSX,
    console: console,
    Date: Date,
    Set: Set,
    Math: Math,
    parseInt: parseInt,
    String: String
};
vm.createContext(context);
console.log("Evaluating app.js in VM...");
try {
    vm.runInContext(appCode + ';', context);
} catch (e) {
    console.log("Ignored VM eval error:", e.message);
}

// Add it to context if var didn't do it
if (!context.MONTHS_MAP) {
    context.MONTHS_MAP = {
    "ene": 0, "enero": 0,
    "feb": 1, "febrero": 1,
    "mar": 2, "marzo": 2,
    "abr": 3, "abril": 3,
    "may": 4, "mayo": 4,
    "jun": 5, "junio": 5,
    "jul": 6, "julio": 6,
    "ago": 7, "agosto": 7,
    "sep": 8, "set": 8, "septiembre": 8,
    "oct": 9, "octubre": 9,
    "nov": 10, "noviembre": 10,
    "dic": 11, "diciembre": 11
    };
    vm.runInContext('MONTHS_MAP = ' + JSON.stringify(context.MONTHS_MAP) + ';', context);
}

console.log("Running tests...");
async function runTests() {
    let passed = 0;
    let failed = 0;

    const assert = (condition, message) => {
        if (condition) {
            console.log(`[PASS] ${message}`);
            passed++;
        } else {
            console.error(`[FAIL] ${message}`);
            failed++;
        }
    };

    try {
        const fetchCronogramaRowsForDate = context.fetchCronogramaRowsForDate;

        const date1 = new Date(2026, 7, 30);
        let res1 = await fetchCronogramaRowsForDate(date1);
        assert(res1 && res1[0] && res1[0][0] === 'Agosto Data', "30/08/2026 charges Agosto Data");

        const date2 = new Date(2026, 7, 31);
        let res2 = await fetchCronogramaRowsForDate(date2);
        assert(res2 && res2[0] && res2[0][0] === 'Septiembre Data', "31/08/2026 charges Septiembre Data");

        const date3 = new Date(2026, 8, 1);
        let res3 = await fetchCronogramaRowsForDate(date3);
        assert(res3 && res3[0] && res3[0][0] === 'Septiembre Data', "01/09/2026 charges Septiembre Data");

        const date4 = new Date(2026, 8, 6);
        let res4 = await fetchCronogramaRowsForDate(date4);
        assert(res4 && res4[0] && res4[0][0] === 'Septiembre Data', "06/09/2026 charges Septiembre Data");

        const date5 = new Date(2026, 9, 15);
        let res5 = await fetchCronogramaRowsForDate(date5);
        assert(res5 === null, "15/10/2026 with no matching sheet returns null");

        console.log(`Tests finished. ${passed} passed, ${failed} failed.`);
        if (failed > 0) process.exit(1);
    } catch (e) {
        console.error("Test execution failed:", e);
        process.exit(1);
    }
}

runTests();
