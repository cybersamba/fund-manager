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

/**
 * Calculates monthly returns for a heatmap matrix
 */
export const calculateMonthlyReturns = (orders, historicalNavs, currentNavs) => {
    if (!orders || orders.length === 0 || !historicalNavs) return [];

    const now = new Date();
    const sortedOrders = [...orders].sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstOrderDate = new Date(sortedOrders[0].date);
    
    const results = [];
    let currentDate = new Date(firstOrderDate.getFullYear(), firstOrderDate.getMonth(), 1);

    // Keep track of shares per fund
    const fundShares = {};

    while (currentDate <= now) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Month end timestamp (last day of the month)
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
        const monthEndTime = monthEnd.getTime();
        
        // Value at start of month
        const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
        const monthStartTime = monthStart.getTime();

        // Calculate value at start and end
        const getValueAt = (timestamp) => {
            let totalVal = 0;
            const relevantOrders = sortedOrders.filter(o => new Date(o.date).getTime() <= timestamp);
            
            const holdings = relevantOrders.reduce((acc, order) => {
                if (!acc[order.fundName]) acc[order.fundName] = { shares: 0, invested: 0, lastOrderNav: 0, assetClass: '' };
                let s = order.shares || 0;
                if (!s && order.nav > 0) s = order.amount / order.nav;
                
                if (order.type === 'buy') {
                    acc[order.fundName].shares += s;
                    acc[order.fundName].lastOrderNav = order.nav;
                } else if (order.type === 'sell') {
                    acc[order.fundName].shares -= s;
                } else if (order.type === 'deposit') {
                    acc[order.fundName].invested += order.amount;
                }

                // Carry over asset class for protection logic
                if (!acc[order.fundName].assetClass) {
                    const normalized = normalizeFundName(order.fundName);
                    if (normalized.includes('tresorerie') || normalized.includes('monetario') || normalized.includes('liquidez') || normalized.includes('money market')) {
                        acc[order.fundName].assetClass = 'monetario';
                    } else if (normalized.includes('deposito')) {
                        acc[order.fundName].assetClass = 'deposito';
                    }
                }
                return acc;
            }, {});

            Object.entries(holdings).forEach(([fund, data]) => {
                if (data.shares <= 0 && data.invested <= 0) return;
                
                // Find NAV at timestamp
                const matchKey = getMatchingFundKey(historicalNavs, fund);
                const history = historicalNavs[matchKey] || [];
                let nav = 0;
                
                // 1. Try to find closest NAV before or at timestamp in history
                for (let i = history.length - 1; i >= 0; i--) {
                    if (history[i][0] <= timestamp) {
                        nav = history[i][1];
                        break;
                    }
                }
                
                // 2. Fallback: If it's a current month calculation, use currentNavs
                if (!nav && currentNavs) nav = currentNavs[matchKey] || 0;

                // 3. Fallback: Use the last known order NAV as an anchor to prevent Zeroing
                if (!nav) nav = data.lastOrderNav || 0;

                // 4. Protection: For monetary funds, don't allow it to drop significantly below order price 
                // if it's likely a data gap (monetary NAVs are generally strictly increasing)
                if (data.assetClass === 'monetario' && nav < data.lastOrderNav && nav > 0) {
                    nav = data.lastOrderNav; 
                }

                totalVal += (data.shares * nav) + data.invested;
            });
            return totalVal;
        };

        const startValue = getValueAt(monthStartTime);
        const endValue = getValueAt(monthEndTime);
        
        // Calculate TWR (Pure performance)
        // We calculate the weighted performance of each fund active at start of month
        // or during the month if started within it.
        let monthlyReturn = 0;
        
        // Group holdings at start vs end to find pure price movement
        const getPerformanceAt = (startTime, endTime) => {
            let weightedRet = 0;
            let totalWeight = 0;

            const holdings = sortedOrders.filter(o => new Date(o.date).getTime() <= startTime).reduce((acc, order) => {
                if (!acc[order.fundName]) acc[order.fundName] = { shares: 0 };
                let s = order.shares || (order.nav > 0 ? order.amount / order.nav : 0);
                if (order.type === 'buy') acc[order.fundName].shares += s;
                else if (order.type === 'sell') acc[order.fundName].shares -= s;
                return acc;
            }, {});

            Object.entries(holdings).forEach(([fund, data]) => {
                if (data.shares <= 0) return;
                
                const matchKey = getMatchingFundKey(historicalNavs, fund);
                const history = historicalNavs[matchKey] || [];
                
                let navStart = 0;
                let navEnd = 0;

                // Find Nav at Start
                for (let i = history.length - 1; i >= 0; i--) {
                    if (history[i][0] <= startTime) { navStart = history[i][1]; break; }
                }
                // Find Nav at End
                for (let i = history.length - 1; i >= 0; i--) {
                    if (history[i][0] <= endTime) { navEnd = history[i][1]; break; }
                }

                if (!navStart && data.shares > 0) {
                    // If no history yet, try looking forward to find the FIRST nav
                    const firstOrder = sortedOrders.find(o => o.fundName === fund);
                    if (firstOrder) navStart = firstOrder.nav;
                }
                if (!navEnd && currentNavs) navEnd = currentNavs[matchKey] || 0;

                if (navStart > 0 && navEnd > 0) {
                    const fundRet = (navEnd / navStart) - 1;
                    const fundValueAtStart = data.shares * navStart;
                    weightedRet += fundRet * fundValueAtStart;
                    totalWeight += fundValueAtStart;
                }
            });

            return totalWeight > 0 ? weightedRet / totalWeight : 0;
        };

        monthlyReturn = getPerformanceAt(monthStartTime, monthEndTime);

        // Special case: if mouth is just the start (no initial capital), 
        // find performance from first trade to month end
        if (monthlyReturn === 0 && startValue === 0) {
            const firstTradeInMonth = sortedOrders.find(o => {
                const ts = new Date(o.date).getTime();
                return ts >= monthStartTime && ts <= monthEndTime;
            });
            if (firstTradeInMonth) {
                monthlyReturn = getPerformanceAt(new Date(firstTradeInMonth.date).getTime(), monthEndTime);
            }
        }

        // Apply a tiny threshold (0.0001 or 0.01%) to treat near-zero values as zero
        if (Math.abs(monthlyReturn) < 0.0001) {
            monthlyReturn = 0;
        }

        results.push({ year, month, return: monthlyReturn * 100, endValue });
        
        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return results;
};

