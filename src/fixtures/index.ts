import type { Menu } from '../types/menu'
import type { SeedFile } from '../types/seed'
import menuJson from './menu.json'
import seedJson from './orders.seed.json'

// JSON imports widen "requires" to string, so we state the real type once, here.
export const menu: Menu = menuJson as Menu
export const seed: SeedFile = seedJson as SeedFile
