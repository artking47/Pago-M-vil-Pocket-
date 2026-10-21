import React, { useState, useEffect, Suspense, lazy } from 'react';
import useRates from '../hooks/useRates';
import EditItemModal from './EditItemModal';
import SavedListsModal from './SavedListsModal';

const PriceScanner = lazy(() => import('./PriceScanner'));
const ReceiptScanner = lazy(() => import('./ReceiptScanner'));

function ShoppingList({ onGoToFinance }) {
    const { todayRates } = useRates();
    const rate = todayRates.oficial || 1;

    // Attached receipt data & image from scanner
    const [attachedReceipt, setAttachedReceipt] = useState(null);
    const [viewingReceiptPreview, setViewingReceiptPreview] = useState(null);

    // Active shopping list items
    const [items, setItems] = useState(() => {
        const saved = localStorage.getItem('shoppingListItems');
        return saved ? JSON.parse(saved) : [];
    });
    
    useEffect(() => {
        localStorage.setItem('shoppingListItems', JSON.stringify(items));
    }, [items]);

    // Saved shopping trips / lists
    const [savedLists, setSavedLists] = useState(() => {
        const saved = localStorage.getItem('shoppingSavedLists');
        return saved ? JSON.parse(saved) : [];
    });
    
    useEffect(() => {
        localStorage.setItem('shoppingSavedLists', JSON.stringify(savedLists));
    }, [savedLists]);

    // Modal / Sheet States
    const [showScanner, setShowScanner] = useState(false);
    const [showReceiptScanner, setShowReceiptScanner] = useState(false);
    const [showSavedModal, setShowSavedModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [listTitle, setListTitle] = useState('');
    const [toastMessage, setToastMessage] = useState(null);

    // Form input states
    const [itemName, setItemName] = useState('');
    const [itemQuantity, setItemQuantity] = useState(1);
    const [itemPrice, setItemPrice] = useState('');
    const [inputCurrency, setInputCurrency] = useState('USD');

    // Show temporary toast feedback
    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Calculate USD & VES for an individual item dynamically based on current rate
    const getItemPrices = (item) => {
        const qty = item.quantity || 1;
        if (item.originalPrice !== undefined) {
            if (item.originalCurrency === 'USD') {
                return { priceUSD: item.originalPrice * qty, priceVES: item.originalPrice * rate * qty };
            } else {
                return { priceVES: item.originalPrice * qty, priceUSD: (item.originalPrice / rate) * qty };
            }
        }
        return { priceUSD: (item.priceUSD || 0) * qty, priceVES: (item.priceVES || 0) * qty };
    };

    const itemsWithPrices = items.map(item => ({ ...item, ...getItemPrices(item) }));
    const totalUSD = itemsWithPrices.reduce((sum, item) => sum + (item.priceUSD || 0), 0);
    const totalVES = itemsWithPrices.reduce((sum, item) => sum + (item.priceVES || 0), 0);

    // Add item to shopping list
    const handleAddItem = (e) => {
        if (e) e.preventDefault();
        const priceNum = parseFloat(itemPrice.replace(/[\s\u00a0\u202f.]/g, '').replace(',', '.'));
        if (!itemName.trim() || isNaN(priceNum) || priceNum <= 0) return;
        
        const parsedQty = parseInt(itemQuantity, 10);
        const finalQty = (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 1;

        setItems(prev => [...prev, {
            id: Date.now(),
            name: itemName.trim(),
            originalPrice: priceNum,
            originalCurrency: inputCurrency,
            quantity: finalQty,
        }]);

        setItemName('');
        setItemPrice('');
        setItemQuantity(1);
        showToast('Producto agregado al carrito');
    };

    // Fast quantity adjustment directly on the item card
    const handleUpdateQuantity = (itemId, delta) => {
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const currentQty = item.quantity || 1;
                const newQty = currentQty + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
        }).filter(Boolean));
    };

    // Save edited item from EditItemModal
    const handleSaveEditedItem = (updatedItem) => {
        setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        setEditingItem(null);
        showToast('Artículo actualizado');
    };

    // Delete item
    const deleteItem = (id) => {
        setItems(prev => prev.filter(item => item.id !== id));
        showToast('Artículo eliminado');
    };

    // Scanned price label result
    const handleScanPrice = (scannedData) => {
        setItemPrice(scannedData.price);
        if (scannedData.currency) {
            setInputCurrency(scannedData.currency);
        }
        if (scannedData.name) {
            setItemName(scannedData.name);
        }
        setShowScanner(false);
        showToast('Precio capturado');
    };

    // Scanned receipt completion
    const handleReceiptComplete = ({ receiptImage, receiptData, updatedItems, receiptTotalUSD, receiptTotalVES }) => {
        // Update active items
        if (updatedItems && updatedItems.length > 0) {
            setItems(updatedItems);
        }

        // Pre-fill save dialog title if store was detected
        if (receiptData?.supermarketName) {
            setListTitle(receiptData.supermarketName);
        }

        // Retain attached receipt metadata & photo
        setAttachedReceipt({
            receiptImage,
            receiptData,
            receiptTotalUSD,
            receiptTotalVES
        });

        setShowReceiptScanner(false);
        showToast('¡Ticket analizado y artículos sincronizados!');
    };

    // Initiate list finalization
    const handleOpenSaveDialog = () => {
        if (items.length === 0) {
            alert('Agrega al menos un artículo a tu lista antes de guardarla.');
            return;
        }
        const defaultTitle = attachedReceipt?.receiptData?.supermarketName 
            || `Compra del ${new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}`;
        setListTitle(defaultTitle);
        setShowSaveDialog(true);
    };

    // Confirm and save list to localStorage
    const handleConfirmSave = (attachReceiptNow = false) => {
        if (attachReceiptNow) {
            setShowSaveDialog(false);
            setShowReceiptScanner(true);
            return;
        }

        const finalUSD = attachedReceipt?.receiptTotalUSD || totalUSD;
        const finalVES = attachedReceipt?.receiptTotalVES || totalVES;

        const newList = {
            id: Date.now(),
            title: listTitle.trim() || attachedReceipt?.receiptData?.supermarketName || `Compra del ${new Date().toLocaleDateString('es-VE')}`,
            date: new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            totalUSD: finalUSD,
            totalVES: finalVES,
            items: [...itemsWithPrices],
            receiptData: attachedReceipt?.receiptData || null,
            receiptImage: attachedReceipt?.receiptImage || null
        };

        setSavedLists(prev => [newList, ...prev]);
        setItems([]);
        setAttachedReceipt(null);
        setShowSaveDialog(false);
        showToast('¡Compra guardada con éxito en tu historial financiero!');
    };

    // Load a saved list into current shopping cart
    const handleLoadToCart = (savedList) => {
        if (!savedList?.items) return;
        if (items.length > 0) {
            if (!window.confirm('¿Deseas reemplazar tu lista de compras actual con los artículos de esta compra guardada?')) {
                // User wants to append instead of replace
                const appended = [...items, ...savedList.items.map(it => ({ ...it, id: Date.now() + Math.random() }))];
                setItems(appended);
                showToast('Artículos agregados al carrito actual');
                return;
            }
        }
        const freshItems = savedList.items.map(it => ({ ...it, id: Date.now() + Math.random() }));
        setItems(freshItems);
        showToast('Lista cargada en el carrito');
    };

    const deleteSavedList = (id) => {
        setSavedLists(prev => prev.filter(list => list.id !== id));
        showToast('Compra guardada eliminada');
    };

    return (
        <div className="animate-fade-in-up pb-52">
            {/* Header Section */}
            <section className="mb-4 pt-2 flex items-center justify-between">
                <div>
                    <span className="eyebrow mb-2"><span className="eyebrow-dot" />Compras & Carrito</span>
                    <h2 className="text-on-surface text-[26px] font-bold tracking-[-0.03em] leading-[1.1]">
                        Lista de Compras
                    </h2>
                    <p className="text-on-surface-variant text-xs mt-0.5">
                        Controla lo que gastas en el súper en tiempo real
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {onGoToFinance && (
                        <button 
                            type="button"
                            onClick={onGoToFinance}
                            className="press h-9 px-3 rounded-full well text-xs font-bold text-outline hover:text-on-surface flex items-center gap-1.5 shadow-sm"
                            title="Ir al Control Financiero"
                        >
                            <span className="material-symbols-outlined text-[16px]">insights</span>
                            Finanzas
                        </button>
                    )}
                    <button 
                        type="button"
                        onClick={() => setShowSavedModal(true)}
                        className="press h-9 px-3.5 rounded-full well text-xs font-bold text-primary flex items-center gap-1.5 shadow-sm shrink-0"
                    >
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        Facturas ({savedLists.length})
                    </button>
                </div>
            </section>

            {/* ACTIVE SHOPPING CART */}
            <div>
                    {/* Attached Receipt Notification Banner */}
                    {attachedReceipt && (
                        <div className="card-glass border-secondary/40 bg-secondary/10 p-3.5 rounded-2xl flex items-center justify-between mb-4 animate-slide-down">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-secondary/20 text-secondary flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-on-surface font-bold text-xs truncate">
                                        Ticket vinculado: <span className="text-secondary">{attachedReceipt.receiptData?.supermarketName || 'Supermercado'}</span>
                                    </p>
                                    <p className="text-outline text-[11px] truncate mt-0.5">
                                        {attachedReceipt.receiptData?.items?.length || 0} artículos sincronizados
                                        {attachedReceipt.receiptData?.rate ? ` • Tasa Bs. ${attachedReceipt.receiptData.rate.toFixed(2)}` : ''}
                                        {attachedReceipt.receiptData?.igtfVES ? ` • IGTF Bs. ${attachedReceipt.receiptData.igtfVES.toFixed(2)}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {attachedReceipt.receiptImage && (
                                    <button
                                        type="button"
                                        onClick={() => setViewingReceiptPreview(attachedReceipt.receiptImage)}
                                        className="h-8 px-2.5 rounded-full well text-xs font-bold text-primary flex items-center gap-1 active:scale-95"
                                        title="Ver foto del ticket"
                                    >
                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                        Ver
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setAttachedReceipt(null)}
                                    className="w-8 h-8 rounded-full well text-outline hover:text-error flex items-center justify-center active:scale-95"
                                    title="Desvincular ticket"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Input Form Card */}
                    <div className="bezel mb-6">
                <form onSubmit={handleAddItem} className="bezel-core card-sheen p-4 sm:p-5 space-y-3">
                    <div className="flex gap-2.5">
                        <div className="flex-[3]">
                            <label className="text-[10px] font-bold text-outline uppercase tracking-[0.14em] pl-1 block mb-1">Producto</label>
                            <div className="well rounded-[16px] px-3.5 h-12 flex items-center focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(66,133,244,0.15)] transition-all">
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
                            <div className="well rounded-[16px] px-2 h-12 flex items-center justify-center focus-within:border-primary/50">
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
                            <div className="well rounded-[16px] px-2.5 h-12 flex items-center focus-within:border-primary/50">
                                <button 
                                    type="button"
                                    onClick={() => setInputCurrency(inputCurrency === 'USD' ? 'VES' : 'USD')}
                                    className="press text-primary font-bold text-xs px-2.5 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-0.5 shrink-0"
                                    title="Alternar moneda ($ USD o Bs VES)"
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
                                    className="press w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 hover:bg-primary/25 transition-colors"
                                    title="Escanear precio de etiqueta con cámara"
                                    aria-label="Escanear precio de etiqueta"
                                >
                                    <span className="material-symbols-outlined text-base">document_scanner</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                aria-label="Agregar producto a la lista"
                                className="press h-12 w-12 rounded-[16px] thumb-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                            >
                                <span className="material-symbols-outlined text-[22px]">add</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Shopping List Items */}
            {items.length > 0 ? (
                <div className="space-y-3 mb-6">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-outline uppercase tracking-[0.14em]">
                            {items.length} {items.length === 1 ? 'Artículo' : 'Artículos'}
                        </span>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => {
                                    if (window.confirm('¿Vaciar toda la lista de compras actual?')) {
                                        setItems([]);
                                    }
                                }} 
                                className="press text-[11px] text-tertiary font-bold uppercase tracking-wider flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[14px]">delete_sweep</span> Vaciar
                            </button>
                            <button 
                                onClick={handleOpenSaveDialog} 
                                className="press text-[11px] text-secondary font-bold uppercase tracking-wider flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[14px]">save</span> Guardar
                            </button>
                        </div>
                    </div>

                    {/* Items Cards */}
                    {itemsWithPrices.map(item => (
                        <div 
                            key={item.id} 
                            className="card-glass p-3.5 rounded-2xl flex items-center justify-between gap-3 animate-slide-down hover:border-primary/25 transition-all"
                        >
                            {/* Product Info & Quick Stepper */}
                            <div className="min-w-0 flex-1">
                                <div 
                                    className="cursor-pointer"
                                    onClick={() => setEditingItem(item)}
                                    title="Toca para editar artículo"
                                >
                                    <p className="text-on-surface font-bold text-sm leading-tight flex items-center gap-2 truncate">
                                        <span className="truncate">{item.name}</span>
                                        <span className="material-symbols-outlined text-outline text-[13px] opacity-60">edit</span>
                                    </p>
                                    <p className="text-outline text-[11px] font-semibold mt-0.5">
                                        Bs. {(item.priceVES || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>

                                {/* Quick Quantity Stepper */}
                                <div className="flex items-center gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateQuantity(item.id, -1)}
                                        className="w-7 h-7 rounded-lg well flex items-center justify-center text-outline hover:text-on-surface active:scale-90 transition-transform"
                                        aria-label="Disminuir cantidad"
                                    >
                                        <span className="material-symbols-outlined text-xs">remove</span>
                                    </button>
                                    <span className="text-xs font-bold text-on-surface px-1 min-w-[20px] text-center">
                                        {item.quantity || 1}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateQuantity(item.id, 1)}
                                        className="w-7 h-7 rounded-lg well flex items-center justify-center text-outline hover:text-on-surface active:scale-90 transition-transform"
                                        aria-label="Aumentar cantidad"
                                    >
                                        <span className="material-symbols-outlined text-xs">add</span>
                                    </button>
                                </div>
                            </div>

                            {/* Price & Actions */}
                            <div className="flex items-center gap-2.5 shrink-0">
                                <div 
                                    className="text-right cursor-pointer"
                                    onClick={() => setEditingItem(item)}
                                >
                                    <span className="text-primary font-bold text-lg tracking-tight block leading-none">
                                        ${(item.priceUSD || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    {(item.quantity > 1) && (
                                        <span className="text-[10px] text-outline font-medium block mt-1">
                                            (${(item.originalCurrency === 'USD' ? item.originalPrice : (item.originalPrice / rate)).toFixed(2)} c/u)
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setEditingItem(item)}
                                    aria-label="Editar artículo"
                                    className="press w-8 h-8 rounded-full well flex items-center justify-center text-outline hover:text-primary transition-colors"
                                    title="Editar nombre o precio"
                                >
                                    <span className="material-symbols-outlined text-[15px]">edit</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => deleteItem(item.id)}
                                    aria-label="Eliminar artículo"
                                    className="press w-8 h-8 rounded-full well flex items-center justify-center text-outline hover:text-tertiary transition-colors"
                                    title="Eliminar artículo"
                                >
                                    <span className="material-symbols-outlined text-[15px]">close</span>
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* REQUIREMENT 3 & 4: PROMINENT BUTTONS AT THE END OF THE LIST */}
                    <div className="bezel mt-6">
                        <div className="bezel-core card-sheen p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-outline uppercase tracking-wider">¿Terminaste tu compra?</p>
                                    <h4 className="text-on-surface font-bold text-base leading-tight">Finalizar compra</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-primary font-bold text-lg leading-none">
                                        ${totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-outline text-[10px] mt-0.5">
                                        Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                {/* Botón Guardar Lista Finalizada */}
                                <button
                                    type="button"
                                    onClick={handleOpenSaveDialog}
                                    className="h-13 py-3.5 px-4 rounded-[18px] thumb-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                    Guardar Lista Finalizada
                                </button>

                                {/* Botón Escanear Recibo / Factura */}
                                <button
                                    type="button"
                                    onClick={() => setShowReceiptScanner(true)}
                                    className="h-13 py-3.5 px-4 rounded-[18px] well border border-secondary/40 text-secondary font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                                    Escanear Recibo / Factura
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card-glass p-8 flex flex-col items-center justify-center text-center text-outline my-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-3xl opacity-50">shopping_cart</span>
                    </div>
                    <h3 className="text-on-surface font-bold text-base">Tu lista de compras está vacía</h3>
                    <p className="text-xs text-outline mt-1 max-w-xs">
                        Agrega productos con el teclado o usa el botón de escáner para leer precios directamente de las etiquetas.
                    </p>
                </div>
            )}
        </div>

        {/* FLOATING TOTAL BAR */}
        <div className="fixed bottom-[84px] left-3 right-3 z-40 pointer-events-none">
            <div className="max-w-md mx-auto">
                <div className="glass-aero card-sheen rounded-[24px] p-3.5 px-4 flex items-center justify-between pointer-events-auto shadow-2xl border border-white/10">
                    <div className="min-w-0 pr-2">
                        <p className="text-[10px] text-outline uppercase font-bold tracking-[0.14em] mb-0.5">Total Estimado</p>
                        <p className="text-on-surface font-bold text-sm">
                            Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <p className="text-primary text-[26px] font-bold tracking-tight leading-none">
                            ${totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {items.length > 0 && (
                            <button
                                type="button"
                                onClick={handleOpenSaveDialog}
                                className="press h-9 px-3 rounded-full thumb-primary text-white font-bold text-xs flex items-center gap-1 shadow-md"
                                title="Guardar lista de compra"
                            >
                                <span className="material-symbols-outlined text-[14px]">save</span>
                                Guardar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>

            {/* FULLSCREEN RECEIPT PREVIEW MODAL */}
            {viewingReceiptPreview && (
                <div 
                    className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-overlay"
                    onClick={() => setViewingReceiptPreview(null)}
                >
                    <button 
                        onClick={() => setViewingReceiptPreview(null)}
                        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-95 transition-all"
                        aria-label="Cerrar imagen"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                    <img 
                        src={viewingReceiptPreview} 
                        alt="Ticket de compra escaneado" 
                        className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10" 
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* MODAL 1: PRICE SCANNER */}
            {showScanner && (
                <Suspense fallback={
                    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center text-white">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-4xl animate-spin mb-3 block">hourglass_empty</span>
                            <p className="text-sm font-medium">Iniciando escáner de precios...</p>
                        </div>
                    </div>
                }>
                    <PriceScanner 
                        onScan={handleScanPrice}
                        onClose={() => setShowScanner(false)}
                    />
                </Suspense>
            )}

            {/* MODAL 2: RECEIPT SCANNER & ANALYZER */}
            {showReceiptScanner && (
                <Suspense fallback={
                    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center text-white">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-4xl animate-spin mb-3 block">sync</span>
                            <p className="text-sm font-medium">Cargando escáner de recibos...</p>
                        </div>
                    </div>
                }>
                    <ReceiptScanner 
                        currentItems={items}
                        rate={rate}
                        onComplete={handleReceiptComplete}
                        onClose={() => setShowReceiptScanner(false)}
                    />
                </Suspense>
            )}

            {/* MODAL 3: EDIT ITEM */}
            {editingItem && (
                <EditItemModal 
                    item={editingItem}
                    rate={rate}
                    onSave={handleSaveEditedItem}
                    onDelete={deleteItem}
                    onClose={() => setEditingItem(null)}
                />
            )}

            {/* MODAL 4: SAVED PURCHASES (REVAMPED TO ELIMINATE SCROLLING) */}
            {showSavedModal && (
                <SavedListsModal 
                    savedLists={savedLists}
                    onDeleteList={deleteSavedList}
                    onLoadToCart={handleLoadToCart}
                    onClose={() => setShowSavedModal(false)}
                />
            )}

            {/* MODAL 5: SAVE PURCHASE CONFIRMATION */}
            {showSaveDialog && (
                <div 
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="save-dialog-title"
                    className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-overlay"
                    onClick={() => setShowSaveDialog(false)}
                >
                    <div 
                        className="w-full max-w-md bg-surface-container border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl animate-slide-up flex flex-col space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-full bg-secondary/20 text-secondary flex items-center justify-center">
                                    <span className="material-symbols-outlined text-lg">save</span>
                                </div>
                                <div>
                                    <h3 id="save-dialog-title" className="text-on-surface font-bold text-base leading-tight">Guardar Compra</h3>
                                    <p className="text-outline text-xs">Asigna un nombre a tu lista</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowSaveDialog(false)}
                                className="w-8 h-8 rounded-full well flex items-center justify-center text-outline"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-outline uppercase tracking-[0.14em] pl-1 block mb-1">Nombre o comercio</label>
                            <div className="well rounded-[16px] px-3.5 h-12 flex items-center">
                                <input 
                                    type="text" 
                                    value={listTitle}
                                    onChange={(e) => setListTitle(e.target.value)}
                                    placeholder="Ej. Supermercado Plaza's"
                                    className="w-full bg-transparent border-none focus:ring-0 outline-none text-on-surface font-semibold text-sm"
                                />
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="card-glass p-3 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Total a guardar</p>
                                <p className="text-on-surface font-bold text-sm mt-0.5">
                                    Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-primary font-bold text-xl leading-none">
                                    ${totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-outline text-[11px] mt-0.5 font-medium">{items.length} artículos</p>
                            </div>
                        </div>

                        {/* Save Actions */}
                        <div className="space-y-2 pt-1">
                            <button
                                type="button"
                                onClick={() => handleConfirmSave(false)}
                                className="w-full h-12 rounded-[16px] thumb-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-base">check</span>
                                Guardar Lista
                            </button>

                            <button
                                type="button"
                                onClick={() => handleConfirmSave(true)}
                                className="w-full h-12 rounded-[16px] well border border-secondary/40 text-secondary font-bold text-xs flex items-center justify-center gap-2 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-base">receipt_long</span>
                                Escanear Recibo y Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TEMPORARY TOAST BANNER */}
            {toastMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-surface-container/95 text-on-surface border border-primary/30 backdrop-blur-xl px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-slide-down">
                    <span className="material-symbols-outlined text-primary text-base">info</span>
                    <span className="text-xs font-bold">{toastMessage}</span>
                </div>
            )}
        </div>
    );
}

export default ShoppingList;
