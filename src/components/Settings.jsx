import React, { useState } from 'react';
import { Trash2, AlertTriangle, Save, Download, Upload } from 'lucide-react';

export default function Settings({ onClearData, onRestoreData, onExportData, onImportData, currency, setCurrency, fundConfigs, setFundConfigs }) {
    const [confirmClear, setConfirmClear] = useState(false);

    const handleClear = () => {
        onClearData();
        setConfirmClear(false);
    };

    const handleRestore = () => {
        if (onRestoreData) onRestoreData();
    };

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Configuración</h1>
                <div className="text-gray-400">Gestiona las preferencias y datos de la aplicación.</div>
            </header>

            <div className="space-y-6">
                <div className="card">
                    <h2 className="text-xl font-semibold mb-4 text-white">Preferencias Generales</h2>
                    <div className="p-4 bg-surface border border-gray-700 rounded-lg flex items-center justify-between">
                        <div>
                            <div className="font-medium text-white mb-1">Moneda Base</div>
                            <div className="text-sm text-gray-400">Selecciona la moneda principal para mostrar los valores.</div>
                        </div>
                        <select
                            className="bg-background border border-gray-700 text-white rounded-md px-3 py-2 outline-none focus:border-primary"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                        >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                        </select>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white">Gestión de Mis Fondos</h2>
                        <div className="text-xs font-bold px-2 py-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                            TOTAL OBJETIVO: {Object.values(fundConfigs || {}).reduce((sum, f) => sum + (parseFloat(f.targetPercent) || 0), 0).toFixed(0)}%
                        </div>
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-6">
                        Configura los fondos de tu portfolio para habilitar el seguimiento de precios real y los cálculos de rebalanceo.
                    </p>

                    <div className="space-y-4">
                        {Object.entries(fundConfigs || {}).map(([name, config]) => (
                            <div key={name} className="p-4 bg-surface border border-gray-800 rounded-xl">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-white mb-1">{name}</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Configuración del Activo</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:w-auto mt-2 md:mt-0">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] text-gray-500 font-bold uppercase">ID Morningstar</label>
                                            <input 
                                                type="text" 
                                                className="bg-background border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none w-full md:w-28 font-mono"
                                                placeholder="F0GBR06OZK"
                                                value={config.morningstarId || ''}
                                                onChange={(e) => {
                                                    const newConfigs = { ...fundConfigs };
                                                    newConfigs[name] = { ...newConfigs[name], morningstarId: e.target.value.trim().toUpperCase() };
                                                    setFundConfigs(newConfigs);
                                                }}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] text-gray-500 font-bold uppercase">% Objetivo</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    className="bg-background border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none w-full md:w-20 pr-6"
                                                    placeholder="0"
                                                    value={config.targetPercent || ''}
                                                    onChange={(e) => {
                                                        const newConfigs = { ...fundConfigs };
                                                        newConfigs[name] = { ...newConfigs[name], targetPercent: parseFloat(e.target.value) || 0 };
                                                        setFundConfigs(newConfigs);
                                                    }}
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold">%</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] text-amber-500/70 font-bold uppercase" title="Total Expense Ratio (Gastos Anuales)">Comisión TER</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    className="bg-background border border-gray-700 rounded px-2 py-1.5 text-xs text-amber-100 focus:border-amber-500 outline-none w-full md:w-20 pr-6"
                                                    placeholder="0.20"
                                                    value={config.ter || ''}
                                                    onChange={(e) => {
                                                        const newConfigs = { ...fundConfigs };
                                                        newConfigs[name] = { ...newConfigs[name], ter: parseFloat(e.target.value) || 0 };
                                                        setFundConfigs(newConfigs);
                                                    }}
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-500/50 font-bold">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-6 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[11px] text-amber-200/70">
                        💡 <strong>Tip:</strong> Puedes encontrar el ID de Morningstar en la URL de morningstar.es (ej: ?id=<strong>F0GBR06OZK</strong>). 
                        El sistema lo usará para obtener el NAV histórico automáticamente.
                    </div>
                </div>

                <div className="card border-danger/20">
                    <h2 className="text-xl font-semibold mb-4 text-danger flex items-center gap-2">
                        <AlertTriangle size={24} />
                        Zona de Peligro
                    </h2>

                    <div className="p-4 border border-danger/20 bg-danger/5 rounded-lg">
                        <div className="font-medium text-white mb-2">Borrar Historial de Órdenes</div>
                        <p className="text-sm text-gray-400 mb-4">
                            Esta acción eliminará permanentemente todas las órdenes registradas en tu portfolio local.
                            Esta acción no se puede deshacer.
                        </p>

                        {!confirmClear ? (
                            <button
                                onClick={() => setConfirmClear(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-danger/10 border border-gray-700 hover:border-danger text-danger rounded-lg transition-colors font-medium"
                            >
                                <Trash2 size={18} /> Borrar todos los datos
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-danger font-medium">¿Estás completamente seguro?</span>
                                <button
                                    onClick={handleClear}
                                    className="px-4 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg transition-colors font-medium"
                                >
                                    Sí, eliminar
                                </button>
                                <button
                                    onClick={() => setConfirmClear(false)}
                                    className="px-4 py-2 bg-surface hover:bg-gray-800 border border-gray-700 text-gray-300 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <h2 className="text-xl font-semibold mb-4 text-white">Restaurar Datos</h2>
                    <div className="p-4 bg-surface border border-gray-700 rounded-lg">
                        <div className="font-medium text-white mb-2">Restaurar Órdenes Originales</div>
                        <p className="text-sm text-gray-400 mb-4">
                            Si borraste órdenes por error, puedes restaurar la cartera inicial de prueba (La Française y Groupama).
                        </p>
                        <button
                            onClick={handleRestore}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-white rounded-lg transition-colors font-medium mt-4"
                        >
                            <Save size={18} /> Restaurar Datos Iniciales
                        </button>
                    </div>
                </div>

                <div className="card">
                    <h2 className="text-xl font-semibold mb-4 text-white">Copias de Seguridad (Backups)</h2>
                    <div className="p-4 bg-surface border border-gray-700 rounded-lg flex flex-col gap-6">

                        <div>
                            <div className="font-medium text-white mb-2">Exportar Datos Manualmente</div>
                            <p className="text-sm text-gray-400 mb-4">
                                Aunque la aplicación hace una copia automática diaria de tus órdenes, puedes forzar una exportación ahora para guardarlo en formato JSON seguro.
                            </p>
                            <button
                                onClick={onExportData}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 rounded-lg transition-colors font-medium"
                            >
                                <Download size={18} /> Descargar Backup (.json)
                            </button>
                        </div>

                        <div className="border-t border-gray-800 pt-6">
                            <div className="font-medium text-white mb-2">Importar Datos / Recuperar</div>
                            <p className="text-sm text-gray-400 mb-4">
                                Selecciona un archivo ".json" con tus órdenes exportadas previamente para restaurar tu cartera por completo.
                            </p>
                            <label className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-gray-800 border-2 border-dashed border-gray-600 hover:border-gray-500 text-gray-300 rounded-lg transition-colors font-medium w-fit cursor-pointer">
                                <Upload size={18} /> Subir Archivo JSON
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
                                                alert("El archivo no es un Backup válido o está corrupto.");
                                            }
                                        };
                                        reader.readAsText(file);
                                    }}
                                />
                            </label>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
