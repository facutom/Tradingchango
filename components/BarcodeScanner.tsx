import React, { useRef, useState, useCallback, useEffect } from 'react';

interface BarcodeScannerProps {
  onScan: (ean: string) => void;
  onClose: () => void;
}

const hasBarcodeDetector = 'BarcodeDetector' in window;

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [cameraStarted, setCameraStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastEanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const stopStream = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const detectBarcodes = useCallback(async (detector: any) => {
    if (!videoRef.current || !detector) return;
    
    const video = videoRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    try {
      const barcodes = await detector.detect(video);
      
      if (barcodes.length > 0) {
        const ean = barcodes[0].rawValue;
        const now = Date.now();
        
        if (ean !== lastEanRef.current || now - lastScanTimeRef.current > 2000) {
          lastEanRef.current = ean;
          lastScanTimeRef.current = now;
          stopStream();
          onScan(ean);
        }
      }
    } catch (e) {
      // Silenciar errores de detección
    }
  }, [onScan, stopStream]);

  const startScanLoop = useCallback((detector: any) => {
    const scan = async () => {
      if (!streamRef.current) return;
      
      await detectBarcodes(detector);
      
      if (streamRef.current) {
        animationRef.current = requestAnimationFrame(scan);
      }
    };
    
    animationRef.current = requestAnimationFrame(scan);
  }, [detectBarcodes]);

  const startCamera = useCallback(async () => {
    setError(null);
    setCameraStarted(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          
          if (hasBarcodeDetector) {
            // @ts-ignore
            const detector = new BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
            });
            startScanLoop(detector);
          } else {
            setTimeout(() => {
              if (streamRef.current) {
                stopStream();
                setError('Tu navegador no soporta escaneo de códigos. Usa el modo manual.');
              }
            }, 2000);
          }
        };
      }
    } catch (err: any) {
      console.error('Error de cámara:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado. Por favor, permite el acceso a la cámara en tu navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró cámara en este dispositivo.');
      } else if (err.name === 'NotReadableError') {
        setError('La cámara está en uso por otra aplicación.');
      } else if (err.name === 'OverconstrainedError') {
        setError('La cámara no cumple con los requisitos.');
      } else {
        setError('Error al acceder a la cámara.');
      }
    }
  }, [startScanLoop, stopStream]);

  const handleManualSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const ean = manualInput.trim();
    if (ean.length >= 8) {
      onScan(ean);
      setManualInput('');
    }
  }, [manualInput, onScan]);

  useEffect(() => {
    // NO iniciar la cámara automáticamente
    
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-black rounded-lg overflow-hidden z-50">
      {/* Video container */}
      <div className="relative">
        {!cameraStarted ? (
          // Botón para iniciar la cámara
          <div className="w-full h-48 bg-neutral-800 flex items-center justify-center">
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📷 Activar Cámara
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-48 object-cover"
            playsInline
            muted
            autoPlay
          />
        )}
        
        {/* Overlay de error */}
        {error && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
            <p className="text-white text-sm text-center">{error}</p>
          </div>
        )}
        
        {/* Loading indicator */}
        {!error && cameraStarted && (
          <div className="absolute top-2 right-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
      
      {/* Modo manual */}
      <form onSubmit={handleManualSubmit} className="bg-white dark:bg-[#1f2c34] p-3">
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
        <p className="text-xs text-neutral-500 mt-2 text-center">
          {cameraStarted ? 'O apunta la cámara al código de barras' : 'O activa la cámara para escanear'}
        </p>
      </form>
      
      {/* Botón cerrar */}
      <div className="bg-neutral-100 dark:bg-[#0d1418] p-2 flex justify-end">
        <button
          onClick={() => {
            stopStream();
            onClose();
          }}
          className="px-4 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-sm rounded-lg"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default React.memo(BarcodeScanner);