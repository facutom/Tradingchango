
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
      let hasAllItems = true;

      items.forEach(item => {
        const price = item.prices[store.index];
        const qty = favorites[item.id] || 1;
        
        if (price <= 0) {
          hasAllItems = false;
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
        storeBenefits,
        hasAllItems
      };
    })
    .filter(r => r.hasAllItems && items.length > 0)
    .sort((a, b) => a.totalChango - b.totalChango);
  }, [items, favorites, benefits]);

  if (items.length === 0) return null;

  if (results.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-white dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-800 rounded-[1.5rem] p-5 shadow-xl text-center">
          <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-3 text-neutral-500">
            <i className="fa-solid fa-circle-exclamation text-lg"></i>
          </div>
          <h3 className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-1">Chango Incompleto</h3>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium leading-tight">Ningún supermercado tiene stock total.</p>
        </div>
      </div>
    );
  }

  const best = results[0];
  const others = results.slice(1);
  const worstOption = results.length > 1 ? results[results.length - 1] : best;
  const potentialSavings = worstOption.totalChango - best.totalChango;

  const paymentAdvice = useMemo(() => {
    if (!best.storeBenefits.length) return null;
    const checkOwned = (entidad: string) => userMemberships.some(um => 
      um.slug.toLowerCase() === entidad.toLowerCase() || 
      um.tipo.toLowerCase() === entidad.toLowerCase() ||
      um.slug.toLowerCase().includes(entidad.toLowerCase())
    );
    const owned = best.storeBenefits.filter(b => checkOwned(b.entidad_nombre)).sort((a,b) => b.descuento - a.descuento)[0];
    const recommend = best.storeBenefits.filter(b => !checkOwned(b.entidad_nombre) && b.link_referido).sort((a,b) => b.descuento - a.descuento)[0];
    return { owned, recommend };
  }, [best, userMemberships]);

  return (
    <div className="p-4 space-y-3 animate-in fade-in duration-700">
      <div className="bg-white dark:bg-neutral-950 border-[3px] border-black dark:border-white rounded-[1.5rem] p-5 shadow-xl relative">
        <div className="flex flex-col gap-4 relative z-10">
          
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black uppercase text-neutral-500 tracking-[0.15em] block">Mejor opción:</span>
              <h2 className="text-xl font-black text-black dark:text-white uppercase tracking-tighter leading-none flex items-center gap-2">
                <i className="fa-solid fa-trophy text-star-gold text-lg animate-bounce"></i>
                {best.name}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black uppercase text-green-600 dark:text-green-400 tracking-[0.15em] block mb-0.5">Ahorrás:</span>
              <div className="text-lg font-black text-green-600 dark:text-green-400 tracking-tighter font-mono">${format(Math.round(potentialSavings))}</div>
            </div>
          </div>

          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 text-center">
            <span className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.15em] block mb-1">Total Estimado:*</span>
            <div className="text-4xl font-black text-black dark:text-white tracking-tighter font-mono leading-none">
              ${format(Math.round(best.totalChango))}
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-3.5 space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight">
              <span className="text-neutral-500">Subtotal:</span>
              <span className="text-black dark:text-white font-mono">${format(Math.round(best.subtotal))}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight">
              <span className="text-neutral-500">Descuentos:</span>
              <span className="text-green-500 font-mono">-$ {format(Math.round(best.gondolaDiscount))}</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {paymentAdvice?.owned && (
              <div className="flex items-center gap-2 text-left bg-green-500/5 dark:bg-green-500/10 p-2.5 rounded-xl border border-green-500/10">
                <i className="fa-solid fa-circle-check text-green-500 text-sm"></i>
                <p className="text-[10px] font-black uppercase text-black dark:text-white leading-tight">
                  Con <span className="underline underline-offset-2">{paymentAdvice.owned.entidad_nombre}</span> ahorrás hasta <span className="text-green-500">{paymentAdvice.owned.descuento}%</span>*
                </p>
              </div>
            )}
            
            {paymentAdvice?.recommend && (
              <a 
                href={paymentAdvice.recommend.link_referido} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-3 text-left p-3 rounded-xl border-2 border-dashed border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 hover:from-indigo-500/10 hover:to-purple-500/10 transition-all group scale-[1.02]"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-rocket text-[10px]"></i>
                </div>
                <div>
                   <p className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 leading-tight">🚀 ¡Súper Oportunidad!</p>
                   <p className="text-[9px] font-bold text-neutral-600 dark:text-neutral-300 uppercase leading-none">Sacá la {paymentAdvice.recommend.entidad_nombre} y ahorrá {paymentAdvice.recommend.descuento}%*</p>
                </div>
                <i className="fa-solid fa-chevron-right text-indigo-300 ml-auto"></i>
              </a>
            )}
          </div>
        </div>
      </div>

      {others.length > 0 && (
        <div className="px-1">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-[9px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-[0.2em] py-2 hover:text-black dark:hover:text-white transition-colors"
          >
            <span>Otros mercados ({others.length})</span>
            <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} transition-transform text-[7px]`}></i>
          </button>
          
          {isExpanded && (
            <div className="mt-1 space-y-1 animate-in slide-in-from-top-1 duration-300">
              {others.map((store) => (
                <div key={store.name} className="flex justify-between items-center py-2.5 px-4 bg-neutral-50/50 dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] font-black text-neutral-600 dark:text-neutral-400 uppercase">{store.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-bold text-red-500 font-mono">+${format(Math.round(store.totalChango - best.totalChango))}</span>
                    <span className="font-mono text-[12px] font-black text-black dark:text-white">${format(Math.round(store.totalChango))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-neutral-50/50 dark:bg-neutral-950 p-4 rounded-xl">
        <p className="text-[8px] text-neutral-500 dark:text-neutral-500 font-bold tracking-tight leading-normal uppercase">
          *El monto final se calculará al pagar en la web de {best.name}. Descuentos bancarios y T&C dependen de cada entidad. Sujeto a disponibilidad.
        </p>
      </div>
    </div>
  );
};

export default CartSummary;
