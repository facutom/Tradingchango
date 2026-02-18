import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="mt-4 mb-6 px-4 py-2 border-t border-neutral-100 dark:border-neutral-900">
      <div className="flex flex-col items-center text-center">
        <div className="w-full max-w-screen-md mx-auto mb-4">
          <div className="flex justify-center mb-3">
            <a href="https://linktr.ee/facutom" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700">
              <img src="https://ugc.production.linktr.ee/2fb027da-4522-4b25-8855-39f77182ce8b_mQO6eyvY-400x400.png?io=true&size=avatar-v3_0&format=webp&resize=40x40" alt="Facu Tom" className="w-5 h-5 rounded-full" width="20" height="20" loading="lazy" decoding="async" />
              Creado por @facutom
            </a>
          </div>
          <div className="flex justify-center gap-3 sm:gap-6 text-[10px] sm:text-[12px]">
            <Link to="/comparar-precios" className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white whitespace-nowrap">Comparar Precios</Link>
            <Link to="/como-ahorrar" className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white whitespace-nowrap">Cómo Ahorrar</Link>
            <Link to="/historial-precios" className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white whitespace-nowrap">Historial Precios</Link>
            <Link to="/ofertas-semana" className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white whitespace-nowrap">Ofertas Semana</Link>
            <Link to="https://bestgaming.com.ar/" target="_blank" rel="noopener noreferrer" className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white whitespace-nowrap" > BestGaming </Link>
          </div>
        </div>
        <p className="text-[10px] font-mono font-bold text-neutral-600 dark:text-neutral-700 uppercase tracking-[0.2em]">
          © 2026 TradingChango Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;