
import React from 'react';
import { TabType } from '../types';

interface BottomNavProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  cartCount: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentTab, setCurrentTab, cartCount }) => {
  // Fix: Explicitly type the tabs array to include optional badge property
  const tabs: { id: TabType; label: string; icon: string; badge?: number }[] = [
    { id: 'home', label: 'Inicio', icon: 'fa-house' },
    { id: 'carnes', label: 'Carnes', icon: 'fa-drumstick-bite' },
    { id: 'verdu', label: 'Verdu', icon: 'fa-carrot' },
    { id: 'varios', label: 'Varios', icon: 'fa-layer-group' },
    { id: 'favs', label: 'Chango', icon: 'fa-cart-shopping', badge: cartCount }
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-screen-md bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 flex justify-around py-4 z-40">
      {tabs.map((tab) => (
        <button 
          key={tab.id}
          onClick={() => setCurrentTab(tab.id)}
          className={`relative flex flex-col items-center gap-1 w-1/5 transition-all duration-300 ${currentTab === tab.id ? 'text-slate-900 dark:text-white scale-110' : 'text-slate-400'}`}
        >
          <i className={`fa-solid ${tab.icon} text-lg`}></i>
          <span className={`text-[10px] font-bold ${currentTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
          
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="absolute -top-1 right-[20%] bg-slate-900 dark:bg-white text-white dark:text-black text-[9px] font-black min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-black animate-in zoom-in">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
