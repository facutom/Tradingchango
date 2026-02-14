import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense, memo, useRef } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, getProducts, getPriceHistory, getProfile, getConfig, getBenefits, getSavedCartData, saveCartData, getProductHistoryByEan } from './services/supabase';
import { Product, PriceHistory, Profile, TabType, ProductStats, Benefit, CartItem } from './types';
import Header from './components/Header';
import ProductList from './components/ProductList';
import BottomNav from './components/BottomNav';
import SEOTags from './components/SEOTags';
import CategorySEO from './components/CategorySEO';
import { getCategorySEO, categorySEOConfig } from './utils/categorySEO';
import { calculateOutliers } from './utils/outlierDetection';

const AuthModal = lazy(() => import('./components/AuthModal'));
const CartSummary = lazy(() => import('./components/CartSummary'));
import Footer from './components/Footer';
const AboutView = lazy(() => import('./components/InfoViews').then(module => ({ default: module.AboutView })));
const TermsView = lazy(() => import('./components/InfoViews').then(module => ({ default: module.TermsView })));
const ContactView = lazy(() => import('./components/InfoViews').then(module => ({ default: module.ContactView })));
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

    const prices = STORES.map(s => {
      const storeKey = s.name.toLowerCase().replace(' ', '');
      const price = (p as any)[s.key] || 0;
      const url = (p as any)[s.url];
      const stockKey = `stock_${storeKey}`;
      const hasStock = (p as any)[stockKey] !== false;
      const isOutlier = outlierData[storeKey] === true;
      const hasUrl = url && url !== '#' && url.length > 5;

      if (price > 0 && hasUrl && !isOutlier && hasStock) {
        return price;
      }
      return 0;
    });

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

const LoadingSpinner = () => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="w-12 h-12 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
  </div>
);

const ProductDetail = lazy(() => 
  import('./components/ProductDetail').then(module => ({ default: module.default }))
);
const MemoizedHeader = memo(Header); 
const MemoizedBottomNav = memo(BottomNav); 
const MemoizedFooter = memo(Footer);
const MemoizedProductList = memo(ProductList);

