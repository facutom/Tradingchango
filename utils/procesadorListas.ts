import { supabase } from '../services/supabase';
import { Product } from '../types';

// Tipos para la lista inteligente
export interface ListaItem {
  query_original: string;
  query_normalizado: string;
  productos_encontrados: Product[];
  producto_seleccionado: Product | null;
  precio_minimo: number;
  supermercado_mejor: string;
  ahorro_estimado: number;
}

export interface Presupuesto {
  id: string;
  items: ListaItem[];
  total_minimo: number;
  supermercado_recomendado: string;
  ahorro_total: number;
  created_at: string;
}

// Supermercados disponibles
const SUPERMERCADOS = ['jumbo', 'carrefour', 'coto', 'dia', 'disco', 'vea', 'laanonima'] as const;
type Supermercado = typeof SUPERMERCADOS[number];

// Conectores a eliminar
const CONECTORES = ['de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'para', 'con', 'sin', 'x', 'por'];

// Alias comunes para mapping
const ALIAS: Record<string, string> = {
  'coca': 'cocacola',
  'coca cola': 'cocacola',
  'coc': 'cocacola',
  'pepsi': 'pepsicola',
  'sprite': 'sprite',
  'fanta': 'fanta',
  'agua': 'agua',
  'cerveza': 'cerveza',
  'cervezas': 'cerveza',
  'pan': 'pan',
  'pan lactal': 'pan lactal',
  'leche': 'leche',
  'leche entera': 'leche entera',
  'leche descremada': 'leche descremada',
  'yogur': 'yogur',
  'yogurt': 'yogur',
  'manteca': 'manteca',
  'mantequilla': 'manteca',
  'queso': 'queso',
  'dulce de leche': 'dulce de leche',
  'ddl': 'dulce de leche',
  'crema': 'crema de leche',
  'crema de leche': 'crema de leche',
  'huevos': 'huevos',
  'huevo': 'huevos',
  'carne': 'carne',
  'carne para asar': 'asado',
  'asado': 'asado',
  'carne picada': 'carne picada',
  'pollo': 'pollo',
  'pescado': 'pescado',
  'merluza': 'merluza',
  'salmon': 'salmón',
  'atun': 'atún',
  'atún': 'atún',
  'aceite': 'aceite',
  'aceite de girasol': 'aceite de girasol',
  'aceite de oliva': 'aceite de oliva',
  'arroz': 'arroz',
  'harina': 'harina',
  'fideos': 'fideos',
  'pasta': 'pasta',
  'yerba': 'yerba',
  'cafe': 'café',
  'azucar': 'azúcar',
  'sal': 'sal',
  'pimienta': 'pimienta',
  'tomate': 'tomate',
  'tomates': 'tomate',
  'lechuga': 'lechuga',
  'cebolla': 'cebolla',
  'cebollas': 'cebolla',
  'papa': 'papa',
  'papas': 'papa',
  'patata': 'papa',
  'zanahoria': 'zanahoria',
  'zanahorias': 'zanahoria',
  'palta': 'palta',
  'aguacate': 'palta',
  'banana': 'banana',
  'bananas': 'banana',
  'naranja': 'naranja',
  'naranjas': 'naranja',
  'limon': 'limón',
  'limón': 'limón',
  'mango': 'mango',
  'frutilla': 'frutilla',
  'uva': 'uva',
  'papel': 'papel',
  'papel higienico': 'papel higiénico',
  'papel sanitario': 'papel higiénico',
  'servilleta': 'servilletas',
  'servilletas': 'servilletas',
  'detergente': 'detergente',
  'jabon': 'jabón',
  'jabón': 'jabón',
  'lavandina': 'lavandina',
  'esponja': 'esponja',
  'bolsa': 'bolsa',
  'bolsas': 'bolsa',
};

// Mapeo de palabras clave a categorías preferidas
const PALABRAS_CATEGORIA: Record<string, string[]> = {
  'carne': ['carnes'],
  'asado': ['carnes'],
  'picada': ['carnes'],
  'bife': ['carnes'],
  'nalga': ['carnes'],
  'cuadril': ['carnes'],
  'matambre': ['carnes'],
  'vacio': ['carnes'],
  'entraña': ['carnes'],
  'pollo': ['carnes'],
  'cerdo': ['carnes'],
  'churrasco': ['carnes'],
  'milanesa': ['carnes'],
  'leche': ['lacteos'],
  'yogur': ['lacteos'],
  'yogurt': ['lacteos'],
  'queso': ['lacteos'],
  'manteca': ['lacteos'],
  'crema': ['lacteos'],
  'dulce de leche': ['lacteos'],
  'ddl': ['lacteos'],
  'huevos': ['lacteos'],
  'huevo': ['lacteos'],
  'verdura': ['verdu'],
  'verduras': ['verdu'],
  'fruta': ['verdu'],
  'frutas': ['verdu'],
  'tomate': ['verdu'],
  'lechuga': ['verdu'],
  'cebolla': ['verdu'],
  'papa': ['verdu'],
  'banana': ['verdu'],
  'manzana': ['verdu'],
  'naranja': ['verdu'],
  'bebida': ['bebidas'],
  'gaseosa': ['bebidas'],
  'agua': ['bebidas'],
  'cerveza': ['bebidas'],
  'vino': ['bebidas'],
  'jugo': ['bebidas'],
  'pan': ['almacen'],
  'arroz': ['almacen'],
  'fideos': ['almacen'],
  'pasta': ['almacen'],
  'harina': ['almacen'],
  'aceite': ['almacen'],
  'azucar': ['almacen'],
  'sal': ['almacen'],
  'yerba': ['almacen'],
  'cafe': ['almacen'],
  'jabon': ['limpieza'],
  'jabón': ['limpieza'],
  'detergente': ['limpieza'],
  'lavandina': ['limpieza'],
  'esponja': ['limpieza'],
  'papel': ['limpieza'],
};

// Categorías a excluir cuando se busca comida humana
const CATEGORIAS_NO_DESEADAS: Record<string, string[]> = {
  'carne': ['mascotas'],
  'leche': ['mascotas'],
  'pollo': ['mascotas'],
  'queso': ['mascotas'],
  'arroz': ['mascotas'],
};

/**
 * Obtiene la categoría preferida para una búsqueda
 */
export function getCategoriaPreferida(query: string): string[] {
  const q = normalizarQuery(query);
  
  for (const [palabra, categorias] of Object.entries(PALABRAS_CATEGORIA)) {
    if (q.includes(palabra)) {
      return categorias;
    }
  }
  return [];
}

/**
 * Obtiene las categorías a excluir para una búsqueda
 */
export function getCategoriasExcluir(query: string): string[] {
  const q = normalizarQuery(query);
  
  for (const [palabra, categorias] of Object.entries(CATEGORIAS_NO_DESEADAS)) {
    if (q.includes(palabra)) {
      return categorias;
    }
  }
  return [];
}

/**
 * Normaliza el texto de búsqueda
 */
export function normalizarQuery(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9\s]/g, ' ') // Quitar símbolos
    .split(/\s+/) // Tokenizar
    .filter(token => token.length > 0 && !CONECTORES.includes(token)) // Quitar conectores
    .join(' ');
}

