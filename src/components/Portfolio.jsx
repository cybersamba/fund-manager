import React from 'react';
import { Wallet, PieChart as PieChartIcon, ArrowRightLeft, TrendingUp, TrendingDown, Target, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, YAxis } from 'recharts';
import { getMatchingFundKey, calculateMWR, calculateTWR } from '../utils/helpers';

export default function Portfolio({ orders, currentNavs, historicalNavs, janNavs, currentHoldings, totalCarteraValorada, isPrivacyMode, formatCurrency, fundConfigs = {} }) {
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
                    const duration = dep.duration || dep.duration_months || 12;
                    // Support multiple interest rate property names
                    const rate = dep.interestRate !== undefined ? dep.interestRate : 
                               (dep.interestrate !== undefined ? dep.interestrate : 
                               (dep.interest_rate !== undefined ? dep.interest_rate : 0));

                    maturityDate.setMonth(maturityDate.getMonth() + duration);
                    maturityDate.setHours(23, 59, 59, 999);

                    if (new Date() >= maturityDate) {
                        const profit = dep.amount * (parseFloat(rate) / 100) * (duration / 12);
                        maturedProfits += profit;
                        currentValorado += (dep.amount + profit);
                    } else {
                        currentValorado += dep.amount;
                    }
                });

                let totalInterestRate = 0;
                if (data.deposits && data.deposits.length > 0) {
                    totalInterestRate = data.deposits.reduce((acc, d) => {
                        const rate = d.interestRate !== undefined ? d.interestRate : 
                                   (d.interestrate !== undefined ? d.interestrate : 
                                   (d.interest_rate !== undefined ? d.interest_rate : 0));
                        return acc + (parseFloat(rate) || 0);
                    }, 0) / data.deposits.length;
                }

                const currentPercent = totalCarteraValorada > 0 ? (currentValorado / totalCarteraValorada) * 100 : 0;
                const config = fundConfigs[fundName] || {};
                const targetPercent = config.targetPercent || 0;

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
                    totalProfitPct: (data.invested > 0 ? (maturedProfits / data.invested) * 100 : 0),
                    annualReturn: totalInterestRate, 
                    twrTotal: (data.invested > 0 ? (maturedProfits / data.invested) * 100 : 0),
                    twrAnnual: totalInterestRate,
                    mwrAnnual: totalInterestRate,
                    ytdReturn: totalInterestRate, 
                    sparklineData: [],
                    ter: 0,
                    terCost: 0
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

            const now = new Date();
            const totalDaysSinceStart = (now - new Date(firstOrder.date)) / (1000 * 60 * 60 * 24);
            const totalYearsSinceStart = totalDaysSinceStart / 365.25;

            // Rentabilidad Year-to-Date (YTD)
            const ytdReturn = janNav > 0 ? ((nav / janNav) - 1) * 100 : 0;

            // Dynamic target allocation from configs
            const config = fundConfigs[fundName] || {};
            const targetPercent = config.targetPercent || 0;
            const currentPercent = totalCarteraValorada > 0 ? (currentValorado / totalCarteraValorada) * 100 : 0;

            const deviation = currentPercent - targetPercent;
            const targetValuation = totalCarteraValorada * (targetPercent / 100);
            const rebalanceAmount = targetValuation - currentValorado;

            // Prepare sparkline data 
            const sparklineData = [];
            if (historicalNavs && historicalNavs[matchKey]) {
                const navsArr = historicalNavs[matchKey];
                const recent = navsArr.slice(-60);
                recent.forEach(([ts, n]) => sparklineData.push({ nav: n, time: ts }));
            }

            // TWR & MWR Calculations
            const twrTotal = calculateTWR(firstNav, nav);
            const mwrAnnual = calculateMWR(fundOrders, currentValorado);
            
            let twrAnnual = 0;
            if (totalYearsSinceStart > 0 && (1 + twrTotal/100) > 0) {
                twrAnnual = (Math.pow(1 + twrTotal/100, 1 / totalYearsSinceStart) - 1) * 100;
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
                annualReturn: twrAnnual, 
                firstBuyNav: firstNav,
                firstOrderDate: firstOrder.date,
                twrTotal,
                twrAnnual,
                mwrAnnual,
                ytdReturn,
                sparklineData,
                ter: config.ter || 0,
                terCost: currentValorado * ((config.ter || 0) / 100)
            };
        })
        .sort((a, b) => b.currentValorado - a.currentValorado);

    const totalTerCost = activeHoldings.reduce((sum, h) => sum + (h.terCost || 0), 0);
    const averageTer = totalCarteraValorada > 0 ? (totalTerCost / totalCarteraValorada) * 100 : 0;

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                            <div className="text-[10px] text-primary/70 uppercase font-bold mb-1">Cartera Valorada Total</div>
                            <div className="text-2xl font-bold text-white">{formatCurrency(totalCarteraValorada)}</div>
                        </div>
                        {(() => {
                            const totalTarget = activeHoldings.reduce((sum, h) => sum + h.targetPercent, 0);
                            const isBalanced = Math.abs(totalTarget - 100) < 0.1;
                            return (
                                <div className={`p-4 border rounded-lg ${isBalanced ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                    <div className={`text-[10px] uppercase font-bold mb-1 ${isBalanced ? 'text-green-400' : 'text-amber-400'}`}>Objetivo Total</div>
                                    <div className="text-2xl font-bold text-white">{totalTarget.toFixed(0)}%</div>
                                    {!isBalanced && activeHoldings.length > 0 && <div className="text-[10px] text-amber-500 font-bold mt-1">⚠️ AJUSTA AL 100% EN SETTINGS</div>}
                                </div>
                            );
                        })()}
                        
                        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg sm:col-span-2">
                            <div className="text-[10px] text-amber-500/80 uppercase font-bold mb-1">Comisiones de Gestión (TER Promedio: {averageTer.toFixed(2)}%)</div>
                            <div className="text-xl font-bold text-amber-400/90 hover:text-amber-400 transition-colors cursor-help" title="Esto es lo que cobran anualmente las gestoras (Amundi, Vanguard, etc.) por administrar tus fondos.">
                                {isPrivacyMode ? 'XXXX' : formatCurrency(totalTerCost)} <span className="text-sm font-normal text-amber-500/50">/ año</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <h2 className="text-xl font-semibold mb-4 mt-10">Asset Allocation & Rebalanceo</h2>
            <div className="card overflow-x-auto p-0 border border-gray-800">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-surface text-gray-400 text-[10px] uppercase tracking-wider border-b border-gray-800">
                            <th className="px-3 py-4 font-bold">Fondo</th>
                            <th className="px-3 py-4 font-bold text-right">Valorado</th>
                            <th className="px-3 py-4 font-bold text-center">YTD</th>
                            <th className="px-3 py-4 font-bold text-center">Evol.</th>
                            <th className="px-3 py-4 font-bold text-center">
                                <div className="flex items-center justify-center gap-1">
                                    TWR 1ª Compra <Info size={10} className="text-gray-600" title="Rentabilidad de tu primera aportación" />
                                </div>
                            </th>
                            <th className="px-3 py-4 font-bold text-center">
                                <div className="flex items-center justify-center gap-1">
                                    TWR <Info size={10} className="text-gray-600" title="Rentabilidad del activo" />
                                </div>
                            </th>
                            <th className="px-3 py-4 font-bold text-center">TWR Anual</th>
                            <th className="px-3 py-4 font-bold text-center">
                                <div className="flex items-center justify-center gap-1">
                                    MWR <Info size={10} className="text-gray-600" title="Tu rentabilidad real anualizada" />
                                </div>
                            </th>
                            <th className="px-3 py-4 font-bold text-center">
                                <div className="flex items-center justify-center gap-1">
                                    TER <Info size={10} className="text-amber-600/50" title="Coste anual de gestión" />
                                </div>
                            </th>
                            <th className="px-3 py-4 font-bold text-center">Actual %</th>
                            <th className="px-3 py-4 font-bold text-right">Rebalanceo</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {activeHoldings.map((h, index) => {
                            const isOverweight = h.deviation > 0;
                            const isProfitPositive = h.totalProfitPct >= 0;
                            
                            // Calculate performance of first buy order specifically
                            let firstBuyReturn = null;
                            if (h.firstBuyNav && h.nav > 0) {
                                const rawReturn = (h.nav / h.firstBuyNav) - 1;
                                
                                // Annualize it if the holding period is more than 30 days (make it comparable)
                                if (h.firstOrderDate) {
                                    const yearsSinceFirstBuy = (new Date() - new Date(h.firstOrderDate)) / (1000 * 60 * 60 * 24 * 365.25);
                                    if (yearsSinceFirstBuy > 0 && (1 + rawReturn) > 0) {
                                        firstBuyReturn = (Math.pow(1 + rawReturn, 1 / yearsSinceFirstBuy) - 1) * 100;
                                    } else {
                                        firstBuyReturn = rawReturn * 100;
                                    }
                                } else {
                                    firstBuyReturn = rawReturn * 100; // fallback just in case
                                }
                            }
                            return (
                                <tr key={h.fundName} className={`border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors ${index === activeHoldings.length - 1 ? 'border-b-0' : ''}`}>
                                    <td className="p-3 font-medium text-white whitespace-normal max-w-[180px]" title={h.fundName}>
                                        <div className="leading-tight line-clamp-2">
                                            {h.fundName}
                                        </div>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="text-white font-semibold">{formatCurrency(h.currentValorado)}</div>
                                        <div className="text-[9px] text-gray-500">Coste: {formatCurrency(h.invested)}</div>
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
                                    <td className="p-3 text-center">
                                        <div className={`flex flex-col items-center font-bold ${firstBuyReturn !== null ? (firstBuyReturn >= 0 ? 'text-green-400' : 'text-danger') : 'text-gray-600'}`}>
                                            <span className="text-[9px] uppercase text-gray-600 font-semibold">Compra 1</span>
                                            {isPrivacyMode ? 'XX.X%' : (firstBuyReturn !== null ? `${firstBuyReturn >= 0 ? '+' : ''}${firstBuyReturn.toFixed(2)}%` : '-')}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className={`flex flex-col items-center font-bold ${h.twrTotal >= 0 ? 'text-green-400' : 'text-danger'}`}>
                                            <span className="text-[9px] uppercase text-gray-600 font-semibold">Total</span>
                                            {isPrivacyMode ? 'XX.X%' : `${h.twrTotal >= 0 ? '+' : ''}${h.twrTotal.toFixed(2)}%`}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className={`flex flex-col items-center font-bold ${h.twrAnnual >= 0 ? 'text-green-400' : 'text-danger'}`}>
                                            <span className="text-[9px] uppercase text-gray-600 font-semibold">Anual</span>
                                            {isPrivacyMode ? 'XX.X%' : `${h.twrAnnual >= 0 ? '+' : ''}${h.twrAnnual.toFixed(2)}%`}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className={`px-1.5 py-1 rounded bg-indigo-500/5 border border-indigo-500/10 flex flex-col items-center font-bold ${h.mwrAnnual >= 0 ? 'text-indigo-400' : 'text-danger'}`}>
                                            <span className="text-[8px] uppercase text-indigo-500/50 font-bold">Real</span>
                                            {isPrivacyMode ? 'XX.X%' : `${h.mwrAnnual >= 0 ? '+' : ''}${h.mwrAnnual.toFixed(2)}%`}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex flex-col items-center text-amber-400/80 font-medium">
                                            {h.ter > 0 ? (
                                                <>
                                                    <span>{h.ter.toFixed(2)}%</span>
                                                    <span className="text-[9px] text-amber-500/40">~{isPrivacyMode ? 'XX€' : formatCurrency(h.terCost)}/a</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-600">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="inline-block px-1.5 py-0.5 rounded-md bg-gray-800 text-xs font-medium">
                                            {h.currentPercent.toFixed(1)}%
                                        </div>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${h.rebalanceAmount > 0 ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
                                            <ArrowRightLeft size={12} />
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
