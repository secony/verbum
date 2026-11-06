import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from './ui';
import { bookSlug } from '../lib/bible-nav';
import type { Book } from '../lib/data';
import { cn } from '../lib/utils';

/** "Ir para…": escolhe livro e capítulo em um só lugar (folha inferior no celular). */
export function ChapterPicker({ open, books, initialBookId, current, onClose }: {
  open: boolean; books: Book[]; initialBookId: number; current?: { bookId: number; chapter: number }; onClose: () => void;
}) {
  const [bookId, setBookId] = useState(initialBookId);
  useEffect(() => { if (open) setBookId(initialBookId); }, [open, initialBookId]);
  const book = books.find((b) => b.id === bookId) ?? books[0];
  if (!book) return null;
  const groups = [{ label: 'Antigo Testamento', items: books.filter((b) => b.testament === 'AT') }, { label: 'Novo Testamento', items: books.filter((b) => b.testament === 'NT') }];
  return (
    <Modal open={open} onClose={onClose} title="Ir para…">
      <label htmlFor="pick-livro" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">Livro</label>
      <select id="pick-livro" className="input mb-5" value={book.id} onChange={(e) => setBookId(Number(e.target.value))}>
        {groups.map((g) => <optgroup key={g.label} label={g.label}>{g.items.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>)}
      </select>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Capítulo · {book.chapters_count} no total</p>
      <div className="grid max-h-[46dvh] grid-cols-6 gap-2 overflow-y-auto pb-1 sm:grid-cols-8">
        {Array.from({ length: book.chapters_count }, (_, i) => i + 1).map((c) => {
          const here = current?.bookId === book.id && current.chapter === c;
          return (
            <Link key={c} to={`/biblia/${bookSlug(book)}/${c}`} onClick={onClose} aria-current={here ? 'page' : undefined}
              className={cn('flex min-h-11 items-center justify-center rounded-lg text-sm tabular-nums transition-colors', here ? 'bg-olive font-semibold text-on-olive' : 'bg-soft/70 hover:bg-olive hover:text-on-olive')}>{c}</Link>
          );
        })}
      </div>
    </Modal>
  );
}
