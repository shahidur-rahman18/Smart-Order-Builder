import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { turnChaosOffForTests } from '../server/chaos'

beforeEach(() => {
  // No random failures unless a test turns them on.
  turnChaosOffForTests()
})

afterEach(() => {
  cleanup()
  // The mock server keeps its state in localStorage; every test starts fresh.
  localStorage.clear()
})
