import { describe, expect, it } from 'vitest'
import { donateUrl } from './donate'

describe('donate link', () => {
  it("links to PayPal's hosted donate page for a button id", () => {
    expect(donateUrl('ABC123XYZ')).toBe('https://www.paypal.com/donate/?hosted_button_id=ABC123XYZ')
    expect(donateUrl(' a&b ')).toBe('https://www.paypal.com/donate/?hosted_button_id=a%26b')
  })

  it('is empty, hiding the links, without one', () => {
    expect(donateUrl('')).toBe('')
    expect(donateUrl('  ')).toBe('')
  })
})
