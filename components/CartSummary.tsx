
import React, { useMemo, useState } from 'react';
import { Product, Benefit, UserMembership } from '../types';

interface CartSummaryProps {
  items: any[];
  favorites: Record<number, number>;
  benefits: Benefit[];
  userMemberships?: UserMembership[];
}

const CartSummary: React.FC<CartSummaryProps> = ({ items, favorites, benefits, userMemberships = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);

  const STORES = [
    { name: "COTO", index: 0 },
    { name: "CARREFOUR", index: 1 },
    { name: "DIA", index: 2 },
    { name: "JUMBO", index: 3 },
    { name: "MASONLINE", index: 4 }
  ];

  const results = useMemo(() => {
    return STORES.map((store) => {
      let subtotal = 0;
      let totalGondolaDiscount = 0;

      items.forEach(item => {
        const price = item.prices[store.index];
        const qty = favorites[item.id] || 1;
        if (price <= 0) {
          subtotal += 999999;
          return;
        }

        const itemSubtotal = price * qty;
        subtotal += itemSubtotal;

        const ofRaw = item.oferta_gondola;
        if (ofRaw) {
          try {
            const ofObj = typeof ofRaw === 'string' ? JSON.parse(ofRaw) : ofRaw;
            const storeKey = store.name.toLowerCase().replace(' ', '');
            const promo = ofObj[storeKey] || ofObj[store.name.toLowerCase()];
            
            if (promo && promo.etiqueta) {
              const label = promo.etiqueta.toUpperCase();
              if (label.includes('2X1')) {
                totalGondolaDiscount += Math.floor(qty / 2) * price;
              } else if (label.includes('70%') && label.includes('2DA')) {
                totalGondolaDiscount += Math.floor(qty / 2) * (price * 0.7);
              } else if (label.includes('80%') && label.includes('2DA')) {
                totalGondolaDiscount += Math.floor(qty / 2) * (price * 0.8);
              } else if (label.includes('50%') && label.includes('2DA')) {
                totalGondolaDiscount += Math.floor(qty / 2) * (price * 0.5);
              }
            }
          } catch (e) {}
        }
      });

      const storeBenefits = benefits.filter(b => b.supermercado.toUpperCase() === store.name.toUpperCase());
      return { 
        name: store.name, 
        subtotal, 
        gondolaDiscount: totalGondolaDiscount,
        totalChango: subtotal - totalGondolaDiscount,
        storeBenefits 
      };
    }).sort((a, b) => a.totalChango - b.totalChango);
  }, [items, favorites, benefits]);

  const best = results[0];
  const others = results.slice(1).filter(r => r.subtotal < 500000);
  const potentialSavings = others.length > 0 ? others[others.length - 1].totalChango - best.totalChango : 0;

  const paymentAdvice = useMemo(() => {
    if (!best.storeBenefits.length) return null;
    
    const checkOwned = (entidad: string) => userMemberships.some(um => 
      um.slug.toLowerCase() === entidad.toLowerCase() || 
      um.tipo.toLowerCase() === entidad.toLowerCase()
    );

    const owned = best.storeBenefits
      .filter(b => checkOwned(b.entidad_nombre))
      .sort((a,b) => b.descuento - a.descuento)[0];

    const recommend = best.storeBenefits
      .filter(b => !checkOwned(b.entidad_nombre) && b.link_referido)
      .sort((a,b) => b.descuento - a.descuento)[0];

    return { owned, recommend };
  }, [best, userMemberships]);

  if (items.length === 0) return null;

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-700">
      <div className="bg-white dark:bg-slate-950 border-2 border-green-500 rounded-[2.5rem] p-8 shadow-2xl shadow-green-500/10 relative overflow-hidden">
        <div className="relative z-10">
          
          {/* 1. Ahorro Total */}
          <div className="text-center mb-6">
             <span className="text-[10px] font-black uppercase text-green-500 tracking-[0.2em]">Ahorro Total</span>
             <div className="text-6xl font-black text-green-500 tracking-tighter mt-1">${format(Math.round(potentialSavings))}</div>
          </div>

          {/* 2. Tu mejor opción hoy es X */}
          <div className="text-center mb-8">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Tu mejor opción hoy es</h2>
            <div className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{best.name}</div>
          </div>

          {/* 3. Subtotal, 4. Descuentos góndola, 5. Total Chango* */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
              <span>Subtotal</span>
              <span className="font-mono text-sm">${format(Math.round(best.subtotal))}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs font-bold text-green-500 uppercase tracking-tight">
              <span>Descuentos de góndola</span>
              <span className="font-mono text-sm">-${format(Math.round(best.gondolaDiscount))}</span>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
              <span className="font-black text-[10px] uppercase tracking-[0.15em] text-slate-900 dark:text-white">Total Chango*</span>
              <span className="text-4xl font-mono font-black text-slate-900 dark:text-white">
                ${format(Math.round(best.totalChango))}
              </span>
            </div>
          </div>

          {/* Legal disclaimer */}
          <p className="mt-4 text-[9px] text-center text-slate-400 font-medium leading-tight">
            *Es un valor informativo. El ahorro real depende de los T&C de cada entidad y la disponibilidad en góndola.
          </p>

          {/* Estrategia de Pago */}
          <div className="mt-8 space-y-4">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Para seguir ahorrando paga con</h4>
            
            <div className="grid grid-cols-1 gap-3">
              {paymentAdvice?.recommend && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
                    <i className="fa-solid fa-link"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold dark:text-white leading-snug">
                      Pedí <b className="text-amber-600 uppercase">{paymentAdvice.recommend.entidad_nombre}</b> (referido) y sumá <b className="text-amber-600">{(paymentAdvice.recommend.descuento * 100).toFixed(0)}% OFF</b> extra.
                    </p>
                    <a href={paymentAdvice.recommend.link_referido} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-[9px] font-black text-amber-600 uppercase underline underline-offset-4">Obtener Beneficio</a>
                  </div>
                </div>
              )}

              {paymentAdvice?.owned && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                    <i className="fa-solid fa-id-card"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold dark:text-white leading-snug">
                      Usá tu membresía de <b className="text-blue-600 uppercase">{paymentAdvice.owned.entidad_nombre}</b> vinculada para descontar un <b className="text-blue-600">{(paymentAdvice.owned.descuento * 100).toFixed(0)}%</b> adicional.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Comparativa desplegable */}
          <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>Comparar con otros mercados</span>
              <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} transition-transform`}></i>
            </button>
            
            {isExpanded && (
              <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                {others.map((store) => (
                  <div key={store.name} className="flex justify-between items-center py-3 px-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{store.name}</span>
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">${format(Math.round(store.totalChango))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartSummary;
