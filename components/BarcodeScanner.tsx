import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface BarcodeScannerProps {
  onScan: (ean: string) => void;
  onClose: () => void;
}

// ============================================
// Web Worker para procesamiento de códigos
// ============================================
const workerCode = `
  self.onmessage = async function(e) {
    const { videoData, formats } = e.data;
    
    try {
      if (!('BarcodeDetector' in self)) {
        self.postMessage({ error: 'BarcodeDetector not supported' });
        return;
      }
      
      const detector = new BarcodeDetector({ formats: formats || ['ean_13', 'ean_8'] });
      const barcodes = await detector.detect(videoData);
      
      if (barcodes.length > 0) {
        self.postMessage({ barcode: barcodes[0].rawValue });
      } else {
        self.postMessage({ barcode: null });
      }
    } catch (error) {
      self.postMessage({ error: error.message });
    }
  };
`;

// ============================================
// Throttle configurado a 10fps (100ms)
// ============================================
const SCAN_THROTTLE_MS = 100;

// Crear el worker desde un blob
const createBarcodeWorker = (): Worker | null => {
  try {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    URL.revokeObjectURL(workerUrl);
    return worker;
  } catch (e) {
    console.warn('Web Worker not supported');
    return null;
  }
};

// ============================================
// Componente optimizado del Scanner
// ============================================
const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // Refs para el control del scanner
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastEanRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoizar el worker para evitar recrearlo
  const worker = useMemo(() => createBarcodeWorker(), []);

  // Cleanup function - garbage collection efectivo
  const cleanup = useCallback(() => {
    setIsActive(false);
    
    // Cancelar animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Detener todos los tracks del stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    
    // Terminar el worker
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    
    // Limpiar referencias
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Manejar cuando se detecta un código
  const handleDetection = useCallback((ean: string) => {
    const now = Date.now();
    
    // Evitar duplicados en 1.5 segundos
    if (ean === lastEanRef.current && now - lastScanTimeRef.current < 1500) {
      return;
    }
    
    lastEanRef.current = ean;
    lastScanTimeRef.current = now;
    
    cleanup();
    onScan(ean);
  }, [onScan, cleanup]);

  // Throttled scan function
  const scanFrame = useCallback(async () => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;
    
    const now = Date.now();
    if (now - lastScanTimeRef.current < SCAN_THROTTLE_MS) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    
    // Usar Offscreen Canvas si está disponible
    if ('OffscreenCanvas' in window && workerRef.current) {
      try {
        const offscreen = new OffscreenCanvas(video.videoWidth, video.videoHeight);
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          offCtx.drawImage(video, 0, 0);
          const imageData = offscreen.transferToImageBitmap();
          workerRef.current.postMessage({ 
            imageData,
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e']
          }, [imageData]);
        }
      } catch (e) {
        // Fallback a canvas normal
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        try {
          // @ts-ignore
          const detector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
          });
          const barcodes = await detector.detect(canvas);
          
          if (barcodes.length > 0) {
            handleDetection(barcodes[0].rawValue);
          }
        } catch (detectorErr) {
          // Silenciar errores de detección
        }
      }
    } else {
      // Fallback: procesamiento directo sin worker
      try {
        // @ts-ignore
        const detector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
        });
        const barcodes = await detector.detect(video);
        
        if (barcodes.length > 0) {
          handleDetection(barcodes[0].rawValue);
        }
      } catch (detectorErr) {
        // Silenciar errores de detección
      }
    }
    
    lastScanTimeRef.current = now;
    
    if (isActive) {
      animationRef.current = requestAnimationFrame(scanFrame);
    }
  }, [isActive, handleDetection]);

  // Inicializar el scanner
  const initScanner = useCallback(async () => {
    setError(null);
    setIsActive(true);
    lastScanTimeRef.current = 0;
    lastEanRef.current = '';

    // Configurar worker si está disponible
    if (worker) {
      workerRef.current = worker;
      
      worker.onmessage = (e) => {
        if (e.data.barcode) {
          handleDetection(e.data.barcode);
        }
      };
      
      worker.onerror = (e) => {
        console.warn('Worker error:', e);
      };
    }

    try {
      // Solicitar permisos de cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          
          // Iniciar loop de escaneo
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          animationRef.current = requestAnimationFrame(scanFrame);
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró cámara');
      } else if (err.name === 'NotReadableError') {
        setError('Cámara en uso por otra app');
      } else {
        setError('Error al acceder a la cámara');
      }
    }
  }, [worker, scanFrame, handleDetection]);

  // Cleanup al desmontar
  useEffect(() => {
    initScanner();

    return () => {
      cleanup();
    };
  }, [initScanner, cleanup]);

  // Manejar cierre
  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  // Submit manual
  const handleManualSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const ean = manualInput.trim();
    if (ean.length >= 8) {
      onScan(ean);
      setManualInput('');
      handleClose();
    }
  }, [manualInput, onScan, handleClose]);

  // Usar portal para evitar CLS
  const scannerContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        ref={containerRef}
        className="w-full max-w-md mx-4 bg-white dark:bg-[#1f2c34] rounded-xl overflow-hidden shadow-2xl"
        // Dimensiones fijas para evitar CLS
        style={{ width: '100%', maxWidth: '360px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video container con dimensiones fijas */}
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          
          {/* Canvas oculto para procesamiento */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Loading indicator */}
          {isActive && !error && (
            <div className="absolute top-3 right-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
          )}
          
          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4">
              <p className="text-white text-sm text-center">{error}</p>
            </div>
          )}
        </div>
        
        {/* Manual input */}
        <form onSubmit={handleManualSubmit} className="p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Escribe el código EAN..."
              className="flex-1 px-3 py-2 text-sm border border-neutral-300 dark:border-[#233138] rounded-lg bg-neutral-50 dark:bg-[#0d1418] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              inputMode="numeric"
            />
            <button
              type="submit"
              disabled={manualInput.length < 8}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buscar
            </button>
          </div>
        </form>
        
        {/* Close button */}
        <div className="bg-neutral-100 dark:bg-[#0d1418] p-3 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-sm rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  // Usar portal para renderizar fuera del DOM tree principal
  return createPortal(scannerContent, document.body);
};

export default React.memo(BarcodeScanner);
