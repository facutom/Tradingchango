import React, { useRef, useState, useCallback, useEffect } from 'react';

interface BarcodeScannerProps {
  onScan: (ean: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startScan = useCallback(async () => {
    setScanError(null);
    setIsScanning(true);

    try {
      // Verificar si Barcode Detection API está disponible
      if (!('BarcodeDetector' in window)) {
        // API no disponible, pedir EAN manualmente
        const ean = prompt('Ingresa el codigo EAN del producto:');
        if (ean) {
          onScan(ean);
        }
        stopStream();
        onClose();
        return;
      }

      // @ts-ignore - BarcodeDetector es experimental
      const barcodeDetector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        const scan = async () => {
          if (!videoRef.current || !isScanning) return;

          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);

            if (barcodes.length > 0) {
              const ean = barcodes[0].rawValue;
              stopStream();
              onScan(ean);
              return;
            }
          } catch (e) {
            console.error('Error escaneando:', e);
          }

          // Continuar escaneando
          if (isScanning) {
            animationRef.current = requestAnimationFrame(scan);
          }
        };

        animationRef.current = requestAnimationFrame(scan);
      }
    } catch (error: any) {
      console.error('Error accediendo a la camara:', error);
      setScanError('No se pudo acceder a la camara');
      setIsScanning(false);

      // Si el usuario denegó el permiso, pedir EAN manualmente
      if (error.name === 'NotAllowedError') {
        const ean = prompt('Permiso de camara denegado. Ingresa el codigo EAN del producto:');
        if (ean) {
          onScan(ean);
        }
        onClose();
      }
    }
  }, [isScanning, onScan, onClose, stopStream]);

  useEffect(() => {
    startScan();

    return () => {
      stopStream();
    };
  }, [startScan, stopStream]);

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-black rounded-lg overflow-hidden z-50">
      <video
        ref={videoRef}
        className="w-full h-48 object-cover"
        playsInline
      />
      {scanError && (
        <div className="bg-red-500 text-white text-xs p-2">
          {scanError}
        </div>
      )}
      <div className="bg-white dark:bg-[#1f2c34] p-2 flex justify-between items-center">
        <p className="text-xs text-neutral-500">Apunta el codigo de barras a la camara</p>
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
  );
};

export default React.memo(BarcodeScanner);
