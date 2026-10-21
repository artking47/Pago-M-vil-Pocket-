import Tesseract from 'tesseract.js';

// Reusable worker cache to avoid re-downloading traineddata across scans
let cachedWorker = null;
let currentLanguage = null;
let isInitializing = false;

/**
 * Initialize or get cached Tesseract worker
 * Uses 'eng' by default because it is 1/5 the size (~4MB vs ~20MB for 'spa'),
 * downloads instantly on mobile networks, and accurately recognizes all digits,
 * currencies ($, Bs, Ref), and Latin product names.
 */
export async function getOCRWorker(lang = 'eng', onProgress = null) {
    if (cachedWorker && currentLanguage === lang) {
        return cachedWorker;
    }

    if (isInitializing) {
        // Wait for current initialization
        while (isInitializing) {
            await new Promise(r => setTimeout(r, 100));
        }
        if (cachedWorker && currentLanguage === lang) return cachedWorker;
    }

    isInitializing = true;
    try {
        if (cachedWorker) {
            try {
                await cachedWorker.terminate();
            } catch (e) {
                console.warn('Error terminating previous worker:', e);
            }
            cachedWorker = null;
        }

        const worker = await Tesseract.createWorker(lang, 1, {
            logger: (m) => {
                if (onProgress && m) {
                    let progressPct = Math.round((m.progress || 0) * 100);
                    let label = 'Procesando...';
                    if (m.status === 'loading tesseract core') label = 'Iniciando motor OCR...';
                    else if (m.status === 'loading language traineddata') label = `Descargando modelo (${progressPct}%)...`;
                    else if (m.status === 'initializing api') label = 'Configurando escáner...';
                    else if (m.status === 'recognizing text') label = `Leyendo imagen (${progressPct}%)...`;
                    onProgress({ status: m.status, progress: progressPct, label });
                }
            },
            errorHandler: (err) => {
                console.error('Tesseract worker error:', err);
            }
        });

        // Set parameters for numeric & price recognition
        await worker.setParameters({
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúÁÉÍÓÚñÑ$,.:;/-+%*()#@&[] \n\r',
        });

        cachedWorker = worker;
        currentLanguage = lang;
        return worker;
    } catch (err) {
        console.error('Failed to initialize OCR worker:', err);
        throw err;
    } finally {
        isInitializing = false;
    }
}

/**
 * Parse price number string into numeric float & formatted string
 * Supports:
 * - 1.250,50 (VES thousands dot, comma decimal)
 * - 1,250.50 (USD thousands comma, dot decimal)
 * - 120,00 (VES comma decimal)
 * - 14.99 (USD dot decimal)
 * - 250 (Integer)
 * Plus smart correction of thermal receipt font glitches (O->0, l/I->1, S->5)
 */
export function parsePriceCandidate(numStr) {
    if (!numStr) return { value: 0, formatted: '' };

    // Clean common thermal OCR character confusions in numeric strings
    let raw = numStr.trim()
        .replace(/[$BsRef\s]/gi, '')
        .replace(/(?<=[0-9,.\s])o(?=[0-9,.\s]|$)/gi, '0') // 12.5O -> 12.50
        .replace(/^[lI|](?=[0-9])/g, '1')                // l20.00 -> 120.00
        .replace(/(?<=[0-9])[lI|](?=[0-9])/g, '1')       // 1l0.00 -> 110.00
        .replace(/(?<=[0-9,.\s])[sS](?=[0-9,.\s]|$)/g, '5'); // 1S,00 -> 15,00

    let val = 0;

    if (raw.includes('.') && raw.includes(',')) {
        const lastDot = raw.lastIndexOf('.');
        const lastComma = raw.lastIndexOf(',');
        if (lastComma > lastDot) {
            val = parseFloat(raw.replace(/[^0-9,]/g, '').replace(/\./g, '').replace(',', '.'));
        } else {
            val = parseFloat(raw.replace(/[^0-9.]/g, '').replace(/,/g, ''));
        }
    } else if (raw.includes(',')) {
        val = parseFloat(raw.replace(/[^0-9,]/g, '').replace(',', '.'));
    } else if (raw.includes('.')) {
        const parts = raw.replace(/[^0-9.]/g, '').split('.');
        if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
            val = parseFloat(parts.join(''));
        } else {
            val = parseFloat(parts.join('.'));
        }
    } else {
        val = parseFloat(raw.replace(/[^0-9]/g, '')) || 0;
    }

    if (isNaN(val) || val <= 0) return { value: 0, formatted: '' };
    const formatted = val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return { value: val, formatted };
}

