// Shared Tailwind class sets, so every button, card and input looks the same.
// Colours: only the theme names from index.css (primary, ink, muted, line…) + red for errors.
// Sizes are never mixed on one element (h-10 + h-9 would clash), so small
// variants are separate sets below.

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const buttonBase = `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed ${focusRing}`

const primaryColours =
  'bg-primary text-white shadow-sm hover:bg-primary-hover disabled:bg-line disabled:text-muted disabled:shadow-none'

const secondaryColours = 'border border-ink bg-white text-ink hover:bg-page disabled:opacity-50'

// Lighter look for small buttons inside rows, so a list is not full of dark borders.
const ghostColours = 'border border-line bg-white text-ink hover:bg-page disabled:opacity-50'

// Main action: Add to cart, Save, Pay.
export const btnPrimary = `${buttonBase} h-10 px-4 text-sm ${primaryColours}`

// The one big button at the end of a flow: Pay.
export const btnPrimaryLg = `${buttonBase} h-11 px-5 text-[0.95rem] ${primaryColours}`

// Second action: Apply, Cancel, Download.
export const btnSecondary = `${buttonBase} h-10 px-4 text-sm ${secondaryColours}`

// Compact second action next to a compact input: coupon Apply.
export const btnSecondaryCompact = `${buttonBase} h-9 px-3.5 text-sm ${secondaryColours}`

// Small second action inside a list row: Edit, Remove, dev tools.
export const btnSecondarySm = `${buttonBase} h-9 px-3 text-xs ${ghostColours}`

// Tiny second action in the dev tools footer.
export const btnSecondaryXs = `${buttonBase} h-7 px-2.5 text-xs ${ghostColours}`

// Small Retry/Try again next to an error.
export const btnDanger = `${buttonBase} h-8 border border-red-300 bg-white px-3 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50`

// Text-only red button for a quiet destructive action: Remove.
export const btnLinkDanger = `${buttonBase} h-7 px-2 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50`

// No width here: each place adds its own (w-full, w-20…), so two widths never clash.
export const input = `h-10 rounded-lg border border-muted/40 bg-white px-3 text-sm text-ink ${focusRing}`

// Same, one step shorter: the coupon box in the cart.
export const inputCompact = `h-9 rounded-lg border border-muted/40 bg-white px-3 text-sm text-ink ${focusRing}`
