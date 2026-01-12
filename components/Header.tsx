import React, { useState, useRef, useEffect } from 'react';
import { TabType } from '../types';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  toggleTheme: () => void;
  theme: 'light' | 'dark';
  onUserClick: () => void;
  user: any;
  subscription?: string;
  trendFilter: 'up' | 'down' | null;
  setTrendFilter: (val: 'up' | 'down' | null) => void;
  showHero: boolean;
  onNavigate: (tab: TabType) => void;
  currentTab: TabType;
}

const Header: React.FC<HeaderProps> = ({ 
  searchTerm, 
  setSearchTerm, 
  toggleTheme, 
  theme, 
  onUserClick, 
  user,
  subscription = 'free',
  trendFilter,
  setTrendFilter,
  showHero,
  onNavigate,
  currentTab
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'about', label: 'Acerca de', icon: 'fa-circle-info' },
    { id: 'terms', label: 'Términos', icon: 'fa-file-shield' },
    { id: 'contact', label: 'Contacto', icon: 'fa-headset' }
  ];

  const handleNav = (id: string) => {
    onNavigate(id as TabType);
    setIsMenuOpen(false);
  };

  const getUserIconColor = () => {
    if (!user) return 'text-slate-900 dark:text-white';
    if (subscription === 'pro' || subscription === 'premium') return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('home')}>
          <div className="relative flex items-center justify-center h-6 w-8">
            <i className="fa-solid fa-cart-shopping text-lg text-slate-900 dark:text-white"></i>
            <i className="fa-solid fa-arrow-trend-up text-[10px] text-green-500 absolute -top-1 -right-0.5 bg-white dark:bg-black rounded-full p-0.5"></i>
          </div>
          <span className="font-extrabold text-xl tracking-tighter text-slate-900 dark:text-white">TradingChango</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4 mr-2 border-r border-slate-200 dark:border-slate-800 pr-4">
            {navItems.map(item => (
              <button 
                key={item.id}
                onClick={() => handleNav(item.id)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Mobile Nav Dropdown */}
          <div className="relative md:hidden" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400"
            >
              <i className={`fa-solid ${isMenuOpen ? 'fa-xmark' : 'fa-ellipsis-vertical'} text-lg`}></i>
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
                {navItems.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-left transition-colors"
                  >
                    <i className={`fa-solid ${item.icon} text-slate-400 w-4`}></i>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={onUserClick}
              className={`w-10 h-10 flex items-center justify-center text-xl transition-colors ${getUserIconColor()}`}
            >
              <i className="fa-solid fa-circle-user"></i>
            </button>
            <button 
              onClick={toggleTheme} 
              className="w-10 h-10 flex items-center justify-center text-xl text-slate-900 dark:text-white hover:scale-110 transition-transform"
            >
              <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
          </div>
        </div>
      </div>

      <div className="relative mb-3">
        <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input 
          type="text" 
          placeholder="BUSCAR PRODUCTO..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <i className="fa-solid fa-circle-xmark"></i>
          </button>
        )}
      </div>

      {currentTab !== 'favs' && (
        <div className="flex gap-2 animate-in fade-in duration-300">
          <button 
            onClick={() => setTrendFilter(trendFilter === 'down' ? null : 'down')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
              trendFilter === 'down' 
                ? 'bg-green-500 text-white border-green-500' 
                : 'bg-white dark:bg-black text-green-500 border-slate-200 dark:border-slate-800'
            }`}
          >
            <i className="fa-solid fa-arrow-trend-down"></i> Precios Bajando
          </button>
          <button 
            onClick={() => setTrendFilter(trendFilter === 'up' ? null : 'up')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
              trendFilter === 'up' 
                ? 'bg-red-500 text-white border-red-500' 
                : 'bg-white dark:bg-black text-red-500 border-slate-200 dark:border-slate-800'
            }`}
          >
            <i className="fa-solid fa-arrow-trend-up"></i> Precios Subiendo
          </button>
        </div>
      )}

      {showHero && (
        <div className="mt-8 text-center px-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight">Los precios del super como nunca los viste</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">Analizá tendencias y compará antes de comprar</p>
        </div>
      )}
    </header>
  );
};

export default Header;