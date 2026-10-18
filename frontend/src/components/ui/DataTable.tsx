import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Makes the column sortable. Return null for "no value" (sorted last). */
  sortValue?: (row: T) => string | number | null;
  align?: 'left' | 'right';
  /** Leave this column out of the mobile card. */
  hideOnMobile?: boolean;
}

type SortDirection = 'asc' | 'desc';

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Describes the table for screen readers (visually hidden). */
  caption: string;
  /** Makes rows selectable. The first column becomes a button. */
  onRowClick?: (row: T) => void;
  selectedId?: string | null;
  initialSort?: { key: string; direction: SortDirection };
  /** Shown when `rows` is empty. Wrap in AsyncView for a full EmptyState. */
  emptyMessage?: string;
}

/** Ruled, sortable table on md+ screens; a stack of cards on phones. */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  onRowClick,
  selectedId,
  initialSort,
  emptyMessage = 'No rows to show.',
}: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    const column = sort && columns.find((c) => c.key === sort.key);
    if (!sort || !column?.sortValue) return rows;
    const get = column.sortValue;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * factor;
    });
  }, [rows, columns, sort]);

  const toggleSort = (key: string) =>
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' },
    );

  if (rows.length === 0) {
    return (
      <p className="rounded border border-line bg-paper p-4 text-sm text-muted">{emptyMessage}</p>
    );
  }

  const [first, ...rest] = columns;

  return (
    <div className="min-w-0">
      {/* Desktop / tablet: ruled table */}
      <div className="hidden overflow-x-auto rounded border border-line md:block">
        <table className="w-full border-collapse bg-paper text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-paper-2">
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key;
                const SortIcon = !active
                  ? ArrowUpDown
                  : sort.direction === 'asc'
                    ? ArrowUp
                    : ArrowDown;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      'border-b border-line px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted',
                      column.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn(
                          'inline-flex items-center gap-1 uppercase hover:text-navy',
                          active && 'text-navy',
                        )}
                      >
                        {column.header}
                        <SortIcon aria-hidden className="h-3 w-3" />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const id = getRowId(row);
              const selected = selectedId === id;
              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-line last:border-b-0',
                    onRowClick && 'cursor-pointer hover:bg-paper-2',
                    selected && 'bg-paper-2',
                  )}
                >
                  {columns.map((column, index) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-3 py-2 align-top',
                        column.align === 'right' && 'text-right tabular-nums',
                        selected && index === 0 && 'border-l-4 border-l-coral',
                      )}
                    >
                      {index === 0 && onRowClick ? (
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={(event) => {
                            event.stopPropagation();
                            onRowClick(row);
                          }}
                          className="text-left font-bold text-sea hover:underline"
                        >
                          {column.cell(row)}
                        </button>
                      ) : (
                        column.cell(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phone: one card per row */}
      <ul className="flex flex-col gap-3 md:hidden" aria-label={caption}>
        {sorted.map((row) => {
          const id = getRowId(row);
          const selected = selectedId === id;
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 font-bold text-navy">{first?.cell(row)}</div>
                {onRowClick && <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-muted" />}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {rest
                  .filter((column) => !column.hideOnMobile)
                  .map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-xs text-muted">{column.header}</dt>
                      <dd className="break-words">{column.cell(row)}</dd>
                    </div>
                  ))}
              </dl>
            </>
          );
          return (
            <li
              key={id}
              className={cn(
                'rounded border border-line bg-paper',
                selected && 'border-l-4 border-l-coral bg-paper-2',
              )}
            >
              {onRowClick ? (
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onRowClick(row)}
                  className="block w-full p-4 text-left"
                >
                  {body}
                </button>
              ) : (
                <div className="p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
