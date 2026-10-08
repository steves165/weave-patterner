/**
 * Google Analytics (GA4), only with the visitor's consent. Nothing is loaded and nothing is sent until they agree;
 * without a measurement ID configured (VITE_GA_ID at build time) analytics is off entirely and never asks.
 */

export type Consent = 'granted' | 'denied'

const KEY = 'weave-analytics-consent'

/** The measurement ID this build was made with, or null for none. */
export const GA_ID: string | null = /^G-[A-Z0-9]+$/.test(import.meta.env.VITE_GA_ID ?? '')
  ? (import.meta.env.VITE_GA_ID as string)
  : null

/** The visitor's choice, or null if they haven't made one. */
export function loadConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

export function saveConsent(consent: Consent | null) {
  try {
    if (consent) localStorage.setItem(KEY, consent)
    else localStorage.removeItem(KEY)
  } catch {
    // the choice just won't be remembered
  }
}

type Gtag = (...args: unknown[]) => void
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

let started = false

/** Loads Google Analytics and sends the page view. Only call once the visitor has agreed. */
export function startAnalytics(id = GA_ID) {
  if (started || !id || typeof document === 'undefined') return
  started = true
  window.dataLayer = window.dataLayer ?? []
  window.gtag = function gtag() {
    // biome-ignore lint/complexity/noArguments: gtag expects the arguments object itself, as Google's snippet does
    window.dataLayer?.push(arguments)
  }
  window.gtag('js', new Date())
  // No ad features, and IP addresses anonymised.
  window.gtag('config', id, { allow_google_signals: false, allow_ad_personalization_signals: false })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)
}

/** Whether analytics has been started this visit. */
export const analyticsStarted = () => started

/**
 * Records that a feature was used: which tool was opened, what was exported and so on. Never the pattern itself.
 * Does nothing unless the visitor agreed and analytics has started.
 */
export function track(event: string, params: Record<string, string | number | boolean> = {}) {
  if (!started) return
  window.gtag?.('event', event, params)
}

/** For tests: forget that analytics started. */
export function resetAnalyticsForTests() {
  started = false
}

/** Stops sending anything after the visitor withdraws consent, and removes Google Analytics' cookies. */
export function stopAnalytics() {
  if (started) window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
  started = false
  if (typeof document === 'undefined') return
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim()
    // github.io is a shared (public suffix) domain, so Google Analytics' cookies are on the full host name.
    if (name !== '_ga' && !name.startsWith('_ga_')) continue
    for (const domain of ['', `; domain=${location.hostname}`]) {
      // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API isn't in every browser this runs in
      document.cookie = `${name}=; Max-Age=0; path=/${domain}`
    }
  }
}
