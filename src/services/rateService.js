/**
 * Rate Service — Centralized rate management with real-time updates
 * Connects to the local Express backend via SSE for instant updates
 */

const HISTORY_CACHE_KEY = 'pm_pocket_historical_rates';
const LIVE_CACHE_KEY = 'pm_pocket_rates_cache';

// Venezuela timezone helper
export function getVenezuelaDateStr(offset = 0) {
    const now = new Date();
    const vzNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    vzNow.setDate(vzNow.getDate() + offset);
    const y = vzNow.getFullYear();
    const m = String(vzNow.getMonth() + 1).padStart(2, '0');
    const d = String(vzNow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

class RateService {
    constructor() {
        this._emitter = new EventTarget();
        this._todayRates = { oficial: 0, paralelo: 0, usdtCompra: 0, usdtVenta: 0, eur: 0, cop: 0, pen: 0 };
        this._tomorrowRates = { oficial: 0, paralelo: 0, usdtCompra: 0, usdtVenta: 0, eur: 0, cop: 0, pen: 0 };
        this._previousRates = { oficial: 0, paralelo: 0 };
        this._hasTomorrowRate = false;
        this._lastUpdate = null;
        this._loading = true;
        this._historicalData = [];
        this._started = false;
        this._eventSource = null;
    }

    // ── Event system ──
    on(event, handler) {
        this._emitter.addEventListener(event, handler);
        return () => this._emitter.removeEventListener(event, handler);
    }

    _emit(event, detail) {
        this._emitter.dispatchEvent(new CustomEvent(event, { detail }));
    }

    // ── Getters ──
    get todayRates() { return { ...this._todayRates }; }
    get tomorrowRates() { return { ...this._tomorrowRates }; }
    get previousRates() { return { ...this._previousRates }; }
    get hasTomorrowRate() { return this._hasTomorrowRate; }
    get lastUpdate() { return this._lastUpdate; }
    get loading() { return this._loading; }
    get historicalData() { return [...this._historicalData]; }

    // ── Start Service ──
    start() {
        if (this._started) return;
        this._started = true;
        this._loadCached();
        this.fetchLiveRates(); // Initial fetch
        this.fetchHistoricalRates();
        this.connectBackend();
    }

    stop() {
        this._started = false;
        if (this._eventSource) {
            this._eventSource.close();
            this._eventSource = null;
        }
    }

    // ── Load cached data ──
    _loadCached() {
        try {
            const cached = JSON.parse(localStorage.getItem(LIVE_CACHE_KEY));
            if (cached?.todayRates) {
                this._todayRates = cached.todayRates;
                this._tomorrowRates = cached.tomorrowRates || cached.todayRates;
                this._hasTomorrowRate = cached.hasTomorrowRate || false;
                this._lastUpdate = cached.timestamp;
            }
        } catch { /* ignore */ }

        try {
            const hist = JSON.parse(localStorage.getItem(HISTORY_CACHE_KEY));
            if (Array.isArray(hist) && hist.length > 0) {
                this._historicalData = hist;
            }
        } catch { /* ignore */ }
    }

    _getPreviousBusinessDayStr(fromDateStr) {
        const d = new Date(fromDateStr + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        while (d.getDay() === 0 || d.getDay() === 6) {
            d.setDate(d.getDate() - 1);
        }
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }

    // ── Backend connection (HTTP Polling) ──
    connectBackend() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
        }

        const fetchLiveRates = async () => {
            try {
                // In Netlify, it routes to /.netlify/functions/rates
                // For local dev without Netlify CLI, it might fail, but it's meant for production.
                // We will point to the absolute path just in case.
                const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? '/.netlify/functions/rates' // or mock if needed
                    : '/.netlify/functions/rates';
                    
                const res = await fetch(apiUrl);
                if (res.ok) {
                    const data = await res.json();
                    this._processBackendData(data);
                }
            } catch (err) {
                console.warn('Backend polling error:', err);
            }
        };

        // Fetch immediately
        fetchLiveRates();
        
        // Then poll every 30 seconds
        this._pollingInterval = setInterval(fetchLiveRates, 30000);
    }

    // ── Process Backend Data ──
    async _processBackendData(backendData) {
        const todayStr = getVenezuelaDateStr(0);
        
        this._previousRates = {
            oficial: this._todayRates.oficial,
            paralelo: this._todayRates.paralelo,
        };

        let newTodayRates = { oficial: 0, paralelo: 0, eur: 0, cop: 0, pen: 0 };
        let newTomorrowRates = { oficial: 0, paralelo: 0, eur: 0, cop: 0, pen: 0 };
        let foundTomorrow = false;

        // Get today's effective rate from history
        let historicalTodayRate = 0;
        let historicalYesterdayRate = 0;

        if (this._historicalData.length > 0) {
            const oficialRates = this._historicalData
                .filter(d => d.fuente === 'oficial')
                .sort((a, b) => a.fecha.localeCompare(b.fecha));

            const todayEntry = oficialRates.find(d => d.fecha === todayStr);
            if (todayEntry) historicalTodayRate = todayEntry.promedio;

            const prevBizDay = this._getPreviousBusinessDayStr(todayStr);
            const prevEntry = oficialRates.find(d => d.fecha === prevBizDay);
            if (prevEntry) historicalYesterdayRate = prevEntry.promedio;

            if (historicalTodayRate === 0 && oficialRates.length > 0) {
                historicalTodayRate = oficialRates[oficialRates.length - 1].promedio;
            }
        }

        // Live Rates from Backend
        const liveOficialRate = backendData.oficial;
        const liveOficialDate = backendData.oficialDate;
        const liveParaleloRate = backendData.paralelo;
        const usdtCompra = backendData.usdtCompra || 0;
        const usdtVenta = backendData.usdtVenta || 0;

        newTodayRates.paralelo = liveParaleloRate;
        newTomorrowRates.paralelo = liveParaleloRate;
        newTodayRates.usdtCompra = usdtCompra;
        newTodayRates.usdtVenta = usdtVenta;
        newTomorrowRates.usdtCompra = usdtCompra;
        newTomorrowRates.usdtVenta = usdtVenta;
        
        newTodayRates.oficial = historicalTodayRate > 0 ? historicalTodayRate : liveOficialRate;

        if (liveOficialRate > 0) {
            if (liveOficialDate >= todayStr) {
                newTomorrowRates.oficial = liveOficialRate;
                foundTomorrow = true;
            } else if (liveOficialRate !== historicalYesterdayRate && historicalYesterdayRate > 0) {
                newTomorrowRates.oficial = liveOficialRate;
                foundTomorrow = true;
            }
            
            if (newTodayRates.oficial === 0) {
                newTodayRates.oficial = liveOficialRate;
            }
        }

        // Cross rates from external API (only updated on full fetch or when needed)
        // For SSE updates, we use previous cross rates and recalculate them based on the new official rate
        try {
            const eurRes = await fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json());
            if (eurRes?.rates) {
                const eurToUsd = eurRes.rates.EUR;
                const usdToCop = eurRes.rates.COP;
                const usdToPen = eurRes.rates.PEN;

                if (newTodayRates.oficial > 0) {
                    if (eurToUsd) newTodayRates.eur = newTodayRates.oficial / eurToUsd;
                    if (usdToCop) newTodayRates.cop = usdToCop;
                    if (usdToPen) newTodayRates.pen = usdToPen;
                }
                if (newTomorrowRates.oficial > 0) {
                    if (eurToUsd) newTomorrowRates.eur = newTomorrowRates.oficial / eurToUsd;
                    if (usdToCop) newTomorrowRates.cop = usdToCop;
                    if (usdToPen) newTomorrowRates.pen = usdToPen;
                }
            }
        } catch (e) {
            // Keep old cross rates if fetch fails
            newTodayRates.eur = this._todayRates.eur;
            newTodayRates.cop = this._todayRates.cop;
            newTodayRates.pen = this._todayRates.pen;
            newTomorrowRates.eur = this._tomorrowRates.eur;
            newTomorrowRates.cop = this._tomorrowRates.cop;
            newTomorrowRates.pen = this._tomorrowRates.pen;
        }

        this._todayRates = newTodayRates;
        this._tomorrowRates = newTomorrowRates;
        this._hasTomorrowRate = foundTomorrow;
        this._lastUpdate = Date.now();
        this._loading = false;

        localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({
            todayRates: newTodayRates,
            tomorrowRates: newTomorrowRates,
            hasTomorrowRate: foundTomorrow,
            timestamp: Date.now(),
        }));

        this._emit('ratesUpdated', {
            todayRates: newTodayRates,
            tomorrowRates: newTomorrowRates,
            hasTomorrowRate: foundTomorrow,
            previousRates: this._previousRates,
        });
        this._emit('loading', false);
    }

    // ── Fetch live rates manually ──
    async fetchLiveRates() {
        this._loading = true;
        this._emit('loading', true);
        try {
            const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? '/.netlify/functions/rates'
                : '/.netlify/functions/rates';
            const res = await fetch(apiUrl);
            if (res.ok) {
                const data = await res.json();
                await this._processBackendData(data);
            }
        } catch (err) {
            this._loadCached();
            this._emit('error', err);
            this._emit('loading', false);
        }
    }

    // ── Fetch historical rates ──
    async fetchHistoricalRates() {
        try {
            const res = await fetch('https://ve.dolarapi.com/v1/historicos/dolares');
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                this._historicalData = data;
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 90);
                const cutoffStr = cutoff.toISOString().split('T')[0];
                const recent = data.filter(d => d.fecha >= cutoffStr);
                localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(recent));

                this._emit('historicalUpdated', recent);
                // After getting history, re-fetch live to update today/tomorrow logic
                this.fetchLiveRates();
            }
        } catch {
            this._emit('historicalUpdated', this._historicalData);
        }
    }

    getRatesForDate(dateStr) {
        const dayData = this._historicalData.filter(d => d.fecha === dateStr);
        if (dayData.length === 0) return null;

        const result = { fecha: dateStr };
        dayData.forEach(d => {
            if (d.fuente === 'oficial') result.oficial = d.promedio;
            if (d.fuente === 'paralelo') result.paralelo = d.promedio;
        });
        return result;
    }

    getAvailableDates() {
        const dates = new Set();
        this._historicalData.forEach(d => dates.add(d.fecha));
        return [...dates].sort();
    }
}

export const rateService = new RateService();
export default rateService;
