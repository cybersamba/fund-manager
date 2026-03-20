console.log("%c [FundManager] Loaded v1.3.0 - Global Annualized Engine Active ", "background: #2563eb; color: #fff; font-weight: bold;");

import React, { useState, useEffect, useMemo } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { getOrInitFileId, fetchOrdersFromDrive, saveOrdersToDrive } from './googleDriveApi';
import { Eye, EyeOff, Lock } from 'lucide-react';
import Layout from './components/Layout';
import OrderForm from './components/OrderForm';
import OrderList from './components/OrderList';
import Portfolio from './components/Portfolio';
import Settings from './components/Settings';
import HistoricalChart from './components/HistoricalChart';
import Watchlist from './components/Watchlist';
import Guide from './components/Guide';
import { getMatchingFundKey, calculateMWR, calculateTrailingReturn } from './utils/helpers';
import { calculateInflationTarget } from './utils/inflationApi';
import { Share2, Activity, RefreshCw, TrendingUp, TrendingDown, Award, Calendar, Edit3, Monitor, BarChart2 } from 'lucide-react';
import { fetchNavHistory } from './utils/navApi';

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

    // GOOGLE AUTH STATE
    useEffect(() => {
        document.title = "Fund Manager v1.3.0";
    }, []);

    const [session, setSession] = useState(null);
    const [driveFileId, setDriveFileId] = useState(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authSubmitting, setAuthSubmitting] = useState(false);

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setAuthSubmitting(true);
            try {
                const token = tokenResponse.access_token;
                setSession(token);
                const fileId = await getOrInitFileId(token);
                setDriveFileId(fileId);
            } catch (err) {
                console.error(err);
                setAuthError("Error Google: " + err.message);
                setSession(null);
            } finally {
                setAuthSubmitting(false);
            }
        },
        onError: () => setAuthError("Error de autenticación con Google."),
        scope: 'https://www.googleapis.com/auth/drive.file'
    });

    const handleLogin = (e) => {
        e.preventDefault();
        setAuthError('');
        login();
    };

    const handleLogout = () => {
        googleLogout();
        setSession(null);
        setDriveFileId(null);
        setOrders([]);
    };

    const [currentView, setCurrentView] = useState('dashboard');
    // Estado para las órdenes. Inicializamos vacío, luego lo pedimos al servidor.
    const [orders, setOrders] = useState([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [isEditingCash, setIsEditingCash] = useState(false);
    const [cashInput, setCashInput] = useState('');

    useEffect(() => {
        if (!session || !driveFileId) return;
        const fetchOrders = async () => {
            setIsLoadingOrders(true);
            try {
                const data = await fetchOrdersFromDrive(session, driveFileId);
                if (data) {
                    setOrders(data.map(mapFromDb));
                }
            } catch (err) {
                console.error("Failed to fetch orders from Drive backend", err);
                const savedOrders = localStorage.getItem('fund-orders');
                if (savedOrders) {
                    setOrders(JSON.parse(savedOrders));
                }
            } finally {
                setIsLoadingOrders(false);
            }
        };
        fetchOrders();
    }, [session, driveFileId]);

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

    const [fundConfigs, setFundConfigs] = useState(() => {
        const saved = localStorage.getItem('fund-configs-v1');
        if (saved) return JSON.parse(saved);
        return {
            'La Française Trésorerie ISR R': { morningstarId: 'F0GBR06OZK', targetPercent: 50 },
            'Groupama Trésorerie IC': { morningstarId: 'F0GBR04M6M', targetPercent: 50 }
        };
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
        localStorage.setItem('fund-configs-v1', JSON.stringify(fundConfigs));
    }, [fundConfigs]);

    // Automatically detect new funds from orders and add them to configs
    useEffect(() => {
        if (orders.length === 0) return;
        const uniqueFunds = [...new Set(orders.map(o => o.fundName))].filter(Boolean);
        let changed = false;
        const newConfigs = { ...fundConfigs };

        uniqueFunds.forEach(name => {
            if (!newConfigs[name] && name !== 'Efectivo No Invertido') {
                newConfigs[name] = { morningstarId: '', targetPercent: 0 };
                changed = true;
            }
        });

        if (changed) {
            setFundConfigs(newConfigs);
        }
    }, [orders]);

    useEffect(() => {
        const fetchNavs = async () => {
            setIsFetchingNavs(true);
            setNavFetchError(null);
            try {
                // Determine which funds to fetch: Portfolio + Watchlist
                const results = {};
                const janResults = {};
                const historyResults = {};

                // 1. Portfolio Funds (from dynamic configs)
                const portfolioFunds = Object.entries(fundConfigs)
                    .filter(([_, cfg]) => cfg.morningstarId)
                    .map(([name, cfg]) => ({ name, id: cfg.morningstarId }));

                await Promise.all(portfolioFunds.map(async (fund) => {
                    try {
                        const history = await fetchNavHistory(fund.id);
                        if (!history || history.length === 0) return;
                        
                        const latest = history[history.length - 1][1];
                        
                        const currentYear = new Date().getFullYear();
                        const janStartTimestamp = new Date(currentYear, 0, 1).getTime();
                        let janNav = history[0][1];
                        for (let entry of history) {
                            if (entry[0] >= janStartTimestamp) {
                                janNav = entry[1];
                                break;
                            }
                        }

                        results[fund.name] = latest;
                        janResults[fund.name] = janNav;
                        historyResults[fund.name] = history;
                        // Also index by ID for robustness
                        results[fund.id] = latest;
                        historyResults[fund.id] = history;
                    } catch (e) {
                        console.warn(`Failed to fetch portfolio fund ${fund.name}:`, e);
                    }
                }));

                // 2. Watchlist Funds
                try {
                    const WATCHLIST_STORAGE_KEY = 'fund-watchlist-v1';
                    const watchlist = JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY)) || [];
                    
                    await Promise.all(watchlist.map(async (fund) => {
                        try {
                            if (historyResults[fund.morningstarId]) return; // Skip if already fetched as portfolio fund

                            const history = await fetchNavHistory(fund.morningstarId);
                            historyResults[fund.morningstarId] = history;
                            
                            const latest = history[history.length - 1][1];
                            results[fund.morningstarId] = latest;
                            if (fund.name) results[fund.name] = latest;
                        } catch (e) {
                            console.warn(`Failed to fetch watchlist fund ${fund.name}:`, e);
                        }
                    }));
                } catch (e) {
                    console.error("Error reading watchlist for background fetch:", e);
                }

                setCurrentNavs(prev => ({ ...prev, ...results }));
                setJanNavs(prev => ({ ...prev, ...janResults }));
                setHistoricalNavs(prev => ({ ...prev, ...historyResults }));

                setLastUpdated(new Date().toLocaleTimeString());
            } catch (err) {
                console.error("Error fetching Morningstar NAVs:", err);
                setNavFetchError("Error conectando con Morningstar.");
            } finally {
                setIsFetchingNavs(false);
            }
        };

        if (!session) return; 
        fetchNavs();
    }, [session, fundConfigs]);

    const mapToDb = (o) => {
        const mapped = { ...o };
        // Map camelCase to lowercase for Postgres compatibility
        if (mapped.fundName !== undefined) { mapped.fundname = mapped.fundName; delete mapped.fundName; }
        if (mapped.interestRate !== undefined) { mapped.interestrate = mapped.interestRate; delete mapped.interestRate; }
        // Ensure other potential camelCase fields are handled
        if (mapped.original_id !== undefined) { mapped.original_id = mapped.original_id; }
        return mapped;
    };
    const mapFromDb = (o) => {
        const mapped = { ...o };
        // Map lowercase back to camelCase
        if (mapped.fundname !== undefined) { mapped.fundName = mapped.fundname; delete mapped.fundname; }
        
        // Priority to 'interestrate' or 'interestRate' or 'interest_rate'
        const rate = mapped.interestrate !== undefined ? mapped.interestrate : 
                    (mapped.interestRate !== undefined ? mapped.interestRate : 
                    (mapped.interest_rate !== undefined ? mapped.interest_rate : undefined));
        
        if (rate !== undefined) {
            mapped.interestRate = parseFloat(rate) || 0;
            delete mapped.interestrate;
        }

        // Handle duration
        const dur = mapped.duration !== undefined ? mapped.duration : 
                   (mapped.duration_months !== undefined ? mapped.duration_months : undefined);
        if (dur !== undefined) {
            mapped.duration = parseInt(dur, 10) || 12;
        }

        return mapped;
    };

    const addOrder = async (order) => {
        try {
            const { id, ...orderWithoutId } = order;
            const newOrder = { ...mapToDb(orderWithoutId), id: Date.now() }; 
            const newOrders = [mapFromDb(newOrder), ...orders];
            setOrders(newOrders);
            await saveOrdersToDrive(session, driveFileId, newOrders.map(mapToDb));
        } catch (err) {
            console.error("Failed to add order to backend", err);
        }
    };

    const updateOrder = async (id, updatedData) => {
        try {
            const dbReady = mapToDb(updatedData);
            const newOrders = orders.map(order => order.id === id ? mapFromDb({ ...order, ...dbReady }) : order);
            setOrders(newOrders);
            await saveOrdersToDrive(session, driveFileId, newOrders.map(mapToDb));
        } catch (err) {
            console.error("Failed to update order in backend", err);
        }
    };

    const deleteOrder = async (id) => {
        try {
            const newOrders = orders.filter(order => order.id !== id);
            setOrders(newOrders);
            await saveOrdersToDrive(session, driveFileId, newOrders.map(mapToDb));
        } catch (err) {
            console.error("Failed to delete order from backend", err);
        }
    };

    const clearData = async () => {
        try {
            const newOrders = [];
            setOrders(newOrders);
            await saveOrdersToDrive(session, driveFileId, newOrders);
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
            const newOrdersData = initialData.map((o, idx) => ({...o, id: Date.now() + idx}));
            const newOrders = [...newOrdersData].map(mapFromDb).sort((a, b) => new Date(b.date) - new Date(a.date));
            setOrders(newOrders);
            await saveOrdersToDrive(session, driveFileId, newOrdersData);
            setCurrentView('dashboard');
        } catch (err) {
            console.error("Failed to restore default", err);
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
                const cleanedOrders = importedOrders.map((o, idx) => {
                    const { id, ...rest } = o;
                    return { ...mapToDb(rest), id: id || Date.now() + idx };
                });
                const newOrders = [...cleanedOrders].map(mapFromDb).sort((a, b) => new Date(b.date) - new Date(a.date));
                setOrders(newOrders);
                await saveOrdersToDrive(session, driveFileId, cleanedOrders);
                setCurrentView('dashboard');
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
            const noCashOrders = orders.filter(o => o.type !== 'system_cash');
            const newCashOrder = {
                id: Date.now(),
                type: 'system_cash',
                amount: val,
                fundname: 'Efectivo No Invertido',
                date: new Date().toISOString()
            };
            const newOrders = [...noCashOrders.map(mapToDb), newCashOrder];
            setOrders(newOrders.map(mapFromDb));
            await saveOrdersToDrive(session, driveFileId, newOrders);
        } catch (err) {
            console.error("Failed to update cash balance", err);
        }
    };

    // Calculate aggregated metrics with Shares and NAV using FIFO (First-In-First-Out)
    let totalRealizedProfit = 0;
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
            acc[order.fundName].invested -= capitalToDeduct; // Deduct proportional cost basis, not sale amount
            totalRealizedProfit += (order.amount - capitalToDeduct);

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
                // Handle both property names just in case
                const duration = dep.duration || dep.duration_months || 12;
                const rate = dep.interestRate !== undefined ? dep.interestRate : (dep.interestrate !== undefined ? dep.interestrate : 0);
                
                maturityDate.setMonth(maturityDate.getMonth() + duration);
                maturityDate.setHours(23, 59, 59, 999);

                if (new Date() >= maturityDate) {
                    const profit = dep.amount * (rate / 100) * (duration / 12);
                    depositVal += (dep.amount + profit);
                } else {
                    // For non-matured, we show current principal
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
        setSystemStatus({ status: driveFileId ? 'online' : 'connecting', processedItems: orders.length });
    }, [orders.length, driveFileId]);

    // Filter valid orders used for both global and individual IRR calculations
    const validOrders = useMemo(() => regularOrders.filter(o => o.type === 'buy' || o.type === 'sell' || o.type === 'deposit'), [regularOrders]);

    // --- Global Annualized Return (MWR/IRR) Calculation ---
    // We treat all buy/sell/deposit orders as cash flows to calculate the portfolio's absolute IRR
    const globalMWR = useMemo(() => {
        if (validOrders.length === 0 || totalCarteraValorada <= 0) return 0;
        return calculateMWR(validOrders, totalCarteraValorada);
    }, [validOrders, totalCarteraValorada]);

    const plusvaliaLatente = totalCarteraValorada - totalCapitalAportado;
    const plusvalia = plusvaliaLatente + totalRealizedProfit;
    const isPositive = plusvalia >= 0;

    const { inflationTargetValue } = useMemo(() => calculateInflationTarget(validOrders), [validOrders]);
    const inflationHurdleCost = inflationTargetValue > 0 && totalCapitalAportado > 0 ? (inflationTargetValue - totalCapitalAportado) : 0;
    const isBeatingInflation = (plusvaliaLatente + availableCashValue) >= (inflationHurdleCost + availableCashValue);

    // Calculate Fund-only metrics for the dashboard Rentabilidad card
    const fundHoldingsEntries = Object.entries(currentHoldings).filter(([_, data]) => !data.isDeposit);
    const fundCapitalAportado = fundHoldingsEntries.reduce((sum, [_, data]) => sum + data.invested, 0);
    const fundCarteraValorada = fundHoldingsEntries.reduce((sum, [fundName, data]) => {
        const matchKey = getMatchingFundKey(currentNavs, fundName);
        const fallbackNav = data.shares > 0 ? (data.invested / data.shares) : 0;
        const nav = currentNavs[matchKey] || fallbackNav;
        return sum + (data.shares * nav);
    }, 0);
    const fundPlusvalia = (fundCarteraValorada - fundCapitalAportado) + totalRealizedProfit;
    const fundRentabilidad = fundCapitalAportado > 0 ? (fundPlusvalia / fundCapitalAportado) * 100 : 0;

    // Auth loading screen
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#111] flex items-center justify-center">
                <div className="text-gray-500 text-sm animate-pulse">Verificando sesión...</div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-[#111] flex items-center justify-center p-4 font-sans text-white">
                <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-[#111] border border-gray-800 rounded-full flex items-center justify-center shadow-inner shadow-black/50">
                            <Lock className="w-7 h-7 text-blue-500" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-center mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Acceso Privado</h2>
                    <p className="text-gray-500 text-xs text-center mb-8 uppercase tracking-widest font-semibold">FUND MANAGER</p>

                    <div className="space-y-3">
                        {authError && (
                            <div className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded">{authError}</div>
                        )}
                        <button
                            onClick={handleLogin}
                            disabled={authSubmitting}
                            className="w-full bg-white text-black font-semibold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 mt-2 flex items-center justify-center gap-2 hover:bg-gray-100"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            {authSubmitting ? 'Conectando...' : 'Entrar con Google'}
                        </button>
                    </div>
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
                                <h1 className="text-3xl font-bold mb-2">
                                    Resumen de Cuenta <span className="retro-caret" />
                                    <span className="ml-3 text-[10px] font-mono text-primary/40 bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded align-middle">v1.3.0</span>
                                </h1>
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

                    {/* Fila 1: Totales Principales (3 Columnas Dense Symmetrical Layout) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        
                        {/* 1. Patrimonio Global & Liquidez */}
                        <div className="card bg-gradient-to-br from-indigo-900/40 to-[#111] border-indigo-500/30 flex flex-col justify-between shadow-[0_0_30px_rgba(79,70,229,0.05)]">
                            <div>
                                <div className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">Patrimonio Total</div>
                                <div className="text-4xl font-bold text-white mb-4">
                                    {formatCurrency(totalCarteraValorada + availableCashValue)}
                                </div>
                            </div>
                            <div className="flex bg-black/40 rounded-lg p-3 justify-between items-center border border-indigo-500/10 gap-4">
                                <div className="flex-1">
                                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Fondos Invertidos</div>
                                    <div className="text-sm font-bold text-gray-300">{formatCurrency(totalCarteraValorada)}</div>
                                </div>
                                <div className="w-[1px] h-8 bg-gray-800"></div>
                                <div className="flex-1 group">
                                    <div className="flex justify-between items-center">
                                        <div className="text-[10px] text-emerald-500/80 uppercase font-semibold">Caja / Liquidez</div>
                                        <button
                                            onClick={() => { setCashInput(availableCashValue || ''); setIsEditingCash(true); }}
                                            className="text-gray-600 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                                            title="Ajustar liquidez manual"
                                        >
                                            <Edit3 size={12} />
                                        </button>
                                    </div>
                                    {isEditingCash ? (
                                        <input
                                            type="number"
                                            value={cashInput}
                                            onChange={(e) => setCashInput(e.target.value)}
                                            onBlur={() => { setIsEditingCash(false); updateCashBalance(cashInput); }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingCash(false); updateCashBalance(cashInput); } }}
                                            className="w-full bg-transparent border-b border-emerald-500 text-sm font-bold text-emerald-400 focus:outline-none"
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="text-sm font-bold text-emerald-400/90">{formatCurrency(availableCashValue)}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. Plusvalía Absoluta */}
                        <div className="card border-gray-800 flex flex-col justify-between relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none ${isPositive ? 'bg-green-500/5' : 'bg-red-500/5'}`}></div>
                            <div>
                                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Plusvalía Global (Beneficio)</div>
                                <div className={`text-4xl font-bold mb-4 ${isPositive && !isPrivacyMode ? 'text-green-400' : 'text-danger'}`}>
                                    {isPrivacyMode ? 'XXXX' : `${isPositive ? '+' : ''}${formatCurrency(plusvalia)}`}
                                </div>
                            </div>
                            <div className="flex bg-background/50 rounded-lg p-3 justify-between items-center border border-gray-800/50 gap-4">
                                <div className="flex-1">
                                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Rent. Simple</div>
                                    <div className={`text-sm font-bold ${fundRentabilidad >= 0 && !isPrivacyMode ? 'text-green-400/80' : 'text-danger/80'}`}>
                                        {isPrivacyMode ? 'XX.X%' : `${(fundRentabilidad >= 0 ? '+' : '')}${fundRentabilidad.toFixed(2)}%`}
                                    </div>
                                </div>
                                <div className="w-[1px] h-8 bg-gray-800"></div>
                                <div className="flex-1">
                                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Ganancia Consolidada</div>
                                    <div className={`text-sm font-bold ${totalRealizedProfit > 0 && !isPrivacyMode ? 'text-green-500/80' : 'text-gray-400'}`}>
                                        {isPrivacyMode ? 'XXXX' : formatCurrency(totalRealizedProfit)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Rentabilidad (TIR / MWR) */}
                        <div className="card border-blue-500/10 bg-blue-500/5 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="text-blue-400 text-xs font-bold uppercase tracking-wider">TIR Real (MWR Anual)</div>
                                    <div title="Mide tu rentabilidad real año a año, neutralizando aportaciones." className="bg-blue-500/20 text-blue-400 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold cursor-help">?</div>
                                </div>
                                <div className={`text-4xl font-bold mb-4 ${globalMWR >= 0 && !isPrivacyMode ? 'text-blue-400' : 'text-danger'}`}>
                                    {isPrivacyMode ? 'XX.X%' : `${globalMWR >= 0 ? '+' : ''}${globalMWR.toFixed(2)}%`}
                                </div>
                            </div>
                            <div className="flex bg-blue-900/10 rounded-lg p-3 justify-between items-center border border-blue-500/10">
                                <div className="flex-1">
                                    <div className="text-[10px] text-red-400/70 uppercase font-semibold">Peaje Inflación Acumulada</div>
                                    <div className={`text-sm font-bold ${isBeatingInflation ? 'text-red-400/90' : 'text-danger'}`}>
                                        {isPrivacyMode ? 'XXXX' : `-${formatCurrency(inflationHurdleCost)}`}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Fila 2: Tablas e Indicadores */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Rentabilidad Historica de Fondos (1A y 3A) */}
                        <div className="lg:col-span-2 p-5 bg-surface border border-gray-800 rounded-xl overflow-hidden relative">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 z-10">
                                    <BarChart2 size={18} />
                                </div>
                                <span className="text-gray-400 text-xs font-semibold uppercase z-10">Rentabilidad Histórica (1A y 3A)</span>
                            </div>
                            <div className="overflow-x-auto relative z-10">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-gray-500 text-[10px] uppercase border-b border-gray-800/80">
                                            <th className="pb-1">Fondo</th>
                                            <th className="pb-1 text-right">Mi TIR</th>
                                            <th className="pb-1 text-right">1 Año</th>
                                            <th className="pb-1 text-right">3 Años (Anual)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(currentHoldings).filter(([_, data]) => !data.isDeposit && data.invested !== 0).map(([name, data]) => {
                                            const matchKey = getMatchingFundKey(currentNavs, name);
                                            const currentNav = currentNavs[matchKey] || (data.shares > 0 ? (data.invested / data.shares) : 0);
                                            const history = historicalNavs[matchKey] || [];
                                            
                                            // Handle truncated or short history display
                                            let ret1A = calculateTrailingReturn(history, currentNav, 1);
                                            let ret3A = calculateTrailingReturn(history, currentNav, 3);
                                            
                                            // Calculate user's specific annualized return (MWR) for this fund
                                            const fundOrders = validOrders.filter(o => o.fundName === name);
                                            const currentVal = data.shares * currentNav;
                                            const myTir = fundOrders.length > 0 && currentVal > 0 ? calculateMWR(fundOrders, currentVal) : null;

                                            return (
                                                <tr key={name} className="border-b border-gray-800/30 last:border-0 hover:bg-white/5 transition-colors">
                                                    <td className="py-2 text-gray-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px]" title={name}>{name}</td>
                                                    <td className={`py-2 text-right font-bold ${myTir !== null ? (myTir >= 0 ? 'text-indigo-400' : 'text-danger') : 'text-gray-600'}`}>
                                                        {isPrivacyMode ? 'XX.X%' : (myTir !== null ? `${myTir >= 0 ? '+' : ''}${myTir.toFixed(1)}%` : '-')}
                                                    </td>
                                                    <td className={`py-2 text-right font-bold ${ret1A !== null ? (ret1A >= 0 ? 'text-green-400' : 'text-danger') : 'text-gray-600'}`}>
                                                        {isPrivacyMode ? 'XX.X%' : (ret1A !== null ? `${ret1A >= 0 ? '+' : ''}${ret1A.toFixed(1)}%` : '-')}
                                                    </td>
                                                    <td className={`py-2 text-right font-bold ${ret3A !== null ? (ret3A >= 0 ? 'text-green-400' : 'text-danger') : 'text-gray-600'}`}>
                                                        {isPrivacyMode ? 'XX.X%' : (ret3A !== null ? `${ret3A >= 0 ? '+' : ''}${ret3A.toFixed(1)}%` : '-')}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {Object.keys(currentHoldings).filter(k => !currentHoldings[k].isDeposit).length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="py-3 text-center text-gray-500 text-xs italic">No hay fondos activos.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
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
                                <div key={fund} className="p-3 bg-surface border border-gray-800 rounded-lg flex justify-between items-center gap-3">
                                    <span className="text-gray-400 text-sm flex-1">{fund}</span>
                                    <span className="font-mono text-white text-right whitespace-nowrap">{formatCurrency(nav)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            ) : currentView === 'portfolio' ? (
                <Portfolio orders={regularOrders} currentNavs={currentNavs} historicalNavs={historicalNavs} janNavs={janNavs} currentHoldings={currentHoldings} totalCarteraValorada={totalCarteraValorada} isPrivacyMode={isPrivacyMode} formatCurrency={formatCurrency} fundConfigs={fundConfigs} />
            ) : currentView === 'orders' ? (
                <div className="max-w-4xl mx-auto">
                    <header className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <h1 className="text-3xl font-bold text-white">Órdenes</h1>
                                <div className="text-[10px] font-mono text-primary/50 uppercase tracking-tighter">Engine v1.3.0 - Historical Memory Enabled</div>
                            </div>
                        </div>
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
                <Settings onClearData={clearData} onRestoreData={restoreData} onExportData={handleExportData} onImportData={handleImportData} currency={currency} setCurrency={setCurrency} fundConfigs={fundConfigs} setFundConfigs={setFundConfigs} />
            ) : currentView === 'watchlist' ? (
                <Watchlist isPrivacyMode={isPrivacyMode} externalHistoricalNavs={historicalNavs} isUpdatingGlobal={isFetchingNavs} orders={regularOrders} />
            ) : currentView === 'guide' ? (
                <Guide />
            ) : null}
        </Layout>
    );
}

export default App;
