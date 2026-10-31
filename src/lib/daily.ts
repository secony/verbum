/** Dias desde 1970-01-01 para a data civil local. */
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** Índice determinístico da "Palavra do dia" entre `count` versículos existentes. */
export function dailyIndex(date: Date, count: number): number | null {
  if (count <= 0) return null;
  return Number((BigInt(dayNumber(date)) * 2654435761n) % BigInt(count));
}

export function greeting(date: Date): string {
  const h = date.getHours();
  return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}
