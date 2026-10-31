import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookMarked, Check } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useBooks } from '../lib/data';
import { bookSlug } from '../lib/bible-nav';
import { PLAN_TEMPLATES, nextUnread } from '../lib/plans';
import { useDeletePlan, usePlansData, useStartPlan, useToggleItem } from '../lib/plans-data';
import { cn } from '../lib/utils';
import { EmptyState, ErrorBox, PageHeader, Spinner } from '../components/ui';
import { SignInPrompt } from '../components/SignInPrompt';
import { useState } from 'react';

export function PlansList() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const books = useBooks();
  const data = usePlansData();
  const start = useStartPlan();
  const header = <PageHeader eyebrow="Constância" title="Planos de leitura">Planos simples, um capítulo de cada vez, que você acompanha no seu ritmo. Sem prazo e sem cobrança.</PageHeader>;

  if (loading) return <Spinner />;
  if (!user) return <div>{header}<SignInPrompt text="Entre na sua conta para começar um plano e acompanhar seu progresso." /></div>;
  if (data.isLoading || books.isLoading) return <div>{header}<Spinner /></div>;
  if (data.isError || books.isError || !data.data || !books.data) return <div>{header}<ErrorBox onRetry={() => { data.refetch(); books.refetch(); }} /></div>;

  const { plans, items, done } = data.data;
  return (
    <div>
      {header}
      <ul className="space-y-3">
        {PLAN_TEMPLATES.map((t) => {
          const plan = plans.find((p) => p.title === t.title);
          const its = plan ? items.filter((i) => i.plan_id === plan.id) : [];
          const n = its.filter((i) => done.has(i.id)).length;
          const total = t.bookIds.reduce((s, id) => s + (books.data!.find((b) => b.id === id)?.chapters_count ?? 0), 0);
          return (
            <li key={t.slug} className="surface p-5">
              <h2 className="text-2xl">{t.title}</h2>
              <p className="mt-1 text-sm text-muted">{t.description} · {total} capítulos</p>
              {plan ? (
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuenow={n} aria-valuemin={0} aria-valuemax={its.length} aria-label={`Progresso em ${t.title}`}>
                    <div className="h-full bg-olive" style={{ width: `${its.length ? (n / its.length) * 100 : 0}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">{n} de {its.length} lidos</span>
                    <Link to={`/planos/${plan.id}`} className="btn-outline">{n === its.length && its.length > 0 ? 'Ver plano' : 'Continuar'}</Link>
                  </div>
                </div>
              ) : (
                <button className="btn-primary mt-4" disabled={start.isPending}
                  onClick={() => start.mutate({ template: t, books: books.data! }, { onSuccess: (id) => nav(`/planos/${id}`) })}>Começar plano</button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PlanDetail() {
  const { id = '' } = useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const books = useBooks();
  const data = usePlansData();
  const toggle = useToggleItem();
  const del = useDeletePlan();
  const [confirm, setConfirm] = useState(false);

  if (loading || data.isLoading || books.isLoading) return <Spinner />;
  if (!user) return <SignInPrompt text="Entre na sua conta para ver seus planos." />;
  if (data.isError || !data.data || !books.data) return <ErrorBox onRetry={() => data.refetch()} />;

  const plan = data.data.plans.find((p) => p.id === id);
  if (!plan) return <EmptyState icon={<BookMarked className="h-8 w-8" />} title="Plano não encontrado" action={{ to: '/planos', label: 'Ver planos' }}>Este plano não existe ou foi removido.</EmptyState>;

  const items = data.data.items.filter((i) => i.plan_id === plan.id);
  const done = data.data.done;
  const n = items.filter((i) => done.has(i.id)).length;
  const next = nextUnread(items, done);
  const bookOf = (bid: number) => books.data!.find((b) => b.id === bid)!;
  const groups = [...new Set(items.map((i) => i.book_id))];

  return (
    <div>
      <PageHeader eyebrow="Plano de leitura" title={plan.title} />
      <div className="surface mb-8 p-5">
        <div className="h-1.5 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuenow={n} aria-valuemin={0} aria-valuemax={items.length} aria-label="Progresso">
          <div className="h-full bg-olive" style={{ width: `${items.length ? (n / items.length) * 100 : 0}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted">{n} de {items.length} capítulos lidos</p>
        {next ? (
          <Link to={`/biblia/${bookSlug(bookOf(next.book_id))}/${next.chapter}`} className="btn-primary mt-4">Ler agora: {bookOf(next.book_id).name} {next.chapter}</Link>
        ) : <p className="mt-4 font-serif text-2xl">Plano concluído. Deus seja louvado.</p>}
      </div>

      <div className="space-y-8">
        {groups.map((bid) => {
          const b = bookOf(bid);
          return (
            <section key={bid} aria-label={b.name}>
              <h2 className="mb-3 text-2xl">{b.name}</h2>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
                {items.filter((i) => i.book_id === bid).map((i) => {
                  const isDone = done.has(i.id);
                  return (
                    <button key={i.id} onClick={() => toggle.mutate({ itemId: i.id, done: !isDone })} disabled={toggle.isPending}
                      aria-pressed={isDone} aria-label={`${b.name} ${i.chapter}: ${isDone ? 'lido' : 'não lido'}`}
                      className={cn('flex h-10 items-center justify-center gap-1 rounded-lg border text-sm transition-colors', isDone ? 'border-olive bg-olive text-on-olive' : 'border-line bg-surface hover:border-olive')}>
                      {isDone ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}{i.chapter}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link to="/planos" className="btn-ghost">Todos os planos</Link>
        {confirm ? (
          <>
            <span className="text-sm text-muted">Remover este plano e o progresso?</span>
            <button className="btn-danger" onClick={() => del.mutate(plan.id, { onSuccess: () => nav('/planos') })} disabled={del.isPending}>Remover</button>
            <button className="btn-ghost" onClick={() => setConfirm(false)}>Cancelar</button>
          </>
        ) : <button className="btn-ghost text-muted" onClick={() => setConfirm(true)}>Remover plano</button>}
      </div>
    </div>
  );
}
