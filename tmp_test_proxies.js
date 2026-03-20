const isin = 'ES0165242001';

const testProxy = async (proxyName, proxyUrl, target) => {
    console.log(`--- Testing ${proxyName} ---`);
    const fullUrl = `${proxyUrl}${encodeURIComponent(target)}`;
    try {
        const res = await fetch(fullUrl);
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Raw (first 100 chars): ${text.substring(0, 100)}`);
        if (text.trim().startsWith('[')) {
            console.log('Success: Received JSON Array');
        } else if (text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            if (data.contents) {
                console.log(`AllOrigins Contents (first 100): ${data.contents.substring(0, 100)}`);
            } else {
                console.log('Direct JSON object received');
            }
        }
    } catch (e) {
        console.error(`Error with ${proxyName}:`, e.message);
    }
};

const target = `https://tools.morningstar.es/es/util/autoc?q=${isin}`;

(async () => {
    await testProxy('AllOrigins', 'https://api.allorigins.win/get?url=', target);
    await testProxy('CorsProxy.io', 'https://corsproxy.io/?', target);
})();
