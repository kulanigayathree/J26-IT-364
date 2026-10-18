import { createBrowserRouter } from 'react-router-dom';
import { features } from '@/features/registry';
import { AppShell } from '@/layout';
import { AboutPage } from '@/pages/AboutPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
import { StyleguidePage } from '@/pages/StyleguidePage';
import { navigation } from './navigation';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppShell nav={navigation} />,
      children: [
        {
          // Errors thrown while rendering a page stay inside the shell.
          errorElement: <RouteErrorPage />,
          children: [
            { index: true, element: <OverviewPage /> },
            ...features.map(({ manifest, routes }) => ({
              path: manifest.route.replace(/^\//, ''),
              children: routes,
            })),
            { path: 'about', element: <AboutPage /> },
            { path: 'styleguide', element: <StyleguidePage /> },
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ],
  {
    future: {
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_relativeSplatPath: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);
