export const cn = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');
export const fmtDate = (d: Date) =>
  d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
