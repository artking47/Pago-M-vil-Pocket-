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
        <div className="bezel animate-fade-in-up">
            <article className="bezel-core card-sheen p-4 sm:p-5 flex flex-col gap-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[13px] bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px] text-green-400">sell</span>
                    </div>
                    <div>
                        <h3 className="text-on-surface text-[17px] font-bold tracking-[-0.02em] leading-none">Descuentos</h3>
                        <p className="text-[11px] text-outline mt-1">Calcula cuánto ahorras y el precio final</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="well rounded-[20px] px-4 pt-3 pb-3.5 focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(66,133,244,0.15)] transition-[border-color,box-shadow] duration-200">
                        <label className="block text-[10px] font-bold text-outline uppercase tracking-[0.14em]">Precio original</label>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-outline font-bold text-lg">Bs/$</span>
                            <input
                                className="bg-transparent border-none focus:ring-0 outline-none text-on-surface text-[32px] font-bold tracking-[-0.03em] leading-tight p-0 w-full placeholder:text-outline-variant/50"
                                placeholder="0,00"
                                type="text"
                                value={price}
                                onChange={handlePriceChange}
                                inputMode="decimal"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-outline uppercase tracking-[0.14em] pl-1">Porcentaje de descuento</label>
                        <div className="flex gap-1.5">
                            {presets.map(pct => (
                                <button 
                                    key={pct} 
                                    type="button"
                                    onClick={() => setDiscount(pct.toString())} 
                                    className={`press flex-1 h-9 rounded-full text-xs font-bold transition-[background-color,color,box-shadow] duration-200 ${discount === pct.toString() ? 'thumb-primary' : 'well text-outline hover:text-on-surface'}`}
                                >
                                    -{pct}%
                                </button>
                            ))}
                        </div>
                        <div className="well rounded-[16px] flex items-center px-4 h-12 focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(66,133,244,0.15)] transition-[border-color,box-shadow] duration-200">
                            <span className="text-outline font-bold mr-2 text-sm">%</span>
                            <input
                                className="bg-transparent border-none focus:ring-0 outline-none text-on-surface font-bold text-base p-0 w-full placeholder:text-outline-variant/50"
                                placeholder="Otro porcentaje manual..."
                                type="text"
                                value={discount}
                                onChange={handleDiscountChange}
                                inputMode="numeric"
                            />
                        </div>
                    </div>
                </div>

                {numPrice > 0 && (
                    <div className="card-glass p-4 space-y-3 animate-slide-down">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-outline text-xs">Precio base:</span>
                            <span className="text-on-surface line-through decoration-tertiary/70 font-semibold">{formatCurrency(numPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-outline text-xs">Ahorro (-{numDiscount}%):</span>
                            <span className="text-green-400 font-bold">-{formatCurrency(savedAmount)}</span>
                        </div>
                        <div className="w-full h-px bg-white/10 my-1"></div>
                        <div className="flex justify-between items-center text-base font-bold">
                            <span className="text-primary text-sm uppercase tracking-wider">Precio a pagar:</span>
                            <span className="text-primary text-xl">{formatCurrency(finalPrice)}</span>
                        </div>
                        
                        {numDiscount > 0 && (
                            <div className="mt-3 p-3.5 rounded-[16px] bg-green-500/10 border border-green-500/20 text-center">
                                <span className="text-[10px] text-outline font-bold uppercase tracking-[0.14em] block mb-1">Monto final con descuento</span>
                                <span className="text-2xl font-bold tracking-tight text-green-400">{formatCurrency(finalPrice)}</span>
                            </div>
                        )}
                    </div>
                )}
            </article>
        </div>
    );
}

export default DiscountCalculator;
