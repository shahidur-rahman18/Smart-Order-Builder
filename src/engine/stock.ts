import type { CartLineInput, Config, IngredientId, Menu, OptionId, Shortage } from '../types/menu'
import { buildMenuIndex } from './menuIndex'

// How many units of each ingredient something needs, e.g. { egg: 6, cheese: 2 }.
export type Usage = Record<IngredientId, number>

// Anything that holds stock: a cart item (reserved) or an order line (sold).
export type StockLine = Pick<CartLineInput, 'config' | 'quantity'>

// Ingredients needed for `quantity` items built from `config`.
// Throws for an option id the menu does not know (validate() reports it first).
export function usageOf(config: Config, menu: Menu, quantity: number): Usage {
  const { optionById } = buildMenuIndex(menu)
  const usage: Usage = {}
  for (const [optionId, optionQty] of Object.entries(config)) {
    const option = optionById.get(optionId)
    if (!option) throw new Error(`Unknown option id: ${optionId}`)
    for (const [ingredient, perUnit] of Object.entries(option.uses)) {
      usage[ingredient] = (usage[ingredient] ?? 0) + perUnit * optionQty * quantity
    }
  }
  return usage
}

export function sumUsage(a: Usage, b: Usage): Usage {
  const result: Usage = { ...a }
  for (const [ingredient, amount] of Object.entries(b)) {
    result[ingredient] = (result[ingredient] ?? 0) + amount
  }
  return result
}

export function subtractUsage(a: Usage, b: Usage): Usage {
  const result: Usage = { ...a }
  for (const [ingredient, amount] of Object.entries(b)) {
    result[ingredient] = (result[ingredient] ?? 0) - amount
  }
  return result
}

function usageOfLines(lines: StockLine[], menu: Menu): Usage {
  return lines.reduce<Usage>((total, line) => sumUsage(total, usageOf(line.config, menu, line.quantity)), {})
}

// available = fixture stock − sold − reserved. Never stored, always computed.
// The caller passes only live order lines (not seed) and only active,
// non-expired cart items.
export function availableStock(menu: Menu, soldLines: StockLine[], reservedLines: StockLine[]): Usage {
  const used = sumUsage(usageOfLines(soldLines, menu), usageOfLines(reservedLines, menu))
  const available: Usage = {}
  for (const { id } of menu.ingredients) {
    // Clamp at 0: a negative number would mean we already sold more than we had;
    // for "can I add more?" that is the same answer as 0.
    available[id] = Math.max(0, (menu.stock[id] ?? 0) - (used[id] ?? 0))
  }
  return available
}

// Net difference for an edit: the item's own allocation counts as available to
// itself. We add back exactly what this item holds, never more.
// `available` must be computed while the item is still reserved.
export function availableForEdit(available: Usage, oldItem: StockLine, menu: Menu): Usage {
  return sumUsage(available, usageOf(oldItem.config, menu, oldItem.quantity))
}

// Every ingredient that is short, in fixture order, with the exact missing amount.
export function shortagesFor(need: Usage, available: Usage, menu: Menu): Shortage[] {
  const shortages: Shortage[] = []
  for (const { id, name } of menu.ingredients) {
    const missing = (need[id] ?? 0) - (available[id] ?? 0)
    if (missing > 0) shortages.push({ ingredient: id, name, missing })
  }
  return shortages
}

// "Short: 2 egg, 2 cheese". Empty string when nothing is short.
export function formatShortages(shortages: Shortage[]): string {
  if (shortages.length === 0) return ''
  return 'Short: ' + shortages.map((s) => `${s.missing} ${s.name}`).join(', ')
}

// For each option: how many more units can be added to the draft right now
// (stock only; group limits are validate()'s job). 'unlimited' = uses nothing.
export function optionHeadroom(
  menu: Menu,
  available: Usage,
  draft: Config,
  quantity: number,
): Record<OptionId, number | 'unlimited'> {
  const left = subtractUsage(available, usageOf(draft, menu, quantity))
  const headroom: Record<OptionId, number | 'unlimited'> = {}

  for (const option of menu.groups.flatMap((group) => group.options)) {
    let most: number | 'unlimited' = 'unlimited'
    for (const [ingredient, perUnit] of Object.entries(option.uses)) {
      if (perUnit <= 0) continue
      // One more unit of this option costs perUnit × quantity of this ingredient.
      const fits = Math.max(0, Math.floor((left[ingredient] ?? 0) / (perUnit * quantity)))
      most = most === 'unlimited' ? fits : Math.min(most, fits)
    }
    headroom[option.id] = most
  }
  return headroom
}
