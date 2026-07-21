const https = require('https');
https.get('https://riskops-75637-default-rtdb.firebaseio.com/shift_reports.json?orderBy=%22$key%22&limitToLast=20', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));
    } catch(e) {
        console.log(data);
    }
  });
});
