/**
 * Utilidad para calcular y filtrar outliers en precios de supermercados
 */

/**
 * Detecta outliers en una lista de precios usando el método IQR (Interquartile Range)
 * Un precio es outlier si está fuera del rango [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
 */
export const detectOutliersIQR = (prices: number[]): Set<number> => {
  if (prices.length < 4) return new Set();

  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length / 4)];
  const q3 = sorted[Math.floor(sorted.length * 3 / 4)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = new Set<number>();
  prices.forEach((price, index) => {
    if (price < lowerBound || price > upperBound) {
      outliers.add(price);
    }
  });

  return outliers;
};

/**
 * Detecta outliers usando un umbral de desviación de la mediana
 * Un precio es outlier si está a más del threshold% de la mediana
 * @param prices - Array de precios
 * @param threshold - Porcentaje umbral (default 60%, es decir, 0.6)
 * @returns Set de precios que son outliers
 */
export const detectOutliersByMedian = (prices: number[], threshold: number = 0.6): Set<number> => {
  if (prices.length < 3) return new Set();

  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  if (median === 0) return new Set();

  const outliers = new Set<number>();
  prices.forEach((price) => {
    const deviation = Math.abs(price - median) / median;
    if (deviation > threshold) {
      outliers.add(price);
    }
  });

  return outliers;
};

/**
 * Interface para representar un precio con metadatos
 */
export interface PriceWithMeta {
  key: string;
  value: number;
  isOutlier: boolean;
}

/**
 * Filtra outliers de un array de precios
 * @param prices - Array de precios con metadatos
 * @param threshold - Porcentaje umbral para detectar outliers
 * @returns Array de precios sin outliers
 */
export const filterOutliersFromPrices = (
  prices: PriceWithMeta[],
  threshold: number = 0.5
): PriceWithMeta[] => {
  if (prices.length < 3) return prices;

  const validPrices = prices.filter(p => p.value > 0).map(p => p.value);
  const outlierValues = detectOutliersByMedian(validPrices, threshold);

  return prices.map(p => ({
    ...p,
    isOutlier: p.value > 0 && outlierValues.has(p.value)
  }));
};

/**
 * Obtiene los keys de precio (p_*) y precio regular (pr_*) de un producto
 */
export const getPriceKeys = (): { priceKey: string; regularPriceKey: string }[] => [
  { priceKey: 'p_coto', regularPriceKey: 'pr_coto' },
  { priceKey: 'p_carrefour', regularPriceKey: 'pr_carrefour' },
  { priceKey: 'p_dia', regularPriceKey: 'pr_dia' },
  { priceKey: 'p_jumbo', regularPriceKey: 'pr_jumbo' },
  { priceKey: 'p_masonline', regularPriceKey: 'pr_masonline' },
  { priceKey: 'p_disco', regularPriceKey: 'pr_disco' },
  { priceKey: 'p_vea', regularPriceKey: 'pr_vea' },
  { priceKey: 'p_laanonima', regularPriceKey: 'pr_laanonima' },
];

/**
 * Calcula si un precio es outlier comparando con las medianas de p_ y pr_ por separado
 * @param product - El producto con todos los precios
 * @param priceKey - La key del precio a verificar (ej: 'p_coto')
 * @returns boolean indicando si el precio es outlier
 */
export const isPriceOutlier = (product: any, priceKey: string): boolean => {
  const priceKeys = getPriceKeys();
  
  // Recopilar todos los precios p_
  const pPrices: { key: string; value: number }[] = [];
  // Recopilar todos los precios pr_
  const prPrices: { key: string; value: number }[] = [];

  priceKeys.forEach(({ priceKey: pKey, regularPriceKey: prKey }) => {
    const pValue = product[pKey];
    const prValue = product[prKey];
    
    if (typeof pValue === 'number' && pValue > 0) {
      pPrices.push({ key: pKey, value: pValue });
    }
    if (typeof prValue === 'number' && prValue > 0) {
      prPrices.push({ key: prKey, value: prValue });
    }
  });

  // Detectar outliers en p_
  const pOutlierValues = detectOutliersByMedian(pPrices.map(p => p.value), 0.5);
  // Detectar outliers en pr_
  const prOutlierValues = detectOutliersByMedian(prPrices.map(p => p.value), 0.5);

  // Verificar si el precio dado es outlier en p_
  const currentPPrice = product[priceKey];
  if (typeof currentPPrice === 'number' && currentPPrice > 0) {
    if (pOutlierValues.has(currentPPrice)) return true;
  }

  // Verificar si el precio regular correspondiente es outlier
  const regularPriceKey = priceKeys.find(pk => pk.priceKey === priceKey)?.regularPriceKey;
  if (regularPriceKey) {
    const currentPrPrice = product[regularPriceKey];
    if (typeof currentPrPrice === 'number' && currentPrPrice > 0) {
      if (prOutlierValues.has(currentPrPrice)) return true;
    }
  }

  return false;
};

/**
 * Filtra un producto removiendo supermercados que son outliers
 * @param product - El producto original
 * @returns Objeto con el producto filtrado y los outliers detectados
 */
export const filterProductOutliers = (product: any) => {
  const priceKeys = getPriceKeys();
  
  const outliers: string[] = [];
  const validPrices: { key: string; value: number }[] = [];

  priceKeys.forEach(({ priceKey }) => {
    const price = product[priceKey];
    if (typeof price === 'number' && price > 0) {
      if (isPriceOutlier(product, priceKey)) {
        outliers.push(priceKey);
      } else {
        validPrices.push({ key: priceKey, value: price });
      }
    }
  });

  return {
    product: { ...product },
    outliers,
    validPrices
  };
};
