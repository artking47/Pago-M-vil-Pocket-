import React, { useState, Suspense, lazy } from 'react';
import { useTheme } from '../context/ThemeContext';
import BankCard from './BankCard';
import ThemeToggle from './ThemeToggle';
import CurrencyCalculator from './CurrencyCalculator';
import PaypalCalculator from './PaypalCalculator';
import DiscountCalculator from './DiscountCalculator';
const RateHistoryChart = lazy(() => import('./RateHistoryChart'));
const ShoppingList = lazy(() => import('./ShoppingList'));
import { getConversionHistory, clearConversionHistory } from './ConversionHistory';
import { CurrencyFlag } from './FlagIcons';

function Dashboard({ banks, onAddClick, onEditClick, onDelete, appVersion, activeTab, onTabChange }) {
    const { theme } = useTheme();
    const [history, setHistory] = useState(() => getConversionHistory());
    const [activeCalculator, setActiveCalculator] = useState('currency'); // 'currency' | 'paypal' | 'discount'

    React.useEffect(() => {
        if (activeTab === 'profile') {
            setHistory(getConversionHistory());
        }
    }, [activeTab]);

    const handleClearHistory = () => {
        clearConversionHistory();
        setHistory([]);
    };

    const handleExportData = () => {
        try {
            const banksData = localStorage.getItem('pago_movil_data') || '[]';
            const historyData = localStorage.getItem('pm_pocket_conversion_history') || '[]';
            const shoppingItems = localStorage.getItem('shoppingListItems') || '[]';
            const shoppingSaved = localStorage.getItem('shoppingSavedLists') || '[]';
            
            const backup = {
                version: appVersion,
                date: new Date().toISOString(),
                banks: JSON.parse(banksData),
                history: JSON.parse(historyData),
                shoppingItems: JSON.parse(shoppingItems),
                shoppingSavedLists: JSON.parse(shoppingSaved)
            };

            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pago-movil-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export error:', err);
            alert('Error al exportar los datos.');
        }
    };

    const handleImportData = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Security check: Limit file size to 2MB to prevent memory exhaustion / DoS
        if (file.size > 2 * 1024 * 1024) {
            alert('El archivo es demasiado grande (máximo 2MB).');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (typeof data !== 'object' || data === null) {
                    throw new Error('Formato inválido');
                }

                // Validate and sanitize banks array
                if (Array.isArray(data.banks)) {
                    const validBanks = data.banks.filter(b => 
                        b && typeof b === 'object' && typeof b.banco === 'string' && typeof b.cedula === 'string' && typeof b.telefono === 'string'
                    );
                    localStorage.setItem('pago_movil_data', JSON.stringify(validBanks));
                }

                // Validate and sanitize history (support both current and legacy keys)
                const historyList = Array.isArray(data.history) 
                    ? data.history 
                    : (Array.isArray(data.conversionHistory) ? data.conversionHistory : null);
                if (historyList) {
                    const validHistory = historyList.filter(h => h && typeof h === 'object');
                    localStorage.setItem('pm_pocket_conversion_history', JSON.stringify(validHistory));
                }

                // Validate shopping list
                if (Array.isArray(data.shoppingItems)) {
                    localStorage.setItem('shoppingListItems', JSON.stringify(data.shoppingItems));
                }
                if (Array.isArray(data.shoppingSavedLists)) {
                    localStorage.setItem('shoppingSavedLists', JSON.stringify(data.shoppingSavedLists));
                }
                
                alert('¡Datos restaurados con éxito! La aplicación se recargará.');
                window.location.reload();
            } catch (err) {
                alert('Error al leer el archivo de respaldo. Asegúrate de que sea un archivo JSON válido.');
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleForceUpdateApp = async () => {
        if (window.confirm('¿Deseas buscar e instalar la última versión de la aplicación ahora?')) {
            try {
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                }
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (const r of regs) {
                        await r.unregister();
                    }
                }
            } catch (e) {
                console.error(e);
            }
            window.location.reload(true);
        }
    };

    const logoSrc = theme === 'light' ? '/isotipo-light.png' : '/isotipo-dark.png';

    const navItems = [
        { id: 'calculator', icon: 'calculate', label: 'Calculadora', fill: true },
        { id: 'rates', icon: 'show_chart', label: 'Tasas', fill: false },
        { id: 'shopping', icon: 'shopping_cart', label: 'Compras', fill: false },
        { id: 'accounts', icon: 'account_balance_wallet', label: 'Cuentas', fill: false },
        { id: 'profile', icon: 'person', label: 'Perfil', fill: false },
    ];

    return (
        <div className="font-body-md overflow-x-hidden min-h-screen">
            {/* TOP APP BAR */}
            <header className="app-bar fixed top-0 left-0 right-0 z-50">
                <div className="max-w-3xl mx-auto flex justify-between items-center w-full px-5 h-16">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-[14px] p-[2px] bg-gradient-to-br from-primary/50 via-white/15 to-secondary/40 shrink-0 shadow-sm">
                            <div className="w-full h-full rounded-[12px] bg-surface-container/90 backdrop-blur-md flex items-center justify-center overflow-hidden">
                                <img src={logoSrc} alt="Pago Móvil Pocket" width="32" height="32" className="w-7 h-7 object-contain" />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-on-surface text-[17px] font-bold tracking-[-0.02em] leading-tight truncate">Pago Móvil Pocket</h1>
                            <p 
                                onClick={handleForceUpdateApp} 
                                className="text-[10px] text-outline hover:text-primary cursor-pointer font-semibold tracking-[0.08em] uppercase leading-tight mt-0.5 active:scale-95 transition-all"
                                title="Toca para buscar e instalar la última versión"
                            >
                                {appVersion} ⟳
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* Spacer for fixed header */}
            <div className="h-16 w-full"></div>

            <main className="px-margin-safe py-lg space-y-lg pb-32 max-w-3xl mx-auto">
                {/* ═══════ CALCULATOR TAB ═══════ */}
                {activeTab === 'calculator' && (
                    <>
                        <section className="pt-2 animate-fade-in-up">
                            <span className="eyebrow mb-3"><span className="eyebrow-dot" />Herramientas</span>
                            <h2 className="text-on-surface text-[28px] font-bold tracking-[-0.03em] leading-[1.1]">Tus finanzas,<br /><span className="text-outline">al instante.</span></h2>
                        </section>

                        <div className="well grid grid-cols-3 gap-1 p-1 rounded-[18px] animate-fade-in-up" role="tablist" aria-label="Calculadoras">
                            {[
                                { id: 'currency', icon: 'currency_exchange', label: 'Divisas' },
                                { id: 'paypal', icon: 'payments', label: 'PayPal' },
                                { id: 'discount', icon: 'sell', label: 'Descuentos' },
                            ].map(tool => {
                                const isActive = activeCalculator === tool.id;
                                return (
                                    <button
                                        key={tool.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setActiveCalculator(tool.id)}
                                        className={`press flex items-center justify-center gap-1.5 h-11 rounded-[14px] transition-[background-color,color,box-shadow] duration-200 ${isActive ? 'thumb-primary' : 'text-outline hover:text-on-surface'}`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>{tool.icon}</span>
                                        <span className="text-[12px] font-bold tracking-tight">{tool.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {activeCalculator === 'currency' && <CurrencyCalculator />}
                        {activeCalculator === 'paypal' && <PaypalCalculator />}
                        {activeCalculator === 'discount' && <DiscountCalculator />}
                    </>
                )}

                {/* ═══════ ACCOUNTS TAB ═══════ */}
                {activeTab === 'accounts' && (
                    <div className="animate-fade-in-up">
                        <section className="mb-6 pt-2">
                            <span className="eyebrow mb-3"><span className="eyebrow-dot" />Pago Móvil</span>
                            <h2 className="text-on-surface text-[28px] font-bold tracking-[-0.03em] leading-[1.1]">Mis Cuentas</h2>
                            <p className="text-on-surface-variant text-sm mt-1">Toca una tarjeta para copiar o compartir sus datos</p>
                        </section>

                        {banks.length === 0 ? (
                            <section className="glass-surface rounded-2xl p-xl flex flex-col items-center text-center gap-md">
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-xl shadow-primary/10">
                                    <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-on-surface font-h2 text-h2">Comienza ahora</h3>
                                    <p className="text-on-surface-variant font-body-sm text-body-sm max-w-[280px] mx-auto">Agrega tu primera cuenta para empezar a gestionar tus pagos de forma rápida y segura.</p>
                                </div>
                                <button onClick={onAddClick} className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-on-primary-fixed font-bold text-body-md shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-xl">add</span>
                                    Agregar Primera Cuenta
                                </button>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                        <span className="material-symbols-outlined text-primary text-[14px]">verified_user</span>
                                        <span className="text-[11px] font-bold text-on-surface-variant">Seguro</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                        <span className="material-symbols-outlined text-secondary text-[14px]">lock</span>
                                        <span className="text-[11px] font-bold text-on-surface-variant">Privado</span>
                                    </div>
                                </div>
                            </section>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="well text-on-surface-variant text-[11px] px-2.5 py-1 rounded-full font-bold">{banks.length} cuenta{banks.length > 1 ? 's' : ''}</span>
                                    </div>
                                    <button onClick={onAddClick} className="press thumb-primary h-9 pl-2 pr-4 rounded-full text-[13px] font-bold flex items-center gap-1.5">
                                        <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[16px]">add</span>
                                        </span>
                                        Agregar
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {banks.map((bank, index) => (
                                        <BankCard key={bank.id} bank={bank} onDelete={onDelete} onEdit={onEditClick} index={index} compact={banks.length > 3} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ═══════ RATES / TASAS TAB ═══════ */}
                {activeTab === 'rates' && (
                    <div className="animate-fade-in-up">
                        <section className="mb-4 pt-2">
                            <span className="eyebrow mb-3"><span className="eyebrow-dot" />Mercado</span>
                            <h2 className="text-on-surface text-[28px] font-bold tracking-[-0.03em] leading-[1.1]">Historial de Tasas</h2>
                            <p className="text-on-surface-variant text-sm mt-1">Calendario y tendencia BCV y USDT</p>
                        </section>
                        <Suspense fallback={
                            <div className="glass-surface rounded-2xl p-md h-64 flex items-center justify-center">
                                <div className="text-center text-outline">
                                    <span className="material-symbols-outlined text-3xl animate-pulse mb-2 block">show_chart</span>
                                    <p className="text-sm">Cargando gráficos...</p>
                                </div>
                            </div>
                        }>
                            <RateHistoryChart />
                        </Suspense>
                    </div>
                )}

                {/* ═══════ SHOPPING TAB ═══════ */}
                {activeTab === 'shopping' && (
                    <Suspense fallback={
                        <div className="glass-surface rounded-2xl p-md h-64 flex items-center justify-center">
                            <div className="text-center text-outline">
                                <span className="material-symbols-outlined text-3xl animate-pulse mb-2 block">shopping_cart</span>
                                <p className="text-sm">Cargando lista...</p>
                            </div>
                        </div>
                    }>
                        <ShoppingList />
                    </Suspense>
                )}

                {/* ═══════ PROFILE TAB ═══════ */}
                {activeTab === 'profile' && (
                    <div className="animate-fade-in-up">
                        <section className="mb-6 pt-2">
                            <span className="eyebrow mb-3"><span className="eyebrow-dot" />Cuenta</span>
                            <h2 className="text-on-surface text-[28px] font-bold tracking-[-0.03em] leading-[1.1]">Perfil</h2>
                            <p className="text-on-surface-variant text-sm mt-1">Información de la aplicación</p>
                        </section>

                        {/* App Info Card */}
                        <div className="bezel mb-4">
                            <section className="bezel-core card-sheen p-6 flex flex-col items-center text-center gap-4">
                                <div className="w-24 h-24 rounded-[26px] p-[3px] bg-gradient-to-br from-primary/50 via-white/5 to-secondary/40">
                                    <div className="w-full h-full rounded-[23px] bg-surface-container p-2 flex items-center justify-center">
                                        <img src={logoSrc} alt="Pago Móvil Pocket" className="w-full h-full object-contain" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-on-surface text-xl font-bold tracking-tight">Pago Móvil Pocket</h3>
                                    <p className="text-outline text-xs font-semibold uppercase tracking-[0.12em] mt-1">{appVersion}</p>
                                </div>
                            </section>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="card-glass card-sheen p-4">
                                <p className="text-outline text-[10px] font-bold uppercase tracking-[0.14em]">Cuentas</p>
                                <p className="text-primary font-bold text-3xl tracking-tight mt-1">{banks.length}</p>
                            </div>
                            <div className="card-glass card-sheen p-4">
                                <p className="text-outline text-[10px] font-bold uppercase tracking-[0.14em]">Conversiones</p>
                                <p className="text-secondary font-bold text-3xl tracking-tight mt-1">{history.length}</p>
                            </div>
                        </div>

                        {/* Info Items */}
                        <div className="space-y-2 mb-4">
                            {[
                                { icon: 'verified_user', label: 'Seguridad', desc: 'Datos almacenados localmente en tu dispositivo', color: 'text-primary' },
                                { icon: 'cloud_off', label: 'Sin servidor', desc: 'No se envían datos a ningún servidor externo', color: 'text-secondary' },
                                { icon: 'code', label: 'Desarrollador', desc: 'Creado por ARTKING47', color: 'text-tertiary' },
                                { icon: 'info', label: 'Versión', desc: appVersion, color: 'text-outline' },
                            ].map((item, i) => (
                                <div key={i} className="glass-surface rounded-xl p-4 flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 ${item.color}`}>
                                        <span className="material-symbols-outlined">{item.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-on-surface font-semibold text-sm">{item.label}</p>
                                        <p className="text-outline text-xs truncate">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={handleForceUpdateApp}
                            className="w-full mb-8 py-3 px-4 rounded-xl well border border-primary/40 text-primary font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                        >
                            <span className="material-symbols-outlined text-base">sync</span>
                            Buscar actualización y limpiar caché PWA
                        </button>

                        {/* Backup Section */}
                        <section className="mb-8">
                            <h3 className="text-on-surface font-h3 text-h3 flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-emerald">save</span>
                                Respaldo de Datos
                            </h3>
                            <div className="glass-surface rounded-xl p-4 space-y-3">
                                <p className="text-outline text-xs mb-2">Exporta tus cuentas y tu historial para no perderlos, o restaura un respaldo anterior.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={handleExportData} className="btn-glass btn-glass-secondary flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-sm">download</span>
                                        Exportar
                                    </button>
                                    <label className="btn-glass btn-glass-primary flex items-center justify-center gap-2 cursor-pointer">
                                        <span className="material-symbols-outlined text-sm">upload</span>
                                        Importar
                                        <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* HISTORIAL SECCION (Movido al perfil) */}
                        <section className="mb-4">
                            <h3 className="text-on-surface font-h3 text-h3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-secondary">history</span>
                                Historial de Conversiones
                            </h3>
                        </section>
                        
                        {history.length === 0 ? (
                            <div className="glass-surface rounded-2xl p-6 text-center text-outline">
                                <p className="text-sm">No hay conversiones recientes</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold text-outline">Últimas {history.length}</span>
                                    <button onClick={handleClearHistory} className="text-error text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform">
                                        Limpiar
                                    </button>
                                </div>
                                {history.slice(0, 10).map((item, index) => {
                                    const time = new Date(item.timestamp).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
                                    const getSymbol = (code) => {
                                        if (code === 'VES') return 'Bs.';
                                        if (code === 'USD') return '$';
                                        if (code === 'EUR') return '€';
                                        if (code === 'USDT') return '₮';
                                        return '$';
                                    };
                                    return (
                                        <div key={item.id || index} className="glass-surface p-3 rounded-xl flex items-center justify-between">
                                            <div>
                                                <p className="text-on-surface font-semibold text-sm">{getSymbol(item.fromCode)} {item.fromAmount || '-'}</p>
                                                <p className="text-outline text-[10px]">{time}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-primary font-bold text-sm">{getSymbol(item.toCode)} {item.toAmount || '-'}</p>
                                                <p className="text-outline text-[10px]">Tasa: {item.rate || '-'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Footer in profile */}
                        <div className="mt-8 text-center space-y-2">
                            <p className="text-outline text-xs">Diseñado y desarrollado por <span className="text-primary font-bold">ARTKING47</span></p>
                            <p className="text-outline-variant text-[10px]">© {new Date().getFullYear()} Pago Móvil Pocket. Secure Transaction Data.</p>
                            <div className="flex justify-center">
                                <div className="flex items-center gap-1.5 bg-primary/5 px-2.5 py-1 rounded-full border border-primary/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Seguro</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer only on calculator tab */}
                {activeTab === 'calculator' && (
                    <footer className="flex flex-col items-center gap-4 w-full px-5 pb-12 text-center mt-xl border-t border-white/5 pt-8">
                        <div className="space-y-1">
                            <p className="font-body-sm text-outline text-xs">Diseñado y desarrollado por <span className="text-primary font-bold">ARTKING47</span></p>
                            <p className="font-body-sm text-outline-variant text-[10px]">© {new Date().getFullYear()} Pago Móvil Pocket. Secure Transaction Data.</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-primary/5 px-2.5 py-1 rounded-full border border-primary/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Seguro</span>
                        </div>
                    </footer>
                )}
            </main>

            {/* BOTTOM NAV: floating island */}
            <nav className="nav-island grid grid-cols-5 gap-1" aria-label="Navegación principal">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`press flex flex-col items-center justify-center h-14 rounded-[22px] transition-[background-color,color,box-shadow] duration-200 ${isActive ? 'nav-item-active-bg text-primary' : 'text-outline hover:text-on-surface'}`}
                        >
                            <span
                                className="material-symbols-outlined text-[22px] leading-none"
                                style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 500" } : { fontVariationSettings: "'wght' 400" }}
                            >{item.icon}</span>
                            <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}

export default Dashboard;
