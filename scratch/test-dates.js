function getVenezuelaDateStr(offset = 0) {
    const now = new Date();
    const vzNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    vzNow.setDate(vzNow.getDate() + offset);
    const y = vzNow.getFullYear();
    const m = String(vzNow.getMonth() + 1).padStart(2, '0');
    const d = String(vzNow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getEffectiveTodayDateStr() {
    const now = new Date();
    const vzNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    const day = vzNow.getDay();
    if (day === 6) vzNow.setDate(vzNow.getDate() - 1);
    else if (day === 0) vzNow.setDate(vzNow.getDate() - 2);
    const y = vzNow.getFullYear();
    const m = String(vzNow.getMonth() + 1).padStart(2, '0');
    const d = String(vzNow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getNextBusinessDayDateStr() {
    const now = new Date();
    const vzNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    const day = vzNow.getDay();
    let daysToAdd = 1;
    if (day === 5) daysToAdd = 3;
    else if (day === 6) daysToAdd = 2;
    else if (day === 0) daysToAdd = 1;
    vzNow.setDate(vzNow.getDate() + daysToAdd);
    const y = vzNow.getFullYear();
    const m = String(vzNow.getMonth() + 1).padStart(2, '0');
    const d = String(vzNow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

console.log('Today:', getVenezuelaDateStr(0));
console.log('Effective Today:', getEffectiveTodayDateStr());
console.log('Next Business Day:', getNextBusinessDayDateStr());
