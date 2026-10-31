import { normalize } from './reference';

export type NavBook = { id: number; name: string; chapters_count: number; position: number };
export type Pos = { bookId: number; chapter: number };

/** Endereço de cada livro: nome sem acento e sem espaços (único para os 73 livros). */
export const bookSlug = (b: { name: string }) => normalize(b.name);

/** Capítulo anterior / seguinte, atravessando livros na ordem canônica. */
export function adjacentChapter(books: NavBook[], pos: Pos, dir: -1 | 1): Pos | null {
  const sorted = [...books].sort((a, b) => a.position - b.position);
  const i = sorted.findIndex((b) => b.id === pos.bookId);
  const book = sorted[i];
  if (!book) return null;
  const ch = pos.chapter + dir;
  if (ch >= 1 && ch <= book.chapters_count) return { bookId: book.id, chapter: ch };
  const other = sorted[i + dir];
  if (!other) return null;
  return { bookId: other.id, chapter: dir === 1 ? 1 : other.chapters_count };
}
