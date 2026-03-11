import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getMatchingFundKey } from '../utils/helpers';

export default function HistoricalChart({ orders, historicalNavs, isPrivacyMode, currency, formatCurrency }) {
    const chartData = useMemo(() => {
        if (!orders || orders.length === 0 || !historicalNavs || Object.keys(historicalNavs).length === 0) return [];

        // Ensure we have some historical navs data
        const hasNavData = Object.values(historicalNavs).some(navArray => navArray && navArray.length > 0);
        if (!hasNavData) return [];

        const firstOrderDate = new Date(Math.min(...orders.map(o => new Date(o.date).getTime())));
        firstOrderDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

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

        // Helper to find nearest past NAV up to 7 days
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
        let currentDate = new Date(firstOrderDate);

        // Pre-sort orders for faster processing
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
                        const startDate = new Date(dep.date);
                        const maturityDate = new Date(startDate);
                        maturityDate.setMonth(maturityDate.getMonth() + (dep.duration || 12));
                        maturityDate.setHours(23, 59, 59, 999);

                        // If current point in 'time' line has already surpassed the maturity 
                        if (time >= maturityDate.getTime()) {
                            const profit = dep.amount * ((dep.interestRate || 0) / 100) * ((dep.duration || 12) / 12);
                            totalValue += (dep.amount + profit);
                        } else {
                            totalValue += dep.amount;
                        }
                    });
                    return; // exit the loop for this specific record so it doesn't try to look for NAVs
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

            if (totalInvested > 0) {
                dataPoints.push({
                    date: new Date(currentDate).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
                    timestamp: time,
                    invested: totalInvested,
                    value: totalValue,
                });
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // To avoid freezing the browser rendering too many points, we can sample it if it's > 365
        let finalDataPoints = dataPoints;
        if (dataPoints.length > 500) {
            // Keep roughly 200 points
            const step = Math.ceil(dataPoints.length / 200);
            finalDataPoints = dataPoints.filter((_, i) => i % step === 0 || i === dataPoints.length - 1);
        }

        return finalDataPoints;
    }, [orders, historicalNavs]);

    if (!historicalNavs || Object.keys(historicalNavs).length === 0 || chartData.length === 0) {
        return null;
    }

    // Determine Y-axis domain based on data to make it zoom in a bit
    const minValue = Math.min(...chartData.map(d => Math.min(d.invested, d.value)));
    const maxValue = Math.max(...chartData.map(d => Math.max(d.invested, d.value)));
    const yMin = Math.max(0, minValue * 0.95); // 5% padding below

    return (
        <div className="card mb-8">
            <h2 className="text-xl font-semibold mb-6">Evolución de la Cartera</h2>
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
