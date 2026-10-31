export type PlanTemplate = { slug: string; title: string; description: string; bookIds: number[] };

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/**
 * Planos mecânicos, derivados só da estrutura do cânon (um capítulo por item).
 * Não há conteúdo editorial: nenhum plano "de 30 dias" é oferecido sem revisão humana.
 */
export const PLAN_TEMPLATES: PlanTemplate[] = [
  { slug: 'evangelhos', title: 'Evangelhos', description: 'Mateus, Marcos, Lucas e João, um capítulo de cada vez.', bookIds: [47, 48, 49, 50] },
  { slug: 'novo-testamento', title: 'Novo Testamento', description: 'De Mateus ao Apocalipse, na ordem do cânon.', bookIds: range(47, 73) },
  { slug: 'salmos', title: 'Salmos', description: 'Os 150 salmos, na numeração da Vulgata (a mesma do texto atual).', bookIds: [23] },
  { slug: 'proverbios', title: 'Provérbios em 31 dias', description: 'Um capítulo de Provérbios por dia.', bookIds: [24] },
];

export type PlanItem = { position: number; book_id: number; chapter: number };

/** Itens do plano: todos os capítulos dos livros indicados, na ordem em que aparecem em `bookIds`. */
export function buildPlanItems(books: { id: number; chapters_count: number }[], bookIds: number[]): PlanItem[] {
  const items: PlanItem[] = [];
  for (const id of bookIds) {
    const b = books.find((x) => x.id === id);
    if (!b) throw new Error(`Livro ${id} não encontrado`);
    for (let c = 1; c <= b.chapters_count; c++) items.push({ position: items.length + 1, book_id: id, chapter: c });
  }
  return items;
}

/** Primeiro item ainda não lido (ou null se o plano está completo). */
export function nextUnread<T extends { id: string; position: number }>(items: T[], done: Set<string>): T | null {
  return [...items].sort((a, b) => a.position - b.position).find((i) => !done.has(i.id)) ?? null;
}
