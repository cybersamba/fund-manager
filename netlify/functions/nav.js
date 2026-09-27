const ISIN_MAP = {
    'FR0000991390': '0P00002BDB.F', // La Française Trésorerie ISR R
    'FR0000989626': '0P00000LRT.F', // Groupama Trésorerie IC
    'F0GBR06OZK': '0P00002BDB.F',   // Morningstar ID
    'F0GBR04M6M': '0P00000LRT.F',   // Morningstar ID
    'F00000OWOK': 'VUSA.AS',        // S&P 500 (Vanguard)
    'F00000J6S1': 'IWDA.AS',        // MSCI World (iShares)
    'IE00BH65QK91': '0P0001G10H.F', // Vanguard Glbl Sh-Tm Bd
    'IE00B18GC888': '0P00000W42.F', // Vanguard Global Bd
    'IE00B246KL88': '0P00000W4C.F', // Vanguard 20+ Yr EUR Trs
    'IE00B03HD191': '0P00000W43.F', // Vanguard Glb Stk
    'IE0031786696': '0P00000W46.F', // Vanguard Em Mkts
    'IE00B42W4L06': '0P0000LOM9.F', // Vanguard Glb Small-Cp
    'ES0165242001': '0P0001K68L.F'  // Myinvestor S&P500
};

export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const { id, isin, action } = event.queryStringParameters || {};

    if (action === 'resolve' && isin) {
        let name = isin;
        let morningstarId = isin;
        try {
            const searchRes = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(isin)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const searchData = await searchRes.json();
            if (searchData.quotes && searchData.quotes.length > 0) {
                const q = searchData.quotes[0];
                name = q.longname || q.shortname || isin;
                morningstarId = isin;
            }
        } catch (e) {
            console.error('Resolve error:', e);
        }
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ name, morningstarId, isin })
        };
    }

    const targetId = id || isin;
    if (!targetId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing id or isin query parameter' })
        };
    }

    let symbol = ISIN_MAP[targetId] || targetId;

    if (!symbol.includes('.')) {
        try {
            const searchRes = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(targetId)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const searchData = await searchRes.json();
            if (searchData.quotes && searchData.quotes.length > 0) {
                symbol = searchData.quotes[0].symbol;
            }
        } catch (e) {
            console.error('Search error:', e);
        }
    }

    try {
        const chartRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5y&interval=1d`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const chartData = await chartRes.json();
        const res = chartData.chart?.result?.[0];

        if (!res || !res.timestamp) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'No data found' })
            };
        }

        const ts = res.timestamp;
        const closes = res.indicators.quote[0].close;
        const history = [];

        for (let i = 0; i < ts.length; i++) {
            if (closes[i] !== null && closes[i] !== undefined && !isNaN(closes[i])) {
                history.push([ts[i] * 1000, closes[i]]);
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(history)
        };
    } catch (e) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: e.message })
        };
    }
};
