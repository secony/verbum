import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { bookSlug } from '../lib/bible-nav';
import { useBooks, useLastPosition, type Book } from '../lib/data';
import { cn } from '../lib/utils';
import { ErrorBox, PageHeader, Spinner } from '../components/ui';
import { TestNotice } from '../components/TestNotice';

function BookRow({ book, open, onToggle }: { book: Book; open: boolean; onToggle: () => void }) {
  return (
    <li className="border-b border-line last:border-0">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-soft">
        <span><span className="font-serif text-xl">{book.name}</span> <span className="text-xs text-muted">· {book.chapters_count} cap.</span></span>
        <ChevronRight className={cn('h-4 w-4 text-muted transition-transform', open && 'rotate-90')} aria-hidden />
      </button>
      {open && (
        <div className="grid grid-cols-6 gap-1.5 px-4 pb-4 sm:grid-cols-8 md:grid-cols-10">
          {Array.from({ length: book.chapters_count }, (_, i) => i + 1).map((c) => (
            <a key={c} href={`/biblia/${bookSlug(book)}/${c}`} className="rounded-lg border border-line py-1.5 text-center text-sm hover:border-olive hover:bg-soft">{c}</a>
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
  if (books.isLoading) return <Spinner />;
  if (books.isError || !books.data) return <ErrorBox onRetry={() => books.refetch()} />;

  const lastBook = last.data ? books.data.find((b) => b.id === last.data!.bookId) : undefined;
  const groups = [
    { id: 'AT', title: 'Antigo Testamento', items: books.data.filter((b) => b.testament === 'AT') },
    { id: 'NT', title: 'Novo Testamento', items: books.data.filter((b) => b.testament === 'NT') },
  ];
  return (
    <div>
      <PageHeader eyebrow="Cânon católico · 73 livros" title="Bíblia">Escolha um livro e um capítulo para ler.</PageHeader>
      <TestNotice className="mb-6" />
      {lastBook && last.data && (
        <a href={`/biblia/${bookSlug(lastBook)}/${last.data.chapter}`} className="surface mb-8 flex items-center justify-between p-5 hover:border-gold">
          <span><span className="eyebrow block">Continuar leitura</span><span className="font-serif text-2xl">{lastBook.name} {last.data.chapter}</span></span>
          <ChevronRight className="h-5 w-5 text-gold" aria-hidden />
        </a>
      )}
      <div className="grid gap-8 lg:grid-cols-2">
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={`g-${g.id}`}>
            <h2 id={`g-${g.id}`} className="mb-3 text-3xl">{g.title}</h2>
            <ul className="surface overflow-hidden">
              {g.items.map((b) => <BookRow key={b.id} book={b} open={open === b.id} onToggle={() => setOpen(open === b.id ? null : b.id)} />)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
