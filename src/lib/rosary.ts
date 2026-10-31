/* Terço: orações, mistérios, passos e desenho das contas. Sem conteúdo editorial novo: só o rito tradicional. */

export type SetId = 'gozosos' | 'luminosos' | 'dolorosos' | 'gloriosos';
export type Mystery = { title: string; ref?: { label: string; bookId: number; chapter: number }; tradition?: boolean };
export type MysterySet = { id: SetId; title: string; days: string; mysteries: Mystery[] };

export const MYSTERY_SETS: MysterySet[] = [
  { id: 'gozosos', title: 'Mistérios Gozosos', days: 'segundas e sábados', mysteries: [
    { title: 'A Anunciação do Anjo a Maria', ref: { label: 'Lc 1,26-38', bookId: 49, chapter: 1 } },
    { title: 'A Visitação de Maria a Santa Isabel', ref: { label: 'Lc 1,39-56', bookId: 49, chapter: 1 } },
    { title: 'O Nascimento de Jesus em Belém', ref: { label: 'Lc 2,1-20', bookId: 49, chapter: 2 } },
    { title: 'A Apresentação de Jesus no Templo', ref: { label: 'Lc 2,22-38', bookId: 49, chapter: 2 } },
    { title: 'A perda e o encontro do Menino Jesus no Templo', ref: { label: 'Lc 2,41-52', bookId: 49, chapter: 2 } },
  ] },
  { id: 'luminosos', title: 'Mistérios Luminosos', days: 'quintas-feiras', mysteries: [
    { title: 'O Batismo de Jesus no Jordão', ref: { label: 'Mt 3,13-17', bookId: 47, chapter: 3 } },
    { title: 'A auto-revelação de Jesus nas Bodas de Caná', ref: { label: 'Jo 2,1-12', bookId: 50, chapter: 2 } },
    { title: 'O anúncio do Reino de Deus e o convite à conversão', ref: { label: 'Mc 1,14-15', bookId: 48, chapter: 1 } },
    { title: 'A Transfiguração de Jesus', ref: { label: 'Lc 9,28-36', bookId: 49, chapter: 9 } },
    { title: 'A instituição da Eucaristia', ref: { label: 'Lc 22,14-20', bookId: 49, chapter: 22 } },
  ] },
  { id: 'dolorosos', title: 'Mistérios Dolorosos', days: 'terças e sextas-feiras', mysteries: [
    { title: 'A agonia de Jesus no Horto das Oliveiras', ref: { label: 'Mt 26,36-46', bookId: 47, chapter: 26 } },
    { title: 'A flagelação de Jesus', ref: { label: 'Jo 19,1', bookId: 50, chapter: 19 } },
    { title: 'A coroação de espinhos', ref: { label: 'Mt 27,27-31', bookId: 47, chapter: 27 } },
    { title: 'Jesus carrega a cruz até o Calvário', ref: { label: 'Jo 19,17', bookId: 50, chapter: 19 } },
    { title: 'A crucifixão e a morte de Jesus', ref: { label: 'Lc 23,33-46', bookId: 49, chapter: 23 } },
  ] },
  { id: 'gloriosos', title: 'Mistérios Gloriosos', days: 'quartas-feiras e domingos', mysteries: [
    { title: 'A Ressurreição de Jesus', ref: { label: 'Mt 28,1-10', bookId: 47, chapter: 28 } },
    { title: 'A Ascensão de Jesus ao céu', ref: { label: 'At 1,6-11', bookId: 51, chapter: 1 } },
    { title: 'A vinda do Espírito Santo sobre Maria e os apóstolos', ref: { label: 'At 2,1-13', bookId: 51, chapter: 2 } },
    { title: 'A Assunção de Maria ao céu', tradition: true },
    { title: 'A coroação de Maria como Rainha do céu e da terra', tradition: true },
  ] },
];

/** Sugestão tradicional por dia da semana (0 = domingo). */
export function suggestedSet(d: Date): SetId {
  switch (d.getDay()) {
    case 1: case 6: return 'gozosos';
    case 2: case 5: return 'dolorosos';
    case 3: case 0: return 'gloriosos';
    default: return 'luminosos'; // quinta-feira
  }
}

