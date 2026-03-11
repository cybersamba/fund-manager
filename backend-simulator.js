
const fs = require('fs');
const path = require('path');

console.log('--- BACKEND SIMULATOR INICIADO (Modo CJS) ---');
console.log('Escuchando peticiones de la App...');

let count = 0;
setInterval(() => {
    count++;
    const status = {
        lastHeartbeat: new Date().toLocaleTimeString(),
        status: 'online',
        processedItems: count
    };
    // Escribimos el estado en el public folder del proyecto Vite
    const publicPath = path.join(__dirname, 'public', 'backend-status.json');
    if (!fs.existsSync(path.dirname(publicPath))) {
        fs.mkdirSync(path.dirname(publicPath), { recursive: true });
    }
    fs.writeFileSync(publicPath, JSON.stringify(status));
    console.log(`[Backend-Pross] Latido enviado - Procesos: ${count}`);
}, 5000);
