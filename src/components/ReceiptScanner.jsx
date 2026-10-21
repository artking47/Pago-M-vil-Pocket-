import React, { useState, useRef, useEffect, useMemo } from 'react';
import { scanReceipt, parseReceiptText, compressImageForStorage } from '../services/ocrService';

function ReceiptScanner({ currentItems = [], rate = 1, onComplete, onClose }) {
    const fileInputRef = useRef(null);
    const [inputMode, setInputMode] = useState('scan'); // 'scan' | 'paste'
    const [pastedText, setPastedText] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [status, setStatus] = useState('Listo para capturar el recibo');
    const [progress, setProgress] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [showRawText, setShowRawText] = useState(false);

    // Editable fields for precision correction
    const [storeName, setStoreName] = useState('');
    const [totalVES, setTotalVES] = useState('');
    const [totalUSD, setTotalUSD] = useState('');
    const [bcvRate, setBcvRate] = useState('');
    const [igtfVES, setIgtfVES] = useState('');
    const [ivaVES, setIvaVES] = useState('');
    const [editableItems, setEditableItems] = useState([]);

    // Selection of items to add or update
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

    // Apply parsed result (shared by OCR and pasted text)
    const applyParsedResult = (result) => {
        setStoreName(result.supermarketName || 'Supermercado');
        setTotalVES(result.totalVES ? result.totalVES.toString() : '');
        setTotalUSD(result.totalUSD ? result.totalUSD.toString() : '');
        setBcvRate(result.rate ? result.rate.toString() : (rate ? rate.toString() : ''));
        setIgtfVES(result.igtfVES ? result.igtfVES.toString() : '');
        setIvaVES(result.ivaVES ? result.ivaVES.toString() : '');
        setEditableItems(result.items || []);

        reconcileWithCart(result.items || []);
        setParsedData(result);
        setStatus('¡Ticket analizado con éxito!');
    };

    // Handle photo capture or gallery upload
    const handleFileSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setProcessing(true);
        setErrorMessage(null);
        setParsedData(null);

        try {
            // Compress thumbnail for preview and local storage
            const compressedThumbnail = await compressImageForStorage(file, 900, 0.7);
            setImagePreview(compressedThumbnail);

            setStatus('Cargando imagen en alta resolución...');

            // Load original high-resolution image for maximum OCR accuracy on thermal receipt fonts
            const objectUrl = URL.createObjectURL(file);
            const fullResImg = new Image();
            fullResImg.src = objectUrl;
            await new Promise((res, rej) => {
                fullResImg.onload = res;
                fullResImg.onerror = rej;
            });

            setStatus('Analizando líneas térmicas y extrayendo artículos...');
            const result = await scanReceipt(fullResImg, {
                onProgress: (p) => {
                    setStatus(p.label || 'Leyendo factura...');
                    setProgress(p.progress || 0);
                }
            });

            URL.revokeObjectURL(objectUrl);
            applyParsedResult(result);
        } catch (err) {
            console.error('Receipt OCR error:', err);
            setErrorMessage('No pudimos procesar la imagen del recibo. Asegúrate de enfocar con buena luz y estirar el ticket, o prueba pegando el texto en la pestaña "Pegar Texto".');
        } finally {
            setProcessing(false);
        }
    };

    // Handle direct text paste parsing
    const handleProcessPastedText = () => {
        if (!pastedText.trim()) {
            setErrorMessage('Por favor pega el texto de la factura en el recuadro antes de procesar.');
            return;
        }

        setProcessing(true);
        setErrorMessage(null);

        try {
            const result = parseReceiptText(pastedText);
            applyParsedResult(result);
        } catch (err) {
            console.error('Paste parse error:', err);
            setErrorMessage('Hubo un problema interpretando el texto. Verifica que contenga los montos o precios.');
        } finally {
            setProcessing(false);
        }
    };

    // Reconcile detected items with current shopping cart
    const reconcileWithCart = (itemsList) => {
        const priceUpdates = {};
        const newItems = {};

        itemsList.forEach((rItem) => {
            const match = currentItems.find(cItem => {
                const cName = (cItem.name || '').toLowerCase().trim();
                const rName = (rItem.name || '').toLowerCase().trim();
                return (cName && rName && (cName.includes(rName) || rName.includes(cName)));
            });

            if (match) {
                priceUpdates[match.id] = {
                    original: match,
                    newPrice: rItem.price,
                    formattedPrice: rItem.formattedPrice,
                    receiptName: rItem.name,
                    apply: true
                };
            } else {
                newItems[rItem.id] = {
                    ...rItem,
                    selected: true
                };
            }
        });

        setSelectedPriceUpdates(priceUpdates);
        setSelectedNewItems(newItems);
    };

    // Add manual item
    const handleAddManualItem = () => {
        const newItem = {
            id: `manual-item-${Date.now()}`,
            name: 'NUEVO ARTÍCULO',
            quantity: 1,
            price: 0,
            formattedPrice: '0,00'
        };
        const updated = [...editableItems, newItem];
        setEditableItems(updated);
        setSelectedNewItems(prev => ({
            ...prev,
            [newItem.id]: { ...newItem, selected: true }
        }));
    };

    // Delete item from detected list
    const handleDeleteItem = (itemId) => {
        setEditableItems(prev => prev.filter(it => it.id !== itemId));
        setSelectedNewItems(prev => {
            const copy = { ...prev };
            delete copy[itemId];
            return copy;
        });
    };

    // Update item field (name, quantity, price)
    const handleItemFieldChange = (itemId, field, val) => {
        setEditableItems(prev => prev.map(it => {
            if (it.id === itemId) {
                const updated = { ...it, [field]: val };
                if (field === 'price') {
                    const parsed = parseFloat(String(val).replace(',', '.')) || 0;
                    updated.price = parsed;
                    updated.formattedPrice = parsed.toFixed(2);
                }
                return updated;
            }
            return it;
        }));
    };

    // Financial math
    const currentTotalUSD = currentItems.reduce((acc, it) => {
        const qty = it.quantity || 1;
        const p = it.originalCurrency === 'USD' ? it.originalPrice : (it.originalPrice / (rate || 1));
        return acc + (p * qty);
    }, 0);

    const parsedRateNum = parseFloat(bcvRate) || rate || 1;
    const finalTotalUSD = totalUSD ? parseFloat(totalUSD) : (totalVES ? parseFloat(totalVES) / parsedRateNum : null);
    const diffUSD = (finalTotalUSD && currentTotalUSD > 0) ? (finalTotalUSD - currentTotalUSD) : null;

    // Items sum in VES vs detected total
    const itemsSumVES = useMemo(() => {
        return editableItems.reduce((acc, it) => {
            const price = parseFloat(it.price) || 0;
            const qty = parseFloat(it.quantity) || 1;
            return acc + (price * qty);
        }, 0);
    }, [editableItems]);

    // Apply reconciliation and finish
    const handleApplyAndFinish = () => {
        let updatedItems = [...currentItems];

        // 1. Update prices for matched items
        Object.entries(selectedPriceUpdates).forEach(([itemId, data]) => {
            if (data.apply) {
                updatedItems = updatedItems.map(item => {
                    if (item.id === parseInt(itemId, 10) || item.id === itemId) {
                        return {
                            ...item,
                            originalPrice: data.newPrice,
                            originalCurrency: bcvRate ? 'VES' : item.originalCurrency
                        };
                    }
                    return item;
                });
            }
        });

        // 2. Add missing/untracked items detected in receipt
        Object.values(selectedNewItems).forEach(rItem => {
            if (rItem.selected) {
                const currentEdit = editableItems.find(it => it.id === rItem.id) || rItem;
                const isVES = totalVES && !totalUSD;
                updatedItems.push({
                    id: Date.now() + Math.random(),
                    name: currentEdit.name || 'PRODUCTO',
                    quantity: currentEdit.quantity || 1,
                    originalPrice: currentEdit.price || 0,
                    originalCurrency: isVES ? 'VES' : 'USD'
                });
            }
        });

        const compiledReceiptData = {
            supermarketName: storeName || 'Supermercado',
            invoiceNumber: parsedData?.invoiceNumber || '',
            invoiceDate: parsedData?.invoiceDate || new Date().toLocaleDateString('es-VE'),
            rate: parsedRateNum,
            totalVES: parseFloat(totalVES) || (finalTotalUSD ? finalTotalUSD * parsedRateNum : itemsSumVES),
            totalUSD: finalTotalUSD || (parsedRateNum > 0 ? itemsSumVES / parsedRateNum : 0),
            ivaVES: parseFloat(ivaVES) || 0,
            igtfVES: parseFloat(igtfVES) || 0,
            items: editableItems
        };

        onComplete({
            receiptImage: imagePreview,
            receiptData: compiledReceiptData,
            updatedItems,
            receiptTotalUSD: compiledReceiptData.totalUSD,
            receiptTotalVES: compiledReceiptData.totalVES
        });
    };

    return (
        <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-scanner-title"
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-overlay"
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
                    <h3 id="receipt-scanner-title" className="text-on-surface font-bold text-sm">Escáner & Análisis de Ticket</h3>
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
            <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-4 pb-32">
                {/* Intro & Mode Selector (Only when not parsed yet) */}
                {!parsedData && !processing && (
                    <div className="space-y-4 animate-fade-in-up">
                        {/* Mode Switcher Pills */}
                        <div className="p-1 rounded-2xl well flex gap-1">
                            <button
                                type="button"
                                onClick={() => setInputMode('scan')}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                                    inputMode === 'scan' ? 'thumb-primary' : 'text-outline hover:text-on-surface'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base">photo_camera</span>
                                <span>Cámara / Foto</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setInputMode('paste')}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                                    inputMode === 'paste' ? 'thumb-primary' : 'text-outline hover:text-on-surface'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base">content_paste</span>
                                <span>Pegar Texto</span>
                            </button>
                        </div>

                        {/* MODE 1: CAMERA / PHOTO */}
                        {inputMode === 'scan' && (
                            <div className="card-glass p-6 text-center space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
                                    <span className="material-symbols-outlined text-3xl">receipt_long</span>
                                </div>
                                <div>
                                    <h4 className="text-on-surface font-bold text-lg">Escanea tu Ticket Fiscal</h4>
                                    <p className="text-outline text-xs mt-1 leading-relaxed">
                                        Fotografía la factura en una superficie plana y con buena luz. La IA extraerá cada artículo, cantidad, precio unitario, IVA, IGTF 3% y tasa oficial BCV.
                                    </p>
                                </div>

                                <div className="pt-2 flex flex-col gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-13 py-3.5 px-4 rounded-[20px] thumb-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-95 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-xl">photo_camera</span>
                                        Tomar foto del recibo (Cámara)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-11 px-4 rounded-[16px] well text-on-surface font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-base">image</span>
                                        Subir foto desde la galería
                                    </button>
                                </div>

                                <p className="text-[10px] text-outline pt-1">
                                    Tip: Compatible con impresoras térmicas SENIAT (The Factory HKA, Bixolon, Dascom, etc.)
                                </p>
                            </div>
                        )}

                        {/* MODE 2: PASTE TEXT (WHATSAPP, DIGITAL INVOICE, PDF) */}
                        {inputMode === 'paste' && (
                            <div className="card-glass p-5 space-y-3">
                                <div>
                                    <h4 className="text-on-surface font-bold text-sm flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-primary text-base">content_paste</span>
                                        Pegar Texto de Factura o Recibo
                                    </h4>
                                    <p className="text-outline text-xs mt-0.5">
                                        Ideal si recibiste el ticket por WhatsApp, correo o copia digital.
                                    </p>
                                </div>

                                <textarea
                                    rows={8}
                                    value={pastedText}
                                    onChange={(e) => setPastedText(e.target.value)}
                                    placeholder="Pega aquí el texto del ticket. Ejemplo:&#10;AUTOMERCADOS PLAZA&#10;001 HARINA PAN 1KG 48,50&#10;002 ARROZ PRIMOR 2 X 52,00 104,00&#10;TOTAL: 152,50&#10;TASA BCV: 86.88"
                                    className="w-full well rounded-2xl p-3 text-xs font-mono text-on-surface outline-none focus:border-primary/50 resize-y"
                                />

                                <button
                                    type="button"
                                    onClick={handleProcessPastedText}
                                    disabled={!pastedText.trim()}
                                    className="w-full h-12 rounded-2xl thumb-primary font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                                    Analizar y Extraer Artículos
                                </button>
                            </div>
                        )}
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
                            <p className="text-outline text-xs mt-1">Reconociendo nombres de productos, columnas y precios...</p>
                        </div>
                        {progress > 0 && (
                            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-3">
                                <div 
                                    className="h-full bg-primary transition-all duration-300"
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
                            <p className="font-bold text-on-surface mb-1">Nota del Escáner</p>
                            <p className="text-outline">{errorMessage}</p>
                            <div className="flex gap-2 mt-3">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-1.5 rounded-full bg-error/20 text-error font-bold flex items-center gap-1 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-sm">photo_camera</span> Reintentar Foto
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setErrorMessage(null); setInputMode('paste'); }}
                                    className="px-3 py-1.5 rounded-full well text-on-surface font-bold flex items-center gap-1 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-sm">content_paste</span> Pegar Texto
                                </button>
                            </div>
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

                {/* PARSED RECEIPT RESULTS & INTERACTIVE REVIEW EDITOR */}
                {parsedData && !processing && (
                    <div className="space-y-4 animate-fade-in-up">
                        {/* Summary & Financial Card */}
                        <div className="bezel">
                            <div className="bezel-core card-sheen p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                    <div className="flex-1 mr-2">
                                        <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-0.5">Comercio / Supermercado</label>
                                        <input 
                                            type="text" 
                                            value={storeName}
                                            onChange={(e) => setStoreName(e.target.value)}
                                            className="w-full bg-transparent border-none p-0 focus:ring-0 outline-none text-on-surface font-bold text-sm"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-primary text-xs font-bold flex items-center gap-1 shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-sm">cached</span> Repetir foto
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
                                        <div className="flex items-center gap-1">
                                            <span className="text-primary font-bold text-lg">$</span>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                value={finalTotalUSD || ''}
                                                onChange={(e) => setTotalUSD(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 outline-none text-primary font-bold text-lg font-mono"
                                            />
                                        </div>
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

                                {/* Financial Details & Tax Breakdown */}
                                <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
                                    <p className="text-[10px] font-bold text-outline uppercase tracking-[0.14em]">Datos Fiscales del Ticket</p>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-outline">Tasa BCV del ticket (Bs):</label>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                value={bcvRate}
                                                onChange={(e) => setBcvRate(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full well rounded-xl px-2.5 py-1.5 text-on-surface font-semibold text-xs mt-0.5 outline-none font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-outline">Total Ticket (Bs):</label>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                value={totalVES}
                                                onChange={(e) => setTotalVES(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full well rounded-xl px-2.5 py-1.5 text-on-surface font-semibold text-xs mt-0.5 outline-none font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-outline">IVA 16% (Bs):</label>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                value={ivaVES}
                                                onChange={(e) => setIvaVES(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full well rounded-xl px-2.5 py-1.5 text-on-surface font-semibold text-xs mt-0.5 outline-none font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-outline">IGTF 3% (Divisas Bs):</label>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                value={igtfVES}
                                                onChange={(e) => setIgtfVES(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full well rounded-xl px-2.5 py-1.5 text-on-surface font-semibold text-xs mt-0.5 outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* DETECTED ITEMS EDITABLE TABLE */}
                        <div className="card-glass p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-on-surface font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-primary text-base">format_list_bulleted</span>
                                        Artículos Detectados ({editableItems.length})
                                    </p>
                                    <p className="text-outline text-[11px]">
                                        Suma de artículos: <strong className="text-on-surface font-mono">Bs. {itemsSumVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                        {totalVES && Math.abs(parseFloat(totalVES) - itemsSumVES) < 1 && (
                                            <span className="text-emerald-500 font-bold ml-1.5">✓ Coincide con total</span>
                                        )}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddManualItem}
                                    className="text-xs text-primary font-bold flex items-center gap-1 hover:underline shrink-0"
                                >
                                    <span className="material-symbols-outlined text-sm">add</span> Añadir
                                </button>
                            </div>

                            {/* Fallback if 0 items detected */}
                            {editableItems.length === 0 ? (
                                <div className="p-4 rounded-xl well border border-dashed border-white/15 text-center space-y-2">
                                    <span className="material-symbols-outlined text-2xl text-outline">find_in_page</span>
                                    <p className="text-xs font-semibold text-on-surface">No se identificaron artículos individuales automáticamente</p>
                                    <p className="text-[11px] text-outline max-w-xs mx-auto">
                                        La tinta térmica tenue o dobleces del papel pueden dificultar la lectura. Puedes agregar tus artículos con el botón (+ Añadir) o pegar el texto directamente.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleAddManualItem}
                                        className="h-9 px-4 rounded-full thumb-primary font-bold text-xs inline-flex items-center gap-1 active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span> Añadir primer artículo
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                    {editableItems.map((item) => {
                                        const isNew = selectedNewItems[item.id];
                                        return (
                                            <div 
                                                key={item.id}
                                                className={`p-2.5 rounded-xl border flex items-center gap-2 ${isNew?.selected ? 'bg-primary/5 border-primary/25' : 'well border-transparent'}`}
                                            >
                                                {/* Checkbox to add to cart if it was missing */}
                                                {isNew && (
                                                    <input 
                                                        type="checkbox"
                                                        checked={!!isNew.selected}
                                                        onChange={(e) => {
                                                            setSelectedNewItems(prev => ({
                                                                ...prev,
                                                                [item.id]: { ...prev[item.id], selected: e.target.checked }
                                                            }));
                                                        }}
                                                        title="Marcar para agregar al carrito"
                                                        className="w-4 h-4 rounded text-primary focus:ring-0 bg-transparent border-white/20 shrink-0 cursor-pointer"
                                                    />
                                                )}

                                                {/* Name Input */}
                                                <div className="flex-1 min-w-0">
                                                    <input 
                                                        type="text" 
                                                        value={item.name}
                                                        onChange={(e) => handleItemFieldChange(item.id, 'name', e.target.value)}
                                                        className="w-full bg-transparent border-none p-0 focus:ring-0 outline-none text-on-surface font-semibold text-xs truncate"
                                                    />
                                                    <div className="flex items-center gap-1.5 text-[10px] text-outline mt-0.5">
                                                        <span>Cant:</span>
                                                        <input 
                                                            type="number" 
                                                            min="1"
                                                            value={item.quantity || 1}
                                                            onChange={(e) => handleItemFieldChange(item.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                                                            className="w-8 well rounded px-1 py-0.5 text-center text-on-surface font-bold outline-none font-mono"
                                                        />
                                                        {isNew && (
                                                            <span className="text-secondary font-bold ml-1">• Nuevo en lista</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Price Input */}
                                                <div className="w-24 text-right shrink-0">
                                                    <div className="flex items-center gap-1 well rounded-lg px-2 py-1">
                                                        <span className="text-[10px] text-outline font-bold">Bs</span>
                                                        <input 
                                                            type="number"
                                                            step="0.01"
                                                            value={item.price || ''}
                                                            onChange={(e) => handleItemFieldChange(item.id, 'price', e.target.value)}
                                                            placeholder="0.00"
                                                            className="w-full bg-transparent border-none p-0 text-right text-on-surface font-bold text-xs outline-none font-mono"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Delete Item */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="w-7 h-7 rounded-full well flex items-center justify-center text-outline hover:text-error shrink-0 active:scale-90"
                                                    title="Eliminar este artículo"
                                                >
                                                    <span className="material-symbols-outlined text-xs">close</span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* RECONCILIATION SUMMARY BOX: Artículos que se pasaron añadir */}
                        {Object.keys(selectedNewItems).length > 0 && (
                            <div className="card-glass p-3.5 rounded-2xl border border-secondary/30 bg-secondary/5 flex items-center justify-between">
                                <div className="min-w-0 pr-2">
                                    <p className="text-secondary font-bold text-xs flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">playlist_add</span>
                                        {Object.values(selectedNewItems).filter(i => i.selected).length} artículos a sincronizar
                                    </p>
                                    <p className="text-outline text-[11px] mt-0.5">
                                        Se agregarán automáticamente a tu carrito activo al confirmar.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const allSelected = Object.values(selectedNewItems).every(i => i.selected);
                                        const updated = {};
                                        Object.entries(selectedNewItems).forEach(([k, v]) => {
                                            updated[k] = { ...v, selected: !allSelected };
                                        });
                                        setSelectedNewItems(updated);
                                    }}
                                    className="text-xs text-secondary font-bold underline shrink-0 cursor-pointer"
                                >
                                    {Object.values(selectedNewItems).every(i => i.selected) ? 'Desmarcar' : 'Marcar todos'}
                                </button>
                            </div>
                        )}

                        {/* Raw text inspected accordion */}
                        {parsedData.rawText && (
                            <div className="pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowRawText(!showRawText)}
                                    className="text-[11px] text-outline font-semibold flex items-center gap-1 hover:text-on-surface"
                                >
                                    <span className="material-symbols-outlined text-xs">
                                        {showRawText ? 'expand_less' : 'expand_more'}
                                    </span>
                                    {showRawText ? 'Ocultar texto detectado del ticket' : 'Ver texto detectado del ticket (OCR)'}
                                </button>
                                {showRawText && (
                                    <pre className="mt-2 p-3 rounded-xl well text-[10px] font-mono text-outline whitespace-pre-wrap max-h-48 overflow-y-auto">
                                        {parsedData.rawText}
                                    </pre>
                                )}
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
                        className="h-12 px-5 rounded-[16px] thumb-primary font-bold text-sm flex-[2] flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-primary/25"
                    >
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        Aplicar y Sincronizar Carrito
                    </button>
                </div>
            )}
        </div>
    );
}

export default ReceiptScanner;
