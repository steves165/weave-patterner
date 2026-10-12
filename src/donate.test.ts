import { describe, expect, it } from 'vitest'
import { DONATE_URL } from './donate'

describe('donate link', () => {
  it("goes to PayPal's donate page, in pounds, with the thank-you message", () => {
    const url = new URL(DONATE_URL)
    expect(url.origin + url.pathname).toBe('https://www.paypal.com/donate/')
    expect(url.searchParams.get('business')).toBe('XSHCPFVA9AVU2')
    expect(url.searchParams.get('currency_code')).toBe('GBP')
    expect(url.searchParams.get('item_name')).toContain('Every donation goes towards making them better')
  })
})
