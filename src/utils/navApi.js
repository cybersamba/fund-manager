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

export const fetchNavHistory = async (morningstarId) => {
    // 1. Try internal backend/Netlify function endpoint
    try {
        const res = await fetch(`/api/nav?id=${encodeURIComponent(morningstarId)}`);
        const cType = res.headers.get('content-type') || '';
        if (res.ok && cType.includes('application/json')) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return data;
            }
        }
    } catch (e) {
        // Fallback to client-side
    }

    // 2. Direct Yahoo Finance fetch with CORS proxy fallback
    try {
        let symbol = ISIN_MAP[morningstarId] || morningstarId;
        if (!symbol.includes('.')) {
            try {
                const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(morningstarId)}`;
                let searchData = null;
                try {
                    const searchRes = await fetch(searchUrl);
                    searchData = await searchRes.json();
                } catch (_) {
                    const pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`;
                    const searchRes = await fetch(pUrl);
                    searchData = await searchRes.json();
                }
                if (searchData?.quotes && searchData.quotes.length > 0) {
                    symbol = searchData.quotes[0].symbol;
                }
            } catch (_) {}
        }

        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5y&interval=1d`;
        let chartData = null;

        try {
            const chartRes = await fetch(chartUrl);
            chartData = await chartRes.json();
        } catch (_) {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(chartUrl)}`;
            const chartRes = await fetch(proxyUrl);
            chartData = await chartRes.json();
        }

        const res = chartData?.chart?.result?.[0];
        if (res && res.timestamp) {
            const ts = res.timestamp;
            const closes = res.indicators.quote[0].close;
            const history = [];
            for (let i = 0; i < ts.length; i++) {
                if (closes[i] !== null && closes[i] !== undefined && !isNaN(closes[i])) {
                    history.push([ts[i] * 1000, closes[i]]);
                }
            }
            if (history.length > 0) return history;
        }
    } catch (e) {
        console.warn(`Direct/proxy fetch failed for ${morningstarId}:`, e);
    }

    throw new Error('No se encontraron datos históricos');
};

export const resolveFromIsin = async (isin) => {
    // 1. Check internal endpoint
    try {
        const res = await fetch(`/api/nav?action=resolve&isin=${encodeURIComponent(isin)}`);
        const cType = res.headers.get('content-type') || '';
        if (res.ok && cType.includes('application/json')) {
            const data = await res.json();
            if (data && data.name) return data;
        }
    } catch (_) {}

    // 2. Fallback using Yahoo search with proxy fallback
    try {
        const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(isin)}`;
        let searchData = null;
        try {
            const searchRes = await fetch(searchUrl);
            searchData = await searchRes.json();
        } catch (_) {
            const pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`;
            const searchRes = await fetch(pUrl);
            searchData = await searchRes.json();
        }
        if (searchData?.quotes && searchData.quotes.length > 0) {
            const q = searchData.quotes[0];
            return {
                name: q.longname || q.shortname || isin,
                morningstarId: isin,
                isin: isin
            };
        }
    } catch (_) {}

    return {
        name: isin,
        morningstarId: isin,
        isin: isin
    };
};