/**
 * Enhanced image preprocessing on canvas for OCR
 * Improves contrast, sharpens characters, and handles lighting issues on supermarket tags & receipts.
 */
export function preprocessCanvasForOCR(source, options = {}) {
    const { mode = 'tag', crop = null } = options;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let sW = source.videoWidth || source.naturalWidth || source.width;
    let sH = source.videoHeight || source.naturalHeight || source.height;

    let sx = 0, sy = 0, sw = sW, sh = sH;
    if (crop) {
        sx = crop.x ?? 0;
        sy = crop.y ?? 0;
        sw = crop.w ?? sW;
        sh = crop.h ?? sH;
    }

    // Scale to balanced resolution for speed + OCR accuracy
    const maxDimension = mode === 'receipt' ? 1800 : 1200;
    let targetW = sw;
    let targetH = sh;

    if (targetW > maxDimension || targetH > maxDimension) {
        if (targetW > targetH) {
            targetH = Math.round((targetH * maxDimension) / targetW);
            targetW = maxDimension;
        } else {
            targetW = Math.round((targetW * maxDimension) / targetH);
            targetH = maxDimension;
        }
    }

    canvas.width = targetW;
    canvas.height = targetH;

    // First pass: Draw source image
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, targetW, targetH);

    // Get pixel data for custom enhancement
    try {
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;

        // Grayscale + contrast stretching
        let minLum = 255;
        let maxLum = 0;

        // Fast histogram sampling
        for (let i = 0; i < data.length; i += 16) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const lum = (0.299 * r + 0.587 * g + 0.114 * b);
            if (lum < minLum) minLum = lum;
            if (lum > maxLum) maxLum = lum;
        }

        const range = Math.max(maxLum - minLum, 40);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            let lum = (0.299 * r + 0.587 * g + 0.114 * b);

            // Stretch dynamic range
            lum = ((lum - minLum) / range) * 255;
            lum = Math.min(255, Math.max(0, lum));

            if (mode === 'receipt') {
                // Adaptive high contrast for faint thermal receipt text
                lum = lum < 140 ? lum * 0.7 : Math.min(255, lum * 1.25);
            } else {
                // Label tag contrast
                lum = lum < 128 ? lum * 0.8 : Math.min(255, lum * 1.15);
            }

            data[i] = lum;
            data[i + 1] = lum;
            data[i + 2] = lum;
        }

        ctx.putImageData(imgData, 0, 0);
    } catch (e) {
        console.warn('Canvas pixel manipulation error (fallback to standard):', e);
    }

    return canvas;
}

/**
 * Scan a single price label/tag
 * Extracts price candidates, currency ($ / Bs), and suggested product name
 */
