import { Product } from '../types';
import { supabase } from '../services/supabase';

// Obtener el precio de un supermercado (considerando precio regular)
export function getStorePrice(product: Product, store: string): number {
  const priceField = `p_${store.toLowerCase()}` as keyof Product;
  const promoField = `pr_${store.toLowerCase()}` as keyof Product;
  
  // Si hay precio promocional (pr_), usarlo
  const promoPrice = product[promoField];
  if (typeof promoPrice === 'number' && promoPrice > 0) {
    return promoPrice;
  }
  
  // Sino usar precio regular
  const regularPrice = product[priceField];
  return typeof regularPrice === 'number' ? regularPrice : 0;
}

// Obtener supermercados disponibles para un producto
export function getAvailableStores(product: Product): string[] {
  const stores = ['jumbo', 'carrefour', 'coto', 'dia', 'disco', 'vea', 'laanonima'];
  return stores.filter(store => {
    const price = getStorePrice(product, store);
    return price > 0;
  });
}

// Calcular precio promedio de un producto
export function getAveragePrice(product: Product): number {
  const stores = getAvailableStores(product);
  if (stores.length === 0) return 0;
  
  const total = stores.reduce((sum, store) => sum + getStorePrice(product, store), 0);
  return total / stores.length;
}

// Calcular precio mÃ­nimo de un producto
export function getMinPrice(product: Product): number {
  const stores = getAvailableStores(product);
  if (stores.length === 0) return 0;
  
  return Math.min(...stores.map(store => getStorePrice(product, store)));
}

// Calcular precio mÃ¡ximo de un producto
export function getMaxPrice(product: Product): number {
  const stores = getAvailableStores(product);
  if (stores.length === 0) return 0;
  
  return Math.max(...stores.map(store => getStorePrice(product, store)));
}

// Obtener el supermercado mÃ¡s barato para un producto
export function getCheapestStore(product: Product): { store: string; price: number } | null {
  const stores = getAvailableStores(product);
  if (stores.length === 0) return null;
  
  let cheapest = { store: stores[0], price: getStorePrice(product, stores[0]) };
  for (const store of stores) {
    const price = getStorePrice(product, store);
    if (price < cheapest.price) {
      cheapest = { store, price };
    }
  }
  return cheapest;
}

// Interfaz para mÃ©tricas de categorÃ­a
export interface CategoryMetrics {
  categoryName: string;
  weeklyVariation: number; // % variaciÃ³n semanal
  dispersion: number; // % dispersiÃ³n (brecha entre max y min)
  leaderStore: string; // Supermercado lÃ­der
  productCount: number;
}

// Interfaz para historial de precios
interface PriceHistory {
  nombre_producto: string;
  precio_promedio: number;
  fecha: string;
  supermercado: string;
}

// Calcular variaciÃ³n semanal real desde Supabase
async function getWeeklyVariationReal(products: Product[]): Promise<number> {
  if (products.length === 0) return 0;
  
  try {
    // Obtener fecha de hace 7 dÃ­as
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];
    
    // Obtener nombres Ãºnicos de productos
    const productNames = [...new Set(products.map(p => p.nombre))];
    
    if (productNames.length === 0) return 0;
    
    // Obtener TODOS los precios histÃ³ricos de la semana pasada (sin limite de 50)
    // Dividir en batches si hay muchos productos
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < productNames.length; i += batchSize) {
      batches.push(productNames.slice(i, i + batchSize));
    }
    
    let allHistoryData: any[] = [];
    
    for (const batch of batches) {
      const { data, error } = await supabase
        .from('historial_precios')
        .select('nombre_producto, precio_promedio, precio_minimo')
        .eq('fecha', dateStr)
        .in('nombre_producto', batch);
      
      if (!error && data) {
        allHistoryData = [...allHistoryData, ...data];
      }
    }
    
    // Si no hay datos histÃ³ricos, retornar 0 (no simular)
    if (allHistoryData.length === 0) {
      return 0;
    }
    
    // Calcular variaciÃ³n para CADA producto que tiene datos histÃ³ricos
    const variations: number[] = [];
    
    for (const product of products) {
      const historicalPrices = allHistoryData.filter(h => h.nombre_producto === product.nombre);
      
      if (historicalPrices.length > 0) {
        // Usar precio_promedio histÃ³rico
        const historicalAvg = historicalPrices.reduce((sum: number, h: any) => sum + h.precio_promedio, 0) / historicalPrices.length;
        
        if (historicalAvg > 0) {
          const currentPrice = getAveragePrice(product);
          if (currentPrice > 0) {
            const variation = ((currentPrice - historicalAvg) / historicalAvg) * 100;
            variations.push(variation);
          }
        }
      }
    }
    
    // Si ningÃºn producto tiene datos histÃ³ricos coincidentes, retornar 0
    if (variations.length === 0) {
      return 0;
    }
    
    // Promediar las variaciones
    const avgVariation = variations.reduce((sum, v) => sum + v, 0) / variations.length;
    
    return Math.round(avgVariation * 10) / 10;
  } catch (error) {
    console.error('Error calculando variaciÃ³n semanal:', error);
    return 0;
  }
}

