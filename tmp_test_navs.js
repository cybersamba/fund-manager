import { resolveFromIsin, fetchNavHistory } from './src/utils/navApi.js';

async function test() {
    const isin = 'FR0000989626'; // Groupama Trésorerie
    const info = await resolveFromIsin(isin);
    console.log('Info:', info);
    const navs = await fetchNavHistory(info.morningstarId);
    console.log('Last 5 NAVs:', navs.slice(-5).map(arr => [new Date(arr[0]).toLocaleDateString(), arr[1]]));
}

test();
