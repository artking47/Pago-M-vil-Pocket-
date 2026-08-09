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
        <article className="glass-surface rounded-2xl p-md flex flex-col gap-md animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-400">payments</span>
                </div>
                <div>
                    <h3 className="text-on-surface font-h3 text-h3 leading-none">PayPal</h3>
                    <p className="text-[12px] text-outline">Calculadora de Comisiones</p>
                </div>
            </div>

            <div className="grid grid-cols-2 bg-white/5 p-1 rounded-xl">
                <button 
                    onClick={() => setMode('enviar')} 
                    className={`py-2 text-[13px] font-semibold rounded-lg transition-all ${mode === 'enviar' ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg' : 'text-outline hover:text-on-surface'}`}
                >
                    Si envío...
                </button>
                <button 
                    onClick={() => setMode('recibir')} 
                    className={`py-2 text-[13px] font-semibold rounded-lg transition-all ${mode === 'recibir' ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg' : 'text-outline hover:text-on-surface'}`}
                >
                    Para recibir...
                </button>
            </div>

            <div className="space-y-1.5 mt-2">
                <label className="text-[11px] font-bold text-outline uppercase tracking-widest pl-1">
                    {mode === 'enviar' ? 'Monto a Enviar' : 'Monto Neto a Recibir'}
                </label>
                <div className="glass-surface-active rounded-xl flex items-center px-4 h-14 border-blue-500/30">
                    <span className="text-blue-400 font-bold mr-3">$</span>
                    <input
                        className="bg-transparent border-none focus:ring-0 outline-none text-on-surface font-h2 text-h2 p-0 w-full placeholder:text-outline-variant/40"
                        placeholder="0,00"
                        type="text"
                        value={amount}
                        onChange={handleAmountChange}
                        inputMode="decimal"
                    />
                </div>
            </div>

            {numAmount > 0 && (
                <div className="glass-surface border border-blue-500/20 rounded-xl p-4 mt-2 space-y-3 animate-slide-down">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-outline">Monto de envío (Bruto):</span>
                        <span className="text-on-surface font-bold">${formatCurrency(envioBruto)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-outline">Comisión PayPal (5.4% + $0.30):</span>
                        <span className="text-error font-medium">-${formatCurrency(comision)}</span>
                    </div>
                    <div className="w-full h-px bg-white/10 my-1"></div>
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-blue-400">Total recibido (Neto):</span>
                        <span className="text-blue-400">${formatCurrency(reciboNeto)}</span>
                    </div>
                    
                    {mode === 'recibir' && (
                        <div className="mt-4 bg-blue-500/10 p-3 rounded-lg text-center">
                            <span className="text-[11px] text-blue-300 font-bold block mb-1">Debes pedirle a la otra persona:</span>
                            <span className="font-numeral-display text-2xl text-on-surface">${formatCurrency(envioBruto)}</span>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

export default PaypalCalculator;
