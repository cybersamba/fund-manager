import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Calendar, Pencil, Trash2, PiggyBank, ChevronLeft, ChevronRight, ArrowRightLeft } from 'lucide-react';

export default function OrderList({ orders, isPrivacyMode, currency, formatCurrency, onUpdateOrder, onDeleteOrder }) {
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

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
            <div className="card text-center py-12">
                <div className="text-gray-500 mb-2">No hay órdenes recientes</div>
                <p className="text-sm text-gray-600">Comienza registrando una compra o venta.</p>
            </div>
        );
    }

    const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedOrders = orders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className="card">
            <h2 className="text-lg font-semibold mb-4">Historial de Órdenes <span className="text-sm font-normal text-gray-400 ml-2">({orders.length} total)</span></h2>
            <div className="space-y-3">
                {paginatedOrders.map((order) => {
                    if (editingId === order.id) {
                        return (
                            <div key={order.id} className="p-4 rounded-lg bg-gray-800/40 border border-gray-700">
                                <div className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                    {order.type === 'deposit' ? <PiggyBank size={14} className="text-blue-400" /> : order.type === 'buy' ? <ArrowDownLeft size={14} className="text-green-400" /> : <ArrowUpRight size={14} className="text-red-400" />}
                                    {order.fundName}
                                </div>

                                {/* Fecha - siempre editable */}
                                <div className="mb-3">
                                    <label className="text-xs text-gray-400 block mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        className="w-full bg-surface border border-gray-700 rounded-md p-2 text-sm text-white focus:border-primary focus:outline-none"
                                        value={editForm.date ? editForm.date.split('T')[0] : ''}
                                        onChange={e => setEditForm({ ...editForm, date: e.target.value + 'T00:00:00Z' })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Importe</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full bg-surface border border-gray-700 rounded-md p-2 text-sm text-white focus:border-primary focus:outline-none"
                                            value={editForm.amount}
                                            onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                        />
                                    </div>

                                    {/* Campos según tipo de orden */}
                                    {editForm.type === 'deposit' ? (
                                        <>
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">Duración (meses)</label>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    className="w-full bg-surface border border-gray-700 rounded-md p-2 text-sm text-white focus:border-primary focus:outline-none"
                                                    value={editForm.duration || ''}
                                                    onChange={e => setEditForm({ ...editForm, duration: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">Interés TAE (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-full bg-surface border border-gray-700 rounded-md p-2 text-sm text-white focus:border-primary focus:outline-none"
                                                    value={editForm.interestRate || ''}
                                                    onChange={e => setEditForm({ ...editForm, interestRate: e.target.value })}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Títulos/Participaciones</label>
                                            <input
                                                type="number"
                                                step="0.00001"
                                                className="w-full bg-surface border border-gray-700 rounded-md p-2 text-sm text-white focus:border-primary focus:outline-none"
                                                value={editForm.shares || ''}
                                                onChange={e => setEditForm({ ...editForm, shares: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors">Cancelar</button>
                                    <button onClick={handleSave} className="px-4 py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">Guardar Cambios</button>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={order.id} className={`group flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/30 transition-all border border-transparent hover:border-gray-800 ${order.note ? 'opacity-90' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${order.type === 'buy' ? 'bg-success/10 text-success'
                                        : order.type === 'deposit' ? 'bg-blue-500/10 text-blue-400'
                                            : order.note ? 'bg-amber-500/10 text-amber-400'
                                                : 'bg-danger/10 text-danger'
                                    }`}>
                                    {order.type === 'buy' ? <ArrowDownLeft size={20} />
                                        : order.type === 'deposit' ? <PiggyBank size={20} />
                                            : order.note ? <ArrowRightLeft size={20} />
                                                : <ArrowUpRight size={20} />}
                                </div>
                                <div>
                                    <div className="font-medium text-white text-sm max-w-[180px] sm:max-w-[220px] truncate" title={order.fundName}>{order.fundName}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                        <Calendar size={12} />
                                        {new Date(order.date).toLocaleDateString()}
                                        {order.note && <span className="ml-1 text-amber-500/70 truncate max-w-[100px]">{order.note}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className={`font-semibold text-sm ${order.type === 'buy' || order.type === 'deposit' ? 'text-success' : 'text-danger'}`}>
                                        {isPrivacyMode ? 'XXXX' : `${order.type === 'buy' || order.type === 'deposit' ? '+' : '-'}${formatCurrency(order.amount)}`}
                                    </div>
                                    {order.shares > 0 && order.type !== 'deposit' && (
                                        <div className="text-[10px] text-gray-500 font-medium">
                                            {isPrivacyMode ? 'XXXX ptc' : `${order.shares.toFixed(5)} ptc`}
                                        </div>
                                    )}
                                    {order.type === 'deposit' && (
                                        <div className="text-[10px] text-gray-400 font-medium">
                                            {order.duration} meses AL {order.interestRate}%
                                        </div>
                                    )}
                                </div>

                                {/* Acciones (visibles en hover) */}
                                <div className="opacity-0 group-hover:opacity-100 flex flex-col sm:flex-row items-center gap-1 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(order)}
                                        className="p-1.5 text-gray-500 hover:text-white rounded hover:bg-gray-700 transition-colors"
                                        title="Editar orden"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(order.id)}
                                        className="p-1.5 text-gray-500 hover:text-danger rounded hover:bg-danger/10 transition-colors"
                                        title="Eliminar orden"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-medium">
                        Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, orders.length)}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1 px-2 flex items-center gap-1 rounded bg-surface hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-800 text-sm text-gray-400 transition-colors"
                        >
                            <ChevronLeft size={16} /> <span className="hidden sm:inline">Anterior</span>
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-7 h-7 rounded text-xs font-semibold flex items-center justify-center transition-colors ${currentPage === page
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-400 hover:bg-gray-800'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1 px-2 flex items-center gap-1 rounded bg-surface hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-800 text-sm text-gray-400 transition-colors"
                        >
                            <span className="hidden sm:inline">Siguiente</span> <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

