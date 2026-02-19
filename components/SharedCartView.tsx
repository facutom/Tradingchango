import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getSharedCart, SharedCart } from '../services/supabase';
import { trackSharedCartView } from '../utils/analytics';
import { Product } from '../types';
import SEOTags from './SEOTags';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getMinPrice = (product: Product): number => {
  const prices = [
    product.p_jumbo, product.p_carrefour, product.p_coto,
    product.p_dia, product.p_disco, product.p_vea, product.p_laanonima,
  ].filter(p => p && p > 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
};

const getRegularPrice = (product: Product): number => {
  const prices = [
    product.p_jumbo, product.p_carrefour, product.p_coto,
    product.p_dia, product.p_disco, product.p_vea, product.p_laanonima,
  ].filter(p => p && p > 0);
  return prices.length > 0 ? Math.max(...prices) : 0;
};

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-AR').format(Math.round(n));

const STORES = [
  { name: 'COTO',        key: 'coto',       emoji: '🔴' },
  { name: 'CARREFOUR',   key: 'carrefour',  emoji: '🔵' },
  { name: 'DIA',         key: 'dia',        emoji: '🟡' },
  { name: 'JUMBO',       key: 'jumbo',      emoji: '🟢' },
  { name: 'DISCO',       key: 'disco',      emoji: '🟣' },
  { name: 'VEA',         key: 'vea',        emoji: '🟠' },
  { name: 'LA ANÓNIMA',  key: 'laanonima',  emoji: '🩷' },
];

// ─── Main Component ─────────────────────────────────────────────────────────

const SharedCartView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [cart, setCart] = useState<SharedCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [visible, setVisible] = useState(false);

  const utmSource = searchParams.get('utm_source') || 'direct';

  // Fetch cart
  useEffect(() => {
    const fetchCart = async () => {
      if (!id) { setError('ID no encontrado'); setLoading(false); return; }
      try {
        const cartData = await getSharedCart(id);
        if (!cartData) {
          setError('Este chango ya no está disponible o expiró');
          setLoading(false);
          return;
        }
        setCart(cartData);
        trackSharedCartView(
          cartData.id, cartData.user_name, cartData.total_savings,
          Object.keys(cartData.items.active).length, utmSource
        );
        setLoading(false);
        setTimeout(() => setVisible(true), 50);
      } catch {
        setError('Error al cargar el chango compartido');
        setLoading(false);
      }
    };
    fetchCart();
  }, [id, utmSource]);

  // Load products from cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem('tc_cache_products');
      if (cached) setProducts(JSON.parse(cached));
    } catch { /* silent */ }
  }, []);

  // Helper para obtener el umbral de oferta
  const getOfferThreshold = (offerString: string): number | null => {
    if (!offerString) return null;
    const lower = String(offerString).toLowerCase();
    const xForY = lower.match(/(\d+)\s*x\s*(\d+)/);
    if (xForY) return parseInt(xForY[1], 10);
    const nthUnit = lower.match(/(\d+)(?:do|da|ra|ro|ta|to)\s*al/);
    if (nthUnit) return parseInt(nthUnit[1], 10);
    return null;
  };

  // Función para calcular el precio de un producto en un store específico (con lógica de ofertas)
  const getStoreItemPrice = (product: Product | undefined, storeKey: string, quantity: number, ofertaGondola: any): { price: number; regularTotal: number } => {
    if (!product) return { price: 0, regularTotal: 0 };
    
    // Obtener precios p_ (promo) y pr_ (regular)
    const pPromoRaw = (product[`p_${storeKey}` as keyof Product] as number) || 0;
    const pRegRaw = (product[`pr_${storeKey}` as keyof Product] as number) || 0;
    
    // El precio regular es el mayor, el promo es el menor
    const pRegular = Math.max(pPromoRaw, pRegRaw);
    const pPromo = Math.min(pPromoRaw, pRegRaw);
    
    if (pRegular <= 0) return { price: 0, regularTotal: 0 };
    
    // Buscar oferta gondola para este store
    let ofertaTexto = '';
    if (ofertaGondola && typeof ofertaGondola === 'object') {
      const actualKey = Object.keys(ofertaGondola).find(
        (key) => key.toLowerCase() === storeKey.toLowerCase()
      );
      if (actualKey) {
        ofertaTexto = String(ofertaGondola[actualKey] || '');
      }
    }
    
    const threshold = getOfferThreshold(ofertaTexto);
    let finalPrice = 0;
    
    if (threshold !== null && threshold > 0 && pPromo > 0 && pPromo < pRegular) {
      // Hay oferta por cantidad (ej: 3x2)
      const numCombos = Math.floor(quantity / threshold);
      const remainder = quantity % threshold;
      const unitsInPromo = numCombos * threshold;
      finalPrice = (unitsInPromo * pPromo) + (remainder * pRegular);
    } else {
      // Sin oferta o oferta directa: usa el mejor precio
      finalPrice = quantity * ((pPromo > 0 && pPromo < pRegular) ? pPromo : pRegular);
    }
    
    return { price: finalPrice, regularTotal: pRegular * quantity };
  };

  // Cart items
  const cartItems = useMemo(() => {
    if (!cart) return [];
    const items = Object.entries(cart.items.active).map(([itemId, qty]) => {
      const product = products.find(p => p.id === parseInt(itemId));
      const minPrice = product ? getMinPrice(product) : 0;
      const regularPrice = product ? getRegularPrice(product) : 0;
      return {
        id: parseInt(itemId), quantity: qty, product,
        minPrice, regularPrice,
        oferta_gondola: product?.oferta_gondola,
        savings: (regularPrice - minPrice) * qty,
        bestStorePrice: minPrice,
        total: minPrice * qty,
      };
    }).filter(item => item.product);
    return items;
  }, [cart, products]);

  // Store results - usa la misma lógica de precios que CartSummary
  const storeResults = useMemo(() => {
    if (cartItems.length === 0) return [];
    return STORES.map(store => {
      let total = 0; let regularTotal = 0; let hasAllItems = true;
      cartItems.forEach(item => {
        if (!item.product) return;
        const urlKey = `url_${store.key}` as keyof Product;
        const storeUrl = item.product[urlKey];
        
        const { price, regularTotal: regTotal } = getStoreItemPrice(
          item.product,
          store.key,
          item.quantity,
          item.oferta_gondola
        );
        
        total += price;
        regularTotal += regTotal;
        if (!storeUrl || storeUrl === '') hasAllItems = false;
      });
      return { ...store, total, regularTotal, savings: regularTotal - total, hasAllItems };
    })
      .filter(r => r.hasAllItems && cartItems.length > 0)
      .sort((a, b) => a.total - b.total);
  }, [cartItems]);

  // Actualizar cartItems con el precio del mejor store
  const cartItemsWithBestPrice = useMemo(() => {
    if (!storeResults.length || !cartItems.length) return cartItems;
    const bestStore = storeResults[0];
    return cartItems.map(item => {
      const { price } = getStoreItemPrice(
        item.product,
        bestStore.key,
        item.quantity,
        item.oferta_gondola
      );
      const bestStorePrice = item.quantity > 0 ? price / item.quantity : 0;
      return {
        ...item,
        bestStorePrice,
        total: price,
      };
    });
  }, [cartItems, storeResults]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const goHome = () => navigate(`/?utm_source=${utmSource}&utm_campaign=shared_cart_cta`);

  // ── Enhanced Styles ───────────────────────────────────────────────────────
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=DM+Sans:wght@400;500;600;700&display=swap');

    .sc-root *, .sc-root *::before, .sc-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .sc-root {
      position: fixed; inset: 0; z-index: 9999;
      overflow-y: auto; overflow-x: hidden;
      font-family: 'DM Sans', sans-serif;
      background: #050507;
      color: #fff;
    }

    /* Animated grid pattern */
    .sc-root::before {
      content: '';
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background-image: 
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 60px 60px;
      mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
    }

    /* Noise overlay */
    .sc-root::after {
      content: '';
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
    }

    /* Enhanced animated gradient orbs */
    .sc-bg {
      position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
    }
    .sc-orb {
      position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.4;
      animation: orbFloat 12s ease-in-out infinite;
    }
    .sc-orb-1 { 
      width: 600px; height: 600px; 
      background: linear-gradient(135deg, #00c853, #00e676); 
      top: -200px; left: -150px; 
      animation-delay: 0s;
    }
    .sc-orb-2 { 
      width: 500px; height: 500px; 
      background: linear-gradient(135deg, #2979ff, #448aff); 
      bottom: -100px; right: -100px; 
      animation-delay: -4s;
    }
    .sc-orb-3 { 
      width: 350px; height: 350px; 
      background: linear-gradient(135deg, #ff6d00, #ff9100); 
      top: 50%; left: 60%; 
      animation-delay: -8s;
    }
    .sc-orb-4 {
      width: 250px; height: 250px;
      background: linear-gradient(135deg, #aa00ff, #e040fb);
      bottom: 30%; left: -50px;
      animation-delay: -6s;
    }
    @keyframes orbFloat {
      0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
      25% { transform: translate(30px, -40px) scale(1.08) rotate(5deg); }
      50% { transform: translate(-20px, 20px) scale(0.95) rotate(-3deg); }
      75% { transform: translate(40px, 30px) scale(1.03) rotate(8deg); }
    }

    .sc-content {
      position: relative; z-index: 1;
      max-width: 480px; margin: 0 auto;
      padding: 0 0 140px;
      opacity: 0; transform: translateY(32px) scale(0.98);
      transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sc-content.visible { opacity: 1; transform: translateY(0) scale(1); }

    /* Glass card effect */
    .sc-glass {
      background: rgba(20, 20, 25, 0.6);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 
        0 4px 24px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    /* Header */
    .sc-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 20px 16px;
    }
    .sc-logo {
      display: flex; align-items: center; gap: 10px;
      cursor: pointer; text-decoration: none;
    }
    .sc-logo-mark {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #00c853 0%, #00e676 100%);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(0, 200, 83, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
    }
    .sc-logo-mark:hover {
      transform: scale(1.05) rotate(-2deg);
      box-shadow: 0 6px 24px rgba(0, 200, 83, 0.4);
    }
    .sc-logo-icon {
      font-size: 18px !important;
      color: #0a0a0a !important;
    }
    .sc-logo-trend {
      position: absolute !important;
      top: -4px !important;
      right: -4px !important;
      font-size: 11px !important;
      color: #00a650 !important;
      background-color: #0a0a0a !important;
      border-radius: 50% !important;
      padding: 2px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 14px; height: 14px;
      z-index: 2;
    }
    .sc-logo-text {
      font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
      font-weight: 800 !important; font-size: 22px !important;
      letter-spacing: -1px !important;
      color: #e9edef !important;
    }
    .sc-header-cta {
      background: linear-gradient(135deg, rgba(0, 200, 83, 0.15) 0%, rgba(0, 200, 83, 0.05) 100%);
      color: #00e676;
      padding: 8px 14px; border-radius: 100px;
      font-weight: 600; font-size: 11px; text-decoration: none;
      border: 1px solid rgba(0, 200, 83, 0.3);
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sc-header-cta:hover { 
      background: rgba(0, 200, 83, 0.25); 
      transform: scale(1.04);
      border-color: rgba(0, 200, 83, 0.5);
    }

    /* Hero card - enhanced */
    .sc-hero {
      margin: 12px 16px 16px;
      background: linear-gradient(145deg, rgba(15, 15, 18, 0.9) 0%, rgba(25, 25, 30, 0.7) 100%);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 28px;
      padding: 32px 24px 28px;
      text-align: center;
      position: relative; overflow: hidden;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.03) inset;
    }
    .sc-hero::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    }
    .sc-hero::after {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #00c853, #2979ff, #ff6d00, #aa00ff);
      background-size: 300% 100%;
      animation: gradientShift 4s ease infinite;
    }
    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    .sc-avatar-wrap {
      position: relative;
      margin-bottom: 18px;
    }
    .sc-avatar-glow {
      position: absolute; inset: -8px;
      background: radial-gradient(circle, rgba(0, 200, 83, 0.3) 0%, transparent 70%);
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.15); opacity: 0.8; }
    }
    .sc-avatar {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex; align-items: center; justify-content: center;
      font-size: 32px; margin: 0 auto;
      box-shadow: 
        0 0 0 4px rgba(0, 200, 83, 0.15),
        0 8px 32px rgba(0, 0, 0, 0.4);
      position: relative;
    }
    .sc-hero-name {
      font-family: 'Unbounded', sans-serif; font-weight: 900; font-size: 24px;
      color: #fff; margin-bottom: 6px;
      letter-spacing: -0.5px;
    }
    .sc-hero-sub { 
      font-size: 14px; color: rgba(255,255,255,0.5); 
      margin-bottom: 24px; 
      font-weight: 500;
    }

    /* Savings box - premium */
    .sc-savings-box {
      background: linear-gradient(145deg, #00c853 0%, #00a844 100%);
      border-radius: 20px; padding: 20px 24px;
      margin-bottom: 16px;
      position: relative;
      overflow: hidden;
      box-shadow: 
        0 8px 32px rgba(0, 200, 83, 0.35),
        0 0 0 1px rgba(255,255,255,0.1) inset;
    }
    .sc-savings-box::before {
      content: '';
      position: absolute; top: -50%; left: -50%;
      width: 200%; height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 50%);
      animation: shimmer 3s ease-in-out infinite;
    }
    @keyframes shimmer {
      0%, 100% { transform: translate(-30%, -30%); }
      50% { transform: translate(0%, 0%); }
    }
    .sc-savings-label {
      font-size: 11px; font-weight: 700; letter-spacing: 2px;
      text-transform: uppercase; color: rgba(0,0,0,0.5); margin-bottom: 6px;
      position: relative;
    }
    .sc-savings-amount {
      font-family: 'Unbounded', sans-serif; font-weight: 900; font-size: 42px;
      color: #0a0a0a; letter-spacing: -2px; line-height: 1;
      position: relative;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .sc-savings-desc { 
      font-size: 13px; color: rgba(0,0,0,0.5); margin-top: 6px; 
      position: relative;
      font-weight: 500;
    }

    /* Stats - improved */
    .sc-stats {
      display: flex; gap: 10px;
    }
    .sc-stat {
      flex: 1; 
      background: rgba(30, 30, 35, 0.6);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 14px 10px; text-align: center;
      transition: all 0.2s;
    }
    .sc-stat:hover {
      background: rgba(40, 40, 45, 0.8);
      border-color: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
    }
    .sc-stat-val {
      font-family: 'Unbounded', sans-serif; font-weight: 700; font-size: 18px;
      color: #fff;
    }
    .sc-stat-lbl { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 4px; }

    /* Section */
    .sc-section { margin: 0 16px 16px; }
    .sc-section-title {
      font-size: 11px; font-weight: 700; letter-spacing: 2px;
      text-transform: uppercase; color: rgba(255,255,255,0.4); 
      margin-bottom: 14px; padding-left: 4px;
      display: flex; align-items: center; gap: 10px;
    }
    .sc-section-title::after {
      content: ''; flex: 1; height: 1px;
      background: linear-gradient(90deg, rgba(255,255,255,0.1), transparent);
    }

    /* Store comparison - enhanced */
    .sc-stores { display: flex; flex-direction: column; gap: 10px; }

    .sc-store-best {
      background: linear-gradient(145deg, #00c853 0%, #00e676 100%);
      border-radius: 20px; padding: 18px 20px;
      display: flex; align-items: center; justify-content: space-between;
      position: relative; overflow: hidden;
      box-shadow: 
        0 8px 32px rgba(0, 200, 83, 0.4),
        0 0 0 1px rgba(255,255,255,0.15) inset;
    }
    .sc-store-best::before {
      content: '🏆 MEJOR OPCIÓN';
      position: absolute; top: 10px; right: -24px;
      background: rgba(0,0,0,0.15); font-size: 9px; font-weight: 700;
      letter-spacing: 1px; color: rgba(0,0,0,0.5);
      transform: rotate(38deg); padding: 4px 40px;
    }
    .sc-store-best::after {
      content: '';
      position: absolute; top: 0; right: 0; width: 150px; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1));
    }
    .sc-store-left { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
    .sc-store-icon {
      width: 46px; height: 46px; background: rgba(0,0,0,0.15);
      border-radius: 14px; display: flex; align-items: center;
      justify-content: center; font-size: 22px;
    }
    .sc-store-name-best {
      font-family: 'Unbounded', sans-serif; font-weight: 900; font-size: 16px; color: #0a0a0a;
    }
    .sc-store-tag {
      font-size: 12px; font-weight: 600; color: rgba(0,0,0,0.45); margin-top: 3px;
    }
    .sc-store-price-best {
      font-family: 'Unbounded', sans-serif; font-weight: 900; font-size: 24px; color: #0a0a0a;
      position: relative; z-index: 1;
    }

    .sc-store-row {
      background: rgba(18, 18, 22, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 16px;
      padding: 16px 20px;
      display: flex; align-items: center; justify-content: space-between;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .sc-store-row:hover { 
      background: rgba(25, 25, 30, 0.9);
      border-color: rgba(255, 255, 255, 0.1);
      transform: translateX(4px);
    }
    .sc-store-row-name { 
      font-size: 14px; font-weight: 600; color: #ccc; 
      display: flex; align-items: center; gap: 10px; 
    }
    .sc-store-row-price { 
      font-family: 'Unbounded', sans-serif; font-weight: 700; font-size: 15px; color: #fff; 
    }
    .sc-store-row-diff { 
      font-size: 11px; color: rgba(255,255,255,0.5); 
      text-align: right; margin-top: 2px;
      font-weight: 500;
    }

    .sc-store-worst {
      background: rgba(40, 15, 15, 0.6);
      border: 1px solid rgba(239, 83, 80, 0.2);
      border-radius: 16px;
      padding: 16px 20px;
      display: flex; align-items: center; justify-content: space-between;
      transition: all 0.25s;
    }
    .sc-store-worst:hover {
      background: rgba(50, 20, 20, 0.7);
      border-color: rgba(239, 83, 80, 0.3);
    }
    .sc-store-worst-name { 
      font-size: 14px; font-weight: 600; color: #ef5350; 
      display: flex; align-items: center; gap: 10px; 
    }
    .sc-store-worst-label { 
      font-size: 10px; color: #c62828; font-weight: 700; letter-spacing: 1px; 
    }
    .sc-store-worst-price { 
      font-family: 'Unbounded', sans-serif; font-weight: 700; font-size: 15px; 
      color: #ef5350; text-align: right; 
    }
    .sc-store-worst-diff { font-size: 11px; color: #ef5350; margin-top: 2px; font-weight: 500; }

    /* Products - enhanced */
    .sc-products { display: flex; flex-direction: column; gap: 10px; }
    .sc-product {
      background: rgba(18, 18, 22, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 18px;
      padding: 14px; display: flex; align-items: center; gap: 14px;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .sc-product:hover { 
      background: rgba(25, 25, 32, 0.95);
      border-color: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }
    .sc-product-img {
      width: 56px; height: 56px; 
      background: linear-gradient(135deg, #1a1a22 0%, #252530 100%);
      border-radius: 14px;
      flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      font-size: 26px; overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .sc-product-img img { width: 48px; height: 48px; object-fit: contain; }
    .sc-product-name { 
      font-size: 14px; font-weight: 600; color: #eee; 
      margin-bottom: 4px; 
    }
    .sc-product-qty { font-size: 12px; color: rgba(255,255,255,0.4); }
    .sc-product-total {
      margin-left: auto; flex-shrink: 0;
      font-family: 'Unbounded', sans-serif; font-weight: 700; font-size: 16px; 
      color: #00e676;
      background: rgba(0, 200, 83, 0.1);
      padding: 6px 12px; border-radius: 10px;
    }

    /* CTA section - premium */
    .sc-cta-block {
      margin: 0 16px; 
      background: linear-gradient(145deg, rgba(20, 20, 28, 0.9) 0%, rgba(15, 15, 20, 0.95) 100%);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 24px;
      padding: 28px; text-align: center;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.3),
        0 0 0 1px rgba(255, 255, 255, 0.03) inset;
    }
    .sc-cta-emoji { 
      font-size: 40px; margin-bottom: 16px; 
      display: inline-block;
      animation: bounce 2s ease-in-out infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    .sc-cta-title {
      font-family: 'Unbounded', sans-serif; font-weight: 900; font-size: 20px;
      color: #fff; margin-bottom: 10px; line-height: 1.3;
      letter-spacing: -0.3px;
    }
    .sc-cta-desc { 
      font-size: 14px; color: rgba(255,255,255,0.5); 
      line-height: 1.6; margin-bottom: 24px; 
    }
    .sc-features { 
      display: flex; flex-direction: column; gap: 10px; 
      margin-bottom: 24px; text-align: left; 
    }
    .sc-feature {
      display: flex; align-items: center; gap: 12px;
      background: rgba(30, 30, 38, 0.6);
      border-radius: 14px; padding: 14px 18px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      transition: all 0.2s;
    }
    .sc-feature:hover {
      background: rgba(35, 35, 45, 0.8);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .sc-feature-icon { 
      font-size: 20px; flex-shrink: 0;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0, 200, 83, 0.1);
      border-radius: 10px;
    }
    .sc-feature-text { font-size: 13px; color: #bbb; line-height: 1.4; }
    .sc-feature-text strong { color: #fff; font-weight: 600; }

    /* Fixed bottom CTA - enhanced */
    .sc-footer-cta {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 10;
      padding: 16px 20px 28px;
      background: linear-gradient(to top, rgba(5,5,7,0.98) 40%, rgba(5,5,7,0.9) 70%, transparent);
    }
    .sc-btn-main {
      display: block; width: 100%; max-width: 480px; margin: 0 auto;
      background: linear-gradient(135deg, #00c853 0%, #00a844 100%);
      color: #0a0a0a;
      padding: 14px 20px; border-radius: 14px; border: none; cursor: pointer;
      font-family: 'Unbounded', sans-serif; font-weight: 900; font-size: 14px;
      letter-spacing: 0.5px; text-align: center; text-decoration: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 
        0 6px 24px rgba(0, 200, 83, 0.35),
        0 0 0 1px rgba(255, 255, 255, 0.1) inset;
      position: relative;
      overflow: hidden;
      text-transform: uppercase;
    }
    .sc-btn-main::before {
      content: '';
      position: absolute; top: 0; left: -100%;
      width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s;
    }
    .sc-btn-main:hover { 
      transform: translateY(-2px); 
      box-shadow: 
        0 12px 36px rgba(0, 200, 83, 0.45),
        0 0 0 1px rgba(255, 255, 255, 0.15) inset;
    }
    .sc-btn-main:hover::before { left: 100%; }
    .sc-btn-sub { 
      font-size: 11px; color: rgba(0,0,0,0.45); margin-top: 4px; 
      display: block; font-family: 'DM Sans', sans-serif; font-weight: 500; 
      text-transform: none;
    }

    /* Loading & Error - enhanced */
    .sc-loading {
      position: fixed; inset: 0; z-index: 9999;
      background: #050507; display: flex; align-items: center; justify-content: center;
    }
    .sc-loader {
      position: relative;
      width: 64px; height: 64px;
    }
    .sc-loader::before, .sc-loader::after {
      content: ''; position: absolute; inset: 0;
      border-radius: 50%;
      border: 3px solid transparent;
    }
    .sc-loader::before {
      border-top-color: #00c853;
      animation: spin 1s linear infinite;
    }
    .sc-loader::after {
      border-right-color: #2979ff;
      animation: spin 1.5s linear infinite reverse;
      inset: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .sc-loading-text {
      font-family: 'Unbounded', sans-serif; font-size: 14px; color: rgba(255,255,255,0.4);
      margin-top: 24px; text-align: center;
      letter-spacing: 0.5px;
    }

    .sc-error {
      position: fixed; inset: 0; z-index: 9999;
      background: #050507; display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .sc-error-box {
      max-width: 380px; text-align: center;
    }
    .sc-error-emoji { 
      font-size: 64px; margin-bottom: 20px; 
      animation: shake 0.5s ease-in-out;
    }
    @keyframes shake {
      0%, 100% { transform: rotate(0); }
      25% { transform: rotate(-10deg); }
      75% { transform: rotate(10deg); }
    }
    .sc-error-title {
      font-family: 'Unbounded', sans-serif; font-weight: 900; font-size: 26px;
      color: #fff; margin-bottom: 10px;
      letter-spacing: -0.5px;
    }
    .sc-error-msg { font-size: 15px; color: rgba(255,255,255,0.5); margin-bottom: 28px; }

    /* Divider */
    .sc-divider { 
      height: 1px; 
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); 
      margin: 8px 16px 16px; 
    }

    /* Responsive adjustments */
    @media (max-width: 400px) {
      .sc-hero { padding: 24px 18px 22px; }
      .sc-savings-amount { font-size: 36px; }
      .sc-avatar { width: 60px; height: 60px; font-size: 26px; }
      .sc-hero-name { font-size: 20px; }
      .sc-store-row, .sc-product { padding: 12px 14px; }
    }
  `;

  // ── Render: Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="sc-root">
          <div className="sc-loading">
            <div style={{ textAlign: 'center' }}>
              <div className="sc-loader" />
              <p className="sc-loading-text">Cargando tu chango...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Render: Error ─────────────────────────────────────────────────────────
  if (error || !cart) {
    return (
      <>
        <style>{styles}</style>
        <div className="sc-root">
          <div className="sc-error">
            <div className="sc-error-box">
              <div className="sc-error-emoji">😢</div>
              <h1 className="sc-error-title">¡Ups!</h1>
              <p className="sc-error-msg">{error || 'Chango no encontrado'}</p>
              <button className="sc-btn-main" onClick={() => navigate('/')}>
                Volver a TradingChango
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Data derived ──────────────────────────────────────────────────────────
  const best = storeResults[0];
  const worst = storeResults[storeResults.length - 1];
  const middleStores = storeResults.slice(1, -1);
  const totalUnits = cartItemsWithBestPrice.reduce((s, i) => s + i.quantity, 0);
  
  // El total real del mejor store
  const calculatedTotal = best ? best.total : 0;
  
  // Usar el savings del mejor store directamente (ya calculado con la lógica correcta)
  const calculatedSavings = best ? best.savings : 0;
  
  const shareTitle = `${cart.user_name} está ahorrando ${formatPrice(calculatedSavings)} en su Chango`;
  const storeEmoji = (key: string) => STORES.find(s => s.key === key)?.emoji ?? '🏪';

  // ── Render: Full ──────────────────────────────────────────────────────────
  return (
    <>
      <SEOTags
        title={`${cart.user_name} ahorró ${formatPrice(calculatedSavings)} comparando precios en TradingChango`}
        description={shareTitle}
        ogImage={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`}
      />
      <style>{styles}</style>

      <div className="sc-root">
        {/* Enhanced animated background */}
        <div className="sc-bg">
          <div className="sc-orb sc-orb-1" />
          <div className="sc-orb sc-orb-2" />
          <div className="sc-orb sc-orb-3" />
          <div className="sc-orb sc-orb-4" />
        </div>

        <div className={`sc-content ${visible ? 'visible' : ''}`}>

          {/* ── Header ── */}
          <header className="sc-header">
            <div className="sc-logo" onClick={() => navigate('/')}>
              <div className="sc-logo-mark">
                <i className="fa-solid fa-cart-shopping sc-logo-icon"></i>
                <i className="fa-solid fa-arrow-trend-up sc-logo-trend"></i>
              </div>
              <span className="sc-logo-text">TradingChango</span>
            </div>
            <Link
              to={`/?utm_source=${utmSource}&utm_campaign=shared_cart_header`}
              className="sc-header-cta"
            >
              Crear el mío →
            </Link>
          </header>

          {/* ── Hero ── */}
          <div className="sc-hero">
            <div className="sc-avatar-wrap">
              <div className="sc-avatar-glow" />
              <div className="sc-avatar">🛒</div>
            </div>
              <div className="sc-hero-name" style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
              {cart.user_name}
            </div>
            <p className="sc-hero-sub" style={{ textTransform: 'uppercase' }}>
              ¡MIRÁ CUANTO AHORRÉ HOY! ¿VOS CUÁNTO ESTÁS PAGANDO DE MÁS?
            </p>

            <div className="sc-savings-box">
              <div className="sc-savings-label">Ahorro total</div>
              <div className="sc-savings-amount">${formatPrice(calculatedSavings)}</div>
              <div className="sc-savings-desc">eligiendo el supermercado más barato</div>
            </div>

            <div className="sc-stats">
              <div className="sc-stat">
                <div className="sc-stat-val">{cartItems.length}</div>
                <div className="sc-stat-lbl">productos</div>
              </div>
              <div className="sc-stat">
                <div className="sc-stat-val">{totalUnits}</div>
                <div className="sc-stat-lbl">unidades</div>
              </div>
              {best && (
                <div className="sc-stat">
                  <div className="sc-stat-val" style={{ color: '#00e676' }}>{best.name.split(' ')[0]}</div>
                  <div className="sc-stat-lbl">mejor precio</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Store comparison ── */}
          {storeResults.length > 0 && (
            <div className="sc-section">
              <div className="sc-section-title">Comparación de supermercados</div>
              <div className="sc-stores">

                {/* Best */}
                {best && (
                  <div className="sc-store-best">
                    <div className="sc-store-left">
                      <div className="sc-store-icon">{storeEmoji(best.key)}</div>
                      <div>
                        <div className="sc-store-name-best">{best.name}</div>
                        <div className="sc-store-tag">La opción ganadora 🏆</div>
                      </div>
                    </div>
                    <div className="sc-store-price-best">${formatPrice(best.total)}</div>
                  </div>
                )}

                {/* Middle stores */}
                {middleStores.map(store => (
                  <div key={store.key} className="sc-store-row">
                    <span className="sc-store-row-name">
                      {storeEmoji(store.key)} {store.name}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <div className="sc-store-row-price">${formatPrice(store.total)}</div>
                      {best && <div className="sc-store-row-diff">+${formatPrice(store.total - best.total)} más caro</div>}
                    </div>
                  </div>
                ))}

                {/* Worst */}
                {worst && worst.key !== best?.key && (
                  <div className="sc-store-worst">
                    <div>
                      <div className="sc-store-worst-label">MÁS CARO</div>
                      <div className="sc-store-worst-name">
                        {storeEmoji(worst.key)} {worst.name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="sc-store-worst-price">${formatPrice(worst.total)}</div>
                      {best && <div className="sc-store-worst-diff">+${formatPrice(worst.total - best.total)} vs {best.name}</div>}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          <div className="sc-divider" />

          {/* ── Products list ── */}
          <div className="sc-section">
            <div className="sc-section-title">Productos en el chango</div>
            <div className="sc-products">
              {cartItemsWithBestPrice.map(({ id, quantity, product, bestStorePrice, total }) => (
                <div key={id} className="sc-product">
                  <div className="sc-product-img">
                    {product?.imagen_url
                      ? <img src={product.imagen_url} alt="" />
                      : '🛒'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sc-product-name" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {product?.nombre}
                    </div>
                    <div className="sc-product-qty">{quantity} × ${formatPrice(bestStorePrice)}</div>
                  </div>
                  <div className="sc-product-total">${formatPrice(total)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="sc-divider" />

          {/* ── CTA block ── */}
          <div className="sc-cta-block">
            <div className="sc-cta-emoji">🚀</div>
            <h2 className="sc-cta-title">¿Cuánto estás pagando de más?</h2>
            <p className="sc-cta-desc">
              TradingChango compara los precios de todos los supermercados para que siempre pagues lo mínimo.
            </p>
            <div className="sc-features">
              <div className="sc-feature">
                <span className="sc-feature-icon">🔍</span>
                <span className="sc-feature-text"><strong>Buscá cualquier producto</strong> y mirá su precio en todos los supers al instante</span>
              </div>
              <div className="sc-feature">
                <span className="sc-feature-icon">📉</span>
                <span className="sc-feature-text"><strong>Seguí precios en tiempo real</strong> y enterate cuándo bajan o suben</span>
              </div>
              <div className="sc-feature">
                <span className="sc-feature-icon">🛒</span>
                <span className="sc-feature-text"><strong>Armá tu chango inteligente</strong> y siempre comprá donde más ahorrás</span>
              </div>
              <div className="sc-feature">
                <span className="sc-feature-icon">💸</span>
                <span className="sc-feature-text"><strong>100% gratis</strong> · Listo para usar</span>
              </div>
            </div>
          </div>

          {/* spacing for fixed footer */}
          <div style={{ height: 32 }} />
        </div>

        {/* ── Fixed bottom CTA ── */}
        <div className="sc-footer-cta">
          <button className="sc-btn-main" onClick={goHome}>
            Crear mi Chango y ahorrar
            <span className="sc-btn-sub">Es gratis · Solo tarda 2 minutos</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default SharedCartView;
