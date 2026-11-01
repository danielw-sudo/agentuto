import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

type Engine = typeof import('../../search/siteSearch');

interface Loaded {
  index: ReturnType<Engine['buildSearchIndex']>;
  search: Engine['search'];
}

const KIND_LABEL = { course: 'Course', instrument: 'Instrument', page: 'Page' } as const;

/**
 * The search box in the page header. The index (every instrument's equation and guide text) is fetched the
 * first time the box is used, so it costs nothing on the first visit. Press `/` anywhere on a page to
 * start typing; arrows move, Enter opens, Escape closes.
 */
export const SiteSearch: React.FC = () => {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<Loaded | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const loading = useRef(false);

  const load = useCallback(() => {
    if (loading.current) return;
    loading.current = true;
    setFailed(false);
    import('../../search/siteSearch')
      .then((m) => setEngine({ index: m.buildSearchIndex(), search: m.search }))
      .catch(() => {
        // Let the next focus try again instead of leaving the box on "Searching…" for good.
        loading.current = false;
        setFailed(true);
      });
  }, []);

  const results = useMemo(() => (engine && query.trim() ? engine.search(engine.index, query) : []), [engine, query]);
  const asking = query.trim().length > 0;

  useEffect(() => setActive(0), [query]);

  // "/" jumps to the box from anywhere on the page, unless the learner is already typing in a field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    window.location.hash = href;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter') {
      const hit = results[active];
      if (hit) {
        event.preventDefault();
        go(hit.entry.href);
      }
    } else if (event.key === 'Escape') {
      if (query) setQuery('');
      else inputRef.current?.blur();
      setOpen(false);
    }
  };

  const showPanel = open && asking;
  const optionId = (i: number) => `${listId}-option-${i}`;

  return (
    <div
      ref={boxRef}
      className="relative w-full"
      onBlur={(event) => {
        if (!boxRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <label className="flex min-h-11 items-center gap-2.5 rounded-[10px] border border-line bg-card px-3.5 focus-within:border-accent">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0 text-muted" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="sr-only">Search courses, instruments and equations</span>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && results.length ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder="Search courses, instruments, equations"
          onFocus={() => {
            load();
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 appearance-none border-0 bg-transparent py-2 text-[15px] text-ink placeholder:text-muted focus:outline-none"
        />
        <kbd className="hidden rounded-md border border-line px-1.5 font-mono text-[13px] text-muted sm:inline" aria-hidden="true">/</kbd>
      </label>

      <div role="status" aria-live="polite" className="sr-only">
        {showPanel && engine ? `${results.length} result${results.length === 1 ? '' : 's'}` : ''}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-card p-1.5 shadow-xl sm:left-auto sm:w-[28rem]">
          {!engine ? (
            <p className="px-3 py-3 text-sm text-muted">
              {failed ? 'Search could not load. Check your connection, then click the box again.' : 'Searching…'}
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">
              No results for &ldquo;{query.trim()}&rdquo;. Try a topic, an equation, or a course code such as 8.02.
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Search results" className="m-0 list-none p-0">
              {results.map((result, i) => (
                <li
                  key={result.entry.href}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => go(result.entry.href)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex min-h-11 cursor-pointer flex-col gap-0.5 rounded-lg px-3 py-2.5 ${
                    i === active ? 'bg-accent-soft' : ''
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-medium text-ink">{result.entry.title}</span>
                    <span className="shrink-0 font-mono text-[13px] text-muted">{KIND_LABEL[result.entry.kind]}{result.entry.local ? ' · local' : ''}</span>
                  </span>
                  <span className="truncate font-mono text-[13px] text-muted">{result.entry.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
