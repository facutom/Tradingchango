import React, { useState, useEffect, useRef, useCallback } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Si es true, usa fetchPriority="high" para LCP. Default: false */
  priority?: boolean;
  /** Ancho nativo para evitar layout shift */
  width?: number;
  /** Alto nativo para evitar layout shift */
  height?: number;
  /** Clases CSS adicionales */
  className?: string;
  /** Placeholder mientras carga */
  placeholder?: string;
  /** Callback cuando la imagen carga */
  onLoad?: () => void;
  /** Calidad de imagen (1-100), default 75 */
  quality?: number;
  /** Formato de imagen preferido */
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
}

/**
 * Componente de imagen optimizado para Core Web Vitals
 * 
 * USO:
 * - Para imágenes LCP (above the fold): priority={true}
 * - Para imágenes secundarias: priority={false} (default)
 * 
 * EJEMPLO:
 * <OptimizedImage 
 *   src="/imagen.jpg" 
 *   alt="Producto" 
 *   priority={true}
 *   width={120}
 *   height={120}
 * />
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  priority = false,
  width,
  height,
  className = '',
  placeholder,
  onLoad,
  quality = 75,
  format = 'auto',
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Memoizar el observer para evitar recrearlo
  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    // Usar callback ref para el observer
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (observerRef.current) {
            observerRef.current.disconnect();
          }
        }
      });
    };

    observerRef.current = new IntersectionObserver(observerCallback, {
      rootMargin: '100px 0px', // Cargar 100px antes de que entre en viewport
      threshold: 0,
    });

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [priority]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  // Generar URL con parámetros optimizados para WebP/AVIF
  const optimizeUrl = useCallback((url: string): string => {
    if (!url || url.startsWith('http')) return url;
    
    const separator = url.includes('?') ? '&' : '?';
    const params = new URLSearchParams();
    
    if (width) params.append('width', String(Math.min(width, 1200))); // Limitar ancho máximo
    params.append('quality', String(Math.max(10, Math.min(95, quality))));
    
    // Preferir AVIF si está disponible, sino WebP
    if (format === 'auto' || format === 'avif') {
      params.append('format', 'avif');
    } else if (format === 'webp') {
      params.append('format', 'webp');
    }
    
    return `${url}${separator}${params.toString()}`;
  }, [width, quality, format]);

  // Para imágenes prioritarias, usar la URL directamente sin lazy loading
  // Para otras imágenes, aplicar lazy loading con IntersectionObserver
  const optimizedSrc = priority ? optimizeUrl(src) : (isInView ? optimizeUrl(src) : '');

  // Mostrar skeleton siempre mientras la imagen no esté cargada
  // Esto reserva el espacio y evita CLS
  const showPlaceholder = !isLoaded && !hasError;

  return (
    <div
      ref={imgRef}
      className={`optimized-image-container ${className}`}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        aspectRatio: width && height ? `${width}/${height}` : undefined,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: isLoaded ? 'transparent' : '#f3f4f6',
        contain: 'content', // CSS containment para mejor rendimiento
        ...style,
      }}
    >
      {/* Skeleton loading - siempre reserva el espacio mientras carga la imagen */}
      {showPlaceholder && (
        <div
          className="absolute inset-0 animate-pulse bg-neutral-200 dark:bg-neutral-800"
          style={{
            backgroundImage: placeholder ? `url(${placeholder})` : 'none',
            backgroundSize: placeholder ? 'contain' : 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: placeholder ? 0.3 : 1,
          }}
        />
      )}

      {/* Placeholder de baja calidad (LQIP) si hay placeholder */}
      {placeholder && !isLoaded && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-contain blur-lg scale-110"
          aria-hidden="true"
          style={{ opacity: 0.4 }}
        />
      )}

      {/* Imagen real - prioritarias se cargan inmediatamente, las otras cuando están en viewport */}
      {(priority || isInView) && !hasError && (
        <picture>
          {/* Source para AVIF */}
          {format !== 'jpeg' && format !== 'png' && (
            <source
              srcSet={optimizeUrl(src).replace(/format=avif|format=webp/, 'format=avif')}
              type="image/avif"
            />
          )}
          {/* Source para WebP */}
          {format !== 'jpeg' && format !== 'png' && (
            <source
              srcSet={optimizeUrl(src).replace(/format=avif/, 'format=webp')}
              type="image/webp"
            />
          )}
          <img
            src={optimizedSrc || src}
            alt={alt}
            width={width}
            height={height}
            decoding="async"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full h-full object-contain ${priority ? '' : 'transition-opacity duration-300'} ${
              isLoaded || priority ? 'opacity-100' : 'opacity-0'
            }`}
            // Prevenir drag de imagen para mejor rendimiento
            onDragStart={(e) => e.preventDefault()}
            {...props}
          />
        </picture>
      )}

      {/* Fallback si hay error */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
          <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  );
};

// Memoizar para prevenir re-renderizados innecesarios
export default React.memo(OptimizedImage);