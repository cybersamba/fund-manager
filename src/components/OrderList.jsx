import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Calendar, Pencil, Trash2, PiggyBank, ChevronLeft, ChevronRight, ArrowRightLeft } from 'lucide-react';

export default function OrderList({ orders, isPrivacyMode, currency, formatCurrency, onUpdateOrder, onDeleteOrder }) {
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 7;

    const handleEdit = (order) => {
        setEditingId(order.id);
        setEditForm({ ...order });
    };

    const handleSave = () => {
        if (onUpdateOrder) {
            const updatedFields = {
                date: editForm.date,
                amount: Number(editForm.amount),
            };
            if (editForm.type === 'deposit') {
                updatedFields.duration = Number(editForm.duration);
                updatedFields.interestRate = Number(editForm.interestRate);
            } else {
                updatedFields.shares = Number(editForm.shares);
            }
            onUpdateOrder(editForm.id, updatedFields);
        }
        setEditingId(null);
    };

    const handleDelete = (id) => {
        if (onDeleteOrder) onDeleteOrder(id);
    };

    if (orders.length === 0) {
        return (
            <div className="bento-card p-6 text-center py-12 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border border-slate-200/60 rounded-full flex items-center justify-center mb-4">
                    <ArrowRightLeft size={16} className="text-slate-500" />
                </div>
                <div className="text-slate-500 mb-1 font-mono text-sm">NO_TRANSACTION_HISTORY</div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Awaiting ledger entries...</p>
            </div>
        );
    }

    const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    
    const sortedOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
    const paginatedOrders = sortedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className="bento-card p-6 md:p-8">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-xl font-medium text-slate-900 tracking-tight mb-1">Transaction Ledger</h2>
                    <div className="text-[10px] font-mono tracking-widest uppercase text-slate-500">Total Records: {orders.length}</div>
                </div>
            </div>

            <div className="space-y-0 relative">
                <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-white/5 -z-10" />

                {paginatedOrders.map((order, index) => {
                    if (editingId === order.id) {
                        return (
                            <div key={order.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 my-4 shadow-2xl">
                                <div className="text-xs font-mono text-slate-500 mb-4 flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${order.type === 'buy' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    EDIT_RECORD: {order.fundName.substring(0, 20)}...
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="col-span-2">
                                        <label className="text-[9px] font-mono text-slate-500 uppercase block mb-1.5 tracking-wider">Date</label>
                                        <input type="date" className="w-full metric-input text-xs" value={editForm.date ? editForm.date.split('T')[0] : ''} onChange={e => setEditForm({ ...editForm, date: e.target.value + 'T00:00:00Z' })} />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-mono text-slate-500 uppercase block mb-1.5 tracking-wider">Amount</label>
                                        <input type="number" step="0.01" className="w-full metric-input text-xs font-mono" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} />
                                    </div>

                                    {editForm.type === 'deposit' ? (
                                        <>
                                            <div>
                                                <label className="text-[9px] font-mono text-slate-500 uppercase block mb-1.5 tracking-wider">Duration</label>
                                                <input type="number" step="1" className="w-full metric-input text-xs font-mono" value={editForm.duration || ''} onChange={e => setEditForm({ ...editForm, duration: e.target.value })} />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[9px] font-mono text-slate-500 uppercase block mb-1.5 tracking-wider">Int. Rate (%)</label>
                                                <input type="number" step="0.01" className="w-full metric-input text-xs font-mono" value={editForm.interestRate || ''} onChange={e => setEditForm({ ...editForm, interestRate: e.target.value })} />
                                            </div>
                                        </>
                                    ) : (
                                        <div>
                                            <label className="text-[9px] font-mono text-slate-500 uppercase block mb-1.5 tracking-wider">Shares</label>
                                            <input type="number" step="0.00001" className="w-full metric-input text-xs font-mono" value={editForm.shares || ''} onChange={e => setEditForm({ ...editForm, shares: e.target.value })} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
                                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">Abort</button>
                                    <button onClick={handleSave} className="px-5 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors">Commit</button>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={order.id} className="group flex items-start sm:items-center justify-between py-4 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] -mx-4 px-4 transition-colors">
                            <div className="flex items-start sm:items-center gap-4 w-full">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                                    order.type === 'buy' ? 'bg-green-500/5 text-green-500 border-green-500/10'
                                        : order.type === 'deposit' ? 'bg-white/5 text-slate-900 border-slate-200/60'
                                            : order.type === 'transfer' ? 'bg-blue-500/5 text-blue-500 border-blue-500/10'
                                                : order.note ? 'bg-amber-500/5 text-amber-500 border-amber-500/10'
                                                    : 'bg-red-500/5 text-red-500 border-red-500/10'
                                }`}>
                                    {order.type === 'buy' ? <ArrowDownLeft strokeWidth={1.5} size={20} />
                                        : order.type === 'deposit' ? <PiggyBank strokeWidth={1.5} size={20} />
                                            : order.type === 'transfer' ? <ArrowRightLeft strokeWidth={1.5} size={20} />
                                                : <ArrowUpRight strokeWidth={1.5} size={20} />}
                                </div>
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="font-sans font-medium text-slate-900 text-sm truncate" title={order.fundName}>{order.fundName}</div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-2">
                                        <span>{new Date(order.date).toISOString().split('T')[0]}</span>
                                        {order.note && <span className="text-amber-500/60 truncate max-w-[120px]">SYS: {order.note}</span>}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end shrink-0 hidden sm:flex">
                                    <span className={`font-mono font-medium ${
                                        order.type === 'buy' ? 'text-green-400'
                                            : order.type === 'deposit' ? 'text-slate-900'
                                                : order.type === 'transfer' ? 'text-blue-400'
                                                    : 'text-red-400'
                                    }`}>
                                        {isPrivacyMode ? '****' : (order.type === 'sell' ? '-' : '+') + formatCurrency(order.amount)}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">
                                        {order.type === 'deposit' ? `RATE: ${order.interestRate}%` : isPrivacyMode ? '***' : `${Number(order.shares || 0).toFixed(4)} Units`}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4 pl-4 border-l border-slate-200/60 shrink-0">
                                <button onClick={() => handleEdit(order)} className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white/5 transition-all"><Pencil size={14} /></button>
                                <button onClick={() => handleDelete(order.id)} className="p-2 text-slate-500 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-all"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.03]">
                    <span className="text-xs font-mono text-slate-500">PAGE {currentPage} OF {totalPages}</span>
                    <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-200/60">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"><ChevronLeft size={16} /></button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"><ChevronRight size={16} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}
