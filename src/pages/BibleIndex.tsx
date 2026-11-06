import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { bookSlug } from '../lib/bible-nav';
import { useBooks, useLastPosition, type Book } from '../lib/data';
import { cn } from '../lib/utils';
import { ErrorBox, PageHeader, Spinner } from '../components/ui';
import { TestNotice } from '../components/TestNotice';
import { ChapterPicker } from '../components/ChapterPicker';

function BookRow({ book, onOpen }: { book: Book; onOpen: () => void }) {
  return (
    <li className="border-b border-line/70">
      <button onClick={onOpen} aria-haspopup="dialog" className="group flex min-h-12 w-full items-center justify-between gap-2 py-2 text-left hover:text-olive">
        <span className="min-w-0"><span className="font-serif text-[1.2rem]">{book.name}</span> <span className="ml-1 whitespace-nowrap text-xs text-muted">{book.chapters_count} caps.</span></span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-olive" aria-hidden />
      </button>
    </li>
  );
}

export default function BibleIndex() {
  const books = useBooks();
  const last = useLastPosition();
  const [picker, setPicker] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  if (books.isLoading) return <Spinner />;
  if (books.isError || !books.data) return <ErrorBox onRetry={() => books.refetch()} />;

  const lastBook = last.data ? books.data.find((b) => b.id === last.data!.bookId) : undefined;
  const groups = [
    { id: 'AT', title: 'Antigo Testamento', items: books.data.filter((b) => b.testament === 'AT' && b.name.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))) },
    { id: 'NT', title: 'Novo Testamento', items: books.data.filter((b) => b.testament === 'NT' && b.name.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))) },
  ];
  return (
    <div>
      <PageHeader eyebrow="A biblioteca" title="Bíblia">Encontre um livro ou retome sua leitura. Selecione um livro para ver os capítulos.</PageHeader>
      <TestNotice className="mb-6 max-w-2xl" />
      <label className="relative mb-8 block max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <span className="sr-only">Buscar livro bíblico</span>
        <input type="search" className="input pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex.: Gênesis, João, Salmos" />
      </label>
      {lastBook && last.data && (
        <Link to={`/biblia/${bookSlug(lastBook)}/${last.data.chapter}`} className="mb-10 flex items-center justify-between border-y border-olive/30 py-4 transition-colors hover:border-olive">
          <span><span className="eyebrow block">Retomar de onde parou</span><span className="font-serif text-2xl">{lastBook.name} {last.data.chapter}</span></span>
          <ChevronRight className="h-5 w-5 text-olive" aria-hidden />
        </Link>
      )}
      {groups.every((group) => !group.items.length) ? <p className="py-8 text-sm text-muted">Nenhum livro encontrado para essa busca.</p> : <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
        {groups.filter((g) => g.items.length > 0).map((g) => (
          <section key={g.id} aria-labelledby={`g-${g.id}`}>
            <div className="mb-4 flex items-baseline justify-between border-b border-line pb-2">
              <h2 id={`g-${g.id}`} className="text-2xl">{g.title}</h2>
              <span className="text-xs text-muted">{g.items.length} livros</span>
            </div>
            <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {g.items.map((b) => <BookRow key={b.id} book={b} onOpen={() => setPicker(b.id)} />)}
            </ul>
          </section>
        ))}
      </div>}
      <ChapterPicker open={picker !== null} books={books.data} initialBookId={picker ?? books.data[0]!.id} onClose={() => setPicker(null)} />
    </div>
  );
}
