import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useAllArticles, useChurches, useIsAdmin } from '../lib/catholic-data';
import { MODULES, WEEKDAYS, coverage, daysBetween, fmtDateBR, formatTime, parseSources, slugify, sourcesToText, type Article, type Church, type ModuleId, type Schedule } from '../lib/catholic';
import { cn } from '../lib/utils';
import { EmptyState, ErrorBox, PageHeader, Spinner, Tabs } from '../components/ui';
import { SignInPrompt } from '../components/SignInPrompt';

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}</label>
);

/* ------------------------------ Conteúdo ------------------------------ */
type AForm = { id?: string; module: ModuleId; title: string; slug: string; summary: string; body: string; sourcesText: string; status: 'draft' | 'published'; position: string; reviewed_by: string; reviewed_at: string };
const emptyArticle: AForm = { module: 'estrutura', title: '', slug: '', summary: '', body: '', sourcesText: '', status: 'draft', position: '0', reviewed_by: '', reviewed_at: '' };
const fromArticle = (a: Article): AForm => ({ id: a.id, module: a.module, title: a.title, slug: a.slug, summary: a.summary, body: a.body, sourcesText: sourcesToText(a.sources), status: a.status, position: String(a.position), reviewed_by: a.reviewed_by ?? '', reviewed_at: a.reviewed_at ?? '' });

