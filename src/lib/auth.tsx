import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
};

const Ctx = createContext<AuthCtx | null>(null);

const friendly = (m: string) =>
  /invalid login/i.test(m) ? 'E-mail ou senha incorretos.'
  : /already registered|already been registered/i.test(m) ? 'Este e-mail já tem uma conta. Entre com a sua senha.'
  : /password/i.test(m) && /(short|least|weak)/i.test(m) ? 'A senha precisa ter pelo menos 6 caracteres.'
  : /email not confirmed/i.test(m) ? 'Confirme seu e-mail antes de entrar (veja a caixa de entrada e o spam).'
  : /rate limit|too many/i.test(m) ? 'Muitas tentativas. Aguarde um pouco e tente de novo.'
  : 'Não foi possível concluir. Tente novamente.';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? friendly(error.message) : null;
    },
    signUp: async (email, password, name) => {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: name }, emailRedirectTo: window.location.origin },
      });
      return { error: error ? friendly(error.message) : null, needsConfirmation: !error && !data.session };
    },
    signOut: async () => { await supabase.auth.signOut(); },
    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/perfil` });
      return error ? friendly(error.message) : null;
    },
  }), [session, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fora do AuthProvider');
  return v;
}
