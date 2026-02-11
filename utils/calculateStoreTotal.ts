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

    // 1. Subtotal: Siempre se calcula con el precio regular.
    subtotal += pRegular * quantity;

    // 2. Total Estimado: Lógica de promociones.
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
    let itemTotal = 0;

    if (threshold !== null && pPromo > 0) {
      // --- CASO CON PROMOCIÓN POR CANTIDAD (e.g., 3x2, 2da al 70%) ---
      if (quantity >= threshold) {
        // La cantidad es suficiente para activar la promo.
        const promoGroupCount = Math.floor(quantity / threshold);
        const itemsInPromo = promoGroupCount * threshold;
        const remainingItems = quantity % threshold;
        
        // p_ es el precio final por unidad DENTRO de la promo.
        itemTotal = (itemsInPromo * pPromo) + (remainingItems * pRegular);
      } else {
        // No se alcanza la cantidad mínima para la promo, se usa precio regular para todo.
        itemTotal = quantity * pRegular;
      }
    } else {
      // --- CASO SIN PROMOCIÓN POR CANTIDAD o SIN PRECIO PROMO ---
      // Se usa el precio regular. Si hay un p_ (ej. "precio más bajo"), se podría considerar,
      // pero para ser estrictos con la regla, nos basamos en la oferta_gondola.
      // Si quieres que p_ se aplique siempre que sea más bajo, incluso sin oferta_gondola,
      // la línea sería: const priceToUse = (pPromo > 0 && pPromo < pRegular) ? pPromo : pRegular;
      // itemTotal = quantity * priceToUse;
      itemTotal = quantity * pRegular;
    }

    total += itemTotal;
  });

  const finalSubtotal = Number(subtotal.toFixed(2));
  const finalTotal = Number(total.toFixed(2));
  const discount = Math.max(0, Number((finalSubtotal - finalTotal).toFixed(2)));

  return {
    subtotal: finalSubtotal,
    total: finalTotal,
    discount: discount,
  };
};