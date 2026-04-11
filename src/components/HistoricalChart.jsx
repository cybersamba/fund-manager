import React, { useMemo, useState } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getMatchingFundKey } from '../utils/helpers';

export default function HistoricalChart({ orders, historicalNavs, isPrivacyMode, currency, formatCurrency, seamless = false }) {
    const [period, setPeriod] = useState('ALL');

    const periods = [
        { id: '1W', label: '1S', days: 7 },
        { id: '1M', label: '1M', days: 30 },
        { id: '3M', label: '3M', days: 90 },
        { id: '6M', label: '6M', days: 180 },
        { id: '1Y', label: '1A', days: 365 },
        { id: 'ALL', label: 'MAX', days: null }
    ];

    const chartData = useMemo(() => {
        if (!orders || orders.length === 0 || !historicalNavs || Object.keys(historicalNavs).length === 0) return [];

        // Ensure we have some historical navs data
        const hasNavData = Object.values(historicalNavs).some(navArray => navArray && navArray.length > 0);
        if (!hasNavData) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate;
        const selectedPeriod = periods.find(p => p.id === period);
        
        const absoluteFirstDate = new Date(Math.min(...orders.map(o => new Date(o.date).getTime())));
        absoluteFirstDate.setHours(0, 0, 0, 0);
        
        if (selectedPeriod && selectedPeriod.days) {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - selectedPeriod.days);
        } else {
            startDate = absoluteFirstDate;
        }
        startDate.setHours(0, 0, 0, 0);

        // Pre-calculate full history to get holdings at any point
        const fundNames = Object.keys(historicalNavs);
        const navMap = {};

        fundNames.forEach(fund => {
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

            for (let i = 1; i <= 14; i++) {
                const pastTime = targetTime - (i * 24 * 60 * 60 * 1000);
                if (navMap[matchKey][pastTime]) return navMap[matchKey][pastTime];
            }
            return 0;
        };

        const dataPoints = [];
        // Start simulation from the first order to maintain true historical compounding
        let currentDate = new Date(absoluteFirstDate);

        const sortedOrders = [...orders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let benchmarkValue = 0;
        let lastTotalInvested = 0;

        while (currentDate <= today) {
            const time = currentDate.getTime();

            let totalInvested = 0;
            let totalValue = 0;

            const relevantOrders = sortedOrders.filter(o => new Date(o.date).getTime() <= time);

            const holdings = relevantOrders.reduce((acc, order) => {
                if (!acc[order.fundName]) acc[order.fundName] = { shares: 0, invested: 0, buyLots: [] };

                let calculatedShares = order.shares;
                if (!calculatedShares && order.nav > 0 && order.type !== 'deposit') {
                    calculatedShares = order.amount / order.nav;
                } else if (!calculatedShares && order.type !== 'deposit') {
                    const historicalNav = getNavForDate(order.fundName, new Date(order.date).setHours(0, 0, 0, 0));
                    if (historicalNav > 0) calculatedShares = order.amount / historicalNav;
                }
                calculatedShares = calculatedShares || 0;

                if (order.type === 'buy') {
                    acc[order.fundName].shares += calculatedShares;
                    acc[order.fundName].invested += order.amount;
                    acc[order.fundName].buyLots.push({
                        shares: calculatedShares,
                        amount: order.amount,
                        nav: order.nav || (calculatedShares > 0 ? order.amount / calculatedShares : 0)
                    });
                } else if (order.type === 'sell') {
                    let sharesToSell = calculatedShares;
                    let capitalToDeduct = 0;

                    for (let i = 0; i < acc[order.fundName].buyLots.length; i++) {
                        if (sharesToSell <= 0) break;

                        const lot = acc[order.fundName].buyLots[i];
                        if (lot.shares > 0) {
                            if (lot.shares <= sharesToSell) {
                                capitalToDeduct += lot.amount;
                                sharesToSell -= lot.shares;
                                lot.shares = 0;
                                lot.amount = 0;
                            } else {
                                const fractionSold = sharesToSell / lot.shares;
                                const proportionalCapital = lot.amount * fractionSold;
                                capitalToDeduct += proportionalCapital;

                                lot.shares -= sharesToSell;
                                lot.amount -= proportionalCapital;
                                sharesToSell = 0;
                            }
                        }
                    }

                    acc[order.fundName].shares -= calculatedShares;
                    acc[order.fundName].invested -= capitalToDeduct;
                } else if (order.type === 'deposit') {
                    acc[order.fundName].invested += order.amount;
                    acc[order.fundName].isDeposit = true;
                    if (!acc[order.fundName].deposits) acc[order.fundName].deposits = [];
                    acc[order.fundName].deposits.push(order);
                }
                return acc;
            }, {});

            Object.entries(holdings).forEach(([fund, data]) => {
                totalInvested += data.invested;

                if (data.isDeposit) {
                    data.deposits.forEach(dep => {
                        const startDateDep = new Date(dep.date);
                        const maturityDate = new Date(startDateDep);
                        maturityDate.setMonth(maturityDate.getMonth() + (dep.duration || 12));
                        maturityDate.setHours(23, 59, 59, 999);

                        if (time >= maturityDate.getTime()) {
                            const profit = dep.amount * ((dep.interestRate || 0) / 100) * ((dep.duration || 12) / 12);
                            totalValue += (dep.amount + profit);
                        } else {
                            totalValue += dep.amount;
                        }
                    });
                    return;
                }

                const dayNav = getNavForDate(fund, time);
                if (dayNav > 0 && data.shares > 0) {
                    totalValue += data.shares * dayNav;
                } else if (data.shares > 0) {
                    const estimatedNav = data.invested / data.shares;
                    totalValue += data.shares * estimatedNav;
                } else if (data.invested !== 0) {
                    totalValue += data.invested;
                }
            });

            // TWR Percentage-based Benchmark (Shadow Portfolio):
            if (time > absoluteFirstDate.getTime()) {
                benchmarkValue = benchmarkValue * Math.pow(1.07, 1/365); // 7% CAGR
            }

            const dailyOrders = orders.filter(o => {
                const d = new Date(o.date);
                d.setHours(0,0,0,0);
                return d.getTime() === time;
            });

            let dailyBuys = 0;
            let dailySells = 0;
            dailyOrders.forEach(o => {
                if (o.type === 'buy' || o.type === 'deposit') dailyBuys += o.amount;
                else if (o.type === 'sell') dailySells += o.amount;
            });

            if (dailyBuys > 0) benchmarkValue += dailyBuys;
            if (dailySells > 0) {
                const valueBefore = totalValue + dailySells;
                if (valueBefore > 0) {
                    benchmarkValue = benchmarkValue * (1 - (dailySells / valueBefore));
                } else {
                    benchmarkValue -= dailySells;
                }
            }

            if (time >= startDate.getTime()) {
                dataPoints.push({
                    date: new Date(currentDate).toLocaleDateString(undefined, { day: period === '1W' ? '2-digit' : undefined, month: 'short', year: '2-digit' }),
                    timestamp: time,
                    invested: totalInvested,
                    value: totalValue,
                    benchmark: benchmarkValue
                });
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        let finalDataPoints = dataPoints;
        if (dataPoints.length > 500) {
            const step = Math.ceil(dataPoints.length / 200);
            finalDataPoints = dataPoints.filter((_, i) => i % step === 0 || i === dataPoints.length - 1);
        }

        return finalDataPoints;
    }, [orders, historicalNavs, period]);

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
                
                <div className="flex p-0.5 rounded-lg border bg-slate-50 border-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                    {periods.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                                period === p.id 
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
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
                            name="Benchmark (7% CAGR)"
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

