import React, { useState, useMemo } from 'react';
import { Target, ArrowUpCircle, Info, Calculator, CheckCircle2 } from 'lucide-react';
import { getMatchingFundKey } from '../utils/helpers';

export default function SmartAssistant({ currentHoldings, totalCarteraValorada, fundConfigs, formatCurrency, currentNavs }) {
    const [investmentAmount, setInvestmentAmount] = useState(1000);

    const rebalancePlan = useMemo(() => {
        if (!totalCarteraValorada && investmentAmount <= 0) return [];
        
        const newTotal = (totalCarteraValorada || 0) + investmentAmount;
        const plan = [];

        Object.entries(fundConfigs).forEach(([name, cfg]) => {
            if (!cfg.targetPercent || cfg.targetPercent <= 0) return;
            
            const data = currentHoldings[name];
            let currentMarketValue = 0;

            if (data) {
                if (data.isDeposit) {
                    currentMarketValue = data.invested; // Deposits stay at cost for rebalancing
                } else {
                    const matchKey = getMatchingFundKey(currentNavs, name);
                    const nav = currentNavs[matchKey] || (data.shares > 0 ? (data.invested / data.shares) : 0);
                    currentMarketValue = data.shares * nav;
                }
            }
            
            const targetValuation = newTotal * (cfg.targetPercent / 100);
            const needed = targetValuation - currentMarketValue;

            if (needed > 0) {
                plan.push({ name, amount: needed, percentage: cfg.targetPercent });
            }
        });

        // Normalize so total matches investmentAmount if we only buy
        const totalNeeded = plan.reduce((sum, p) => sum + p.amount, 0);
        
        if (totalNeeded <= 0) return [];

        return plan.map(p => ({
            ...p,
            optimizedAmount: (p.amount / totalNeeded) * investmentAmount
        })).filter(p => p.optimizedAmount > 0.01) // Ignore dust
           .sort((a, b) => b.optimizedAmount - a.optimizedAmount);

    }, [currentHoldings, totalCarteraValorada, fundConfigs, investmentAmount, currentNavs]);

    return (
        <div className="bento-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                    <Calculator size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Asistente de Inversión</h2>
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-[0.2em] mt-0.5">Optimización de Rebalanceo</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div className="nano-panel bg-slate-50 border-slate-200">
                        <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 font-bold">Importe a Invertir</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-lg">€</span>
                            <input 
                                type="number" 
                                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-4 text-2xl font-black text-slate-900 focus:border-blue-600 outline-none transition-all shadow-inner"
                                value={investmentAmount}
                                onChange={e => setInvestmentAmount(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                        <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                            Este asistente calcula la distribución óptima de tu nueva aportación para acercar tu cartera lo máximo posible al <strong>% Objetivo</strong> definido en ajustes.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
                        <ArrowUpCircle size={12} /> Orden sugerida de compra
                    </h3>
                    
                    <div className="space-y-3">
                        {rebalancePlan.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
                                <CheckCircle2 size={24} className="mx-auto text-emerald-300 mb-2" />
                                <p className="text-xs text-slate-400 font-mono">Cartera perfectamente balanceada</p>
                            </div>
                        ) : (
                            rebalancePlan.map((step, idx) => (
                                <div key={step.name} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-slate-200 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-800 line-clamp-1">{step.name}</div>
                                            <div className="text-[9px] text-slate-400 font-mono">Deseado: {step.percentage}%</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-slate-900">{formatCurrency(step.optimizedAmount)}</div>
                                        <div className="text-[9px] text-emerald-500 font-mono font-bold uppercase tracking-tighter">Comprar</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
