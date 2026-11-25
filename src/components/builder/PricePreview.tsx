import { formatBdt } from '../../engine/money'
import type { PricePreview as Preview } from '../../hooks/usePricePreview'

function bdt(poisha: number): string {
  return `BDT ${formatBdt(poisha)}`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

// Server price for the current draft. While a new price is on its way, the old
// one stays visible but greyed out, so the user knows it is not final.
export function PricePreview({ preview }: { preview: Preview }) {
  const { status, body, error, retry } = preview
  const unit = body?.breakdown ?? null
  const stale = status !== 'ready'

  return (
    <section aria-label="Price" className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Price</h2>
        {status === 'loading' && <span className="text-sm text-slate-500">updating…</span>}
      </div>

      {status === 'error' && (
        <div role="alert" className="mt-2 flex items-center justify-between gap-2 text-sm text-red-700">
          <span>{error} Your selection is kept.</span>
          <button type="button" className="rounded border border-red-300 px-3 py-1" onClick={retry}>
            Retry price
          </button>
        </div>
      )}

      {unit && body ? (
        <dl className={`mt-2 space-y-1 text-sm ${stale ? 'opacity-50' : ''}`}>
          <Row label="Base" value={bdt(unit.base)} />
          <Row label="Options" value={bdt(unit.optionsTotal)} />
          {unit.cheapestFree.discount > 0 && (
            <Row label={`Extras deal (${unit.cheapestFree.freeUnits} free)`} value={`− ${bdt(unit.cheapestFree.discount)}`} />
          )}
          {unit.combo.applied && <Row label="Combo discount" value={`− ${bdt(unit.combo.discount)}`} />}
          <Row label="Price per item" value={bdt(unit.unitPrice)} />
          <div className="flex justify-between gap-4 border-t border-slate-200 pt-1 font-semibold">
            <dt>Line total</dt>
            <dd className="tabular-nums">
              <output aria-label="Line total">{body.lineTotal === null ? '—' : bdt(body.lineTotal)}</output>
            </dd>
          </div>
        </dl>
      ) : (
        status !== 'error' && <p className="mt-2 text-sm text-slate-500">Calculating…</p>
      )}
    </section>
  )
}
