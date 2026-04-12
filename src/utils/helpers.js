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
    // IRR Solver (Newton-Raphson)
    let r = 0.05; 
    for (let i = 0; i < 50; i++) {
        let f = 0;
        let df = 0;
        for (const flow of flows) {
            const pow = Math.pow(Math.max(0.0001, 1 + r), flow.t);
            f += flow.amount * pow;
            if (Math.abs(1 + r) > 0.0001) {
                df += flow.amount * flow.t * Math.pow(Math.max(0.0001, 1 + r), flow.t - 1);
            }
        }
        
        if (Math.abs(df) < 0.0000001) break;
        
        const delta = f / df;
        const nextR = r - delta;
        
        // Safety bounds to prevent divergence
        if (nextR > 10 || nextR < -0.99) {
             r = nextR > 10 ? 10 : -0.99;
             break;
        }

        if (Math.abs(nextR - r) < 0.00001) {
            r = nextR;
            break;
        }
        r = nextR;
    }

    return r * 100;
};

// ... keep existing calculateTWR and calculateTrailingReturn ...

/**
 * Calculates monthly returns for a heatmap matrix
 */
export const calculateMonthlyReturns = (orders, historicalNavs, currentNavs, fundConfigs = {}) => {
    if (!orders || orders.length === 0 || !historicalNavs) return [];

    const now = new Date();
    const sortedOrders = [...orders].sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstOrderDate = new Date(sortedOrders[0].date);
    
    const results = [];
    let currentDate = new Date(firstOrderDate.getFullYear(), firstOrderDate.getMonth(), 1);

    while (currentDate <= now) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
        const monthEndTime = monthEnd.getTime();
        const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
        const monthStartTime = monthStart.getTime();

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

                // LOCF Search for start
                for (let i = history.length - 1; i >= 0; i--) {
                    if (history[i][0] <= startTime) { navStart = history[i][1]; break; }
                }
                // LOCF Search for end
                for (let i = history.length - 1; i >= 0; i--) {
                    if (history[i][0] <= endTime) { navEnd = history[i][1]; break; }
                }

                // Fallbacks
                if (!navStart && data.shares > 0) {
                    const firstOrder = sortedOrders.find(o => o.fundName === fund);
                    if (firstOrder) navStart = firstOrder.nav;
                }
                if (!navEnd && currentNavs) navEnd = currentNavs[matchKey] || 0;

                // Monetary Fund Protection: NAV shouldn't drop significantly due to data gaps
                const cfg = fundConfigs[fund] || {};
                const isMonetary = cfg.assetClass === 'monetario' || normalizeFundName(fund).includes('monetario') || normalizeFundName(fund).includes('tresorerie');
                
                if (isMonetary && navEnd < navStart && navStart > 0 && navEnd > 0) {
                     // Check if actually a drop or just a gap
                     navEnd = navStart; 
                }

                if (navStart > 0 && navEnd > 0) {
                    const fundRet = (navEnd / navStart) - 1;
                    const fundValueAtStart = data.shares * navStart;
                    weightedRet += fundRet * fundValueAtStart;
                    totalWeight += fundValueAtStart;
                }
            });

            return totalWeight > 0 ? weightedRet / totalWeight : 0;
        };

        let monthlyReturn = getPerformanceAt(monthStartTime, monthEndTime);

        // Initial month special handling
        if (monthlyReturn === 0) {
            const firstInMonth = sortedOrders.find(o => {
                const ts = new Date(o.date).getTime();
                return ts >= monthStartTime && ts <= monthEndTime;
            });
            if (firstInMonth) {
                monthlyReturn = getPerformanceAt(new Date(firstInMonth.date).getTime(), monthEndTime);
            }
        }

        if (Math.abs(monthlyReturn) < 0.00001) monthlyReturn = 0;
        results.push({ year, month, return: monthlyReturn * 100 });
        
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
        const val = point.value || point.nominal || 0;
        if (val > peak) peak = val;
        const drawdown = peak > 0 ? (val - peak) / peak : 0;
        if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    });
    return maxDrawdown * 100;
};

