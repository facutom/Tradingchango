import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CategorySEOData } from '../utils/categorySEO';
import { Product } from '../types';
import { calculateCategoryMetrics, formatStoreName, CategoryMetrics } from '../utils/categoryMetrics';
import OptimizedImage from './OptimizedImage';

interface CategorySEOProps {
  data: CategorySEOData;
  categoryName: string;
  products?: Product[];
}

// Cache de 24 horas para métricas de categoría
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en ms
const CACHE_KEY_PREFIX = 'tc_category_metrics_';

// Función para cargar métricas desde cache
const getCachedMetrics = (cacheKey: string, productsHash: number): CategoryMetrics | null => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const cacheDate = new Date(parsed.timestamp || 0);
      const now = new Date();
      const cacheAge = now.getTime() - cacheDate.getTime();
      
      // Usar cache si:
      // 1. Es reciente (menos de 24h)
      // 2. Dispersión es razonable (≤150%)
      // 3. El hash de productos coincide (asegura que los mismos productos generan el mismo valor)
      if (cacheAge < CACHE_DURATION && 
          parsed.data && 
          parsed.data.dispersion <= 150 &&
          parsed.productsHash === productsHash) {
        return parsed.data;
      }
    }
  } catch (e) {
    // Ignorar errores de localStorage
  }
  return null;
};

// Filtrar productos visibles (visible_web !== false)
const getVisibleProducts = (products: Product[]): Product[] => {
  return products.filter(p => p.visible_web !== false);
};

