import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { usePrefs, FONTS } from '../lib/prefs';
import { useToast } from '../lib/toast';
import { adjacentChapter, bookSlug } from '../lib/bible-nav';
import { resolveMode } from '../lib/reading-mode';
import { savePosition, useBooks, useFavoriteIds, useNoteVerseIds, VERSE_SELECT, type Verse } from '../lib/data';
import { cn } from '../lib/utils';
import { EmptyState, ErrorBox, Spinner, VersesSkeleton } from '../components/ui';
import { ChapterPicker } from '../components/ChapterPicker';
import { TestNotice } from '../components/TestNotice';
import { VerseActions } from '../components/VerseActions';
import { useVerseDialogs } from '../components/VerseDialogs';

function PracticeSuggestion({ chapterKey }: { chapterKey: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const enabled = useQuery({
    queryKey: ['me', 'bible-enabled', user?.id], enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('activity_types').select('enabled').eq('key', 'bible').maybeSingle();
      return data ? !!data.enabled : true;
    },
  });
  const done = useQuery({
    queryKey: ['me', 'walk', user?.id], enabled: !!user,
    queryFn: async () => { const { data, error } = await supabase.rpc('get_walk'); if (error) throw error; return data as { done: string[] }; },
  });
  useEffect(() => {
    setReady(false); setDismissed(false);
    const t = setTimeout(() => setReady(true), 8000);
    return () => clearTimeout(t);
  }, [chapterKey]);
  const register = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc('set_practice_activity', { p_key: 'bible', p_done: true }); if (error) throw error; },
    onSuccess: () => { toast.ok('Leitura registrada na sua caminhada'); setDismissed(true); done.refetch(); },
    onError: () => toast.err('Não foi possível registrar agora.'),
  });
  if (!user || !ready || dismissed || enabled.data === false || done.data?.done?.includes('bible')) return null;
  return (
    <aside role="complementary" aria-label="Registrar leitura" className="surface fade-up mt-8 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
      <span>Registrar este momento de leitura na sua caminhada?</span>
      <span className="flex gap-2">
        <button className="btn-ghost" onClick={() => setDismissed(true)}>Agora não</button>
        <button className="btn-primary" onClick={() => register.mutate()} disabled={register.isPending}>Registrar</button>
      </span>
    </aside>
  );
}

