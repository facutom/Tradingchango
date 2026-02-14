import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface BarcodeScannerProps {
  onScan: (ean: string) => void;
  onClose: () => void;
}

// ============================================
// Throttle configurado a 200ms (5fps) para mejor detección
// ============================================
const SCAN_THROTTLE_MS = 200;

// ============================================
// Componente optimizado del Scanner
// ============================================
const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [detectorSupported, setDetectorSupported] = useState<boolean | null>(null);
  
  // Refs para el control del scanner
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastEanRef = useRef<string>('');

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
    
    // Limpiar referencias
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Manejar cuando se detecta un código
  const handleDetection = useCallback((ean: string) => {
    const now = Date.now();
    
    // Evitar duplicados en 2 segundos
    if (ean === lastEanRef.current && now - lastScanTimeRef.current < 2000) {
      return;
    }
    
    console.log('Código detectado:', ean);
    lastEanRef.current = ean;
    lastScanTimeRef.current = now;
    
    cleanup();
    onScan(ean);
  }, [onScan, cleanup]);

  // Función principal de escaneo
  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !isActive) return;
    
    const now = Date.now();
    // Throttle: esperar entre detecciones
    if (now - lastScanTimeRef.current < SCAN_THROTTLE_MS) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    
    const video = videoRef.current;
    
    // Solo procesar si el video está listo y tiene datos
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    
    // Intentar detectar usando BarcodeDetector
    if (detectorRef.current) {
      try {
        const barcodes = await detectorRef.current.detect(video);
        
        if (barcodes.length > 0) {
          const ean = barcodes[0].rawValue;
          handleDetection(ean);
          return;
        }
      } catch (e) {
        // Silenciar errores y continuar
      }
    }
    
    lastScanTimeRef.current = now;
    
    if (isActive && streamRef.current) {
      animationRef.current = requestAnimationFrame(scanFrame);
    }
  }, [isActive, handleDetection]);

  // Inicializar el scanner
  const initScanner = useCallback(async () => {
    setError(null);
    setIsActive(true);
    lastScanTimeRef.current = 0;
    lastEanRef.current = '';

    // Verificar si BarcodeDetector está disponible
    const hasDetector = 'BarcodeDetector' in window;
    setDetectorSupported(hasDetector);
    
    console.log('BarcodeDetector disponible:', hasDetector);

    // Crear detector si está disponible
    if (hasDetector) {
      try {
        // @ts-ignore - BarcodeDetector es experimental
        detectorRef.current = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
        });
        console.log('Detector creado exitosamente');
      } catch (e) {
        console.error('Error creando detector:', e);
        setError('Error al inicializar el detector de códigos');
        return;
      }
    } else {
      setError('Tu navegador no soporta escaneo de códigos. Usa el modo manual.');
      return;
    }

    try {
      // Solicitar permisos de cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log('Video reproduce');
                // Iniciar loop de escaneo
                if (animationRef.current) {
                  cancelAnimationFrame(animationRef.current);
                }
                animationRef.current = requestAnimationFrame(scanFrame);
              })
              .catch(e => {
                console.error('Error al reproducir video:', e);
                setError('Error al iniciar la cámara');
              });
          }
        };
        
        videoRef.current.onerror = () => {
          setError('Error con el video');
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
  }, [scanFrame]);

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
        className="w-full max-w-md mx-4 bg-white dark:bg-[#1f2c34] rounded-xl overflow-hidden shadow-2xl"
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
          
          {/* Loading indicator */}
          {isActive && !error && detectorSupported && (
            <div className="absolute top-3 right-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
          )}
          
          {/* Status text */}
          {isActive && !error && (
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-white text-xs text-center bg-black/50 rounded py-1">
                Apunta al código de barras
              </p>
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
