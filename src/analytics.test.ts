import { beforeEach, describe, expect, it } from 'vitest'
import { analyticsStarted, loadConsent, resetAnalyticsForTests, saveConsent, startAnalytics, track } from './analytics'

const store = new Map<string, string>()
const head: unknown[] = []

beforeEach(() => {
  store.clear()
  head.length = 0
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as Storage
  globalThis.window = globalThis as unknown as Window & typeof globalThis
  globalThis.document = {
    createElement: () => ({}),
    head: { appendChild: (el: unknown) => head.push(el) },
  } as unknown as Document
  globalThis.location = {
    origin: 'https://example.org',
    pathname: '/weave-patterner/',
    search: '?pattern=secret',
  } as Location
  window.dataLayer = undefined
  window.gtag = undefined
  resetAnalyticsForTests()
})

describe('analytics consent', () => {
  it('remembers the choice, and can forget it', () => {
    expect(loadConsent()).toBeNull()
    saveConsent('granted')
    expect(loadConsent()).toBe('granted')
    saveConsent('denied')
    expect(loadConsent()).toBe('denied')
    saveConsent(null)
    expect(loadConsent()).toBeNull()
    store.set('weave-analytics-consent', 'maybe')
    expect(loadConsent()).toBeNull()
  })
})

describe('analytics', () => {
  it('sends nothing until started', () => {
    track('export', { format: 'wif' })
    expect(window.dataLayer).toBeUndefined()
    expect(head).toHaveLength(0)
    expect(analyticsStarted()).toBe(false)
  })

  it('loads Google Analytics once, without ad features or the pattern in the address, then records events', () => {
    startAnalytics('G-TEST123')
    startAnalytics('G-TEST123')
    expect(head).toHaveLength(1)
    expect((head[0] as { src: string }).src).toBe('https://www.googletagmanager.com/gtag/js?id=G-TEST123')
    const config = (window.dataLayer ?? []).map((a) => [...(a as unknown[])]).find((a) => a[0] === 'config')
    expect(config).toEqual([
      'config',
      'G-TEST123',
      {
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: 'https://example.org/weave-patterner/',
      },
    ])
    track('export', { format: 'wif' })
    expect([...((window.dataLayer ?? []).at(-1) as unknown[])]).toEqual(['event', 'export', { format: 'wif' }])
  })

  it('does nothing without a measurement ID', () => {
    startAnalytics(null)
    expect(analyticsStarted()).toBe(false)
    expect(head).toHaveLength(0)
  })
})
