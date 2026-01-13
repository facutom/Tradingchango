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
  const [days, setDays] = useState(90); // Default 3M
  const [loading, setLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  const product = products.find(p => p.id === productId);

  useEffect(() => {
    if (product) {
      setLoading(true);
      getProductHistory(product.nombre, 365)
        .then(data => setHistory(data || []))
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
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
    { name: "COTO", key: 'p_coto', url: 'url_coto', color: "#ff3b30" },
    { name: "CARREFOUR", key: 'p_carrefour', url: 'url_carrefour', color: "#2962ff" },
    { name: "DIA", key: 'p_dia', url: 'url_dia', color: "#ff3b30" },
    { name: "JUMBO", key: 'p_jumbo', url: 'url_jumbo', color: "#00c853" },
    { name: "MAS ONLINE", key: 'p_masonline', url: 'url_masonline', color: "#00c853" }
  ] as const;

  const chartData = useMemo(() => {
    if (!history.length) return [];
    const filtered = history.filter(h => {
        const hDate = new Date(h.fecha);
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - days);
        return hDate >= limitDate;
    });
    return filtered.map(h => ({
      date: new Date(h.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
      price: h.precio_minimo,
    }));
  }, [history, days]);

  const minPrice = useMemo(() => {
    if (!product) return 0;
    const prices = [product.p_coto, product.p_carrefour, product.p_dia, product.p_jumbo, product.p_masonline].filter(p => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [product]);

  const bestStoreName = useMemo(() => {
    if (!product) return "";
    const storeMap = { p_coto: "COTO", p_carrefour: "CARREFOUR", p_dia: "DIA", p_jumbo: "JUMBO", p_masonline: "MAS ONLINE" };
    for (const [key, name] of Object.entries(storeMap)) {
      if ((product as any)[key] === minPrice) return name;
    }
    return "MERCADO";
  }, [product, minPrice]);

  const avgPrice = useMemo(() => {
    if (!product) return 0;
    const prices = [product.p_coto, product.p_carrefour, product.p_dia, product.p_jumbo, product.p_masonline].filter(p => p > 0);
    return prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  }, [product]);

  const variation = useMemo(() => {
    if (chartData.length < 2) return null;
    const start = chartData[0].price;
    const end = chartData[chartData.length - 1].price;
    const diff = ((end - start) / start) * 100;
    return diff.toFixed(1);
  }, [chartData]);

  const isUp = variation ? parseFloat(variation) > 0 : false;
  const trendColor = isUp ? "#ff3b30" : "#00c853";

  if (!product) return null;
  const format = (n: number) => new Intl.NumberFormat('es-AR').format(n);

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center bg-black/80 md:backdrop-blur-sm transition-all duration-300">
      <div 
        ref={modalRef}
        className="w-full md:max-w-[400px] h-full md:h-auto md:max-h-[96vh] bg-[#ffffff] dark:bg-[#000000] md:rounded-[1.2rem] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5"
      >
        {/* Header Compacto */}
        <div className="px-4 py-3 flex justify-between items-center bg-[#ffffff] dark:bg-[#000000] border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-1">
            <button onClick={onClose} className="text-primary dark:text-[#ffffff] p-2 -ml-2">
              <i className="fa-solid fa-arrow-left text-base"></i>
            </button>
            <span className="font-[800] text-[15px] tracking-tight text-primary dark:text-[#ffffff] uppercase font-sans">{product.ticker || product.nombre.substring(0,5)}</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onFavoriteToggle(product.id)} className={`text-[20px] ${isFavorite ? 'text-star-gold' : 'text-primary dark:text-[#ffffff]'}`}>
              <i className="fa-solid fa-cart-shopping"></i>
            </button>
            <button className="text-[18px] text-primary dark:text-[#ffffff]" onClick={() => navigator.share({ title: 'TradingChango', text: `Precio de ${product.nombre}`, url: window.location.href })}>
              <i className="fa-solid fa-arrow-up-from-bracket"></i>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-[#ffffff] dark:bg-[#000000]">
          {/* Info Section - Escalado más compacto */}
          <div className="px-5 py-6">
             <div className="flex gap-4 items-center">
                <div className="w-[90px] h-[90px] md:w-[100px] md:h-[100px] bg-white rounded-xl border border-border-light dark:border-border-dark flex-shrink-0 flex items-center justify-center p-2 shadow-sm">
                  <img 
                    src={product.imagen_url || 'https://via.placeholder.com/200?text=No+Img'} 
                    alt={product.nombre} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <h1 className="text-[20px] md:text-[22px] font-[700] text-primary dark:text-[#ffffff] leading-[1.1] tracking-[-0.5px] mb-1 font-sans">{product.nombre}</h1>
                  <div className="text-[10px] font-[600] text-muted dark:text-muted-dark uppercase tracking-tight mb-1.5 font-sans">
                    MEJOR PRECIO HOY EN {bestStoreName}
                  </div>
                  <div className="text-[28px] md:text-[32px] font-mono font-[700] tracking-tighter text-primary dark:text-[#ffffff] leading-none">
                    $ {format(minPrice)}
                  </div>
                  <div className="mt-3">
                    <div className="bg-[#f1f3f6] dark:bg-[#1e222d] rounded-md px-3 py-1 border border-border-light dark:border-border-dark inline-flex items-center">
                      <span className="text-[11px] font-[600] text-muted dark:text-muted-dark font-sans">Precio promedio: <span className="font-mono font-[700] ml-1 text-primary dark:text-[#ffffff]">${format(avgPrice)}</span></span>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          <div className="h-[1px] bg-border-light dark:bg-border-dark mx-4"></div>

          {/* Temporal Selection & Chart - Tight Spacing */}
          <div className="px-5 py-6">
            <div className="flex gap-1 justify-between mb-6">
              {[7, 15, 30, 90, 180, 365].map(d => (
                <button 
                  key={d} 
                  onClick={() => setDays(d)} 
                  className={`flex-1 py-1.5 text-[10px] font-[800] rounded-md border transition-all font-sans ${days === d ? 'bg-primary dark:bg-[#ffffff] text-[#ffffff] dark:text-[#000000] border-primary dark:border-[#ffffff]' : 'bg-[#ffffff] dark:bg-transparent text-muted dark:text-muted-dark border-border-light dark:border-border-dark'}`}
                >
                  {d === 7 ? '7D' : d === 15 ? '15D' : d === 30 ? '1M' : d === 90 ? '3M' : d === 180 ? '6M' : '1Y'}
                </button>
              ))}
            </div>

            <h3 className="text-[10px] font-[800] uppercase tracking-widest text-primary dark:text-[#ffffff] mb-1 font-sans">GRÁFICO DE TENDENCIAS</h3>
            <div className={`text-[11px] font-[700] mb-4 font-sans ${isUp ? 'text-chart-red' : 'text-chart-green'}`}>
              {variation ? `${parseFloat(variation) > 0 ? '+' : ''}${variation}% últimos días` : '- 0.0%'}
            </div>
            
            <div className="h-48 md:h-56 w-full relative">
              {!loading && chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trendColor} stopOpacity={0.05}/><stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="transparent" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 9, fill: '#787b86', fontWeight: '500'}} 
                      minTickGap={40} 
                    />
                    <YAxis 
                      orientation="right" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 9, fill: '#787b86', fontWeight: '500'}} 
                      tickFormatter={v => `$${format(v)}`} 
                      domain={['auto', 'auto']} 
                    />
                    <Tooltip 
                      contentStyle={{backgroundColor: theme === 'dark' ? '#000' : '#fff', borderRadius: '6px', border: '1px solid #e0e3eb', padding: '6px', boxShadow: 'none'}}
                      labelStyle={{fontSize: '8px', fontWeight: '800', marginBottom: '1px', color: '#787b86', textTransform: 'uppercase'}}
                      itemStyle={{fontSize: '11px', fontWeight: '800', fontFamily: 'Roboto Mono', color: theme === 'dark' ? '#fff' : '#131722'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={trendColor} 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      animationDuration={1000}
                      connectNulls
                      strokeLinecap="round"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center font-mono text-[9px] text-muted dark:text-muted-dark bg-bg-card-light dark:bg-bg-card-dark rounded-lg border border-dashed border-border-light dark:border-border-dark uppercase tracking-widest">
                  {loading ? 'ANALIZANDO...' : 'SIN DATOS'}
                </div>
              )}
            </div>
          </div>

          <div className="h-[1px] bg-border-light dark:bg-border-dark mx-4"></div>

          {/* Market Comparison - Clean and Compact */}
          <section className="px-5 py-6">
            <h3 className="text-[11px] font-[800] uppercase tracking-wider text-primary dark:text-[#ffffff] mb-6 font-sans">COMPARACION DE MERCADO</h3>
            <div className="space-y-0">
              {STORES.map((s) => {
                const price = (product as any)[s.key];
                const productUrl = (product as any)[s.url];
                if (!price || price === 0) return null;
                const isBest = price === minPrice;
                const ofRaw = product.oferta_gondola;
                let of = null;
                if (ofRaw) {
                   try {
                     const ofObj = typeof ofRaw === 'string' ? JSON.parse(ofRaw) : ofRaw;
                     of = ofObj[s.name.toLowerCase().replace(' ', '')] || ofObj[s.name.toLowerCase()];
                   } catch(e) { /* ignore */ }
                }

                return (
                  <div key={s.name} className="flex items-center justify-between border-b border-dashed border-border-light dark:border-border-dark py-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: s.color}}></div>
                      <span className="text-[14px] font-[700] text-primary dark:text-[#ffffff] uppercase font-sans tracking-tight">{s.name}</span>
                      {of && (
                        <span className="bg-chart-green text-white text-[8px] font-[800] px-1.5 py-0.5 rounded-sm uppercase ml-0.5 font-sans leading-none">
                          {of.etiqueta || (typeof of === 'string' ? of : 'PROMO')}
                        </span>
                      )}
                    </div>
                    {productUrl ? (
                      <a 
                        href={productUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`bg-[#f1f3f6] dark:bg-[#1e222d] px-2.5 py-1 rounded font-mono text-[14px] font-[700] transition-opacity hover:opacity-70 ${isBest ? 'text-chart-green' : 'text-primary dark:text-[#ffffff]'}`}
                      >
                        ${format(price)}
                      </a>
                    ) : (
                      <div className={`bg-[#f1f3f6] dark:bg-[#1e222d] px-2.5 py-1 rounded font-mono text-[14px] font-[700] ${isBest ? 'text-chart-green' : 'text-primary dark:text-[#ffffff]'}`}>
                        ${format(price)}
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