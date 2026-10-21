import React, { useMemo } from 'react';
import useRates from '../hooks/useRates';

function HomeHub({ onNavigateTab, onOpenReceiptScanner, onOpenAddBank }) {
    const { todayRates, tomorrowRates, hasTomorrowRate, loading, refresh } = useRates();
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
            let totalDebtUSD = 0;
            let pendingCount = 0;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            list.forEach(purchase => {
                purchase.installments.forEach((inst, idx) => {
                    if (!inst.paid) {
                        totalDebtUSD += inst.amountUSD;
                        pendingCount += 1;
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

            return {
                next: closestItem,
                totalDebtUSD,
                pendingCount
            };
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
            let listCount = 0;
            lists.forEach(list => {
                const listDate = list.id && list.id > 1600000000000 ? new Date(list.id) : new Date();
                if (listDate.getMonth() === now.getMonth() && listDate.getFullYear() === now.getFullYear()) {
                    spentUSD += (list.totalUSD || 0);
                    listCount += 1;
                }
            });

            const percent = Math.min(Math.round((spentUSD / (budgetUSD || 1)) * 100), 100);
            return { budgetUSD, spentUSD, percent, remaining: budgetUSD - spentUSD, listCount };
        } catch {
            return { budgetUSD: 200, spentUSD: 0, percent: 0, remaining: 200, listCount: 0 };
        }
    }, []);

    // Rate forecast advantage: If tomorrow rate is higher
    const rateAdvantage = useMemo(() => {
        if (!hasTomorrowRate || !tomorrowRates.oficial || !upcomingInstallment?.next) return null;
        const tomorrow = tomorrowRates.oficial;
        if (tomorrow <= rateBCV) return null;

        const nextUSD = upcomingInstallment.next.amountUSD;
        const diffVES = (nextUSD * tomorrow) - (nextUSD * rateBCV);
        if (diffVES > 1) {
            return {
                diffVES,
                tomorrowRate: tomorrow,
                percentIncrease: (((tomorrow - rateBCV) / rateBCV) * 100).toFixed(1)
            };
        }
        return null;
    }, [hasTomorrowRate, tomorrowRates, rateBCV, upcomingInstallment]);

    // Greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 18) return 'Buenas tardes';
        return 'Buenas noches';
    };

    const nextInst = upcomingInstallment?.next;
    const totalPendingDebt = upcomingInstallment?.totalDebtUSD || 0;

    return (
        <div className="space-y-6 animate-fade-in-up pb-12">
            {/* ═══════ EXECUTIVE HEADER ═══════ */}
            <div className="pt-1 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="eyebrow">
                            <span className="eyebrow-dot" />
                            CENTRO FINANCIERO
                        </span>
                    </div>
                    <h2 className="text-on-surface text-[28px] font-bold tracking-[-0.03em] leading-tight">
                        {getGreeting()}
                    </h2>
                    <p className="text-outline text-xs mt-0.5 capitalize">
                        {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={refresh}
                    disabled={loading}
                    className="press w-11 h-11 rounded-2xl well flex items-center justify-center text-outline hover:text-white transition-all active:scale-95 shrink-0 border border-white/[0.08]"
                    title="Actualizar tasas"
                >
                    <span className={`material-symbols-outlined text-xl ${loading ? 'animate-spin text-white' : ''}`}>
                        refresh
                    </span>
                </button>
            </div>

            {/* ═══════ HERO: EXECUTIVE FINANCIAL COMMAND CARD ═══════ */}
            <div className="bezel">
                <div className="bezel-core card-sheen p-5 space-y-4">
                    {/* Header line with status chip */}
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-outline uppercase tracking-[0.16em] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                            Compromisos & Presupuesto Activo
                        </span>
                        <span className="text-[10px] font-bold text-zinc-300 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10">
                            Mes en Curso
                        </span>
                    </div>

                    {/* Big Hero Number: Active Obligations (Cuotas pendientes + Gasto en súper) */}
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-extrabold text-white tracking-[-0.03em]">
                                ${(totalPendingDebt + budgetData.spentUSD).toFixed(2)}
                            </span>
                            <span className="text-xs font-semibold text-outline">USD</span>
                        </div>
                        <p className="text-outline text-xs mt-1">
                            Equivalente a <strong className="text-zinc-200">Bs. {((totalPendingDebt + budgetData.spentUSD) * (rateBCV || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> a tasa BCV
                        </p>
                    </div>

                    {/* Split Row: Two core pillars */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
                        {/* 1. Cuotas Pendientes */}
                        <div 
                            onClick={() => onNavigateTab('cuotas')}
                            className="p-3 rounded-xl well border border-white/[0.05] cursor-pointer hover:border-white/20 transition-all"
                        >
                            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">
                                Cuotas Cashea / Krece
                            </span>
                            <p className="text-white font-bold text-lg mt-0.5">
                                ${totalPendingDebt.toFixed(2)}
                            </p>
                            <span className="text-[10px] text-zinc-400 mt-0.5 block">
                                {upcomingInstallment?.pendingCount || 0} cuota{(upcomingInstallment?.pendingCount || 0) === 1 ? '' : 's'} por pagar
                            </span>
                        </div>

                        {/* 2. Gasto Supermercado */}
                        <div 
                            onClick={() => onNavigateTab('shopping')}
                            className="p-3 rounded-xl well border border-white/[0.05] cursor-pointer hover:border-white/20 transition-all"
                        >
                            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">
                                Compras del Mes
                            </span>
                            <p className="text-white font-bold text-lg mt-0.5">
                                ${budgetData.spentUSD.toFixed(2)}
                            </p>
                            <span className="text-[10px] text-zinc-400 mt-0.5 block">
                                {budgetData.percent}% de ${budgetData.budgetUSD.toFixed(0)} meta
                            </span>
                        </div>
                    </div>

                    {/* Integrated CTA Button (Nested Button-in-Button) */}
                    {nextInst ? (
                        <button
                            type="button"
                            onClick={() => onNavigateTab('cuotas')}
                            className="press w-full h-12 rounded-2xl bg-white text-black font-bold text-xs flex items-center justify-between px-4 shadow-lg shadow-white/5 hover:bg-zinc-200 active:scale-[0.98] transition-all"
                        >
                            <span className="flex items-center gap-2 font-bold tracking-tight">
                                <span className="material-symbols-outlined text-base">payments</span>
                                Próxima cuota: {nextInst.store} (${nextInst.amountUSD.toFixed(2)})
                            </span>
                            <div className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-xs">arrow_forward</span>
                            </div>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onNavigateTab('cuotas')}
                            className="press w-full h-11 rounded-2xl well border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/5 active:scale-[0.98] transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            Registrar nueva compra a plazos (Cashea / Krece)
                        </button>
                    )}
                </div>
            </div>

            {/* ═══════ MINIMALIST QUICK ACTIONS DOCK (Executive Monochrome) ═══════ */}
            <div className="grid grid-cols-4 gap-2.5">
                {[
                    { id: 'scan', label: 'Escanear Ticket', icon: 'receipt_long', onClick: () => { onNavigateTab('shopping'); if (onOpenReceiptScanner) onOpenReceiptScanner(); } },
                    { id: 'cuotas', label: 'Cuotas Cashea', icon: 'calendar_month', onClick: () => onNavigateTab('cuotas') },
                    { id: 'calc', label: 'Calculadora', icon: 'calculate', onClick: () => onNavigateTab('calculator') },
                    { id: 'accounts', label: 'Mis Cuentas', icon: 'account_balance_wallet', onClick: () => onNavigateTab('accounts') }
                ].map(action => (
                    <button
                        key={action.id}
                        type="button"
                        onClick={action.onClick}
                        className="press flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl well border border-white/[0.08] hover:border-white/25 active:scale-95 transition-all text-center gap-2"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/[0.07] border border-white/10 text-white flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-200 leading-tight tracking-tight">
                            {action.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* ═══════ MARKET TICKER MATRIX (BCV, USDT, BRECHA) ═══════ */}
            <div className="card-glass border border-white/[0.08] p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-[0.16em] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-zinc-400">candlestick_chart</span>
                        Pulso del Mercado Cambiario
                    </span>
                    <div className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 px-2.5 py-0.5 rounded-full">
                        <span className="relative flex w-1.5 h-1.5">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </span>
                        <span className="text-[10px] font-bold text-zinc-200">Brecha: +{spreadPercent}%</span>
                    </div>
                </div>

                {/* 3 Rates */}
                <div className="grid grid-cols-3 gap-2">
                    {/* Dólar BCV */}
                    <div 
                        onClick={() => onNavigateTab('rates')}
                        className="well p-3 rounded-xl border border-white/[0.06] cursor-pointer hover:border-white/20 transition-all"
                    >
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Dólar BCV</span>
                        <p className="text-white font-bold text-base mt-0.5 font-mono">
                            Bs. {rateBCV > 0 ? rateBCV.toFixed(2) : '-'}
                        </p>
                        {hasTomorrowRate && tomorrowRates.oficial && (
                            <span className="text-[9px] text-amber-300 font-semibold block truncate mt-0.5">
                                Mañ: Bs. {tomorrowRates.oficial.toFixed(2)}
                            </span>
                        )}
                    </div>

                    {/* Binance USDT */}
                    <div 
                        onClick={() => onNavigateTab('calculator')}
                        className="well p-3 rounded-xl border border-white/[0.06] cursor-pointer hover:border-white/20 transition-all"
                    >
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Binance USDT</span>
                        <p className="text-white font-bold text-base mt-0.5 font-mono">
                            Bs. {rateUSDT > 0 ? rateUSDT.toFixed(2) : '-'}
                        </p>
                        <span className="text-[9px] text-zinc-400 font-medium block truncate mt-0.5">
                            P2P Promedio
                        </span>
                    </div>

                    {/* Euro BCV */}
                    <div 
                        onClick={() => onNavigateTab('calculator')}
                        className="well p-3 rounded-xl border border-white/[0.06] cursor-pointer hover:border-white/20 transition-all"
                    >
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Euro BCV</span>
                        <p className="text-white font-bold text-base mt-0.5 font-mono">
                            Bs. {rateEUR > 0 ? rateEUR.toFixed(2) : '-'}
                        </p>
                        <span className="text-[9px] text-zinc-400 font-medium block truncate mt-0.5">
                            Oficial
                        </span>
                    </div>
                </div>

                {/* Micro-insight advice bar */}
                <div className="flex items-center justify-between text-[11px] text-outline pt-1 border-t border-white/[0.04]">
                    <span className="flex items-center gap-1.5 truncate text-zinc-400">
                        <span className="material-symbols-outlined text-xs">info</span>
                        {parseFloat(spreadPercent) > 15 
                            ? 'Brecha alta: se recomienda pagar en bolívares por punto de venta.' 
                            : 'Mercado estable: paridad equilibrada entre oficial y P2P.'}
                    </span>
                    <button 
                        type="button" 
                        onClick={() => onNavigateTab('rates')} 
                        className="text-[11px] font-bold text-white hover:underline shrink-0 ml-2"
                    >
                        Gráfico →
                    </button>
                </div>
            </div>

            {/* ═══════ RATE HIKE SAVINGS ALERT (SMART CONTRACT-LIKE NOTIFICATION) ═══════ */}
            {rateAdvantage && nextInst && (
                <div 
                    onClick={() => onNavigateTab('cuotas')}
                    className="p-4 rounded-2xl bg-zinc-900 border border-white/20 space-y-2 cursor-pointer hover:border-white/40 transition-all animate-slide-down"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-300 text-lg">bolt</span>
                            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                                Ahorro Detectado por Subida BCV
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full">
                            +{rateAdvantage.percentIncrease}% mañana
                        </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                        El BCV fijó una tasa mayor para mañana (Bs. {rateAdvantage.tomorrowRate.toFixed(2)}). Si pagas hoy la cuota de <strong>{nextInst.store}</strong>, ahorras <strong className="text-white">Bs. {rateAdvantage.diffVES.toFixed(2)}</strong>.
                    </p>
                    <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] text-outline">Toca para ir al gestor de cuotas</span>
                        <span className="text-xs font-bold text-white flex items-center gap-1">
                            Pagar Hoy a Bs. {rateBCV.toFixed(2)} →
                        </span>
                    </div>
                </div>
            )}

            {/* ═══════ INTEGRATED ACTIVITY & HEALTH WIDGETS ═══════ */}
            <div className="space-y-3">
                <span className="text-[10px] font-bold text-outline uppercase tracking-[0.16em] block px-1">
                    Ecosistema Financiero
                </span>

                {/* 1. Cashea Widget */}
                {nextInst && (
                    <div 
                        onClick={() => onNavigateTab('cuotas')}
                        className="card-glass p-4 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl well border border-white/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-white text-lg">calendar_month</span>
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-white font-bold text-xs truncate">{nextInst.store}</p>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                        nextInst.days <= 0 ? 'bg-red-500/20 text-red-400' :
                                        nextInst.days <= 3 ? 'bg-amber-400/20 text-amber-300' : 'bg-white/10 text-zinc-300'
                                    }`}>
                                        {nextInst.days === 0 ? 'VENCE HOY' : nextInst.days < 0 ? `Vencida (${Math.abs(nextInst.days)}d)` : `Vence en ${nextInst.days}d`}
                                    </span>
                                </div>
                                <p className="text-outline text-[11px] mt-0.5">
                                    Cuota #{nextInst.number} • ${nextInst.amountUSD.toFixed(2)} • Bs. {nextInst.amountVES.toFixed(2)}
                                </p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-outline text-base shrink-0 ml-2">chevron_right</span>
                    </div>
                )}

                {/* 2. CENDAS Food Basket & Budget Progress */}
                <div 
                    onClick={() => onNavigateTab('shopping')}
                    className="card-glass p-4 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer space-y-2.5"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl well border border-white/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-base">pie_chart</span>
                            </div>
                            <div>
                                <p className="text-white font-bold text-xs leading-tight">Presupuesto & Canasta CENDAS</p>
                                <p className="text-outline text-[10px]">Alimentación y compras del hogar</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold text-white">${budgetData.spentUSD.toFixed(2)}</span>
                            <span className="text-outline text-[10px] block">/ ${budgetData.budgetUSD.toFixed(0)} meta</span>
                        </div>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div 
                            className="h-full rounded-full bg-white transition-all duration-500"
                            style={{ width: `${budgetData.percent}%` }}
                        />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-outline pt-0.5">
                        <span>{budgetData.percent}% consumido este mes</span>
                        <span>{((budgetData.spentUSD / 540) * 100).toFixed(0)}% Canasta Familiar ($540 CENDAS)</span>
                    </div>
                </div>

                {/* 3. Purchasing Power & Salary Defense */}
                <div 
                    onClick={() => onNavigateTab('sueldo')}
                    className="card-glass p-4 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl well border border-white/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-white text-lg">shield</span>
                        </div>
                        <div>
                            <p className="text-white font-bold text-xs">Defensa del Ingreso & Devaluación</p>
                            <p className="text-outline text-[11px]">Monitorea la pérdida de valor de tus bolívares</p>
                        </div>
                    </div>
                    <span className="material-symbols-outlined text-outline text-base shrink-0">chevron_right</span>
                </div>
            </div>
        </div>
    );
}

export default HomeHub;
