import { Builder } from './components/builder/Builder'
import { useMenu } from './hooks/useMenu'

function App() {
  const { menu, error, reload } = useMenu()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-semibold sm:text-2xl">Smart Order Builder</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {error && (
          <div role="alert" className="flex items-center gap-3 text-red-700">
            <span>{error}</span>
            <button type="button" className="rounded border border-red-300 px-3 py-1" onClick={reload}>
              Try again
            </button>
          </div>
        )}
        {!menu && !error && <p className="text-slate-500">Loading menu…</p>}
        {/* Cart panel joins this grid in Step 10. */}
        {menu && (
          <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
            <Builder menu={menu} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
