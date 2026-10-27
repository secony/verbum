import { describe, expect, it } from 'vitest';
import { BOOKS } from './books.fixture';
import { parseReference } from '../lib/reference';
import { adjacentChapter, bookSlug } from '../lib/bible-nav';
import { dailyIndex, dayNumber } from '../lib/daily';
import { defaultModeForBook, isValidMode, resolveMode } from '../lib/reading-mode';
import { localDay, shiftDay, shouldWelcomeBack, type WalkData } from '../lib/walk';

const ref = (s: string) => parseReference(s, BOOKS);

describe('parseReference', () => {
  it('distingue Jó de João', () => {
    expect(ref('Jo 3,16')).toEqual({ bookId: 50, chapter: 3, verse: 16 });
    expect(ref('jo 3,16')?.bookId).toBe(50);
    expect(ref('Jó 3')).toEqual({ bookId: 22, chapter: 3, verse: undefined });
    expect(ref('job 3')?.bookId).toBe(22);
  });
  it('aceita nomes em português e em inglês', () => {
    expect(ref('Salmos 22:1')).toEqual({ bookId: 23, chapter: 22, verse: 1 });
    expect(ref('John 3:16')?.bookId).toBe(50);
    expect(ref('1Cor 13')).toEqual({ bookId: 53, chapter: 13, verse: undefined });
    expect(ref('1 Cor 13,4')?.verse).toBe(4);
    expect(ref('Psalms 23')?.bookId).toBe(23);
    expect(ref('1 Kings 3')?.bookId).toBe(11);
    expect(ref('Revelation 1')?.bookId).toBe(73);
  });
  it('não trata texto comum como referência', () => {
    expect(ref('love')).toBeNull();
    expect(ref('the lord is my shepherd')).toBeNull();
    expect(ref('Zzzz 3')).toBeNull();
  });
});

describe('bookSlug / adjacentChapter', () => {
  it('os 73 endereços são únicos e Jó ≠ João', () => {
    const slugs = BOOKS.map(bookSlug);
    expect(new Set(slugs).size).toBe(73);
    expect(bookSlug(BOOKS[21]!)).toBe('jo');
    expect(bookSlug(BOOKS[49]!)).toBe('joao');
  });
  it('atravessa livros', () => {
    expect(adjacentChapter(BOOKS, { bookId: 1, chapter: 50 }, 1)).toEqual({ bookId: 2, chapter: 1 });
    expect(adjacentChapter(BOOKS, { bookId: 2, chapter: 1 }, -1)).toEqual({ bookId: 1, chapter: 50 });
    expect(adjacentChapter(BOOKS, { bookId: 1, chapter: 1 }, -1)).toBeNull();
    expect(adjacentChapter(BOOKS, { bookId: 73, chapter: 22 }, 1)).toBeNull();
    expect(adjacentChapter(BOOKS, { bookId: 46, chapter: 4 }, 1)).toEqual({ bookId: 47, chapter: 1 });
  });
});

describe('Palavra do dia', () => {
  it('é determinística, dentro do intervalo e muda de um dia para o outro', () => {
    const a = dailyIndex(new Date(2026, 9, 23), 35804)!;
    expect(dailyIndex(new Date(2026, 9, 23), 35804)).toBe(a);
    expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThan(35804);
    expect(dailyIndex(new Date(2026, 9, 24), 35804)).not.toBe(a);
    expect(dailyIndex(new Date(), 0)).toBeNull();
    expect(dayNumber(new Date(1970, 0, 2))).toBe(1);
  });
});

describe('modo de leitura', () => {
  it('padrão por livro e escolha explícita', () => {
    expect(defaultModeForBook(23)).toBe('verses');
    expect(defaultModeForBook(24)).toBe('verses');
    expect(defaultModeForBook(26)).toBe('verses');
    expect(defaultModeForBook(1)).toBe('continuous');
    expect(resolveMode(null, 23)).toBe('verses');
    expect(resolveMode('continuous', 23)).toBe('continuous');
    expect(resolveMode('verses', 1)).toBe('verses');
    expect(isValidMode('x')).toBe(false);
  });
});

describe('caminhada: dia local e retomada', () => {
  it('calcula o dia civil no fuso do usuário', () => {
    const t = new Date('2026-10-23T02:30:00Z');
    expect(localDay(t, 'America/Sao_Paulo')).toBe('2026-10-22');
    expect(localDay(t, 'UTC')).toBe('2026-10-23');
  });
  it('shiftDay atravessa mês e ano', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDay('2024-03-01', -1)).toBe('2024-02-29');
  });
  const base: WalkData = { today: '2026-10-23', last_day: '2026-10-23', streak: { current_streak: 5, longest_streak: 5, total_days: 5 }, days: [], done: [] };
  it('mensagem de retomada só após pausa', () => {
    expect(shouldWelcomeBack(base)).toBe(false);
    expect(shouldWelcomeBack({ ...base, last_day: '2026-10-22' })).toBe(false);
    expect(shouldWelcomeBack({ ...base, last_day: '2026-10-20' })).toBe(true);
    expect(shouldWelcomeBack({ ...base, streak: { current_streak: 1, longest_streak: 4, total_days: 9 } })).toBe(true);
    expect(shouldWelcomeBack({ ...base, last_day: null })).toBe(false);
  });
});
