import { Product } from '../types';

const STORES = [
  { name: "COTO", key: 'p_coto', url: 'url_coto' },
  { name: "CARREFOUR", key: 'p_carrefour', url: 'url_carrefour' },
  { name: "DIA", key: 'p_dia', url: 'url_dia' },
  { name: "JUMBO", key: 'p_jumbo', url: 'url_jumbo' },
  { name: "MAS ONLINE", key: 'p_masonline', url: 'url_masonline' }
] as const;

// Función para calcular la mediana de un array de precios
const calculateMedian = (prices: number[]): number => {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

// Función para calcular el promedio de un array de precios
const calculateAverage = (prices: number[]): number => {
  if (prices.length === 0) return 0;
  const sum = prices.reduce((acc, price) => acc + price, 0);
  return sum / prices.length;
};

// Procesar un solo producto para detectar outliers
const processProductOutlier = (product: Product): string => {
  const p_prices: number[] = [];
  const pr_prices: number[] = [];

  STORES.forEach((store) => {
    const p_key = store.key as keyof Product;
    const pr_key = `pr_${store.key.split('_')[1]}` as keyof Product;

    const p_price = product[p_key] as number;
    if (p_price > 0) {
      p_prices.push(p_price);
    }

    const pr_price = product[pr_key] as number;
    if (pr_price > 0) {
      pr_prices.push(pr_price);
    }
  });

  // Usar promedio en lugar de mediana
  const p_average = calculateAverage(p_prices);
  const pr_average = calculateAverage(pr_prices);

  const outliers: { [key: string]: boolean } = {};

  STORES.forEach((store) => {
    const storeKey = store.name.toLowerCase().replace(' ', '');
    const p_key = store.key as keyof Product;
    const pr_key = `pr_${store.key.split('_')[1]}` as keyof Product;

    const p_price = product[p_key] as number;
    if (p_average > 0 && p_price > 0) {
      const p_deviation = Math.abs((p_price - p_average) / p_average);
      // Usar umbral de 50%
      if (p_deviation > 0.5) {
        outliers[storeKey] = true;
      }
    }

    const pr_price = product[pr_key] as number;
    if (pr_average > 0 && pr_price > 0) {
      const pr_deviation = Math.abs((pr_price - pr_average) / pr_average);
      // Usar umbral de 50%
      if (pr_deviation > 0.5) {
        outliers[storeKey] = true;
      }
    }
  });

  return JSON.stringify(outliers);
};

// Procesar productos en batches para no bloquear el hilo principal
export const calculateOutliers = async (products: Product[], batchSize: number = 50): Promise<Product[]> => {
  return new Promise((resolve) => {
    const results: Product[] = [];
    let index = 0;

    const processBatch = () => {
      const end = Math.min(index + batchSize, products.length);

      for (let i = index; i < end; i++) {
        results.push({
          ...products[i],
          outliers: processProductOutlier(products[i]),
        });
      }

      index = end;

      if (index < products.length) {
        // Usar setTimeout para liberar el hilo principal
        setTimeout(processBatch, 0);
      } else {
        resolve(results);
      }
    };

    processBatch();
  });
};

// Función para verificar si un precio de un producto es outlier
// Usa promedio y umbral de 50%
const isPriceOutlier = (product: Product, storeKey: string): boolean => {
  const prices: number[] = [];
  const price = product[storeKey as keyof Product] as number;
  
  if (price === 0) return false;
  
  // Recopilar precios de todas las tiendas
  STORES.forEach(store => {
    const p = product[store.key as keyof Product] as number;
    if (p > 0) prices.push(p);
  });
  
  if (prices.length === 0) return false;
  const average = calculateAverage(prices);
  if (average === 0) return false;
  const deviation = Math.abs((price - average) / average);
  
  // Usar umbral de 50% (0.5)
  return deviation > 0.5;
};

// Función para detectar outliers en un array de precios
const detectOutliersByMedian = (prices: number[]): number[] => {
  if (prices.length === 0) return [];
  const median = calculateMedian(prices);
  return prices.filter(price => isPriceOutlier({} as Product, '') && price > 0);
};

export { isPriceOutlier, detectOutliersByMedian, calculateMedian, calculateAverage };
