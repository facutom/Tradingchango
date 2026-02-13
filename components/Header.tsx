import React, { useState, useRef, useEffect, lazy, Suspense, memo, useCallback } from 'react';
import { TabType, Profile } from '../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';

// Code splitting del escáner - solo carga cuando se necesita
const BarcodeScanner = lazy(() => import('./BarcodeScanner'));

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  toggleTheme: () => void;
  theme: 'light' | 'dark';
  onUserClick: () => void;
  user: any;
  profile: Profile | null;
  trendFilter: 'up' | 'down' | null;
  setTrendFilter: (val: 'up' | 'down' | null) => void;
  onEANFound?: (ean: string) => void;
}

const Header: React.FC<HeaderProps> = memo(({ 
  searchTerm, 
  setSearchTerm, 
  toggleTheme, 
  theme, 
  onUserClick, 
  user,
  profile,
  trendFilter,
  setTrendFilter,
  onEANFound,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const showHero = location.pathname === '/' && !searchTerm && !trendFilter;
  const hideSearch = ['/acerca-de', '/terminos', '/contacto'].includes(location.pathname);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPro = profile?.subscription === 'pro' && profile.subscription_end && new Date(profile.subscription_end) > new Date();

  const handleScan = useCallback((ean: string) => {
    if (onEANFound) {
      onEANFound(ean);
    }
    setShowScanner(false);
  }, [onEANFound]);

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-primary p-4 border-b border-neutral-100 dark:border-[#233138]">
      <div className="flex justify-between items-center mb-4">
        <Link to="/" className="logo-link cursor-pointer ml-2">
          <div className="logo">
            <div className="logo-icon-wrapper">
               <i className="fa-solid fa-cart-shopping"></i>
               <i className="fa-solid fa-arrow-trend-up trend-icon-overlay"></i>
            </div>
            TradingChango
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-4 mr-2">
            <Link to="/acerca-de" className="text-[11px] font-bold uppercase tracking-widest text-black dark:text-[#e9edef] hover:opacity-70 transition-colors">Acerca de</Link>
            <Link to="/terminos" className="text-[11px] font-bold uppercase tracking-widest text-black dark:text-[#e9edef] hover:opacity-70 transition-colors">Terminos</Link>
            <Link to="/contacto" className="text-[11px] font-bold uppercase tracking-widest text-black dark:text-[#e9edef] hover:opacity-70 transition-colors">Contacto</Link>
          </div>

          <div className="relative md:hidden" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-8 h-8 flex items-center justify-center text-black dark:text-[#e9edef]" aria-label="Menu de informacion">
              <i className="fa-solid fa-circle-info text-xl"></i>
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#1f2c34] border border-neutral-200 dark:border-[#233138] rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in duration-200">
                <Link to="/acerca-de" onClick={() => setIsMenuOpen(false)} className="block w-full text-left px-4 py-3 text-[11px] font-bold uppercase dark:text-[#e9edef] hover:bg-neutral-50 dark:hover:bg-[#233138] rounded-lg">Acerca de</Link>
                <Link to="/terminos" onClick={() => setIsMenuOpen(false)} className="block w-full text-left px-4 py-3 text-[11px] font-bold uppercase dark:text-[#e9edef] hover:bg-neutral-50 dark:hover:bg-[#233138] rounded-lg">Terminos</Link>
                <Link to="/contacto" onClick={() => setIsMenuOpen(false)} className="block w-full text-left px-4 py-3 text-[11px] font-bold uppercase dark:text-[#e9edef] hover:bg-neutral-50 dark:hover:bg-[#233138] rounded-lg">Contacto</Link>
                <a href="https://x.com/tradingchango" target="_blank" rel="noopener noreferrer" onClick={() => setIsMenuOpen(false)} className="block w-full text-left px-4 py-3 text-[11px] font-bold uppercase dark:text-[#e9edef] hover:bg-neutral-50 dark:hover:bg-[#233138] rounded-lg">Seguinos en X</a>
              </div>
            )}
          </div>

          <a href="https://twitter.com/tradingchango" target="_blank" rel="noopener noreferrer" className="hidden md:flex w-8 h-8 items-center justify-center text-black dark:text-[#e9edef] hover:opacity-70 transition-opacity" aria-label="Seguinos en Twitter">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
          </a>
          <button onClick={onUserClick} className="w-8 h-8 flex items-center justify-center text-black dark:text-[#e9edef]" aria-label="Perfil de usuario">
            <i className={`fa-solid fa-circle-user text-xl ${isPro ? 'text-green-600' : ''}`}></i>
          </button>
          <button onClick={toggleTheme} className="text-black dark:text-[#e9edef] hover:opacity-70 transition-opacity" aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}>
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-xl`}></i>
          </button>
        </div>
      </div>

      {/* Buscador con boton de escaneo EAN */}
  {!hideSearch && (
    <div className="relative mb-2 max-w-2xl mx-auto w-full px-2"> 
      <i className="fa-solid fa-search absolute left-6 top-1/2 -translate-y-1/2 text-neutral-500 text-xs"></i>
      <input 
        type="text" 
        placeholder="BUSCAR PRODUCTO O ESCANEAR..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full bg-neutral-50 dark:bg-[#1f2c34] border border-neutral-200 dark:border-[#233138] rounded-lg py-2 pl-12 pr-24 text-sm font-medium focus:outline-none transition-all text-black dark:text-[#e9edef] placeholder:text-neutral-500"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="text-neutral-500 hover:text-black dark:hover:text-white transition-colors w-6 h-6 flex items-center justify-center"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        )}
        <button 
          onClick={() => setShowScanner(!showScanner)}
          className={`p-1.5 rounded-md transition-colors ${showScanner ? 'bg-red-500 text-white' : 'text-neutral-500 hover:text-black dark:hover:text-white bg-neutral-100 dark:bg-[#233138]'}`}
          title={showScanner ? 'Detener escaneo' : 'Escanear codigo de barras'}
        >
          <i className={`fa-solid ${showScanner ? 'fa-stop' : 'fa-barcode'} text-sm`}></i>
        </button>
      </div>
      
      {/* Video de escaneo con lazy loading */}
      {showScanner && (
        <Suspense fallback={
          <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 rounded-lg p-4 text-center z-50">
            <div className="w-8 h-8 border-2 border-t-transparent border-white rounded-full animate-spin mx-auto"></div>
            <p className="text-white text-xs mt-2">Cargando escáner...</p>
          </div>
        }>
          <BarcodeScanner 
            onScan={handleScan} 
            onClose={() => setShowScanner(false)} 
          />
        </Suspense>
      )}
    </div>
  )}

       {!['/chango', '/acerca-de', '/terminos', '/contacto'].includes(location.pathname) && (
         <div className="flex gap-2">
           <button 
             onClick={() => setTrendFilter(trendFilter === 'down' ? null : 'down')} 
             className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-[11px] font-[800] uppercase border transition-all ${trendFilter === 'down' ? 'bg-green-700 text-white border-green-700 shadow-lg shadow-green-700/20' : 'bg-white dark:bg-primary text-green-700 dark:border-[#233138] dark:border-[#233138]'}`}
             aria-label="Filtrar por precios que estan bajando"
           >
             <i className="fa-solid fa-arrow-trend-down"></i> Precios bajando
           </button>
           <button 
             onClick={() => setTrendFilter(trendFilter === 'up' ? null : 'up')} 
             className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-[11px] font-[800] uppercase border transition-all ${trendFilter === 'up' ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20' : 'bg-white dark:bg-primary text-red-600 dark:border-[#233138] dark:border-[#233138]'}`}
             aria-label="Filtrar por precios que estan subiendo"
           >
             <i className="fa-solid fa-arrow-trend-up"></i> Precios subiendo
           </button>
         </div>
       )}

       {showHero && (
       <div className="flex flex-col items-center mt-6 mb-2 px-4 w-full overflow-hidden">
   <h2 className="text-[4.5vw] xs:text-[18px] sm:text-[22px] font-[800] text-black dark:text-white leading-none tracking-tighter font-sans whitespace-nowrap">
     Los precios del super como nunca los viste
   </h2>
   <p className="mt-1.5 text-[12px] sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium text-center tracking-tight">
     Analiza tendencias y compara antes de comprar
   </p>
 </div>
       )}
    </header>
  );
});

export default Header;
