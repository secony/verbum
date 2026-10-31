import { createClient } from '@supabase/supabase-js';

// Chave "publishable" é pública por desenho: a segurança vem das políticas RLS no banco.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://frfklrtopivnyguoytrw.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_Nwvp61vdqJgSvyL51FGrmw_CCX6nnOG';

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
