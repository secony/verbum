import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, BookOpen, Check, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useBooks } from '../lib/data';
import { bookSlug } from '../lib/bible-nav';
import { MYSTERY_SETS, PRAYERS, STEPS, loadSaved, saveProgress, suggestedSet, type MysterySet, type SetId } from '../lib/rosary';
import { cn } from '../lib/utils';
import { PageHeader } from '../components/ui';
import { RosaryBeads } from '../components/RosaryBeads';

const ORD = ['1º', '2º', '3º', '4º', '5º'];
const DAY = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });

function Choose({ onStart }: { onStart: (set: SetId, step?: number) => void }) {
  const saved = loadSaved();
  const today = suggestedSet(new Date());
  const sets = [...MYSTERY_SETS].sort((a, b) => (a.id === today ? -1 : b.id === today ? 1 : 0));
  return (
    <div>
      <PageHeader eyebrow="Católica" title="O Santo Terço">Reze passo a passo, conta por conta. O desenho do terço acompanha a oração e vai se preenchendo a cada Ave-Maria.</PageHeader>
      {saved && (
        <div className="surface mb-6 flex flex-wrap items-center justify-between gap-3 p-5">
          <p><span className="eyebrow block">Continuar</span><span className="font-serif text-2xl">{MYSTERY_SETS.find((s) => s.id === saved.set)!.title}</span><span className="block text-sm text-muted">Passo {saved.step + 1} de {STEPS.length}</span></p>
          <button className="btn-primary" onClick={() => onStart(saved.set, saved.step)}>Continuar de onde parei</button>
        </div>
      )}
      <ul className="space-y-3">
        {sets.map((s) => (
          <li key={s.id} className={cn('surface p-5', s.id === today && 'border-gold')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl">{s.title}</h2>
                <p className="text-sm text-muted">{s.id === today ? <><strong className="text-gold">Sugestão de hoje</strong> ({DAY}) · </> : null}tradicionalmente rezados às {s.days}</p>
              </div>
              <button className={s.id === today ? 'btn-primary' : 'btn-outline'} onClick={() => onStart(s.id)}>Rezar</button>
            </div>
            <ol className="mt-3 space-y-0.5 text-sm text-muted">{s.mysteries.map((m, i) => <li key={m.title}>{ORD[i]} {m.title}</li>)}</ol>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-muted">A distribuição por dia segue a sugestão tradicional. Você pode rezar qualquer conjunto em qualquer dia. Em certos tempos litúrgicos, como o Advento e a Quaresma, costuma-se adaptar a escolha dos mistérios aos domingos.</p>
    </div>
  );
}

function Pray({ set, start, onExit }: { set: MysterySet; start: number; onExit: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const books = useBooks();
  const [current, setCurrent] = useState(start);
  const [showText, setShowText] = useState(() => { try { return localStorage.getItem('verbum:rosary-text') !== '0'; } catch { return true; } });
  const finished = current >= STEPS.length;
  const step = STEPS[current];

  useEffect(() => { saveProgress(finished ? null : { set: set.id, step: current }); }, [current, finished, set.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') setCurrent((c) => Math.min(c + 1, STEPS.length));
      if (e.key === 'ArrowLeft') setCurrent((c) => Math.max(c - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const toggleText = () => setShowText((v) => { try { localStorage.setItem('verbum:rosary-text', v ? '0' : '1'); } catch { /* ignore */ } return !v; });

  const register = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc('set_practice_activity', { p_key: 'prayer', p_done: true }); if (error) throw error; },
    onSuccess: () => toast.ok('Oração registrada na sua caminhada'),
    onError: () => toast.err('Não foi possível registrar agora.'),
  });

  if (finished) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <RosaryBeads current={current} />
        <h1 className="mt-4 text-4xl">Terço concluído</h1>
        <p className="mt-2 text-muted">{set.title}. Que o Senhor receba a sua oração.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {user ? <button className="btn-primary" onClick={() => register.mutate()} disabled={register.isPending || register.isSuccess}><Check className="h-4 w-4" aria-hidden /> {register.isSuccess ? 'Registrado' : 'Registrar na minha caminhada'}</button>
            : <Link to="/perfil" className="btn-outline">Entrar para registrar na caminhada</Link>}
          <button className="btn-outline" onClick={() => setCurrent(0)}><RotateCcw className="h-4 w-4" aria-hidden /> Rezar de novo</button>
          <button className="btn-ghost" onClick={onExit}>Outros mistérios</button>
        </div>
      </div>
    );
  }

  const mystery = step!.decade ? set.mysteries[step!.decade - 1] : undefined;
  const book = mystery?.ref ? books.data?.find((b) => b.id === mystery.ref!.bookId) : undefined;
  const prayer = PRAYERS[step!.prayer];
  const phaseLabel = step!.phase === 'inicio' ? 'Orações iniciais' : step!.phase === 'fim' ? 'Orações finais' : `${ORD[step!.decade! - 1]} mistério · ${set.title.replace('Mistérios ', '').toLowerCase()}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button className="btn-ghost -ml-3" onClick={onExit}><ArrowLeft className="h-4 w-4" aria-hidden /> Escolher mistérios</button>
        <span className="text-sm text-muted">{set.title} · passo {current + 1} de {STEPS.length}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={current} aria-label="Progresso do terço">
        <div className="h-full bg-olive transition-all duration-500" style={{ width: `${(current / STEPS.length) * 100}%` }} />
      </div>
      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,22rem)_1fr] md:items-start">
        <div className="md:sticky md:top-8"><RosaryBeads current={current} /></div>
        <section aria-live="polite" aria-label="Oração atual">
          <p className="eyebrow">{phaseLabel}</p>
          {mystery && (
            <div className="surface mt-3 p-4">
              <p className="font-serif text-2xl">{mystery.title}</p>
              {mystery.ref && book && <Link to={`/biblia/${bookSlug(book)}/${mystery.ref.chapter}`} className="mt-1 inline-flex items-center gap-1 text-sm text-olive hover:underline"><BookOpen className="h-3.5 w-3.5" aria-hidden /> Ler {mystery.ref.label}</Link>}
              {mystery.tradition && <p className="mt-1 text-xs text-muted">Mistério contemplado a partir da Tradição da Igreja.</p>}
              {step!.announce && <p className="mt-2 text-sm text-muted">Anuncie o mistério, medite por um instante e reze o Pai-Nosso.</p>}
            </div>
          )}
          <h1 className="mt-5 text-3xl md:text-4xl">{prayer.title}{step!.ave ? <span className="ml-2 text-xl text-gold">{step!.ave} de {step!.aveTotal}</span> : null}</h1>
          {step!.hint && <p className="mt-1 text-sm text-muted">{step!.hint}</p>}
          {showText && <p className="verse-text mt-4 max-w-prose">{prayer.text}</p>}
          <button className="mt-3 text-xs text-muted underline" onClick={toggleText}>{showText ? 'Ocultar o texto da oração' : 'Mostrar o texto da oração'}</button>
        </section>
      </div>
      <div className="sticky bottom-20 z-10 mt-8 flex items-center justify-between gap-3 rounded-2xl border border-line bg-bg/95 p-3 backdrop-blur md:bottom-4">
        <button className="btn-outline" onClick={() => setCurrent((c) => Math.max(c - 1, 0))} disabled={current === 0}><ArrowLeft className="h-4 w-4" aria-hidden /> Voltar</button>
        <button className="btn-primary flex-1 py-3 text-base sm:flex-none sm:px-10" onClick={() => setCurrent((c) => c + 1)} autoFocus>
          {current === STEPS.length - 1 ? 'Concluir' : 'Próxima conta'} <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Dica: no computador, use as setas ← → do teclado.</p>
    </div>
  );
}

export default function Rosary() {
  const [run, setRun] = useState<{ set: SetId; step: number } | null>(null);
  if (!run) return <Choose onStart={(set, step = 0) => setRun({ set, step })} />;
  const set = MYSTERY_SETS.find((s) => s.id === run.set)!;
  return <Pray key={`${run.set}`} set={set} start={run.step} onExit={() => setRun(null)} />;
}
