import React, { useRef, useState, useCallback, useEffect } from 'react';

interface BarcodeScannerProps {
  onScan: (ean: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);

  // Detener todo de forma segura
  const stopStream = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Loop de detección
  const startDetection = useCallback(async () => {
    if (!videoRef.current || !detectorRef.current) return;

    const detect = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes.length > 0) {
            const ean = barcodes[0].rawValue;
            stopStream();
            onScan(ean);
            return; // Detenemos el loop
          }
        } catch (e) {
          // Errores silenciosos de detección frame a frame
        }
      }
      animationRef.current = requestAnimationFrame(detect);
    };
    
    animationRef.current = requestAnimationFrame(detect);
  }, [onScan, stopStream]);

  const initCamera = useCallback(async () => {
    setLoading(true);
    setError(null);
    stopStream();

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
        
        // Manejo del evento para evitar el AbortError
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            setLoading(false);

            // Inicializar el detector nativo si existe
            if ('BarcodeDetector' in window) {
              // @ts-ignore
              detectorRef.current = new BarcodeDetector({
                formats: ['ean_13', 'ean_8', 'upc_a', 'code_128']
              });
              startDetection();
            } else {
              setError("Escaneo automático no soportado en este navegador. Usa el modo manual.");
            }
          } catch (playError: any) {
            if (playError.name !== 'AbortError') {
              setError("Error al reproducir el video de la cámara.");
            }
          }
        };
      }
    } catch (err: any) {
      console.error("Error de cámara:", err);
      setLoading(false);
      if (err.name === 'NotAllowedError') {
        setError("Permiso denegado. Revisa la configuración de privacidad de tu navegador/sistema.");
      } else {
        setError(`No se pudo acceder a la cámara (${err.name}).`);
      }
    }
  }, [stopStream, startDetection]);

  useEffect(() => {
    initCamera();
    return () => stopStream();
  }, [initCamera, stopStream]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim().length >= 8) {
      onScan(manualInput.trim());
    }
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1f2c34] rounded-xl overflow-hidden shadow-2xl z-[100] border border-neutral-200 dark:border-neutral-700">
      <div className="relative bg-black aspect-video flex items-center justify-center">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${loading || error ? 'opacity-0' : 'opacity-100'} transition-opacity`}
          playsInline
          muted
        />
        
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-xs">Iniciando cámara...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-neutral-900 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        {/* Guía visual para el usuario */}
        {!loading && !error && (
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                <div className="w-full h-full border-2 border-blue-500/50 rounded-sm"></div>
            </div>
        )}
      </div>

      <div className="p-4 bg-white dark:bg-[#1f2c34]">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Código de barras..."
            className="flex-1 px-3 py-2 bg-neutral-100 dark:bg-[#0d1418] border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            inputMode="numeric"
          />
          <button
            type="submit"
            disabled={manualInput.length < 8}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            OK
          </button>
        </form>

        <button
          onClick={() => { stopStream(); onClose(); }}
          className="w-full mt-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
        >
          Cancelar y cerrar
        </button>
      </div>
    </div>
  );
};

export default React.memo(BarcodeScanner);