import type { RouteObject } from 'react-router-dom';
import { FisherPage } from './components/FisherPage';
import { ForecastPage } from './components/ForecastPage';

/** Paths are relative to manifest.route (/c2). AppShell wraps them automatically. */
export const routes: RouteObject[] = [
  { index: true, element: <ForecastPage /> },
  { path: 'fisher', element: <FisherPage /> },
];
