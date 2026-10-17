import React, { useState, useEffect, Suspense, lazy } from 'react';
import useRates from '../hooks/useRates';
const PriceScanner = lazy(() => import('./PriceScanner'));

function ShoppingList() {
    const { todayRates } = useRates();
    const [items, setItems] = useState(() => {
        const saved = localStorage.getItem('shoppingListItems');
        return saved ? JSON.parse(saved) : [];
    });
    
    useEffect(() => {
        localStorage.setItem('shoppingListItems', JSON.stringify(items));
    }, [items]);

    const [savedLists, setSavedLists] = useState(() => {
        const saved = localStorage.getItem('shoppingSavedLists');
        return saved ? JSON.parse(saved) : [];
    });
    
    useEffect(() => {
        localStorage.setItem('shoppingSavedLists', JSON.stringify(savedLists));
    }, [savedLists]);

    const [showScanner, setShowScanner] = useState(false);
    const [showSavedModal, setShowSavedModal] = useState(false);
    const [expandedListId, setExpandedListId] = useState(null);
    const [itemName, setItemName] = useState('');
    const [itemQuantity, setItemQuantity] = useState(1);
    const [itemPrice, setItemPrice] = useState('');
    const [inputCurrency, setInputCurrency] = useState('USD');

    const rate = todayRates.oficial || 1;

    const handleAddItem = (e) => {
        if (e) e.preventDefault();
        const priceNum = parseFloat(itemPrice.replace(/[\s\u00a0\u202f.]/g, '').replace(',', '.'));
        if (!itemName || isNaN(priceNum) || priceNum <= 0) return;
        
        const parsedQty = parseInt(itemQuantity, 10);
        const finalQty = (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 1;

        // BUG-13 fix: Store only original price + currency, recalculate on render
        setItems([...items, {
            id: Date.now(),
            name: itemName,
            originalPrice: priceNum,
            originalCurrency: inputCurrency,
            quantity: finalQty,
        }]);

        setItemName('');
        setItemPrice('');
        setItemQuantity(1);
    };

    const handleScan = (scannedData) => {
        setItemPrice(scannedData.price);
        if (scannedData.name) {
            setItemName(scannedData.name.toUpperCase());
        }
        setShowScanner(false);
    };

    // BUG-13 fix: Derive USD/VES from original price + current rate
    const getItemPrices = (item) => {
        const qty = item.quantity || 1;
        // Support legacy items that have priceUSD/priceVES directly
        if (item.originalPrice !== undefined) {
            if (item.originalCurrency === 'USD') {
                return { priceUSD: item.originalPrice * qty, priceVES: item.originalPrice * rate * qty };
            } else {
                return { priceVES: item.originalPrice * qty, priceUSD: (item.originalPrice / rate) * qty };
            }
        }
        // Legacy fallback
        return { priceUSD: (item.priceUSD || 0) * qty, priceVES: (item.priceVES || 0) * qty };
    };

    const itemsWithPrices = items.map(item => ({ ...item, ...getItemPrices(item) }));
    const totalUSD = itemsWithPrices.reduce((sum, item) => sum + (item.priceUSD || 0), 0);
    const totalVES = itemsWithPrices.reduce((sum, item) => sum + (item.priceVES || 0), 0);

    const handleSaveList = () => {
        if (itemsWithPrices.length === 0) return;
        
        const newList = {
            id: Date.now(),
            date: new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            totalUSD,
            totalVES,
            items: [...itemsWithPrices]
        };
        
        setSavedLists([newList, ...savedLists]);
        setItems([]);
    };

    const deleteSavedList = (id) => {
        setSavedLists(savedLists.filter(list => list.id !== id));
    };

    const deleteItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    return (
        <div className="animate-fade-in-up pb-48">
            <section className="mb-4 pt-2 flex items-center justify-between">
                <div>
                    <span className="eyebrow mb-3"><span className="eyebrow-dot" />Compras</span>
                    <h2 className="text-on-surface text-[28px] font-bold tracking-[-0.03em] leading-[1.1]">Lista de Compras</h2>
                    <p className="text-on-surface-variant text-sm mt-1">Controla lo que gastas en el súper</p>
                </div>
                <button 
                    type="button"
                    onClick={() => setShowSavedModal(true)}
                    className="press h-9 px-3.5 rounded-full well text-xs font-bold text-primary flex items-center gap-1.5"
                >
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    Guardadas ({savedLists.length})
                </button>
            </section>

            {/* Input form */}
            <div className="bezel mb-6">
                <form onSubmit={handleAddItem} className="bezel-core card-sheen p-4 sm:p-5 space-y-3">
                    <div className="flex gap-2.5">
                        <div className="flex-[3]">
                            <label className="text-[10px] font-bold text-outline uppercase tracking-[0.14em] pl-1 block mb-1">Producto</label>
                            <div className="well rounded-[16px] px-3.5 h-12 flex items-center focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(66,133,244,0.15)] transition-[border-color,box-shadow] duration-200">
                                <input 
                                    type="text" 
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    placeholder="Ej. Harina PAN"
                                    className="w-full bg-transparent border-none focus:ring-0 outline-none text-on-surface font-semibold text-sm placeholder:text-outline-variant/50"
                                />
                            </div>
                        </div>
                        <div className="flex-[1]">
                            <label className="text-[10px] font-bold text-outline uppercase tracking-[0.14em] pl-1 block mb-1">Cant.</label>
                            <div className="well rounded-[16px] px-2 h-12 flex items-center justify-center focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(66,133,244,0.15)] transition-[border-color,box-shadow] duration-200">
                                <input 
                                    type="number" 
                                    min="1"
                                    value={itemQuantity}
                                    onChange={(e) => setItemQuantity(e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 outline-none text-on-surface font-bold text-center text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2.5">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-outline uppercase tracking-[0.14em] pl-1 block mb-1">Precio</label>
                            <div className="well rounded-[16px] px-2.5 h-12 flex items-center focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(66,133,244,0.15)] transition-[border-color,box-shadow] duration-200">
                                <button 
                                    type="button"
                                    onClick={() => setInputCurrency(inputCurrency === 'USD' ? 'VES' : 'USD')}
                                    className="press text-primary font-bold text-xs px-2 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-0.5 shrink-0"
                                    title="Alternar moneda"
                                >
                                    {inputCurrency === 'USD' ? '$' : 'Bs'}
                                    <span className="material-symbols-outlined text-[13px]">swap_vert</span>
                                </button>
                                <input 
                                    type="text"
                                    inputMode="decimal"
                                    value={itemPrice}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^\d,]/g, '');
                                        const parts = value.split(',');
                                        if (parts.length > 2) return;
                                        if (parts[1] && parts[1].length > 4) return;
                                        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                                        setItemPrice(parts.join(','));
                                    }}
                                    placeholder="0,00"
                                    className="w-full bg-transparent border-none focus:ring-0 outline-none text-on-surface font-bold text-base px-2 placeholder:text-outline-variant/50"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowScanner(true)}
                                    className="press w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 hover:bg-primary/25"
                                    title="Escanear etiqueta"
                                    aria-label="Escanear precio"
                                >
                                    <span className="material-symbols-outlined text-sm">document_scanner</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                aria-label="Agregar producto"
                                className="press h-12 w-12 rounded-[16px] thumb-primary flex items-center justify-center shrink-0"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* List */}
            {items.length > 0 ? (
                <div className="space-y-2.5 mb-24">
                    <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-[10px] font-bold text-outline uppercase tracking-[0.14em]">{items.length} Artículos</span>
                        <div className="flex gap-3">
                            <button onClick={() => setItems([])} className="press text-[11px] text-tertiary font-bold uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">delete_sweep</span> Vaciar
                            </button>
                            <button onClick={handleSaveList} className="press text-[11px] text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">save</span> Guardar lista
                            </button>
                        </div>
                    </div>
                    {itemsWithPrices.map(item => (
                        <div key={item.id} className="card-glass p-3.5 flex items-center justify-between animate-slide-down">
                            <div className="min-w-0 pr-3">
                                <p className="text-on-surface font-bold text-sm leading-tight flex items-center gap-2 truncate">
                                    <span className="truncate">{item.name}</span>
                                    {(item.quantity > 1) && (
                                        <span className="thumb-neutral text-[10px] font-bold px-1.5 h-5 rounded-md flex items-center shrink-0">x{item.quantity}</span>
                                    )}
                                </p>
                                <p className="text-outline text-[11px] font-semibold mt-0.5">
                                    Bs. {(item.priceVES || 0).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-primary font-bold text-lg tracking-tight">
                                    ${(item.priceUSD || 0).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </span>
                                <button
                                    onClick={() => deleteItem(item.id)}
                                    aria-label="Eliminar artículo"
                                    className="press w-7 h-7 rounded-full well flex items-center justify-center text-outline hover:text-tertiary"
                                >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card-glass p-8 flex flex-col items-center justify-center text-center text-outline">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">shopping_cart</span>
                    <p className="text-sm font-medium">Tu lista de compras está vacía</p>
                </div>
            )}

            {/* Floating Total Bar */}
            <div className="fixed bottom-[84px] left-3 right-3 z-40 pointer-events-none">
                <div className="max-w-md mx-auto">
                    <div className="glass-aero card-sheen rounded-[24px] p-4 flex items-center justify-between pointer-events-auto">
                        <div>
                            <p className="text-[10px] text-outline uppercase font-bold tracking-[0.14em] mb-0.5">Total Estimado</p>
                            <p className="text-on-surface font-bold text-sm">Bs. {totalVES.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-primary text-[28px] font-bold tracking-tight leading-none">
                                ${totalUSD.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {showScanner && (
                <Suspense fallback={
                    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
                        <div className="text-center text-white">
                            <span className="material-symbols-outlined text-4xl animate-spin mb-4 block">hourglass_empty</span>
                            <p className="text-sm font-medium">Cargando escáner...</p>
                        </div>
                    </div>
                }>
                    <PriceScanner 
                        onScan={handleScan}
                        onClose={() => setShowScanner(false)}
                    />
                </Suspense>            )}

            {/* Modal de Listas Guardadas */}
            {showSavedModal && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="saved-lists-title"
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col justify-end animate-overlay"
                    onClick={() => setShowSavedModal(false)}
                >
                    <div
                        className="bg-surface w-full h-[85vh] rounded-t-3xl border-t border-white/10 flex flex-col animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-6 border-b border-white/5">
                            <h3 id="saved-lists-title" className="text-on-surface font-h3 text-h3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">receipt_long</span>
                                Compras Guardadas
                            </h3>
                            <button onClick={() => setShowSavedModal(false)} className="w-9 h-9 rounded-full bg-white/5 text-outline flex items-center justify-center active:scale-95 transition-transform" aria-label="Cerrar">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12">
                            {savedLists.length === 0 ? (
                                <div className="text-center text-outline mt-10">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
                                    <p className="text-sm">No tienes compras guardadas</p>
                                </div>
                            ) : (
                                savedLists.map(list => (
                                    <div key={list.id} className="glass-surface rounded-xl overflow-hidden">
                                        <div 
                                            className="p-4 flex items-center justify-between cursor-pointer active:bg-white/5"
                                            onClick={() => setExpandedListId(expandedListId === list.id ? null : list.id)}
                                        >
                                            <div>
                                                <p className="text-on-surface font-bold text-sm">{list.date}</p>
                                                <p className="text-outline text-xs mt-0.5">{list.items ? list.items.length : 0} artículos</p>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <div>
                                                    <p className="text-primary font-bold text-sm">${(list.totalUSD || 0).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                                                    <p className="text-outline text-[10px]">Bs. {(list.totalVES || 0).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                                                </div>
                                                <span className={`material-symbols-outlined text-outline transition-transform ${expandedListId === list.id ? 'rotate-180' : ''}`}>expand_more</span>
                                            </div>
                                        </div>
                                        
                                        {/* Expanded items */}
                                        {expandedListId === list.id && (
                                            <div className="bg-black/20 p-4 border-t border-white/5">
                                                <div className="space-y-2 mb-4">
                                                    {(list.items || []).map(item => (
                                                        <div key={item.id} className="flex justify-between items-center text-sm">
                                                            <span className="text-on-surface-variant line-clamp-1 flex-1 pr-2">
                                                                {item.name} {item.quantity > 1 && <span className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 py-0.5 rounded-md ml-1">x{item.quantity}</span>}
                                                            </span>
                                                            <div className="flex gap-3 text-right shrink-0">
                                                                <span className="text-outline text-xs w-[70px]">Bs. {(item.priceVES || 0).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                                                <span className="text-on-surface font-semibold w-[50px]">${(item.priceUSD || 0).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-end pt-2 border-t border-white/5">
                                                    <button onClick={() => deleteSavedList(list.id)} className="text-error text-xs font-bold flex items-center gap-1 active:scale-95">
                                                        <span className="material-symbols-outlined text-[14px]">delete</span> Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ShoppingList;
