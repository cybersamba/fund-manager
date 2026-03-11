
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const statusFile = path.join(publicDir, 'backend-status.json');

console.log('--- BACKEND SIMULATOR INICIADO (Modo CJS Forzado) ---');
console.log(`Guardando en: ${statusFile}`);

// Asegurar que la carpeta public existe para que Vite la sirva
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('Carpeta /public creada.');
}

let count = 0;
setInterval(() => {
    count++;
    const status = {
        lastHeartbeat: new Date().toLocaleTimeString(),
        status: 'online',
        processedItems: count
    };
    try {
        fs.writeFileSync(statusFile, JSON.stringify(status));
        // console.log(`[Backend] Latido ${count} guardado.`);
    } catch (e) {
        console.error('Error escribiendo estado:', e.message);
    }
}, 2000); // Más rápido para que lo veas pronto
