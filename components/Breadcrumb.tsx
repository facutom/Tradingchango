import React from 'react';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav 
      className={`breadcrumb ${className}`}
      aria-label="Breadcrumb"
      style={{ 
        fontSize: '12px', 
        marginBottom: '12px',
        color: '#6b7280',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <ol style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '8px', 
        listStyle: 'none',
        margin: 0,
        padding: 0
      }}>
        {/* Home link */}
        <li style={{ display: 'flex', alignItems: 'center' }}>
          <a 
            href="/" 
            style={{ 
              color: '#6b7280', 
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            Inicio
          </a>
          <span style={{ marginLeft: '8px', color: '#9ca3af' }}>/</span>
        </li>

        {/* Dynamic items */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li 
              key={item.url} 
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                maxWidth: '200px'
              }}
            >
              {isLast ? (
                <span 
                  style={{ 
                    color: isLast ? '#374151' : '#6b7280',
                    fontWeight: isLast ? 600 : 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.name}
                </span>
              ) : (
                <>
                  <a 
                    href={item.url}
                    style={{ 
                      color: '#6b7280', 
                      textDecoration: 'none',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.name}
                  </a>
                  <span style={{ marginLeft: '8px', color: '#9ca3af' }}>/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/**
 * Genera breadcrumbs para una página de producto
 */
export const generateProductBreadcrumbs = (category: string, productName: string) => {
  return [
    { name: category, url: `/${category.toLowerCase()}`, position: 1 },
    { name: productName, url: `/${category.toLowerCase()}/${productName.toLowerCase().replace(/ /g, '-')}`, position: 2 }
  ];
};

/**
 * Genera breadcrumbs para una página de categoría
 */
export const generateCategoryBreadcrumbs = (category: string) => {
  return [
    { name: category, url: `/${category.toLowerCase()}`, position: 1 }
  ];
};

/**
 * Genera breadcrumbs para una página de supermercado
 */
export const generateStoreBreadcrumbs = (storeName: string) => {
  return [
    { name: 'Supermercados', url: '/supermercados', position: 1 },
    { name: storeName, url: `/supermercado/${storeName.toLowerCase().replace(/ /g, '-')}`, position: 2 }
  ];
};

/**
 * Genera breadcrumbs para página de variaciones de precio
 */
export const generateVariationBreadcrumbs = (category: string, productName: string, variation: number, days: number) => {
  return [
    { name: category, url: `/${category.toLowerCase()}`, position: 1 },
    { name: productName, url: `/${category.toLowerCase()}/${productName.toLowerCase().replace(/ /g, '-')}`, position: 2 },
    { 
      name: `Variación ${Math.abs(variation).toFixed(1)}% (${days} días)`, 
      url: `/variacion/${productName.toLowerCase().replace(/ /g, '-')}/${days}-dias`,
      position: 3 
    }
  ];
};

export default Breadcrumb;
