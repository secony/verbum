export type BookLite = { id: number; name: string; abbreviation: string };

/** minúsculas, sem acentos e sem espaços/pontos */
export function normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s.]+/g, '').toLowerCase();
}
const exactKey = (s: string) => s.normalize('NFC').replace(/[\s.]+/g, '').toLowerCase();

/** Nomes em inglês (e do Douay-Rheims) aceitos na busca, por id do livro. */
const ALIASES: Record<number, string[]> = {
  1: ['genesis'], 2: ['exodus'], 3: ['leviticus'], 4: ['numbers'], 5: ['deuteronomy'],
  6: ['joshua', 'josue'], 7: ['judges'], 8: ['ruth'], 9: ['1samuel'], 10: ['2samuel'],
  11: ['1kings', '3kings'], 12: ['2kings', '4kings'], 13: ['1chronicles', '1paralipomenon'],
  14: ['2chronicles', '2paralipomenon'], 15: ['ezra', '1esdras'], 16: ['nehemiah', '2esdras'],
  17: ['tobit', 'tobias'], 18: ['judith'], 19: ['esther'], 20: ['1maccabees', '1machabees'],
  21: ['2maccabees', '2machabees'], 22: ['job'], 23: ['psalms', 'psalm'], 24: ['proverbs'],
  25: ['ecclesiastes'], 26: ['songofsolomon', 'songofsongs', 'canticles', 'canticleofcanticles'],
  27: ['wisdom'], 28: ['sirach', 'ecclesiasticus'], 29: ['isaiah', 'isaias'], 30: ['jeremiah', 'jeremias'],
  31: ['lamentations'], 32: ['baruch'], 33: ['ezekiel', 'ezechiel'], 34: ['daniel'], 35: ['hosea', 'osee'],
  36: ['joel'], 37: ['amos'], 38: ['obadiah', 'abdias'], 39: ['jonah', 'jonas'], 40: ['micah', 'micheas'],
  41: ['nahum'], 42: ['habakkuk', 'habacuc'], 43: ['zephaniah', 'sophonias'], 44: ['haggai', 'aggeus'],
  45: ['zechariah', 'zacharias'], 46: ['malachi', 'malachias'], 47: ['matthew'], 48: ['mark'], 49: ['luke'],
  50: ['john'], 51: ['acts'], 52: ['romans'], 53: ['1corinthians'], 54: ['2corinthians'], 55: ['galatians'],
  56: ['ephesians'], 57: ['philippians'], 58: ['colossians'], 59: ['1thessalonians'], 60: ['2thessalonians'],
  61: ['1timothy'], 62: ['2timothy'], 63: ['titus'], 64: ['philemon'], 65: ['hebrews'], 66: ['james'],
  67: ['1peter'], 68: ['2peter'], 69: ['1john'], 70: ['2john'], 71: ['3john'], 72: ['jude'],
  73: ['revelation', 'apocalypse'],
};

export function findBook<T extends BookLite>(raw: string, books: T[]): T | undefined {
  const exact = exactKey(raw);
  const norm = normalize(raw);
  if (!norm) return undefined;
  return (
    // 1) abreviatura / nome COM acento (diferencia "Jó" de "Jo" = João)
    books.find((b) => exactKey(b.abbreviation) === exact) ??
    books.find((b) => exactKey(b.name) === exact) ??
    // 2) sem acento
    books.find((b) => normalize(b.abbreviation) === norm) ??
    books.find((b) => normalize(b.name) === norm) ??
    // 3) nomes em inglês
    books.find((b) => (ALIASES[b.id] ?? []).includes(norm)) ??
    // 4) começo do nome
    (norm.length >= 3 ? books.find((b) => normalize(b.name).startsWith(norm)) : undefined)
  );
}

/** Interpreta "Jo 3,16", "1Cor 13", "Salmos 22:1", "John 3:16". Retorna null se não for referência. */
export function parseReference<T extends BookLite>(input: string, books: T[]) {
  const m = input.trim().match(/^([1-3]?\s?[\p{L}][\p{L}\s.]*?)\s*(\d+)(?:\s*[,:.]\s*(\d+))?$/u);
  if (!m) return null;
  const book = findBook(m[1] ?? '', books);
  if (!book) return null;
  return { bookId: book.id, chapter: Number(m[2]), verse: m[3] ? Number(m[3]) : undefined };
}
