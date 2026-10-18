import type { RouteObject } from 'react-router-dom';
import { C1Page } from './components/C1Page';

/** Paths are relative to manifest.route (/c1). AppShell wraps them automatically. */
export const routes: RouteObject[] = [{ index: true, element: <C1Page /> }];
