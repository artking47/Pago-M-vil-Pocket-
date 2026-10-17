/**
 * Rate Service: Centralized rate management with real-time updates
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

// Get Venezuela day of week (0=Sunday, 6=Saturday)
export function getVenezuelaDayOfWeek() {
    const now = new Date();
    const vzNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    return vzNow.getDay();
}

// Get the effective "today" date for BCV rates:
// On weekends, Friday's rate stays in effect, so we return last Friday's date.
export function getEffectiveTodayDateStr() {
    const now = new Date();
    const vzNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    const day = vzNow.getDay();
    // Saturday (6) → go back 1 day to Friday
    // Sunday (0) → go back 2 days to Friday
    if (day === 6) vzNow.setDate(vzNow.getDate() - 1);
    else if (day === 0) vzNow.setDate(vzNow.getDate() - 2);
    const y = vzNow.getFullYear();
    const m = String(vzNow.getMonth() + 1).padStart(2, '0');
    const d = String(vzNow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Get the next business day date string (for "mañana" rates):
// From Monday-Thursday → next calendar day
// From Friday → Monday (+3)
// From Saturday → Monday (+2)
// From Sunday → Monday (+1)
export function getNextBusinessDayDateStr() {
    const now = new Date();
    const vzNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    const day = vzNow.getDay();
    let daysToAdd = 1;
    if (day === 5) daysToAdd = 3;      // Friday → Monday
    else if (day === 6) daysToAdd = 2;  // Saturday → Monday
    else if (day === 0) daysToAdd = 1;  // Sunday → Monday
    vzNow.setDate(vzNow.getDate() + daysToAdd);
    const y = vzNow.getFullYear();
    const m = String(vzNow.getMonth() + 1).padStart(2, '0');
    const d = String(vzNow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

class RateService {
    constructor() {
        this._emitter = new EventTarget();
        this._todayRates = { oficial: 0, oficialDate: null, usdt: 0, usdtCompra: 0, usdtVenta: 0, eur: 0, cop: 0, pen: 0, paralelo: 0 };
        this._tomorrowRates = { oficial: 0, oficialDate: null, usdt: 0, usdtCompra: 0, usdtVenta: 0, eur: 0, cop: 0, pen: 0, paralelo: 0 };
        this._previousRates = { oficial: 0, usdt: 0, paralelo: 0 };
        this._hasTomorrowRate = false;
        this._lastUpdate = null;
        this._loading = true;
        this._historicalData = [];
        this._started = false;
        this._pollingInterval = null;
        // Cross-rate cache (EUR, COP, PEN): refreshed once per hour
        this._crossRateCache = null;
        this._crossRateCacheTime = 0;
        this._fetchingLive = false; // guard against concurrent fetches
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

    // ── Start Service ── Single init flow: cache → historical → live → poll
    start() {
        if (this._started) return;
        this._started = true;
        this._loadCached();
        // Single init flow: fetch historical first, which then triggers fetchLiveRates
        this.fetchHistoricalRates();
        this._startPolling();
    }

    stop() {
        this._started = false;
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }
    }

    // ── Load cached data ──
    _loadCached() {
        try {
            const cached = JSON.parse(localStorage.getItem(LIVE_CACHE_KEY));
            if (cached?.todayRates && cached.todayRates.oficial > 0) {
                this._todayRates = cached.todayRates;
                this._tomorrowRates = cached.tomorrowRates || cached.todayRates;
                this._hasTomorrowRate = cached.hasTomorrowRate || false;
                this._lastUpdate = cached.timestamp;
            } else {
                localStorage.removeItem(LIVE_CACHE_KEY);
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

    // ── Polling (every 3 minutes, BCV rates change once daily) ──
    _startPolling() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
        }
        // Poll every 3 minutes (180000ms) instead of 30s to avoid API rate limiting
        this._pollingInterval = setInterval(() => {
            this.fetchLiveRates();
        }, 180000);
    }

    // ── Process Backend Data ──
    async _processBackendData(backendData) {
        const calendarTodayStr = getVenezuelaDateStr(0);
        const effectiveTodayStr = getEffectiveTodayDateStr();
        const nextBizDayStr = getNextBusinessDayDateStr();
        const dayOfWeek = getVenezuelaDayOfWeek();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // BUG-03 fix: Only save previousRates when current rates are valid and different
        if (this._todayRates.oficial > 0) {
            this._previousRates = {
                oficial: this._todayRates.oficial,
                usdt: this._todayRates.usdt || this._todayRates.paralelo,
                paralelo: this._todayRates.usdt || this._todayRates.paralelo,
            };
        }

        let newTodayRates = { oficial: 0, oficialDate: null, usdt: 0, usdtCompra: 0, usdtVenta: 0, eur: 0, cop: 0, pen: 0, paralelo: 0 };
        let newTomorrowRates = { oficial: 0, oficialDate: null, usdt: 0, usdtCompra: 0, usdtVenta: 0, eur: 0, cop: 0, pen: 0, paralelo: 0 };
        let foundTomorrow = false;

        // Get today's effective rate from history
        // On weekends, "today" is Friday's rate (the last business day)
        let historicalTodayRate = 0;
        let historicalYesterdayRate = 0;

        if (this._historicalData.length > 0) {
            const oficialRates = this._historicalData
                .filter(d => d.fuente === 'oficial')
                .sort((a, b) => a.fecha.localeCompare(b.fecha));

            // Use effective date (Friday on weekends) to find today's rate
            const todayEntry = oficialRates.find(d => d.fecha === effectiveTodayStr);
            if (todayEntry) historicalTodayRate = todayEntry.promedio;

            const prevBizDay = this._getPreviousBusinessDayStr(effectiveTodayStr);
            const prevEntry = oficialRates.find(d => d.fecha === prevBizDay);
            if (prevEntry) historicalYesterdayRate = prevEntry.promedio;

            if (historicalTodayRate === 0 && oficialRates.length > 0) {
                historicalTodayRate = oficialRates[oficialRates.length - 1].promedio;
            }
        }

        // Live Rates from Backend
        let liveOficialRate = backendData.oficial || 0;
        let liveOficialDate = backendData.oficialDate || effectiveTodayStr;
        let usdtCompra = backendData.usdtCompra || 0;
        let usdtVenta = backendData.usdtVenta || 0;
        let usdtAvg = backendData.usdt || ((usdtCompra > 0 && usdtVenta > 0) ? (usdtCompra + usdtVenta) / 2 : (usdtCompra || usdtVenta || backendData.paralelo || 0));

        // Client-side fallback if backend failed to get official rate
        if (liveOficialRate === 0) {
            try {
                const ctrl = new AbortController();
                const to = setTimeout(() => ctrl.abort(), 4000);
                const directRes = await fetch('https://rates.dolarvzla.com/bcv/current.json', { signal: ctrl.signal }).then(r => r.ok ? r.json() : null);
                clearTimeout(to);
                const current = directRes?.current;
                const previous = directRes?.previous;
                if (current?.usd) {
                    if (previous?.usd && current?.date && current.date > calendarTodayStr) {
                        liveOficialRate = previous.usd;
                        liveOficialDate = previous.date;
                        newTomorrowRates.oficial = current.usd;
                        newTomorrowRates.oficialDate = current.date;
                        foundTomorrow = true;
                        if (previous.eur) newTodayRates.eur = previous.eur;
                        if (current.eur) newTomorrowRates.eur = current.eur;
                    } else {
                        liveOficialRate = current.usd;
                        liveOficialDate = current.date;
                        if (current.eur) newTodayRates.eur = current.eur;
                    }
                }
            } catch (e) {
                try {
                    const ctrl = new AbortController();
                    const to = setTimeout(() => ctrl.abort(), 4000);
                    const dApiRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: ctrl.signal }).then(r => r.ok ? r.json() : null);
                    clearTimeout(to);
                    if (dApiRes?.promedio) {
                        liveOficialRate = dApiRes.promedio;
                        liveOficialDate = dApiRes.fecha || calendarTodayStr;
                    }
                } catch (e2) {}
            }
        }

        newTodayRates.oficial = liveOficialRate > 0 ? liveOficialRate : historicalTodayRate;
        newTodayRates.oficialDate = liveOficialDate;
        newTodayRates.usdt = usdtAvg;
        newTodayRates.usdtCompra = usdtCompra || usdtAvg;
        newTodayRates.usdtVenta = usdtVenta || usdtAvg;
        newTodayRates.paralelo = usdtAvg;
        if (backendData.eur > 0) newTodayRates.eur = backendData.eur;

        // Determine tomorrow rate
        if (backendData.hasTomorrowRate && backendData.oficialNext > 0) {
            newTomorrowRates.oficial = backendData.oficialNext;
            newTomorrowRates.oficialDate = backendData.oficialDateNext;
            newTomorrowRates.eur = backendData.eurNext || newTodayRates.eur;
            foundTomorrow = true;
        } else if (!foundTomorrow) {
            if (isWeekend) {
                if (liveOficialDate >= nextBizDayStr) {
                    newTomorrowRates.oficial = liveOficialRate;
                    newTomorrowRates.oficialDate = liveOficialDate;
                    foundTomorrow = true;
                } else {
                    newTomorrowRates.oficial = 0;
                    foundTomorrow = false;
                }
            } else {
                if (liveOficialDate > calendarTodayStr) {
                    newTomorrowRates.oficial = liveOficialRate;
                    newTomorrowRates.oficialDate = liveOficialDate;
                    foundTomorrow = true;
                } else {
                    newTomorrowRates.oficial = 0;
                    foundTomorrow = false;
                }
            }
        }

        newTomorrowRates.usdt = newTodayRates.usdt;
        newTomorrowRates.usdtCompra = newTodayRates.usdtCompra;
        newTomorrowRates.usdtVenta = newTodayRates.usdtVenta;
        newTomorrowRates.paralelo = newTodayRates.usdt;
        if (newTomorrowRates.eur === 0) newTomorrowRates.eur = newTodayRates.eur;

        // Cross rates: cached for 1 hour to avoid API rate limiting
        const crossRates = await this._getCrossRates();
        if (crossRates) {
            if (newTodayRates.oficial > 0) {
                if (crossRates.EUR) newTodayRates.eur = newTodayRates.oficial / crossRates.EUR;
                if (crossRates.COP) newTodayRates.cop = crossRates.COP;
                if (crossRates.PEN) newTodayRates.pen = crossRates.PEN;
            }
            if (newTomorrowRates.oficial > 0) {
                if (crossRates.EUR) newTomorrowRates.eur = newTomorrowRates.oficial / crossRates.EUR;
                if (crossRates.COP) newTomorrowRates.cop = crossRates.COP;
                if (crossRates.PEN) newTomorrowRates.pen = crossRates.PEN;
            }
        } else {
            // Keep old cross rates if fetch fails
            newTodayRates.eur = this._todayRates.eur;
            newTodayRates.cop = this._todayRates.cop;
            newTodayRates.pen = this._todayRates.pen;
            newTomorrowRates.eur = this._tomorrowRates.eur;
            newTomorrowRates.cop = this._tomorrowRates.cop;
            newTomorrowRates.pen = this._tomorrowRates.pen;
        }

        // Protect against zero-wiping cached rates
        if (newTodayRates.oficial === 0 && this._todayRates.oficial > 0) {
            newTodayRates.oficial = this._todayRates.oficial;
        }
        if (newTodayRates.paralelo === 0 && this._todayRates.paralelo > 0) {
            newTodayRates.paralelo = this._todayRates.paralelo;
        }
        if (newTodayRates.usdtCompra === 0 && this._todayRates.usdtCompra > 0) {
            newTodayRates.usdtCompra = this._todayRates.usdtCompra;
        }
        if (newTodayRates.usdtVenta === 0 && this._todayRates.usdtVenta > 0) {
            newTodayRates.usdtVenta = this._todayRates.usdtVenta;
        }

        this._todayRates = newTodayRates;
        this._tomorrowRates = newTomorrowRates;
        this._hasTomorrowRate = foundTomorrow;
        this._lastUpdate = Date.now();
        this._loading = false;

        try {
            localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({
                todayRates: newTodayRates,
                tomorrowRates: newTomorrowRates,
                hasTomorrowRate: foundTomorrow,
                timestamp: Date.now(),
            }));
        } catch { /* quota exceeded or private mode */ }

        this._emit('ratesUpdated', {
            todayRates: newTodayRates,
            tomorrowRates: newTomorrowRates,
            hasTomorrowRate: foundTomorrow,
            previousRates: this._previousRates,
        });
        this._emit('loading', false);
    }

    // ── Fetch cross-rates with 1-hour cache ──
    async _getCrossRates() {
        const ONE_HOUR = 3600000;
        const now = Date.now();
        if (this._crossRateCache && (now - this._crossRateCacheTime) < ONE_HOUR) {
            return this._crossRateCache;
        }
        try {
            const ctrl = new AbortController();
            const to = setTimeout(() => ctrl.abort(), 4000);
            const eurRes = await fetch('https://open.er-api.com/v6/latest/USD', { signal: ctrl.signal }).then(r => r.ok ? r.json() : null);
            clearTimeout(to);
            if (eurRes?.rates) {
                this._crossRateCache = eurRes.rates;
                this._crossRateCacheTime = now;
                return eurRes.rates;
            }
        } catch { /* ignore */ }
        return this._crossRateCache || null;
    }

    // ── Fetch live rates manually ──
    async fetchLiveRates() {
        // Guard against concurrent fetches (race condition fix)
        if (this._fetchingLive) return;
        this._fetchingLive = true;
        this._loading = true;
        this._emit('loading', true);
        try {
            const ctrl = new AbortController();
            const to = setTimeout(() => ctrl.abort(), 6000);
            const res = await fetch('/.netlify/functions/rates', { signal: ctrl.signal });
            clearTimeout(to);
            if (res.ok) {
                const data = await res.json();
                await this._processBackendData(data);
            } else {
                throw new Error('Backend HTTP error: ' + res.status);
            }
        } catch (err) {
            this._loadCached();
            this._loading = false;
            this._emit('error', err);
            this._emit('loading', false);
        } finally {
            this._fetchingLive = false;
        }
    }

    // ── Fetch historical rates ──
    async fetchHistoricalRates() {
        try {
            const ctrl = new AbortController();
            const to = setTimeout(() => ctrl.abort(), 6000);
            const res = await fetch('https://ve.dolarapi.com/v1/historicos/dolares', { signal: ctrl.signal });
            clearTimeout(to);
            if (!res.ok) throw new Error('Historical fetch failed');
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                this._historicalData = data;
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 90);
                const cutoffStr = cutoff.toISOString().split('T')[0];
                const recent = data.filter(d => d.fecha >= cutoffStr);
                try {
                    localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(recent));
                } catch { /* quota exceeded */ }

                this._emit('historicalUpdated', recent);
                // After getting history, re-fetch live to update today/tomorrow logic
                this.fetchLiveRates();
            } else {
                this._emit('historicalUpdated', this._historicalData);
                this.fetchLiveRates();
            }
        } catch {
            this._emit('historicalUpdated', this._historicalData);
            this.fetchLiveRates();
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
