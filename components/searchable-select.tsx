import { useEffect, useMemo, useRef, useState } from 'react'

export interface SelectOption {
  value: string
  label: string
  /** Secondary text, right-aligned — ward number, corporation, a count. */
  hint?: string
  /** Optional section heading. Consecutive options sharing one are grouped under it. */
  group?: string
  /** Lowercased haystack every query token has to appear in. */
  search: string
}

/**
 * A combobox for lists a native <select> cannot carry usefully — the ward list
 * is 369 entries with no way to type at it. Type to narrow, arrow keys to
 * move, Enter to choose, Escape to dismiss.
 *
 * Options are supplied ready-built so each caller decides its own labels,
 * hints and search terms; see ward-select.tsx and scope-select.tsx.
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  id,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  id: string
  /** Trigger text when nothing is selected yet. */
  placeholder?: string
  searchPlaceholder?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!tokens.length) return options
    return options.filter(option => tokens.every(token => option.search.includes(token)))
  }, [options, query])

  const selected = options.find(option => option.value === value)

  // Opening starts from a clean query, with the current choice highlighted.
  useEffect(() => {
    if (!open) return
    setQuery('')
    const index = options.findIndex(option => option.value === value)
    setActiveIndex(index >= 0 ? index : 0)
    inputRef.current?.focus()
  }, [open, options, value])

  // Filtering can strip the highlighted row out from under the cursor.
  useEffect(() => {
    setActiveIndex(current => (current >= filtered.length ? 0 : current))
  }, [filtered])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Keep the highlighted row inside the scroll box while arrowing through it.
  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const choose = (option: SelectOption) => {
    onChange(option.value)
    setOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!filtered.length) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex(current => (current + step + filtered.length) % filtered.length)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const option = filtered[activeIndex]
      if (option) choose(option)
    }
  }

  let lastGroup: string | undefined

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="w-full flex items-center justify-between gap-2 border border-ink-300 bg-white px-3 py-2 text-left duration-200 transition-colors hover:border-ink-400 focus:outline-none focus:border-black"
      >
        <span className={`truncate ${selected ? '' : 'text-ink-500'}`}>
          {selected?.label ?? placeholder}
        </span>
        <span className="flex items-baseline gap-2 shrink-0">
          {selected?.hint && (
            <span className="hidden sm:inline text-xs text-ink-500">{selected.hint}</span>
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className={`text-ink-400 duration-200 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </span>
      </button>

      {open && (
        // z-index has to clear Leaflet's panes (max 700) and controls (1000) —
        // /profile opens this directly above an embedded picker map — while
        // staying under the sticky navbar at 1100.
        <div className="absolute z-[1050] mt-1 w-full min-w-[16rem] border border-black bg-white shadow-lg">
          <div className="border-b border-ink-200 p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              role="combobox"
              aria-expanded
              aria-autocomplete="list"
              aria-controls={`${id}-listbox`}
              aria-activedescendant={filtered[activeIndex] ? `${id}-opt-${activeIndex}` : undefined}
              className="w-full border border-ink-300 px-2 py-1.5 text-sm focus:outline-none focus:border-black"
            />
          </div>

          <ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-72 overflow-y-auto py-1"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-ink-500">
                Nothing matches “{query}”.
              </li>
            )}

            {filtered.map((option, index) => {
              const header = option.group && option.group !== lastGroup ? option.group : null
              lastGroup = option.group
              const isActive = index === activeIndex
              const isSelected = option.value === value

              return (
                // role="presentation" so the listbox's only children in the
                // accessibility tree are the options themselves.
                <li key={option.value} role="presentation">
                  {header && (
                    <p className="sticky top-0 bg-white px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
                      {header}
                    </p>
                  )}
                  <button
                    type="button"
                    role="option"
                    id={`${id}-opt-${index}`}
                    tabIndex={-1}
                    aria-selected={isSelected}
                    data-active={isActive}
                    onClick={() => choose(option)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full flex items-baseline justify-between gap-3 px-3 py-2 text-left text-sm duration-100 transition-colors ${
                      isActive ? 'bg-ink-100' : ''
                    }`}
                  >
                    <span className={`truncate ${isSelected ? 'font-bold' : ''}`}>
                      {option.label}
                    </span>
                    {option.hint && (
                      <span className="shrink-0 text-xs text-ink-500 truncate max-w-[45%]">
                        {option.hint}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
