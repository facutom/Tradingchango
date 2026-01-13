
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getProductHistory } from '../services/supabase';
import { Product, PriceHistory } from '../types';

interface ProductDetailProps {
  productId: number;
  onClose: () => void;
  onFavoriteToggle: (id: number) => void;
  isFavorite: boolean;
  products: Product[];
  theme: 'light' | 'dark';
}

const ProductDetail: React.FC<ProductDetailProps> = ({ productId, onClose, onFavoriteToggle, isFavorite, products, theme }) => {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [days, setDays] = useState(90);
  const modalRef = useRef<HTMLDivElement>(null);

  const product = products.find(p => p.id === productId);

  useEffect(() => {
    if (product) {
      getProductHistory(product.nombre, 365)
        .then(data => setHistory(data || []))
        .catch(() => setHistory([]));
    }
  }, [product]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  const STORES = [
    { name: "COTO", key: 'p_coto', url: 'url_coto' },
    { name: "CARREFOUR", key: 'p_carrefour', url: 'url_carrefour' },
    { name: "DIA", key: 'p_dia', url: 'url_dia' },
    { name: "JUMBO", key: 'p_jumbo', url: 'url_jumbo' },
    { name: "MAS ONLINE", key: 'p_masonline', url: 'url_masonline' }
  ] as const;

  const chartData = useMemo(() => {
    if (!history.length) return [];
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - days);
    return history
      .filter(h => new Date(h.fecha) >= limitDate)
      .map(h => ({
        date: new Date(h.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
        price: h.precio_minimo,
        store: h.supermercado
      }));
  }, [history, days]);

  const minPrice = useMemo(() => {
    if (!product) return 0;
    const p = [product.p_coto, product.p_carrefour, product.p_dia, product.p_jumbo, product.p_masonline].filter(v => v > 0);
    return p.length > 0 ? Math.min(...p) : 0;
  }, [product]);

  if (!product) return null;
  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);
  const trendColor = "#00c853";

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-6 overflow-hidden">
      <div 
        ref={modalRef}
        className="w-full md:max-w-4xl h-[92vh] md:h-auto md:max-h-[85vh] bg-white dark:bg-black md:rounded-[2.5rem] flex flex-col md:flex-row overflow-hidden shadow-2xl border-t md:border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-10"
      >
        {/* Lado Izquierdo: Info + Gráfico */}
        <div className="flex-1 overflow-y-auto no-scrollbar border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-900">
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md px-6 py-4 flex justify-between items-center">
            <button onClick={onClose} className="text-slate-400 hover:text-black dark:hover:text-white p-2">
              <i className="fa-solid fa-arrow-left text-lg"></i>
            </button>
            <button onClick={() => onFavoriteToggle(product.id)} className={`text-2xl transition-all active:scale-90 ${isFavorite ? 'text-star-gold' : 'text-slate-300 dark:text-slate-700 hover:text-black dark:hover:text-white'}`}>
              <i className="fa-solid fa-cart-shopping"></i>
            </button>
          </div>

          <div className="p-8">
            <div className="flex items-start gap-6 mb-8">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl p-3 shadow-lg border border-slate-100 flex-shrink-0">
                <img src={product.imagen_url || 'https://via.placeholder.com/200?text=No+Img'} alt={product.nombre} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-2 tracking-tighter">{product.nombre}</h1>
                <div className="text-4xl font-mono font-black text-slate-900 dark:text-white tracking-tighter mb-2">${format(minPrice)}</div>
                <span className="text-[10px] font-black uppercase text-green-500 tracking-widest bg-green-50 dark:bg-green-950/30 px-3 py-1.5 rounded-full">Mejor Precio Hoy</span>
              </div>
            </div>

            <div className="mb-4 flex justify-between items-end">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Historial</h3>
                <div className="flex gap-1">
                  {[30, 90, 365].map(d => (
                    <button key={d} onClick={() => setDays(d)} className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all ${days === d ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-slate-400'}`}>{d === 30 ? '1M' : d === 90 ? '3M' : '1Y'}</button>
                  ))}
                </div>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={theme === 'dark' ? '#111' : '#eee'} />
                  <XAxis dataKey="date" hide />
                  <YAxis orientation="right" hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{backgroundColor: theme === 'dark' ? '#000' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                    labelStyle={{fontSize: '9px', fontWeight: 'bold', color: '#999'}}
                  />
                  <Area type="monotone" dataKey="price" stroke={trendColor} strokeWidth={3} fillOpacity={0.1} fill={trendColor} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Comparativa Side-by-Side (Escritorio) */}
        <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-950/50 p-8 flex flex-col justify-center border-t md:border-t-0 border-slate-100 dark:border-slate-800">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6">Precio por mercado</h3>
          <div className="space-y-4">
            {STORES.map((s) => {
              const price = (product as any)[s.key];
              const url = (product as any)[s.url];
              if (!price || price <= 0) return null;
              return (
                <div key={s.name} className="flex flex-col gap-1 pb-3 border-b border-slate-200 dark:border-slate-800 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-black text-slate-400 uppercase tracking-tight">{s.name}</span>
                    <span className={`text-lg font-mono font-black ${price === minPrice ? 'text-green-500' : 'text-slate-900 dark:text-white'}`}>
                      ${format(price)}
                    </span>
                  </div>
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-slate-400 uppercase hover:text-black dark:hover:text-white underline underline-offset-2">Ver en Tienda</a>
                  )}
                </div>
              );
            })}
          </div>
          
          <button onClick={onClose} className="mt-8 md:mt-auto w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all">
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
