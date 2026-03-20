
const MORNINGSTAR_BASE = 'https://tools.morningstar.es/api/rest.svc/timeseries_price/t92wz0sj7c';

export const fetchNavHistory = async (morningstarId) => {
    const proxies = [
        'https://api.allorigins.win/get?url=',
        'https://api.codetabs.com/v1/proxy?quest='
    ];
    
    // Different Morningstar ID suffixes for different asset types
    const suffixes = [']2]1]', '', ']2]0]'];

    for (const proxyBase of proxies) {
        for (const suffix of suffixes) {
            try {
                const target = `${MORNINGSTAR_BASE}?id=${morningstarId}${suffix}&currencyId=EUR&idtype=Morningstar&frequency=daily&startDate=2020-01-01&outputType=COMPACTJSON`;
                const fullUrl = `${proxyBase}${encodeURIComponent(target)}`;
                
                const res = await fetch(fullUrl);
                if (!res.ok) continue;

                const text = await res.text();
                let data;
                
                if (proxyBase.includes('allorigins')) {
                    const outer = JSON.parse(text);
                    data = JSON.parse(outer.contents);
                } else {
                    data = JSON.parse(text);
                }

                if (Array.isArray(data) && data.length > 0) {
                    return data;
                }
            } catch (e) {
                console.warn(`NAV fetch failed for ${morningstarId}${suffix} via ${proxyBase}`);
            }
        }
    }
    throw new Error('No se encontraron datos históricos');
};

export const resolveFromIsin = async (isin) => {
    const proxies = [
        'https://api.allorigins.win/get?url=',
        'https://api.codetabs.com/v1/proxy?quest='
    ];

    const targets = [
        `https://lt.morningstar.com/api/rest.svc/klr5zyak8x/security/screener?outputType=json&version=1&page=1&pageSize=5&securityDataPoints=Name,SecId,Isin,Universe&term=${isin}&universeIds=FOALL$$ALL|ETALL$$ALL|E0WWE$$ALL|SAGBR$$ALL`,
        `https://tools.morningstar.es/es/util/autoc?q=${isin}&universeIds=FOALL%24%24ALL|ETALL%24%24ALL|E0WWE%24%24ALL`,
        `https://tools.morningstar.co.uk/uk/util/autoc?q=${isin}&universeIds=FOALL%24%24ALL`
    ];

    for (const proxyBase of proxies) {
        for (const target of targets) {
            try {
                const fullUrl = `${proxyBase}${encodeURIComponent(target)}`;
                const res = await fetch(fullUrl);
                if (!res.ok) continue;

                const text = await res.text();
                let data;
                
                if (proxyBase.includes('allorigins')) {
                    const outer = JSON.parse(text);
                    data = JSON.parse(outer.contents);
                } else {
                    data = JSON.parse(text);
                }

                if (!data) continue;

                // Handle Screener format (rows)
                if (data.rows && data.rows.length > 0) {
                    const match = data.rows.find(r => r.Isin === isin || r.SecId === isin) || data.rows[0];
                    return { name: match.Name, morningstarId: match.SecId };
                }

                // Handle Autocomplete format (array)
                if (Array.isArray(data) && data.length > 0) {
                    const match = data.find(r => (r.isin && r.isin.toUpperCase() === isin) || (r.i && r.i.toUpperCase() === isin)) || data[0];
                    if (match.i) return { name: match.n, morningstarId: match.i };
                }
            } catch (e) {
                console.warn(`Lookup failed for ${target} via ${proxyBase}`);
            }
        }
    }
    
    throw new Error('No se pudo encontrar el fondo automáticamente');
};
