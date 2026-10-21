import React, { useState, useRef, useEffect } from 'react';
import { scanReceipt, compressImageForStorage } from '../services/ocrService';

function ReceiptScanner({ currentItems, rate, onComplete, onClose }) {
    const fileInputRef = useRef(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [status, setStatus] = useState('Listo para capturar el recibo');
    const [progress, setProgress] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // Selected items from receipt to add to shopping list
    const [selectedNewItems, setSelectedNewItems] = useState({});
    const [selectedPriceUpdates, setSelectedPriceUpdates] = useState({});

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Handle photo capture or gallery upload
    const handleFileSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setProcessing(true);
        setErrorMessage(null);
        setParsedData(null);

        try {
            // Compress image for preview and local storage
            const compressed = await compressImageForStorage(file, 1000, 0.72);
            setImagePreview(compressed);

            setStatus('Analizando ticket y extrayendo datos...');
            const img = new Image();
            img.src = compressed;
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = rej;
            });

            const result = await scanReceipt(img, {
                onProgress: (p) => {
                    setStatus(p.label || 'Leyendo factura...');
                    setProgress(p.progress || 0);
                }
            });

            // Reconcile with current items
            // 1. Identify which receipt items match existing items by name similarity
            const priceUpdates = {};
            const newItems = {};

            result.items.forEach((rItem) => {
                const match = currentItems.find(cItem => {
                    const cName = cItem.name.toLowerCase().trim();
                    const rName = rItem.name.toLowerCase().trim();
                    return cName.includes(rName) || rName.includes(cName);
                });

                if (match) {
                    // Match found: check if price differs
                    priceUpdates[match.id] = {
                        original: match,
                        newPrice: rItem.price,
                        formattedPrice: rItem.formattedPrice,
                        receiptName: rItem.name
                    };
                } else {
                    // New item not in shopping list
                    newItems[rItem.id] = {
                        ...rItem,
                        selected: true
                    };
                }
            });

            setSelectedPriceUpdates(priceUpdates);
            setSelectedNewItems(newItems);
            setParsedData(result);
            setStatus('¡Recibo analizado con éxito!');
        } catch (err) {
            console.error('Receipt OCR error:', err);
            setErrorMessage('No pudimos procesar la imagen del recibo. Asegúrate de que esté bien iluminada y nítida.');
        } finally {
            setProcessing(false);
        }
    };

    // Calculate current estimated total of shopping list
    const currentTotalUSD = currentItems.reduce((acc, it) => {
        const qty = it.quantity || 1;
        const p = it.originalCurrency === 'USD' ? it.originalPrice : (it.originalPrice / (rate || 1));
        return acc + (p * qty);
    }, 0);

    const receiptTotalUSD = parsedData?.totalUSD || (parsedData?.totalVES && rate ? parsedData.totalVES / rate : null);
    const diffUSD = (receiptTotalUSD && currentTotalUSD > 0) ? (receiptTotalUSD - currentTotalUSD) : null;

    // Apply reconciliation and finish
    const handleApplyAndFinish = () => {
        // Build updated list
        let updatedItems = [...currentItems];

        // 1. Apply price updates from receipt
        Object.entries(selectedPriceUpdates).forEach(([itemId, data]) => {
            updatedItems = updatedItems.map(item => {
                if (item.id === parseInt(itemId, 10) || item.id === itemId) {
                    return {
                        ...item,
                        originalPrice: data.newPrice,
                        originalCurrency: parsedData?.rate ? 'VES' : item.originalCurrency
                    };
                }
                return item;
            });
        });

        // 2. Append new items selected from receipt
        Object.values(selectedNewItems).forEach(rItem => {
            if (rItem.selected) {
                // Determine currency
                const isVES = parsedData?.totalVES && !parsedData?.totalUSD;
                updatedItems.push({
                    id: Date.now() + Math.random(),
                    name: rItem.name,
                    quantity: rItem.quantity || 1,
                    originalPrice: rItem.price,
                    originalCurrency: isVES ? 'VES' : 'USD'
                });
            }
        });

        onComplete({
            receiptImage: imagePreview,
            receiptData: parsedData,
            updatedItems,
            receiptTotalUSD,
            receiptTotalVES: parsedData?.totalVES
        });
    };

    return (
        <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-scanner-title"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-overlay"
        >
            {/* TOP BAR */}
            <div 
                className="w-full z-30 flex items-center justify-between px-4 py-3 bg-surface-container border-b border-white/10"
                style={{ paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)' }}
            >
                <button 
                    type="button"
                    onClick={onClose} 
                    className="h-10 px-3.5 rounded-full well flex items-center gap-1.5 text-on-surface font-bold text-xs active:scale-95 transition-transform"
                    aria-label="Volver a la lista"
                >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    <span>Volver</span>
                </button>

                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">receipt_long</span>
                    <h3 id="receipt-scanner-title" className="text-on-surface font-bold text-sm">Escáner de Recibo</h3>
                </div>

                <button 
                    type="button"
                    onClick={onClose}
                    className="w-10 h-10 rounded-full well flex items-center justify-center text-outline hover:text-on-surface active:scale-90"
                    aria-label="Cerrar modal"
                >
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-4 pb-28">
                {/* Intro / Instructions Card */}
                {!parsedData && !processing && (
                    <div className="card-glass p-6 text-center space-y-4 animate-fade-in-up">
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
                            <span className="material-symbols-outlined text-3xl">receipt_long</span>
                        </div>
                        <div>
                            <h4 className="text-on-surface font-bold text-lg">Escanea tu Ticket de Compra</h4>
                            <p className="text-outline text-xs mt-1 leading-relaxed">
                                Toma una foto nítida de la factura fiscal para que la IA extraiga los totales, impuestos (IVA/IGTF), la tasa del comercio y agregue artículos que olvidaste anotar.
                            </p>
                        </div>

                        {/* Capture Buttons */}
                        <div className="pt-2 flex flex-col gap-2.5">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-13 py-3.5 px-4 rounded-[20px] thumb-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined text-xl">photo_camera</span>
                                Tomar foto del recibo
                            </button>

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-11 px-4 rounded-[16px] well text-on-surface-variant font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-base">image</span>
                                Subir foto desde la galería
                            </button>
                        </div>
                    </div>
                )}

                {/* Processing State with Live Progress */}
                {processing && (
                    <div className="card-glass p-8 text-center space-y-4 animate-fade-in">
                        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
                        </div>
                        <div>
                            <h4 className="text-on-surface font-bold text-base">{status}</h4>
                            <p className="text-outline text-xs mt-1">Identificando artículos, precios y totales...</p>
                        </div>
                        {progress > 0 && (
                            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-3">
                                <div 
                                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}
                        {imagePreview && (
                            <div className="w-28 h-36 mx-auto rounded-xl overflow-hidden border border-white/20 opacity-60 mt-2">
                                <img src={imagePreview} alt="Recibo" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                )}

                {/* Error Box */}
                {errorMessage && (
                    <div className="bg-error/15 border border-error/30 p-4 rounded-2xl flex items-start gap-3 text-left">
                        <span className="material-symbols-outlined text-error text-xl shrink-0">error</span>
                        <div className="flex-1 text-xs">
                            <p className="font-bold text-on-surface mb-1">Error al leer la factura</p>
                            <p className="text-outline">{errorMessage}</p>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-3 px-3 py-1.5 rounded-full bg-error/20 text-error font-bold flex items-center gap-1 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-sm">refresh</span> Reintentar
                            </button>
                        </div>
                    </div>
                )}

                {/* Hidden File Input */}
                <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    onChange={handleFileSelected} 
                />

                {/* PARSED RECEIPT RESULTS & RECONCILIATION */}
                {parsedData && !processing && (
                    <div className="space-y-4 animate-fade-in-up">
                        {/* Receipt Header & Financial Insights Card */}
                        <div className="bezel">
                            <div className="bezel-core card-sheen p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-base">storefront</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-on-surface font-bold text-sm truncate">{parsedData.supermarketName}</h4>
                                            <p className="text-outline text-[11px]">
                                                {parsedData.invoiceDate} {parsedData.invoiceNumber && `• Doc: ${parsedData.invoiceNumber}`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-primary text-xs font-bold flex items-center gap-1"
                                        title="Cambiar foto de recibo"
                                    >
                                        <span className="material-symbols-outlined text-sm">cached</span> Cambiar
                                    </button>
                                </div>

                                {/* Comparison: Estimado vs Facturado */}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div className="well p-3 rounded-2xl">
                                        <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Tu lista estimada</p>
                                        <p className="text-on-surface font-bold text-base mt-0.5">
                                            ${currentTotalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="well p-3 rounded-2xl border-primary/30">
                                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Total en Ticket</p>
                                        <p className="text-primary font-bold text-lg mt-0.5">
                                            {receiptTotalUSD 
                                                ? `$${receiptTotalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                : (parsedData.totalVES ? `Bs. ${parsedData.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : 'No detectado')}
                                        </p>
                                    </div>
                                </div>

                                {diffUSD !== null && (
                                    <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${diffUSD > 0 ? 'bg-error/15 text-error' : 'bg-primary/15 text-primary'}`}>
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">
                                                {diffUSD > 0 ? 'trending_up' : 'trending_down'}
                                            </span>
                                            Diferencia vs estimado:
                                        </span>
                                        <span className="font-bold">
                                            {diffUSD > 0 ? `+ $${diffUSD.toFixed(2)}` : `- $${Math.abs(diffUSD).toFixed(2)}`}
                                        </span>
                                    </div>
                                )}

                                {/* Specific Venezuelan Fiscal Data Insights */}
                                <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs">
                                    <p className="text-[10px] font-bold text-outline uppercase tracking-[0.14em] mb-1">Datos fiscales del ticket</p>
                                    
                                    {parsedData.rate && (
                                        <div className="flex justify-between text-on-surface-variant">
                                            <span>Tasa BCV del ticket:</span>
                                            <span className="font-bold text-on-surface">Bs. {parsedData.rate.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {parsedData.totalVES && (
                                        <div className="flex justify-between text-on-surface-variant">
                                            <span>Monto total en Bolívares:</span>
                                            <span className="font-bold text-on-surface">Bs. {parsedData.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {parsedData.igtfVES && (
                                        <div className="flex justify-between text-tertiary">
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[13px]">payments</span>
                                                IGTF (3% divisas pagado):
                                            </span>
                                            <span className="font-bold">Bs. {parsedData.igtfVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {parsedData.ivaVES && (
                                        <div className="flex justify-between text-on-surface-variant">
                                            <span>IVA (16%):</span>
                                            <span className="font-bold text-on-surface">Bs. {parsedData.ivaVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Missing / New Items Detected in Receipt */}
                        {Object.keys(selectedNewItems).length > 0 && (
                            <div className="card-glass p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-on-surface font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-primary text-base">add_shopping_cart</span>
                                            Artículos detectados en ticket ({Object.keys(selectedNewItems).length})
                                        </p>
                                        <p className="text-outline text-[11px]">Marca los que deseas añadir a tu lista:</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const allChecked = Object.values(selectedNewItems).every(i => i.selected);
                                            const updated = {};
                                            Object.entries(selectedNewItems).forEach(([k, v]) => {
                                                updated[k] = { ...v, selected: !allChecked };
                                            });
                                            setSelectedNewItems(updated);
                                        }}
                                        className="text-xs text-primary font-bold hover:underline"
                                    >
                                        {Object.values(selectedNewItems).every(i => i.selected) ? 'Desmarcar todos' : 'Marcar todos'}
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {Object.entries(selectedNewItems).map(([id, item]) => (
                                        <label 
                                            key={id}
                                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${item.selected ? 'bg-primary/10 border-primary/40 text-on-surface' : 'well border-transparent text-outline'}`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                <input 
                                                    type="checkbox"
                                                    checked={!!item.selected}
                                                    onChange={(e) => {
                                                        setSelectedNewItems(prev => ({
                                                            ...prev,
                                                            [id]: { ...prev[id], selected: e.target.checked }
                                                        }));
                                                    }}
                                                    className="w-4 h-4 rounded text-primary focus:ring-0 bg-transparent border-white/20"
                                                />
                                                <span className="text-xs font-semibold truncate">{item.name}</span>
                                            </div>
                                            <span className="font-bold text-xs shrink-0 text-primary">
                                                {item.formattedPrice}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* FLOATING ACTION BOTTOM BAR */}
            {parsedData && !processing && (
                <div 
                    className="fixed bottom-0 left-0 right-0 z-40 bg-surface-container/95 backdrop-blur-xl border-t border-white/10 p-4 flex gap-3 shadow-2xl max-w-lg mx-auto"
                    style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)' }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-12 px-4 rounded-[16px] well text-outline font-bold text-xs flex-1 active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleApplyAndFinish}
                        className="h-12 px-5 rounded-[16px] thumb-primary text-white font-bold text-sm flex-[2] flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-primary/25"
                    >
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        Aplicar y Guardar Recibo
                    </button>
                </div>
            )}
        </div>
    );
}

export default ReceiptScanner;
