import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Footprints, LogOut, MailCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { usePrefs, FONTS, type FontSize, type Theme } from '../lib/prefs';
import { useToast } from '../lib/toast';
import { cn } from '../lib/utils';
import { PageHeader, Spinner, Tabs } from '../components/ui';

function AuthForms() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Informe um e-mail válido.');
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    setBusy(true);
    if (mode === 'entrar') {
      const err = await signIn(email.trim(), password);
      if (err) setError(err);
    } else {
      const r = await signUp(email.trim(), password, name.trim());
      if (r.error) setError(r.error);
      else if (r.needsConfirmation) setInfo('Conta criada! Enviamos um link de confirmação para o seu e-mail. Abra-o e depois volte para entrar.');
    }
    setBusy(false);
  };
  const forgot = async () => {
    setError(null); setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Digite seu e-mail acima para receber o link de redefinição.');
    const err = await resetPassword(email.trim());
    if (err) setError(err); else setInfo('Se o e-mail existir, enviamos um link para redefinir a senha.');
  };

  return (
    <div className="surface mx-auto max-w-md p-6">
      <Tabs value={mode} onChange={setMode} items={[{ id: 'entrar', label: 'Entrar' }, { id: 'criar', label: 'Criar conta' }]} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        {mode === 'criar' && (
          <div><label className="mb-1.5 block text-sm font-medium" htmlFor="nome">Nome</label>
            <input id="nome" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} /></div>
        )}
        <div><label className="mb-1.5 block text-sm font-medium" htmlFor="email">E-mail</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></div>
        <div><label className="mb-1.5 block text-sm font-medium" htmlFor="senha">Senha</label>
          <input id="senha" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'} required /></div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {info && <p role="status" className="flex items-start gap-2 text-sm text-olive"><MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{info}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}</button>
        {mode === 'entrar' && <button type="button" onClick={forgot} className="w-full text-center text-sm text-muted hover:text-fg">Esqueci minha senha</button>}
      </form>
    </div>
  );
}

function Segmented<T extends string>({ label, value, onChange, items }: { label: string; value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium" id={`seg-${label}`}>{label}</p>
      <div role="group" aria-labelledby={`seg-${label}`} className="flex flex-wrap gap-2">
        {items.map((i) => <button key={i.id} aria-pressed={value === i.id} onClick={() => onChange(i.id)} className={cn('chip', value === i.id && 'chip-on')}>{i.label}</button>)}
      </div>
    </div>
  );
}

function Account() {
  const { user, signOut } = useAuth();
  const prefs = usePrefs();
  const toast = useToast();
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ['me', 'profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('display_name,timezone,practice_goal').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data as { display_name: string | null; timezone: string | null; practice_goal: number | null } | null;
    },
  });
  const [name, setName] = useState('');
  const [tz, setTz] = useState('');
  const [goal, setGoal] = useState('');
  useEffect(() => {
    setName(profile.data?.display_name ?? (user?.user_metadata?.display_name as string | undefined) ?? '');
    setTz(profile.data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    setGoal(profile.data?.practice_goal ? String(profile.data.practice_goal) : '');
  }, [profile.data, user]);

  const zones: string[] = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? ['America/Sao_Paulo', 'UTC'];
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').upsert({ user_id: user!.id, display_name: name.trim() || null, timezone: tz, practice_goal: goal ? Number(goal) : null }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => { toast.ok('Perfil salvo'); qc.invalidateQueries({ queryKey: ['me'] }); },
    onError: () => toast.err('Não foi possível salvar o perfil.'),
  });

  if (profile.isLoading) return <Spinner />;
  return (
    <div className="space-y-8">
      <section className="surface space-y-5 p-6" aria-labelledby="p-conta">
        <h2 id="p-conta" className="text-2xl">Conta</h2>
        <p className="text-sm text-muted">{user?.email}</p>
        <div><label className="mb-1.5 block text-sm font-medium" htmlFor="dn">Nome de exibição</label><input id="dn" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
        <div><label className="mb-1.5 block text-sm font-medium" htmlFor="tz">Fuso horário (define o seu “dia” na caminhada)</label>
          <select id="tz" className="input" value={tz} onChange={(e) => setTz(e.target.value)}>{(zones.includes(tz) ? zones : [tz, ...zones]).map((z) => <option key={z}>{z}</option>)}</select></div>
        <div><label className="mb-1.5 block text-sm font-medium" htmlFor="goal">Meta pessoal (dias por semana, opcional)</label>
          <select id="goal" className="input" value={goal} onChange={(e) => setGoal(e.target.value)}><option value="">Sem meta</option>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
        <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>Salvar</button>
      </section>

      <section className="surface space-y-5 p-6" aria-labelledby="p-aparencia">
        <h2 id="p-aparencia" className="text-2xl">Leitura e aparência</h2>
        <Segmented<Theme> label="Tema" value={prefs.theme} onChange={prefs.setTheme} items={[{ id: 'system', label: 'Automático' }, { id: 'light', label: 'Claro' }, { id: 'dark', label: 'Escuro' }]} />
        <Segmented<FontSize> label="Tamanho do texto" value={prefs.font} onChange={prefs.setFont} items={FONTS.map((f) => ({ id: f, label: { sm: 'Pequeno', md: 'Médio', lg: 'Grande', xl: 'Muito grande' }[f] }))} />
        <Segmented<'auto' | 'verses' | 'continuous'> label="Modo de leitura" value={prefs.mode ?? 'auto'} onChange={(m) => prefs.setMode(m === 'auto' ? null : m)}
          items={[{ id: 'auto', label: 'Automático' }, { id: 'verses', label: 'Versículos' }, { id: 'continuous', label: 'Contínuo' }]} />
        <p className="text-xs text-muted">Automático: contínuo na maioria dos livros e versículo por versículo em Salmos, Provérbios e Cântico dos Cânticos.</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link to="/caminhada" className="btn-outline"><Footprints className="h-4 w-4" aria-hidden /> Minha caminhada</Link>
        <button className="btn-ghost" onClick={() => signOut()}><LogOut className="h-4 w-4" aria-hidden /> Sair</button>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, loading } = useAuth();
  return (
    <div>
      <PageHeader eyebrow="Conta" title="Perfil">Entre para sincronizar favoritos, coleções, notas e preferências entre seus dispositivos. Seus dados são privados.</PageHeader>
      {loading ? <Spinner /> : user ? <Account /> : <AuthForms />}
    </div>
  );
}
