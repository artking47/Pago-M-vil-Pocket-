import React, { useState } from 'react';
import { CurrencyFlag } from './FlagIcons';

const MAX_HISTORY = 8;
const STORAGE_KEY = 'pm_pocket_conversion_history';

// Lucide-style icons (strokeWidth 1.5)
const ClockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
);

const ChevronDownIcon = ({ isOpen }) => (
    <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

// Helpers
export function getConversionHistory() {
    try { const data = localStorage.getItem(STORAGE_KEY); return data ? JSON.parse(data) : []; } catch { return []; }
}

export function addConversionToHistory(entry) {
    try {
        const history = getConversionHistory();
        history.unshift({ ...entry, id: Date.now().toString(), timestamp: new Date().toISOString() });
        if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        return history;
    } catch { return []; }
}

export function clearConversionHistory() {
    localStorage.removeItem(STORAGE_KEY);
    return [];
}

function ConversionHistory({ history, onClear }) {
    const [isOpen, setIsOpen] = useState(true);

    if (!history || history.length === 0) return null;

    const formatTime = (iso) => {
        try { return new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }); } catch { return '--:--'; }
    };

    const formatDate = (iso) => {
        try {
            const d = new Date(iso);
            const today = new Date();
            if (d.toDateString() === today.toDateString()) return 'Hoy';
            const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
            if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
            return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
        } catch { return ''; }
    };

    return (
        <div className="mt-5 animate-fade-in-up">
            {/* Header */}
            <button onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-1 mb-3 group">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-dim">
                        <span className="text-emerald"><ClockIcon /></span>
                    </div>
                    <span className="text-sm font-semibold text-on-surface">Últimas conversiones</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium badge-glass">{history.length}</span>
                </div>
                <div className="flex items-center gap-1">
                    {isOpen && history.length > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="p-1.5 rounded-lg transition-colors text-outline hover:bg-error/10"
                            aria-label="Limpiar historial" title="Limpiar historial">
                            <TrashIcon />
                        </button>
                    )}
                    <span className="text-outline"><ChevronDownIcon isOpen={isOpen} /></span>
                </div>
            </button>

            {/* List */}
            <div className={`overflow-hidden transition-all duration-400 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-1.5">
                    {history.map((item, index) => (
                        <div key={item.id}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-white/[0.04]"
                            style={{ animationDelay: `${index * 50}ms` }}>
                            {/* Time */}
                            <div className="flex flex-col items-center min-w-[40px]">
                                <span className="text-[10px] font-medium leading-tight text-outline">{formatDate(item.timestamp)}</span>
                                <span className="text-[11px] font-semibold text-on-surface-variant">{formatTime(item.timestamp)}</span>
                            </div>
                            {/* Separator */}
                            <div className="w-px h-6 rounded-full bg-white/[0.08]" />
                            {/* From */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <CurrencyFlag code={item.fromCode} size={16} />
                                    <span className="text-sm font-semibold truncate text-on-surface">{item.fromAmount}</span>
                                    <span className="text-[10px] font-medium text-outline">{item.fromCode}</span>
                                </div>
                            </div>
                            {/* Arrow */}
                            <span className="text-emerald opacity-60"><ArrowRightIcon /></span>
                            {/* To */}
                            <div className="flex-1 min-w-0 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                    <span className="text-sm font-bold truncate text-emerald">{item.toAmount}</span>
                                    <span className="text-[10px] font-medium text-outline">{item.toCode}</span>
                                    <CurrencyFlag code={item.toCode} size={16} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ConversionHistory;