const STORES = [
  { name: "COTO", key: 'p_coto', url: 'url_coto' },
  { name: "CARREFOUR", key: 'p_carrefour', url: 'url_carrefour' },
  { name: "DIA", key: 'p_dia', url: 'url_dia' },
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

const ProductDetailWrapper = ({ products, favorites, toggleFavorite, theme, onUpdateQuantity }: any) => {
  const { category, slug } = useParams(); 
  const navigate = useNavigate();
  const location = useLocation();
  
  // Buscamos el producto por categoría y por el nombre transformado a slug
  const product = products.find((p: any) => 
    slugify(p.categoria || 'general') === category && 
    slugify(p.nombre) === slug
  );

  // Si no hay productos cargados todavía, esperamos
  if (products.length === 0) return null;
  // Si terminó de cargar y no encontró el producto, volvemos al inicio
  if (!product) return <Navigate to="/" replace />;

  const handleClose = () => {
    // Si el usuario vino del chango (/chango), volver al chango
    if (location.state?.from === 'chango' || location.pathname === '/chango') {
      navigate('/chango', { replace: true });
    }
    // Si el usuario vino del home (/), volver al home
    else if (location.state?.from === 'home' || location.pathname === '/') {
      navigate('/', { replace: true });
    }
    // Sino, volver a la categoría del producto actual
    else {
      navigate(`/${slugify(product.categoria || 'general')}`, { replace: true });
    }
  };

  // Determinar si el usuario vino del chango
  const isFromChango = location.state?.from === 'chango' || location.pathname === '/chango';
  
  // Encontrar productos para navegación
  // Si vino del chango, filtrar solo productos del chango (favorites)
  // Si vino de una categoría, filtrar productos de esa categoría
  const categoryProducts = useMemo(() => {
    if (isFromChango) {
      // Navegación dentro del chango - solo productos favoritos
      const favoriteIds = Object.keys(favorites).map(id => parseInt(id));
      return products.filter((p: any) => 
        favoriteIds.includes(p.id) && 
        p.visible_web !== false
      );
    } else {
      // Navegación dentro de una categoría
      return products.filter((p: any) => 
        p.categoria === product.categoria && 
        p.visible_web !== false
      );
    }
  }, [products, product.categoria, isFromChango, favorites]);
  
  const currentIndex = useMemo(() => {
    return categoryProducts.findIndex((p: any) => p.id === product.id);
  }, [categoryProducts, product.id]);
  
  // Navegación circular: al llegar al final vuelve al inicio
  const handlePreviousProduct = useCallback(() => {
    if (categoryProducts.length === 0) return;
    
    let newIndex: number;
    if (currentIndex <= 0) {
      // Ir al último producto (circular)
      newIndex = categoryProducts.length - 1;
    } else {
      newIndex = currentIndex - 1;
    }
    
    const prevProduct = categoryProducts[newIndex];
    // Mantener el state original (de dónde vino inicialmente)
    const from = location.state?.from || 'category';
    navigate(`/${slugify(prevProduct.categoria || 'general')}/${slugify(prevProduct.nombre)}`, { state: { from } });
  }, [categoryProducts, currentIndex, navigate, location.state]);
  
  const handleNextProduct = useCallback(() => {
    if (categoryProducts.length === 0) return;
    
    let newIndex: number;
    if (currentIndex >= categoryProducts.length - 1) {
      // Ir al primer producto (circular)
      newIndex = 0;
    } else {
      newIndex = currentIndex + 1;
    }
    
    const nextProduct = categoryProducts[newIndex];
    // Mantener el state original (de dónde vino inicialmente)
    const from = location.state?.from || 'category';
    navigate(`/${slugify(nextProduct.categoria || 'general')}/${slugify(nextProduct.nombre)}`, { state: { from } });
  }, [categoryProducts, currentIndex, navigate, location.state]);

  const handleProductSelect = (id: number) => {
    const selectedProduct = products.find((p: any) => p.id === id);
    if (selectedProduct) {
      const from = location.state?.from || 'category';
      navigate(`/${slugify(selectedProduct.categoria || 'general')}/${slugify(selectedProduct.nombre)}`, { state: { from } });
    }
  };

  // Para navegación circular siempre hay anterior y siguiente
  const hasPrevious = categoryProducts.length > 1;
  const hasNext = categoryProducts.length > 1;

  return (
    <ProductDetail 
        productId={product.id}
        onClose={handleClose}
        isFavorite={!!favorites[product.id]}
        onFavoriteToggle={toggleFavorite}
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
  const [favorites, setFavorites] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem('tc_favs');
    return saved ? JSON.parse(saved) : {};
  });

  const [savedCarts, setSavedCarts] = useState<any[]>((() => {
    const saved = localStorage.getItem('tc_saved_lists');
    return saved ? JSON.parse(saved) : [];
  }));

  const [purchasedItems, setPurchasedItems] = useState<Set<number>>(new Set());
  const [showPwaPill, setShowPwaPill] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  const isInitialMount = useRef(true);
  const navigate = useNavigate();
  const location = useLocation();
  const lastListPageRef = useRef(location.pathname);


  
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
    console.log("Evento de instalación capturado");
    // 1. Prevenimos el cartel por defecto de Chrome
    e.preventDefault();
    // 2. Guardamos el evento para usarlo luego
    setDeferredPrompt(e);
    
    // 3. Verificamos si ya está instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || (navigator as any).standalone === true;

    if (!isStandalone) {
      // Forzamos la aparición del botón después de 1 segundo
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
      script.defer = true; // No bloquear renderizado
      document.body.appendChild(script);
    }, 10000); // Retraso de 10 segundos para no afectar rendimiento inicial

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
    return Object.keys(favorites)
      .map(id => {
        const product = products.find(p => p.id === Number(id));
        if (!product) return null;
        return { ...product, quantity: favorites[Number(id)] };
      })
      .filter((p): p is CartItem => p !== null);
  }, [favorites, products]);

  const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async (sessionUser: User | null, attempt = 1) => {
    setLoading(true);
    setError(null);

    try {
      // Intenta cargar desde el caché primero para una carga inicial rápida
      if (attempt === 1) {
        const cachedProds = localStorage.getItem('tc_cache_products');
        if (cachedProds) {
          setProducts(JSON.parse(cachedProds));
          setLoading(false); // Muestra el caché y sigue actualizando en segundo plano
        }
        // También cargar historial desde caché para cálculo inmediato de variaciones
        const cachedHistory = localStorage.getItem('tc_cache_history');
        if (cachedHistory) {
          setHistory(JSON.parse(cachedHistory));
        }
      }

      // Promise con Timeout para evitar esperas infinitas
      const fetchDataWithTimeout = (promise: Promise<any>, timeout: number) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error('La solicitud tardó demasiado. Verificá tu conexión.'));
          }, timeout);

          promise.then(
            res => {
              clearTimeout(timer);
              resolve(res);
            },
            err => {
              clearTimeout(timer);
              reject(err);
            }
          );
        });
      };

      const [prodData, configData] = await (fetchDataWithTimeout(
        Promise.all([getProducts(), getConfig()]), 
        8000 // 8 segundos de timeout
      ) as Promise<[Product[], Record<string, string>]>);

      const productsWithOutliers = await calculateOutliers(prodData || []);
      setProducts(productsWithOutliers || []);
      setConfig(configData || {});
      
      localStorage.setItem('tc_cache_products', JSON.stringify(productsWithOutliers));
      localStorage.setItem('tc_cache_config', JSON.stringify(configData || {}));

      // Carga de datos secundarios que no son críticos para el render inicial
      getPriceHistory(7).then(hist => {
        const histData = hist || [];
        setHistory(histData); // Guardar en estado para que los useMemo lo usen
        localStorage.setItem('tc_cache_history', JSON.stringify(histData)); // Persistir en caché
      });
      getBenefits(new Date().getDay()).then(setBenefits);

      if (sessionUser) {
        // Lógica de perfil de usuario...
      }
      
      setLoading(false);

    } catch (err: any) {
      console.error(`Error en intento ${attempt}:`, err);
      
      if (attempt < 2) { // Si es el primer intento, reintentamos una vez más
        setTimeout(() => loadData(sessionUser, 2), 3000); // Espera 3s y reintenta
      } else { // Si el segundo intento también falla
        setLoading(false);
        setError("No se pudo conectar con el mercado. Por favor, revisá tu conexión a internet y volvé a intentarlo.");
        // Si hay datos viejos en caché, los dejamos, si no, la página mostrará el error.
        const cachedProds = localStorage.getItem('tc_cache_products');
        if (!cachedProds) {
          setProducts([]);
        }
      }
    }
  }, []);

  useEffect(() => {
    const auth = supabase.auth as any;

    const fetchProfileAndData = async (sessionUser: User | null) => {
      if (sessionUser) {
        let prof = await getProfile(sessionUser.id);
        if (prof && prof.subscription === 'pro' && prof.subscription_end) {
          const expiryDate = new Date(prof.subscription_end);
          if (expiryDate < new Date()) {
            await supabase.from('perfiles').update({ subscription: 'free' }).eq('id', sessionUser.id);
            prof = { ...prof, subscription: 'free' };
          }
        }
        setProfile(prof);
        
        const cartData = await getSavedCartData(sessionUser.id);
        if (cartData) {
          setFavorites(cartData.active || {});
          setSavedCarts(cartData.saved || []);
        }
      } else {
        setProfile(null);
        const savedFavs = localStorage.getItem('tc_favs');
        const savedLists = localStorage.getItem('tc_saved_lists');
        setFavorites(savedFavs ? JSON.parse(savedFavs) : {});
        setSavedCarts(savedLists ? JSON.parse(savedLists) : []);
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

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        fetchProfileAndData(sessionUser);
      }
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsAuthOpen(true);
        localStorage.setItem('active_auth_view', 'update_password');
      }

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setFavorites({});
        setSavedCarts([]);
        setPurchasedItems(new Set());
        localStorage.removeItem('tc_favs');
        localStorage.removeItem('tc_saved_lists');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadData]);

