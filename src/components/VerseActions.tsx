import { Copy, FolderPlus, Heart, Share2, StickyNote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { copyVerse, recordView, useFavoriteIds, useNoteVerseIds, useToggleFavorite, type Verse } from '../lib/data';
import { cn } from '../lib/utils';

export type VerseDialogs = { openNote: (v: Verse) => void; openCollection: (v: Verse) => void; openShare: (v: Verse) => void };

/** Barra de ações de um versículo (favoritar, nota, coleção, copiar). */
export function VerseActions({ verse, dialogs, className }: { verse: Verse; dialogs: VerseDialogs; className?: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const favs = useFavoriteIds();
  const notes = useNoteVerseIds();
  const toggle = useToggleFavorite();
  const isFav = !!favs.data?.has(verse.id);
  const hasNote = !!notes.data?.has(verse.id);

  const needLogin = (fn: () => void) => () => {
    if (!user) { toast.err('Entre na sua conta para salvar.'); nav('/perfil'); return; }
    fn();
    recordView(verse.id);
  };

  return (
    <div className={cn('flex items-center gap-0.5', className)} role="group" aria-label="Ações do versículo">
      <button className="icon-btn" onClick={needLogin(() => toggle.mutate({ verseId: verse.id, on: !isFav }))} aria-pressed={isFav} aria-label={isFav ? 'Remover dos favoritos' : 'Favoritar'}>
        <Heart className={cn('h-4 w-4', isFav && 'fill-gold text-gold')} />
      </button>
      <button className="icon-btn" onClick={needLogin(() => dialogs.openNote(verse))} aria-label={hasNote ? 'Ver ou editar nota' : 'Adicionar nota'}>
        <StickyNote className={cn('h-4 w-4', hasNote && 'text-gold')} />
      </button>
      <button className="icon-btn" onClick={needLogin(() => dialogs.openCollection(verse))} aria-label="Adicionar a uma coleção"><FolderPlus className="h-4 w-4" /></button>
      <button className="icon-btn" onClick={() => dialogs.openShare(verse)} aria-label="Compartilhar como imagem"><Share2 className="h-4 w-4" /></button>
      <button className="icon-btn" onClick={() => copyVerse(verse, toast)} aria-label="Copiar versículo"><Copy className="h-4 w-4" /></button>
    </div>
  );
}
