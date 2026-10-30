export const MODULES = [
  { id: 'estrutura', title: 'Estrutura da Igreja', description: 'Papa, bispos, padres, diáconos, dioceses, paróquias e religiosos.' },
  { id: 'sacramentos', title: 'Sacramentos', description: 'Os sete sacramentos, em linguagem simples.' },
  { id: 'liturgia', title: 'Liturgia', description: 'A Missa, o ano litúrgico e suas celebrações.' },
  { id: 'praticas', title: 'Práticas e tradições', description: 'Oração, terço, adoração, confissão, jejum e caridade.' },
  { id: 'duvidas', title: 'Dúvidas comuns', description: 'Perguntas frequentes sobre a fé católica.' },
] as const;
export type ModuleId = (typeof MODULES)[number]['id'];

export type Source = { label: string; url?: string };
export type Article = {
  id: string; module: ModuleId; slug: string; title: string; summary: string; body: string; sources: Source[];
  status: 'draft' | 'published'; position: number; reviewed_by: string | null; reviewed_at: string | null; updated_at: string;
};

/* ---------- texto simples: parágrafos, "## título" e listas com "- " ---------- */
export type Block = { type: 'h'; text: string } | { type: 'p'; text: string } | { type: 'ul'; items: string[] };

export function parseBody(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flushPara = () => { if (para.length) blocks.push({ type: 'p', text: para.join(' ') }); para = []; };
  const flushList = () => { if (list.length) blocks.push({ type: 'ul', items: list }); list = []; };
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    if (line.startsWith('## ')) { flushPara(); flushList(); blocks.push({ type: 'h', text: line.slice(3).trim() }); continue; }
    if (line.startsWith('- ')) { flushPara(); list.push(line.slice(2).trim()); continue; }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return blocks;
}

export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** "Rótulo | https://link" por linha. */
export function parseSources(text: string): Source[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [label, url] = l.split('|').map((x) => x.trim());
    return url ? { label: label!, url } : { label: label! };
  });
}
export const sourcesToText = (s: Source[]) => s.map((x) => (x.url ? `${x.label} | ${x.url}` : x.label)).join('\n');

/** Só aceita links http(s): evita "javascript:" vindo de conteúdo editável. */
export const safeUrl = (u?: string | null) => (u && /^https?:\/\//i.test(u) ? u : undefined);

/* ---------- igrejas e horários ---------- */
export const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export type Schedule = {
  id: string; church_id: string; weekday: number; time: string; kind: 'missa' | 'confissao';
  schedule_type: 'regular' | 'excepcional' | 'especial'; confirmed: boolean; source: string | null; verified_at: string | null; note: string | null;
};
export type Church = {
  id: string; city_id: string; name: string; popular_name: string | null; parish: string | null; diocese: string | null;
  address: string | null; neighborhood: string | null; latitude: number | null; longitude: number | null; phone: string | null;
  website: string | null; social: string | null; accessibility: string | null; notes: string | null; source: string | null;
  verified_at: string | null; published: boolean; updated_at: string; mass_schedules: Schedule[];
};

export const formatTime = (t: string) => { const [h, m] = t.split(':'); return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`; };
export const fmtDateBR = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };

export function daysBetween(fromIso: string, now: Date) {
  const [y, m, d] = fromIso.slice(0, 10).split('-').map(Number);
  return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(y!, m! - 1, d!)) / 86_400_000);
}

/** Estado de confiança de um horário. Nunca mostra horário antigo como se estivesse garantido. */
export function scheduleStatus(s: Pick<Schedule, 'confirmed' | 'verified_at'>, now = new Date()): { label: string; tone: 'ok' | 'warn' | 'none' } {
  if (!s.confirmed || !s.verified_at) return { label: 'Horário não confirmado', tone: 'none' };
  if (daysBetween(s.verified_at, now) > 90) return { label: `Verificado em ${fmtDateBR(s.verified_at)} (há mais de 3 meses)`, tone: 'warn' };
  return { label: `Confirmado em ${fmtDateBR(s.verified_at)}`, tone: 'ok' };
}

export function groupByWeekday(schedules: Schedule[]) {
  return WEEKDAYS.map((name, weekday) => ({
    weekday, name,
    items: schedules.filter((s) => s.weekday === weekday).sort((a, b) => a.time.localeCompare(b.time) || a.kind.localeCompare(b.kind)),
  }));
}

export function mapLinks(c: Pick<Church, 'latitude' | 'longitude' | 'address' | 'neighborhood'>, city = 'São José do Rio Preto, SP') {
  if (c.latitude != null && c.longitude != null) {
    return {
      route: `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`,
      osm: `https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=17/${c.latitude}/${c.longitude}`,
    };
  }
  if (c.address) return { route: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.address}, ${city}`)}`, osm: undefined };
  return { route: undefined, osm: undefined };
}

export type ChurchFilter = { q: string; neighborhood: string; weekday: string; from: string; onlyFav: boolean; favIds?: Set<string> };
export function filterChurches(churches: Church[], f: ChurchFilter) {
  const q = f.q.trim().toLowerCase();
  return churches.filter((c) => {
    if (q && !`${c.name} ${c.popular_name ?? ''} ${c.parish ?? ''}`.toLowerCase().includes(q)) return false;
    if (f.neighborhood && c.neighborhood !== f.neighborhood) return false;
    if (f.onlyFav && !f.favIds?.has(c.id)) return false;
    if (f.weekday !== '' || f.from) {
      return c.mass_schedules.some((s) => s.kind === 'missa' && s.confirmed
        && (f.weekday === '' || s.weekday === Number(f.weekday))
        && (!f.from || s.time.slice(0, 5) >= f.from));
    }
    return true;
  });
}

export function coverage(churches: Church[]) {
  const confirmed = churches.filter((c) => c.mass_schedules.some((s) => s.kind === 'missa' && s.confirmed));
  const dates = churches.flatMap((c) => [c.verified_at, ...c.mass_schedules.map((s) => s.verified_at)]).filter((d): d is string => !!d).sort();
  return { total: churches.length, withConfirmed: confirmed.length, lastVerified: dates.length ? dates[dates.length - 1]! : null };
}
