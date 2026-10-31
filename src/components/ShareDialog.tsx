import { useEffect, useRef, useState } from 'react';
import { Copy, Download, Share2 } from 'lucide-react';
import { Modal, Spinner } from './ui';
import { reference, shareText, type Verse } from '../lib/data';
import { renderVerseImage } from '../lib/share-image';
import { useToast } from '../lib/toast';
import { cn } from '../lib/utils';

export function ShareDialog({ verse, onClose }: { verse: Verse | null; onClose: () => void }) {
  const toast = useToast();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [url, setUrl] = useState<string | null>(null);
  const blob = useRef<Blob | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!verse) return;
    let alive = true; let created: string | null = null;
    setUrl(null); setError(false);
    renderVerseImage({ text: verse.text, reference: reference(verse), translation: verse.translation, dark })
      .then((b) => { if (!alive) return; blob.current = b; created = URL.createObjectURL(b); setUrl(created); })
      .catch(() => alive && setError(true));
    return () => { alive = false; if (created) URL.revokeObjectURL(created); };
  }, [verse, dark]);

  const fileName = verse ? `verbum-${reference(verse).replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.png` : 'verbum.png';
  const download = () => {
    if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
  };
  const share = async () => {
    if (!blob.current || !verse) return;
    const file = new File([blob.current], fileName, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: shareText(verse) });
      else download();
    } catch (e) { if ((e as Error).name !== 'AbortError') toast.err('Não foi possível compartilhar.'); }
  };
  const copy = async () => {
    if (!verse) return;
    try { await navigator.clipboard.writeText(shareText(verse)); toast.ok('Texto copiado'); } catch { toast.err('Não foi possível copiar.'); }
  };

  return (
    <Modal open={!!verse} onClose={onClose} title="Compartilhar como imagem">
      <div className="space-y-4">
        <div role="group" aria-label="Aparência da imagem" className="flex gap-2">
          {([[false, 'Claro'], [true, 'Escuro']] as const).map(([d, label]) => (
            <button key={label} aria-pressed={dark === d} onClick={() => setDark(d)} className={cn('chip', dark === d && 'chip-on')}>{label}</button>
          ))}
        </div>
        <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl border border-line bg-soft">
          {error ? <p role="alert" className="p-6 text-sm text-danger">Não foi possível gerar a imagem neste navegador.</p>
            : url ? <img src={url} alt={`Cartão do versículo ${verse ? reference(verse) : ''}`} className="max-h-[50vh] w-auto" /> : <Spinner label="Gerando imagem…" />}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button className="btn-ghost" onClick={copy}><Copy className="h-4 w-4" aria-hidden /> Copiar texto</button>
          <button className="btn-outline" onClick={download} disabled={!url}><Download className="h-4 w-4" aria-hidden /> Baixar</button>
          <button className="btn-primary" onClick={share} disabled={!url}><Share2 className="h-4 w-4" aria-hidden /> Compartilhar</button>
        </div>
      </div>
    </Modal>
  );
}
