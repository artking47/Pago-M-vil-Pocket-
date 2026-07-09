import https from 'https';

https.get('https://www.bcv.org.ve/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    rejectUnauthorized: false
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const usdBlock = data.match(/<div id="dolar"(.*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/s);
        if (usdBlock) {
            console.log("USD BLOCK:", usdBlock[0].trim());
        }
    });
});
