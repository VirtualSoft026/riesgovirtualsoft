const firebaseConfig = {
  apiKey: "AIzaSyBsS-jH21LLPqcX-d4fYY5Qvq2jOFXs6fc",
  authDomain: "riskops-75637.firebaseapp.com",
  projectId: "riskops-75637",
  storageBucket: "riskops-75637.firebasestorage.app",
  messagingSenderId: "874205588056",
  appId: "1:874205588056:web:95eb04536fd4586e26b82d",
  databaseURL: "https://riskops-75637-default-rtdb.firebaseio.com"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Conectar a emuladores locales si se ejecuta en localhost o 127.0.0.1 (Laboratorio Local)
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    try {
        if (typeof firebase.auth === 'function') {
            firebase.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
        }
        if (database && typeof database.useEmulator === 'function') {
            database.useEmulator('127.0.0.1', 9000);
        }
        console.log("Laboratorio Local: Conectado a emuladores Firebase Auth (:9099) y Realtime DB (:9000)");
    } catch (e) {
        console.warn("No se pudo conectar a los emuladores locales de Firebase:", e);
    }
}
