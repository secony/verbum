import { useState } from 'react';
import type { Verse } from '../lib/data';
import { NoteDialog } from './NoteDialog';
import { CollectionDialog } from './CollectionDialog';
import type { VerseDialogs } from './VerseActions';

/** Hook + elemento: controla os diálogos de nota e coleção de uma lista de versículos. */
export function useVerseDialogs() {
  const [note, setNote] = useState<Verse | null>(null);
  const [col, setCol] = useState<Verse | null>(null);
  const dialogs: VerseDialogs = { openNote: setNote, openCollection: setCol };
  const element = (
    <>
      <NoteDialog verse={note} onClose={() => setNote(null)} />
      <CollectionDialog verse={col} onClose={() => setCol(null)} />
    </>
  );
  return { dialogs, element };
}
