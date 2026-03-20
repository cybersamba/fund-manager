const PROXY = 'https://api.allorigins.win/get?url=';
const msId = '0P0001MRGY';

const testNav = async (id, suffix) => {
    const MORNINGSTAR_BASE = 'https://tools.morningstar.es/api/rest.svc/timeseries_price/t92wz0sj7c';
    const target = `${MORNINGSTAR_BASE}?id=${id}${suffix}&currencyId=EUR&idtype=Morningstar&frequency=daily&startDate=2023-01-01&outputType=COMPACTJSON`;
    const fullUrl = `${PROXY}${encodeURIComponent(target)}`;
    
    console.log(`Testing with suffix "${suffix}":`, target);
    try {
        const res = await fetch(fullUrl);
        const text = await res.text();
        const json = JSON.parse(text);
        const data = JSON.parse(json.contents);
        if (Array.isArray(data) && data.length > 0) {
            console.log(`SUCCESS! Data length: ${data.length}`);
            console.log(`First point: ${JSON.stringify(data[0])}`);
            return true;
        } else {
            console.log('FAILED: Empty array or not array');
        }
    } catch (e) {
        console.error('ERROR:', e.message);
    }
    return false;
};

(async () => {
    console.log('--- Testing 0P0001MRGY ---');
    await testNav(msId, ']2]1]');
    await testNav(msId, '');
    await testNav(msId, ']2]0]');
})();
