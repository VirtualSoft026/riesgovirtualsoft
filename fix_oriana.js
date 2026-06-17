const firebase = require('firebase/app');
require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyBsS-jH21LLPqcX-d4fYY5Qvq2jOFXs6fc",
  authDomain: "riskops-75637.firebaseapp.com",
  projectId: "riskops-75637",
  storageBucket: "riskops-75637.firebasestorage.app",
  messagingSenderId: "874205588056",
  appId: "1:874205588056:web:95eb04536fd4586e26b82d",
  databaseURL: "https://riskops-75637-default-rtdb.firebaseio.com"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

async function fixOriana() {
    try {
        const usersSnap = await db.ref('users').orderByChild('email').equalTo('oriana.borja@virtualsoft.tech').once('value');
        if (!usersSnap.exists()) {
            console.log('Oriana no encontrada');
            process.exit(1);
        }
        const uid = Object.keys(usersSnap.val())[0];
        console.log('UID Oriana:', uid);
        
        // 1. Get today's active session
        const sessionSnap = await db.ref(`active_sessions/${uid}`).once('value');
        if (sessionSnap.exists()) {
            const data = sessionSnap.val();
            console.log('Sesión actual:', data.loginTime);
            
            // Set it back to 3:00 PM today (local time)
            const d = new Date();
            d.setHours(15, 0, 0, 0); // 3:00 PM
            const trueLogin = d.toISOString();
            
            await db.ref(`active_sessions/${uid}/loginTime`).set(trueLogin);
            console.log('Sesión actualizada a:', trueLogin);
        }
        
        // 2. Fix today's shift reports just in case she has multiple
        const reportsSnap = await db.ref('shift_reports').orderByChild('gestor').equalTo('Oriana Borja').once('value');
        const dStr = new Date().toISOString().split('T')[0];
        
        if (reportsSnap.exists()) {
            reportsSnap.forEach(snap => {
                const r = snap.val();
                if (r.loginTime && r.loginTime.includes(dStr)) {
                    if (new Date(r.loginTime).getHours() > 15) {
                        const d = new Date();
                        d.setHours(15, 0, 0, 0); // 3:00 PM
                        snap.ref.update({ loginTime: d.toISOString() });
                        console.log('Shift report actualizado:', r.loginTime, '->', d.toISOString());
                    }
                }
            });
        }
        
        console.log('Listo.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fixOriana();
