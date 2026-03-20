const isin = 'ES0165242001';

const testCodeTabs = async () => {
    const target = `https://tools.morningstar.es/es/util/autoc?q=${isin}`;
    const url = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`;
    console.log('Testing CodeTabs:', url);
    try {
        const res = await fetch(url);
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Raw Content (100 chars):', text.substring(0, 100));
        if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
            console.log('Success! JSON received.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
};

testCodeTabs();
