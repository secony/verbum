import { Link } from 'react-router-dom';
import { bookSlug } from '../lib/bible-nav';
import { reference, type Verse } from '../lib/data';
import { VerseActions, type VerseDialogs } from './VerseActions';

export function VerseCard({ verse, dialogs, large }: { verse: Verse; dialogs: VerseDialogs; large?: boolean }) {
  const b = verse.books;
  return (
    <article className={large ? 'surface fade-up p-5 sm:p-7 md:p-9' : 'surface fade-up p-4 sm:p-5'}>
      <p className={large ? 'verse-text max-w-[58ch] md:!text-[1.8rem]' : 'verse-text'}>“{verse.text}”</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-3">
        <div>
          {b ? (
            <Link to={`/biblia/${bookSlug(b)}/${verse.chapter}`} className="text-sm font-semibold text-olive underline-offset-4 hover:underline">{reference(verse)}</Link>
          ) : <span className="text-sm font-medium">{reference(verse)}</span>}
          <p className="text-xs text-muted">{verse.translation}</p>
        </div>
        <VerseActions verse={verse} dialogs={dialogs} />
      </div>
    </article>
  );
}