// --- PERSISTENCIA MEJORADA (LOCAL + NUBE + MINIMIZADO) ---
  useEffect(() => {
  // 1. Guardado INSTANTÁNEO en LocalStorage (esto es infalible)
  localStorage.setItem('tc_favs', JSON.stringify(favorites));
  localStorage.setItem('tc_saved_lists', JSON.stringify(savedCarts));

  const sincronizarConNube = async () => {
    // CONDICIÓN: Solo guardar si el perfil está cargado.
    if (user && profile && !loading) {
      try {
        const dataToSave = { active: favorites, saved: savedCarts };
        await saveCartData(user.id, dataToSave);
      } catch (e) {
        console.error("Error sincronizando:", e);
      }
    }
  };

  // 2. Detectar cuando el usuario minimiza o cambia de pestaña
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      sincronizarConNube(); // Guarda inmediatamente sin esperar al timer
    }
  };

  // 3. Timer para uso normal (bajado a 800ms para más rapidez)
  const timer = setTimeout(sincronizarConNube, 800);

  document.addEventListener("visibilitychange", handleVisibilityChange);
  
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [favorites, savedCarts, user, loading]);

  useEffect(() => {
    if (products.length > 0) {
      const firstProductImage = products[0].imagen_url;
      if (firstProductImage) {
        // Evita duplicar el preload si el componente se re-renderiza
        const existingLink = document.querySelector(`link[rel="preload"][href^="${firstProductImage}"]`);
        if (!existingLink) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = `${firstProductImage}?width=120&quality=75&format=webp`;
          document.head.appendChild(link);
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
    
    return { 
      min, 
      spread: Math.abs(diff).toFixed(1),
      trendClass: tc, 
      icon, 
      isUp, 
      isDown,
      variation: diff // <-- Devolvemos la variación real
    };
  };

  const isPro = useMemo(() => {
    if (!profile || profile.subscription !== 'pro') return false;
    return profile.subscription_end ? new Date(profile.subscription_end) > new Date() : false;
  }, [profile]);

  const baseFilteredProducts = useMemo(() => {
    const currentPath = location.pathname;
    // Usar función optimizada para procesar productos - calcula prices y stats una sola vez
    let result = processProducts(products, history, STORES);

    // Filtro por categoría para listado general (solo productos con >= 2 precios válidos)
    if (currentPath === '/carnes') result = result.filter(p => normalizeText(p.categoria || '').includes('carne') && p.validPriceCount >= 2);
    else if (currentPath === '/verdu') result = result.filter(p => (normalizeText(p.categoria || '').includes('verdu') || normalizeText(p.categoria || '').includes('fruta')) && p.validPriceCount >= 2);
    else if (currentPath === '/bebidas') result = result.filter(p => normalizeText(p.categoria || '').includes('bebida') && p.validPriceCount >= 2);
    else if (currentPath === '/lacteos') result = result.filter(p => normalizeText(p.categoria || '').includes('lacteo') && p.validPriceCount >= 2);
    else if (currentPath === '/almacen') result = result.filter(p => normalizeText(p.categoria || '').includes('almacen') && p.validPriceCount >= 2);
    else if (currentPath === '/limpieza') result = result.filter(p => normalizeText(p.categoria || '').includes('limpieza') && p.validPriceCount >= 2);
    else if (currentPath === '/perfumeria') result = result.filter(p => normalizeText(p.categoria || '').includes('perfumeria') && p.validPriceCount >= 2);
    else if (currentPath === '/mascotas') result = result.filter(p => normalizeText(p.categoria || '').includes('mascota') && p.validPriceCount >= 2);
    else if (currentPath === '/' || currentPath === '/chango') result = result.filter(p => p.validPriceCount >= 2);

    // --- FILTRO DE BÚSQUEDA OPTIMIZADO ---
    if (debouncedSearchTerm) {
      const t = debouncedSearchTerm.toLowerCase().trim(); // Quitamos espacios locos
      if (t.length > 0) { // Solo filtramos si realmente hay texto
        result = result.filter(p => {
          // Solo mostrar productos con >= 2 precios válidos en el listado
          const validPrices = p.prices.filter((price: number) => price > 0).length;
          if (validPrices < 2) return false;
          
          // Buscamos en nombre y ticker (si existe)
          const nameMatch = p.nombre.toLowerCase().includes(t);
          const tickerMatch = p.ticker && p.ticker.toLowerCase().includes(t);
          return nameMatch || tickerMatch;
        });
      }
    }

    // --- FILTRO DE TENDENCIAS ---
    if (trendFilter && currentPath !== '/chango') {
      // Primero filtramos por >= 2 precios válidos
      result = result.filter(p => p.prices.filter((price: number) => price > 0).length >= 2);
      result = result.filter(p => trendFilter === 'up' ? p.stats.isUp : p.stats.isDown);
      
      // Ordenamos por la magnitud de la variación.
      result.sort((a, b) => {
        // Para 'down', queremos el más negativo primero (ej: -25% antes que -10%).
        // Para 'up', queremos el más positivo primero (ej: 30% antes que 15%).
        return trendFilter === 'down' 
          ? a.stats.variation - b.stats.variation  // Orden ascendente (más negativo primero)
          : b.stats.variation - a.stats.variation; // Orden descendente (más positivo primero)
      });
    }

    return result;
  }, [products, history, location.pathname, debouncedSearchTerm, trendFilter]); // useMemo protege el rendimiento

  // Productos de la categoría original (sin filtros de búsqueda/tendencia) para métricas de CategorySEO
  // Optimización: reuse los productos ya procesados de baseFilteredProducts
  const categoryProducts = useMemo(() => {
    if (location.pathname === '/chango') return [];
    
    // Usar los productos ya procesados - solo aplicar filtro de categoría
    const currentPath = location.pathname;
    let result = [...baseFilteredProducts]; // Copia para no mutar

    // Solo filtrar por categoría (ya tienen prices y stats calculados)
    if (currentPath === '/carnes') result = result.filter(p => normalizeText(p.categoria || '').includes('carne'));
    else if (currentPath === '/verdu') result = result.filter(p => normalizeText(p.categoria || '').includes('verdu') || normalizeText(p.categoria || '').includes('fruta'));
    else if (currentPath === '/bebidas') result = result.filter(p => normalizeText(p.categoria || '').includes('bebida'));
    else if (currentPath === '/lacteos') result = result.filter(p => normalizeText(p.categoria || '').includes('lacteo'));
    else if (currentPath === '/almacen') result = result.filter(p => normalizeText(p.categoria || '').includes('almacen'));
    else if (currentPath === '/limpieza') result = result.filter(p => normalizeText(p.categoria || '').includes('limpieza'));
    else if (currentPath === '/perfumeria') result = result.filter(p => normalizeText(p.categoria || '').includes('perfumeria'));
    else if (currentPath === '/mascotas') result = result.filter(p => normalizeText(p.categoria || '').includes('mascota'));

    return result;
  }, [baseFilteredProducts, location.pathname]); // Optimizado: usa productos ya procesados

  const cartItems = useMemo(() => {
    return baseFilteredProducts
      .filter(p => favorites[p.id])
      .map(p => ({ ...p, quantity: favorites[p.id] || 1 } as CartItem));
  }, [baseFilteredProducts, favorites]);



  const filteredProducts = useMemo(() => {
    if (location.pathname === '/chango') {
      return cartItems;
    }
    return baseFilteredProducts;
  }, [baseFilteredProducts, location.pathname, cartItems]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, displayLimit);
  }, [filteredProducts, displayLimit]);




const toggleFavorite = useCallback(async (id: number) => {
    // Optimización: Actualizar estado LOCAL inmediatamente para feedback instantáneo
    setFavorites(prev => {
      const next = { ...prev };
      const isAdding = !next[id];
      
      if (isAdding) {
        next[id] = 1;
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

    // Validar sesión en background y sincronizar
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        setIsAuthOpen(true);
        setFavorites(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        return;
      }
      
      const favoritesCount = Object.keys(favorites).length + 1;
      if (!isPro && favoritesCount > 5 && !favorites[id]) {
        alert('Los usuarios FREE solo pueden tener hasta 5 productos en favoritos.');
      }
      
    } catch (e) {
      console.error('Error en toggleFavorite:', e);
    }
  }, [isPro, favorites]);


  const handleFavoriteChangeInCart = useCallback((id: number, delta: number) => {
    setFavorites(prev => {
      const newQty = (prev[id] || 1) + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: newQty };
    });
  }, []);

  const togglePurchased = useCallback((id: number) => {
    setPurchasedItems(prev => {
      const newPurchased = new Set(prev);
      if (newPurchased.has(id)) {
        newPurchased.delete(id);
      } else {
        newPurchased.add(id);
      }
      return newPurchased;
    });
  }, []);

  const handleSaveCurrentCart = (name: string) => {
    const limit = isPro ? 10 : 2;
    if (savedCarts.length >= limit) {
      alert(`Límite de listas alcanzado (${limit}).`);
      return;
    }
    setSavedCarts(prev => [...prev, { name, items: { ...favorites }, date: new Date().toISOString() }]);
  };

  const handleDeleteSavedCart = (index: number) => {
    setSavedCarts(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const handleLoadSavedCart = (index: number) => {
    setFavorites(savedCarts[index].items);
    setPurchasedItems(new Set());
    navigate('/chango');
  };

  const scrollPositionRef = useRef(0);

  // Precargar ProductDetail en hover para reducir delay
  const preloadProductDetail = useCallback(() => {
    // Precargar el chunk de ProductDetail
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'script';
    // El chunk se llama ProductDetail-*.js
    const script = document.createElement('script');
    script.src = '/assets/js/ProductDetail-DNn5t_7E.js'; // Este nombre puede cambiar con el build
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleProductClick = useCallback((product: Product) => {
    scrollPositionRef.current = window.scrollY;
    const categorySlug = slugify(product.categoria || 'general');
    const productSlug = slugify(product.nombre);
    // Pasar state para saber si vino del home, chango o de una categoría
    let from: 'home' | 'chango' | 'category' = 'category';
    if (location.pathname === '/') from = 'home';
    else if (location.pathname === '/chango') from = 'chango';
    navigate(`/${categorySlug}/${productSlug}`, { state: { from } });
  }, [navigate, location.pathname]);

  useEffect(() => {
    const listPaths = ['/', '/chango', '/carnes', '/verdu', '/bebidas', '/almacen', '/lacteos', '/limpieza', '/perfumeria', '/mascotas'];
    const currentPath = location.pathname;
    const isCurrentPathList = listPaths.includes(currentPath);

    // Si la ruta actual es una página de lista
    if (isCurrentPathList) {
      // Y es diferente a la última página de lista guardada (cambio de categoría)
      if (currentPath !== lastListPageRef.current) {
        window.scrollTo(0, 0);
        setSearchTerm('');
        setTrendFilter(null);
        setDisplayLimit(20);
      }
      // Si es la misma (ej. volviendo de un producto), restauramos el scroll
      else if (scrollPositionRef.current > 0) {
        setTimeout(() => {
          window.scrollTo(0, scrollPositionRef.current);
          scrollPositionRef.current = 0;
        }, 0);
      }
      
      // Actualizamos la última página de lista visitada
      lastListPageRef.current = currentPath;
    }
    // Si no es una página de lista (ej. detalle de producto), no hacemos nada.
    // `lastListPageRef` mantiene su valor, listo para la comparación cuando volvamos.

  }, [location.pathname]);

  const handleSignOut = async () => {
  setLoading(true);
  
  // 1. Forzar borrado local INMEDIATO de tokens de Supabase
  // Esto evita que el F5 encuentre la sesión vieja
  const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  localStorage.removeItem('tc_favs');
  localStorage.removeItem('tc_saved_lists');

  // 2. Ejecutar el cierre de sesión en el servidor
  await supabase.auth.signOut();
  // 3. Limpiar estado de la App
  setUser(null);
  setProfile(null);
  setFavorites({});
  setSavedCarts([]);
  setPurchasedItems(new Set());
  setIsAuthOpen(false);
  setLoading(false);
  
  navigate('/', { replace: true });
};
  // Calculamos la cantidad de productos en el carrito que realmente son visibles
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
      onFavoriteToggle={toggleFavorite}
      isFavorite={isFavorite}
      isCartView={false}
      quantities={favorites}
      onUpdateQuantity={handleFavoriteChangeInCart}
      searchTerm={searchTerm}
      purchasedItems={purchasedItems}
      onTogglePurchased={togglePurchased}
    />
  </> 
);
 
  if (loading && products.length === 0) return <div className="min-h-screen flex items-center justify-center dark:bg-primary dark:text-white font-mono text-[11px] uppercase tracking-[0.2em]">Conectando a Mercado...</div>;
 
  return (
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
  /* El md:hidden asegura que en PC/Escritorio no se vea */
  <div className="fixed bottom-[75px] left-1/2 -translate-x-1/2 z-[9999] w-[85%] max-w-[320px] md:hidden animate-in slide-in-from-bottom-5 duration-500">
    <div className="bg-neutral-900 dark:bg-white text-white dark:text-black p-3.5 rounded-2xl shadow-[0_15px_45px_rgba(0,0,0,0.4)] flex items-center justify-between relative border border-neutral-800 dark:border-neutral-100">
      
      {/* BOTÓN X - Más pequeño */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setShowPwaPill(false);
        }}
        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-900 active:scale-90 transition-transform"
        aria-label="Cerrar aviso de instalación"
      >
        <i className="fa-solid fa-xmark text-[10px]"></i>
      </button>

      <div className="flex items-center gap-3">
        {/* Icono reducido */}
        <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/30">
          <i className="fa-solid fa-cart-arrow-down text-base"></i>
        </div>
        
        <div className="flex flex-col">
          <span className="text-[11px] font-black uppercase tracking-tight leading-none mb-0.5">
            TradingChango
          </span>
          <span className="text-[8px] font-bold opacity-70 uppercase tracking-widest leading-none">
            Compará antes de comprar
          </span>
        </div>
      </div>

      {/* Botón Instalar reducido */}
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
          const found = products.find(p => p.ean && Array.isArray(p.ean) && p.ean.includes(ean));
          if (found) {
            navigate(`/${slugify(found.categoria || 'general')}/${slugify(found.nombre)}`);
          } else {
            alert(`Producto con EAN ${ean} no encontrado`);
          }
        }}
      />
    <main>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={
            <>
              <SEOTags 
                title="TradingChango | Compará Precios de Supermercados en Argentina"
                description={descriptions['/']}
                keywords="precios supermercado Argentina, comparar precios, ofertas Coto Carrefour Jumbo, ahorrar compra"
              />
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
          <Route path="/varios" element={<Navigate to="/" replace />} />
          <Route path="/chango" element={
            <>
              {cartItems.length > 0 && (
                  <CartSummary
                    items={favoriteItems}
                    benefits={benefits}
                    userMemberships={profile?.membresias}
                    onSaveCart={handleSaveCurrentCart}
                    canSave={!!user}
                    savedCarts={savedCarts}
                    onLoadCart={handleLoadSavedCart}
                    onDeleteCart={handleDeleteSavedCart}
                  />
              )}
              <MemoizedProductList
                products={filteredProducts as any}
                onProductClick={handleProductClick}
                onFavoriteToggle={toggleFavorite}
                isFavorite={(id: number) => !!favorites[id]}
                isCartView={true}
                quantities={favorites}
                onUpdateQuantity={handleFavoriteChangeInCart}
                searchTerm={searchTerm}
                purchasedItems={purchasedItems}
                onTogglePurchased={togglePurchased}
              />
            </>
          } />
          {/* Todas las rutas deben estar DENTRO de un solo <Routes> */}
          <Route path="/:category/:slug" element={
            <ProductDetailWrapper
              products={products}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              theme={theme}
              onUpdateQuantity={handleFavoriteChangeInCart}
            />
          } />
          <Route path="/acerca-de" element={<AboutView onClose={() => navigate('/')} content={config.acerca_de} />} />
          <Route path="/terminos" element={<TermsView onClose={() => navigate('/')} content={config.terminos} />} />
          <Route path="/contacto" element={<ContactView onClose={() => navigate('/')} content={config.contacto} email={profile?.email} />} />
          <Route path="/update-password" element={
            <MemoizedProductList
              products={filteredProducts as any}
              onProductClick={handleProductClick}
              onFavoriteToggle={toggleFavorite}
              isFavorite={(id: number) => !!favorites[id]}
              isCartView={false}
              quantities={favorites}
              onUpdateQuantity={handleFavoriteChangeInCart}
              searchTerm={searchTerm}
              purchasedItems={purchasedItems}
              onTogglePurchased={togglePurchased}
            />
          } />
        </Routes>
      </Suspense>

        {/* --- BOTON DE CARGA POR LOTES --- */}
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

      <MemoizedBottomNav cartCount={visibleCartCount} />

      {isAuthOpen && (
        <Suspense fallback={<LoadingSpinner />}>
          <AuthModal 
            isOpen={isAuthOpen} 
            onClose={() => setIsAuthOpen(false)} 
            user={user} 
            profile={profile} 
            onSignOut={handleSignOut} 
            onProfileUpdate={() => loadData(user)}
            savedCarts={savedCarts}
            onSaveCart={handleSaveCurrentCart}
            onDeleteCart={handleDeleteSavedCart}
            onLoadCart={handleLoadSavedCart}
            currentActiveCartSize={visibleCartCount}
          />
        </Suspense>
      )}
      
      <MemoizedFooter />
    </div>
  );
};

export default App;