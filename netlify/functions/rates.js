// Venezuela timezone helper (UTC-4)
function getVenezuelaDateStr() {
    const now = new Date();
    const vzNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    const y = vzNow.getFullYear();
    const m = String(vzNow.getMonth() + 1).padStart(2, '0');
    const d = String(vzNow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

async function fetchBCVRate() {
    const vzDateStr = getVenezuelaDateStr();

    // Primary: DolarVZLA (rates.dolarvzla.com) with official BCV USD and EUR
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        const response = await fetch('https://rates.dolarvzla.com/bcv/current.json', {
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (response.ok) {
            const data = await response.json();
            const current = data?.current;
            const previous = data?.previous;

            if (current?.usd) {
                if (previous?.usd && current?.date && current.date > vzDateStr) {
                    // Current is published for next business day (tomorrow / Monday)
                    return {
                        rate: previous.usd,
                        date: previous.date,
                        rateNext: current.usd,
                        dateNext: current.date,
                        hasTomorrowRate: true,
                        eur: previous.eur || 0,
                        eurNext: current.eur || 0
                    };
                } else {
                    // Current is active today, next rate not published yet
                    return {
                        rate: current.usd,
                        date: current.date || vzDateStr,
                        rateNext: 0,
                        dateNext: null,
                        hasTomorrowRate: false,
                        eur: current.eur || 0,
                        eurNext: 0
                    };
                }
            }
        }
    } catch (e) {
        console.error("BCV Fetch Error (DolarVZLA):", e?.name || e);
    }

    // Fallback: DolarAPI (Oficial USD + EUR)
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const [dolarRes, euroRes] = await Promise.allSettled([
            fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: controller.signal }).then(r => r.ok ? r.json() : null),
            fetch('https://ve.dolarapi.com/v1/euros/oficial', { signal: controller.signal }).then(r => r.ok ? r.json() : null)
        ]);
        clearTimeout(timeout);

        const usd = dolarRes.status === 'fulfilled' ? dolarRes.value?.promedio : 0;
        const eur = euroRes.status === 'fulfilled' ? euroRes.value?.promedio : 0;
        const rawDate = dolarRes.status === 'fulfilled' ? (dolarRes.value?.fechaActualizacion || dolarRes.value?.fecha) : null;
        const dateStr = rawDate ? String(rawDate).split('T')[0] : vzDateStr;

        if (usd) {
            return {
                rate: usd,
                date: dateStr,
                rateNext: 0,
                dateNext: null,
                hasTomorrowRate: false,
                eur: eur || 0,
                eurNext: 0
            };
        }
    } catch (e) {
        console.error("BCV Fetch Error (DolarAPI):", e?.name || e);
    }

    return {
        rate: 0,
        date: vzDateStr,
        rateNext: 0,
        dateNext: null,
        hasTomorrowRate: false,
        eur: 0,
        eurNext: 0
    };
}

async function fetchBinanceP2P(tradeType) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        const response = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({
                page: 1,
                rows: 10,
                payTypes: [],
                asset: 'USDT',
                tradeType: tradeType, // 'BUY' or 'SELL'
                fiat: 'VES',
                publisherType: 'merchant'
            })
        });
        clearTimeout(timeout);
        if (!response.ok) return 0;
        const data = await response.json();
        if (data.code === '000000' && Array.isArray(data.data)) {
            const ads = data.data.slice(0, 3);
            if (ads.length > 0) {
                const sum = ads.reduce((acc, ad) => acc + (parseFloat(ad?.adv?.price) || 0), 0);
                return sum / ads.length;
            }
        }
        return 0;
    } catch (e) {
        console.error("Binance Fetch Error:", e?.name || e);
        return 0;
    }
}

export const handler = async function(event, context) {
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: corsHeaders,
            body: ''
        };
    }

    if (event.httpMethod && event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // Run concurrent fetches with Promise.allSettled for optimal performance
        const [bcvResult, compraResult, ventaResult] = await Promise.allSettled([
            fetchBCVRate(),
            fetchBinanceP2P('SELL'),
            fetchBinanceP2P('BUY')
        ]);

        const bcv = bcvResult.status === 'fulfilled' ? bcvResult.value : {
            rate: 0,
            date: getVenezuelaDateStr(),
            rateNext: 0,
            dateNext: null,
            hasTomorrowRate: false,
            eur: 0,
            eurNext: 0
        };
        const usdtCompra = compraResult.status === 'fulfilled' ? compraResult.value : 0;
        const usdtVenta = ventaResult.status === 'fulfilled' ? ventaResult.value : 0;
        
        const usdtAvg = (usdtCompra > 0 && usdtVenta > 0)
            ? ((usdtCompra + usdtVenta) / 2)
            : (usdtCompra > 0 ? usdtCompra : usdtVenta);

        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                'Cache-Control': 'public, max-age=60, s-maxage=120'
            },
            body: JSON.stringify({
                oficial: bcv.rate,
                oficialDate: bcv.date,
                oficialNext: bcv.rateNext,
                oficialDateNext: bcv.dateNext,
                hasTomorrowRate: bcv.hasTomorrowRate,
                eur: bcv.eur,
                eurNext: bcv.eurNext,
                usdt: usdtAvg,
                usdtCompra: usdtCompra,
                usdtVenta: usdtVenta,
                paralelo: usdtAvg, // legacy compatibility alias
                timestamp: Date.now()
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed fetching rates' })
        };
    }
};
