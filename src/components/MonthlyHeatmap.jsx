import React from 'react';

export default function MonthlyHeatmap({ monthlyData, isPrivacyMode }) {
    if (!monthlyData || monthlyData.length === 0) return null;

    // Group by year
    const years = [...new Set(monthlyData.map(d => d.year))].sort((a, b) => b - a);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const getCellColor = (val) => {
        if (isPrivacyMode) return 'bg-slate-100 text-transparent';
        if (val > 2) return 'bg-emerald-500 text-white';
        if (val > 0.5) return 'bg-emerald-400 text-white';
        if (val >= 0.05) return 'bg-emerald-100 text-emerald-800';
        if (val > -0.05) return 'bg-slate-50 text-slate-400'; // Flat range
        if (val > -0.5) return 'bg-rose-50 text-rose-800';
        if (val > -2) return 'bg-rose-400 text-white';
        return 'bg-rose-600 text-white';
    };

    return (
        <div className="bento-card p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-sm font-mono tracking-widest uppercase text-slate-500 font-bold">Matriz de Rendimiento Mensual</h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Rentabilidad porcentual por periodo</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-1">
                    <thead>
                        <tr>
                            <th className="p-2 text-[10px] font-mono text-slate-400 uppercase text-left">Año</th>
                            {months.map(m => (
                                <th key={m} className="p-2 text-[10px] font-mono text-slate-400 uppercase text-center min-w-[50px]">{m}</th>
                            ))}
                            <th className="p-2 text-[10px] font-mono text-slate-900 border-l border-slate-200 uppercase text-center bg-slate-50/50 rounded-tr-lg">YTD</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs font-mono">
                        {years.map(year => {
                            const yearData = monthlyData.filter(d => d.year === year);
                            let ytd = 1;

                            return (
                                <tr key={year} className="group">
                                    <td className="p-2 font-bold text-slate-700 bg-slate-50/50 rounded-l-lg">{year}</td>
                                    {Array.from({ length: 12 }).map((_, i) => {
                                        const monthData = yearData.find(d => d.month === i);
                                        const val = monthData ? monthData.return : null;
                                        
                                        if (val !== null) {
                                            ytd *= (1 + val / 100);
                                        }

                                        return (
                                            <td key={i} className={`p-2 text-center rounded-md transition-all duration-300 font-bold ${val !== null ? getCellColor(val) : 'bg-slate-50/30 text-slate-200'}`}>
                                                {val !== null ? (isPrivacyMode ? '•.••' : `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`) : '-'}
                                            </td>
                                        );
                                    })}
                                    <td className={`p-2 text-center font-black border-l border-slate-200 bg-slate-50/80 rounded-r-lg ${isPrivacyMode ? '' : (ytd - 1 >= 0 ? 'text-emerald-700' : 'text-rose-700')}`}>
                                        {yearData.length > 0 ? (isPrivacyMode ? '••.••' : `${ytd - 1 >= 0 ? '+' : ''}${((ytd - 1) * 100).toFixed(2)}%`) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex items-center gap-4 text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-600"></span> Crítico</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-50 border border-rose-200"></span> Negativo</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-slate-50"></span> Plano</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-100"></span> Positivo</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500"></span> Fuerte</div>
            </div>
        </div>
    );
}
