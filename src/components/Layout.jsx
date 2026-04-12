import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Target, History, Settings, LogOut, Activity, ShieldCheck, Coins, PiggyBank, BookOpen, Star, BrainCircuit } from 'lucide-react';

export default function Layout({ currentView, onNavigate, user, onLogout, children, headerActions }) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItems = [
        { id: 'dashboard', label: 'Monitor', icon: <LayoutDashboard size={18} /> },
        { id: 'portfolio', label: 'Cartera', icon: <Target size={18} /> },
        { id: 'analisis', label: 'Análisis', icon: <BrainCircuit size={18} /> },
        { id: 'orders', label: 'Libro', icon: <History size={18} /> },
        { id: 'settings', label: 'Ajustes', icon: <Settings size={18} /> }
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-200 relative overflow-hidden flex flex-col items-center">
            
            {/* The global noise layer removed for pure clean aesthetic */}

            {/* TOP BAR / COMMAND HEADER - Ultra Slim */}
            <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-out flex items-center justify-between px-4 py-1.5 md:px-6 md:py-2.5 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm' : 'bg-transparent border-transparent'}`}>
                {/* Logo Area */}
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-slate-900 flex items-center justify-center shadow-sm">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22L2 12L12 2L22 12L12 22Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 16L6 12L12 8L18 12L12 16Z" fill="white"/>
                        </svg>
                    </div>
                    <div className="font-bold text-sm tracking-tight hidden sm:block text-slate-900 select-none">
                        Zero<span className="text-slate-400 font-medium">Terminal</span>
                    </div>
                </div>

                {/* SLIM Asset Class Legend */}
                <div className="hidden lg:flex items-center gap-2.5 px-3 py-1 bg-slate-100/60 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm">
                    <div className="flex items-center gap-1 text-[9px] uppercase font-mono font-bold tracking-widest text-emerald-600">
                        <Activity size={10} /> R.Var
                    </div>
                    <div className="w-px h-2.5 bg-slate-300"></div>
                    <div className="flex items-center gap-1 text-[9px] uppercase font-mono font-bold tracking-widest text-indigo-600">
                        <ShieldCheck size={10} /> R.Fija
                    </div>
                    <div className="w-px h-2.5 bg-slate-300"></div>
                    <div className="flex items-center gap-1 text-[9px] uppercase font-mono font-bold tracking-widest text-cyan-600">
                        <Coins size={10} /> Monet
                    </div>
                    <div className="w-px h-2.5 bg-slate-300"></div>
                    <div className="flex items-center gap-1 text-[9px] uppercase font-mono font-bold tracking-widest text-amber-500">
                        <PiggyBank size={10} /> Depósitos
                    </div>
                </div>

                {/* User Session Area */}
                <div className="flex items-center gap-3">
                    {headerActions}
                    {user && (
                        <>
                            <div className="hidden md:flex flex-col items-end leading-none justify-center">
                                <span className="text-[10px] font-bold text-slate-700">{user.name}</span>
                                <span className="text-[8px] text-slate-400 font-mono tracking-widest uppercase mt-[2px]">Conectado</span>
                            </div>
                            {user.picture ? (
                                <img src={user.picture} alt="Avatar" className="w-6 h-6 rounded-full border border-slate-200 shadow-sm" referrerPolicy="no-referrer" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold border border-slate-200 text-slate-700 shadow-sm">
                                    {user.name?.charAt(0) || 'U'}
                                </div>
                            )}
                            <button
                                onClick={onLogout}
                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                                title="Desconectar"
                            >
                                <LogOut size={14} />
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* MAIN CONTENT CANVAS */}
            <main className="w-full max-w-[1400px] px-4 md:px-12 pt-14 md:pt-16 pb-36 min-h-screen relative z-10 flex flex-col">
                <div className="animate-fade-in-up w-full flex-1">
                    {children}
                </div>
            </main>

            {/* DYNAMIC ISLAND NAVIGATION (Spatial UI) */}
            <nav className="spatial-nav group">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`spatial-nav-item ${currentView === item.id ? 'active scale-100' : 'scale-[0.98] hover:scale-100'}`}
                    >
                        {item.icon}
                        <span className={`transition-all duration-300 ${currentView === item.id ? 'w-auto opacity-100 ml-1 block' : 'w-0 opacity-0 overflow-hidden md:w-auto md:opacity-100 md:block'}`}>
                            {item.label}
                        </span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
