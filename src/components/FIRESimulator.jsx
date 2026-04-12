import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { projectWealth } from '../utils/helpers';
import { TrendingUp, ShieldCheck, Zap } from 'lucide-react';

export default function FIRESimulator({ currentPortfolioValue, currentTIR, formatCurrency, isPrivacyMode }) {
    const [monthlyContribution, setMonthlyContribution] = useState(500);
    const [years, setYears] = useState(20);
    const [expectedReturn, setExpectedReturn] = useState(
        currentTIR !== null && currentTIR !== undefined 
            ? parseFloat(currentTIR.toFixed(2)) 
            : 7
    );
    const [inflation, setInflation] = useState(2);

    const projectionData = useMemo(() => {
        return projectWealth(currentPortfolioValue, monthlyContribution, expectedReturn, years, inflation);
    }, [currentPortfolioValue, monthlyContribution, expectedReturn, years, inflation]);

    const finalValueNominal = projectionData[projectionData.length - 1].nominal;
    const finalValueReal = projectionData[projectionData.length - 1].real;

    return (
        <div className="bento-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between gap-8">
                {/* Controls */}
                <div className="w-full md:w-1/3 space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Simulador de Futuro</h2>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Proyección de Libertad Financiera</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold flex justify-between">
                                Aportación Mensual <span>{formatCurrency(monthlyContribution)}</span>
                            </label>
                            <input 
                                type="range" min="0" max="5000" step="50"
                                className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                value={monthlyContribution} onChange={e => setMonthlyContribution(parseInt(e.target.value))}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold flex justify-between">
                                Horizonte (Años) <span>{years} años</span>
                            </label>
                            <input 
                                type="range" min="1" max="50" step="1"
                                className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                value={years} onChange={e => setYears(parseInt(e.target.value))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold">Rentabilidad %</label>
                                <input 
                                    type="number" className="w-full metric-input text-sm"
                                    value={expectedReturn} onChange={e => setExpectedReturn(parseFloat(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold">Inflación %</label>
                                <input 
                                    type="number" className="w-full metric-input text-sm"
                                    value={inflation} onChange={e => setInflation(parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="nano-panel bg-blue-600/5 border-blue-600/10">
                        <div className="flex items-start gap-3">
                            <Zap className="text-blue-600 w-5 h-5 mt-0.5" />
                            <div>
                                <div className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest mb-1">Tu "Bola de Nieve"</div>
                                <div className="text-lg font-black text-slate-900 leading-tight">
                                    {isPrivacyMode ? 'XXXXXX' : formatCurrency(finalValueNominal)}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-1">
                                    Equivale a {isPrivacyMode ? 'XXXX' : formatCurrency(finalValueReal)} de hoy (ajustado infl.)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="w-full md:w-2/3 h-[300px] md:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="year" 
                                stroke="#94a3b8" fontSize={11} fontStyle="italic"
                                tickFormatter={(val) => val === 0 ? 'Hoy' : `Año ${val}`}
                                axisLine={false} tickLine={false}
                            />
                            <YAxis 
                                stroke="#94a3b8" fontSize={11}
                                tickFormatter={(val) => formatCurrency(val).replace('€', '').trim()}
                                axisLine={false} tickLine={false}
                            />
                            <Tooltip 
                                formatter={(value) => formatCurrency(value)}
                                labelFormatter={(label) => `Año ${label}`}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area 
                                type="monotone" dataKey="nominal" name="Valor Nominal" 
                                stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorNominal)" 
                            />
                            <Area 
                                type="monotone" dataKey="real" name="Poder de Compra (Real)" 
                                stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" fill="transparent" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
