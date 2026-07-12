import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getConversionHistory, addConversionToHistory } from './ConversionHistory';
import { CurrencyFlag } from './FlagIcons';
import useRates from '../hooks/useRates';

const CURRENCIES = [
    { code: 'USD', name: 'Dólar BCV', symbol: '$', source: 'oficial' },
    { code: 'EUR', name: 'Euro', symbol: '€', source: 'eur' },
    { code: 'USDT', name: 'USDT', symbol: '₮', source: 'paralelo' },
    { code: 'COP', name: 'Peso COP', symbol: 'COL$', source: 'cop' },
    { code: 'PEN', name: 'Sol Peruano', symbol: 'S/', source: 'pen' },
];

function CurrencyCalculator() {
    const {
        todayRates, tomorrowRates, previousRates,
        hasTomorrowRate, loading, refresh
    } = useRates();

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [mode, setMode] = useState('api');
    const [manualRate, setManualRate] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState('USD');
    const [targetCurrency, setTargetCurrency] = useState('VES');
    const [amount, setAmount] = useState('');
    const [result, setResult] = useState('');
    const [copied, setCopied] = useState(false);
    const [rateCopied, setRateCopied] = useState(false);
    const [isSwapped, setIsSwapped] = useState(false);
    const [isSwappingAnim, setIsSwappingAnim] = useState(false);
    const [rateView, setRateView] = useState('hoy');
    const [usdtTradeMode, setUsdtTradeMode] = useState('compra');
    const [history, setHistory] = useState(() => getConversionHistory());

    // Payment tools states
    const [showTools, setShowTools] = useState(false);
    const [activeTool, setActiveTool] = useState('mixto'); // 'mixto' | 'split'
    const [cashGiven, setCashGiven] = useState('');
    const [splitWays, setSplitWays] = useState(2);
    const [showMostrador, setShowMostrador] = useState(false);

    // Rate change animation
    const [rateFlash, setRateFlash] = useState(null); // 'up' | 'down' | null
    const prevOficialRef = useRef(todayRates.oficial);
    const prevParaleloRef = useRef(todayRates.paralelo);

    // Detect rate changes and trigger flash animation
    useEffect(() => {
        const prevOficial = prevOficialRef.current;
        const prevParalelo = prevParaleloRef.current;
        
        if (prevOficial > 0 && todayRates.oficial !== prevOficial) {
            setRateFlash(todayRates.oficial > prevOficial ? 'up' : 'down');
            setTimeout(() => setRateFlash(null), 1500);
        }
        if (prevParalelo > 0 && todayRates.paralelo !== prevParalelo) {
            setRateFlash(todayRates.paralelo > prevParalelo ? 'up' : 'down');
            setTimeout(() => setRateFlash(null), 1500);
        }
        
        prevOficialRef.current = todayRates.oficial;
        prevParaleloRef.current = todayRates.paralelo;
    }, [todayRates.oficial, todayRates.paralelo]);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (selectedCurrency === 'USD') setTargetCurrency('VES');
    }, [selectedCurrency]);

    // Calculate rate
    const getRateForDisplay = useCallback(() => {
        const activeRates = rateView === 'hoy' ? todayRates : tomorrowRates;

        const getValueInVes = (code) => {
            if (code === 'VES') return 1.0;
            if (code === 'USD') return activeRates.oficial;
            if (code === 'EUR') return activeRates.eur;
            if (code === 'USDT') {
                return usdtTradeMode === 'compra' ? activeRates.usdtCompra : activeRates.usdtVenta;
            }
            if (code === 'COP') {
                if (mode === 'manual' && selectedCurrency === 'COP') {
                    const manual = parseFloat(manualRate.replace(/\./g, '').replace(',', '.'));
                    return isNaN(manual) ? 0 : manual;
                }
                return activeRates.cop > 0 ? activeRates.oficial / activeRates.cop : 0;
            }
            if (code === 'PEN') {
                if (mode === 'manual' && selectedCurrency === 'PEN') {
                    const manual = parseFloat(manualRate.replace(/\./g, '').replace(',', '.'));
                    return isNaN(manual) ? 0 : manual;
                }
                return activeRates.pen > 0 ? activeRates.oficial / activeRates.pen : 0;
            }
            return 0;
        };

        if (mode === 'manual') {
            const manual = parseFloat(manualRate.replace(/\./g, '').replace(',', '.'));
            const parsedManual = isNaN(manual) ? 0 : manual;
            if (targetCurrency === 'VES') return parsedManual;
            else {
                const valTarget = getValueInVes(targetCurrency);
                return valTarget > 0 ? parsedManual / valTarget : 0;
            }
        }

        const valSelected = getValueInVes(selectedCurrency);
        const valTarget = getValueInVes(targetCurrency);
        return valTarget > 0 ? valSelected / valTarget : 0;
    }, [selectedCurrency, targetCurrency, todayRates, tomorrowRates, rateView, mode, manualRate, usdtTradeMode]);

    // Calculate result
    useEffect(() => {
        const numAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
        if (isNaN(numAmount) || numAmount === 0) { setResult(''); return; }
        const rate = getRateForDisplay();
        if (rate === 0) { setResult(''); return; }

        let calculated;
        if (isSwapped) {
            calculated = numAmount / rate;
        } else {
            calculated = numAmount * rate;
        }
        setResult(calculated.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }, [amount, getRateForDisplay, isSwapped, selectedCurrency, targetCurrency]);

    const handleAmountChange = (e) => {
        const value = e.target.value.replace(/[^\d,]/g, '');
        const parts = value.split(',');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        setAmount(parts.join(','));
    };

    const handleCashChange = (e) => {
        const value = e.target.value.replace(/[^\d,]/g, '');
        const parts = value.split(',');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        setCashGiven(parts.join(','));
    };

    const handleManualRateChange = (e) => {
        const value = e.target.value.replace(/[^\d,]/g, '');
        setManualRate(value);
    };

    const handleSwap = () => {
        setIsSwappingAnim(true);
        setIsSwapped(prev => !prev);
        if (result) setAmount(result);
        else setAmount('');
        setTimeout(() => setIsSwappingAnim(false), 300);
    };

    const handleCopy = async () => {
        if (!result) return;
        const fromCode = isSwapped ? targetCurrency : selectedCurrency;
        const toCode = isSwapped ? selectedCurrency : targetCurrency;
        const toCurObj = CURRENCIES.find(c => c.code === toCode);
        const toSymbol = toCode === 'VES' ? 'Bs.' : (toCurObj?.symbol || '$');
        const text = `${toSymbol} ${result}`;
        try { await navigator.clipboard.writeText(text); } catch { }
        setCopied(true); setTimeout(() => setCopied(false), 2000);

        const rate = getRateForDisplay();
        if (rate > 0 && amount) {
            const newHistory = addConversionToHistory({
                fromAmount: amount,
                fromCode: fromCode,
                toAmount: result,
                toCode: toCode,
                rate: rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 6 }),
            });
            setHistory(newHistory);
        }
    };

    const handleCopyRate = async () => {
        const rate = getRateForDisplay();
        if (rate === 0) return;
        const formattedRate = rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
        try {
            await navigator.clipboard.writeText(formattedRate);
            setRateCopied(true);
            setTimeout(() => setRateCopied(false), 2000);
        } catch {}
    };

    const displayRate = getRateForDisplay();
    const getTodayDate = () => new Date().toLocaleDateString('es-VE', { weekday: 'short', day: '2-digit', month: 'short' });
    const getTomorrowDate = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        let daysToAdd = 1;
        if (dayOfWeek === 5) daysToAdd = 3;
        else if (dayOfWeek === 6) daysToAdd = 2;
        const next = new Date(today);
        next.setDate(today.getDate() + daysToAdd);
        return next.toLocaleDateString('es-VE', { weekday: 'short', day: '2-digit', month: 'short' });
    };

    const currentCur = CURRENCIES.find(c => c.code === selectedCurrency);
    const targetCur = CURRENCIES.find(c => c.code === targetCurrency);

    const fromLabel = isSwapped ? targetCurrency : selectedCurrency;
    const toLabel = isSwapped ? selectedCurrency : targetCurrency;
    const fromSymbol = isSwapped ? (targetCurrency === 'VES' ? 'Bs.' : (targetCur?.symbol || '$')) : (currentCur?.symbol || '$');
    const toSymbol = isSwapped ? (currentCur?.symbol || '$') : (targetCurrency === 'VES' ? 'Bs.' : (targetCur?.symbol || '$'));
    const displayTargetSymbol = targetCurrency === 'VES' ? 'Bs.' : (targetCur?.symbol || '$');

    // Rate change delta
    const oficialDelta = previousRates.oficial > 0 && todayRates.oficial !== previousRates.oficial
        ? todayRates.oficial - previousRates.oficial : 0;
    const paraleloDelta = previousRates.paralelo > 0 && todayRates.paralelo !== previousRates.paralelo
        ? todayRates.paralelo - previousRates.paralelo : 0;

    // Flash CSS class
    const flashClass = rateFlash === 'up' ? 'rate-flash-up' : rateFlash === 'down' ? 'rate-flash-down' : '';

    return (
        <article className="glass-surface rounded-2xl p-md flex flex-col gap-md">
            {/* Card Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>calculate</span>
                    </div>
                    <div>
                        <h3 className="text-on-surface font-h3 text-h3 leading-none">Calculadora</h3>
                        <p className="text-[12px] text-outline">Conversor de divisas • Tiempo real</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-full">
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-primary animate-pulse' : 'bg-tertiary-container'}`}></div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-primary' : 'text-tertiary-container'}`}>{isOnline ? 'Live' : 'Offline'}</span>
                    </div>
                    <button onClick={refresh} className="text-outline hover:text-on-surface transition-colors active:scale-90" disabled={loading}>
                        <span className={`material-symbols-outlined text-md ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="grid grid-cols-2 bg-white/5 p-1 rounded-xl">
                <button onClick={() => setMode('api')} className={`py-2 text-[13px] font-semibold rounded-lg transition-all ${mode === 'api' ? 'bg-gradient-to-r from-primary to-primary/80 text-on-primary-fixed shadow-lg' : 'text-outline hover:text-on-surface'}`}>Tasa en vivo</button>
                <button onClick={() => setMode('manual')} className={`py-2 text-[13px] font-semibold rounded-lg transition-all ${mode === 'manual' ? 'bg-gradient-to-r from-primary to-primary/80 text-on-primary-fixed shadow-lg' : 'text-outline hover:text-on-surface'}`}>Tasa manual</button>
            </div>

            {/* Currency Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {CURRENCIES.map(cur => (
                    <button key={cur.code} onClick={() => setSelectedCurrency(cur.code)}
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 ${selectedCurrency === cur.code ? 'border border-primary bg-primary/10 shadow-[0_0_12px_rgba(66,133,244,0.2)]' : 'glass-surface hover:bg-white/[0.06]'}`}>
                        <CurrencyFlag code={cur.code} size={22} />
                        <span className={`text-[12px] font-bold ${selectedCurrency === cur.code ? 'text-on-surface' : 'text-outline'}`}>{cur.name}</span>
                    </button>
                ))}
            </div>

            {/* Target Currency Selector */}
            {selectedCurrency !== 'USD' && (
                <div className="space-y-1.5 animate-slide-down transition-all duration-300">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-widest pl-1">Convertir a</label>
                    <div className="grid grid-cols-2 bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setTargetCurrency('VES')}
                            className={`py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${targetCurrency === 'VES' ? 'bg-gradient-to-r from-primary to-primary/80 text-on-primary-fixed shadow-lg' : 'text-outline hover:text-on-surface'}`}
                        >
                            <CurrencyFlag code="VES" size={18} /> Bolívares
                        </button>
                        <button
                            onClick={() => setTargetCurrency('USD')}
                            className={`py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${targetCurrency === 'USD' ? 'bg-gradient-to-r from-primary to-primary/80 text-on-primary-fixed shadow-lg' : 'text-outline hover:text-on-surface'}`}
                        >
                            <CurrencyFlag code="USD" size={18} /> Dólares
                        </button>
                    </div>
                </div>
            )}

            {/* USDT Compra/Venta Selector */}
            {selectedCurrency === 'USDT' && (
                <div className="space-y-1.5 animate-slide-down transition-all duration-300 mt-2">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-widest pl-1">Operación (Binance P2P)</label>
                    <div className="grid grid-cols-2 bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setUsdtTradeMode('compra')}
                            className={`py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${usdtTradeMode === 'compra' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' : 'text-outline hover:text-on-surface'}`}
                        >
                            Comprar USDT
                        </button>
                        <button
                            onClick={() => setUsdtTradeMode('venta')}
                            className={`py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${usdtTradeMode === 'venta' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' : 'text-outline hover:text-on-surface'}`}
                        >
                            Vender USDT
                        </button>
                    </div>
                </div>
            )}

            {/* Manual Rate Input */}
            {mode === 'manual' && (
                <div className="space-y-1.5 animate-slide-down">
                    <label htmlFor="manualRateInput" className="text-[11px] font-bold text-outline uppercase tracking-widest pl-1">
                        Tasa manual ({displayTargetSymbol} por 1 {selectedCurrency})
                    </label>
                    <div className="glass-surface-active rounded-xl flex items-center px-4 h-12">
                        <span className="text-secondary font-bold mr-3">{displayTargetSymbol}</span>
                        <input
                            id="manualRateInput"
                            name="manualRateInput"
                            className="bg-transparent border-none focus:ring-0 outline-none text-on-surface font-bold text-lg p-0 w-full placeholder:text-outline-variant/40"
                            placeholder="0,00" type="text" value={manualRate} onChange={handleManualRateChange} inputMode="decimal"
                        />
                    </div>
                </div>
            )}

            {/* Rate Display with Hoy/Mañana toggle */}
            {mode === 'api' && (
                <div className={`flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-4 transition-all duration-500 ${flashClass}`}>
                    <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex gap-1">
                            <button
                                onClick={() => setRateView('hoy')}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase transition-all active:scale-95 ${rateView === 'hoy' ? 'bg-secondary text-on-secondary' : 'bg-white/5 text-outline hover:text-on-surface'}`}>
                                Hoy ({getTodayDate()})
                            </button>
                            <button
                                onClick={() => setRateView('manana')}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase transition-all active:scale-95 ${rateView === 'manana' ? 'bg-primary text-on-primary-fixed' : 'bg-white/5 text-outline hover:text-on-surface'}`}>
                                Mañana ({getTomorrowDate()})
                            </button>
                        </div>
                        <p className={`text-primary font-numeral-display text-h2 pt-1 truncate transition-all duration-300 ${flashClass}`}>
                            1 {selectedCurrency} = {displayRate > 0 ? displayRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : '—'} {displayTargetSymbol}
                        </p>
                        {rateView === 'manana' && !hasTomorrowRate && (
                            <p className="text-[10px] text-secondary">Aún no se ha publicado la tasa de mañana</p>
                        )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                            onClick={handleCopyRate}
                            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-outline hover:text-on-surface transition-all active:scale-90 hover:bg-white/10"
                            title="Copiar tasa de cambio"
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {rateCopied ? "check" : "content_copy"}
                            </span>
                        </button>
                        <div className="text-right">
                            <span className={`material-symbols-outlined text-3xl transition-colors duration-500 ${rateFlash === 'up' ? 'text-green-400' : rateFlash === 'down' ? 'text-red-400' : 'text-outline-variant'}`}>
                                {rateFlash === 'down' ? 'trending_down' : 'trending_up'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Rate Comparison */}
            {mode === 'api' && (
                <div className="grid grid-cols-2 gap-3">
                    <div className={`glass-surface p-3 rounded-xl border-l-2 transition-all duration-300 ${rateView === 'hoy' ? 'border-l-secondary' : 'border-l-white/10'}`}>
                        <p className="text-[10px] text-outline font-bold uppercase tracking-tighter">BCV Hoy</p>
                        <p className={`text-on-surface font-bold text-sm transition-all duration-500 ${flashClass}`}>
                            Bs. {todayRates.oficial > 0 ? todayRates.oficial.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </p>
                        {oficialDelta !== 0 && (
                            <p className={`text-[9px] font-bold mt-0.5 ${oficialDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {oficialDelta > 0 ? '▲' : '▼'} {Math.abs(oficialDelta).toFixed(4)}
                            </p>
                        )}
                    </div>
                    <div className={`glass-surface p-3 rounded-xl border-l-2 transition-all duration-300 ${rateView === 'manana' ? 'border-l-primary' : 'border-l-white/10'}`}>
                        <p className="text-[10px] text-outline font-bold uppercase tracking-tighter">BCV Mañana</p>
                        <p className="text-on-surface font-bold text-sm">
                            Bs. {tomorrowRates.oficial > 0 ? tomorrowRates.oficial.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </p>
                        {hasTomorrowRate && (
                            <p className="text-[9px] font-bold mt-0.5 text-primary">
                                ✓ Publicada
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* USDT/Paralelo mini card */}
            {mode === 'api' && (
                <div className="glass-surface p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CurrencyFlag code="USDT" size={20} />
                        <span className="text-[11px] font-bold text-outline uppercase tracking-wider">USDT Binance</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right border-r border-white/10 pr-3">
                            <p className="text-[9px] text-outline font-bold uppercase">Compra</p>
                            <span className={`font-bold text-xs transition-all duration-500 ${usdtTradeMode === 'compra' && selectedCurrency === 'USDT' ? 'text-green-400' : 'text-on-surface'}`}>
                                Bs. {todayRates.usdtCompra > 0 ? todayRates.usdtCompra.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                            </span>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-outline font-bold uppercase">Venta</p>
                            <span className={`font-bold text-xs transition-all duration-500 ${usdtTradeMode === 'venta' && selectedCurrency === 'USDT' ? 'text-red-400' : 'text-on-surface'}`}>
                                Bs. {todayRates.usdtVenta > 0 ? todayRates.usdtVenta.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Converter Engine */}
            <div className="space-y-4 relative py-2">
                {/* FROM input */}
                <div className="space-y-1.5">
                    <label htmlFor="amountInput" className="text-[11px] font-bold text-outline uppercase tracking-widest pl-1">Monto en {fromLabel}</label>
                    <div className="glass-surface-active rounded-xl flex items-center px-4 h-14 border-white/10">
                        <span className="text-primary font-bold mr-3">{fromSymbol}</span>
                        <input
                            id="amountInput"
                            name="amountInput"
                            className={`bg-transparent border-none focus:ring-0 outline-none text-on-surface font-h2 text-h2 p-0 w-full placeholder:text-outline-variant/40 transition-all duration-300 ${isSwappingAnim ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}
                            placeholder="0,00"
                            type="text"
                            value={amount}
                            onChange={handleAmountChange}
                            inputMode="decimal"
                        />
                    </div>
                </div>

                {/* Swap Button */}
                <div className="absolute left-1/2 -translate-x-1/2 top-[50%] -translate-y-[50%] z-10">
                    <button
                        onClick={handleSwap}
                        className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all duration-300 ${isSwapped ? 'rotate-180' : ''}`}
                        title={isSwapped ? `${toLabel} → ${fromLabel}` : `${fromLabel} → ${toLabel}`}
                    >
                        <span className="material-symbols-outlined font-bold">swap_vert</span>
                    </button>
                </div>

                {/* TO result */}
                <div className="space-y-1.5 pt-2">
                    <div className="text-[11px] font-bold text-outline uppercase tracking-widest pl-1 flex items-center justify-between">
                        <span>Resultado en {toLabel}</span>
                        <button onClick={() => setShowTools(!showTools)} className={`text-primary transition-all active:scale-90 flex items-center gap-1 ${showTools ? 'opacity-100' : 'opacity-60'}`}>
                            <span className="text-[10px] uppercase tracking-wider">{showTools ? 'Ocultar extras' : 'Más herramientas'}</span>
                            <span className={`material-symbols-outlined text-[14px] transition-transform ${showTools ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                    </div>
                    <div className="glass-surface rounded-xl flex items-center justify-between px-4 h-20 border-primary/20">
                        <p className={`text-primary font-numeral-display text-h1 transition-all duration-300 ${isSwappingAnim ? 'opacity-30 scale-95' : 'opacity-100 scale-100'} min-w-0 truncate`}>
                            {result ? `${toSymbol} ${result}` : `${toSymbol} 0,00`}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {result && (
                                <button onClick={() => setShowMostrador(true)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-secondary hover:text-on-surface transition-colors active:scale-90" title="Mostrar en pantalla completa">
                                    <span className="material-symbols-outlined text-sm">fullscreen</span>
                                </button>
                            )}
                            <button onClick={handleCopy} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-outline hover:text-on-surface transition-colors active:scale-90" title="Copiar monto">
                                <span className="material-symbols-outlined text-sm">{copied ? "check" : "content_copy"}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Extra Tools Section */}
                <div className={`transition-all duration-400 ease-in-out overflow-hidden ${showTools ? 'max-h-[300px] opacity-100 pt-2' : 'max-h-0 opacity-0'}`}>
                    <div className="glass-surface border border-white/5 rounded-xl p-3">
                        <div className="flex gap-2 mb-3 bg-white/5 p-1 rounded-lg">
                            <button onClick={() => setActiveTool('mixto')} className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTool === 'mixto' ? 'bg-primary text-on-primary-fixed' : 'text-outline hover:text-on-surface'}`}>Mixto / Vuelto</button>
                            <button onClick={() => setActiveTool('split')} className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTool === 'split' ? 'bg-primary text-on-primary-fixed' : 'text-outline hover:text-on-surface'}`}>Dividir Cuenta</button>
                        </div>

                        {activeTool === 'mixto' && (
                            <div className="space-y-3 animate-fade-in-up">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-outline">Pago en efectivo ({fromSymbol})</label>
                                    <div className="bg-white/[0.06] rounded-md px-2 py-1 flex items-center max-w-[120px]">
                                        <input type="text" value={cashGiven} onChange={handleCashChange} inputMode="decimal" placeholder="0,00" className="bg-transparent border-none outline-none w-full text-right text-sm font-bold text-on-surface" />
                                    </div>
                                </div>
                                {(() => {
                                    const numTotal = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
                                    const numCash = parseFloat(cashGiven.replace(/\./g, '').replace(',', '.')) || 0;
                                    const rate = getRateForDisplay();
                                    if (numTotal === 0 || rate === 0) return null;
                                    
                                    const diff = numTotal - numCash;
                                    const finalAmount = isSwapped ? (Math.abs(diff) / rate) : (Math.abs(diff) * rate);
                                    const formatted = finalAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    
                                    if (diff > 0) {
                                        return (
                                            <div className="bg-primary/10 border-l-2 border-l-primary p-2 rounded-lg flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Falta pagar</span>
                                                <span className="font-bold text-primary">{toSymbol} {formatted}</span>
                                            </div>
                                        );
                                    } else if (diff < 0) {
                                        return (
                                            <div className="bg-secondary/10 border-l-2 border-l-secondary p-2 rounded-lg flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Dar vuelto de</span>
                                                <span className="font-bold text-secondary">{toSymbol} {formatted}</span>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div className="bg-green-500/10 border-l-2 border-l-green-500 p-2 rounded-lg flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-green-400 uppercase tracking-wider">Pago exacto</span>
                                                <span className="font-bold text-green-400">{toSymbol} 0,00</span>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        )}

                        {activeTool === 'split' && (
                            <div className="space-y-3 animate-fade-in-up">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-outline">Número de personas</label>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setSplitWays(Math.max(2, splitWays - 1))} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90"><span className="material-symbols-outlined text-sm">remove</span></button>
                                        <span className="font-bold text-lg w-6 text-center">{splitWays}</span>
                                        <button onClick={() => setSplitWays(splitWays + 1)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90"><span className="material-symbols-outlined text-sm">add</span></button>
                                    </div>
                                </div>
                                {(() => {
                                    const numResult = parseFloat(result.replace(/\./g, '').replace(',', '.'));
                                    if (isNaN(numResult) || numResult === 0) return null;
                                    const splitAmount = numResult / splitWays;
                                    const formatted = splitAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    return (
                                        <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-center mt-2">
                                            <span className="text-[10px] text-outline uppercase font-bold tracking-widest block mb-1">A cada uno le toca</span>
                                            <span className="font-numeral-display text-2xl text-on-surface">{toSymbol} {formatted}</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mini History */}
            {history && history.length > 0 && (
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-outline text-sm">history</span>
                            <h4 className="text-[12px] font-bold text-on-surface">Últimas conversiones</h4>
                        </div>
                        <span className="bg-white/10 text-outline text-[10px] px-1.5 py-0.5 rounded font-bold">{history.length}</span>
                    </div>
                    <div className="space-y-2">
                        {history.slice(0, 3).map((item, index) => {
                            const time = new Date(item.timestamp).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
                            const itemFromCur = CURRENCIES.find(c => c.code === item.fromCode);
                            const itemToCur = CURRENCIES.find(c => c.code === item.toCode);
                            const itemFromSymbol = item.fromCode === 'VES' ? 'Bs.' : (itemFromCur?.symbol || '$');
                            const itemToSymbol = item.toCode === 'VES' ? 'Bs.' : (itemToCur?.symbol || '$');
                            return (
                                <div key={item.id} className={`glass-surface p-3 rounded-xl flex items-center justify-between text-xs transition-all hover:bg-white/5 cursor-pointer ${index === 1 ? 'opacity-70' : index === 2 ? 'opacity-50' : ''}`}>
                                    <span className="text-outline font-medium">{time}</span>
                                    <span className="text-on-surface font-semibold flex items-center gap-1">
                                        <CurrencyFlag code={item.fromCode} size={14} />
                                        {itemFromSymbol} {item.fromAmount}
                                        <span className="text-primary mx-1">→</span>
                                        <CurrencyFlag code={item.toCode} size={14} />
                                        {itemToSymbol} {item.toAmount}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Mostrador Fullscreen Modal */}
            {showMostrador && (
                <div className="fixed inset-0 z-[100] bg-surface/95 backdrop-blur-2xl flex flex-col justify-center items-center animate-fade-in px-6">
                    <button onClick={() => setShowMostrador(false)} className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-outline hover:text-on-surface transition-all active:scale-90">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                    <div className="text-center w-full max-w-sm">
                        <p className="text-outline uppercase tracking-widest font-bold text-sm mb-4">Total a Pagar</p>
                        <div className="text-[18vw] sm:text-7xl font-numeral-display text-primary leading-none mb-6 font-extrabold truncate w-full" style={{ filter: 'drop-shadow(0 0 40px rgba(66, 133, 244, 0.4))' }}>
                            {result}
                        </div>
                        <p className="text-on-surface font-semibold text-xl mb-8 flex items-center justify-center gap-2">
                            <span>{targetCurrency === 'VES' ? 'Bolívares' : targetCur?.name || targetCurrency}</span>
                            <CurrencyFlag code={targetCurrency} size={24} />
                        </p>
                        
                        <div className="glass-surface p-4 rounded-2xl mx-auto w-full max-w-[280px]">
                            <p className="text-xs text-outline mb-1">Referencia ({selectedCurrency})</p>
                            <p className="text-on-surface font-bold text-lg">{fromSymbol} {amount || '0,00'}</p>
                            <div className="w-full h-px bg-white/10 my-3"></div>
                            <p className="text-[10px] text-outline font-bold uppercase tracking-wider mb-0.5">Tasa aplicada</p>
                            <p className="text-sm font-semibold text-secondary">Bs. {displayRate > 0 ? displayRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : '—'}</p>
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
}

export default CurrencyCalculator;
