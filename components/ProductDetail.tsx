import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid
} from 'recharts';
import { getProductHistory, getProductHistoryByEan } from '../services/supabase';
import { Product, PriceHistory } from '../types';
import OptimizedImage from './OptimizedImage';
import { supabase } from '../services/supabase';
import { isPriceOutlier, detectOutliersByMedian } from '../utils/outlierDetection';

// Tipos para el gráfico
interface ChartDataItem {
  date: string;
  fullDate: string;
  price: number;
  store: string;
}

interface ProductDetailProps {
  productId: number;
  onClose: () => void;
  onFavoriteToggle: (id: number) => void;
  isFavorite: boolean;
  products: Product[];
  theme: 'light' | 'dark';
  quantities?: Record<number, number>;
  onUpdateQuantity?: (id: number, delta: number) => void;
  onPreviousProduct?: () => void;
  onNextProduct?: () => void;
  onProductSelect?: (id: number) => void;
}

// Alias para evitar conflictos de tipos con Recharts en TS
const AreaChartComponent = AreaChart as any;
const AreaComponent = Area as any;
const XAxisComponent = XAxis as any;
const YAxisComponent = YAxis as any;
const TooltipComponent = Tooltip as any;
const ResponsiveContainerComponent = ResponsiveContainer as any;
const CartesianGridComponent = CartesianGrid as any;

const formatCurrency = (n: number) => new Intl.NumberFormat('es-AR').format(n);

const STORES = [
  { name: "COTO", displayName: "COTO", key: 'p_coto', url: 'url_coto' },
  { name: "CARREFOUR", displayName: "CARREFOUR", key: 'p_carrefour', url: 'url_carrefour' },
  { name: "DIA", displayName: "DIA ONLINE", key: 'p_dia', url: 'url_dia' },
  { name: "JUMBO", displayName: "JUMBO", key: 'p_jumbo', url: 'url_jumbo' },
  { name: "MAS ONLINE", displayName: "MAS ONLINE", key: 'p_masonline', url: 'url_masonline' }
] as const;

