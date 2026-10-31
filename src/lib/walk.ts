export const ACTIVITIES = [
  { key: 'bible', label: 'Ler a Bíblia' },
  { key: 'prayer', label: 'Oração' },
  { key: 'liturgy', label: 'Liturgia do dia' },
  { key: 'reflection', label: 'Reflexão' },
  { key: 'reading_plan', label: 'Plano de leitura' },
] as const;

export type WalkData = {
  today: string;
  last_day: string | null;
  streak: { current_streak: number; longest_streak: number; total_days: number };
  days: string[];
  done: string[];
};

/** Dia civil (YYYY-MM-DD) de um instante em um fuso IANA. */
export function localDay(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function shiftDay(day: string, offset: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Mensagem acolhedora ao retomar depois de uma pausa (sem culpa, sem penalidade). */
export function shouldWelcomeBack(walk: WalkData): boolean {
  if (!walk.last_day) return false;
  const paused = walk.last_day < shiftDay(walk.today, -1);
  const resumed = walk.last_day === walk.today && walk.streak.current_streak === 1 && walk.streak.total_days > 1;
  return paused || resumed;
}
