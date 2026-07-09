async function test() {
    try {
        const response = await fetch("https://rates.dolarvzla.com/bcv/current.json");
        console.log(response.status);
        if (response.ok) {
             console.log(await response.text());
        }
    } catch(e) { console.error(e) }
}
test();
