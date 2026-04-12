import React, { useMemo } from 'react';
import { calculateCorrelation } from '../utils/helpers';
import { Info } from 'lucide-react';

export default function CorrelationMatrix({ historicalNavs, isPrivacyMode }) {
    const matrix = useMemo(() => calculateCorrelation(historicalNavs), [historicalNavs]);

    if (!matrix) return null;

    const funds = Object.keys(matrix);
    
    const getCorrelationColor = (val) => {
        if (val === null) return 'bg-slate-50 text-slate-200';
        if (val > 0.8) return 'bg-rose-500 text-white'; // High correlation = bad for diversification
        if (val > 0.5) return 'bg-amber-400 text-white';
        if (val > 0.2) return 'bg-emerald-200 text-emerald-800';
        if (val > -0.2) return 'bg-emerald-500 text-white'; // Low correlation = good
        return 'bg-blue-600 text-white'; // Negative correlation = great
    };

    return (
        <div className="bento-card p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-sm font-mono tracking-widest uppercase text-slate-500 font-bold">Matriz de Correlación</h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Sincronía de movimientos (últimos 180 días)</p>
                </div>
                <div className="group relative">
                    <Info size={14} className="text-slate-300 cursor-help" />
                    <div className="absolute right-0 top-6 w-64 p-3 bg-slate-900 text-[10px] text-white rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-mono">
                        Indica cuánto se parecen los movimientos de tus fondos. 
                        <br/><br/>
                        • <span className="text-rose-400">0.8 a 1.0</span>: Se mueven casi igual (Poca diversificación).
                        <br/>
                        • <span className="text-emerald-400">0.0 a 0.3</span>: Son independientes (Buena diversificación).
                        <br/>
                        • <span className="text-blue-400">Negativo</span>: Se mueven en frentes opuestos (Máxima protección).
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-1">
                    <thead>
                        <tr>
                            <th className="p-2"></th>
                            {funds.map(f => (
                                <th key={f} className="p-2 text-[8px] font-mono text-slate-400 uppercase text-center vertical-text max-w-[80px] truncate" title={f}>
                                    {f.substring(0, 15)}...
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {funds.map(f1 => (
                            <tr key={f1}>
                                <td className="p-2 text-[9px] font-bold text-slate-600 font-mono truncate max-w-[120px]" title={f1}>
                                    {f1}
                                </td>
                                {funds.map(f2 => {
                                    const val = matrix[f1][f2];
                                    return (
                                        <td 
                                            key={f2} 
                                            className={`p-2 text-center rounded-lg text-[10px] font-black transition-transform hover:scale-110 cursor-default ${getCorrelationColor(val)}`}
                                            title={val !== null && val !== undefined ? `${f1} vs ${f2}: ${val.toFixed(2)}` : ''}
                                        >
                                            {val !== null && val !== undefined ? (isPrivacyMode ? '••' : val.toFixed(2)) : '-'}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const styles = `
.vertical-text {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    white-space: nowrap;
}
`;
