import { ServerClock } from './ServerClock'

export type Tab = 'build' | 'orders'

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

export function Header({ tab, onTab, timeZone, cartCount = 0 }: Props) {
  return (
    // Sticky on phones and tablets (the page scrolls there); on desktop only the middle scrolls.
    <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-white">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-1.5 sm:gap-x-3 sm:py-2 sm:flex-nowrap sm:px-6">
        {/* Logo + title = the home button: back to Build, at the top of the page.
            The button sits inside the h1 because a heading may not go inside a button. */}
        <h1 className="min-w-0 flex-1 basis-0 text-sm font-bold tracking-tight sm:flex-initial sm:text-lg">
          <button
            type="button"
            className="flex max-w-full cursor-pointer items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default sm:gap-3"
            disabled={!onTab}
            title={onTab ? 'Go to the home page' : undefined}
            onClick={() => {
              onTab?.('build')
              window.scrollTo({ top: 0 })
            }}
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yolk text-ink shadow-sm sm:h-9 sm:w-9 sm:rounded-xl"
            >
              {/* Food icon: fork and knife */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 sm:h-5 sm:w-5"
              >
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                <path d="M7 2v20" />
                <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
              </svg>
            </span>
            <span className="min-w-0 truncate">Smart Order Builder</span>
          </button>
        </h1>

        {/* Phones: the page tabs get their own full-width row under the title. */}
        {tab && onTab && (
          <nav
            aria-label="Pages"
            className="order-last flex w-full rounded-xl bg-page p-1 sm:order-none sm:ml-4 sm:inline-flex sm:w-auto"
          >
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                className={`flex-1 rounded-lg px-4 py-1 text-sm sm:py-1.5 sm:flex-none font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${tab === id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
                onClick={() => onTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {timeZone && <ServerClock timeZone={timeZone} />}
          {/* Phones and tablets: the cart sits below the menu, so jump to it. */}
          {tab === 'build' && (
            <a
              href="#cart"
              aria-label={`Cart, ${cartCount} items`}
              className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10 border-line bg-white text-ink lg:hidden"
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
