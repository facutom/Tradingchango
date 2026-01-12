
import React from 'react';
import { Product } from '../types';

interface ProductWithStats extends Product {
  stats: {
    min: number;
    spread: string;
    trendClass: string;
    icon: string;
    isUp: boolean;
    isDown: boolean;
  };
}

interface ProductListProps {
  products: ProductWithStats[];
  onProductClick: (id: number) => void;
  onFavoriteToggle: (id: number) => void;
  isFavorite: (id: number) => boolean;
  isCartView?: boolean;
  quantities?: Record<number, number>;
  onUpdateQuantity?: (id: number, delta: number) => void;
}

const ProductList: React.FC<ProductListProps> = ({ 
  products, 
  onProductClick, 
  onFavoriteToggle, 
  isFavorite,
  isCartView,
  quantities,
  onUpdateQuantity
}) => {
  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);

  const getPromoLabel = (oferta: any) => {
    if (!oferta) return null;
    const values = Object.values(oferta).filter(v => typeof v === 'string' && v.length > 0);
    return values.length > 0 ? values[0] as string : null;
  };

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-900">
      {products.map((p) => {
        const fav = isFavorite(p.id);
        const qty = quantities ? (quantities[p.id] || 1) : 1;
        const promoLabel = getPromoLabel(p.oferta_gondola);

        return (
          <div 
            key={p.id} 
            onClick={() => onProductClick(p.id)}
            className="group flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer transition-colors"
          >
            <div className="flex-1 flex items-center justify-between pr-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                    {p.ticker || p.nombre.substring(0, 4).toUpperCase()}
                  </span>
                  {promoLabel && (
                    <span className="bg-green-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm">
                      {promoLabel}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1 max-w-[150px]">
                  {p.nombre}
                </span>
              </div>

              <div className="text-right">
                <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                  ${format(p.stats.min)}
                </span>
                <div className={`mt-1 font-mono text-[10px] font-bold ${p.stats.trendClass}`}>
                  {p.stats.icon} {p.stats.spread}%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isCartView && onUpdateQuantity && (
                <div 
                  className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={() => onUpdateQuantity(p.id, -1)}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold"
                  >
                    -
                  </button>
                  <span className="font-mono text-sm font-bold min-w-[20px] text-center">{qty}</span>
                  <button 
                    onClick={() => onUpdateQuantity(p.id, 1)}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold"
                  >
                    +
                  </button>
                </div>
              )}
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onFavoriteToggle(p.id);
                }}
                className={`text-xl transition-transform active:scale-90 ${fav ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700'}`}
              >
                <i className="fa-solid fa-cart-shopping"></i>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductList;
