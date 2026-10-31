import { FlaskConical } from 'lucide-react';

export function TestNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3.5 py-2.5 text-xs text-muted ${className}`} role="note">
      <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
      <span>Texto de teste em inglês (Douay-Rheims, Challoner). Numeração da Vulgata.</span>
    </p>
  );
}
