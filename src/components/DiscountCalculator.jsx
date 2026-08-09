import React, { useState } from 'react';

function DiscountCalculator() {
    const [price, setPrice] = useState('');
    const [discount, setDiscount] = useState('');

    const handlePriceChange = (e) => {
        const val = e.target.value.replace(/[^0-9.,]/g, '');
        const parts = val.split(/[.,]/);
        if (parts.length > 2) return;
        if (parts[1] && parts[1].length > 2) return;
        setPrice(val.replace('.', ','));
    };

    const handleDiscountChange = (e) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (parseInt(val) > 100) val = '100';
        setDiscount(val);
    };

    const numPrice = parseFloat(price.replace(',', '.')) || 0;
    const numDiscount = parseInt(discount) || 0;
    
    let savedAmount = 0;
    let finalPrice = 0;

    if (numPrice > 0 && numDiscount > 0) {
        savedAmount = numPrice * (numDiscount / 100);
        finalPrice = numPrice - savedAmount;
    } else if (numPrice > 0) {
        finalPrice = numPrice;
    }

    const formatCurrency = (val) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const presets = [10, 20, 30, 50];

    return (
        <article className="glass-surface rounded-2xl p-md flex flex-col gap-md animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-400">sell</span>
                </div>
                <div>
                    <h3 className="text-on-surface font-h3 text-h3 leading-none">Descuentos</h3>
                    <p className="text-[12px] text-outline">Calcula cuánto ahorras</p>
                </div>
            </div>

            <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-widest pl-1">Precio Original</label>
                    <div className="glass-surface-active rounded-xl flex items-center px-4 h-14 border-emerald-500/30">
                        <span className="text-emerald-400 font-bold mr-3">Bs/$</span>
                        <input
                            className="bg-transparent border-none focus:ring-0 outline-none text-on-surface font-h2 text-h2 p-0 w-full placeholder:text-outline-variant/40"
                            placeholder="0,00"
                            type="text"
                            value={price}
                            onChange={handlePriceChange}
                            inputMode="decimal"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-end pl-1 mb-1">
                        <label className="text-[11px] font-bold text-outline uppercase tracking-widest">Porcentaje (%)</label>
                    </div>
                    <div className="flex gap-2 mb-2">
                        {presets.map(pct => (
                            <button 
                                key={pct} 
                                onClick={() => setDiscount(pct.toString())} 
                                className={`flex-1 py-1.5 rounded-md text-[13px] font-bold transition-all ${discount === pct.toString() ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow-lg' : 'bg-white/5 text-outline hover:bg-white/10'}`}
                            >
                                -{pct}%
                            </button>
                        ))}
                    </div>
                    <div className="glass-surface-active rounded-xl flex items-center px-4 h-12">
                        <span className="text-outline font-bold mr-3">%</span>
                        <input
                            className="bg-transparent border-none focus:ring-0 outline-none text-on-surface font-bold text-lg p-0 w-full placeholder:text-outline-variant/40"
                            placeholder="Otro porcentaje..."
                            type="text"
                            value={discount}
                            onChange={handleDiscountChange}
                            inputMode="numeric"
                        />
                    </div>
                </div>
            </div>

            {numPrice > 0 && (
                <div className="glass-surface border border-emerald-500/20 rounded-xl p-4 mt-2 space-y-3 animate-slide-down">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-outline">Precio Base:</span>
                        <span className="text-on-surface line-through decoration-error/70">{formatCurrency(numPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-outline">Dinero Ahorrado:</span>
                        <span className="text-emerald-400 font-medium">-{formatCurrency(savedAmount)}</span>
                    </div>
                    <div className="w-full h-px bg-white/10 my-1"></div>
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-emerald-400">Precio Final:</span>
                        <span className="text-emerald-400">{formatCurrency(finalPrice)}</span>
                    </div>
                    
                    {numDiscount > 0 && (
                        <div className="mt-4 bg-emerald-500/10 p-3 rounded-lg text-center">
                            <span className="text-[11px] text-emerald-300 font-bold block mb-1">Total a Pagar</span>
                            <span className="font-numeral-display text-3xl text-on-surface">{formatCurrency(finalPrice)}</span>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

export default DiscountCalculator;
