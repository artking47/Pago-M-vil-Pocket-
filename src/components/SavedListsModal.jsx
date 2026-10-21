import React, { useState, useEffect, useRef } from 'react';

function SavedListsModal({ savedLists, onDeleteList, onLoadToCart, onClose }) {
    const [selectedList, setSelectedList] = useState(null);
    const [viewingReceiptImage, setViewingReceiptImage] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    const selectedListRef = useRef(selectedList);
    selectedListRef.current = selectedList;
    const viewingReceiptRef = useRef(viewingReceiptImage);
    viewingReceiptRef.current = viewingReceiptImage;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // Close modal or sub-views on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (viewingReceiptImage) {
                    setViewingReceiptImage(null);
                } else if (selectedList) {
                    setSelectedList(null);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewingReceiptImage, selectedList, onClose]);

    // Copy list text to clipboard
    const handleCopyList = (list) => {
        const lines = [
            `🛒 Compra: ${list.title || 'Supermercado'}`,
            `📅 Fecha: ${list.date}`,
            `💵 Total: $${(list.totalUSD || 0).toFixed(2)} (Bs. ${(list.totalVES || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })})`,
            '',
            'Artículos:'
        ];
        (list.items || []).forEach((item, idx) => {
            lines.push(`${idx + 1}. ${item.name} ${item.quantity > 1 ? `(x${item.quantity})` : ''} - $${(item.priceUSD || 0).toFixed(2)}`);
        });

        navigator.clipboard.writeText(lines.join('\n'));
        setCopiedId(list.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="saved-lists-modal-title"
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center animate-overlay"
            onClick={onClose}
        >
            <div
                className="bg-surface w-full max-w-lg h-[90vh] sm:h-[82vh] rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-white/10 flex flex-col overflow-hidden animate-slide-up shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* MODAL HEADER */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-surface-container shrink-0">
                    <div className="flex items-center gap-2.5">
                        {selectedList ? (
                            <button
                                type="button"
                                onClick={() => setSelectedList(null)}
                                className="w-9 h-9 rounded-full well flex items-center justify-center text-primary active:scale-90 transition-transform"
                                aria-label="Volver a la lista"
                            >
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                            </button>
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">receipt_long</span>
                            </div>
                        )}
                        <div>
                            <h3 id="saved-lists-modal-title" className="text-on-surface font-bold text-base leading-tight">
                                {selectedList ? (selectedList.title || 'Detalle de Compra') : 'Compras Guardadas'}
                            </h3>
                            <p className="text-outline text-xs">
                                {selectedList ? selectedList.date : `${savedLists.length} lista${savedLists.length === 1 ? '' : 's'} guardada${savedLists.length === 1 ? '' : 's'}`}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full well text-outline hover:text-on-surface flex items-center justify-center active:scale-95 transition-transform"
                        aria-label="Cerrar modal"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* MODAL BODY */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* DETAIL VIEW: Dedicated view for selected list */}
                    {selectedList ? (
                        <div className="space-y-4 animate-fade-in-up pb-8">
                            {/* Summary Totals Card */}
                            <div className="bezel">
                                <div className="bezel-core card-sheen p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Total Pagado</p>
                                            <p className="text-primary font-bold text-2xl tracking-tight mt-0.5">
                                                ${(selectedList.totalUSD || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-outline text-xs mt-0.5 font-medium">
                                                Bs. {(selectedList.totalVES || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="well px-3 py-1.5 rounded-full text-xs font-bold text-on-surface-variant">
                                                {selectedList.items?.length || 0} artículos
                                            </span>
                                        </div>
                                    </div>

                                    {/* Attached Receipt Info */}
                                    {selectedList.receiptData && (
                                        <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
                                            <p className="text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">receipt</span>
                                                Ticket / Factura Fiscal Adjunta
                                            </p>
                                            {selectedList.receiptData.rate && (
                                                <div className="flex justify-between text-on-surface-variant">
                                                    <span>Tasa BCV del ticket:</span>
                                                    <span className="font-bold text-on-surface">Bs. {selectedList.receiptData.rate.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            {selectedList.receiptData.igtfVES && (
                                                <div className="flex justify-between text-tertiary">
                                                    <span>IGTF pagado (3% divisas):</span>
                                                    <span className="font-bold">Bs. {selectedList.receiptData.igtfVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            {selectedList.receiptData.ivaVES && (
                                                <div className="flex justify-between text-on-surface-variant">
                                                    <span>IVA (16%):</span>
                                                    <span className="font-bold text-on-surface">Bs. {selectedList.receiptData.ivaVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Receipt Image Button */}
                                    {selectedList.receiptImage && (
                                        <button
                                            type="button"
                                            onClick={() => setViewingReceiptImage(selectedList.receiptImage)}
                                            className="w-full mt-2 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 text-primary font-bold text-xs active:scale-98 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-base">image</span>
                                            Ver Foto del Recibo / Factura
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-outline uppercase tracking-[0.14em] pl-1">
                                    Artículos de esta compra
                                </p>
                                {(selectedList.items || []).map((item, idx) => (
                                    <div key={item.id || idx} className="card-glass p-3 rounded-2xl flex items-center justify-between">
                                        <div className="min-w-0 pr-3">
                                            <p className="text-on-surface font-bold text-sm leading-tight flex items-center gap-2 truncate">
                                                <span className="truncate">{item.name}</span>
                                                {(item.quantity > 1) && (
                                                    <span className="thumb-neutral text-[10px] font-bold px-1.5 h-5 rounded-md flex items-center shrink-0">
                                                        x{item.quantity}
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-outline text-[11px] font-medium mt-0.5">
                                                Bs. {(item.priceVES || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <span className="text-primary font-bold text-base shrink-0">
                                            ${(item.priceUSD || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="pt-2 flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onLoadToCart(selectedList);
                                        onClose();
                                    }}
                                    className="h-12 rounded-[16px] thumb-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-lg">shopping_cart_checkout</span>
                                    Cargar en Carrito Actual
                                </button>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleCopyList(selectedList)}
                                        className="h-11 rounded-[16px] well text-on-surface font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-sm">
                                            {copiedId === selectedList.id ? 'check' : 'content_copy'}
                                        </span>
                                        {copiedId === selectedList.id ? '¡Copiado!' : 'Copiar lista'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (window.confirm('¿Deseas eliminar esta lista guardada?')) {
                                                onDeleteList(selectedList.id);
                                                setSelectedList(null);
                                            }
                                        }}
                                        className="h-11 rounded-[16px] bg-error/15 text-error font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* MASTER LIST: List of all saved shopping trips */
                        savedLists.length === 0 ? (
                            <div className="card-glass p-10 flex flex-col items-center justify-center text-center text-outline my-8">
                                <span className="material-symbols-outlined text-5xl mb-3 opacity-40">receipt_long</span>
                                <h4 className="text-on-surface font-bold text-base">No tienes compras guardadas</h4>
                                <p className="text-xs text-outline mt-1 max-w-xs">
                                    Cuando finalices tus compras en el supermercado, usa el botón "Guardar Lista" o escanea el recibo.
                                </p>
                            </div>
                        ) : (
                            savedLists.map((list) => (
                                <div
                                    key={list.id}
                                    onClick={() => setSelectedList(list)}
                                    className="card-glass p-4 rounded-2xl cursor-pointer hover:border-primary/40 active:scale-[0.99] transition-all flex items-center justify-between"
                                >
                                    <div className="min-w-0 pr-3">
                                        <div className="flex items-center gap-2">
                                            <p className="text-on-surface font-bold text-sm truncate">
                                                {list.title || 'Compra en Supermercado'}
                                            </p>
                                            {list.receiptImage && (
                                                <span className="text-[10px] font-bold bg-secondary/20 text-secondary px-2 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-[11px]">receipt</span> Recibo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-outline text-xs mt-1">
                                            {list.date} • {list.items?.length || 0} artículos
                                        </p>
                                    </div>

                                    <div className="text-right flex items-center gap-3 shrink-0">
                                        <div>
                                            <p className="text-primary font-bold text-base">
                                                ${(list.totalUSD || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-outline text-[11px]">
                                                Bs. {(list.totalVES || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full well flex items-center justify-center text-outline">
                                            <span className="material-symbols-outlined text-base">chevron_right</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>

            {/* RECEIPT IMAGE LIGHTBOX */}
            {viewingReceiptImage && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Foto de recibo ampliada"
                    className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex flex-col justify-between p-4 animate-overlay"
                    onClick={() => setViewingReceiptImage(null)}
                >
                    <div 
                        className="flex justify-between items-center text-white"
                        style={{ paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)' }}
                    >
                        <span className="text-sm font-bold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-primary">receipt</span> Foto de Factura
                        </span>
                        <button
                            type="button"
                            onClick={() => setViewingReceiptImage(null)}
                            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center overflow-auto p-2">
                        <img
                            src={viewingReceiptImage}
                            alt="Foto del recibo de compra"
                            className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div className="text-center text-xs text-white/70 pb-2">
                        Toca afuera para cerrar la imagen
                    </div>
                </div>
            )}
        </div>
    );
}

export default SavedListsModal;
