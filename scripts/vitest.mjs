// Runs Vitest from this project's folder with an upper-case drive letter.
//
// Why: VS Code's terminal on Windows opens the folder as "e:\..." but Vite resolves
// our imports as "E:\...". Node treats those as two different files, so Vitest gets
// loaded twice and hooks like afterEach() in src/test/setup.ts crash.
// On macOS/Linux the path has no drive letter and nothing changes.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('..', import.meta.url)).replace(/^[a-z]:/, (drive) =>
  drive.toUpperCase(),
)
const vitestCli = 'node_modules/vitest/vitest.mjs'

const result = spawnSync(process.execPath, [vitestCli, ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
