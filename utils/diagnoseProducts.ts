/**
 * Utilidad de diagnóstico para analizar productos cargados y filtrados
 * Ejecutar en el navegador desde la consola: 
 * import { diagnoseProducts } from './utils/diagnoseProducts';
 * diagnoseProducts(products);
 */

import { Product } from '../types';

interface ProductFilterStats {
  totalProducts: number;
  visibleWeb: number;
  hiddenWeb: number;
  withValidPrices: number;
  withoutValidPrices: number;
  byCategory: Record<string, number>;
  filteredByCategory: Record<string, number>;
  reasons: Record<string, { count: number; productIds: number[] }>;
}

const STORES = [
  { name: 'COTO', key: 'p_coto', url: 'url_coto', stock: 'stock_coto', regular: 'pr_coto' },
  { name: 'CARREFOUR', key: 'p_carrefour', url: 'url_carrefour', stock: 'stock_carrefour', regular: 'pr_carrefour' },
  { name: 'DIA ONLINE', key: 'p_dia', url: 'url_dia', stock: 'stock_dia', regular: 'pr_dia' },
  { name: 'JUMBO', key: 'p_jumbo', url: 'url_jumbo', stock: 'stock_jumbo', regular: 'pr_jumbo' },
  { name: 'MAS ONLINE', key: 'p_masonline', url: 'url_masonline', stock: 'stock_masonline', regular: 'pr_masonline' }
] as const;

interface StorePriceData {
  store: string;
  promoPrice: number;
  regularPrice: number;
  url: string;
  stock: boolean;
  isOutlier: boolean;
  isValid: boolean;
}

interface ProductAnalysis {
  id: number;
  nombre: string;
  categoria: string;
  visible_web: boolean;
  validPriceCount: number;
  totalSupermarkets: number;
  storePrices: StorePriceData[];
  reasons: string[];
}

export function analyzeProduct(product: Product, history: any[] = []): ProductAnalysis {
  const reasons: string[] = [];
  
  // 1. Verificar visible_web
  const isVisible = product.visible_web !== false;
  if (!isVisible) {
    reasons.push('visible_web = false');
  }

  // 2. Analizar precios por supermercado
  let outlierData: Record<string, boolean> = {};
  try {
    outlierData = typeof product.outliers === 'string' 
      ? JSON.parse(product.outliers) 
      : (product.outliers as Record<string, boolean>) || {};
  } catch (e) {
    outlierData = {};
  }

  const storePrices: StorePriceData[] = STORES.map(store => {
    const promoPrice = (product as any)[store.key] || 0;
    const regularPrice = (product as any)[store.regular] || 0;
    const url = (product as any)[store.url] || '';
    const stock = (product as any)[store.stock] !== false;
    const isOutlier = outlierData[store.name.toLowerCase()] === true;
    const hasUrl = url && url !== '#' && url.length > 5;
    
    // Un precio es válido solo si tiene tanto promo como regular Y tiene url Y tiene stock Y no es outlier
    const isValid = promoPrice > 0 && regularPrice > 0 && hasUrl && !isOutlier && stock;

    if (!isValid) {
      const invalidReasons: string[] = [];
      if (promoPrice <= 0) invalidReasons.push('sin precio promo');
      if (regularPrice <= 0) invalidReasons.push('sin precio regular');
      if (!hasUrl) invalidReasons.push('sin URL válida');
      if (isOutlier) invalidReasons.push('es outlier');
      if (!stock) invalidReasons.push('sin stock');
      
      reasons.push(`${store.name}: ${invalidReasons.join(', ')}`);
    }

    return {
      store: store.name,
      promoPrice,
      regularPrice,
      url,
      stock,
      isOutlier,
      isValid
    };
  });

  const validPriceCount = storePrices.filter(s => s.isValid).length;
  
  // 3. Verificar si tiene al menos 2 precios válidos (requisito para mostrar)
  if (validPriceCount < 2) {
    reasons.push(`solo ${validPriceCount} precio(s) válido(s), necesita 2`);
  }

  return {
    id: product.id,
    nombre: product.nombre,
    categoria: product.categoria,
    visible_web: isVisible,
    validPriceCount,
    totalSupermarkets: STORES.length,
    storePrices,
    reasons
  };
}

