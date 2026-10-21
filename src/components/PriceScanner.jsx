import React, { useState, useRef, useEffect } from 'react';
import { scanPriceTag, preprocessCanvasForOCR } from '../services/ocrService';

function PriceScanner({ onScan, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    const [status, setStatus] = useState('Iniciando cámara...');
    const [progress, setProgress] = useState(0);
    const [stream, setStream] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [detectedCandidates, setDetectedCandidates] = useState([]);
    const [detectedName, setDetectedName] = useState('');

    // Close handler ensuring camera tracks are stopped
    const handleClose = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        onClose();
    };

    const streamRef = useRef(stream);
    streamRef.current = stream;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // Close scanner on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // 2. Camera stream lifecycle
    useEffect(() => {
        let isMounted = true;
        let activeStream = null;

        async function startCamera() {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
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
                setStatus('Apunta al precio y presiona Capturar');
                setErrorMessage(null);
            } catch (err) {
                if (!isMounted) return;
                console.error("Camera access error:", err);
                setStatus('No se pudo acceder a la cámara en vivo.');
                setErrorMessage('Puedes usar el botón "Tomar foto con cámara nativa" para tomar una foto con autofoco y flash.');
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

    // 3. Process image and run OCR
    const processImageSource = async (sourceElement, cropArea = null) => {
        setScanning(true);
        setErrorMessage(null);
        setDetectedCandidates([]);

        try {
            const result = await scanPriceTag(sourceElement, {
                crop: cropArea,
                onProgress: (p) => {
                    setStatus(p.label || 'Leyendo precio...');
                    setProgress(p.progress || 0);
                }
            });

            if (result.candidates && result.candidates.length > 0) {
                // If only 1 candidate, or 1 clear best candidate, finish or allow selection
                if (result.candidates.length === 1 || result.bestCandidate) {
                    const best = result.bestCandidate || result.candidates[0];
                    if (result.candidates.length > 1) {
                        // Show candidates so user can confirm which one they wanted
                        setDetectedCandidates(result.candidates);
                        setDetectedName(result.suggestedName || '');
                        setStatus('Selecciona el precio correcto detectado:');
                        setScanning(false);
                        return;
                    }

                    // Directly deliver single candidate
                    if (stream) {
                        stream.getTracks().forEach(track => track.stop());
                    }
                    onScan({
                        price: best.formatted,
                        name: result.suggestedName || '',
                        currency: best.currency || 'USD'
                    });
                    return;
                }
            }

            // No clear price found
            setStatus('No encontramos un precio claro.');
            setErrorMessage('Intenta acercar más la cámara, enfocar la etiqueta o tomar una foto con la cámara nativa.');
            setScanning(false);
        } catch (err) {
            console.error('OCR Error:', err);
            setStatus('Error al procesar la imagen');
            setErrorMessage(
                err?.message?.includes('network') || err?.message?.includes('fetch')
                    ? 'Hubo un problema de conexión con el motor OCR (posiblemente por baja señal en el supermercado). Puedes reintentar o ingresar el precio a mano.'
                    : `Detalle: ${err?.message || 'Error desconocido'}`
            );
            setScanning(false);
        }
    };

    // Live video capture
    const captureFromVideo = () => {
        if (!videoRef.current || scanning) return;
        const video = videoRef.current;
        const vW = video.videoWidth || 640;
        const vH = video.videoHeight || 480;

        // Bounding box: center 80% width, 35% height
        const cropW = vW * 0.8;
        const cropH = vH * 0.35;
        const startX = (vW - cropW) / 2;
        const startY = (vH - cropH) / 2;

        processImageSource(video, { x: startX, y: startY, w: cropW, h: cropH });
    };

    // Native Camera / File Upload handler
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                processImageSource(img, null);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // User chooses a candidate chip
    const handleSelectCandidate = (candidate) => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        onScan({
            price: candidate.formatted,
            name: detectedName,
            currency: candidate.currency || 'USD'
        });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-between overflow-hidden select-none">
            {/* TOP BAR with safe area padding */}
            <div 
                className="w-full z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/90 via-black/60 to-transparent"
                style={{ paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)' }}
            >
                <button 
                    type="button"
                    onClick={handleClose} 
                    className="h-11 px-4 rounded-full bg-white/20 backdrop-blur-xl flex items-center gap-1.5 text-white font-bold text-sm active:scale-95 transition-transform shadow-lg border border-white/10"
                    aria-label="Volver a la lista"
                >
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                    <span>Volver</span>
                </button>

                <div className="flex items-center gap-2">
                    <span className="text-white/90 text-xs font-bold bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1">
                        <span className="material-symbols-outlined text-primary text-[14px]">document_scanner</span>
                        Escáner de Precio
                    </span>
                    <button 
                        type="button"
                        onClick={handleClose}
                        className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg border border-white/10"
                        aria-label="Cerrar escáner"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
            </div>

            {/* VIDEO & CAMERA VIEWPORT */}
            <div className="relative flex-1 w-full overflow-hidden bg-black flex items-center justify-center">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Bounding box guide overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.55)]">
                    <div className="w-[85%] max-w-sm h-[32%] border-2 border-primary/90 rounded-2xl flex items-center justify-center relative shadow-[0_0_20px_rgba(66,133,244,0.3)]">
                        <span className="absolute -top-7 text-white text-[11px] font-bold shadow-md bg-black/75 px-3 py-1 rounded-full whitespace-nowrap border border-white/15 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-secondary">crop_free</span>
                            Enfoca la etiqueta o precio aquí
                        </span>
                        
                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-primary rounded-tl-2xl"></div>
                        <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-primary rounded-tr-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-primary rounded-bl-2xl"></div>
                        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-primary rounded-br-2xl"></div>

                        {scanning && (
                            <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse shadow-[0_0_12px_#4285F4]"></div>
                        )}
                    </div>
                </div>

                {/* Detected Candidates Picker Overlay */}
                {detectedCandidates.length > 0 && (
                    <div className="absolute inset-x-4 top-20 z-40 bg-surface-container/95 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-2xl animate-slide-down">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                                Precios detectados
                            </p>
                            <button 
                                onClick={() => setDetectedCandidates([])} 
                                className="text-white/60 text-xs hover:text-white"
                            >
                                Reintentar
                            </button>
                        </div>
                        {detectedName && (
                            <p className="text-on-surface-variant text-xs mb-3 italic truncate font-medium">"{detectedName}"</p>
                        )}
                        <p className="text-outline text-xs mb-3">Toca el valor que deseas agregar:</p>
                        <div className="flex flex-wrap gap-2">
                            {detectedCandidates.map((cand, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectCandidate(cand)}
                                    className="press flex-1 min-w-[120px] py-3 px-4 rounded-xl bg-primary/20 border border-primary/40 text-white font-bold text-base flex flex-col items-center justify-center hover:bg-primary/30"
                                >
                                    <span className="text-primary text-xl tracking-tight leading-none">
                                        {cand.currency === 'VES' ? `Bs. ${cand.formatted}` : `$${cand.formatted}`}
                                    </span>
                                    <span className="text-[10px] text-white/70 mt-1 uppercase font-semibold">
                                        {cand.currency === 'VES' ? 'Bolívares' : 'Dólares / Ref'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* BOTTOM CONTROLS with safe area padding */}
            <div 
                className="w-full z-30 bg-gradient-to-t from-black via-black/85 to-transparent px-4 pb-6 pt-3 flex flex-col items-center gap-3"
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)' }}
            >
                {/* Status Message & Progress */}
                <div className="w-full max-w-sm flex flex-col items-center">
                    <p className="text-white font-bold text-xs bg-black/75 px-4 py-2 rounded-full backdrop-blur-xl text-center border border-white/10 shadow-lg">
                        {status}
                    </p>
                    {scanning && progress > 0 && (
                        <div className="w-48 h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
                            <div 
                                className="h-full bg-primary transition-all duration-200" 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Error Box with Actionable Fallbacks */}
                {errorMessage && (
                    <div className="w-full max-w-sm bg-error/20 border border-error/30 backdrop-blur-md p-3 rounded-2xl text-left animate-fade-in">
                        <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-error text-lg shrink-0 mt-0.5">warning</span>
                            <div className="text-xs text-white/90">
                                <p className="font-semibold mb-1">{errorMessage}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Buttons Row */}
                <div className="flex items-center justify-center gap-6 mt-1 w-full max-w-sm">
                    {/* Native Camera Macro / Gallery Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={scanning}
                        className="w-12 h-12 rounded-full well flex flex-col items-center justify-center text-white active:scale-95 transition-transform border border-white/15"
                        title="Tomar foto con cámara nativa o elegir de galería"
                        aria-label="Foto nativa o galería"
                    >
                        <span className="material-symbols-outlined text-xl">add_a_photo</span>
                    </button>
                    <input 
                        ref={fileInputRef} 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        onChange={handleFileUpload} 
                    />

                    {/* Main Capture Trigger */}
                    <button 
                        type="button"
                        onClick={captureFromVideo} 
                        disabled={scanning || !stream}
                        className={`w-20 h-20 rounded-full border-[3px] border-white flex items-center justify-center p-1.5 transition-all active:scale-90 shadow-2xl ${scanning ? 'opacity-50' : 'hover:scale-105 active:border-primary'}`}
                        aria-label="Capturar precio de la etiqueta"
                    >
                        <div className={`w-full h-full rounded-full bg-white flex items-center justify-center ${scanning ? 'animate-pulse bg-primary/80' : ''}`}>
                            <span className="material-symbols-outlined text-surface text-2xl">photo_camera</span>
                        </div>
                    </button>

                    {/* Cancel & Manual input button */}
                    <button
                        type="button"
                        onClick={handleClose}
                        className="w-12 h-12 rounded-full well flex flex-col items-center justify-center text-white active:scale-95 transition-transform border border-white/15"
                        title="Cancelar y escribir manualmente"
                        aria-label="Cerrar y escribir manual"
                    >
                        <span className="material-symbols-outlined text-xl">edit_note</span>
                    </button>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-white/70 mt-1">
                    <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()} 
                        className="underline hover:text-white"
                    >
                        Tomar foto nítida / Galería
                    </button>
                    <span>•</span>
                    <button 
                        type="button" 
                        onClick={handleClose} 
                        className="underline hover:text-white"
                    >
                        Ingresar a mano
                    </button>
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}

export default PriceScanner;
