import React from 'react';
import { LayoutDashboard, Wallet, Settings, LogOut, ClipboardList, Telescope, BookOpen } from 'lucide-react';

export default function Layout({ children, currentView, onNavigate, onLogout }) {
    return (
        <div className="min-h-screen flex bg-background text-text">
            {/* Sidebar */}
            <aside className="w-52 border-r border-gray-800 p-4 flex flex-col hidden md:flex shrink-0">
                <div className="mb-8 flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center">
                        <span className="font-bold text-white text-xs">FM</span>
                    </div>
                    <h1 className="text-lg font-bold tracking-tight">Fund Manager</h1>
                </div>

                <nav className="flex-1 space-y-2">
                    <NavItem
                        icon={<LayoutDashboard size={20} />}
                        label="Dashboard"
                        active={currentView === 'dashboard'}
                        onClick={() => onNavigate('dashboard')}
                    />
                    <NavItem
                        icon={<Wallet size={20} />}
                        label="Portfolio"
                        active={currentView === 'portfolio'}
                        onClick={() => onNavigate('portfolio')}
                    />
                    <NavItem
                        icon={<ClipboardList size={20} />}
                        label="Órdenes"
                        active={currentView === 'orders'}
                        onClick={() => onNavigate('orders')}
                    />
                    <NavItem
                        icon={<Telescope size={20} />}
                        label="Watchlist"
                        active={currentView === 'watchlist'}
                        onClick={() => onNavigate('watchlist')}
                    />
                    <NavItem
                        icon={<BookOpen size={20} />}
                        label="Manual"
                        active={currentView === 'guide'}
                        onClick={() => onNavigate('guide')}
                    />
                    <NavItem
                        icon={<Settings size={20} />}
                        label="Settings"
                        active={currentView === 'settings'}
                        onClick={() => onNavigate('settings')}
                    />
                </nav>

                <div className="pt-6 border-t border-gray-800">
                    <NavItem icon={<LogOut size={20} />} label="Logout" onClick={onLogout} />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${active
                ? 'bg-blue-500/10 text-blue-400 font-semibold'
                : 'text-gray-400 hover:bg-surface hover:text-white'
                }`}
        >
            <div className="shrink-0">{React.cloneElement(icon, { size: 18 })}</div>
            <span className="text-sm">{label}</span>
        </button>
    );
}
