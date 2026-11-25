import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
import { latency } from '../mock/handlers'
import { server } from '../mock/node'
import { turnChaosOffForTests } from '../server/chaos'

// findBy…/waitFor wait 1 s by default. The full App loads menu → cart → stock
// one after another, and with every test file running in parallel that can take longer.
configure({ asyncUtilTimeout: 3000 })

beforeAll(() => {
  // Same handlers as the browser. Any /api call we forgot to mock fails loudly.
  latency.enabled = false
  server.listen({ onUnhandledFrame: 'error' })
})

beforeEach(() => {
  // No random failures unless a test turns them on.
  turnChaosOffForTests()
})

afterEach(() => {
  cleanup()
  // A test may add its own handler (server.use) — remove it for the next test.
  server.resetHandlers()
  // The mock server keeps its state in localStorage; every test starts fresh.
  localStorage.clear()
})

afterAll(() => {
  server.close()
})
