import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { isValidMode, type ReadingMode } from './reading-mode';

export type Theme = 'system' | 'light' | 'dark';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export const FONTS: FontSize[] = ['sm', 'md', 'lg', 'xl'];

type PrefsCtx = {
  theme: Theme; setTheme: (t: Theme) => void;
  font: FontSize; setFont: (f: FontSize) => void;
  /** escolha explícita do modo de leitura (null = usar o padrão do livro) */
  mode: ReadingMode | null; setMode: (m: ReadingMode | null) => void;
};
const Ctx = createContext<PrefsCtx | null>(null);

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage indisponível */ } };

function applyTheme(t: Theme) {
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => (['light', 'dark', 'system'].includes(read('verbum:theme') ?? '') ? (read('verbum:theme') as Theme) : 'system'));
  const [font, setFontState] = useState<FontSize>(() => (FONTS.includes(read('verbum:font') as FontSize) ? (read('verbum:font') as FontSize) : 'md'));
  const [mode, setModeState] = useState<ReadingMode | null>(() => { const m = read('verbum:mode'); return isValidMode(m) ? m : null; });

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { document.documentElement.dataset.font = font; }, [font]);
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => applyTheme('system');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [theme]);

  // Ao entrar, traz as preferências salvas na conta.
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('theme,font_size,reading_mode').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      if (['light', 'dark', 'system'].includes(data.theme)) { setThemeState(data.theme); write('verbum:theme', data.theme); }
      if (FONTS.includes(data.font_size)) { setFontState(data.font_size); write('verbum:font', data.font_size); }
      if (isValidMode(data.reading_mode)) { setModeState(data.reading_mode); write('verbum:mode', data.reading_mode); }
    });
  }, [user]);

  const save = useCallback((patch: Record<string, string | null>) => {
    if (!user) return;
    supabase.from('profiles').upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' }).then(() => undefined);
  }, [user]);

  const value: PrefsCtx = {
    theme, font, mode,
    setTheme: (t) => { setThemeState(t); write('verbum:theme', t); save({ theme: t }); },
    setFont: (f) => { setFontState(f); write('verbum:font', f); save({ font_size: f }); },
    setMode: (m) => { setModeState(m); if (m) write('verbum:mode', m); else { try { localStorage.removeItem('verbum:mode'); } catch { /* ignore */ } } save({ reading_mode: m }); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePrefs fora do PrefsProvider');
  return v;
}
