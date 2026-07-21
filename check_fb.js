const admin = require('firebase-admin');
const serviceAccount = require('./backend_service_account.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://riskops-75637-default-rtdb.firebaseio.com'
});
admin.database().ref('shift_reports').limitToLast(10).once('value').then(s => {
    console.log(JSON.stringify(s.val(), null, 2));
    process.exit(0);
});
