import React, { useState } from 'react';
import { Trash2, AlertTriangle, Save, Download, Upload, Settings as SettingsIcon, Target, Wallet } from 'lucide-react';

export default function Settings({ onClearData, onRestoreData, onExportData, onImportData, currency, setCurrency, fundConfigs, setFundConfigs }) {
    const [confirmClear, setConfirmClear] = useState(false);

    const handleClear = () => {
        onClearData();
        setConfirmClear(false);
    };

    const handleRestore = () => {
        if (onRestoreData) onRestoreData();
    };

    const totalTarget = Object.values(fundConfigs || {}).reduce((sum, f) => sum + (parseFloat(f.targetPercent) || 0), 0);

    return (
        <div className="max-w-4xl mx-auto w-full">
            <header className="mb-8">
                <h1 className="text-2xl font-medium mb-1 text-slate-900 tracking-tight">System Configuration</h1>
                <div className="text-[10px] font-mono tracking-widest uppercase text-slate-500">Manage engine preferences and core data</div>
            </header>

            <div className="space-y-6">
                {/* General Preferences */}
                <div className="bento-card p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <SettingsIcon size={16} className="text-slate-500" />
                        <h2 className="text-sm font-mono tracking-widest uppercase text-slate-500">Core Preferences</h2>
                    </div>
                    <div className="nano-panel flex items-center justify-between border-transparent bg-transparent px-0 py-0">
                        <div>
                            <div className="font-medium text-slate-900 mb-1">Base Currency</div>
                            <div className="text-xs text-slate-500 font-mono">Set the primary reporting currency format.</div>
                        </div>
                        <select
                            className="bg-white border border-slate-200/60 text-slate-900 font-mono rounded-lg px-4 py-2 text-xs outline-none focus:border-slate-200/60 transition-all"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                        >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                        </select>
                    </div>
                </div>

                {/* Fund Management */}
                <div className="bento-card p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Wallet size={16} className="text-slate-500" />
                            <h2 className="text-sm font-mono tracking-widest uppercase text-slate-500">Asset Configuration</h2>
                        </div>
                        <div className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded bg-white border ${Math.abs(totalTarget - 100) < 0.1 ? 'border-green-500/30 text-green-500' : 'border-red-500/30 text-red-500'}`}>
                            TARGET: {totalTarget.toFixed(0)}%
                        </div>
                    </div>
                    
                    <p className="text-xs font-mono text-slate-500 mb-6 border-l border-slate-200/60 pl-3">
                        Configure portfolio assets to enable real market tracking and rebalancing calculations.
                    </p>

                    <div className="space-y-4">
                        {Object.entries(fundConfigs || {}).map(([name, config]) => (
                            <div key={name} className="p-5 bg-slate-50 border border-white/[0.03] rounded-xl">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-sans font-medium text-slate-900 mb-1 truncate">{name}</div>
                                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Asset Parameters</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 w-full lg:w-fit">
                                        <div className="flex flex-col gap-2 relative">
                                            <label className="text-[9px] font-mono text-cyan-600/50 uppercase tracking-widest">Activo</label>
                                            <select 
                                                className="metric-input text-xs sm:w-28 font-medium text-cyan-700"
                                                value={config.assetClass || 'renta-variable'}
                                                onChange={(e) => {
                                                    const newConfigs = { ...fundConfigs };
                                                    newConfigs[name] = { ...newConfigs[name], assetClass: e.target.value };
                                                    setFundConfigs(newConfigs);
                                                }}
                                            >
                                                <option value="renta-variable">R. Variable</option>
                                                <option value="renta-fija">R. Fija</option>
                                                <option value="monetario">Monetario</option>
                                                <option value="deposito">Depósito</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-2 relative">
                                            <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Morningstar ID</label>
                                            <input 
                                                type="text" 
                                                className="metric-input text-xs sm:w-28"
                                                placeholder="F0GBR06OZK"
                                                value={config.morningstarId || ''}
                                                onChange={(e) => {
                                                    const newConfigs = { ...fundConfigs };
                                                    newConfigs[name] = { ...newConfigs[name], morningstarId: e.target.value.trim().toUpperCase() };
                                                    setFundConfigs(newConfigs);
                                                }}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2 relative">
                                            <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Target %</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    className="metric-input text-xs pr-6 sm:w-24"
                                                    placeholder="0"
                                                    value={config.targetPercent || ''}
                                                    onChange={(e) => {
                                                        const newConfigs = { ...fundConfigs };
                                                        newConfigs[name] = { ...newConfigs[name], targetPercent: parseFloat(e.target.value) || 0 };
                                                        setFundConfigs(newConfigs);
                                                    }}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">%</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 relative">
                                            <label className="text-[9px] font-mono text-amber-500/50 uppercase tracking-widest">Expense Ratio</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    className="metric-input text-xs pr-6 sm:w-24 font-mono text-amber-500"
                                                    placeholder="0.20"
                                                    value={config.ter || ''}
                                                    onChange={(e) => {
                                                        const newConfigs = { ...fundConfigs };
                                                        const val = e.target.value.toString().replace(',', '.');
                                                        newConfigs[name] = { ...newConfigs[name], ter: parseFloat(val) || 0 };
                                                        setFundConfigs(newConfigs);
                                                    }}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-amber-500/50">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Data Management & Danger Zone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Backups */}
                    <div className="bento-card p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Save size={16} className="text-slate-500" />
                            <h2 className="text-sm font-mono tracking-widest uppercase text-slate-500">Data Persistence</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <div className="font-medium text-slate-900 mb-1">Export Ledger</div>
                                <p className="text-xs text-slate-500 font-mono mb-3">Download a local JSON copy of all transactions.</p>
                                <button
                                    onClick={onExportData}
                                    className="flex items-center justify-center w-full gap-2 px-4 py-2.5 bg-white text-black text-xs font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
                                >
                                    <Download size={14} /> Download Backup
                                </button>
                            </div>

                            <div className="border-t border-slate-200/60 pt-6">
                                <div className="font-medium text-slate-900 mb-1">Import Ledger</div>
                                <p className="text-xs text-slate-500 font-mono mb-3">Restore transactions from a previous JSON backup.</p>
                                <label className="flex items-center justify-center w-full gap-2 px-4 py-3 bg-transparent border border-slate-200/60 border-dashed text-slate-500 text-xs font-medium rounded-lg hover:bg-white/5 hover:text-slate-900 cursor-pointer transition-colors">
                                    <Upload size={14} /> Upload JSON
                                    <input
                                        type="file"
                                        accept=".json"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                try {
                                                    const json = JSON.parse(event.target.result);
                                                    if (onImportData) onImportData(json);
                                                } catch (err) {
                                                    alert("Invalid backup file.");
                                                }
                                            };
                                            reader.readAsText(file);
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bento-card border-red-500/20 p-6 md:p-8 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <AlertTriangle size={16} className="text-red-500" />
                                <h2 className="text-sm font-mono tracking-widest uppercase text-red-500">Danger Zone</h2>
                            </div>

                            <div className="mb-6">
                                <div className="font-medium text-slate-900 mb-1">Flush Database</div>
                                <p className="text-[10px] uppercase tracking-widest text-red-400 font-mono mb-4">
                                    Warning: This will permanently delete all records in the local ledger. Irreversible.
                                </p>

                                {!confirmClear ? (
                                    <button
                                        onClick={() => setConfirmClear(true)}
                                        className="flex items-center justify-center w-full gap-2 px-4 py-2.5 bg-transparent border border-red-500/30 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 size={14} /> Flush All Data
                                    </button>
                                ) : (
                                    <div className="flex flex-col gap-2 p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                                        <span className="text-xs text-red-400 font-mono uppercase text-center mb-1">Confirm deletion?</span>
                                        <div className="flex gap-2">
                                            <button onClick={handleClear} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-slate-900 text-xs font-bold rounded-md transition-colors">Confirm</button>
                                            <button onClick={() => setConfirmClear(false)} className="flex-1 py-2 bg-white border border-slate-200/60 text-slate-500 hover:text-slate-900 text-xs font-medium rounded-md transition-colors">Abort</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-slate-200/60 pt-6 mt-6">
                            <div className="font-medium text-slate-900 mb-1">Restore Default Dataset</div>
                            <p className="text-[10px] uppercase font-mono text-slate-500 mb-3">Load the demo portfolio template.</p>
                            <button
                                onClick={handleRestore}
                                className="flex items-center justify-center w-full gap-2 px-4 py-2.5 bg-transparent border border-slate-200/60 text-slate-500 text-xs font-medium rounded-lg hover:bg-white/5 hover:text-slate-900 transition-colors"
                            >
                                <Save size={14} /> Load Core Dataset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
