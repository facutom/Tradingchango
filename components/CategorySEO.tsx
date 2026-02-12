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
const getCachedMetrics = (cacheKey: string): CategoryMetrics | null => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const cacheDate = new Date(parsed.timestamp || 0);
      const now = new Date();
      const cacheAge = now.getTime() - cacheDate.getTime();
      
      // Usar cache si es reciente (menos de 24h) y dispersión es razonable (≤150%)
      if (cacheAge < CACHE_DURATION && parsed.data && parsed.data.dispersion <= 150) {
        return parsed.data;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
};

const CategorySEO: React.FC<CategorySEOProps> = ({ data, categoryName, products = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState<CategoryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  
  // Generar clave única para esta categoría
  const cacheKey = `${CACHE_KEY_PREFIX}${categoryName.toLowerCase()}`;

  // Actualizar métricas cuando cambia la categoría o productos
  useEffect(() => {
    // Verificar si hay cache válido
    const cached = getCachedMetrics(cacheKey);
    
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
            // Guardar en localStorage
            localStorage.setItem(cacheKey, JSON.stringify({
              data: result,
              timestamp: new Date().getTime(),
              categoryName: categoryName
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
  }, [categoryName, products.length]); // Depende de categoría y cantidad de productos

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
  const weeklyVariation = metrics?.weeklyVariation ?? 0;
  const dispersion = metrics?.dispersion ?? 0;
  const leaderStore = metrics?.leaderStore ?? '-';

  return (
    <div className="category-seo mb-2 bg-white dark:bg-primary">
      {/* Primera fila: Título a la izquierda, rectángulos a la derecha */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-4 pt-2">
        {/* Título con emoji */}
        <h1 className="text-[5vw] xs:text-[20px] sm:text-[24px] font-[800] uppercase tracking-tighter text-black dark:text-white m-0 flex items-center gap-2">
          <span>{emoji}</span>
          <span>{categoryName}</span>
        </h1>

        {/* Rectángulos con métricas calculadas */}
        <div className="flex gap-1">
          <span className="text-xs font-medium px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400">
            {loading ? '...' : (weeklyVariation >= 0 ? '↑' : '↓')} {loading ? '-' : Math.abs(weeklyVariation)}% SEMANAL
          </span>
          <span className="text-xs font-medium px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400">
            ◩ {loading ? '-' : dispersion}% DISPERSIÓN
          </span>
          <span className="text-xs font-medium px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-green-600">
            ★ {loading ? '-' : formatStoreName(leaderStore)} LÍDER
          </span>
        </div>
      </div>

      {/* Segunda fila: Botón desplegable */}
      <div className="px-4 mb-2">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-transparent border-none cursor-pointer text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 hover:opacity-70 transition-opacity p-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M18 9l-5 5-4-4-3 3" />
          </svg>
          Mas info de la categoria
        </button>
      </div>

      {/* Tercera fila: Contenido desplegable */}
      {isOpen && (
        <div className="px-4 pb-2">
          <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 m-0 w-full text-left">
            {data.dropdownDescription}
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(CategorySEO);
