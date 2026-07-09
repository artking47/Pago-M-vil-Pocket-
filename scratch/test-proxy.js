async function test() {
    try {
        const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.bcv.org.ve/'));
        const json = await res.json();
        const html = json.contents;
        
        const usdMatch = html.match(/<div id="dolar".*?>.*?<strong>\s*([\d,]+)\s*<\/strong>/s);
        console.log("USD:", usdMatch ? usdMatch[1] : 'Not found');
        
        // Let's also find the date
        const dateMatch = html.match(/<span[^>]*class="date-display-single"[^>]*>(.*?)<\/span>/s);
        console.log("Date:", dateMatch ? dateMatch[1].trim() : 'Not found');
    } catch(e) {
        console.error(e);
    }
}
test();
