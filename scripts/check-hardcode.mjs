// Guard for the data-driven rule: menu ids, names, promo codes and times must
// live only in src/fixtures and tests, never in the logic folders.
//
// Usage: node scripts/check-hardcode.mjs            (checks the logic folders)
//        node scripts/check-hardcode.mjs <dir> ...  (checks other folders, for a demo)
//
// What counts as a hit (comments are ignored):
//   - any fixture value written as a string literal: 'bacon', "Beef Bacon", `MORNING15`
//   - an id used as a property or key: stock.egg, { egg: 1 }
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const menu = JSON.parse(readFileSync(join(root, 'src/fixtures/menu.json'), 'utf8'))

const LOGIC_DIRS = ['src/engine', 'src/server', 'src/components', 'src/hooks', 'src/assistant']
const dirs = process.argv.length > 2 ? process.argv.slice(2) : LOGIC_DIRS.map((d) => join(root, d))

// ---------- what to look for ----------
const ids = new Set()
const values = new Set() // names, codes, times: only matched as string literals

ids.add(menu.product.id)
values.add(menu.product.name)
values.add(menu.shop.timeZone)
for (const ingredient of menu.ingredients) {
  ids.add(ingredient.id)
  values.add(ingredient.name)
}
for (const group of menu.groups) {
  ids.add(group.id)
  values.add(group.name)
  for (const option of group.options) {
    ids.add(option.id)
    values.add(option.name)
  }
}
for (const rule of menu.rules) ids.add(rule.id)
for (const promo of menu.promotions) {
  ids.add(promo.id)
  if (promo.code) values.add(promo.code)
  if (promo.validBefore) values.add(promo.validBefore)
}
for (const id of ids) values.add(id)

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const checks = [
  ...[...values].map((v) => ({ token: v, re: new RegExp(`(['"\`])${escape(v)}\\1`) })),
  ...[...ids]
    .filter((id) => /^[A-Za-z_$][\w$]*$/.test(id))
    .flatMap((id) => [
      { token: id, re: new RegExp(`\\.${escape(id)}\\b`) }, // stock.egg
      { token: id, re: new RegExp(`[{,]\\s*${escape(id)}\\s*:`) }, // { egg: 1 }
    ]),
]

// ---------- scan ----------
function listFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return listFiles(path)
    if (!/\.(ts|tsx|js|mjs)$/.test(name) || /\.test\./.test(name)) return []
    return [path]
  })
}

// Keeps line numbers: block comments become blank lines.
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ''))
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const hits = []
for (const file of dirs.flatMap(listFiles)) {
  const lines = stripComments(readFileSync(file, 'utf8')).split('\n')
  lines.forEach((line, i) => {
    for (const { token, re } of checks) {
      if (re.test(line)) hits.push(`${relative(root, file)}:${i + 1}  "${token}"  →  ${line.trim()}`)
    }
  })
}

if (hits.length > 0) {
  console.error(`check:hardcode found ${hits.length} fixture value(s) in logic code:\n`)
  for (const hit of hits) console.error('  ' + hit)
  process.exit(1)
}
console.log(`check:hardcode clean (${checks.length} patterns, folders: ${dirs.map((d) => relative(root, d) || d).join(', ')})`)
