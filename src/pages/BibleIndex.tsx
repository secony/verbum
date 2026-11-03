import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { bookSlug } from '../lib/bible-nav';
import { useBooks, useLastPosition, type Book } from '../lib/data';
import { cn } from '../lib/utils';
import { ErrorBox, PageHeader, Spinner } from '../components/ui';
import { TestNotice } from '../components/TestNotice';

function BookRow({ book, open, onToggle }: { book: Book; open: boolean; onToggle: () => void }) {
  return (
    <li className={cn('border-b border-line/70 pb-2', open && 'border-olive/50')}>
      <button onClick={onToggle} aria-expanded={open} className="flex min-h-12 w-full items-center justify-between gap-2 py-2 text-left hover:text-olive">
        <span><span className="font-serif text-[1.2rem]">{book.name}</span> <span className="ml-1 text-xs text-muted">{book.chapters_count} caps.</span></span>
        <ChevronRight className={cn('h-4 w-4 text-muted transition-transform', open && 'rotate-90 text-olive')} aria-hidden />
      </button>
      {open && (
        <div className="grid grid-cols-6 gap-2 pb-3 pt-1 sm:grid-cols-8 md:grid-cols-6 xl:grid-cols-8">
          {Array.from({ length: book.chapters_count }, (_, i) => i + 1).map((c) => (
            <Link key={c} to={`/biblia/${bookSlug(book)}/${c}`} className="flex min-h-10 items-center justify-center rounded-md bg-soft/70 text-sm tabular-nums transition-colors hover:bg-olive hover:text-on-olive">{c}</Link>
          ))}
        </div>
      )}
    </li>
  );
}

export default function BibleIndex() {
  const books = useBooks();
  const last = useLastPosition();
  const [open, setOpen] = useState<number | null>(null);
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
              {g.items.map((b) => <BookRow key={b.id} book={b} open={open === b.id} onToggle={() => setOpen(open === b.id ? null : b.id)} />)}
            </ul>
          </section>
        ))}
      </div>}
    </div>
  );
}
