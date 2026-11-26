import { formatBdt } from '../../engine/money'
import type { PricePreview as Preview } from '../../hooks/usePricePreview'
import { btnDanger, card } from '../ui'

function bdt(poisha: number): string {
  return `BDT ${formatBdt(poisha)}`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-muted">
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
    <section aria-label="Price" className={card}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">Price</h2>
        {status === 'loading' && (
          <span className="animate-pulse rounded-full bg-selected px-2.5 py-0.5 text-xs font-medium text-primary-hover">
            updating…
          </span>
        )}
      </div>

      {status === 'error' && (
        <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <span>{error} Your selection is kept.</span>
          <button type="button" className={btnDanger} onClick={retry}>
            Retry price
          </button>
        </div>
      )}

      {unit && body ? (
        <dl className={`mt-3 space-y-1.5 text-sm transition-opacity ${stale ? 'opacity-50' : ''}`}>
          <Row label="Base" value={bdt(unit.base)} />
          <Row label="Options" value={bdt(unit.optionsTotal)} />
          {unit.cheapestFree.discount > 0 && (
            <Row label={`Extras deal (${unit.cheapestFree.freeUnits} free)`} value={`− ${bdt(unit.cheapestFree.discount)}`} />
          )}
          {unit.combo.applied && <Row label="Combo discount" value={`− ${bdt(unit.combo.discount)}`} />}
          <Row label="Price per item" value={bdt(unit.unitPrice)} />
          <div className="flex items-baseline justify-between gap-4 border-t border-dashed border-line pt-2 text-base font-bold text-ink">
            <dt>Line total</dt>
            <dd className="tabular-nums">
              <output aria-label="Line total">{body.lineTotal === null ? '—' : bdt(body.lineTotal)}</output>
            </dd>
          </div>
        </dl>
      ) : (
        status !== 'error' && <p className="mt-3 text-sm text-muted">Calculating…</p>
      )}
    </section>
  )
}
