import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { useToast } from './toast';

export const VERSE_SELECT = 'id,chapter,verse,text,translation,source,books(id,name,abbreviation,testament)';

export type Book = { id: number; name: string; abbreviation: string; testament: 'AT' | 'NT'; chapters_count: number; position: number };
export type Verse = {
  id: number; chapter: number; verse: number; text: string; translation: string; source: string;
  books: { id: number; name: string; abbreviation: string; testament: 'AT' | 'NT' } | null;
};
export type Theme = { id: number; slug: string; name: string; position: number };

export const reference = (v: Pick<Verse, 'books' | 'chapter' | 'verse'>) => `${v.books?.name ?? ''} ${v.chapter},${v.verse}`;
export const shareText = (v: Verse) => `“${v.text}” — ${reference(v)} (${v.translation})`;

export function useBooks() {
  return useQuery({
    queryKey: ['books'], staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from('books').select('*').order('position');
      if (error) throw error;
      return data as Book[];
    },
  });
}

export function useThemes() {
  return useQuery({
    queryKey: ['themes'], staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from('themes').select('*').order('position');
      if (error) throw error;
      return data as Theme[];
    },
  });
}

export function useVerseCount() {
  return useQuery({
    queryKey: ['verse-count'], staleTime: 5 * 60_000,
    queryFn: async () => {
      const { count, error } = await supabase.from('verses').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/* ---------- Favoritos ---------- */
export function useFavoriteIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'favorite-ids', user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('favorites').select('verse_id');
      if (error) throw error;
      return new Set<number>((data ?? []).map((r: { verse_id: number }) => r.verse_id));
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ verseId, on }: { verseId: number; on: boolean }) => {
      const { error } = on
        ? await supabase.from('favorites').insert({ verse_id: verseId })
        : await supabase.from('favorites').delete().eq('verse_id', verseId);
      if (error) throw error;
      return on;
    },
    onSuccess: (on) => { toast.ok(on ? 'Adicionado aos favoritos' : 'Removido dos favoritos'); qc.invalidateQueries({ queryKey: ['me'] }); },
    onError: () => toast.err('Não foi possível atualizar os favoritos. Tente novamente.'),
  });
}

/* ---------- Notas ---------- */
export function useNoteVerseIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'note-verse-ids', user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('notes').select('verse_id');
      if (error) throw error;
      return new Set<number>((data ?? []).map((r: { verse_id: number }) => r.verse_id));
    },
  });
}

/* ---------- Histórico ---------- */
export async function recordView(verseId: number) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  await supabase.from('reading_history').upsert({ verse_id: verseId, user_id: data.session.user.id, viewed_at: new Date().toISOString() });
}

/* ---------- Coleções ---------- */
export type Collection = { id: string; name: string; created_at: string; collection_items: { verse_id: number }[] };
export function useCollections() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'collections', user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('collections').select('id,name,created_at,collection_items(verse_id)').order('created_at');
      if (error) throw error;
      return data as Collection[];
    },
  });
}

export async function copyVerse(v: Verse, toast: { ok: (t: string) => void; err: (t: string) => void }) {
  try {
    await navigator.clipboard.writeText(shareText(v));
    toast.ok('Versículo copiado');
    recordView(v.id);
  } catch {
    toast.err('Não foi possível copiar.');
  }
}

/* ---------- Posição de leitura ---------- */
export type Position = { bookId: number; chapter: number };
export function loadLocalPosition(): Position | null {
  try {
    const p = JSON.parse(localStorage.getItem('verbum:position') ?? 'null');
    return p && Number.isInteger(p.bookId) && Number.isInteger(p.chapter) ? p : null;
  } catch { return null; }
}
export async function savePosition(pos: Position, userId?: string) {
  try { localStorage.setItem('verbum:position', JSON.stringify(pos)); } catch { /* ignore */ }
  if (userId) await supabase.from('profiles').upsert({ user_id: userId, last_book_id: pos.bookId, last_chapter: pos.chapter }, { onConflict: 'user_id' });
}
export function useLastPosition() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['position', user?.id],
    queryFn: async (): Promise<Position | null> => {
      if (user) {
        const { data } = await supabase.from('profiles').select('last_book_id,last_chapter').eq('user_id', user.id).maybeSingle();
        if (data?.last_book_id && data?.last_chapter) return { bookId: data.last_book_id, chapter: data.last_chapter };
      }
      return loadLocalPosition();
    },
  });
}
