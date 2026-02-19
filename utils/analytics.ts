/**
 * Utilidad para tracking de analytics (GA4 y Clarity)
 * 
 * Funciones para enviar eventos a Google Analytics 4 y Microsoft Clarity
 */

// ID de GA4
const GA_MEASUREMENT_ID = 'G-RVLYJ69FYD';

/**
 * Inicializar la integración Clarity-GA4
 * Debe llamarse después de que clarity está inicializado
 */
export const initClarityGA4Integration = (): void => {
  if (typeof window === 'undefined') return;
  
  // @ts-ignore
  const clarity = window.clarity;
  if (clarity) {
    clarity('set', 'GA_Measurement_Id', GA_MEASUREMENT_ID);
    // console.log('[Analytics] Clarity-GA4 integración inicializada');
  }
};

/**
 * Enviar evento a GA4
 */
export const sendGA4Event = (eventName: string, params?: Record<string, any>): void => {
  if (typeof window === 'undefined') return;
  
  // @ts-ignore
  const gtag = window.gtag;
  if (gtag) {
    gtag('event', eventName, params);
    // console.log('[GA4] Evento enviado:', eventName, params);
  } else {
    console.warn('[GA4] gtag no disponible');
  }
};

/**
 * Enviar evento a Clarity
 */
export const sendClarityEvent = (eventName: string, params?: Record<string, any>): void => {
  if (typeof window === 'undefined') return;
  
  // @ts-ignore
  const clarity = window.clarity;
  if (clarity) {
    clarity('event', eventName, params);
    // console.log('[Clarity] Evento enviado:', eventName, params);
  } else {
    console.warn('[Clarity] no disponible');
  }
};

/**
 * Evento: Registro completado
 */
export const trackSignUp = (method: string = 'email'): void => {
  sendGA4Event('sign_up', { method });
  sendClarityEvent('sign_up', { method });
};

/**
 * Evento: Búsqueda realizada
 */
export const trackSearch = (searchTerm: string): void => {
  sendGA4Event('search', { search_term: searchTerm });
  sendClarityEvent('search', { search_term: searchTerm });
};

/**
 * Evento: Agregado a favoritos/wishlist
 */
export const trackAddToWishlist = (itemId: number, itemName: string, category?: string): void => {
  sendGA4Event('add_to_wishlist', {
    items: [{
      item_id: itemId.toString(),
      item_name: itemName,
      item_category: category || 'general',
    }]
  });
  sendClarityEvent('add_to_wishlist', {
    item_id: itemId,
    item_name: itemName,
    category: category || 'general',
  });
};

/**
 * Evento: Vista de chango compartido (viralidad)
 */
export const trackSharedCartView = (cartId: string, userName: string, totalSavings: number, itemCount: number, source: string): void => {
  sendGA4Event('view_shared_chango', {
    cart_id: cartId,
    user_name: userName,
    total_savings: totalSavings,
    item_count: itemCount,
    traffic_source: source,
  });
  sendClarityEvent('view_shared_chango', {
    cart_id: cartId,
    user_name: userName,
    total_savings: totalSavings,
    item_count: itemCount,
    traffic_source: source,
  });
  // console.log('[Analytics] Vista de chango compartido:', { cartId, userName, totalSavings, itemCount, source });
};

/**
 * Configurar propiedades de usuario
 */
export const setUserProperties = (userId: string, isRegistered: boolean): void => {
  // GA4 User Properties - usando config
  // @ts-ignore
  const gtag = window.gtag;
  if (gtag) {
    gtag('config', GA_MEASUREMENT_ID, {
      user_properties: {
        user_type: isRegistered ? 'registered' : 'guest',
      },
      user_id: userId,
    });
  }
  
  // Clarity User ID
  // @ts-ignore
  const clarity = window.clarity;
  if (clarity) {
    clarity('identify', userId, {
      user_type: isRegistered ? 'registered' : 'guest',
    });
  }
};

/**
 * Evento: Vista de producto
 */
export const trackViewItem = (itemId: number, itemName: string, price?: number, category?: string): void => {
  sendGA4Event('view_item', {
    items: [{
      item_id: itemId.toString(),
      item_name: itemName,
      price: price || 0,
      item_category: category || 'general',
    }]
  });
  sendClarityEvent('view_item', {
    item_id: itemId,
    item_name: itemName,
    price: price || 0,
    category: category || 'general',
  });
};

/**
 * Evento: Error de aplicación
 */
export const trackError = (errorType: string, errorMessage: string): void => {
  sendGA4Event('exception', {
    description: `${errorType}: ${errorMessage}`,
    fatal: false,
  });
  sendClarityEvent('error', {
    error_type: errorType,
    error_message: errorMessage,
  });
};
