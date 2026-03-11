import React, { useState } from 'react';
import { PlusCircle, MinusCircle, ArrowRightLeft, PiggyBank } from 'lucide-react';

export default function OrderForm({ onAddOrder, holdings = {} }) {
    const [type, setType] = useState('buy');
    const [fundName, setFundName] = useState('');
    const [targetFund, setTargetFund] = useState('');
    const [amount, setAmount] = useState('');
    const [nav, setNav] = useState('');
    const [targetNav, setTargetNav] = useState('');
    const [error, setError] = useState('');
    const [duration, setDuration] = useState('12');
    const [interestRate, setInterestRate] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);

    const reset = () => {
        setFundName(''); setTargetFund(''); setAmount(''); setNav(''); setTargetNav(''); setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!fundName.trim()) { setError('Por favor ingresa un nombre para el fondo.'); return; }

        const parsedAmount = parseFloat(amount.toString().replace(',', '.'));
        if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Por favor ingresa un monto válido mayor a 0.'); return; }

        if (type === 'deposit') {
            const parsedDuration = parseInt(duration, 10);
            const parsedRate = parseFloat(interestRate.toString().replace(',', '.'));
            if (isNaN(parsedDuration) || parsedDuration <= 0) { setError('La duración del depósito debe ser un número de meses mayor a 0.'); return; }
            if (isNaN(parsedRate) || parsedRate < 0) { setError('El tipo de interés debe ser un porcentaje válido.'); return; }

            onAddOrder({ id: Date.now(), type: 'deposit', fundName, amount: parsedAmount, duration: parsedDuration, interestRate: parsedRate, date: new Date(orderDate).toISOString() });
            reset(); return;
        }

        if (type === 'transfer') {
            if (!targetFund.trim()) { setError('Por favor especifica el fondo de destino.'); return; }
            const parsedOriginNav = parseFloat(nav.toString().replace(',', '.'));
            const parsedDestNav = parseFloat(targetNav.toString().replace(',', '.'));
            if (isNaN(parsedOriginNav) || parsedOriginNav <= 0) { setError('Introduce el NAV de ejecución del fondo origen.'); return; }
            if (isNaN(parsedDestNav) || parsedDestNav <= 0) { setError('Introduce el NAV de ejecución del fondo destino.'); return; }

            const sharesOut = parsedAmount / parsedOriginNav;
            const sharesIn = parsedAmount / parsedDestNav;
            const dateIso = new Date(orderDate).toISOString();

            // Two linked records: pseudo-sell in origin, pseudo-buy in destination
            onAddOrder({ id: Date.now(), type: 'sell', fundName, amount: parsedAmount, nav: parsedOriginNav, shares: sharesOut, date: dateIso, note: `Traspaso → ${targetFund}` });
            onAddOrder({ id: Date.now() + 1, type: 'buy', fundName: targetFund, amount: parsedAmount, nav: parsedDestNav, shares: sharesIn, date: dateIso, note: `Traspaso ← ${fundName}` });
            reset(); return;
        }

        // buy / sell
        const parsedNav = parseFloat(nav.toString().replace(',', '.'));
        if (isNaN(parsedNav) || parsedNav <= 0) { setError('Por favor ingresa un NAV válido mayor a 0.'); return; }
        const parsedShares = parsedAmount / parsedNav;

        if (type === 'sell') {
            const currentHolding = holdings[fundName] || 0;
            if (currentHolding <= 0) { setError(`No posees capital en "${fundName}".`); return; }
        }

        onAddOrder({ id: Date.now(), type, fundName, amount: parsedAmount, nav: parsedNav, shares: parsedShares, date: new Date(orderDate).toISOString() });
        reset();
    };

    const calculatedShares = amount && nav && type !== 'deposit' && type !== 'transfer'
        ? (parseFloat(amount.toString().replace(',', '.')) / parseFloat(nav.toString().replace(',', '.')))
        : 0;

    const typeConfig = {
        buy: { label: 'Compra', icon: <PlusCircle size={15} />, color: 'bg-success/20 text-success border-success/50', btnColor: 'bg-success hover:bg-success/90' },
        sell: { label: 'Venta', icon: <MinusCircle size={15} />, color: 'bg-danger/20 text-danger border-danger/50', btnColor: 'bg-danger hover:bg-danger/90' },
        transfer: { label: 'Traspaso', icon: <ArrowRightLeft size={15} />, color: 'bg-amber-500/20 text-amber-400 border-amber-500/50', btnColor: 'bg-amber-500 hover:bg-amber-400' },
        deposit: { label: 'Depósito', icon: <PiggyBank size={15} />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', btnColor: 'bg-blue-500 hover:bg-blue-400' },
    };

    return (
        <div className="card">
            <h2 className="text-lg font-semibold mb-4">Nueva Orden</h2>

            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
                {Object.entries(typeConfig).map(([key, cfg]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setType(key)}
                        className={`py-2 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-all border ${type === key ? cfg.color : 'bg-surface border-gray-700 text-gray-400 hover:text-white'}`}
                    >
                        {cfg.icon} {cfg.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            {type === 'transfer' ? 'Fondo Origen' : 'Nombre del Fondo'}
                        </label>
                        <input type="text" className="input-field" placeholder="Ej. La Française..." value={fundName} onChange={e => setFundName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de la Operación</label>
                        <input type="date" className="input-field" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                    </div>
                </div>

                {/* Transfer: destination fund */}
                {type === 'transfer' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Fondo Destino</label>
                        <input type="text" className="input-field" placeholder="Ej. Groupama Trésorerie..." value={targetFund} onChange={e => setTargetFund(e.target.value)} />
                    </div>
                )}

                <div className={`grid gap-4 ${type === 'transfer' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Importe Traspasado</label>
                        <input type="number" className="input-field" placeholder="0.00" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>

                    {type !== 'deposit' && type !== 'transfer' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">NAV de Ejecución</label>
                            <input type="number" className="input-field" placeholder="0.00" min="0" step="0.0001" value={nav} onChange={e => setNav(e.target.value)} />
                        </div>
                    )}

                    {type === 'transfer' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">NAV Origen</label>
                                <input type="number" className="input-field" placeholder="0.00" min="0" step="0.0001" value={nav} onChange={e => setNav(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">NAV Destino</label>
                                <input type="number" className="input-field" placeholder="0.00" min="0" step="0.0001" value={targetNav} onChange={e => setTargetNav(e.target.value)} />
                            </div>
                        </>
                    )}
                </div>

                {/* Deposit specific fields */}
                {type === 'deposit' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Duración (Meses)</label>
                            <input type="number" className="input-field" placeholder="12" min="1" step="1" value={duration} onChange={e => setDuration(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Tipo Interés (TAE %)</label>
                            <input type="number" className="input-field" placeholder="3.5" min="0" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
                        </div>
                    </div>
                )}

                {/* Transfer info box */}
                {type === 'transfer' && amount && nav && targetNav && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-sm space-y-1">
                        <div className="text-amber-400 font-semibold text-xs uppercase tracking-wider mb-1">Resumen del Traspaso</div>
                        <div className="text-gray-300 flex justify-between">
                            <span>Participaciones cedidas ({fundName}):</span>
                            <span className="font-mono text-red-400">-{(parseFloat(amount) / parseFloat(nav)).toFixed(5)}</span>
                        </div>
                        <div className="text-gray-300 flex justify-between">
                            <span>Participaciones recibidas ({targetFund}):</span>
                            <span className="font-mono text-green-400">+{(parseFloat(amount) / parseFloat(targetNav)).toFixed(5)}</span>
                        </div>
                    </div>
                )}

                {calculatedShares > 0 && (
                    <div className="bg-surface border border-gray-700 rounded-lg p-3 text-sm text-gray-300">
                        Participaciones estimadas: <span className="font-semibold text-white">{calculatedShares.toFixed(5)}</span>
                    </div>
                )}

                {error && <div className="text-danger text-sm">{error}</div>}

                <button type="submit" className={`btn-primary w-full mt-2 text-white border-0 ${typeConfig[type].btnColor}`}>
                    Registrar {typeConfig[type].label}
                </button>
            </form>
        </div>
    );
}
