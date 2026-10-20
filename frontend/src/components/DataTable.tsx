import type { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** right-align numbers */
  numeric?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  caption?: string;
}

/** Ruled table on tablet/desktop; a list of cards on phones. */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, selectedKey, caption }: Props<T>) {
  const clickable = Boolean(onRowClick);
  return (
    <div>
      <div className="hidden overflow-x-auto rounded border border-line md:block">
        <table className="w-full border-collapse bg-paper text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-paper-2 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.header} scope="col" className={`border-b border-line px-3 py-2 ${c.numeric ? 'text-right' : ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = rowKey(row);
              const selected = key === selectedKey;
              return (
                <tr
                  key={key}
                  onClick={clickable ? () => onRowClick!(row) : undefined}
                  onKeyDown={clickable ? (e) => e.key === 'Enter' && onRowClick!(row) : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  aria-selected={clickable ? selected : undefined}
                  className={`border-b border-line last:border-b-0 ${clickable ? 'cursor-pointer hover:bg-paper-2' : ''} ${selected ? 'bg-paper-2 font-bold' : ''}`}
                >
                  {columns.map((c) => (
                    <td key={c.header} className={`px-3 py-2 align-top ${c.numeric ? 'text-right tabular-nums' : ''}`}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden" aria-label={caption}>
        {rows.map((row) => {
          const key = rowKey(row);
          const selected = key === selectedKey;
          const content = (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {columns.map((c) => (
                <div key={c.header} className="min-w-0">
                  <dt className="text-xs text-muted">{c.header}</dt>
                  <dd className="break-words">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          );
          return (
            <li
              key={key}
              className={`rounded border bg-paper ${selected ? 'border-l-4 border-navy' : 'border-line'}`}
            >
              {clickable ? (
                <button type="button" onClick={() => onRowClick!(row)} className="block w-full p-4 text-left">
                  {content}
                </button>
              ) : (
                <div className="p-4">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
