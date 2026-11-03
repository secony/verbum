import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, BookX, Clock, Compass, Footprints, Heart, Landmark, ScrollText } from 'lucide-react';
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
    <div className="space-y-12">
      <header className="fade-up border-l-2 border-olive bg-soft/65 px-5 py-6 sm:px-8 sm:py-8">
        <div className="max-w-xl">
          <p className="eyebrow mb-3">{fmtDate(now)}</p>
          <h1 className="text-4xl leading-tight sm:text-5xl">{greeting(now)}.</h1>
          <p className="mt-3 text-base leading-7 text-muted">Reserve um momento de silêncio para estar com a Palavra.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {lastBook && last.data ? (
              <Link to={`/biblia/${bookSlug(lastBook)}/${last.data.chapter}`} className="btn-primary"><BookOpen className="h-4 w-4" aria-hidden /> Continuar {lastBook.name} {last.data.chapter}</Link>
            ) : <Link to="/biblia" className="btn-primary"><BookOpen className="h-4 w-4" aria-hidden /> Começar a leitura</Link>}
            <Link to="/caminhada" className="btn-outline"><Footprints className="h-4 w-4" aria-hidden /> Minha caminhada</Link>
          </div>
        </div>
      </header>

      <section aria-labelledby="pd">
        <h2 id="pd" className="eyebrow mb-3">Palavra do dia</h2>
        <WordOfTheDay />
        <TestNotice className="mt-3" />
      </section>

      <section aria-labelledby="temas">
        <h2 id="temas" className="mb-4 text-2xl sm:text-3xl">Temas</h2>
        <div className="flex flex-wrap gap-2">
          {themes.data?.map((t) => <Link key={t.id} to={`/explorar?tema=${t.slug}`} className="chip">{t.name}</Link>)}
        </div>
      </section>

      <section aria-label="Acessos rápidos" className="grid gap-3 sm:grid-cols-2">
        {[
          { to: '/favoritos', icon: Heart, label: 'Meus favoritos' },
          { to: '/favoritos?aba=recentes', icon: Clock, label: 'Vistos recentemente' },
          { to: '/explorar', icon: Compass, label: 'Explorar versículos' },
          { to: '/catolica/terco', icon: Landmark, label: 'Rezar o terço' },
          { to: '/catolica/oracoes', icon: ScrollText, label: 'Orações' },
        ].map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="surface group flex items-center gap-3 p-5 transition-colors hover:border-gold">
            <Icon className="h-5 w-5 text-gold" aria-hidden /> <span className="flex-1">{label}</span><span className="text-muted transition-transform group-hover:translate-x-1" aria-hidden>→</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
