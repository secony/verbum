import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import Home from './pages/Home';

const BibleIndex = lazy(() => import('./pages/BibleIndex'));
const Chapter = lazy(() => import('./pages/Chapter'));
const Explore = lazy(() => import('./pages/Explore'));
const Library = lazy(() => import('./pages/Library'));
const Profile = lazy(() => import('./pages/Profile'));
const Walk = lazy(() => import('./pages/Walk'));
const Catholic = lazy(() => import('./pages/Catholic'));
const About = lazy(() => import('./pages/About'));
const NotFound = lazy(() => import('./pages/NotFound'));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollTop />
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="biblia" element={<BibleIndex />} />
            <Route path="biblia/:livro/:capitulo" element={<Chapter />} />
            <Route path="explorar" element={<Explore />} />
            <Route path="favoritos" element={<Library />} />
            <Route path="perfil" element={<Profile />} />
            <Route path="caminhada" element={<Walk />} />
            <Route path="catolica" element={<Catholic />} />
            <Route path="sobre" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
