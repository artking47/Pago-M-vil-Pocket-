import React, { useMemo } from 'react';
import useRates from '../hooks/useRates';

function HomeHub({ onNavigateTab, onOpenReceiptScanner, onOpenAddBank }) {
    const { todayRates, tomorrowRates, hasTomorrowRate, previousRates, loading, refresh } = useRates();
    const rateBCV = todayRates.oficial || 0;
    const rateUSDT = todayRates.usdt || todayRates.paralelo || 0;
    const rateEUR = todayRates.eur || 0;

    // Calculate spread / brecha cambiaria
    const spreadPercent = useMemo(() => {
        if (rateBCV > 0 && rateUSDT > 0) {
            return (((rateUSDT - rateBCV) / rateBCV) * 100).toFixed(1);
        }
        return '0.0';
    }, [rateBCV, rateUSDT]);

    // Read upcoming Cashea / Krece installment from localStorage
    const upcomingInstallment = useMemo(() => {
        try {
            const saved = localStorage.getItem('pm_pocket_installments');
            if (!saved) return null;
            const list = JSON.parse(saved);
            let closestDays = Infinity;
            let closestItem = null;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            list.forEach(purchase => {
                purchase.installments.forEach(inst => {
                    if (!inst.paid) {
                        const [y, m, d] = inst.dueDate.split('-').map(Number);
                        const target = new Date(y, m - 1, d);
                        target.setHours(0, 0, 0, 0);
                        const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
                        if (diffDays < closestDays) {
                            closestDays = diffDays;
                            closestItem = {
                                ...inst,
                                store: purchase.store,
                                platform: purchase.platform,
                                days: diffDays,
                                amountVES: inst.amountUSD * (rateBCV || 1)
                            };
                        }
                    }
                });
            });

            return closestItem;
        } catch {
            return null;
        }
    }, [rateBCV]);

    // Read budget progress from localStorage
    const budgetData = useMemo(() => {
        try {
            const savedBudget = localStorage.getItem('shopping_monthly_budget');
            const budgetUSD = savedBudget ? parseFloat(savedBudget) : 200;

            const savedLists = localStorage.getItem('shoppingSavedLists');
            const lists = savedLists ? JSON.parse(savedLists) : [];
            const now = new Date();

            let spentUSD = 0;
            lists.forEach(list => {
                const listDate = list.id && list.id > 1600000000000 ? new Date(list.id) : new Date();
                if (listDate.getMonth() === now.getMonth() && listDate.getFullYear() === now.getFullYear()) {
                    spentUSD += (list.totalUSD || 0);
                }
            });

            const percent = Math.min(Math.round((spentUSD / (budgetUSD || 1)) * 100), 100);
            return { budgetUSD, spentUSD, percent, remaining: budgetUSD - spentUSD };
        } catch {
            return { budgetUSD: 200, spentUSD: 0, percent: 0, remaining: 200 };
        }
    }, []);

    // Get time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 18) return 'Buenas tardes';
        return 'Buenas noches';
    };

    return (
        <div className="space-y-5 animate-fade-in-up pb-12">
            {/* GREETING & DATE HEADER */}
            <div className="pt-2 flex items-center justify-between">
                <div>
                    <span className="eyebrow mb-1.5"><span className="eyebrow-dot" />Super App Hub</span>
                    <h2 className="text-on-surface text-[26px] font-bold tracking-[-0.03em] leading-tight">
                        {getGreeting()}
                    </h2>
                    <p className="text-on-surface-variant text-xs mt-0.5">
                        {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={refresh}
                    disabled={loading}
                    className="press w-10 h-10 rounded-full well flex items-center justify-center text-outline hover:text-primary transition-all active:scale-95 shrink-0"
                    title="Actualizar tasas"
                >
                    <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin text-primary' : ''}`}>
                        refresh
                    </span>
                </button>
            </div>

            {/* LIVE RATES TICKER & BRECHA CAMBIARIA */}
            <div className="bezel">
                <div className="bezel-core card-sheen p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-outline uppercase tracking-[0.14em]">Cotización de Divisas</span>
                        <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full">
                            <span className="relative flex w-1.5 h-1.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-primary" />
                            </span>
                            <span className="text-[10px] font-bold text-primary">Brecha: +{spreadPercent}%</span>
                        </div>
                    </div>

                    {/* 3 Main Currency Badges */}
                    <div className="grid grid-cols-3 gap-2">
                        {/* BCV Oficial */}
                        <div 
                            onClick={() => onNavigateTab('rates')}
                            className="well p-2.5 rounded-xl cursor-pointer hover:border-primary/40 transition-colors"
                        >
                            <span className="text-[10px] font-bold text-outline uppercase block">Dólar BCV</span>
                            <p className="text-on-surface font-bold text-base mt-0.5">
                                Bs. {rateBCV > 0 ? rateBCV.toFixed(2) : '-'}
                            </p>
                            {hasTomorrowRate && tomorrowRates.oficial && (
                                <span className="text-[9px] text-amber-400 font-bold block truncate">
                                    Mañ: Bs. {tomorrowRates.oficial.toFixed(2)}
                                </span>
                            )}
                        </div>

                        {/* Binance USDT */}
                        <div 
                            onClick={() => onNavigateTab('calculator')}
                            className="well p-2.5 rounded-xl cursor-pointer hover:border-primary/40 transition-colors"
                        >
                            <span className="text-[10px] font-bold text-outline uppercase block">Binance USDT</span>
                            <p className="text-on-surface font-bold text-base mt-0.5">
                                Bs. {rateUSDT > 0 ? rateUSDT.toFixed(2) : '-'}
                            </p>
                            <span className="text-[9px] text-primary font-bold block truncate">
                                P2P Promedio
                            </span>
                        </div>

                        {/* Euro BCV */}
                        <div 
                            onClick={() => onNavigateTab('calculator')}
                            className="well p-2.5 rounded-xl cursor-pointer hover:border-primary/40 transition-colors"
                        >
                            <span className="text-[10px] font-bold text-outline uppercase block">Euro BCV</span>
                            <p className="text-on-surface font-bold text-base mt-0.5">
                                Bs. {rateEUR > 0 ? rateEUR.toFixed(2) : '-'}
                            </p>
                            <span className="text-[9px] text-outline font-medium block truncate">
                                Oficial
                            </span>
                        </div>
                    </div>

                    {/* Financial Intelligence Tip */}
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl flex items-center gap-2 text-[11px] text-outline">
                        <span className="material-symbols-outlined text-primary text-sm shrink-0">info</span>
                        <p className="truncate">
                            {parseFloat(spreadPercent) > 15 
                                ? 'Brecha alta: conviene pagar en bolívares por punto y retener divisas.'
                                : 'Brecha moderada: el mercado se mantiene estable.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* QUICK ACTIONS DOCK (Kaspi / Revolut Style) */}
            <div className="grid grid-cols-4 gap-2 pt-1">
                {/* 1. Escanear Ticket */}
                <button
                    type="button"
                    onClick={() => {
                        onNavigateTab('shopping');
                        if (onOpenReceiptScanner) onOpenReceiptScanner();
                    }}
                    className="press flex flex-col items-center justify-center p-3 rounded-2xl well gap-1.5 hover:border-primary/30 transition-all text-center"
                >
                    <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">receipt_long</span>
                    </div>
                    <span className="text-[11px] font-bold text-on-surface leading-tight">Escanear Ticket</span>
                </button>

                {/* 2. Cuotas Cashea */}
                <button
                    type="button"
                    onClick={() => onNavigateTab('cuotas')}
                    className="press flex flex-col items-center justify-center p-3 rounded-2xl well gap-1.5 hover:border-primary/30 transition-all text-center"
                >
                    <div className="w-10 h-10 rounded-xl bg-amber-400/15 text-amber-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">calendar_month</span>
                    </div>
                    <span className="text-[11px] font-bold text-on-surface leading-tight">Cuotas Cashea</span>
                </button>

                {/* 3. Convertir / Calculadora */}
                <button
                    type="button"
                    onClick={() => onNavigateTab('calculator')}
                    className="press flex flex-col items-center justify-center p-3 rounded-2xl well gap-1.5 hover:border-primary/30 transition-all text-center"
                >
                    <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">calculate</span>
                    </div>
                    <span className="text-[11px] font-bold text-on-surface leading-tight">Calculadora</span>
                </button>

                {/* 4. Mis Cuentas / Cobro */}
                <button
                    type="button"
                    onClick={() => onNavigateTab('accounts')}
                    className="press flex flex-col items-center justify-center p-3 rounded-2xl well gap-1.5 hover:border-primary/30 transition-all text-center"
                >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-green-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                    </div>
                    <span className="text-[11px] font-bold text-on-surface leading-tight">Mis Cuentas</span>
                </button>
            </div>

            {/* WIDGET 1: UPCOMING CASHEA / KRECE INSTALLMENT */}
            {upcomingInstallment ? (
                <div 
                    onClick={() => onNavigateTab('cuotas')}
                    className="card-glass border-amber-500/30 p-4 rounded-2xl space-y-2 cursor-pointer hover:border-amber-400/50 transition-all animate-slide-down"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-400 text-lg">schedule</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Próxima Cuota Cashea / Krece</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            upcomingInstallment.days <= 0 ? 'bg-error/20 text-error' :
                            upcomingInstallment.days <= 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-outline'
                        }`}>
                            {upcomingInstallment.days === 0 ? '¡VENCE HOY!' : upcomingInstallment.days < 0 ? `Vencida (${Math.abs(upcomingInstallment.days)}d)` : `Vence en ${upcomingInstallment.days} días`}
                        </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <div>
                            <p className="text-on-surface font-bold text-sm leading-tight">{upcomingInstallment.store}</p>
                            <p className="text-outline text-xs mt-0.5">Cuota #{upcomingInstallment.number} • ${upcomingInstallment.amountUSD.toFixed(2)} USD</p>
                        </div>
                        <div className="text-right">
                            <p className="text-primary font-bold text-lg leading-tight">
                                Bs. {upcomingInstallment.amountVES.toFixed(2)}
                            </p>
                            <span className="text-[10px] text-outline font-semibold">Tasa BCV del día</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div 
                    onClick={() => onNavigateTab('cuotas')}
                    className="card-glass p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-base">calendar_month</span>
                        </div>
                        <div>
                            <p className="text-on-surface font-bold text-xs">Gestor de Cuotas Cashea & Krece</p>
                            <p className="text-outline text-[11px]">Registra compras a plazos y no pagues multas</p>
                        </div>
                    </div>
                    <span className="material-symbols-outlined text-outline text-base">chevron_right</span>
                </div>
            )}

            {/* WIDGET 2: MONTHLY BUDGET TRACKER */}
            <div 
                onClick={() => onNavigateTab('shopping')}
                className="card-glass p-4 rounded-2xl space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-base">pie_chart</span>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Presupuesto de Compras</span>
                    </div>
                    <span className="text-xs font-bold text-primary">${budgetData.spentUSD.toFixed(2)} / ${budgetData.budgetUSD.toFixed(2)}</span>
                </div>

                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                            budgetData.percent > 90 ? 'bg-error' : budgetData.percent > 70 ? 'bg-amber-400' : 'bg-primary'
                        }`}
                        style={{ width: `${budgetData.percent}%` }}
                    />
                </div>

                <div className="flex justify-between text-[10px] text-outline pt-0.5">
                    <span>{budgetData.percent}% consumido este mes</span>
                    <span>Quedan ${Math.max(0, budgetData.remaining).toFixed(2)}</span>
                </div>
            </div>

            {/* WIDGET 3: TERMÓMETRO DEL SUELDO */}
            <div 
                onClick={() => onNavigateTab('sueldo')}
                className="card-glass p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-base">trending_down</span>
                    </div>
                    <div>
                        <p className="text-on-surface font-bold text-xs">Termómetro de Sueldo & Devaluación</p>
                        <p className="text-outline text-[11px]">Calcula el poder de compra real de tu quincena</p>
                    </div>
                </div>
                <span className="material-symbols-outlined text-outline text-base">chevron_right</span>
            </div>
        </div>
    );
}

export default HomeHub;
