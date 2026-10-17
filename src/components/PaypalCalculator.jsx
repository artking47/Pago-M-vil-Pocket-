import React, { useState } from 'react';

function PaypalCalculator() {
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState('enviar'); // 'enviar' o 'recibir'

    // PayPal standard fees for international transactions
    const FEE_PERCENT = 0.054; // 5.4%
    const FEE_FIXED = 0.30; // $0.30

    const handleAmountChange = (e) => {
        const val = e.target.value.replace(/[^0-9.,]/g, '');
        const parts = val.split(/[.,]/);
        if (parts.length > 2) return;
        if (parts[1] && parts[1].length > 2) return;
        setAmount(val.replace('.', ','));
    };

    const numAmount = parseFloat(amount.replace(',', '.')) || 0;
    
    let envioBruto = 0;
    let reciboNeto = 0;
    let comision = 0;

    if (numAmount > 0) {
        if (mode === 'enviar') {
            // Si envías 100, PayPal cobra comisión y el otro recibe menos.
            envioBruto = numAmount;
            comision = (envioBruto * FEE_PERCENT) + FEE_FIXED;
            reciboNeto = envioBruto - comision;
            if (reciboNeto < 0) reciboNeto = 0;
        } else {
            // Si quieres recibir 100 netos, necesitas que te envíen más.
            reciboNeto = numAmount;
            envioBruto = (reciboNeto + FEE_FIXED) / (1 - FEE_PERCENT);
            comision = envioBruto - reciboNeto;
        }
    }

    const formatCurrency = (val) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="bezel animate-fade-in-up">
            <article className="bezel-core card-sheen p-4 sm:p-5 flex flex-col gap-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[13px] thumb-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">payments</span>
                    </div>
                    <div>
                        <h3 className="text-on-surface text-[17px] font-bold tracking-[-0.02em] leading-none">PayPal</h3>
                        <p className="text-[11px] text-outline mt-1">Calculadora de comisiones internacionales</p>
                    </div>
                </div>

                <div className="well grid grid-cols-2 gap-1 p-1 rounded-[16px]" role="tablist" aria-label="Modo de cálculo">
                    <button 
                        type="button"
                        role="tab"
                        aria-selected={mode === 'enviar'}
                        onClick={() => setMode('enviar')} 
                        className={`press h-10 text-[12px] font-bold rounded-[12px] transition-[background-color,color,box-shadow] duration-200 ${mode === 'enviar' ? 'thumb-primary' : 'text-outline hover:text-on-surface'}`}
                    >
                        Si envío...
                    </button>
                    <button 
                        type="button"
                        role="tab"
                        aria-selected={mode === 'recibir'}
                        onClick={() => setMode('recibir')} 
                        className={`press h-10 text-[12px] font-bold rounded-[12px] transition-[background-color,color,box-shadow] duration-200 ${mode === 'recibir' ? 'thumb-primary' : 'text-outline hover:text-on-surface'}`}
                    >
                        Para recibir...
                    </button>
                </div>

                <div className="space-y-1.5">
                    <div className="well rounded-[20px] px-4 pt-3 pb-3.5 focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(66,133,244,0.15)] transition-[border-color,box-shadow] duration-200">
                        <label className="block text-[10px] font-bold text-outline uppercase tracking-[0.14em]">
                            {mode === 'enviar' ? 'Monto a enviar' : 'Monto neto a recibir'}
                        </label>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-primary font-bold text-xl">$</span>
                            <input
                                className="bg-transparent border-none focus:ring-0 outline-none text-on-surface text-[32px] font-bold tracking-[-0.03em] leading-tight p-0 w-full placeholder:text-outline-variant/50"
                                placeholder="0,00"
                                type="text"
                                value={amount}
                                onChange={handleAmountChange}
                                inputMode="decimal"
                            />
                        </div>
                    </div>
                </div>

                {numAmount > 0 && (
                    <div className="card-glass p-4 space-y-3 animate-slide-down">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-outline text-xs">Monto de envío (Bruto):</span>
                            <span className="text-on-surface font-bold text-base">${formatCurrency(envioBruto)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-outline text-xs">Comisión PayPal (5.4% + $0.30):</span>
                            <span className="text-tertiary font-bold text-sm">-${formatCurrency(comision)}</span>
                        </div>
                        <div className="w-full h-px bg-white/10 my-1"></div>
                        <div className="flex justify-between items-center text-base font-bold">
                            <span className="text-primary text-sm uppercase tracking-wider">Total recibido (Neto):</span>
                            <span className="text-primary text-xl">${formatCurrency(reciboNeto)}</span>
                        </div>
                        
                        {mode === 'recibir' && (
                            <div className="mt-3 p-3.5 rounded-[16px] bg-primary/10 border border-primary/20 text-center">
                                <span className="text-[10px] text-outline font-bold uppercase tracking-[0.14em] block mb-1">Debes solicitar a la otra persona</span>
                                <span className="text-2xl font-bold tracking-tight text-primary">${formatCurrency(envioBruto)}</span>
                            </div>
                        )}
                    </div>
                )}
            </article>
        </div>
    );
}

export default PaypalCalculator;
