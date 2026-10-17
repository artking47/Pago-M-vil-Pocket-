import React, { useState } from 'react';
import { getBankColor, getBankLogo, getBankInitials } from '../utils/storage';
import {
    XIcon, ChevronUpIcon, ChevronDownIcon,
    CopyIcon, CheckIcon, ShareIcon,
    IdCardIcon, PhoneIcon, EditIcon
} from './Icons';

function BankCard({ bank, onDelete, onEdit, index, compact = false }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMasked, setIsMasked] = useState(true);
    const [copied, setCopied] = useState(false);
    const [shared, setShared] = useState(false);
    const [monto, setMonto] = useState('');
    const [logoError, setLogoError] = useState(false);

    const bankColor = getBankColor(bank.banco);
    const bankLogo = getBankLogo(bank.banco);
    const bankInitials = getBankInitials(bank.banco);

    const formatMonto = (value) => {
        const numbers = value.replace(/\D/g, '');
        return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const handleMontoChange = (e) => setMonto(formatMonto(e.target.value));

    const buildShareText = () => {
        let text = `Pago Móvil: ${bank.banco} - ${bank.telefono} - ${bank.cedula}`;
        if (monto) text += ` - Monto: Bs. ${monto}`;
        return text;
    };

    const handleCopy = async () => {
        const text = buildShareText();
        try { 
            await navigator.clipboard.writeText(text); 
        } catch {
            const t = document.createElement('textarea'); 
            t.value = text;
            t.style.position = 'fixed';
            t.style.left = '-9999px';
            t.style.top = '0';
            t.style.opacity = '0';
            document.body.appendChild(t); 
            t.focus();
            t.select(); 
            document.execCommand('copy'); 
            document.body.removeChild(t);
        }
        setCopied(true); 
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        const text = buildShareText();
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Datos de Pago Móvil', text });
                setShared(true); setTimeout(() => setShared(false), 2000);
            } catch (err) { if (err.name !== 'AbortError') await handleCopy(); }
        } else { await handleCopy(); }
    };

    // ═══════ COMPACTA ═══════
    if (compact && !isExpanded) {
        return (
            <div
                className="card-glass card-sheen p-3.5 animate-fade-in-up relative overflow-hidden cursor-pointer press"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setIsExpanded(true)}
                role="button"
                tabIndex={0}
                aria-label={`Cuenta ${bank.banco}. Toca para expandir`}
            >
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent 0%, ${bankColor} 20%, ${bankColor} 80%, transparent 100%)` }} />
                <div className="flex flex-col items-center text-center pt-1.5">
                    <div className="w-14 h-14 mb-2 rounded-[18px] p-2 bg-white/[0.08] backdrop-blur-md border border-white/15 shadow-sm flex items-center justify-center">
                        {bankLogo && !logoError ? (
                            <img
                                src={bankLogo}
                                alt={bank.banco}
                                className="w-full h-full object-contain"
                                loading="lazy"
                                decoding="async"
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center rounded-[12px]" style={{ background: bankColor }}>
                                <span className="text-white font-bold text-sm tracking-tight">{bankInitials}</span>
                            </div>
                        )}
                    </div>
                    <h3 className="text-xs font-bold leading-tight mb-1 line-clamp-1 text-on-surface">{bank.banco}</h3>
                    <p className="text-[11px] truncate w-full text-outline font-mono">
                        {isMasked ? bank.telefono.replace(/(\d{4})\d{5}(\d{2})/, '$1•••$2') : bank.telefono}
                    </p>
                </div>
            </div>
        );
    }

    // ═══════ EXPANDIDA ═══════
    if (isExpanded) {
        return (
            <div
                className={`card-glass card-sheen animate-fade-in-up relative overflow-hidden ${compact ? 'p-4 col-span-full' : 'p-5'}`}
                style={{ animationDelay: `${index * 80}ms` }}
            >
                {/* Accent top stripe */}
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(90deg, transparent 0%, ${bankColor} 15%, ${bankColor} 85%, transparent 100%)` }} />

                {/* Top Action buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(bank); }}
                        className="press w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 text-primary"
                        aria-label="Editar cuenta"
                        title="Editar cuenta"
                    >
                        <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(bank.id); }}
                        className="press w-8 h-8 rounded-full flex items-center justify-center bg-tertiary-container/10 border border-tertiary-container/20 hover:bg-tertiary-container/20 text-tertiary"
                        aria-label="Eliminar cuenta"
                        title="Eliminar cuenta"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="animate-slide-down">
                    <div className="flex items-center gap-3.5 mb-4 mt-1 pr-20">
                        <div className="w-14 h-14 rounded-[18px] p-2 bg-white/[0.08] backdrop-blur-md border border-white/15 shadow-md flex items-center justify-center shrink-0">
                            {bankLogo && !logoError ? (
                                <img
                                    src={bankLogo}
                                    alt={bank.banco}
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                    decoding="async"
                                    onError={() => setLogoError(true)}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center rounded-[14px]" style={{ background: bankColor }}>
                                    <span className="text-white font-bold text-base">{bankInitials}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[17px] font-bold text-on-surface tracking-tight truncate">{bank.banco}</h3>
                            <span className="eyebrow text-[9px] py-0.5 px-2 mt-1">Pago Móvil</span>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                            className="press w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 text-outline"
                            aria-label="Colapsar detalles"
                            title="Colapsar"
                        >
                            <ChevronUpIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="divider-glass my-3" />

                    <div className="flex items-center justify-between mb-2.5 px-1">
                        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-outline">Datos de la cuenta</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMasked(!isMasked); }}
                            className="press text-[10px] flex items-center gap-1 font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full"
                        >
                            <span className="material-symbols-outlined text-[13px]">{isMasked ? 'visibility' : 'visibility_off'}</span>
                            {isMasked ? 'Mostrar' : 'Ocultar'}
                        </button>
                    </div>

                    <div className="space-y-2 mb-4">
                        {[
                            { 
                                icon: IdCardIcon, 
                                label: 'Cédula / RIF', 
                                value: isMasked ? bank.cedula.replace(/(\D?)\d+?(\d{3})$/, '$1••••$2') : bank.cedula 
                            }, 
                            { 
                                icon: PhoneIcon, 
                                label: 'Teléfono', 
                                value: isMasked ? bank.telefono.replace(/(\d{4})\d{5}(\d{2})/, '$1•••$2') : bank.telefono 
                            }
                        ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="well flex items-center gap-3 p-3 rounded-[14px]">
                                <Icon className="w-5 h-5 flex-shrink-0 text-primary" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-semibold text-outline uppercase tracking-wider">{label}</p>
                                    <p className={`font-bold text-[14px] text-on-surface truncate ${isMasked ? 'font-mono tracking-wider' : ''}`}>{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mb-4">
                        <label htmlFor={`bankcard-monto-${bank.id}`} className="block text-[11px] font-bold uppercase tracking-[0.12em] text-outline mb-1.5 pl-1">
                            Monto a cobrar (opcional)
                        </label>
                        <div className="well rounded-[16px] flex items-center px-4 h-12 focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(66,133,244,0.15)] transition-[border-color,box-shadow] duration-200">
                            <span className="font-bold text-outline mr-2 text-sm">Bs.</span>
                            <input
                                id={`bankcard-monto-${bank.id}`}
                                name="monto"
                                type="text"
                                value={monto}
                                onChange={handleMontoChange}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="0,00"
                                className="bg-transparent border-none focus:ring-0 outline-none text-on-surface font-bold text-base p-0 w-full placeholder:text-outline-variant/50"
                                inputMode="numeric"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                            className="press h-12 rounded-[16px] well font-bold text-xs flex items-center justify-center gap-1.5 text-on-surface hover:text-white"
                        >
                            {copied ? (
                                <>
                                    <CheckIcon className="w-4 h-4 text-green-400" />
                                    <span className="text-green-400 font-bold">¡Copiado!</span>
                                </>
                            ) : (
                                <>
                                    <CopyIcon className="w-4 h-4 text-outline" />
                                    <span>Copiar datos</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleShare(); }}
                            className="press h-12 rounded-[16px] thumb-primary font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                            <ShareIcon className="w-4 h-4" />
                            <span>Compartir</span>
                        </button>
                    </div>
                </div>

                {shared && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 py-2.5 rounded-full shadow-2xl font-bold text-xs z-20 animate-fade-in-up text-white bg-primary">
                        ✓ Compartido
                    </div>
                )}
            </div>
        );
    }

    // ═══════ NORMAL (Tarjeta de presentación táctil) ═══════
    return (
        <div
            className="card-glass card-sheen p-5 animate-fade-in-up relative overflow-hidden cursor-pointer press group"
            style={{ animationDelay: `${index * 80}ms` }}
            onClick={() => setIsExpanded(true)}
            role="button"
            tabIndex={0}
            aria-label={`Tarjeta ${bank.banco}. Toca para ver datos de Pago Móvil`}
        >
            {/* Accent top stripe with bank brand color */}
            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(90deg, transparent 0%, ${bankColor} 15%, ${bankColor} 85%, transparent 100%)` }} />

            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-[20px] p-2 bg-white/[0.08] backdrop-blur-md border border-white/15 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                        {bankLogo && !logoError ? (
                            <img
                                src={bankLogo}
                                alt={bank.banco}
                                className="w-full h-full object-contain"
                                loading="lazy"
                                decoding="async"
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center rounded-[14px]" style={{ background: bankColor }}>
                                <span className="text-white font-bold text-lg">{bankInitials}</span>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[17px] font-bold text-on-surface tracking-tight truncate">{bank.banco}</h3>
                        <p className="text-xs font-mono text-outline mt-0.5">
                            {isMasked ? bank.telefono.replace(/(\d{4})\d{5}(\d{2})/, '$1•••$2') : bank.telefono}
                        </p>
                        <span className="eyebrow text-[9px] py-0.5 px-2 mt-2">Pago Móvil</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                        className="press w-10 h-10 rounded-full well flex items-center justify-center text-outline hover:text-primary transition-colors"
                        title="Copiar datos rápidos"
                        aria-label="Copiar datos"
                    >
                        {copied ? (
                            <CheckIcon className="w-4 h-4 text-green-400" />
                        ) : (
                            <CopyIcon className="w-4 h-4" />
                        )}
                    </button>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-outline group-hover:translate-y-0.5 transition-transform duration-200">
                        <ChevronDownIcon className="w-5 h-5" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BankCard;
