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
      {/* Primera fila: Título centrado con rectángulos */}
      <div className="flex flex-col items-center flex-wrap gap-2 px-4 pt-2">
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
              className="text-xs font-medium px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-help"
            >
              {loading ? '...' : (weeklyVariation >= 0 ? '↑' : '↓')} {loading ? '-' : Math.abs(weeklyVariation)}% SEMANAL
            </button>
            {/* Tooltip */}
            {activeTooltip === 'weekly' && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[90vw] sm:w-[360px] p-2 bg-gradient-to-br from-neutral-800 to-neutral-900 text-white text-xs rounded shadow-lg z-50 text-center">
                Variación promedio de precios de la categoría respecto a la semana anterior
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-2 border-transparent border-t-neutral-800"></div>
              </div>
            )}
          </div>
          
          {/* % DISPERSIÓN */}
          <div className="relative">
            <button 
              onClick={() => setActiveTooltip(activeTooltip === 'dispersion' ? null : 'dispersion')}
              className="text-xs font-medium px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-help"
            >
              ◩ {loading ? '-' : dispersion}% DISPERSIÓN
            </button>
            {/* Tooltip */}
            {activeTooltip === 'dispersion' && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[90vw] sm:w-[360px] p-2 bg-gradient-to-br from-neutral-800 to-neutral-900 text-white text-xs rounded shadow-lg z-50 text-center">
                Diferencia porcentual entre el precio más alto y más bajo de la categoría
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-2 border-transparent border-t-neutral-800"></div>
              </div>
            )}
          </div>
          
          {/* LÍDER */}
          <div className="relative">
            <button 
              onClick={() => setActiveTooltip(activeTooltip === 'leader' ? null : 'leader')}
              className="text-xs font-medium px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-green-600 cursor-help"
            >
              ★ {loading ? '-' : formatStoreName(leaderStore)} LÍDER
            </button>
            {/* Tooltip */}
            {activeTooltip === 'leader' && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[90vw] sm:w-[360px] p-2 bg-gradient-to-br from-neutral-800 to-neutral-900 text-white text-xs rounded shadow-lg z-50 text-center">
                Supermercado con el precio promedio más bajo para esta categoría
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-2 border-transparent border-t-neutral-800"></div>
              </div>
            )}
          </div>
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
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 m-0 w-full text-justify">
            {data.dropdownDescription}
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(CategorySEO);
