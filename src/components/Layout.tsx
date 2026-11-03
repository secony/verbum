import { NavLink, Outlet, Link } from 'react-router-dom';
import { BookOpen, Compass, Footprints, Heart, Home, Landmark, Moon, Sun, User } from 'lucide-react';
import { usePrefs } from '../lib/prefs';
import { cn } from '../lib/utils';

const NAV = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/biblia', label: 'Bíblia', icon: BookOpen },
  { to: '/explorar', label: 'Explorar', icon: Compass },
  { to: '/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/catolica', label: 'Católica', icon: Landmark },
  { to: '/perfil', label: 'Perfil', icon: User },
];

function ThemeButton() {
  const { theme, setTheme } = usePrefs();
  const dark = theme === 'dark' || (theme === 'system' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);
  return (
    <button className="icon-btn" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}>
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

export function Layout() {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[14rem_1fr] xl:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line/80 bg-surface/55 px-4 py-6 lg:px-5 md:flex">
        <Link to="/" className="mb-9 px-2 font-serif text-[1.8rem] leading-none tracking-tight">Verbum<span className="text-gold">.</span><span className="mt-2 block font-sans text-[0.65rem] font-medium uppercase tracking-[0.13em] text-muted">Bíblia e vida católica</span></Link>
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.84rem] transition-colors', isActive ? 'bg-soft font-medium text-olive' : 'text-muted hover:bg-soft hover:text-fg')}>
              <Icon className="h-[18px] w-[18px]" aria-hidden /> {label}
            </NavLink>
          ))}
          <div className="mt-4 border-t border-line/70 pt-4">
            <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Sua rotina</p>
            <NavLink to="/caminhada" className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.84rem] transition-colors', isActive ? 'bg-soft font-medium text-olive' : 'text-muted hover:bg-soft hover:text-fg')}>
              <Footprints className="h-[18px] w-[18px]" aria-hidden /> Minha caminhada
            </NavLink>
          </div>
        </nav>
        <div className="flex items-center justify-between px-1">
          <Link to="/sobre" className="text-xs text-muted hover:text-fg">Sobre o texto</Link>
          <ThemeButton />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line/80 bg-bg/95 px-4 pb-2 pt-[calc(0.55rem+env(safe-area-inset-top))] backdrop-blur md:hidden">
          <Link to="/" className="font-serif text-[1.65rem] leading-none">Verbum<span className="text-gold">.</span></Link>
          <ThemeButton />
        </header>
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">Pular para o conteúdo</a>
        <main id="conteudo" className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6 sm:px-6 md:px-10 md:pb-16 md:pt-10 lg:pt-12">
          <Outlet />
        </main>
      </div>

      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line/80 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cn('flex min-h-[3.55rem] flex-col items-center justify-center gap-1 px-0.5 py-1.5 text-[0.62rem] leading-tight transition-colors', isActive ? 'font-semibold text-olive' : 'text-muted')}>
            <Icon className="h-5 w-5" aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
