import React, { useState } from 'react';
import useRates from '../hooks/useRates';
import PriceScanner from './PriceScanner';

function ShoppingList() {
    const { todayRates } = useRates();
    const [items, setItems] = useState(() => {
        const saved = localStorage.getItem('shoppingListItems');
        return saved ? JSON.parse(saved) : [];
    });
    
    useEffect(() => {
        localStorage.setItem('shoppingListItems', JSON.stringify(items));
    }, [items]);

    const [showScanner, setShowScanner] = useState(false);
    const [itemName, setItemName] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [inputCurrency, setInputCurrency] = useState('USD');

    const rate = todayRates.oficial || 1;

    const handleAddItem = (e) => {
        if (e) e.preventDefault();
        const priceNum = parseFloat(itemPrice.replace(/\./g, '').replace(',', '.'));
        if (!itemName || isNaN(priceNum) || priceNum <= 0) return;
        
        let priceUSD, priceVES;
        if (inputCurrency === 'USD') {
            priceUSD = priceNum;
            priceVES = priceNum * rate;
        } else {
            priceVES = priceNum;
            priceUSD = priceNum / rate;
        }

        setItems([...items, {
            id: Date.now(),
            name: itemName,
            priceUSD,
            priceVES
        }]);

        setItemName('');
        setItemPrice('');
    };

    const handleScan = (scannedData) => {
        setItemPrice(scannedData.price);
        if (scannedData.name) {
            setItemName(scannedData.name.toUpperCase());
        }
        setShowScanner(false);
    };

    const deleteItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const totalUSD = items.reduce((sum, item) => sum + item.priceUSD, 0);
    const totalVES = items.reduce((sum, item) => sum + item.priceVES, 0);

    return (
        <div className="animate-fade-in-up pb-48">
            <section className="mb-6 pt-4">
                <h2 className="text-on-surface font-h2 text-h2">Lista de Compras</h2>
                <p className="text-on-surface-variant font-body-sm text-body-sm">Escanea y controla lo que gastas en el súper</p>
            </section>

            {/* Input form */}
            <form onSubmit={handleAddItem} className="glass-surface p-4 rounded-2xl mb-6 space-y-4">
                <div>
                    <label className="text-[11px] font-bold text-outline uppercase tracking-widest pl-1 block mb-1.5">Producto</label>
                    <input 
                        type="text" 
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="Ej. Harina PAN"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-on-surface focus:border-primary outline-none transition-colors"
                    />
                </div>

                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className="text-[11px] font-bold text-outline uppercase tracking-widest pl-1 block mb-1.5">Precio</label>
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-2 h-12 focus-within:border-primary transition-colors">
                            <button 
                                type="button"
                                onClick={() => setInputCurrency(inputCurrency === 'USD' ? 'VES' : 'USD')}
                                className="text-primary font-bold px-2 flex items-center gap-1 active:scale-90"
                            >
                                {inputCurrency === 'USD' ? '$' : 'Bs'}
                                <span className="material-symbols-outlined text-[14px]">swap_vert</span>
                            </button>
                            <input 
                                type="text"
                                inputMode="decimal"
                                value={itemPrice}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^\d,]/g, '');
                                    const parts = value.split(',');
                                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                                    setItemPrice(parts.join(','));
                                }}
                                placeholder="0,00"
                                className="w-full bg-transparent border-none focus:ring-0 outline-none text-on-surface font-bold px-2"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowScanner(true)}
                                className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center active:scale-90 transition-colors hover:bg-primary/30"
                                title="Escanear etiqueta"
                            >
                                <span className="material-symbols-outlined text-sm">document_scanner</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button type="submit" className="h-12 px-5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-bold active:scale-95 shadow-lg shadow-primary/20 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                        </button>
                    </div>
                </div>
            </form>

            {/* List */}
            {items.length > 0 ? (
                <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-[11px] font-bold text-outline uppercase tracking-widest">{items.length} Artículos</span>
                        <button onClick={() => setItems([])} className="text-[11px] text-error font-bold uppercase tracking-widest flex items-center gap-1 active:scale-95">
                            <span className="material-symbols-outlined text-[14px]">delete_sweep</span> Vaciar
                        </button>
                    </div>
                    {items.map(item => (
                        <div key={item.id} className="glass-surface p-3.5 rounded-xl flex items-center justify-between animate-slide-down">
                            <div>
                                <p className="text-on-surface font-semibold leading-tight">{item.name}</p>
                                <p className="text-outline text-[10px] uppercase font-bold mt-0.5">
                                    Bs. {item.priceVES.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-primary font-bold text-lg whitespace-nowrap">
                                    ${item.priceUSD.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </span>
                                <button onClick={() => deleteItem(item.id)} className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center active:scale-90 flex-shrink-0">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-surface p-8 rounded-2xl flex flex-col items-center justify-center text-center text-outline">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">shopping_cart</span>
                    <p className="text-sm">Tu lista de compras está vacía</p>
                </div>
            )}

            {/* Floating Total Bar */}
            <div className="fixed bottom-[88px] left-0 right-0 px-4 z-40 pointer-events-none">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex items-center justify-between pointer-events-auto">
                        <div>
                            <p className="text-[10px] text-outline uppercase font-bold tracking-widest mb-0.5">Total Estimado</p>
                            <p className="text-on-surface font-bold text-sm">Bs. {totalVES.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-primary font-numeral-display text-3xl font-extrabold leading-none" style={{ filter: 'drop-shadow(0 0 10px rgba(66,133,244,0.3))' }}>
                                ${totalUSD.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {showScanner && (
                <PriceScanner 
                    onScan={handleScan}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
}

export default ShoppingList;
