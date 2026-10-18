import type { RouteObject } from 'react-router-dom';
import { SpillDetailPage } from './components/SpillDetailPage';
import { SpillListPage } from './components/SpillListPage';

/** Paths are relative to manifest.route (/c4). AppShell wraps them automatically. */
export const routes: RouteObject[] = [
  { index: true, element: <SpillListPage /> },
  { path: ':spillId', element: <SpillDetailPage /> },
];
