import React, { useState, useEffect, useMemo } from 'react';
import useRates from '../hooks/useRates';

const STORAGE_KEY = 'pm_pocket_installments';

function InstallmentTracker({ onNavigateToCalculator }) {
    const { todayRates, tomorrowRates, hasTomorrowRate } = useRates();
    const currentRate = todayRates.oficial || 1;
    const tomorrowRate = (hasTomorrowRate && tomorrowRates.oficial) ? tomorrowRates.oficial : null;

    // Persisted installments
    const [installmentsList, setInstallmentsList] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(installmentsList));
    }, [installmentsList]);

    // Modal state for adding a new purchase
    const [showAddModal, setShowAddModal] = useState(false);
    const [payingInstallment, setPayingInstallment] = useState(null); // { purchaseId, instIndex, inst }
    const [paymentRef, setPaymentRef] = useState('');
    const [copiedAmount, setCopiedAmount] = useState(false);

    // Form states
    const [storeName, setStoreName] = useState('');
    const [platform, setPlatform] = useState('cashea'); // 'cashea' | 'krece' | 'otro'
    const [productDescription, setProductDescription] = useState('');
    const [totalPriceUSD, setTotalPriceUSD] = useState('');
    const [downPaymentPercent, setDownPaymentPercent] = useState('40'); // 40% standard Cashea level 1-2
    const [installmentsCount, setInstallmentsCount] = useState('3'); // 3 cuotas standard
    const [firstDueDate, setFirstDueDate] = useState(() => {
        // Default 14 days from today
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().split('T')[0];
    });

    // Helper: Days difference between now and a date string (YYYY-MM-DD)
    const getDaysRemaining = (dateStr) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [y, m, d] = dateStr.split('-').map(Number);
        const target = new Date(y, m - 1, d);
        target.setHours(0, 0, 0, 0);
        const diffTime = target - today;
        return Math.round(diffTime / (1000 * 60 * 60 * 24));
    };

    // Add new purchase to tracker
    const handleAddPurchase = (e) => {
        if (e) e.preventDefault();
        const total = parseFloat(totalPriceUSD.replace(',', '.'));
        if (!storeName.trim() || isNaN(total) || total <= 0) return;

        const downPct = parseFloat(downPaymentPercent) || 0;
        const downPaymentAmount = (total * downPct) / 100;
        const remainingToFinance = total - downPaymentAmount;
        const count = parseInt(installmentsCount, 10) || 3;
        const installmentAmount = remainingToFinance / count;

        const generatedInstallments = [];
        const baseDate = new Date(firstDueDate + 'T12:00:00');

        for (let i = 0; i < count; i++) {
            const dueDate = new Date(baseDate);
            dueDate.setDate(baseDate.getDate() + (i * 14)); // 14 days intervals
            generatedInstallments.push({
                number: i + 1,
                amountUSD: parseFloat(installmentAmount.toFixed(2)),
                dueDate: dueDate.toISOString().split('T')[0],
                paid: false,
                paidDate: null,
                paidRate: null,
                paidAmountVES: null,
                reference: ''
            });
        }

        const newPurchase = {
            id: Date.now(),
            store: storeName.trim(),
            description: productDescription.trim() || 'Compra en cuotas',
            platform,
            totalUSD: total,
            downPaymentUSD: parseFloat(downPaymentAmount.toFixed(2)),
            downPaymentPercent: downPct,
            installmentsCount: count,
            installments: generatedInstallments,
            createdAt: new Date().toISOString()
        };

        setInstallmentsList(prev => [newPurchase, ...prev]);
        setShowAddModal(false);

        // Reset form
        setStoreName('');
        setProductDescription('');
        setTotalPriceUSD('');
    };

    // Mark an installment as paid
    const handleConfirmPayment = () => {
        if (!payingInstallment) return;
        const { purchaseId, instIndex } = payingInstallment;

        setInstallmentsList(prev => prev.map(purchase => {
            if (purchase.id !== purchaseId) return purchase;
            const updated = [...purchase.installments];
            const targetInst = updated[instIndex];
            const amountVES = targetInst.amountUSD * currentRate;

            updated[instIndex] = {
                ...targetInst,
                paid: true,
                paidDate: new Date().toISOString().split('T')[0],
                paidRate: currentRate,
                paidAmountVES: amountVES,
                reference: paymentRef.trim()
            };

            return { ...purchase, installments: updated };
        }));

        setPayingInstallment(null);
        setPaymentRef('');
    };

    // Unmark as paid
    const handleRevertPayment = (purchaseId, instIndex) => {
        if (!window.confirm('¿Deseas marcar esta cuota como pendiente nuevamente?')) return;
        setInstallmentsList(prev => prev.map(purchase => {
            if (purchase.id !== purchaseId) return purchase;
            const updated = [...purchase.installments];
            updated[instIndex] = {
                ...updated[instIndex],
                paid: false,
                paidDate: null,
                paidRate: null,
                paidAmountVES: null,
                reference: ''
            };
            return { ...purchase, installments: updated };
        }));
    };

    // Delete purchase
    const handleDeletePurchase = (purchaseId) => {
        if (!window.confirm('¿Eliminar este plan de cuotas por completo?')) return;
        setInstallmentsList(prev => prev.filter(p => p.id !== purchaseId));
    };

    // Global Stats Calculation
    const stats = useMemo(() => {
        let totalDebtUSD = 0;
        let pendingInstallmentsCount = 0;
        let upcomingDays = Infinity;
        let nextInstallment = null;

        installmentsList.forEach(purchase => {
            purchase.installments.forEach((inst, idx) => {
                if (!inst.paid) {
                    totalDebtUSD += inst.amountUSD;
                    pendingInstallmentsCount += 1;
                    const days = getDaysRemaining(inst.dueDate);
                    if (days < upcomingDays) {
                        upcomingDays = days;
                        nextInstallment = {
                            ...inst,
                            purchaseStore: purchase.store,
                            purchaseId: purchase.id,
                            idx
                        };
                    }
                }
            });
        });

        const totalDebtVES = totalDebtUSD * currentRate;

        return {
            totalDebtUSD,
            totalDebtVES,
            pendingInstallmentsCount,
            upcomingDays: upcomingDays === Infinity ? null : upcomingDays,
            nextInstallment
        };
    }, [installmentsList, currentRate]);

    // Rate forecast advantage: If tomorrow rate is higher than today
    const rateAdvantage = useMemo(() => {
        if (!tomorrowRate || tomorrowRate <= currentRate || !stats.nextInstallment) return null;
        const instUSD = stats.nextInstallment.amountUSD;
        const costTodayVES = instUSD * currentRate;
        const costTomorrowVES = instUSD * tomorrowRate;
        const diffVES = costTomorrowVES - costTodayVES;
        if (diffVES > 1) {
            return {
                diffVES,
                costTodayVES,
                costTomorrowVES,
                percentIncrease: (((tomorrowRate - currentRate) / currentRate) * 100).toFixed(1)
            };
        }
        return null;
    }, [tomorrowRate, currentRate, stats.nextInstallment]);

    return (
        <div className="space-y-5 animate-fade-in-up pb-12">
            {/* Header */}
            <section className="pt-2 flex items-center justify-between">
                <div>
                    <span className="eyebrow mb-2"><span className="eyebrow-dot" />Crédito & Cuotas</span>
                    <h2 className="text-on-surface text-[26px] font-bold tracking-[-0.03em] leading-[1.1]">Cashea & Krece</h2>
                    <p className="text-on-surface-variant text-xs mt-0.5">Controla tus fechas de pago y ahorra en tasa BCV</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="press h-9 px-3.5 rounded-full thumb-primary text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-primary/20 shrink-0"
                >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Nueva Compra
                </button>
            </section>

            {/* RATE HIKE ALERT / ADELANTA TU PAGO */}
            {rateAdvantage && (
                <div className="card-glass border-amber-500/30 bg-amber-500/10 p-3.5 rounded-2xl flex items-start gap-3 animate-slide-down">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-lg">trending_up</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">¡Alerta Tasa BCV de Mañana!</span>
                            <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 rounded font-mono font-bold">+{rateAdvantage.percentIncrease}%</span>
                        </div>
                        <p className="text-on-surface text-xs font-bold mt-1">
                            El dólar BCV sube a Bs. {tomorrowRate.toFixed(2)}
                        </p>
                        <p className="text-outline text-xs mt-0.5">
                            Si adelantas tu próxima cuota hoy ({stats.nextInstallment.purchaseStore}), pagas <strong>Bs. {rateAdvantage.costTodayVES.toFixed(2)}</strong> en vez de <strong>Bs. {rateAdvantage.costTomorrowVES.toFixed(2)}</strong>.
                        </p>
                        <p className="text-amber-300 text-xs font-bold mt-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">savings</span>
                            Te ahorras Bs. {rateAdvantage.diffVES.toFixed(2)} pagando hoy
                        </p>
                    </div>
                </div>
            )}

            {/* EXECUTIVE SUMMARY CARDS */}
            <div className="grid grid-cols-2 gap-3">
                <div className="card-glass p-3.5 rounded-2xl flex flex-col justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Deuda Pendiente</span>
                        <p className="text-primary font-bold text-2xl leading-tight mt-1">
                            ${stats.totalDebtUSD.toFixed(2)}
                        </p>
                    </div>
                    <p className="text-outline text-xs font-semibold mt-2 truncate">
                        Bs. {stats.totalDebtVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="card-glass p-3.5 rounded-2xl flex flex-col justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Próximo Vencimiento</span>
                        {stats.nextInstallment ? (
                            <p className={`font-bold text-xl leading-tight mt-1 ${
                                stats.upcomingDays <= 0 ? 'text-error' : stats.upcomingDays <= 3 ? 'text-amber-400' : 'text-on-surface'
                            }`}>
                                {stats.upcomingDays === 0 ? '¡VENCE HOY!' : stats.upcomingDays < 0 ? `Vencida (${Math.abs(stats.upcomingDays)}d)` : `En ${stats.upcomingDays} días`}
                            </p>
                        ) : (
                            <p className="text-green-400 font-bold text-xl leading-tight mt-1">¡Al día!</p>
                        )}
                    </div>
                    <p className="text-on-surface-variant text-xs font-medium mt-2 truncate">
                        {stats.pendingInstallmentsCount} cuota{stats.pendingInstallmentsCount === 1 ? '' : 's'} por pagar
                    </p>
                </div>
            </div>

            {/* ACTIVE PURCHASES LIST */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-outline uppercase tracking-wider">Tus Compras a Plazos</span>
                    <span className="text-xs font-semibold text-outline">{installmentsList.length} compras</span>
                </div>

                {installmentsList.length === 0 ? (
                    <div className="card-glass p-8 flex flex-col items-center justify-center text-center text-outline my-2">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-3xl opacity-50">calendar_month</span>
                        </div>
                        <h4 className="text-on-surface font-bold text-base">Sin cuotas pendientes</h4>
                        <p className="text-xs text-outline mt-1 max-w-xs">
                            Registra tus compras de Cashea o Krece para saber exactamente cuánto pagar en Bolívares hoy a tasa BCV y nunca pagar multas por retraso.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            className="mt-4 px-4 py-2 rounded-xl thumb-primary text-white font-bold text-xs inline-flex items-center gap-1.5"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Registrar primera compra
                        </button>
                    </div>
                ) : (
                    installmentsList.map(purchase => {
                        const paidCount = purchase.installments.filter(i => i.paid).length;
                        const isComplete = paidCount === purchase.installments.length;

                        return (
                            <div key={purchase.id} className="bezel">
                                <div className="bezel-core card-sheen p-4 space-y-3">
                                    {/* Purchase Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                                purchase.platform === 'cashea' ? 'bg-amber-400/20 text-amber-400' :
                                                purchase.platform === 'krece' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-outline'
                                            }`}>
                                                {purchase.platform === 'cashea' ? 'CS' : purchase.platform === 'krece' ? 'KR' : 'BN'}
                                            </div>
                                            <div>
                                                <h3 className="text-on-surface font-bold text-base leading-tight flex items-center gap-2">
                                                    {purchase.store}
                                                    {isComplete && (
                                                        <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                            PAGADO
                                                        </span>
                                                    )}
                                                </h3>
                                                <p className="text-outline text-xs">{purchase.description}</p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-primary font-bold text-base leading-tight">
                                                ${purchase.totalUSD.toFixed(2)}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handleDeletePurchase(purchase.id)}
                                                className="text-[11px] text-outline hover:text-error transition-colors mt-0.5"
                                                title="Eliminar plan"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>

                                    {/* Progress Pill Bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-semibold text-outline">
                                            <span>Progreso: {paidCount} de {purchase.installments.length} cuotas</span>
                                            <span>Inicial: ${purchase.downPaymentUSD.toFixed(2)} ({purchase.downPaymentPercent}%)</span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-primary transition-all duration-300"
                                                style={{ width: `${(paidCount / purchase.installments.length) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Installments Table */}
                                    <div className="space-y-2 pt-1 border-t border-white/5">
                                        {purchase.installments.map((inst, idx) => {
                                            const days = getDaysRemaining(inst.dueDate);
                                            const amountVES = inst.amountUSD * currentRate;

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                                        inst.paid
                                                            ? 'bg-white/5 border-transparent opacity-60'
                                                            : days <= 0
                                                                ? 'bg-error/10 border-error/30'
                                                                : days <= 3
                                                                    ? 'bg-amber-500/10 border-amber-500/30'
                                                                    : 'well border-transparent'
                                                    }`}
                                                >
                                                    <div className="min-w-0 pr-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-on-surface">
                                                                Cuota {inst.number}
                                                            </span>
                                                            {inst.paid ? (
                                                                <span className="text-green-400 font-bold text-[10px] flex items-center gap-0.5">
                                                                    <span className="material-symbols-outlined text-xs">check_circle</span>
                                                                    Pagada el {inst.paidDate}
                                                                </span>
                                                            ) : (
                                                                <span className={`text-[10px] font-bold ${
                                                                    days <= 0 ? 'text-error' : days <= 3 ? 'text-amber-400' : 'text-outline'
                                                                }`}>
                                                                    {days === 0 ? '¡VENCE HOY!' : days < 0 ? `Vencida (${Math.abs(days)}d)` : `Vence en ${days}d (${inst.dueDate})`}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {inst.paid && inst.reference && (
                                                            <p className="text-[10px] text-outline mt-0.5 font-mono">
                                                                Ref: {inst.reference}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <p className="font-bold text-on-surface">
                                                                ${inst.amountUSD.toFixed(2)}
                                                            </p>
                                                            <p className="text-[10px] text-primary font-bold">
                                                                Bs. {amountVES.toFixed(2)}
                                                            </p>
                                                        </div>

                                                        {inst.paid ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRevertPayment(purchase.id, idx)}
                                                                className="w-7 h-7 rounded-full well flex items-center justify-center text-outline hover:text-on-surface"
                                                                title="Desmarcar pago"
                                                            >
                                                                <span className="material-symbols-outlined text-xs">undo</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPayingInstallment({ purchaseId: purchase.id, instIndex: idx, inst, store: purchase.store })}
                                                                className="px-3 py-1.5 rounded-lg thumb-primary text-white font-bold text-xs shadow-sm active:scale-95 transition-transform"
                                                            >
                                                                Pagar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* MODAL 1: ADD NEW BNPL PURCHASE */}
            {showAddModal && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-overlay"
                    onClick={() => setShowAddModal(false)}
                >
                    <div
                        className="w-full max-w-md bg-surface-container border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl animate-slide-up flex flex-col space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                                    <span className="material-symbols-outlined text-lg">calendar_month</span>
                                </div>
                                <div>
                                    <h3 className="text-on-surface font-bold text-base leading-tight">Registrar Compra a Cuotas</h3>
                                    <p className="text-outline text-xs">Cashea, Krece o financiamiento en tienda</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="w-8 h-8 rounded-full well flex items-center justify-center text-outline"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleAddPurchase} className="space-y-3">
                            {/* Platform selector */}
                            <div>
                                <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Plataforma</label>
                                <div className="well grid grid-cols-3 gap-1 p-1 rounded-xl text-xs font-bold">
                                    {['cashea', 'krece', 'otro'].map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPlatform(p)}
                                            className={`py-1.5 rounded-lg capitalize transition-all ${
                                                platform === p ? 'bg-primary text-white shadow-sm' : 'text-outline hover:text-on-surface'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Store Name */}
                            <div>
                                <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Tienda o Comercio</label>
                                <div className="well rounded-xl px-3 h-11 flex items-center">
                                    <input
                                        type="text"
                                        value={storeName}
                                        onChange={(e) => setStoreName(e.target.value)}
                                        placeholder="Ej. Daka, Traki, Mundo Total..."
                                        className="w-full bg-transparent border-none text-xs font-semibold text-on-surface outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Product */}
                            <div>
                                <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Artículo (opcional)</label>
                                <div className="well rounded-xl px-3 h-11 flex items-center">
                                    <input
                                        type="text"
                                        value={productDescription}
                                        onChange={(e) => setProductDescription(e.target.value)}
                                        placeholder="Ej. Zapatos deportivos, Teléfono..."
                                        className="w-full bg-transparent border-none text-xs font-semibold text-on-surface outline-none"
                                    />
                                </div>
                            </div>

                            {/* Total Price USD */}
                            <div>
                                <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Precio Total en Dólares ($)</label>
                                <div className="well rounded-xl px-3 h-11 flex items-center gap-2">
                                    <span className="text-primary font-bold text-sm">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={totalPriceUSD}
                                        onChange={(e) => setTotalPriceUSD(e.target.value)}
                                        placeholder="120.00"
                                        className="w-full bg-transparent border-none text-sm font-bold text-on-surface outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Down payment % and installments count */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">% de Inicial</label>
                                    <select
                                        value={downPaymentPercent}
                                        onChange={(e) => setDownPaymentPercent(e.target.value)}
                                        className="w-full well rounded-xl px-3 h-11 text-xs font-bold text-on-surface outline-none bg-surface-container"
                                    >
                                        <option value="40">40% (Nivel 1-2)</option>
                                        <option value="30">30% (Nivel 3)</option>
                                        <option value="20">20% (Nivel 4-5)</option>
                                        <option value="50">50%</option>
                                        <option value="0">0% (Sin inicial)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Número de Cuotas</label>
                                    <select
                                        value={installmentsCount}
                                        onChange={(e) => setInstallmentsCount(e.target.value)}
                                        className="w-full well rounded-xl px-3 h-11 text-xs font-bold text-on-surface outline-none bg-surface-container"
                                    >
                                        <option value="3">3 Cuotas (Estándar)</option>
                                        <option value="6">6 Cuotas</option>
                                        <option value="9">9 Cuotas</option>
                                        <option value="2">2 Cuotas</option>
                                    </select>
                                </div>
                            </div>

                            {/* First Due Date */}
                            <div>
                                <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Fecha de 1ra Cuota (a los 14 días)</label>
                                <div className="well rounded-xl px-3 h-11 flex items-center">
                                    <input
                                        type="date"
                                        value={firstDueDate}
                                        onChange={(e) => setFirstDueDate(e.target.value)}
                                        className="w-full bg-transparent border-none text-xs font-semibold text-on-surface outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full h-12 rounded-[16px] thumb-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-95 transition-transform mt-2"
                            >
                                <span className="material-symbols-outlined text-base">check</span>
                                Guardar Plan de Cuotas
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: CONFIRM PAYMENT & COPY EXACT AMOUNT */}
            {payingInstallment && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-overlay"
                    onClick={() => setPayingInstallment(null)}
                >
                    <div
                        className="w-full max-w-md bg-surface-container border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl animate-slide-up flex flex-col space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <div>
                                <h3 className="text-on-surface font-bold text-base leading-tight">
                                    Pagar Cuota {payingInstallment.inst.number} - {payingInstallment.store}
                                </h3>
                                <p className="text-outline text-xs">Tasa BCV del día: Bs. {currentRate.toFixed(2)}</p>
                            </div>
                            <button
                                onClick={() => setPayingInstallment(null)}
                                className="w-8 h-8 rounded-full well flex items-center justify-center text-outline"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>

                        {/* Exact Amount in Bs Card */}
                        <div className="card-glass p-4 rounded-2xl space-y-2 text-center">
                            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Monto exacto a transferir hoy</span>
                            <p className="text-primary font-bold text-3xl tracking-tight">
                                Bs. {(payingInstallment.inst.amountUSD * currentRate).toFixed(2)}
                            </p>
                            <p className="text-outline text-xs font-semibold">
                                Equivalente a: ${payingInstallment.inst.amountUSD.toFixed(2)} USD
                            </p>

                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText((payingInstallment.inst.amountUSD * currentRate).toFixed(2));
                                    setCopiedAmount(true);
                                    setTimeout(() => setCopiedAmount(false), 2000);
                                }}
                                className="mt-2 w-full py-2 px-3 rounded-xl well border border-primary/30 text-primary font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-sm">
                                    {copiedAmount ? 'check' : 'content_copy'}
                                </span>
                                {copiedAmount ? '¡Monto Copiado!' : 'Copiar monto en Bs para el banco'}
                            </button>
                        </div>

                        {/* Reference Input */}
                        <div>
                            <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">
                                Número de Referencia Bancaria (opcional)
                            </label>
                            <div className="well rounded-xl px-3 h-11 flex items-center">
                                <input
                                    type="text"
                                    value={paymentRef}
                                    onChange={(e) => setPaymentRef(e.target.value)}
                                    placeholder="Ej. 091823"
                                    className="w-full bg-transparent border-none text-xs font-mono font-bold text-on-surface outline-none"
                                />
                            </div>
                            <p className="text-[11px] text-outline mt-1">
                                Guardar el número de referencia te protege ante reclamos o fallas en Cashea.
                            </p>
                        </div>

                        <div className="space-y-2 pt-1">
                            <button
                                type="button"
                                onClick={handleConfirmPayment}
                                className="w-full h-12 rounded-[16px] thumb-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-base">check_circle</span>
                                Confirmar Cuota como Pagada
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InstallmentTracker;
