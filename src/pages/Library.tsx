import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, FolderOpen, Heart, Pencil, StickyNote, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { VERSE_SELECT, reference, useCollections, type Collection, type Verse } from '../lib/data';
import { EmptyState, ErrorBox, Modal, PageHeader, Spinner, Tabs } from '../components/ui';
import { SignInPrompt } from '../components/SignInPrompt';
import { VerseCard } from '../components/VerseCard';
import { useVerseDialogs } from '../components/VerseDialogs';
import { NoteDialog } from '../components/NoteDialog';
import type { VerseDialogs } from '../components/VerseActions';

type Tab = 'favoritos' | 'colecoes' | 'notas' | 'recentes';
const TABS: { id: Tab; label: string }[] = [
  { id: 'favoritos', label: 'Favoritos' }, { id: 'colecoes', label: 'Coleções' },
  { id: 'notas', label: 'Notas' }, { id: 'recentes', label: 'Recentes' },
];
const matches = (v: Verse, q: string) => !q || `${v.text} ${reference(v)}`.toLowerCase().includes(q.toLowerCase());

function VerseList({ rows, q, dialogs, empty }: { rows: Verse[]; q: string; dialogs: VerseDialogs; empty: React.ReactNode }) {
  const f = rows.filter((v) => matches(v, q));
  if (!rows.length) return <>{empty}</>;
  if (!f.length) return <EmptyState title="Nada encontrado">Nenhum item corresponde à busca.</EmptyState>;
  return <ul className="space-y-3">{f.map((v) => <li key={v.id}><VerseCard verse={v} dialogs={dialogs} /></li>)}</ul>;
}

function Favorites({ q, dialogs }: { q: string; dialogs: VerseDialogs }) {
  const r = useQuery({
    queryKey: ['me', 'favorites-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('favorites').select(`verse_id,created_at,verses(${VERSE_SELECT})`).order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as { verses: Verse }[]).map((x) => x.verses).filter(Boolean);
    },
  });
  if (r.isLoading) return <Spinner />;
  if (r.isError) return <ErrorBox onRetry={() => r.refetch()} />;
  return <VerseList rows={r.data ?? []} q={q} dialogs={dialogs}
    empty={<EmptyState icon={<Heart className="h-8 w-8" />} title="Nenhum favorito ainda" action={{ to: '/explorar', label: 'Explorar versículos' }}>Toque no coração de um versículo para guardá-lo aqui.</EmptyState>} />;
}

function Recent({ q, dialogs }: { q: string; dialogs: VerseDialogs }) {
  const r = useQuery({
    queryKey: ['me', 'recent-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('reading_history').select(`verse_id,viewed_at,verses(${VERSE_SELECT})`).order('viewed_at', { ascending: false }).limit(30);
      if (error) throw error;
      return (data as unknown as { verses: Verse }[]).map((x) => x.verses).filter(Boolean);
    },
  });
  if (r.isLoading) return <Spinner />;
  if (r.isError) return <ErrorBox onRetry={() => r.refetch()} />;
  return <VerseList rows={r.data ?? []} q={q} dialogs={dialogs}
    empty={<EmptyState icon={<Clock className="h-8 w-8" />} title="Nada visto recentemente" action={{ to: '/biblia', label: 'Abrir a Bíblia' }}>Os versículos com que você interagir (favoritar, anotar, copiar) aparecem aqui.</EmptyState>} />;
}

