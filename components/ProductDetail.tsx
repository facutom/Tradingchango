
import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getProductHistory } from '../services/supabase';
import { Product, PriceHistory } from '../types';

interface ProductDetailProps {
  productId: number;
  onClose: () => void;
  onFavoriteToggle: (id: number) => void;
  isFavorite: boolean;
  products: Product[];
}

const ProductDetail: React.FC<ProductDetailProps> = ({ productId, onClose, onFavoriteToggle, isFavorite, products }) => {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  const product = products.find(p => p.id === productId);

  useEffect(() => {
    if (product) {
      setLoading(true);
      getProductHistory(product.nombre, days).then(data => {
        setHistory(data);
        setLoading(false);
      });
    }
  }, [product, days]);

  const STORES = [
    { name: "COTO", key: 'p_coto', url: 'url_coto', color: "#ef4444" },
    { name: "CARREFOUR", key: 'p_carrefour', url: 'url_carrefour', color: "#3b82f6" },
    { name: "DIA", key: 'p_dia', url: 'url_dia', color: "#ef4444" },
    { name: "JUMBO", key: 'p_jumbo', url: 'url_jumbo', color: "#22c55e" },
    { name: "MAS ONLINE", key: 'p_masonline', url: 'url_masonline', color: "#22c55e" }
  ] as const;

  const chartData = useMemo(() => {
    return history.map(h => ({
      date: new Date(h.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
      price: h.precio_minimo
    }));
  }, [history]);

  const minPrice = useMemo(() => {
    if (!product) return 0;
    const prices = [product.p_coto, product.p_carrefour, product.p_dia, product.p_jumbo, product.p_masonline].filter(p => p > 0);
    return Math.min(...prices);
  }, [product]);

  const avgPrice = useMemo(() => {
    if (!product) return 0;
    const prices = [product.p_coto, product.p_carrefour, product.p_dia, product.p_jumbo, product.p_masonline].filter(p => p > 0);
    return prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  }, [product]);

  if (!product) return null;

  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md p-6 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <i className="fa-solid fa-arrow-left text-xl"></i>
            </button>
            <span className="font-mono font-black text-xs uppercase tracking-widest text-slate-400">
              {product.ticker || product.nombre.substring(0, 4).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onFavoriteToggle(product.id)}
              className={`text-2xl ${isFavorite ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700'}`}
            >
              <i className="fa-solid fa-cart-shopping"></i>
            </button>
            <button className="text-xl text-slate-500" onClick={() => {
              navigator.share({ title: 'TradingChango', text: `Mirá el precio de ${product.nombre}`, url: window.location.href });
            }}>
              <i className="fa-solid fa-arrow-up-from-bracket"></i>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="flex gap-6 items-start mb-8">
            {product.imagen_url && (
              <div className="w-24 h-24 rounded-2xl bg-white border border-slate-100 flex-shrink-0 p-2 overflow-hidden shadow-sm">
                <img src={product.imagen_url} alt={product.nombre} className="w-full h-full object-contain" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2 tracking-tight">
                {product.nombre}
              </h1>
              <div className="bg-slate-100 dark:bg-slate-900 rounded-lg px-3 py-1.5 inline-block mb-3 border border-slate-200 dark:border-slate-800">
                 <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Precio promedio:</span>
                 <span className="ml-2 font-mono font-bold text-slate-900 dark:text-white text-xs">${format(avgPrice)}</span>
              </div>
              <div className="text-3xl font-mono font-black text-slate-900 dark:text-white tracking-tighter">
                ${format(minPrice)}
              </div>
            </div>
          </div>

          <section className="mb-10">
            <div className="flex justify-between items-end mb-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tendencia de Precios</h3>
               <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                 {[7, 30, 90, 365].map(d => (
                   <button 
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${days === d ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {d === 365 ? '1Y' : d >= 30 ? `${d/30}M` : `${d}D`}
                   </button>
                 ))}
               </div>
            </div>
            
            <div className="h-56 w-full -mx-2">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400 uppercase tracking-widest animate-pulse">Cargando gráfico...</div>
              ) : chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#94a3b8'}}
                      minTickGap={30}
                    />
                    <YAxis 
                      orientation="right" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#94a3b8'}}
                      tickFormatter={(v) => `$${format(v)}`}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                      labelStyle={{fontWeight: 'bold', marginBottom: '4px', fontSize: '11px'}}
                      itemStyle={{fontSize: '14px', fontWeight: 'bold', fontFamily: 'Roboto Mono', color: '#10b981'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase">Sin datos suficientes</div>
              )}
            </div>
          </section>

          <section>
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Comparativa de Mercado</h3>
             <div className="space-y-3">
               {STORES.map((s) => {
                 const price = (product as any)[s.key];
                 const url = (product as any)[s.url];
                 const isBest = price === minPrice && price > 0;
                 const storePromo = product.oferta_gondola ? product.oferta_gondola[s.name] : null;
                 
                 return (
                   <div key={s.name} className="flex flex-col py-3 border-b border-dashed border-slate-100 dark:border-slate-900 gap-1">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full" style={{backgroundColor: s.color}}></div>
                         <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.name}</span>
                       </div>
                       {price > 0 ? (
                         <div className="flex items-center gap-2">
                           <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener"
                            className={`font-mono text-sm font-bold px-3 py-1 rounded-lg transition-all ${isBest ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800' : 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white'}`}
                           >
                             ${format(price)}
                           </a>
                         </div>
                       ) : (
                         <span className="text-xs font-bold text-slate-300 dark:text-slate-700 uppercase">N/A</span>
                       )}
                     </div>
                     {storePromo && (
                       <div className="flex items-center gap-2 ml-5">
                          <span className="bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase border border-amber-200 dark:border-amber-900/30">
                            {storePromo}
                          </span>
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
