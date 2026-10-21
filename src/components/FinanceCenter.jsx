import React, { useState, useMemo, useEffect } from 'react';
import useRates from '../hooks/useRates';

function FinanceCenter({ onGoToShopping, onViewReceipt }) {
    const { todayRates, getRatesForDate } = useRates();
    const currentRateBCV = todayRates.oficial || 1;
    const currentRateUSDT = todayRates.usdt || todayRates.paralelo || currentRateBCV;

    // Sub-tab: 'overview' | 'radar' | 'power' | 'reports'
    const [activeSection, setActiveSection] = useState('overview');

    // Period filter: 'month' | 'last30' | 'all'
    const [periodFilter, setPeriodFilter] = useState('month');

    // Read saved lists from localStorage
    const [savedLists, setSavedLists] = useState(() => {
        try {
            const saved = localStorage.getItem('shoppingSavedLists');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Monthly Budget state
    const [budgetUSD, setBudgetUSD] = useState(() => {
        const saved = localStorage.getItem('shopping_monthly_budget');
        return saved ? parseFloat(saved) : 200;
    });
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [tempBudgetInput, setTempBudgetInput] = useState(budgetUSD.toString());

    // Product search for Price Radar
    const [productSearch, setProductSearch] = useState('');
    const [copyReportFeedback, setCopyReportFeedback] = useState(false);

    // Salary devaluation entries
    const [salaryEntries, setSalaryEntries] = useState(() => {
        try {
            const saved = localStorage.getItem('pm_pocket_salary_entries');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [salaryAmountVES, setSalaryAmountVES] = useState('');
    const [salaryDate, setSalaryDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [salaryLabel, setSalaryLabel] = useState('Quincena');

    // Save budget
    const handleSaveBudget = (e) => {
        if (e) e.preventDefault();
        const parsed = parseFloat(tempBudgetInput);
        if (!isNaN(parsed) && parsed > 0) {
            setBudgetUSD(parsed);
            localStorage.setItem('shopping_monthly_budget', parsed.toString());
        }
        setIsEditingBudget(false);
    };

    // Filter lists by period
    const filteredLists = useMemo(() => {
        if (!savedLists || savedLists.length === 0) return [];
        const now = new Date();

        return savedLists.filter(list => {
            if (periodFilter === 'all') return true;

            const listTimestamp = list.id && typeof list.id === 'number' && list.id > 1600000000000 
                ? list.id 
                : null;
            const listDate = listTimestamp ? new Date(listTimestamp) : new Date();

            if (periodFilter === 'month') {
                return listDate.getMonth() === now.getMonth() && listDate.getFullYear() === now.getFullYear();
            }

            if (periodFilter === 'last30') {
                const diffTime = Math.abs(now - listDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 30;
            }

            return true;
        });
    }, [savedLists, periodFilter]);

    // Financial Metrics Calculation
    const metrics = useMemo(() => {
        let totalUSD = 0;
        let totalVES = 0;
        let totalIGTF = 0;
        let totalIVA = 0;
        let totalItemsCount = 0;
        const storeMap = {};

        filteredLists.forEach(list => {
            const listUSD = list.totalUSD || 0;
            const listVES = list.totalVES || (listUSD * currentRateBCV);
            totalUSD += listUSD;
            totalVES += listVES;
            totalItemsCount += (list.items || []).length;

            if (list.receiptData) {
                if (list.receiptData.igtfVES) totalIGTF += list.receiptData.igtfVES;
                if (list.receiptData.ivaVES) totalIVA += list.receiptData.ivaVES;
            }

            const rawStore = list.title || (list.receiptData?.supermarketName) || 'Supermercado General';
            const storeName = rawStore.replace(/Compra del .*/i, 'Supermercado General').trim() || 'Supermercado General';

            if (!storeMap[storeName]) {
                storeMap[storeName] = { name: storeName, totalUSD: 0, totalVES: 0, count: 0 };
            }
            storeMap[storeName].totalUSD += listUSD;
            storeMap[storeName].totalVES += listVES;
            storeMap[storeName].count += 1;
        });

        const tripCount = filteredLists.length;
        const avgTripUSD = tripCount > 0 ? (totalUSD / tripCount) : 0;
        const igtfUSD = currentRateBCV > 0 ? (totalIGTF / currentRateBCV) : 0;
        const ivaUSD = currentRateBCV > 0 ? (totalIVA / currentRateBCV) : 0;
        const stores = Object.values(storeMap).sort((a, b) => b.totalUSD - a.totalUSD);

        return {
            totalUSD,
            totalVES,
            tripCount,
            avgTripUSD,
            totalIGTF,
            igtfUSD,
            totalIVA,
            ivaUSD,
            totalItemsCount,
            stores
        };
    }, [filteredLists, currentRateBCV]);

    // Price Radar Products
    const allProducts = useMemo(() => {
        const list = [];
        savedLists.forEach(trip => {
            (trip.items || []).forEach(item => {
                if (item.name && item.name.trim().length > 1) {
                    list.push({
                        name: item.name.trim(),
                        priceUSD: item.priceUSD || (item.originalCurrency === 'USD' ? item.originalPrice : (item.originalPrice / currentRateBCV)),
                        priceVES: item.priceVES || (item.originalCurrency === 'VES' ? item.originalPrice : (item.originalPrice * currentRateBCV)),
                        quantity: item.quantity || 1,
                        date: trip.date || 'Reciente',
                        store: trip.title || 'Supermercado',
                        receiptImage: trip.receiptImage
                    });
                }
            });
        });
        return list;
    }, [savedLists, currentRateBCV]);

    // Filtered Price Radar Search
    const searchedProducts = useMemo(() => {
        if (!productSearch.trim()) return [];
        const term = productSearch.toLowerCase().trim();
        return allProducts.filter(p => p.name.toLowerCase().includes(term));
    }, [allProducts, productSearch]);

    // Lowest price for searched term
    const bestPriceFound = useMemo(() => {
        if (searchedProducts.length === 0) return null;
        let lowest = searchedProducts[0];
        searchedProducts.forEach(p => {
            if (p.priceUSD < lowest.priceUSD) lowest = p;
        });
        return lowest;
    }, [searchedProducts]);

    // Salary Entries Calculation
    const salaryCalculations = useMemo(() => {
        let totalOriginalUSD = 0;
        let totalCurrentUSD = 0;
        let totalLossUSD = 0;

        const computedEntries = salaryEntries.map(entry => {
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
    }, [salaryEntries, currentRateBCV]);

    const handleAddSalary = (e) => {
        if (e) e.preventDefault();
        const numVES = parseFloat(salaryAmountVES.replace(/[\s\u00a0\u202f.]/g, '').replace(',', '.'));
        if (isNaN(numVES) || numVES <= 0) return;

        const historicRate = getRatesForDate ? getRatesForDate(salaryDate) : null;
        const rateOnDate = historicRate?.oficial || currentRateBCV;
        const usdtOnDate = historicRate?.paralelo || historicRate?.usdt || currentRateUSDT;
        const originalUSD = numVES / rateOnDate;

        const newEntry = {
            id: Date.now(),
            label: salaryLabel.trim() || 'Ingreso en Bs',
            amountVES: numVES,
            date: salaryDate,
            rateOnDate,
            usdtOnDate,
            originalUSD
        };

        const updated = [newEntry, ...salaryEntries];
        setSalaryEntries(updated);
        localStorage.setItem('pm_pocket_salary_entries', JSON.stringify(updated));
        setSalaryAmountVES('');
    };

    const handleDeleteSalary = (id) => {
        const updated = salaryEntries.filter(e => e.id !== id);
        setSalaryEntries(updated);
        localStorage.setItem('pm_pocket_salary_entries', JSON.stringify(updated));
    };

    // WhatsApp Report
    const handleCopyReport = () => {
        const periodName = periodFilter === 'month' 
            ? new Date().toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }).toUpperCase()
            : (periodFilter === 'last30' ? 'ÚLTIMOS 30 DÍAS' : 'HISTORIAL COMPLETO');

        const lines = [
            `📊 *REPORTE FINANCIERO MENSUAL* (${periodName})`,
            `📅 Generado: ${new Date().toLocaleDateString('es-VE')}`,
            '',
            `💵 *Gasto Total:* $${metrics.totalUSD.toFixed(2)} (Bs. ${metrics.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })})`,
            `🛒 *Salidas al súper:* ${metrics.tripCount} compras (${metrics.totalItemsCount} artículos)`,
            `📈 *Promedio por compra:* $${metrics.avgTripUSD.toFixed(2)}`,
            `🎯 *Presupuesto mensual:* $${budgetUSD.toFixed(2)} (${((metrics.totalUSD / (budgetUSD || 1)) * 100).toFixed(0)}% consumido)`,
            `🧺 *Canasta Alimentaria CENDAS:* ${((metrics.totalUSD / 540) * 100).toFixed(1)}% cubierta ($540 ref.)`,
            '',
            `🏛️ *Impuestos Fiscales (SENIAT):*`,
            `• IGTF 3% (Divisas): Bs. ${metrics.totalIGTF.toLocaleString('es-VE', { minimumFractionDigits: 2 })} (~$${metrics.igtfUSD.toFixed(2)})`,
            `• IVA 16%: Bs. ${metrics.totalIVA.toLocaleString('es-VE', { minimumFractionDigits: 2 })} (~$${metrics.ivaUSD.toFixed(2)})`,
            ''
        ];

        if (metrics.stores.length > 0) {
            lines.push(`🏪 *Distribución por Comercio:*`);
            metrics.stores.forEach(s => {
                const pct = metrics.totalUSD > 0 ? ((s.totalUSD / metrics.totalUSD) * 100).toFixed(0) : 0;
                lines.push(`• ${s.name}: $${s.totalUSD.toFixed(2)} (${pct}%) - ${s.count} visita${s.count === 1 ? '' : 's'}`);
            });
            lines.push('');
        }

        lines.push('📱 _Gestionado con Pago Móvil Pocket_');

        navigator.clipboard.writeText(lines.join('\n'));
        setCopyReportFeedback(true);
        setTimeout(() => setCopyReportFeedback(false), 2500);
    };

    // Export CSV
    const handleExportCSV = () => {
        const rows = [
            ['Fecha', 'Comercio', 'Articulos', 'Total USD', 'Total VES', 'Tasa BCV', 'IGTF VES', 'IVA VES']
        ];

        filteredLists.forEach(list => {
            rows.push([
                `"${list.date || ''}"`,
                `"${(list.title || 'Supermercado').replace(/"/g, '""')}"`,
                (list.items || []).length,
                (list.totalUSD || 0).toFixed(2),
                (list.totalVES || 0).toFixed(2),
                list.receiptData?.rate || currentRateBCV || '',
                list.receiptData?.igtfVES || 0,
                list.receiptData?.ivaVES || 0
            ]);
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `reporte_financiero_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const budgetPercent = Math.min(Math.round((metrics.totalUSD / (budgetUSD || 1)) * 100), 100);
    const budgetRemaining = budgetUSD - metrics.totalUSD;
    const isOverBudget = budgetRemaining < 0;

    return (
        <div className="space-y-5 animate-fade-in-up pb-16">
            {/* ═══════ HEADER ═══════ */}
            <section className="pt-2 flex items-center justify-between">
                <div>
                    <span className="eyebrow mb-1.5"><span className="eyebrow-dot" />SUITE FINANCIERA</span>
                    <h2 className="text-on-surface text-[28px] font-bold tracking-[-0.03em] leading-tight">Control Financiero</h2>
                    <p className="text-outline text-xs mt-0.5">Métricas, presupuestos, canasta CENDAS y defensa del ingreso</p>
                </div>

                <button
                    type="button"
                    onClick={onGoToShopping}
                    className="press h-9 px-3.5 rounded-full well text-xs font-bold text-white flex items-center gap-1.5 border border-white/10 hover:border-white/25 active:scale-95"
                    title="Ir a lista de compras activa"
                >
                    <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                    Ir al Carrito
                </button>
            </section>

            {/* ═══════ EXECUTIVE NAVIGATION SEGMENTED CONTROL ═══════ */}
            <div className="flex p-1 rounded-2xl well gap-1 border border-white/5 bg-zinc-900/60" role="tablist">
                {[
                    { id: 'overview', label: 'Resumen & Presupuesto', icon: 'pie_chart' },
                    { id: 'radar', label: 'Radar de Precios', icon: 'search_insights' },
                    { id: 'power', label: 'Defensa del Sueldo', icon: 'shield' },
                    { id: 'reports', label: 'Reportes', icon: 'description' },
                ].map(tab => {
                    const isActive = activeSection === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveSection(tab.id)}
                            className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                                isActive ? 'bg-white text-black font-bold shadow-md' : 'text-outline hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-base">{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                        </button>
                    );
                })}
            </div>

            {/* ═══════ SECTION 1: OVERVIEW & BUDGET & CENDAS ═══════ */}
            {activeSection === 'overview' && (
                <div className="space-y-4 animate-fade-in-up">
                    {/* Period Filter Selector */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-outline uppercase tracking-[0.14em]">Filtro de Período</span>
                        <div className="well p-1 rounded-full flex items-center gap-1 text-xs font-bold border border-white/5">
                            {[
                                { id: 'month', label: 'Este Mes' },
                                { id: 'last30', label: '30 días' },
                                { id: 'all', label: 'Historial' }
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    type="button"
                                    onClick={() => setPeriodFilter(filter.id)}
                                    className={`px-3 py-1 rounded-full transition-all ${
                                        periodFilter === filter.id ? 'bg-white text-black shadow-sm font-bold' : 'text-outline hover:text-white'
                                    }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* MONTHLY BUDGET PROGRESS CARD (Double-Bezel) */}
                    <div className="bezel">
                        <div className="bezel-core card-sheen p-5 space-y-3.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl well border border-white/10 flex items-center justify-center text-white">
                                        <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-outline uppercase tracking-[0.14em]">Presupuesto Mensual</p>
                                        <p className="text-white font-extrabold text-xl leading-tight">
                                            ${budgetUSD.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setTempBudgetInput(budgetUSD.toString());
                                        setIsEditingBudget(!isEditingBudget);
                                    }}
                                    className="text-xs font-bold well px-3 py-1.5 rounded-full border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-xs">edit</span>
                                    {isEditingBudget ? 'Cancelar' : 'Ajustar Meta'}
                                </button>
                            </div>

                            {/* Inline Budget Editor */}
                            {isEditingBudget && (
                                <form onSubmit={handleSaveBudget} className="flex gap-2 pt-1 animate-slide-down">
                                    <input
                                        type="number"
                                        step="5"
                                        value={tempBudgetInput}
                                        onChange={(e) => setTempBudgetInput(e.target.value)}
                                        placeholder="Ej. 250"
                                        className="flex-1 well rounded-xl px-3 py-2 text-white text-xs font-bold outline-none border border-white/15"
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs shadow-md"
                                    >
                                        Guardar
                                    </button>
                                </form>
                            )}

                            {/* Progress Bar */}
                            <div className="space-y-1.5 pt-1">
                                <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-zinc-400">
                                        Gastado: <strong className="text-white">${metrics.totalUSD.toFixed(2)}</strong>
                                    </span>
                                    <span className={isOverBudget ? 'text-red-400 font-bold' : 'text-zinc-200 font-bold'}>
                                        {isOverBudget ? `Excedido por $${Math.abs(budgetRemaining).toFixed(2)}` : `Quedan $${budgetRemaining.toFixed(2)}`}
                                    </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            isOverBudget ? 'bg-red-400' : budgetPercent > 80 ? 'bg-amber-300' : 'bg-white'
                                        }`}
                                        style={{ width: `${Math.min(100, (metrics.totalUSD / (budgetUSD || 1)) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-outline">
                                    <span>0%</span>
                                    <span>{((metrics.totalUSD / (budgetUSD || 1)) * 100).toFixed(0)}% del cupo mensual consumido</span>
                                    <span>100%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CENDAS-FMDV BENCHMARK CARD */}
                    <div className="card-glass p-4 rounded-2xl border border-white/[0.08] space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-white text-base">stacked_line_chart</span>
                                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Referencia Canasta Alimentaria (CENDAS)</span>
                            </div>
                            <span className="text-[10px] font-bold text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                                Familia (5 pers.) ~$540/mes
                            </span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <div>
                                <p className="text-white font-bold text-sm">
                                    {((metrics.totalUSD / 540) * 100).toFixed(1)}% de la canasta mensual cubierta
                                </p>
                                <p className="text-outline text-xs mt-0.5">
                                    Tu gasto de ${metrics.totalUSD.toFixed(2)} vs $540.00 referencia oficial CENDAS-FMDV (60 rubros)
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                    metrics.totalUSD >= 540 
                                        ? 'bg-emerald-500/20 text-emerald-400' 
                                        : metrics.totalUSD >= 250 
                                            ? 'bg-amber-500/20 text-amber-300' 
                                            : 'bg-white/10 text-white'
                                }`}>
                                    {metrics.totalUSD >= 540 ? 'Canasta Cubierta' : metrics.totalUSD >= 250 ? 'Gasto Familiar Medio' : 'Consumo Individual / Parcial'}
                                </span>
                            </div>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div 
                                className="h-full rounded-full bg-zinc-300 transition-all duration-500"
                                style={{ width: `${Math.min(100, (metrics.totalUSD / 540) * 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* 4 CORE KPI METRIC CARDS */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* 1. Gasto Total */}
                        <div className="card-glass p-3.5 rounded-2xl flex flex-col justify-between border border-white/[0.08]">
                            <div>
                                <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Gasto Total</span>
                                <p className="text-white font-extrabold text-xl leading-tight mt-1 font-mono">
                                    ${metrics.totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <p className="text-outline text-[11px] font-semibold mt-2 truncate font-mono">
                                Bs. {metrics.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>

                        {/* 2. Compras & Promedio */}
                        <div className="card-glass p-3.5 rounded-2xl flex flex-col justify-between border border-white/[0.08]">
                            <div>
                                <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Visitas al Súper</span>
                                <p className="text-white font-bold text-xl leading-tight mt-1">
                                    {metrics.tripCount} <span className="text-xs font-normal text-outline">salidas</span>
                                </p>
                            </div>
                            <p className="text-zinc-400 text-[11px] font-medium mt-2 truncate">
                                Prom: ${metrics.avgTripUSD.toFixed(2)} / salida
                            </p>
                        </div>

                        {/* 3. Impuesto IGTF 3% Divisas */}
                        <div className="card-glass p-3.5 rounded-2xl flex flex-col justify-between border border-white/[0.08]">
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Impuesto IGTF 3%</span>
                                    <span className="material-symbols-outlined text-zinc-400 text-xs">local_atm</span>
                                </div>
                                <p className="text-white font-bold text-lg leading-tight mt-1 font-mono">
                                    Bs. {metrics.totalIGTF.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <p className="text-outline text-[10px] font-medium mt-1">
                                ~${metrics.igtfUSD.toFixed(2)} en impuesto a pagos con divisas
                            </p>
                        </div>

                        {/* 4. IVA Fiscal (16%) */}
                        <div className="card-glass p-3.5 rounded-2xl flex flex-col justify-between border border-white/[0.08]">
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">IVA Fiscal (16%)</span>
                                    <span className="material-symbols-outlined text-zinc-400 text-xs">receipt</span>
                                </div>
                                <p className="text-white font-bold text-lg leading-tight mt-1 font-mono">
                                    Bs. {metrics.totalIVA.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <p className="text-outline text-[10px] font-medium mt-1">
                                ~${metrics.ivaUSD.toFixed(2)} en IVA acumulado
                            </p>
                        </div>
                    </div>

                    {/* STORES / SUPERMARKETS BREAKDOWN */}
                    <div className="card-glass p-4 rounded-2xl space-y-3 border border-white/[0.08]">
                        <div className="flex items-center justify-between">
                            <p className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-white text-base">storefront</span>
                                Gasto por Comercio / Supermercado
                            </p>
                            <span className="text-outline text-xs font-semibold">{metrics.stores.length} comercios</span>
                        </div>

                        {metrics.stores.length === 0 ? (
                            <p className="text-xs text-outline py-2 text-center">No hay compras registradas en este período.</p>
                        ) : (
                            <div className="space-y-3 pt-1">
                                {metrics.stores.map((store, i) => {
                                    const pct = metrics.totalUSD > 0 ? (store.totalUSD / metrics.totalUSD) * 100 : 0;
                                    return (
                                        <div key={i} className="space-y-1">
                                            <div className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full well flex items-center justify-center text-[10px] font-bold text-white border border-white/10">
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-white font-bold truncate max-w-[170px]">{store.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-white font-bold font-mono">${store.totalUSD.toFixed(2)}</span>
                                                    <span className="text-outline text-[10px] ml-1.5 font-medium">({pct.toFixed(0)}%)</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                <div 
                                                    className="h-full rounded-full bg-white"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════ SECTION 2: PRICE RADAR & INFLATION TRACKER ═══════ */}
            {activeSection === 'radar' && (
                <div className="space-y-4 animate-fade-in-up">
                    <div className="card-glass p-4 rounded-2xl space-y-3 border border-white/[0.08]">
                        <div>
                            <span className="eyebrow mb-1.5"><span className="eyebrow-dot" />RADAR HISTÓRICO</span>
                            <h3 className="text-white text-base font-bold">Radar de Precios y Detección de Inflación</h3>
                            <p className="text-outline text-xs mt-0.5">
                                Busca cualquier producto para ver cuánto pagaste en visitas anteriores y qué comercio lo vende más barato.
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="well rounded-xl px-3 h-11 flex items-center gap-2 border border-white/10 focus-within:border-white/30">
                            <span className="material-symbols-outlined text-outline text-base">search</span>
                            <input 
                                type="text"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                placeholder="Buscar: Harina, Queso, Café, Aceite, Pollo..."
                                className="bg-transparent border-none text-xs font-semibold text-white outline-none w-full placeholder:text-outline/50"
                            />
                            {productSearch && (
                                <button type="button" onClick={() => setProductSearch('')} className="text-outline hover:text-white">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            )}
                        </div>

                        {/* Best price highlight if searched */}
                        {bestPriceFound && (
                            <div className="p-3 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-white text-base">local_offer</span>
                                    <div>
                                        <p className="text-white font-bold text-xs">Mejor precio encontrado:</p>
                                        <p className="text-outline text-[11px]">{bestPriceFound.store} ({bestPriceFound.date})</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-white font-extrabold text-sm font-mono">${bestPriceFound.priceUSD.toFixed(2)}</span>
                                    <span className="text-outline text-[10px] block font-mono">Bs. {bestPriceFound.priceVES.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Results or Product History */}
                    {productSearch.trim() ? (
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block px-1">
                                {searchedProducts.length} coincidencias encontradas
                            </span>
                            {searchedProducts.length === 0 ? (
                                <div className="card-glass p-8 text-center text-outline text-xs">
                                    No se encontraron compras con el nombre "{productSearch}".
                                </div>
                            ) : (
                                searchedProducts.map((p, idx) => (
                                    <div key={idx} className="card-glass p-3 rounded-xl flex items-center justify-between border border-white/[0.06]">
                                        <div className="min-w-0 pr-2">
                                            <p className="text-white font-bold text-xs truncate">{p.name}</p>
                                            <p className="text-outline text-[10px] mt-0.5">
                                                {p.store} • {p.date} • Cant: {p.quantity}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-white font-bold text-xs font-mono">${p.priceUSD.toFixed(2)}</p>
                                            <p className="text-outline text-[10px] font-mono">Bs. {p.priceVES.toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="card-glass p-6 text-center text-outline space-y-2 border border-white/[0.06]">
                            <span className="material-symbols-outlined text-3xl opacity-40">manage_search</span>
                            <p className="text-xs font-bold text-white">Escribe el nombre de un artículo arriba</p>
                            <p className="text-[11px] text-outline max-w-xs mx-auto">
                                Te mostraremos la evolución de precio de ese artículo en todas las facturas y compras guardadas.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════ SECTION 3: PURCHASING POWER & SALARY DEVALUATION ═══════ */}
            {activeSection === 'power' && (
                <div className="space-y-4 animate-fade-in-up">
                    <div className="card-glass p-5 rounded-2xl space-y-4 border border-white/[0.08]">
                        <div>
                            <span className="eyebrow mb-1.5"><span className="eyebrow-dot" />DEFENSA DEL SUELDO</span>
                            <h3 className="text-white text-base font-bold">Termómetro de Pérdida de Poder Adquisitivo</h3>
                            <p className="text-outline text-xs mt-0.5">
                                Registra lo recibido en Bolívares y calcula cuánto valor en dólares ha perdido por el deslizamiento de la tasa cambiaria.
                            </p>
                        </div>

                        {/* Input form */}
                        <form onSubmit={handleAddSalary} className="space-y-3 pt-2 border-t border-white/5">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Concepto</label>
                                    <div className="well rounded-xl px-3 h-10 flex items-center border border-white/10">
                                        <input 
                                            type="text"
                                            value={salaryLabel}
                                            onChange={(e) => setSalaryLabel(e.target.value)}
                                            placeholder="Quincena / Pago"
                                            className="w-full bg-transparent border-none text-xs font-semibold text-white outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Fecha de Cobro</label>
                                    <div className="well rounded-xl px-2 h-10 flex items-center border border-white/10">
                                        <input 
                                            type="date"
                                            value={salaryDate}
                                            onChange={(e) => setSalaryDate(e.target.value)}
                                            className="w-full bg-transparent border-none text-xs font-semibold text-white outline-none text-center"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">Monto Cobrado en Bolívares (Bs.)</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 well rounded-xl px-3 h-10 flex items-center gap-2 border border-white/10">
                                        <span className="text-white font-bold text-xs">Bs.</span>
                                        <input 
                                            type="text"
                                            inputMode="decimal"
                                            value={salaryAmountVES}
                                            onChange={(e) => setSalaryAmountVES(e.target.value)}
                                            placeholder="Ej. 5000"
                                            className="w-full bg-transparent border-none text-xs font-bold text-white outline-none"
                                            required
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="press px-4 h-10 rounded-xl bg-white text-black font-bold text-xs shadow-md shrink-0 active:scale-95"
                                    >
                                        Calcular
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Summary KPI of Total Devaluation Loss */}
                    {salaryCalculations.computedEntries.length > 0 && (
                        <div className="bezel">
                            <div className="bezel-core p-4 space-y-3">
                                <span className="text-[10px] font-bold text-outline uppercase tracking-[0.14em]">Impacto Acumulado de Devaluación</span>
                                <div className="flex items-baseline justify-between">
                                    <div>
                                        <p className="text-2xl font-black text-white font-mono">
                                            -${salaryCalculations.totalLossUSD.toFixed(2)} USD
                                        </p>
                                        <p className="text-outline text-xs mt-0.5">
                                            Pérdida de poder de compra en tus ingresos registrados
                                        </p>
                                    </div>
                                    <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                                        Devaluado
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Salary Entries List */}
                    <div className="space-y-2">
                        {salaryCalculations.computedEntries.map(entry => (
                            <div key={entry.id} className="card-glass p-3.5 rounded-xl border border-white/[0.06] flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-white font-bold text-xs">{entry.label}</p>
                                        <span className="text-[10px] text-outline font-semibold">({entry.date})</span>
                                    </div>
                                    <p className="text-outline text-[11px] mt-0.5">
                                        Cobrado: Bs. {entry.amountVES.toLocaleString('es-VE')} (~${entry.originalUSD.toFixed(2)} original)
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-white font-bold text-xs font-mono">Hoy: ${entry.currentValueUSD.toFixed(2)}</p>
                                        <p className="text-[10px] font-bold text-red-400 font-mono">
                                            -{entry.percentLoss.toFixed(1)}% (${entry.lossUSD.toFixed(2)})
                                        </p>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => handleDeleteSalary(entry.id)} 
                                        className="text-outline hover:text-red-400 p-1"
                                        title="Eliminar"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══════ SECTION 4: EXPORTS & WHATSAPP REPORTS ═══════ */}
            {activeSection === 'reports' && (
                <div className="space-y-4 animate-fade-in-up">
                    <div className="card-glass p-5 rounded-2xl space-y-4 border border-white/[0.08]">
                        <div>
                            <span className="eyebrow mb-1.5"><span className="eyebrow-dot" />EXPORTACIÓN PROFESIONAL</span>
                            <h3 className="text-white text-base font-bold">Generador de Reportes & Exportación</h3>
                            <p className="text-outline text-xs mt-0.5">
                                Comparte tus finanzas familiares en WhatsApp o descarga tus facturas para análisis en Excel.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            {/* WhatsApp Copy */}
                            <button
                                type="button"
                                onClick={handleCopyReport}
                                className="press p-4 rounded-xl well border border-white/10 flex items-center gap-3 hover:border-white/30 text-left transition-all active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-white/[0.08] text-white flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-lg">share</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white font-bold text-xs leading-tight">
                                        {copyReportFeedback ? '¡Copiado al Portapapeles!' : 'Copiar Reporte para WhatsApp'}
                                    </p>
                                    <p className="text-outline text-[11px] mt-0.5">
                                        Formato ordenado con emojis, desglose y presupuesto
                                    </p>
                                </div>
                            </button>

                            {/* Excel CSV */}
                            <button
                                type="button"
                                onClick={handleExportCSV}
                                className="press p-4 rounded-xl well border border-white/10 flex items-center gap-3 hover:border-white/30 text-left transition-all active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-white/[0.08] text-white flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-lg">download</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white font-bold text-xs leading-tight">Descargar para Excel (.CSV)</p>
                                    <p className="text-outline text-[11px] mt-0.5">
                                        Historial completo con impuestos, tasas y comercios
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FinanceCenter;