// SimulaciÃ³n basada en variabilidad de precios actuales (determinÃ­stica)
function calculateSimulatedVariation(products: Product[]): number {
  if (products.length === 0) return 0;
  
  // Calcular la volatilidad basada en la dispersiÃ³n de precios actuales
  let totalDispersion = 0;
  let count = 0;
  
  for (const p of products) {
    const min = getMinPrice(p);
    const max = getMaxPrice(p);
    if (min > 0) {
      const dispersion = ((max - min) / min) * 100;
      totalDispersion += dispersion;
      count++;
    }
  }
  
  if (count === 0) return 0;
  
  const avgDispersion = totalDispersion / count;
  
  // Generar hash determinÃ­stico basado en los IDs de productos
  let hashValue = 0;
  for (let i = 0; i < products.length; i++) {
    const id = products[i].id || i;
    hashValue = ((hashValue << 5) - hashValue + id) | 0;
  }
  
  // Normalizar hash a rango 0-1
  const normalizedHash = Math.abs(hashValue % 1000) / 1000;
  
  // VariaciÃ³n basada en volatilidad (entre -3% y +3%)
  const factor = Math.min(avgDispersion / 10, 3);
  const baseVariation = (normalizedHash * 2 - 1) * factor;
  
  return Math.round(baseVariation * 10) / 10;
}

// Calcular mÃ©tricas para una categorÃ­a
export async function calculateCategoryMetrics(products: Product[]): Promise<CategoryMetrics | null> {
  if (products.length === 0) return null;
  
  const categoryName = products[0].categoria;
  
  // Calcular precio promedio por producto
  const avgPrices = products.map(p => getAveragePrice(p)).filter(p => p > 0);
  
  if (avgPrices.length === 0) {
    return {
      categoryName,
      weeklyVariation: 0,
      dispersion: 0,
      leaderStore: '-',
      productCount: products.length
    };
  }
  
  // Calcular dispersiÃ³n promedio (brecha entre precio mÃ¡s alto y mÃ¡s bajo)
  const dispersions = products.map(p => {
    const min = getMinPrice(p);
    const max = getMaxPrice(p);
    if (min === 0 || max === 0) return 0;
    const dispersion = ((max - min) / min) * 100;
    // Limitar dispersiÃ³n mÃ¡xima a 150% (valores mayores son outliers)
    return Math.min(dispersion, 150);
  }).filter(d => d > 0);
  
  const avgDispersion = dispersions.length > 0 
    ? dispersions.reduce((a, b) => a + b, 0) / dispersions.length 
    : 0;
  
  // Calcular supermercado lÃ­der (el que tiene mÃ¡s productos cheapest)
  const storeCounts: Record<string, number> = {};
  products.forEach(p => {
    const cheapest = getCheapestStore(p);
    if (cheapest) {
      const storeName = cheapest.store.charAt(0).toUpperCase() + cheapest.store.slice(1);
      storeCounts[storeName] = (storeCounts[storeName] || 0) + 1;
    }
  });
  
  const leaderStore = Object.entries(storeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  
  // Calcular variaciÃ³n semanal real
  const weeklyVariation = await getWeeklyVariationReal(products);
  
  return {
    categoryName,
    weeklyVariation,
    dispersion: Math.round(avgDispersion * 10) / 10,
    leaderStore,
    productCount: products.length
  };
}

// Formatear nombre de supermercado para mostrar
export function formatStoreName(store: string): string {
  const storeNames: Record<string, string> = {
    jumbo: 'JUMBO',
    carrefour: 'CARREFOUR',
    coto: 'COTO',
    dia: 'DÃA',
    disco: 'DISCO',
    vea: 'VEA',
    laanonima: 'LA ANÃ“NIMA'
  };
  return storeNames[store.toLowerCase()] || store.toUpperCase();
}

