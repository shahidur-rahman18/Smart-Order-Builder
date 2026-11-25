import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// In tests (Node): the same handlers, without a service worker.
export const server = setupServer(...handlers)
