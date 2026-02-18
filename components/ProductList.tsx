import React from 'react';
import { Product } from '../types';
import ProductListItem from './ProductListItem';
import { memo, useCallback, useMemo } from 'react';
import { FixedSizeList } from 'react-window';

interface ProductWithStats extends Product {
  stats: {
    min: number;
    spread: string;
    trendClass: string;
    icon: string;
    isUp: boolean;
    isDown: boolean;
  };
  isAvailable?: boolean;
}

interface ProductListProps {
  products: ProductWithStats[];
  onProductClick: (product: Product) => void;
  onFavoriteToggle?: (id: number) => void;
  favorites?: Record<number, number>;
  isCartView?: boolean;
  quantities?: Record<number, number>;
  onUpdateQuantity?: (id: number, delta: number) => void;
  searchTerm?: string;
  purchasedItems?: Set<number>;
  onTogglePurchased?: (id: number) => void;
  onProductHover?: () => void;
}

const ProductList: React.FC<ProductListProps> = ({ 
  products, 
  onProductClick, 
  onFavoriteToggle, 
  favorites,
  isCartView,
  quantities,
  onUpdateQuantity,
  searchTerm,
  purchasedItems,
  onTogglePurchased
}) => {

  // Memoizar la función de verificación de favorito
  const isFavorite = useCallback((id: number) => !!favorites?.[id], [favorites]);

  // Memoizar productos visibles
  // En el carrito (isCartView), mostrar todos los productos incluyendo los no disponibles
  const visibleProducts = useMemo(() => {
    if (isCartView) {
      return products; // Mostrar todos los productos en el carrito
    }
    return products.filter(p => p.visible_web !== false);
  }, [products, isCartView]);

  // Memoizar el callback de toggle
  const handleFavoriteToggle = useCallback(onFavoriteToggle || (() => {}), [onFavoriteToggle]);

  if (visibleProducts.length === 0 && searchTerm) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-xl flex items-center justify-center text-neutral-500 mb-4 text-lg">
          <i className="fa-solid fa-magnifying-glass"></i>
        </div>
        <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tighter">Sin resultados</h3>
        <p className="text-[12px] text-neutral-500 dark:text-neutral-500 font-medium">Probá con otros términos.</p>
      </div>
    );
  }

  if (visibleProducts.length === 0 && isCartView) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-900 rounded-2xl flex items-center justify-center text-neutral-500 mb-4 text-2xl">
          <i className="fa-solid fa-cart-shopping"></i>
        </div>
        <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tighter">Tu chango está vacío</h3>
        <p className="text-[12px] text-neutral-500 dark:text-neutral-500 font-medium max-w-[200px]">Agregá productos para empezar a ahorrar.</p>
      </div>
    );
  }

  // Usar virtualización solo para listas muy grandes
  const useVirtualization = visibleProducts.length > 150;

  if (useVirtualization) {
    const Row = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {
      const p = visibleProducts[index];
      return (
        <div style={style}>
          <ProductListItem
            key={p.id}
            product={p}
            isFirst={index === 0}
            index={index}
            isFavorite={isFavorite(p.id)}
            isPurchased={purchasedItems?.has(p.id) || false}
            quantity={quantities ? (quantities[p.id] || 1) : 1}
            isCartView={isCartView}
            isAvailable={p.isAvailable !== false}
            onProductClick={onProductClick}
            onFavoriteToggle={handleFavoriteToggle}
            onTogglePurchased={onTogglePurchased}
            onUpdateQuantity={onUpdateQuantity}
          />
        </div>
      );
    }, [visibleProducts, isFavorite, purchasedItems, quantities, isCartView, onProductClick, handleFavoriteToggle, onTogglePurchased, onUpdateQuantity]);

    return (
      <div 
        className="divide-neutral-100 dark:divide-neutral-900"
        style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 1000px' }}
      >
        <FixedSizeList
          height={window.innerHeight - 120}
          itemCount={visibleProducts.length}
          itemSize={88}
          width="100%"
          overscanCount={5}
        >
          {Row}
        </FixedSizeList>
      </div>
    );
  }

  return (
    <div 
      className="divide-neutral-100 dark:divide-neutral-900"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 1000px' }}
    >
      {visibleProducts.map((p, index) => (
        <ProductListItem
          key={p.id}
          product={p}
          isFirst={index === 0}
          index={index}
          isFavorite={isFavorite(p.id)}
          isPurchased={purchasedItems?.has(p.id) || false}
          quantity={quantities ? (quantities[p.id] || 1) : 1}
          isCartView={isCartView}
          isAvailable={p.isAvailable !== false}
          onProductClick={onProductClick}
          onFavoriteToggle={handleFavoriteToggle}
          onTogglePurchased={onTogglePurchased}
          onUpdateQuantity={onUpdateQuantity}
        />
      ))}
    </div>
  );
};

export default memo(ProductList, (prevProps, nextProps) => {
  // Comparación rápida para evitar re-renders innecesarios
  return prevProps.products === nextProps.products &&
         prevProps.searchTerm === nextProps.searchTerm &&
         prevProps.isCartView === nextProps.isCartView &&
         prevProps.purchasedItems?.size === nextProps.purchasedItems?.size &&
         prevProps.favorites === nextProps.favorites;
});