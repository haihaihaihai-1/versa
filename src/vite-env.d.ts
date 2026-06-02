/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MIMO_API_KEY: string
  readonly VITE_MIMO_BASE_URL: string
  readonly VITE_MIMO_MODEL: string
  readonly VITE_MIMO_ENABLED: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
