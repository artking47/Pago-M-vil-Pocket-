import React, { useState, useMemo } from 'react';
import useRates from '../hooks/useRates';

const STORAGE_KEY = 'pm_pocket_salary_entries';

function SalaryPurchasingPower({ onNavigateToCalculator }) {
    const { todayRates, historicalData, getRatesForDate } = useRates();
    const currentRateBCV = todayRates.oficial || 1;
    const currentRateUSDT = todayRates.usdt || todayRates.paralelo || currentRateBCV;

    // Persisted salary history
    const [entries, setEntries] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [amountVES, setAmountVES] = useState('');
    const [incomeDate, setIncomeDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [label, setLabel] = useState('Quincena');

    // Save entries
    const handleAddEntry = (e) => {
        if (e) e.preventDefault();
        const numVES = parseFloat(amountVES.replace(/[\s\u00a0\u202f.]/g, '').replace(',', '.'));
        if (isNaN(numVES) || numVES <= 0) return;

        // Find rate on that date
        const historicRate = getRatesForDate ? getRatesForDate(incomeDate) : null;
        const rateOnDate = historicRate?.oficial || currentRateBCV;
        const usdtOnDate = historicRate?.paralelo || historicRate?.usdt || currentRateUSDT;

        const originalUSD = numVES / rateOnDate;

        const newEntry = {
            id: Date.now(),
            label: label.trim() || 'Ingreso en Bs',
            amountVES: numVES,
            date: incomeDate,
            rateOnDate,
            usdtOnDate,
            originalUSD
        };

        const updated = [newEntry, ...entries];
        setEntries(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setAmountVES('');
    };

    const handleDeleteEntry = (id) => {
        const updated = entries.filter(e => e.id !== id);
        setEntries(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    // Calculate current loss for all entries
    const calculations = useMemo(() => {
        let totalOriginalUSD = 0;
        let totalCurrentUSD = 0;
        let totalLossUSD = 0;

        const computedEntries = entries.map(entry => {
            const currentValueUSD = entry.amountVES / currentRateBCV;
            const lossUSD = entry.originalUSD - currentValueUSD;
            const percentLoss = entry.originalUSD > 0 ? (lossUSD / entry.originalUSD) * 100 : 0;

            totalOriginalUSD += entry.originalUSD;
            totalCurrentUSD += currentValueUSD;
            totalLossUSD += (lossUSD > 0 ? lossUSD : 0);

            return {
                ...entry,
                currentValueUSD,
                lossUSD,
                percentLoss
            };
        });

        return {
            computedEntries,
            totalOriginalUSD,
            totalCurrentUSD,
            totalLossUSD
        };
    }, [entries, currentRateBCV]);

    return (
        <div className="space-y-5 animate-fade-in-up pb-12">
            {/* Header */}
            <section className="pt-2">
                <span className="eyebrow mb-2"><span className="eyebrow-dot" />Defensa del Ingreso</span>
                <h2 className="text-on-surface text-[26px] font-bold tracking-[-0.03em] leading-[1.1]">Termómetro de Sueldo</h2>
                <p className="text-on-surface-variant text-xs mt-0.5">Calcula cuánto valor pierden tus bolívares por devaluación</p>
            </section>

            {/* INPUT FORM */}
            <div className="bezel">
                <form onSubmit={handleAddEntry} className="bezel-core card-sheen p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                        <span className="material-symbols-outlined text-primary text-base">savings</span>
                        <h4 className="text-on-surface font-bold text-xs uppercase tracking-wider">Registrar Cobro en Bolívares</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Monto en Bs.</label>
                            <div className="well rounded-xl px-3 h-11 flex items-center">
                                <input
                                    type="text"
                                    value={amountVES}
                                    onChange={(e) => setAmountVES(e.target.value)}
                                    placeholder="Ej. 4.500,00"
                                    className="w-full bg-transparent border-none text-xs font-bold text-on-surface outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Fecha de Cobro</label>
                            <div className="well rounded-xl px-3 h-11 flex items-center">
                                <input
                                    type="date"
                                    value={incomeDate}
                                    onChange={(e) => setIncomeDate(e.target.value)}
                                    className="w-full bg-transparent border-none text-xs font-semibold text-on-surface outline-none"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="Concepto (Quincena, Bono, Honorarios)"
                                className="well rounded-xl px-3 h-10 w-full text-xs font-semibold text-on-surface outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 h-10 rounded-xl thumb-primary text-white font-bold text-xs shadow-md shadow-primary/20 shrink-0"
                        >
                            Calcular Impacto
                        </button>
                    </div>
                </form>
            </div>

            {/* LOSS THERMOMETER CARDS */}
            {entries.length > 0 && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                    <div className="card-glass p-3.5 rounded-2xl flex flex-col justify-between">
                        <div>
                            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Pérdida por Esperar</span>
                            <p className="text-error font-bold text-2xl leading-tight mt-1">
                                -${calculations.totalLossUSD.toFixed(2)}
                            </p>
                        </div>
                        <p className="text-outline text-xs mt-1 font-medium">
                            En dólares de poder de compra
                        </p>
                    </div>

                    <div className="card-glass p-3.5 rounded-2xl flex flex-col justify-between">
                        <div>
                            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Valor Actual en $</span>
                            <p className="text-primary font-bold text-2xl leading-tight mt-1">
                                ${calculations.totalCurrentUSD.toFixed(2)}
                            </p>
                        </div>
                        <p className="text-outline text-xs mt-1 font-medium">
                            Valían ${calculations.totalOriginalUSD.toFixed(2)} al cobrar
                        </p>
                    </div>
                </div>
            )}

            {/* ENTRIES LIST */}
            <div className="space-y-3">
                <span className="text-xs font-bold text-outline uppercase tracking-wider block px-1">Historial de Ingresos Registrados</span>

                {calculations.computedEntries.length === 0 ? (
                    <div className="card-glass p-6 text-center text-outline rounded-2xl">
                        <span className="material-symbols-outlined text-3xl mb-1 text-primary">analytics</span>
                        <p className="text-xs text-on-surface font-bold">Sin ingresos registrados</p>
                        <p className="text-[11px] text-outline mt-1">
                            Anota tu quincena en Bs. para saber cuántos dólares pierdes si no resguardas tu dinero a tiempo.
                        </p>
                    </div>
                ) : (
                    calculations.computedEntries.map(entry => (
                        <div key={entry.id} className="card-glass p-3.5 rounded-2xl flex items-center justify-between">
                            <div className="min-w-0 pr-2">
                                <p className="font-bold text-xs text-on-surface truncate">{entry.label}</p>
                                <p className="text-[11px] text-outline mt-0.5">
                                    Bs. {entry.amountVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })} • {entry.date} (Tasa: Bs. {entry.rateOnDate.toFixed(2)})
                                </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                    <p className="font-bold text-on-surface text-xs">
                                        Hoy: ${entry.currentValueUSD.toFixed(2)}
                                    </p>
                                    <p className={`text-[10px] font-bold ${entry.lossUSD > 0 ? 'text-error' : 'text-green-400'}`}>
                                        {entry.lossUSD > 0 ? `-${entry.percentLoss.toFixed(1)}% (-$${entry.lossUSD.toFixed(2)})` : 'Sin pérdida'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="text-outline hover:text-error text-xs"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* STRATEGY RECOMMENDATION CARD */}
            <div className="card-glass border-primary/30 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">verified</span>
                    <h4 className="text-on-surface font-bold text-xs uppercase tracking-wider">Estrategia Antidevaluación Recomendada</h4>
                </div>
                <p className="text-outline text-xs leading-relaxed">
                    <strong>Regla 80/20:</strong> El mismo día que te acrediten bolívares, aparta de inmediato el 80% y conviértelo a divisas o USDT (Binance P2P). Conserva en bolívares únicamente lo necesario para tus compras y pasajes de los siguientes 3 a 4 días.
                </p>
            </div>
        </div>
    );
}

export default SalaryPurchasingPower;