const CategorySEO: React.FC<CategorySEOProps> = ({ data, categoryName, products = [] }) => {
  // Obtener productos visibles
  const visibleProducts = useMemo(() => getVisibleProducts(products), [products]);
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState<CategoryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Cerrar tooltip al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Generar clave única para esta categoría
  const cacheKey = `${CACHE_KEY_PREFIX}${categoryName.toLowerCase()}`;

  // Generar un hash determinístico de los productos visibles para detectar cambios
  const productsHash = useMemo(() => {
    return visibleProducts.reduce((h, p) => {
      const id = p.id || p.nombre;
      const charSum = id.toString().split('').reduce((h2, c) => h2 + c.charCodeAt(0), 0);
      return (h + charSum * 31) | 0;
    }, 0);
  }, [visibleProducts, categoryName]);

  // Actualizar métricas cuando cambia la categoría o productos
  useEffect(() => {
    // Verificar si hay cache válido
    const cached = getCachedMetrics(cacheKey, productsHash);
    
    if (cached) {
      setMetrics(cached);
      loadedRef.current = true;
      setLoading(false);
    } else {
      // Calcular nuevas métricas
      if (visibleProducts.length > 0) {
        const loadMetrics = async () => {
          setLoading(true);
          try {
            const result = await calculateCategoryMetrics(visibleProducts);
            setMetrics(result);
            // Guardar en localStorage con el hash de productos
            localStorage.setItem(cacheKey, JSON.stringify({
              data: result,
              timestamp: new Date().getTime(),
              categoryName: categoryName,
              productsHash: productsHash
            }));
            loadedRef.current = true;
          } catch (error) {
            console.error('Error calculando métricas:', error);
          }
          setLoading(false);
        };
        loadMetrics();
      } else {
        setMetrics(null);
        setLoading(false);
      }
    }
  }, [categoryName, productsHash, cacheKey]);

  // Memoizar emoji y imagen para evitar recalcularlos
  const emoji = useMemo(() => {
    const normalizedName = categoryName.toLowerCase().trim();
    const emojis: Record<string, string> = {
      carnes: '🥩',
      carne: '🥩',
      verdu: '🥬',
      verdulería: '🥬',
      verdura: '🥬',
      fruta: '🍎',
      frutas: '🍎',
      bebidas: '🥤',
      bebida: '🥤',
      lacteos: '🥛',
      lácteos: '🥛',
      lacteo: '🥛',
      almacen: '🥫',
      almacén: '🥫',
      limpieza: '🧴',
      perfumería: '🧖',
      perfumeria: '🧖',
      mascotas: '🐕',
      mascota: '🐕',
      varios: '📦'
    };
    return emojis[normalizedName] || '📊';
  }, [categoryName]);

  // Memoizar imagen de categoría (URLs nuevas verificadas)
  const categoryImage = useMemo(() => {
    const normalizedName = categoryName.toLowerCase().trim();
    const images: Record<string, string> = {
      carnes: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/1.webp',
      carne: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/1.webp',
      verdu: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/2.webp',
      verdulería: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/2.webp',
      verdura: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/2.webp',
      fruta: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/2.webp',
      frutas: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/2.webp',
      bebidas: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/3.webp',
      bebida: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/3.webp',
      lacteos: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/4.webp',
      lácteos: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/4.webp',
      lacteo: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/4.webp',
      almacen: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/5.webp',
      almacén: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/5.webp',
      limpieza: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/6.webp',
      perfumería: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/7.webp',
      perfumeria: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/7.webp',
      mascotas: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/8.webp',
      mascota: 'https://uginrayldvkhgodvfhta.supabase.co/storage/v1/object/public/Productos/8.webp',
      varios: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop'
    };
    return images[normalizedName] || null;
  }, [categoryName]);

  // Valores con valores por defecto
  const hasHistoricalData = metrics?.hasHistoricalData ?? false;
  const weeklyVariation = metrics?.weeklyVariation ?? null;
  const dispersion = metrics?.dispersion ?? 0;
  const leaderStore = metrics?.leaderStore ?? '-';

  // --- Lógica de Estilos Dinámicos ---
  const variationStyle = useMemo(() => {
    if (loading || !hasHistoricalData || weeklyVariation === null) {
      return "bg-neutral-800 text-white border-neutral-600";
    }
    if (weeklyVariation > 0) { // Precio subió (malo)
      return "bg-red-800 text-white border-red-600";
    }
    // Precio bajó (bueno)
    return "bg-green-800 text-white border-green-600";
  }, [loading, hasHistoricalData, weeklyVariation]);

  const leaderStyle = "text-white font-bold border-green-500 bg-green-800";
  const dispersionStyle = "bg-neutral-800 text-white border-neutral-600";
  const tooltipStyle = "absolute bottom-full mb-2 w-max max-w-[280px] p-2 bg-black/80 backdrop-blur-sm border border-neutral-700 text-white text-[11px] rounded shadow-lg z-50 text-center whitespace-normal";


  return (
    <div className="category-seo mb-2 bg-transparent shadow-sm overflow-hidden">
      {/* Contenedor del Título con Imagen de Fondo */}
      <div
        className="relative px-4 pt-3 pb-4"
        style={{
          backgroundImage: `url(${categoryImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay oscuro para contraste */}
        <div className="absolute inset-0 bg-black/50 z-0"></div>

        {/* Contenido del Título (sobre el overlay) */}
        <div className="relative z-10 flex flex-col items-center flex-wrap gap-2">
          {/* Título con emoji */}
          <h1 className="text-[5vw] xs:text-[20px] sm:text-[24px] font-[800] uppercase tracking-tighter text-white m-0 flex items-center gap-2">
            <span>{emoji}</span>
            <span>{categoryName}</span>
          </h1>

          {/* Rectángulos con métricas calculadas */}
          <div className="flex gap-1 relative flex-wrap justify-center" ref={tooltipRef}>
            {/* % SEMANAL */}
            <div className="relative">
              <button 
                onClick={() => setActiveTooltip(activeTooltip === 'weekly' ? null : 'weekly')}
                className={`text-xs font-bold px-2 py-1 rounded border cursor-help transition-colors ${variationStyle}`}
              >
                {loading ? '...' : 
                  !hasHistoricalData ? 
                    <span className="text-neutral-400">Sin datos</span> : 
                    <>
                      {(weeklyVariation! >= 0 ? '▲' : '▼')} {Math.abs(weeklyVariation!)}% SEMANAL
                    </>
                }
              </button>
              {activeTooltip === 'weekly' && (
                <div className={`${tooltipStyle} left-0`}>
                  Variación promedio de precios de la categoría respecto a la semana pasada
                  <div className="absolute top-full left-4 border-4 border-transparent border-t-black/80"></div>
                </div>
              )}
            </div>
            
            {/* % DISPERSIÓN */}
            <div className="relative">
              <button 
                onClick={() => setActiveTooltip(activeTooltip === 'dispersion' ? null : 'dispersion')}
                className={`text-xs font-bold px-2 py-1 rounded border cursor-help transition-colors ${dispersionStyle}`}
              >
                ◩ {loading ? '-' : dispersion}% BRECHA
              </button>
              {activeTooltip === 'dispersion' && (
                <div className={`${tooltipStyle} left-1/2 -translate-x-1/2`}>
                  Promedio de las diferencias de precios unitarias entre las distintas cadenas para esta categoría
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/80"></div>
                </div>
              )}
            </div>
            
            {/* LÍDER */}
            <div className="relative">
              <button 
                onClick={() => setActiveTooltip(activeTooltip === 'leader' ? null : 'leader')}
                className={`text-xs font-bold px-2 py-1 rounded border cursor-help transition-colors ${leaderStyle}`}
              >
                🏆 {loading ? '-' : formatStoreName(leaderStore)} LÍDER
              </button>
              {activeTooltip === 'leader' && (
                <div className={`${tooltipStyle} right-0`}>
                  Supermercado con el precio promedio más bajo para esta categoría
                  <div className="absolute top-full right-6 border-4 border-transparent border-t-black/80"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Segunda fila: Botón desplegable */}
      <div className="px-4 mb-2 mt-2">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-full gap-2 bg-transparent border-none cursor-pointer text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 hover:opacity-70 transition-opacity p-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M18 9l-5 5-4-4-3 3" />
          </svg>
          Mas info de la categoria
          <span className="bg-neutral-200 dark:bg-neutral-600 px-2 py-0.5 rounded text-[10px] font-bold text-neutral-700 dark:text-neutral-200">
            {visibleProducts.length} productos encontrados
          </span>
        </button>
      </div>

      {/* Tercera fila: Contenido desplegable */}
      {isOpen && (
        <div className="px-4 pb-2">
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 m-0 w-full text-justify">
            {data.dropdownDescription}
          </p>
        </div>
      )}
    </div>
  );
};

export default CategorySEO;