/**
 * Calculates Maximum Drawdown
 */
export const calculateMaxDrawdown = (chartData) => {
    if (!chartData || chartData.length === 0) return 0;
    
    let maxDrawdown = 0;
    let peak = -Infinity;
    
    chartData.forEach(point => {
        const val = point.value;
        if (val > peak) peak = val;
        
        const drawdown = peak > 0 ? (val - peak) / peak : 0;
        if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    });
    
    return maxDrawdown * 100;
};

/**
 * Calculates correlation matrix between funds
 */
export const calculateCorrelation = (historicalNavs) => {
    const keys = Object.keys(historicalNavs);
    if (keys.length < 2) return null;

    // We need aligned time series
    const commonDates = [];
    // Just an approximation: use the last 180 days
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - 180);

    const matrix = {};

    keys.forEach(k1 => {
        matrix[k1] = {};
        keys.forEach(k2 => {
            if (k1 === k2) {
                matrix[k1][k2] = 1;
                return;
            }

            const h1 = historicalNavs[k1] || [];
            const h2 = historicalNavs[k2] || [];
            
            // Map to dates for easy lookup
            const m1 = new Map(h1);
            const m2 = new Map(h2);

            // Calculate returns
            const returns1 = [];
            const returns2 = [];

            for (let i = 0; i < 180; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                d.setHours(0,0,0,0);
                const t = d.getTime();

                const dPrev = new Date(d);
                dPrev.setDate(d.getDate() - 1);
                const tPrev = dPrev.getTime();

                if (m1.has(t) && m1.has(tPrev) && m2.has(t) && m2.has(tPrev)) {
                    returns1.push((m1.get(t) / m1.get(tPrev)) - 1);
                    returns2.push((m2.get(t) / m2.get(tPrev)) - 1);
                }
            }

            if (returns1.length < 10) {
                matrix[k1][k2] = null;
                return;
            }

            // Pearson Correlation
            const n = returns1.length;
            const sum1 = returns1.reduce((a, b) => a + b, 0);
            const sum2 = returns2.reduce((a, b) => a + b, 0);
            const sum1Sq = returns1.reduce((a, b) => a + b * b, 0);
            const sum2Sq = returns2.reduce((a, b) => a + b * b, 0);
            const pSum = returns1.map((x, i) => x * returns2[i]).reduce((a, b) => a + b, 0);

            const num = pSum - (sum1 * sum2 / n);
            const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));

            matrix[k1][k2] = den === 0 ? 0 : num / den;
        });
    });

    return matrix;
};

/**
 * Projects future wealth (FIRE Calculator logic)
 */
export const projectWealth = (currentValue, monthlyContribution, annualReturnPct, years, inflationPct = 2) => {
    const months = years * 12;
    const monthlyReturn = Math.pow(1 + annualReturnPct / 100, 1/12) - 1;
    const monthlyInflation = Math.pow(1 + inflationPct / 100, 1/12) - 1;
    
    let nominalValue = currentValue;
    let realValue = currentValue;
    const projection = [];

    for (let i = 0; i <= months; i++) {
        if (i > 0) {
            nominalValue = (nominalValue + monthlyContribution) * (1 + monthlyReturn);
            realValue = (realValue + monthlyContribution) * (1 + monthlyReturn - monthlyInflation);
        }

        if (i % 12 === 0 || i === months) {
            projection.push({
                year: Math.floor(i / 12),
                nominal: nominalValue,
                real: realValue
            });
        }
    }

    return projection;
};
