import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Flame, Footprints } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { ACTIVITIES, localDay, shiftDay, shouldWelcomeBack, type WalkData } from '../lib/walk';
import { bookSlug } from '../lib/bible-nav';
import { useBooks, useLastPosition } from '../lib/data';
import { cn } from '../lib/utils';
import { ErrorBox, PageHeader, Spinner } from '../components/ui';
import { SignInPrompt } from '../components/SignInPrompt';

type ActivityType = { id: string; key: string; label: string; enabled: boolean };

async function setup(userId: string) {
  // Fuso horário: define o "dia" do usuário. Só preenche se ainda não existir.
  const { data: p } = await supabase.from('profiles').select('timezone').eq('user_id', userId).maybeSingle();
  if (!p) await supabase.from('profiles').insert({ user_id: userId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  else if (!p.timezone) await supabase.from('profiles').update({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }).eq('user_id', userId).is('timezone', null);

  const q = () => supabase.from('activity_types').select('*').eq('user_id', userId).order('label');
  const first = await q();
  if (first.error) throw first.error;
  if (first.data.length) return first.data as ActivityType[];
  const { error } = await supabase.from('activity_types').upsert(ACTIVITIES.map((a) => ({ ...a, user_id: userId, enabled: true })), { onConflict: 'user_id,key', ignoreDuplicates: true });
  if (error) throw error;
  const again = await q();
  if (again.error) throw again.error;
  return again.data as ActivityType[];
}

export default function Walk() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const books = useBooks();
  const last = useLastPosition();

  const types = useQuery({ queryKey: ['me', 'activity-types', user?.id], enabled: !!user, queryFn: () => setup(user!.id) });
  const walk = useQuery({
    queryKey: ['me', 'walk', user?.id], enabled: !!user && types.isSuccess,
    queryFn: async () => { const { data, error } = await supabase.rpc('get_walk'); if (error) throw error; return data as unknown as WalkData; },
  });
  const goal = useQuery({
    queryKey: ['me', 'goal', user?.id], enabled: !!user,
    queryFn: async () => { const { data } = await supabase.from('profiles').select('practice_goal').eq('user_id', user!.id).maybeSingle(); return (data?.practice_goal as number | null) ?? null; },
  });

  const toggle = useMutation({
    mutationFn: async ({ key, done }: { key: string; done: boolean }) => { const { error } = await supabase.rpc('set_practice_activity', { p_key: key, p_done: done }); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'walk'] }),
    onError: () => toast.err('Não foi possível registrar agora. Tente novamente.'),
  });
  const enable = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => { const { error } = await supabase.from('activity_types').update({ enabled }).eq('id', id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'activity-types'] }),
    onError: () => toast.err('Não foi possível salvar a preferência.'),
  });

  if (loading) return <Spinner />;
  const header = <PageHeader eyebrow="Constância" title="Minha caminhada">Um incentivo gentil para ler e rezar com regularidade, no seu ritmo. Sem competição e sem culpa.</PageHeader>;
  if (!user) return <div>{header}<SignInPrompt text="Entre na sua conta para acompanhar seus momentos de prática." /></div>;
  if (types.isLoading || walk.isLoading) return <div>{header}<Spinner /></div>;
  if (types.isError || walk.isError || !walk.data) return <div>{header}<ErrorBox onRetry={() => { types.refetch(); walk.refetch(); }} /></div>;

  const w = walk.data;
  const enabled = (types.data ?? []).filter((t) => t.enabled);
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(w.today, i - 6));
  const weekCount = week.filter((d) => w.days.includes(d)).length;
  const lastBook = last.data ? books.data?.find((b) => b.id === last.data!.bookId) : undefined;
  void localDay;

  return (
    <div className="space-y-10">
      {header}
      {shouldWelcomeBack(w) && <p role="status" className="border-l-2 border-gold pl-4 text-muted">Que bom ter você aqui. Sua caminhada pode recomeçar com calma, no seu ritmo.</p>}

      <section aria-label="Resumo" className="grid grid-cols-3 gap-3">
        {[
          { icon: Flame, v: w.streak.current_streak, l: 'dias seguidos' },
          { icon: Footprints, v: w.streak.total_days, l: 'dias de prática' },
          { icon: Flame, v: w.streak.longest_streak, l: 'maior sequência' },
        ].map(({ icon: Icon, v, l }) => (
          <div key={l} className="surface p-4 text-center">
            <Icon className="mx-auto mb-1 h-4 w-4 text-gold" aria-hidden />
            <p className="font-serif text-4xl">{v}</p><p className="text-xs text-muted">{l}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="hoje">
        <h2 id="hoje" className="mb-4 text-3xl">Hoje</h2>
        {enabled.length === 0 ? <p className="text-sm text-muted">Nenhuma atividade ligada. Escolha abaixo o que faz sentido para você.</p> : (
          <ul className="space-y-2">
            {enabled.map((t) => {
              const done = w.done.includes(t.key);
              return (
                <li key={t.id}>
                  <button onClick={() => toggle.mutate({ key: t.key, done: !done })} aria-pressed={done} disabled={toggle.isPending}
                    className={cn('surface flex w-full items-center justify-between p-4 text-left transition-colors', done && 'border-olive')}>
                    <span>{t.label}</span>
                    <span className={cn('flex h-7 w-7 items-center justify-center rounded-full border', done ? 'border-olive bg-olive text-on-olive' : 'border-line')}>{done && <Check className="h-4 w-4" aria-label="Feito" />}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="semana">
        <h2 id="semana" className="mb-4 text-3xl">Últimos 7 dias</h2>
        <div className="grid grid-cols-7 gap-1">
          {week.map((d) => {
            const on = w.days.includes(d);
            return (
              <div key={d} className="flex flex-col items-center gap-2 text-xs">
                <span className="text-muted">{new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' })}</span>
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', on ? 'bg-olive text-on-olive' : 'bg-soft text-muted')} aria-label={`${d}: ${on ? 'praticado' : 'sem registro'}`}>
                  {on ? <Check className="h-4 w-4" /> : d.slice(-2)}
                </span>
              </div>
            );
          })}
        </div>
        {goal.data ? <p className="mt-4 text-sm text-muted">Meta: {goal.data} {goal.data === 1 ? 'dia' : 'dias'} por semana · {weekCount} {weekCount === 1 ? 'dia' : 'dias'} nesta semana.</p>
          : <p className="mt-4 text-sm text-muted">Quer uma meta? Defina no <Link to="/perfil" className="text-olive underline">perfil</Link>. É opcional.</p>}
      </section>

      {lastBook && last.data && (
        <Link to={`/biblia/${bookSlug(lastBook)}/${last.data.chapter}`} className="surface block p-5 hover:border-gold">
          <span className="eyebrow block">Última leitura</span><span className="font-serif text-2xl">{lastBook.name} {last.data.chapter}</span>
        </Link>
      )}

      <Link to="/planos" className="surface block p-5 hover:border-gold">
        <span className="eyebrow block">Planos de leitura</span>
        <span className="font-serif text-2xl">Evangelhos, Novo Testamento, Salmos e Provérbios</span>
      </Link>

      <section aria-labelledby="atividades">
        <h2 id="atividades" className="mb-2 text-3xl">Minhas atividades</h2>
        <p className="mb-4 text-sm text-muted">Escolha o que faz parte da sua rotina.</p>
        <div className="flex flex-wrap gap-2">
          {(types.data ?? []).map((t) => (
            <button key={t.id} aria-pressed={t.enabled} onClick={() => enable.mutate({ id: t.id, enabled: !t.enabled })} className={cn('chip', t.enabled && 'chip-on')}>{t.label}</button>
          ))}
        </div>
      </section>
    </div>
  );
}