function Notes({ q }: { q: string }) {
  const [editing, setEditing] = useState<Verse | null>(null);
  const r = useQuery({
    queryKey: ['me', 'notes-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notes').select(`id,body,updated_at,verses(${VERSE_SELECT})`).order('updated_at', { ascending: false });
      if (error) throw error;
      return data as unknown as { id: string; body: string; updated_at: string; verses: Verse }[];
    },
  });
  if (r.isLoading) return <Spinner />;
  if (r.isError) return <ErrorBox onRetry={() => r.refetch()} />;
  const rows = (r.data ?? []).filter((n) => n.verses && (matches(n.verses, q) || n.body.toLowerCase().includes(q.toLowerCase())));
  if (!r.data?.length) return <EmptyState icon={<StickyNote className="h-8 w-8" />} title="Nenhuma nota ainda" action={{ to: '/biblia', label: 'Ler a Bíblia' }}>Anote reflexões em qualquer versículo. Suas notas são privadas.</EmptyState>;
  return (
    <>
      <ul className="space-y-3">
        {rows.map((n) => (
          <li key={n.id} className="surface p-5">
            <p className="eyebrow mb-1">{reference(n.verses)}</p>
            <p className="verse-text !text-base text-muted">“{n.verses.text}”</p>
            <p className="mt-3 whitespace-pre-wrap border-l-2 border-gold pl-3 text-sm">{n.body}</p>
            <button className="btn-ghost mt-3 -ml-3" onClick={() => setEditing(n.verses)}><Pencil className="h-4 w-4" aria-hidden /> Editar</button>
          </li>
        ))}
      </ul>
      <NoteDialog verse={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function CollectionItems({ id, dialogs }: { id: string; dialogs: VerseDialogs }) {
  const qc = useQueryClient();
  const toast = useToast();
  const r = useQuery({
    queryKey: ['me', 'collection-items', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('collection_items').select(`verse_id,added_at,verses(${VERSE_SELECT})`).eq('collection_id', id).order('added_at');
      if (error) throw error;
      return (data as unknown as { verses: Verse }[]).map((x) => x.verses).filter(Boolean);
    },
  });
  const remove = useMutation({
    mutationFn: async (verseId: number) => { const { error } = await supabase.from('collection_items').delete().eq('collection_id', id).eq('verse_id', verseId); if (error) throw error; },
    onSuccess: () => { toast.ok('Removido da coleção'); qc.invalidateQueries({ queryKey: ['me'] }); },
    onError: () => toast.err('Não foi possível remover.'),
  });
  if (r.isLoading) return <Spinner />;
  if (!r.data?.length) return <p className="py-4 text-sm text-muted">Esta coleção está vazia. Use o ícone de pasta em um versículo para adicioná-lo.</p>;
  return (
    <ul className="mt-4 space-y-3">
      {r.data.map((v) => (
        <li key={v.id}>
          <VerseCard verse={v} dialogs={dialogs} />
          <button className="btn-ghost mt-1 text-xs text-muted" onClick={() => remove.mutate(v.id)}>Tirar desta coleção</button>
        </li>
      ))}
    </ul>
  );
}

function Collections({ dialogs }: { dialogs: VerseDialogs }) {
  const qc = useQueryClient();
  const toast = useToast();
  const cols = useCollections();
  const [name, setName] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<Collection | null>(null);
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState<Collection | null>(null);
  const done = () => qc.invalidateQueries({ queryKey: ['me'] });

  const create = useMutation({
    mutationFn: async () => { const n = name.trim(); if (!n) throw new Error('empty'); const { error } = await supabase.from('collections').insert({ name: n }); if (error) throw error; },
    onSuccess: () => { setName(''); toast.ok('Coleção criada'); done(); },
    onError: (e) => toast.err((e as Error).message === 'empty' ? 'Dê um nome à coleção.' : 'Não foi possível criar.'),
  });
  const rename = useMutation({
    mutationFn: async () => { const n = newName.trim(); if (!n) throw new Error('empty'); const { error } = await supabase.from('collections').update({ name: n }).eq('id', renaming!.id); if (error) throw error; },
    onSuccess: () => { setRenaming(null); toast.ok('Coleção renomeada'); done(); },
    onError: (e) => toast.err((e as Error).message === 'empty' ? 'O nome não pode ficar vazio.' : 'Não foi possível renomear.'),
  });
  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('collections').delete().eq('id', deleting!.id); if (error) throw error; },
    onSuccess: () => { setDeleting(null); setOpen(null); toast.ok('Coleção excluída'); done(); },
    onError: () => toast.err('Não foi possível excluir.'),
  });

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="mb-6 flex gap-2">
        <label htmlFor="nova-col" className="sr-only">Nome da nova coleção</label>
        <input id="nova-col" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Nova coleção — ex.: Orações, Esperança, Para reler" />
        <button type="submit" className="btn-primary shrink-0" disabled={create.isPending}>Criar</button>
      </form>
      {cols.isLoading ? <Spinner /> : cols.isError ? <ErrorBox onRetry={() => cols.refetch()} /> : !cols.data?.length ? (
        <EmptyState icon={<FolderOpen className="h-8 w-8" />} title="Nenhuma coleção ainda">Crie coleções para organizar versículos por tema ou intenção.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {cols.data.map((c) => (
            <li key={c.id} className="surface p-4">
              <div className="flex items-center justify-between gap-2">
                <button className="flex-1 text-left" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
                  <span className="font-serif text-2xl">{c.name}</span>
                  <span className="ml-2 text-xs text-muted">{c.collection_items.length} {c.collection_items.length === 1 ? 'versículo' : 'versículos'}</span>
                </button>
                <button className="icon-btn" aria-label={`Renomear ${c.name}`} onClick={() => { setRenaming(c); setNewName(c.name); }}><Pencil className="h-4 w-4" /></button>
                <button className="icon-btn" aria-label={`Excluir ${c.name}`} onClick={() => setDeleting(c)}><Trash2 className="h-4 w-4" /></button>
              </div>
              {open === c.id && <CollectionItems id={c.id} dialogs={dialogs} />}
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Renomear coleção">
        <form onSubmit={(e) => { e.preventDefault(); rename.mutate(); }} className="space-y-4">
          <label className="sr-only" htmlFor="ren">Novo nome</label>
          <input id="ren" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60} autoFocus />
          <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setRenaming(null)}>Cancelar</button><button className="btn-primary" disabled={rename.isPending}>Salvar</button></div>
        </form>
      </Modal>
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Excluir coleção?">
        <p className="mb-5 text-sm text-muted">A coleção “{deleting?.name}” será excluída. Os versículos continuam disponíveis na Bíblia e nos favoritos.</p>
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setDeleting(null)}>Cancelar</button><button className="btn-danger" onClick={() => del.mutate()} disabled={del.isPending}>Excluir</button></div>
      </Modal>
    </div>
  );
}

