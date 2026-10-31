import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type T = { id: number; kind: 'ok' | 'err'; text: string };
const Ctx = createContext<{ ok: (t: string) => void; err: (t: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((kind: T['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={{ ok: (t) => push('ok', t), err: (t) => push('err', t) }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((i) => (
          <div key={i.id} role="status" className="surface fade-up pointer-events-auto flex items-center gap-2 px-4 py-2.5 text-sm">
            {i.kind === 'ok' ? <CheckCircle2 className="h-4 w-4 text-olive" aria-hidden /> : <AlertCircle className="h-4 w-4 text-danger" aria-hidden />}
            {i.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast fora do ToastProvider');
  return v;
};
