import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search, SearchX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseReference } from '../lib/reference';
import { bookSlug } from '../lib/bible-nav';
import { VERSE_SELECT, useBooks, useThemes, type Verse } from '../lib/data';
import { cn } from '../lib/utils';
import { EmptyState, ErrorBox, PageHeader, Spinner } from '../components/ui';
import { VerseCard } from '../components/VerseCard';
import { useVerseDialogs } from '../components/VerseDialogs';
import { TestNotice } from '../components/TestNotice';

const PAGE = 20;

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const testament = params.get('t') ?? '';
  const bookId = params.get('livro') ?? '';
  const themeSlug = params.get('tema') ?? '';
  const [input, setInput] = useState(q);
  useEffect(() => { setInput(q); }, [q]);

  const books = useBooks();
  const themes = useThemes();
  const { dialogs, element } = useVerseDialogs();
  const theme = themes.data?.find((t) => t.slug === themeSlug);
  const ref = q && books.data ? parseReference(q, books.data) : null;

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p, { replace: true });
  };

  const results = useInfiniteQuery({
    queryKey: ['explore', q, testament, bookId, themeSlug, ref, theme?.id],
    enabled: !!books.data && (!themeSlug || !!themes.data),
    initialPageParam: 0,
    getNextPageParam: (last: { rows: Verse[]; done: boolean }, all) => (last.done ? undefined : all.length * PAGE),
    queryFn: async ({ pageParam }) => {
      let ids: number[] | null = null;
      if (themeSlug) {
        if (!theme) return { rows: [], done: true };
        const { data, error } = await supabase.from('verse_themes').select('verse_id').eq('theme_id', theme.id).limit(2000);
        if (error) throw error;
        ids = (data ?? []).map((r: { verse_id: number }) => r.verse_id);
        if (!ids.length) return { rows: [], done: true };
      }
      const select = testament ? VERSE_SELECT.replace('books(', 'books!inner(') : VERSE_SELECT;
      let query = supabase.from('verses').select(select);
      if (testament) query = query.eq('books.testament', testament);
      if (bookId) query = query.eq('book_id', Number(bookId));
      if (ids) query = query.in('id', ids);
      if (ref) {
        query = query.eq('book_id', ref.bookId).eq('chapter', ref.chapter);
        if (ref.verse) query = query.eq('verse', ref.verse);
        query = query.order('verse').range(pageParam, pageParam + PAGE - 1);
      } else {
        if (q.trim()) query = query.ilike('text', `%${q.trim().replace(/[%_]/g, (c) => `\\${c}`)}%`);
        query = query.order('id').range(pageParam, pageParam + PAGE - 1);
      }
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as unknown as Verse[];
      return { rows, done: rows.length < PAGE };
    },
  });

  const rows = results.data?.pages.flatMap((p) => p.rows) ?? [];
  const refBook = ref ? books.data?.find((b) => b.id === ref.bookId) : undefined;
  const hasFilters = !!(q || testament || bookId || themeSlug);

  return (
    <div>
      <PageHeader eyebrow="Biblioteca" title="Explorar">Busque por palavra, por referência (ex.: “Jo 3,16”) ou navegue por tema, testamento e livro.</PageHeader>

      <form role="search" onSubmit={(e) => { e.preventDefault(); set('q', input.trim()); }} className="mb-4 flex gap-2">
        <label htmlFor="busca" className="sr-only">Buscar versículos</label>
        <input id="busca" type="search" className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Palavra ou referência — “love”, “Sl 22”, “John 3:16”" />
        <button className="btn-primary" type="submit"><Search className="h-4 w-4" aria-hidden /> Buscar</button>
      </form>

      <div className="mb-3 flex flex-wrap gap-2" aria-label="Filtros">
        <select aria-label="Testamento" className="input !w-auto" value={testament} onChange={(e) => set('t', e.target.value)}>
          <option value="">Todos os testamentos</option><option value="AT">Antigo Testamento</option><option value="NT">Novo Testamento</option>
        </select>
        <select aria-label="Livro" className="input !w-auto max-w-[14rem]" value={bookId} onChange={(e) => set('livro', e.target.value)}>
          <option value="">Todos os livros</option>
          {books.data?.filter((b) => !testament || b.testament === testament).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {hasFilters && <button className="btn-ghost" onClick={() => setParams({}, { replace: true })}>Limpar</button>}
      </div>
      <div className="mb-6 flex flex-wrap gap-2" aria-label="Temas">
        {themes.data?.map((t) => (
          <button key={t.id} onClick={() => set('tema', themeSlug === t.slug ? '' : t.slug)} aria-pressed={themeSlug === t.slug} className={cn('chip', themeSlug === t.slug && 'chip-on')}>{t.name}</button>
        ))}
      </div>

      <TestNotice className="mb-6" />

      {ref && refBook && (
        <Link to={`/biblia/${bookSlug(refBook)}/${ref.chapter}`} className="mb-4 inline-block text-sm text-olive hover:underline">Abrir {refBook.name} {ref.chapter} no leitor →</Link>
      )}

      {results.isLoading ? <Spinner /> : results.isError ? <ErrorBox onRetry={() => results.refetch()} /> : rows.length === 0 ? (
        themeSlug ? (
          <EmptyState icon={<SearchX className="h-8 w-8" />} title="Este tema ainda não tem versículos">As associações entre temas e versículos ainda não foram cadastradas. Elas serão feitas com critério editorial, sem inventar classificações.</EmptyState>
        ) : (
          <EmptyState icon={<SearchX className="h-8 w-8" />} title="Nenhum resultado">Tente outra palavra ou referência. O texto atual está em inglês (Douay-Rheims), então busque termos em inglês, como “mercy” ou “shepherd”.</EmptyState>
        )
      ) : (
        <>
          <ul className="space-y-3">{rows.map((v) => <li key={v.id}><VerseCard verse={v} dialogs={dialogs} /></li>)}</ul>
          {results.hasNextPage && (
            <div className="mt-6 text-center">
              <button className="btn-outline" onClick={() => results.fetchNextPage()} disabled={results.isFetchingNextPage}>{results.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}</button>
            </div>
          )}
        </>
      )}
      {element}
    </div>
  );
}
