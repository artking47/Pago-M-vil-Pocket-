import React, { useState, useEffect } from 'react';

function SplashScreen({ onFinish }) {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 400);
        const t2 = setTimeout(() => setPhase(2), 1500);
        const t3 = setTimeout(onFinish, 1900);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onFinish]);

    // Detect system preference for light/dark
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const bg = prefersDark ? '#0d0f1c' : '#f0f4ff';
    const textColor = prefersDark ? '#e0e6f7' : '#1a1d30';
    const subtextColor = prefersDark ? 'rgba(224,230,247,0.5)' : 'rgba(26,29,48,0.5)';
    const mutedColor = prefersDark ? 'rgba(224,230,247,0.25)' : 'rgba(26,29,48,0.25)';
    const accentColor = '#4285F4'; // Primary blue from logo
    const secondaryColor = '#F5C518'; // Secondary gold from logo
    const tertiaryColor = '#C8202F'; // Tertiary red from logo

    return (
        <div
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-400 ${phase === 2 ? 'opacity-0' : 'opacity-100'}`}
            style={{ background: bg }}
        >
            {/* Orbs animados — Primary Blue + Secondary Gold */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full splash-orb-1" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full splash-orb-2" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full splash-orb-3" />

                {/* Partículas */}
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            width: `${3 + Math.random() * 6}px`,
                            height: `${3 + Math.random() * 6}px`,
                            background: i % 2 === 0 ? 'rgba(66, 133, 244, 0.3)' : 'rgba(245, 197, 24, 0.25)',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `particleFloat ${3 + Math.random() * 4}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 3}s`,
                        }}
                    />
                ))}

                {/* Grid sutil */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `
              linear-gradient(rgba(66,133,244,0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(66,133,244,0.4) 1px, transparent 1px)`,
                        backgroundSize: '50px 50px'
                    }}
                />
            </div>

            {/* Contenido */}
            <div className="relative z-10 text-center px-8">
                {/* Logo */}
                <div className={`mb-8 transition-all duration-500 ${phase >= 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                    <div className="relative inline-block">
                        <div className="absolute inset-0 rounded-2xl blur-2xl opacity-40"
                            style={{ background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})`, transform: 'scale(1.4)' }}
                        />
                        <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl"
                            style={{ background: prefersDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)' }}>
                            <img
                                src="/isotipo-splash.png"
                                alt="Pago Móvil Pocket"
                                className="w-4/5 h-4/5 object-contain drop-shadow-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* Título */}
                <h1 className={`text-4xl md:text-5xl font-bold mb-3 transition-all duration-500 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ color: textColor }}>
                    Pago Móvil <span style={{ color: accentColor }}>Pocket</span>
                </h1>

                {/* Subtítulo */}
                <p className={`text-base md:text-lg mb-6 transition-all duration-500 delay-75 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ color: subtextColor }}>
                    Tus datos de pago, siempre contigo
                </p>

                {/* Version */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-500 delay-100 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ background: prefersDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: prefersDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}>
                    <span className="text-xs font-medium" style={{ color: mutedColor }}>v0.1.0</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: `rgba(66, 133, 244, 0.15)`, color: accentColor, border: `1px solid rgba(66, 133, 244, 0.25)` }}>
                        Beta
                    </span>
                </div>

                {/* Loading dots — Primary blue */}
                <div className={`flex justify-center gap-2 mt-8 transition-all duration-400 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full"
                            style={{ background: accentColor, animation: 'loadingDot 1.4s ease-in-out infinite', animationDelay: `${i * 0.2}s` }}
                        />
                    ))}
                </div>

                {/* Créditos */}
                <p className={`text-xs mt-8 transition-all duration-500 delay-150 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}
                    style={{ color: mutedColor }}>
                    Creado por <span style={{ color: `rgba(66, 133, 244, 0.6)` }} className="font-semibold">ARTKING47</span>
                </p>
            </div>
        </div>
    );
}

export default SplashScreen;
