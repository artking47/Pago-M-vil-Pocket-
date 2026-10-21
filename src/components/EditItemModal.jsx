import React, { useState, useEffect, useRef } from 'react';

function EditItemModal({ item, rate, onSave, onDelete, onClose }) {
    const [name, setName] = useState(item?.name || '');
    const [quantity, setQuantity] = useState(item?.quantity || 1);
    
    // Determine initial currency and formatted price string
    const initialCurrency = item?.originalCurrency || (item?.priceUSD !== undefined ? 'USD' : 'VES');
    const initialPriceVal = item?.originalPrice !== undefined 
        ? item.originalPrice 
        : (initialCurrency === 'USD' ? item?.priceUSD : item?.priceVES) || 0;

    const [currency, setCurrency] = useState(initialCurrency);
    const [priceStr, setPriceStr] = useState(() => {
        return (initialPriceVal || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });

    // Close modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Parse clean price float
    const numericPrice = parseFloat(priceStr.replace(/[\s\u00a0\u202f.]/g, '').replace(',', '.')) || 0;
    const qty = parseInt(quantity, 10) > 0 ? parseInt(quantity, 10) : 1;

    // Calculate preview subtotal
    const subtotalUSD = currency === 'USD' ? (numericPrice * qty) : ((numericPrice / (rate || 1)) * qty);
    const subtotalVES = currency === 'VES' ? (numericPrice * qty) : (numericPrice * (rate || 1) * qty);

    const handlePriceChange = (e) => {
        const val = e.target.value.replace(/[^\d,]/g, '');
        const parts = val.split(',');
        if (parts.length > 2) return;
        if (parts[1] && parts[1].length > 4) return;
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        setPriceStr(parts.join(','));
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || numericPrice <= 0) return;

        onSave({
            ...item,
            name: name.trim(),
            originalPrice: numericPrice,
            originalCurrency: currency,
            quantity: qty
        });
    };

    return (
        <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="edit-item-title"
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-overlay"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-md bg-surface-container border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl animate-slide-up flex flex-col max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">edit</span>
                        </div>
                        <div>
                            <h3 id="edit-item-title" className="text-on-surface font-bold text-base leading-tight">Editar Artículo</h3>
                            <p className="text-outline text-xs">Modifica nombre, precio o cantidad</p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-full well flex items-center justify-center text-outline hover:text-on-surface"
                        aria-label="Cerrar modal"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                    {/* Item Name */}
                    <div>
                        <label className="text-[10px] font-bold text-outline uppercase tracking-[0.14em] pl-1 block mb-1">Nombre del producto</label>
                        <div className="well rounded-[16px] px-3.5 h-12 flex items-center focus-within:border-primary/50">
                            <input 
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej. Leche en polvo"
                                required
                                className="w-full bg-transparent border-none focus:ring-0 outline-none text-on-surface font-semibold text-sm"
                            />
                        </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div>
                        <label className="text-[10px] font-bold text-outline uppercase tracking-[0.14em] pl-1 block mb-1">Cantidad</label>
                        <div className="flex items-center gap-3">
                            <button 
                                type="button"
                                onClick={() => setQuantity(Math.max(1, qty - 1))}
                                className="w-12 h-12 rounded-[16px] well flex items-center justify-center text-on-surface active:scale-95 font-bold text-lg"
                                aria-label="Disminuir cantidad"
                            >
                                <span className="material-symbols-outlined text-lg">remove</span>
                            </button>
                            <div className="flex-1 well rounded-[16px] h-12 flex items-center justify-center px-4">
                                <input 
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 outline-none text-on-surface font-bold text-center text-base"
                                />
                            </div>
                            <button 
                                type="button"
                                onClick={() => setQuantity(qty + 1)}
                                className="w-12 h-12 rounded-[16px] well flex items-center justify-center text-on-surface active:scale-95 font-bold text-lg"
                                aria-label="Aumentar cantidad"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                            </button>
                        </div>
                    </div>

                    {/* Price and Currency Toggle */}
                    <div>
                        <label className="text-[10px] font-bold text-outline uppercase tracking-[0.14em] pl-1 block mb-1">Precio Unitario</label>
                        <div className="well rounded-[16px] px-3 h-12 flex items-center focus-within:border-primary/50">
                            <button 
                                type="button"
                                onClick={() => setCurrency(currency === 'USD' ? 'VES' : 'USD')}
                                className="press text-primary font-bold text-xs px-2.5 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1 shrink-0"
                            >
                                {currency === 'USD' ? '$ USD' : 'Bs VES'}
                                <span className="material-symbols-outlined text-[13px]">swap_vert</span>
                            </button>
                            <input 
                                type="text"
                                inputMode="decimal"
                                value={priceStr}
                                onChange={handlePriceChange}
                                placeholder="0,00"
                                required
                                className="w-full bg-transparent border-none focus:ring-0 outline-none text-on-surface font-bold text-base px-3"
                            />
                        </div>
                    </div>

                    {/* Subtotal Preview */}
                    <div className="card-glass p-3.5 rounded-2xl flex items-center justify-between border border-white/5">
                        <div>
                            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Subtotal calculado ({qty} un.)</p>
                            <p className="text-on-surface font-bold text-sm mt-0.5">
                                Bs. {subtotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-primary font-bold text-xl tracking-tight leading-none">
                                ${subtotalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex gap-2.5">
                        {onDelete && (
                            <button 
                                type="button" 
                                onClick={() => {
                                    onDelete(item.id);
                                    onClose();
                                }}
                                className="h-12 px-4 rounded-[16px] bg-error/15 text-error font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                            >
                                <span className="material-symbols-outlined text-base">delete</span>
                                Eliminar
                            </button>
                        )}
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="h-12 px-4 rounded-[16px] well text-outline font-bold text-xs flex-1 active:scale-95 transition-transform"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="h-12 px-5 rounded-[16px] thumb-primary text-white font-bold text-sm flex-[1.5] flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-lg shadow-primary/25"
                        >
                            <span className="material-symbols-outlined text-base">check</span>
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditItemModal;
