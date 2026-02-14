import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (ean: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Configuramos el scanner
    scannerRef.current = new Html5QrcodeScanner(
      "reader", // ID del elemento HTML
      { 
        fps: 10, 
        qrbox: { width: 250, height: 150 }, // Área de escaneo
        formatsToSupport: [ 
          Html5QrcodeSupportedFormats.EAN_13, 
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128 
        ],
        rememberLastUsedCamera: true,
        aspectRatio: 1.777778 // 16:9
      },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        // Al detectar un código
        if (scannerRef.current) {
          scannerRef.current.clear().then(() => {
            onScan(decodedText);
          });
        }
      },
      (error) => {
        // Errores de escaneo frame a frame (se ignoran)
      }
    );

    // Limpieza al desmontar el componente
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Error al limpiar scanner", err));
      }
    };
  }, [onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim().length >= 8) {
      onScan(manualInput.trim());
    }
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1f2c34] rounded-xl overflow-hidden shadow-2xl z-[100] border border-neutral-200 dark:border-neutral-700">
      {/* Contenedor del Scanner */}
      <div id="reader" className="w-full bg-black"></div>

      <div className="p-4">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Código EAN manual..."
            className="flex-1 px-3 py-2 bg-neutral-100 dark:bg-[#0d1418] border-none rounded-lg text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            inputMode="numeric"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            OK
          </button>
        </form>

        <button
          onClick={onClose}
          className="w-full mt-3 py-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          Cancelar y cerrar
        </button>
      </div>

      {/* Estilos para "limpiar" la interfaz de la librería */}
      <style>{`
        #reader { border: none !important; }
        #reader img { display: none; }
        #reader __dashboard_section_csr { padding: 10px !important; }
        button[id^="html5-qrcode-button"] {
          background-color: #2563eb !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          font-size: 14px !important;
          margin-top: 10px !important;
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;