import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem<V extends string> {
  value: V;
  label: string;
  content: ReactNode;
}

export interface TabsProps<V extends string> {
  items: TabItem<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
}

/** Accessible tabs (arrow keys move between tabs). For a value picker use SegmentedControl. */
export function Tabs<V extends string>({ items, value, onChange, label }: TabsProps<V>) {
  const id = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );

  const onKeyDown = (event: KeyboardEvent) => {
    const last = items.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? activeIndex === last
          ? 0
          : activeIndex + 1
        : event.key === 'ArrowLeft'
          ? activeIndex === 0
            ? last
            : activeIndex - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    const item = items[next];
    if (item) onChange(item.value);
    refs.current[next]?.focus();
  };

  const active = items[activeIndex];

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {items.map((item, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={item.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${id}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-bold',
                selected
                  ? 'border-coral text-navy'
                  : 'border-transparent text-muted hover:text-navy',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {active && (
        <div
          role="tabpanel"
          id={`${id}-panel-${active.value}`}
          aria-labelledby={`${id}-tab-${active.value}`}
          tabIndex={0}
          className="pt-4"
        >
          {active.content}
        </div>
      )}
    </div>
  );
}
