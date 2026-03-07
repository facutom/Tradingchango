import { supabase } from '../services/supabase';
import { Product } from '../types';

// Tipos para la lista inteligente
interface ListaItem {
  query_original: string;
  query_normalizado: string;
  productos_encontrados: any[];
  producto_seleccionado: any | null;
  precio_minimo: number;
  supermercado_mejor: string;
  ahorro_estimado: number;
}

// Supermercados disponibles
const SUPERMERCADOS = ['jumbo', 'carrefour', 'coto', 'dia', 'disco', 'vea', 'laanonima'];

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
  'manzana': 'manzana',
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

function normalizarQuery(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0 && !CONECTORES.includes(token))
    .join(' ');
}

function aplicarAlias(texto: string): string {
  const normalizado = normalizarQuery(texto);
  for (const [alias, reemplazo] of Object.entries(ALIAS)) {
    if (normalizado.includes(alias) || normalizado === alias) {
      return normalizado.replace(alias, reemplazo);
    }
  }
  return normalizado;
}

function getPrecio(producto: any, supermercado: string): number {
  return (producto[`p_${supermercado}`] as number) || 0;
}

function getMenorPrecio(producto: any): { precio: number; supermercado: string } {
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

function getSegundoMenorPrecio(producto: any): number {
  const precios: number[] = [];
  
  for (const superm of SUPERMERCADOS) {
    const precio = getPrecio(producto, superm);
    if (precio > 0) {
      precios.push(precio);
    }
  }
  
  if (precios.length < 2) return 0;
  
  precios.sort((a, b) => a - b);
  return precios[1];
}

function buscarProductos(productos: any[], query: string): any[] {
  const q = aplicarAlias(query);
  const qTokens = q.split(' ');
  const resultados: { producto: any; score: number }[] = [];
  
  for (const producto of productos) {
    let score = 0;
    
    const nombreNorm = normalizarQuery(producto.nombre || '');
    const marcaNorm = normalizarQuery(producto.marca || '');
    const subcatNorm = normalizarQuery(producto.subcategoria || '');
    const subsubcatNorm = normalizarQuery(producto.subsubcategoria || '');
    const catNorm = normalizarQuery(producto.categoria || '');
    
    // PRIORIDAD 1: Match exacto
    if (nombreNorm === q || nombreNorm.includes(q)) {
      score += 100;
    }
    if (marcaNorm && (marcaNorm === q || q.includes(marcaNorm))) {
      score += 80;
    }
    
    // PRIORIDAD 2: Tokens
    const nombreTokens = nombreNorm.split(' ');
    const matchedTokens = qTokens.filter(t => nombreTokens.includes(t));
    score += matchedTokens.length * 10;
    
    // PRIORIDAD 3: Subcategoría
    if (subcatNorm && (subcatNorm.includes(q) || q.includes(subcatNorm))) {
      score += 50;
    }
    if (subsubcatNorm && (subsubcatNorm.includes(q) || q.includes(subsubcatNorm))) {
      score += 40;
    }
    
    // PRIORIDAD 4: Categoría
    if (catNorm && (catNorm.includes(q) || q.includes(catNorm))) {
      score += 20;
    }
    
    if (score > 0) {
      resultados.push({ producto, score });
    }
  }
  
  resultados.sort((a, b) => b.score - a.score);
  return resultados.slice(0, 6).map(r => r.producto);
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { lista } = await req.json();
    
    if (!lista || typeof lista !== 'string') {
      return new Response(JSON.stringify({ error: 'Se requiere una lista de compras' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener productos de Supabase
    const { data: productos, error } = await supabase
      .from('productos')
      .select('*')
      .eq('visible_web', true);
    
    if (error || !productos) {
      console.error('Error fetching productos:', error);
      return new Response(JSON.stringify({ error: 'No se pudieron cargar los productos' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Procesar cada línea
    const lineas = lista.split('\n').filter((l: string) => l.trim().length > 0);
    const items: ListaItem[] = [];

    for (const linea of lineas) {
      const queryOriginal = linea.trim();
      const queryNormalizado = aplicarAlias(queryOriginal);
      
      const productosEncontrados = buscarProductos(productos, queryNormalizado);
      
      let productoSeleccionado: any = null;
      let precioMinimo = 0;
      let supermercadoMejor = '';
      let ahorroEstimado = 0;
      
      if (productosEncontrados.length > 0) {
        productoSeleccionado = productosEncontrados[0];
        const infoPrecio = getMenorPrecio(productoSeleccionado);
        precioMinimo = infoPrecio.precio;
        supermercadoMejor = infoPrecio.supermercado;
        
        const segundoPrecio = getSegundoMenorPrecio(productoSeleccionado);
        if (segundoPrecio > 0) {
          ahorroEstimado = segundoPrecio - precioMinimo;
        }
      }

      // Limpiar producto para respuesta (quitar URLs muy largas)
      const productoLimpio = productoSeleccionado ? {
        id: productoSeleccionado.id,
        nombre: productoSeleccionado.nombre,
        marca: productoSeleccionado.marca,
        categoria: productoSeleccionado.categoria,
        subcategoria: productoSeleccionado.subcategoria,
        subsubcategoria: productoSeleccionado.subsubcategoria,
        imagen_url: productoSeleccionado.imagen_url,
        p_jumbo: productoSeleccionado.p_jumbo,
        p_carrefour: productoSeleccionado.p_carrefour,
        p_coto: productoSeleccionado.p_coto,
        p_dia: productoSeleccionado.p_dia,
        p_disco: productoSeleccionado.p_disco,
        p_vea: productoSeleccionado.p_vea,
        p_laanonima: productoSeleccionado.p_laanonima,
      } : null;

      items.push({
        query_original: queryOriginal,
        query_normalizado: queryNormalizado,
        productos_encontrados: productosEncontrados.slice(0, 3).map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          marca: p.marca,
          subcategoria: p.subcategoria,
        })),
        producto_seleccionado: productoLimpio,
        precio_minimo: precioMinimo,
        supermercado_mejor: supermercadoMejor,
        ahorro_estimado: ahorroEstimado,
      });
    }

    // Calcular totales
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

    // Mejor supermercado
    let supermercadoRecomendado = '';
    let maxCount = 0;
    for (const [super_, total] of Object.entries(supermercadosTotales)) {
      if (total > maxCount) {
        maxCount = total;
        supermercadoRecomendado = super_;
      }
    }

    const presupuestoId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

    return new Response(JSON.stringify({
      id: presupuestoId,
      items,
      total_minimo: totalMinimo,
      supermercado_recomendado: supermercadoRecomendado,
      ahorro_total: ahorroTotal,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing lista:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
