import React, { useState, useEffect, useMemo } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { getOrInitFileId, fetchDataFromDrive, saveDataToDrive } from './googleDriveApi';
import { Eye, EyeOff, Lock } from 'lucide-react';
import Layout from './components/Layout';
import OrderForm from './components/OrderForm';
import OrderList from './components/OrderList';
import Portfolio from './components/Portfolio';
import Settings from './components/Settings';
import Watchlist from './components/Watchlist';
import Simulation from './components/Simulation';
import Guide from './components/Guide';
import HistoricalChart from './components/HistoricalChart';
import { getMatchingFundKey, calculateMWR, calculateTrailingReturn, calculateMonthlyReturns, calculateMaxDrawdown, calculateCorrelation } from './utils/helpers';
import MonthlyHeatmap from './components/MonthlyHeatmap';
import FIRESimulator from './components/FIRESimulator';
import CorrelationMatrix from './components/CorrelationMatrix';
import SmartAssistant from './components/SmartAssistant';
import { calculateInflationTarget } from './utils/inflationApi';
import { RefreshCw, LayoutDashboard, Target, History, Settings as SettingsIcon, LogOut, BarChart2, Monitor, Sparkles, Brain, TrendingUp } from 'lucide-react';
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

    const [theme, setTheme] = useState(() => {
        const retro = localStorage.getItem('fund-retro-mode');
        if (retro === 'true') {
            localStorage.setItem('fund-theme', 'retro');
            localStorage.removeItem('fund-retro-mode');
        }
        return localStorage.getItem('fund-theme') || 'light';
    });

    useEffect(() => {
        localStorage.setItem('fund-theme', theme);
        document.body.className = theme === 'light' ? '' : theme;
    }, [theme]);

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

    const [dataLoaded, setDataLoaded] = useState(false);

    useEffect(() => {
        if (!session || !driveFileId) return;
        const fetchAllData = async () => {
            setIsLoadingOrders(true);
            try {
                const { orders: driveOrders, fundConfigs: driveConfigs } = await fetchDataFromDrive(session, driveFileId);
                
                if (driveOrders) {
                    setOrders(driveOrders.map(mapFromDb));
                }
                
                if (driveConfigs && Object.keys(driveConfigs).length > 0) {
                    setFundConfigs(prev => ({ ...prev, ...driveConfigs }));
                }
                setDataLoaded(true);
            } catch (err) {
                console.error("Failed to fetch data from Drive backend", err);
                const savedOrders = localStorage.getItem('fund-orders');
                if (savedOrders) {
                    setOrders(JSON.parse(savedOrders));
                }
            } finally {
                setIsLoadingOrders(false);
            }
        };
        fetchAllData();
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
            'La Française Trésorerie ISR R': { morningstarId: 'F0GBR06OZK', targetPercent: 50, assetClass: 'monetario' },
            'Groupama Trésorerie IC': { morningstarId: 'F0GBR04M6M', targetPercent: 50, assetClass: 'monetario' }
        };
    });

    const STANDARD_BENCHMARKS = {
        'S&P 500 (Vanguard)': 'F00000OWOK',
        'MSCI World (iShares)': 'F00000J6S1'
    };

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
        // Sync to drive if changed
        if (session && driveFileId && dataLoaded) {
            saveDataToDrive(session, driveFileId, orders.map(mapToDb), fundConfigs).catch(console.error);
        }
    }, [fundConfigs, dataLoaded]);

    useEffect(() => {
        if (orders.length === 0) return;
        setFundConfigs(prevConfigs => {
            const uniqueFunds = [...new Set(orders.map(o => o.fundName))].filter(Boolean);
            let changed = false;
            const newConfigs = { ...prevConfigs };

            uniqueFunds.forEach(name => {
                if ((!newConfigs[name] || !newConfigs[name].assetClass) && name !== 'Efectivo No Invertido') {
                    let assetClass = 'renta-variable';
                    const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    
                    if (normalized.includes('tresorerie') || normalized.includes('monetario') || normalized.includes('liquidez') || normalized.includes('money market') || normalized.includes('treasury')) {
                        assetClass = 'monetario';
                    } else if (normalized.includes('bono') || normalized.includes('renta fija') || normalized.includes('deuda') || normalized.includes('fixed income') || normalized.includes('bond')) {
                        assetClass = 'renta-fija';
                    } else if (normalized.includes('deposito')) {
                        assetClass = 'deposito';
                    }

                    if (!newConfigs[name]) {
                        newConfigs[name] = { morningstarId: '', targetPercent: 0, ter: 0, assetClass };
                    } else {
                        newConfigs[name].assetClass = assetClass;
                    }
                    changed = true;
                }
            });

            return changed ? newConfigs : prevConfigs;
        });
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

                // Add standard benchmarks to the fetch list
                Object.entries(STANDARD_BENCHMARKS).forEach(([name, id]) => {
                    portfolioFunds.push({ name, id });
                });

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

        // auto assign broker
        if (!mapped.broker) {
            if (mapped.type === 'deposit' || mapped.fundName?.includes('Efectivo')) {
                mapped.broker = 'ING';
            } else {
                mapped.broker = 'MyInvestor';
            }
        }

        return mapped;
    };

    const addOrder = async (order) => {
        try {
            const { id, ...orderWithoutId } = order;
            const newOrder = { ...mapToDb(orderWithoutId), id: Date.now() }; 
            const newOrders = [mapFromDb(newOrder), ...orders];
            setOrders(newOrders);
            await saveDataToDrive(session, driveFileId, newOrders.map(mapToDb), fundConfigs);
        } catch (err) {
            console.error("Failed to add order to backend", err);
        }
    };

    const updateOrder = async (id, updatedData) => {
        try {
            const dbReady = mapToDb(updatedData);
            const newOrders = orders.map(order => order.id === id ? mapFromDb({ ...order, ...dbReady }) : order);
            setOrders(newOrders);
            await saveDataToDrive(session, driveFileId, newOrders.map(mapToDb), fundConfigs);
        } catch (err) {
            console.error("Failed to update order in backend", err);
        }
    };

    const deleteOrder = async (id) => {
        try {
            const newOrders = orders.filter(order => order.id !== id);
            setOrders(newOrders);
            await saveDataToDrive(session, driveFileId, newOrders.map(mapToDb), fundConfigs);
        } catch (err) {
            console.error("Failed to delete order from backend", err);
        }
    };

    const clearData = async () => {
        try {
            const newOrders = [];
            setOrders(newOrders);
            await saveDataToDrive(session, driveFileId, newOrders, fundConfigs);
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
            const newOrdersLocal = [...newOrdersData].map(mapFromDb).sort((a, b) => new Date(b.date) - new Date(a.date));
            setOrders(newOrdersLocal);
            await saveDataToDrive(session, driveFileId, newOrdersData, fundConfigs);
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
                await saveDataToDrive(session, driveFileId, cleanedOrders, fundConfigs);
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
            const dbOrders = [...noCashOrders.map(mapToDb), newCashOrder];
            setOrders(dbOrders.map(mapFromDb));
            await saveDataToDrive(session, driveFileId, dbOrders, fundConfigs);
        } catch (err) {
            console.error("Failed to update cash balance", err);
        }
    };

    // Calculate aggregated metrics with Shares and NAV using FIFO (First-In-First-Out)
    let totalRealizedProfit = 0;
    const currentHoldings = regularOrders.slice().reverse().reduce((acc, order) => {
        if (!acc[order.fundName]) {
            acc[order.fundName] = { shares: 0, invested: 0, buyLots: [], broker: order.broker };
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

    // --- Advanced Intelligence: Monthly Matrix & Drawdown ---
    const monthlyData = useMemo(() => {
        return calculateMonthlyReturns(validOrders, historicalNavs, currentNavs);
    }, [validOrders, historicalNavs, currentNavs]);

    // Calculate Max Drawdown from historical metrics
    // Since we don't have the full day-by-day chartData here yet (it's inside HistoricalChart),
    // we can approximate it or use the monthly endValues for a rougher but useful metric.
    const maxDrawdown = useMemo(() => {
        if (!monthlyData || monthlyData.length === 0) return 0;
        return calculateMaxDrawdown(monthlyData.map(d => ({ value: d.endValue })));
    }, [monthlyData]);

    // Estimated Tax (Spain: 19% up to 6k, 21% up to 50k, 23% up to 200k, 26% > 200k)
    const estimateTax = (profit) => {
        if (profit <= 0) return 0;
        let tax = 0;
        if (profit <= 6000) return profit * 0.19;
        
        tax += 6000 * 0.19;
        if (profit <= 50000) return tax + (profit - 6000) * 0.21;
        
        tax += (50000 - 6000) * 0.21;
        if (profit <= 200000) return tax + (profit - 50000) * 0.23;
        
        tax += (200000 - 50000) * 0.23;
        return tax + (profit - 200000) * 0.26;
    };

    const fiscalImpact = estimateTax(plusvaliaLatente);

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

    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden text-slate-900 font-mono gap-4">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                <div className="text-slate-400 text-[10px] tracking-[0.2em] font-medium">INICIALIZANDO_CONEXION</div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-900 relative overflow-hidden">
                <div className="w-full max-w-sm relative z-10 flex flex-col items-center animate-fade-in-up">
                    <div className="w-12 h-12 bg-slate-900 flex items-center justify-center rounded-[14px] mb-10 shadow-lg">
                        <Lock className="w-5 h-5 text-white" />
                    </div>

                    <h2 className="text-3xl font-bold text-center mb-2 tracking-tight text-gradient">Acceso al Sistema</h2>
                    <p className="text-slate-400 text-[10px] text-center mb-12 tracking-[0.3em] font-medium uppercase font-mono">Fund Manager v2.0</p>

                    <div className="space-y-4 w-full">
                        {authError && (
                            <div className="text-rose-600 text-xs text-center border border-rose-200 bg-rose-50 py-3 px-4 rounded-xl">{authError}</div>
                        )}
                        <button
                            onClick={handleLogin}
                            disabled={authSubmitting}
                            className="w-full btn-void py-3.5 flex items-center justify-center gap-3"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            {authSubmitting ? 'Autenticando...' : 'Acceder con Google'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const headerActions = (
        <div className="flex gap-1.5 items-center">
            <div className="flex items-center gap-2 mr-2" title={systemStatus.status === 'online' ? 'Servidor Conectado' : 'Conectando...'}>
                <span className={`w-2 h-2 rounded-full ${systemStatus.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500 animate-pulse'}`} />
                <span className="hidden md:inline text-[9px] font-mono tracking-wider text-slate-400">
                    {systemStatus.status === 'online' ? 'ONLINE' : 'SYNCING'}
                </span>
            </div>
            <button onClick={handleHardRefresh} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200" title="Sincronizar Mercado"><RefreshCw size={16} /></button>
            <button onClick={() => setTheme(t => t === 'light' ? 'wallst' : t === 'wallst' ? 'retro' : 'light')} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200" title="Tema Visual">
                {theme === 'retro' ? <Monitor size={16} /> : theme === 'wallst' ? <BarChart2 size={16} /> : <Eye size={16} />}
            </button>
            <button onClick={() => setIsPrivacyMode(!isPrivacyMode)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200" title="Modo Privacidad">{isPrivacyMode ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        </div>
    );

    return (
        <Layout currentView={currentView} onNavigate={setCurrentView} onLogout={handleLogout} headerActions={headerActions}>
            {currentView === 'dashboard' ? (
                <div className="w-full flex flex-col gap-6">
                    {/* BENTO GRID: HERO METRICS - COMPACT EDITION */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        
                        {/* 1. HERO BENTO: Patrimonio Global (Span 2) */}
                        <div className="md:col-span-2 bento-card p-5 flex flex-col justify-between min-h-[140px]">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-slate-400 text-[9px] font-mono tracking-[0.15em] uppercase flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${systemStatus.status === 'online' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                                    Patrimonio Global
                                </div>
                            </div>
                            
                            <div className="flex-1 flex flex-col justify-center">
                                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
                                    {isPrivacyMode ? '***,***' : formatCurrency(totalCarteraValorada + availableCashValue)}
                                </h1>
                                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                                    <div className="flex items-center gap-1.5"><span>INVERTIDO</span><span className="text-slate-800 font-semibold">{isPrivacyMode ? '***' : formatCurrency(totalCarteraValorada)}</span></div>
                                    <div className="w-[1px] h-3 bg-slate-300" />
                                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700" onClick={() => { setCashInput(availableCashValue || ''); setIsEditingCash(true); }}>
                                        <span>LÍQUIDO</span>
                                        {isEditingCash ? (
                                            <input type="number" value={cashInput} onChange={(e) => setCashInput(e.target.value)} onBlur={() => { setIsEditingCash(false); updateCashBalance(cashInput); }} onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingCash(false); updateCashBalance(cashInput); } }} className="w-16 bg-white border-b border-slate-400 text-slate-900 focus:outline-none focus:border-slate-900" autoFocus />
                                        ) : (
                                            <span className="text-slate-800 font-semibold underline decoration-slate-300 underline-offset-2">{isPrivacyMode ? '***' : formatCurrency(availableCashValue)}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. ROI BENTO (TIR) */}
                        <div className="bento-card bg-slate-50 p-5 flex flex-col justify-center">
                            <div className="text-slate-400 text-[9px] font-mono tracking-[0.15em] uppercase mb-2 flex justify-between items-center">
                                <span>Tasa Interna (TIR)</span><span className="text-slate-300 cursor-help" title="Tasa Interna de Retorno">?</span>
                            </div>
                            <div className={`text-3xl font-extrabold tracking-tight ${globalMWR >= 0 && !isPrivacyMode ? 'text-slate-900' : 'text-rose-600'}`}>
                                {isPrivacyMode ? 'XX.X%' : `${globalMWR >= 0 ? '+' : ''}${globalMWR.toFixed(2)}%`}
                            </div>
                        </div>

                        {/* 3. P&L BENTO */}
                        <div className="bento-card bg-slate-50 p-5 flex flex-col justify-center">
                            <div className="text-slate-400 text-[9px] font-mono tracking-[0.15em] uppercase mb-2">Plusvalía Neta</div>
                            <div className={`text-3xl font-extrabold tracking-tight mb-2 ${isPositive && !isPrivacyMode ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isPrivacyMode ? 'XXXX' : `${isPositive ? '+' : ''}${formatCurrency(plusvalia)}`}
                            </div>
                            <div className="flex flex-col gap-1 text-[9px] font-mono font-bold text-slate-500 uppercase">
                                <div className="flex items-center gap-1.5 justify-between">
                                    <span>ROI {(fundRentabilidad >= 0 ? '+' : '')}{fundRentabilidad.toFixed(2)}%</span>
                                    <span className="text-rose-400 font-medium">DRAWDOWN {isPrivacyMode ? 'X.X%' : `${maxDrawdown.toFixed(1)}%`}</span>
                                </div>
                                <div className="flex items-center gap-1.5 justify-between">
                                    <span>INFLACIÓN. {isPrivacyMode ? '***' : formatCurrency(inflationHurdleCost)}</span>
                                    <span className="text-slate-400">NETO (TAX) {isPrivacyMode ? '***' : formatCurrency(plusvaliaLatente - fiscalImpact)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── SECCIÓN CENTRAL: GRÁFICO Y MÉTRICAS DETALLADAS ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* GRÁFICO DE RENDIMIENTO (2/3) */}
                        <div className="lg:col-span-2 bento-card p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    <TrendingUp size={14} />
                                </div>
                                <span className="font-bold text-sm text-slate-800">Evolución de Patrimonio</span>
                            </div>
                            <HistoricalChart seamless={true} orders={validOrders} historicalNavs={historicalNavs} isPrivacyMode={isPrivacyMode} currency={currency} formatCurrency={formatCurrency} />
                        </div>

                        {/* RENTABILIDAD POR FONDO (1/3) */}
                        <div className="bento-card p-6 overflow-hidden relative">
                             <div className="flex items-center gap-2 mb-6">
                                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    <Sparkles size={14} />
                                </div>
                                <span className="font-bold text-sm text-slate-800">Rendimiento Activos</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-50">
                                            <th className="pb-2 font-semibold">Activo</th>
                                            <th className="pb-2 text-right font-semibold">TIR</th>
                                            <th className="pb-2 text-right font-semibold">1A</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-mono">
                                        {Object.entries(currentHoldings).filter(([_, data]) => !data.isDeposit && data.invested !== 0).map(([name, data]) => {
                                            const matchKey = getMatchingFundKey(currentNavs, name);
                                            const currentNav = currentNavs[matchKey] || (data.shares > 0 ? (data.invested / data.shares) : 0);
                                            const history = historicalNavs[matchKey] || [];
                                            
                                            let ret1A = calculateTrailingReturn(history, currentNav, 1);
                                            const fundOrders = validOrders.filter(o => o.fundName === name);
                                            const currentVal = data.shares * currentNav;
                                            const myTir = fundOrders.length > 0 && currentVal > 0 ? calculateMWR(fundOrders, currentVal) : null;

                                            return (
                                                <tr key={name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-4 text-slate-700 font-medium truncate max-w-[100px]" title={name}>{name.split(' ').slice(0,2).join(' ')}...</td>
                                                    <td className={`py-4 text-right font-bold ${myTir !== null ? (myTir >= 0 ? 'text-indigo-600' : 'text-rose-600') : 'text-slate-400'}`}>
                                                        {isPrivacyMode ? '••' : (myTir !== null ? `${myTir.toFixed(2)}%` : '-')}
                                                    </td>
                                                    <td className={`py-4 text-right font-bold ${ret1A !== null ? (ret1A >= 0 ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>
                                                        {isPrivacyMode ? '••' : (ret1A !== null ? `${ret1A.toFixed(2)}%` : '-')}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* MATRIZ DE RENDIMIENTO MENSUAL: ANCHO COMPLETO PARA LEGIBILIDAD */}
                    <div className="mt-2">
                        <MonthlyHeatmap monthlyData={monthlyData} isPrivacyMode={isPrivacyMode} />
                    </div>
                </div>
            ) : currentView === 'portfolio' ? (
                <div className="animate-fade-in-up">
                    <Portfolio 
                        orders={regularOrders} 
                        currentNavs={currentNavs} 
                        historicalNavs={historicalNavs} 
                        janNavs={janNavs} 
                        currentHoldings={currentHoldings} 
                        totalCarteraValorada={totalCarteraValorada} 
                        isPrivacyMode={isPrivacyMode} 
                        formatCurrency={formatCurrency} 
                        fundConfigs={fundConfigs} 
                    />
                </div>
            ) : currentView === 'analisis' ? (
                <div className="space-y-6 animate-fade-in-up">
                    <header className="mb-2">
                        <h1 className="text-2xl font-sans font-bold text-slate-900 mb-1 tracking-tight">Análisis Estratégico</h1>
                        <div className="text-[10px] font-mono whitespace-nowrap overflow-hidden text-ellipsis text-slate-400 tracking-[0.2em] uppercase">Simulaciones y Métricas Avanzadas</div>
                    </header>

                    <FIRESimulator 
                        currentPortfolioValue={totalCarteraValorada} 
                        currentTIR={globalMWR} 
                        formatCurrency={formatCurrency}
                        isPrivacyMode={isPrivacyMode}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CorrelationMatrix historicalNavs={historicalNavs} isPrivacyMode={isPrivacyMode} />
                        <SmartAssistant 
                            currentHoldings={currentHoldings} 
                            totalCarteraValorada={totalCarteraValorada} 
                            fundConfigs={fundConfigs}
                            formatCurrency={formatCurrency}
                        />
                    </div>
                </div>
            ) : currentView === 'orders' ? (
                <div className="max-w-5xl mx-auto">
                    <header className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <h1 className="text-2xl md:text-3xl font-bold text-text">Órdenes</h1>
                                <div className="text-[9px] font-mono text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md w-fit mt-1">Engine v2.0 — Strategic Hub</div>
                            </div>
                        </div>
                        <div className="text-text-muted text-sm mt-2">Registra y gestiona todas tus operaciones de compra, venta y depósito.</div>
                    </header>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            ) : currentView === 'simulation' ? (
                <Simulation isPrivacyMode={isPrivacyMode} formatCurrency={formatCurrency} />
            ) : currentView === 'guide' ? (
                <Guide />
            ) : null}
        </Layout>
    );
}

class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', fontFamily: 'monospace', color: 'red', background: '#ffebee', minHeight: '100vh' }}>
                    <h2>React Runtime Crash:</h2>
                    <pre>{this.state.error?.toString()}</pre>
                    <pre style={{ fontSize: '10px', marginTop: '20px' }}>{this.state.error?.stack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function AppWithErrorBoundary() {
    return (
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    );
}
