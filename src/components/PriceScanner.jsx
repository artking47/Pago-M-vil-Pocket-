import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';

function parsePriceCandidate(numStr) {
    if (!numStr) return { value: 0, formatted: '' };
    const clean = numStr.trim();
    let val = 0;

    // Case 1: Has both dot and comma (e.g. 1.250,50 or 1,250.50)
    if (clean.includes('.') && clean.includes(',')) {
        const lastDot = clean.lastIndexOf('.');
        const lastComma = clean.lastIndexOf(',');
        if (lastComma > lastDot) {
            val = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
        } else {
            val = parseFloat(clean.replace(/,/g, ''));
        }
    } else if (clean.includes(',')) {
        // Case 2: Only comma (e.g. 14,50 or 1200,00)
        val = parseFloat(clean.replace(',', '.'));
    } else if (clean.includes('.')) {
        // Case 3: Only dot
        const parts = clean.split('.');
        if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
            // Thousands separator (e.g. 1.000 or 1.200.000)
            val = parseFloat(clean.replace(/\./g, ''));
        } else {
            // Decimal separator (e.g. 14.99 or 0.50)
            val = parseFloat(clean);
        }
    } else {
        val = parseFloat(clean) || 0;
    }

    if (isNaN(val) || val <= 0) return { value: 0, formatted: '' };
    const formatted = val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return { value: val, formatted };
}

function PriceScanner({ onScan, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [status, setStatus] = useState('Iniciando cámara...');
    const [stream, setStream] = useState(null);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let activeStream = null;

        async function startCamera() {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                if (!isMounted) {
                    mediaStream.getTracks().forEach(track => track.stop());
                    return;
                }
                activeStream = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
                setStream(mediaStream);
                setStatus('Apunta al precio y captura');
            } catch (err) {
                if (!isMounted) return;
                console.error("Camera access error:", err);
                setStatus('Error al acceder a la cámara. Da permisos en tu navegador.');
            }
        }
        startCamera();

        return () => {
            isMounted = false;
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
            if (videoRef.current && videoRef.current.srcObject) {
                const s = videoRef.current.srcObject;
                if (s.getTracks) s.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        };
    }, []);

    const handleClose = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        onClose();
    };

    const captureAndScan = async () => {
        if (!videoRef.current || !canvasRef.current || scanning) return;
        setScanning(true);
        setStatus('Procesando imagen...');

        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        const vW = video.videoWidth || 640;
        const vH = video.videoHeight || 480;
        
        const cropW = vW * 0.8;
        const cropH = vH * 0.25;
        const startX = (vW - cropW) / 2;
        const startY = (vH - cropH) / 2;

        canvas.width = cropW;
        canvas.height = cropH;
        
        const ctx = canvas.getContext('2d');
        ctx.filter = 'contrast(1.5) grayscale(1)';
        ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, cropW, cropH);

        const imgData = canvas.toDataURL('image/jpeg', 0.85);

        try {
            setStatus('Analizando etiqueta con IA...');
            
            const { data: { text } } = await Tesseract.recognize(
                imgData,
                'spa',
                { logger: () => {} }
            );

            // Find all price-like numbers
            const allMatches = [...text.matchAll(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?!\d)/g)];
            
            if (allMatches.length > 0) {
                let bestCandidate = null;
                let rawMatch = '';

                for (const m of allMatches) {
                    const candidate = parsePriceCandidate(m[0]);
                    if (candidate.value > 0 && (!bestCandidate || candidate.value > bestCandidate.value)) {
                        bestCandidate = candidate;
                        rawMatch = m[0];
                    }
                }
            
                if (bestCandidate && bestCandidate.formatted) {
                    let nameStr = text.replace(rawMatch, '').replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').trim();
                    nameStr = nameStr.split(/\s+/).filter(w => w.length > 1).slice(0, 3).join(' ');
                    if (!nameStr) nameStr = 'Producto';
                    
                    if (stream) {
                        stream.getTracks().forEach(track => track.stop());
                    }
                    onScan({ price: bestCandidate.formatted, name: nameStr });
                } else {
                    setStatus('No encontré un precio claro. Intenta otra vez.');
                    setScanning(false);
                }
            } else {
                setStatus('No encontré un precio claro. Intenta otra vez.');
                setScanning(false);
            }
        } catch (err) {
            console.error("OCR Error:", err);
            setStatus(`Error de IA al leer: ${err?.message || 'Desconocido'}`);
            setScanning(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-center items-center">
            <div className="relative w-full h-full max-h-screen overflow-hidden bg-black/90">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover"
                />
                
                {/* Bounding box guide overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.5)]">
                    <div className="w-[80%] h-[25%] border-2 border-primary rounded-xl flex items-center justify-center relative">
                         <span className="absolute -top-8 text-white text-xs font-bold shadow-md bg-black/50 px-3 py-1 rounded-full whitespace-nowrap">Enfoca el precio aquí</span>
                         <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                         <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                         <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                         <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
                    </div>
                </div>

                <div className="absolute top-safe mt-6 right-6 z-20">
                    <button onClick={handleClose} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center text-white active:scale-90 transition-transform" aria-label="Cerrar escáner">
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                <div className="absolute bottom-safe mb-10 left-0 right-0 z-20 flex flex-col items-center gap-6 px-4">
                    <p className="text-white font-bold text-sm bg-black/60 px-5 py-2.5 rounded-full backdrop-blur-xl text-center max-w-[80%]">
                        {status}
                    </p>
                    
                    <button 
                        onClick={captureAndScan} 
                        disabled={scanning || !stream}
                        className={`w-20 h-20 rounded-full border-[3px] border-white/80 flex items-center justify-center p-1.5 transition-all active:scale-95 ${scanning ? 'opacity-50' : 'opacity-100 hover:border-primary'}`}
                        aria-label="Capturar precio"
                    >
                        <div className={`w-full h-full rounded-full bg-white ${scanning ? 'animate-pulse bg-primary/80' : ''}`}></div>
                    </button>
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}

export default PriceScanner;
