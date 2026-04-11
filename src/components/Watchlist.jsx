import React, { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, AreaChart, Area,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
    Plus, Trash2, RefreshCw, TrendingUp, TrendingDown,
    Eye, EyeOff, BookOpen, Loader2, AlertCircle, Calculator,
    ChevronDown, ChevronUp, X
} from 'lucide-react';
import { fetchNavHistory, resolveFromIsin } from '../utils/navApi';
import { calculateMWR } from '../utils/helpers';

// ── Helpers ──────────────────────────────────────────────────────────────────

// Helpers removed and moved to utils/navApi.js

const calcPerf = (history) => {
    if (!history || history.length < 2) return { ytd: null, oneYear: null, threeYear: null, sinceStart: null, latest: null, startNav: null };
    const now = new Date();
    const latest = history[history.length - 1][1];
    const startNav = history[0][1];

    const findClosest = (targetMs) => {
        let best = null;
        for (const [ts, nav] of history) {
            if (ts <= targetMs) best = nav;
            else break;
        }
        return best;
    };

    const ytdTarget = new Date(now.getFullYear(), 0, 1).getTime();
    const oneYearTarget = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime();
    const threeYearTarget = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()).getTime();

    const navYtd = findClosest(ytdTarget);
    const nav1y = findClosest(oneYearTarget);
    const nav3y = findClosest(threeYearTarget);

    return {
        latest,
        startNav,
        ytd: navYtd ? ((latest - navYtd) / navYtd) * 100 : null,
        oneYear: nav1y ? ((latest - nav1y) / nav1y) * 100 : null,
        threeYear: nav3y ? ((latest - nav3y) / nav3y) * 100 : null,
        sinceStart: ((latest - startNav) / startNav) * 100,
    };
};

