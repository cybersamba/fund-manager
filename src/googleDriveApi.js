export const FILENAME = 'fund_manager_data.json';

const getHeaders = (accessToken) => ({
    'Authorization': `Bearer ${accessToken}`
});

export const getOrInitFileId = async (accessToken) => {
    // 1. Buscar si ya existe el archivo en la raíz del Drive
    const query = `name='${FILENAME}' and trashed=false`;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
        headers: getHeaders(accessToken)
    });
    
    if (!searchRes.ok) {
        const errText = await searchRes.text();
        throw new Error("No se pudo buscar el archivo en Drive: " + errText);
    }
    
    const searchData = await searchRes.json();
    
    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id; // El archivo ya existe
    }

    // 2. Si no existe, creamos el archivo vacío primero (solo metadatos)
    const metadata = {
        name: FILENAME,
        mimeType: 'application/json'
    };
    
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            ...getHeaders(accessToken),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
    });
    
    if (!createRes.ok) throw new Error("No se pudo crear el archivo inicial");
    
    const createData = await createRes.json();
    const newFileId = createData.id;

    // 3. Subimos el contenido inicial como un JSON vacío []
    await saveOrdersToDrive(accessToken, newFileId, []);

    return newFileId;
};

export const fetchOrdersFromDrive = async (accessToken, fileId) => {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: getHeaders(accessToken)
    });
    
    if (!res.ok) throw new Error("No se pudo leer el contenido del archivo");
    const text = await res.text();
    if (!text) return []; // Si el archivo está vacío (0 bytes) devolvemos array vacío
    try {
        const data = JSON.parse(text);
        return Array.isArray(data) ? data : [];
    } catch(e) {
        return [];
    }
};

export const saveOrdersToDrive = async (accessToken, fileId, orders) => {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
            ...getHeaders(accessToken),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orders, null, 2) // Guardar bonito
    });
    
    if (!res.ok) {
        const errText = await res.text();
        throw new Error("Hubo un error al guardar los datos en Drive: " + errText);
    }
    return true;
};