/**
 * Calculates correlation matrix between funds using improved LOCF logic
 */
export const calculateCorrelation = (historicalNavs) => {
    const keys = Object.keys(historicalNavs);
    if (keys.length < 2) return null;

    const matrix = {};
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - 180);

    keys.forEach(k1 => {
        matrix[k1] = {};
        keys.forEach(k2 => {
            if (k1 === k2) { matrix[k1][k2] = 1; return; }

            const h1 = historicalNavs[k1] || [];
            const h2 = historicalNavs[k2] || [];
            if (h1.length < 10 || h2.length < 10) { matrix[k1][k2] = null; return; }

            const returns1 = [];
            const returns2 = [];

            // Improved day-by-day alignment with LOCF
            let lastVal1 = null;
            let lastVal2 = null;

            for (let i = 0; i < 180; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                d.setHours(0,0,0,0);
                const t = d.getTime();

                // Find closest (at or before)
                const findVal = (history, targetTs) => {
                    for(let j = history.length - 1; j >= 0; j--) {
                        if (history[j][0] <= targetTs) return history[j][1];
                    }
                    return null;
                };

                const val1 = findVal(h1, t);
                const val2 = findVal(h2, t);

                if (val1 && val2 && lastVal1 && lastVal2) {
                    returns1.push((val1 / lastVal1) - 1);
                    returns2.push((val2 / lastVal2) - 1);
                }
                lastVal1 = val1;
                lastVal2 = val2;
            }

            if (returns1.length < 15) { matrix[k1][k2] = null; return; }

            const n = returns1.length;
            const sum1 = returns1.reduce((a, b) => a + b, 0);
            const sum2 = returns2.reduce((a, b) => a + b, 0);
            const sum1Sq = returns1.reduce((a, b) => a + b * b, 0);
            const sum2Sq = returns2.reduce((a, b) => a + b * b, 0);
            const pSum = returns1.map((x, i) => x * returns2[i]).reduce((a, b) => a + b, 0);

            const num = pSum - (sum1 * sum2 / n);
            const den = Math.sqrt(Math.max(0, (sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n)));
            matrix[k1][k2] = den === 0 ? 0 : num / den;
        });
    });
    return matrix;
};

/**
 * Projects future wealth (FIRE Calculator logic) - Fisher Equation implemented
 */
/**
 * Centralized function to calculate the full state of the portfolio.
 * This eliminates duplication and ensures all views use the same math.
 */
