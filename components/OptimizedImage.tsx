import React, { useState, useEffect, useRef } from 'react';

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
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer para lazy loading nativo
  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px 0px', // Cargar 50px antes de que entre en viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Generar URL con parámetros optimizados para WebP
  const optimizeUrl = (url: string) => {
    if (!url || url.startsWith('http')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width || 400}&quality=75&format=webp`;
  };

  const optimizedSrc = isInView ? optimizeUrl(src) : '';

  return (
    <div
      ref={imgRef}
      className={`optimized-image-container ${className}`}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: isLoaded ? 'transparent' : '#f0f0f0',
        ...style,
      }}
    >
      {/* Placeholder skeleton */}
      {!isLoaded && !priority && (
        <div
          className="absolute inset-0 animate-pulse bg-neutral-200 dark:bg-neutral-800"
          style={{
            backgroundImage: `url(${placeholder || ''})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: placeholder ? 0.3 : 1,
          }}
        />
      )}

      {/* Imagen real */}
      {isInView && (
        <img
          src={optimizedSrc || src}
          alt={alt}
          width={width}
          height={height}
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
