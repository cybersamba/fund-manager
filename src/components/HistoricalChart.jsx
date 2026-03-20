import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getMatchingFundKey } from '../utils/helpers';

export default function HistoricalChart({ orders, historicalNavs, isPrivacyMode, currency, formatCurrency }) {
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
        
        if (selectedPeriod && selectedPeriod.days) {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - selectedPeriod.days);
        } else {
            startDate = new Date(Math.min(...orders.map(o => new Date(o.date).getTime())));
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
        let currentDate = new Date(startDate);

        const sortedOrders = [...orders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

            dataPoints.push({
                date: new Date(currentDate).toLocaleDateString(undefined, { day: period === '1W' ? '2-digit' : undefined, month: 'short', year: '2-digit' }),
                timestamp: time,
                invested: totalInvested,
                value: totalValue,
            });

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

    const minValue = Math.min(...chartData.map(d => Math.min(d.invested, d.value)));
    const maxValue = Math.max(...chartData.map(d => Math.max(d.invested, d.value)));
    const yMin = Math.max(0, minValue * 0.95);

    return (
        <div className="card mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-semibold">Evolución de la Cartera</h2>
                
                <div className="flex bg-surface p-1 rounded-lg border border-gray-800">
                    {periods.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                period === p.id 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
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
                            fontSize={12}
                            tickFormatter={(val) => isPrivacyMode ? 'XXXX' : (currency === 'EUR' ? `${val.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €` : `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`)}
                            width={80}
                            domain={[yMin, 'auto']}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                            formatter={(value, name) => [formatCurrency(value), name]}
                            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '10px' }} iconType="circle" />
                        <Area
                            type="monotone"
                            dataKey="invested"
                            name="Capital Aportado"
                            stroke="#94a3b8"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorInvested)"
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            name="Valor Cartera"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

