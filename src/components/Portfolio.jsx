import React from 'react';
import { Wallet, PieChart as PieChartIcon, ArrowRightLeft, TrendingUp, TrendingDown, Target, Info, Landmark, Coins, ShieldCheck, Activity, PiggyBank } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, YAxis, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { getMatchingFundKey } from '../utils/helpers';

// Helper to guess asset class from name if not provided
const guessAssetClass = (name) => {
    if (!name) return 'renta-variable';
    const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes('tresorerie') || normalized.includes('monetario') || normalized.includes('liquidez') || normalized.includes('money market') || normalized.includes('treasury') || normalized.includes('cash')) return 'monetario';
    if (normalized.includes('bono') || normalized.includes('renta fija') || normalized.includes('deuda') || normalized.includes('fixed income') || normalized.includes('bond')) return 'renta-fija';
    if (normalized.includes('deposito')) return 'deposito';
    return 'renta-variable';
};

// Ultra minimal tooltip
const CustomTooltip = ({ active, payload, formatCurrency }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-slate-200/60 shadow-xl rounded-xl px-4 py-3">
                <p className="text-slate-500 text-xs font-medium mb-1">{payload[0].name}</p>
                <p className="text-slate-900 font-bold font-mono text-sm">{formatCurrency(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};

export default function Portfolio({ orders, currentNavs, historicalNavs, janNavs, currentHoldings, totalCarteraValorada, isPrivacyMode, formatCurrency, fundConfigs = {} }) {
    const activeHoldings = Object.entries(currentHoldings || {})
        .filter(([_, data]) => data.shares > 0 || data.invested !== 0)
        .map(([fundName, data]) => {
            const config = fundConfigs[fundName] || {};
            const currentPercent = totalCarteraValorada > 0 ? (data.currentValuation / totalCarteraValorada) * 100 : 0;
            const targetPercent = config.targetPercent || 0;

            const sparklineData = [];
            if (historicalNavs) {
                const matchKey = getMatchingFundKey(historicalNavs, fundName);
                const navsArr = historicalNavs[matchKey] || [];
                navsArr.slice(-60).forEach(([ts, n]) => sparklineData.push({ nav: parseFloat(n), time: ts }));
            }

            return {
                fundName,
                broker: data.broker || 'Broker',
                assetClass: config.assetClass || (data.isDeposit ? 'deposito' : guessAssetClass(fundName)),
                shares: data.shares,
                invested: data.invested,
                nav: data.nav,
                currentValorado: data.currentValuation,
                currentPercent,
                targetPercent,
                deviation: currentPercent - targetPercent,
                rebalanceAmount: (totalCarteraValorada * (targetPercent / 100)) - data.currentValuation,
                totalProfitPct: data.invested > 0 ? ((data.currentValuation / data.invested) - 1) * 100 : 0,
                annualReturn: data.twrAnnual || 0,
                twrAnnual: data.twrAnnual || 0,
                mwrAnnual: data.mwrAnnual || 0,
                ytdReturn: data.ytdReturn || 0,
                sparklineData,
                ter: config.ter || 0,
                terCost: data.currentValuation * ((config.ter || 0) / 100)
            };
        })
        .sort((a, b) => b.currentValorado - a.currentValorado);

    const totalTerCost = activeHoldings.reduce((sum, h) => sum + (h.terCost || 0), 0);
    const averageTer = totalCarteraValorada > 0 ? (totalTerCost / totalCarteraValorada) * 100 : 0;

    const totalInvestedGlobal = activeHoldings.reduce((sum, h) => sum + h.invested, 0);
    const globalTwrRough = totalInvestedGlobal > 0 ? ((totalCarteraValorada / totalInvestedGlobal) - 1) * 100 : 0;
    const deviationScore = activeHoldings.reduce((sum, h) => sum + Math.abs(h.deviation), 0);
    
    // Weighted safety: 100% for cash/monetary/deposits, 70% for bonds/fixed income
    const weightedSafety = activeHoldings.reduce((sum, h) => {
        if (h.assetClass === 'deposito' || h.assetClass === 'monetario') {
            return sum + h.currentPercent;
        } else if (h.assetClass === 'renta-fija') {
            return sum + (h.currentPercent * 0.7);
        }
        return sum;
    }, 0);

    const healthData = [
        { subject: 'Eficiencia', A: Math.max(0, 100 - ((averageTer || 0) * 120)) || 0, fullMark: 100 },
        { subject: 'Rendimiento', A: Math.max(0, Math.min(100, 15 + ((globalTwrRough || 0) * 3.4))) || 0, fullMark: 100 },
        { subject: 'Diversidad', A: Math.min(100, (activeHoldings.length * 15 + 25)) || 0, fullMark: 100 },
        { subject: 'Seguridad', A: Math.min(100, ((weightedSafety || 0) > 98 ? 100 : (weightedSafety || 0) * 0.8 + 20)) || 0, fullMark: 100 },
        { subject: 'Disciplina', A: Math.max(0, 100 - ((deviationScore || 0) * 1.5)) || 0, fullMark: 100 }
    ];

    const ASSET_PALETTES = {
        'renta-variable': ['#10b981', '#059669', '#34d399', '#047857', '#6ee7b7'],
        'renta-fija':     ['#6366f1', '#4f46e5', '#818cf8', '#4338ca', '#a5b4fc'],
        'monetario':      ['#06b6d4', '#0891b2', '#22d3ee', '#0e7490', '#67e8f9'],
        'deposito':       ['#f59e0b', '#d97706', '#fbbf24', '#b45309', '#fcd34d']
    };
    const colorIndexes = { 'renta-variable': 0, 'renta-fija': 0, 'monetario': 0, 'deposito': 0 };

    const chartDataFiltered = activeHoldings.map(h => {
        const cls = h.assetClass || 'renta-variable';
        const palette = ASSET_PALETTES[cls] || ASSET_PALETTES['renta-variable'];
        const fillColor = palette[colorIndexes[cls] % palette.length];
        colorIndexes[cls]++;

        return {
            name: h.fundName,
            value: h.currentValorado,
            assetClass: cls,
            fillColor
        };
    });

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, payload }) => {
        if (percent < 0.05) return null;
        const radius = innerRadius + (outerRadius - innerRadius) * 1.7;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        let IconDef = Activity;
        let ringColor = 'border-emerald-500/30';
        
        if (payload.assetClass === 'monetario') { IconDef = Coins; ringColor = 'border-cyan-500/30'; }
        else if (payload.assetClass === 'renta-fija') { IconDef = ShieldCheck; ringColor = 'border-indigo-500/30'; }
        else if (payload.assetClass === 'deposito') { IconDef = PiggyBank; ringColor = 'border-amber-500/30'; }

        return (
            <foreignObject x={x - 14} y={y - 14} width={28} height={28} className="overflow-visible pointer-events-none">
                <div className={`w-full h-full bg-[#0b1120]/80 backdrop-blur-sm rounded-full flex items-center justify-center border shadow-xl ${ringColor}`}>
                    <IconDef size={14} color={payload.fillColor} strokeWidth={2.5} />
                </div>
            </foreignObject>
        );
    };

    if (activeHoldings.length === 0) {
        return (
            <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[50vh] animate-fade-in-up">
                <Wallet className="w-12 h-12 text-slate-300 mb-6" />
                <div className="text-slate-500 text-lg mb-2 font-mono">SIN_ASIGNACIONES_ACTIVAS</div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Esperando entrada de operaciones</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-6">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-sans font-bold text-slate-900 mb-1 tracking-tight">Motor de Patrimonio</h1>
                    <div className="text-[10px] font-mono whitespace-nowrap overflow-hidden text-ellipsis text-slate-400 tracking-[0.2em] uppercase">Distribución y Enrutamiento de Activos</div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bento-card p-6 flex flex-col justify-center min-h-[340px]">
                    <h2 className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-widest mb-4">Distribución Actual</h2>
                    <div className="flex-1 w-full min-h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartDataFiltered}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={4}
                                    label={renderCustomizedLabel}
                                    labelLine={false}
                                >
                                    {chartDataFiltered.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fillColor} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bento-card overflow-visible p-6 flex flex-col justify-center bg-[#0b1120] border-0 shadow-lg relative">
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xs font-mono text-indigo-400 font-semibold uppercase tracking-widest">Portfolio Snowflake</h2>
                        <div className="group relative">
                            <Info size={14} className="text-slate-500 hover:text-indigo-400 cursor-help transition-colors" />
                            <div className="hidden group-hover:block absolute z-50 left-6 top-0 w-64 p-4 bg-slate-900/95 backdrop-blur text-slate-300 text-[10px] font-mono rounded-xl shadow-2xl border border-indigo-500/30 leading-relaxed pointer-events-none">
                                <span className="text-indigo-300 font-bold block mb-1">¿CÓMO LEER EL 'COPO DE NIEVE'?</span>
                                Puntuación de 0 a 100 de tu cartera general en 5 áreas clave:<br/><br/>
                                <strong className="text-white">Eficiencia:</strong> Cuanto más bajo sea el TER medio, más crece.<br/>
                                <strong className="text-white">Rendimiento:</strong> Premia un crecimiento TWR global alto.<br/>
                                <strong className="text-white">Diversidad:</strong> Sube si repartes capital en múltiples activos.<br/>
                                <strong className="text-white">Seguridad:</strong> Máxima en depósitos/monetarios; ponderada (70%) en R. Fija.<br/>
                                <strong className="text-white">Disciplina:</strong> Penaliza si te desvías de tus % Objetivo.
                            </div>
                        </div>
                    </div>
                    <div className="text-[10px] text-slate-500 mb-4 font-mono leading-tight opacity-70">Posiciona el ratón sobre la 'i' para leer la leyenda.</div>
                    <div className="flex-1 w-full min-h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={healthData}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
                                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Salud" dataKey="A" stroke="#818cf8" fill="#818cf8" fillOpacity={0.4} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bento-card p-8 flex flex-col justify-center">
                    <h2 className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-widest mb-8">Resumen de Asignación</h2>
                    
                    <div className="space-y-8">
                        <div>
                            <div className="text-[10px] font-mono text-slate-500 uppercase mb-2">Valor Neto</div>
                            <div className="text-4xl font-sans font-bold tracking-tight text-slate-900">{formatCurrency(totalCarteraValorada)}</div>
                        </div>
                        
                        {(() => {
                            const totalTarget = activeHoldings.reduce((sum, h) => sum + h.targetPercent, 0);
                            const isBalanced = Math.abs(totalTarget - 100) < 0.1;
                            return (
                                <div>
                                    <div className={`text-[10px] font-mono font-semibold uppercase mb-2 ${isBalanced ? 'text-emerald-500' : 'text-rose-500'}`}>Peso Objetivo Total</div>
                                    <div className="text-2xl font-sans font-semibold tracking-tight text-slate-900">{totalTarget.toFixed(0)}%</div>
                                    {!isBalanced && activeHoldings.length > 0 && <div className="text-[9px] text-rose-500 font-mono mt-2 flex items-center gap-2"><Target size={10} /> EL OBJETIVO NO SUMA 100%</div>}
                                </div>
                            );
                        })()}
                        
                        <div className="pt-6 border-t border-slate-200/60">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-mono uppercase">TER Promedio</span>
                                <span className="text-slate-700 font-mono">{averageTer.toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between items-center text-xs mt-2">
                                <span className="text-slate-500 font-mono uppercase">Coste Anual Est.</span>
                                <span className="text-slate-900 font-semibold font-mono">{isPrivacyMode ? '***' : formatCurrency(totalTerCost)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bento-card overflow-x-auto p-0 mt-6 lg:mt-8">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-slate-400 text-[9px] font-mono uppercase tracking-[0.1em] border-b border-slate-200/60 bg-slate-50/50">
                            <th className="px-5 py-4 font-semibold">Activo Estratégico</th>
                            <th className="px-5 py-4 font-semibold text-right">Valor Mercado</th>
                            <th className="px-5 py-4 font-semibold text-center">YTD/ROI</th>
                            <th className="px-5 py-4 font-semibold text-center flex-1 min-w-[120px]">Tendencia</th>
                            <th className="px-5 py-4 font-semibold text-center">TWR (Anual)</th>
                            <th className="px-5 py-4 font-semibold text-center text-slate-400">TIR (MWR)</th>
                            <th className="px-5 py-4 font-semibold text-right">Rebalanceo</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-mono">
                        {activeHoldings.map((h, index) => {
                            const isOverweight = h.deviation > 0;
                            const isProfitPositive = h.totalProfitPct >= 0;
                            
                            const isTopPerf = h.twrAnnual >= 10;
                            const isLowCost = h.ter > 0 && h.ter <= 0.25;
                            const isDeviated = Math.abs(h.deviation) > 5;
                            const isSafe = h.assetClass === 'deposito' || h.assetClass === 'monetario';
                            
                            return (
                                <tr key={h.fundName} className={`border-b border-slate-200/60 transition-colors ${index === activeHoldings.length - 1 ? 'border-b-0' : ''}`}>
                                    <td className="p-5 font-sans justify-center max-w-[200px]" title={h.fundName}>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                                                    h.assetClass === 'monetario' ? 'bg-cyan-50 text-cyan-600 border-cyan-200/50' :
                                                    h.assetClass === 'renta-fija' ? 'bg-indigo-50 text-indigo-600 border-indigo-200/50' :
                                                    h.assetClass === 'deposito' ? 'bg-orange-50 text-orange-600 border-orange-200/50' :
                                                    'bg-emerald-50 text-emerald-600 border-emerald-200/50'
                                                }`}>
                                                    {h.assetClass === 'monetario' ? <Coins size={15} /> :
                                                     h.assetClass === 'renta-fija' ? <ShieldCheck size={15} /> :
                                                     h.assetClass === 'deposito' ? <PiggyBank size={15} /> :
                                                     <Activity size={15} />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-800 leading-tight truncate text-sm">{h.fundName.replace('🏦 ', 'DEP: ')}</div>
                                                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 uppercase font-medium">
                                                        {h.broker} {h.ter > 0 && <span className="text-slate-400 font-mono text-[9px]">· TER {h.ter}%</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 ml-[44px]">
                                                {isLowCost && <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-200/30 px-1.5 py-[2px] rounded-[4px] text-[8px] font-bold uppercase tracking-wider">Bajo Coste</span>}
                                                {isTopPerf && <span className="bg-indigo-500/10 text-indigo-600 border border-indigo-200/30 px-1.5 py-[2px] rounded-[4px] text-[8px] font-bold uppercase tracking-wider">Top Perf.</span>}
                                                {isDeviated && <span className="bg-amber-500/10 text-amber-600 border border-amber-200/30 px-1.5 py-[2px] rounded-[4px] text-[8px] font-bold uppercase tracking-wider">Desviado</span>}
                                                {isSafe && <span className="bg-sky-500/10 text-sky-600 border border-sky-200/30 px-1.5 py-[2px] rounded-[4px] text-[8px] font-bold uppercase tracking-wider">Refugio</span>}
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="p-5 text-right">
                                        <div className="text-slate-900 font-semibold">{formatCurrency(h.currentValorado)}</div>
                                        <div className="text-[10px] text-slate-400 mt-1">{h.currentPercent.toFixed(1)}% ({h.targetPercent}%)</div>
                                    </td>
                                    
                                    <td className="p-5 text-center">
                                        <div className={`px-2 py-1 font-semibold rounded-md inline-flex items-center text-[10px] ${h.ytdReturn >= 0 ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'}`}>
                                            {isPrivacyMode ? '**.*%' : (h.nav === 0 ? '-' : `${h.ytdReturn >= 0 ? '+' : ''}${h.ytdReturn.toFixed(2)}%`)}
                                        </div>
                                    </td>

                                    <td className="p-5 text-center px-2">
                                        {h.sparklineData && h.sparklineData.length > 0 ? (
                                            <div className="w-full h-8 opacity-70 hover:opacity-100 transition-opacity">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={h.sparklineData} margin={{ top: 5, bottom: 5, left: 2, right: 2 }}>
                                                        <YAxis hide domain={['dataMin', 'dataMax']} />
                                                        <Line type="monotone" dataKey="nav" stroke={h.ytdReturn >= 0 ? '#10b981' : '#ca8a04'} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 text-xs">-</span>
                                        )}
                                    </td>

                                    <td className="p-5 text-center">
                                        <div className={`text-[11px] font-medium ${h.twrAnnual >= 0 ? 'text-slate-700' : 'text-rose-600'}`}>
                                            {isPrivacyMode ? '**.*%' : `${h.twrAnnual >= 0 ? '+' : ''}${h.twrAnnual.toFixed(2)}%`}
                                        </div>
                                    </td>

                                    <td className="p-5 text-center">
                                        <div className={`text-[11px] font-bold ${h.mwrAnnual >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                                            {isPrivacyMode ? '**.*%' : `${h.mwrAnnual >= 0 ? '+' : ''}${h.mwrAnnual.toFixed(2)}%`}
                                        </div>
                                    </td>

                                    <td className="p-5 text-right">
                                        <div className={`inline-flex font-medium items-center gap-2 text-[10px] px-2 py-1 rounded w-fit ml-auto ${
                                            h.rebalanceAmount === 0 ? 'text-slate-400' :
                                            h.rebalanceAmount > 0 ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 
                                            'text-rose-700 bg-rose-50 border border-rose-200'
                                        }`}>
                                            {h.rebalanceAmount !== 0 && <ArrowRightLeft size={9} />}
                                            {isPrivacyMode ? '****' : (h.rebalanceAmount === 0 ? '-' : `${h.rebalanceAmount > 0 ? '+' : ''}${formatCurrency(h.rebalanceAmount)}`)}
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
