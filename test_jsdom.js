const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const tiempos = fs.readFileSync('js/tiempos.js', 'utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost' });
const window = dom.window;

// Polyfill missing things
window.alert = console.log;
window.Chart = class { constructor() {} destroy() {} static register() {} };

window.firebase = {
    database: () => ({
        ref: () => ({
            once: () => Promise.resolve({ exists: () => true, val: () => ({}) }),
            on: (event, cb) => {
                if (event === 'value') {
                    cb({ val: () => ({ "123": { title: "Test", readBy: {} } }) });
                }
            },
            orderByChild: () => ({ equalTo: () => ({ once: () => Promise.resolve({ exists: () => true, val: () => ({}) }) }) })
        })
    }),
    auth: () => ({ 
        currentUser: null, 
        onAuthStateChanged: (cb) => cb({ email: 'test@test.com' })
    })
};
window.database = window.firebase.database();

const script1 = window.document.createElement('script');
script1.textContent = `
    const database = window.firebase.database();
`;
window.document.body.appendChild(script1);

const script2 = window.document.createElement('script');
script2.textContent = app;
window.document.body.appendChild(script2);

const script3 = window.document.createElement('script');
script3.textContent = tiempos;
window.document.body.appendChild(script3);

setTimeout(() => {
    console.log("Checking if currentUser is set:", window.currentUser ? window.currentUser.email : 'null');
    window.calcularIndicadores().then(() => console.log('calcularIndicadores Done')).catch(e => console.error('calcularIndicadores Error:', e));
}, 1000);
