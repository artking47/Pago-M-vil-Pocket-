import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getConversionHistory, addConversionToHistory } from './ConversionHistory';
import { CurrencyFlag } from './FlagIcons';
import useRates from '../hooks/useRates';

const CURRENCIES = [
    { code: 'USD', name: 'Dólar BCV', symbol: '$', source: 'oficial' },
    { code: 'USDT', name: 'Binance USDT', symbol: '₮', source: 'usdt' },
    { code: 'EUR', name: 'Euro BCV', symbol: '€', source: 'eur' },
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
    const [resultCopied, setResultCopied] = useState(false);
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
    const [tipPercent, setTipPercent] = useState(10);
    const [showMostrador, setShowMostrador] = useState(false);

    // Rate change animation
    const [rateFlash, setRateFlash] = useState(null); // 'up' | 'down' | null
    const prevOficialRef = useRef(todayRates.oficial);
    const prevUsdtRef = useRef(todayRates.usdt || todayRates.paralelo);

    // Detect rate changes and trigger flash animation
    useEffect(() => {
        const prevOficial = prevOficialRef.current;
        const prevUsdt = prevUsdtRef.current;
        const currentUsdt = todayRates.usdt || todayRates.paralelo;
        
        if (prevOficial > 0 && todayRates.oficial !== prevOficial) {
            setRateFlash(todayRates.oficial > prevOficial ? 'up' : 'down');
            setTimeout(() => setRateFlash(null), 1500);
        }
        if (prevUsdt > 0 && currentUsdt !== prevUsdt) {
            setRateFlash(currentUsdt > prevUsdt ? 'up' : 'down');
            setTimeout(() => setRateFlash(null), 1500);
        }
        
        prevOficialRef.current = todayRates.oficial;
        prevUsdtRef.current = currentUsdt;
    }, [todayRates.oficial, todayRates.usdt, todayRates.paralelo]);

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
        const activeRates = (rateView === 'manana' && hasTomorrowRate) ? tomorrowRates : todayRates;

        const getValueInVes = (code) => {
            if (code === 'VES') return 1.0;
            if (code === 'USD') return activeRates.oficial;
            if (code === 'EUR') return activeRates.eur;
            if (code === 'USDT') {
                const usdtVal = usdtTradeMode === 'compra' 
                    ? (activeRates.usdtCompra || activeRates.usdt || activeRates.paralelo) 
                    : (activeRates.usdtVenta || activeRates.usdt || activeRates.paralelo);
                return usdtVal || activeRates.oficial;
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
    }, [selectedCurrency, targetCurrency, todayRates, tomorrowRates, hasTomorrowRate, rateView, mode, manualRate, usdtTradeMode]);

    const handleQuickAmount = (val) => {
        setAmount(val);
    };

    const handleCopyResult = async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result);
            if (navigator.vibrate) navigator.vibrate(20);
            setResultCopied(true);
            setTimeout(() => setResultCopied(false), 2000);
        } catch {}
    };

    // Calculate result
    useEffect(() => {
        const numAmount = parseFloat(amount.replace(/[\s\u00a0\u202f.]/g, '').replace(',', '.'));
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
        if (parts.length > 2) return;
        if (parts[1] && parts[1].length > 4) return;
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        setAmount(parts.join(','));
    };

    const handleCashChange = (e) => {
        const value = e.target.value.replace(/[^\d,]/g, '');
        const parts = value.split(',');
        if (parts.length > 2) return;
        if (parts[1] && parts[1].length > 4) return;
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        setCashGiven(parts.join(','));
    };

    const handleManualRateChange = (e) => {
        const value = e.target.value.replace(/[^\d,]/g, '');
        const parts = value.split(',');
        if (parts.length > 2) return;
        if (parts[1] && parts[1].length > 6) return;
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        setManualRate(parts.join(','));
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
    const usdtDelta = previousRates.usdt > 0 && todayRates.usdt !== previousRates.usdt
        ? todayRates.usdt - previousRates.usdt : 0;

    // Flash CSS class
    const flashClass = rateFlash === 'up' ? 'rate-flash-up' : rateFlash === 'down' ? 'rate-flash-down' : '';

    return (
        <div className="bezel">
        <article className="bezel-core card-sheen p-4 sm:p-5 flex flex-col gap-md">
            {/* Card Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[13px] thumb-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>calculate</span>
                    </div>
                    <div>
                        <h3 className="text-on-surface text-[17px] font-bold tracking-[-0.02em] leading-none">Calculadora</h3>
                        <p className="text-[11px] text-outline mt-1">Conversor de divisas en tiempo real</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-2.5 h-7 rounded-full border ${isOnline ? 'bg-primary/10 border-primary/20' : 'bg-tertiary-container/10 border-tertiary-container/20'}`}>
                        <span className="relative flex w-1.5 h-1.5">
                            {isOnline && <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />}
                            <span className={`relative inline-flex w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-primary' : 'bg-tertiary-container'}`} />
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${isOnline ? 'text-primary' : 'text-tertiary-container'}`}>{isOnline ? 'Live' : 'Offline'}</span>
                    </div>
                    <button
                        onClick={refresh}
                        className="press w-9 h-9 rounded-full well flex items-center justify-center text-outline hover:text-on-surface transition-colors"
                        disabled={loading}
                        aria-label="Actualizar tasas"
                        title="Actualizar tasas"
                    >
                        <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
            </div>

            {/* Segmented Rate Pill Selector (1-Tap Switch) */}
            <div className="well grid grid-cols-3 gap-1 p-1 rounded-[18px]" role="tablist" aria-label="Fuente de tasa">
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'api' && selectedCurrency === 'USD'}
                    onClick={() => {
                        setMode('api');
                        setSelectedCurrency('USD');
                    }}
                    className={`press flex flex-col items-center justify-center h-[52px] px-1 rounded-[14px] transition-[background-color,color,box-shadow] duration-200 ${
                        mode === 'api' && selectedCurrency === 'USD'
                            ? 'thumb-primary'
                            : 'text-outline hover:text-on-surface'
                    }`}
                >
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-80">BCV Oficial</span>
                    <span className="text-[14px] font-bold tracking-tight mt-0.5">
                        {todayRates.oficial > 0 ? todayRates.oficial.toFixed(2) : '-'}
                    </span>
                </button>

                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'api' && selectedCurrency === 'USDT'}
                    onClick={() => {
                        setMode('api');
                        setSelectedCurrency('USDT');
                    }}
                    className={`press flex flex-col items-center justify-center h-[52px] px-1 rounded-[14px] transition-[background-color,color,box-shadow] duration-200 ${
                        mode === 'api' && selectedCurrency === 'USDT'
                            ? 'thumb-primary'
                            : 'text-outline hover:text-on-surface'
                    }`}
                >
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-80">Binance USDT</span>
                    <span className="text-[14px] font-bold tracking-tight mt-0.5">
                        {(todayRates.usdt || todayRates.paralelo || 0) > 0 ? (todayRates.usdt || todayRates.paralelo).toFixed(2) : '-'}
                    </span>
                </button>

                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'manual'}
                    onClick={() => setMode('manual')}
                    className={`press flex flex-col items-center justify-center h-[52px] px-1 rounded-[14px] transition-[background-color,color,box-shadow] duration-200 ${
                        mode === 'manual'
                            ? 'thumb-primary'
                            : 'text-outline hover:text-on-surface'
                    }`}
                >
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-80">Manual</span>
                    <span className="text-[14px] font-bold tracking-tight mt-0.5 truncate max-w-full">
                        {manualRate ? manualRate : 'Tu tasa'}
                    </span>
                </button>
            </div>

            {/* Smart Tasa de Mañana Banner (cuando esté publicada) */}
            {hasTomorrowRate && tomorrowRates.oficial > 0 && (
                <div className="relative overflow-hidden rounded-[16px] p-3 pl-3.5 flex items-center justify-between animate-fade-in-up border border-secondary/25 bg-gradient-to-r from-secondary/[0.12] to-primary/[0.06]">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="material-symbols-outlined text-secondary text-xl shrink-0">event_upcoming</span>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-on-surface truncate">
                                Tasa de mañana publicada: <span className="text-primary font-mono font-extrabold">Bs. {tomorrowRates.oficial.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </p>
                            <p className="text-[10px] text-outline truncate">
                                Fecha valor: {tomorrowRates.oficialDate || getTomorrowDate()}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setRateView(rateView === 'manana' ? 'hoy' : 'manana')}
                        className={`press px-3.5 h-8 rounded-full text-xs font-bold shrink-0 transition-[background-color,color,box-shadow] duration-200 ${
                            rateView === 'manana'
                                ? 'thumb-primary'
                                : 'thumb-neutral'
                        }`}
                    >
                        {rateView === 'manana' ? 'Aplicada ✓' : 'Aplicar'}
                    </button>
                </div>
            )}

            {/* Currency Pills for Other Currencies */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {CURRENCIES.map(cur => (
                    <button key={cur.code} onClick={() => {
                        setSelectedCurrency(cur.code);
                        if (mode === 'manual' && cur.code !== 'USD' && cur.code !== 'USDT') setMode('api');
                    }}
                        className={`press flex-shrink-0 flex items-center gap-2 pl-1.5 pr-3.5 h-9 rounded-full border transition-[background-color,border-color,box-shadow] duration-200 ${selectedCurrency === cur.code ? 'border-primary/50 bg-primary/[0.12] shadow-[0_0_0_3px_rgba(66,133,244,0.10)]' : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                        <CurrencyFlag code={cur.code} size={22} />
                        <span className={`text-[12px] font-bold tracking-tight ${selectedCurrency === cur.code ? 'text-on-surface' : 'text-outline'}`}>{cur.name}</span>
                    </button>
                ))}
            </div>

            {/* Target Currency Selector */}
            {selectedCurrency !== 'USD' && (
                <div className="space-y-1.5 animate-slide-down transition-all duration-300">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-[0.14em] pl-1">Convertir a</label>
                    <div className="well grid grid-cols-2 gap-1 p-1 rounded-[16px]">
                        <button
                            onClick={() => setTargetCurrency('VES')}
                            className={`press h-10 text-[12px] font-bold rounded-[12px] transition-[background-color,color,box-shadow] duration-200 flex items-center justify-center gap-1.5 ${targetCurrency === 'VES' ? 'thumb-neutral' : 'text-outline hover:text-on-surface'}`}
                        >
                            <CurrencyFlag code="VES" size={18} /> Bolívares
                        </button>
                        <button
                            onClick={() => setTargetCurrency('USD')}
                            className={`press h-10 text-[12px] font-bold rounded-[12px] transition-[background-color,color,box-shadow] duration-200 flex items-center justify-center gap-1.5 ${targetCurrency === 'USD' ? 'thumb-neutral' : 'text-outline hover:text-on-surface'}`}
                        >
                            <CurrencyFlag code="USD" size={18} /> Dólares
                        </button>
                    </div>
                </div>
            )}

            {/* USDT Compra/Venta Selector */}
            {selectedCurrency === 'USDT' && (
                <div className="space-y-1.5 animate-slide-down transition-all duration-300 mt-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-[0.14em] pl-1">Operación (Binance P2P)</label>
                    <div className="well grid grid-cols-2 gap-1 p-1 rounded-[16px]">
                        <button
                            onClick={() => setUsdtTradeMode('compra')}
                            className={`press h-10 text-[12px] font-bold rounded-[12px] transition-[background-color,color,box-shadow] duration-200 flex items-center justify-center gap-1.5 ${usdtTradeMode === 'compra' ? 'thumb-neutral !text-green-400' : 'text-outline hover:text-on-surface'}`}
                        >
                            Comprar · {todayRates.usdtCompra > 0 ? todayRates.usdtCompra.toFixed(2) : '-'}
                        </button>
                        <button
                            onClick={() => setUsdtTradeMode('venta')}
                            className={`press h-10 text-[12px] font-bold rounded-[12px] transition-[background-color,color,box-shadow] duration-200 flex items-center justify-center gap-1.5 ${usdtTradeMode === 'venta' ? 'thumb-neutral !text-tertiary' : 'text-outline hover:text-on-surface'}`}
                        >
                            Vender · {todayRates.usdtVenta > 0 ? todayRates.usdtVenta.toFixed(2) : '-'}
                        </button>
                    </div>
                </div>
            )}

            {/* Manual Rate Input */}
            {mode === 'manual' && (
                <div className="space-y-1.5 animate-slide-down">
                    <label htmlFor="manualRateInput" className="text-[10px] font-bold text-outline uppercase tracking-[0.14em] pl-1">
                        Tasa manual ({displayTargetSymbol} por 1 {selectedCurrency})
                    </label>
                    <div className="well rounded-[16px] flex items-center px-4 h-12 focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(66,133,244,0.15)] transition-[border-color,box-shadow] duration-200">
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
                <div className={`flex justify-between items-center well rounded-[18px] p-4 transition-colors duration-500 ${flashClass}`}>
                    <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex gap-1">
                            <button
                                onClick={() => setRateView('hoy')}
                                className={`press px-2.5 h-6 rounded-full text-[10px] font-bold uppercase tracking-[0.06em] transition-[background-color,color] duration-200 ${rateView === 'hoy' ? 'bg-secondary text-on-secondary' : 'bg-white/5 text-outline hover:text-on-surface'}`}>
                                Hoy · {todayRates.oficialDate || getTodayDate()}
                            </button>
                            <button
                                onClick={() => setRateView('manana')}
                                className={`press px-2.5 h-6 rounded-full text-[10px] font-bold uppercase tracking-[0.06em] transition-[background-color,color] duration-200 ${rateView === 'manana' ? 'bg-primary text-white' : 'bg-white/5 text-outline hover:text-on-surface'}`}>
                                Mañana · {tomorrowRates.oficialDate || getTomorrowDate()}
                            </button>
                        </div>
                        <div className="pt-1">
                            {loading && displayRate === 0 ? (
                                <div className="h-8 w-48 bg-white/10 animate-pulse rounded-md mt-1"></div>
                            ) : (
                                <p className={`text-on-surface text-[22px] font-bold tracking-[-0.03em] truncate transition-opacity duration-300 ${flashClass}`}>
                                    <span className="text-outline font-semibold text-[15px]">1 {selectedCurrency} = </span>{displayRate > 0 ? displayRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : '-'} <span className="text-primary">{displayTargetSymbol}</span>
                                </p>
                            )}
                        </div>
                        {rateView === 'manana' && !hasTomorrowRate && (
                            <p className="text-[10px] text-secondary">Aún no se ha publicado la tasa de mañana</p>
                        )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                            onClick={handleCopyRate}
                            className="press w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-outline hover:text-on-surface transition-colors duration-150 hover:bg-white/10"
                            title="Copiar tasa de cambio"
                            aria-label="Copiar tasa de cambio"
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
                <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-[16px] p-3 border transition-[border-color,background-color] duration-200 ${rateView === 'hoy' ? 'border-secondary/40 bg-secondary/[0.06]' : 'border-white/[0.07] bg-white/[0.03]'}`}>
                        <p className="text-[10px] text-outline font-bold uppercase tracking-[0.12em]">BCV Hoy</p>
                        <p className={`text-on-surface font-bold text-[15px] tracking-tight mt-0.5 transition-opacity duration-500 ${flashClass}`}>
                            Bs. {todayRates.oficial > 0 ? todayRates.oficial.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </p>
                        {oficialDelta !== 0 && (
                            <p className={`text-[10px] font-bold mt-0.5 ${oficialDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {oficialDelta > 0 ? '▲' : '▼'} {Math.abs(oficialDelta).toFixed(4)}
                            </p>
                        )}
                    </div>
                    <div className={`rounded-[16px] p-3 border transition-[border-color,background-color] duration-200 ${rateView === 'manana' ? 'border-primary/40 bg-primary/[0.06]' : 'border-white/[0.07] bg-white/[0.03]'}`}>
                        <p className="text-[10px] text-outline font-bold uppercase tracking-[0.12em]">BCV Mañana</p>
                        <p className="text-on-surface font-bold text-[15px] tracking-tight mt-0.5">
                            Bs. {tomorrowRates.oficial > 0 ? tomorrowRates.oficial.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </p>
                        {hasTomorrowRate && (
                            <p className="text-[10px] font-bold mt-0.5 text-primary">
                                ✓ Publicada
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Spread Widget (BCV vs USDT Binance) */}
            {mode === 'api' && todayRates.oficial > 0 && (todayRates.usdt || todayRates.paralelo) > 0 && (
                <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[16px]">compare_arrows</span>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-[0.12em]">Diferencial BCV / USDT</span>
                    </div>
                    {(() => {
                        const usdtPrice = todayRates.usdt || todayRates.paralelo;
                        const spread = ((usdtPrice - todayRates.oficial) / todayRates.oficial) * 100;
                        const isPositive = spread > 0;
                        return (
                            <div className="flex items-center gap-2">
                                <span className={`text-[13px] font-bold ${isPositive ? 'text-secondary' : 'text-green-400'}`}>
                                    {isPositive ? '+' : ''}{spread.toFixed(2)}%
                                </span>
                                <span className="text-[10px] text-outline font-semibold px-2 h-6 inline-flex items-center bg-white/5 rounded-full">
                                    Bs. {Math.abs(usdtPrice - todayRates.oficial).toFixed(2)}
                                </span>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Converter Engine */}
            <div className="space-y-2 relative pt-1">
                {/* FROM input */}
                <div className="space-y-2">
                    <div className="well rounded-[20px] px-4 pt-3 pb-3.5 focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(66,133,244,0.15),inset_0_1px_2px_rgba(0,0,0,0.3)] transition-[border-color,box-shadow] duration-200">
                        <label htmlFor="amountInput" className="block text-[10px] font-bold text-outline uppercase tracking-[0.14em]">Monto en {fromLabel}</label>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-primary font-bold text-xl">{fromSymbol}</span>
                            <input
                                id="amountInput"
                                name="amountInput"
                                className={`bg-transparent border-none focus:ring-0 outline-none text-on-surface text-[32px] font-bold tracking-[-0.03em] leading-tight p-0 w-full placeholder:text-outline-variant/50 transition-[opacity,transform] duration-200 ${isSwappingAnim ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}
                                placeholder="0,00"
                                type="text"
                                value={amount}
                                onChange={handleAmountChange}
                                inputMode="decimal"
                            />
                        </div>
                    </div>
                    {/* Quick Amount Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        {(isSwapped ? ['500', '1000', '2000', '5000', '10000'] : ['1', '5', '10', '20', '50', '100']).map(val => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => handleQuickAmount(val)}
                                className="press px-3 h-8 rounded-full text-[12px] font-bold bg-white/[0.04] border border-white/[0.08] text-on-surface-variant hover:text-on-surface hover:bg-white/[0.08] transition-colors duration-150 shrink-0"
                            >
                                {isSwapped ? 'Bs. ' : fromSymbol}{val}
                            </button>
                        ))}
                        {amount && (
                            <button
                                type="button"
                                onClick={() => setAmount('')}
                                className="press px-3 h-8 rounded-full text-[12px] font-bold bg-tertiary-container/10 border border-tertiary-container/25 text-tertiary hover:bg-tertiary-container/20 transition-colors duration-150 shrink-0 ml-auto flex items-center gap-1"
                                title="Borrar monto"
                            >
                                <span className="material-symbols-outlined text-[14px]">backspace</span>
                                Borrar
                            </button>
                        )}
                    </div>
                </div>

                {/* Swap Button: sits on a hairline divider between input and result */}
                <div className="flex items-center gap-3 py-0.5">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent to-outline/25" />
                    <button
                        onClick={handleSwap}
                        className={`w-11 h-11 rounded-full thumb-primary flex items-center justify-center active:scale-[0.92] transition-transform duration-300 shadow-md ${isSwapped ? 'rotate-180' : ''}`}
                        style={{ transitionTimingFunction: 'var(--ease-apple)' }}
                        title={isSwapped ? `${toLabel} → ${fromLabel}` : `${fromLabel} → ${toLabel}`}
                        aria-label="Invertir conversión"
                    >
                        <span className="material-symbols-outlined font-bold text-[20px]">swap_vert</span>
                    </button>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-outline/25" />
                </div>

                {/* TO result */}
                <div className="space-y-2">
                    <div
                        onClick={handleCopyResult}
                        className="card-sheen relative overflow-hidden rounded-[24px] px-5 pt-3.5 pb-4 cursor-pointer select-none text-white active:scale-[0.985] transition-transform duration-150"
                        style={{
                            background: 'radial-gradient(120% 140% at 0% 0%, rgba(255,255,255,0.25) 0%, transparent 45%), linear-gradient(140deg, #5090f7 0%, #3a76de 50%, #1a56c4 100%)',
                            boxShadow: 'inset 0 1px 1px 0 rgba(255,255,255,0.45), inset 0 0 0 1px rgba(255,255,255,0.12), inset 0 -1px 1px 0 rgba(0,0,0,0.25), 0 16px 36px -12px rgba(66,133,244,0.75)',
                            transitionTimingFunction: 'var(--ease-apple)'
                        }}
                        title="Toca para copiar monto"
                        role="button"
                        aria-label={`Resultado ${result || '0,00'}. Toca para copiar`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">Resultado en {toLabel}</span>
                            <div className="flex items-center gap-1.5">
                                {result && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setShowMostrador(true); }}
                                        className="press w-8 h-8 rounded-full bg-white/[0.16] hover:bg-white/[0.24] flex items-center justify-center text-white transition-colors"
                                        title="Mostrar en pantalla completa"
                                        aria-label="Mostrar en pantalla completa"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">fullscreen</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                                    className="press w-8 h-8 rounded-full bg-white/[0.16] hover:bg-white/[0.24] flex items-center justify-center text-white transition-colors"
                                    title="Copiar formato completo"
                                    aria-label="Copiar formato completo"
                                >
                                    <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
                                </button>
                            </div>
                        </div>
                        <p className={`text-[38px] leading-[1.05] font-extrabold tracking-[-0.04em] mt-1 truncate transition-[opacity,transform] duration-200 ${isSwappingAnim ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}>
                            <span className="text-white/70 text-[24px] font-bold mr-1.5">{toSymbol}</span>{result || '0,00'}
                        </p>
                        <p className="text-[11px] text-white/75 flex items-center gap-1 mt-1.5 font-medium">
                            <span className="material-symbols-outlined text-[14px]">touch_app</span>
                            Toca para copiar el monto para tu banco
                        </p>
                    </div>
                    {resultCopied && (
                        <div className="bg-primary/15 border border-primary/30 text-primary text-xs font-bold h-8 px-3 rounded-full flex items-center justify-center animate-fade-in-up">
                            ✓ Monto copiado para tu banco: {result}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowTools(!showTools)}
                        aria-expanded={showTools}
                        className="press w-full h-9 rounded-full flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-outline hover:text-primary transition-colors"
                    >
                        {showTools ? 'Ocultar extras' : 'Vuelto, dividir y propina'}
                        <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${showTools ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                </div>

                {/* Extra Tools Section */}
                <div className={`transition-[max-height,opacity,padding] duration-300 overflow-hidden ${showTools ? 'max-h-[340px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
                    <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] p-3">
                        <div className="well grid grid-cols-3 gap-1 mb-3 p-1 rounded-[14px]">
                            <button onClick={() => setActiveTool('mixto')} className={`press h-8 text-[10px] font-bold uppercase tracking-[0.08em] rounded-[10px] transition-[background-color,color,box-shadow] duration-200 ${activeTool === 'mixto' ? 'thumb-primary' : 'text-outline hover:text-on-surface'}`}>Mixto/Vuelto</button>
                            <button onClick={() => setActiveTool('split')} className={`press h-8 text-[10px] font-bold uppercase tracking-[0.08em] rounded-[10px] transition-[background-color,color,box-shadow] duration-200 ${activeTool === 'split' ? 'thumb-primary' : 'text-outline hover:text-on-surface'}`}>Dividir</button>
                            <button onClick={() => setActiveTool('propina')} className={`press h-8 text-[10px] font-bold uppercase tracking-[0.08em] rounded-[10px] transition-[background-color,color,box-shadow] duration-200 ${activeTool === 'propina' ? 'thumb-primary' : 'text-outline hover:text-on-surface'}`}>Propina</button>
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
                                    const numTotal = parseFloat(amount.replace(/[\s\u00a0\u202f.]/g, '').replace(',', '.')) || 0;
                                    const numCash = parseFloat(cashGiven.replace(/[\s\u00a0\u202f.]/g, '').replace(',', '.')) || 0;
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
                                    const numResult = parseFloat(result.replace(/[\s\u00a0\u202f.]/g, '').replace(',', '.'));
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

                        {activeTool === 'propina' && (
                            <div className="space-y-3 animate-fade-in-up">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-outline">Porcentaje sugerido</label>
                                    <div className="flex gap-2">
                                        {[5, 10, 15].map(pct => (
                                            <button key={pct} onClick={() => setTipPercent(pct)} className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${tipPercent === pct ? 'bg-primary text-on-primary-fixed' : 'bg-white/10 text-outline hover:bg-white/20'}`}>
                                                {pct}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {(() => {
                                    const numResult = parseFloat(result.replace(/[\s\u00a0\u202f.]/g, '').replace(',', '.'));
                                    if (isNaN(numResult) || numResult === 0) return null;
                                    const tipAmount = numResult * (tipPercent / 100);
                                    const totalWithTip = numResult + tipAmount;
                                    const formattedTip = tipAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    const formattedTotal = totalWithTip.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    return (
                                        <div className="bg-white/5 border border-white/10 p-3 rounded-lg flex flex-col gap-2 mt-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-outline">Monto original:</span>
                                                <span className="text-on-surface">{toSymbol} {result}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-outline">Propina ({tipPercent}%):</span>
                                                <span className="text-on-surface">{toSymbol} {formattedTip}</span>
                                            </div>
                                            <div className="w-full h-px bg-white/10"></div>
                                            <div className="flex justify-between items-center font-bold">
                                                <span className="text-primary uppercase text-[10px] tracking-wider">Total a pagar:</span>
                                                <span className="text-primary text-lg">{toSymbol} {formattedTotal}</span>
                                            </div>
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
                    <button onClick={() => setShowMostrador(false)} aria-label="Cerrar" className="press absolute top-6 right-6 w-12 h-12 rounded-full well flex items-center justify-center text-outline hover:text-on-surface transition-colors">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                    <div className="text-center w-full max-w-sm">
                        <p className="text-outline uppercase tracking-widest font-bold text-sm mb-4">Total a Pagar</p>
                        <div className="text-[12vw] sm:text-7xl font-numeral-display text-primary leading-none mb-6 font-extrabold break-words w-full px-4" style={{ filter: 'drop-shadow(0 0 40px rgba(66, 133, 244, 0.4))' }}>
                            {result}
                        </div>
                        <p className="text-on-surface font-semibold text-xl mb-8 flex items-center justify-center gap-2">
                            <span>{targetCurrency === 'VES' ? 'Bolívares' : targetCur?.name || targetCurrency}</span>
                            <CurrencyFlag code={targetCurrency} size={24} />
                        </p>
                        
                        <div className="card-glass p-4 mx-auto w-full max-w-[280px]">
                            <p className="text-xs text-outline mb-1">Referencia ({selectedCurrency})</p>
                            <p className="text-on-surface font-bold text-lg">{fromSymbol} {amount || '0,00'}</p>
                            <div className="w-full h-px bg-white/10 my-3"></div>
                            <p className="text-[10px] text-outline font-bold uppercase tracking-wider mb-0.5">Tasa aplicada</p>
                            <p className="text-sm font-semibold text-secondary">Bs. {displayRate > 0 ? displayRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : '-'}</p>
                        </div>
                    </div>
                </div>
            )}
        </article>
        </div>
    );
}

export default CurrencyCalculator;
