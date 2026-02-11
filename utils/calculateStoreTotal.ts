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
  const xForY = lower.match(/(\d+)\s*x\s*(\d+)/);
  if (xForY) return parseInt(xForY[1], 10);
  const nthUnit = lower.match(/(\d+)(?:do|da|ra|ro|ta|to)\s*al/);
  if (nthUnit) return parseInt(nthUnit[1], 10);
  return null;
};

export const calculateStoreTotal = (
  cartItems: CartItem[], 
  storeKey: string
): { subtotal: number; total: number; discount: number } => {
  let subtotalAcc = 0;
  let totalAcc = 0;

  cartItems.forEach((item) => {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    if (quantity <= 0) return;

    // 1. OBTENCIÓN DE PRECIOS
    const pRegRaw = sanitizePrice(item[`pr_${storeKey}` as keyof CartItem]);
    const pPromoRaw = sanitizePrice(item[`p_${storeKey}` as keyof CartItem]);

    // SEGURIDAD: El precio regular SIEMPRE debe ser el mayor de los dos
    // Esto evita que si el scraper guardó mal los campos, el subtotal se rompa
    const pRegular = Math.max(pRegRaw, pPromoRaw);
    const pPromo = Math.min(pRegRaw, pPromoRaw);

    if (pRegular <= 0) return;

    // 2. REGLA PARA SUBTOTAL: Siempre el precio de lista (el más alto)
    subtotalAcc += pRegular * quantity;

    // 3. EXTRACCIÓN DE ETIQUETA
    let ofertaTexto = "";
    if (item.oferta_gondola && typeof item.oferta_gondola === 'object') {
      const actualKey = Object.keys(item.oferta_gondola).find(
        (key) => key.toLowerCase() === storeKey.toLowerCase()
      );
      if (actualKey) {
        ofertaTexto = String((item.oferta_gondola as any)[actualKey] || "");
      }
    }

    // DENTRO DEL BUCLE item.forEach en calculateStoreTotal.ts

const threshold = getOfferThreshold(ofertaTexto);
let itemTotalFinal = 0;

if (threshold !== null && threshold > 0 && pPromo > 0 && pPromo < pRegular) {
  // 1. Calculamos cuántos combos completos (ej: cuántos grupos de 3)
  const numCombos = Math.floor(quantity / threshold);
  
  // 2. Calculamos cuántas unidades quedan fuera del combo (el resto)
  const remainder = quantity % threshold;

  // 3. Unidades en combo van a precio pPromo, las sueltas a pRegular
  const unitsInPromo = numCombos * threshold;
  
  itemTotalFinal = (unitsInPromo * pPromo) + (remainder * pRegular);
} else {
  // Caso sin umbral o promo directa: se aplica a todo si pPromo es mejor
  const priceToUse = (pPromo > 0 && pPromo < pRegular) ? pPromo : pRegular;
  itemTotalFinal = quantity * priceToUse;
}

totalAcc += itemTotalFinal;
  });

  const finalSub = Number(subtotalAcc.toFixed(2));
  const finalTot = Number(totalAcc.toFixed(2));
  const finalDisc = Number((finalSub - finalTot).toFixed(2));

  return {
    subtotal: finalSub,
    total: finalTot,
    discount: Math.max(0, finalDisc),
  };
};