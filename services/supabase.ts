
import { createClient } from '@supabase/supabase-js';
import { Product, PriceHistory, Profile, Benefit, UserMembership } from '../types';

const getEnvVar = (name: string): string => {
  try {
    // @ts-ignore
    return import.meta.env[name] || '';
  } catch (e) {
    return '';
  }
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

const isValidUrl = (url: string) => {
  try {
    return url && (url.startsWith('http://') || url.startsWith('https://'));
  } catch {
    return false;
  }
};

// Busca esta parte en supabase.ts
export const supabase = createClient(
  isValidUrl(SUPABASE_URL) ? SUPABASE_URL : 'https://placeholder.supabase.co',
  SUPABASE_KEY || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
};

export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase.from('productos').select('*');
  if (error) throw error;
  return data || [];
};

export const getPriceHistory = async (days: number = 7): Promise<PriceHistory[]> => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const { data, error } = await supabase
    .from('historial_precios')
    .select('*')
    .gte('fecha', date.toISOString().split('T')[0]);
  if (error) throw error;
  return data || [];
};

export const getProductHistory = async (productName: string, days: number = 30): Promise<PriceHistory[]> => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const { data, error } = await supabase
    .from('historial_precios')
    .select('*')
    .eq('nombre_producto', productName)
    .gte('fecha', date.toISOString().split('T')[0])
    .order('fecha', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const getProductHistoryByEan = async (ean: string, days: number = 30): Promise<PriceHistory[]> => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const { data, error } = await supabase
    .from('historial_precios')
    .select('*')
    .eq('ean', ean)
    .gte('fecha', date.toISOString().split('T')[0])
    .order('fecha', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const getBenefits = async (dayOfWeek: number): Promise<Benefit[]> => {
  const { data, error } = await supabase
    .from('beneficios_super')
    .select('*')
    .eq('dia_semana', dayOfWeek);
  if (error) throw error;
  return data || [];
};

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
};

export const updateMemberships = async (userId: string, memberships: UserMembership[]) => {
  const { error } = await supabase
    .from('perfiles')
    .update({ membresias: memberships })
    .eq('id', userId);
  if (error) throw error;
};

// Guardamos un objeto que contiene el carrito activo y los changos guardados (máximo 2)
export const saveCartData = async (userId: string, data: { active: any, saved: any }) => {
  const { error } = await supabase
    .from('carritos_guardados')
    .upsert({ 
      user_id: userId, 
      items: data, // Aquí guardamos el objeto completo { active, saved } en la columna 'items'
      updated_at: new Date().toISOString() 
    }, { onConflict: 'user_id' });

  if (error) throw error;
};

export const getSavedCartData = async (userId: string): Promise<{ active: Record<number, number>, saved: any[] } | null> => {
  const { data, error } = await supabase
    .from('carritos_guardados')
    .select('items')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  
  // Si los datos no tienen la estructura nueva, los convertimos
  const items = data?.items;
  if (items && !items.active && !items.saved) {
    return { active: items, saved: [] };
  }
  
  return items || { active: {}, saved: [] };
};

// =====================
// CHANGOS COMPARTIDOS
// =====================

export interface SharedCart {
  id: string;
  user_id: string;
  user_name: string;
  items: { active: Record<number, number>, saved: any[] };
  total_savings: number;
  created_at: string;
  expires_at: string;
}

// Crear un chango compartido público
export const createSharedCart = async (
  userId: string,
  userName: string,
  items: { active: Record<number, number>, saved: any[] },
  totalSavings: number
): Promise<string> => {
  // Generar ID único
  const shareId = Math.random().toString(36).substring(2, 10);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // Expira en 30 días
  
  const { error } = await supabase
    .from('changos_compartidos')
    .insert({
      id: shareId,
      user_id: userId,
      user_name: userName,
      items: items,
      total_savings: totalSavings,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  
  if (error) {
    console.error('[SharedCart] Error creating:', error);
    throw error;
  }
  
  return shareId;
};

// Obtener un chango compartido por ID
export const getSharedCart = async (shareId: string): Promise<SharedCart | null> => {
  const { data, error } = await supabase
    .from('changos_compartidos')
    .select('*')
    .eq('id', shareId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  
  if (error) {
    console.error('[SharedCart] Error fetching:', error);
    return null;
  }
  
  return data;
};

// Guarda un carrito individual
export const saveCart = async (userId: string, name: string, items: Record<number, number>) => {
  const { data, error } = await supabase
    .from('carritos_guardados')
    .insert({ 
      user_id: userId, 
      name,
      items, 
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Obtiene todos los carritos guardados de un usuario
export const getSavedCarts = async (userId: string) => {
  const { data, error } = await supabase
    .from('carritos_guardados')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

// Actualiza un carrito (para compartir, etc.)
export const updateCart = async (cartId: string, updates: Record<string, any>) => {
  const { data, error } = await supabase
    .from('carritos_guardados')
    .update(updates)
    .eq('id', cartId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Elimina un carrito por su ID
export const deleteCart = async (cartId: string) => {
  const { error } = await supabase
    .from('carritos_guardados')
    .delete()
    .eq('id', cartId);
  if (error) throw error;
};


export const getCatalogoMembresias = async () => {
  const { data, error } = await supabase.from('catalogo_membresias').select('*');
  if (error) throw error;
  return data || [];
};

export const getConfig = async () => {
  // Agregamos .order('id', { ascending: true })
  const { data, error } = await supabase
    .from('configuracion')
    .select('*')
    .order('id', { ascending: true }); 

  if (error) throw error;

  const config: Record<string, string> = {};
  data?.forEach((row: any) => { 
    config[row.clave as keyof typeof config] = row.valor; 
  });
  
  return config;
};