export type PrayerKey = 'sinal' | 'creio' | 'pai' | 'ave' | 'gloria' | 'fatima' | 'salve';
export const PRAYERS: Record<PrayerKey, { title: string; text: string }> = {
  sinal: { title: 'Sinal da Cruz', text: 'Em nome do Pai e do Filho e do Espírito Santo. Amém.' },
  creio: { title: 'Creio (Símbolo dos Apóstolos)', text: 'Creio em Deus Pai todo-poderoso, Criador do céu e da terra; e em Jesus Cristo, seu único Filho, nosso Senhor, que foi concebido pelo poder do Espírito Santo; nasceu da Virgem Maria; padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado; desceu à mansão dos mortos; ressuscitou ao terceiro dia; subiu aos céus, está sentado à direita de Deus Pai todo-poderoso, donde há de vir a julgar os vivos e os mortos. Creio no Espírito Santo, na santa Igreja Católica, na comunhão dos santos, na remissão dos pecados, na ressurreição da carne, na vida eterna. Amém.' },
  pai: { title: 'Pai-Nosso', text: 'Pai nosso, que estais no céu, santificado seja o vosso nome, venha a nós o vosso reino, seja feita a vossa vontade assim na terra como no céu. O pão nosso de cada dia nos dai hoje, perdoai-nos as nossas ofensas assim como nós perdoamos a quem nos tem ofendido, e não nos deixeis cair em tentação, mas livrai-nos do mal. Amém.' },
  ave: { title: 'Ave-Maria', text: 'Ave, Maria, cheia de graça, o Senhor é convosco, bendita sois vós entre as mulheres e bendito é o fruto do vosso ventre, Jesus. Santa Maria, Mãe de Deus, rogai por nós, pecadores, agora e na hora de nossa morte. Amém.' },
  gloria: { title: 'Glória ao Pai', text: 'Glória ao Pai e ao Filho e ao Espírito Santo, como era no princípio, agora e sempre. Amém.' },
  fatima: { title: 'Oração de Fátima', text: 'Ó meu Jesus, perdoai-nos, livrai-nos do fogo do inferno, levai as almas todas para o céu e socorrei principalmente as que mais precisarem.' },
  salve: { title: 'Salve-Rainha', text: 'Salve, Rainha, Mãe de misericórdia, vida, doçura, esperança nossa, salve! A vós bradamos, os degredados filhos de Eva; a vós suspiramos, gemendo e chorando neste vale de lágrimas. Eia, pois, advogada nossa, esses vossos olhos misericordiosos a nós volvei; e depois deste desterro mostrai-nos Jesus, bendito fruto do vosso ventre, ó clemente, ó piedosa, ó doce sempre Virgem Maria. Rogai por nós, santa Mãe de Deus, para que sejamos dignos das promessas de Cristo. Amém.' },
};

export type Step = {
  index: number; prayer: PrayerKey; bead: string;
  /** dezena 1..5 (ausente na parte inicial e final) */
  decade?: number;
  /** número da Ave-Maria dentro da dezena (1..10) ou da introdução (1..3) */
  ave?: number; aveTotal?: number;
  /** passo em que se anuncia o mistério e reza o Pai-Nosso da dezena */
  announce?: boolean;
  hint?: string;
  phase: 'inicio' | 'dezena' | 'fim';
};

const INTENTIONS = ['pelo aumento da fé', 'pelo aumento da esperança', 'pelo aumento da caridade'];

export function buildSteps(): Step[] {
  const raw: Omit<Step, 'index'>[] = [];
  raw.push({ prayer: 'sinal', bead: 'cross', phase: 'inicio' });
  raw.push({ prayer: 'creio', bead: 'cross', phase: 'inicio' });
  raw.push({ prayer: 'pai', bead: 'p-pn', phase: 'inicio' });
  for (let k = 1; k <= 3; k++) raw.push({ prayer: 'ave', bead: `p-a${k}`, ave: k, aveTotal: 3, hint: `Intenção tradicional: ${INTENTIONS[k - 1]}.`, phase: 'inicio' });
  raw.push({ prayer: 'gloria', bead: 'medal', phase: 'inicio' });
  for (let d = 1; d <= 5; d++) {
    raw.push({ prayer: 'pai', bead: `d${d}-pn`, decade: d, announce: true, phase: 'dezena' });
    for (let k = 1; k <= 10; k++) raw.push({ prayer: 'ave', bead: `d${d}-a${k}`, decade: d, ave: k, aveTotal: 10, phase: 'dezena' });
    raw.push({ prayer: 'gloria', bead: `d${d}-a10`, decade: d, phase: 'dezena' });
    raw.push({ prayer: 'fatima', bead: `d${d}-a10`, decade: d, phase: 'dezena', hint: 'Costuma-se rezar ao fim de cada dezena.' });
  }
  raw.push({ prayer: 'salve', bead: 'medal', phase: 'fim' });
  raw.push({ prayer: 'sinal', bead: 'cross', phase: 'fim' });
  return raw.map((s, index) => ({ ...s, index }));
}