export async function scanPriceTag(imageSource, options = {}) {
    const { onProgress = null, crop = null } = options;
    const canvas = preprocessCanvasForOCR(imageSource, { mode: 'tag', crop });
    const worker = await getOCRWorker('eng', onProgress);

    const { data: { text } } = await worker.recognize(canvas);

    // Look for numbers formatted like prices: e.g. 12.50, 1.200,50, 3,99, etc.
    const priceRegex = /(?:(?:\$|Ref\.?|USD|Bs\.?|Bs)\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2})?)(?:\s*(?:\$|Bs\.?|Bs|USD))?/gi;
    const rawMatches = [...text.matchAll(priceRegex)];

    const candidates = [];
    const seen = new Set();

    for (const match of rawMatches) {
        const fullMatch = match[0];
        const numPart = match[1];
        const parsed = parsePriceCandidate(numPart);

        if (parsed.value > 0 && !seen.has(parsed.formatted)) {
            seen.add(parsed.formatted);
            const isVES = /bs/i.test(fullMatch);
            const isUSD = /\$|ref|usd/i.test(fullMatch);
            candidates.push({
                formatted: parsed.formatted,
                value: parsed.value,
                currency: isVES ? 'VES' : (isUSD ? 'USD' : null),
                raw: fullMatch.trim()
            });
        }
    }

    // Heuristic: Best candidate is usually the largest or most clearly specified price
    let bestCandidate = null;
    if (candidates.length > 0) {
        // If one has currency explicitly marked, prioritize it
        const withCurrency = candidates.filter(c => c.currency);
        bestCandidate = withCurrency.length > 0 ? withCurrency[0] : candidates[0];
    }

    // Extract product name candidate from remaining text
    let cleanName = text
        .replace(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2})?)/g, '')
        .replace(/[$€¥BsRefPVP%/.:;,\-_=]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const words = cleanName.split(' ').filter(w => w.length > 2 && !/^(total|precio|ref|pvp|bcv|iva|cambio)$/i.test(w));
    const suggestedName = words.slice(0, 3).join(' ').toUpperCase() || '';

    return {
        bestCandidate,
        candidates,
        suggestedName,
        rawText: text
    };
}

/**
 * Scan and parse a full receipt/ticket
 * Extracts store name, totals (VES and USD), taxes (IVA, IGTF 3%), BCV rate, and item rows.
 */
