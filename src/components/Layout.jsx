import React from 'react';
import { LayoutDashboard, Wallet, Settings, LogOut, ClipboardList } from 'lucide-react';

export default function Layout({ children, currentView, onNavigate, onLogout }) {
    return (
        <div className="min-h-screen flex bg-background text-text">
            {/* Sidebar */}
            <aside className="w-64 border-r border-gray-800 p-6 flex flex-col hidden md:flex">
                <div className="mb-10 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-white">FM</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">Fund Manager</h1>
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active
                ? 'bg-blue-500/10 text-blue-400 font-medium'
                : 'text-gray-400 hover:bg-surface hover:text-white'
                }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
