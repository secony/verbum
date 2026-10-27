import { NavLink, Outlet, Link } from 'react-router-dom';
import { BookOpen, Compass, Heart, Home, Landmark, Moon, Sun, User } from 'lucide-react';
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
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface/60 p-5 md:flex">
        <Link to="/" className="mb-8 px-2 font-serif text-3xl tracking-tight">Verbum</Link>
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors', isActive ? 'bg-soft font-medium text-olive' : 'text-muted hover:bg-soft hover:text-fg')}>
              <Icon className="h-[18px] w-[18px]" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between px-1">
          <Link to="/sobre" className="text-xs text-muted hover:text-fg">Sobre o texto</Link>
          <ThemeButton />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/90 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur md:hidden">
          <Link to="/" className="font-serif text-2xl">Verbum</Link>
          <ThemeButton />
        </header>
        <main className="mx-auto w-full max-w-4xl px-4 pb-32 pt-6 md:px-10 md:pb-16 md:pt-12">
          <Outlet />
        </main>
      </div>

      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[0.65rem]', isActive ? 'text-olive' : 'text-muted')}>
            <Icon className="h-5 w-5" aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
