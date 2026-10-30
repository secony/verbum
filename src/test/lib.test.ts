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

import { PLAN_TEMPLATES, buildPlanItems, nextUnread } from '../lib/plans';
import { fitText, wrapLines } from '../lib/share-image';

describe('planos de leitura', () => {
  it('têm os tamanhos esperados e itens em sequência', () => {
    const count = (slug: string) => buildPlanItems(BOOKS, PLAN_TEMPLATES.find((t) => t.slug === slug)!.bookIds).length;
    expect(count('evangelhos')).toBe(28 + 16 + 24 + 21);
    expect(count('novo-testamento')).toBe(260);
    expect(count('salmos')).toBe(150);
    expect(count('proverbios')).toBe(31);
    const it = buildPlanItems(BOOKS, [47, 48]);
    expect(it.map((i) => i.position)).toEqual(Array.from({ length: 44 }, (_, k) => k + 1));
    expect(it[28]).toEqual({ position: 29, book_id: 48, chapter: 1 });
  });
  it('próximo item não lido', () => {
    const items = [{ id: 'a', position: 1 }, { id: 'b', position: 2 }, { id: 'c', position: 3 }];
    expect(nextUnread(items, new Set(['a']))?.id).toBe('b');
    expect(nextUnread(items, new Set(['a', 'b', 'c']))).toBeNull();
  });
  it('rejeita livro inexistente', () => {
    expect(() => buildPlanItems(BOOKS, [999])).toThrow();
  });
});

describe('imagem do versículo', () => {
  const measure = (s: string) => s.length * 10;
  it('quebra linhas sem passar da largura', () => {
    const lines = wrapLines('uma duas tres quatro cinco seis', 100, measure);
    expect(lines.every((l) => measure(l) <= 100)).toBe(true);
    expect(lines.join(' ')).toBe('uma duas tres quatro cinco seis');
  });
  it('escolhe o maior tamanho que cabe', () => {
    const text = 'palavra '.repeat(40).trim();
    const r = fitText(text, 400, 300, 1.4, [60, 40, 20], (size) => (s) => s.length * (size / 2));
    expect([60, 40, 20]).toContain(r.size);
    expect(r.lines.length * r.size * 1.4 <= 300 || r.size === 20).toBe(true);
    expect(fitText('curto', 400, 300, 1.4, [60, 40], (size) => (s) => s.length * size).size).toBe(60);
  });
});

import { coverage, filterChurches, formatTime, groupByWeekday, mapLinks, parseBody, parseSources, safeUrl, scheduleStatus, slugify, type Church, type Schedule } from '../lib/catholic';

describe('texto simples dos artigos', () => {
  it('separa parágrafos, subtítulos e listas', () => {
    const b = parseBody('Primeiro parágrafo\ncontinua aqui.\n\n## Subtítulo\n\nPontos:\n- um\n- dois\n\nFim.');
    expect(b).toEqual([
      { type: 'p', text: 'Primeiro parágrafo continua aqui.' },
      { type: 'h', text: 'Subtítulo' },
      { type: 'p', text: 'Pontos:' },
      { type: 'ul', items: ['um', 'dois'] },
      { type: 'p', text: 'Fim.' },
    ]);
  });
  it('slug, fontes e links seguros', () => {
    expect(slugify('Confirmação ou Crisma')).toBe('confirmacao-ou-crisma');
    expect(parseSources('CIC\nCNBB | https://www.cnbb.org.br')).toEqual([{ label: 'CIC' }, { label: 'CNBB', url: 'https://www.cnbb.org.br' }]);
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeUrl('https://exemplo.com')).toBe('https://exemplo.com');
    expect(safeUrl(null)).toBeUndefined();
  });
});

describe('horários de missa', () => {
  const now = new Date(2026, 9, 28);
  it('nunca mostra horário não confirmado ou antigo como garantido', () => {
    expect(scheduleStatus({ confirmed: false, verified_at: null }, now).tone).toBe('none');
    expect(scheduleStatus({ confirmed: true, verified_at: null }, now).label).toBe('Horário não confirmado');
    expect(scheduleStatus({ confirmed: true, verified_at: '2026-10-01' }, now)).toEqual({ label: 'Confirmado em 01/10/2026', tone: 'ok' });
    expect(scheduleStatus({ confirmed: true, verified_at: '2026-05-01' }, now).tone).toBe('warn');
  });
  it('formata horas', () => { expect(formatTime('08:00:00')).toBe('8h'); expect(formatTime('19:30:00')).toBe('19h30'); });

  const sch = (o: Partial<Schedule>): Schedule => ({ id: Math.random().toString(), church_id: 'c', weekday: 0, time: '08:00:00', kind: 'missa', schedule_type: 'regular', confirmed: true, source: 's', verified_at: '2026-10-01', note: null, ...o });
  const church = (o: Partial<Church>): Church => ({ id: 'c', city_id: 'x', name: 'Catedral', popular_name: null, parish: null, diocese: null, address: 'Rua A, 1', neighborhood: 'Centro', latitude: null, longitude: null, phone: null, website: null, social: null, accessibility: null, notes: null, source: 'x', verified_at: '2026-10-01', published: true, updated_at: '', mass_schedules: [], ...o });
  it('filtra por dia e horário usando só missas confirmadas', () => {
    const a = church({ id: 'a', name: 'Matriz', mass_schedules: [sch({ weekday: 0, time: '19:00:00' })] });
    const b = church({ id: 'b', name: 'Capela', mass_schedules: [sch({ weekday: 0, time: '19:00:00', confirmed: false, verified_at: null, source: null })] });
    const base = { q: '', neighborhood: '', weekday: '', from: '', onlyFav: false };
    expect(filterChurches([a, b], { ...base, weekday: '0' }).map((c) => c.id)).toEqual(['a']);
    expect(filterChurches([a, b], { ...base, weekday: '0', from: '20:00' })).toEqual([]);
    expect(filterChurches([a, b], { ...base, q: 'cap' }).map((c) => c.id)).toEqual(['b']);
    expect(filterChurches([a, b], { ...base, onlyFav: true, favIds: new Set(['b']) }).map((c) => c.id)).toEqual(['b']);
  });
  it('agrupa por dia, calcula cobertura e links de mapa', () => {
    const g = groupByWeekday([sch({ weekday: 0, time: '19:00:00' }), sch({ weekday: 0, time: '07:00:00' }), sch({ weekday: 3 })]);
    expect(g[0]!.items.map((s) => s.time)).toEqual(['07:00:00', '19:00:00']);
    expect(g[3]!.items).toHaveLength(1); expect(g[1]!.items).toHaveLength(0);
    const cv = coverage([church({ mass_schedules: [sch({})] }), church({ id: 'z', mass_schedules: [] })]);
    expect(cv).toMatchObject({ total: 2, withConfirmed: 1, lastVerified: '2026-10-01' });
    expect(mapLinks({ latitude: -20.5, longitude: -49.2, address: null, neighborhood: null }).route).toContain('-20.5,-49.2');
    expect(mapLinks({ latitude: null, longitude: null, address: 'Rua A, 1', neighborhood: null }).route).toContain('Rua%20A');
    expect(mapLinks({ latitude: null, longitude: null, address: null, neighborhood: null }).route).toBeUndefined();
  });
});
