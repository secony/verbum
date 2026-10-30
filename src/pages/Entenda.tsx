import { Link, useParams } from 'react-router-dom';
import { BookOpenCheck, ChevronRight } from 'lucide-react';
import { EmptyState, ErrorBox, PageHeader, Spinner } from '../components/ui';
import { usePublishedArticles } from '../lib/catholic-data';
import { MODULES, fmtDateBR, parseBody, safeUrl } from '../lib/catholic';

export function EntendaList() {
  const q = usePublishedArticles();
  const header = <PageHeader eyebrow="Católica" title="Entenda a Igreja">Explicações curtas sobre a fé e a vida da Igreja. Cada texto mostra suas fontes e quem o revisou.</PageHeader>;
  if (q.isLoading) return <div>{header}<Spinner /></div>;
  if (q.isError) return <div>{header}<ErrorBox onRetry={() => q.refetch()} /></div>;
  if (!q.data?.length) {
    return <div>{header}<EmptyState icon={<BookOpenCheck className="h-8 w-8" />} title="Conteúdo em revisão">Os textos estão sendo escritos e conferidos com as fontes da Igreja. Eles aparecem aqui assim que forem revisados e publicados.</EmptyState></div>;
  }
  return (
    <div>
      {header}
      <div className="space-y-10">
        {MODULES.map((m) => {
          const items = q.data!.filter((a) => a.module === m.id);
          if (!items.length) return null;
          return (
            <section key={m.id} aria-labelledby={`m-${m.id}`}>
              <h2 id={`m-${m.id}`} className="text-3xl">{m.title}</h2>
              <p className="mb-4 text-sm text-muted">{m.description}</p>
              <ul className="surface overflow-hidden">
                {items.map((a) => (
                  <li key={a.id} className="border-b border-line last:border-0">
                    <Link to={`/catolica/entenda/${a.slug}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-soft">
                      <span><span className="font-serif text-xl">{a.title}</span><span className="block text-sm text-muted">{a.summary}</span></span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function EntendaArticle() {
  const { slug = '' } = useParams();
  const q = usePublishedArticles();
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorBox onRetry={() => q.refetch()} />;
  const a = q.data?.find((x) => x.slug === slug);
  if (!a) return <EmptyState title="Texto não encontrado" action={{ to: '/catolica/entenda', label: 'Ver todos os textos' }}>Este texto não existe ou ainda não foi publicado.</EmptyState>;
  const idx = q.data!.findIndex((x) => x.slug === slug);
  const next = q.data![idx + 1];
  const module = MODULES.find((m) => m.id === a.module);
  return (
    <article className="max-w-2xl">
      <Link to="/catolica/entenda" className="eyebrow hover:underline">{module?.title ?? 'Entenda a Igreja'}</Link>
      <h1 className="mb-3 mt-2 text-4xl md:text-5xl">{a.title}</h1>
      <p className="mb-8 text-lg text-muted">{a.summary}</p>
      <div className="space-y-4 text-[1.05rem] leading-relaxed">
        {parseBody(a.body).map((b, i) =>
          b.type === 'h' ? <h2 key={i} className="pt-4 text-3xl">{b.text}</h2>
          : b.type === 'ul' ? <ul key={i} className="list-disc space-y-1.5 pl-6 marker:text-gold">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
          : <p key={i}>{b.text}</p>)}
      </div>
      <footer className="mt-10 space-y-3 border-t border-line pt-5 text-sm text-muted">
        <p><strong className="text-fg">Conteúdo editorial do Verbum</strong> (não é texto bíblico nem documento oficial).{a.reviewed_by ? <> Revisado por {a.reviewed_by}{a.reviewed_at ? ` em ${fmtDateBR(a.reviewed_at)}` : ''}.</> : null}</p>
        {a.sources.length > 0 && (
          <div><p className="font-medium text-fg">Fontes para aprofundar</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">{a.sources.map((s, i) => { const u = safeUrl(s.url); return <li key={i}>{u ? <a href={u} target="_blank" rel="noopener noreferrer" className="text-olive underline">{s.label}</a> : s.label}</li>; })}</ul></div>
        )}
      </footer>
      {next && <Link to={`/catolica/entenda/${next.slug}`} className="btn-outline mt-8">Próximo: {next.title} <ChevronRight className="h-4 w-4" aria-hidden /></Link>}
    </article>
  );
}
