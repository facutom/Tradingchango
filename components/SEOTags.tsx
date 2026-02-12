import React, { useEffect } from 'react';

interface SEOTagsProps {
  title?: string;
  description?: string;
  keywords?: string;
  robots?: string;
  canonical?: string;
  ogType?: 'website' | 'product' | 'article';
  ogImage?: string;
  noIndex?: boolean;
  productPageData?: {
    productName: string;
    prices: { store: string; price: number; available: boolean }[];
    image?: string;
  };
  categoryPageData?: {
    categoryName: string;
    productCount: number;
    description: string;
  };
  storePageData?: {
    storeName: string;
    productCount: number;
    description: string;
  };
  breadcrumbs?: Array<{
    name: string;
    url: string;
    position: number;
  }>;
}

interface FAQItem {
  question: string;
  answer: string;
}

const FAQs: FAQItem[] = [
  {
    question: '¿Cómo encuentro el precio de un producto en Coto?',
    answer: 'Buscá el producto en nuestra barra de búsqueda o navegá por categorías. TradingChango te muestra los precios actualizados de Coto, Carrefour, Jumbo, Día y Mas Online.'
  },
  {
    question: '¿Cada cuánto se actualizan los precios?',
    answer: 'Los precios se actualizan diariamente. Nuestro sistema scrapea los supermercados cada 24 horas.'
  },
  {
    question: '¿TradingChango tiene costo?',
    answer: 'La versión básica es gratuita. La versión PRO incluye alertas de precio y historial de 365 días.'
  },
  {
    question: '¿Puedo comparar precios entre supermercados?',
    answer: 'Sí, comparamos el mismo producto en hasta 5 supermercados diferentes.'
  },
  {
    question: '¿Cómo ahorrá dinero en el supermercado?',
    answer: '1) Compará precios antes de ir, 2) Elegí el supermercado más barato, 3) Aprovechá las ofertas.'
  },
  {
    question: '¿Qué productos tienen mayor inflación?',
    answer: 'Según nuestros datos, Carnes, Verduras y Lacteos son las categorías con mayor volatilidad.'
  }
];

// ============================================
// GENERADORES DE TÍTULOS SEO
// ============================================

export function generateProductTitle(productName: string, storeName?: string): string {
  const year = new Date().getFullYear();
  if (storeName) {
    return `Precio ${productName} ${storeName} hoy ${year} | TradingChango`;
  }
  return `Precio ${productName} hoy ${year} | Compará y ahorrá`;
}

export function generateCategoryTitle(categoryName: string): string {
  return `${categoryName} | Precios ${new Date().getFullYear()} | TradingChango`;
}

export function generateStoreTitle(storeName: string): string {
  return `Precios en ${storeName} | Ofertas ${new Date().getFullYear()} | TradingChango`;
}

export function generateVariationTitle(productName: string, variation: number, days: number): string {
  const direction = variation > 0 ? 'subió' : 'bajó';
  const absVar = Math.abs(variation).toFixed(1);
  return `${productName} ${direction} ${absVar}% (${days} días) | TradingChango`;
}

// ============================================
// GENERADORES DE DESCRIPCIONES SEO
// ============================================

export function generateProductDescription(productName: string, storeName?: string): string {
  const today = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  if (storeName) {
    return `Precio ${productName} en ${storeName} hoy ${today}. ${productName} al mejor precio en Argentina.`;
  }
  return `¿Dónde comprar ${productName} más barato? Comparativa de precios Coto, Carrefour, Jumbo, Día. ${productName} al mejor precio.`;
}

export function generateCategoryDescription(categoryName: string, productCount: number): string {
  return `${categoryName}: ${productCount}+ productos con precios actualizados. Compará en Coto, Carrefour, Jumbo. Ahorrá hoy.`;
}

export function generateStoreDescription(storeName: string, productCount: number): string {
  return `Precios de ${productCount}+ productos en ${storeName}. Ofertas ${new Date().getFullYear()}. Compará con otros supermercados.`;
}

// ============================================
// GENERADORES DE H1
// ============================================

export function generateProductH1(productName: string, storeName?: string): string {
  return `${productName} ${storeName ? `en ${storeName}` : 'precio hoy'}`;
}

export function generateCategoryH1(categoryName: string): string {
  return `Precios de ${categoryName} en supermercados`;
}

export function generateStoreH1(storeName: string): string {
  return `Precios en ${storeName} | Ofertas y promociones`;
}

// ============================================
// SCHEMA.ORG GENERATORS
// ============================================

export function generateProductSchema(
  productName: string,
  prices: { store: string; price: number; available: boolean }[],
  currency: string = 'ARS',
  image?: string
) {
  const availablePrices = prices.filter(p => p.available);
  const lowestPrice = availablePrices.length > 0 
    ? Math.min(...availablePrices.map(p => p.price))
    : 0;
  const availability = availablePrices.length > 0 
    ? 'https://schema.org/InStock' 
    : 'https://schema.org/OutOfStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    image: image,
    aggregateRating: availablePrices.length > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: '4.3',
      reviewCount: availablePrices.length * 5
    } : undefined,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: currency,
      lowPrice: lowestPrice,
      highPrice: Math.max(...prices.map(p => p.price)),
      availability: availability,
      seller: { '@type': 'Organization', name: 'TradingChango' },
      offers: prices.filter(p => p.available).map(p => ({
        '@type': 'Offer',
        price: p.price,
        priceCurrency: currency,
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: p.store }
      }))
    }
  };
}

