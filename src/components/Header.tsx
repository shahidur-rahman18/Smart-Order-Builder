import { ServerClock } from './ServerClock'

export type Tab = 'build' | 'orders' | 'assistant'

const TABS: { id: Tab; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'orders', label: 'Orders' },
]

interface Props {
  // Missing while the menu is still loading: only the logo and title show.
  tab?: Tab
  onTab?: (tab: Tab) => void
  timeZone?: string
  cartCount?: number
}

const iconButton =
  'relative inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-ink px-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function Header({ tab, onTab, timeZone, cartCount = 0 }: Props) {
  return (
    <header className="shrink-0 border-b border-line bg-white">
      <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-2 sm:px-6">
        <span aria-hidden="true" className="h-9 w-9 shrink-0 rounded-xl bg-yolk shadow-sm" />
        <h1 className="sr-only text-lg font-bold tracking-tight sm:not-sr-only">Smart Order Builder</h1>

        {tab && onTab && (
          <nav aria-label="Pages" className="inline-flex rounded-xl bg-page p-1 sm:ml-4">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${tab === id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
                onClick={() => onTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {timeZone && <ServerClock timeZone={timeZone} />}
          {/* Opens the Assistant page (Part F). Disabled only while the menu is loading. */}
          <button
            type="button"
            aria-label="Sales assistant"
            aria-pressed={tab === 'assistant'}
            className={`${iconButton} disabled:opacity-50 ${tab === 'assistant' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            disabled={!onTab}
            title={onTab ? undefined : 'Loading menu…'}
            onClick={() => onTab?.('assistant')}
          >
            <span aria-hidden="true">✦</span>
            <span className="hidden sm:inline">Sales assistant</span>
          </button>
          {/* Phones and tablets: the cart sits below the menu, so jump to it. */}
          {tab === 'build' && (
          <a
            href="#cart"
            aria-label={`Cart, ${cartCount} items`}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink lg:hidden"
          >
            <span aria-hidden="true">🛒</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </a>
          )}
        </div>
      </div>
    </header>
  )
}
