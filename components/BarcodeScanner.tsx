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
  const [permissionState, setPermissionState] = useState<string>('');
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

  const checkPermission = useCallback(async () => {
    try {
      // Verificar si la API de permisos está disponible
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionState(result.state);
        return result.state;
      }
    } catch (e) {
      console.log('No se pudo verificar permisos:', e);
    }
    return 'unknown';
  }, []);

  const startCamera = useCallback(async () => {
  setError(null);
  setCameraStarted(true);

  try {
    // Forzamos la detención de cualquier rastro previo antes de pedir nuevo acceso
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    const constraints = {
      video: { facingMode: 'environment' }, // Sin medidas fijas para evitar OverconstrainedError
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      
      // Usamos el evento onloadedmetadata para asegurar que el hardware respondió
      videoRef.current.onloadedmetadata = async () => {
        try {
          await videoRef.current?.play();
          
          if (hasBarcodeDetector) {
            // @ts-ignore
            const detector = new BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
            });
            startScanLoop(detector);
          } else {
            // Si no hay API nativa, damos un tiempo para el modo manual
            setTimeout(() => {
              if (streamRef.current) {
                setError('Tu navegador no soporta escaneo automático. Usa el modo manual.');
              }
            }, 3000);
          }
        } catch (playErr) {
          console.error("Error al dar play al video:", playErr);
          setError("Haz clic de nuevo en 'Activar Cámara'.");
        }
      };
    }
  } catch (err: any) {
    console.error('Error detallado:', err);
    setCameraStarted(false);
    
    // Si persiste el NotAllowedError con HTTPS y permisos OK, 
    // es que el navegador requiere una re-activación manual
    if (err.name === 'NotAllowedError') {
      setError('Acceso denegado. Prueba refrescando la página o revisando que no haya otra pestaña abierta con la cámara.');
    } else {
      setError(`Error de cámara: ${err.name}`);
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
    checkPermission();
    
    return () => {
      stopStream();
    };
  }, [stopStream, checkPermission]);

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1f2c34] rounded-lg overflow-hidden shadow-lg z-50">
      {/* Video container */}
      <div className="relative bg-black">
        {!cameraStarted ? (
          <div className="w-full h-48 flex flex-col items-center justify-center gap-3 p-4">
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              📷 Activar Cámara
            </button>
            {permissionState && (
              <p className="text-xs text-neutral-400">
                Estado: {permissionState === 'granted' ? '✅ Permitido' : 
                         permissionState === 'denied' ? '🚫 Bloqueado' : 
                         '⚠️ No verificado'}
              </p>
            )}
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
          <div className="absolute inset-0 bg-black/95 flex items-center justify-center p-4">
            <p className="text-white text-xs text-left whitespace-pre-line leading-relaxed">
              {error}
            </p>
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
      <form onSubmit={handleManualSubmit} className="bg-white dark:bg-[#1f2c34] p-3 border-t border-neutral-200 dark:border-[#233138]">
        <div className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Código EAN manual..."
            className="flex-1 px-3 py-2 text-sm border border-neutral-300 dark:border-[#233138] rounded-lg bg-neutral-50 dark:bg-[#0d1418] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            inputMode="numeric"
            autoFocus
          />
          <button
            type="submit"
            disabled={manualInput.length < 8}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            ✓
          </button>
        </div>
        <p className="text-xs text-neutral-500 mt-2 text-center">
          Escribe el código o {cameraStarted ? 'escanea con la cámara' : 'activa la cámara'}
        </p>
      </form>
      
      {/* Botón cerrar */}
      <div className="bg-neutral-100 dark:bg-[#0d1418] p-2 flex justify-end border-t border-neutral-200 dark:border-[#233138]">
        <button
          onClick={() => {
            stopStream();
            onClose();
          }}
          className="px-4 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-sm rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default React.memo(BarcodeScanner);