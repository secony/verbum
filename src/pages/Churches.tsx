import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Church as ChurchIcon, ExternalLink, Heart, MapPin, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useChurches, useFavoriteChurchIds } from '../lib/catholic-data';
import { WEEKDAYS, coverage, filterChurches, fmtDateBR, formatTime, groupByWeekday, mapLinks, safeUrl, scheduleStatus } from '../lib/catholic';
import { cn } from '../lib/utils';
import { EmptyState, ErrorBox, PageHeader, Spinner } from '../components/ui';

export function ChurchesList() {
  const q = useChurches();
  const favs = useFavoriteChurchIds();
  const { user } = useAuth();
  const [f, setF] = useState({ q: '', neighborhood: '', weekday: '', from: '', onlyFav: false });
  const header = <PageHeader eyebrow="Católica" title="Igrejas de Rio Preto">Endereços e horários de missa de São José do Rio Preto, SP. Cada horário mostra se está confirmado e quando foi verificado.</PageHeader>;

  const hoods = useMemo(() => [...new Set((q.data ?? []).map((c) => c.neighborhood).filter((x): x is string => !!x))].sort(), [q.data]);
  if (q.isLoading) return <div>{header}<Spinner /></div>;
  if (q.isError || !q.data) return <div>{header}<ErrorBox onRetry={() => q.refetch()} /></div>;
  const cov = coverage(q.data);
  if (!q.data.length) {
    return <div>{header}<EmptyState icon={<ChurchIcon className="h-8 w-8" />} title="Catálogo em construção">Ainda não há igrejas publicadas. O catálogo só inclui dados com fonte e data de verificação, e é melhor ter poucos dados corretos do que uma lista longa e duvidosa.</EmptyState></div>;
  }
  const rows = filterChurches(q.data, { ...f, favIds: favs.data });
  return (
    <div>
      {header}
      <p className="mb-6 rounded-xl border border-line bg-soft px-4 py-3 text-sm text-muted" role="note">
        Catálogo em construção: {cov.total} {cov.total === 1 ? 'igreja' : 'igrejas'}, {cov.withConfirmed} com horário de missa confirmado
        {cov.lastVerified ? `. Última verificação: ${fmtDateBR(cov.lastVerified)}` : ''}. Não afirmamos que ele cobre todas as igrejas da cidade.
      </p>
      <div className="mb-6 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <label className="sr-only" htmlFor="ig-q">Buscar por nome</label>
        <input id="ig-q" type="search" className="input sm:col-span-2" placeholder="Buscar por nome ou paróquia" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <select aria-label="Bairro" className="input" value={f.neighborhood} onChange={(e) => setF({ ...f, neighborhood: e.target.value })}>
          <option value="">Todos os bairros</option>{hoods.map((h) => <option key={h}>{h}</option>)}
        </select>
        <select aria-label="Dia da semana" className="input" value={f.weekday} onChange={(e) => setF({ ...f, weekday: e.target.value })}>
          <option value="">Qualquer dia</option>{WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
        <select aria-label="A partir de" className="input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })}>
          <option value="">Qualquer horário</option>{Array.from({ length: 18 }, (_, i) => i + 5).map((h) => <option key={h} value={`${String(h).padStart(2, '0')}:00`}>A partir das {h}h</option>)}
        </select>
        {user && <button className={cn('chip justify-center', f.onlyFav && 'chip-on')} aria-pressed={f.onlyFav} onClick={() => setF({ ...f, onlyFav: !f.onlyFav })}>Só favoritas</button>}
      </div>
      {(f.weekday !== '' || f.from) && <p className="mb-4 text-xs text-muted">O filtro de dia e horário considera apenas horários de missa confirmados.</p>}
      {rows.length === 0 ? <EmptyState title="Nenhuma igreja encontrada">Tente remover algum filtro.</EmptyState> : (
        <ul className="space-y-3">
          {rows.map((c) => {
            const confirmed = c.mass_schedules.filter((s) => s.kind === 'missa' && s.confirmed).length;
            return (
              <li key={c.id}>
                <Link to={`/catolica/igrejas/${c.id}`} className="surface block p-5 transition-colors hover:border-gold">
                  <h2 className="text-2xl">{c.name}{c.popular_name ? <span className="text-base text-muted"> · {c.popular_name}</span> : null}</h2>
                  <p className="mt-1 text-sm text-muted">{[c.neighborhood, c.address].filter(Boolean).join(' · ') || 'Endereço não informado'}</p>
                  <p className="mt-2 text-xs text-muted">{confirmed ? `${confirmed} ${confirmed === 1 ? 'horário de missa confirmado' : 'horários de missa confirmados'}` : 'Horários de missa não confirmados'}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ChurchDetail() {
  const { id = '' } = useParams();
  const q = useChurches();
  const favs = useFavoriteChurchIds();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const nav = useNavigate();
  const fav = useMutation({
    mutationFn: async (on: boolean) => {
      const { error } = on ? await supabase.from('favorite_churches').insert({ church_id: id }) : await supabase.from('favorite_churches').delete().eq('church_id', id);
      if (error) throw error;
      return on;
    },
    onSuccess: (on) => { toast.ok(on ? 'Igreja favoritada' : 'Igreja removida dos favoritos'); qc.invalidateQueries({ queryKey: ['me', 'favorite-churches'] }); },
    onError: () => toast.err('Não foi possível atualizar. Tente novamente.'),
  });

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorBox onRetry={() => q.refetch()} />;
  const c = q.data?.find((x) => x.id === id);
  if (!c) return <EmptyState title="Igreja não encontrada" action={{ to: '/catolica/igrejas', label: 'Ver igrejas' }}>Esta igreja não existe ou não está publicada.</EmptyState>;
  const links = mapLinks(c);
  const isFav = !!favs.data?.has(c.id);
  const days = groupByWeekday(c.mass_schedules).filter((d) => d.items.length);
  const site = safeUrl(c.website);

  return (
    <article className="max-w-2xl">
      <Link to="/catolica/igrejas" className="eyebrow hover:underline">Igrejas de Rio Preto</Link>
      <h1 className="mb-1 mt-2 text-4xl md:text-5xl">{c.name}</h1>
      {c.popular_name && <p className="text-muted">{c.popular_name}</p>}
      <p className="mt-2 text-sm text-muted">{[c.parish && `Paróquia: ${c.parish}`, c.diocese].filter(Boolean).join(' · ')}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {links.route && <a href={links.route} target="_blank" rel="noopener noreferrer" className="btn-primary"><MapPin className="h-4 w-4" aria-hidden /> Abrir rota</a>}
        {links.osm && <a href={links.osm} target="_blank" rel="noopener noreferrer" className="btn-outline">Ver no mapa</a>}
        <button className="btn-outline" aria-pressed={isFav} onClick={() => (user ? fav.mutate(!isFav) : nav('/perfil'))}><Heart className={cn('h-4 w-4', isFav && 'fill-gold text-gold')} aria-hidden /> {isFav ? 'Favorita' : 'Favoritar'}</button>
      </div>

      <dl className="surface mt-8 space-y-3 p-5 text-sm">
        {c.address && <div><dt className="eyebrow">Endereço</dt><dd>{c.address}{c.neighborhood ? `, ${c.neighborhood}` : ''}</dd></div>}
        {c.phone && <div><dt className="eyebrow">Telefone</dt><dd><a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 text-olive underline"><Phone className="h-3.5 w-3.5" aria-hidden />{c.phone}</a></dd></div>}
        {site && <div><dt className="eyebrow">Site oficial</dt><dd><a href={site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-olive underline">{c.website}<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a></dd></div>}
        {c.social && <div><dt className="eyebrow">Redes sociais</dt><dd>{c.social}</dd></div>}
        {c.accessibility && <div><dt className="eyebrow">Acessibilidade</dt><dd>{c.accessibility}</dd></div>}
        {c.notes && <div><dt className="eyebrow">Observações</dt><dd className="whitespace-pre-wrap">{c.notes}</dd></div>}
      </dl>

      <section aria-labelledby="agenda" className="mt-10">
        <h2 id="agenda" className="mb-4 text-3xl">Missas e confissões</h2>
        {days.length === 0 ? (
          <p className="surface p-5 text-sm text-muted">Horário não confirmado. {site ? <>Consulte o <a href={site} target="_blank" rel="noopener noreferrer" className="text-olive underline">site da paróquia</a>.</> : c.phone ? 'Consulte a secretaria pelo telefone acima.' : 'Entre em contato com a paróquia.'}</p>
        ) : (
          <ul className="space-y-3">
            {days.map((d) => (
              <li key={d.weekday} className="surface p-4">
                <h3 className="mb-2 text-xl">{d.name}</h3>
                <ul className="space-y-1.5 text-sm">
                  {d.items.map((s) => {
                    const st = scheduleStatus(s);
                    return (
                      <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span><strong className="text-base">{formatTime(s.time)}</strong> · {s.kind === 'missa' ? 'Missa' : 'Confissão'}{s.schedule_type !== 'regular' ? ` (${s.schedule_type})` : ''}{s.note ? ` — ${s.note}` : ''}</span>
                        <span className={cn('text-xs', st.tone === 'ok' ? 'text-olive' : st.tone === 'warn' ? 'text-gold' : 'text-muted')}>{st.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-6 text-xs text-muted">Dados da igreja: {c.source ?? 'fonte não informada'}{c.verified_at ? `, verificados em ${fmtDateBR(c.verified_at)}` : ''}. Confirme os horários com a paróquia antes de ir, pois eles podem mudar.</p>
    </article>
  );
}
