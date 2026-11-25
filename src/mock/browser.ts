import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// In the browser: a service worker catches /api/* calls and hands them to our handlers.
export const worker = setupWorker(...handlers)
