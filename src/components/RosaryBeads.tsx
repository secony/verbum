import { useMemo } from 'react';
import { STEPS, VIEW, beadLayout, beadStates, progressLabel, type Bead, type BeadState } from '../lib/rosary';
import { cn } from '../lib/utils';

const R = { small: 5.4, large: 8.8, medal: 10 };
const tone = (s: BeadState) =>
  s === 'done' ? 'fill-olive stroke-olive' : s === 'current' ? 'fill-gold stroke-gold' : 'fill-surface stroke-muted/60';

function Piece({ b, state }: { b: Bead; state: BeadState }) {
  const base = 'transition-colors duration-500';
  if (b.kind === 'cross') {
    return (
      <g className={cn(base, tone(state))} strokeWidth={2} aria-hidden>
        <path d={`M${b.x} ${b.y - 20} V${b.y + 22} M${b.x - 12} ${b.y - 7} H${b.x + 12}`} strokeLinecap="round" strokeWidth={6} className="fill-none" />
      </g>
    );
  }
  if (b.kind === 'medal') {
    return <ellipse cx={b.x} cy={b.y} rx={R.medal - 2} ry={R.medal + 2} strokeWidth={2} className={cn(base, tone(state))} aria-hidden />;
  }
  return <circle cx={b.x} cy={b.y} r={b.kind === 'large' ? R.large : R.small} strokeWidth={1.6} className={cn(base, tone(state))} data-bead={b.id} aria-hidden />;
}

/** Terço desenhado: cada conta muda de "vazia" para "preenchida" conforme a oração avança. */
export function RosaryBeads({ current }: { current: number }) {
  const beads = useMemo(() => beadLayout(), []);
  const states = useMemo(() => beadStates(STEPS, current), [current]);
  const finished = current >= STEPS.length;
  const step = STEPS[current];
  const label = progressLabel(step, finished);
  const cur = beads.find((b) => states[b.id] === 'current');
  const { cx, cy, r } = VIEW;
  const doneCount = Object.values(states).filter((s) => s === 'done').length;

  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} role="img" className="mx-auto h-auto w-full max-w-[22rem]"
      aria-label={`Terço: ${finished ? 'concluído' : `${label.line1}, ${label.line2}`}. ${doneCount} de ${beads.length} contas já rezadas.`}>
      {/* fios */}
      <circle cx={cx} cy={cy} r={r} className="fill-none stroke-line" strokeWidth={2} />
      <line x1={cx} y1={cy + r} x2={cx} y2={cy + r + 130} className="stroke-line" strokeWidth={2} />
      {/* marcações das dezenas */}
      {[1, 2, 3, 4, 5].map((d) => {
        const mid = beads.find((b) => b.id === `d${d}-a5`)!;
        const a = Math.atan2(mid.y - cy, mid.x - cx);
        const x = cx + (r - 30) * Math.cos(a), y = cy + (r - 30) * Math.sin(a);
        const active = step?.decade === d && !finished;
        return <text key={d} x={x} y={y} textAnchor="middle" dominantBaseline="central" className={cn('font-serif text-[15px] transition-colors', active ? 'fill-gold font-semibold' : 'fill-muted/70')} aria-hidden>{d}</text>;
      })}
      {beads.map((b) => <Piece key={b.id} b={b} state={states[b.id] ?? 'upcoming'} />)}
      {/* conta atual: anel pulsante */}
      {cur && cur.kind !== 'cross' && (
        <circle cx={cur.x} cy={cur.y} r={(cur.kind === 'large' ? R.large : cur.kind === 'medal' ? R.medal + 2 : R.small) + 6} className="bead-ring fill-none stroke-gold" strokeWidth={2} aria-hidden />
      )}
      {cur && cur.kind === 'cross' && <circle cx={cur.x} cy={cur.y} r={26} className="bead-ring fill-none stroke-gold" strokeWidth={2} aria-hidden />}
      {/* centro */}
      <text x={cx} y={cy - 8} textAnchor="middle" className="fill-fg font-serif text-[22px]" aria-hidden>{label.line1}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" className="fill-muted text-[13px]" aria-hidden>{label.line2}</text>
    </svg>
  );
}
