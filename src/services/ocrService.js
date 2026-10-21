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

        // Set parameters for numeric & price recognition with single uniform block mode for tabular receipts
        await worker.setParameters({
            tessedit_pageseg_mode: '6',
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúÁÉÍÓÚñÑüÜ$,.:;/-+%*()#@&[]"\'= \n\r',
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

    // Scale to balanced resolution for speed + OCR accuracy (2600 for long receipts)
    const maxDimension = mode === 'receipt' ? 2600 : 1400;
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
                // Adaptive high contrast for thermal receipts preserving dot-matrix patterns
                lum = lum < 130 ? lum * 0.75 : Math.min(255, lum * 1.15);
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
        .replace(/\b(?:Bs\.?|Ref\.?|PVP|USD|EUR|VES)\b/gi, '')
        .replace(/[$€¥%/.:;,\-_=]/g, ' ')
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
 * Parse raw text of a Venezuelan invoice / receipt
 * Extracts supermarket name, totals (VES and USD), taxes (IVA 16%, IGTF 3%), BCV rate, and item rows.
 * Works with fiscal printer formats (multi-line, single-line, reverse lines) and withstands thermal dot-matrix glitches.
 */
export function parseReceiptText(text) {
    if (!text || typeof text !== 'string') {
        return {
            supermarketName: 'Supermercado',
            invoiceNumber: '',
            invoiceDate: new Date().toLocaleDateString('es-VE'),
            rate: null,
            totalVES: null,
            totalUSD: null,
            ivaVES: null,
            igtfVES: null,
            exentoVES: null,
            baseVES: null,
            items: [],
            rawText: ''
        };
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // 1. Detect Store Name (first 1-6 non-metadata lines)
    let supermarketName = '';
    for (let i = 0; i < Math.min(6, lines.length); i++) {
        const line = lines[i];
        if (line.length >= 3 && !/^(rif|factura|fecha|seniat|caja|sucursal|hora|cajero|forma\s*libre|control|n[roº°])/i.test(line)) {
            if (/plaza|gama|central|san\s*diego|forum|rio|daka|traki|farmatodo|biomercado|luxor|garzon|kromi|automercado|supermercado|hiper|inversiones|comercial/i.test(line) || (line === line.toUpperCase() && line.length > 5)) {
                supermarketName = line.replace(/[^a-zA-Z0-9\s.'&-]/g, '').trim();
                break;
            }
        }
    }
    if (!supermarketName && lines.length > 0) {
        supermarketName = lines[0].replace(/[^a-zA-Z0-9\s.'&-]/g, '').trim();
    }

    // 2. Invoice Date & Number
    let invoiceNumber = '';
    let invoiceDate = '';
    const dateMatch = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    if (dateMatch) invoiceDate = dateMatch[1];

    const invMatch = text.match(/(?:factura|fact|doc|control|n[ºo°]?|nro)[.:\s#]*([a-z0-9-]+)/i);
    if (invMatch && invMatch[1].length >= 3) {
        invoiceNumber = invMatch[1].toUpperCase();
    }

    // 3. BCV Rate
    let rate = null;
    const rateMatch = text.match(/(?:tasa(?:\s*de\s*cambio)?|bcv|cambio|t\.c\.|tasa\s*oficial)[^\d]*(\d{1,3}(?:[.,]\d{1,4}))/i);
    if (rateMatch) {
        const parsedRate = parsePriceCandidate(rateMatch[1]);
        if (parsedRate.value > 0) rate = parsedRate.value;
    }

    // 4. Totals (VES & USD)
    let totalVES = null;
    let totalUSD = null;

    for (const line of lines) {
        // Total USD / Divisas / Ref
        if (/total\s*(?:usd|\$|divisas?|ref|dolares)/i.test(line) || /(?:usd|\$|divisas?|ref)\s*total/i.test(line)) {
            const matches = [...line.matchAll(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2})?)/g)];
            if (matches.length > 0) {
                const parsed = parsePriceCandidate(matches[matches.length - 1][0]);
                if (parsed.value > 0 && !totalUSD) totalUSD = parsed.value;
            }
        }
        // Total VES / A pagar / Total General
        if (/total\s*(?:a\s*pagar|general|bs|ves|pagar)?/i.test(line) && !/subtotal|iva|igtf|base/i.test(line)) {
            const matches = [...line.matchAll(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2})?)/g)];
            if (matches.length > 0) {
                const last = matches[matches.length - 1];
                const parsed = parsePriceCandidate(last[0]);
                if (parsed.value > 0 && !totalVES) totalVES = parsed.value;
            }
        }
    }

    if (totalVES && rate && !totalUSD) {
        totalUSD = parseFloat((totalVES / rate).toFixed(2));
    } else if (totalUSD && rate && !totalVES) {
        totalVES = parseFloat((totalUSD * rate).toFixed(2));
    }

    // 5. Taxes (IVA, IGTF, Exento, Base)
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

    // Helper: strip fiscal printer tax flags and trailing suffixes
    const stripFiscalSuffix = (str) => {
        return str
            .replace(/(?:\s+|\b)(?:\([EGR]\)|\*[EGR]|\(EX\)|EX|\(16%?\)|16%|\(3%?\)|3%|\(0%?\)|0%|BI|BIA|BS\.?|\$|Ref|USD|[EGR])\s*$/i, '')
            .trim();
    };

    // Helper: clean product description
    const cleanProductName = (str) => {
        if (!str) return '';
        return str
            .replace(/^[\d#.-]+\s+/, '')      // Strip leading sequence "001 " or "1. " or "#2 "
            .replace(/\b\d{8,14}\b/g, '')     // Strip barcodes
            .replace(/\b(?:Bs\.?|Ref\.?|PVP|USD|EUR|VES)\b/gi, '') // Strip currency words
            .replace(/[$€¥]/g, '')
            .replace(/[^a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ./%&-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // Helper: check if a line is a header/footer/metadata line that cannot be an item
    const isNonItemLine = (line) => {
        const clean = line.toLowerCase().trim();
        if (supermarketName && clean === supermarketName.toLowerCase()) return true;
        return /^(total|subtotal|sub\s*total|sub-total|iva|igtf|tasa|bcv|cambio|t\.c\.|fecha|hora|rif|cajero|caja|gracias|seniat|factura|vuelto|pago|tarjeta|efectivo|debito|credito|biopago|pago\s*movil|lote|aprobacion|referencia|serial|direccion|telefono|servicios?|base\s*imponible|base\s*gravada|exento|exentas|ventas|sucursal|imprenta|fiscal|control|forma\s*libre|cliente|cedula|ci:|c\.i\.|razon\s*social|domicilio|ticket|numero|nro|articulo|cant|descripcion|monto|precio|p\.v\.p|pvp|item|items|resumen|linea|piezas|vendedor|descuento|saldo|banco|punto|orden|operacion|deposito|transferencia)/i.test(clean);
    };

    // 6. Multi-format Item Line Parser
    const items = [];
    let itemIdCounter = 1;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line || isNonItemLine(line)) continue;

        let cleanedLine = stripFiscalSuffix(line);

        // ── FORMAT 1: Standard Quantity X UnitPrice and Total on single line ──
        // e.g. "HARINA PAN 1KG 2 X 48,50 97,00" or "HARINA 1KG 2,000 X 48,50 97,00"
        const qtyXPriceMatch = cleanedLine.match(/^(.*?)\s+(\d+(?:[.,]\d+)?)\s*(?:KG|KGR|GR|G|LT|L|ML|PZA|PZAS|UNID|UNI|PAQ|PQ)?\s*[xX*@]\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2}))?\s+(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2}))$/i);
        if (qtyXPriceMatch) {
            const name = cleanProductName(qtyXPriceMatch[1]);
            const rawQty = qtyXPriceMatch[2];
            const parsedTotalPrice = parsePriceCandidate(qtyXPriceMatch[4] || qtyXPriceMatch[3]);
            if (name.length >= 2 && parsedTotalPrice.value > 0) {
                let qty = 1;
                if (rawQty) {
                    const parsedQty = parseFloat(rawQty.replace(',', '.'));
                    if (!isNaN(parsedQty) && parsedQty > 0) qty = parsedQty;
                }
                items.push({
                    id: `receipt-item-${Date.now()}-${itemIdCounter++}`,
                    name: name.toUpperCase(),
                    quantity: qty,
                    price: parsedTotalPrice.value,
                    formattedPrice: parsedTotalPrice.formatted,
                    rawLine: line
                });
                continue;
            }
        }

        // Check if line is purely a quantity multiplier (e.g. "1.000 X 48.50 48.50")
        const isQtyLine = /^\s*(\d+(?:[.,]\d+)?)\s*(?:KG|KGR|GR|G|LT|L|ML|PZA|PZAS|UNID|UNI)?\s*[xX*@]/i.test(cleanedLine);

        // ── FORMAT 2: Name followed by Price at the end of the line ──
        // e.g. "HARINA PAN BLANCA 1KG 48,50" or "01 ACETAMINOFEN 500MG 45.00" or "48,5O"
        if (!isQtyLine) {
            const singleLineMatch = cleanedLine.match(/^(.*?)\s+([0-9Oo]{1,3}(?:[.,][0-9Oo]{3})*(?:[.,][0-9Oo]{1,2})|[0-9Oo]+(?:[.,][0-9Oo]{1,2})|[0-9]+)$/);
            if (singleLineMatch) {
                let rawName = singleLineMatch[1].trim();
                const parsedPrice = parsePriceCandidate(singleLineMatch[2]);

                // Check if rawName has an embedded quantity, e.g. "HARINA PAN 2 X" or "2 UNID"
                let qty = 1;
                const embedQtyMatch = rawName.match(/\s+(\d+(?:[.,]\d+)?)\s*(?:KG|KGR|GR|G|LT|L|ML|PZA|PZAS|UNID|UNI|PAQ|PQ)?\s*[xX*@]\s*$/i);
                if (embedQtyMatch) {
                    const parsedQ = parseFloat(embedQtyMatch[1].replace(',', '.'));
                    if (!isNaN(parsedQ) && parsedQ > 0) qty = parsedQ;
                    rawName = rawName.replace(embedQtyMatch[0], '');
                }

                const cleanName = cleanProductName(rawName);
                if (cleanName.length >= 2 && parsedPrice.value > 0) {
                    // Ensure it's not a misplaced total
                    if (totalVES && Math.abs(parsedPrice.value - totalVES) < 0.05 && /total/i.test(cleanName)) {
                        continue;
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
        }

        // ── FORMAT 3: Multi-line (Name on Line i, Quantity x Price on Line i+1) ──
        // Line i:   "001 HARINA PAN 1KG"
        // Line i+1: "1,000 X 48,50 48,50 (E)" or "48,50 (E)"
        if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (!isNonItemLine(nextLine)) {
                const nextCleaned = stripFiscalSuffix(nextLine);

                // Option 3A: nextLine has Quantity x Price
                const nextQtyMatch = nextCleaned.match(/(\d+(?:[.,]\d+)?)\s*(?:KG|KGR|GR|G|LT|L|ML|PZA|PZAS|UNID|UNI)?\s*[xX*@]\s*(?:\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2}))?\s+(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2}))/i);
                if (nextQtyMatch) {
                    const name = cleanProductName(cleanedLine);
                    const parsedTotalPrice = parsePriceCandidate(nextQtyMatch[2]);
                    const parsedQty = parseFloat(nextQtyMatch[1].replace(',', '.'));

                    if (name.length >= 2 && parsedTotalPrice.value > 0) {
                        items.push({
                            id: `receipt-item-${Date.now()}-${itemIdCounter++}`,
                            name: name.toUpperCase(),
                            quantity: (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 1,
                            price: parsedTotalPrice.value,
                            formattedPrice: parsedTotalPrice.formatted,
                            rawLine: `${line} | ${nextLine}`
                        });
                        i++; // skip nextLine
                        continue;
                    }
                }

                // Option 3B: nextLine is simply the price alone
                // e.g. Line i: "HARINA PAN 1KG", Line i+1: "48,50"
                const nextOnlyPrice = nextCleaned.match(/^([0-9Oo]{1,3}(?:[.,][0-9Oo]{3})*(?:[.,][0-9Oo]{1,2})|[0-9Oo]+(?:[.,][0-9Oo]{1,2})|[0-9]+)$/);
                if (nextOnlyPrice) {
                    const name = cleanProductName(cleanedLine);
                    const parsedTotalPrice = parsePriceCandidate(nextOnlyPrice[1]);
                    if (name.length >= 2 && parsedTotalPrice.value > 0) {
                        items.push({
                            id: `receipt-item-${Date.now()}-${itemIdCounter++}`,
                            name: name.toUpperCase(),
                            quantity: 1,
                            price: parsedTotalPrice.value,
                            formattedPrice: parsedTotalPrice.formatted,
                            rawLine: `${line} | ${nextLine}`
                        });
                        i++; // skip nextLine
                        continue;
                    }
                }
            }
        }

        // ── FORMAT 4: Reverse Multi-line (Quantity/Price on Line i, Name on Line i+1) ──
        // Line i:   "1.000 X 48.50 48.50"
        // Line i+1: "HARINA PAN 1KG"
        if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (!isNonItemLine(nextLine)) {
                const qtyMatchThis = cleanedLine.match(/^(\d+(?:[.,]\d+)?)\s*(?:KG|KGR|GR|G|LT|L|ML|PZA|PZAS|UNID|UNI)?\s*[xX*@]\s*(?:\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2}))?\s+(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2}))$/i);
                if (qtyMatchThis) {
                    const name = cleanProductName(stripFiscalSuffix(nextLine));
                    const parsedTotalPrice = parsePriceCandidate(qtyMatchThis[2]);
                    const parsedQty = parseFloat(qtyMatchThis[1].replace(',', '.'));

                    if (name.length >= 2 && parsedTotalPrice.value > 0) {
                        items.push({
                            id: `receipt-item-${Date.now()}-${itemIdCounter++}`,
                            name: name.toUpperCase(),
                            quantity: (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 1,
                            price: parsedTotalPrice.value,
                            formattedPrice: parsedTotalPrice.formatted,
                            rawLine: `${cleanedLine} | ${nextLine}`
                        });
                        i++; // skip nextLine
                        continue;
                    }
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
 * Scan and parse a full receipt/ticket image
 * Preprocesses canvas, executes OCR, and parses all items and fiscal breakdown.
 */
export async function scanReceipt(imageSource, options = {}) {
    const { onProgress = null } = options;
    const canvas = preprocessCanvasForOCR(imageSource, { mode: 'receipt' });
    const worker = await getOCRWorker('eng', onProgress);

    const { data: { text } } = await worker.recognize(canvas);
    const parsed = parseReceiptText(text);

    return {
        ...parsed,
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
