export const normalizeFundName = (name) => {
    if (!name) return '';
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

export const getMatchingFundKey = (navObject, searchKey) => {
    if (!navObject || !searchKey) return searchKey;
    if (navObject[searchKey] !== undefined) return searchKey;

    const normalizedSearch = normalizeFundName(searchKey);
    for (const key of Object.keys(navObject)) {
        if (normalizeFundName(key) === normalizedSearch) {
            return key;
        }
    }
    return searchKey;
};

/**
 * Calculates Money-Weighted Return (MWR) / IRR
 * @param {Array} orders - Array of { date, amount, type }
 * @param {number} currentValuation - Current value of the holdings
 * @returns {number} Annualized IRR as percentage
 */
export const calculateMWR = (orders, currentValuation) => {
    if (!orders || orders.length === 0) return 0;

    const now = new Date();
    // Cash flows: Buy is negative (money out of pocket), Sell is positive (money into pocket)
    const flows = orders.map(o => ({
        t: (now - new Date(o.date)) / (1000 * 60 * 60 * 24 * 365.25),
        amount: (o.type === 'buy' || o.type === 'deposit') ? -o.amount : (o.type === 'sell' ? o.amount : 0)
    })).filter(f => f.amount !== 0);

    // Add current valuation as a terminal positive flow
    flows.push({ t: 0, amount: currentValuation });

    // IRR Solver (Newton-Raphson)
    let r = 0.05; // 5% initial guess
    for (let i = 0; i < 30; i++) {
        let f = 0;
        let df = 0;
        for (const flow of flows) {
            // we use (1+r)^t where t is years ago (so t is positive)
            // Value_now = sum( Flow_i * (1+r)^t_i )
            // We want this to be 0? No, standard IRR is sum( Flow_i / (1+r)^t_i_from_start ) = 0
            // Let's use time from today t=0.
            // Valuation = Sum( -Invested_i * (1+r)^t_i )  where t_i is years since investment
            // Sum( Flow_i * (1+r)^t_i ) = 0  where Flow_i is signed and t_i is years until "now" (which is 0)
            
            const pow = Math.pow(1 + r, flow.t);
            f += flow.amount * pow;
            if (1 + r !== 0) {
                df += flow.amount * flow.t * Math.pow(1 + r, flow.t - 1);
            }
        }
        if (Math.abs(df) < 0.0000001) break;
        const nextR = r - f / df;
        if (Math.abs(nextR - r) < 0.00001) {
            r = nextR;
            break;
        }
        r = nextR;
    }

    return r * 100;
};

/**
 * Calculates Time-Weighted Return (TWR)
 * For a single fund, this is simply the performance of the fund's NAV.
 */
export const calculateTWR = (firstNav, currentNav) => {
    if (!firstNav || !currentNav) return 0;
    return ((currentNav / firstNav) - 1) * 100;
};

/**
 * Calculates trailing return for a fund given historical NAVs and a number of years.
 */
export const calculateTrailingReturn = (history, currentNav, years) => {
    if (!history || history.length === 0 || !currentNav) return null;

    const latestDate = new Date(history[history.length - 1][0]);
    const targetDate = new Date(latestDate);
    targetDate.setFullYear(latestDate.getFullYear() - years);
    const targetTimestamp = targetDate.getTime();

    let targetNav = null;
    let minDiff = Infinity;
    
    // Find the closest NAV within a 15-day window
    for (const [ts, nav] of history) {
        const diff = Math.abs(ts - targetTimestamp);
        if (diff < minDiff && diff < 15 * 24 * 60 * 60 * 1000) {
            minDiff = diff;
            targetNav = nav;
        }
    }

    if (!targetNav) return null;

    const returnPct = ((currentNav / targetNav) - 1);
    
    // Annualize if years > 1
    if (years > 1 && (1 + returnPct) > 0) {
        return (Math.pow(1 + returnPct, 1 / years) - 1) * 100;
    }
    
    return returnPct * 100;
};
