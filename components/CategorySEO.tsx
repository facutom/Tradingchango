import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CategorySEOData } from '../utils/categorySEO';
import { Product } from '../types';
import { calculateCategoryMetrics, formatStoreName, CategoryMetrics } from '../utils/categoryMetrics';

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

const CategorySEO: React.FC<CategorySEOProps> = ({ data, categoryName, products = [] }) => {
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

  // Generar un hash determinístico de los productos para detectar cambios
  const productsHash = useMemo(() => {
    return products.reduce((h, p) => {
      const id = p.id || p.nombre;
      const charSum = id.toString().split('').reduce((h2, c) => h2 + c.charCodeAt(0), 0);
      return (h + charSum * 31) | 0;
    }, 0);
  }, [products, categoryName]);

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
      if (products.length > 0) {
        const loadMetrics = async () => {
          setLoading(true);
          try {
            const result = await calculateCategoryMetrics(products);
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

  // Memoizar emoji para evitar recalcularlo
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

  // Valores con valores por defecto
  const hasHistoricalData = metrics?.hasHistoricalData ?? false;
  const weeklyVariation = metrics?.weeklyVariation ?? null;
  const dispersion = metrics?.dispersion ?? 0;
  const leaderStore = metrics?.leaderStore ?? '-';

  // --- Lógica de Estilos Dinámicos ---
  const variationStyle = useMemo(() => {
    if (loading || !hasHistoricalData || weeklyVariation === null) {
      return "text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700";
    }
    if (weeklyVariation > 0) { // Precio subió (malo)
      return "text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/50";
    }
    // Precio bajó (bueno)
    return "text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/50";
  }, [loading, hasHistoricalData, weeklyVariation]);

  const leaderStyle = "text-green-700 dark:text-green-400 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/30";
  const dispersionStyle = "text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700";
  const tooltipStyle = "absolute bottom-full mb-2 w-max max-w-[280px] p-2 bg-black/80 backdrop-blur-sm border border-neutral-700 text-white text-[11px] rounded shadow-lg z-50 text-center whitespace-normal";


  return (
    <div className="category-seo mb-2 bg-transparent rounded-xl shadow-sm">
      {/* Fondo para título con soporte modo oscuro/claro */}
      <div className="px-4 pt-2 pb-2">
        {/* Primera fila: Título centrado con rectángulos */}
        <div className="flex flex-col items-center flex-wrap gap-2">
          {/* Título con emoji */}
          <h1 className="text-[5vw] xs:text-[20px] sm:text-[24px] font-[800] uppercase tracking-tighter text-black dark:text-white m-0 flex items-center gap-2">
            <span>{emoji}</span>
            <span>{categoryName}</span>
          </h1>

          {/* Rectángulos con métricas calculadas - con tooltips por click */}
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
              {/* Tooltip */}
              {activeTooltip === 'weekly' && (
                <div className={`${tooltipStyle} left-0`}>
                  Indica cuánto cambió el precio mínimo de los productos de esta categoría en los últimos 7 días.
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
                ◩ {loading ? '-' : dispersion}% BRECHA DE PRECIOS
              </button>
              {/* Tooltip */}
              {activeTooltip === 'dispersion' && (
                <div className={`${tooltipStyle} left-1/2 -translate-x-1/2`}>
                  Muestra la diferencia promedio entre el lugar más caro y el más barato para cada producto. Cuanto más alto es este porcentaje, más dinero ahorrás comparando en TradingChango.
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
              {/* Tooltip */}
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
      <div className="px-4 mb-2">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-full gap-2 bg-transparent border-none cursor-pointer text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 hover:opacity-70 transition-opacity p-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M18 9l-5 5-4-4-3 3" />
          </svg>
          Sobre la categoria
          <span className="bg-neutral-200 dark:bg-neutral-600 px-2 py-0.5 rounded text-[10px] font-bold text-neutral-700 dark:text-neutral-200">
            {products.length} productos encontrados
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