// Configuración SEO para categorías (Argentina)
export interface CategorySEOData {
  title: string;
  description: string;
  keywords: string[];
  introText: string;
  popularSearches: string[];
  icon: string;
  // Títulos y descripciones limpios para el desplegable (sin emojis)
  dropdownTitle: string;
  dropdownDescription: string;
}

export const categorySEOConfig: Record<string, CategorySEOData> = {
  carnes: {
    title: 'Carnes al Mejor Precio - Compará en Argentina',
    description: 'Compará precios de carnes: vaccina, cerdo, pollo. Encontrá las mejores ofertas en Jumbo, Carrefour, Coto y más.',
    keywords: ['carne precio', 'carnes oferta', 'corte de carne', 'carne vaccina', 'pollo precio', 'cerdo precio', 'Argentina'],
    introText: 'Comprá carne al mejor precio en Argentina. Seguí los precios de cortes vaccinos, cerdo y pollo en todos los supermercados.',
    popularSearches: [
      'carne precio hoy',
      'corte vaccina precio',
      'pollo precio kilo',
      'cerdo oferta supermercado'
    ],
    icon: '',
    dropdownTitle: 'Carnes',
    dropdownDescription: 'En esta sección podés comparar precios de carnes en los principales supermercados de Argentina. TradingChango reúne valores actualizados de cortes vacunos, pescado, pollo y cerdo, permitiéndote ver dónde conviene comprar según el precio por kilo y las promociones disponibles. Además, podés analizar la evolución histórica de cada producto para detectar aumentos, bajas y oportunidades reales de ahorro. Si buscás qué supermercado tiene hoy la carne más barata, acá encontrás la información organizada y fácil de consultar.'
  },
  verdu: {
    title: 'Verduras y Frutas - Compará Precios en Argentina',
    description: 'Compará precios de verduras y frutas frescas. Banana, manzana, tomate, lechuga y más al mejor precio.',
    keywords: ['verdura precio', 'fruta precio', 'verdulería', 'frutas frescas', 'banana precio', 'Argentina'],
    introText: 'Comprá verduras y frutas frescas al mejor precio. Compará banana, manzana, naranja, tomate, lechuga y más.',
    popularSearches: [
      'verdura precio hoy',
      'banana precio Argentina',
      'fruta de estación precio',
      'verdulería ofertas'
    ],
    icon: '',
    dropdownTitle: 'Verdulería',
    dropdownDescription: 'Los precios de frutas y verduras cambian todos los días y varían mucho entre cadenas. En Verdulería podés comparar rápidamente cuánto cuesta cada producto según el supermercado y revisar su comportamiento a lo largo del tiempo. TradingChango transforma esa dispersión en datos claros para ayudarte a elegir mejor dónde comprar y aprovechar ofertas genuinas. Ideal para identificar qué verdura o fruta conviene en cada momento.'
  },
  bebidas: {
    title: 'Bebidas - Compará Precios de Gaseosas, Aguas y Más',
    description: 'Compará precios de bebidas: gaseosas, aguas, jugos, vinos y cervezas. Encontrá las mejores ofertas en Argentina.',
    keywords: ['bebida precio', 'gaseosa precio', 'agua mineral', 'jugo precio', 'vino precio', 'cerveza precio', 'Argentina'],
    introText: 'Encontrá las mejores ofertas en bebidas. Gaseosas, aguas, jugos, vinos y cervezas al mejor precio.',
    popularSearches: [
      'gaseosa precio',
      'agua mineral precio',
      'cerveza oferta',
      'vino precio Argentina'
    ],
    icon: '',
    dropdownTitle: 'Bebidas',
    dropdownDescription: 'Explorá y compará precios de gaseosas, aguas, jugos, cervezas y otras bebidas. TradingChango recopila los valores publicados por cada supermercado y los organiza para que encuentres rápidamente la alternativa más económica. El seguimiento histórico también te permite reconocer cuándo aparece una oferta real.'
  },
  lacteos: {
    title: 'Lácteos - Compará Precios de Leche, Queso y Yogurt',
    description: 'Compará precios de lácteos: leche, queso, yogurt, manteca. Las mejores ofertas en productos lácteos.',
    keywords: ['lácteos precio', 'leche precio', 'queso precio', 'yogurt precio', 'manteca precio', 'Argentina'],
    introText: 'Comprá lácteos al mejor precio. Leche, queso cremoso, yogurt y manteca de las mejores marcas.',
    popularSearches: [
      'leche precio hoy',
      'queso cremoso precio',
      'yogurt oferta',
      'manteca precio'
    ],
    icon: '',
    dropdownTitle: 'Lácteos',
    dropdownDescription: 'Compará precios de leche, yogures, quesos y otros lácteos entre supermercados de Argentina. La plataforma te muestra el precio actual, descuentos vigentes y el historial para entender si se trata de una promoción real o de una variación temporal. Con información centralizada y objetiva, es más fácil decidir dónde comprar lácteos al mejor precio.'
  },
  almacen: {
    title: 'Almacén - Compará Precios de Aceites, Arroz y Fideos',
    description: 'Encontrá las mejores ofertas en almacén: aceites, arroz, fideos, conservas y más. Compará precios en Argentina.',
    keywords: ['almacén precio', 'aceite precio', 'arroz precio', 'fideo precio', 'conservas', 'Argentina'],
    introText: 'Todo lo que necesitás del almacén. Aceites, arroz, fideos, conservas y más al mejor precio.',
    popularSearches: [
      'aceite precio Argentina',
      'arroz precio kilo',
      'fideo oferta',
      'conserva precio'
    ],
    icon: '',
    dropdownTitle: 'Almacén',
    dropdownDescription: 'Los productos de almacén son los que más influyen en el gasto mensual. En esta categoría podés comparar precios de fideos, arroz, aceites, conservas y mucho más, viendo en qué supermercado conviene comprar hoy. Además del precio actual, tenés acceso al historial para evaluar tendencias y anticipar subas. Información concreta para decisiones de compra inteligentes.'
  },
  limpieza: {
    title: 'Productos de Limpieza - Compará Precios en Argentina',
    description: 'Compará precios de productos de limpieza: detergente, lavandina, jabón. Encontrá las mejores ofertas.',
    keywords: ['limpieza precio', 'detergente precio', 'lavandina precio', 'jabón precio', 'productos limpieza', 'Argentina'],
    introText: 'Todo para tu hogar limpio. Detergente, lavandina, jabón y productos de limpieza al mejor precio.',
    popularSearches: [
      'detergente precio',
      'lavandina oferta',
      'jabón precio',
      'productos limpieza baratos'
    ],
    icon: '',
    dropdownTitle: 'Limpieza',
    dropdownDescription: 'Detergentes, lavandinas, desinfectantes y productos para el hogar presentan grandes diferencias de precio según la cadena. TradingChango centraliza la información para que puedas comparar de forma rápida, identificar promociones y evaluar el historial de cada artículo. Una herramienta clave para reducir el gasto cotidiano.'
  },
  perfumeria: {
    title: 'Perfumería - Compará Precios de Shampoo y Desodorante',
    description: 'Compará precios de perfumería: shampoo, desodorante, cremas. Cuidado personal al mejor precio.',
    keywords: ['perfumería precio', 'shampoo precio', 'desodorante precio', 'crema precio', 'perfume precio', 'Argentina'],
    introText: 'Tu cuidado personal al mejor precio. Shampoo, desodorante, cremas y perfumes de todas las marcas.',
    popularSearches: [
      'shampoo precio',
      'desodorante oferta',
      'crema facial precio',
      'perfume precio Argentina'
    ],
    icon: '',
    dropdownTitle: 'Perfumería',
    dropdownDescription: 'Los artículos de cuidado personal suelen tener promociones frecuentes, pero no siempre es fácil saber si el descuento es conveniente. En Perfumería podés comparar precios actuales entre supermercados y revisar la evolución del producto en el tiempo. Así distinguís rebajas auténticas de simples cambios de referencia.'
  },
  mascotas: {
    title: 'Mascotas - Comida para Perros y Gatos al Mejor Precio',
    description: 'Cuidá a tu mascota con las mejores ofertas. Balanceado, snacks y accesorios para perros y gatos.',
    keywords: ['mascota precio', 'comida perro', 'comida gato', 'balanceado precio', 'Argentina'],
    introText: 'Todo para tus mascotas. Balanceado para perros y gatos, snacks, juguetes y accesorios.',
    popularSearches: [
      'balanceado perro precio',
      'comida gato oferta',
      'juguete perro precio',
      'snack gato precio'
    ],
    icon: '',
    dropdownTitle: 'Mascotas',
    dropdownDescription: 'Encontrá el alimento y los productos para mascotas al mejor precio. TradingChango te permite comparar entre distintas cadenas, ver promociones activas y seguir la evolución del valor de cada artículo en el tiempo. Si querés ahorrar en balanceado, piedras sanitarias o accesorios, esta sección te ayuda a detectar rápidamente la opción más conveniente.'
  },
  varios: {
    title: 'Varios - Ofertas en Productos Variados',
    description: 'Encontrá ofertas en productos variados: electrónica, hogar, bazar y más. Compará precios en Argentina.',
    keywords: ['varios precio', 'ofertas', 'hogar precio', 'bazar ofertas', 'Argentina'],
    introText: 'Productos variados al mejor precio. Electrónica, hogar, bazar y todo lo que necesitás.',
    popularSearches: [
      'ofertas supermercado',
      'productos hogar precio',
      'bazar ofertas Argentina'
    ],
    icon: '',
    dropdownTitle: 'Varios',
    dropdownDescription: 'Los productos de almacén son los que más influyen en el gasto mensual. En esta categoría podés comparar precios de fideos, arroz, aceites, conservas y mucho más, viendo en qué supermercado conviene comprar hoy. Además del precio actual, tenés acceso al historial para evaluar tendencias y anticipar subas. Información concreta para decisiones de compra inteligentes.'
  }
};

// Función para normalizar nombre de categoría a clave
export function getCategorySEOKey(category: string): string {
  const normalized = category.toLowerCase().trim();
  
  // Mapeo de variaciones
  if (normalized.includes('carne')) return 'carnes';
  if (normalized.includes('verdu') || normalized.includes('fruta')) return 'verdu';
  if (normalized.includes('bebida')) return 'bebidas';
  if (normalized.includes('lacteo')) return 'lacteos';
  if (normalized.includes('almacen')) return 'almacen';
  if (normalized.includes('limpieza')) return 'limpieza';
  if (normalized.includes('perfume')) return 'perfumeria';
  if (normalized.includes('mascota')) return 'mascotas';
  
  return 'varios'; // Default
}

// Obtener datos SEO por categoría
export function getCategorySEO(category: string): CategorySEOData {
  const key = getCategorySEOKey(category);
  return categorySEOConfig[key] || categorySEOConfig['varios'];
}
