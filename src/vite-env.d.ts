/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Analytics 4 measurement ID (G-…); analytics is off without one. */
  readonly VITE_GA_ID?: string
  /** Where the feedback form posts (infra/feedback's function URL); the Feedback link is hidden without one. */
  readonly VITE_FEEDBACK_URL?: string
}

/** The app's version, from package.json (vite.config.ts). */
declare const __APP_VERSION__: string