export const calculatePortfolioState = (orders, currentNavs, historicalNavs, janNavs, fundConfigs) => {
    if (!orders || orders.length === 0) return { holdings: {}, totalValuation: 0, totalInvested: 0, globalMWR: 0 };

    const regularOrders = orders.filter(o => o.type !== 'system_cash');
    const now = new Date();
    let totalRealizedProfit = 0;

    // 1. Process FIFO/Holdings
    const holdings = regularOrders.slice().reverse().reduce((acc, order) => {
        const name = order.fundName;
        if (!acc[name]) {
            acc[name] = { shares: 0, invested: 0, buyLots: [], broker: order.broker, isDeposit: order.type === 'deposit', deposits: [] };
        }

        let s = order.shares || (order.nav > 0 ? order.amount / order.nav : 0);
        if (order.type === 'buy') {
            acc[name].shares += s;
            acc[name].invested += order.amount;
            acc[name].buyLots.push({ shares: s, amount: order.amount, nav: order.nav || (s > 0 ? order.amount / s : 0) });
        } else if (order.type === 'sell') {
            let sharesToSell = s;
            let costBasisDeducted = 0;
            for (let lot of acc[name].buyLots) {
                if (sharesToSell <= 0) break;
                if (lot.shares > 0) {
                    const sellFromLot = Math.min(lot.shares, sharesToSell);
                    const ratio = sellFromLot / lot.shares;
                    costBasisDeducted += lot.amount * ratio;
                    lot.shares -= sellFromLot;
                    lot.amount -= lot.amount * ratio;
                    sharesToSell -= sellFromLot;
                }
            }
            acc[name].shares -= s;
            acc[name].invested -= costBasisDeducted;
            totalRealizedProfit += (order.amount - costBasisDeducted);
        } else if (order.type === 'deposit') {
            acc[name].invested += order.amount;
            acc[name].deposits.push(order);
        }
        return acc;
    }, {});

    // 2. Valuations and Per-Fund Metrics
    let totalValuation = 0;
    let totalInvested = 0;

    Object.entries(holdings).forEach(([name, data]) => {
        const cfg = fundConfigs[name] || {};
        totalInvested += data.invested;

        if (data.isDeposit) {
            let val = 0;
            data.deposits.forEach(dep => {
                const duration = dep.duration || 12;
                const rate = dep.interestRate !== undefined ? dep.interestRate : (dep.interestrate || 0);
                const maturityDate = new Date(new Date(dep.date).setMonth(new Date(dep.date).getMonth() + duration));
                if (now >= maturityDate) {
                    val += dep.amount + (dep.amount * (rate / 100) * (duration / 12));
                } else {
                    val += dep.amount;
                }
            });
            data.currentValuation = val;
        } else {
            const matchKey = getMatchingFundKey(currentNavs, name);
            const nav = currentNavs[matchKey] || (data.shares > 0 ? data.invested / data.shares : 0);
            data.currentValuation = data.shares * nav;
            data.nav = nav;
        }
        totalValuation += data.currentValuation;
    });

    const validOrders = regularOrders.filter(o => ['buy', 'sell', 'deposit'].includes(o.type));
    const globalMWR = calculateMWR(validOrders, totalValuation);

    // 3. Final Per-Fund Performance Metrics
    Object.entries(holdings).forEach(([name, data]) => {
        const fundOrders = validOrders.filter(o => o.fundName === name);
        if (fundOrders.length > 0) {
            const matchKey = getMatchingFundKey(janNavs, name);
            const janNav = janNavs[matchKey] || 0;
            const currentNav = data.nav || 0;
            
            data.ytdReturn = janNav > 0 ? ((currentNav / janNav) - 1) * 100 : 0;
            data.mwrAnnual = data.currentValuation > 0 ? calculateMWR(fundOrders, data.currentValuation) : 0;
            
            const firstOrder = fundOrders.sort((a,b) => new Date(a.date) - new Date(b.date))[0];
            const firstNav = firstOrder.nav || (firstOrder.shares > 0 ? firstOrder.amount / firstOrder.shares : currentNav);
            const twrTotal = calculateTWR(firstNav, currentNav);
            const years = (new Date() - new Date(firstOrder.date)) / (1000 * 60 * 60 * 24 * 365.25);
            data.twrAnnual = years > 0 ? (Math.pow(1 + twrTotal/100, 1/years) - 1) * 100 : twrTotal;
        }
    });

    return { holdings, totalValuation, totalInvested, totalRealizedProfit, globalMWR, validOrders };
};
export const projectWealth = (currentValue, monthlyContribution, annualReturnPct, years, inflationPct = 2) => {
    const months = years * 12;
    const monthlyReturn = Math.pow(1 + annualReturnPct / 100, 1/12) - 1;
    const monthlyInflation = Math.pow(1 + inflationPct / 100, 1/12) - 1;
    
    // Fisher Equation for real rate: (1 + nominal) / (1 + inflation) - 1
    const realMonthlyReturn = ((1 + monthlyReturn) / (1 + monthlyInflation)) - 1;
    
    let nominalValue = currentValue;
    let realValue = currentValue;
    const projection = [];

    for (let i = 0; i <= months; i++) {
        if (i > 0) {
            nominalValue = (nominalValue + monthlyContribution) * (1 + monthlyReturn);
            realValue = (realValue + monthlyContribution) * (1 + realMonthlyReturn);
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
