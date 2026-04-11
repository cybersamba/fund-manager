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
    const [broker, setBroker] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);

    const reset = () => {
        setFundName(''); setTargetFund(''); setAmount(''); setNav(''); setTargetNav(''); setError(''); setBroker('');
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

            onAddOrder({ id: Date.now(), type: 'deposit', fundName, amount: parsedAmount, duration: parsedDuration, interestRate: parsedRate, broker: broker || 'ING', date: new Date(orderDate).toISOString() });
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

            onAddOrder({ id: Date.now(), type: 'sell', fundName, amount: parsedAmount, nav: parsedOriginNav, shares: sharesOut, broker: broker || 'MyInvestor', date: dateIso, note: `Traspaso → ${targetFund}` });
            onAddOrder({ id: Date.now() + 1, type: 'buy', fundName: targetFund, amount: parsedAmount, nav: parsedDestNav, shares: sharesIn, broker: broker || 'MyInvestor', date: dateIso, note: `Traspaso ← ${fundName}` });
            reset(); return;
        }

        const parsedNav = parseFloat(nav.toString().replace(',', '.'));
        if (isNaN(parsedNav) || parsedNav <= 0) { setError('Por favor ingresa un NAV válido mayor a 0.'); return; }
        const parsedShares = parsedAmount / parsedNav;

        if (type === 'sell') {
            const currentHolding = holdings[fundName] || 0;
            if (currentHolding <= 0) { setError(`No posees capital en "${fundName}".`); return; }
        }

        onAddOrder({ id: Date.now(), type, fundName, amount: parsedAmount, nav: parsedNav, shares: parsedShares, broker: broker || 'MyInvestor', date: new Date(orderDate).toISOString() });
        reset();
    };

    const calculatedShares = amount && nav && type !== 'deposit' && type !== 'transfer'
        ? (parseFloat(amount.toString().replace(',', '.')) / parseFloat(nav.toString().replace(',', '.')))
        : 0;

    const typeConfig = {
        buy: { label: 'Compra', icon: <PlusCircle size={15} />, activeStyle: 'bg-emerald-600/10 text-emerald-600 border-emerald-600/30', btnColor: 'bg-gradient-to-b from-emerald-600 to-emerald-600 hover:shadow-glow-green' },
        sell: { label: 'Venta', icon: <MinusCircle size={15} />, activeStyle: 'bg-danger/10 text-danger border-danger/30', btnColor: 'bg-gradient-to-b from-danger to-red-600 hover:shadow-glow-red' },
        transfer: { label: 'Traspaso', icon: <ArrowRightLeft size={15} />, activeStyle: 'bg-amber-600/10 text-amber-600 border-amber-600/30', btnColor: 'bg-gradient-to-b from-amber-600 to-amber-600' },
        deposit: { label: 'Depósito', icon: <PiggyBank size={15} />, activeStyle: 'bg-primary/10 text-primary border-primary/30', btnColor: 'bg-gradient-to-b from-primary to-primary-hover hover:shadow-glow-blue' },
    };

    return (
        <div className="bento-card p-6 md:p-8">
            <h2 className="text-xl font-medium mb-6 text-slate-900 tracking-tight">Nueva Orden</h2>

            <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
                {Object.entries(typeConfig).map(([key, cfg]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setType(key)}
                        className={`py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all duration-200 border text-sm ${type === key ? cfg.activeStyle : 'bg-transparent border-slate-200/60 text-slate-500 hover:text-slate-900 hover:border-slate-200/60'}`}
                    >
                        {cfg.icon} {cfg.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                            {type === 'transfer' ? 'Fondo Origen' : 'Nombre del Fondo'}
                        </label>
                        <input type="text" className="w-full metric-input" placeholder="Ej. La Française..." value={fundName} onChange={e => setFundName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Fecha</label>
                        <input type="date" className="w-full metric-input" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                    </div>
                </div>

                {type === 'transfer' && (
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Fondo Destino</label>
                        <input type="text" className="w-full metric-input" placeholder="Ej. Groupama Trésorerie..." value={targetFund} onChange={e => setTargetFund(e.target.value)} />
                    </div>
                )}

                <div className={`grid gap-4 ${type === 'transfer' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Importe</label>
                        <input type="number" className="w-full metric-input font-mono" placeholder="0.00" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>

                    {type !== 'deposit' && type !== 'transfer' && (
                        <div>
                            <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">NAV</label>
                            <input type="number" className="w-full metric-input font-mono" placeholder="0.00" min="0" step="0.0001" value={nav} onChange={e => setNav(e.target.value)} />
                        </div>
                    )}

                    {type === 'transfer' && (
                        <>
                            <div>
                                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">NAV Origen</label>
                                <input type="number" className="w-full metric-input font-mono" placeholder="0.00" min="0" step="0.0001" value={nav} onChange={e => setNav(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">NAV Destino</label>
                                <input type="number" className="w-full metric-input font-mono" placeholder="0.00" min="0" step="0.0001" value={targetNav} onChange={e => setTargetNav(e.target.value)} />
                            </div>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Entidad / Banco</label>
                        <select className="w-full metric-input text-xs" value={broker} onChange={e => setBroker(e.target.value)}>
                            <option value="">(Autodetectar) MyInvestor / ING</option>
                            <option value="MyInvestor">MyInvestor</option>
                            <option value="ING">ING Direct</option>
                            <option value="Renta 4">Renta 4</option>
                            <option value="Indexa Capital">Indexa Capital</option>
                            <option value="Openbank">Openbank</option>
                            <option value="Santander">Santander</option>
                            <option value="BBVA">BBVA</option>
                            <option value="CaixaBank">CaixaBank</option>
                            <option value="IronIA">IronIA</option>
                            <option value="Otros">Otros</option>
                        </select>
                    </div>
                </div>

                {type === 'deposit' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Duración (Meses)</label>
                            <input type="number" className="w-full metric-input font-mono" placeholder="12" min="1" step="1" value={duration} onChange={e => setDuration(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Interés (TAE %)</label>
                            <input type="number" className="w-full metric-input font-mono" placeholder="3.5" min="0" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
                        </div>
                    </div>
                )}

                {type === 'transfer' && amount && nav && targetNav && (
                    <div className="nano-panel space-y-1.5 mt-4">
                        <div className="text-[10px] font-mono text-amber-500/70 mb-2 uppercase tracking-widest">Resumen del Traspaso</div>
                        <div className="text-sm text-slate-500 flex justify-between">
                            <span>Participaciones cedidas:</span>
                            <span className="font-mono text-red-400 font-medium">-{(parseFloat(amount) / parseFloat(nav)).toFixed(5)}</span>
                        </div>
                        <div className="text-sm text-slate-500 flex justify-between">
                            <span>Participaciones recibidas:</span>
                            <span className="font-mono text-green-400 font-medium">+{(parseFloat(amount) / parseFloat(targetNav)).toFixed(5)}</span>
                        </div>
                    </div>
                )}

                {calculatedShares > 0 && (
                    <div className="nano-panel text-sm text-slate-500 mt-4 flex items-center justify-between">
                        <span>Participaciones estimadas</span>
                        <span className="font-medium font-mono text-slate-900">{calculatedShares.toFixed(5)}</span>
                    </div>
                )}

                {error && <div className="text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}

                <button type="submit" className={`w-full py-3 rounded-xl text-slate-900 font-semibold transition-all duration-200 shadow-lg active:scale-[0.97] border-0 mt-1 ${typeConfig[type].btnColor}`}>
                    Registrar {typeConfig[type].label}
                </button>
            </form>
        </div>
    );
}
