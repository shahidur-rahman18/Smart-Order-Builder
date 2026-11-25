export type OptionId = string
export type GroupId = string
export type IngredientId = string
export type Poisha = number // always an integer (1 BDT = 100 poisha)

export interface MenuOption {
  id: OptionId
  name: string
  price: Poisha
  uses: Record<IngredientId, number>
}

export interface Group {
  id: GroupId
  name: string
  min: number
  max?: number
  step?: number
  maxDistinct?: number
  maxPerOption?: number
  options: MenuOption[]
}

export type Rule =
  | { id: string; type: 'requires'; option: OptionId; anyOf: OptionId[] }
  | { id: string; type: 'excludes'; option: OptionId; with: OptionId[] }
  | { id: string; type: 'overrideLimit'; option: OptionId; group: GroupId; max: number }

export type Promotion =
  | { id: string; type: 'cheapestFree'; group: GroupId; every: number }
  | {
      id: string
      type: 'comboPercent'
      percent: number
      conditions: { group: GroupId; minUnits: number }[]
    }
  | { id: string; type: 'cartFixed'; minSubtotal: Poisha; amount: Poisha }
  | {
      id: string
      type: 'couponPercent'
      code: string
      percent: number
      cap: Poisha
      validBefore: string // "HH:mm" in the shop time zone
    }

export interface Menu {
  product: { id: string; name: string; basePrice: Poisha }
  shop: {
    timeZone: string
    currency: string
    vatPercent: number
    reservationTtlSeconds: number
    maxItemQuantity: number
    cartDiscountTieBreak: string[]
  }
  ingredients: { id: IngredientId; name: string }[]
  stock: Record<IngredientId, number>
  groups: Group[]
  rules: Rule[]
  promotions: Promotion[]
}

// Only options with quantity > 0 are stored.
export type Config = Record<OptionId, number>

export interface Violation {
  id: string
  kind: 'min' | 'max' | 'step' | 'maxDistinct' | 'maxPerOption' | 'requires' | 'excludes'
  message: string
}

export interface Shortage {
  ingredient: IngredientId
  name: string
  missing: number
}

export interface CartLineInput {
  id: string
  config: Config
  quantity: number
}
