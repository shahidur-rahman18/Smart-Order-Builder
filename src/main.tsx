import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Dynamic import puts MSW and the mock server in their own chunk,
// so the main bundle stays under Vite's 500 kB warning limit.
const { worker } = await import('./mock/browser')

// The mock server must be listening before the app makes its first /api call.
// 'bypass': requests we do not mock (the Gemini API) go to the real internet.
await worker.start({ onUnhandledFrame: 'bypass' })

// index.html always has <div id="root">, so this element exists.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
