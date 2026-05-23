import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ROUTES } from './constants/routes';
import AppLayout from './components/layout/AppLayout';
import { ToastProvider } from './components/ui/Toast';
import { useShortcuts } from './hooks/useShortcuts';

const Home = lazy(() => import('./pages/Home'));
const Optimize = lazy(() => import('./pages/Optimize'));
const Library = lazy(() => import('./pages/Library'));
const PromptDetail = lazy(() => import('./pages/PromptDetail'));
const Compare = lazy(() => import('./pages/Compare'));
const Community = lazy(() => import('./pages/Community'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

function Loading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  useShortcuts();

  return (
    <ToastProvider>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path={ROUTES.OPTIMIZE} element={<Optimize />} />
            <Route path={ROUTES.LIBRARY} element={<Library />} />
            <Route path={ROUTES.PROMPT_DETAIL} element={<PromptDetail />} />
            <Route path={ROUTES.COMPARE} element={<Compare />} />
            <Route path={ROUTES.COMPARE_WITH_ID} element={<Compare />} />
            <Route path={ROUTES.COMMUNITY} element={<Community />} />
            <Route path={ROUTES.SETTINGS} element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
