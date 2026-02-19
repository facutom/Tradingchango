import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense, memo, useRef } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, getProducts, getPriceHistory, getProfile, getConfig, getBenefits, getSavedCartData, saveCartData, getProductHistoryByEan, createSharedCart, getCurrentSession } from './services/supabase';
import { Product, PriceHistory, Profile, TabType, ProductStats, Benefit, CartItem } from './types';
import Header from './components/Header';
import ProductList from './components/ProductList';
import BottomNav from './components/BottomNav';
import SEOTags from './components/SEOTags';
import CategorySEO from './components/CategorySEO';
import ErrorBoundary from './components/ErrorBoundary';
import { getCategorySEO, categorySEOConfig } from './utils/categorySEO';
import { APP_VERSION, LOAD_TIMEOUT_MS, CACHE_MAX_AGE_MS, STORAGE_KEYS, ANONYMOUS_FAVORITES_LIMIT } from './utils/constants';
import { 
  initClarityGA4Integration, 
  trackSignUp, 
  trackSearch, 
  trackAddToWishlist, 
  setUserProperties,
  trackViewItem 
} from './utils/analytics';
import { calculateOutliers } from './utils/outlierDetection';
import { diagnoseProducts, printDiagnosis } from './utils/diagnoseProducts';

const AuthModal = lazy(() => import('./components/AuthModal'));
const CartSummary = lazy(() => import('./components/CartSummary'));
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
const AboutView = lazy(() => import('./components/InfoViews').then(module => ({ default: module.AboutView })));
const TermsView = lazy(() => import('./components/InfoViews').then(module => ({ default: module.TermsView })));
const ContactView = lazy(() => import('./components/InfoViews').then(module => ({ default: module.ContactView })));
const ComparePricesView = lazy(() => import('./components/InfoViews').then(module => ({ default: module.ComparePricesView })));
const HowToSaveView = lazy(() => import('./components/InfoViews').then(module => ({ default: module.HowToSaveView })));
const PriceHistoryView = lazy(() => import('./components/InfoViews').then(module => ({ default: module.PriceHistoryView })));
const WeeklyOffersView = lazy(() => import('./components/InfoViews').then(module => ({ default: module.WeeklyOffersView })));
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import MetaTags from './components/MetaTags';

// Utilidad para procesar productos una sola vez - evita cálculos duplicados
const processProducts = (
  products: Product[], 
  history: PriceHistory[],
  STORES: readonly { name: string; key: string; url: string }[]
) => {
  return products.map(p => {
    let outlierData: any = {};
    try {
      outlierData = typeof p.outliers === 'string' ? JSON.parse(p.outliers) : (p.outliers || {});
    } catch (e) { outlierData = {}; }

    // NUEVO: Contar productos que tienen tanto p_ (precio promo) como pr_ (precio regular)
    // Un producto válido debe tener ambos precios en al menos un supermercado
    let validPriceCount = 0;
    const priceData = STORES.map(s => {
      const storeKey = s.name.toLowerCase().replace(' ', '');
      const promoPrice = (p as any)[s.key] || 0; // p_coto, p_jumbo, etc.
      const regularPrice = (p as any)[`pr_${storeKey}`] || 0; // pr_coto, pr_jumbo, etc.
      const url = (p as any)[s.url];
      const stockKey = `stock_${storeKey}`;
      const hasStock = (p as any)[stockKey] !== false;
      const isOutlier = outlierData[storeKey] === true;
      const hasUrl = url && url !== '#' && url.length > 5;

      // Un precio es válido solo si tiene tanto promo como regular Y tiene url Y tiene stock Y no es outlier
      const isValid = promoPrice > 0 && regularPrice > 0 && hasUrl && !isOutlier && hasStock;
      
      if (isValid) {
        validPriceCount++;
      }

      return {
        promoPrice: isValid ? promoPrice : 0,
        regularPrice: isValid ? regularPrice : 0,
        isValid
      };
    });

    // Obtener el precio mínimo de los precios válidos
    const prices = priceData.filter(d => d.isValid).map(d => d.promoPrice);

    const productHistory = history.filter(h => {
      if (p.ean && Array.isArray(p.ean) && p.ean.length > 0) {
        return p.ean.includes(h.ean || '');
      }
      return h.nombre_producto === p.nombre;
    });
    let h7_price = 0;

    if (productHistory.length > 0) {
      productHistory.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      h7_price = productHistory[0].precio_minimo || 0;
    }
    
    if (h7_price === 0) {
      const currentPrices = prices.filter(x => x > 0);
      if (currentPrices.length > 0) {
        h7_price = Math.min(...currentPrices);
      }
    }
    
    // Calcular stats
    const v = prices.filter(x => x > 0);
    let min = 0, diff = 0, tc = 'text-neutral-500', icon = '-', isUp = false, isDown = false;
    
    if (v.length > 0) {
      min = Math.min(...v);
      if (h7_price > 0) {
        diff = ((min - h7_price) / h7_price) * 100;
        if (diff > 0.1) { 
          tc = 'text-red-600'; 
          icon = '▲'; 
          isUp = true; 
        } else if (diff < -0.1) { 
          tc = 'text-green-700'; 
          icon = '▼'; 
          isDown = true; 
        }
      }
    }
    
    return { 
      ...p, 
      stats: { 
        min, 
        spread: Math.abs(diff).toFixed(1),
        trendClass: tc, 
        icon, 
        isUp, 
        isDown,
        variation: diff 
      },
      prices,
      validPriceCount: v.length
    };
  });
};

// Componente unificado de Loading - consistente en toda la app
const LoadingSpinner = ({ message = 'Cargando...' }: { message?: string }) => (
  <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/60">
    <div className="w-12 h-12 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
    <span className="text-white mt-4 text-sm font-medium">{message}</span>
  </div>
);

// Pantalla de carga completa (fullscreen)
const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center dark:bg-primary dark:text-white font-mono text-[11px] uppercase tracking-[0.2em] bg-white">
    <div className="w-10 h-10 border-[3px] border-t-transparent border-neutral-800 dark:border-white rounded-full animate-spin mb-4"></div>
    <span>Conectando a Mercado...</span>
    <span className="text-[9px] mt-2 opacity-50">Si esto tarda demasiado, recargá la página</span>
  </div>
);

const ProductDetail = lazy(() => 
  import('./components/ProductDetail').then(module => ({ default: module.default }))
);
const SharedCartView = lazy(() => 
  import('./components/SharedCartView').then(module => ({ default: module.default }))
);
const MemoizedHeader = memo(Header); 
const MemoizedBottomNav = memo(BottomNav); 
const MemoizedFooter = memo(Footer);
const MemoizedProductList = memo(ProductList);

