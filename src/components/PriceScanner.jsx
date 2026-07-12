import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';

function PriceScanner({ onScan, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [status, setStatus] = useState('Iniciando cámara...');
    const [stream, setStream] = useState(null);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        let activeStream;
        async function startCamera() {
            try {
                activeStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = activeStream;
                }
                setStream(activeStream);
                setStatus('Apunta al precio y captura');
            } catch (err) {
                console.error("Camera access error:", err);
                setStatus('Error al acceder a la cámara. Da permisos en tu navegador.');
            }
        }
        startCamera();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const captureAndScan = async () => {
        if (!videoRef.current || !canvasRef.current || scanning) return;
        setScanning(true);
        setStatus('Procesando imagen...');

        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Calculate crop area (assuming center bounding box)
        const vW = video.videoWidth;
        const vH = video.videoHeight;
        
        // Hacer la zona de recorte mucho más horizontal (etiquetas de súper)
        const cropW = vW * 0.8;
        const cropH = vH * 0.2;
        const startX = (vW - cropW) / 2;
        const startY = (vH - cropH) / 2;

        canvas.width = cropW;
        canvas.height = cropH;
        
        const ctx = canvas.getContext('2d');
        // Filter to increase contrast before OCR
        ctx.filter = 'contrast(1.5) grayscale(1)';
        ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, cropW, cropH);

        const imgData = canvas.toDataURL('image/jpeg');

        try {
            setStatus('Analizando etiqueta con IA...');
            
            const { data: { text } } = await Tesseract.recognize(
                imgData,
                'eng',
                { logger: m => console.log(m) }
            );

            // Matches numbers like 14.50 or 1,200.00
            const priceMatch = text.match(/\d+([.,]\d+)?/);
            
            if (priceMatch) {
                let numStr = priceMatch[0];
                
                // Extraer un posible nombre eliminando el precio y caracteres raros
                let nameStr = text.replace(numStr, '').replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').trim();
                // Tomar las primeras 3 palabras para que no quede un nombre gigante y ruidoso
                nameStr = nameStr.split(/\s+/).filter(w => w.length > 1).slice(0, 3).join(' ');
                
                // Si no logró extraer un nombre válido, ponemos uno por defecto
                if (!nameStr) nameStr = 'Producto';
                
                onScan({ price: numStr, name: nameStr });
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
                    <div className="w-[80%] h-[20%] border-2 border-primary rounded-xl flex items-center justify-center relative">
                         <span className="absolute -top-8 text-white text-xs font-bold shadow-md bg-black/50 px-3 py-1 rounded-full whitespace-nowrap">Enfoca el precio aquí</span>
                         <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                         <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                         <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                         <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
                    </div>
                </div>

                <div className="absolute top-safe mt-6 right-6 z-20">
                    <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center text-white active:scale-90 transition-transform">
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