/**
 * Aplica alias conhecidos
 */
export function aplicarAlias(texto: string): string {
  const normalizado = normalizarQuery(texto);
  
  // Buscar alias conocido
  for (const [alias, reemplazo] of Object.entries(ALIAS)) {
    if (normalizado.includes(alias) || normalizado === alias) {
      return normalizado.replace(alias, reemplazo);
    }
  }
  
  return normalizado;
}

/**
 * Obtiene el precio de un producto en un supermercado
 */
export function getPrecio(producto: Product, supermercado: string): number {
  const key = `p_${supermercado}` as keyof Product;
  return (producto[key] as number) || 0;
}

/**
 * Obtiene el menor precio de un producto
 */
export function getMenorPrecio(producto: Product): { precio: number; supermercado: string } {
  let menorPrecio = Infinity;
  let supermercadoMenor = '';
  
  for (const superm of SUPERMERCADOS) {
    const precio = getPrecio(producto, superm);
    if (precio > 0 && precio < menorPrecio) {
      menorPrecio = precio;
      supermercadoMenor = superm;
    }
  }
  
  return { precio: menorPrecio === Infinity ? 0 : menorPrecio, supermercado: supermercadoMenor };
}

/**
 * Obtiene el segundo menor precio para calcular ahorro
 */
