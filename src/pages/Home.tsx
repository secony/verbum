import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, BookX, Clock, Compass, Footprints, Heart, Landmark, ScrollText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dailyIndex, greeting } from '../lib/daily';
import { fmtDate } from '../lib/utils';
import { VERSE_SELECT, useBooks, useLastPosition, useThemes, useVerseCount, type Verse } from '../lib/data';
import { bookSlug } from '../lib/bible-nav';
import { VerseCard } from '../components/VerseCard';
import { useVerseDialogs } from '../components/VerseDialogs';
import { TestNotice } from '../components/TestNotice';
import { EmptyState, ErrorBox, Spinner } from '../components/ui';

function WordOfTheDay() {
  const { dialogs, element } = useVerseDialogs();
  const count = useVerseCount();
  const idx = count.data != null ? dailyIndex(new Date(), count.data) : null;
  const verse = useQuery({
    queryKey: ['word-of-day', idx], enabled: idx != null,
    queryFn: async () => {
      if (idx == null) throw new Error('indisponível');
      const { data, error } = await supabase.from('verses').select(VERSE_SELECT).order('id').range(idx, idx).single();
      if (error) throw error;
      return data as unknown as Verse;
    },
  });
  const reflection = useQuery({
    queryKey: ['reflection', verse.data?.id], enabled: !!verse.data,
    queryFn: async () => {
      const { data } = await supabase.from('editorial_reflections').select('body,author').eq('verse_id', verse.data!.id).limit(1).maybeSingle();
      return data as { body: string; author: string | null } | null;
    },
  });

  if (count.isLoading || verse.isLoading) return <Spinner />;
  if (count.isError || verse.isError) return <ErrorBox onRetry={() => { count.refetch(); verse.refetch(); }} />;
  if (idx == null || !verse.data) {
    return (
      <EmptyState icon={<BookX className="h-8 w-8" />} title="A Palavra do dia ainda não está disponível">
        O texto bíblico ainda não foi importado. Assim que a fonte estiver configurada, o versículo do dia aparecerá aqui.
      </EmptyState>
    );
  }
  return (
    <div className="space-y-3">
      <VerseCard verse={verse.data} dialogs={dialogs} large />
      {reflection.data && (
        <aside className="surface p-5 text-sm">
          <p className="eyebrow mb-2">Reflexão editorial · não é texto bíblico</p>
          <p className="text-muted">{reflection.data.body}</p>
          {reflection.data.author && <p className="mt-2 text-xs text-muted">— {reflection.data.author}</p>}
        </aside>
      )}
      {element}
    </div>
  );
}

export default function Home() {
  const now = new Date();
  const themes = useThemes();
  const books = useBooks();
  const last = useLastPosition();
  const lastBook = last.data ? books.data?.find((book) => book.id === last.data?.bookId) : undefined;
  return (
    <div className="space-y-12 sm:space-y-14">
      <header className="fade-up flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="eyebrow mb-2">{fmtDate(now)}</p>
          <h1 className="text-4xl leading-tight sm:text-[2.8rem]">{greeting(now)}.</h1>
        </div>
        <Link to="/caminhada" className="mb-1 inline-flex items-center gap-2 text-sm text-muted underline-offset-4 hover:text-olive hover:underline"><Footprints className="h-4 w-4" aria-hidden /> Minha caminhada</Link>
      </header>

      <section aria-labelledby="continue-reading">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="continue-reading" className="eyebrow">Sua leitura</h2>
          <Link to="/biblia" className="text-xs text-muted underline-offset-4 hover:text-olive hover:underline">Biblioteca</Link>
        </div>
        <Link to={lastBook && last.data ? `/biblia/${bookSlug(lastBook)}/${last.data.chapter}` : '/biblia'} className="group flex items-center justify-between gap-4 border-y border-olive/30 py-4 transition-colors hover:border-olive sm:py-5">
          <div className="min-w-0">
            <p className="text-xs text-muted">{lastBook && last.data ? 'Retome de onde parou' : 'Comece uma leitura'}</p>
            <h2 className="mt-1 truncate font-serif text-2xl sm:text-[1.8rem]">{lastBook && last.data ? `${lastBook.name} ${last.data.chapter}` : 'Explore as Escrituras'}</h2>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-olive text-on-olive transition-transform group-hover:translate-x-1"><ArrowRight className="h-5 w-5" aria-hidden /></span>
        </Link>
      </section>

      <section aria-labelledby="pd">
        <div className="mb-3">
          <p className="eyebrow">Para meditar</p>
          <h2 id="pd" className="mt-1 font-serif text-2xl sm:text-3xl">Palavra do dia</h2>
        </div>
        <WordOfTheDay />
        <TestNotice className="mt-3" />
      </section>

      <section aria-labelledby="temas" className="border-t border-line pt-7">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="temas" className="font-serif text-2xl sm:text-3xl">Explore por tema</h2>
          <Link to="/explorar" className="text-xs text-muted underline-offset-4 hover:text-olive hover:underline">Ver tudo</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {themes.data?.map((t) => <Link key={t.id} to={`/explorar?tema=${t.slug}`} className="chip">{t.name}</Link>)}
        </div>
      </section>

      <section aria-label="Acessos rápidos" className="grid gap-x-8 sm:grid-cols-2">
        {[
          { to: '/favoritos', icon: Heart, label: 'Meus favoritos' },
          { to: '/favoritos?aba=recentes', icon: Clock, label: 'Vistos recentemente' },
          { to: '/explorar', icon: Compass, label: 'Explorar versículos' },
          { to: '/catolica/terco', icon: Landmark, label: 'Rezar o terço' },
          { to: '/catolica/oracoes', icon: ScrollText, label: 'Orações' },
        ].map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="group flex min-h-12 items-center gap-3 border-b border-line py-3 text-sm transition-colors hover:text-olive">
            <Icon className="h-4 w-4 text-gold" aria-hidden /> <span className="flex-1">{label}</span><ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        ))}
      </section>
    </div>
  );
}
