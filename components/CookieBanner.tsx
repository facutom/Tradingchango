import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_consent_KEY = 'tc_cookie_consent';

const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Solo mostrar si el usuario no ha aceptado anteriormente
    const hasAccepted = localStorage.getItem(COOKIE_consent_KEY);
    if (!hasAccepted) {
      // Pequeño delay para que no aparezca inmediatamente al cargar
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_consent_KEY, 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-16 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-[#1a2332] rounded-lg shadow-xl p-4 z-40 border border-neutral-200 dark:border-neutral-700 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Usamos cookies para mejorar tu experiencia de ahorro y asegurar el funcionamiento de la app. Al continuar navegando, aceptás nuestros <Link to="/terminos" className="text-blue-600 hover:underline">Términos y Condiciones</Link>.
        </p>
        
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Aceptar
          </button>
          <Link
            to="/terminos"
            className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 underline self-center px-2"
          >
            Más info
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