export function getSegundoMenorPrecio(producto: Product): number {
  const precios: number[] = [];
  
  for (const superm of SUPERMERCADOS) {
    const precio = getPrecio(producto, superm);
    if (precio > 0) {
      precios.push(precio);
    }
  }
  
  if (precios.length < 2) return 0;
  
  // Ordenar y obtener el segundo
  precios.sort((a, b) => a - b);
  return precios[1];
}

/**
 * Busca productos por relevancia
 * Prioridad 1: Nombre exacto o marca
 * Prioridad 2: Subcategoría
 * Prioridad 3: Categoría
 * Prioridad 4: Productos de la categoría correcta (no de mascotas)
 */
export function buscarProductos(productos: Product[], query: string): Product[] {
  const q = aplicarAlias(query);
  const qTokens = q.split(' ');
  
  // Obtener categorías preferidas y a excluir
  const categoriasPreferidas = getCategoriaPreferida(query);
  const categoriasExcluir = getCategoriasExcluir(query);
  
  const resultados: { producto: Product; score: number }[] = [];
  
  for (const producto of productos) {
    let score = 0;
    const productoCategoria = producto.categoria?.toLowerCase() || '';
    
    // PRIORIDAD 0: Saltar productos de categorías no deseadas (ej: mascotas cuando buscas comida humana)
    if (categoriasExcluir.includes(productoCategoria)) {
      continue; // Excluir completamente estos productos
    }
    
    // PRIORIDAD 1: Match exacto en nombre o marca
    const nombreNorm = normalizarQuery(producto.nombre);
    const marcaNorm = normalizarQuery(producto.marca || '');
    const subcatNorm = normalizarQuery(producto.subcategoria || '');
    const subsubcatNorm = normalizarQuery(producto.subsubcategoria || '');
    const catNorm = normalizarQuery(producto.categoria || '');
    
    if (nombreNorm === q || nombreNorm.includes(q)) {
      score += 100;
    }
    if (marcaNorm && (marcaNorm === q || q.includes(marcaNorm))) {
      score += 80;
    }
    
    // PRIORIDAD 2: Match en tokens del nombre
    const nombreTokens = nombreNorm.split(' ');
    const matchedTokens = qTokens.filter(t => nombreTokens.includes(t));
    score += matchedTokens.length * 10;
    
    // PRIORIDAD 3: Match en subcategoría
    if (subcatNorm && (subcatNorm.includes(q) || q.includes(subcatNorm))) {
      score += 50;
    }
    if (subsubcatNorm && (subsubcatNorm.includes(q) || q.includes(subsubcatNorm))) {
      score += 40;
    }
    
    // PRIORIDAD 4: Match en categoría
    if (catNorm && (catNorm.includes(q) || q.includes(catNorm))) {
      score += 20;
    }
    
    // PRIORIDAD 5: Boost si el producto está en la categoría preferida
    if (categoriasPreferidas.length > 0) {
      for (const catPref of categoriasPreferidas) {
        if (productoCategoria === catPref) {
          score += 200; // Gran boost para categoría correcta
          break;
        }
      }
    }
    
    // PRIORIDAD 6: Ordenar por precio (más barato = mejor)
    const precioInfo = getMenorPrecio(producto);
    if (precioInfo.precio > 0) {
      // Invertir el precio para que sea parte del score (más barato = mayor score)
      // Usamos un factor pequeño para no dominar el score
      score += Math.max(0, 1000 - precioInfo.precio) / 100;
    }
    
    if (score > 0) {
      resultados.push({ producto, score });
    }
  }
  
  // Ordenar por score descendente
  resultados.sort((a, b) => b.score - a.score);
  
  // Devolver hasta 6 productos
  return resultados.slice(0, 6).map(r => r.producto);
}

