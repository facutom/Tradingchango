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
    dropdownDescription: 'Encontrá el mejor precio de carne hoy analizando las ofertas de las principales cadenas de supermercados como Coto, Carrefour, Jumbo y Disco. Sabemos que el asado de los domingos y las milanesas de la semana son sagrados, por eso nuestro sistema releva diariamente los precios de la canasta cárnica para que no pagues de más.'
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
    dropdownDescription: 'Comprá verduras y frutas frescas al mejor precio en Argentina. Encontrá banana, manzana, naranja, limón, tomate, lechuga, zapallo y cebolla al costo más bajo. Compará precios de frutas y verduras de estación en todos los supermercados con actualización diaria.'
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
    dropdownDescription: 'Comprá bebidas al mejor precio en Argentina. Encontrá gaseosas, agua mineral, jugos, vinos y cervezas al costo más bajo. Compará ofertas de las mejores marcas en Carrefour, Jumbo, Coto y Disco con precios actualizados semanalmente.'
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
    dropdownDescription: 'Encontrá lácteos al mejor precio en Argentina. Comprá leche, queso, yogurt y manteca al costo más bajo. Compará precios de todas las marcas en Carrefour, Jumbo, Coto y Supermercados Día con ofertas semanales actualizadas.'
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
    dropdownDescription: 'Comprá productos de almacén al mejor precio en Argentina. Encontrá aceite, arroz, fideos, conservas y más al costo más bajo. Compará precios de aceites, legumbres y conservas en todos los supermercados con actualización diaria.'
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
    dropdownDescription: 'Encontrá productos de limpieza al mejor precio en Argentina. Comprá detergente, lavandina, jabón y artículos de limpieza al costo más bajo. Compará ofertas de todas las marcas en Carrefour, Jumbo, Coto y Supermercados Día.'
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
    dropdownDescription: 'Comprá perfumería al mejor precio en Argentina. Encontrá shampoo, desodorante, cremas y perfumes al costo más bajo. Compará ofertas de cuidado personal de todas las marcas en Carrefour, Jumbo, Coto y Disco con precios actualizados.'
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
    dropdownDescription: 'Cuidá a tu mascota al mejor precio en Argentina. Encontrá comida para perros y gatos, balanceado, snacks y accesorios al costo más bajo. Compará ofertas de Pedigree, Purina, Whiskas y las mejores marcas en todos los supermercados.'
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
    dropdownDescription: 'Encontrá productos variados al mejor precio en Argentina. Comprá electrónica, artículos para el hogar, bazar y cocina al costo más bajo. Compará ofertas de supermercado en un solo lugar con precios de todos los principales comercios.'
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
