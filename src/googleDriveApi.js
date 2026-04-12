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
    // 3. Subimos el contenido inicial como un JSON vacío
    await saveDataToDrive(accessToken, newFileId, [], {});

    return newFileId;
};

export const fetchDataFromDrive = async (accessToken, fileId) => {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: getHeaders(accessToken)
    });
    
    if (res.status === 401) {
        throw new Error("AUTH_EXPIRED");
    }

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Error de Drive (${res.status}): ${errText}`);
    }

    const text = await res.text();
    const trimmedText = text ? text.trim() : "";
    
    if (!trimmedText) {
        return { orders: [], fundConfigs: {} };
    }

    try {
        const data = JSON.parse(trimmedText);
        
        // Validación de integridad mínima
        if (typeof data !== 'object') {
            throw new Error("El formato del archivo en Drive no es válido.");
        }

        // Compatibilidad hacia atrás: si los datos son un array, son solo órdenes (Legacy v1)
        if (Array.isArray(data)) {
            return { orders: data, fundConfigs: {} };
        }

        return {
            orders: Array.isArray(data.orders) ? data.orders : [],
            fundConfigs: data.fundConfigs || {}
        };
    } catch(e) {
        console.error("Fallo crítico al parsear datos de Drive:", e);
        // IMPORTANTE: Lanzamos el error para que la App NO intente sobrescribir el archivo dañado con un [] vacío
        throw new Error("CORRUPTED_DATA_DETECTED: No se pudo leer el archivo de Drive de forma segura.");
    }
};

export const saveDataToDrive = async (accessToken, fileId, orders, fundConfigs) => {
    const payload = {
        orders,
        fundConfigs,
        updatedAt: new Date().toISOString(),
        version: '2.0'
    };
    
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
            ...getHeaders(accessToken),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload, null, 2)
    });
    
    if (!res.ok) {
        const errText = await res.text();
        throw new Error("Hubo un error al guardar los datos en Drive: " + errText);
    }
    return true;
};
