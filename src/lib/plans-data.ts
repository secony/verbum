import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { useToast } from './toast';
import { buildPlanItems, type PlanTemplate } from './plans';
import type { Book } from './data';

export type PlanRow = { id: string; title: string; created_at: string };
export type ItemRow = { id: string; plan_id: string; position: number; book_id: number; chapter: number };

export function usePlansData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'plans', user?.id], enabled: !!user,
    queryFn: async () => {
      const [p, i, g] = await Promise.all([
        supabase.from('reading_plans').select('id,title,created_at').order('created_at'),
        supabase.from('reading_plan_items').select('id,plan_id,position,book_id,chapter').order('position').limit(5000),
        supabase.from('reading_plan_progress').select('item_id').limit(5000),
      ]);
      if (p.error) throw p.error; if (i.error) throw i.error; if (g.error) throw g.error;
      return {
        plans: p.data as PlanRow[],
        items: i.data as ItemRow[],
        done: new Set<string>((g.data as { item_id: string }[]).map((r) => r.item_id)),
      };
    },
  });
}

export function useStartPlan() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ template, books }: { template: PlanTemplate; books: Book[] }) => {
      const items = buildPlanItems(books, template.bookIds);
      const { data, error } = await supabase.from('reading_plans').insert({ title: template.title }).select('id').single();
      if (error) throw error;
      const id = data.id as string;
      for (let k = 0; k < items.length; k += 400) {
        const { error: e2 } = await supabase.from('reading_plan_items').insert(items.slice(k, k + 400).map((it) => ({ ...it, plan_id: id })));
        if (e2) { await supabase.from('reading_plans').delete().eq('id', id); throw e2; }
      }
      return id;
    },
    onSuccess: () => { toast.ok('Plano iniciado'); qc.invalidateQueries({ queryKey: ['me', 'plans'] }); },
    onError: () => toast.err('Não foi possível iniciar o plano. Tente novamente.'),
  });
}

export function useToggleItem() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ itemId, done }: { itemId: string; done: boolean }) => {
      const { error } = done
        ? await supabase.from('reading_plan_progress').insert({ item_id: itemId })
        : await supabase.from('reading_plan_progress').delete().eq('item_id', itemId);
      if (error) throw error;
      return done;
    },
    onSuccess: async (done) => {
      qc.invalidateQueries({ queryKey: ['me', 'plans'] });
      if (done) {
        // Marcar uma leitura do plano é uma ação explícita do usuário: conta como prática do dia (se a atividade estiver ligada).
        const { data: t } = await supabase.from('activity_types').select('enabled').eq('key', 'reading_plan').maybeSingle();
        if (t?.enabled !== false) {
          const { error } = await supabase.rpc('set_practice_activity', { p_key: 'reading_plan', p_done: true });
          if (!error) { toast.ok('Leitura marcada e registrada na sua caminhada'); qc.invalidateQueries({ queryKey: ['me', 'walk'] }); return; }
        }
        toast.ok('Leitura marcada');
      }
    },
    onError: () => toast.err('Não foi possível atualizar o plano.'),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('reading_plans').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast.ok('Plano removido'); qc.invalidateQueries({ queryKey: ['me', 'plans'] }); },
    onError: () => toast.err('Não foi possível remover o plano.'),
  });
}