export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string; position: number }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map(crumb => ({
      '@type': 'ListItem',
      position: crumb.position,
      name: crumb.name,
      item: crumb.url
    }))
  };
}

export function generateCollectionPageSchema(name: string, description: string, url: string, itemCount: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: name,
    description: description,
    url: url,
    numberOfItems: itemCount,
    mainEntity: { '@type': 'ItemList', numberOfItems: itemCount }
  };
}

export function generateStoreSchema(storeName: string, productCount: number) {
  const storeNames: Record<string, string> = {
    'COTO': 'Coto', 'CARREFOUR': 'Carrefour', 'DIA': 'Día',
    'JUMBO': 'Jumbo', 'MAS ONLINE': 'Mas Online'
  };
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: storeNames[storeName.toUpperCase()] || storeName,
    description: `Precios de ${productCount}+ productos en ${storeNames[storeName.toUpperCase()] || storeName}`,
    url: `https://tradingchango.com/supermercado/${storeName.toLowerCase().replace(/ /g, '-')}`
  };
}

export function generateFAQSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer }
    }))
  };
}

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TradingChango',
    url: 'https://tradingchango.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: 'https://tradingchango.com/buscar?q={search_term_string}' },
      'query-input': 'required name=search_term_string'
    }
  };
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const SEOTags: React.FC<SEOTagsProps> = ({
  title,
  description,
  keywords,
  robots = 'index, follow',
  canonical,
  ogType = 'website',
  ogImage = 'https://tradingchango.com/og-image.jpg',
  noIndex = false,
  productPageData,
  categoryPageData,
  storePageData,
  breadcrumbs
}) => {
  useEffect(() => {
    // Title
    if (title) document.title = title;

    // Meta helper
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };

    const setOG = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement;
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
      el.content = content;
    };

    const setTwitter = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="twitter:${name}"]`) as HTMLMetaElement;
      if (!el) { el = document.createElement('meta'); el.name = `twitter:${name}`; document.head.appendChild(el); }
      el.content = content;
    };

    // Apply metadata
    if (description) {
      setMeta('description', description);
      setOG('og:description', description);
      setTwitter('description', description);
    }
    if (keywords) setMeta('keywords', keywords);
    setMeta('robots', noIndex ? 'noindex, nofollow' : robots);

    // Open Graph
    setOG('og:title', title || 'TradingChango');
    setOG('og:type', ogType);
    setOG('og:image', ogImage);
    setOG('site_name', 'TradingChango');

    // Canonical
    if (canonical) {
      setOG('og:url', canonical);
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
      link.href = canonical;
    }

    // Twitter
    setTwitter('card', 'summary_large_image');
    setTwitter('title', title || 'TradingChango');
    setTwitter('image', ogImage);

    // Product Schema
    if (productPageData) {
      const schema = generateProductSchema(
        productPageData.productName,
        productPageData.prices,
        'ARS',
        productPageData.image
      );
      let script = document.querySelector('script[type="application/ld+json"][data-product-schema]') as HTMLScriptElement;
      if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.setAttribute('data-product-schema', ''); document.head.appendChild(script); }
      script.textContent = JSON.stringify(schema);
    }

    // Breadcrumb Schema
    if (breadcrumbs && breadcrumbs.length > 0) {
      const schema = generateBreadcrumbSchema(breadcrumbs);
      let script = document.querySelector('script[type="application/ld+json"][data-breadcrumb-schema]') as HTMLScriptElement;
      if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.setAttribute('data-breadcrumb-schema', ''); document.head.appendChild(script); }
      script.textContent = JSON.stringify(schema);
    }

    // Category Schema
    if (categoryPageData && !productPageData) {
      const schema = generateCollectionPageSchema(
        categoryPageData.categoryName,
        categoryPageData.description,
        canonical || 'https://tradingchango.com',
        categoryPageData.productCount
      );
      let script = document.querySelector('script[type="application/ld+json"][data-category-schema]') as HTMLScriptElement;
      if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.setAttribute('data-category-schema', ''); document.head.appendChild(script); }
      script.textContent = JSON.stringify(schema);
    }

    // Store Schema
    if (storePageData && !productPageData) {
      const schema = generateStoreSchema(storePageData.storeName, storePageData.productCount);
      let script = document.querySelector('script[type="application/ld+json"][data-store-schema]') as HTMLScriptElement;
      if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.setAttribute('data-store-schema', ''); document.head.appendChild(script); }
      script.textContent = JSON.stringify(schema);
    }

    // FAQ Schema (home only)
    if (!productPageData && !categoryPageData && !storePageData) {
      const schema = generateFAQSchema(FAQs);
      let script = document.querySelector('script[type="application/ld+json"][data-faq-schema]') as HTMLScriptElement;
      if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.setAttribute('data-faq-schema', ''); document.head.appendChild(script); }
      script.textContent = JSON.stringify(schema);
    }

    // Website Schema
    const websiteSchema = generateWebsiteSchema();
    let wsScript = document.querySelector('script[type="application/ld+json"][data-website-schema]') as HTMLScriptElement;
    if (!wsScript) { wsScript = document.createElement('script'); wsScript.type = 'application/ld+json'; wsScript.setAttribute('data-website-schema', ''); document.head.appendChild(wsScript); }
    wsScript.textContent = JSON.stringify(websiteSchema);

  }, [title, description, keywords, robots, canonical, ogType, ogImage, noIndex, productPageData, categoryPageData, storePageData, breadcrumbs]);

  return null;
};

export default SEOTags;
