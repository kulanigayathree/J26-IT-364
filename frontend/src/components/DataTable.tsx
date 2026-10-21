import type { ReactNode } from 'react';
import { td, th } from './ui';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** right-align numbers */
  numeric?: boolean;
  /** monospace (IDs, coordinates, scores) */
  mono?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  caption?: string;
  /** table min width before it scrolls sideways (tablet) */
  minWidth?: string;
}

/** Ruled table (tablet/desktop); a list of cards on phones. */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, selectedKey, caption, minWidth = 'min-w-[640px]' }: Props<T>) {
  const clickable = Boolean(onRowClick);
  return (
    <div>
      <div className="hidden overflow-x-auto rounded-[4px] border border-line bg-white md:block">
        <table className={`w-full border-collapse ${minWidth}`}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b border-line bg-sand/50">
            <tr>
              {columns.map((c) => (
                <th key={c.header} scope="col" className={`${th} ${c.numeric ? 'text-right' : ''}`}>
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
                  className={`border-b border-line align-top last:border-0 transition-colors duration-150 ${clickable ? 'cursor-pointer' : ''} ${
                    selected ? 'bg-shallow/20' : clickable ? 'hover:bg-sand/40' : ''
                  }`}
                >
                  {columns.map((c, i) => (
                    <td
                      key={c.header}
                      className={`${td} ${c.numeric ? 'text-right' : ''} ${c.mono ? 'font-mono text-[12.5px]' : ''} ${selected && i === 0 ? 'font-medium' : ''}`}
                    >
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
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {columns.map((c) => (
                <div key={c.header} className="min-w-0">
                  <dt className="font-mono text-[10.5px] text-muted">{c.header}</dt>
                  <dd className={`break-words text-[13.5px] text-ink/85 ${c.mono ? 'font-mono text-[12.5px]' : ''}`}>{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          );
          return (
            <li key={key} className={`rounded-[4px] border bg-white ${selected ? 'border-deep' : 'border-line'}`}>
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
