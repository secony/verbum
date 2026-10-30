import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { Article, Church } from './catholic';

/** Só para mostrar ou esconder links. A proteção real está nas políticas do banco. */
export function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'is-admin', user?.id], enabled: !!user, staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('role').eq('role', 'admin').maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function usePublishedArticles() {
  return useQuery({
    queryKey: ['articles', 'published'],
    queryFn: async () => {
      const { data, error } = await supabase.from('church_articles').select('*').eq('status', 'published').order('position');
      if (error) throw error;
      return data as Article[];
    },
  });
}

export function useAllArticles(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'articles'], enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from('church_articles').select('*').order('module').order('position');
      if (error) throw error;
      return data as Article[];
    },
  });
}

export function useChurches(opts: { all?: boolean } = {}) {
  return useQuery({
    queryKey: ['churches', opts.all ? 'all' : 'published'],
    queryFn: async () => {
      let q = supabase.from('churches').select('*,mass_schedules(*)').order('name');
      if (!opts.all) q = q.eq('published', true);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Church[];
    },
  });
}

export function useFavoriteChurchIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'favorite-churches', user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('favorite_churches').select('church_id');
      if (error) throw error;
      return new Set<string>((data as { church_id: string }[]).map((r) => r.church_id));
    },
  });
}
