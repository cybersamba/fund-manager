const PROXY = 'https://api.allorigins.win/get?url=';
const isin = 'ES0165242001';

const resolveFromIsin = async (isin) => {
    const universes = [
        'FOALL$$ALL', 'ETALL$$ALL', 'E0WWE$$ALL', 
        'FOFRA$$FXP', 'SAGBR$$ALL', 'FCIND$$ALL', 'CEEXG$XLON'
    ].join('|');
    
    const dataPoints = [
        'Name', 'SecId', 'Isin', 'Universe', 'PriceCurrency', 
        'ClosePrice', 'ClosePriceDate', 'CategoryName'
    ].join(',');

    const screenerUrl = `https://lt.morningstar.com/api/rest.svc/klr5zyak8x/security/screener?outputType=json&version=1&page=1&pageSize=5&securityDataPoints=${dataPoints}&term=${isin}&universeIds=${universes}`;
    
    console.log('Testing Screener URL:', screenerUrl);
    
    try {
        const res = await fetch(`${PROXY}${encodeURIComponent(screenerUrl)}`);
        const proxyData = await res.json();
        const data = JSON.parse(proxyData.contents);
        console.log('Screener Results:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Screener Error:', e);
    }
    
    const autocompleteUrl = `https://tools.morningstar.es/es/util/autoc?q=${isin}&universeIds=FOALL%24%24ALL|ETALL%24%24ALL|E0WWE%24%24ALL`;
    console.log('Testing Autocomplete URL:', autocompleteUrl);
    try {
        const res = await fetch(`${PROXY}${encodeURIComponent(autocompleteUrl)}`);
        const proxyData = await res.json();
        const results = JSON.parse(proxyData.contents);
        console.log('Autocomplete Results:', JSON.stringify(results, null, 2));
    } catch (e) {
        console.error('Autocomplete Error:', e);
    }
};

resolveFromIsin(isin);
