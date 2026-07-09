import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import useRates from '../hooks/useRates';

// ── Calendar helpers ──
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

function formatDateStr(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseDateStr(str) {
    const [y, m, d] = str.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
}

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_ES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

// ── Custom Tooltip for Recharts ──
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div className="glass-surface rounded-xl p-3 border border-white/10 shadow-2xl text-xs" style={{ backdropFilter: 'blur(20px)' }}>
            <p className="text-outline font-semibold mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 mb-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                    <span className="text-on-surface font-medium">{entry.name}:</span>
                    <span className="text-primary font-bold">Bs. {entry.value?.toFixed(2)}</span>
                </div>
            ))}
        </div>
    );
}

// ── Range selector pills ──
const RANGES = [
    { label: '7D', days: 7 },
    { label: '15D', days: 15 },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
];

function RateHistoryChart() {
    const { historicalData, getRatesForDate, getAvailableDates } = useRates();

    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedDateRates, setSelectedDateRates] = useState(null);
    const [chartRange, setChartRange] = useState(30);
    const [showCalendar, setShowCalendar] = useState(true);

    // Available dates set for calendar dots
    const availableDatesSet = useMemo(() => {
        return new Set(getAvailableDates());
    }, [historicalData, getAvailableDates]);

    // Chart data — last N days
    const chartData = useMemo(() => {
        if (!historicalData || historicalData.length === 0) return [];

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - chartRange);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        // Group by date, merge oficial + paralelo
        const dateMap = {};
        historicalData
            .filter(d => d.fecha >= cutoffStr)
            .forEach(d => {
                if (!dateMap[d.fecha]) dateMap[d.fecha] = { fecha: d.fecha };
                if (d.fuente === 'oficial') dateMap[d.fecha].bcv = d.promedio;
                if (d.fuente === 'paralelo') dateMap[d.fecha].paralelo = d.promedio;
            });

        return Object.values(dateMap)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .map(d => ({
                ...d,
                label: new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
            }));
    }, [historicalData, chartRange]);

    // Calendar navigation
    const goToPrevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
        else setViewMonth(viewMonth - 1);
    };

    const goToNextMonth = () => {
        const today = new Date();
        if (viewYear === today.getFullYear() && viewMonth >= today.getMonth()) return;
        if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
        else setViewMonth(viewMonth + 1);
    };

    const handleDayClick = useCallback((day) => {
        const dateStr = formatDateStr(viewYear, viewMonth, day);
        const rates = getRatesForDate(dateStr);
        setSelectedDate(dateStr);
        setSelectedDateRates(rates);
    }, [viewYear, viewMonth, getRatesForDate]);

    // Build calendar grid
    const calendarGrid = useMemo(() => {
        const daysInMonth = getDaysInMonth(viewYear, viewMonth);
        const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
        const cells = [];
        const todayStr = new Date().toISOString().split('T')[0];

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`empty-${i}`} className="h-10" />);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = formatDateStr(viewYear, viewMonth, d);
            const hasData = availableDatesSet.has(dateStr);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;

            cells.push(
                <button
                    key={d}
                    disabled={isFuture}
                    onClick={() => hasData && handleDayClick(d)}
                    className={`
                        h-10 rounded-xl text-xs font-semibold relative
                        transition-all duration-200 active:scale-90
                        ${isSelected
                            ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-lg shadow-primary/30 scale-105'
                            : isToday
                                ? 'bg-secondary/20 text-secondary border border-secondary/30'
                                : hasData
                                    ? 'bg-white/[0.04] text-on-surface hover:bg-white/[0.08] cursor-pointer'
                                    : isFuture
                                        ? 'text-outline-variant/30 cursor-not-allowed'
                                        : 'text-outline-variant/50'
                        }
                    `}
                >
                    {d}
                    {hasData && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                </button>
            );
        }

        return cells;
    }, [viewYear, viewMonth, availableDatesSet, selectedDate, handleDayClick]);

    // Determine if next month is disabled
    const isNextDisabled = viewYear === now.getFullYear() && viewMonth >= now.getMonth();

    // Rate change indicator
    const getRateChange = (current, previous) => {
        if (!current || !previous || previous === 0) return { diff: 0, pct: 0, direction: 'none' };
        const diff = current - previous;
        const pct = (diff / previous) * 100;
        return {
            diff: Math.abs(diff).toFixed(4),
            pct: Math.abs(pct).toFixed(2),
            direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'none',
        };
    };

    return (
        <div className="space-y-4 animate-fade-in-up">
            {/* ── Chart Section ── */}
            <article className="glass-surface rounded-2xl p-md">
                {/* Chart Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                        </div>
                        <div>
                            <h3 className="text-on-surface font-h3 text-h3 leading-none">Tendencia</h3>
                            <p className="text-[12px] text-outline">Evolución del dólar</p>
                        </div>
                    </div>
                </div>

                {/* Range Selector */}
                <div className="flex gap-1.5 mb-4">
                    {RANGES.map(r => (
                        <button
                            key={r.days}
                            onClick={() => setChartRange(r.days)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95
                                ${chartRange === r.days
                                    ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/20'
                                    : 'bg-white/5 text-outline hover:text-on-surface hover:bg-white/10'
                                }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {/* Chart */}
                {chartData.length > 0 ? (
                    <div className="h-52 -mx-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradBcv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4285F4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4285F4" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradParalelo" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F5C518" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#F5C518" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: '#8891b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#8891b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={['auto', 'auto']}
                                    tickFormatter={v => v.toFixed(1)}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="bcv"
                                    name="BCV Oficial"
                                    stroke="#4285F4"
                                    strokeWidth={2.5}
                                    fill="url(#gradBcv)"
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 2, fill: '#4285F4' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="paralelo"
                                    name="Paralelo"
                                    stroke="#F5C518"
                                    strokeWidth={2}
                                    fill="url(#gradParalelo)"
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 2, fill: '#F5C518' }}
                                    strokeDasharray="5 3"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-52 flex items-center justify-center text-outline text-sm">
                        <div className="text-center space-y-2">
                            <span className="material-symbols-outlined text-3xl text-outline-variant">hourglass_empty</span>
                            <p>Cargando datos históricos...</p>
                        </div>
                    </div>
                )}
            </article>

            {/* ── Calendar Section ── */}
            <article className="glass-surface rounded-2xl p-md">
                {/* Calendar Header */}
                <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="w-full flex items-center justify-between mb-3"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                        </div>
                        <div className="text-left">
                            <h3 className="text-on-surface font-h3 text-h3 leading-none">Calendario</h3>
                            <p className="text-[12px] text-outline">Consulta tasas por fecha</p>
                        </div>
                    </div>
                    <span className={`material-symbols-outlined text-outline transition-transform duration-300 ${showCalendar ? 'rotate-180' : ''}`}>
                        expand_more
                    </span>
                </button>

                <div className={`overflow-hidden transition-all duration-400 ease-in-out ${showCalendar ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-3 px-1">
                        <button
                            onClick={goToPrevMonth}
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-outline hover:text-on-surface hover:bg-white/10 transition-all active:scale-90"
                        >
                            <span className="material-symbols-outlined text-lg">chevron_left</span>
                        </button>
                        <h4 className="text-on-surface font-semibold text-sm tracking-wide">
                            {MONTHS_ES[viewMonth]} {viewYear}
                        </h4>
                        <button
                            onClick={goToNextMonth}
                            disabled={isNextDisabled}
                            className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-all active:scale-90
                                ${isNextDisabled ? 'text-outline-variant/30 cursor-not-allowed' : 'text-outline hover:text-on-surface hover:bg-white/10'}`}
                        >
                            <span className="material-symbols-outlined text-lg">chevron_right</span>
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {DAYS_ES.map(day => (
                            <div key={day} className="h-8 flex items-center justify-center text-[10px] font-bold text-outline uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarGrid}
                    </div>

                    {/* Selected Date Detail */}
                    {selectedDate && (
                        <div className="mt-4 animate-slide-down">
                            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-lg">event</span>
                                        <span className="text-on-surface font-bold text-sm">
                                            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-VE', {
                                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedDate(null); setSelectedDateRates(null); }}
                                        className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-outline hover:text-on-surface transition-all active:scale-90"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>

                                {selectedDateRates ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* BCV Rate */}
                                        <div className="bg-white/[0.04] rounded-xl p-3 border-l-2 border-l-primary">
                                            <p className="text-[10px] text-outline font-bold uppercase tracking-wider mb-1">BCV Oficial</p>
                                            <p className="text-primary font-bold text-lg">
                                                Bs. {selectedDateRates.oficial?.toFixed(2) || '—'}
                                            </p>
                                        </div>
                                        {/* Paralelo Rate */}
                                        <div className="bg-white/[0.04] rounded-xl p-3 border-l-2 border-l-secondary">
                                            <p className="text-[10px] text-outline font-bold uppercase tracking-wider mb-1">Paralelo</p>
                                            <p className="text-secondary font-bold text-lg">
                                                Bs. {selectedDateRates.paralelo?.toFixed(2) || '—'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-outline text-sm">
                                        <span className="material-symbols-outlined text-2xl text-outline-variant mb-1 block">event_busy</span>
                                        No hay datos disponibles para esta fecha
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </article>
        </div>
    );
}

export default RateHistoryChart;
