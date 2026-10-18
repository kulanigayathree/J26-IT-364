import { Compass } from 'lucide-react';
import { ButtonLink, EmptyState, PageHeader } from '@/components/ui';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState
        icon={Compass}
        title="There is no page at this address"
        message="The link may be out of date. Use the navigation or go back to the overview."
        action={<ButtonLink to="/">Go to overview</ButtonLink>}
      />
    </>
  );
}
