import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { Target, Activity, Zap, Shield, Search } from 'lucide-react';

// Métricas de prueba para alimentar el gráfico de radar (copo de nieve)
const MOCK_FUND_METRICS = {
    'La Française Trésorerie ISR R': { Rentabilidad: 25, BajoRiesgo: 95, BajasComisiones: 80, Consistencia: 90, Liquidez: 100, momentum: 3.5 },
    'Groupama Trésorerie IC': { Rentabilidad: 20, BajoRiesgo: 98, BajasComisiones: 85, Consistencia: 95, Liquidez: 100, momentum: 3.1 },
    'Vanguard Glb Stk Idx': { Rentabilidad: 90, BajoRiesgo: 30, BajasComisiones: 95, Consistencia: 60, Liquidez: 90, momentum: 8.5 },
    'Vanguard Global Bd Idx': { Rentabilidad: 40, BajoRiesgo: 80, BajasComisiones: 90, Consistencia: 85, Liquidez: 90, momentum: 4.2 },
    'Myinvestor S&P500 Equiponderado FI': { Rentabilidad: 85, BajoRiesgo: 35, BajasComisiones: 85, Consistencia: 65, Liquidez: 85, momentum: 8.0 }
};

const DEFAULT_METRICS = { Rentabilidad: 50, BajoRiesgo: 50, BajasComisiones: 50, Consistencia: 50, Liquidez: 50, momentum: 5.0 };

export default function Simulation({ formatCurrency, isPrivacyMode }) {
    const [fundA, setFundA] = useState('La Française Trésorerie ISR R');
    const [fundB, setFundB] = useState('Vanguard Glb Stk Idx');
    
    const [initialCapital, setInitialCapital] = useState(10000);
    const [years, setYears] = useState(10);

    const availableFunds = Object.keys(MOCK_FUND_METRICS);

    const radarData = useMemo(() => {
        const metricsA = MOCK_FUND_METRICS[fundA] || DEFAULT_METRICS;
        const metricsB = MOCK_FUND_METRICS[fundB] || DEFAULT_METRICS;

        return [
            { subject: 'Rentabilidad Esperada', A: metricsA.Rentabilidad, B: metricsB.Rentabilidad, fullMark: 100 },
            { subject: 'Bajo Riesgo', A: metricsA.BajoRiesgo, B: metricsB.BajoRiesgo, fullMark: 100 },
            { subject: 'Bajas Comisiones', A: metricsA.BajasComisiones, B: metricsB.BajasComisiones, fullMark: 100 },
            { subject: 'Consistencia', A: metricsA.Consistencia, B: metricsB.Consistencia, fullMark: 100 },
            { subject: 'Liquidez', A: metricsA.Liquidez, B: metricsB.Liquidez, fullMark: 100 },
        ];
    }, [fundA, fundB]);

    const projectedData = useMemo(() => {
        const data = [];
        const rateA = (MOCK_FUND_METRICS[fundA]?.momentum || 5) / 100;
        const rateB = (MOCK_FUND_METRICS[fundB]?.momentum || 5) / 100;
        
        for (let y = 0; y <= years; y++) {
            data.push({
                year: `Año ${y}`,
                fundA_Val: initialCapital * Math.pow(1 + rateA, y),
                fundB_Val: initialCapital * Math.pow(1 + rateB, y)
            });
        }
        return data;
    }, [fundA, fundB, initialCapital, years]);

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <header className="mb-10 pl-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                    <Target className="text-blue-500 w-8 h-8" /> Comparador y Simulación (Matrix)
                </h1>
                <p className="text-slate-500 mt-2">Analiza los atributos de tus fondos en gráficos de copo de nieve (Radar) y simula sus escenarios de hiper-crecimiento histórico.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* SELECTORES Y CONTROLES (Columna Izquierda 4) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bento-card p-6 bg-white border border-slate-200">
                        <div className="text-[10px] font-mono tracking-widest text-slate-400 mb-4 uppercase">Escenario a Simular</div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-2">Capital Inicial a Proyectar</label>
                                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50" value={initialCapital} onChange={e => setInitialCapital(Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-2 flex justify-between">
                                    Horizonte Temporal <span>{years} años</span>
                                </label>
                                <input type="range" min="1" max="30" value={years} onChange={e => setYears(Number(e.target.value))} className="w-full accent-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bento-card p-6 bg-slate-900 border border-slate-800 text-white">
                        <div className="text-[10px] font-mono tracking-widest text-blue-400 mb-5 uppercase flex items-center gap-2"><Zap size={14}/> Combate de Activos</div>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2">Activo Principal (A)</label>
                                <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={fundA} onChange={e => setFundA(e.target.value)}>
                                    {availableFunds.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-center -my-2 opacity-50"><Shield size={16}/></div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2">Activo Retador (B)</label>
                                <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={fundB} onChange={e => setFundB(e.target.value)}>
                                    {availableFunds.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* GRÁFICOS (Columna Derecha 8) */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* COPO DE NIEVE (RADAR) */}
                        <div className="bento-card p-6 bg-white border border-slate-200 min-h-[350px] flex flex-col">
                            <h3 className="font-semibold text-slate-800 mb-2">Atributos del Activo (Copo de Nieve)</h3>
                            <p className="text-xs text-slate-500 mb-4 font-mono">Comparativa de Perfiles de Inversión</p>
                            <div className="flex-1 w-full min-h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name={fundA} dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                        <Radar name={fundB} dataKey="B" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                        <RechartsTooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* SUMMARY Kpis */}
                        <div className="bento-card p-4 bg-slate-50 text-slate-900 border border-slate-200 flex flex-col justify-center gap-4">
                            <div className="p-5 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <div className="text-[10px] font-mono text-slate-400 capitalize bg-slate-100 px-2 py-1 rounded w-max mb-3 tracking-widest">{fundA.substring(0, 20)}...</div>
                                <div className="text-xs text-slate-500 mb-1">Valor Potencial Final ({years} Años)</div>
                                <div className="text-3xl font-black text-blue-600 tracking-tighter">
                                    {isPrivacyMode ? '***' : formatCurrency(projectedData[projectedData.length - 1].fundA_Val)}
                                </div>
                            </div>
                            
                            <div className="p-5 bg-white rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full" />
                                <div className="text-[10px] font-mono text-slate-400 capitalize bg-slate-100 px-2 py-1 rounded w-max mb-3 tracking-widest relative z-10">{fundB.substring(0, 20)}...</div>
                                <div className="text-xs text-slate-500 mb-1 relative z-10">Valor Potencial Final ({years} Años)</div>
                                <div className="text-3xl font-black text-indigo-600 tracking-tighter relative z-10">
                                    {isPrivacyMode ? '***' : formatCurrency(projectedData[projectedData.length - 1].fundB_Val)}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* PROYECCIÓN */}
                    <div className="bento-card p-6 bg-white border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-2">Simulación de Interés Compuesto</h3>
                        <div className="h-[280px] w-full mt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projectedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <RechartsTooltip 
                                        formatter={(val) => formatCurrency(val)}
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="fundA_Val" name={fundA} stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorA)" />
                                    <Area type="monotone" dataKey="fundB_Val" name={fundB} stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorB)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
