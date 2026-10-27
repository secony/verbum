export type ReadingMode = 'verses' | 'continuous';

/** Poesia lê melhor com um versículo por linha: Salmos (23), Provérbios (24), Cântico (26). */
export const VERSE_BY_VERSE_BOOKS = new Set([23, 24, 26]);

export const isValidMode = (v: unknown): v is ReadingMode => v === 'verses' || v === 'continuous';
export const defaultModeForBook = (bookId: number): ReadingMode =>
  VERSE_BY_VERSE_BOOKS.has(bookId) ? 'verses' : 'continuous';
/** Escolha explícita do usuário vale para todos os livros; sem ela, vale o padrão do livro. */
export const resolveMode = (explicit: unknown, bookId: number): ReadingMode =>
  isValidMode(explicit) ? explicit : defaultModeForBook(bookId);