export default function Chapter() {
  const { livro = '', capitulo = '' } = useParams();
  const { user } = useAuth();
  const prefs = usePrefs();
  const books = useBooks();
  const favs = useFavoriteIds();
  const notes = useNoteVerseIds();
  const { dialogs, element } = useVerseDialogs();
  const [selected, setSelected] = useState<number | null>(null);
  const [picker, setPicker] = useState(false);
  const navigate = useNavigate();

  const book = books.data?.find((b) => bookSlug(b) === livro);
  const chapter = Number(capitulo);
  const valid = !!book && Number.isInteger(chapter) && chapter >= 1 && chapter <= book.chapters_count;

  const verses = useQuery({
    queryKey: ['chapter', book?.id, chapter], enabled: valid,
    queryFn: async () => {
      const { data, error } = await supabase.from('verses').select(VERSE_SELECT).eq('book_id', book!.id).eq('chapter', chapter).order('verse');
      if (error) throw error;
      return data as unknown as Verse[];
    },
  });

  useEffect(() => { setSelected(null); }, [book?.id, chapter]);
  useEffect(() => { if (valid && book) void savePosition({ bookId: book.id, chapter }, user?.id); }, [valid, book?.id, chapter, user?.id]);
  useEffect(() => {
    if (book && valid) document.title = `${book.name} ${chapter} · Verbum`;
    return () => { document.title = 'Verbum — Bíblia e vida católica'; };
  }, [book, chapter, valid]);

  const prev = useMemo(() => (book ? adjacentChapter(books.data!, { bookId: book.id, chapter }, -1) : null), [books.data, book, chapter]);
  const next = useMemo(() => (book ? adjacentChapter(books.data!, { bookId: book.id, chapter }, 1) : null), [books.data, book, chapter]);
  useEffect(() => {
    // Atalhos de teclado no computador: ← capítulo anterior, → próximo
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (document.querySelector('dialog[open]')) return;
      const p = e.key === 'ArrowLeft' ? prev : e.key === 'ArrowRight' ? next : null;
      const b = p ? books.data?.find((x) => x.id === p.bookId) : undefined;
      if (p && b) navigate(`/biblia/${bookSlug(b)}/${p.chapter}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, books.data, navigate]);

  const href = (p: { bookId: number; chapter: number }) => `/biblia/${bookSlug(books.data!.find((b) => b.id === p.bookId)!)}/${p.chapter}`;

  if (books.isLoading) return <Spinner />;
  if (books.isError) return <ErrorBox onRetry={() => books.refetch()} />;
  if (!valid || !book) {
    return <EmptyState title="Capítulo não encontrado" action={{ to: '/biblia', label: 'Escolher um livro' }}>Esse livro ou capítulo não existe.</EmptyState>;
  }

  const mode = resolveMode(prefs.mode, book.id);
  const fi = FONTS.indexOf(prefs.font);
  const sel = verses.data?.find((v) => v.id === selected) ?? null;

  const nav = (
    <nav aria-label="Capítulos" className="flex items-center justify-between gap-2">
      {prev ? <Link to={href(prev)} className="btn-outline"><ChevronLeft className="h-4 w-4" aria-hidden /> Anterior</Link> : <span />}
      {next ? <Link to={href(next)} className="btn-outline">Próximo <ChevronRight className="h-4 w-4" aria-hidden /></Link> : <span />}
    </nav>
  );

  return (
    <div>
      <div className="sticky top-[3.25rem] z-10 -mx-4 mb-6 border-b border-line/80 bg-bg/95 px-4 py-3 backdrop-blur md:top-0 md:-mx-10 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {prev ? <Link to={href(prev)} className="icon-btn -ml-2" aria-label="Capítulo anterior"><ChevronLeft className="h-5 w-5" /></Link> : <span className="-ml-2 h-10 w-10" aria-hidden />}
            <div className="min-w-0">
              <Link to="/biblia" className="eyebrow hover:underline">{book.testament === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'}</Link>
              <h1 className="font-serif text-[1.7rem] leading-tight sm:text-3xl">
                <button onClick={() => setPicker(true)} aria-haspopup="dialog" aria-label={`${book.name} ${chapter}. Escolher outro livro ou capítulo`} className="inline-flex items-center gap-1.5 text-left transition-colors hover:text-olive">
                  <span>{book.name} <span className="text-muted">{chapter}</span></span><ChevronDown className="h-4 w-4 text-muted" aria-hidden />
                </button>
              </h1>
            </div>
            {next ? <Link to={href(next)} className="icon-btn" aria-label="Próximo capítulo"><ChevronRight className="h-5 w-5" /></Link> : <span className="h-10 w-10" aria-hidden />}
          </div>
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Modo de leitura" className="flex border-b border-line text-xs sm:text-sm">
              {([['verses', 'Versículos'], ['continuous', 'Contínuo']] as const).map(([id, label]) => (
                <button key={id} onClick={() => prefs.setMode(id)} aria-pressed={mode === id}
                  className={cn('px-2 py-2 sm:px-3', mode === id ? 'border-b-2 border-olive font-medium text-olive' : 'text-muted')}>{label}</button>
              ))}
            </div>
            <button className="icon-btn" aria-label="Diminuir fonte" disabled={fi <= 0} onClick={() => { const s = FONTS[fi - 1]; if (s) prefs.setFont(s); }}><Minus className="h-4 w-4" /></button>
            <button className="icon-btn" aria-label="Aumentar fonte" disabled={fi >= FONTS.length - 1} onClick={() => { const l = FONTS[fi + 1]; if (l) prefs.setFont(l); }}><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <TestNotice className="mb-6" />

      {verses.isLoading ? <VersesSkeleton /> : verses.isError ? <ErrorBox onRetry={() => verses.refetch()} /> : !verses.data?.length ? (
        <EmptyState title="Texto bíblico ainda não importado">Este capítulo ainda não tem texto na base. Quando a fonte estiver configurada, ele aparecerá aqui.</EmptyState>
      ) : mode === 'verses' ? (
        <ol className="mx-auto max-w-[70ch] space-y-1.5">
          {verses.data.map((v) => (
            <li key={v.id} id={`v${v.verse}`} className="group flex flex-wrap items-start gap-x-3 rounded-md px-1.5 py-2 transition-colors hover:bg-soft/45 sm:px-2 sm:py-2.5">
              <span className="w-6 shrink-0 pt-1.5 text-right font-sans text-[0.68rem] font-semibold tabular-nums text-gold" aria-label={`Versículo ${v.verse}`}>{v.verse}</span>
              <p className="verse-text min-w-0 flex-1">{v.text}</p>
              <VerseActions verse={v} dialogs={dialogs} className="basis-full justify-start pl-9 sm:basis-auto sm:pl-0 sm:opacity-0 sm:transition-opacity group-hover:sm:opacity-100 group-focus-within:sm:opacity-100" />
            </li>
          ))}
        </ol>
      ) : (
        <div className="verse-text mx-auto max-w-[65ch] !leading-[1.9]">
          {verses.data.map((v) => {
            const isSel = v.id === selected;
            return (
              <span key={v.id} id={`v${v.verse}`}>
                <sup className="mr-1 select-none font-sans text-[0.6em] font-semibold text-gold">{v.verse}</sup>
                <span
                  role="button" tabIndex={0} aria-pressed={isSel} aria-label={`Versículo ${v.verse}: ${v.text}`}
                  onClick={() => setSelected(isSel ? null : v.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(isSel ? null : v.id); } }}
                  className={cn('cursor-pointer rounded px-0.5 box-decoration-clone', isSel ? 'bg-gold/25' : favs.data?.has(v.id) ? 'bg-gold/10' : 'hover:bg-soft', notes.data?.has(v.id) && 'underline decoration-gold decoration-dotted underline-offset-4')}
                >{v.text}</span>{' '}
              </span>
            );
          })}
        </div>
      )}

      <PracticeSuggestion chapterKey={`${book.id}:${chapter}`} />
      <div className="mt-10">{nav}</div>

      {mode === 'continuous' && sel && (
        <div role="toolbar" aria-label={`Ações do versículo ${sel.verse}`} className="surface fade-up fixed inset-x-3 bottom-20 z-30 mx-auto flex max-w-md items-center justify-between gap-2 px-3 py-2 md:bottom-6">
          <span className="text-sm font-medium">{book.name} {chapter},{sel.verse}</span>
          <VerseActions verse={sel} dialogs={dialogs} />
          <button className="icon-btn" onClick={() => setSelected(null)} aria-label="Fechar ações"><X className="h-4 w-4" /></button>
        </div>
      )}
      {element}
      <ChapterPicker open={picker} books={books.data!} initialBookId={book.id} current={{ bookId: book.id, chapter }} onClose={() => setPicker(false)} />
    </div>
  );
}
