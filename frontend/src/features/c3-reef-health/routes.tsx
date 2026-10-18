import type { RouteObject } from 'react-router-dom';
import { ReefDetailPage } from './components/ReefDetailPage';
import { ReefListPage } from './components/ReefListPage';

/** Paths are relative to manifest.route (/c3). AppShell wraps them automatically. */
export const routes: RouteObject[] = [
  { index: true, element: <ReefListPage /> },
  { path: ':reefId', element: <ReefDetailPage /> },
];
