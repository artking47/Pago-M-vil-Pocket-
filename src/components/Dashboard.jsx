import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import BankCard from './BankCard';
import ThemeToggle from './ThemeToggle';
import CurrencyCalculator from './CurrencyCalculator';
import RateHistoryChart from './RateHistoryChart';
import ShoppingList from './ShoppingList';
import { getConversionHistory, clearConversionHistory } from './ConversionHistory';
import { CurrencyFlag } from './FlagIcons';

function Dashboard({ banks, onAddClick, onDelete, appVersion, activeTab, onTabChange }) {
    const { theme } = useTheme();
    const [history, setHistory] = useState(() => getConversionHistory());

    React.useEffect(() => {
        if (activeTab === 'profile') {
            setHistory(getConversionHistory());
        }
    }, [activeTab]);

    const handleClearHistory = () => {
        clearConversionHistory();
        setHistory([]);
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
            {/* TOP APP BAR — with actual logo */}
            <header className="bg-surface/60 dark:bg-surface/60 backdrop-blur-md border-b border-white/5 dark:border-white/5 fixed top-0 left-0 right-0 flex justify-between items-center w-full px-5 py-3 h-16 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center transition-all duration-200 active:scale-95 bg-white/5">
                        <img src={logoSrc} alt="Pago Móvil Pocket" className="w-9 h-9 object-contain" />
                    </div>
                    <div>
                        <h1 className="text-on-surface text-lg font-bold font-['Inter'] tracking-tight">Pago Móvil Pocket</h1>
                        <p className="text-[10px] text-outline font-medium tracking-wide">{appVersion}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                </div>
            </header>

            {/* Spacer for fixed header */}
            <div className="h-16 w-full"></div>

            <main className="px-margin-safe py-lg space-y-lg pb-32 max-w-3xl mx-auto">
                {/* ═══════ CALCULATOR TAB ═══════ */}
                {activeTab === 'calculator' && (
                    <>
                        <section className="mb-4 pt-4 animate-fade-in-up">
                            <h2 className="text-on-surface font-h2 text-h2">Dashboard</h2>
                            <p className="text-on-surface-variant font-body-sm text-body-sm">Gestiona tus cuentas de forma simple</p>
                        </section>

                        <CurrencyCalculator />
                    </>
                )}

                {/* ═══════ ACCOUNTS TAB ═══════ */}
                {activeTab === 'accounts' && (
                    <div className="animate-fade-in-up">
                        <section className="mb-6 pt-4">
                            <h2 className="text-on-surface font-h2 text-h2">Mis Cuentas</h2>
                            <p className="text-on-surface-variant font-body-sm text-body-sm">Gestiona tus cuentas de Pago Móvil</p>
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
                                        <span className="bg-white/10 text-on-surface-variant text-[11px] px-2 py-0.5 rounded-full font-bold">{banks.length} cuenta{banks.length > 1 ? 's' : ''}</span>
                                    </div>
                                    <button onClick={onAddClick} className="text-primary hover:text-on-surface transition-colors text-sm font-bold flex items-center gap-1 active:scale-95">
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Agregar
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {banks.map((bank, index) => (
                                        <BankCard key={bank.id} bank={bank} onDelete={onDelete} index={index} compact={false} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ═══════ RATES / TASAS TAB ═══════ */}
                {activeTab === 'rates' && (
                    <div className="animate-fade-in-up">
                        <section className="mb-4 pt-4">
                            <h2 className="text-on-surface font-h2 text-h2">Historial de Tasas</h2>
                            <p className="text-on-surface-variant font-body-sm text-body-sm">Calendario y tendencia del dólar</p>
                        </section>
                        <RateHistoryChart />
                    </div>
                )}

                {/* ═══════ SHOPPING TAB ═══════ */}
                {activeTab === 'shopping' && (
                    <ShoppingList />
                )}

                {/* ═══════ PROFILE TAB ═══════ */}
                {activeTab === 'profile' && (
                    <div className="animate-fade-in-up">
                        <section className="mb-6 pt-4">
                            <h2 className="text-on-surface font-h2 text-h2">Perfil</h2>
                            <p className="text-on-surface-variant font-body-sm text-body-sm">Información de la aplicación</p>
                        </section>

                        {/* App Info Card */}
                        <section className="glass-surface rounded-2xl p-6 flex flex-col items-center text-center gap-4 mb-4">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 p-2">
                                <img src={logoSrc} alt="Pago Móvil Pocket" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h3 className="text-on-surface font-h3 text-h3">Pago Móvil Pocket</h3>
                                <p className="text-outline text-sm">{appVersion}</p>
                            </div>
                        </section>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="glass-surface rounded-xl p-4 text-center">
                                <p className="text-primary font-bold text-2xl">{banks.length}</p>
                                <p className="text-outline text-xs font-medium mt-1">Cuentas guardadas</p>
                            </div>
                            <div className="glass-surface rounded-xl p-4 text-center">
                                <p className="text-secondary font-bold text-2xl">{history.length}</p>
                                <p className="text-outline text-xs font-medium mt-1">Conversiones</p>
                            </div>
                        </div>

                        {/* Info Items */}
                        <div className="space-y-2 mb-8">
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
                                                <p className="text-on-surface font-semibold text-sm">{getSymbol(item.fromCode)} {item.fromAmount || '—'}</p>
                                                <p className="text-outline text-[10px]">{time}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-primary font-bold text-sm">{getSymbol(item.toCode)} {item.toAmount || '—'}</p>
                                                <p className="text-outline text-[10px]">Tasa: {item.rate || '—'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Footer in profile */}
                        <div className="mt-8 text-center space-y-2">
                            <p className="text-outline text-xs">Diseñado y desarrollado por <span className="text-primary font-bold">ARTKING47</span></p>
                            <p className="text-outline-variant text-[10px]">© 2024 Pago Móvil Pocket. Secure Transaction Data.</p>
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
                            <p className="font-body-sm text-outline-variant text-[10px]">© 2024 Pago Móvil Pocket. Secure Transaction Data.</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-primary/5 px-2.5 py-1 rounded-full border border-primary/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Seguro</span>
                        </div>
                    </footer>
                )}
            </main>

            {/* BOTTOM NAVBAR — Functional with active state */}
            <nav className="bg-surface/80 backdrop-blur-xl border-t border-white/5 rounded-t-2xl fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 h-20 pb-safe">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`flex flex-col items-center justify-center transition-all active:scale-90 relative ${isActive ? 'text-primary' : 'text-outline hover:text-primary'}`}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                            >{item.icon}</span>
                            <span className="font-['Inter'] text-[10px] font-medium mt-1">{item.label}</span>
                            {isActive && (
                                <span className="absolute -bottom-1 w-1 h-1 bg-secondary rounded-full"></span>
                            )}
                        </button>
                    );
                })}
            </nav>
            <div className="h-20 w-full"></div>
        </div>
    );
}

export default Dashboard;
