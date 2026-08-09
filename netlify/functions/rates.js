async function fetchBCVRate() {
    try {
        const response = await fetch('https://rates.dolarvzla.com/bcv/current.json');
        if (response.ok) {
            const data = await response.json();
            if (data?.current?.usd) {
                return {
                    rate: data.current.usd,
                    date: data.current.date
                };
            }
        }
    } catch (e) {
        console.error("BCV Fetch Error (DolarVZLA):", e);
    }

    // Fallback 1: DolarAPI
    try {
        const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        if (response.ok) {
            const data = await response.json();
            if (data?.promedio) {
                return {
                    rate: data.promedio,
                    date: data.fecha || new Date().toISOString().split('T')[0]
                };
            }
        }
    } catch (e) {
        console.error("BCV Fetch Error (DolarAPI):", e);
    }

    return { rate: 0, date: new Date().toISOString().split('T')[0] };
}

async function fetchBinanceP2P(tradeType) {
    try {
        const response = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
        const data = await response.json();
        if (data.code === '000000' && data.data) {
            const ads = data.data.slice(0, 3);
            if (ads.length > 0) {
                const sum = ads.reduce((acc, ad) => acc + parseFloat(ad.adv.price), 0);
                return sum / ads.length;
            }
        }
        return 0;
    } catch (e) {
        console.error("Binance Fetch Error:", e);
        return 0;
    }
}

exports.handler = async function(event, context) {
    try {
        const bcv = await fetchBCVRate();
        const usdtCompra = await fetchBinanceP2P('SELL'); // User buys -> Merchant sells
        const usdtVenta = await fetchBinanceP2P('BUY');   // User sells -> Merchant buys
        
        const paraleloFallback = usdtCompra > 0 ? ((usdtCompra + usdtVenta) / 2) : 0;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=60, s-maxage=120'
            },
            body: JSON.stringify({
                oficial: bcv.rate,
                oficialDate: bcv.date,
                paralelo: paraleloFallback,
                usdtCompra: usdtCompra,
                usdtVenta: usdtVenta,
                timestamp: Date.now()
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed fetching rates' })
        };
    }
};
