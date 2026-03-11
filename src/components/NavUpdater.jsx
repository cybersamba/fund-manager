import React, { useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';

export default function NavUpdater({ currentNavs, onUpdateNavs }) {
    const [navs, setNavs] = useState(currentNavs);
    const [saved, setSaved] = useState(false);

    const handleNavChange = (fund, value) => {
        setNavs(prev => ({ ...prev, [fund]: parseFloat(value) || 0 }));
    };

    const handleSave = () => {
        onUpdateNavs(navs);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="card mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <RefreshCw size={20} className="text-blue-400" />
                Actualizar Precios Mercado (NAV)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {Object.keys(currentNavs).map(fund => (
                    <div key={fund}>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{fund}</label>
                        <input
                            type="number"
                            step="0.0001"
                            className="input-field"
                            value={navs[fund]}
                            onChange={(e) => handleNavChange(fund, e.target.value)}
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    className="btn-primary"
                >
                    {saved ? <><Check size={18} /> Guardado</> : 'Actualizar Precios'}
                </button>
            </div>
        </div>
    );
}
