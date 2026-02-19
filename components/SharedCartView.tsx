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
        if (!item.product) {
          hasAllItems = false;
          return;
        }
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
        // Debe tener URL Y precio válido (mayor a 0)
        if (!storeUrl || storeUrl === '' || price <= 0) hasAllItems = false;
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
      // Si el precio es 0, usar minPrice como fallback
      const unitPrice = item.quantity > 0 ? price / item.quantity : 0;
      const bestStorePrice = unitPrice > 0 ? unitPrice : item.minPrice;
      const finalTotal = unitPrice > 0 ? price : item.minPrice * item.quantity;
      return {
        ...item,
        bestStorePrice,
        total: finalTotal,
      };
    });
  }, [cartItems, storeResults]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const goHome = () => navigate(`/?utm_source=${utmSource}&utm_campaign=shared_cart_cta`);

  // ── Minimal White Styles ───────────────────────────────────────────────────────
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    .sc-root *, .sc-root *::before, .sc-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .sc-root {
      position: fixed; inset: 0; z-index: 9999;
      overflow-y: auto; overflow-x: hidden;
      font-family: 'Inter', -apple-system, sans-serif;
      background: #ffffff;
      color: #111827;
    }
    
    /* Rain of balloons/money */
    .sc-rain {
      position: fixed; inset: 0; z-index: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .sc-rain-item {
      position: absolute;
      top: -50px;
      font-size: 20px;
      opacity: 0.12;
      animation: rainFall 8s linear infinite;
    }
    @keyframes rainFall {
      0% { transform: translateY(-30px) rotate(0deg); opacity: 0; }
      10% { opacity: 0.12; }
      90% { opacity: 0.12; }
      100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
    }

    .sc-content {
      position: relative; z-index: 1;
      max-width: 520px; margin: 0 auto;
      padding: 0 0 110px;
      opacity: 0; transform: translateY(32px) scale(0.98);
      transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sc-content.visible { opacity: 1; transform: translateY(0) scale(1); }

    /* Cards - white minimal */
    .sc-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    /* Header */
    .sc-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 16px 14px;
    }
    .sc-logo {
      display: flex; align-items: center; gap: 8px;
      cursor: pointer; text-decoration: none;
    }
    .sc-logo-img {
      width: 32px; height: 32px;
      border-radius: 8px;
      object-fit: contain;
    }
    .sc-logo-text {
      font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
      font-weight: 700 !important; font-size: 18px !important;
      letter-spacing: -0.5px !important;
      color: #111827 !important;
    }
    .sc-header-cta {
      background: #111827;
      color: #ffffff;
      padding: 10px 14px; border-radius: 8px;
      font-weight: 600; font-size: 12px; text-decoration: none;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    .sc-header-cta:hover { 
      background: #374151; 
    }

    /* Hero card - minimal white */
    .sc-hero {
      margin: 12px 16px 12px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 22px 20px;
      text-align: center;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .sc-avatar-wrap {
      position: relative;
      margin-bottom: 12px;
    }
    .sc-avatar-glow {
      display: none;
    }
    .sc-avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: #f3f4f6;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; margin: 0 auto;
      border: 2px solid #e5e7eb;
    }
    .sc-hero-name {
      font-weight: 700; font-size: 20px;
      color: #111827; margin-bottom: 4px;
    }
    .sc-hero-sub { 
      font-size: 13px; color: #6b7280; 
      margin-bottom: 14px; 
    }

    /* Savings box - minimal white */
    .sc-savings-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px; padding: 14px 18px;
      margin-bottom: 12px;
    }
    .sc-savings-label {
      font-size: 11px; font-weight: 600; letter-spacing: 1px;
      text-transform: uppercase; color: #16a34a; margin-bottom: 2px;
    }
    .sc-savings-amount {
      font-weight: 700; font-size: 32px;
      color: #16a34a; letter-spacing: -0.5px; line-height: 1;
    }
    .sc-savings-desc { 
      font-size: 12px; color: #6b7280; margin-top: 2px; 
    }
    .sc-savings-disclaimer {
      font-size: 10px; color: #9ca3af; margin-top: 8px;
      line-height: 1.3;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
    }

    /* Stats - minimal */
    .sc-stats {
      display: flex; gap: 10px;
    }
    .sc-stat {
      flex: 1; 
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 12px 8px; text-align: center;
      transition: all 0.2s;
    }
    .sc-stat:hover {
      border-color: #d1d5db;
    }
    .sc-stat-val {
      font-weight: 600; font-size: 18px;
      color: #111827;
    }
    .sc-stat-lbl { font-size: 11px; color: #6b7280; margin-top: 2px; }

    /* Section */
    .sc-section { margin: 0 12px 8px; }
    .sc-section-title {
      font-size: 9px; font-weight: 700; letter-spacing: 2px;
      text-transform: uppercase; color: #6b7280; 
      margin-bottom: 6px; padding-left: 4px;
      display: flex; align-items: center; gap: 8px;
    }
    .sc-section-title::after {
      content: ''; flex: 1; height: 1px;
      background: linear-gradient(90deg, #e5e7eb, transparent);
    }

    /* Store comparison - minimal */
    .sc-stores { display: flex; flex-direction: column; gap: 8px; }

    .sc-store-best {
      background: #f0fdf4;
      border: 1px solid #16a34a;
      border-radius: 12px; padding: 14px 16px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .sc-store-best { position: relative; }
    .sc-store-left { display: flex; align-items: center; gap: 10px; }
    .sc-store-icon {
      width: 32px; height: 32px; background: #dcfce7;
      border-radius: 8px; display: flex; align-items: center;
      justify-content: center; font-size: 16px;
    }
    .sc-store-name-best {
      font-weight: 600; font-size: 15px; color: #111827;
    }
    .sc-store-tag {
      font-size: 11px; font-weight: 500; color: #16a34a; margin-top: 1px;
    }
    .sc-store-price-best {
      text-align: right;
    }
    .sc-store-price-old {
      font-size: 12px; color: #9ca3af; text-decoration: line-through; margin-bottom: 2px;
    }
    .sc-store-price-new {
      font-weight: 600; font-size: 18px; color: #16a34a;
    }

    .sc-store-row {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex; align-items: center; justify-content: space-between;
      transition: all 0.2s;
    }
    .sc-store-row:hover { 
      border-color: #d1d5db;
    }
    .sc-store-row-name { 
      font-size: 15px; font-weight: 500; color: #374151; 
      display: flex; align-items: center; gap: 10px; 
    }
    .sc-store-row-price { 
      font-weight: 600; font-size: 15px; color: #111827; 
    }
    .sc-store-row-diff { 
      font-size: 12px; color: #6b7280; 
      text-align: right; margin-top: 2px;
    }

    .sc-store-worst {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 12px;
      padding: 12px 14px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .sc-store-worst:hover {
      border-color: #fca5a5;
    }
    .sc-store-worst-name { 
      font-size: 14px; font-weight: 500; color: #dc2626; 
      display: flex; align-items: center; gap: 10px; 
    }
    .sc-store-worst-label { 
      font-size: 8px; color: #dc2626; font-weight: 700; letter-spacing: 0.5px; 
    }
    .sc-store-worst-price { 
      font-weight: 600; font-size: 13px; 
      color: #dc2626; text-align: right; 
    }
    .sc-store-worst-diff { font-size: 10px; color: #dc2626; margin-top: 1px; }

    /* Products - minimal */
    .sc-products { display: flex; flex-direction: column; gap: 8px; }
    .sc-product {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 12px; display: flex; align-items: center; gap: 12px;
      transition: all 0.2s;
    }
    .sc-product:hover { 
      border-color: #d1d5db;
    }
    .sc-product-img {
      width: 48px; height: 48px; 
      background: #f3f4f6;
      border-radius: 10px;
      flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      font-size: 20px; overflow: hidden;
    }
    .sc-product-img img { width: 36px; height: 36px; object-fit: contain; }
    .sc-product-name { 
      font-size: 13px; font-weight: 500; color: #111827; 
      margin-bottom: 1px; 
    }
    .sc-product-qty { font-size: 12px; color: #6b7280; }
    .sc-product-total {
      margin-left: auto; flex-shrink: 0;
      font-weight: 600; font-size: 13px; 
      color: #16a34a;
      background: #f0fdf4;
      padding: 4px 10px; border-radius: 6px;
    }

    /* CTA section - minimal */
    .sc-cta-block {
      margin: 0 16px; 
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 20px; text-align: center;
    }
    .sc-cta-emoji { 
      font-size: 28px; margin-bottom: 10px; 
    }
    .sc-cta-title {
      font-weight: 700; font-size: 16px;
      color: #111827; margin-bottom: 8px; line-height: 1.3;
    }
    .sc-cta-desc { 
      font-size: 13px; color: #6b7280; 
      line-height: 1.5; margin-bottom: 14px; 
    }
    .sc-features { 
      display: flex; flex-direction: column; gap: 8px; 
      margin-bottom: 14px; text-align: left; 
    }
    .sc-feature {
      display: flex; align-items: center; gap: 10px;
      background: #f9fafb;
      border-radius: 10px; padding: 12px 14px;
      border: 1px solid #e5e7eb;
      transition: all 0.2s;
    }
    .sc-feature:hover {
      border-color: #d1d5db;
    }
    .sc-feature-icon { 
      font-size: 18px; flex-shrink: 0;
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      background: #f0fdf4;
      border-radius: 8px;
    }
    .sc-feature-text { font-size: 12px; color: #4b5563; line-height: 1.4; }
    .sc-feature-text strong { color: #111827; font-weight: 600; }

    /* Fixed bottom CTA - minimal white */
    .sc-footer-cta {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 10;
      padding: 14px 16px 24px;
      background: white;
      border-top: 1px solid #e5e7eb;
    }
    .sc-btn-main {
      display: block; width: 100%; max-width: 520px; margin: 0 auto;
      background: #111827;
      color: white;
      padding: 16px 24px; border-radius: 10px; border: none; cursor: pointer;
      font-weight: 600; font-size: 14px;
      text-align: center; text-decoration: none;
      transition: all 0.2s;
      text-transform: uppercase;
    }
    .sc-btn-main:hover { 
      background: #374151; 
    }
    .sc-btn-sub { 
      font-size: 11px; color: #9ca3af; margin-top: 4px; 
      display: block; font-weight: 500; 
      text-transform: none;
    }

    /* Loading & Error - minimal */
    .sc-loading {
      position: fixed; inset: 0; z-index: 9999;
      background: #ffffff; display: flex; align-items: center; justify-content: center;
    }
    .sc-loader {
      position: relative;
      width: 48px; height: 48px;
    }
    .sc-loader::before, .sc-loader::after {
      content: ''; position: absolute; inset: 0;
      border-radius: 50%;
      border: 3px solid #e5e7eb;
    }
    .sc-loader::before {
      border-top-color: #16a34a;
      animation: spin 1s linear infinite;
    }
    .sc-loader::after {
      border-right-color: #3b82f6;
      animation: spin 1.5s linear infinite reverse;
      inset: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .sc-loading-text {
      font-size: 13px; color: #6b7280;
      margin-top: 20px; text-align: center;
    }

    .sc-error {
      position: fixed; inset: 0; z-index: 9999;
      background: #ffffff; display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .sc-error-box {
      max-width: 320px; text-align: center;
    }
    .sc-error-emoji { 
      font-size: 48px; margin-bottom: 16px; 
    }
    .sc-error-title {
      font-weight: 700; font-size: 20px;
      color: #111827; margin-bottom: 8px;
    }
    .sc-error-msg { font-size: 14px; color: #6b7280; margin-bottom: 24px; }

    /* Divider */
    .sc-divider { 
      height: 1px; 
      background: #e5e7eb; 
      margin: 12px 16px; 
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
        {/* Floating savings elements - rain */}
        <div className="sc-rain">
          <div className="sc-rain-item" style={{left: '5%', animationDelay: '0s'}}>🎈</div>
          <div className="sc-rain-item" style={{left: '15%', animationDelay: '2s'}}>💰</div>
          <div className="sc-rain-item" style={{left: '25%', animationDelay: '4s'}}>🎈</div>
          <div className="sc-rain-item" style={{left: '35%', animationDelay: '1s'}}>💵</div>
          <div className="sc-rain-item" style={{left: '45%', animationDelay: '3s'}}>🎈</div>
          <div className="sc-rain-item" style={{left: '55%', animationDelay: '5s'}}>💰</div>
          <div className="sc-rain-item" style={{left: '65%', animationDelay: '0.5s'}}>🎈</div>
          <div className="sc-rain-item" style={{left: '75%', animationDelay: '2.5s'}}>💵</div>
          <div className="sc-rain-item" style={{left: '85%', animationDelay: '4.5s'}}>🎈</div>
          <div className="sc-rain-item" style={{left: '95%', animationDelay: '1.5s'}}>💰</div>
        </div>

        <div className={`sc-content ${visible ? 'visible' : ''}`}>

          {/* ── Header ── */}
          <header className="sc-header">
            <div className="sc-logo" onClick={() => navigate('/')}>
              <img src="/logo192.png" alt="TradingChango" className="sc-logo-img" />
              <span className="sc-logo-text">Tradingchango</span>
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
            <p className="sc-hero-sub" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
              ¡MIRÁ CUANTO AHORRÉ HOY! ¿VOS CUÁNTO ESTÁS PAGANDO DE MÁS?
            </p>

            <div className="sc-savings-box">
              <div className="sc-savings-label">Ahorro total</div>
              <div className="sc-savings-amount">${formatPrice(calculatedSavings)}</div>
              <div className="sc-savings-desc">eligiendo el supermercado más barato</div>
              <div className="sc-savings-disclaimer">Valores estimados. La aplicación de beneficios y el precio final en caja dependen exclusivamente de las condiciones vigentes de cada comercio y entidad emisora.</div>
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
                  <div className="sc-stat-val" style={{ color: '#16a34a' }}>{best.name.split(' ')[0]}</div>
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
                    <div className="sc-store-price-best">
                      {worst && worst.total > best.total && (
                        <div className="sc-store-price-old">${formatPrice(worst.total)}</div>
                      )}
                      <div className="sc-store-price-new">${formatPrice(best.total)}</div>
                    </div>
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
