import React, { useState, useMemo } from 'react';

function FinanceReport({ savedLists = [], rate = 1, onGoToCart, onViewReceipt }) {
    // Period filter: 'all' | 'month' | 'last30'
    const [periodFilter, setPeriodFilter] = useState('month');
    
    // Monthly Budget state (persisted)
    const [budgetUSD, setBudgetUSD] = useState(() => {
        const saved = localStorage.getItem('shopping_monthly_budget');
        return saved ? parseFloat(saved) : 200;
    });
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [tempBudgetInput, setTempBudgetInput] = useState(budgetUSD.toString());

    // Product price radar search
    const [productSearch, setProductSearch] = useState('');
    const [copyReportFeedback, setCopyReportFeedback] = useState(false);

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

    // Filter lists by selected period
    const filteredLists = useMemo(() => {
        if (!savedLists || savedLists.length === 0) return [];
        const now = new Date();

        return savedLists.filter(list => {
            if (periodFilter === 'all') return true;

            // Try to parse list date
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
            const listVES = list.totalVES || (listUSD * rate);
            totalUSD += listUSD;
            totalVES += listVES;
            totalItemsCount += (list.items || []).length;

            if (list.receiptData) {
                if (list.receiptData.igtfVES) totalIGTF += list.receiptData.igtfVES;
                if (list.receiptData.ivaVES) totalIVA += list.receiptData.ivaVES;
            }

            // Group by store name
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
        const igtfUSD = rate > 0 ? (totalIGTF / rate) : 0;
        const ivaUSD = rate > 0 ? (totalIVA / rate) : 0;

        // Stores sorted by spend
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
    }, [filteredLists, rate]);

    // Product search across all saved trips
    const searchedProducts = useMemo(() => {
        if (!productSearch.trim() || productSearch.length < 2) return [];
        const term = productSearch.toLowerCase().trim();
        const results = [];

        savedLists.forEach(list => {
            (list.items || []).forEach(item => {
                if (item.name && item.name.toLowerCase().includes(term)) {
                    results.push({
                        id: `${list.id}-${item.id || item.name}`,
                        name: item.name,
                        priceUSD: item.priceUSD || (item.originalCurrency === 'USD' ? item.originalPrice : (item.originalPrice / rate)),
                        priceVES: item.priceVES || (item.originalCurrency === 'VES' ? item.originalPrice : (item.originalPrice * rate)),
                        quantity: item.quantity || 1,
                        date: list.date || 'Reciente',
                        store: list.title || 'Supermercado',
                        receiptImage: list.receiptImage
                    });
                }
            });
        });

        return results;
    }, [savedLists, productSearch, rate]);

    // Copy WhatsApp Report
    const handleCopyReport = () => {
        const periodName = periodFilter === 'month' 
            ? new Date().toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }).toUpperCase()
            : (periodFilter === 'last30' ? 'ÚLTIMOS 30 DÍAS' : 'HISTORIAL COMPLETO');

        const lines = [
            `📊 *REPORTE FINANCIERO DE COMPRAS* (${periodName})`,
            `📅 Generado: ${new Date().toLocaleDateString('es-VE')}`,
            '',
            `💵 *Gasto Total:* $${metrics.totalUSD.toFixed(2)} (Bs. ${metrics.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })})`,
            `🛒 *Salidas al súper:* ${metrics.tripCount} compras`,
            `📈 *Promedio por compra:* $${metrics.avgTripUSD.toFixed(2)}`,
            `🎯 *Presupuesto mensual:* $${budgetUSD.toFixed(2)} (${((metrics.totalUSD / (budgetUSD || 1)) * 100).toFixed(0)}% consumido)`,
            '',
            `🏛️ *Desglose de Impuestos Fiscales:*`,
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

    // Export CSV for Excel
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
                list.receiptData?.rate || rate || '',
                list.receiptData?.igtfVES || 0,
                list.receiptData?.ivaVES || 0
            ]);
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `reporte_compras_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Budget Percentage
    const budgetPercent = Math.min(Math.round((metrics.totalUSD / (budgetUSD || 1)) * 100), 100);
    const budgetRemaining = budgetUSD - metrics.totalUSD;
    const isOverBudget = budgetRemaining < 0;

    return (
        <div className="space-y-5 animate-fade-in-up pb-12">
            {/* TOP BAR / PERIOD SELECTOR */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <span className="eyebrow"><span className="eyebrow-dot" />Finanzas</span>
                    <h3 className="text-on-surface text-xl font-bold tracking-tight">Control de Gastos</h3>
                </div>

                {/* Filter Pills */}
                <div className="well p-1 rounded-full flex items-center gap-1 text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setPeriodFilter('month')}
                        className={`px-3 py-1 rounded-full transition-all ${periodFilter === 'month' ? 'bg-white text-black shadow-sm font-bold' : 'text-outline hover:text-on-surface'}`}
                    >
                        Este Mes
                    </button>
                    <button
                        type="button"
                        onClick={() => setPeriodFilter('last30')}
                        className={`px-3 py-1 rounded-full transition-all ${periodFilter === 'last30' ? 'bg-white text-black shadow-sm font-bold' : 'text-outline hover:text-on-surface'}`}
                    >
                        30 días
                    </button>
                    <button
                        type="button"
                        onClick={() => setPeriodFilter('all')}
                        className={`px-3 py-1 rounded-full transition-all ${periodFilter === 'all' ? 'bg-white text-black shadow-sm font-bold' : 'text-outline hover:text-on-surface'}`}
                    >
                        Historial
                    </button>
                </div>
            </div>

            {/* MONTHLY BUDGET PROGRESS CARD */}
            <div className="bezel">
                <div className="bezel-core card-sheen p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-outline uppercase tracking-[0.14em]">Presupuesto Mensual</p>
                                <p className="text-on-surface font-bold text-base leading-tight">
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
                            className="text-xs text-primary font-bold well px-2.5 py-1 rounded-full hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1"
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
                                className="flex-1 well rounded-xl px-3 py-1.5 text-on-surface text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                                type="submit"
                                className="px-3 py-1.5 rounded-xl thumb-primary text-white font-bold text-xs shadow-md"
                            >
                                Guardar
                            </button>
                        </form>
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs font-semibold">
                            <span className="text-on-surface-variant">
                                Gastado: <strong className="text-on-surface">${metrics.totalUSD.toFixed(2)}</strong>
                            </span>
                            <span className={isOverBudget ? 'text-error font-bold' : 'text-primary font-bold'}>
                                {isOverBudget ? `Excedido por $${Math.abs(budgetRemaining).toFixed(2)}` : `Quedan $${budgetRemaining.toFixed(2)}`}
                            </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden p-0.5">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                    isOverBudget 
                                        ? 'bg-gradient-to-r from-error to-red-400' 
                                        : budgetPercent > 75 
                                            ? 'bg-gradient-to-r from-amber-400 to-amber-500' 
                                            : 'bg-gradient-to-r from-primary to-blue-400'
                                }`}
                                style={{ width: `${Math.min(100, (metrics.totalUSD / (budgetUSD || 1)) * 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-outline">
                            <span>0%</span>
                            <span>{((metrics.totalUSD / (budgetUSD || 1)) * 100).toFixed(0)}% del cupo mensual</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CENDAS-FMDV FAMILY BASKET BENCHMARK */}
            <div className="card-glass p-4 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-lg">stacked_line_chart</span>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Referencia Canasta Alimentaria (CENDAS)</span>
                    </div>
                    <span className="text-[10px] font-bold text-secondary bg-secondary/15 px-2 py-0.5 rounded-full">
                        Familia (5 pers.) ~$540
                    </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                    <div>
                        <p className="text-on-surface font-bold text-sm">
                            {((metrics.totalUSD / 540) * 100).toFixed(1)}% de la canasta mensual
                        </p>
                        <p className="text-outline text-xs mt-0.5">
                            Tu gasto de ${metrics.totalUSD.toFixed(2)} vs $540.00 referencia oficial CENDAS-FMDV
                        </p>
                    </div>
                    <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                            metrics.totalUSD >= 540 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : metrics.totalUSD >= 250 
                                    ? 'bg-amber-500/20 text-amber-400' 
                                    : 'bg-primary/20 text-primary'
                        }`}>
                            {metrics.totalUSD >= 540 ? 'Canasta Cubierta' : metrics.totalUSD >= 250 ? 'Gasto Familiar Medio' : 'Consumo Individual / Parcial'}
                        </span>
                    </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div 
                        className="h-full rounded-full bg-secondary transition-all duration-500"
                        style={{ width: `${Math.min(100, (metrics.totalUSD / 540) * 100)}%` }}
                    />
                </div>
            </div>

            {/* 4 CORE KPI METRIC CARDS */}
            <div className="grid grid-cols-2 gap-3">
                {/* 1. Gasto Total */}
                <div className="card-glass p-3.5 rounded-2xl flex flex-col justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Gasto Total</span>
                        <p className="text-primary font-bold text-xl leading-tight mt-1">
                            ${metrics.totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-outline text-[11px] font-semibold mt-2 truncate">
                        Bs. {metrics.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>

                {/* 2. Compras & Promedio */}
                <div className="card-glass p-3.5 rounded-2xl flex flex-col justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Visitas al Súper</span>
                        <p className="text-on-surface font-bold text-xl leading-tight mt-1">
                            {metrics.tripCount} <span className="text-xs font-normal text-outline">salidas</span>
                        </p>
                    </div>
                    <p className="text-on-surface-variant text-[11px] font-semibold mt-2 truncate">
                        Prom: ${metrics.avgTripUSD.toFixed(2)} / salida
                    </p>
                </div>

                {/* 3. IGTF 3% Divisas */}
                <div className="card-glass p-3.5 rounded-2xl flex flex-col justify-between border-tertiary/25 bg-tertiary/5">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider">Impuesto IGTF 3%</span>
                            <span className="material-symbols-outlined text-tertiary text-xs">local_atm</span>
                        </div>
                        <p className="text-tertiary font-bold text-lg leading-tight mt-1">
                            Bs. {metrics.totalIGTF.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-outline text-[10px] font-medium mt-1">
                        ~${metrics.igtfUSD.toFixed(2)} pagados en impuesto a divisas
                    </p>
                </div>

                {/* 4. IVA 16% */}
                <div className="card-glass p-3.5 rounded-2xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">IVA Fiscal (16%)</span>
                            <span className="material-symbols-outlined text-outline text-xs">receipt</span>
                        </div>
                        <p className="text-on-surface font-bold text-lg leading-tight mt-1">
                            Bs. {metrics.totalIVA.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-outline text-[10px] font-medium mt-1">
                        ~${metrics.ivaUSD.toFixed(2)} en IVA acumulado
                    </p>
                </div>
            </div>

            {/* STORE / SUPERMARKET BREAKDOWN */}
            <div className="card-glass p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-on-surface font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-base">storefront</span>
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
                                            <span className="w-5 h-5 rounded-full well flex items-center justify-center text-[10px] font-bold text-primary">
                                                {i + 1}
                                            </span>
                                            <span className="text-on-surface font-bold truncate max-w-[170px]">{store.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-on-surface font-bold">${store.totalUSD.toFixed(2)}</span>
                                            <span className="text-outline text-[10px] ml-1.5 font-medium">({pct.toFixed(0)}%)</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                                        <div 
                                            className="h-full rounded-full bg-primary"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* PRODUCT PRICE RADAR (INFLATION & PRICE HISTORY SEARCH) */}
            <div className="card-glass p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-on-surface font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-secondary text-base">search_insights</span>
                        Radar de Precios de Productos
                    </p>
                </div>
                <p className="text-outline text-xs">
                    Consulta cuánto pagaste por un producto en compras anteriores y compara tiendas.
                </p>

                <div className="well rounded-xl px-3 h-10 flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-base">search</span>
                    <input 
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Ej. Harina, Queso, Leche, Café..."
                        className="bg-transparent border-none text-xs font-semibold text-on-surface outline-none w-full placeholder:text-outline-variant/60"
                    />
                    {productSearch && (
                        <button type="button" onClick={() => setProductSearch('')} className="text-outline text-xs">
                            ✕
                        </button>
                    )}
                </div>

                {productSearch.trim().length >= 2 && (
                    <div className="space-y-2 max-h-56 overflow-y-auto pt-1">
                        {searchedProducts.length === 0 ? (
                            <p className="text-xs text-outline text-center py-3">No encontramos "{productSearch}" en tus compras guardadas.</p>
                        ) : (
                            searchedProducts.map((p) => (
                                <div key={p.id} className="well p-2.5 rounded-xl flex items-center justify-between text-xs">
                                    <div className="min-w-0 pr-2">
                                        <p className="font-bold text-on-surface truncate">{p.name}</p>
                                        <p className="text-[10px] text-outline flex items-center gap-1 mt-0.5">
                                            <span>{p.store}</span> • <span>{p.date}</span>
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-bold text-primary">${(p.priceUSD || 0).toFixed(2)}</p>
                                        <p className="text-[10px] text-outline font-medium">Bs. {(p.priceVES || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* ACTION REPORT BUTTONS: WHATSAPP COPY & CSV DOWNLOAD */}
            <div className="space-y-2 pt-1">
                <button
                    type="button"
                    onClick={handleCopyReport}
                    className="w-full h-12 rounded-[16px] well border border-primary/40 text-primary font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                >
                    <span className="material-symbols-outlined text-base">share</span>
                    {copyReportFeedback ? '¡Reporte Copiado al Portapapeles!' : 'Copiar Reporte Mensual (WhatsApp)'}
                </button>

                <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full h-11 rounded-[16px] well text-outline hover:text-on-surface font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-base">download</span>
                    Exportar Historial Completo a Excel (.CSV)
                </button>
            </div>

            {/* EMPTY STATE HELPER IF NO SAVED LISTS */}
            {savedLists.length === 0 && (
                <div className="card-glass p-5 rounded-2xl text-center space-y-2 mt-4">
                    <span className="material-symbols-outlined text-3xl text-primary">query_stats</span>
                    <h4 className="font-bold text-on-surface text-sm">Comienza a controlar tus finanzas de compras</h4>
                    <p className="text-outline text-xs max-w-sm mx-auto">
                        Al terminar una compra en el supermercado, pulsa "Guardar Lista" o escanea tu recibo fiscal. Aquí verás gráficos, cálculos de impuestos y tus estadísticas automáticas.
                    </p>
                    {onGoToCart && (
                        <button
                            type="button"
                            onClick={onGoToCart}
                            className="mt-2 px-4 py-2 rounded-xl thumb-primary text-white font-bold text-xs inline-flex items-center gap-1.5"
                        >
                            <span className="material-symbols-outlined text-sm">shopping_cart</span>
                            Ir a mi Lista de Compras
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default FinanceReport;
