/// <reference types="vite/client" />

// Only this variable is read from .env.local (see .env.example).
interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
