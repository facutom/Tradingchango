
import { createClient } from '@supabase/supabase-js';
import { Product, PriceHistory, Profile, Benefit } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

export const getCatalogoMembresias = async () => {
  const { data, error } = await supabase.from('catalogo_membresias').select('*');
  if (error) throw error;
  return data || [];
};

export const getConfig = async () => {
  const { data, error } = await supabase.from('configuracion').select('*');
  if (error) throw error;
  const config: Record<string, string> = {};
  data?.forEach(row => config[row.clave] = row.valor);
  return config;
};