export async function scanReceipt(imageSource, options = {}) {
    const { onProgress = null } = options;
    const canvas = preprocessCanvasForOCR(imageSource, { mode: 'receipt' });
    const worker = await getOCRWorker('eng', onProgress);

    const { data: { text } } = await worker.recognize(canvas);
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // 1. Detect store name (first 1-4 lines usually contain the store name)
    let supermarketName = '';
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (line.length > 3 && !/^(rif|factura|fecha|seniat|caja|sucursal|hora)/i.test(line)) {
            // Check for common stores or uppercase title
            if (/plaza|gama|central|diego|forum|rio|daka|traki|farmatodo|biomercado|luxor|garzon/i.test(line) || line === line.toUpperCase()) {
                supermarketName = line.replace(/[^a-zA-Z0-9\s.'&-]/g, '').trim();
                break;
            }
        }
    }
    if (!supermarketName && lines.length > 0) {
        supermarketName = lines[0].replace(/[^a-zA-Z0-9\s.'&-]/g, '').trim();
    }

    // 2. Detect Invoice Number & Date
    let invoiceNumber = '';
    let invoiceDate = '';
    const dateMatch = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    if (dateMatch) invoiceDate = dateMatch[1];

    const invMatch = text.match(/(?:factura|fact|doc|control|n[ºo°]?)[.:\s#]*([a-z0-9-]+)/i);
    if (invMatch && invMatch[1].length >= 3) {
        invoiceNumber = invMatch[1].toUpperCase();
    }

    // 3. Detect BCV Rate / Tasa de cambio
    let rate = null;
    const rateMatch = text.match(/(?:tasa|bcv|cambio|t\.c\.)[^\d]*(\d{1,3}(?:[.,]\d{1,4}))/i);
    if (rateMatch) {
        const parsedRate = parsePriceCandidate(rateMatch[1]);
        if (parsedRate.value > 0) rate = parsedRate.value;
    }

    // 4. Detect Totals
    let totalVES = null;
    let totalUSD = null;

    for (const line of lines) {
        // Total USD
        if (/total\s*(?:usd|\$|divisas?|ref)/i.test(line)) {
            const m = line.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2})?)/);
            if (m) totalUSD = parsePriceCandidate(m[1]).value;
        }
        // Total VES / Total General
        if (/total\s*(?:bs|ves|pagar|general|a\s*pagar)?/i.test(line)) {
            const matches = [...line.matchAll(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2})?)/g)];
            if (matches.length > 0) {
                const last = matches[matches.length - 1];
                const parsed = parsePriceCandidate(last[0]);
                if (parsed.value > 0 && !totalVES) {
                    totalVES = parsed.value;
                }
            }
        }
    }

    // Fallback: If totalVES is set and rate is set, compute USD or vice versa
    if (totalVES && rate && !totalUSD) {
        totalUSD = parseFloat((totalVES / rate).toFixed(2));
    } else if (totalUSD && rate && !totalVES) {
        totalVES = parseFloat((totalUSD * rate).toFixed(2));
    }

    // 5. Detect Taxes (IVA 16%, IGTF 3%, Exento, Base Imponible)
    let ivaVES = null;
    let igtfVES = null;
    let exentoVES = null;
    let baseVES = null;

    const ivaMatch = text.match(/(?:iva\s*(?:16%?)?|impuesto\s*(?:16%?)?)[^\d]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2})?)/i);
    if (ivaMatch) ivaVES = parsePriceCandidate(ivaMatch[1]).value;

    const igtfMatch = text.match(/(?:igtf\s*(?:3%?)?|3\.?00%|grandes\s*trans(?:acciones)?)[^\d]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2})?)/i);
    if (igtfMatch) igtfVES = parsePriceCandidate(igtfMatch[1]).value;

    const exentoMatch = text.match(/(?:exento|ventas\s*exentas?)[^\d]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2})?)/i);
    if (exentoMatch) exentoVES = parsePriceCandidate(exentoMatch[1]).value;

    const baseMatch = text.match(/(?:base\s*imponible|base\s*gravada)[^\d]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2})?)/i);
    if (baseMatch) baseVES = parsePriceCandidate(baseMatch[1]).value;

    // 6. Detect Product Line Items (Single-line & Multi-line formats)
    const items = [];
    let itemIdCounter = 1;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Skip non-item lines (headers, footers, fiscal metadata)
        if (/^(total|subtotal|iva|igtf|tasa|bcv|cambio|fecha|hora|rif|cajero|caja|gracias|seniat|factura|vuelto|pago|tarjeta|efectivo|debito|credito|biopago|pago\s*movil|lote|aprobacion|referencia|serial|direccion|telefono|servicios?|base|exento)/i.test(line)) {
            continue;
        }

        // Strip fiscal printer tax flags and trailing currency symbols at the end of the line, e.g. (E), (G), (R), *E, *G, Bs, $
        const cleanedLine = line.replace(/\s*(?:\([EGR]\)|[EGR]|\*|BS\.?|\$)\s*$/i, '').trim();

        // Pattern 1: [NOMBRE] [CANT] x [PRECIO UNIT] [PRECIO TOTAL] (e.g. "HARINA PAN 2 X 48,50 97,00")
        const qtyXPriceMatch = cleanedLine.match(/^(.*?)\s+(\d+(?:[.,]\d+)?)\s*(?:KG|KGR|GR|LT|L|PZA|UNID|UNI)?\s*[xX*@]\s*(?:\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2}))?\s+(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2}))$/i);

        if (qtyXPriceMatch) {
            const rawName = qtyXPriceMatch[1].trim();
            const rawQty = qtyXPriceMatch[2];
            const parsedTotalPrice = parsePriceCandidate(qtyXPriceMatch[3]);

            const cleanName = rawName
                .replace(/^[\d#.-]+\s+/, '')
                .replace(/\b\d{8,14}\b/g, '') // remove barcode if present
                .replace(/[^a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ./-]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (cleanName.length >= 2 && parsedTotalPrice.value > 0) {
                let qty = 1;
                if (rawQty) {
                    const parsedQty = parseFloat(rawQty.replace(',', '.'));
                    if (!isNaN(parsedQty) && parsedQty > 0) qty = parsedQty;
                }

                items.push({
                    id: `receipt-item-${Date.now()}-${itemIdCounter++}`,
                    name: cleanName.toUpperCase(),
                    quantity: qty,
                    price: parsedTotalPrice.value,
                    formattedPrice: parsedTotalPrice.formatted,
                    rawLine: line
                });
                continue;
            }
        }

        // Pattern 2: Standard single line: [NOMBRE] [PRECIO] or [NOMBRE] [CANT] [PRECIO]
        const singleLineMatch = cleanedLine.match(/^(.*?)(?:\s+(\d+(?:[.,]\d+)?)\s*(?:KG|KGR|GR|LT|L|PZA|UNID|UNI)?)?\s+(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2}))$/i);

        if (singleLineMatch) {
            const rawName = singleLineMatch[1].trim();
            const rawQty = singleLineMatch[2];
            const parsedPrice = parsePriceCandidate(singleLineMatch[3]);

            const cleanName = rawName
                .replace(/^[\d#.-]+\s+/, '') // Remove leading item number e.g. "001 "
                .replace(/\b\d{8,14}\b/g, '') // Remove barcode
                .replace(/[^a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ./-]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (cleanName.length >= 2 && parsedPrice.value > 0) {
                let qty = 1;
                if (rawQty) {
                    const parsedQty = parseFloat(rawQty.replace(',', '.'));
                    if (!isNaN(parsedQty) && parsedQty > 0) qty = parsedQty;
                }

                items.push({
                    id: `receipt-item-${Date.now()}-${itemIdCounter++}`,
                    name: cleanName.toUpperCase(),
                    quantity: qty,
                    price: parsedPrice.value,
                    formattedPrice: parsedPrice.formatted,
                    rawLine: line
                });
                continue;
            }
        }

        // Pattern 3: Multi-line: Line i is Name, Line i+1 is Quantity x Price Total
        if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            const multiLineQtyMatch = nextLine.match(/(\d+(?:[.,]\d+)?)\s*(?:KG|KGR|GR|LT|L|PZA|UNID|UNI)?\s*[xX*@]\s*(?:\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2}))?\s+(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2}))/i);
            
            if (multiLineQtyMatch && line.length >= 2 && !/^\d+$/.test(line)) {
                const cleanName = line
                    .replace(/^[\d#.-]+\s+/, '')
                    .replace(/\b\d{8,14}\b/g, '')
                    .replace(/[^a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ./-]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                const parsedTotalPrice = parsePriceCandidate(multiLineQtyMatch[2]);
                const parsedQty = parseFloat(multiLineQtyMatch[1].replace(',', '.'));

                if (cleanName.length >= 2 && parsedTotalPrice.value > 0) {
                    items.push({
                        id: `receipt-item-${Date.now()}-${itemIdCounter++}`,
                        name: cleanName.toUpperCase(),
                        quantity: (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 1,
                        price: parsedTotalPrice.value,
                        formattedPrice: parsedTotalPrice.formatted,
                        rawLine: `${line} | ${nextLine}`
                    });
                    i++; // skip next line
                }
            }
        }
    }

    return {
        supermarketName: supermarketName || 'Supermercado',
        invoiceNumber,
        invoiceDate: invoiceDate || new Date().toLocaleDateString('es-VE'),
        rate,
        totalVES,
        totalUSD,
        ivaVES,
        igtfVES,
        exentoVES,
        baseVES,
        items,
        rawText: text
    };
}

/**
 * Compress an image file/canvas to a lightweight base64 string for safe localStorage persistence
 * Keeps image under ~120KB so multiple saved receipts won't exceed browser quota.
 */
export async function compressImageForStorage(source, maxWidth = 900, quality = 0.7) {
    return new Promise((resolve, reject) => {
        try {
            const processElement = (img) => {
                const canvas = document.createElement('canvas');
                let w = img.naturalWidth || img.videoWidth || img.width;
                let h = img.naturalHeight || img.videoHeight || img.height;

                if (w > maxWidth) {
                    h = Math.round((h * maxWidth) / w);
                    w = maxWidth;
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };

            if (source instanceof HTMLCanvasElement) {
                processElement(source);
            } else if (source instanceof HTMLImageElement || source instanceof HTMLVideoElement) {
                processElement(source);
            } else if (source instanceof Blob || source instanceof File) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => processElement(img);
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(source);
            } else {
                reject(new Error('Formato de imagen no soportado'));
            }
        } catch (err) {
            reject(err);
        }
    });
}
