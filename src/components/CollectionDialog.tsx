import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';
import { useCollections, reference, type Verse } from '../lib/data';
import { Modal, Spinner } from './ui';

export function CollectionDialog({ verse, onClose }: { verse: Verse | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const cols = useCollections();
  const [name, setName] = useState('');

  const toggle = useMutation({
    mutationFn: async ({ id, has }: { id: string; has: boolean }) => {
      const { error } = has
        ? await supabase.from('collection_items').delete().eq('collection_id', id).eq('verse_id', verse!.id)
        : await supabase.from('collection_items').insert({ collection_id: id, verse_id: verse!.id });
      if (error) throw error;
      return !has;
    },
    onSuccess: (added) => { toast.ok(added ? 'Adicionado à coleção' : 'Removido da coleção'); qc.invalidateQueries({ queryKey: ['me', 'collections'] }); },
    onError: () => toast.err('Não foi possível atualizar a coleção.'),
  });
  const create = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (!n) throw new Error('empty');
      const { data, error } = await supabase.from('collections').insert({ name: n }).select('id').single();
      if (error) throw error;
      const { error: e2 } = await supabase.from('collection_items').insert({ collection_id: data.id, verse_id: verse!.id });
      if (e2) throw e2;
    },
    onSuccess: () => { toast.ok('Coleção criada'); setName(''); qc.invalidateQueries({ queryKey: ['me', 'collections'] }); },
    onError: (e) => toast.err((e as Error).message === 'empty' ? 'Dê um nome à coleção.' : 'Não foi possível criar a coleção.'),
  });

  return (
    <Modal open={!!verse} onClose={onClose} title={verse ? `Coleções · ${reference(verse)}` : 'Coleções'}>
      {cols.isLoading ? <Spinner /> : (
        <div className="space-y-4">
          {cols.data?.length ? (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {cols.data.map((c) => {
                const has = c.collection_items.some((i) => i.verse_id === verse?.id);
                return (
                  <li key={c.id}>
                    <button onClick={() => toggle.mutate({ id: c.id, has })} disabled={toggle.isPending}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-soft" aria-pressed={has}>
                      <span>{c.name}</span>
                      {has && <Check className="h-4 w-4 text-olive" aria-label="Está na coleção" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-muted">Você ainda não tem coleções. Crie a primeira abaixo (ex.: Orações, Esperança, Para reler).</p>}
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="new-col">Nome da nova coleção</label>
            <input id="new-col" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Nova coleção" onKeyDown={(e) => { if (e.key === 'Enter') create.mutate(); }} />
            <button className="btn-primary shrink-0" onClick={() => create.mutate()} disabled={create.isPending}><Plus className="h-4 w-4" aria-hidden /> Criar</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
