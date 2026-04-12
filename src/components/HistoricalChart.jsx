import React, { useMemo, useState } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getMatchingFundKey } from '../utils/helpers';

export default function HistoricalChart({ orders, historicalNavs, isPrivacyMode, currency, formatCurrency, seamless = false }) {
    const [period, setPeriod] = useState('ALL');
    const [benchmark, setBenchmark] = useState('7%');

    const periods = [
        { id: '1W', label: '1S', days: 7 },
        { id: '1M', label: '1M', days: 30 },
        { id: '3M', label: '3M', days: 90 },
        { id: '6M', label: '6M', days: 180 },
        { id: '1Y', label: '1A', days: 365 },
        { id: 'ALL', label: 'MAX', days: null }
    ];

    const benchmarkOptions = [
        { id: '7%', label: 'Hurdle 7% CAGR' },
        { id: 'S&P 500 (Vanguard)', label: 'S&P 500 Index' },
        { id: 'MSCI World (iShares)', label: 'MSCI World Index' }
    ];

    const chartData = useMemo(() => {
        if (!orders || orders.length === 0 || !historicalNavs || Object.keys(historicalNavs).length === 0) return [];

        const hasNavData = Object.values(historicalNavs).some(navArray => navArray && navArray.length > 0);
        if (!hasNavData) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sortedOrders = [...orders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const absoluteFirstDate = new Date(sortedOrders[0].date);
        absoluteFirstDate.setHours(0, 0, 0, 0);

        let startDate;
        const selectedPeriod = periods.find(p => p.id === period);
        if (selectedPeriod && selectedPeriod.days) {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - selectedPeriod.days);
        } else {
            startDate = absoluteFirstDate;
        }
        startDate.setHours(0, 0, 0, 0);

        // Prepare NAV map for O(1) daily lookup
        const navMap = {};
        Object.keys(historicalNavs).forEach(fund => {
            navMap[fund] = {};
            if (historicalNavs[fund]) {
                historicalNavs[fund].forEach(([ts, nav]) => {
                    const d = new Date(ts);
                    d.setHours(0, 0, 0, 0);
                    navMap[fund][d.getTime()] = nav;
                });
            }
        });

        const getNavForDate = (fund, targetTime) => {
            const matchKey = getMatchingFundKey(navMap, fund);
            if (!navMap[matchKey]) return 0;
            if (navMap[matchKey][targetTime]) return navMap[matchKey][targetTime];

            // Quick LOCF
            for (let i = 1; i <= 14; i++) {
                const pastTime = targetTime - (i * 24 * 60 * 60 * 1000);
                if (navMap[matchKey][pastTime]) return navMap[matchKey][pastTime];
            }
            return 0;
        };

        const dataPoints = [];
        let currentDate = new Date(absoluteFirstDate);
        
        // CUMULATIVE STATE
        const currentHoldings = {}; 
        let benchmarkValue = 0;
        let orderIndex = 0;

        while (currentDate <= today) {
            const time = currentDate.getTime();

            // 1. Update holdings with orders from TODAY
            while (orderIndex < sortedOrders.length && new Date(sortedOrders[orderIndex].date).setHours(0,0,0,0) <= time) {
                const order = sortedOrders[orderIndex];
                const name = order.fundName;
                if (!currentHoldings[name]) currentHoldings[name] = { shares: 0, invested: 0, deposits: [] };

                let s = order.shares || (order.nav > 0 ? order.amount / order.nav : 0);
                if (order.type === 'buy') {
                    currentHoldings[name].shares += s;
                    currentHoldings[name].invested += order.amount;
                    benchmarkValue += order.amount;
                } else if (order.type === 'sell') {
                    // Approximate cost basis deduction for chart performance
                    const factor = currentHoldings[name].shares > 0 ? (s / currentHoldings[name].shares) : 0;
                    currentHoldings[name].invested -= currentHoldings[name].invested * factor;
                    currentHoldings[name].shares -= s;
                    
                    // Benchmark sell logic
                    const totalValBefore = Object.entries(currentHoldings).reduce((sum, [f, d]) => sum + (d.shares * getNavForDate(f, time)), 0);
                    if (totalValBefore > 0) benchmarkValue = benchmarkValue * (1 - (order.amount / totalValBefore));
                    else benchmarkValue -= order.amount;
                } else if (order.type === 'deposit') {
                    currentHoldings[name].invested += order.amount;
                    currentHoldings[name].deposits.push(order);
                    benchmarkValue += order.amount;
                }
                orderIndex++;
            }

            // 2. Accumulate Daily Values
            let dailyTotalValue = 0;
            let dailyTotalInvested = 0;

            Object.entries(currentHoldings).forEach(([fund, data]) => {
                dailyTotalInvested += data.invested;
                if (data.deposits.length > 0) {
                    data.deposits.forEach(dep => {
                        const maturity = new Date(new Date(dep.date).setMonth(new Date(dep.date).getMonth() + (dep.duration || 12)));
                        if (time >= maturity.getTime()) {
                            dailyTotalValue += dep.amount + (dep.amount * ((dep.interestRate || 0)/100) * ((dep.duration || 12)/12));
                        } else {
                            dailyTotalValue += dep.amount;
                        }
                    });
                } else {
                    const nav = getNavForDate(fund, time);
                    dailyTotalValue += data.shares * (nav || (data.invested / data.shares) || 0);
                }
            });

            // 3. Update Benchmark
            if (time > absoluteFirstDate.getTime()) {
                if (benchmark === '7%') {
                    benchmarkValue = benchmarkValue * Math.pow(1.07, 1/365.25);
                } else {
                    const navToday = getNavForDate(benchmark, time);
                    const navYesterday = getNavForDate(benchmark, time - 86400000);
                    if (navToday > 0 && navYesterday > 0) benchmarkValue *= (navToday / navYesterday);
                }
            }

            if (time >= startDate.getTime()) {
                dataPoints.push({
                    date: currentDate.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
                    invested: dailyTotalInvested,
                    value: dailyTotalValue,
                    benchmark: benchmarkValue
                });
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Downsample for performance if needed
        return dataPoints.length > 400 ? dataPoints.filter((_, i) => i % Math.ceil(dataPoints.length / 400) === 0) : dataPoints;
    }, [orders, historicalNavs, period, benchmark]);

    if (!historicalNavs || Object.keys(historicalNavs).length === 0 || chartData.length === 0) {
        return null;
    }

    const isPositive = chartData.length > 0 && chartData[chartData.length - 1].value >= chartData[chartData.length - 1].invested;
    const chartColor = isPositive ? '#22c55e' : '#ef4444';

    return (
        <div className={seamless ? "w-full" : "bento-card mb-8"}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4`}>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: chartColor }}></span>
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Curva de Rendimiento</h2>
                </div>
                
                <div className="flex gap-2">
                    <select 
                        className="bg-slate-50 border border-slate-200/60 text-slate-800 font-mono rounded-lg px-2 py-1 text-[10px] outline-none hover:border-slate-300 transition-colors"
                        value={benchmark}
                        onChange={(e) => setBenchmark(e.target.value)}
                        title="Comparar con..."
                    >
                        {benchmarkOptions.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                    <select 
                        className="bg-slate-50 border border-slate-200/60 text-slate-900 font-mono rounded-lg px-2 py-1 text-[10px] outline-none"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                </div>
            </div>

            <div className={`${seamless ? 'h-[200px] md:h-[260px]' : 'h-[350px]'} w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#cbd5e1" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#f8fafc" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#94a3b8"
                            fontSize={12}
                            tickMargin={10}
                            minTickGap={40}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            fontSize={11}
                            tickFormatter={(val) => isPrivacyMode ? 'XXXX' : (currency === 'EUR' ? `${val.toLocaleString('es-ES', { maximumFractionDigits: 0 })}` : `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`)}
                            width={50}
                            domain={['auto', 'auto']}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                            formatter={(value, name) => [formatCurrency(value), name]}
                            labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '10px' }} iconType="circle" />
                        <Area
                            type="monotone"
                            dataKey="invested"
                            name="Capital Aportado"
                            stroke="#cbd5e1"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorInvested)"
                            isAnimationActive={false}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            name="Valor Cartera"
                            stroke={chartColor}
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="benchmark"
                            name={`Benchmark (${benchmark})`}
                            stroke="#f59e0b"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            dot={false}
                            isAnimationActive={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

