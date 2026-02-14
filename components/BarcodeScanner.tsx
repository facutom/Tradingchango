import React, { useRef, useState, useCallback, useEffect } from 'react';

// Throttle para el escaneo (ms) - usa setInterval que es más eficiente que requestAnimationFrame
const SCAN_INTERVAL_MS = 300;

interface BarcodeScannerProps {
  onScan: (ean: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const detectorRef = useRef<any>(null);
  const lastEanRef = useRef<string>('');
  const isActiveRef = useRef(true);

  const stopStream = useCallback(() => {
    isActiveRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startManualScan = useCallback(() => {
    const ean = prompt('Ingresa el código EAN del producto:');
    if (ean && ean.length >= 8) {
      onScan(ean);
      stopStream();
      onClose();
    } else if (ean) {
      alert('EAN inválido. Debe tener al menos 8 dígitos.');
      // Permitir intentar de nuevo
      setTimeout(() => startManualScan(), 100);
    }
  }, [onScan, onClose, stopStream]);

  const startScan = useCallback(async () => {
    setScanError(null);
    isActiveRef.current = true;
    lastEanRef.current = '';

    try {
      // Verificar si Barcode Detection API está disponible
      if (!('BarcodeDetector' in window)) {
        // API no disponible, ir directamente a modo manual
        setManualMode(true);
        return;
      }

      // @ts-ignore - BarcodeDetector es experimental
      detectorRef.current = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Usar setInterval que es más eficiente que requestAnimationFrame para este caso
        intervalRef.current = setInterval(async () => {
          if (!isActiveRef.current || !videoRef.current || !detectorRef.current) return;

          try {
            // Solo detectar si el video está listo
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              const barcodes = await detectorRef.current.detect(videoRef.current);

              if (barcodes.length > 0) {
                const ean = barcodes[0].rawValue;
                
                // Evitar escaneos duplicados del mismo código
                if (ean !== lastEanRef.current) {
                  lastEanRef.current = ean;
                  stopStream();
                  onScan(ean);
                }
              }
            }
          } catch (e) {
            // Silenciar errores de detección para evitar spam en consola
          }
        }, SCAN_INTERVAL_MS);
      }
    } catch (error: any) {
      console.error('Error accediendo a la cámara:', error.name);
      
      // Determinar el mensaje de error apropiado
      if (error.name === 'NotAllowedError') {
        setScanError('Permiso denegado. Usa el modo manual.');
      } else if (error.name === 'NotFoundError') {
        setScanError('No se encontró cámara.');
      } else if (error.name === 'NotReadableError') {
        setScanError('Cámara en uso por otra app.');
      } else {
        setScanError('Error de cámara. Usa el modo manual.');
      }
      
      // Cambiar a modo manual después de un error
      setManualMode(true);
    }
  }, [onScan, onClose, stopStream]);

  useEffect(() => {
    startScan();

    return () => {
      stopStream();
    };
  }, [startScan, stopStream]);

  // Si está en modo manual, mostrar input
  if (manualMode) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1f2c34] rounded-lg overflow-hidden z-50 shadow-xl">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fa-solid fa-barcode text-xl text-neutral-500"></i>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Escanear código de barras
            </span>
          </div>
          
          <input
            type="text"
            placeholder="Ingresa el código EAN..."
            autoFocus
            className="w-full px-3 py-2 border border-neutral-300 dark:border-[#233138] rounded-lg bg-neutral-50 dark:bg-[#0d1418] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = (e.target as HTMLInputElement).value;
                if (value && value.length >= 8) {
                  onScan(value);
                  stopStream();
                  onClose();
                }
              }
            }}
          />
          
          <p className="text-xs text-neutral-500 mt-2">
            O intenta{' '}
            <button 
              onClick={startScan}
              className="text-blue-500 hover:underline"
            >
              usar la cámara
            </button>
          </p>
        </div>
        
        <div className="bg-neutral-100 dark:bg-[#0d1418] p-2 flex justify-end">
          <button
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-sm rounded-lg"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-black rounded-lg overflow-hidden z-50">
      <video
        ref={videoRef}
        className="w-full h-48 object-cover"
        playsInline
        muted
      />
      {scanError && (
        <div className="bg-amber-600 text-white text-xs p-2 flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation"></i>
          {scanError}
        </div>
      )}
      <div className="bg-white dark:bg-[#1f2c34] p-2 flex justify-between items-center">
        <p className="text-xs text-neutral-500">Apunta el código de barras</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              stopStream();
              setManualMode(true);
            }}
            className="px-3 py-1 bg-neutral-100 dark:bg-neutral-700 text-xs rounded flex items-center gap-1"
          >
            <i className="fa-solid fa-keyboard"></i>
            Manual
          </button>
          <button
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="px-3 py-1 bg-neutral-200 dark:bg-neutral-700 text-xs rounded"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BarcodeScanner);