const ProductDetail: React.FC<ProductDetailProps> = ({ 
  productId, 
  onClose, 
  onFavoriteToggle, 
  isFavorite, 
  products, 
  theme,
  quantities,
  onUpdateQuantity,
  onPreviousProduct,
  onNextProduct,
  onProductSelect
}) => {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [days, setDays] = useState(7);
  const [activeTab, setActiveTab] = useState<'details' | 'related'>('details');
  const modalRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const product = useMemo(() => products.find(p => p.id === productId), [products, productId]);

  useEffect(() => {
    setActiveTab('details');
  }, [productId]);

  const relatedProducts = useMemo(() => {
    if (!product || !products) return [];
    return products
      .filter(p => p.categoria === product.categoria && p.id !== product.id)
      .slice(0, 12);
  }, [product, products]);

  const isAvailableForPurchase = useMemo(() => {
    if (!product) return false;

    // Condición 1: El producto no es visible
    if (product.visible_web === false) {
    return false;
    }

    // Condición 2: Todos los precios son 0 o nulos
    const allPricesZero = STORES.every(store => {
    const price = (product as any)[store.key];
    return price === 0 || price === null;
    });
    if (allPricesZero) {
    return false;
    }

    // Condición 3: No hay stock en ninguna tienda.
    // La lógica de stock puede ser compleja, así que la mantenemos simple.
    // Si 'stock_...' es 'false', no hay stock. Si no existe la propiedad, asumimos que hay.
    const hasStockInAnyStore = STORES.some(store => {
        const stockKey = `stock_${store.key.split('_')[1]}`;
        return (product as any)[stockKey] !== false;
    });

    if (!hasStockInAnyStore) {
        return false;
    }

    return true;
}, [product]);

  const outlierData = useMemo(() => {
    if (!product) return {};
    try {
      return typeof product.outliers === 'string' 
        ? JSON.parse(product.outliers) 
        : (product.outliers || {});
    } catch (e) {
      return {};
    }
  }, [product]);

  useEffect(() => {
    const gestionarVisita = async () => {
      if (product && product.ean) {
        try {
          await supabase.rpc('visitas', { producto_ean: product.ean.toString().trim() });
        } catch (err) {
          console.error("❌ Error en RPC visitas:", err);
        }
      }
    };

    if (product) {
      document.title = `${product.nombre} - TradingChango`;
      gestionarVisita();
    }
  }, [product]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (product) {
        // Intentar cargar desde caché primero para carga rapida
        const ean = product.ean && Array.isArray(product.ean) && product.ean.length > 0 ? product.ean[0] : null;
        const cacheKey = `tc_product_history_${ean || product.nombre}_${days}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            const cacheDate = new Date(cachedData.timestamp || 0);
            const now = new Date();
            // Si el caché tiene menos de 5 minutos, usarlo
            if (now.getTime() - cacheDate.getTime() < 5 * 60 * 1000) {
              setHistory(cachedData.data || []);
              // Cargar datos frescos en segundo plano
            }
          } catch (e) {
            // Si el caché está corrupto, continuar con la carga normal
          }
        }
        
        try {
          // Usar EAN si está disponible, sino usar nombre
          const ean = product.ean && Array.isArray(product.ean) && product.ean.length > 0 ? product.ean[0] : null;
          const data = ean ? await getProductHistoryByEan(ean, days) : await getProductHistory(product.nombre, days);
          setHistory(data || []);
          // Guardar en caché
          localStorage.setItem(cacheKey, JSON.stringify({
            data: data || [],
            timestamp: new Date().getTime()
          }));
        } catch (err) {
          console.error("❌ Error historial:", err);
          setHistory([]);
        }
      }
    };

    fetchHistory();
  }, [product, days]);

  // Ref para evitar múltiples ejecuciones
  const lastActionRef = useRef<{ key: string; time: number } | null>(null);
  
  useEffect(() => {
    // Manejo de teclado - ESC solo cierra, flechas solo navegan
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      // Evitar múltiples ejecuciones del mismo evento en 100ms
      if (lastActionRef.current && 
          lastActionRef.current.key === e.key && 
          now - lastActionRef.current.time < 100) {
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        lastActionRef.current = { key: e.key, time: now };
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        lastActionRef.current = { key: e.key, time: now };
        onPreviousProduct?.();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        lastActionRef.current = { key: e.key, time: now };
        onNextProduct?.();
      }
    };
    
    // Manejo de click en el backdrop para cerrar
    const handleBackdropClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Solo cerrar si el click es directamente en el backdrop (no en el modal)
      if (target.classList.contains('product-detail-backdrop')) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    
    // Manejo de gestos táctiles - solo en desktop
    const isMobile = window.innerWidth < 768;
    
    const handleTouchStart = !isMobile ? ((e: TouchEvent) => {
      touchStartX.current = e.changedTouches[0].screenX;
    }) : undefined;
    
    const handleTouchEnd = !isMobile ? ((e: TouchEvent) => {
      touchEndX.current = e.changedTouches[0].screenX;
      const diff = touchStartX.current - touchEndX.current;
      const swipeThreshold = 50;
      
      if (Math.abs(diff) > swipeThreshold) {
        e.preventDefault();
        e.stopPropagation();
        if (diff > 0) {
          onNextProduct?.();
        } else if (diff < 0) {
          onPreviousProduct?.();
        }
      }
    }) : undefined;
    
    // Usar capture phase para tener prioridad sobre otros listeners
    document.addEventListener('keydown', handleKeyDown, { passive: false, capture: true });
    document.addEventListener('click', handleBackdropClick, { capture: true });
    if (handleTouchStart) document.addEventListener('touchstart', handleTouchStart);
    if (handleTouchEnd) document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('click', handleBackdropClick, { capture: true });
      if (handleTouchStart) document.removeEventListener('touchstart', handleTouchStart);
      if (handleTouchEnd) document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onClose, onPreviousProduct, onNextProduct]);

  const { minPrice, minStore, avgPrice, minStoreUrl, unitPrice, unitMeasure, outliersDetected, validPriceCount = 0 } = useMemo(() => {
    if (!product) return { minPrice: 0, minStore: '', avgPrice: 0, minStoreUrl: '#', unitPrice: 0, unitMeasure: '', outliersDetected: [] };
    
    // Mapeo de nombres para coincidir con las llaves del JSONB en la base de datos
    const internalKeys: { [key: string]: string } = {
      'COTO': 'coto',
      'CARREFOUR': 'carrefour',
      'DIA': 'diaonline',
      'JUMBO': 'jumbo',
      'MAS ONLINE': 'masonline'
    };
    
    const prices = STORES
      .map(s => {
        const storeKey = internalKeys[s.name];
        const stockKey = `stock_${storeKey}`;
        const hasStock = (product as any)[stockKey] !== false;
        const url = (product as any)[s.url] as string;
        const hasUrl = url && url !== '#' && url.length > 5;
        const isOutlierFromDB = outlierData[storeKey] === true;
        const isOutlierDynamic = isPriceOutlier(product, s.key);
        
        return {
          name: s.name,
          displayName: s.displayName,
          val: (product as any)[s.key] as number,
          url: url,
          stock: hasStock,
          hasUrl: hasUrl,
          isOutlier: isOutlierFromDB || isOutlierDynamic
        };
      })
      .filter(p => p.val > 0 && p.stock && p.hasUrl && !p.isOutlier);

    const outliersDetected = STORES
      .map(s => {
        const storeKey = internalKeys[s.name];
        const isOutlierFromDB = outlierData[storeKey] === true;
        const isOutlierDynamic = isPriceOutlier(product, s.key);
        return (isOutlierFromDB || isOutlierDynamic) ? s.name : null;
      })
      .filter(Boolean) as string[];

    if (prices.length === 0) return { minPrice: 0, minStore: '', avgPrice: 0, minStoreUrl: '#', unitPrice: 0, unitMeasure: '', outliersDetected, validPriceCount: 0 };
    
    const min = Math.min(...prices.map(p => p.val));
    const winner = prices.find(p => p.val === min);
    const contNum = (product as any)?.contenido_numerico || 0;
    
    return { 
      minPrice: min, 
      minStore: winner?.displayName || '', 
      avgPrice: prices.reduce((acc, curr) => acc + curr.val, 0) / prices.length,
      minStoreUrl: winner?.url || '#',
      unitPrice: (min > 0 && contNum > 0) ? Math.round(min / contNum) : 0,
      unitMeasure: (product as any)?.unidad_medida || '',
      outliersDetected,
      validPriceCount: prices.length
    };
  }, [product, outlierData]);

  const { chartData, percentageChange, isTrendUp } = useMemo(() => {
    if (!history.length) return { chartData: [], percentageChange: 0, isTrendUp: false };
    
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - days);
    limitDate.setHours(0, 0, 0, 0);

    // Map history supermarket names to store keys for outlier detection
    const storeKeyMap: { [key: string]: string } = {
      'coto': 'p_coto',
      'carrefour': 'p_carrefour',
      'dia': 'p_dia',
      'jumbo': 'p_jumbo',
      'masonline': 'p_masonline'
    };

    const filtered: ChartDataItem[] = history
      .filter(h => {
        if (!h.fecha) return false;
        const storeKey = h.supermercado?.toLowerCase().replace(' ', '');
        
        // Check outlier from DB
        if (outlierData[storeKey] === true) return false;
        
        // Also check dynamic outlier detection
        const priceKey = storeKeyMap[storeKey];
        if (product && priceKey && isPriceOutlier(product, priceKey)) return false;
        
        const [y, m, d] = h.fecha.split('T')[0].split('-').map(Number);
        return new Date(y, m - 1, d) >= limitDate;
      })
      .map(h => {
        const [year, month, day] = h.fecha.split('T')[0].split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        return {
          date: localDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
          fullDate: localDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }),
          price: h.precio_minimo,
          store: STORES.find(s => s.name.toLowerCase() === h.supermercado?.toLowerCase())?.displayName || h.supermercado
        };
      });

    if (filtered.length < 2) return { chartData: filtered, percentageChange: 0, isTrendUp: false };
    
    const change = ((filtered[filtered.length - 1].price - filtered[0].price) / (filtered[0].price || 1)) * 100;
    return { chartData: filtered, percentageChange: change, isTrendUp: change > 0 };
  }, [history, days, outlierData, product]);

  const handleShare = async () => {
    if (!product) return;
    const text = `¡Mira este precio en TradingChango! ${product.nombre} a $${formatCurrency(minPrice)}`;
    try {
      if (navigator.share) await navigator.share({ title: 'TradingChango', text, url: window.location.href });
      else { await navigator.clipboard.writeText(`${text} ${window.location.href}`); alert('Copiado'); }
    } catch (e) {}
  };

  if (!product) return null;
  const trendColor = isTrendUp ? '#f23645' : '#00c853';
  const ticker = (product as any).ticker || product.nombre.substring(0, 5).toUpperCase();

  // Tooltip personalizado para el gráfico
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataItem;
      return (
        <div className="bg-white dark:bg-neutral-900 p-2 rounded-lg shadow-xl border border-neutral-100 dark:border-neutral-800 text-center">
          <p className="text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">{data.date}</p>
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-[9px] font-bold text-black dark:text-white uppercase">{data.store}</span>
            <span className="text-[9px] font-bold text-black dark:text-white">${formatCurrency(data.price)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Envolver el return en try-catch para diagnóstico
  try {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 md:p-4 product-detail-backdrop">
      <div ref={modalRef} data-keep-open className="product-detail-modal w-full max-w-lg h-auto max-h-full md:max-h-[95vh] bg-white dark:bg-primary md:rounded-[1.2rem] overflow-y-auto shadow-2xl relative">
        
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-primary/95 px-4 py-2 flex items-center justify-between border-b border-neutral-100 dark:border-[#233138]">
          <button onClick={onClose} className="text-black dark:text-[#e9edef] p-2">
            <i className="fa-solid fa-arrow-left text-xl"></i>
          </button>
          <span className="text-xs font-black tracking-widest text-black dark:text-[#e9edef] uppercase">{ticker}</span>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="text-black dark:text-[#e9edef] p-2">
              <i className="fa-solid fa-share-nodes text-lg"></i>
            </button>
            <button onClick={() => validPriceCount >= 2 && onFavoriteToggle(product.id)} className={`text-xl ${isFavorite ? 'text-star-gold' : validPriceCount >= 2 ? 'text-black dark:text-[#e9edef]' : 'text-neutral-400 dark:text-neutral-600'}`} disabled={validPriceCount < 2}>
              <i className="fa-solid fa-cart-shopping"></i>
            </button>
          </div>
        </div>

        <div className="p-4 pb-0 md:p-5 md:pb-0 flex flex-col">
          {/* Header Producto */}
          <div className="flex gap-4 items-start mb-4">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-xl border border-neutral-100 shadow-sm flex items-center justify-center p-2 shrink-0">
              <OptimizedImage
                src={product.imagen_url ? `${product.imagen_url}?width=160&quality=75&format=webp` : 'https://via.placeholder.com/160?text=N/A'}
                alt={product.nombre}
                className="w-full h-full object-contain"
                width={160}
                height={160}
                priority
              />
            </div>
            <div className="flex flex-col flex-1 pt-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-black text-black dark:text-[#e9edef] leading-[1.1] mb-1 tracking-tighter uppercase break-words [hyphens:auto]" lang="es">
                {product.nombre}
              </h1>
              
              {minPrice > 0 && minStore && (
                <div className="flex items-center gap-1.5 mb-2">
                  {validPriceCount >= 2 ? (
                    <>
                      <span className="text-[11px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Mejor precio hoy en {minStore}
                      </span>
                      <a href={minStoreUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:scale-110 transition-transform">
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                      </a>
                    </>
                  ) : (
                    <span className="text-[11px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                      No disponible
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-col mt-1">
                {minPrice > 0 ? (
                  <>
                    <div className="flex items-baseline gap-0.5 -mt-3">
                      <span className="text-xl font-bold text-black dark:text-[#e9edef]">$</span>
                      <span className="text-4xl md:text-5xl font-black text-black dark:text-[#e9edef] tracking-tighter font-mono leading-tight">
                        {formatCurrency(minPrice)}
                      </span>
                    </div>

                    <div className="flex flex-row flex-wrap gap-2 mt-2">
                      <div className="flex items-center gap-2 bg-neutral-100 dark:bg-[#1f2c34] border border-neutral-200 dark:border-[#233138] px-2.5 py-1 rounded-md">
                        <span className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase">Promedio</span>
                        <span className="text-[11px] font-black text-black dark:text-[#e9edef] font-mono">${formatCurrency(Math.round(avgPrice))}</span>
                      </div>

                      {unitPrice > 0 && product?.categoria?.toLowerCase() !== 'carnes' && product?.categoria?.toLowerCase() !== 'verdu' && (
                        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-[#1f2c34] border border-neutral-200 dark:border-[#233138] px-2.5 py-1 rounded-md">
                          <span className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase">POR {unitMeasure || 'Unid'}</span>
                          <span className="text-[11px] font-black text-black dark:text-[#e9edef] font-mono">${formatCurrency(unitPrice)}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mt-2">
                    Sin precios disponibles
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pestañas */}
          <div className="flex border-b border-neutral-100 dark:border-[#233138] mb-3">
            <button 
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'details' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              Detalles
            </button>
            <button 
              onClick={() => setActiveTab('related')}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'related' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              Relacionados ({relatedProducts.length})
            </button>
          </div>

          {activeTab === 'details' && (
            <>
              {/* Descripción SEO */}
              {product.seo_description && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium mb-3 text-justify">
                  {product.seo_description}
                </p>
              )}

              <hr className="w-full border-neutral-100 dark:border-[#233138] mb-3" />

              {/* Filtros días */}
              <div className="w-full flex justify-center gap-1 mb-2 overflow-x-auto no-scrollbar pb-1">
                {[7, 15, 30, 90, 180, 365].map((d) => (
                  <button 
                    key={d} 
                    onClick={() => setDays(d)}
                    className={`min-w-[48px] py-2 px-2 text-[10px] font-black rounded-md transition-all ${
                      days === d
                        ? 'bg-primary text-white dark:bg-white dark:text-black border border-black dark:border-white'
                        : 'bg-neutral-50 dark:bg-[#1f2c34] text-neutral-500 dark:text-[#8696a0]'
                    }`}
                  >
                    {d < 30 ? `${d}D` : d < 365 ? `${Math.floor(d / 30)}M` : '1Y'}
                  </button>
                ))}
              </div>

              {/* Gráfico */}
              <div className="mb-1 w-full">
                <div className="flex flex-col items-center text-center mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded-md ${isTrendUp ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                        {isTrendUp ? '▲' : '▼'} {Math.abs(percentageChange).toFixed(1)}%
                    </span>
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-widest">
                      Variación en {days} días</span>
                  </div>
                </div>
                
                <div className="h-44 md:h-52 w-full relative min-h-[176px]">
                  {chartData.length > 1 ? (
                    <ResponsiveContainerComponent width="100%" height="100%">
                      <AreaChartComponent data={chartData} margin={{ top: 5, right: 0, left: 12, bottom: 20 }}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={trendColor} stopOpacity={0.1}/>
                            <stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGridComponent vertical={false} strokeDasharray="3 3" stroke={theme === 'dark' ? '#233138' : '#f0f0f0'} />
                        <XAxisComponent dataKey="date" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 8, fill: theme === 'dark' ? '#8696a0' : '#737373' }} tickFormatter={(value: string, index: number) => { const total = chartData.length; if (total === 0) return ''; const middle = Math.floor(total / 2); if (index === 0 || index === middle || index === total - 1) { return value; } return ''; }} />
                        <YAxisComponent orientation="right" width={36} axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: theme === 'dark' ? '#8696a0' : '#737373' }} domain={['auto', 'auto']} tickFormatter={(val: number) => `$${formatCurrency(val)}`} />
                        <TooltipComponent content={<CustomTooltip />} />
                        <AreaComponent type="monotone" dataKey="price" stroke={trendColor} strokeWidth={2} fill="url(#colorPrice)" />
                      </AreaChartComponent>
                    </ResponsiveContainerComponent>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[10px] text-neutral-400 font-bold uppercase border border-dashed border-[#233138] rounded-xl">Sin datos suficientes</div>
                  )}
                </div>
              </div>

              {/* Comparativa por Mercado */}
              <div className="w-full border border-neutral-100 dark:border-[#233138] rounded-lg overflow-hidden mb-4">
                <div className="w-full flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-[#1f2c34]/50">
                  <span className="text-[12px] font-black uppercase tracking-[0.1em] text-black dark:text-[#e9edef]">Comparativa por Mercado</span>
                </div>
                <div className="px-3 py-2 space-y-2 bg-white dark:bg-primary">
                  {STORES.map((s) => {
                    const price = (product as any)[s.key];
                    const url = (product as any)[s.url];
                    
                    // Mapeo de nombres para coincidir con las llaves de tu JSONB
                    const internalKeys: any = {
                      'COTO': 'coto',
                      'CARREFOUR': 'carrefour',
                      'DIA': 'diaonline',
                      'JUMBO': 'jumbo',
                      'MAS ONLINE': 'masonline'
                    };
                    
                    const storeKey = internalKeys[s.name];
                    // Combinar outlier de BD con detección dinámica
                    const isOutlierFromDB = outlierData[storeKey] === true;
                    const isOutlierDynamic = isPriceOutlier(product, s.key);
                    const isOutlier = isOutlierFromDB || isOutlierDynamic;
                    const stockKey = `stock_${storeKey}`;
                    const hasStock = (product as any)[stockKey] !== false;
                    const hasUrl = url && url !== '#' && url.length > 5;

                    // Filtros de visibilidad
                    if (!price || price <= 0 || isOutlier || !hasUrl || !hasStock) {
                      return null;
                    }

                    // Búsqueda de promo en el objeto JSONB (insensible a mayúsculas)
                    const promo = product.oferta_gondola ? Object.entries(product.oferta_gondola).find(
                      ([key]) => key.toLowerCase() === storeKey.toLowerCase()
                    )?.[1] : null;

                    const storeColors: any = { 
                      COTO: 'bg-red-500', 
                      CARREFOUR: 'bg-blue-500', 
                      DIA: 'bg-red-500', 
                      JUMBO: 'bg-green-500', 
                      'MAS ONLINE': 'bg-green-500' 
                    };

                    return (
                      <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-[#233138] last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${storeColors[s.name] || 'bg-gray-400'}`}></span>
                          
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-black text-black dark:text-[#e9edef] uppercase">
                              {s.displayName}
                            </span>
                            
                            {/* DISEÑO IDÉNTICO A PRODUCTLIST */}
                            {promo && (
                              <span className="bg-green-600 text-white text-[8px] font-[900] px-1 py-0.5 rounded-[1px] uppercase leading-none font-sans">
                                {String(promo)}
                              </span>
                            )}
                          </div>
                        </div>

                        <a 
                          href={url || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={`text-base font-mono font-black hover:underline cursor-pointer ${price === minPrice ? 'text-green-500' : 'text-black dark:text-[#e9edef]'}`}
                        >
                          ${formatCurrency(price)}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'related' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
              {relatedProducts.map(related => (
                <div 
                  key={related.id} 
                  onClick={() => onProductSelect?.(related.id)}
                  className="cursor-pointer bg-neutral-50 dark:bg-[#1f2c34] rounded-lg p-2 flex flex-col items-center text-center transition-transform hover:scale-105"
                >
                  <img
                    src={related.imagen_url ? `${related.imagen_url}?width=80&quality=75&format=webp` : 'https://via.placeholder.com/80?text=N/A'}
                    alt={related.nombre}
                    className="w-16 h-16 object-contain mb-2"
                    width="80"
                    height="80"
                    loading="lazy"
                  />
                  <p className="text-[10px] font-bold text-black dark:text-white leading-tight break-words">
                    {related.nombre}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Footer Sticky con Acciones */}
          <div className="w-full sticky bottom-0 bg-white/95 dark:bg-primary/95 pt-2 pb-6 md:pb-4 px-4">
            <div className="flex gap-2 h-12">
              {isFavorite && onUpdateQuantity && (
                <div className="flex items-center bg-neutral-100 dark:bg-[#1f2c34] rounded-lg border border-neutral-200 dark:border-[#233138] overflow-hidden animate-in slide-in-from-left-2 duration-300">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateQuantity(product.id, -1); }}
                    className="w-10 h-full flex items-center justify-center text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 active:scale-90 transition-all"
                  >
                    <i className="fa-solid fa-minus text-[10px]"></i>
                  </button>
                  <span className="w-8 text-center font-mono font-black text-sm text-black dark:text-white">
                    {quantities?.[product.id] || 1}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateQuantity(product.id, 1); }}
                    className="w-10 h-full flex items-center justify-center text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 active:scale-90 transition-all"
                  >
                    <i className="fa-solid fa-plus text-[10px]"></i>
                  </button>
                </div>
              )}
              
              <button 
                onClick={() => validPriceCount >= 2 && onFavoriteToggle(product.id)} 
                disabled={!product || validPriceCount < 2}
                className={`flex-1 rounded-lg font-black uppercase tracking-[0.1em] text-xs flex items-center justify-center gap-2 active:scale-95 transition-all ${
                  isFavorite 
                    ? 'bg-star-gold text-white shadow-lg shadow-star-gold/20' 
                    : validPriceCount >= 2 ? 'bg-primary dark:bg-[#e9edef] text-white dark:text-black border dark:border-[#e9edef]' : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
                }`}
              >
                <i className="fa-solid fa-cart-shopping"></i>
                {isFavorite ? 'En el Chango' : validPriceCount >= 2 ? 'Añadir al Chango' : 'No Disponible'}
              </button>
            </div>
          </div>
        </div>

        {/* Navegación Móvil */}
        <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-primary/95 p-2 flex md:hidden items-center justify-between border-t border-neutral-100 dark:border-[#233138]">
          {onPreviousProduct && (
            <button 
              onClick={onPreviousProduct} 
              className="flex-1 bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white font-bold py-3 px-4 rounded-lg text-sm uppercase tracking-wider"
            >
              Anterior
            </button>
          )}
          <div className="w-2"></div>
          {onNextProduct && (
            <button 
              onClick={onNextProduct} 
              className="flex-1 bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white font-bold py-3 px-4 rounded-lg text-sm uppercase tracking-wider"
            >
              Siguiente
            </button>
          )}
        </div>

        {/* Navegación Desktop */}
        {onPreviousProduct && (
          <button 
            onClick={onPreviousProduct} 
            className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-[70] bg-white/80 dark:bg-black/80 rounded-full w-12 h-12 items-center justify-center shadow-lg hover:scale-110 transition-transform"
            aria-label="Anterior producto"
          >
            <i className="fa-solid fa-chevron-left text-black dark:text-white"></i>
          </button>
        )}
        
        {onNextProduct && (
          <button 
            onClick={onNextProduct} 
            className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-[70] bg-white/80 dark:bg-black/80 rounded-full w-12 h-12 items-center justify-center shadow-lg hover:scale-110 transition-transform"
            aria-label="Siguiente producto"
          >
            <i className="fa-solid fa-chevron-right text-black dark:text-white"></i>
          </button>
        )}
      </div>
    </div>
  );
  } catch (error) {
    console.error('ERROR DE RENDER:', error);
    return (
      <div style={{padding: '20px', background: '#ffebee', color: '#c62828'}}>
        <h1>Error al renderizar ProductDetail</h1>
        <pre>{String(error)}</pre>
      </div>
    );
  }
};

export default ProductDetail;