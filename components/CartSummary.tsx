
import React from 'react';
import { Product, Benefit } from '../types';

interface CartSummaryProps {
  items: any[];
  favorites: Record<number, number>;
  benefits: Benefit[];
}

const CartSummary: React.FC<CartSummaryProps> = ({ items, favorites, benefits }) => {
  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);

  const calculateTotal = (storeIndex: number) => {
    let subtotal = 0;
    let gondolaSavings = 0;
    
    items.forEach(item => {
      const price = item.prices[storeIndex];
      const qty = favorites[item.id] || 1;
      if (price > 0) {
        subtotal += price * qty;
        
        // Simulating gondola logic (2x1, etc)
        if (item.oferta_gondola) {
          // Add logic if specific to store
        }
      } else {
        // If store doesn't have the product, we treat it as infinite price for comparison
        subtotal += 9999999;
      }
    });

    return { subtotal, totalFinal: subtotal - gondolaSavings, gondolaSavings };
  };

  const STORES = ["COTO", "CARREFOUR", "DIA", "JUMBO", "MASONLINE"];
  
  const results = STORES.map((name, i) => {
    const stats = calculateTotal(i);
    const benefit = benefits.find(b => b.supermercado.toUpperCase() === name.toUpperCase());
    return { name, ...stats, benefit };
  }).sort((a, b) => a.totalFinal - b.totalFinal);

  const best = results[0];
  const worst = results.filter(r => r.totalFinal < 999999).slice(-1)[0];
  const potentialSavings = worst ? worst.totalFinal - best.totalFinal : 0;

  if (items.length === 0) return null;

  return (
    <div className="p-4">
      <div className="bg-white dark:bg-slate-950 border-2 border-green-500 rounded-3xl p-6 shadow-xl shadow-green-500/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <i className="fa-solid fa-cart-shopping text-8xl text-green-500"></i>
        </div>
        
        <div className="relative z-10">
          <div className="text-center mb-6">
            <span className="text-[10px] font-black uppercase text-green-500 tracking-widest">Ahorrás en total</span>
            <div className="text-5xl font-mono font-black text-green-500 leading-none mt-2">
              ${format(Math.round(potentialSavings))}<span className="text-xs align-top">*</span>
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-medium leading-tight">
              Tu mejor opción hoy es <b className="text-slate-900 dark:text-white uppercase">{best.name}</b>
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
              <span>Subtotal Mercado</span>
              <span className="font-mono">${format(Math.round(best.subtotal))}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-green-500 font-bold">
              <span>Descuentos Aplicados</span>
              <span className="font-mono">-$0</span>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">Total Chango*</span>
              <span className="text-2xl font-mono font-black text-slate-900 dark:text-white">${format(Math.round(best.totalFinal))}</span>
            </div>
          </div>

          {best.benefit && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center gap-4">
               <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center text-amber-500 flex-shrink-0">
                 <i className="fa-solid fa-gift"></i>
               </div>
               <div className="flex-1">
                 <p className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight">
                   Sumá un {(best.benefit.descuento * 100)}% de ahorro extra pagando con <b className="text-amber-600">{best.benefit.entidad_nombre}</b>.
                 </p>
                 <a href={best.benefit.link_referido} target="_blank" className="mt-2 inline-block text-[10px] font-black text-amber-600 uppercase underline">Solicitar Beneficio</a>
               </div>
            </div>
          )}

          <p className="mt-5 text-[9px] text-center text-slate-400 leading-tight">
            *Valor informativo. El ahorro real depende de disponibilidad y promociones vigentes al momento de la compra.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CartSummary;
