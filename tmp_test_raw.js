const isin = 'ES0165242001';

const testRaw = async () => {
    const target = `https://tools.morningstar.es/es/util/autoc?q=${isin}`;
    const rawUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;
    console.log('Testing AllOrigins RAW:', rawUrl);
    try {
        const res = await fetch(rawUrl);
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Raw Content:', text.substring(0, 200));
    } catch (e) {
        console.error('Error:', e.message);
    }
};

testRaw();
