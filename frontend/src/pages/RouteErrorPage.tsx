import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { ErrorState, PageHeader } from '@/components/ui';

/** Shown inside the app shell when a page crashes while rendering. */
export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';
  return (
    <>
      <PageHeader title="Something went wrong" />
      <ErrorState
        title="This page could not be shown"
        error={message}
        onRetry={() => window.location.reload()}
      />
    </>
  );
}
