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
                publisherType: 'merchant' // Only verified merchants
            })
        });
        const data = await response.json();
        if (data.code === '000000' && data.data) {
            // Average the top 3
            const ads = data.data.slice(0, 3);
            if (ads.length > 0) {
                const sum = ads.reduce((acc, ad) => acc + parseFloat(ad.adv.price), 0);
                return sum / ads.length;
            }
        }
        return 0;
    } catch (e) {
        console.error(e);
        return 0;
    }
}

async function test() {
    // User COMPRA USDT -> Merchant SELLS
    const usdtCompra = await fetchBinanceP2P('SELL'); 
    // User VENDE USDT -> Merchant BUYS
    const usdtVenta = await fetchBinanceP2P('BUY');
    
    console.log("USDT Compra (User buys):", usdtCompra);
    console.log("USDT Venta (User sells):", usdtVenta);
}
test();
