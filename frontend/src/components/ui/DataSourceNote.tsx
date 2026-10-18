import { CloudOff, Database, FlaskConical } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import type { AsyncState } from '@/lib/useAsync';
import { Badge } from './Badge';

/** Tells the reader whether they see live API data, a saved copy, or sample data. */
export function DataSourceNote({ state }: { state: AsyncState<unknown> }) {
  if (state.status !== 'success') return null;
  if (state.source === 'mock') {
    return (
      <Badge tone="warning" icon={FlaskConical}>
        Sample data
      </Badge>
    );
  }
  if (state.source === 'cache') {
    return (
      <Badge tone="warning" icon={CloudOff}>
        Saved copy · {formatDateTime(state.fetchedAt)}
      </Badge>
    );
  }
  return (
    <Badge tone="info" icon={Database}>
      Live · {formatDateTime(state.fetchedAt)}
    </Badge>
  );
}
