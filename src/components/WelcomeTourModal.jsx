import React, { useState, useEffect } from 'react';

const TOUR_STEPS = [
    {
        id: 'finance',
        icon: 'insights',
        badge: 'Nuevo Módulo',
        badgeColor: 'text-white border-white/20 bg-white/5',
        title: 'Control Financiero & Presupuesto',
        desc: 'Supervisa tu gasto mensual, compara con la Canasta Alimentaria CENDAS ($540 ref.), audita impuestos SENIAT (IGTF 3% e IVA 16%) y consulta el radar de precios para saber dónde comprar más barato.',
        features: [
            'Presupuesto mensual con alerta de consumo',
            'Radar de precios contra la inflación',
            'Defensa del sueldo vs devaluación BCV/USDT',
            'Exportación de reportes a WhatsApp y CSV'
        ]
    },
    {
        id: 'shopping',
        icon: 'shopping_cart',
        badge: 'Compras Ágiles',
        badgeColor: 'text-white border-white/20 bg-white/5',
        title: 'Tu Carrito en el Supermercado',
        desc: 'Calcula en tiempo real cuánto vas a pagar en Bolívares a la tasa oficial del día mientras recorres los pasillos del súper, evitando sorpresas al llegar a la caja.',
        features: [
            'Escáner de código de barras para etiquetas',
            'Escáner OCR de tickets y facturas',
            'Sincronización automática de artículos faltantes',
            'Historial de compras guardadas y archivadas'
        ]
    },
    {
        id: 'calculator',
        icon: 'calculate',
        badge: 'Herramientas',
        badgeColor: 'text-white border-white/20 bg-white/5',
        title: 'Calculadoras Financieras',
        desc: 'Conversiones instantáneas entre Bolívares, Dólar BCV, USDT y Euro. Además, calcula comisiones netas de PayPal y porcentajes de descuento en compras comerciales.',
        features: [
            'Tasas oficiales y de mercado en vivo',
            'Desglose exacto de comisiones de PayPal',
            'Cálculo rápido de descuentos con impuestos',
            'Historial de conversiones persistente'
        ]
    },
    {
        id: 'security',
        icon: 'lock',
        badge: 'Privacidad 100%',
        badgeColor: 'text-white border-white/20 bg-white/5',
        title: 'Datos Seguros y Locales',
        desc: 'Pago Móvil Pocket no envía tus datos a ningún servidor externo. Todas tus cuentas bancarias, listas y presupuestos se almacenan de manera local y encriptada en tu propio dispositivo.',
        features: [
            'Cero rastreadores o servidores en la nube',
            'Copia de datos con un toque para compartir',
            'Sistema de respaldo y restauración JSON',
            'Funcionamiento sin conexión a internet (PWA)'
        ]
    }
];

function WelcomeTourModal({ isOpen, onClose }) {
    const [currentStep, setCurrentStep] = useState(0);

    // Close on escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                handleComplete();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleComplete = () => {
        try {
            localStorage.setItem('pm_pocket_seen_v040_welcome', 'true');
        } catch (e) {
            console.error(e);
        }
        onClose();
    };

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const step = TOUR_STEPS[currentStep];

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-modal-title"
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-overlay"
            onClick={handleComplete}
        >
            <div
                className="bg-[#0e0e11] w-full max-w-md rounded-[28px] border border-white/10 flex flex-col overflow-hidden animate-slide-up shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Ambient Glow */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/5 via-white/[0.02] to-transparent pointer-events-none" />

                {/* Header */}
                <div className="p-6 pb-4 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/10 text-white border border-white/15 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Acceso Anticipado • v0.4.0
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleComplete}
                            className="text-xs text-outline hover:text-on-surface font-semibold tracking-wide uppercase px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
                        >
                            Saltar
                        </button>
                    </div>

                    <h2 id="welcome-modal-title" className="text-on-surface text-xl font-bold tracking-tight leading-tight">
                        Bienvenido a la nueva suite
                    </h2>
                    <p className="text-outline text-xs mt-1 leading-relaxed">
                        Pago Móvil Pocket evoluciona con arquitectura Noir Luxury y herramientas financieras integrales.
                    </p>
                </div>

                {/* Step Card Content */}
                <div className="px-6 py-2 flex-1 relative z-10">
                    <div className="well rounded-[22px] p-5 border border-white/5 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white shadow-inner">
                                <span className="material-symbols-outlined text-2xl">{step.icon}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${step.badgeColor}`}>
                                {step.badge}
                            </span>
                        </div>

                        <h3 className="text-on-surface text-base font-bold tracking-tight mb-1.5">
                            {step.title}
                        </h3>

                        <p className="text-on-surface-variant text-xs leading-relaxed mb-4">
                            {step.desc}
                        </p>

                        <div className="space-y-1.5 pt-2 border-t border-white/5">
                            {step.features.map((feat, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-white text-[14px] shrink-0">check_circle</span>
                                    <span className="text-[11px] text-on-surface-variant font-medium">{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Professional Phase Disclaimer */}
                <div className="px-6 py-2 relative z-10">
                    <div className="p-3 rounded-[16px] bg-white/[0.03] border border-white/10 flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-white/80 text-base shrink-0 mt-0.5">verified</span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-white leading-tight">Fase de Desarrollo Activa (Beta)</p>
                            <p className="text-[10px] text-outline mt-0.5 leading-snug">
                                Seguimos puliendo la experiencia y añadiendo herramientas de alto valor. Tus datos y preferencias locales se mantienen 100% resguardados.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 pt-3 relative z-10 flex items-center justify-between gap-3">
                    {/* Stepper Dots */}
                    <div className="flex items-center gap-1.5">
                        {TOUR_STEPS.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setCurrentStep(i)}
                                aria-label={`Ir al paso ${i + 1}`}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    currentStep === i ? 'w-6 bg-white' : 'w-1.5 bg-white/20 hover:bg-white/40'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-2">
                        {currentStep > 0 && (
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="h-10 px-3.5 rounded-full well text-xs font-bold text-outline hover:text-on-surface active:scale-95 transition-all"
                            >
                                Anterior
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleNext}
                            className="press h-10 px-5 rounded-full thumb-primary font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform"
                        >
                            <span>{currentStep === TOUR_STEPS.length - 1 ? '¡Comenzar!' : 'Siguiente'}</span>
                            <span className="material-symbols-outlined text-[16px]">
                                {currentStep === TOUR_STEPS.length - 1 ? 'check' : 'arrow_forward'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WelcomeTourModal;
