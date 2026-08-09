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
        try { await navigator.clipboard.writeText(text); } catch {
            const t = document.createElement('textarea'); t.value = text;
            document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
        }
        setCopied(true); setTimeout(() => setCopied(false), 2000);
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
            <div className="card-glass p-3 animate-fade-in-up relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                style={{ animationDelay: `${index * 60}ms` }}
                onClick={() => setIsExpanded(true)}>
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: bankColor }} />
                <div className="flex flex-col items-center text-center pt-1">
                    <div className="w-14 h-14 mb-2 logo-glass rounded-xl shadow-sm">
                        {bankLogo && !logoError ? (
                            <img src={bankLogo} alt={bank.banco} className="w-full h-full object-contain p-1.5"
                                loading="lazy" decoding="async" onError={() => setLogoError(true)} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center rounded-xl" style={{ background: bankColor }}>
                                <span className="text-white font-bold text-base">{bankInitials}</span>
                            </div>
                        )}
                    </div>
                    <h3 className="text-xs font-bold leading-tight mb-1 line-clamp-2 text-on-surface">{bank.banco}</h3>
                    <p className="text-[10px] truncate w-full text-outline font-mono">
                        {isMasked ? bank.telefono.replace(/(\d{4})\d{5}(\d{2})/, '$1•••$2') : bank.telefono}
                    </p>
                </div>
            </div>
        );
    }

    // ═══════ EXPANDIDA ═══════
    if (isExpanded) {
        return (
            <div className={`card-glass animate-fade-in-up relative overflow-hidden ${compact ? 'p-4 col-span-full' : 'p-5'}`}
                style={{ animationDelay: `${index * 100}ms` }}>
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: bankColor }} />

                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(bank); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-white/5 hover:bg-white/10"
                        aria-label="Editar">
                        <EditIcon className="w-4 h-4 text-emerald" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(bank.id); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-danger-dim hover:bg-error/20"
                        aria-label="Eliminar">
                        <XIcon className="w-4 h-4 text-coral" />
                    </button>
                </div>

                <div className="animate-slide-down">
                    <div className="flex items-center gap-4 mb-4 mt-1">
                        <div className="w-14 h-14 logo-glass rounded-xl shadow-md">
                            {bankLogo && !logoError ? (
                                <img src={bankLogo} alt={bank.banco} className="w-full h-full object-contain p-2"
                                    loading="lazy" decoding="async" onError={() => setLogoError(true)} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center rounded-xl" style={{ background: bankColor }}>
                                    <span className="text-white font-bold text-lg">{bankInitials}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-on-surface">{bank.banco}</h3>
                            <span className="badge-glass text-xs mt-1">Pago Móvil</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                            className="w-8 h-8 rounded-lg transition-colors flex items-center justify-center hover:bg-white/5"
                            aria-label="Colapsar">
                            <ChevronUpIcon className="w-5 h-5 text-outline" />
                        </button>
                    </div>

                    <div className="divider-glass" />

                    <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-xs font-semibold text-on-surface-variant">Datos de la cuenta</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMasked(!isMasked); }}
                            className="text-[10px] flex items-center gap-1 font-bold text-emerald bg-emerald-dim px-2 py-1 rounded-full active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined text-[12px]">{isMasked ? 'visibility' : 'visibility_off'}</span>
                            {isMasked ? 'Mostrar' : 'Ocultar'}
                        </button>
                    </div>

                    <div className="space-y-2.5 mb-4">
                        {[
                            { 
                                icon: IdCardIcon, 
                                label: 'Cédula', 
                                value: isMasked ? bank.cedula.replace(/(\D?)\d+?(\d{3})$/, '$1••••$2') : bank.cedula 
                            }, 
                            { 
                                icon: PhoneIcon, 
                                label: 'Teléfono', 
                                value: isMasked ? bank.telefono.replace(/(\d{4})\d{5}(\d{2})/, '$1•••$2') : bank.telefono 
                            }
                        ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.04]">
                                <Icon className="w-5 h-5 flex-shrink-0 text-emerald" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-outline">{label}</p>
                                    <p className={`data-value truncate ${isMasked ? 'font-mono tracking-wider text-sm' : ''}`}>{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mb-4">
                        <label htmlFor={`bankcard-monto-${bank.id}`} className="block text-sm font-medium mb-2 text-on-surface-variant">Monto (opcional)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-outline">Bs.</span>
                            <input id={`bankcard-monto-${bank.id}`} name="monto" type="text" value={monto}
                                onChange={handleMontoChange} onClick={(e) => e.stopPropagation()}
                                placeholder="0,00" className="input-glass pl-12 text-lg font-semibold" inputMode="numeric" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="btn-glass btn-glass-secondary flex items-center justify-center gap-2">
                            {copied ? <><CheckIcon className="w-5 h-5" /><span>¡Copiado!</span></> : <><CopyIcon className="w-5 h-5" /><span>Copiar</span></>}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="btn-glass btn-glass-primary flex items-center justify-center gap-2">
                            <ShareIcon className="w-5 h-5" /><span>Compartir</span>
                        </button>
                    </div>
                </div>

                {shared && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-3 rounded-xl shadow-2xl font-semibold z-20 animate-fade-in-up text-white bg-primary">
                        ✓ Compartido
                    </div>
                )}
            </div>
        );
    }

    // ═══════ NORMAL ═══════
    return (
        <div className="card-glass p-6 animate-fade-in-up relative overflow-hidden cursor-pointer"
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => setIsExpanded(true)}>
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: bankColor }} />
            <div className="flex flex-col items-center justify-center py-8 animate-gentle-float">
                <div className="w-28 h-28 mb-5 logo-glass rounded-2xl shadow-lg transform transition-transform duration-300 hover:scale-105">
                    {bankLogo && !logoError ? (
                        <img src={bankLogo} alt={bank.banco} className="w-full h-full object-contain p-4"
                            loading="lazy" decoding="async" onError={() => setLogoError(true)} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center rounded-2xl" style={{ background: bankColor }}>
                            <span className="text-white font-bold text-3xl">{bankInitials}</span>
                        </div>
                    )}
                </div>
                <h3 className="text-xl font-bold text-center mb-2 text-on-surface">{bank.banco}</h3>
                <p className="text-sm flex items-center gap-2 text-outline">
                    <ChevronDownIcon className="w-4 h-4" />
                    Toca para ver detalles
                </p>
            </div>
        </div>
    );
}

export default BankCard;
