import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn('Supabase: variáveis de ambiente não configuradas. Usando localStorage como fallback.');
}

export const supabase = (url && key) ? createClient(url, key) : null;
export const isSupabaseReady = Boolean(url && key);