export const STEPS = buildSteps();

/* ---------------- contas ---------------- */
export type BeadKind = 'cross' | 'medal' | 'large' | 'small';
export type Bead = { id: string; kind: BeadKind; x: number; y: number; decade?: number };
export const VIEW = { w: 360, h: 470, cx: 180, cy: 160, r: 130 };

/** Peso angular de cada peça no círculo: proporcional ao tamanho, para as contas não se encostarem. */
const WEIGHT = { small: 13, large: 20, medal: 24 };

export function beadLayout(): Bead[] {
  const { cx, cy, r } = VIEW;
  const beads: Bead[] = [];
  const loop: { id: string; kind: 'small' | 'large' | 'medal'; decade?: number }[] = [];
  for (let d = 1; d <= 5; d++) {
    loop.push({ id: `d${d}-pn`, kind: 'large', decade: d });
    for (let k = 1; k <= 10; k++) loop.push({ id: `d${d}-a${k}`, kind: 'small', decade: d });
  }
  const total = WEIGHT.medal + loop.reduce((s, b) => s + WEIGHT[b.kind], 0);
  const deg = 360 / total;
  beads.push({ id: 'medal', kind: 'medal', x: cx, y: cy + r });          // medalha embaixo, no centro
  let acc = WEIGHT.medal / 2;                                             // o círculo segue no sentido horário
  for (const b of loop) {
    const w = WEIGHT[b.kind];
    const a = ((90 + (acc + w / 2) * deg) * Math.PI) / 180;
    beads.push({ ...b, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    acc += w;
  }
  const y0 = cy + r;
  beads.push({ id: 'p-a3', kind: 'small', x: cx, y: y0 + 28 }, { id: 'p-a2', kind: 'small', x: cx, y: y0 + 50 }, { id: 'p-a1', kind: 'small', x: cx, y: y0 + 72 });
  beads.push({ id: 'p-pn', kind: 'large', x: cx, y: y0 + 102 }, { id: 'cross', kind: 'cross', x: cx, y: y0 + 144 });
  return beads;
}

export type BeadState = 'done' | 'current' | 'upcoming';
/**
 * Estado de cada conta, derivado só do passo atual (0..STEPS.length; igual ao total = terminou).
 * Uma conta usada de novo (a cruz e a medalha, no começo e no fim) volta a ficar "atual" quando chega a vez dela.
 */
export function beadStates(steps: Step[], current: number): Record<string, BeadState> {
  const first: Record<string, number> = {};
  for (const s of steps) if (!(s.bead in first)) first[s.bead] = s.index;
  const here = steps[current]?.bead;
  const out: Record<string, BeadState> = {};
  for (const [id, firstIdx] of Object.entries(first)) out[id] = id === here ? 'current' : current > firstIdx ? 'done' : 'upcoming';
  return out;
}

/** Textos curtos para o centro do desenho e para leitores de tela. */
export function progressLabel(step: Step | undefined, finished: boolean) {
  if (finished) return { line1: 'Terço concluído', line2: 'Graças a Deus' };
  if (!step) return { line1: '', line2: '' };
  if (step.phase === 'inicio') return { line1: 'Início', line2: step.ave ? `Ave-Maria ${step.ave} de 3` : PRAYERS[step.prayer].title };
  if (step.phase === 'fim') return { line1: 'Final', line2: PRAYERS[step.prayer].title };
  const l2 = step.announce ? 'Pai-Nosso' : step.ave ? `Ave-Maria ${step.ave} de 10` : PRAYERS[step.prayer].title;
  return { line1: `Dezena ${step.decade} de 5`, line2: l2 };
}

/* ---------------- progresso salvo ---------------- */
export type Saved = { set: SetId; step: number };
const KEY = 'verbum:rosary';
export function loadSaved(): Saved | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return v && MYSTERY_SETS.some((s) => s.id === v.set) && Number.isInteger(v.step) && v.step >= 0 && v.step < STEPS.length ? v : null;
  } catch { return null; }
}
export function saveProgress(v: Saved | null) {
  try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch { /* ignore */ }
}
