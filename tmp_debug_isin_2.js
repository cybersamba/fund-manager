const PROXY = 'https://api.allorigins.win/get?url=';
const isin = 'IE00B42W4L06';

const resolveFromIsin = async (isin) => {
    // List of proxies to try
    const proxies = [
        'https://api.allorigins.win/get?url=',
        'https://api.codetabs.com/v1/proxy?quest='
    ];

    // List of Morningstar targets in order of "power"
    const targets = [
        // 1. Screener API (The muFunds way - global)
        `https://lt.morningstar.com/api/rest.svc/klr5zyak8x/security/screener?outputType=json&version=1&page=1&pageSize=5&securityDataPoints=Name,SecId,Isin,Universe&term=${isin}&universeIds=FOALL$$ALL|ETALL$$ALL|E0WWE$$ALL|SAGBR$$ALL`,
        // 2. Spain Autocomplete
        `https://tools.morningstar.es/es/util/autoc?q=${isin}&universeIds=FOALL%24%24ALL|ETALL%24%24ALL|E0WWE%24%24ALL`,
        // 3. UK Autocomplete
        `https://tools.morningstar.co.uk/uk/util/autoc?q=${isin}&universeIds=FOALL%24%24ALL`
    ];

    for (const proxyBase of proxies) {
        for (const target of targets) {
            try {
                const fullUrl = `${proxyBase}${encodeURIComponent(target)}`;
                console.log(`Testing: ${fullUrl}`);
                const res = await fetch(fullUrl);
                if (!res.ok) {
                    console.log(`Failed with status ${res.status}`);
                    continue;
                }

                const text = await res.text();
                let data;
                
                if (proxyBase.includes('allorigins')) {
                    const outer = JSON.parse(text);
                    data = JSON.parse(outer.contents);
                } else {
                    data = JSON.parse(text);
                }

                if (!data) {
                    console.log('No data returned');
                    continue;
                }

                // Handle Screener format (rows)
                if (data.rows && data.rows.length > 0) {
                    console.log(`Found in Screener: ${data.rows[0].Name} (${data.rows[0].SecId})`);
                    const match = data.rows.find(r => r.Isin === isin || r.SecId === isin) || data.rows[0];
                    return { name: match.Name, morningstarId: match.SecId };
                }

                // Handle Autocomplete format (array)
                if (Array.isArray(data) && data.length > 0) {
                    console.log(`Found in Autocomplete: ${data[0].n} (${data[0].i})`);
                    const match = data.find(r => (r.isin && r.isin.toUpperCase() === isin) || (r.i && r.i.toUpperCase() === isin)) || data[0];
                    if (match.i) return { name: match.n, morningstarId: match.i };
                }
            } catch (e) {
                console.warn(`Lookup failed for ${target} via ${proxyBase}: ${e.message}`);
            }
        }
    }
    
    throw new Error('No se pudo encontrar el fondo automáticamente');
};

resolveFromIsin(isin).then(console.log).catch(console.error);
