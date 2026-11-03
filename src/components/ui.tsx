import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import { cn } from '../lib/utils';

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function ErrorBox({ text = 'Não foi possível carregar. Verifique sua conexão e tente novamente.', onRetry }: { text?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="surface p-6 text-center text-sm">
      <p className="text-danger">{text}</p>
      {onRetry && <button className="btn-outline mt-3" onClick={onRetry}>Tentar de novo</button>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: { to: string; label: string } }) {
  return (
    <div className="fade-up flex flex-col items-center border-y border-line px-6 py-12 text-center">
      {icon && <div className="mb-4 text-olive" aria-hidden>{icon}</div>}
      <h3 className="text-xl md:text-2xl">{title}</h3>
      {children && <p className="mt-2 max-w-md text-sm text-muted">{children}</p>}
      {action && <Link to={action.to} className="btn-primary mt-5">{action.label}</Link>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8 max-w-3xl">
      {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
      <h1 className="text-3xl leading-tight sm:text-4xl md:text-[2.75rem]">{title}</h1>
      {children && <p className="mt-3 max-w-2xl text-[0.95rem] leading-7 text-muted">{children}</p>}
    </header>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      aria-labelledby="dialog-title"
      className="m-auto w-[min(32rem,92vw)] border border-line bg-surface p-0 text-fg shadow-soft"
    >
      {open && (
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id="dialog-title" className="text-xl leading-snug sm:text-2xl">{title}</h2>
            <button className="icon-btn -mr-2 -mt-1" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  const moveFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const current = items.findIndex((item) => item.id === value);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length;
    const item = items[next];
    if (!item) return;
    onChange(item.id);
    requestAnimationFrame(() => document.getElementById(`tab-${item.id}`)?.focus());
  };
  return (
    <div role="tablist" onKeyDown={moveFocus} className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((i) => (
        <button
          id={`tab-${i.id}`} key={i.id} role="tab" tabIndex={value === i.id ? 0 : -1} aria-selected={value === i.id} onClick={() => onChange(i.id)}
          className={cn('relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors after:absolute after:inset-x-4 after:-bottom-px after:h-0.5 after:transition-colors', value === i.id ? 'text-olive after:bg-olive' : 'text-muted hover:text-fg after:bg-transparent')}
        >{i.label}</button>
      ))}
    </div>
  );
}
