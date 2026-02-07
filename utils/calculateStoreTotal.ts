import { CartItem } from '../types';

const sanitizePrice = (price: any): number => {
  if (price === null || price === undefined) return 0;
  let num: number;
  if (typeof price === 'number') {
    num = price;
  } else if (typeof price === 'string') {
    const cleanedString = price.replace(/[^0-9.,-]/g, '').replace(',', '.');
    num = parseFloat(cleanedString);
  } else {
    return 0;
  }
  return Number.isFinite(num) ? num : 0;
};

const getOfferThreshold = (offerString: string): number | null => {
  if (!offerString) return null;
  const lower = String(offerString).toLowerCase();

  // Caso: "3x2", "4 x 3"
  const xForY = lower.match(/(\d+)\s*x\s*(\d+)/);
  if (xForY) return parseInt(xForY[1], 10);

  // Caso: "2do al 70%", "2da al 50%"
  const nthUnit = lower.match(/(\d+)(?:do|da|ra|ro)\s*al/);
  if (nthUnit) return parseInt(nthUnit[1], 10);

  return null;
};

export const calculateStoreTotal = (cartItems: CartItem[], storeKey: string): { subtotal: number; total: number; discount: number } => {
  let subtotal = 0;
  let total = 0;

  cartItems.forEach((item) => {
    const pRegular = sanitizePrice(item[`pr_${storeKey}` as keyof CartItem]);
    const pPromo = sanitizePrice(item[`p_${storeKey}` as keyof CartItem]);
    const quantity = Math.max(0, Number(item.quantity) || 0);

    if (pRegular <= 0 || quantity <= 0) return;

    // 1. SUBTOTAL: Siempre precio regular * cantidad
    subtotal += pRegular * quantity;

    // 2. BUSCAR OFERTA (Insensible a mayúsculas en la llave)
    // Buscamos si existe "Carrefour", "carrefour" o "CARREFOUR" en el objeto
    let ofertaTexto = "";
    if (item.oferta_gondola) {
      const actualKey = Object.keys(item.oferta_gondola).find(
        (key) => key.toLowerCase() === storeKey.toLowerCase()
      );
      if (actualKey) {
        ofertaTexto = String(item.oferta_gondola[actualKey as keyof typeof item.oferta_gondola] || "");
      }
    }

    const threshold = getOfferThreshold(ofertaTexto);
    const pFinal = pPromo > 0 ? pPromo : pRegular;

    let itemTotal = 0;

    if (threshold !== null) {
      // --- CASO CON CONDICIÓN (2do al 70%, 3x2, etc.) ---
      if (quantity >= threshold) {
        const unitsInPromoGroups = Math.floor(quantity / threshold) * threshold;
        const leftoverUnits = quantity % threshold;
        itemTotal = (unitsInPromoGroups * pFinal) + (leftoverUnits * pRegular);
      } else {
        // SI NO CUMPLE LA CONDICIÓN (Ej: tiene 1 y la promo es 2do al...)
        // USAMOS PRECIO REGULAR
        itemTotal = quantity * pRegular;
      }
    } else {
      // --- CASO SIN CONDICIÓN O CAMPO VACÍO ---
      // Se aplica p_ a todo
      itemTotal = quantity * pFinal;
    }

    total += itemTotal;
  });

  const finalSubtotal = Number(subtotal.toFixed(2));
  const finalTotal = Number(total.toFixed(2));

  return {
    subtotal: finalSubtotal,
    total: finalTotal,
    discount: Math.max(0, Number((finalSubtotal - finalTotal).toFixed(2))),
  };
};