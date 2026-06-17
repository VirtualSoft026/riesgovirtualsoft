const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const prefix = `
let document = {
    addEventListener: () => {},
    getElementById: (id) => ({
        value: "todos", style: {}, innerHTML: "", textContent: "", classList: { add: ()=>{}, remove: ()=>{} }, options: [],
        addEventListener: () => {}
    }),
    querySelector: () => null,
    querySelectorAll: () => []
};
let window = { 
    kpiTaskLists: {}, 
    retirosGlobalData: {}, 
    kpiUsersData: {}, 
    location: { href: "" }, 
    addEventListener: () => {},
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
};
let localStorage = { getItem: () => null, setItem: () => {} };
let firebase = {
    database: () => ({
        ref: () => ({
            once: () => Promise.resolve({ exists: () => true, val: () => ({}) }),
            orderByChild: () => ({ equalTo: () => ({ once: () => Promise.resolve({ exists: () => true, val: () => ({}) }) }) }),
            on: () => {},
            push: () => ({ set: () => Promise.resolve() })
        })
    }),
    auth: () => ({ currentUser: null, onAuthStateChanged: () => {} })
};
let database = firebase.database();
let Chart = undefined;
function alert(msg) { console.log('ALERT:', msg); }
let fetch = window.fetch;
`;
code = prefix + code + `
currentUser = {uid: '12345', role: 'Gestor'};
try {
    initComunicadosListener();
    console.log('initComunicadosListener OK');
} catch(e) {
    console.error('initComunicadosListener Error:', e);
}

try {
    calcularIndicadores().then(() => console.log('calcularIndicadores OK')).catch(console.error);
} catch(e) {
    console.error('calcularIndicadores sync Error:', e);
}
`;
fs.writeFileSync('test_app_run.js', code);