/**
 * Procesa una lista de texto y genera la canasta espejo
 */
export async function procesarLista(textoLista: string): Promise<{
  items: ListaItem[];
  presupuesto: Presupuesto;
}> {
  // Obtener todos los productos de Supabase
  const { data: productos, error } = await supabase
    .from('productos')
    .select('*')
    .eq('visible_web', true);
  
  if (error || !productos) {
    console.error('Error fetching productos:', error);
    throw new Error('No se pudieron cargar los productos');
  }
  
  // Procesar cada línea
  const lineas = textoLista.split('\n').filter(l => l.trim().length > 0);
  const items: ListaItem[] = [];
  
  for (const linea of lineas) {
    const queryOriginal = linea.trim();
    const queryNormalizado = aplicarAlias(queryOriginal);
    
    // Buscar productos relevantes
    const productosEncontrados = buscarProductos(productos, queryNormalizado);
    
    let productoSeleccionado: Product | null = null;
    let precioMinimo = 0;
    let supermercadoMejor = '';
    let ahorroEstimado = 0;
    
    if (productosEncontrados.length > 0) {
      // Seleccionar el de menor precio
      productoSeleccionado = productosEncontrados[0];
      const infoPrecio = getMenorPrecio(productoSeleccionado);
      precioMinimo = infoPrecio.precio;
      supermercadoMejor = infoPrecio.supermercado;
      
      // Calcular ahorro vs segunda opción
      const segundoPrecio = getSegundoMenorPrecio(productoSeleccionado);
      if (segundoPrecio > 0) {
        ahorroEstimado = segundoPrecio - precioMinimo;
      }
    }
    
    items.push({
      query_original: queryOriginal,
      query_normalizado: queryNormalizado,
      productos_encontrados: productosEncontrados,
      producto_seleccionado: productoSeleccionado,
      precio_minimo: precioMinimo,
      supermercado_mejor: supermercadoMejor,
      ahorro_estimado: ahorroEstimado,
    });
  }
  
  // Calcular totales del presupuesto
  let totalMinimo = 0;
  let ahorroTotal = 0;
  const supermercadosTotales: Record<string, number> = {};
  
  for (const item of items) {
    if (item.producto_seleccionado) {
      totalMinimo += item.precio_minimo;
      ahorroTotal += item.ahorro_estimado;
      
      if (!supermercadosTotales[item.supermercado_mejor]) {
        supermercadosTotales[item.supermercado_mejor] = 0;
      }
      supermercadosTotales[item.supermercado_mejor] += item.precio_minimo;
    }
  }
  
  // Determinar supermercado recomendado (el más frecuente en la lista)
  let supermercadoRecomendado = '';
  let maxCount = 0;
  for (const [super_, total] of Object.entries(supermercadosTotales)) {
    if (total > maxCount) {
      maxCount = total;
      supermercadoRecomendado = super_;
    }
  }
  
  const presupuesto: Presupuesto = {
    id: generateId(),
    items,
    total_minimo: totalMinimo,
    supermercado_recomendado: supermercadoRecomendado,
    ahorro_total: ahorroTotal,
    created_at: new Date().toISOString(),
  };
  
  return { items, presupuesto };
}

/**
 * Genera un ID único para el presupuesto
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/**
 * Guarda un presupuesto en Supabase
 */
export async function guardarPresupuesto(
  items: ListaItem[],
  presupuesto: Presupuesto
): Promise<string> {
  const { data, error } = await supabase
    .from('presupuestos')
    .insert({
      id: presupuesto.id,
      items: items,
      total_minimo: presupuesto.total_minimo,
      supermercado_recomendado: presupuesto.supermercado_recomendado,
      ahorro_total: presupuesto.ahorro_total,
      created_at: presupuesto.created_at,
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Error guardando presupuesto:', error);
    throw new Error('No se pudo guardar el presupuesto');
  }
  
  return data.id;
}

/**
 * Recupera un presupuesto por ID
 */
export async function getPresupuesto(id: string): Promise<Presupuesto | null> {
  const { data, error } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching presupuesto:', error);
    return null;
  }
  
  return data as unknown as Presupuesto;
}