function ArticleEditor({ initial, onDone }: { initial: AForm; onDone: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState(initial);
  const set = (k: keyof AForm, v: string) => setF((x) => ({ ...x, [k]: v }));
  const save = useMutation({
    mutationFn: async () => {
      if (!f.title.trim()) throw new Error('Informe o título.');
      const slug = f.slug.trim() || slugify(f.title);
      if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('O endereço (slug) só pode ter letras minúsculas, números e hífen.');
      if (f.status === 'published' && !f.reviewed_by.trim()) throw new Error('Para publicar, informe quem revisou o texto.');
      const row = { module: f.module, slug, title: f.title.trim(), summary: f.summary.trim(), body: f.body, sources: parseSources(f.sourcesText), status: f.status, position: Number(f.position) || 0, reviewed_by: f.reviewed_by.trim() || null, reviewed_at: f.reviewed_at || null };
      const { error } = f.id ? await supabase.from('church_articles').update(row).eq('id', f.id) : await supabase.from('church_articles').insert(row);
      if (error) throw new Error(/duplicate key/.test(error.message) ? 'Já existe um texto com esse endereço (slug).' : 'Não foi possível salvar.');
    },
    onSuccess: () => { toast.ok('Texto salvo'); qc.invalidateQueries({ queryKey: ['admin'] }); qc.invalidateQueries({ queryKey: ['articles'] }); onDone(); },
    onError: (e) => toast.err((e as Error).message),
  });
  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('church_articles').delete().eq('id', f.id!); if (error) throw error; },
    onSuccess: () => { toast.ok('Texto excluído'); qc.invalidateQueries({ queryKey: ['admin'] }); qc.invalidateQueries({ queryKey: ['articles'] }); onDone(); },
    onError: () => toast.err('Não foi possível excluir.'),
  });
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="space-y-4">
      <button className="btn-ghost -ml-3" onClick={onDone}><ArrowLeft className="h-4 w-4" aria-hidden /> Voltar</button>
      <h2 className="text-3xl">{f.id ? 'Editar texto' : 'Novo texto'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Módulo"><select className="input" value={f.module} onChange={(e) => set('module', e.target.value)}>{MODULES.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></Field>
        <Field label="Posição na lista"><input className="input" type="number" value={f.position} onChange={(e) => set('position', e.target.value)} /></Field>
      </div>
      <Field label="Título"><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
      <Field label="Endereço (slug)" hint="Deixe em branco para gerar a partir do título."><input className="input" value={f.slug} onChange={(e) => set('slug', e.target.value)} placeholder={slugify(f.title)} /></Field>
      <Field label="Resumo (uma frase)"><input className="input" value={f.summary} onChange={(e) => set('summary', e.target.value)} /></Field>
      <Field label="Texto" hint="Parágrafos separados por linha em branco. Use “## Título” para subtítulos e “- item” para listas."><textarea className="input min-h-64 font-mono text-[0.85rem]" value={f.body} onChange={(e) => set('body', e.target.value)} /></Field>
      <Field label="Fontes" hint="Uma por linha: “Rótulo” ou “Rótulo | https://link”."><textarea className="input min-h-24" value={f.sourcesText} onChange={(e) => set('sourcesText', e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Revisado por"><input className="input" value={f.reviewed_by} onChange={(e) => set('reviewed_by', e.target.value)} placeholder="Nome de quem revisou" /></Field>
        <Field label="Data da revisão"><input className="input" type="date" value={f.reviewed_at} onChange={(e) => set('reviewed_at', e.target.value)} /></Field>
        <Field label="Situação"><select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}><option value="draft">Rascunho (não aparece no app)</option><option value="published">Publicado</option></select></Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {f.id ? (confirm ? <span className="flex items-center gap-2 text-sm">Excluir este texto? <button className="btn-danger" onClick={() => del.mutate()} disabled={del.isPending}>Excluir</button><button className="btn-ghost" onClick={() => setConfirm(false)}>Cancelar</button></span>
          : <button className="btn-ghost text-muted" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" aria-hidden /> Excluir</button>) : <span />}
        <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>Salvar</button>
      </div>
    </div>
  );
}

function ArticlesAdmin() {
  const q = useAllArticles(true);
  const [editing, setEditing] = useState<AForm | null>(null);
  if (editing) return <ArticleEditor initial={editing} onDone={() => setEditing(null)} />;
  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) return <ErrorBox onRetry={() => q.refetch()} />;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{q.data.filter((a) => a.status === 'published').length} publicados · {q.data.filter((a) => a.status === 'draft').length} rascunhos. Só textos revisados podem ser publicados.</p>
        <button className="btn-primary" onClick={() => setEditing(emptyArticle)}><Plus className="h-4 w-4" aria-hidden /> Novo texto</button>
      </div>
      <div className="space-y-8">
        {MODULES.map((m) => {
          const items = q.data!.filter((a) => a.module === m.id);
          if (!items.length) return null;
          return (
            <section key={m.id}>
              <h3 className="mb-2 text-2xl">{m.title}</h3>
              <ul className="surface overflow-hidden">
                {items.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
                    <span><span className="font-medium">{a.title}</span> <span className={cn('ml-2 rounded-full border px-2 py-0.5 text-xs', a.status === 'published' ? 'border-olive text-olive' : 'border-line text-muted')}>{a.status === 'published' ? 'Publicado' : 'Rascunho'}</span></span>
                    <button className="icon-btn" aria-label={`Editar ${a.title}`} onClick={() => setEditing(fromArticle(a))}><Pencil className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ Igrejas ------------------------------ */
type CForm = Record<'name' | 'popular_name' | 'parish' | 'diocese' | 'address' | 'neighborhood' | 'latitude' | 'longitude' | 'phone' | 'website' | 'social' | 'accessibility' | 'notes' | 'source' | 'verified_at', string> & { id?: string; published: boolean };
const emptyChurch: CForm = { name: '', popular_name: '', parish: '', diocese: '', address: '', neighborhood: '', latitude: '', longitude: '', phone: '', website: '', social: '', accessibility: '', notes: '', source: '', verified_at: '', published: false };
const fromChurch = (c: Church): CForm => ({ id: c.id, name: c.name, popular_name: c.popular_name ?? '', parish: c.parish ?? '', diocese: c.diocese ?? '', address: c.address ?? '', neighborhood: c.neighborhood ?? '', latitude: c.latitude != null ? String(c.latitude) : '', longitude: c.longitude != null ? String(c.longitude) : '', phone: c.phone ?? '', website: c.website ?? '', social: c.social ?? '', accessibility: c.accessibility ?? '', notes: c.notes ?? '', source: c.source ?? '', verified_at: c.verified_at ?? '', published: c.published });

type SForm = { id?: string; weekday: string; time: string; kind: 'missa' | 'confissao'; schedule_type: 'regular' | 'excepcional' | 'especial'; confirmed: boolean; source: string; verified_at: string; note: string };
const emptySchedule: SForm = { weekday: '0', time: '', kind: 'missa', schedule_type: 'regular', confirmed: false, source: '', verified_at: '', note: '' };

function SchedulesEditor({ church }: { church: Church }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [s, setS] = useState<SForm>(emptySchedule);
  const refresh = () => qc.invalidateQueries({ queryKey: ['churches'] });
  const save = useMutation({
    mutationFn: async () => {
      if (!s.time) throw new Error('Informe o horário.');
      if (s.confirmed && (!s.source.trim() || !s.verified_at)) throw new Error('Para confirmar um horário, informe a fonte e a data da verificação.');
      const row = { church_id: church.id, weekday: Number(s.weekday), time: s.time, kind: s.kind, schedule_type: s.schedule_type, confirmed: s.confirmed, source: s.source.trim() || null, verified_at: s.verified_at || null, note: s.note.trim() || null };
      const { error } = s.id ? await supabase.from('mass_schedules').update(row).eq('id', s.id) : await supabase.from('mass_schedules').insert(row);
      if (error) throw new Error('Não foi possível salvar o horário.');
    },
    onSuccess: () => { toast.ok('Horário salvo'); setS(emptySchedule); refresh(); },
    onError: (e) => toast.err((e as Error).message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('mass_schedules').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast.ok('Horário removido'); refresh(); },
    onError: () => toast.err('Não foi possível remover.'),
  });
  const sorted = [...church.mass_schedules].sort((a, b) => a.weekday - b.weekday || a.time.localeCompare(b.time));
  const edit = (x: Schedule) => setS({ id: x.id, weekday: String(x.weekday), time: x.time.slice(0, 5), kind: x.kind, schedule_type: x.schedule_type, confirmed: x.confirmed, source: x.source ?? '', verified_at: x.verified_at ?? '', note: x.note ?? '' });
  return (
    <section className="mt-8" aria-labelledby="hor-admin">
      <h3 id="hor-admin" className="mb-3 text-2xl">Horários</h3>
      {sorted.length > 0 && (
        <ul className="surface mb-4 overflow-hidden text-sm">
          {sorted.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-2 border-b border-line px-4 py-2 last:border-0">
              <span>{WEEKDAYS[x.weekday]} · <strong>{formatTime(x.time)}</strong> · {x.kind === 'missa' ? 'Missa' : 'Confissão'} · {x.confirmed ? `confirmado (${x.verified_at ? fmtDateBR(x.verified_at) : '—'})` : 'não confirmado'}</span>
              <span className="flex"><button className="icon-btn" aria-label="Editar horário" onClick={() => edit(x)}><Pencil className="h-4 w-4" /></button><button className="icon-btn" aria-label="Remover horário" onClick={() => del.mutate(x.id)}><Trash2 className="h-4 w-4" /></button></span>
            </li>
          ))}
        </ul>
      )}
      <div className="surface grid gap-3 p-4 sm:grid-cols-4">
        <Field label="Dia"><select className="input" value={s.weekday} onChange={(e) => setS({ ...s, weekday: e.target.value })}>{WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></Field>
        <Field label="Horário"><input className="input" type="time" value={s.time} onChange={(e) => setS({ ...s, time: e.target.value })} /></Field>
        <Field label="Tipo"><select className="input" value={s.kind} onChange={(e) => setS({ ...s, kind: e.target.value as SForm['kind'] })}><option value="missa">Missa</option><option value="confissao">Confissão</option></select></Field>
        <Field label="Natureza"><select className="input" value={s.schedule_type} onChange={(e) => setS({ ...s, schedule_type: e.target.value as SForm['schedule_type'] })}><option value="regular">Regular</option><option value="excepcional">Excepcional</option><option value="especial">Celebração especial</option></select></Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-4"><input type="checkbox" checked={s.confirmed} onChange={(e) => setS({ ...s, confirmed: e.target.checked })} /> Horário confirmado (exige fonte e data)</label>
        <div className="sm:col-span-2"><Field label="Fonte"><input className="input" value={s.source} onChange={(e) => setS({ ...s, source: e.target.value })} placeholder="Ex.: secretaria da paróquia, por telefone" /></Field></div>
        <Field label="Verificado em"><input className="input" type="date" value={s.verified_at} onChange={(e) => setS({ ...s, verified_at: e.target.value })} /></Field>
        <Field label="Observação"><input className="input" value={s.note} onChange={(e) => setS({ ...s, note: e.target.value })} /></Field>
        <div className="flex gap-2 sm:col-span-4">
          <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>{s.id ? 'Atualizar horário' : 'Adicionar horário'}</button>
          {s.id && <button className="btn-ghost" onClick={() => setS(emptySchedule)}>Cancelar edição</button>}
        </div>
      </div>
    </section>
  );
}

function ChurchEditor({ initial, church, onDone }: { initial: CForm; church?: Church; onDone: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState(initial);
  const set = (k: keyof CForm, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const city = useQuery({ queryKey: ['cities'], queryFn: async () => { const { data, error } = await supabase.from('cities').select('id,name').order('name').limit(1); if (error) throw error; return data?.[0] as { id: string; name: string } | undefined; } });
  const save = useMutation({
    mutationFn: async () => {
      if (!f.name.trim()) throw new Error('Informe o nome da igreja.');
      if (!city.data) throw new Error('Cidade não encontrada.');
      if (f.published && (!f.source.trim() || !f.verified_at)) throw new Error('Para publicar, informe a fonte dos dados e a data da verificação.');
      const num = (v: string, min: number, max: number, label: string) => { if (!v.trim()) return null; const n = Number(v.replace(',', '.')); if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${label} inválida.`); return n; };
      const t = (v: string) => v.trim() || null;
      const row = { city_id: city.data.id, name: f.name.trim(), popular_name: t(f.popular_name), parish: t(f.parish), diocese: t(f.diocese), address: t(f.address), neighborhood: t(f.neighborhood), latitude: num(f.latitude, -90, 90, 'Latitude'), longitude: num(f.longitude, -180, 180, 'Longitude'), phone: t(f.phone), website: t(f.website), social: t(f.social), accessibility: t(f.accessibility), notes: t(f.notes), source: t(f.source), verified_at: f.verified_at || null, published: f.published };
      const { error } = f.id ? await supabase.from('churches').update(row).eq('id', f.id) : await supabase.from('churches').insert(row);
      if (error) throw new Error('Não foi possível salvar a igreja.');
    },
    onSuccess: () => { toast.ok('Igreja salva'); qc.invalidateQueries({ queryKey: ['churches'] }); if (!f.id) onDone(); },
    onError: (e) => toast.err((e as Error).message),
  });
  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('churches').delete().eq('id', f.id!); if (error) throw error; },
    onSuccess: () => { toast.ok('Igreja excluída'); qc.invalidateQueries({ queryKey: ['churches'] }); onDone(); },
    onError: () => toast.err('Não foi possível excluir.'),
  });
  const [confirm, setConfirm] = useState(false);
  const txt = (k: keyof CForm, label: string, hint?: string) => <Field label={label} hint={hint}><input className="input" value={String(f[k] ?? '')} onChange={(e) => set(k, e.target.value)} /></Field>;
  return (
    <div className="space-y-4">
      <button className="btn-ghost -ml-3" onClick={onDone}><ArrowLeft className="h-4 w-4" aria-hidden /> Voltar</button>
      <h2 className="text-3xl">{f.id ? 'Editar igreja' : 'Nova igreja'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{txt('name', 'Nome oficial')}{txt('popular_name', 'Nome popular')}{txt('parish', 'Paróquia responsável')}{txt('diocese', 'Diocese ou arquidiocese')}{txt('address', 'Endereço')}{txt('neighborhood', 'Bairro')}</div>
      <div className="grid gap-4 sm:grid-cols-2">{txt('latitude', 'Latitude', 'Só preencha se conferida (ex.: -20.8113). Sem coordenada, o app usa o endereço.')}{txt('longitude', 'Longitude')}</div>
      <div className="grid gap-4 sm:grid-cols-2">{txt('phone', 'Telefone')}{txt('website', 'Site oficial (https://…)')}{txt('social', 'Redes sociais oficiais')}{txt('accessibility', 'Acessibilidade (somente se confirmada)')}</div>
      <Field label="Observações"><textarea className="input min-h-20" value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">{txt('source', 'Fonte dos dados', 'De onde vieram endereço e contatos. Obrigatório para publicar.')}<Field label="Verificado em"><input className="input" type="date" value={f.verified_at} onChange={(e) => set('verified_at', e.target.value)} /></Field></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.published} onChange={(e) => set('published', e.target.checked)} /> Publicada (visível no app)</label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {f.id ? (confirm ? <span className="flex items-center gap-2 text-sm">Excluir esta igreja e seus horários? <button className="btn-danger" onClick={() => del.mutate()} disabled={del.isPending}>Excluir</button><button className="btn-ghost" onClick={() => setConfirm(false)}>Cancelar</button></span>
          : <button className="btn-ghost text-muted" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" aria-hidden /> Excluir</button>) : <span />}
        <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>Salvar igreja</button>
      </div>
      {church && <SchedulesEditor church={church} />}
    </div>
  );
}

function ChurchesAdmin() {
  const q = useChurches({ all: true });
  const [editing, setEditing] = useState<{ form: CForm; id?: string } | null>(null);
  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) return <ErrorBox onRetry={() => q.refetch()} />;
  if (editing) {
    const church = editing.id ? q.data.find((c) => c.id === editing.id) : undefined;
    return <ChurchEditor key={editing.id ?? 'new'} initial={editing.form} church={church} onDone={() => setEditing(null)} />;
  }
  const cov = coverage(q.data);
  const stale = q.data.filter((c) => c.published && (!c.verified_at || daysBetween(c.verified_at, new Date()) > 90)).length;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{cov.total} no total · {q.data.filter((c) => c.published).length} publicadas · {cov.withConfirmed} com missa confirmada{stale ? ` · ${stale} com dados desatualizados (mais de 3 meses)` : ''}</p>
        <button className="btn-primary" onClick={() => setEditing({ form: emptyChurch })}><Plus className="h-4 w-4" aria-hidden /> Nova igreja</button>
      </div>
      {q.data.length === 0 ? <EmptyState title="Nenhuma igreja cadastrada">Cadastre a primeira igreja com a fonte e a data da verificação.</EmptyState> : (
        <ul className="surface overflow-hidden">
          {q.data.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
              <span><span className="font-medium">{c.name}</span> <span className="text-sm text-muted">{c.neighborhood ?? ''}</span> <span className={cn('ml-2 rounded-full border px-2 py-0.5 text-xs', c.published ? 'border-olive text-olive' : 'border-line text-muted')}>{c.published ? 'Publicada' : 'Rascunho'}</span></span>
              <button className="icon-btn" aria-label={`Editar ${c.name}`} onClick={() => setEditing({ form: fromChurch(c), id: c.id })}><Pencil className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------ Histórico ------------------------------ */
function AuditLog() {
  const q = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: async () => { const { data, error } = await supabase.from('admin_audit_log').select('id,table_name,action,summary,at').order('at', { ascending: false }).limit(50); if (error) throw error; return data as { id: number; table_name: string; action: string; summary: string | null; at: string }[]; },
  });
  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) return <ErrorBox onRetry={() => q.refetch()} />;
  if (!q.data.length) return <EmptyState title="Sem alterações registradas">As alterações em textos, igrejas e horários aparecem aqui.</EmptyState>;
  const label: Record<string, string> = { church_articles: 'Texto', churches: 'Igreja', mass_schedules: 'Horário' };
  const act: Record<string, string> = { INSERT: 'criado', UPDATE: 'alterado', DELETE: 'excluído' };
  return (
    <ul className="surface overflow-hidden text-sm">
      {q.data.map((r) => (
        <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-line px-4 py-2 last:border-0">
          <span>{label[r.table_name] ?? r.table_name} {act[r.action] ?? r.action}{r.summary ? `: ${r.summary}` : ''}</span>
          <span className="text-xs text-muted">{new Date(r.at).toLocaleString('pt-BR')}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ Página ------------------------------ */
export default function Admin() {
  const { user, loading } = useAuth();
  const admin = useIsAdmin();
  const [tab, setTab] = useState<'conteudo' | 'igrejas' | 'historico'>('conteudo');
  if (loading || (user && admin.isLoading)) return <Spinner />;
  if (!user) return <SignInPrompt title="Área restrita" text="Entre com a conta de administrador." />;
  if (!admin.data) {
    return <EmptyState icon={<ShieldAlert className="h-8 w-8" />} title="Acesso restrito" action={{ to: '/', label: 'Voltar ao início' }}>Esta área é só para administradores.</EmptyState>;
  }
  return (
    <div>
      <PageHeader eyebrow="Administração" title="Painel">Gerencie os textos educativos e o catálogo de igrejas. <Link to="/catolica" className="text-olive underline">Ver a área Católica</Link></PageHeader>
      <Tabs value={tab} onChange={setTab} items={[{ id: 'conteudo', label: 'Textos' }, { id: 'igrejas', label: 'Igrejas e horários' }, { id: 'historico', label: 'Histórico' }]} />
      {tab === 'conteudo' && <ArticlesAdmin />}
      {tab === 'igrejas' && <ChurchesAdmin />}
      {tab === 'historico' && <AuditLog />}
    </div>
  );
}