const STORES = [
  { name: "COTO", key: 'p_coto', url: 'url_coto' },
  { name: "CARREFOUR", key: 'p_carrefour', url: 'url_carrefour' },
  { name: "DIA ONLINE", key: 'p_dia', url: 'url_dia' },
  { name: "JUMBO", key: 'p_jumbo', url: 'url_jumbo' },
  { name: "MAS ONLINE", key: 'p_masonline', url: 'url_masonline' }
] as const;

const slugify = (text: string) => {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrssssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return text.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

const descriptions: { [key: string]: string } = {
  '/': 'Compará precios de supermercados en Argentina en tiempo real. Ahorrá en Carnes, Verduras, Bebidas y más con TradingChango.',
  '/carnes': 'Encontrá las mejores ofertas en Carnes. Compará precios entre distintos supermercados y ahorrá en tu compra semanal.',
  '/verdu': 'Precios actualizados de Frutas y Verduras. Ahorrá en productos frescos con TradingChango.',
  '/bebidas': 'Compará precios de Gaseosas, Aguas, Jugos y más Bebidas. Encontrá el mejor precio para tu compra.',
  '/lacteos': 'Ahorrá en Leches, Yogures, Quesos y otros Lácteos. Compará precios y elegí la mejor opción.',
  '/almacen': 'Los mejores precios en productos de Almacén. Compará y ahorrá en fideos, arroz, aceite y más.',
  '/limpieza': 'Encontrá ofertas en productos de Limpieza para el hogar. Compará precios y mantené tu casa impecable por menos.',
  '/perfumeria': 'Compará precios de productos de Perfumería y cuidado personal. Ahorrá en shampoo, jabón, desodorantes y más.',
  '/mascotas': 'Ahorrá en alimento y productos para tu Mascota. Compará precios y encontrá las mejores ofertas.'
};

const ProductDetailWrapper = ({ products, favorites, toggleFavorite, theme, onUpdateQuantity, user, setIsAuthOpen }: any) => {
  const { category, slug } = useParams(); 
  const navigate = useNavigate();
  const location = useLocation();
  
  // eslint-disable-next-line no-console
  // console.log('=== DIAGNOSTICO ===');
  // eslint-disable-next-line no-console
  // console.log('Category:', category);
  // eslint-disable-next-line no-console
  // console.log('Slug:', slug);
  // eslint-disable-next-line no-console
  // console.log('Products length:', products?.length);
  
  const product = products.find((p: any) => {
    const categoryMatch = slugify(p.categoria || 'general') === category;
    const nameSlug = slugify(p.nombre);
    const eanArray = p.ean && Array.isArray(p.ean) ? p.ean : [];
    const eanValue = eanArray[0] || null;
    
    const matchByName = nameSlug === slug;
    const matchByEan = eanValue && (nameSlug + '-' + eanValue) === slug;
    const matchById = (nameSlug + '-id' + p.id) === slug;
    
    // eslint-disable-next-line no-console
    // console.log(`Producto ID ${p.id}: ${p.nombre}`);
    // eslint-disable-next-line no-console
    // console.log(`  categoryMatch: ${categoryMatch} (${p.categoria} vs ${category})`);
    // eslint-disable-next-line no-console
    // console.log(`  matchByName: ${matchByName} (${nameSlug} vs ${slug})`);
    // eslint-disable-next-line no-console
    // console.log(`  matchByEan: ${matchByEan}`);
    // eslint-disable-next-line no-console
    // console.log(`  matchById: ${matchById}`);
    
    return categoryMatch && (matchByName || matchByEan || matchById);
  });

  // eslint-disable-next-line no-console
  // console.log('Producto encontrado:', product);
  
  if (products.length === 0) return null;
  
  // TEMPORAL: Comentado para diagnosticar error
  // if (!product) return <Navigate to="/" replace />;
  
  if (!product) {
    console.error('ERROR: Producto no encontrado');
    console.error('  category:', category);
    console.error('  slug:', slug);
    return (
      <div style={{padding: '20px', background: '#ffebee', color: '#c62828'}}>
        <h1>Producto no encontrado</h1>
        <p>Category: {category}</p>
        <p>Slug: {slug}</p>
        <p>Productos disponibles: {products.length}</p>
        <button onClick={() => navigate('/')}>Volver al inicio</button>
      </div>
    );
  }

  const handleClose = () => {
    if (location.state?.from === 'chango' || location.pathname === '/chango') {
      navigate('/chango', { replace: true });
    }
    else if (location.state?.from === 'home' || location.pathname === '/') {
      const queryString = location.search;
      navigate('/' + queryString, { replace: true });
    }
    else if (location.state?.from === 'ofertas' || location.pathname === '/ofertas-semana') {
      navigate('/ofertas-semana', { replace: true });
    }
    else {
      navigate(`/${slugify(product.categoria || 'general')}`, { replace: true });
    }
  };

  const isFromChango = location.state?.from === 'chango' || location.pathname === '/chango';
  const isFromHome = location.state?.from === 'home' || location.pathname === '/';
  
  const categoryProducts = useMemo(() => {
    if (isFromChango) {
      const favoriteIds = Object.keys(favorites).map(id => parseInt(id));
      return products.filter((p: any) => 
        favoriteIds.includes(p.id) && 
        p.visible_web !== false
      );
    } else if (isFromHome) {
      return products.filter((p: any) => p.visible_web !== false);
    } else {
      return products.filter((p: any) => 
        p.categoria === product.categoria && 
        p.visible_web !== false
      );
    }
  }, [products, product.categoria, isFromChango, isFromHome, favorites]);
  
  const currentIndex = useMemo(() => {
    return categoryProducts.findIndex((p: any) => p.id === product.id);
  }, [categoryProducts, product.id]);
  
  const handlePreviousProduct = useCallback(() => {
    if (categoryProducts.length === 0) return;
    
    let newIndex: number;
    if (currentIndex <= 0) {
      newIndex = categoryProducts.length - 1;
    } else {
      newIndex = currentIndex - 1;
    }
    
    const prevProduct = categoryProducts[newIndex];
    const from = location.state?.from || 'category';
    const prevEan = prevProduct.ean && Array.isArray(prevProduct.ean) && prevProduct.ean[0] ? prevProduct.ean[0] : null;
    const prevUnique = prevEan ? `-${prevEan}` : `-id${prevProduct.id}`;
    navigate(`/${slugify(prevProduct.categoria || 'general')}/${slugify(prevProduct.nombre) + prevUnique}`, { state: { from } });
  }, [categoryProducts, currentIndex, navigate, location.state]);
  
  const handleNextProduct = useCallback(() => {
    if (categoryProducts.length === 0) return;
    
    let newIndex: number;
    if (currentIndex >= categoryProducts.length - 1) {
      newIndex = 0;
    } else {
      newIndex = currentIndex + 1;
    }
    
    const nextProduct = categoryProducts[newIndex];
    const from = location.state?.from || 'category';
    const nextEan = nextProduct.ean && Array.isArray(nextProduct.ean) && nextProduct.ean[0] ? nextProduct.ean[0] : null;
    const nextUnique = nextEan ? `-${nextEan}` : `-id${nextProduct.id}`;
    navigate(`/${slugify(nextProduct.categoria || 'general')}/${slugify(nextProduct.nombre) + nextUnique}`, { state: { from } });
  }, [categoryProducts, currentIndex, navigate, location.state]);

  const handleProductSelect = (id: number) => {
    const selectedProduct = products.find((p: any) => p.id === id);
    if (selectedProduct) {
      const from = location.state?.from || 'category';
      const selectedEan = selectedProduct.ean && Array.isArray(selectedProduct.ean) && selectedProduct.ean[0] ? selectedProduct.ean[0] : null;
      const selectedUnique = selectedEan ? `-${selectedEan}` : `-id${selectedProduct.id}`;
      navigate(`/${slugify(selectedProduct.categoria || 'general')}/${slugify(selectedProduct.nombre) + selectedUnique}`, { state: { from } });
    }
  };

  const hasPrevious = categoryProducts.length > 1;
  const hasNext = categoryProducts.length > 1;

  // Función wrapper para verificar límite de favoritos anónimos
  const handleFavoriteWithAuth = (id: number, itemName?: string) => {
    toggleFavorite(id, itemName, product?.categoria);
  };

  return (
    <ProductDetail 
        productId={product.id}
        onClose={handleClose}
        isFavorite={!!favorites[product.id]}
        onFavoriteToggle={handleFavoriteWithAuth}
        products={products}
        theme={theme}
        quantities={favorites}
        onUpdateQuantity={onUpdateQuantity}
        onPreviousProduct={hasPrevious ? handlePreviousProduct : undefined}
        onNextProduct={hasNext ? handleNextProduct : undefined}
        onProductSelect={handleProductSelect}
      />
  );
};

const normalizeText = (text: string) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

import useDebounce from './hooks/useDebounce';

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [trendFilter, setTrendFilter] = useState<'up' | 'down' | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);

  // Inicializar Microsoft Clarity solo en el cliente
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Evitar inicializar múltiples veces
    // @ts-ignore
    if (window.clarityInitialized) {
      initClarityGA4Integration();
      return;
    }
    
    // @ts-ignore
    (function(c,l,a,r,i,t,y){
      // @ts-ignore
      c[i]=c[i]||function(){(c[i].q=c[i].q||[]).push(arguments)};
      // @ts-ignore
      c[i].l=1*new Date();
      // @ts-ignore
      t=l.createElement(a);y=l.getElementsByTagName(a)[0];
      // @ts-ignore
      t.async=1;t.src=r;y.parentNode.insertBefore(t,y);
      // @ts-ignore
    })(window,document,'script','https://www.clarity.ms/tag/vjkjcslj8f','clarity');
    
    // @ts-ignore
    window.clarityInitialized = true;
    
    // Integrar Clarity con GA4
    initClarityGA4Integration();
    
    // console.log('[Clarity] Inicializado correctamente');
  }, []);
  const [favorites, setFavorites] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem('tc_favs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // Ref para mantener referencia actualizada de favorites
  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;

  const [savedCarts, setSavedCarts] = useState<any[]>((() => {
    try {
      const saved = localStorage.getItem('tc_saved_lists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }));

  const [purchasedItems, setPurchasedItems] = useState<Set<number>>(new Set());
  const [showPwaPill, setShowPwaPill] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (() => {
      try {
        return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
      } catch {
        return 'light';
      }
    })()
  );

  const scrollPositionRef = useRef(0);
  const isInitialMount = useRef(true);
  const navigate = useNavigate();
  const location = useLocation();
  const lastListPageRef = useRef(location.pathname);
  const searchTermRef = useRef('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q && q !== searchTermRef.current) {
      setSearchTerm(q);
      searchTermRef.current = q;
    }
  }, [location.search]);

  useEffect(() => {
    if (searchTerm === searchTermRef.current) return; 
    
    const currentParams = new URLSearchParams(location.search);
    const currentQ = currentParams.get('q') || '';
    
    if (searchTerm && searchTerm.trim() !== currentQ) {
      // Track search event
      trackSearch(searchTerm.trim());
      
      const newUrl = searchTerm.trim() 
        ? `${location.pathname}?q=${encodeURIComponent(searchTerm.trim())}` 
        : location.pathname;
      window.history.replaceState({}, '', newUrl);
      searchTermRef.current = searchTerm;
    } else if (!searchTerm && currentQ) {
      window.history.replaceState({}, '', location.pathname);
      searchTermRef.current = '';
    }
  }, [searchTerm, location.pathname]);

  const navigateTo = (path: string) => navigate(path === 'home' ? '/' : '/' + path.replace('/', ''));

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                           || (navigator as any).standalone === true;
      if (!isStandalone) {
        setTimeout(() => {
          setShowPwaPill(true);
        }, 1000);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const script = document.createElement('script');
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.charset = "utf-8";
      script.defer = true;
      document.body.appendChild(script);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPwaPill(false);
    }
  };

  const favoriteItems = useMemo(() => {
    // Obtener todos los productos procesados
    const allProcessed = processProducts(products, history, STORES);
    return Object.keys(favorites)
      .map(id => {
        const product = allProcessed.find(p => p.id === Number(id));
        if (!product) return null;
        return { 
          ...product, 
          quantity: favorites[Number(id)],
          isAvailable: product.visible_web !== false && product.validPriceCount >= 2
        } as CartItem & { isAvailable: boolean };
      })
      .filter((p): p is CartItem & { isAvailable: boolean } => p !== null);
  }, [favorites, products, history]);

  const [error, setError] = useState<string | null>(null);

  // Constantes de configuración de carga
  // Versión actual - se compara con localStorage al iniciar
  const currentVersion = APP_VERSION;
  
  // Efecto de verificación de versión al montar la app
  useEffect(() => {
    const storedVersion = localStorage.getItem(STORAGE_KEYS.APP_VERSION);
    const reloadDone = sessionStorage.getItem(STORAGE_KEYS.VERSION_RELOAD_DONE);
    
    // Si hay una versión previa y es diferente, limpiar todo
    if (storedVersion && storedVersion !== currentVersion && !reloadDone) {
      console.log('[VersionCheck] Versión cambió de', storedVersion, 'a', currentVersion);
      // Limpiar todo
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('[VersionCheck] Error limpiando storage:', e);
      }
      // Guardar nueva versión
      localStorage.setItem(STORAGE_KEYS.APP_VERSION, currentVersion);
      sessionStorage.setItem(STORAGE_KEYS.VERSION_RELOAD_DONE, 'true');
      // Recargar (forzar bypass cache)
      window.location.href = window.location.href + '?v=' + Date.now();
      return;
    }
    
    // Actualizar versión
    localStorage.setItem(STORAGE_KEYS.APP_VERSION, currentVersion);
  }, [currentVersion]);
  
  const loadDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadDataRetryRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingDataRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // Cleanup de timeouts al desmontar el componente
  useEffect(() => {
    return () => {
      if (loadDataTimeoutRef.current) {
        clearTimeout(loadDataTimeoutRef.current);
      }
      if (loadDataRetryRef.current) {
        clearTimeout(loadDataRetryRef.current);
      }
    };
  }, []);

  // Manejo específico para móvil: cuando la app vuelve del background,
  // intentamos reconectar para obtener datos frescos
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoadingDataRef.current) {
        // La app volvió a estar visible - intentar reconectar si hay datos antiguos
        try {
          const cachedProds = localStorage.getItem('tc_cache_products');
          const cacheTime = localStorage.getItem('tc_cache_time');
          const now = Date.now();
          
          // Si hay cache pero es antiguo (más de 5 min), intentar reconectar
          if (cachedProds && cacheTime && (now - parseInt(cacheTime) > CACHE_MAX_AGE_MS)) {
          // console.log('Cache antiguo, intentando reconectar...');
            // No forzamos carga completa, solo solicitamos datos nuevos
            // El usuario puede ver los datos cacheados inmediatamente
            loadData(user, 1).catch(console.error);
          }
        } catch (e) {
          console.warn('Error al leer cache:', e);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const loadData = useCallback(async (sessionUser: User | null, attempt = 1) => {
    // Si ya está cargando, no iniciar otra vez
    if (isLoadingDataRef.current) {
    // console.log('loadData ya está en progreso, ignorando llamada');
      return;
    }
    
    // Limpiar cualquier timeout pendiente de intentos anteriores
    if (loadDataRetryRef.current) {
      clearTimeout(loadDataRetryRef.current);
      loadDataRetryRef.current = null;
    }
    
    isLoadingDataRef.current = true;
    setLoading(true);
    setError(null);
    
    // Timeout de seguridad - si pasan más de 20 segundos sin respuesta, forzamos fin de carga
    loadDataTimeoutRef.current = setTimeout(() => {
      // console.warn('Timeout de carga - forzando estado');
      isLoadingDataRef.current = false;
      // Si no hay productos en cache, mostrar error
      const cachedProds = localStorage.getItem('tc_cache_products');
      if (!cachedProds && products.length === 0) {
        setError('La conexión tardó demasiado. Verificá tu conexión a internet.');
      }
      setLoading(false);
    }, LOAD_TIMEOUT_MS);
    try {
      // Primero intentar cargar del cache inmediatamente para mostrar algo rápido
      try {
        const cachedProds = localStorage.getItem('tc_cache_products');
        const cachedHistory = localStorage.getItem('tc_cache_history');
        const cachedConfig = localStorage.getItem('tc_cache_config');
        const cacheTime = localStorage.getItem('tc_cache_time');
        
        // Calcular si el cache es antiguo (más de 5 minutos)
        const isCacheStale = cacheTime ? (Date.now() - parseInt(cacheTime)) > CACHE_MAX_AGE_MS : true;
        
        if (cachedProds) {
          setProducts(JSON.parse(cachedProds));
        }
        if (cachedHistory) {
          setHistory(JSON.parse(cachedHistory));
        }
        if (cachedConfig) {
          setConfig(JSON.parse(cachedConfig));
        }
      } catch (cacheError) {
        console.warn('Error al leer cache:', cacheError);
      }

      const fetchDataWithTimeout = (promise: Promise<any>, timeout: number) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error('La solicitud tardó demasiado. Verificá tu conexión.'));
          }, timeout);
          promise.then(
            res => { clearTimeout(timer); resolve(res); },
            err => {
              clearTimeout(timer);
              // Ignorar AbortError ya que puede ocurrir por timeout interno de Supabase o navegación
              if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                resolve(null);
              } else {
                reject(err);
              }
            }
          );
        });
      };

      const [prodData, configData] = await (fetchDataWithTimeout(
        Promise.all([getProducts(), getConfig()]), 
        10000
      ) as Promise<[Product[], Record<string, string>]>);

      // Si los datos son null (por AbortError), usar arrays vacíos
      const products = prodData || [];
      const config = configData || {};

      const productsWithOutliers = await calculateOutliers(products);
      setProducts(productsWithOutliers || []);
      
      // EXPONER PRODUCTOS PARA DIAGNÓSTICO
      const prods = productsWithOutliers || [];
      (window as any).__PRODUCTS__ = prods;
      (window as any).__DIAGNOSE__ = () => printDiagnosis(prods, []);
      setConfig(config);
      
      localStorage.setItem('tc_cache_products', JSON.stringify(productsWithOutliers || []));
      localStorage.setItem('tc_cache_config', JSON.stringify(config));
      localStorage.setItem('tc_cache_time', Date.now().toString());

      getPriceHistory(7).then(hist => {
        const histData = hist || [];
        setHistory(histData);
        localStorage.setItem('tc_cache_history', JSON.stringify(histData));
      });
      getBenefits(new Date().getDay()).then(setBenefits);
      
      // Limpiar timeout y marcar como cargado
      if (loadDataTimeoutRef.current) {
        clearTimeout(loadDataTimeoutRef.current);
        loadDataTimeoutRef.current = null;
      }
      isLoadingDataRef.current = false;
      setLoading(false);

    } catch (err: any) {
      // Limpiar timeout en caso de error
      if (loadDataTimeoutRef.current) {
        clearTimeout(loadDataTimeoutRef.current);
        loadDataTimeoutRef.current = null;
      }
      
      console.error('Error en loadData:', err);
      
      if (attempt < 2) { 
      // console.log(`Reintentando carga (intento ${attempt + 1})...`);
        loadDataRetryRef.current = setTimeout(() => {
          loadData(sessionUser, attempt + 1);
        }, 3000);
      } else {
        isLoadingDataRef.current = false;
        setLoading(false);
        // Si falló todo, usar cache si existe, o mostrar mensaje
        const cachedProds = localStorage.getItem('tc_cache_products');
        if (cachedProds) {
          // Ya tenemos los products del cache cargados arriba, solo logger
          // console.warn('Usando datos cacheados tras error');
        } else {
          setError("No se pudo conectar con el mercado. Por favor, revisá tu conexión a internet y volvé a intentarlo.");
          setProducts([]);
        }
      }
    }
  }, []);

  useEffect(() => {
    const auth = supabase.auth as any;
    const fetchProfileAndData = async (sessionUser: User | null) => {
      if (sessionUser) {
        // Configurar propiedades de usuario en analytics
        setUserProperties(sessionUser.id, true);
        
        let prof = await getProfile(sessionUser.id);
        if (prof && prof.subscription === 'pro' && prof.subscription_end) {
          const expiryDate = new Date(prof.subscription_end);
          if (expiryDate < new Date()) {
            await supabase.from('perfiles').update({ subscription: 'free' }).eq('id', sessionUser.id);
            prof = { ...prof, subscription: 'free' };
          }
        }
        setProfile(prof);
        
        // Leer favoritos locales antes de cargar los de la base de datos
        let localFavorites = {};
        try {
          const savedFavs = localStorage.getItem('tc_favs');
          localFavorites = savedFavs ? JSON.parse(savedFavs) : {};
        } catch (e) {
          console.warn('Error al leer favoritos locales:', e);
        }
        
        const cartData = await getSavedCartData(sessionUser.id);
        let dbFavorites = cartData?.active || {};
        
        // Fusionar favoritos locales con los de la base de datos
        const mergedFavorites = { ...dbFavorites, ...localFavorites };
        const hasLocalFavorites = Object.keys(localFavorites).length > 0;
        
        // Si hay favoritos locales que no estaban en la DB, guardarlos
        if (hasLocalFavorites) {
          await saveCartData(sessionUser.id, { active: mergedFavorites, saved: cartData?.saved || [] });
          // Limpiar favoritos locales después de migrar
          localStorage.removeItem('tc_favs');
          // console.log('[Favorites] Migrados favoritos locales a la base de datos');
        }
        
        setFavorites(mergedFavorites);
        setSavedCarts(cartData?.saved || []);
      } else {
        setProfile(null);
        try {
          const savedFavs = localStorage.getItem('tc_favs');
          const savedLists = localStorage.getItem('tc_saved_lists');
          setFavorites(savedFavs ? JSON.parse(savedFavs) : {});
          setSavedCarts(savedLists ? JSON.parse(savedLists) : []);
        } catch (e) {
          console.warn('Error al leer datos locales:', e);
          setFavorites({});
          setSavedCarts([]);
        }
      }
      loadData(sessionUser);
    };

    const initializeSession = async () => {
      const { data: { session } } = await auth.getSession();
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      fetchProfileAndData(sessionUser);
    };
    initializeSession();

    const { data: { subscription } } = auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') fetchProfileAndData(sessionUser);
      if (event === 'PASSWORD_RECOVERY') {
        setIsAuthOpen(true);
        localStorage.setItem('active_auth_view', 'update_password');
      }
      if (event === 'SIGNED_OUT') {
        setProfile(null); setFavorites({}); setSavedCarts([]); setPurchasedItems(new Set());
        localStorage.removeItem('tc_favs'); localStorage.removeItem('tc_saved_lists');
      }
    });
    return () => { subscription?.unsubscribe(); };
  }, [loadData]);

  useEffect(() => {
    try {
      localStorage.setItem('tc_favs', JSON.stringify(favorites || {}));
      localStorage.setItem('tc_saved_lists', JSON.stringify(savedCarts || []));
    } catch (e) {
      console.warn('Error guardando en localStorage:', e);
    }
    const sincronizarConNube = async () => {
      if (user && profile && !loading) {
        try {
          const dataToSave = { active: favorites || {}, saved: savedCarts || [] };
          await saveCartData(user.id, dataToSave);
        } catch (e) { console.error("Error sincronizando:", e); }
      }
    };
    const handleVisibilityChange = () => { if (document.visibilityState === 'hidden') sincronizarConNube(); };
    const timer = setTimeout(sincronizarConNube, 800);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", handleVisibilityChange); };
  }, [favorites, savedCarts, user, loading]);

  useEffect(() => {
    if (products && products.length > 0) {
      const firstProduct = products[0];
      if (firstProduct && firstProduct.imagen_url) {
        const firstProductImage = firstProduct.imagen_url;
        if (firstProductImage) {
          const existingLink = document.querySelector(`link[rel="preload"][href^="${firstProductImage}"]`);
          if (!existingLink) {
            const link = document.createElement('link');
            link.rel = 'preload'; link.as = 'image';
            link.href = `${firstProductImage}?width=120&quality=75&format=webp`;
            document.head.appendChild(link);
          }
        }
      }
    }
  }, [products]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const getStats = (p: number[], h: number): ProductStats => {
    const v = p.filter(x => x > 0);
    if (v.length === 0) return { min: 0, spread: '0.0', trendClass: '', icon: '-', isUp: false, isDown: false, variation: 0 };
    const min = Math.min(...v);
    let diff = 0, tc = 'text-neutral-500', icon = '-', isUp = false, isDown = false;
    if (h > 0) {
      diff = ((min - h) / h) * 100;
      if (diff > 0.1) { tc = 'text-red-600'; icon = '▲'; isUp = true; }
      else if (diff < -0.1) { tc = 'text-green-700'; icon = '▼'; isDown = true; }
    }
    return { min, spread: Math.abs(diff).toFixed(1), trendClass: tc, icon, isUp, isDown, variation: diff };
  };

  const isPro = useMemo(() => {
    if (!profile || profile.subscription !== 'pro') return false;
    return profile.subscription_end ? new Date(profile.subscription_end) > new Date() : false;
  }, [profile]);

  const baseFilteredProducts = useMemo(() => {
    const currentPath = location.pathname;
    let result = processProducts(products, history, STORES);

    if (currentPath === '/carnes') result = result.filter(p => normalizeText(p.categoria || '').includes('carne') && p.validPriceCount >= 2);
    else if (currentPath === '/verdu') result = result.filter(p => (normalizeText(p.categoria || '').includes('verdu') || normalizeText(p.categoria || '').includes('fruta')) && p.validPriceCount >= 2);
    else if (currentPath === '/bebidas') result = result.filter(p => normalizeText(p.categoria || '').includes('bebida') && p.validPriceCount >= 2);
    else if (currentPath === '/lacteos') result = result.filter(p => normalizeText(p.categoria || '').includes('lacteo') && p.validPriceCount >= 2);
    else if (currentPath === '/almacen') result = result.filter(p => normalizeText(p.categoria || '').includes('almacen') && p.validPriceCount >= 2);
    else if (currentPath === '/limpieza') result = result.filter(p => normalizeText(p.categoria || '').includes('limpieza') && p.validPriceCount >= 2);
    else if (currentPath === '/perfumeria') result = result.filter(p => normalizeText(p.categoria || '').includes('perfumeria') && p.validPriceCount >= 2);
    else if (currentPath === '/mascotas') result = result.filter(p => normalizeText(p.categoria || '').includes('mascota') && p.validPriceCount >= 2);
    else if (currentPath === '/' || currentPath === '/chango') result = result.filter(p => p.validPriceCount >= 2);

    if (debouncedSearchTerm) {
      const t = debouncedSearchTerm.toLowerCase().trim();
      if (t.length > 0) {
        result = result.filter(p => {
          const validPrices = p.prices.filter((price: number) => price > 0).length;
          if (validPrices < 2) return false;
          const nameMatch = p.nombre.toLowerCase().includes(t);
          const tickerMatch = p.ticker && p.ticker.toLowerCase().includes(t);
          let eanMatch = false;
          const eanValue = p.ean as any;
          if (eanValue) {
            if (Array.isArray(eanValue)) eanMatch = eanValue.some((e: string) => e && e.toString().toLowerCase().includes(t));
            else eanMatch = eanValue.toString().toLowerCase().includes(t);
          }
          return nameMatch || tickerMatch || eanMatch;
        });
      }
    }

    if (trendFilter && currentPath !== '/chango') {
      result = result.filter(p => p.prices.filter((price: number) => price > 0).length >= 2);
      result = result.filter(p => trendFilter === 'up' ? p.stats.isUp : p.stats.isDown);
      result.sort((a, b) => trendFilter === 'down' ? a.stats.variation - b.stats.variation : b.stats.variation - a.stats.variation);
    }
    return result;
  }, [products, history, location.pathname, debouncedSearchTerm, trendFilter]);

  const categoryProducts = useMemo(() => {
    if (location.pathname === '/chango') return [];
    const currentPath = location.pathname;
    let result = [...baseFilteredProducts];
    if (currentPath === '/carnes') result = result.filter(p => normalizeText(p.categoria || '').includes('carne'));
    else if (currentPath === '/verdu') result = result.filter(p => normalizeText(p.categoria || '').includes('verdu') || normalizeText(p.categoria || '').includes('fruta'));
    else if (currentPath === '/bebidas') result = result.filter(p => normalizeText(p.categoria || '').includes('bebida'));
    else if (currentPath === '/lacteos') result = result.filter(p => normalizeText(p.categoria || '').includes('lacteo'));
    else if (currentPath === '/almacen') result = result.filter(p => normalizeText(p.categoria || '').includes('almacen'));
    else if (currentPath === '/limpieza') result = result.filter(p => normalizeText(p.categoria || '').includes('limpieza'));
    else if (currentPath === '/perfumeria') result = result.filter(p => normalizeText(p.categoria || '').includes('perfumeria'));
    else if (currentPath === '/mascotas') result = result.filter(p => normalizeText(p.categoria || '').includes('mascota'));
    return result;
  }, [baseFilteredProducts, location.pathname]);

  const processedProductsCache = useMemo(() => {
    return processProducts(products, history, STORES);
  }, [products, history]);

  const cartItems = useMemo(() => {
    // Obtener todos los productos procesadps (incluyendo los no disponibles)
    const allProcessed = processProducts(products, history, STORES);
    // Filtrar solo los que están en favoritos
    const favoritesInProducts = allProcessed.filter(p => favorites[p.id]);
    // Agregar bandera isAvailable para cada producto
    return favoritesInProducts.map(p => ({
      ...p,
      quantity: favorites[p.id] || 1,
      isAvailable: p.visible_web !== false && p.validPriceCount >= 2
    } as CartItem & { isAvailable: boolean }));
  }, [processedProductsCache, favorites]);

  const filteredProducts = useMemo(() => {
    if (location.pathname === '/chango') return cartItems;
    return baseFilteredProducts;
  }, [baseFilteredProducts, location.pathname, cartItems]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, displayLimit), [filteredProducts, displayLimit]);

  const toggleFavorite = useCallback(async (id: number, itemName?: string, category?: string) => {
    // Verificar sesión directamente desde Supabase para mayor precisión
    const session = await getCurrentSession();
    const isLoggedIn = !!session;
    
    const currentFavorites = favoritesRef.current;
    const wasAdded = !currentFavorites[id];
    const currentFavoritesCount = Object.keys(currentFavorites).length;
    
    // Si no está logueado y está agregando, verificar límite
    if (!isLoggedIn && wasAdded && currentFavoritesCount >= ANONYMOUS_FAVORITES_LIMIT) {
      // console.log('[toggleFavorite] Abriendo modal por límite - count:', currentFavoritesCount);
      setIsAuthOpen(true);
      return;
    }
    
    setFavorites(prev => {
      const next = { ...prev };
      if (!next[id]) {
        next[id] = 1;
        // Tracking solo cuando se agrega (no cuando se elimina)
        if (itemName) {
          trackAddToWishlist(id, itemName, category);
        }
      } else {
        delete next[id];
        setPurchasedItems(prevPurchased => {
          const newPurchased = new Set(prevPurchased);
          newPurchased.delete(id);
          return newPurchased;
        });
      }
      return next;
    });
  }, []);

  const handleFavoriteChangeInCart = useCallback((id: number, delta: number) => {
    setFavorites(prev => {
      const newQty = (prev[id] || 1) + delta;
      if (newQty <= 0) { const next = { ...prev }; delete next[id]; return next; }
      return { ...prev, [id]: newQty };
    });
  }, []);

  // Función wrapper para verificar límite de favoritos anónimos
  const handleToggleFavoriteWithAuth = useCallback((id: number) => {
    toggleFavorite(id);
  }, []);

  const togglePurchased = useCallback((id: number) => {
    setPurchasedItems(prev => {
      const newPurchased = new Set(prev);
      if (newPurchased.has(id)) newPurchased.delete(id);
      else newPurchased.add(id);
      return newPurchased;
    });
  }, []);

  const handleSaveCurrentCart = (name: string) => {
    const limit = isPro ? 10 : 2;
    if (savedCarts.length >= limit) { alert(`Límite de listas alcanzado (${limit}).`); return; }
    setSavedCarts(prev => [...prev, { name, items: { ...favorites }, date: new Date().toISOString() }]);
  };
  
  const handleShareCurrentCart = async () => {
    // Verificar sesión directamente desde Supabase
    const session = await getCurrentSession();
    if (!session || !profile) {
      setIsAuthOpen(true);
      return;
    }
    
    if (Object.keys(favorites).length === 0) {
      alert('Tu chango está vacío');
      return;
    }
    
    try {
      // Calcular ahorro total
      let totalSavings = 0;
      const allProducts = processProducts(products, history, STORES);
      
      for (const [productId, qty] of Object.entries(favorites)) {
        const product = allProducts.find(p => p.id === parseInt(productId));
        if (product && product.stats) {
          // Calcular el ahorro: diferencia entre el precio más alto y el más bajo
          const prices = [product.p_jumbo, product.p_carrefour, product.p_coto, product.p_dia, product.p_disco, product.p_vea, product.p_laanonima].filter(p => p > 0);
          if (prices.length > 1) {
            const maxPrice = Math.max(...prices);
            const minPrice = Math.min(...prices);
            totalSavings += (maxPrice - minPrice) * qty;
          }
        }
      }
      
      const shareId = await createSharedCart(
        (session?.user?.id || user?.id) as string,
        profile.nombre || 'Usuario',
        { active: favorites, saved: savedCarts },
        totalSavings
      );
      
      const shareUrl = `${window.location.origin}/chango/${shareId}`;
      
      // Copiar al portapapeles
      await navigator.clipboard.writeText(shareUrl);
      
      // También abrir WhatsApp
      const message = encodeURIComponent(`¡Mirá cuánto ahorré en mi Chango de TradingChango! 🛒💰`);
      window.open(`https://wa.me/?text=${message}%20${encodeURIComponent(shareUrl)}`, '_blank');
      
      alert('¡Link copiado y WhatsApp abierto! Compartilo con tus amigos');
    } catch (error) {
      console.error('Error sharing cart:', error);
      alert('Error al compartir el chango. Intentalo de nuevo.');
    }
  };

  const handleDeleteSavedCart = (index: number) => {
    setSavedCarts(prev => { const next = [...prev]; next.splice(index, 1); return next; });
  };

  const handleLoadSavedCart = (index: number) => {
    setFavorites(savedCarts[index].items);
    setPurchasedItems(new Set());
    navigate('/chango');
  };

  const handleProductClick = useCallback((product: Product) => {
    scrollPositionRef.current = window.scrollY;
    const categorySlug = slugify(product.categoria || 'general');
    const eanArray = product.ean && Array.isArray(product.ean) ? product.ean : [];
    const eanValue = eanArray.length > 0 && eanArray[0] ? eanArray[0] : null;
    const uniquePart = eanValue ? `-${eanValue}` : `-id${product.id}`;
    const productSlug = slugify(product.nombre) + uniquePart;
    const from = window.location.pathname === '/' ? 'home' : window.location.pathname === '/chango' ? 'chango' : 'category';
    navigate(`/${categorySlug}/${productSlug}`, { state: { from } });
  }, [navigate]);

  useEffect(() => {
    const listPaths = ['/', '/chango', '/carnes', '/verdu', '/bebidas', '/almacen', '/lacteos', '/limpieza', '/perfumeria', '/mascotas'];
    const currentPath = location.pathname;
    if (listPaths.includes(currentPath)) {
      if (currentPath !== lastListPageRef.current) {
        window.scrollTo(0, 0);
        setTrendFilter(null);
        setDisplayLimit(20);
      } else if (scrollPositionRef.current > 0) {
        setTimeout(() => { window.scrollTo(0, scrollPositionRef.current); scrollPositionRef.current = 0; }, 10);
      }
      lastListPageRef.current = currentPath;
    }
  }, [location.pathname]);

  const handleSignOut = async () => {
    setLoading(true);
    const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
    keysToRemove.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('tc_favs');
    localStorage.removeItem('tc_saved_lists');
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setFavorites({}); setSavedCarts([]); setPurchasedItems(new Set());
    setIsAuthOpen(false); setLoading(false);
    navigate('/', { replace: true });
  };

  const visibleCartCount = useMemo(() => {
    return products.filter(p => favorites[p.id] && (p as any).visible_web !== false).length;
  }, [favorites, products]);

  const isFavorite = useCallback((id: number) => !!favorites[id], [favorites]);

  const listPageElement = (description: string, category?: string) => (
   <>
    <MetaTags description={description} />
     {category && <CategorySEO data={getCategorySEO(category)} categoryName={category} products={categoryProducts as any} />}
    <MemoizedProductList
      products={visibleProducts as any}
      onProductClick={handleProductClick}
      onFavoriteToggle={handleToggleFavoriteWithAuth}
      favorites={favorites}
      isCartView={false}
      quantities={favorites}
      onUpdateQuantity={handleFavoriteChangeInCart}
      searchTerm={searchTerm}
      purchasedItems={purchasedItems}
      onTogglePurchased={togglePurchased}
    />
  </> 
  );
 
  // Pantalla de carga mejorada - muestra spinner si está cargando Y no hay datos disponibles
  // Nunca debe quedar en blanco: si hay error O productos en cache, los mostraremos
  const showLoadingScreen = loading && products.length === 0 && !error;
  const hasDataToShow = products.length > 0 || error !== null;
  
  // SIEMPRE mostrar algo: si está cargando sin datos Y sin error, mostrar spinner
  // Si tiene productos O error, nunca mostrar el spinner de carga completo
  if (showLoadingScreen && !hasDataToShow) {
    return <LoadingScreen />;
  }
 
  return (
    <ErrorBoundary>
    <div className="max-w-screen-md mx-auto min-h-screen bg-white dark:bg-primary shadow-2xl transition-colors font-sans pb-16">

    {error && products.length === 0 && (
      <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-white dark:bg-primary p-4 text-center">
        <div className="w-16 h-16 mb-4 text-red-500">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-black dark:text-white mb-2">Error de Conexión</h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-sm">{error}</p>
        <button 
          onClick={() => loadData(user)}
          className="bg-black dark:bg-white text-white dark:text-black font-bold py-3 px-6 rounded-full text-sm uppercase tracking-wider hover:opacity-80 transition-opacity"
        >
          Reintentar
        </button>
      </div>
    )}
    
    {showPwaPill && (
      <div className="fixed bottom-[75px] left-1/2 -translate-x-1/2 z-[9999] w-[85%] max-w-[320px] md:hidden animate-in slide-in-from-bottom-5 duration-500">
        <div className="bg-neutral-900 dark:bg-white text-white dark:text-black p-3.5 rounded-2xl shadow-[0_15px_45px_rgba(0,0,0,0.4)] flex items-center justify-between relative border border-neutral-800 dark:border-neutral-100">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowPwaPill(false); }}
            className="absolute -top-1.5 -right-1.5 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-900 active:scale-90 transition-transform"
            aria-label="Cerrar aviso de instalación"
          >
            <i className="fa-solid fa-xmark text-[10px]"></i>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/30">
              <i className="fa-solid fa-cart-arrow-down text-base"></i>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-tight leading-none mb-0.5">TradingChango</span>
              <span className="text-[8px] font-bold opacity-70 uppercase tracking-widest leading-none">Compará antes de comprar</span>
            </div>
          </div>
          <button 
            onClick={handleInstallClick}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-green-500/20"
            aria-label="Instalar la aplicación"
          >
            Instalar
          </button>
        </div>
      </div>
    )}

      <MemoizedHeader 
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
        toggleTheme={toggleTheme} theme={theme}
        onUserClick={() => setIsAuthOpen(true)} user={user}
        profile={profile}
        trendFilter={trendFilter} setTrendFilter={setTrendFilter}
        onEANFound={(ean: string) => {
          const found = products.find(p => {
            const eanValue = p.ean as any;
            if (!eanValue) return false;
            const eanStr = ean.toString().trim();
            if (Array.isArray(eanValue)) return eanValue.some((e: string) => e && e.toString().trim() === eanStr);
            return eanValue.toString().trim() === eanStr;
          });
          if (found) {
            const foundEan = found.ean && Array.isArray(found.ean) && found.ean[0] ? found.ean[0] : null;
            const foundUnique = foundEan ? `-${foundEan}` : `-id${found.id}`;
            navigate(`/${slugify(found.categoria || 'general')}/${slugify(found.nombre) + foundUnique}`);
          } else { alert(`Producto con EAN ${ean} no encontrado`); }
        }}
      />
    <main>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={
            <>
              <SEOTags title="TradingChango | Compará Precios de Supermercados en Argentina" description={descriptions['/']} keywords="precios supermercado Argentina, comparar precios, ofertas Coto Carrefour Jumbo, ahorrar compra" />
              {listPageElement(descriptions['/'])}
            </>
          } />
          <Route path="/carnes" element={listPageElement(descriptions['/carnes'], 'carnes')} />
          <Route path="/verdu" element={listPageElement(descriptions['/verdu'], 'verdulería')} />
          <Route path="/bebidas" element={listPageElement(descriptions['/bebidas'], 'bebidas')} />
          <Route path="/lacteos" element={listPageElement(descriptions['/lacteos'], 'lácteos')} />
          <Route path="/almacen" element={listPageElement(descriptions['/almacen'], 'almacén')} />
          <Route path="/limpieza" element={listPageElement(descriptions['/limpieza'], 'limpieza')} />
          <Route path="/perfumeria" element={listPageElement(descriptions['/perfumeria'], 'perfumería')} />
          <Route path="/mascotas" element={listPageElement(descriptions['/mascotas'], 'mascotas')} />
          <Route path="/chango" element={
            <>
              {cartItems.length > 0 && (
                  <CartSummary items={favoriteItems} benefits={benefits} userMemberships={profile?.membresias} onSaveCart={handleSaveCurrentCart} onShareCart={handleShareCurrentCart} canSave={!!user} savedCarts={savedCarts} onLoadCart={handleLoadSavedCart} onDeleteCart={handleDeleteSavedCart} />
              )}
              <MemoizedProductList products={filteredProducts as any} onProductClick={handleProductClick} onFavoriteToggle={handleToggleFavoriteWithAuth} favorites={favorites} isCartView={true} quantities={favorites} onUpdateQuantity={handleFavoriteChangeInCart} searchTerm={searchTerm} purchasedItems={purchasedItems} onTogglePurchased={togglePurchased} />
            </>
          } />
          <Route path="/chango/:id" element={<SharedCartView />} />
          <Route path="/:category/:slug" element={ <ProductDetailWrapper products={products} favorites={favorites} toggleFavorite={toggleFavorite} theme={theme} onUpdateQuantity={handleFavoriteChangeInCart} user={user} setIsAuthOpen={setIsAuthOpen} /> } />
          <Route path="/acerca-de" element={<AboutView onClose={() => navigate('/')} content={config.acerca_de} />} />
          <Route path="/terminos" element={<TermsView onClose={() => navigate('/')} content={config.terminos} />} />
          <Route path="/contacto" element={<ContactView onClose={() => navigate('/')} content={config.contacto} email={profile?.email} />} />
          <Route path="/comparar-precios" element={ <> <SEOTags title="Comparar Precios de Supermercados | TradingChango" description="Guía completa sobre dispersión de precios en Argentina. Aprendé a encontrar las mejores ofertas comparando precios entre supermercados." keywords="comparar precios, ofertas supermercados, dispersión precios Argentina" /> <ComparePricesView onClose={() => navigate('/')} /> </> } />
          <Route path="/como-ahorrar" element={ <> <SEOTags title="Cómo Ahorrar en el Supermercado | TradingChango" description="5 consejos prácticos para ahorrar en tus compras del supermercado. Aprendé sobre marcas blancas, stockeo y comparación de precios." keywords="ahorrar dinero, compras inteligentes, tips supermercado" /> <HowToSaveView onClose={() => navigate('/')} /> </> } />
          <Route path="/historial-precios" element={ <> <SEOTags title="Historial de Precios | TradingChango" description="Conocé la importancia de la trazabilidad de precios para detectar ofertas falsas y ahorrar en tus compras semanales." keywords="historial precios, ofertas falsas, trazabilidad" /> <PriceHistoryView onClose={() => navigate('/')} /> </> } />
          <Route path="/ofertas-semana" element={ <> <SEOTags title="Ofertas de la Semana | TradingChango" description="Las mejores ofertas de la semana en los principales supermercados de Argentina. Precios actualizados dinámicamente." keywords="ofertas semana, promociones supermercados, descuentos" /> <WeeklyOffersView onClose={() => navigate('/')} products={products} /> </> } />
          <Route path="/privacidad" element={ <> <SEOTags title="Política de Privacidad | TradingChango" description="Política de privacidad de TradingChango. Cómo protegemos tus datos y privacidad." keywords="privacidad, protección datos, tradingchango" /> <TermsView onClose={() => navigate('/')} content={config.privacidad} /> </> } />
          <Route path="/update-password" element={ <MemoizedProductList products={filteredProducts as any} onProductClick={handleProductClick} onFavoriteToggle={handleToggleFavoriteWithAuth} favorites={favorites} isCartView={false} quantities={favorites} onUpdateQuantity={handleFavoriteChangeInCart} searchTerm={searchTerm} purchasedItems={purchasedItems} onTogglePurchased={togglePurchased} /> } />
          <Route path="/varios" element={<Navigate to="/" replace />} />
          <Route path="/buscar" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

        {['/', '/carnes', '/verdu', '/bebidas', '/lacteos', '/almacen', '/limpieza', '/perfumeria', '/mascotas'].includes(location.pathname) && filteredProducts.length > displayLimit && (
          <div className="flex justify-center py-6">
            <button 
              onClick={() => setDisplayLimit(prev => prev + 20)}
              className="bg-neutral-50 dark:bg-[#1f2c34] text-black dark:text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all border border-neutral-200 dark:border-[#233138] shadow-md mb-4"
              aria-label={`Cargar más productos, ${filteredProducts.length - displayLimit} restantes`}
            >
              Cargar más productos ({filteredProducts.length - displayLimit} restantes)
            </button>
          </div>
        )}
      </main>

      <MemoizedBottomNav cartCount={visibleCartCount} onCategoryChange={() => setSearchTerm('')} />

      {isAuthOpen && (
        <Suspense fallback={<LoadingSpinner />}>
          <AuthModal 
            isOpen={isAuthOpen} 
            onClose={() => setIsAuthOpen(false)} 
            user={user} 
            profile={profile} 
            onSignOut={handleSignOut} 
            onProfileUpdate={() => {
              // Track sign_up cuando se actualiza el perfil (nuevo registro)
              trackSignUp('email');
              loadData(user);
            }} 
            savedCarts={savedCarts} 
            onSaveCart={handleSaveCurrentCart} 
            onDeleteCart={handleDeleteSavedCart} 
            onLoadCart={handleLoadSavedCart} 
            currentActiveCartSize={visibleCartCount} 
          />
        </Suspense>
      )}
      <CookieBanner />
      <MemoizedFooter />
    </div>
    </ErrorBoundary>
  );
};

export default App;