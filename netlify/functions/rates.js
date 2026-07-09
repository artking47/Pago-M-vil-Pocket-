// netlify/functions/rates.js
async function fetchBCVRate() {
    try {
        const response = await fetch('https://www.bcv.org.ve/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await response.text();
        const rateMatch = html.match(/<div id="dolar".*?>.*?<strong>\s*(.*?)\s*<\/strong>/s);
        const dateMatch = html.match(/<span[^>]*class="date-display-single"[^>]*content="(.*?)"/);
        
        let rate = 0;
        let date = new Date().toISOString().split('T')[0];

        if (rateMatch && rateMatch[1]) {
            rate = parseFloat(rateMatch[1].replace(',', '.'));
        }
        if (dateMatch && dateMatch[1]) {
            date = dateMatch[1].split('T')[0];
        }
        return { rate, date };
    } catch (e) {
        console.error("BCV Fetch Error:", e);
        return { rate: 0, date: new Date().toISOString().split('T')[0] };
    }
}

async function fetchBinanceP2P(tradeType) {
    try {
        const response = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
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
                'Access-Control-Allow-Origin': '*' // Allow frontend to call it directly
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
