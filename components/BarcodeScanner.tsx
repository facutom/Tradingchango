import React, { useRef, useState, useCallback, useEffect } from 'react';

interface BarcodeScannerProps {
  onScan: (ean: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  // 1. Limpieza absoluta
  const stopStream = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("Track detenido:", track.label);
      });
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    stopStream(); // Reset antes de empezar
    setError(null);

    try {
      console.log("Solicitando acceso a la cámara...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      if (videoRef.current) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        
        // Atributos críticos para navegadores modernos
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        
        await videoRef.current.play();
        setCameraActive(true);
        console.log("Cámara iniciada con éxito");

        // Iniciar detección solo si existe la API
        if ('BarcodeDetector' in window) {
          // @ts-ignore
          const detector = new BarcodeDetector({ formats: ['ean_13', 'code_128'] });
          const scan = async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  onScan(barcodes[0].rawValue);
                  return; // Salir del loop tras detectar
                }
              } catch (e) {}
            }
            animationRef.current = requestAnimationFrame(scan);
          };
          animationRef.current = requestAnimationFrame(scan);
        }
      }
    } catch (err: any) {
      console.error("Error detallado:", err);
      setError(`${err.name}: No se pudo acceder a la cámara.`);
    }
  };

  useEffect(() => {
    // Solo iniciamos si el componente está montado
    startCamera();
    return () => stopStream();
  }, []); // Array vacío para que solo ejecute UNA vez al montar

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-black rounded-lg overflow-hidden z-[100] shadow-2xl min-h-[200px]">
      <div className="relative">
        {/* VIDEO TAG: Asegúrate de que no esté oculto por CSS */}
        <video
          ref={videoRef}
          className={`w-full h-48 object-cover ${!cameraActive ? 'hidden' : 'block'}`}
          autoPlay
          muted
          playsInline
        />
        
        {!cameraActive && !error && (
          <div className="h-48 flex items-center justify-center text-white text-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="ml-3">Iniciando cámara...</span>
          </div>
        )}

        {error && (
          <div className="h-48 flex items-center justify-center p-4 bg-neutral-900">
            <p className="text-red-400 text-xs text-center">{error}</p>
          </div>
        )}
      </div>

      <div className="bg-white p-3 flex flex-col gap-2">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Código de barras manual..."
          className="w-full px-3 py-2 border rounded-lg text-black"
        />
        <div className="flex justify-between">
          <button onClick={onClose} className="text-sm text-gray-500">Cerrar</button>
          <button 
            onClick={() => onScan(manualInput)}
            disabled={manualInput.length < 8}
            className="bg-blue-600 text-white px-4 py-1 rounded-lg disabled:opacity-50"
          >
            Buscar
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BarcodeScanner);