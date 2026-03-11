import React from 'react';
import { Wallet, PieChart as PieChartIcon, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, YAxis } from 'recharts';
import { getMatchingFundKey } from '../utils/helpers';

export default function Portfolio({ orders, currentNavs, historicalNavs, janNavs, currentHoldings, totalCarteraValorada, isPrivacyMode, formatCurrency }) {
    // Process holdings into rich asset allocation data
    const activeHoldings = Object.entries(currentHoldings || {})
        .filter(([_, data]) => data.shares > 0 || data.invested !== 0)
        .map(([fundName, data]) => {
            if (data.isDeposit) {
                let currentValorado = 0;
                let maturedProfits = 0;
                data.deposits.forEach(dep => {
                    const startDate = new Date(dep.date);
                    const maturityDate = new Date(startDate);
                    maturityDate.setMonth(maturityDate.getMonth() + (dep.duration || 12));
                    maturityDate.setHours(23, 59, 59, 999);

                    if (new Date() >= maturityDate) {
                        const profit = dep.amount * ((dep.interestRate || 0) / 100) * ((dep.duration || 12) / 12);
                        maturedProfits += profit;
                        currentValorado += (dep.amount + profit);
                    } else {
                        currentValorado += dep.amount;
                    }
                });

                const totalProfitPct = data.invested > 0 ? (maturedProfits / data.invested) * 100 : 0;
                const targetPercent = 50.00;
                const currentPercent = totalCarteraValorada > 0 ? (currentValorado / totalCarteraValorada) * 100 : 0;

                return {
                    fundName: `🏦 ${fundName}`,
                    shares: 0,
                    invested: data.invested,
                    nav: 0,
                    currentValorado,
                    currentPercent,
                    targetPercent,
                    deviation: currentPercent - targetPercent,
                    rebalanceAmount: (totalCarteraValorada * (targetPercent / 100)) - currentValorado,
                    totalProfitPct,
                    annualReturn: totalProfitPct,
                    ytdReturn: 0,
                    sparklineData: []
                };
            }

            const matchKey = getMatchingFundKey(currentNavs, fundName);
            const fallbackNav = data.shares > 0 ? (data.invested / data.shares) : 0;
            const nav = currentNavs[matchKey] || fallbackNav;
            const janNav = janNavs ? janNavs[matchKey] || nav : nav;

            let currentValorado = data.shares * nav;
            if (data.shares === 0 && data.invested !== 0) {
                currentValorado = data.invested;
            }

            // Filtramos y ordenamos órdenes de este fondo (más antigua primero)
            const fundOrders = (orders || [])
                .filter(o => o.fundName === fundName)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            if (fundOrders.length === 0) return null;

            const firstOrder = fundOrders[0];
            const firstNav = firstOrder.nav || (data.invested / data.shares);
            const totalProfitPct = data.invested > 0 ? ((currentValorado / data.invested) - 1) * 100 : 0;

            // Rentabilidad Anualizada del ACTIVO (NAV CAGR)
            // Independiente de la cantidad: ¿Cuánto ha crecido el fondo por año desde mi primera compra?
            const now = new Date();
            const totalDaysSinceStart = (now - new Date(firstOrder.date)) / (1000 * 60 * 60 * 24);
            const totalYearsSinceStart = totalDaysSinceStart / 365.25;

            let annualReturn = 0;
            if (totalYearsSinceStart > 0 && firstNav > 0) {
                // (NAV_Actual / NAV_Inicial) ^ (1 / Años_Totales) - 1
                annualReturn = (Math.pow(nav / firstNav, 1 / totalYearsSinceStart) - 1) * 100;
            }

            // Rentabilidad Year-to-Date (YTD)
            const ytdReturn = janNav > 0 ? ((nav / janNav) - 1) * 100 : 0;

            // Hardcoded 50% target allocation for MVP
            const targetPercent = 50.00;
            const currentPercent = totalCarteraValorada > 0 ? (currentValorado / totalCarteraValorada) * 100 : 0;

            const deviation = currentPercent - targetPercent;
            const targetValuation = totalCarteraValorada * (targetPercent / 100);
            const rebalanceAmount = targetValuation - currentValorado;

            // Prepare sparkline data 
            const sparklineData = [];
            if (historicalNavs && historicalNavs[matchKey]) {
                const navsArr = historicalNavs[matchKey];
                // Tomar los últimos 60 días para un gráfico suave
                const recent = navsArr.slice(-60);
                recent.forEach(([ts, n]) => sparklineData.push({ nav: n, time: ts }));
            }

            return {
                fundName,
                shares: data.shares,
                invested: data.invested,
                nav,
                currentValorado,
                currentPercent,
                targetPercent,
                deviation,
                rebalanceAmount,
                totalProfitPct,
                annualReturn,
                ytdReturn,
                sparklineData
            };
        })
        .sort((a, b) => b.currentValorado - a.currentValorado);

    // Prepare data for Recharts
    const chartData = activeHoldings.map(h => ({
        name: h.fundName,
        value: h.currentValorado,
    }));

    // Color palette for the chart
    const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];

    if (activeHoldings.length === 0) {
        return (
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Mi Portfolio</h1>
                    <div className="text-gray-400">Desglose de tus inversiones actuales.</div>
                </header>
                <div className="card text-center py-16">
                    <Wallet className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <div className="text-gray-400 text-lg mb-2">Tu portfolio está vacío</div>
                    <p className="text-sm text-gray-500">Realiza una compra desde el Dashboard para comenzar.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Mi Portfolio</h1>
                <div className="text-gray-400">Desglose avanzado y rebalanceo de activos.</div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="card flex items-center justify-center min-h-[300px]">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-col justify-center">
                    <h2 className="text-xl font-semibold mb-2">Resumen de Asignación</h2>
                    <p className="text-gray-400 mb-6">Esta visualización está basada en los precios de mercado actuales (NAV). Usa el dashboard para actualizarlos periódicamente.</p>
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="text-sm text-primary mb-1">Cartera Valorada Total</div>
                        <div className="text-3xl font-bold text-white">{formatCurrency(totalCarteraValorada)}</div>
                    </div>
                </div>
            </div>

            <h2 className="text-xl font-semibold mb-4 mt-10">Asset Allocation & Rebalanceo</h2>
            <div className="card overflow-x-auto p-0 border border-gray-800">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-surface text-gray-400 text-sm border-b border-gray-800">
                            <th className="p-4 font-medium">Fondo</th>
                            <th className="p-4 font-medium text-right">Valorado</th>
                            <th className="p-4 font-medium text-center">YTD (2026)</th>
                            <th className="p-4 font-medium text-center">Evolución</th>
                            <th className="p-4 font-medium text-center">Rent. Total</th>
                            <th className="p-4 font-medium text-center">Rent. Anual</th>
                            <th className="p-4 font-medium text-center">Actual %</th>
                            <th className="p-4 font-medium text-right">Rebalanceo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeHoldings.map((h, index) => {
                            const isOverweight = h.deviation > 0;
                            const isProfitPositive = h.totalProfitPct >= 0;
                            return (
                                <tr key={h.fundName} className={`border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors ${index === activeHoldings.length - 1 ? 'border-b-0' : ''}`}>
                                    <td className="p-4 font-medium text-white max-w-[180px] truncate" title={h.fundName}>
                                        {h.fundName}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="text-white font-semibold">{formatCurrency(h.currentValorado)}</div>
                                        <div className="text-[10px] text-gray-500">Coste: {formatCurrency(h.invested)}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className={`inline-flex items-center px-2 py-1 rounded bg-blue-500/10 font-bold ${h.ytdReturn >= 0 ? 'text-blue-400' : 'text-danger'}`}>
                                            {isPrivacyMode ? 'XX.X%' : (h.nav === 0 ? '-' : `${h.ytdReturn >= 0 ? '+' : ''}${h.ytdReturn.toFixed(2)}%`)}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        {h.sparklineData && h.sparklineData.length > 0 ? (
                                            <div className="w-24 h-10 inline-block mb-[-6px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={h.sparklineData}>
                                                        <YAxis hide domain={['dataMin', 'dataMax']} />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="nav"
                                                            stroke={h.sparklineData[0].nav <= h.sparklineData[h.sparklineData.length - 1].nav ? '#4ade80' : '#f87171'}
                                                            strokeWidth={2}
                                                            dot={false}
                                                            isAnimationActive={false}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <span className="text-gray-600 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className={`inline-flex items-center font-bold ${isProfitPositive ? 'text-green-400' : 'text-danger'}`}>
                                            {isPrivacyMode ? 'XX.X%' : `${isProfitPositive ? '+' : ''}${h.totalProfitPct.toFixed(2)}%`}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className={`px-2 py-1 rounded bg-gray-900/50 text-xs font-mono ${h.annualReturn >= 0 ? 'text-green-400' : 'text-danger'}`}>
                                            {isPrivacyMode ? 'XX.X%' : (h.nav === 0 ? `${h.annualReturn.toFixed(2)}% (TAE)` : `${h.annualReturn.toFixed(2)}% / año`)}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="inline-block px-2 py-1 rounded-md bg-gray-800 text-sm font-medium">
                                            {h.currentPercent.toFixed(1)}%
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${h.rebalanceAmount > 0 ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
                                            <ArrowRightLeft size={14} />
                                            {isPrivacyMode ? 'XXXX' : `${h.rebalanceAmount > 0 ? '+' : ''}${formatCurrency(h.rebalanceAmount)}`}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
