/** Quebra `text` em linhas que cabem em `maxWidth`, usando `measure` (largura em px de um trecho). */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${word}` : word;
    if (line && measure(test) > maxWidth) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Maior tamanho de fonte (entre min e max) em que o texto cabe na altura disponível. */
export function fitText(text: string, maxWidth: number, maxHeight: number, lineHeight: number, sizes: number[],
  measureAt: (size: number) => (s: string) => number) {
  for (const size of sizes) {
    const lines = wrapLines(text, maxWidth, measureAt(size));
    if (lines.length * size * lineHeight <= maxHeight) return { size, lines };
  }
  const size = sizes[sizes.length - 1]!;
  return { size, lines: wrapLines(text, maxWidth, measureAt(size)) };
}

export type ShareImageInput = { text: string; reference: string; translation: string; dark: boolean };

const PALETTE = {
  light: { bg: '#F7F5EF', fg: '#282820', muted: '#777568', gold: '#A78036', line: '#E6E1D6' },
  dark: { bg: '#11110D', fg: '#E9E5DB', muted: '#A6A397', gold: '#C9A45C', line: '#34342A' },
};

/** Desenha o cartão do versículo (1080×1350) e devolve um PNG. */
export async function renderVerseImage(i: ShareImageInput): Promise<Blob> {
  const W = 1080, H = 1350, pad = 110;
  const c = PALETTE[i.dark ? 'dark' : 'light'];
  try { await Promise.all([document.fonts.load('500 56px "Cormorant Garamond"'), document.fonts.load('600 26px Inter')]); } catch { /* usa a fonte reserva */ }

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponível');
  const serif = (s: number) => `500 ${s}px "Cormorant Garamond", Lora, Georgia, serif`;

  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = c.line; ctx.lineWidth = 2; ctx.strokeRect(48, 48, W - 96, H - 96);

  ctx.fillStyle = c.gold; ctx.font = '600 26px Inter, system-ui, sans-serif'; ctx.textBaseline = 'alphabetic';
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '6px';
  ctx.fillText('VERBUM', pad, 150);
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';

  const quote = `“${i.text}”`;
  const maxH = H - 150 - 340 - 120;
  const { size, lines } = fitText(quote, W - pad * 2, maxH, 1.4, [64, 58, 52, 46, 42, 38, 34, 30, 27],
    (s) => (t) => { ctx.font = serif(s); return ctx.measureText(t).width; });
  ctx.font = serif(size); ctx.fillStyle = c.fg;
  const lh = size * 1.4;
  const textH = lines.length * lh;
  let y = 150 + 120 + Math.max(0, (maxH - textH) / 2) + size;
  for (const l of lines) { ctx.fillText(l, pad, y); y += lh; }

  ctx.fillStyle = c.gold; ctx.fillRect(pad, H - 330, 72, 3);
  ctx.fillStyle = c.fg; ctx.font = '600 38px Inter, system-ui, sans-serif'; ctx.fillText(i.reference, pad, H - 255);
  ctx.fillStyle = c.muted; ctx.font = '400 26px Inter, system-ui, sans-serif'; ctx.fillText(i.translation, pad, H - 205);

  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('falha ao gerar imagem'))), 'image/png'));
}