export default function Library() {
  const { user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((t) => t.id === params.get('aba')) ? params.get('aba') : 'favoritos') as Tab;
  const [q, setQ] = useState('');
  const { dialogs, element } = useVerseDialogs();

  if (loading) return <Spinner />;
  return (
    <div>
      <PageHeader eyebrow="Minha biblioteca" title="Favoritos">Seus versículos salvos, coleções, notas privadas e o que você viu recentemente.</PageHeader>
      {!user ? <SignInPrompt text="Entre na sua conta para salvar versículos, criar coleções e escrever notas. Tudo fica privado e sincronizado entre seus dispositivos." /> : (
        <>
          <Tabs value={tab} onChange={(v) => setParams({ aba: v }, { replace: true })} items={TABS} />
          {tab !== 'colecoes' && (
            <>
              <label htmlFor="q-lib" className="sr-only">Pesquisar nos itens salvos</label>
              <input id="q-lib" type="search" className="input mb-5" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar nos itens salvos" />
            </>
          )}
          {tab === 'favoritos' && <Favorites q={q} dialogs={dialogs} />}
          {tab === 'colecoes' && <Collections dialogs={dialogs} />}
          {tab === 'notas' && <Notes q={q} />}
          {tab === 'recentes' && <Recent q={q} dialogs={dialogs} />}
          {element}
        </>
      )}
    </div>
  );
}
