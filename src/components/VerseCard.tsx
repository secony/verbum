import { Link } from 'react-router-dom';
import { bookSlug } from '../lib/bible-nav';
import { reference, type Verse } from '../lib/data';
import { VerseActions, type VerseDialogs } from './VerseActions';

export function VerseCard({ verse, dialogs, large }: { verse: Verse; dialogs: VerseDialogs; large?: boolean }) {
  const b = verse.books;
  return (
    <article className="surface fade-up p-5 md:p-6">
      <p className={large ? 'verse-text md:!text-[1.9rem]' : 'verse-text'}>“{verse.text}”</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          {b ? (
            <Link to={`/biblia/${bookSlug(b)}/${verse.chapter}`} className="text-sm font-medium text-olive hover:underline">{reference(verse)}</Link>
          ) : <span className="text-sm font-medium">{reference(verse)}</span>}
          <p className="text-xs text-muted">{verse.translation}</p>
        </div>
        <VerseActions verse={verse} dialogs={dialogs} />
      </div>
    </article>
  );
}
