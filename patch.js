const fs=require('fs');
let code=fs.readFileSync('app.js','utf8');
code=code.replace(/const excludedGestores = \['Sara Santamaría Foronda', 'Maria Sanchez', 'Sara', 'Maria', 'Camilo Espinosa', 'Camilo'\];/g, \"const excludedGestores = ['Sara Santamaría Foronda', 'Maria Sanchez', 'Sara', 'Maria', 'Camilo Espinosa', 'Camilo', 'Oriana Borja', 'Oriana'];\");
code=code.replace(/const excludedGestoresGlobal = \['Sara Santamaría', 'Maria Sanchez', 'Camilo Espinosa'\];/g, \"const excludedGestoresGlobal = ['Sara Santamaría', 'Maria Sanchez', 'Camilo Espinosa', 'Oriana Borja'];\");
fs.writeFileSync('app.js', code, 'utf8');
