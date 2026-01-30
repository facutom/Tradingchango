import { CartItem } from '../types';

const getThreshold = (oferta: string): number => {
  if (!oferta) return 1;
  const lowerOferta = oferta.toLowerCase();
  
  // Extrae el número de "3x2", "4x3", "2x1", etc.
  const multiBuyMatch = lowerOferta.match(/^(\d+)x/);
  if (multiBuyMatch) return parseInt(multiBuyMatch[1], 10);

  // Para "2do al 80%", el threshold es 2
  if (lowerOferta.includes('2do al')) return 2;
  
  return 1;
};

export const calculateStoreTotal = (cartItems: CartItem[], storeKey: string): number => {
  return cartItems.reduce((total, item) => {
    const pPromo = item[`p_${storeKey}` as keyof CartItem] as number;
    const pRegular = item[`pr_${storeKey}` as keyof CartItem] as number;
    const oferta = item.oferta_gondola[storeKey as keyof typeof item.oferta_gondola] || "";
    
    // Si no hay precio, sumamos 0 (el filtro hasAllItems se encargará de descartar la tienda)
    if (!pPromo && !pRegular) return total;

    // Si el pr_ no existe (a veces la API no lo manda), usamos p_ como base
    const basePrice = pRegular || pPromo;
    const threshold = getThreshold(oferta);
    const quantity = item.quantity;

    if (threshold > 1 && quantity >= threshold) {
      const unitsInPromo = Math.floor(quantity / threshold) * threshold;
      const remainingUnits = quantity % threshold;
      // Múltiplos van con p_, el resto con el precio base
      return total + (unitsInPromo * pPromo) + (remainingUnits * basePrice);
    } else {
      // Si no hay promo o no llega a la cantidad mínima
      return total + (quantity * basePrice);
    }
  }, 0);
};
