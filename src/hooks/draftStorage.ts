import type { Config, Menu } from '../types/menu'

// Part G: the unfinished new item lives in the browser only (not on the server),
// so a refresh does not throw away what the user was building.
export const DRAFT_KEY = 'sob:draft'

export interface SavedDraft {
  config: Config
  quantity: number
}

function isWholeNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

// Only a draft that still fits THIS menu comes back: every option id exists and
// every number is a whole number in range. Anything else is thrown away, so an
// old draft can never put the builder into a state the UI cannot show.
function parseDraft(text: string, menu: Menu): SavedDraft | null {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  if (!('config' in value) || !('quantity' in value)) return null
  const { config, quantity } = value
  if (!isWholeNumber(quantity, 1, menu.shop.maxItemQuantity)) return null
  if (typeof config !== 'object' || config === null || Array.isArray(config)) return null

  const optionIds = new Set(menu.groups.flatMap((group) => group.options.map((option) => option.id)))
  const clean: Config = {}
  for (const [optionId, qty] of Object.entries(config)) {
    if (!optionIds.has(optionId) || !isWholeNumber(qty, 1, Number.MAX_SAFE_INTEGER)) return null
    clean[optionId] = qty
  }
  return { config: clean, quantity }
}

export function loadDraft(menu: Menu): SavedDraft | null {
  const text = localStorage.getItem(DRAFT_KEY)
  if (text === null) return null
  const draft = parseDraft(text, menu)
  if (draft === null) clearDraft() // a broken or old draft would only fail again
  return draft
}

// An empty builder needs nothing saved.
export function saveDraft(draft: SavedDraft): void {
  if (Object.keys(draft.config).length === 0 && draft.quantity === 1) clearDraft()
  else localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY)
}