const buildChartData = (history, periodMonths = 12) => {
    if (!history || history.length === 0) return [];
    const cutoffMs = Date.now() - periodMonths * 30.44 * 24 * 3600 * 1000;
    const filtered = history.filter(([ts]) => ts >= cutoffMs);
    const data = (filtered.length > 0 ? filtered : history).map(([ts, nav]) => ({
        date: new Date(ts).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        nav,
        ts,
    }));
    // Sample to max 120 points for performance
    if (data.length > 120) {
        const step = Math.ceil(data.length / 120);
        return data.filter((_, i) => i % step === 0 || i === data.length - 1);
    }
    return data;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function PerfBadge({ value, label }) {
    if (value === null || value === undefined) return (
        <div className="flex flex-col items-center">
            <span className="text-[10px] text-gray-600 uppercase font-semibold mb-0.5">{label}</span>
            <span className="text-xs text-gray-600">—</span>
        </div>
    );
    const isPos = value >= 0;
    return (
        <div className="flex flex-col items-center">
            <span className="text-[10px] text-gray-500 uppercase font-semibold mb-0.5">{label}</span>
            <span className={`text-sm font-bold ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                {isPos ? '+' : ''}{value.toFixed(2)}%
            </span>
        </div>
    );
}

function Sparkline({ data, color }) {
    if (!data || data.length < 2) return null;
    return (
        <ResponsiveContainer width="100%" height={60}>
            <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <YAxis hide={true} domain={['auto', 'auto']} />
                <Line type="monotone" dataKey="nav" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
        </ResponsiveContainer>
    );
}

function FundCard({ fund, onDelete, isPrivacyMode, orders }) {
    const [expanded, setExpanded] = useState(false);
    const [period, setPeriod] = useState(12);
    const [simMode, setSimMode] = useState('fixed'); // 'fixed' | 'portfolio'
    const [simAmount, setSimAmount] = useState('10000');

    const perf = calcPerf(fund.history);
    const chartData = buildChartData(fund.history, period);
    const sparklineData = buildChartData(fund.history, 12);
    
    const isYtdPos = perf.ytd !== null && perf.ytd >= 0;
    const sparklineIsPos = sparklineData.length > 1 ? sparklineData[sparklineData.length - 1].nav >= sparklineData[0].nav : true;
    const sparklineColor = sparklineIsPos ? '#22c55e' : '#ef4444';
    
    const chartIsPos = chartData.length > 1 ? chartData[chartData.length - 1].nav >= chartData[0].nav : true;
    const chartColor = chartIsPos ? '#22c55e' : '#ef4444';

    // Simulator: if you invested simAmount at the start of the chosen period
    const simResult = (() => {
        if (!fund.history || !simAmount || isNaN(parseFloat(simAmount))) return null;
        const cutoffMs = Date.now() - period * 30.44 * 24 * 3600 * 1000;
        const slice = fund.history.filter(([ts]) => ts >= cutoffMs);
        if (slice.length < 2) return null;
        const navStart = slice[0][1];
        const navEnd = slice[slice.length - 1][1];
        const amount = parseFloat(simAmount);
        const shares = amount / navStart;
        const endValue = shares * navEnd;
        return { gain: endValue - amount, pct: ((endValue - amount) / amount) * 100, endValue };
    })();

    // Simulator: simulate user's real portfolio orders on this fund
    const portfolioSimResult = (() => {
        if (!orders || orders.length === 0 || !fund.history || fund.history.length < 2) return null;
        
        let virtualShares = 0;
        let totalInvested = 0;
        
        // We ensure chronological order as App.jsx orders are reversed (newest first)
        const chronoOrders = [...orders].reverse().filter(o => ['buy', 'sell', 'deposit'].includes(o.type));
        
        const getNavAtDate = (dateStr) => {
            const targetMs = new Date(dateStr).getTime();
            let bestNav = null;
            for (let i = 0; i < fund.history.length; i++) {
                 if (fund.history[i][0] <= targetMs) bestNav = fund.history[i][1];
                 else break;
            }
            return bestNav || fund.history[0][1];
        };

        const cashFlows = [];

        for (const order of chronoOrders) {
            const nav = getNavAtDate(order.date);
            if (order.type === 'buy' || order.type === 'deposit') {
                virtualShares += order.amount / nav;
                totalInvested += order.amount;
                cashFlows.push({ date: order.date, amount: order.amount, type: 'buy' });
            } else if (order.type === 'sell') {
                const soldShares = order.amount / nav;
                virtualShares -= soldShares;
                totalInvested -= order.amount;
                cashFlows.push({ date: order.date, amount: order.amount, type: 'sell' });
            }
        }
        
        if (virtualShares < 0) virtualShares = 0;

        const finalNav = fund.history[fund.history.length - 1][1];
        const endValue = virtualShares * finalNav;
        const gain = endValue - totalInvested;
        const pct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
        const mwr = calculateMWR(cashFlows, endValue);

        return { endValue, gain, pct, mwr };
    })();

    return (
        <div className={`bg-[#161616] border rounded-2xl overflow-hidden transition-all duration-300 ${fund.error ? 'border-red-800/50' : 'border-gray-800 hover:border-gray-700'}`}>
            {/* Header */}
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2" title={fund.name}>
                            {fund.name}
                        </h3>
                        <p className="text-[11px] text-gray-600 font-mono mt-0.5">{fund.isin || fund.morningstarId}</p>
                    </div>
                    {fund.loading ? (
                        <Loader2 size={16} className="text-blue-400 animate-spin mt-0.5 shrink-0" />
                    ) : fund.error ? (
                        <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" title={fund.error} />
                    ) : (
                        <div className="text-right shrink-0">
                            <div className="text-xl font-bold text-white">
                                {isPrivacyMode ? 'XXXX' : (perf.latest ? perf.latest.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—')}
                            </div>
                            <div className={`text-[11px] font-semibold ${isYtdPos ? 'text-green-400' : 'text-red-400'}`}>
                                {perf.ytd !== null ? `${isYtdPos ? '▲' : '▼'} ${Math.abs(perf.ytd).toFixed(2)}% YTD` : ''}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sparkline */}
                {!fund.loading && !fund.error && fund.history && (
                    <div className="mb-4">
                        <Sparkline data={sparklineData} color={sparklineColor} />
                    </div>
                )}

                {/* Performance badges */}
                {!fund.loading && !fund.error && (
                    <div className="grid grid-cols-4 gap-2 py-3 border-t border-gray-800/60">
                        <PerfBadge value={perf.ytd} label="YTD" />
                        <PerfBadge value={perf.oneYear} label="1 Año" />
                        <PerfBadge value={perf.threeYear} label="3 Años" />
                        <PerfBadge value={perf.sinceStart} label="Inicio" />
                    </div>
                )}

                {fund.error && (
                    <p className="text-xs text-red-400/80 mt-2">{fund.error}</p>
                )}
            </div>

            {/* Expand / collapse */}
            {!fund.loading && !fund.error && (
                <>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-600 hover:text-gray-400 border-t border-gray-800/60 transition-colors"
                    >
                        {expanded ? <><ChevronUp size={14} /> Menos detalle</> : <><ChevronDown size={14} /> Más detalle y simulador</>}
                    </button>

                    {expanded && (
                        <div className="px-5 pb-5 border-t border-gray-800/60">
                            {/* Period selector */}
                            <div className="flex items-center gap-2 mt-4 mb-3">
                                <span className="text-xs text-gray-500 font-semibold uppercase">Período</span>
                                <div className="flex gap-1 ml-auto">
                                    {[
                                        { label: '1S', val: 0.25 },
                                        { label: '1M', val: 1 },
                                        { label: '3M', val: 3 },
                                        { label: '6M', val: 6 }, 
                                        { label: '1A', val: 12 }, 
                                        { label: '2A', val: 24 }, 
                                        { label: 'MAX', val: 999 }
                                    ].map(p => (
                                        <button
                                            key={p.val}
                                            onClick={() => setPeriod(p.val)}
                                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${period === p.val ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Full chart */}
                            <div className="h-[180px] w-full mb-5">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id={`grad-${fund.morningstarId}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                        <XAxis dataKey="date" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} minTickGap={40} />
                                        <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} width={60}
                                            domain={['auto', 'auto']}
                                            tickFormatter={v => v.toLocaleString('es-ES', { maximumFractionDigits: 0 })} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                                            formatter={(v) => [v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €', 'NAV']}
                                        />
                                        <Area type="monotone" dataKey="nav" stroke={chartColor} strokeWidth={2}
                                            fill={`url(#grad-${fund.morningstarId})`} fillOpacity={1} dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Simulator */}
                            <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Calculator size={14} className="text-purple-400" />
                                        <span className="text-xs font-semibold text-gray-400 uppercase">Simulador de Inversión</span>
                                    </div>
                                    <div className="flex bg-gray-800/80 rounded-lg p-0.5 border border-gray-700/50">
                                        <button onClick={() => setSimMode('fixed')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${simMode === 'fixed' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'}`}>Aporte Fijo</button>
                                        <button onClick={() => setSimMode('portfolio')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${simMode === 'portfolio' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'}`}>Toda mi Cartera</button>
                                    </div>
                                </div>

                                {simMode === 'fixed' ? (
                                    <>
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-xs text-gray-500">Si hubieras depositado</span>
                                            <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden">
                                                <input type="number" value={simAmount} onChange={e => setSimAmount(e.target.value)} className="bg-transparent px-3 py-1.5 text-sm text-white w-28 focus:outline-none" placeholder="10000" />
                                                <span className="px-2 text-gray-500 text-sm bg-gray-800 py-1.5">€</span>
                                            </div>
                                            <span className="text-xs text-gray-500">hace {period >= 999 ? 'todo el historial' : `${period >= 12 ? period / 12 + ' año' + (period > 12 ? 's' : '') : period + ' meses'}`}</span>
                                        </div>
                                        {simResult ? (
                                            <div className="flex items-baseline gap-4 mt-4">
                                                <div>
                                                    <div className="text-[10px] text-gray-600 uppercase font-semibold mb-0.5">Valor final</div>
                                                    <div className="text-lg font-bold text-white">{isPrivacyMode ? 'XXXX €' : simResult.endValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-gray-600 uppercase font-semibold mb-0.5">Beneficio</div>
                                                    <div className={`text-base font-bold ${simResult.gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {isPrivacyMode ? 'XXXX €' : `${simResult.gain >= 0 ? '+' : ''}${simResult.gain.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-gray-600 uppercase font-semibold mb-0.5">Rentabilidad</div>
                                                    <div className={`text-base font-bold ${simResult.pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {simResult.pct >= 0 ? '+' : ''}{simResult.pct.toFixed(2)}%
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-600">Introduce un importe para simular.</p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs text-gray-400 mb-3">
                                            Simula qué habría pasado si <strong className="text-purple-400">todas las operaciones históricas de tu cartera real</strong> (compras, ventas y depósitos) las hubieras hecho en este fondo de forma sincronizada, para comparar el TIR Anualizado.
                                        </p>
                                        {portfolioSimResult ? (
                                            <div className="flex items-baseline gap-4 mt-4 p-3 bg-black/20 rounded-lg border border-gray-800/80">
                                                <div>
                                                    <div className="text-[10px] text-gray-500 uppercase font-semibold mb-0.5">Valor Total Simulado</div>
                                                    <div className="text-xl font-bold text-white">{isPrivacyMode ? 'XXXX €' : portfolioSimResult.endValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-purple-400/80 uppercase font-bold mb-0.5">TIR Anual Comparativo</div>
                                                    <div className={`text-lg font-bold ${portfolioSimResult.mwr >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                                                        {portfolioSimResult.mwr >= 0 ? '+' : ''}{portfolioSimResult.mwr.toFixed(2)}% anual
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-amber-500">Aún no hay caja suficiente en tu cartera global para simular.</p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Delete button */}
            <div className="px-5 pb-4 flex justify-end">
                <button
                    onClick={() => onDelete(fund.morningstarId)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors py-1 px-2 rounded hover:bg-red-400/10"
                >
                    <Trash2 size={12} /> Eliminar
                </button>
            </div>
        </div>
    );
}

// ── Add Fund Modal ────────────────────────────────────────────────────────────

// resolveFromIsin removed and moved to utils/navApi.js

function AddFundModal({ onClose, onAdd }) {
    const [name, setName] = useState('');
    const [isin, setIsin] = useState('');
    const [resolvedMsId, setResolvedMsId] = useState('');
    const [resolveState, setResolveState] = useState('idle'); // idle | loading | found | error
    const [error, setError] = useState('');
    const [manualMsId, setManualMsId] = useState('');
    const [showManualFallback, setShowManualFallback] = useState(false);
    const debounceRef = React.useRef(null);

    // Auto-resolve name + Morningstar ID when ISIN changes
    const handleIsinChange = (e) => {
        const val = e.target.value.trim().toUpperCase();
        setIsin(val);
        setResolveState('idle');
        setResolvedMsId('');
        setShowManualFallback(false);
        clearTimeout(debounceRef.current);

        // ISIN: 2 letters + 10 alphanumeric = 12 chars
        if (val.length < 8) return;

        setResolveState('loading');
        debounceRef.current = setTimeout(async () => {
            try {
                const { name: resolvedName, morningstarId } = await resolveFromIsin(val);
                setName(resolvedName);
                setResolvedMsId(morningstarId);
                setResolveState('found');
            } catch {
                setResolveState('error');
                setShowManualFallback(true);
            }
        }, 600);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isin.trim()) { setError('Introduce el ISIN del fondo.'); return; }

        const finalMsId = resolvedMsId || manualMsId.trim().toUpperCase();
        if (!finalMsId) { setError('Introduce el ID de Morningstar manualmente.'); return; }
        if (!name.trim()) { setError('Introduce el nombre del fondo.'); return; }
        onAdd({ name: name.trim(), isin: isin.trim(), morningstarId: finalMsId });
        onClose();
    };

    const resolveIcon = {
        idle: null,
        loading: <Loader2 size={14} className="animate-spin text-blue-400" />,
        found: <span className="text-green-400 text-xs font-bold">✓ Encontrado</span>,
        error: <span className="text-amber-400 text-xs">No encontrado automáticamente</span>,
    }[resolveState];

    const canSubmit = resolveState !== 'loading' && isin.trim().length >= 8 &&
        name.trim() && (resolvedMsId || manualMsId.trim());

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white">Añadir fondo a la watchlist</h2>
                    <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* ISIN — primary input */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase">ISIN del fondo</label>
                            <div className="flex items-center gap-1">{resolveIcon}</div>
                        </div>
                        <input
                            value={isin}
                            onChange={handleIsinChange}
                            placeholder="Ej: FR0010026195"
                            maxLength={12}
                            className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-blue-500 transition-colors"
                            autoFocus
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <p className="text-[11px] text-gray-600 mt-1.5">
                            El ISIN tiene 12 caracteres — ej: <span className="font-mono text-gray-500">FR0010026195</span>
                        </p>
                    </div>

                    {/* Fallback: manual Morningstar ID when ISIN not found */}
                    {showManualFallback && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                            <p className="text-xs text-amber-400/90 mb-3">
                                ⚠️ No se encontró este ISIN automáticamente. Puedes introducir el ID de Morningstar manualmente (lo encontrarás en la URL de la ficha del fondo en morningstar.es):
                            </p>
                            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">ID de Morningstar</label>
                            <input
                                value={manualMsId}
                                onChange={e => setManualMsId(e.target.value.trim().toUpperCase())}
                                placeholder="Ej: F0GBR06OZK"
                                className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors"
                                spellCheck={false}
                            />
                            <p className="text-[11px] text-gray-600 mt-1.5 font-mono">
                                <span className="text-gray-500">morningstar.es/...?id=<strong>XXXXXXXX</strong></span>
                            </p>
                        </div>
                    )}

                    {/* Name — auto-filled, always editable */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                            Nombre del fondo
                            <span className="normal-case font-normal text-gray-600 ml-1">(editable)</span>
                        </label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={resolveState === 'loading' ? 'Buscando fondo...' : 'Se rellenará automáticamente o escríbelo'}
                            className={`w-full bg-[#111] border rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors ${
                                resolveState === 'found' ? 'border-green-700/60 focus:border-green-500' : 'border-gray-800 focus:border-blue-500'
                            }`}
                            disabled={resolveState === 'loading'}
                        />
                        {resolvedMsId && (
                            <p className="text-[11px] text-gray-600 mt-1.5 font-mono">
                                ID Morningstar: <span className="text-gray-500">{resolvedMsId}</span>
                            </p>
                        )}
                    </div>

                    {error && <p className="text-xs text-red-400">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition-colors text-sm font-medium">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Añadir fondo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main Watchlist Component ──────────────────────────────────────────────────

export default function Watchlist({ isPrivacyMode, externalHistoricalNavs, isUpdatingGlobal, orders }) {
    const STORAGE_KEY = 'fund-watchlist-v1';

    const [watchlist, setWatchlist] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch { return []; }
    });
    // fundData: { [morningstarId]: { history, loading, error } }
    const [fundData, setFundData] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [globalRefreshing, setGlobalRefreshing] = useState(false);

    // Persist watchlist definitions
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    }, [watchlist]);

    const loadFund = useCallback(async (morningstarId) => {
        setFundData(prev => ({ ...prev, [morningstarId]: { ...(prev[morningstarId] || {}), loading: true, error: null } }));
        try {
            const history = await fetchNavHistory(morningstarId);
            setFundData(prev => ({ ...prev, [morningstarId]: { history, loading: false, error: null } }));
        } catch (err) {
            setFundData(prev => ({ ...prev, [morningstarId]: { history: null, loading: false, error: 'No se pudo cargar el fondo. Comprueba el ID de Morningstar.' } }));
        }
    }, []);

    // Sync with global background updates
    useEffect(() => {
        if (externalHistoricalNavs) {
            setFundData(prev => {
                const updated = { ...prev };
                let changed = false;
                Object.entries(externalHistoricalNavs).forEach(([id, history]) => {
                    // Only update if we don't have it or if it's currently showing loading/error from a previous attempt
                    if (!updated[id] || (!updated[id].history && !updated[id].loading)) {
                        updated[id] = { history, loading: false, error: null };
                        changed = true;
                    } else if (updated[id].history !== history) {
                         // Update if history object changed (new data)
                         updated[id] = { ...updated[id], history, loading: false, error: null };
                         changed = true;
                    }
                });
                return changed ? updated : prev;
            });
        }
    }, [externalHistoricalNavs]);

    // Regular mount effects and additions
    useEffect(() => {
        watchlist.forEach(f => {
            // Load if not in global and not in local
            if (!fundData[f.morningstarId] && (!externalHistoricalNavs || !externalHistoricalNavs[f.morningstarId])) {
                loadFund(f.morningstarId);
            }
        });
    }, [watchlist, externalHistoricalNavs]);

    const handleAdd = ({ name, morningstarId }) => {
        if (watchlist.some(f => f.morningstarId === morningstarId)) return;
        setWatchlist(prev => [...prev, { name, morningstarId }]);
        loadFund(morningstarId);
    };

    const handleDelete = (morningstarId) => {
        setWatchlist(prev => prev.filter(f => f.morningstarId !== morningstarId));
        setFundData(prev => { const n = { ...prev }; delete n[morningstarId]; return n; });
    };

    const handleRefreshAll = async () => {
        setGlobalRefreshing(true);
        await Promise.all(watchlist.map(f => loadFund(f.morningstarId)));
        setGlobalRefreshing(false);
    };

    const mergedFunds = watchlist.map(f => ({
        ...f,
        ...(fundData[f.morningstarId] || { loading: true, error: null, history: null }),
    }));

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <header className="mb-8 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
                        <BookOpen size={28} className="text-purple-400" />
                        Watchlist
                    </h1>
                    <p className="text-gray-400 text-sm">Fondos en seguimiento — sin impacto en tu portfolio real</p>
                </div>
                <div className="flex items-center gap-2">
                    {watchlist.length > 0 && (
                        <button
                            onClick={handleRefreshAll}
                            disabled={globalRefreshing || isUpdatingGlobal}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition-colors text-sm disabled:opacity-50"
                        >
                            <RefreshCw size={15} className={globalRefreshing || isUpdatingGlobal ? 'animate-spin' : ''} />
                            {isUpdatingGlobal ? 'Actualización global...' : 'Actualizar'}
                        </button>
                    )}
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-b from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(147,51,234,0.25)]"
                    >
                        <Plus size={16} /> Añadir fondo
                    </button>
                </div>
            </header>

            {/* Summary row */}
            {mergedFunds.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <div className="bg-[#161616] border border-gray-800 rounded-xl p-4">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Fondos seguidos</div>
                        <div className="text-2xl font-bold text-white">{watchlist.length}</div>
                    </div>
                    {(() => {
                        const loaded = mergedFunds.filter(f => f.history && !f.loading);
                        if (loaded.length === 0) return null;
                        const perfs = loaded.map(f => calcPerf(f.history));
                        const avgYtd = perfs.filter(p => p.ytd !== null).reduce((s, p, _, a) => s + p.ytd / a.length, 0);
                        const best = loaded.reduce((b, f) => {
                            const p = calcPerf(f.history);
                            return (p.ytd !== null && (b === null || p.ytd > calcPerf(b.history).ytd)) ? f : b;
                        }, null);
                        const worst = loaded.reduce((w, f) => {
                            const p = calcPerf(f.history);
                            return (p.ytd !== null && (w === null || p.ytd < calcPerf(w.history).ytd)) ? f : w;
                        }, null);
                        return (
                            <>
                                <div className="bg-[#161616] border border-gray-800 rounded-xl p-4">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Media YTD</div>
                                    <div className={`text-2xl font-bold ${avgYtd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {avgYtd >= 0 ? '+' : ''}{avgYtd.toFixed(2)}%
                                    </div>
                                </div>
                                {best && <div className="bg-[#161616] border border-gray-800 rounded-xl p-4">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><TrendingUp size={10} className="text-green-400" />Mejor YTD</div>
                                    <div className="text-sm font-bold text-white truncate" title={best.name}>{best.name}</div>
                                    <div className="text-green-400 text-xs font-semibold">+{calcPerf(best.history).ytd?.toFixed(2)}%</div>
                                </div>}
                                {worst && loaded.length > 1 && <div className="bg-[#161616] border border-gray-800 rounded-xl p-4">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><TrendingDown size={10} className="text-red-400" />Peor YTD</div>
                                    <div className="text-sm font-bold text-white truncate" title={worst.name}>{worst.name}</div>
                                    <div className="text-red-400 text-xs font-semibold">{calcPerf(worst.history).ytd?.toFixed(2)}%</div>
                                </div>}
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Fund cards grid */}
            {mergedFunds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
                        <BookOpen size={32} className="text-purple-400/60" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">Tu watchlist está vacía</h3>
                    <p className="text-sm text-gray-600 max-w-xs mb-6">
                        Añade fondos que estés estudiando para ver su evolución histórica y simular rentabilidades.
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors"
                    >
                        <Plus size={16} /> Añadir primer fondo
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {mergedFunds.map(fund => (
                        <FundCard
                            key={fund.morningstarId}
                            fund={fund}
                            onDelete={handleDelete}
                            isPrivacyMode={isPrivacyMode}
                            orders={orders}
                        />
                    ))}
                </div>
            )}

            {showModal && <AddFundModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
        </div>
    );
}
