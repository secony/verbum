import { useState } from 'react';
import type { Verse } from '../lib/data';
import { NoteDialog } from './NoteDialog';
import { CollectionDialog } from './CollectionDialog';
import { ShareDialog } from './ShareDialog';
import type { VerseDialogs } from './VerseActions';

/** Hook + elemento: controla os diálogos de nota, coleção e compartilhar de uma lista de versículos. */
export function useVerseDialogs() {
  const [note, setNote] = useState<Verse | null>(null);
  const [col, setCol] = useState<Verse | null>(null);
  const [share, setShare] = useState<Verse | null>(null);
  const dialogs: VerseDialogs = { openNote: setNote, openCollection: setCol, openShare: setShare };
  const element = (
    <>
      <NoteDialog verse={note} onClose={() => setNote(null)} />
      <CollectionDialog verse={col} onClose={() => setCol(null)} />
      <ShareDialog verse={share} onClose={() => setShare(null)} />
    </>
  );
  return { dialogs, element };
}
