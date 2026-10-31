import { useToast } from '../lib/toast';
import { PRAYERS, type PrayerKey } from '../lib/rosary';
import { Copy } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { Link } from 'react-router-dom';

const ORDER: PrayerKey[] = ['sinal', 'pai', 'ave', 'gloria', 'creio', 'salve', 'fatima'];

export default function Prayers() {
  const toast = useToast();
  const copy = async (k: PrayerKey) => {
    try { await navigator.clipboard.writeText(`${PRAYERS[k].title}\n\n${PRAYERS[k].text}`); toast.ok('Oração copiada'); } catch { toast.err('Não foi possível copiar.'); }
  };
  return (
    <div>
      <PageHeader eyebrow="Católica" title="Orações">As orações tradicionais, na versão usada no Brasil. Pequenas diferenças de redação existem entre comunidades; em caso de dúvida, siga o texto da sua paróquia. Para rezar o terço passo a passo, abra <Link to="/catolica/terco" className="text-olive underline">O Santo Terço</Link>.</PageHeader>
      <ul className="space-y-4">
        {ORDER.map((k) => (
          <li key={k} className="surface p-5" id={k}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl">{PRAYERS[k].title}</h2>
              <button className="icon-btn" onClick={() => copy(k)} aria-label={`Copiar ${PRAYERS[k].title}`}><Copy className="h-4 w-4" /></button>
            </div>
            <p className="verse-text mt-2 max-w-prose">{PRAYERS[k].text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
