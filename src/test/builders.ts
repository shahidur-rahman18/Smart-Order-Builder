import { menu } from '../fixtures'
import type { Config } from '../types/menu'

// Tests read like the brief: configByNames({ Toast: 1, Scrambled: 2 }).
// Names are looked up in the fixture, so ids never appear in test text.
export function configByNames(names: Record<string, number>): Config {
  const config: Config = {}
  for (const [name, qty] of Object.entries(names)) {
    const option = menu.groups
      .flatMap((group) => group.options)
      .find((o) => o.name === name)
    if (!option) {
      throw new Error(`Unknown option name: ${name}`)
    }
    config[option.id] = qty
  }
  return config
}

// SPEC §9 test items.
export function configA(): Config {
  return configByNames({ Toast: 1, Scrambled: 2, 'Chicken Sausage': 1, Ketchup: 1 })
}

export function configB(): Config {
  return configByNames({
    Croissant: 1, Omelette: 2, Fried: 2, 'Chicken Sausage': 1, 'Beef Bacon': 1,
    'Hash Brown': 1, Mushroom: 1, Hollandaise: 1,
  })
}

export function configC(): Config {
  return configByNames({
    Paratha: 1, Fried: 2, Tofu: 1, Cheese: 2, 'Baked Beans': 1, Mushroom: 1, Chili: 1,
  })
}
