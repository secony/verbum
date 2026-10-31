import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';
import { Modal, Spinner } from './ui';
import { reference, type Verse } from '../lib/data';

type Note = { id: string; body: string };

export function NoteDialog({ verse, onClose }: { verse: Verse | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [body, setBody] = useState('');
  const q = useQuery({
    queryKey: ['me', 'note', verse?.id], enabled: !!verse,
    queryFn: async () => {
      const { data, error } = await supabase.from('notes').select('id,body').eq('verse_id', verse!.id).order('created_at').limit(1).maybeSingle();
      if (error) throw error;
      return data as Note | null;
    },
  });
  useEffect(() => { setBody(q.data?.body ?? ''); }, [q.data, verse?.id]);

  const save = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!text) throw new Error('empty');
      const { error } = q.data
        ? await supabase.from('notes').update({ body: text, updated_at: new Date().toISOString() }).eq('id', q.data.id)
        : await supabase.from('notes').insert({ verse_id: verse!.id, body: text });
      if (error) throw error;
    },
    onSuccess: () => { toast.ok('Nota salva'); qc.invalidateQueries({ queryKey: ['me'] }); onClose(); },
    onError: (e) => toast.err((e as Error).message === 'empty' ? 'Escreva algo antes de salvar.' : 'Não foi possível salvar a nota.'),
  });
  const remove = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('notes').delete().eq('id', q.data!.id); if (error) throw error; },
    onSuccess: () => { toast.ok('Nota excluída'); qc.invalidateQueries({ queryKey: ['me'] }); onClose(); },
    onError: () => toast.err('Não foi possível excluir a nota.'),
  });

  return (
    <Modal open={!!verse} onClose={onClose} title={verse ? `Nota · ${reference(verse)}` : 'Nota'}>
      {q.isLoading ? <Spinner /> : (
        <div className="space-y-4">
          <p className="verse-text !text-base text-muted">“{verse?.text}”</p>
          <label className="block text-sm font-medium" htmlFor="note-body">Sua nota (privada)</label>
          <textarea id="note-body" className="input min-h-32" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} placeholder="O que esta passagem diz para você hoje?" />
          <div className="flex flex-wrap justify-between gap-2">
            {q.data ? <button className="btn-danger" onClick={() => remove.mutate()} disabled={remove.isPending}>Excluir</button> : <span />}
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
