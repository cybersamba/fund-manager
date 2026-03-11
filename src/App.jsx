import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Eye, EyeOff, Lock } from 'lucide-react';
import Layout from './components/Layout';
import OrderForm from './components/OrderForm';
import OrderList from './components/OrderList';
import Portfolio from './components/Portfolio';
import Settings from './components/Settings';
import HistoricalChart from './components/HistoricalChart';
import { getMatchingFundKey } from './utils/helpers';
import { Share2, Activity, RefreshCw, TrendingUp, TrendingDown, Award, Calendar, Edit3, Monitor } from 'lucide-react';

function App() {
    const [systemStatus, setSystemStatus] = useState({ status: 'connecting', processedItems: 0 });

    const handleHardRefresh = async () => {
        if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
        }
        window.location.reload();
    };


    const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
        const saved = localStorage.getItem('fund-privacy-mode');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [currency, setCurrency] = useState(() => {
        const saved = localStorage.getItem('fund-currency');
        return saved !== null ? saved : 'USD';
    });

    const [isRetroMode, setIsRetroMode] = useState(() => {
        return localStorage.getItem('fund-retro-mode') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('fund-retro-mode', isRetroMode);
        if (isRetroMode) {
            document.body.classList.add('retro');
        } else {
            document.body.classList.remove('retro');
        }
    }, [isRetroMode]);

    // Blinking cursor follower for retro mode
    useEffect(() => {
        const cursor = document.getElementById('retro-cursor');
        if (!cursor) return;
        const move = (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        };
        document.addEventListener('mousemove', move);
        return () => document.removeEventListener('mousemove', move);
    }, []);

    useEffect(() => {
        localStorage.setItem('fund-privacy-mode', JSON.stringify(isPrivacyMode));
    }, [isPrivacyMode]);

    useEffect(() => {
        localStorage.setItem('fund-currency', currency);
    }, [currency]);

    const formatCurrency = (value) => {
        if (isPrivacyMode) return 'XXXX';
        const symbol = currency === 'EUR' ? '€' : '$';
        const formatted = Math.abs(value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const prefix = value < 0 ? '-' : '';
        return currency === 'EUR' ? `${prefix}${formatted} ${symbol}` : `${prefix}${symbol}${formatted}`;
    };

    // AUTHENTICATION STATE
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('fund_auth_token') === 'secure_access_granted';
    });
    const [passwordInput, setPasswordInput] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        // Contraseña maestra de la aplicación
        if (passwordInput === 'inversor2026') {
            setIsAuthenticated(true);
            localStorage.setItem('fund_auth_token', 'secure_access_granted');
        } else {
            alert('Contraseña incorrecta');
            setPasswordInput('');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('fund_auth_token');
        setIsAuthenticated(false);
    };

    const [currentView, setCurrentView] = useState('dashboard');
    // Estado para las órdenes. Inicializamos vacío, luego lo pedimos al servidor.
    const [orders, setOrders] = useState([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [isEditingCash, setIsEditingCash] = useState(false);
    const [cashInput, setCashInput] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const { data, error } = await supabase.from('orders').select('*').order('id', { ascending: false });
                if (error) throw error;
                if (data) {
                    setOrders(data.map(mapFromDb));
                }
            } catch (err) {
                console.error("Failed to fetch orders from Supabase backend", err);
                const savedOrders = localStorage.getItem('fund-orders');
                if (savedOrders) {
                    setOrders(JSON.parse(savedOrders));
                }
            } finally {
                setIsLoadingOrders(false);
            }
        };
        fetchOrders();
    }, []);

    const [currentNavs, setCurrentNavs] = useState(() => {
        const saved = localStorage.getItem('fundManagerNavs');
        if (saved) return JSON.parse(saved);
        return {
            'La Française Trésorerie ISR R': 93969.79, // Initial fallback
            'Groupama Trésorerie IC': 44052.54         // Initial fallback
        };
    });

    const [janNavs, setJanNavs] = useState(() => {
        const saved = localStorage.getItem('fundManagerJanNavs');
        if (saved) return JSON.parse(saved);
        return {};
    });

    const [historicalNavs, setHistoricalNavs] = useState(() => {
        const saved = localStorage.getItem('fundManagerHistoricalNavs');
        if (saved) return JSON.parse(saved);
        return {};
    });

    const [isFetchingNavs, setIsFetchingNavs] = useState(false);
    const [navFetchError, setNavFetchError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        localStorage.setItem('fundManagerNavs', JSON.stringify(currentNavs));
    }, [currentNavs]);

    useEffect(() => {
        localStorage.setItem('fundManagerJanNavs', JSON.stringify(janNavs));
    }, [janNavs]);

    useEffect(() => {
        localStorage.setItem('fundManagerHistoricalNavs', JSON.stringify(historicalNavs));
    }, [historicalNavs]);

    useEffect(() => {
        const fetchNavs = async () => {
            setIsFetchingNavs(true);
            setNavFetchError(null);
            try {
                const getNavData = async (url, retries = 3) => {
                    for (let i = 0; i < retries; i++) {
                        try {
                            const res = await fetch(`https://api.allorigins.win/get?url=${url}`);
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            const proxyData = await res.json();
                            const data = JSON.parse(proxyData.contents);

                            // Latest NAV
                            const latest = data[data.length - 1][1];

                            // Find Jan 1st NAV (or closest)
                            const currentYear = new Date().getFullYear();
                            const janStartTimestamp = new Date(currentYear, 0, 1).getTime();
                            let janNav = data[0][1]; // Default to oldest if not found

                            for (let entry of data) {
                                if (entry[0] >= janStartTimestamp) {
                                    janNav = entry[1];
                                    break;
                                }
                            }

                            return { latest, janNav, history: data };
                        } catch (err) {
                            if (i === retries - 1) throw err;
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }
                };

                // Fetch La Française
                const urlLaFrancaise = encodeURIComponent('https://tools.morningstar.es/api/rest.svc/timeseries_price/t92wz0sj7c?id=F0GBR06OZK]2]1]&currencyId=EUR&idtype=Morningstar&frequency=daily&startDate=2020-01-01&outputType=COMPACTJSON');
                const dataLaFrancaise = await getNavData(urlLaFrancaise);

                // Fetch Groupama
                const urlGroupama = encodeURIComponent('https://tools.morningstar.es/api/rest.svc/timeseries_price/t92wz0sj7c?id=F0GBR04M6M]2]1]&currencyId=EUR&idtype=Morningstar&frequency=daily&startDate=2020-01-01&outputType=COMPACTJSON');
                const dataGroupama = await getNavData(urlGroupama);

                setCurrentNavs({
                    'La Française Trésorerie ISR R': dataLaFrancaise.latest,
                    'Groupama Trésorerie IC': dataGroupama.latest
                });

                setJanNavs({
                    'La Française Trésorerie ISR R': dataLaFrancaise.janNav,
                    'Groupama Trésorerie IC': dataGroupama.janNav
                });

                setHistoricalNavs({
                    'La Française Trésorerie ISR R': dataLaFrancaise.history,
                    'Groupama Trésorerie IC': dataGroupama.history
                });

                setLastUpdated(new Date().toLocaleTimeString());
            } catch (err) {
                console.error("Error fetching Morningstar NAVs:", err);
                setNavFetchError("Error conectando con Morningstar.");
            } finally {
                setIsFetchingNavs(false);
            }
        };

        fetchNavs();
    }, []);

    const mapToDb = (o) => {
        const mapped = { ...o };
        if (mapped.fundName !== undefined) { mapped.fundname = mapped.fundName; delete mapped.fundName; }
        if (mapped.interestRate !== undefined) { mapped.interestrate = mapped.interestRate; delete mapped.interestRate; }
        return mapped;
    };
    const mapFromDb = (o) => {
        const mapped = { ...o };
        if (mapped.fundname !== undefined) { mapped.fundName = mapped.fundname; delete mapped.fundname; }
        if (mapped.interestrate !== undefined) { mapped.interestRate = mapped.interestrate; delete mapped.interestrate; }
        return mapped;
    };

    const addOrder = async (order) => {
        try {
            const { id, ...orderWithoutId } = order;
            const dbReady = mapToDb(orderWithoutId);
            const { data, error } = await supabase.from('orders').insert([dbReady]).select();
            if (error) throw error;
            if (data && data.length > 0) {
                setOrders((prevOrders) => [mapFromDb(data[0]), ...prevOrders]);
            }
        } catch (err) {
            console.error("Failed to add order to backend", err);
        }
    };

    const updateOrder = async (id, updatedData) => {
        try {
            const dbReady = mapToDb(updatedData);
            const { data, error } = await supabase.from('orders').update(dbReady).eq('id', id).select();
            if (error) throw error;
            if (data && data.length > 0) {
                setOrders(prevOrders => prevOrders.map(order => order.id === id ? mapFromDb(data[0]) : order));
            }
        } catch (err) {
            console.error("Failed to update order in backend", err);
        }
    };

    const deleteOrder = async (id) => {
        try {
            const { error } = await supabase.from('orders').delete().eq('id', id);
            if (error) throw error;
            setOrders(prevOrders => prevOrders.filter(order => order.id !== id));
        } catch (err) {
            console.error("Failed to delete order from backend", err);
        }
    };

    const clearData = async () => {
        try {
            const { error } = await supabase.from('orders').delete().neq('id', 0);
            if (error) throw error;
            setOrders([]);
            setCurrentView('dashboard');
        } catch (err) {
            console.error("Failed to clear backend", err);
        }
    };

    const restoreData = async () => {
        const initialData = [
            { original_id: 1, date: '2024-05-19T00:00:00Z', fundname: 'La Française Trésorerie ISR R', type: 'buy', amount: 6997.12, shares: 0.07672, nav: 91199.12 },
            { original_id: 2, date: '2025-03-05T00:00:00Z', fundname: 'La Française Trésorerie ISR R', type: 'buy', amount: 7523.19, shares: 0.08249, nav: 91199.12 },
            { original_id: 3, date: '2026-02-22T00:00:00Z', fundname: 'La Française Trésorerie ISR R', type: 'buy', amount: 1999.44, shares: 0.02191, nav: 91199.12 },
            { original_id: 4, date: '2024-06-07T00:00:00Z', fundname: 'Groupama Trésorerie IC', type: 'buy', amount: 4896.31, shares: 0.11506, nav: 42553.86 },
            { original_id: 5, date: '2024-07-04T00:00:00Z', fundname: 'Groupama Trésorerie IC', type: 'buy', amount: 2097.45, shares: 0.04929, nav: 42553.86 },
            { original_id: 6, date: '2024-08-10T00:00:00Z', fundname: 'Groupama Trésorerie IC', type: 'buy', amount: 1995.27, shares: 0.04689, nav: 42553.86 },
            { original_id: 7, date: '2024-10-16T00:00:00Z', fundname: 'Groupama Trésorerie IC', type: 'buy', amount: 2997.14, shares: 0.07043, nav: 42553.86 },
            { original_id: 8, date: '2025-03-06T00:00:00Z', fundname: 'Groupama Trésorerie IC', type: 'buy', amount: 2473.66, shares: 0.05813, nav: 42553.86 },
            { original_id: 9, date: '2026-02-22T00:00:00Z', fundname: 'Groupama Trésorerie IC', type: 'buy', amount: 1998.00, shares: 0.04695, nav: 42553.86 }
        ];

        try {
            const { data, error } = await supabase.from('orders').insert(initialData).select();
            if (error) throw error;
            if (data) {
                setOrders([...data].map(mapFromDb).sort((a, b) => b.id - a.id));
                setCurrentView('dashboard');
            }
        } catch (err) {
            console.error("Failed to restore default to Supabase", err);
        }
    };

    const handleExportData = () => {
        if (orders.length === 0) return;
        const dataStr = JSON.stringify(orders, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `fund_backup_${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
    };

    const handleImportData = async (importedOrders) => {
        if (Array.isArray(importedOrders)) {
            try {
                const cleanedOrders = importedOrders.map(o => {
                    const { id, ...rest } = o;
                    return mapToDb(rest);
                });
                const { data, error } = await supabase.from('orders').insert(cleanedOrders).select();
                if (error) throw error;
                if (data) {
                    setOrders([...data].map(mapFromDb).sort((a, b) => b.id - a.id));
                    setCurrentView('dashboard');
                }
            } catch (err) {
                console.error("Failed to import to backend", err);
            }
        }
    };

    useEffect(() => {
        const checkAndRunBackup = () => {
            if (orders.length === 0) return;
            const today = new Date().toISOString().split('T')[0];
            const lastBackup = localStorage.getItem('fund-last-backup');

            if (lastBackup !== today) {
                handleExportData();
                localStorage.setItem('fund-last-backup', today);
            }
        };
        // Small delay to ensure it doesn't block initial render and user has time to see it
        const timer = setTimeout(checkAndRunBackup, 2500);
        return () => clearTimeout(timer);
    }, [orders]);

    const regularOrders = orders.filter(o => o.type !== 'system_cash');
    const cashOrder = orders.find(o => o.type === 'system_cash');
    const availableCashValue = cashOrder ? cashOrder.amount : 0;

    const updateCashBalance = async (amountStr) => {
        const val = parseFloat(amountStr);
        if (isNaN(val)) return;
        try {
            const { error: delErr } = await supabase.from('orders').delete().eq('type', 'system_cash');
            if (delErr) throw delErr;

            const { data, error } = await supabase.from('orders').insert([{
                type: 'system_cash',
                amount: val,
                fundname: 'Efectivo No Invertido',
                date: new Date().toISOString()
            }]).select();

            if (error) throw error;
            if (data && data.length > 0) {
                setOrders(prev => [...prev.filter(o => o.type !== 'system_cash'), mapFromDb(data[0])]);
            }
        } catch (err) {
            console.error("Failed to update cash balance", err);
        }
    };

    // Calculate aggregated metrics with Shares and NAV using FIFO (First-In-First-Out)
    const currentHoldings = regularOrders.slice().reverse().reduce((acc, order) => {
        if (!acc[order.fundName]) {
            acc[order.fundName] = { shares: 0, invested: 0, buyLots: [] };
        }

        let calculatedShares = order.shares;
        if (!calculatedShares && order.nav > 0 && order.type !== 'deposit') {
            calculatedShares = order.amount / order.nav;
        } else if (!calculatedShares && historicalNavs && order.type !== 'deposit') {
            const matchKey = getMatchingFundKey(historicalNavs, order.fundName);
            const history = historicalNavs[matchKey];
            if (history) {
                const orderTime = new Date(order.date).setHours(0, 0, 0, 0);
                let foundNav = history[orderTime] || 0;
                if (!foundNav) {
                    for (let i = 1; i <= 14; i++) {
                        const pastTime = orderTime - (i * 24 * 60 * 60 * 1000);
                        if (history[pastTime]) {
                            foundNav = history[pastTime];
                            break;
                        }
                    }
                }
                if (foundNav > 0) calculatedShares = order.amount / foundNav;
            }
        }
        calculatedShares = calculatedShares || 0;

        if (order.type === 'buy') {
            acc[order.fundName].shares += calculatedShares;
            acc[order.fundName].invested += order.amount;
            acc[order.fundName].buyLots.push({
                shares: calculatedShares,
                amount: order.amount,
                nav: order.nav || (calculatedShares > 0 ? order.amount / calculatedShares : 0)
            });
        } else if (order.type === 'sell') {
            let sharesToSell = calculatedShares;
            let capitalToDeduct = 0;

            // Iterate over buy lots chronologically (they are in order since we reversed the array to oldest->newest)
            for (let i = 0; i < acc[order.fundName].buyLots.length; i++) {
                if (sharesToSell <= 0) break;

                const lot = acc[order.fundName].buyLots[i];
                if (lot.shares > 0) {
                    if (lot.shares <= sharesToSell) {
                        // Exhaust this lot completely
                        capitalToDeduct += lot.amount;
                        sharesToSell -= lot.shares;
                        lot.shares = 0;
                        lot.amount = 0;
                    } else {
                        // Fulfill the rest of the sale from this lot
                        const fractionSold = sharesToSell / lot.shares;
                        const proportionalCapital = lot.amount * fractionSold;
                        capitalToDeduct += proportionalCapital;

                        lot.shares -= sharesToSell;
                        lot.amount -= proportionalCapital;
                        sharesToSell = 0;
                    }
                }
            }

            acc[order.fundName].shares -= calculatedShares;
            acc[order.fundName].invested -= capitalToDeduct; // Deduquct proportional cost basis, not sale amount

        } else if (order.type === 'deposit') {
            acc[order.fundName].invested += order.amount;
            acc[order.fundName].isDeposit = true;
            if (!acc[order.fundName].deposits) acc[order.fundName].deposits = [];
            acc[order.fundName].deposits.push(order);
        }
        return acc;
    }, {});

    const totalCapitalAportado = Object.values(currentHoldings).reduce((sum, fund) => sum + fund.invested, 0);

    const totalCarteraValorada = Object.entries(currentHoldings).reduce((sum, [fundName, data]) => {
        if (data.isDeposit) {
            let depositVal = 0;
            data.deposits.forEach(dep => {
                const startDate = new Date(dep.date);
                const maturityDate = new Date(startDate);
                maturityDate.setMonth(maturityDate.getMonth() + (dep.duration || 12));
                maturityDate.setHours(23, 59, 59, 999);

                if (new Date() >= maturityDate) {
                    const profit = dep.amount * ((dep.interestRate || 0) / 100) * ((dep.duration || 12) / 12);
                    depositVal += (dep.amount + profit);
                } else {
                    depositVal += dep.amount;
                }
            });
            return sum + depositVal;
        }

        const matchKey = getMatchingFundKey(currentNavs, fundName);
        const fallbackNav = data.shares > 0 ? (data.invested / data.shares) : 0;
        const nav = currentNavs[matchKey] || fallbackNav;

        let valorado = data.shares * nav;
        if (data.shares === 0 && data.invested !== 0) {
            valorado = data.invested;
        }

        return sum + valorado;
    }, 0);

    useEffect(() => {
        let isMounted = true;
        const checkStatus = async () => {
            try {
                const { error, count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
                if (isMounted) {
                    if (!error) {
                        setSystemStatus({ status: 'online', processedItems: count !== null ? count : orders.length });
                    } else {
                        setSystemStatus({ status: 'connecting', processedItems: orders.length });
                    }
                }
            } catch (err) {
                if (isMounted) setSystemStatus({ status: 'connecting', processedItems: 0 });
            }
        };
        const interval = setInterval(checkStatus, 3000);
        checkStatus(); // Initial check
        return () => { isMounted = false; clearInterval(interval); }
    }, [orders.length]);

    const plusvalia = totalCarteraValorada - totalCapitalAportado;

    const isPositive = plusvalia >= 0;

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#111] flex items-center justify-center p-4 font-sans space-y-0 text-white">
                <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-[#111] border border-gray-800 rounded-full flex items-center justify-center relative shadow-inner shadow-black/50">
                            <Lock className="w-7 h-7 text-blue-500" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-center mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Acceso Privado</h2>
                    <p className="text-gray-500 text-xs text-center mb-8 uppercase tracking-widest font-semibold">TULOGY FUND MANAGER</p>

                    <form onSubmit={handleLogin}>
                        <div className="relative mb-6">
                            <input
                                type="password"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                placeholder="PIN DE ACCESO"
                                className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-4 text-white hover:border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-center tracking-[0.4em] font-mono shadow-inner shadow-black/20"
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="w-full bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] active:scale-[0.98]">
                            Desbloquear
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <Layout currentView={currentView} onNavigate={setCurrentView} onLogout={handleLogout}>
            {currentView === 'dashboard' ? (
                <div className="max-w-4xl mx-auto">
                    <header className="mb-8">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold mb-2">Resumen de Cuenta <span className="retro-caret" /></h1>
                                <div className="text-gray-400">Controla el valor real de tu cartera basado en los precios de mercado.</div>
                            </div>

                            {/* Indicador de "Backend" que trabaja en paralelo */}
                            <div className="flex items-center gap-3 px-4 py-2 bg-surface/50 border border-gray-800 rounded-xl">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Estado Servidor</span>
                                    <span className={`text-xs font-semibold ${systemStatus.status === 'online' ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {systemStatus.status === 'online' ? `ACTIVO (${systemStatus.processedItems})` : 'CONECTANDO...'}
                                    </span>
                                </div>
                                <div className={`p-2 rounded-lg ${systemStatus.status === 'online' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400 animate-pulse'}`}>
                                    <Activity size={18} />
                                </div>
                            </div>

                            <button
                                onClick={handleHardRefresh}
                                className="p-2 rounded-lg bg-surface hover:bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-800"
                                title="Limpiar caché y recargar"
                            >
                                <RefreshCw size={20} />
                            </button>

                            <button
                                onClick={() => setIsRetroMode(!isRetroMode)}
                                className={`p-2 rounded-lg border transition-colors ${isRetroMode
                                        ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                        : 'bg-surface hover:bg-gray-800 text-gray-400 hover:text-white border-gray-800'
                                    }`}
                                title={isRetroMode ? 'Modo moderno' : 'Modo retro CRT'}
                            >
                                <Monitor size={20} />
                            </button>

                            <button
                                onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                                className="p-2 rounded-lg bg-surface hover:bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-800"
                                title={isPrivacyMode ? "Mostrar valores" : "Ocultar valores"}
                            >
                                {isPrivacyMode ? <EyeOff size={24} /> : <Eye size={24} />}
                            </button>
                        </div>
                    </header>

                    {/* Fila 1: Totales Principales */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="card bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.1)]">
                            <div className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">Patrimonio Total</div>
                            <div className="text-3xl font-bold text-white">
                                {formatCurrency(totalCarteraValorada + availableCashValue)}
                            </div>
                        </div>

                        <div className="card border-blue-500/20 bg-blue-500/5">
                            <div className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">Cartera Invertida</div>
                            <div className="text-2xl font-bold text-white mb-1">{formatCurrency(totalCarteraValorada)}</div>
                            <div className="text-[10px] text-gray-500 uppercase font-semibold">
                                {totalCarteraValorada + availableCashValue > 0 ? ((totalCarteraValorada / (totalCarteraValorada + availableCashValue)) * 100).toFixed(1) : 0}% DEL CAPITAL
                            </div>
                        </div>

                        <div className="card border-emerald-500/20 bg-emerald-500/5 group relative">
                            <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                                Liquidez / Efectivo
                                <button
                                    onClick={() => { setCashInput(availableCashValue || ''); setIsEditingCash(true); }}
                                    className="text-emerald-500 hover:text-emerald-300 transition-colors p-1"
                                    title="Ajustar efectivo disponible"
                                >
                                    <Edit3 size={14} />
                                </button>
                            </div>

                            {isEditingCash ? (
                                <input
                                    type="number"
                                    value={cashInput}
                                    onChange={(e) => setCashInput(e.target.value)}
                                    onBlur={() => { setIsEditingCash(false); updateCashBalance(cashInput); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingCash(false); updateCashBalance(cashInput); } }}
                                    className="w-full bg-transparent border-b border-emerald-500 text-2xl font-bold text-white focus:outline-none mb-1 mt-[2px]"
                                    autoFocus
                                    placeholder="0"
                                />
                            ) : (
                                <div className="text-2xl font-bold text-white mb-1">
                                    {formatCurrency(availableCashValue)}
                                </div>
                            )}

                            <div className="text-[10px] text-gray-500 uppercase font-semibold">DISPONIBLE PARA INVERTIR</div>
                        </div>

                        <div className="card border-gray-800">
                            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Plusvalía Global</div>
                            <div className={`text-2xl font-bold ${isPositive && !isPrivacyMode ? 'text-green-400' : 'text-danger'} mb-1`}>
                                {isPrivacyMode ? 'XXXX' : `${isPositive ? '+' : ''}${formatCurrency(plusvalia)}`}
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase font-semibold">
                                BENEFICIO ACUMULADO
                            </div>
                        </div>
                    </div>

                    {/* Fila 2: Rendimiento Detallado (NUEVO) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {/* Rentabilidad % */}
                        <div className="p-4 bg-surface border border-gray-800 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    <TrendingUp size={18} />
                                </div>
                                <span className="text-gray-400 text-xs font-semibold uppercase">Rentabilidad</span>
                            </div>
                            <div className={`text-xl font-bold ${isPositive && !isPrivacyMode ? 'text-green-400' : 'text-danger'}`}>
                                {isPrivacyMode ? 'XX.X%' : `${(totalCapitalAportado > 0 ? (plusvalia / totalCapitalAportado) * 100 : 0).toFixed(2)}%`}
                            </div>
                        </div>

                        {/* Mejor Fondo */}
                        <div className="p-4 bg-surface border border-gray-800 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                                    <Award size={18} />
                                </div>
                                <span className="text-gray-400 text-xs font-semibold uppercase">Mejor Fondo</span>
                            </div>
                            <div className="text-white font-bold truncate text-sm">
                                {(() => {
                                    const performances = Object.entries(currentHoldings).map(([name, data]) => {
                                        const matchKey = getMatchingFundKey(currentNavs, name);
                                        const fallbackNav = data.shares > 0 ? (data.invested / data.shares) : 0;
                                        let currentVal = data.shares * (currentNavs[matchKey] || fallbackNav);
                                        if (data.shares === 0 && data.invested !== 0) {
                                            currentVal = data.invested;
                                        }
                                        const profit = data.invested > 0 ? ((currentVal - data.invested) / data.invested) * 100 : 0;
                                        return { name, profit };
                                    });
                                    const best = performances.reduce((prev, curr) => (prev.profit > curr.profit) ? prev : curr, { name: 'Ninguno', profit: -Infinity });
                                    return isPrivacyMode ? 'MODO OCULTO' : `${best.name.split(' ')[0]} (+${best.profit.toFixed(1)}%)`;
                                })()}
                            </div>
                        </div>

                        {/* Actividad */}
                        <div className="p-4 bg-surface border border-gray-800 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                    <Activity size={18} />
                                </div>
                                <span className="text-gray-400 text-xs font-semibold uppercase">Último Mov.</span>
                            </div>
                            <div className="text-white font-bold">
                                {(() => {
                                    if (regularOrders.length === 0) return 'Sin datos';
                                    const lastDate = new Date(Math.max(...regularOrders.map(o => new Date(o.date))));
                                    const diffDays = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
                                    return diffDays === 0 ? 'Hoy' : `Hace ${diffDays} días`;
                                })()}
                            </div>
                        </div>

                        {/* Eficiencia Balance */}
                        <div className="p-4 bg-surface border border-gray-800 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                    <RefreshCw size={18} />
                                </div>
                                <span className="text-gray-400 text-xs font-semibold uppercase">Equilibrio</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
                                {(() => {
                                    // Cálculo rápido de desviación media respecto al 50%
                                    const deviations = Object.entries(currentHoldings).map(([name, data]) => {
                                        const matchKey = getMatchingFundKey(currentNavs, name);
                                        const fallbackNav = data.shares > 0 ? (data.invested / data.shares) : 0;
                                        let currentVal = data.shares * (currentNavs[matchKey] || fallbackNav);
                                        if (data.shares === 0 && data.invested !== 0) {
                                            currentVal = data.invested;
                                        }
                                        const percent = totalCarteraValorada > 0 ? (currentVal / totalCarteraValorada) * 100 : 0;
                                        return Math.abs(50 - percent);
                                    });
                                    const avgDev = deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;
                                    const score = Math.max(0, 100 - (avgDev * 2));
                                    return (
                                        <div
                                            className={`h-2 rounded-full ${score > 90 ? 'bg-green-400' : score > 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                            style={{ width: `${score}%` }}
                                        ></div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    <HistoricalChart orders={regularOrders} historicalNavs={historicalNavs} isPrivacyMode={isPrivacyMode} currency={currency} formatCurrency={formatCurrency} />

                    <div className="card mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isFetchingNavs ? 'bg-yellow-500 animate-pulse' : navFetchError ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                <h2 className="text-lg font-semibold text-gray-200">Precios de Mercado (Morningstar)</h2>
                            </div>
                            <div className="text-sm text-gray-400">
                                {isFetchingNavs ? 'Actualizando...' : navFetchError ? navFetchError : `Última actualización: ${lastUpdated || 'Al cargar'}`}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {Object.entries(currentNavs).map(([fund, nav]) => (
                                <div key={fund} className="p-3 bg-surface border border-gray-800 rounded-lg flex justify-between items-center">
                                    <span className="text-gray-400 text-sm truncate pr-2 w-3/4">{fund}</span>
                                    <span className="font-mono text-white text-right max-w-[100px]">{formatCurrency(nav)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            ) : currentView === 'portfolio' ? (
                <Portfolio orders={regularOrders} currentNavs={currentNavs} historicalNavs={historicalNavs} janNavs={janNavs} currentHoldings={currentHoldings} totalCarteraValorada={totalCarteraValorada} isPrivacyMode={isPrivacyMode} formatCurrency={formatCurrency} />
            ) : currentView === 'orders' ? (
                <div className="max-w-4xl mx-auto">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">Órdenes</h1>
                        <div className="text-gray-400">Registra y gestiona todas tus operaciones de compra, venta y depósito.</div>
                    </header>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <OrderForm
                                onAddOrder={addOrder}
                                holdings={Object.fromEntries(Object.entries(currentHoldings).map(([k, v]) => [k, v.invested]))}
                            />
                        </div>
                        <div>
                            <OrderList
                                orders={regularOrders}
                                isPrivacyMode={isPrivacyMode}
                                currency={currency}
                                formatCurrency={formatCurrency}
                                onUpdateOrder={updateOrder}
                                onDeleteOrder={deleteOrder}
                            />
                        </div>
                    </div>
                </div>
            ) : currentView === 'settings' ? (
                <Settings onClearData={clearData} onRestoreData={restoreData} onExportData={handleExportData} onImportData={handleImportData} currency={currency} setCurrency={setCurrency} />
            ) : null}
        </Layout>
    );
}

export default App;