export function diagnoseProducts(products: Product[], history: any[] = []): ProductFilterStats {
  const stats: ProductFilterStats = {
    totalProducts: products.length,
    visibleWeb: 0,
    hiddenWeb: 0,
    withValidPrices: 0,
    withoutValidPrices: 0,
    byCategory: {},
    filteredByCategory: {},
    reasons: {}
  };

  const analyses = products.map(p => analyzeProduct(p, history));

  //统计
  for (const analysis of analyses) {
    // visible_web
    if (analysis.visible_web) {
      stats.visibleWeb++;
    } else {
      stats.hiddenWeb++;
    }

    // valid prices
    if (analysis.validPriceCount >= 2) {
      stats.withValidPrices++;
    } else {
      stats.withoutValidPrices++;
    }

    // by category
    const cat = analysis.categoria || 'sin categoría';
    stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;

    // filtered (visible_web !== false AND validPriceCount >= 2)
    if (analysis.visible_web && analysis.validPriceCount >= 2) {
      stats.filteredByCategory[cat] = (stats.filteredByCategory[cat] || 0) + 1;
    }

    // reasons
    for (const reason of analysis.reasons) {
      // Simplificar reason para agrupar
      let simplifiedReason = reason;
      
      // Agrupar razones similares
      if (reason.includes('solo ') && reason.includes('precio(s) válido(s)')) {
        const match = reason.match(/solo (\d+) precio\(s\) válido\(s\)/);
        if (match) {
          simplifiedReason = `insuficientes_precios_validos_${match[1]}`;
        }
      }
      
      if (reason.includes(' = false')) {
        simplifiedReason = 'visible_web_false';
      }

      if (!stats.reasons[simplifiedReason]) {
        stats.reasons[simplifiedReason] = { count: 0, productIds: [] };
      }
      stats.reasons[simplifiedReason].count++;
      stats.reasons[simplifiedReason].productIds.push(analysis.id);
    }
  }

  return stats;
}

export function printDiagnosis(products: Product[], history: any[] = []): void {
  const stats = diagnoseProducts(products, history);
  
  console.log('=== DIAGNÓSTICO DE PRODUCTOS ===');
  console.log(`Total productos en BD: ${stats.totalProducts}`);
  console.log(`- Visibles (visible_web !== false): ${stats.visibleWeb}`);
  console.log(`- Ocultos (visible_web = false): ${stats.hiddenWeb}`);
  console.log(`- Con ≥2 precios válidos: ${stats.withValidPrices}`);
  console.log(`- Con <2 precios válidos: ${stats.withoutValidPrices}`);
  console.log('');
  console.log('=== PRODUCTOS QUE SE MUESTRAN ===');
  console.log(`Total: ${stats.withValidPrices + stats.withoutValidPrices === stats.totalProducts ? stats.withValidPrices : 'Error en cálculo'}`);
  console.log('');
  console.log('=== POR CATEGORÍA ===');
  console.log('Categoría'.padEnd(30), 'Total', 'Visibles');
  console.log('-'.repeat(50));
  for (const [cat, total] of Object.entries(stats.byCategory)) {
    const visible = stats.filteredByCategory[cat] || 0;
    console.log(cat.padEnd(30), total.toString().padStart(6), visible.toString().padStart(8));
  }
  console.log('');
  console.log('=== RAZONES DE FILTRADO ===');
  console.log('Razón'.padEnd(50), 'Cantidad');
  console.log('-'.repeat(70));
  for (const [reason, data] of Object.entries(stats.reasons).sort((a, b) => b[1].count - a[1].count)) {
    console.log(reason.padEnd(50), data.count.toString().padStart(6));
  }
  console.log('');
  console.log('=== EJEMPLO DE PRODUCTOS FILTRADOS ===');
  const allAnalyses = products.map(p => analyzeProduct(p, history));
  const filtered = allAnalyses.filter(a => !a.visible_web || a.validPriceCount < 2).slice(0, 10);
  for (const a of filtered) {
    console.log(`ID ${a.id}: ${a.nombre.substring(0, 40)}...`);
    console.log(`  visible_web: ${a.visible_web}, precios válidos: ${a.validPriceCount}/${a.totalSupermarkets}`);
    console.log(`  Razones: ${a.reasons.join(' | ')}`);
  }
}

// Función para ejecutar en la consola del navegador
export function runDiagnosis(): void {
  // @ts-ignore
  if (typeof window !== 'undefined' && (window as any).__PRODUCTS__) {
    // @ts-ignore
    printDiagnosis((window as any).__PRODUCTS__, []);
  } else {
    console.log('Para ejecutar el diagnóstico, necesitas tener acceso a los productos.');
    console.log('En el componente App.tsx, agrega después de cargar los productos:');
    console.log('window.__PRODUCTS__ = products;');
    console.log('Luego ejecuta: import { printDiagnosis } from "./utils/diagnoseProducts"; printDiagnosis(products);');
  }
}
